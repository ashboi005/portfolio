"use client";

import { motion, useReducedMotion, useScroll } from "motion/react";
import { TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { site, statusQuips as QUIPS } from "@/lib/content";

const SECTIONS = [
  { id: "boot", label: "boot", pid: "001" },
  { id: "whoami", label: "whoami", pid: "017" },
  { id: "deploys", label: "deploys", pid: "042" },
  { id: "services", label: "services", pid: "080" },
  { id: "wins", label: "wins", pid: "137" },
  { id: "vitals", label: "vitals", pid: "168" },
  { id: "contact", label: "contact", pid: "200" },
] as const;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function useUptime() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function useClock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }).format(new Date()),
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}


/**
 * Status quips, in random order, that behave like an LCD ticker: a quip that
 * fits just sits for a beat; one that overflows scrolls back and forth (two
 * round trips) behind faded edges before the next random quip loads.
 */
function QuipTicker({ className }: { className?: string }) {
  const [quip, setQuip] = useState(QUIPS[0]!);
  const [shift, setShift] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const nextQuip = useCallback(() => {
    setQuip((prev) => {
      if (QUIPS.length < 2) return prev;
      let candidate = prev;
      while (candidate === prev) {
        candidate = QUIPS[Math.floor(Math.random() * QUIPS.length)]!;
      }
      return candidate;
    });
  }, []);

  // Deterministic SSR markup; shuffle begins on the client.
  useEffect(() => {
    nextQuip();
  }, [nextQuip]);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const excess = Math.max(0, Math.ceil(text.scrollWidth - container.clientWidth));
    setShift(excess);
    if (excess === 0) {
      const timer = setTimeout(nextQuip, 5200);
      return () => clearTimeout(timer);
    }
  }, [quip, nextQuip]);

  return (
    <span
      ref={containerRef}
      className={`quip-ticker ${shift > 0 ? "quip-ticker-fade" : ""} ${className ?? ""}`}
      suppressHydrationWarning
    >
      <span
        ref={textRef}
        key={quip}
        className="quip-ticker-text"
        style={
          shift > 0
            ? {
                // px-per-second pace with a floor, ×4 alternate = 2 round trips.
                // ±16px keeps the end letters clear of the edge fade.
                animation: `quip-scroll ${Math.max(3, shift / 28)}s linear 4 alternate both`,
                ["--quip-shift" as string]: `-${shift + 16}px`,
              }
            : undefined
        }
        onAnimationEnd={nextQuip}
        suppressHydrationWarning
      >
        {quip}
      </span>
    </span>
  );
}

function useActiveSection() {
  const [active, setActive] = useState<string>("boot");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const section of SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return active;
}

export default function HudFrame({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  const uptime = useUptime();
  const clock = useClock();
  const active = useActiveSection();
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  return (
    <>
      {/* Request progress — the visitor's journey through the system */}
      <motion.div
        className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-cyan"
        style={{ scaleX: reducedMotion ? 1 : scrollYProgress }}
        aria-hidden
      />

      {/* Top status bar */}
      <header className="fixed inset-x-0 top-0.5 z-40 border-b border-line bg-void/80 backdrop-blur-sm">
        <div className="flex h-9 items-center justify-between gap-4 px-4 font-mono text-[11px] tracking-wider text-dim lg:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <a href="#boot" className="shrink-0 text-bright transition-colors hover:text-cyan">
              {site.brand}
              <span className="text-cyan">{site.brandSuffix}</span>
            </a>
            <span className="hidden shrink-0 sm:inline">{site.version}</span>
            <QuipTicker className="min-w-0 flex-1 text-dim/80" />
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden sm:inline" suppressHydrationWarning>
              uptime {uptime}
            </span>
            <span className="hidden md:inline" suppressHydrationWarning>
              {clock ?? "--:--:--"} IST
            </span>
            <span className="flex items-center gap-1.5 text-cyan">
              <span className="led" aria-hidden />
              NOMINAL
            </span>
            <button
              type="button"
              onClick={onOpenTerminal}
              className="flex cursor-pointer items-center gap-1.5 border border-line px-2 py-1 text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
              aria-label="Open terminal (or press ~)"
              title="Open terminal (~)"
            >
              <TerminalSquare size={12} aria-hidden />
              <span className="hidden sm:inline">~</span>
            </button>
          </div>
        </div>
      </header>

      {/* Left process-list nav */}
      <nav
        className="fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 lg:block"
        aria-label="Sections"
      >
        <ul className="space-y-3 font-mono text-[11px]">
          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`group flex items-center gap-2.5 transition-colors ${
                    isActive ? "text-cyan" : "text-dim/70 hover:text-bright"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={`h-px transition-all duration-300 ${
                      isActive ? "w-6 bg-cyan" : "w-3 bg-dim/40 group-hover:bg-bright/60"
                    }`}
                    aria-hidden
                  />
                  <span className="tabular-nums opacity-60">{section.pid}</span>
                  <span>{section.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
