import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep AGENTS.md hand-written and under 40 lines: stop `next dev` from injecting a managed block.
  agentRules: false,
};

export default nextConfig;
