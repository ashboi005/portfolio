import Link from "next/link";

import WarpSequence from "@/components/fx/warp-sequence";
import SystemShell from "@/components/hud/system-shell";
import About from "@/components/sections/about";
import Achievements from "@/components/sections/achievements";
import Contact from "@/components/sections/contact";
import Experience from "@/components/sections/experience";
import Hero from "@/components/sections/hero";
import Projects from "@/components/sections/projects";
import Vitals from "@/components/sections/vitals";
import { achievements, experience, footer, profile, projects } from "@/lib/content";

export default function HomePage() {
  return (
    <SystemShell profile={profile} projects={projects}>
      <main>
        <Hero profile={profile} />
        {/* Desktop-only warp corridor. WarpSequence mounts it below the hero
            for the descent (whoami materializes out of it) and unmounts it on
            the way up so scrolling back to the hero stays smooth. */}
        <WarpSequence>
          <About profile={profile} />
          <Experience experiences={experience} />
          <Projects projects={projects} />
          <Achievements achievements={achievements} />
          <Vitals />
          <Contact profile={profile} />
        </WarpSequence>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 font-mono text-[11px] text-dim lg:px-10">
          {/* The drill is a separate route, so the footer is the one place a
              visitor who never opens the terminal will reliably find it. */}
          <Link
            href="/drill"
            className="group flex flex-col gap-1 border border-line px-4 py-3 transition-colors hover:border-cyan/40 hover:bg-cyan/5 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="shrink-0 tracking-[0.14em] text-cyan">
              ▸ {footer.drillCta}
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </span>
            <span className="text-dim group-hover:text-bright/80">{footer.drillNote}</span>
          </Link>

          <p className="text-bright/70">{footer.note}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {profile.name} — {footer.copyright}
            </p>
            <p>
              {footer.stackLine} · press{" "}
              <kbd className="border border-line px-1 py-0.5 text-cyan">~</kbd> for root
            </p>
          </div>
        </div>
      </footer>
    </SystemShell>
  );
}
