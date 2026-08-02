"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import RichText from "@/components/drill/rich-text";
import SpriteReward from "@/components/drill/sprite-reward";
import Cat from "@/components/fx/cat";
import CountUp from "@/components/fx/count-up";
import type { Concept, Verdict } from "@/lib/drill";

/** CI-flavoured band names — the site already frames deploys this way. */
function rank(score: number): { label: string; className: string } {
  if (score >= 90) return { label: "SHIPPED TO PROD", className: "text-cyan" };
  if (score >= 75) return { label: "PASSES REVIEW", className: "text-cyan" };
  if (score >= 60) return { label: "NEEDS CHANGES", className: "text-gold" };
  if (score >= 40) return { label: "MERGE CONFLICT", className: "text-gold" };
  return { label: "BUILD FAILED", className: "text-signal" };
}

function barColor(score: number): string {
  if (score >= 75) return "var(--cyan)";
  if (score >= 50) return "var(--gold)";
  return "var(--signal-red)";
}

const RUBRIC: { key: keyof NonNullable<Verdict["scores"]>; label: string; hint: string }[] = [
  { key: "correctness", label: "correctness", hint: "was it true" },
  { key: "depth", label: "depth", hint: "past the definition" },
  { key: "structure", label: "structure", hint: "did it have a shape" },
  { key: "signalToNoise", label: "signal / noise", hint: "density per sentence" },
];

function ScoreBar({ label, hint, score, delay }: { label: string; hint: string; score: number; delay: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between font-mono text-[11px]">
        <span className="tracking-[0.12em] text-bright uppercase">{label}</span>
        <span className="tabular-nums text-dim">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-surface-2">
        <motion.div
          className="h-full"
          style={{ background: barColor(score) }}
          initial={reduceMotion ? { width: `${score}%` } : { width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      <span className="font-mono text-[10px] text-dim/70">{hint}</span>
    </div>
  );
}

export default function VerdictCard({
  concept,
  verdict,
  transcript,
  spokenSec,
  exhaustedLine,
  onAnswerFollowUp,
  onAgain,
  onBackToStart,
}: {
  concept: Concept;
  verdict: Verdict;
  transcript: string;
  spokenSec: number;
  /** Picked once by the console so it doesn't reshuffle on every render. */
  exhaustedLine: string;
  onAnswerFollowUp: (followUpId: string, question: string) => void;
  onAgain: () => void;
  onBackToStart: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const reduceMotion = useReducedMotion();

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const wpm = spokenSec > 0 ? Math.round((wordCount / spokenSec) * 60) : 0;
  const band = verdict.overall === null ? null : rank(verdict.overall);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-2xl flex-col gap-8"
    >
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow">
          <span className="sigil">▸</span>{" "}
          {verdict.chainDepth > 0 ? `verdict · follow-up ${verdict.chainDepth}` : "verdict"}
        </p>
        <h2 className="font-display text-lg font-semibold text-bright sm:text-xl">{concept.title}</h2>
      </header>

      {verdict.overall !== null && band && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-baseline gap-1">
            <CountUp
              value={verdict.overall}
              className={`font-display text-6xl font-bold tabular-nums ${band.className}`}
            />
            <span className="font-mono text-sm text-dim">/100</span>
          </div>
          <span className={`font-mono text-[11px] tracking-[0.18em] ${band.className}`}>{band.label}</span>
        </div>
      )}

      {verdict.overall !== null && (
        <div className="flex justify-center">
          <SpriteReward score={verdict.overall} />
        </div>
      )}

      {verdict.scores && (
        <div className="grid gap-5 sm:grid-cols-2">
          {RUBRIC.map((item, index) => (
            <ScoreBar
              key={item.key}
              label={item.label}
              hint={item.hint}
              score={verdict.scores![item.key]}
              delay={0.15 + index * 0.08}
            />
          ))}
        </div>
      )}

      <div className="panel corner-ticks relative flex gap-4 p-5">
        <div className="hidden shrink-0 sm:block">
          <Cat pose="sleep" scale={0.85} />
        </div>
        <div className="flex flex-col gap-3">
          <p className="eyebrow">ashwath says</p>
          <p className="text-sm leading-relaxed whitespace-pre-line text-bright/90">
            <RichText text={verdict.verdict} />
          </p>
        </div>
      </div>

      {verdict.missed.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="eyebrow">what you skipped</p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-dim">
            {verdict.missed.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-signal/60">×</span>
                <span>
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdict.nextQuestion && (
        <section className="border-l-2 border-cyan/40 pl-4">
          <p className="eyebrow mb-1.5">
            {verdict.followUpId ? "follow-up" : "what I'd ask next"}
            {verdict.chainDepth > 0 && (
              <span className="ml-2 text-dim/60">
                {verdict.chainDepth + 1}/{verdict.maxFollowUps}
              </span>
            )}
          </p>
          <p className="text-sm text-bright/85 italic">
            <RichText text={verdict.nextQuestion} />
          </p>
          {verdict.followUpId && (
            <button
              type="button"
              onClick={() => onAnswerFollowUp(verdict.followUpId!, verdict.nextQuestion!)}
              className="mt-3 border border-cyan/40 px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-cyan uppercase transition-colors hover:border-cyan hover:bg-cyan/10"
            >
              ● answer this
            </button>
          )}
        </section>
      )}

      {verdict.followUpExhausted && (
        <section className="border-l-2 border-gold/40 pl-4">
          <p className="eyebrow mb-1.5">chain complete</p>
          <p className="text-sm text-gold/90">{exhaustedLine}</p>
        </section>
      )}

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setShowTranscript((open) => !open)}
          aria-expanded={showTranscript}
          className="flex items-center justify-between font-mono text-[11px] tracking-[0.12em] text-dim uppercase transition-colors hover:text-bright"
        >
          <span>transcript · {wordCount} words · {wpm} wpm</span>
          <span className="text-cyan">{showTranscript ? "−" : "+"}</span>
        </button>
        {showTranscript && (
          <p className="max-h-64 overflow-y-auto border border-line bg-surface/60 p-3 font-mono text-xs leading-relaxed text-dim">
            {transcript.trim() || "(silence — nothing was captured)"}
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onAgain}
          className="flex-1 border border-cyan/50 bg-cyan/5 px-6 py-3.5 font-display font-semibold tracking-wide text-cyan transition-all hover:border-cyan hover:bg-cyan/15"
        >
          GO AGAIN
        </button>
        <button
          type="button"
          onClick={onBackToStart}
          className="border border-line px-6 py-3.5 font-mono text-[11px] tracking-[0.14em] text-dim uppercase transition-colors hover:border-cyan/30 hover:text-bright"
        >
          change settings
        </button>
      </div>
    </motion.div>
  );
}
