"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import BootOverlay from "@/components/fx/boot-overlay";
import CatColony from "@/components/fx/cat-colony";
import CustomCursor from "@/components/fx/custom-cursor";
import EdgeCrawler from "@/components/fx/edge-crawler";
import FloatingIcons from "@/components/fx/floating-icons";
import HudFrame from "@/components/hud/hud-frame";
import { QuestProvider } from "@/components/quest/quest";
import SpriteCanField from "@/components/quest/sprite-can-field";
import type { ProfilePayload, ProjectPayload } from "@/types/portfolio";

const TerminalOverlay = dynamic(() => import("@/components/terminal/terminal-overlay"), {
  ssr: false,
});

/** Client chrome around the server-rendered sections. */
export default function SystemShell({
  profile,
  projects,
  children,
}: {
  profile: ProfilePayload;
  projects: ProjectPayload[];
  children: React.ReactNode;
}) {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [booted, setBooted] = useState(false);

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
    <QuestProvider>
      <BootOverlay onFinish={() => setBooted(true)} />
      <CustomCursor />
      <FloatingIcons />
      {booted && <CatColony />}
      {booted && <EdgeCrawler />}
      <HudFrame onOpenTerminal={() => setTerminalOpen(true)} />

      <div className="relative">
        {children}
        <SpriteCanField />
      </div>

      <TerminalOverlay
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        profile={profile}
        projects={projects}
      />
    </QuestProvider>
  );
}
