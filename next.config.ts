import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  // AGENTS.md is an owned harness file; `next dev` must not rewrite it. Its one useful line (read the bundled
  // Next docs) is kept in AGENTS.md by hand.
  agentRules: false,
};

export default nextConfig;
