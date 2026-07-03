"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { activity } from "@/lib/content";

/**
 * A live `tail -f` activity feed for the event stream — playful log lines stream
 * in on a timer with fake timestamps, newest highlighted, oldest scrolling off.
 * Feels like the system is quietly doing its own thing.
 */
type Row = { id: number; time: string; msg: string };

const MAX = 7;

function stamp(offsetSec: number) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const base = 5 * 3600 + 42 * 60 + 11 + offsetSec; // 05:42:11-ish, deterministic seed
  const t = base % 86400;
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

export default function LiveLog() {
  const reducedMotion = useReducedMotion();
  const idRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    activity.slice(0, MAX).map((msg, i) => ({ id: idRef.current++, time: stamp(i * 7), msg })),
  );

  useEffect(() => {
    if (reducedMotion) return;
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      const msg = activity[Math.floor(Math.random() * activity.length)]!;
      setRows((prev) => {
        const next = [...prev, { id: idRef.current++, time: stamp(1000 + tick * 5), msg }];
        return next.slice(-MAX);
      });
    }, 1900);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="panel mt-8 overflow-hidden p-5">
      <div className="mb-3 flex items-center justify-between font-mono text-[11px] text-dim">
        <span>
          <span className="text-cyan">[SYS]</span> live activity — tail -f /var/log/ashwath
        </span>
        <span className="flex items-center gap-1.5 text-cyan">
          <span className="led" aria-hidden />
          streaming
        </span>
      </div>
      <div className="space-y-1 font-mono text-[11px] sm:text-xs">
        <AnimatePresence initial={false}>
          {rows.map((row, index) => {
            const newest = index === rows.length - 1;
            return (
              <motion.div
                key={row.id}
                layout={!reducedMotion}
                initial={reducedMotion ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: newest ? 1 : 0.45 + (index / rows.length) * 0.4, x: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="flex gap-3"
              >
                <span className="shrink-0 text-dim/60 tabular-nums">{row.time}</span>
                <span className={newest ? "text-cyan" : "text-bright/60"}>
                  <span className="text-dim">›</span> {row.msg}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
