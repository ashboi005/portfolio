"use client";

import { Award, Crown, Trophy, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import CountUp from "@/components/fx/count-up";
import LiveLog from "@/components/fx/live-log";
import SectionHeader from "@/components/sections/section-header";
import { rank, sections } from "@/lib/content";
import { useInViewOnce } from "@/lib/use-in-view-once";
import type { AchievementPayload } from "@/types/portfolio";

const KIND_META: Record<
  string,
  { tag: string; className: string; border: string; Icon: typeof Trophy }
> = {
  win: { tag: "WIN", className: "text-cyan", border: "border-cyan/40", Icon: Trophy },
  lead: { tag: "LEAD", className: "text-gold", border: "border-gold/40", Icon: Crown },
  community: { tag: "COMM", className: "text-dim", border: "border-line", Icon: Users },
};

function EventRow({ achievement, index }: { achievement: AchievementPayload; index: number }) {
  const kind = KIND_META[achievement.kind] ?? KIND_META.community!;
  const { Icon } = kind;
  const fromLeft = index % 2 === 0;
  const { ref, seen } = useInViewOnce<HTMLDivElement>("-60px");

  return (
    <div
      ref={ref}
      className={`win-fx panel panel-hover corner-ticks flex items-start gap-4 border-l-2 ${kind.border} p-5 ${seen ? "is-seen" : ""}`}
      style={
        {
          "--win-from": fromLeft ? "-90px" : "90px",
          "--win-rot": fromLeft ? "-3deg" : "3deg",
        } as React.CSSProperties
      }
    >
      <span
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border border-line bg-surface-2 ${kind.className}`}
      >
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className={kind.className}>[{kind.tag}]</span>
          <span className="text-dim tabular-nums">{achievement.year ?? "————"}</span>
        </div>
        <p className="mt-1 font-display text-lg font-semibold text-bright">{achievement.title}</p>
        {achievement.detail && (
          <p className="mt-1 text-sm leading-relaxed text-dim">{achievement.detail}</p>
        )}
      </div>
    </div>
  );
}

function RankBanner() {
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
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="panel corner-ticks relative mb-10 overflow-hidden p-6">
      <div className="badge-shine pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Trophy className="trophy-pulse text-gold" size={44} aria-hidden />
          <div>
            <p className="eyebrow mb-1">
              <span className="sigil">[RANK]</span> current tier
            </p>
            <p className="font-display text-2xl font-bold text-bright sm:text-3xl">{rank.tier}</p>
          </div>
        </div>
        <div className="flex gap-8">
          <div>
            <p className="font-display text-3xl font-bold text-cyan">
              <CountUp value={rank.podium} />
            </p>
            <p className="font-mono text-[11px] text-dim">podium finishes</p>
          </div>
          <div>
            <p className="font-display text-3xl font-bold text-cyan">
              <CountUp value={rank.teamsLed} suffix={rank.teamsSuffix} />
            </p>
            <p className="font-mono text-[11px] text-dim">teams led</p>
          </div>
        </div>
      </div>
      {/* XP bar */}
      <div className="relative mt-5">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-dim">
          <span>XP → next tier: {rank.nextTier}</span>
          <span className="text-cyan">{live ? rank.xpPct : 0}%</span>
        </div>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: live ? `${rank.xpPct}%` : "0%" }} />
        </div>
      </div>
    </div>
  );
}

export default function Achievements({ achievements }: { achievements: AchievementPayload[] }) {
  const reducedMotion = useReducedMotion();
  const marquee = [...achievements, ...achievements];

  return (
    <section id="wins" className="relative overflow-hidden border-t border-line">
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionHeader {...sections.wins} />

        <RankBanner />

        {/* scrolling ticker of event tags */}
        <div className="mb-10 overflow-hidden border-y border-line py-2">
          <motion.div
            className="flex w-max gap-8 font-mono text-[11px] whitespace-nowrap text-dim"
            animate={reducedMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={{ duration: 22, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
          >
            {marquee.map((event, index) => (
              <span key={`${event.id}-${index}`} className="flex items-center gap-2">
                <Award size={11} className="text-gold" aria-hidden />
                {event.title}
                <span className="text-cyan">·</span>
              </span>
            ))}
          </motion.div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {achievements.map((achievement, index) => (
            <EventRow key={achievement.id} achievement={achievement} index={index} />
          ))}
        </div>

        <LiveLog />
      </div>
    </section>
  );
}
