"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import Cat from "@/components/fx/cat";
import { emitHearts } from "@/lib/pet";

/**
 * A cat naps beside a tiny pixel laptop, breathing with little "Z"s rising.
 * Every so often it paws at the laptop — the screen flips from a blue smiley to
 * a red scowl, then settles back. Ambient personality, no interaction required.
 */

function PixelLaptop({ angry }: { angry: boolean }) {
  const u = 3;
  const screen = angry ? "#ff4655" : "#33e0ff";
  const ink = "#04121a";
  return (
    <svg width={20 * u} height={15 * u} viewBox={`0 0 ${20 * u} ${15 * u}`} shapeRendering="crispEdges" aria-hidden>
      {/* screen bezel */}
      <rect x={2 * u} y={0} width={16 * u} height={11 * u} fill="#0a0c13" stroke="#1c222e" strokeWidth="1" />
      {/* screen */}
      <rect x={3 * u} y={u} width={14 * u} height={9 * u} fill={screen} opacity="0.9" />
      {/* face */}
      {angry ? (
        <>
          {/* angry brows */}
          <rect x={5 * u} y={3 * u} width={3 * u} height={u} fill={ink} transform={`rotate(18 ${6.5 * u} ${3.5 * u})`} />
          <rect x={12 * u} y={3 * u} width={3 * u} height={u} fill={ink} transform={`rotate(-18 ${13.5 * u} ${3.5 * u})`} />
          <rect x={6 * u} y={4 * u} width={u} height={u} fill={ink} />
          <rect x={13 * u} y={4 * u} width={u} height={u} fill={ink} />
          {/* frown */}
          <rect x={7 * u} y={8 * u} width={6 * u} height={u} fill={ink} />
          <rect x={6 * u} y={7 * u} width={u} height={u} fill={ink} />
          <rect x={13 * u} y={7 * u} width={u} height={u} fill={ink} />
        </>
      ) : (
        <>
          {/* happy eyes */}
          <rect x={6 * u} y={4 * u} width={u} height={2 * u} fill={ink} />
          <rect x={13 * u} y={4 * u} width={u} height={2 * u} fill={ink} />
          {/* smile */}
          <rect x={7 * u} y={7 * u} width={6 * u} height={u} fill={ink} />
          <rect x={6 * u} y={6 * u} width={u} height={u} fill={ink} />
          <rect x={13 * u} y={6 * u} width={u} height={u} fill={ink} />
        </>
      )}
      {/* base / keyboard */}
      <rect x={0} y={11 * u} width={20 * u} height={3 * u} fill="#10131c" stroke="#1c222e" strokeWidth="1" />
      <rect x={8 * u} y={12 * u} width={4 * u} height={u} fill="#0a0c13" />
    </svg>
  );
}

export default function SleepyCat({ className }: { className?: string }) {
  const [angry, setAngry] = useState(false);
  const [paw, setPaw] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      timers.push(
        setTimeout(
          () => {
            setPaw(true);
            setAngry(true);
            timers.push(setTimeout(() => setPaw(false), 320));
            timers.push(setTimeout(() => setAngry(false), 950));
            cycle();
          },
          4200 + Math.random() * 4200,
        ),
      );
    };
    cycle();
    return () => {
      for (const t of timers) clearTimeout(t);
      timers = [];
    };
  }, [reducedMotion]);

  return (
    <div className={`pointer-events-none flex items-end gap-1 ${className ?? ""}`} aria-hidden>
      {/* Zzz */}
      <div className="relative w-4">
        {!reducedMotion &&
          ["Z", "z", "z"].map((z, i) => (
            <span
              // biome-ignore lint: static
              key={i}
              className="zzz absolute font-mono text-cyan"
              style={{
                left: i * 4,
                bottom: 20,
                fontSize: 12 - i * 2,
                animationDelay: `${i * 0.9}s`,
              }}
            >
              {z}
            </span>
          ))}
      </div>

      {/* the napping cat, breathing + occasional paw */}
      <motion.div
        animate={
          reducedMotion
            ? undefined
            : paw
              ? { rotate: 6, x: 4 }
              : { scale: [1, 1.05, 1] }
        }
        transition={paw ? { duration: 0.16 } : { duration: 3, repeat: Number.POSITIVE_INFINITY }}
        style={{ transformOrigin: "bottom right", pointerEvents: "auto" }}
        className="cursor-pointer"
        onPointerDown={(e) => emitHearts(e.clientX, e.clientY)}
        title="shh… or pet me"
      >
        <Cat variant="cyan" pose="sleep" scale={0.62} />
      </motion.div>

      <div className="mb-0.5">
        <PixelLaptop angry={angry} />
      </div>
    </div>
  );
}
