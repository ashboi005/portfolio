"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import SectionHeader from "@/components/sections/section-header";
import { sections } from "@/lib/content";
import { highlightKeywords } from "@/lib/keywords";
import type { ExperiencePayload } from "@/types/portfolio";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function DeployEntry({
  entry,
  index,
  level,
}: {
  entry: ExperiencePayload;
  index: number;
  level: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.article
      className="relative pl-10 sm:pl-14"
      initial={reducedMotion ? undefined : { opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* node on the pipeline */}
      <motion.span
        className="absolute left-[9px] top-2 z-10 flex h-4 w-4 items-center justify-center sm:left-[21px]"
        initial={reducedMotion ? undefined : { scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 400, damping: 14 }}
      >
        <span className="absolute h-4 w-4 rounded-full bg-cyan/20" />
        <span className={`h-2 w-2 rounded-full ${entry.isActive ? "bg-cyan" : "bg-dim"}`}>
          {entry.isActive && <span className="led text-cyan" />}
        </span>
      </motion.span>

      <div className="mc-block relative overflow-hidden">
        <div className="mc-grass-top" aria-hidden />
        <div className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-dim">
          <span className="font-pixel text-[8px] text-cyan">LVL&nbsp;{level}</span>
          <span className="text-cyan">
            deploy: {slugify(entry.company)}/{slugify(entry.role)}
          </span>
          <span>{entry.duration}</span>
          {entry.location && <span>· {entry.location}</span>}
          {entry.isActive ? (
            <span className="flex items-center gap-1.5 text-cyan">
              <span className="led" aria-hidden />
              RUNNING
            </span>
          ) : (
            <span className="text-dim">EXITED 0</span>
          )}
        </div>

        <h3 className="font-display text-xl font-semibold text-bright sm:text-2xl">
          {entry.role} <span className="font-normal text-dim">@ {entry.company}</span>
        </h3>

        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-bright/80">
          {highlightKeywords(entry.description)}
        </p>

        {entry.highlights.length > 0 && (
          <ul className="mt-4 max-w-prose space-y-2">
            {entry.highlights.map((highlight) => (
              <li
                key={highlight.slice(0, 32)}
                className="flex gap-2.5 text-sm leading-relaxed text-bright/75"
              >
                <span className="mt-0.5 shrink-0 font-mono text-cyan" aria-hidden>
                  ▸
                </span>
                <span>{highlightKeywords(highlight)}</span>
              </li>
            ))}
          </ul>
        )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Experience({ experiences }: { experiences: ExperiencePayload[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 70%", "end 60%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="deploys" className="relative overflow-hidden border-t border-line">
      <div className="relative mx-auto w-full max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
        <SectionHeader {...sections.deploys} />
        <p className="mb-10 font-pixel text-[9px] leading-relaxed text-cyan/70">
          {"// now entering: survival mode. blocks mined, systems shipped."}
        </p>

        <div ref={trackRef} className="relative space-y-8">
          {/* the pipeline: a dim rail with a cyan fill that draws on scroll */}
          <div className="absolute left-[15px] top-0 h-full w-px bg-line sm:left-[27px]" aria-hidden />
          <motion.div
            className="absolute left-[15px] top-0 w-px origin-top bg-gradient-to-b from-cyan to-cyan-deep sm:left-[27px]"
            style={{
              height: "100%",
              scaleY: reducedMotion ? 1 : lineScale,
              boxShadow: "0 0 8px rgba(51,224,255,0.6)",
            }}
            aria-hidden
          />

          {/* newest deploy = highest level, like any respectable XP bar */}
          {experiences.map((entry, index) => (
            <DeployEntry
              key={entry.id}
              entry={entry}
              index={index}
              level={experiences.length - index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
