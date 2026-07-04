"use client";

import { ArrowDown, Github, Linkedin, Mail } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

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

/** lucide dropped brand icons, so the Discord mark is inlined. */
function DiscordIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/** Discord has no profile URLs, so clicking copies the username instead. */
function DiscordBadge({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(username);
    } catch {
      /* clipboard can be unavailable — tooltip still shows the handle */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={copy}
        className="cursor-pointer text-dim transition-colors hover:text-cyan"
        aria-label={`Discord: ${username} (click to copy)`}
        title={`@${username}`}
      >
        <DiscordIcon size={18} />
      </button>
      <AnimatePresence>
        {copied && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 border border-cyan/40 bg-surface px-2 py-1 font-mono text-[10px] whitespace-nowrap text-cyan"
          >
            @{username} copied!
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

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
              {profile.discordUsername && <DiscordBadge username={profile.discordUsername} />}
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
