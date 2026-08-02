import type { Metadata } from "next";

import DrillConsole from "@/components/drill/drill-console";
import DrillShell from "@/components/drill/drill-shell";
import { profile, projects } from "@/lib/content";

export const metadata: Metadata = {
  title: "DRILL.EXE — ASHWATH.SYS",
  description:
    "Pick a difficulty, get dealt a backend concept, and speak about it against a timer. Then get graded on it, honestly.",
};

export default function DrillPage() {
  return (
    <DrillShell profile={profile} projects={projects}>
      <DrillConsole />
    </DrillShell>
  );
}
