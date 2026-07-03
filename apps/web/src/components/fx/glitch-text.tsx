"use client";

import { useEffect, useState } from "react";

/**
 * Text with chromatic glitch layers. Glitches on hover, and — if `ambient` —
 * fires on its own every few seconds so the page feels alive even untouched.
 */
export default function GlitchText({
  text,
  className,
  ambient = false,
}: {
  text: string;
  className?: string;
  ambient?: boolean;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ambient) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timeout: ReturnType<typeof setTimeout>;
    let clear: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeout = setTimeout(() => {
        setActive(true);
        clear = setTimeout(() => {
          setActive(false);
          schedule();
        }, 340);
      }, 3200 + Math.random() * 4200);
    };
    schedule();

    return () => {
      clearTimeout(timeout);
      clearTimeout(clear);
    };
  }, [ambient]);

  return (
    <span className={`glitch ${active ? "glitch-active" : ""} ${className ?? ""}`} data-text={text}>
      {text}
    </span>
  );
}
