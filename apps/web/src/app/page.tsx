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
        <About profile={profile} />
        <Experience experiences={experience} />
        <Projects projects={projects} />
        <Achievements achievements={achievements} />
        <Vitals />
        <Contact profile={profile} />
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 font-mono text-[11px] text-dim lg:px-10">
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
