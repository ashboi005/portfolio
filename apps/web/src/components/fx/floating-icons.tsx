"use client";

import { useEffect, useRef } from "react";

import { floaters } from "@/lib/content";

/**
 * A global, fixed background layer of desaturated tool/tech icons drifting in
 * space with light physics — constant velocity, bouncing off the viewport
 * edges. Icons come from `content.json` → `floaters` (files in public/floaters).
 * Fewer icons on small screens; frozen for reduced motion.
 */

type Body = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  rot: number;
};

export default function FloatingIcons() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || floaters.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;
    // scale count to viewport; keep it calm
    const count = isMobile ? Math.min(5, floaters.length) : Math.min(12, floaters.length * 2);

    const rng = (() => {
      let a = 991;
      return () => {
        a = (a * 1103515245 + 12345) & 0x7fffffff;
        return a / 0x7fffffff;
      };
    })();

    let W = window.innerWidth;
    let H = window.innerHeight;
    const bodies: Body[] = [];

    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "floater";
      const src = floaters[i % floaters.length]!;
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      el.appendChild(img);
      const size = 21 + Math.round(rng() * 25);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      layer.appendChild(el);
      const speed = reduced ? 0 : 8 + rng() * 14;
      const angle = rng() * Math.PI * 2;
      bodies.push({
        el,
        x: rng() * (W - size),
        y: rng() * (H - size),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        spin: (rng() - 0.5) * (reduced ? 0 : 10),
        rot: rng() * 360,
      });
    }

    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      for (const b of bodies) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.spin * dt;
        if (b.x <= 0) {
          b.x = 0;
          b.vx = Math.abs(b.vx);
        } else if (b.x >= W - b.size) {
          b.x = W - b.size;
          b.vx = -Math.abs(b.vx);
        }
        if (b.y <= 0) {
          b.y = 0;
          b.vy = Math.abs(b.vy);
        } else if (b.y >= H - b.size) {
          b.y = H - b.size;
          b.vy = -Math.abs(b.vy);
        }
        b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.rot}deg)`;
      }
      raf = requestAnimationFrame(step);
    };

    // place immediately even if reduced (static scatter)
    for (const b of bodies) {
      b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0) rotate(${b.rot}deg)`;
    }
    if (!reduced) raf = requestAnimationFrame(step);

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // The ambient floaters clear the stage for the warp corridor and whoami —
    // only the dedicated warp icons fly there. Fade the layer out while
    // either region is on screen.
    const hideWhile = ["warp-corridor", "whoami"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const visible = new Set<Element>();
    // negative margin so merely touching the viewport edge doesn't count —
    // the corridor starts exactly at the hero's bottom edge
    const regionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        layer.style.opacity = visible.size > 0 ? "0" : "1";
      },
      { rootMargin: "-12% 0px -12% 0px" },
    );
    for (const region of hideWhile) regionObserver.observe(region);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      regionObserver.disconnect();
      for (const b of bodies) b.el.remove();
    };
  }, []);

  return <div ref={layerRef} className="floaters-layer" aria-hidden />;
}
