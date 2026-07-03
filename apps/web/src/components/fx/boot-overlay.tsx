"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

import { boot } from "@/lib/content";

const BOOT_LINES = boot.lines;

/**
 * A power-on sequence: CRT line snaps to life, the boot log floods, a loader
 * fills, then the whole panel collapses like a switched-off monitor to reveal
 * the page. Skippable with a click or any key. Skipped entirely for reduced motion.
 */
export default function BootOverlay({ onFinish }: { onFinish: () => void }) {
  const [visible, setVisible] = useState(true);
  const [collapsing, setCollapsing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const logRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const grantRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      document.body.style.overflow = "";
      setCollapsing(true);
      window.setTimeout(() => {
        setVisible(false);
        onFinish();
      }, 620);
    };

    if (reduced) {
      onFinish();
      setVisible(false);
      return;
    }

    document.body.style.overflow = "hidden";

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);

    const timeline = gsap.timeline();
    // 1. CRT power-on: a hot horizontal line expands into the panel
    timeline
      .set(contentRef.current, { opacity: 0 })
      .fromTo(
        lineRef.current,
        { scaleX: 0, opacity: 1 },
        { scaleX: 1, duration: 0.28, ease: "power2.out" },
      )
      .to(lineRef.current, { scaleY: 60, duration: 0.26, ease: "power2.inOut" })
      .to(lineRef.current, { opacity: 0, duration: 0.15 }, "-=0.05")
      .to(contentRef.current, { opacity: 1, duration: 0.15 }, "-=0.1");

    // 2. flood the boot log
    logRefs.current.forEach((line, index) => {
      if (!line) return;
      timeline.fromTo(
        line,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.08, ease: "none" },
        `>${index === 0 ? "" : "-=0.02"}`,
      );
    });

    // 3. loader fills
    timeline.to(barRef.current, { width: "100%", duration: 0.7, ease: "power1.inOut" }, "-=0.2");

    // 4. access granted glitch
    timeline
      .to(grantRef.current, { opacity: 1, duration: 0.05 })
      .to(grantRef.current, { opacity: 0.2, duration: 0.05, repeat: 3, yoyo: true })
      .to(grantRef.current, { opacity: 1, duration: 0.05 })
      .to({}, { duration: 0.35 })
      .call(finish);

    return () => {
      timeline.kill();
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      document.body.style.overflow = "";
    };
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className={`boot-overlay ${collapsing ? "crt-off" : ""}`}>
      <div className="boot-scanlines" />
      <div
        ref={lineRef}
        className="absolute left-1/2 top-1/2 h-px w-[min(680px,86vw)] -translate-x-1/2 -translate-y-1/2 bg-cyan"
        style={{ boxShadow: "0 0 24px 2px rgba(51,224,255,0.9)" }}
      />
      <div
        ref={contentRef}
        className="relative w-[min(680px,86vw)] font-mono text-[11px] leading-relaxed text-dim sm:text-xs"
      >
        <div className="mb-3 flex items-center justify-between text-cyan">
          <span>ASHWATH.SYS — POWER ON</span>
          <span className="text-dim">esc / click to skip</span>
        </div>
        <div className="space-y-0.5">
          {BOOT_LINES.map((line, index) => (
            <div
              key={line}
              ref={(element) => {
                logRefs.current[index] = element;
              }}
              className={
                line.includes("NOT FOUND")
                  ? "text-signal"
                  : line.includes("ALIVE")
                    ? "text-cyan"
                    : ""
              }
            >
              {line}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="shrink-0 text-dim">mounting</span>
          <div className="meter-track flex-1">
            <div ref={barRef} className="meter-fill" style={{ transition: "none" }} />
          </div>
        </div>
        <div ref={grantRef} className="mt-4 font-display text-lg font-bold text-cyan" style={{ opacity: 0 }}>
          {boot.granted}
        </div>
      </div>
    </div>
  );
}
