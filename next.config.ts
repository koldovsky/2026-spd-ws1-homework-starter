import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Off on purpose: `next dev` would otherwise write a managed block into AGENTS.md.
  // AGENTS.md stays short and changes only through a reviewed PR. See the HW 1.1 PR description.
  agentRules: false,
};

export default nextConfig;
