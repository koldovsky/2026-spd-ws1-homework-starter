import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep Next.js from writing its managed block into AGENTS.md on `next dev`. AGENTS.md is the team's single source.
  agentRules: false,
};

export default nextConfig;
