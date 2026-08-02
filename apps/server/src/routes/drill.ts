/**
 * DRILL.EXE — the spoken backend-concept practice page at /drill.
 *
 * Three steps, three routes, no shared session:
 *   1. GET  /api/v1/drill/concept    deal a topic at the requested level
 *   2. POST /api/v1/drill/transcribe recorded answer → text (Deepgram)
 *   3. POST /api/v1/drill/grade      text → rubric verdict (AutoSage coach)
 *
 * Steps 2 and 3 both cost money per call and are publicly reachable, so both
 * sit behind a per-IP limiter. Step 2 is skippable: if the mic is denied or
 * Deepgram is unconfigured, the UI collects a typed answer and jumps to step 3.
 */

import { Elysia, t } from "elysia";

import { AutoSageError, callAgent, isAgentConfigured } from "../lib/autosage";
import { buildGradePrompt, parseVerdict } from "../lib/coach";
import {
  CONCEPT_COUNTS,
  CONCEPTS,
  filterByLevel,
  isLevelFilter,
  parseExcludeParam,
  pickConcept,
} from "../lib/concepts";
import {
  buildKeyterms,
  countFillerWords,
  countWords,
  deepgramConfigured,
  DeepgramError,
  transcribe,
} from "../lib/deepgram";
import { AUTOSAGE_COACH_AGENT_ID } from "../lib/env";
import { getFollowUp, issueFollowUp, MAX_FOLLOW_UP_DEPTH } from "../lib/follow-ups";
import { clientIp, createRateLimiter } from "../lib/rate-limit";

export const coachConfigured = isAgentConfigured(AUTOSAGE_COACH_AGENT_ID);

if (!coachConfigured) {
  console.warn("[drill] AUTOSAGE_COACH_AGENT_ID not set — grading will return 503.");
}
console.log(
  `[drill] concept bank loaded: ${CONCEPT_COUNTS.total} ` +
    `(${CONCEPT_COUNTS.beginner} beginner / ${CONCEPT_COUNTS.intermediate} intermediate / ${CONCEPT_COUNTS.advanced} advanced)`,
);

/** Durations the UI offers. Anything else is a client bug or a poke at the API. */
const ALLOWED_LIMITS = [30, 60, 90, 120, 180] as const;

/**
 * Containers MediaRecorder produces across browsers.
 *
 * Matched on the container, not the `audio/` prefix: WebM and MP4 are
 * containers, and Chrome stamps `video/webm` on an audio-only recording
 * whenever it chooses the container itself. Rejecting those meant refusing
 * files Deepgram reads happily — it sniffs the bytes and ignores the label.
 */
const ALLOWED_CONTAINERS = new Set([
  "webm",
  "ogg",
  "mp4",
  "m4a",
  "mpeg",
  "mpga",
  "wav",
  "x-wav",
  "aac",
  "flac",
]);

export function containerOf(mime: string): string | null {
  const [kind, container] = mime.split("/");
  if (kind !== "audio" && kind !== "video") return null;
  return container && ALLOWED_CONTAINERS.has(container) ? container : null;
}

const transcribeLimiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000, label: "drill:transcribe" });
const gradeLimiter = createRateLimiter({ limit: 25, windowMs: 60 * 60 * 1000, label: "drill:grade" });

const RATE_LIMITED_MESSAGE =
  "Easy there. You've hit the practice limit for this hour — I'm paying for these transcripts. Come back in a bit.";

const GRADE_FAILURE_MESSAGE: Record<string, string> = {
  unconfigured: "The grading brain isn't wired up on this server yet. Your answer was fine, I just can't score it.",
  upstream: "My grading service glitched. Your answer's still here — hit retry.",
  empty: "I had a whole verdict ready and lost it on the way. Try grading that again?",
  network: "Grading took too long and timed out. Retry — it's usually a one-off.",
};

export const drillRoutes = new Elysia({ name: "drill" })
  // ---- 1. deal a concept ----------------------------------------------------
  .get(
    "/api/v1/drill/concept",
    ({ query, set }) => {
      const level = isLevelFilter(query.level) ? query.level : "all";
      const exclude = parseExcludeParam(query.exclude);

      const concept = pickConcept(CONCEPTS, level, exclude);
      if (!concept) {
        set.status = 503;
        return { error: "concept bank is empty" };
      }

      return {
        concept,
        poolSize: filterByLevel(CONCEPTS, level).length,
        counts: CONCEPT_COUNTS,
      };
    },
    {
      query: t.Object({
        level: t.Optional(t.String({ maxLength: 20 })),
        // Ids the client has already seen, comma-separated. Capped server-side.
        exclude: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )

  // ---- 2. recorded answer → text -------------------------------------------
  .post(
    "/api/v1/drill/transcribe",
    async ({ body, set, request, server }) => {
      if (!deepgramConfigured) {
        set.status = 503;
        return { error: "unconfigured", message: "Speech-to-text isn't set up here — type your answer instead." };
      }

      const gate = transcribeLimiter.check(clientIp(request, server));
      if (!gate.ok) {
        set.status = 429;
        set.headers["retry-after"] = String(gate.retryAfterSec);
        return { error: "rate_limited", message: RATE_LIMITED_MESSAGE };
      }

      const concept = CONCEPTS.find((c) => c.id === body.conceptId);
      if (!concept) {
        set.status = 400;
        return { error: "unknown_concept", message: "That concept id isn't in the bank." };
      }

      const mime = (body.audio.type || "application/octet-stream").split(";")[0]!.trim().toLowerCase();
      const container = containerOf(mime);
      if (!container) {
        console.warn(`[drill] rejected upload with content-type ${mime}`);
        set.status = 415;
        return { error: "unsupported_audio", message: `Can't read ${mime} audio.` };
      }

      try {
        const result = await transcribe(
          await body.audio.arrayBuffer(),
          // Send the normalised container rather than the browser's label, so
          // a `video/webm` blob doesn't reach Deepgram claiming to be video.
          `audio/${container}`,
          buildKeyterms(concept.title, concept.tags),
        );
        return result;
      } catch (error) {
        const kind = error instanceof DeepgramError ? error.kind : "network";
        set.status = kind === "unconfigured" ? 503 : 502;
        return {
          error: kind,
          message: "Couldn't transcribe that. You can retry, or type the answer instead.",
        };
      }
    },
    {
      body: t.Object({
        // 180s of opus lands well under 1MB; 6MB is generous headroom for
        // browsers that pick a fatter container.
        audio: t.File({ maxSize: "6m" }),
        conceptId: t.String({ minLength: 1, maxLength: 80 }),
      }),
      type: "multipart/form-data",
    },
  )

  // ---- 3. text → verdict ----------------------------------------------------
  .post(
    "/api/v1/drill/grade",
    async ({ body, set, request, server }) => {
      if (!coachConfigured) {
        set.status = 503;
        return { error: "unconfigured", message: GRADE_FAILURE_MESSAGE.unconfigured };
      }

      const gate = gradeLimiter.check(clientIp(request, server));
      if (!gate.ok) {
        set.status = 429;
        set.headers["retry-after"] = String(gate.retryAfterSec);
        return { error: "rate_limited", message: RATE_LIMITED_MESSAGE };
      }

      // A follow-up carries its own topic and its own concept id. Resolving it
      // server-side is the whole point: the question is model-generated text,
      // and accepting it from the client would undo the injection defence.
      const followUp = body.followUpId ? getFollowUp(body.followUpId) : null;
      if (body.followUpId && !followUp) {
        set.status = 410;
        return {
          error: "followup_expired",
          message: "That follow-up went stale — start the topic again from the top.",
        };
      }

      // Look the concept up rather than trusting a client-supplied title, so the
      // prompt can't be steered by editing the request.
      const conceptId = followUp?.conceptId ?? body.conceptId;
      const concept = CONCEPTS.find((c) => c.id === conceptId);
      if (!concept) {
        set.status = 400;
        return { error: "unknown_concept", message: "That concept id isn't in the bank." };
      }

      const limitSec = (ALLOWED_LIMITS as readonly number[]).includes(body.limitSec) ? body.limitSec : 90;
      const spokenSec = Math.max(0, Math.min(body.spokenSec, limitSec));
      const transcript = body.transcript.trim();

      const prompt = buildGradePrompt({
        concept,
        transcript,
        limitSec,
        spokenSec,
        wordCount: countWords(transcript),
        fillerCount: countFillerWords(transcript),
        followUp: followUp ?? undefined,
      });

      try {
        // No chatId, ever: grading is one-shot and must not become a conversation.
        const { reply } = await callAgent(AUTOSAGE_COACH_AGENT_ID!, prompt, {
          timeoutMs: 90_000,
          label: "drill:grade",
        });
        const verdict = parseVerdict(reply);

        const chainDepth = followUp?.depth ?? 0;
        const nextDepth = chainDepth + 1;

        // Past the cap we stop offering to continue and drop the question
        // entirely, so the UI can't render it by accident. The coach will keep
        // producing one; twenty-five rounds on a single concept is enough.
        const nextFollowUpId =
          verdict.nextQuestion && nextDepth <= MAX_FOLLOW_UP_DEPTH
            ? issueFollowUp({
                conceptId: concept.id,
                question: verdict.nextQuestion,
                depth: nextDepth,
                previousAnswer: transcript,
              })
            : null;

        const exhausted = Boolean(verdict.nextQuestion) && nextFollowUpId === null;

        return {
          ...verdict,
          nextQuestion: exhausted ? null : verdict.nextQuestion,
          chainDepth,
          followUpId: nextFollowUpId,
          followUpExhausted: exhausted,
          maxFollowUps: MAX_FOLLOW_UP_DEPTH,
        };
      } catch (error) {
        const kind = error instanceof AutoSageError ? error.kind : "network";
        set.status = kind === "unconfigured" ? 503 : 502;
        return { error: kind, message: GRADE_FAILURE_MESSAGE[kind] ?? GRADE_FAILURE_MESSAGE.network };
      }
    },
    {
      body: t.Object({
        conceptId: t.String({ minLength: 1, maxLength: 80 }),
        // Empty is allowed: silence is a legitimate answer and the coach has
        // explicit instructions for grading it.
        transcript: t.String({ maxLength: 12_000 }),
        limitSec: t.Number({ minimum: 1, maximum: 600 }),
        spokenSec: t.Number({ minimum: 0, maximum: 600 }),
        // Set when answering the coach's own previous question. The topic then
        // comes from the server's store, never from the request.
        followUpId: t.Optional(t.String({ minLength: 8, maxLength: 64 })),
      }),
    },
  );
