"use client";

import { useEffect, useRef } from "react";

const DOT_POOL = 14;
const GLYPH_POOL = 10;
const HTTP_POOL = 12;

const GLYPHS = ["{ }", "</>", "( )", "[ ]", "=>", "&&", "||", "/* */", "<>", "::", "!=", "??"];
const CODES = [
  { text: "404", color: "#f5c518" },
  { text: "500", color: "#ff4655" },
  { text: "403", color: "#f5c518" },
  { text: "418 ", color: "#f5c518" },
  { text: "502", color: "#ff4655" },
  { text: "200 OK", color: "#33e0ff" },
  { text: "429", color: "#ff4655" },
  { text: "301", color: "#8b92a7" },
];

/**
 * A cyan "packet" cursor. It streams a trail — mostly tiny dots, occasionally a
 * drifting dev glyph ({ }, =>, &&). Clicking fires a ping and spits floating
 * HTTP status codes that rise and fade. Fine pointers only.
 */
export default function CustomCursor() {
  const coreRef = useRef<HTMLDivElement>(null);
  const pingRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);
  const glyphsRef = useRef<(HTMLDivElement | null)[]>([]);
  const httpRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-custom-cursor");

    const core = coreRef.current;
    const ping = pingRef.current;
    if (!core || !ping) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let coreX = mouseX;
    let coreY = mouseY;
    let lastEmit = 0;
    let dotIndex = 0;
    let glyphIndex = 0;
    let httpIndex = 0;
    let emitCount = 0;
    let raf = 0;
    let down = false;

    const onMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest(
        "a, button, input, textarea, [role='button'], [data-cursor='target']",
      );
      core.classList.toggle("is-hovering", Boolean(interactive));
    };

    const emitDot = () => {
      if (reduced) return;
      const dot = dotsRef.current[dotIndex % DOT_POOL];
      dotIndex++;
      if (!dot) return;
      dot.style.transition = "none";
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      dot.style.opacity = "0.8";
      void dot.offsetWidth;
      dot.style.transition = "opacity 600ms ease, transform 600ms ease";
      dot.style.opacity = "0";
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY + 8}px, 0)`;
    };

    const emitGlyph = () => {
      if (reduced) return;
      const glyph = glyphsRef.current[glyphIndex % GLYPH_POOL];
      glyphIndex++;
      if (!glyph) return;
      glyph.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
      const drift = (Math.random() - 0.5) * 26;
      glyph.style.transition = "none";
      glyph.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(1)`;
      glyph.style.opacity = "0.9";
      void glyph.offsetWidth;
      glyph.style.transition = "opacity 900ms ease, transform 900ms ease";
      glyph.style.opacity = "0";
      glyph.style.transform = `translate3d(${mouseX + drift}px, ${mouseY - 30}px, 0) scale(0.7)`;
    };

    const tick = (time: number) => {
      coreX += (mouseX - coreX) * 0.35;
      coreY += (mouseY - coreY) * 0.35;
      core.style.transform = `translate3d(${coreX}px, ${coreY}px, 0) rotate(${down ? "0deg" : "45deg"})`;

      const moved = Math.hypot(mouseX - coreX, mouseY - coreY);
      if (time - lastEmit > 34 && moved > 2) {
        emitCount++;
        emitDot();
        if (emitCount % 6 === 0) emitGlyph();
        lastEmit = time;
      }
      raf = requestAnimationFrame(tick);
    };

    const spawnHttp = () => {
      if (reduced) return;
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const el = httpRef.current[httpIndex % HTTP_POOL];
        httpIndex++;
        if (!el) continue;
        const code = CODES[Math.floor(Math.random() * CODES.length)]!;
        el.textContent = code.text;
        el.style.color = code.color;
        const drift = (Math.random() - 0.5) * 60;
        el.style.transition = "none";
        el.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(0.8)`;
        el.style.opacity = "1";
        void el.offsetWidth;
        el.style.transition = "opacity 850ms ease-out, transform 850ms ease-out";
        el.style.opacity = "0";
        el.style.transform = `translate3d(${mouseX + drift}px, ${mouseY - 60 - Math.random() * 30}px, 0) scale(1.2)`;
      }
    };

    const onDown = () => {
      down = true;
      core.classList.add("is-down");
      if (!reduced) {
        ping.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
        ping.classList.remove("fire");
        void ping.offsetWidth;
        ping.classList.add("fire");
        spawnHttp();
      }
    };
    const onUp = () => {
      down = false;
      core.classList.remove("is-down");
    };
    const onLeave = () => {
      core.style.opacity = "0";
    };
    const onEnter = () => {
      core.style.opacity = "1";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div ref={coreRef} className="cursor-core" aria-hidden />
      <div ref={pingRef} className="cursor-ping" aria-hidden />
      {Array.from({ length: DOT_POOL }).map((_, index) => (
        <div
          // biome-ignore lint: stable pool
          key={`d-${index}`}
          ref={(el) => {
            dotsRef.current[index] = el;
          }}
          className="cursor-packet"
          aria-hidden
        />
      ))}
      {Array.from({ length: GLYPH_POOL }).map((_, index) => (
        <div
          // biome-ignore lint: stable pool
          key={`g-${index}`}
          ref={(el) => {
            glyphsRef.current[index] = el;
          }}
          className="cursor-glyph"
          aria-hidden
        />
      ))}
      {Array.from({ length: HTTP_POOL }).map((_, index) => (
        <div
          // biome-ignore lint: stable pool
          key={`h-${index}`}
          ref={(el) => {
            httpRef.current[index] = el;
          }}
          className="http-pop"
          aria-hidden
        />
      ))}
    </>
  );
}
