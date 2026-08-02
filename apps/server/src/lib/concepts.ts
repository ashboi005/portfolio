/**
 * The DRILL.EXE concept bank.
 *
 * Data lives in ../data/concepts.json and is imported directly, the same way
 * memes.json is — the list never changes at runtime, so a file is the whole
 * story. The picking logic below is pure and injectable so it can be tested
 * without spinning up the server.
 */

import raw from "../data/concepts.json";

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

/** What the UI can ask for. `all` means "don't filter". */
export type LevelFilter = Level | "all";

export type Concept = {
  id: string;
  title: string;
  level: Level;
  tags: string[];
  /**
   * Sub-questions a complete answer would touch. Shown to the user as hints,
   * and sent to the coach agent so it grades against a known bar rather than
   * inventing one.
   */
  probes: string[];
};

function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/** Drop malformed rows at boot rather than serving a half-built concept. */
function parseConcepts(input: unknown): Concept[] {
  const list = (input as { concepts?: unknown[] })?.concepts;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const out: Concept[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    if (typeof c.id !== "string" || !c.id.trim()) continue;
    if (typeof c.title !== "string" || !c.title.trim()) continue;
    if (!isLevel(c.level)) continue;
    if (seen.has(c.id)) {
      console.warn(`[drill] duplicate concept id skipped: ${c.id}`);
      continue;
    }
    seen.add(c.id);
    out.push({
      id: c.id,
      title: c.title.trim(),
      level: c.level,
      tags: Array.isArray(c.tags) ? c.tags.filter((t): t is string => typeof t === "string") : [],
      probes: Array.isArray(c.probes)
        ? c.probes.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        : [],
    });
  }

  return out;
}

export const CONCEPTS: Concept[] = parseConcepts(raw);

export const CONCEPT_COUNTS = {
  total: CONCEPTS.length,
  beginner: CONCEPTS.filter((c) => c.level === "beginner").length,
  intermediate: CONCEPTS.filter((c) => c.level === "intermediate").length,
  advanced: CONCEPTS.filter((c) => c.level === "advanced").length,
};

export function isLevelFilter(value: unknown): value is LevelFilter {
  return value === "all" || isLevel(value);
}

export function filterByLevel(concepts: Concept[], level: LevelFilter): Concept[] {
  return level === "all" ? concepts : concepts.filter((c) => c.level === level);
}

/**
 * Pick one concept at the requested level, avoiding ids the caller has already
 * seen.
 *
 * If every concept at that level has been seen, the exclude list is ignored
 * rather than returning nothing — a user who has worked through all the
 * beginner topics should get repeats, not an error.
 *
 * @param random injectable for tests; defaults to Math.random
 */
export function pickConcept(
  concepts: Concept[],
  level: LevelFilter,
  excludeIds: readonly string[] = [],
  random: () => number = Math.random,
): Concept | null {
  const pool = filterByLevel(concepts, level);
  if (pool.length === 0) return null;

  const exclude = new Set(excludeIds);
  const fresh = pool.filter((c) => !exclude.has(c.id));
  const candidates = fresh.length > 0 ? fresh : pool;

  return candidates[Math.floor(random() * candidates.length)] ?? null;
}

/** Parse the `exclude` query param: comma-separated ids, capped to keep URLs sane. */
export function parseExcludeParam(value: string | undefined, cap = 50): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, cap);
}
