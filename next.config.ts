import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // AGENTS.md is our hand-written team harness; don't let `next dev` inject its managed block.
  agentRules: false,
};

export default nextConfig;
