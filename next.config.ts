import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo (a stray lockfile exists in a parent dir).
  turbopack: { root: __dirname },
  // Don't let `next dev` append its agent-rules block to our CLAUDE.md.
  agentRules: false,
  images: {
    // Trail images live on base44 media (seed data) and Supabase Storage (admin uploads).
    remotePatterns: [
      { protocol: "https", hostname: "media.base44.com" },
      { protocol: "https", hostname: "nbjkcszrxtpkbqyaccmw.supabase.co" },
    ],
  },
};

export default nextConfig;
