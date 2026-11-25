import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Keep AGENTS.md ours: stop `next dev` from writing its managed block into it (see AGENTS.md).
  agentRules: false,
};

export default nextConfig;
