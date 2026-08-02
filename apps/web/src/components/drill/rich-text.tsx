import type { ReactNode } from "react";

/**
 * Minimal inline-markdown renderer for the coach's verdict.
 *
 * The coach is allowed light emphasis — bold, italics, inline code — and this
 * turns it into elements instead of leaving asterisks on screen. Deliberately
 * inline-only: block constructs (headings, fences, links) are flattened
 * server-side in coach.ts, so there is nothing here to handle them.
 *
 * Builds React nodes rather than setting HTML, so a model that emits a `<script>`
 * tag gets a harmless text node.
 */

// Order matters: `code` first so emphasis markers inside it are left alone,
// then ** before * so bold isn't parsed as two italics.
const TOKEN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/g;

/** Underscore emphasis only when it looks like prose, never inside snake_case. */
function isProseUnderscore(segment: string, whole: string, index: number): boolean {
  const before = index > 0 ? whole[index - 1] : " ";
  const after = whole[index + segment.length] ?? " ";
  return !/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after);
}

export default function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const segment = match[0];
    const index = match.index;

    if (index > cursor) nodes.push(text.slice(cursor, index));
    cursor = index + segment.length;

    if (segment.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[0.9em] text-cyan">
          {segment.slice(1, -1)}
        </code>,
      );
    } else if (segment.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-bright">
          {segment.slice(2, -2)}
        </strong>,
      );
    } else if (segment.startsWith("_") && !isProseUnderscore(segment, text, index)) {
      // snake_case caught mid-identifier — leave it exactly as written.
      nodes.push(segment);
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {segment.slice(1, -1)}
        </em>,
      );
    }
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));

  return <>{nodes}</>;
}
