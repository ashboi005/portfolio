"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Materializes the page content out of the hyperlapse instead of letting it
 * scroll in as the next section. When `active` (corridor mounted, desktop),
 * the block is pulled up one viewport over the corridor's tail; during that
 * overlap a counter-translation pins it to the top of the screen while
 * opacity/scale ramp — so whoami fades in over the streaking starfield in
 * place, then unpins seamlessly once fully solid.
 *
 * The reveal is downward-only: progress latches (never dissolves back on the
 * way up) and resets once fully above the overlap. When `active` is false
 * (mobile, or the corridor has been unmounted at the hero) the block is plain
 * flow — no margin, no transform. Mount/unmount is owned by WarpSequence.
 */
export default function WarpReveal({
  children,
  active,
}: {
  children: React.ReactNode;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // p: 0 → block's natural top at viewport bottom · 1 → at viewport top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  const progress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value > progress.get()) progress.set(value);
    else if (value < 0.02 && progress.get() > 0) progress.set(0);
  });
  useEffect(() => {
    progress.set(scrollYProgress.get());
  }, [progress, scrollYProgress]);

  const y = useTransform(progress, (p) => `${-(1 - p) * 100}svh`);
  const opacity = useTransform(progress, [0, 0.25, 0.85, 1], [0, 0.12, 0.92, 1]);
  const scale = useTransform(progress, [0, 1], [1.1, 1]);

  return (
    <motion.div
      ref={ref}
      className={`relative z-10 bg-void ${active ? "-mt-[100svh]" : ""}`}
      style={active ? { y, opacity, scale, transformOrigin: "50% 12%" } : undefined}
    >
      {children}
    </motion.div>
  );
}
