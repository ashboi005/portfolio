import type { ReactNode } from "react";

/**
 * Emphasis for prose. Two sources, both intentional (no more blanket
 * keyword-matching that gold-painted every "backend"):
 *   1. Explicit `**phrase**` markers in content.json → gold.
 *   2. Real metrics (90%, 3,000+, under 3 seconds, 3 AM) → gold automatically,
 *      because numbers are the thing worth emphasizing.
 */

// percentages · plus-counts · durations · clock times
const METRIC =
  /(\b\d[\d,]*(?:\.\d+)?\s?%|\b\d[\d,]*\+|\b\d+(?:\.\d+)?\s?(?:seconds?|minutes?|hours?|ms|s)\b|\b\d+\s?[AP]M\b)/g;

let keyCounter = 0;

function goldMetrics(text: string): ReactNode[] {
  return text.split(METRIC).map((part, index) => {
    if (index % 2 === 1) {
      keyCounter += 1;
      return (
        <em key={`m-${keyCounter}`} className="keyword">
          {part}
        </em>
      );
    }
    return part;
  });
}

export function highlightKeywords(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    const marked = part.match(/^\*\*([^*]+)\*\*$/);
    if (marked) {
      keyCounter += 1;
      out.push(
        <em key={`k-${keyCounter}`} className="keyword">
          {marked[1]}
        </em>,
      );
    } else {
      for (const node of goldMetrics(part)) out.push(node);
    }
  }
  return out;
}
