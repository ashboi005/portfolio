/**
 * Language the drill runs in.
 *
 * This drives two separate things, which is why it lives on its own rather
 * than inside the coach or the Deepgram client:
 *
 *   1. What language the coach replies in. Ashwath's real voice mixes Hindi
 *      into English constantly; some visitors want that, some can't read it.
 *   2. What Deepgram expects to hear. Someone who picked Hinglish is likely to
 *      *speak* Hinglish, and transcribing that as `en` mangles it.
 */

export const LANGUAGES = ["english", "hinglish"] as const;
export type DrillLanguage = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: DrillLanguage = "english";

export function isLanguage(value: unknown): value is DrillLanguage {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function parseLanguage(value: unknown): DrillLanguage {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Deepgram's `language` parameter.
 *
 * `multi` is nova-3's code-switching mode, which covers English/Hindi in one
 * pass — exactly what Hinglish speech is.
 */
export function deepgramLanguage(language: DrillLanguage): string {
  return language === "hinglish" ? "multi" : "en";
}

/**
 * Keyterm prompting is nova-3 English-only, so it has to be dropped in
 * multilingual mode. That costs Hinglish runs the technical-vocabulary boost
 * ("idempotency", "Kafka"), which is a real accuracy hit, but sending an
 * unsupported parameter is worse than losing the boost.
 */
export function supportsKeyterms(language: DrillLanguage): boolean {
  return language === "english";
}
