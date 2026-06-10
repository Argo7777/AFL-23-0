import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://afl23-0.com";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/play/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about/`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
