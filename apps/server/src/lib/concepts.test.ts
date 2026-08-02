import { describe, expect, test } from "bun:test";

import {
  CONCEPTS,
  filterByLevel,
  parseExcludeParam,
  pickConcept,
  type Concept,
} from "./concepts";

const fixture: Concept[] = [
  { id: "b1", title: "B One", level: "beginner", tags: [], probes: [] },
  { id: "b2", title: "B Two", level: "beginner", tags: [], probes: [] },
  { id: "i1", title: "I One", level: "intermediate", tags: [], probes: [] },
  { id: "a1", title: "A One", level: "advanced", tags: [], probes: [] },
];

/** Deterministic stand-in for Math.random. */
const always = (n: number) => () => n;

describe("filterByLevel", () => {
  test("'all' returns everything", () => {
    expect(filterByLevel(fixture, "all")).toHaveLength(4);
  });

  test("filters to a single level", () => {
    expect(filterByLevel(fixture, "beginner").map((c) => c.id)).toEqual(["b1", "b2"]);
  });
});

describe("pickConcept", () => {
  test("respects the level filter", () => {
    expect(pickConcept(fixture, "advanced", [], always(0))?.id).toBe("a1");
  });

  test("skips excluded ids", () => {
    expect(pickConcept(fixture, "beginner", ["b1"], always(0))?.id).toBe("b2");
  });

  test("ignores the exclude list once the level is exhausted", () => {
    // A user who has seen every beginner concept should get a repeat, not null.
    const picked = pickConcept(fixture, "beginner", ["b1", "b2"], always(0));
    expect(picked?.id).toBe("b1");
  });

  test("returns null only when the pool itself is empty", () => {
    expect(pickConcept([], "all", [], always(0))).toBeNull();
  });

  test("random() returning just under 1 stays in bounds", () => {
    // Math.floor(0.999… * len) must not index past the end.
    expect(pickConcept(fixture, "all", [], always(0.9999999))?.id).toBe("a1");
  });
});

describe("parseExcludeParam", () => {
  test("splits, trims, and drops blanks", () => {
    expect(parseExcludeParam("a, b ,,c")).toEqual(["a", "b", "c"]);
  });

  test("undefined yields an empty list", () => {
    expect(parseExcludeParam(undefined)).toEqual([]);
  });

  test("caps the list so a hostile URL cannot blow up the filter", () => {
    const many = Array.from({ length: 200 }, (_, i) => `id${i}`).join(",");
    expect(parseExcludeParam(many, 50)).toHaveLength(50);
  });
});

describe("the shipped concept bank", () => {
  test("loaded and has every level populated", () => {
    expect(CONCEPTS.length).toBeGreaterThan(50);
    for (const level of ["beginner", "intermediate", "advanced"] as const) {
      expect(filterByLevel(CONCEPTS, level).length).toBeGreaterThan(0);
    }
  });

  test("ids are unique", () => {
    expect(new Set(CONCEPTS.map((c) => c.id)).size).toBe(CONCEPTS.length);
  });

  test("every concept has probes to grade against", () => {
    const bare = CONCEPTS.filter((c) => c.probes.length === 0).map((c) => c.id);
    expect(bare).toEqual([]);
  });
});
