import type { NextConfig } from "next";

// agentRules is left at its default on purpose: `next dev` may add a managed block
// (<!-- BEGIN:nextjs-agent-rules -->) to AGENTS.md. Keep it in commits; it is framework guidance for agents.
const nextConfig: NextConfig = {
  serverExternalPackages: [],
};

export default nextConfig;
