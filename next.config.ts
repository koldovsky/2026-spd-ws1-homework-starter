import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep AGENTS.md short and team-owned: no auto-managed Next.js block (decided in HW 1.1).
  agentRules: false,
};

export default nextConfig;
