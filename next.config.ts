import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // AGENTS.md is the team harness and stays short; `next dev` must not add its managed block to it.
  agentRules: false,
};

export default nextConfig;
