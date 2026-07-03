"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHARS = "!<>-_\\/[]{}—=+*^?#________01";

/**
 * Text that briefly scrambles into random glyphs, then resolves back.
 * `trigger="hover"` fires on mouse-enter; `trigger="view"` fires once on scroll-in.
 * Reduced motion renders the plain text with no effect.
 */
export default function ScrambleText({
  text,
  className,
  trigger = "hover",
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  trigger?: "hover" | "view";
  as?: "span" | "div" | "p";
}) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLElement>(null);
  const raf = useRef<number | undefined>(undefined);

  const scramble = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const total = 16;
    const run = () => {
      frame++;
      const progress = frame / total;
      const resolved = Math.floor(progress * text.length);
      let out = text.slice(0, resolved);
      for (let i = resolved; i < text.length; i++) {
        out += text[i] === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setDisplay(out);
      if (frame < total) {
        raf.current = requestAnimationFrame(run);
      } else {
        setDisplay(text);
      }
    };
    cancelAnimationFrame(raf.current ?? 0);
    raf.current = requestAnimationFrame(run);
  }, [text]);

  useEffect(() => {
    if (trigger !== "view") return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          scramble();
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trigger, scramble]);

  useEffect(() => () => cancelAnimationFrame(raf.current ?? 0), []);

  return (
    // biome-ignore lint: dynamic tag
    <Tag
      ref={ref as never}
      className={className}
      onMouseEnter={trigger === "hover" ? scramble : undefined}
    >
      {display}
    </Tag>
  );
}
