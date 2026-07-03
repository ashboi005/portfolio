"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { nextFact } from "@/lib/fact-tracker";

/**
 * The classic "well, actually" nerd — 🤓 with a raised index finger ☝️ — parked
 * on the right of the hero. Click it and it serves a random fact (same pool as
 * the terminal `fact` command) in a little chat bubble.
 */
export default function NerdBuddy() {
  const [fact, setFact] = useState<string | null>(null);
  const [nudged, setNudged] = useState(false);
  const reducedMotion = useReducedMotion();

  const speak = () => {
    setNudged(true);
    setFact(nextFact());
  };

  return (
    <div className="pointer-events-none absolute right-[14%] top-1/2 z-20 hidden -translate-y-1/2 lg:block">
      <div className="relative flex flex-col items-center gap-3">
        <AnimatePresence>
          {fact && (
            <motion.div
              key={fact}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="panel pointer-events-auto absolute bottom-full mb-5 w-64 p-4"
            >
              <p className="mb-1.5 font-mono text-[10px] tracking-wider text-cyan uppercase">
                nerd.exe says:
              </p>
              <p className="text-[13px] leading-relaxed text-bright/90">{fact}</p>
              <span
                className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-line bg-surface"
                aria-hidden
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={speak}
          aria-label="Ask the nerd for a random fact"
          className="pointer-events-auto relative cursor-pointer select-none leading-none drop-shadow-[0_0_24px_rgba(51,224,255,0.3)]"
          animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 3.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          whileHover={{ scale: 1.08, rotate: -3 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="block text-[96px]" role="img" aria-hidden>
            🤓
          </span>
          <span
            className="absolute -left-5 bottom-1 text-5xl -rotate-12"
            role="img"
            aria-hidden
          >
            ☝️
          </span>
        </motion.button>

        {!nudged && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0.4] }}
            transition={{ delay: 1.6, duration: 2.4, repeat: Number.POSITIVE_INFINITY }}
            className="font-mono text-[10px] tracking-wider text-dim uppercase"
          >
            click me →
          </motion.span>
        )}
      </div>
    </div>
  );
}
