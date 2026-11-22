import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep AGENTS.md hand-written and short: stop `next dev` from injecting its managed block.
  agentRules: false,
};

export default nextConfig;
