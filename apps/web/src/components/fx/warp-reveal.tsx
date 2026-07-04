"use client";

import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Materializes the page content out of the hyperlapse instead of letting it
 * scroll in as the next section. The block is pulled up one viewport over the
 * corridor's tail (page.tsx); during that overlap a counter-translation pins
 * it to the top of the screen while opacity/scale ramp — so whoami fades in
 * over the streaking starfield in place, with zero perceived scrolling, and
 * unpins seamlessly once fully solid.
 *
 * The effect is ONE-WAY per descent: while scrolling up the progress holds
 * (no dissolve back into the starfield — the section just scrolls away),
 * and it re-arms once the visitor is fully back above the overlap, so the
 * materialization plays again on every trip down. Desktop only; plain flow
 * otherwise.
 */
export default function WarpReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // p: 0 → block's natural top at viewport bottom · 1 → at viewport top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  // hold-and-re-arm latch: follows scrollYProgress downward, holds on the
  // way up (no reverse dissolve), and resets once fully above the overlap
  // (the block is off-screen there) so the next descent materializes again
  const progress = useMotionValue(0);
  useMotionValueEvent(scrollYProgress, "change", (value) => {
    if (value > progress.get()) progress.set(value);
    else if (value < 0.02 && progress.get() > 0) progress.set(0);
  });
  useEffect(() => {
    // reload mid-page (browser scroll restoration) → start solid, not hidden
    progress.set(scrollYProgress.get());
  }, [progress, scrollYProgress]);

  // counter-translate by the remaining distance so the block stays pinned
  // at the top of the viewport for the whole overlap (materialize, not slide)
  const y = useTransform(progress, (p) => `${-(1 - p) * 100}svh`);
  const opacity = useTransform(progress, [0, 0.25, 0.85, 1], [0, 0.12, 0.92, 1]);
  const scale = useTransform(progress, [0, 1], [1.1, 1]);

  return (
    <motion.div
      ref={ref}
      className="relative z-10 bg-void lg:-mt-[100svh]"
      style={
        enabled
          ? { y, opacity, scale, transformOrigin: "50% 12%" }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
