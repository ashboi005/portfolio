"use client";

import { useEffect, useRef, useState } from "react";

export type Title = { text: string; strike?: string };

/**
 * Types out each title, holds, deletes, and moves to the next — forever.
 * A `strike` prefix (e.g. "Coffee") renders struck-through and stays visible
 * while that title is typing. Runs everywhere, including phones that report
 * reduced motion — a typewriter is text, not vestibular motion.
 */
export default function TypingCycle({
  titles,
  className,
}: {
  titles: Title[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [sub, setSub] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const current = titles[index]!;
    const full = current.text;

    if (!deleting && sub === full.length) {
      timer.current = setTimeout(() => setDeleting(true), 1600);
    } else if (deleting && sub === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % titles.length);
    } else {
      timer.current = setTimeout(
        () => setSub((s) => s + (deleting ? -1 : 1)),
        deleting ? 34 : 62,
      );
    }
    return () => clearTimeout(timer.current);
  }, [sub, deleting, index, titles]);

  const current = titles[index]!;

  return (
    <span className={className} aria-live="polite">
      {current.strike && <s className="text-dim/60">{current.strike} </s>}
      {current.text.slice(0, sub)}
      <span className="blink-cursor text-cyan">▊</span>
    </span>
  );
}
