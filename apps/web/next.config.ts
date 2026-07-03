import path from "node:path";
import { fileURLToPath } from "node:url";

import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default function config(phase: string): NextConfig {
  const base: NextConfig = {
    typedRoutes: true,
    reactCompiler: true,
  };

  // Standalone output + monorepo tracing only at build time. Applying
  // outputFileTracingRoot in dev makes Turbopack resolve node_modules from the
  // repo root, where the @portfolio/* workspace links don't live — so keep it
  // scoped to `next build`.
  if (phase === PHASE_PRODUCTION_BUILD) {
    return {
      ...base,
      output: "standalone",
      outputFileTracingRoot: path.join(dir, "../../"),
    };
  }

  return base;
}
