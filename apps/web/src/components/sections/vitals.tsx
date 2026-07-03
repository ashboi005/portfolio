"use client";

import { useEffect, useRef, useState } from "react";

import CountUp from "@/components/fx/count-up";
import ScrambleText from "@/components/fx/scramble-text";
import Reveal from "@/components/fx/reveal";
import SectionHeader from "@/components/sections/section-header";
import { sections, vitals as vitalsContent } from "@/lib/content";

const STATS = vitalsContent.stats;
const LOADS = vitalsContent.loads;
const READOUTS = vitalsContent.readouts;

/** A tiny always-ticking readout — fake but plausible live telemetry. */
function LiveReadout({ label, base, spread, unit }: { label: string; base: number; spread: number; unit: string }) {
  const [value, setValue] = useState(base);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(() => {
      setValue(base + Math.round((Math.random() - 0.5) * spread));
    }, 1200);
    return () => clearInterval(interval);
  }, [base, spread]);
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="font-mono text-[11px] text-dim">{label}</span>
      <span className="font-mono text-sm text-cyan tabular-nums" suppressHydrationWarning>
        {value}
        <span className="text-dim">{unit}</span>
      </span>
    </div>
  );
}

/** Meter bars that fill only once scrolled into view. */
function LoadMeters() {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="space-y-4">
      {LOADS.map((load) => (
        <div key={load.label}>
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
            <span className="text-dim">{load.label}</span>
            <span className={load.critical ? "text-signal" : "text-cyan"}>
              {live ? load.pct : 0}%
            </span>
          </div>
          <div className="meter-track">
            <div
              className="meter-fill"
              style={{
                width: live ? `${load.pct}%` : "0%",
                background: load.critical
                  ? "linear-gradient(90deg, #7a1d24, var(--signal))"
                  : undefined,
                boxShadow: load.critical ? "0 0 10px rgba(255,70,85,0.5)" : undefined,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Vitals() {
  return (
    <section id="vitals" className="relative border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionHeader {...sections.vitals} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05}>
              <div className="panel panel-hover corner-ticks group h-full p-6">
                <div
                  className={`font-display text-4xl font-bold sm:text-5xl ${
                    stat.critical ? "text-signal" : "text-cyan"
                  }`}
                >
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <ScrambleText
                  text={stat.label}
                  className="mt-2 block text-sm text-bright/85"
                  trigger="hover"
                />
                <p className="mt-1 font-mono text-[11px] text-dim">// {stat.note}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="panel h-full p-6">
              <p className="eyebrow mb-5">
                <span className="sigil">[LOAD]</span> core utilization — nice-value 0
              </p>
              <LoadMeters />
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="panel h-full p-6">
              <p className="eyebrow mb-4">
                <span className="sigil">[NET]</span> live socket
              </p>
              <div className="signal-strip mb-4" aria-hidden />
              {READOUTS.map((r) => (
                <LiveReadout key={r.label} label={r.label} base={r.base} spread={r.spread} unit={r.unit} />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
