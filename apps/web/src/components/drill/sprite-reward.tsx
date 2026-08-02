"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { CanSprite } from "@/components/quest/quest";
import { emitHearts } from "@/lib/pet";

/**
 * A Sprite can handed out for a good run.
 *
 * The main page hides cans to be found; here one is earned, which is a better
 * fit for a page you come to on purpose. Deliberately not wired into the
 * QuestProvider — collecting it must not touch the site-wide hunt counter, or
 * grinding drills would trivially complete the easter egg.
 */

const SIPS = [
  "carbonated victory. don't get used to it.",
  "you've earned exactly one (1) sprite.",
  "hydration is a production dependency.",
  "cold one for a warm take. nice work.",
  "this is the good stuff. the 3 AM stuff.",
  "drink up, then go break something else.",
  "sponsored by nobody. I just like sprite.",
];

/** The bar for a can. Deliberately above "solid" — a freebie means nothing. */
export const REWARD_THRESHOLD = 70;

export default function SpriteReward({ score }: { score: number }) {
  const [sip, setSip] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const reduceMotion = useReducedMotion();

  if (score < REWARD_THRESHOLD) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 320, damping: 18 }}
      className="flex items-center gap-3 border border-line bg-surface/50 px-4 py-3"
    >
      <button
        type="button"
        aria-label="Take the Sprite can"
        onClick={(event) => {
          emitHearts(event.clientX, event.clientY, 6);
          setSip(SIPS[Math.floor(Math.random() * SIPS.length)]!);
          setTaken(true);
        }}
        className={`shrink-0 transition-transform hover:scale-110 ${taken ? "opacity-60" : "animate-pulse"}`}
      >
        <CanSprite u={3} />
      </button>
      <p className="font-mono text-[11px] text-dim">
        {sip ?? (
          <>
            <span className="text-gold">{score}</span> — that's worth a Sprite. Take it.
          </>
        )}
      </p>
    </motion.div>
  );
}
