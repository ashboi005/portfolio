import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  // Standalone output for a small Docker image; trace from the monorepo root so
  // workspace packages (@portfolio/*) are bundled into .next/standalone.
  output: "standalone",
  outputFileTracingRoot: path.join(dir, "../../"),
};

export default nextConfig;
