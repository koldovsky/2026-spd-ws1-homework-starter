import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Deliberate: keep AGENTS.md short and owned by the team. Without this, `next dev` appends a managed block to it.
  agentRules: false,
};

export default nextConfig;
