"use client";

import { useEffect, useRef, useState } from "react";

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#0123456789";

/**
 * Text that resolves from scrambled characters when it enters the viewport.
 * Respects prefers-reduced-motion (renders plain text immediately).
 */
export default function DecodeText({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "h2" | "h3" | "p" | "div";
}) {
  const ref = useRef<HTMLElement>(null);
  const [display, setDisplay] = useState(text);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(text);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  useEffect(() => {
    if (!started) return;

    let frame = 0;
    const totalFrames = Math.min(30, text.length * 2 + 8);
    let raf: number;

    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const resolved = Math.floor(progress * text.length);
      let output = text.slice(0, resolved);
      for (let i = resolved; i < text.length; i++) {
        const source = text[i]!;
        output +=
          source === " "
            ? " "
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setDisplay(output);
      if (frame < totalFrames) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, text]);

  return (
    // biome-ignore lint: dynamic tag
    <Tag ref={ref as never} className={className} aria-label={text}>
      {display}
    </Tag>
  );
}
