import { beforeEach, describe, expect, test } from "bun:test";

import {
  _clearFollowUps,
  getFollowUp,
  issueFollowUp,
  MAX_FOLLOW_UP_DEPTH,
} from "./follow-ups";

const base = { conceptId: "c-cap-theorem", question: "And then?", previousAnswer: "words" };

beforeEach(() => _clearFollowUps());

describe("issueFollowUp", () => {
  test("round-trips through an opaque id", () => {
    const id = issueFollowUp({ ...base, depth: 1 });
    expect(id).toBeString();
    const stored = getFollowUp(id!);
    expect(stored?.question).toBe("And then?");
    expect(stored?.conceptId).toBe("c-cap-theorem");
    expect(stored?.depth).toBe(1);
  });

  test("issues right up to the cap", () => {
    expect(issueFollowUp({ ...base, depth: MAX_FOLLOW_UP_DEPTH })).toBeString();
  });

  test("refuses past the cap, which is what ends a chain", () => {
    expect(issueFollowUp({ ...base, depth: MAX_FOLLOW_UP_DEPTH + 1 })).toBeNull();
  });

  test("truncates the carried answer so a long chain can't grow the prompt", () => {
    const id = issueFollowUp({ ...base, depth: 1, previousAnswer: "x".repeat(5000) });
    expect(getFollowUp(id!)!.previousAnswer.length).toBe(800);
  });

  test("ids are unpredictable", () => {
    const ids = new Set(Array.from({ length: 50 }, () => issueFollowUp({ ...base, depth: 1 })));
    expect(ids.size).toBe(50);
  });
});

describe("getFollowUp", () => {
  test("returns null for an unknown id", () => {
    expect(getFollowUp("nope")).toBeNull();
  });

  test("is not single-use, so a failed grade can be retried", () => {
    const id = issueFollowUp({ ...base, depth: 1 })!;
    expect(getFollowUp(id)).not.toBeNull();
    expect(getFollowUp(id)).not.toBeNull();
  });
});
