import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep AGENTS.md short and team-owned: Next.js rules live in .claude/rules/nextjs.md.
  agentRules: false,
};

export default nextConfig;
