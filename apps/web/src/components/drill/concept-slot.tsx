"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { DECOY_TITLES } from "@/lib/drill-decoys";
import type { Concept } from "@/lib/drill";

/**
 * The slot-machine reel that deals a concept.
 *
 * The reel starts on the same frame as the click, using hardcoded decoy titles,
 * and keeps flicking until the real concept arrives from the server. The
 * network wait *is* the animation, so latency is invisible — a fast response
 * still gets `minSpinMs` of spin so the reveal never feels abrupt, and a slow
 * one just spins a little longer.
 */

/** Interval between decoys at full speed. */
const SPIN_MS = 55;

/** Deceleration ramp, one decoy per step, before the real title lands. */
const DECEL_STEPS = [75, 100, 135, 180, 240, 320];

const LEVEL_STYLES: Record<string, string> = {
  beginner: "border-cyan/40 text-cyan",
  intermediate: "border-gold/40 text-gold",
  advanced: "border-signal/40 text-signal",
};

function randomDecoy(previous: string): string {
  if (DECOY_TITLES.length < 2) return DECOY_TITLES[0]!;
  let next = previous;
  while (next === previous) next = DECOY_TITLES[Math.floor(Math.random() * DECOY_TITLES.length)]!;
  return next;
}

export default function ConceptSlot({
  spinning,
  target,
  minSpinMs = 1500,
  onSettled,
}: {
  spinning: boolean;
  /** The real concept, once fetched. Null while in flight. */
  target: Concept | null;
  minSpinMs?: number;
  onSettled: () => void;
}) {
  const [display, setDisplay] = useState<string>(DECOY_TITLES[0]!);
  const [settled, setSettled] = useState(false);
  const reduceMotion = useReducedMotion();

  // Read the latest values from inside the timeout chain without restarting it.
  const targetRef = useRef(target);
  targetRef.current = target;
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (!spinning) {
      setSettled(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const land = () => {
      const concept = targetRef.current;
      if (!concept) return;
      setDisplay(concept.title);
      setSettled(true);
      onSettledRef.current();
    };

    const decelerate = (step: number) => {
      if (cancelled) return;
      if (step >= DECEL_STEPS.length) {
        land();
        return;
      }
      setDisplay(randomDecoy(targetRef.current?.title ?? ""));
      timer = setTimeout(() => decelerate(step + 1), DECEL_STEPS[step]!);
    };

    const spin = () => {
      if (cancelled) return;
      // Land only once the server has answered AND the reel has had its
      // minimum run, so a cached response doesn't flash past.
      if (targetRef.current && Date.now() - startedAt >= minSpinMs) {
        decelerate(0);
        return;
      }
      setDisplay((previous) => randomDecoy(previous));
      timer = setTimeout(spin, SPIN_MS);
    };

    // Reduced motion: no reel at all, just wait for the concept and show it.
    if (reduceMotion) {
      const poll = setInterval(() => {
        if (targetRef.current) {
          clearInterval(poll);
          land();
        }
      }, 120);
      return () => {
        cancelled = true;
        clearInterval(poll);
      };
    }

    spin();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [spinning, minSpinMs, reduceMotion]);

  const concept = settled ? target : null;

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <p className="eyebrow">
        <span className="sigil">▸</span> {settled ? "topic locked" : "dealing topic…"}
      </p>

      <div className="relative flex min-h-[7rem] w-full items-center justify-center px-4 sm:min-h-[8rem]">
        <motion.h2
          key={settled ? "settled" : display}
          initial={settled && !reduceMotion ? { scale: 1.14, opacity: 0.4 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 460, damping: 22 }}
          className={`font-display text-2xl leading-tight font-semibold tracking-tight sm:text-3xl lg:text-4xl ${
            settled ? "text-bright" : "text-dim/70 blur-[0.4px] select-none"
          }`}
        >
          {display}
        </motion.h2>
      </div>

      {concept ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span className={`border px-2 py-1 ${LEVEL_STYLES[concept.level] ?? "border-line text-dim"}`}>
              {concept.level}
            </span>
            {concept.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="border border-line px-2 py-1 text-dim">
                {tag}
              </span>
            ))}
          </div>

          {concept.probes.length > 0 && (
            <div className="max-w-xl text-left">
              <p className="eyebrow mb-2 text-center">worth covering</p>
              <ul className="flex flex-col gap-1.5 font-mono text-xs text-dim">
                {concept.probes.map((probe) => (
                  <li key={probe} className="flex gap-2">
                    <span className="text-cyan/60">·</span>
                    <span>{probe}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      ) : (
        // Reserve the space the badges will occupy so the layout doesn't jump.
        <div className="h-24" aria-hidden="true" />
      )}
    </div>
  );
}
