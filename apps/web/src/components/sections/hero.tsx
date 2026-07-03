"use client";

import { ArrowDown, Github, Linkedin, Mail } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { useRef } from "react";

import GlitchText from "@/components/fx/glitch-text";
import NerdBuddy from "@/components/fx/nerd-buddy";
import TypingCycle from "@/components/fx/typing-cycle";
import { hero } from "@/lib/content";
import type { ProfilePayload } from "@/types/portfolio";

const TITLES = hero.titles;

const SystemConstellation = dynamic(
  () => import("@/components/three/system-constellation"),
  { ssr: false },
);

export default function Hero({ profile }: { profile: ProfilePayload }) {
  const [firstName = "ASHWATH", lastName = "SONI"] = profile.name.toUpperCase().split(" ");
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  // Cinematic zoom-through as the visitor leaves the hero.
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 1], ["blur(0px)", "blur(6px)"]);

  return (
    <section id="boot" ref={sectionRef} className="relative flex min-h-svh flex-col overflow-hidden">
      <SystemConstellation className="absolute inset-0" />
      <div className="scanline" aria-hidden />

      {/* Readability veil — keeps the canvas ambient, never obstructive */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(4,5,10,0.55)_0%,rgba(4,5,10,0.2)_55%,rgba(4,5,10,0.85)_100%)]"
        aria-hidden
      />

      <motion.div
        style={reducedMotion ? undefined : { scale, opacity, filter: blur }}
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pt-24 pb-16 lg:px-10"
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6 font-mono text-[11px] text-dim sm:text-xs"
        >
          <span className="text-cyan">●</span> {hero.statusLine.label} —{" "}
          <span className="text-cyan">ACTIVE</span> (running) since {hero.statusLine.since} ·{" "}
          <span className="text-signal">{hero.statusLine.note}</span>
        </motion.p>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="font-display text-[13vw] leading-[0.95] font-bold tracking-tight text-bright select-none sm:text-[11vw] lg:text-[120px]"
        >
          <GlitchText text={firstName} ambient />
          <br />
          <span className="text-cyan">
            <GlitchText text={lastName} ambient />
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p className="mt-6 max-w-xl font-mono text-sm text-dim sm:text-base">
            <span className="text-cyan">{">"}</span>{" "}
            <TypingCycle titles={TITLES} className="text-bright/90" />
          </p>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-bright/90 sm:text-lg">
            {profile.tagline ?? "I build the parts of the internet you're not supposed to see."}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="#services"
              className="cursor-pointer border border-cyan/60 bg-cyan/10 px-5 py-2.5 font-mono text-xs tracking-wider text-cyan uppercase transition-all duration-200 hover:bg-cyan/20 hover:shadow-[0_0_24px_rgba(51,224,255,0.25)]"
            >
              inspect services
            </a>
            <a
              href="#contact"
              className="cursor-pointer border border-line px-5 py-2.5 font-mono text-xs tracking-wider text-bright uppercase transition-colors duration-200 hover:border-bright/40"
            >
              POST /contact
            </a>
            <div className="flex items-center gap-3 pl-1">
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer text-dim transition-colors hover:text-cyan"
                  aria-label="GitHub"
                >
                  <Github size={18} />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="cursor-pointer text-dim transition-colors hover:text-cyan"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={18} />
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="cursor-pointer text-dim transition-colors hover:text-cyan"
                  aria-label="Email"
                >
                  <Mail size={18} />
                </a>
              )}
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mt-8 max-w-xl font-mono text-[11px] leading-relaxed text-dim"
          >
            {hero.terminalHint}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Interactive pixel nerd on the right — click for a random fact */}
      <NerdBuddy />

      <div className="relative z-10 flex justify-center pb-8">
        <a
          href="#whoami"
          className="flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-widest text-dim uppercase transition-colors hover:text-cyan"
        >
          scroll to traverse
          <ArrowDown size={12} className="animate-bounce" aria-hidden />
        </a>
      </div>
    </section>
  );
}
