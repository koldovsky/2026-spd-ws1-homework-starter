import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // AGENTS.md is team-owned and kept short; stop `next dev` from injecting its managed block.
  agentRules: false,
};

export default nextConfig;
