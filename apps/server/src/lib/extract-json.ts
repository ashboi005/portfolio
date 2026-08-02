/**
 * Pull a JSON object out of an LLM reply that may be fenced, prefixed with
 * prose, or both. Mirrors the frontend helper in apps/web/src/lib/chat.ts —
 * the drill coach needs the same forgiveness, but server-side.
 */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1]! : raw).trim();

  const tryParse = (s: string): Record<string, unknown> | null => {
    try {
      const value = JSON.parse(s);
      return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const whole = tryParse(candidate);
  if (whole) return whole;

  // Model wrapped the object in commentary — grab the outermost braces.
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last > first) return tryParse(candidate.slice(first, last + 1));

  return null;
}
