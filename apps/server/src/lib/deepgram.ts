/**
 * Deepgram pre-recorded transcription for DRILL.EXE.
 *
 * Batch, not streaming: the browser records the whole answer and uploads one
 * blob. That keeps the API key server-side with no temporary-token minting and
 * no WebSocket, and it sidesteps the reason the browser's Web Speech API was
 * rejected — Chrome's recogniser stops itself after a few seconds of silence,
 * which is fatal when someone pauses mid-answer to think.
 *
 * `keyterm` prompting is nova-3 only and is the main reason for paying for this
 * at all: the transcript gets graded, so "idempotency" surviving intact matters.
 */

import { DEEPGRAM_API_KEY } from "./env";
import { deepgramLanguage, supportsKeyterms, type DrillLanguage } from "./language";

const ENDPOINT = "https://api.deepgram.com/v1/listen";

/** Cap on keyterms per request — the list goes in the query string. */
const MAX_KEYTERMS = 24;

/** Filler tokens Deepgram emits when filler_words=true. Counted, not stripped. */
const FILLER_PATTERN = /^(uh|um|umm|mm|mhm|hmm|er|erm|ah|eh)$/i;

/**
 * Backend vocabulary that a general-purpose model routinely mangles. Sent on
 * every drill request alongside the concept's own title and tags.
 */
export const BACKEND_GLOSSARY = [
  "idempotency",
  "idempotent",
  "Postgres",
  "Redis",
  "Kafka",
  "gRPC",
  "Kubernetes",
  "nginx",
  "OAuth",
  "JWT",
  "CQRS",
  "CRDT",
  "MVCC",
  "sharding",
  "quorum",
  "Raft",
  "Paxos",
  "backpressure",
  "throughput",
  "latency",
  "cardinality",
  "denormalize",
  "serializable",
  "eventual consistency",
];

export type DeepgramFailure = "unconfigured" | "upstream" | "empty" | "network";

export class DeepgramError extends Error {
  constructor(readonly kind: DeepgramFailure, message: string) {
    super(message);
    this.name = "DeepgramError";
  }
}

export const deepgramConfigured = Boolean(DEEPGRAM_API_KEY);

if (!deepgramConfigured) {
  console.warn("[drill] DEEPGRAM_API_KEY not set — transcription will return 503 and the UI falls back to typing.");
}

export type TranscriptResult = {
  transcript: string;
  /** Audio length as Deepgram measured it, which is more trustworthy than the client's timer. */
  durationSec: number;
  wordCount: number;
  fillerCount: number;
};

/**
 * Build the keyterm list for one drill: the concept's own vocabulary first
 * (most valuable), then the general glossary, deduped case-insensitively.
 */
export function buildKeyterms(conceptTitle: string, tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const term of [...tags, ...conceptTitle.split(/[^A-Za-z0-9+.-]+/), ...BACKEND_GLOSSARY]) {
    const trimmed = term.trim();
    // Single letters and stopword-length fragments cost a slot and boost nothing.
    if (trimmed.length < 4) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= MAX_KEYTERMS) break;
  }

  return out;
}

function countFillers(words: unknown): number {
  if (!Array.isArray(words)) return 0;
  return words.filter((w) => {
    const word = (w as { word?: unknown })?.word;
    return typeof word === "string" && FILLER_PATTERN.test(word.trim());
  }).length;
}

/**
 * Count fillers straight from transcript text.
 *
 * The grade route recomputes this rather than trusting a client-supplied
 * number, and the typing fallback needs it too — where there is no word array
 * to walk, only prose.
 */
export function countFillerWords(text: string): number {
  const words = text.match(/[A-Za-z']+/g);
  if (!words) return 0;
  return words.filter((w) => FILLER_PATTERN.test(w)).length;
}

/** Words in a transcript, used for WPM and for the grading prompt. */
export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Transcribe one recorded answer.
 *
 * @param audio raw bytes from the browser's MediaRecorder
 * @param contentType the blob's mime type — Deepgram sniffs the container, but
 *   passing it through avoids ambiguity between webm/opus and mp4/aac
 * @throws {DeepgramError}
 */
export async function transcribe(
  audio: ArrayBuffer,
  contentType: string,
  keyterms: readonly string[],
  language: DrillLanguage = "english",
): Promise<TranscriptResult> {
  if (!DEEPGRAM_API_KEY) {
    throw new DeepgramError("unconfigured", "DEEPGRAM_API_KEY is not set.");
  }

  const params = new URLSearchParams({
    model: "nova-3",
    // `multi` is nova-3's code-switching mode; it handles a sentence that
    // starts in English and finishes in Hindi, which is what Hinglish is.
    language: deepgramLanguage(language),
    smart_format: "true",
    punctuate: "true",
    // Kept in the transcript on purpose: "um" every four words is signal the
    // coach should be allowed to grade on.
    filler_words: "true",
  });
  // Keyterms are English-only on nova-3, so multilingual runs go without.
  if (supportsKeyterms(language)) {
    for (const term of keyterms) params.append("keyterm", term);
  }

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": contentType,
      },
      body: audio,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("[drill] deepgram request failed:", error);
    throw new DeepgramError("network", "Deepgram request failed.");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[drill] deepgram ${response.status}:`, detail.slice(0, 400));
    throw new DeepgramError("upstream", `Deepgram responded ${response.status}.`);
  }

  const data = (await response.json().catch(() => null)) as {
    metadata?: { duration?: number };
    results?: { channels?: { alternatives?: { transcript?: string; words?: unknown[] }[] }[] };
  } | null;

  const alternative = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = typeof alternative?.transcript === "string" ? alternative.transcript.trim() : "";

  // An empty transcript is a legitimate outcome (silence, muted mic) and is
  // graded rather than treated as an error — the coach has instructions for it.
  const words = Array.isArray(alternative?.words) ? alternative.words : [];

  return {
    transcript,
    durationSec: Math.round(data?.metadata?.duration ?? 0),
    wordCount: words.length > 0 ? words.length : transcript ? transcript.split(/\s+/).length : 0,
    fillerCount: countFillers(words),
  };
}
