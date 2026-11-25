import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // AGENTS.md is hand-owned (see .github/CODEOWNERS); stop `next dev` from injecting its managed block.
  agentRules: false,
};

export default nextConfig;
