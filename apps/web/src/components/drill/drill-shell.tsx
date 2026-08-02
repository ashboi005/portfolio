"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { TerminalSquare } from "lucide-react";
import { useEffect, useState } from "react";

import CustomCursor from "@/components/fx/custom-cursor";
import FloatingIcons from "@/components/fx/floating-icons";
import type { ProfilePayload, ProjectPayload } from "@/types/portfolio";

const TerminalOverlay = dynamic(() => import("@/components/terminal/terminal-overlay"), { ssr: false });

/**
 * Slim chrome for /drill.
 *
 * Deliberately not SystemShell. The boot sequence, sprite-can quest, cat
 * colony, edge crawler, and floating icons are all omitted: ambient motion is
 * hostile to someone concentrating on speaking for ninety seconds. What
 * survives is the custom cursor, a status bar, and the `~` terminal — enough
 * that the page still reads as part of the same operating system.
 */
export default function DrillShell({
  profile,
  projects,
  children,
}: {
  profile: ProfilePayload;
  projects: ProjectPayload[];
  children: React.ReactNode;
}) {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const update = () =>
      setClock(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }).format(new Date()),
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (isTyping) return;
      if (event.key === "~" || event.key === "`") {
        event.preventDefault();
        setTerminalOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <CustomCursor />
      {/* Ambient tool icons drifting behind everything — the page was flat void
          without them. Denser and much larger than on the home page: there are
          no sections here for them to compete with, and at the home page's size
          they read as specks rather than art. Still grayscale, still low
          opacity, so they stay background. The cats are the part that had to
          stay conditional; see DrillConsole. */}
      <FloatingIcons density={2.5} minSize={34} maxSize={96} className="floaters-layer--bold" />

      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-void/85 backdrop-blur-sm">
        <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between gap-4 px-4 font-mono text-[11px] sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-dim transition-colors hover:text-cyan"
          >
            <span aria-hidden="true">←</span>
            <span className="tracking-[0.1em]">ASHWATH.SYS</span>
          </Link>

          <span className="hidden tracking-[0.14em] text-bright sm:inline">
            <span className="text-cyan">099</span> drill.exe
          </span>

          <div className="flex items-center gap-4">
            <span className="tabular-nums text-dim" suppressHydrationWarning>
              {clock ?? "--:--:--"} IST
            </span>
            <button
              type="button"
              onClick={() => setTerminalOpen(true)}
              aria-label="Open terminal"
              className="text-dim transition-colors hover:text-cyan"
            >
              <TerminalSquare className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-4 pt-20 pb-16 sm:px-6">
        {children}
      </main>

      <TerminalOverlay
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        profile={profile}
        projects={projects}
      />
    </>
  );
}
