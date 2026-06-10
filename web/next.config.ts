import type { NextConfig } from "next";

// On GitHub Pages the site lives under /AFL-23-0 — CI sets NEXT_PUBLIC_BASE_PATH.
// Local dev and root-domain hosts (e.g. Vercel) leave it unset.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
};

export default nextConfig;
