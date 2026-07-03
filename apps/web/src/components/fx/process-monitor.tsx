"use client";

import { useEffect, useState } from "react";

import { processes as PROCS } from "@/lib/content";
import type { ProcessEntry } from "@/types/portfolio";

/**
 * A whimsical `top` readout of the processes "Ashwath" is running right now.
 * CPU numbers jitter every tick so it feels live. Content is the joke.
 */

const STATE_META: Record<ProcessEntry["state"], { label: string; className: string }> = {
  R: { label: "running", className: "text-cyan" },
  D: { label: "uninterruptible", className: "text-gold" },
  Z: { label: "zombie", className: "text-dim" },
  X: { label: "failed", className: "text-signal" },
  S: { label: "sleeping", className: "text-dim" },
};

export default function ProcessMonitor() {
  const [cpu, setCpu] = useState<number[]>(PROCS.map((p) => p.base));
  const [load, setLoad] = useState("4.20");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(() => {
      setCpu(
        PROCS.map((p) =>
          p.state === "X" || p.state === "Z"
            ? p.base
            : Math.max(0, Math.min(99, p.base + Math.round((Math.random() - 0.5) * 12))),
        ),
      );
      setLoad((3.8 + Math.random() * 1.2).toFixed(2));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel corner-ticks p-5 font-mono text-xs">
      <div className="mb-3 flex items-center justify-between text-[11px] text-dim">
        <span>
          top — <span className="text-cyan">ashwath@prod</span>
        </span>
        <span suppressHydrationWarning>
          load avg: <span className="text-gold">{load}</span> (send help)
        </span>
      </div>
      <div className="mb-2 grid grid-cols-[3ch_1fr_5ch_auto] gap-2 border-b border-line pb-1 text-[10px] tracking-wider text-dim uppercase">
        <span>pid</span>
        <span>process</span>
        <span className="text-right">cpu</span>
        <span>state</span>
      </div>
      <div className="space-y-1">
        {PROCS.map((proc, index) => {
          const meta = STATE_META[proc.state];
          return (
            <div key={proc.pid} className="grid grid-cols-[3ch_1fr_5ch_auto] items-center gap-2">
              <span className="text-dim/70">{proc.pid}</span>
              <span className="truncate text-bright/85">{proc.name}</span>
              <span className="text-right text-bright/70 tabular-nums" suppressHydrationWarning>
                {cpu[index]}%
              </span>
              <span className={`${meta.className} text-[11px]`}>
                {proc.state} · {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
