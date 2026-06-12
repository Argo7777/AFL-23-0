import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PlayerEntry } from "@/lib/game/types";

/** Build-time access to the player data for static player pages. */

export interface CareerPlayer {
  slug: string;
  key: string;
  name: string;
  decades: PlayerEntry[]; // one entry per decade played
  best: number;
}

export function slugOfKey(key: string): string {
  return (key.split("/").pop() ?? key)
    .replace(/\.html$/, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

let cache: Map<string, CareerPlayer> | null = null;

export function loadCareers(): Map<string, CareerPlayer> {
  if (cache) return cache;
  const dir = join(process.cwd(), "public", "data");
  const byKey = new Map<string, CareerPlayer>();
  for (const file of readdirSync(dir)) {
    if (!/^players-\d{4}\.json$/.test(file)) continue;
    const entries = JSON.parse(readFileSync(join(dir, file), "utf8")) as PlayerEntry[];
    for (const e of entries) {
      const key = e.id.split("|")[0];
      const best = Math.max(e.r.DEF, e.r.MID, e.r.RUC, e.r.FWD);
      let c = byKey.get(key);
      if (!c) {
        c = { slug: slugOfKey(key), key, name: e.n, decades: [], best: 0 };
        byKey.set(key, c);
      }
      c.decades.push(e);
      c.best = Math.max(c.best, best);
    }
  }
  for (const c of byKey.values()) {
    c.decades.sort((a, b) => a.y[0] - b.y[0]);
  }
  cache = byKey;
  return byKey;
}

/** the players worth a page: any decade rating of 75+ */
export function notableCareers(): CareerPlayer[] {
  return [...loadCareers().values()].filter((c) => c.best >= 75);
}

export function careerBySlug(slug: string): CareerPlayer | null {
  for (const c of loadCareers().values()) {
    if (c.slug === slug) return c;
  }
  return null;
}
