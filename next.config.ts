import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // Decision (HW 1.1): AGENTS.md is hand-written and owned via CODEOWNERS, so `next dev` must not rewrite it.
  agentRules: false,
};

export default nextConfig;
