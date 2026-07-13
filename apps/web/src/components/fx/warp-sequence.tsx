"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import HyperlapseGate from "@/components/fx/hyperlapse-gate";
import WarpReveal from "@/components/fx/warp-reveal";

/**
 * Owns the mount/unmount lifecycle of the desktop hyperlapse corridor.
 *
 * The corridor is a tall (many-viewport) spacer that gives the descent room
 * to play. Keeping it mounted while scrolling back up would mean traversing a
 * long empty spacer to reach the hero. Instead:
 *
 *  - It is mounted (and whoami overlaps its tail) while descending, so the
 *    full hyperlapse plays and whoami materializes out of it.
 *  - The instant the visitor scrolls back up out of whoami, the corridor is
 *    unmounted and the scroll position compensated so whoami stays visually
 *    pinned — now sitting directly under the hero. The remaining scroll up to
 *    the hero is short and smooth (no wall, no abrupt jump).
 *  - Once they head back down through the hero it re-mounts below, so the
 *    hyperlapse is available again on the next descent.
 *
 * Below `lg` the corridor never mounts and the content is plain flow.
 */
export default function WarpSequence({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;
  // scroll position to apply synchronously right after a mount toggle so the
  // layout change (corridor added/removed) causes no visible jump
  const pendingScroll = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setEnabled(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    if (pendingScroll.current != null) {
      window.scrollTo({ top: pendingScroll.current, behavior: "instant" });
      pendingScroll.current = null;
    }
  }, [mounted]);

  useEffect(() => {
    if (!enabled) {
      setMounted(false);
      return;
    }
    let lastY = window.scrollY;
    let raf = 0;
    let reachedWhoami = false;

    const heroBottomPx = () => {
      const heroEl = document.getElementById("boot");
      return heroEl ? heroEl.offsetTop + heroEl.offsetHeight : window.innerHeight;
    };

    // Remount is gated on `armed` (not a live scrollY read at wheel time — the
    // wheel's own scroll advances scrollY before the handler runs, which is
    // racy right at the threshold). `armed` only turns true once the visitor
    // has genuinely scrolled back up into the hero (≥60% of it on screen), and
    // turns off once they leave it. So nudging a few px up out of whoami and
    // scrolling down again does NOT reload the corridor — you must actually
    // return to the hero first. Seeded true so the very first descent works.
    const HERO_ARM_RATIO = 0.4;
    let armed = window.scrollY <= heroBottomPx() * HERO_ARM_RATIO;

    // Runs off scroll position (any scroll source): unmount logic while
    // mounted; arm/disarm tracking while flat.
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cur = window.scrollY;
        const up = cur < lastY - 1;
        lastY = cur;
        if (mountedRef.current) {
          const corridor = document.getElementById("warp-corridor");
          if (!corridor) return;
          const vh = window.innerHeight;
          const corridorTop = corridor.getBoundingClientRect().top + cur;
          const corridorH = corridor.offsetHeight;
          const whoamiTop = corridorTop + corridorH - vh;
          if (cur >= whoamiTop) reachedWhoami = true;
          if (reachedWhoami && up && cur > corridorTop + 4 && cur < whoamiTop) {
            // leaving whoami upward → drop the corridor, keep whoami pinned so
            // the remaining scroll up to the hero is short and smooth
            reachedWhoami = false;
            armed = false;
            pendingScroll.current = Math.max(0, cur - (corridorH - vh));
            setMounted(false);
          } else if (cur <= 2) {
            // reached the very top with the corridor still mounted — it's below
            // the viewport here, so drop it with no compensation
            reachedWhoami = false;
            armed = false;
            setMounted(false);
          }
        } else {
          const heroBottom = heroBottomPx();
          if (cur <= heroBottom * HERO_ARM_RATIO) armed = true;
          else if (cur > heroBottom) armed = false;
        }
      });
    };

    // Mount on a genuine downward wheel/touch, but only while armed. Anchor-link
    // navigation fires programmatic scrolls with no wheel event, so those stay
    // flat and jump straight to their target instead of desyncing against a
    // corridor that mounts mid-animation.
    const armMount = () => {
      if (!mountedRef.current && armed) setMounted(true);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) armMount();
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (touchY - y > 2) armMount(); // finger moving up = scrolling down
      touchY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return (
    <>
      {enabled && mounted && <HyperlapseGate />}
      <WarpReveal active={enabled && mounted}>{children}</WarpReveal>
    </>
  );
}
