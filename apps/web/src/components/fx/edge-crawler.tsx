"use client";

import { gsap } from "gsap";
import { useEffect, useRef } from "react";

import Cat from "@/components/fx/cat";
import { emitHearts } from "@/lib/pet";

/**
 * A cat that sneaks around the perimeter of the viewport — crawling the bottom
 * edge, pivoting at the corner, climbing the side, and along the top. Loops.
 */
export default function EdgeCrawler() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = ref.current;
    if (!element) return;

    let timeline: gsap.core.Timeline;

    const build = () => {
      timeline?.kill();
      const W = window.innerWidth;
      const H = window.innerHeight;
      const size = 58;
      const m = 8;
      const speed = 90; // px/sec
      const edgeH = (W - size - m * 2) / speed;
      const edgeV = (H - size - m * 2) / speed;

      element.classList.add("is-walking");
      gsap.set(element, { x: m, y: H - size - m, rotation: 0, transformOrigin: "50% 50%" });

      timeline = gsap
        .timeline({ repeat: -1 })
        .to(element, { x: W - size - m, duration: edgeH, ease: "none" })
        .to(element, { rotation: -90, duration: 0.35, ease: "power1.inOut" })
        .to(element, { y: m, duration: edgeV, ease: "none" })
        .to(element, { rotation: -180, duration: 0.35, ease: "power1.inOut" })
        .to(element, { x: m, duration: edgeH, ease: "none" })
        .to(element, { rotation: -270, duration: 0.35, ease: "power1.inOut" })
        .to(element, { y: H - size - m, duration: edgeV, ease: "none" })
        .to(element, { rotation: -360, duration: 0.35, ease: "power1.inOut" })
        .set(element, { rotation: 0 });
    };

    build();
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      timeline?.kill();
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="edge-cat cursor-pointer"
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => emitHearts(e.clientX, e.clientY)}
      title="pet me"
    >
      <Cat variant="deep" scale={0.66} />
    </div>
  );
}
