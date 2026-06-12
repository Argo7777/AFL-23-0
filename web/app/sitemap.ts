import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://afl23-0.com";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/play/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/legend/`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/battler/`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/higher/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/greats/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/awarded/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/tips/`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/ladder/`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/about/`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
