/**
 * Client for the DRILL.EXE routes. Three independent calls, no session:
 * deal a concept, transcribe the recording, grade the text.
 *
 * Every function throws {@link DrillError} with a message already written in
 * Ashwath's voice, so callers can surface `error.message` directly.
 */

export type Level = "beginner" | "intermediate" | "advanced";
export type LevelFilter = Level | "all";

export type Concept = {
  id: string;
  title: string;
  level: Level;
  tags: string[];
  probes: string[];
};

export type ConceptCounts = {
  total: number;
  beginner: number;
  intermediate: number;
  advanced: number;
};

export type RubricScores = {
  correctness: number;
  depth: number;
  structure: number;
  signalToNoise: number;
};

export type Verdict = {
  overall: number | null;
  scores: RubricScores | null;
  verdict: string;
  /** Null once the chain is exhausted, so it can't be rendered by accident. */
  nextQuestion: string | null;
  missed: string[];
  degraded: boolean;
  /** 0 for an opening answer, 1+ for each follow-up in the chain. */
  chainDepth: number;
  /** Opaque token for answering `nextQuestion`. Null when there's nothing to answer. */
  followUpId: string | null;
  /** True when the coach still had a question but the chain hit its cap. */
  followUpExhausted: boolean;
  maxFollowUps: number;
};

export type TranscriptResult = {
  transcript: string;
  durationSec: number;
  wordCount: number;
  fillerCount: number;
};

/** Durations the picker offers, in seconds. */
export const DURATIONS = [30, 60, 90, 120, 180] as const;
export const DEFAULT_DURATION = 90;

export const LEVEL_FILTERS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "ALL" },
  { value: "beginner", label: "BEGINNER" },
  { value: "intermediate", label: "INTERMEDIATE" },
  { value: "advanced", label: "ADVANCED" },
];

export class DrillError extends Error {
  constructor(
    message: string,
    /** `unconfigured` and `rate_limited` are dead ends; the rest are retryable. */
    readonly kind: string = "unknown",
  ) {
    super(message);
    this.name = "DrillError";
  }
}

function apiBase() {
  return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
}

async function readError(response: Response, fallback: string): Promise<DrillError> {
  const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
  return new DrillError(data?.message ?? fallback, data?.error ?? String(response.status));
}

/**
 * Deal a concept. `exclude` carries the ids already seen so topics don't
 * repeat; the server ignores it once a level is exhausted.
 */
export async function fetchConcept(
  level: LevelFilter,
  exclude: readonly string[],
  signal?: AbortSignal,
): Promise<{ concept: Concept; poolSize: number; counts: ConceptCounts }> {
  const params = new URLSearchParams({ level });
  if (exclude.length > 0) params.set("exclude", exclude.join(","));

  const response = await fetch(`${apiBase()}/api/v1/drill/concept?${params}`, { signal }).catch(() => {
    throw new DrillError("Couldn't reach the concept bank. Check your connection?", "network");
  });

  if (!response.ok) throw await readError(response, "The concept bank didn't answer.");

  const data = (await response.json()) as { concept?: Concept; poolSize?: number; counts?: ConceptCounts };
  if (!data.concept) throw new DrillError("The concept bank came back empty. That's on me.", "empty");

  return { concept: data.concept, poolSize: data.poolSize ?? 0, counts: data.counts ?? { total: 0, beginner: 0, intermediate: 0, advanced: 0 } };
}

/** Upload one recorded answer and get the transcript back. */
export async function transcribeAudio(audio: Blob, conceptId: string): Promise<TranscriptResult> {
  const form = new FormData();
  // Extension is cosmetic — Deepgram sniffs the container — but it keeps
  // server-side logs readable when an upload is rejected.
  const container = (audio.type.split("/")[1] ?? "webm").split(";")[0]!.trim() || "webm";
  form.append("audio", audio, `answer.${container}`);
  form.append("conceptId", conceptId);

  const response = await fetch(`${apiBase()}/api/v1/drill/transcribe`, {
    method: "POST",
    body: form,
  }).catch(() => {
    throw new DrillError("Upload failed. Check your connection and retry.", "network");
  });

  if (!response.ok) throw await readError(response, "Couldn't transcribe that. Try typing instead.");

  return (await response.json()) as TranscriptResult;
}

/** Grade a transcript. Also the entry point for typed answers and follow-ups. */
export async function gradeAnswer(input: {
  conceptId: string;
  transcript: string;
  limitSec: number;
  spokenSec: number;
  /** Present when answering the coach's previous question rather than the concept. */
  followUpId?: string;
}): Promise<Verdict> {
  const response = await fetch(`${apiBase()}/api/v1/drill/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new DrillError("Couldn't reach the grader. Retry?", "network");
  });

  if (!response.ok) throw await readError(response, "Grading failed. Your answer's still here — retry.");

  return (await response.json()) as Verdict;
}

/**
 * Shown instead of another follow-up once a topic has been chased to the cap.
 * Hardcoded on purpose — the coach will happily keep producing questions
 * forever, so the sign-off has to come from us, not from it.
 */
export const CHAIN_EXHAUSTED_LINES = [
  "That's enough talk about this topic, dawg. Go pick another one.",
  "We have officially squeezed this concept dry. Next topic.",
  "Twenty-five rounds deep on one idea. Touch a different part of the stack.",
  "I'm out of angles on this one. Genuinely. Deal yourself something else.",
  "If you don't know it by now, another question isn't going to fix it. New topic.",
  "This concept and I need some time apart. Pick a different one.",
  "We've said everything there is to say here. Go break something else.",
  "Chain's done. I refuse to ask a twenty-sixth question about this.",
];

export function randomExhaustedLine(): string {
  return CHAIN_EXHAUSTED_LINES[Math.floor(Math.random() * CHAIN_EXHAUSTED_LINES.length)]!;
}

/**
 * Lines shown while the coach thinks. Same trick as the chat widget: cover the
 * wait with personality instead of a spinner.
 */
export const GRADING_LINES = [
  "Listening back to that...",
  "Hmm.",
  "Checking whether that's actually true...",
  "Cross-referencing with things I've broken in production...",
  "Counting how many times you said 'basically'...",
  "Deciding how mean to be about this...",
  "Consulting the part of me that's been paged at 3 AM...",
  "Running your answer past the rubber duck...",
  "Trying to give you the benefit of the doubt...",
  "Grading on a curve. The curve is steep.",
  "Rewinding the bit where you trailed off...",
  "Weighing confidence against correctness. Usually a bad trade.",
  "Looking for the trade-off you were supposed to mention...",
  "One sec, a cat walked across the scoring rubric.",
];

/** Progress lines for the transcription step. Shorter — this one is quick. */
export const TRANSCRIBING_LINES = [
  "Uploading audio...",
  "Running speech-to-text...",
  "Working out what you actually said...",
];
