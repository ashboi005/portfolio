"use client";

import { useEffect, useRef, useState } from "react";

import { floaters } from "@/lib/content";

/**
 * The warp corridor between the hero and whoami (desktop only). A sticky
 * full-viewport starfield of code glyphs and tool icons (content.json →
 * `floaters`, same folder the colored SVGs go into). Flight speed is driven
 * by scroll velocity: scroll fast and everything stretches into hyperlapse
 * streaks, stop and the field freezes mid-space. ~1.2 screens of scroll later
 * the whoami section pops in underneath.
 */

const GLYPHS = [
  "{", "}", "</>", "=>", "&&", "||", "();", "::", "$_", "#!", "0x1F",
  "async", "await", "sudo", "git push", "404", "NaN", "TODO", "npm i",
  ";", "*", "%s", "|>", "===", "?.", "curl", "grep",
];

type Particle = {
  x: number;
  y: number;
  z: number;
  kind: "glyph" | "icon";
  glyph: string;
  icon: number;
  hue: "cyan" | "bright" | "gold";
  size: number;
};

const COLORS = {
  cyan: [51, 224, 255],
  bright: [212, 226, 240],
  gold: [255, 209, 102],
} as const;

function makeParticle(z?: number): Particle {
  const roll = Math.random();
  return {
    x: (Math.random() - 0.5) * 2.4,
    y: (Math.random() - 0.5) * 2.4,
    z: z ?? 0.05 + Math.random(),
    kind: roll < 0.34 && floaters.length > 0 ? "icon" : "glyph",
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!,
    icon: Math.floor(Math.random() * floaters.length),
    hue: roll > 0.85 ? "gold" : roll > 0.55 ? "bright" : "cyan",
    size: 9 + Math.random() * 8,
  };
}

export default function HyperlapseGate() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [warpPct, setWarpPct] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    // the wrapper is display:none below lg — nothing to run
    if (wrapper.offsetParent === null && wrapper.getClientRects().length === 0) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const icons = floaters.map((src) => {
      const image = new Image();
      image.src = src;
      return image;
    });

    const particles: Particle[] = Array.from({ length: 170 }, () => makeParticle());

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let active = false;
    const observer = new IntersectionObserver(
      (entries) => {
        active = entries.some((entry) => entry.isIntersecting);
        if (active) schedule();
      },
      { rootMargin: "10% 0px" },
    );
    observer.observe(wrapper);

    let raf = 0;
    let lastY = window.scrollY;
    let speed = 0;
    let lastPct = -1;

    const draw = () => {
      raf = 0;
      if (!active) return;

      // scroll velocity → warp speed (decays to zero when the user stops)
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      const target = reduced ? 0 : Math.max(-0.06, Math.min(0.06, dy * 0.00045));
      speed += (target - speed) * 0.14;
      if (Math.abs(speed) < 0.00001) speed = 0;

      // progress through the corridor, for the warp readout
      const rect = wrapper.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      const pct = Math.round(progress * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        setWarpPct(pct);
      }

      context.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const focal = 0.85 * Math.min(width, height);
      const stretch = Math.min(1, Math.abs(speed) / 0.02);

      for (const particle of particles) {
        particle.z -= speed * (0.4 + particle.z);
        if (particle.z <= 0.04) Object.assign(particle, makeParticle(1.05));
        else if (particle.z > 1.1) Object.assign(particle, makeParticle(0.05));

        const px = cx + (particle.x * focal) / particle.z;
        const py = cy + (particle.y * focal) / particle.z;
        if (px < -60 || px > width + 60 || py < -60 || py > height + 60) continue;

        const depth = 1 - Math.min(1, particle.z);
        const [r, g, b] = COLORS[particle.hue];

        if (stretch > 0.02) {
          // streak: where this particle was a few frames ago, projected
          const zTail = Math.min(1.2, particle.z + speed * 7 * (0.4 + particle.z));
          const tx = cx + (particle.x * focal) / zTail;
          const ty = cy + (particle.y * focal) / zTail;
          const gradient = context.createLinearGradient(tx, ty, px, py);
          gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
          gradient.addColorStop(1, `rgba(${r},${g},${b},${(0.25 + 0.65 * depth) * stretch})`);
          context.strokeStyle = gradient;
          context.lineWidth = Math.max(0.6, 2.2 * depth);
          context.beginPath();
          context.moveTo(tx, ty);
          context.lineTo(px, py);
          context.stroke();
        }

        const bodyAlpha = (0.25 + 0.7 * depth) * (1 - stretch * 0.75);
        if (bodyAlpha <= 0.02) continue;
        context.globalAlpha = bodyAlpha;
        if (particle.kind === "icon") {
          const image = icons[particle.icon];
          if (image?.complete && image.naturalWidth > 0) {
            const s = (particle.size + 16) * (0.35 + depth);
            context.drawImage(image, px - s / 2, py - s / 2, s, s);
          }
        } else {
          context.fillStyle = `rgb(${r},${g},${b})`;
          context.font = `${(particle.size * (0.5 + depth)).toFixed(1)}px ui-monospace, monospace`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(particle.glyph, px, py);
        }
        context.globalAlpha = 1;
      }

      schedule();
    };

    const schedule = () => {
      if (!raf && active) raf = requestAnimationFrame(draw);
    };
    schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative hidden lg:block lg:h-[220vh]" aria-hidden>
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* blend edges into the hero above and whoami below */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-void to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void to-transparent" />

        {/* warp readout */}
        <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <p className="font-mono text-[11px] tracking-[0.3em] text-dim uppercase">
            <span className="text-cyan">[WARP]</span> route /boot → /whoami ·{" "}
            <span className="text-cyan tabular-nums">{warpPct}%</span>
            {warpPct === 0 && <span className="text-dim"> — scroll to engage</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
