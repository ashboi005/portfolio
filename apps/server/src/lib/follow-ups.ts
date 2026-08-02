/**
 * Short-lived store for the coach's follow-up questions.
 *
 * Why this exists rather than just letting the browser POST the question back:
 * the grade route deliberately never accepts a client-supplied topic — it looks
 * the concept up by id — and that is precisely what closes the prompt-injection
 * hole. A follow-up is model-generated text, so accepting it from the client
 * would reopen the door. Instead the server keeps the text and hands out an
 * opaque id; the browser only ever echoes the id back.
 *
 * In-memory and per-process, like the rate limiter. A restart drops in-flight
 * chains, which costs a visitor one follow-up and nothing else.
 */

/** Hard stop on how deep one topic can be chased. */
export const MAX_FOLLOW_UP_DEPTH = 25;

const TTL_MS = 30 * 60 * 1000;
const SWEEP_MS = 5 * 60 * 1000;
/** Backstop against unbounded growth if traffic outruns the sweep. */
const MAX_ENTRIES = 5000;

/** How much of the previous answer travels into the next prompt. */
const PREVIOUS_ANSWER_CHARS = 800;

export type FollowUp = {
  conceptId: string;
  question: string;
  /** 1 for the first follow-up, 2 for a follow-up to that, and so on. */
  depth: number;
  /** Truncated so a 25-deep chain can't grow the prompt without bound. */
  previousAnswer: string;
};

type Entry = FollowUp & { createdAt: number };

const store = new Map<string, Entry>();

const sweep = setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of store) {
    if (entry.createdAt <= cutoff) store.delete(id);
  }
}, SWEEP_MS);
sweep.unref?.();

/**
 * Record a follow-up and return its id, or null once the chain has hit the cap.
 *
 * A null return is the signal to the UI that this topic is done — it stops
 * offering to continue and says so, regardless of whether the coach handed
 * back another question.
 */
export function issueFollowUp(followUp: FollowUp): string | null {
  if (followUp.depth > MAX_FOLLOW_UP_DEPTH) return null;

  if (store.size >= MAX_ENTRIES) {
    // Map iterates in insertion order, so the first key is the oldest.
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }

  const id = crypto.randomUUID();
  store.set(id, {
    ...followUp,
    previousAnswer: followUp.previousAnswer.slice(0, PREVIOUS_ANSWER_CHARS),
    createdAt: Date.now(),
  });
  return id;
}

/**
 * Look up a follow-up. Deliberately not single-use: if grading fails and the
 * visitor retries, the id must still resolve. Expiry is the only cleanup.
 */
export function getFollowUp(id: string): FollowUp | null {
  const entry = store.get(id);
  if (!entry) return null;
  if (entry.createdAt <= Date.now() - TTL_MS) {
    store.delete(id);
    return null;
  }
  const { createdAt: _createdAt, ...followUp } = entry;
  return followUp;
}

/** Test seam. */
export function _clearFollowUps() {
  store.clear();
}
