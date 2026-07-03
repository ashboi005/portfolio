"use client";

import { useGSAP } from "@gsap/react";
import { ExternalLink, Github, Lock, MoveRight } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";

import SectionHeader from "@/components/sections/section-header";
import { sections } from "@/lib/content";
import { highlightKeywords } from "@/lib/keywords";
import type { ProjectPayload } from "@/types/portfolio";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STATUS_META: Record<string, { label: string; className: string }> = {
  live: { label: "LIVE", className: "text-cyan" },
  nda: { label: "NDA / RESTRICTED", className: "text-signal" },
  shipped: { label: "SHIPPED", className: "text-bright/70" },
  lab: { label: "LAB / EXPERIMENTAL", className: "text-dim" },
};

function ProjectCard({
  project,
  index,
  total,
}: {
  project: ProjectPayload;
  index: number;
  total: number;
}) {
  const status = STATUS_META[project.status] ?? STATUS_META.shipped!;
  const imageUrl = project.image;

  return (
    <article
      className={`hcard panel panel-hover relative flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 lg:w-[360px] lg:shrink-0 ${
        project.featured ? "corner-ticks" : ""
      }`}
    >
      {/* oversized ghost index */}
      <span className="pointer-events-none absolute -top-4 right-2 font-display text-7xl font-bold text-bright/5 select-none">
        {String(index + 1).padStart(2, "0")}
      </span>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`${project.title} preview`}
          className="h-40 w-full border-b border-line object-cover"
          loading="lazy"
        />
      )}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[11px]">
          <span className="text-dim">
            svc {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")} ·{" "}
            {project.year ?? "—"}
          </span>
          <span className={`flex items-center gap-1.5 ${status.className}`}>
            {project.status === "nda" ? (
              <Lock size={10} aria-hidden />
            ) : (
              <span className="led" aria-hidden />
            )}
            {status.label}
          </span>
        </div>

        <h3 className="font-display text-2xl font-semibold text-bright">{project.title}</h3>
        {project.tagline && (
          <p className="mt-1 font-mono text-xs leading-relaxed text-dim">{project.tagline}</p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-bright/80">
          {highlightKeywords(project.description)}
        </p>

        {project.highlights.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {project.highlights.slice(0, 3).map((highlight) => (
              <li
                key={highlight.slice(0, 32)}
                className="flex gap-2 text-[13px] leading-relaxed text-bright/70"
              >
                <span className="mt-px shrink-0 font-mono text-cyan" aria-hidden>
                  ▸
                </span>
                <span>{highlightKeywords(highlight)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-5">
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-bright/75"
              >
                {tech}
              </span>
            ))}
          </div>

          {(project.githubUrl || project.liveUrl) && (
            <div className="mt-4 flex gap-4 font-mono text-xs">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center gap-1.5 text-dim transition-colors hover:text-cyan"
                >
                  <Github size={13} aria-hidden /> source
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center gap-1.5 text-dim transition-colors hover:text-cyan"
                >
                  <ExternalLink size={13} aria-hidden /> live
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects({ projects }: { projects: ProjectPayload[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;

      const mm = gsap.matchMedia();
      // On wide, motion-friendly screens: vertical scroll drives horizontal travel.
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 48);

        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: viewport,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (progressRef.current) progressRef.current.style.width = `${self.progress * 100}%`;
            },
          },
        });
      });
    },
    { scope: viewportRef },
  );

  return (
    <section id="services" className="grid-texture relative border-t border-line">
      <div
        ref={viewportRef}
        className="relative flex min-h-svh flex-col justify-center overflow-hidden py-24 lg:py-0"
      >
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <SectionHeader {...sections.services} />
          <p className="mb-10 hidden items-center gap-2 font-mono text-xs text-dim lg:flex">
            keep scrolling — the deck rides sideways
            <MoveRight size={14} className="text-cyan" aria-hidden />
          </p>
        </div>

        {/* Track: horizontal row on desktop, vertical stack on mobile */}
        <div className="overflow-x-clip">
          <div
            ref={trackRef}
            className="flex flex-col gap-6 px-6 lg:flex-row lg:items-stretch lg:px-10 lg:pr-[40vw]"
          >
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                total={projects.length}
              />
            ))}
          </div>
        </div>

        {/* Horizontal progress rail (desktop) */}
        <div className="mx-auto mt-10 hidden w-full max-w-6xl px-6 lg:block lg:px-10">
          <div className="meter-track">
            <div
              ref={progressRef}
              className="meter-fill"
              style={{ transition: "none", width: "0%" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
