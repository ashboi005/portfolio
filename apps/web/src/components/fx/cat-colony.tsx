"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

import Cat from "@/components/fx/cat";
import { emitHearts } from "@/lib/pet";

type CatConfig = {
  variant: "cyan" | "deep";
  scale: number;
  speed: number; // higher = faster
  bottom: number;
};

const CATS: CatConfig[] = [
  { variant: "cyan", scale: 1, speed: 1, bottom: 6 },
  { variant: "deep", scale: 0.72, speed: 1.5, bottom: 10 },
];

/**
 * A colony of cats wanders the viewport: they pad left and right, pause to sit,
 * hop, and occasionally leap onto an invisible ledge before dropping back down.
 * Fixed layer so they roam the whole site as you scroll. Ambient only.
 */
export default function CatColony() {
  const catRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      catRefs.current.forEach((element, index) => {
        if (!element) return;
        const config = CATS[index]!;
        const catWidth = 80 * config.scale;
        let cancelled = false;

        gsap.set(element, { x: Math.random() * (window.innerWidth - catWidth), y: 0, scaleX: 1 });

        const step = () => {
          if (cancelled || !element) return;
          const maxX = Math.max(40, window.innerWidth - catWidth - 10);
          const targetX = Math.random() * maxX;
          const current = (gsap.getProperty(element, "x") as number) ?? 0;
          const dir = targetX >= current ? 1 : -1;
          const distance = Math.abs(targetX - current);
          const duration = Math.max(1.1, distance / (95 * config.speed));

          gsap.to(element, { scaleX: dir, duration: 0.12 });
          element.classList.add("is-walking");

          const roll = Math.random();
          const timeline = gsap.timeline({
            onComplete: () => {
              element.classList.remove("is-walking");
              gsap.delayedCall(0.5 + Math.random() * 2.8, step);
            },
          });

          timeline.to(element, { x: targetX, duration, ease: "none" });

          if (roll < 0.14) {
            // leap onto an invisible ledge, sit, then drop back
            timeline
              .to(element, { y: -150 - Math.random() * 120, duration: 0.5, ease: "power2.out" }, 0)
              .to({}, { duration: 0.8 })
              .to(element, { y: 0, duration: 0.45, ease: "power2.in" });
          } else if (roll < 0.55) {
            // a hop or two mid-stroll
            const hopAt = duration * (0.3 + Math.random() * 0.3);
            timeline
              .to(element, { y: -46, duration: 0.24, ease: "power2.out" }, hopAt)
              .to(element, { y: 0, duration: 0.24, ease: "power2.in" }, hopAt + 0.24);
          }
        };

        gsap.delayedCall(0.6 + index * 1.3, step);

        return () => {
          cancelled = true;
        };
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="cat-layer" aria-hidden>
      {CATS.map((config, index) => (
        <div
          key={config.variant}
          ref={(element) => {
            catRefs.current[index] = element;
          }}
          className="cat-root cursor-pointer"
          style={{ bottom: config.bottom, pointerEvents: "auto" }}
          onPointerDown={(e) => emitHearts(e.clientX, e.clientY)}
          title="pet me"
        >
          <Cat variant={config.variant} scale={config.scale} />
        </div>
      ))}
    </div>
  );
}
