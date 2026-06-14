import type { MetadataRoute } from "next";
import { allClubNames, clubSlug } from "@/lib/clubdb";
import { allSeasonYears, currentYear } from "@/lib/seasondb";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://afl23-0.com";
  const core: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/ladder/`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/results/`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/seasons/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/play/`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/greats/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/clubs/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/premierships/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/honours/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/legend/`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/battler/`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/higher/`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/awarded/`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/tips/`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/leaderboard/`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/duel/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/rebuild/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/dynasty/`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const clubs: MetadataRoute.Sitemap = allClubNames().map((n) => ({
    url: `${base}/club/${clubSlug(n)}/`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const cur = currentYear();
  const seasons: MetadataRoute.Sitemap = allSeasonYears().map((y) => ({
    url: `${base}/season/${y}/`,
    changeFrequency: y === cur ? "daily" : "yearly",
    priority: y === cur ? 0.8 : 0.5,
  }));
  return [...core, ...clubs, ...seasons];
}
