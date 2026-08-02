"use client";

import { motion, useReducedMotion } from "motion/react";

import Waveform from "@/components/drill/waveform";
import type { Concept } from "@/lib/drill";

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The recording stage: countdown ring, live oscilloscope, stop control.
 *
 * `countIn` runs after the mic permission dialog has been dismissed, so the
 * first seconds of the answer aren't lost to a browser prompt. The scope is
 * already live during the count-in, which doubles as a mic check.
 */
export default function RecordStage({
  concept,
  limitSec,
  elapsedSec,
  countIn,
  analyser,
  recording,
  onStop,
}: {
  concept: Concept;
  limitSec: number;
  elapsedSec: number;
  /** 3, 2, 1 before recording starts; null once it has. */
  countIn: number | null;
  analyser: AnalyserNode | null;
  recording: boolean;
  onStop: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const remaining = Math.max(0, limitSec - elapsedSec);
  const progress = limitSec > 0 ? Math.min(1, elapsedSec / limitSec) : 0;
  const nearlyDone = remaining <= 10 && recording;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow">
          <span className="sigil">▸</span> {recording ? "recording" : "get ready"}
        </p>
        <h2 className="font-display text-xl leading-tight font-semibold text-bright sm:text-2xl">
          {concept.title}
        </h2>
      </header>

      <div className="relative flex h-[200px] w-[200px] items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--line)" strokeWidth="2" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={nearlyDone ? "var(--signal-red)" : "var(--cyan)"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * progress}
            style={{ transition: "stroke-dashoffset 120ms linear, stroke 300ms ease" }}
          />
        </svg>

        {countIn !== null ? (
          <motion.span
            key={countIn}
            initial={reduceMotion ? false : { scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-6xl font-bold text-cyan"
          >
            {countIn === 0 ? "GO" : countIn}
          </motion.span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span
              className={`font-mono text-4xl tabular-nums ${nearlyDone ? "text-signal" : "text-bright"}`}
            >
              {formatClock(remaining)}
            </span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
              remaining
            </span>
          </div>
        )}
      </div>

      <div className="w-full border border-line bg-surface/60 p-3">
        <Waveform analyser={analyser} active={recording || countIn !== null} className="h-16 w-full" />
      </div>

      {concept.probes.length > 0 && (
        <ul className="flex w-full flex-col gap-1.5 font-mono text-xs text-dim">
          {concept.probes.map((probe) => (
            <li key={probe} className="flex gap-2">
              <span className="text-cyan/60">·</span>
              <span>{probe}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onStop}
        disabled={!recording}
        className="border border-line px-6 py-3 font-mono text-[11px] tracking-[0.14em] text-dim uppercase transition-colors hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-40"
      >
        {recording ? "stop early" : "starting…"}
      </button>
    </div>
  );
}
