import { describe, expect, test } from "bun:test";

import { deepgramLanguage, isLanguage, parseLanguage, supportsKeyterms } from "./language";

describe("parseLanguage", () => {
  test("accepts the two real values", () => {
    expect(parseLanguage("english")).toBe("english");
    expect(parseLanguage("hinglish")).toBe("hinglish");
  });

  test("falls back to english rather than throwing", () => {
    // A bad language must not cost someone a recording they can't redo.
    for (const junk of [undefined, null, "", "klingon", 42, {}]) {
      expect(parseLanguage(junk)).toBe("english");
    }
  });

  test("isLanguage is strict", () => {
    expect(isLanguage("hinglish")).toBe(true);
    expect(isLanguage("Hinglish")).toBe(false);
    expect(isLanguage("hindi")).toBe(false);
  });
});

describe("deepgram mapping", () => {
  test("hinglish uses nova-3 code-switching", () => {
    expect(deepgramLanguage("hinglish")).toBe("multi");
    expect(deepgramLanguage("english")).toBe("en");
  });

  test("keyterms are english-only, since nova-3 doesn't support them on multi", () => {
    expect(supportsKeyterms("english")).toBe(true);
    expect(supportsKeyterms("hinglish")).toBe(false);
  });
});
