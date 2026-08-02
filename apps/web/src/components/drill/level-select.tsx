"use client";

import { motion, useReducedMotion } from "motion/react";

import {
  DURATIONS,
  LANGUAGE_OPTIONS,
  LEVEL_FILTERS,
  type ConceptCounts,
  type DrillLanguage,
  type LevelFilter,
} from "@/lib/drill";
import type { DrillRun } from "@/lib/drill-history";

/** Idle screen: pick a level, pick a clock, hit start. */
export default function LevelSelect({
  level,
  onLevelChange,
  duration,
  onDurationChange,
  language,
  onLanguageChange,
  onStart,
  counts,
  streak,
  average,
  runs,
}: {
  level: LevelFilter;
  onLevelChange: (level: LevelFilter) => void;
  duration: number;
  onDurationChange: (seconds: number) => void;
  language: DrillLanguage;
  onLanguageChange: (language: DrillLanguage) => void;
  onStart: () => void;
  counts: ConceptCounts | null;
  streak: number;
  average: number | null;
  runs: DrillRun[];
}) {
  const reduceMotion = useReducedMotion();

  const poolSize =
    counts === null ? null : level === "all" ? counts.total : counts[level as keyof ConceptCounts];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-2xl flex-col gap-8"
    >
      <header className="flex flex-col gap-3 text-center">
        <p className="eyebrow">
          <span className="sigil">▸</span> pid 099 · drill.exe
        </p>
        <h1 className="font-display text-3xl leading-tight font-bold tracking-tight text-bright sm:text-4xl">
          Talk to me about backend.
        </h1>
        <p className="mx-auto max-w-md text-sm text-dim">
          I deal you a concept. You speak about it out loud until the clock runs out. Then I tell
          you how it went — honestly.
        </p>
      </header>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-1">difficulty</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LEVEL_FILTERS.map((option) => {
            const selected = option.value === level;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onLevelChange(option.value)}
                aria-pressed={selected}
                className={`border px-3 py-2.5 font-mono text-[11px] tracking-[0.12em] transition-colors ${
                  selected
                    ? "border-cyan/60 bg-cyan/10 text-cyan"
                    : "border-line text-dim hover:border-cyan/30 hover:text-bright"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-1">how long you'll speak</legend>
        <div className="grid grid-cols-5 gap-2">
          {DURATIONS.map((seconds) => {
            const selected = seconds === duration;
            return (
              <button
                key={seconds}
                type="button"
                onClick={() => onDurationChange(seconds)}
                aria-pressed={selected}
                className={`border px-2 py-2.5 font-mono text-[11px] tracking-[0.08em] transition-colors ${
                  selected
                    ? "border-cyan/60 bg-cyan/10 text-cyan"
                    : "border-line text-dim hover:border-cyan/30 hover:text-bright"
                }`}
              >
                {seconds}s
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-1">language</legend>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.value === language;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onLanguageChange(option.value)}
                aria-pressed={selected}
                className={`flex flex-col gap-0.5 border px-3 py-2.5 text-left font-mono transition-colors ${
                  selected
                    ? "border-cyan/60 bg-cyan/10 text-cyan"
                    : "border-line text-dim hover:border-cyan/30 hover:text-bright"
                }`}
              >
                <span className="text-[11px] tracking-[0.12em]">{option.label}</span>
                <span className="text-[10px] text-dim/70">{option.hint}</span>
              </button>
            );
          })}
        </div>
        {language === "hinglish" && (
          // Keyterm prompting is nova-3 English-only, so multilingual runs lose
          // the technical-vocabulary boost. Better to say so than to let the
          // transcript quietly get worse.
          <p className="font-mono text-[10px] text-dim/70">
            Speak Hinglish and I&apos;ll grade in Hinglish. Heads up: transcription accuracy on
            technical terms drops a little in this mode.
          </p>
        )}
      </fieldset>

      <button
        type="button"
        onClick={onStart}
        className="group relative border border-cyan/50 bg-cyan/5 px-6 py-4 font-display text-lg font-semibold tracking-wide text-cyan transition-all hover:border-cyan hover:bg-cyan/15 hover:shadow-[0_0_32px_rgba(51,224,255,0.15)]"
      >
        START DRILL
        <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-[11px] text-dim">
        <span>
          {poolSize === null ? "loading bank…" : `${poolSize} concepts in this pool`}
        </span>
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <span>
              streak <span className="text-gold">{streak}d</span>
            </span>
          )}
          {average !== null && (
            <span>
              avg <span className="text-cyan">{average}</span>
            </span>
          )}
        </div>
      </div>

      {runs.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="eyebrow">recent runs</p>
          <ul className="flex flex-col divide-y divide-line/60 border border-line">
            {runs.slice(0, 5).map((run) => (
              <li
                key={`${run.conceptId}-${run.at}`}
                className="flex items-center justify-between gap-4 px-3 py-2 font-mono text-[11px]"
              >
                <span className="truncate text-dim">
                  {/* Without this, a chased topic looks like the same concept
                      was dealt five times in a row. */}
                  {run.chainDepth ? <span className="mr-1 text-cyan/50">↳</span> : null}
                  {run.conceptTitle}
                </span>
                <span className={run.overall === null ? "text-dim" : scoreColor(run.overall)}>
                  {run.overall === null ? "—" : run.overall}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-cyan";
  if (score >= 50) return "text-gold";
  return "text-signal";
}
