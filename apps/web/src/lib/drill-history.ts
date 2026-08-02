/**
 * DRILL.EXE progress, kept entirely in localStorage.
 *
 * No accounts and no server-side records — transcripts leave the browser only
 * for the single grading call and are never stored. What persists is enough to
 * make coming back feel like progress: a day streak, recent scores, and the
 * concept ids already seen so the reel stops dealing the same topic.
 */

const KEY = "ashwath.sys/drill";

/** Matches the server's exclude cap; sending more would be trimmed anyway. */
const MAX_SEEN = 50;
const MAX_RUNS = 10;

export type DrillRun = {
  conceptId: string;
  conceptTitle: string;
  level: string;
  /** Null when the coach degraded to prose without scores. */
  overall: number | null;
  /** Epoch millis. */
  at: number;
  /**
   * 0 for an opening answer, 1+ for a follow-up. Without this the recent-runs
   * list looks like the same topic was dealt five times in a row.
   */
  chainDepth?: number;
};

export type DrillHistory = {
  seen: string[];
  runs: DrillRun[];
  streak: number;
  /** Local YYYY-MM-DD of the most recent run, for streak arithmetic. */
  lastRunDay: string | null;
};

const EMPTY: DrillHistory = { seen: [], runs: [], streak: 0, lastRunDay: null };

/** Local calendar day, not UTC — a streak should follow the user's midnight. */
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function readHistory(): DrillHistory {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<DrillHistory>;
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter((s) => typeof s === "string").slice(0, MAX_SEEN) : [],
      runs: Array.isArray(parsed.runs) ? (parsed.runs.filter(Boolean) as DrillRun[]).slice(0, MAX_RUNS) : [],
      streak: typeof parsed.streak === "number" && parsed.streak >= 0 ? Math.floor(parsed.streak) : 0,
      lastRunDay: typeof parsed.lastRunDay === "string" ? parsed.lastRunDay : null,
    };
  } catch {
    // Corrupt or unavailable storage shouldn't break the page.
    return EMPTY;
  }
}

function write(history: DrillHistory): DrillHistory {
  if (typeof window === "undefined") return history;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(history));
  } catch {
    // Private mode / quota — the page still works, it just forgets.
  }
  return history;
}

/**
 * The current streak, expired if the last run was before yesterday.
 *
 * Reading must not resurrect a dead streak, so this is computed on read rather
 * than trusting the stored number.
 */
export function currentStreak(history: DrillHistory, now = new Date()): number {
  if (!history.lastRunDay || history.streak === 0) return 0;
  const gap = daysBetween(history.lastRunDay, dayKey(now));
  return gap <= 1 ? history.streak : 0;
}

/** Mark a concept as dealt so it isn't dealt again while others remain. */
export function markSeen(conceptId: string): DrillHistory {
  const history = readHistory();
  const seen = [conceptId, ...history.seen.filter((id) => id !== conceptId)].slice(0, MAX_SEEN);
  return write({ ...history, seen });
}

/** Record a graded run and advance the streak. */
export function recordRun(run: DrillRun, now = new Date()): DrillHistory {
  const history = readHistory();
  const today = dayKey(now);

  let streak: number;
  if (!history.lastRunDay) {
    streak = 1;
  } else {
    const gap = daysBetween(history.lastRunDay, today);
    // Same day keeps the streak; the next day extends it; a gap resets it.
    streak = gap === 0 ? Math.max(1, history.streak) : gap === 1 ? history.streak + 1 : 1;
  }

  return write({
    ...history,
    runs: [run, ...history.runs].slice(0, MAX_RUNS),
    streak,
    lastRunDay: today,
  });
}

export function clearHistory(): DrillHistory {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
  return EMPTY;
}

/** Mean of the scored runs, or null if nothing has been scored yet. */
export function averageScore(history: DrillHistory): number | null {
  const scored = history.runs.filter((r): r is DrillRun & { overall: number } => typeof r.overall === "number");
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, r) => sum + r.overall, 0) / scored.length);
}
