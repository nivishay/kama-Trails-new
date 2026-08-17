import type { NextConfig } from "next";

// Host of the Supabase project this deployment targets (prod, preview, or local).
// Derived from the env so each environment allows images from its OWN storage
// bucket without hardcoding a host per project.
function supabaseImageHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseImageHost();

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo (a stray lockfile exists in a parent dir).
  turbopack: { root: __dirname },
  // Don't let `next dev` append its agent-rules block to our CLAUDE.md.
  agentRules: false,
  images: {
    // Trail images live on base44 media (seed data) and Supabase Storage (admin uploads).
    // The Supabase host is env-driven so prod and the preview sandbox each serve from
    // their own bucket.
    remotePatterns: [
      { protocol: "https", hostname: "media.base44.com" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
    ],
  },
};

export default nextConfig;
