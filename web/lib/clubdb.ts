import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCareers, type CareerPlayer } from "@/lib/playerdb";

/** Build-time club aggregates for the static club pages. */

export interface Premiership {
  year: number;
  premier: string;
  runnerUp: string;
  premierScore: number;
  runnerScore: number;
  venue: string;
}

export interface ClubGreat {
  slug: string;
  name: string;
  rating: number;
  games: number;
  nat: string;
  decades: string; // "1990s–2000s"
}

export interface ClubData {
  name: string;
  slug: string;
  flags: number[]; // premiership years, newest first
  runnerUps: number[];
  greats: ClubGreat[]; // top players by rating
  playerCount: number;
}

export function clubSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

let premsCache: Premiership[] | null = null;
function premierships(): Premiership[] {
  if (!premsCache) {
    premsCache = JSON.parse(
      readFileSync(join(process.cwd(), "public", "data", "premierships.json"), "utf8"),
    );
  }
  return premsCache!;
}

/** every club that appears in player data or a Grand Final */
export function allClubNames(): string[] {
  const set = new Set<string>();
  for (const c of loadCareers().values()) {
    for (const d of c.decades) for (const club of Object.keys(d.c)) set.add(club);
  }
  for (const p of premierships()) {
    set.add(p.premier);
    set.add(p.runnerUp);
  }
  set.delete("");
  return [...set].sort();
}

const eraSpan = (c: CareerPlayer): string => {
  const decs = [...new Set(c.decades.map((d) => Number(d.id.split("|")[1])))].sort();
  return decs.length === 1 ? `${decs[0]}s` : `${decs[0]}s–${decs[decs.length - 1]}s`;
};

export function clubData(slug: string): ClubData | null {
  const name = allClubNames().find((n) => clubSlug(n) === slug);
  if (!name) return null;

  const flags = premierships().filter((p) => p.premier === name).map((p) => p.year);
  const runnerUps = premierships().filter((p) => p.runnerUp === name).map((p) => p.year);

  // collect best per player who played for this club, dedup by player key
  const byKey = new Map<string, { c: CareerPlayer; rating: number; games: number; nat: string }>();
  for (const c of loadCareers().values()) {
    let rating = 0, games = 0, nat = "MID";
    let played = false;
    for (const d of c.decades) {
      if (!d.c[name]) continue;
      played = true;
      const best = Math.max(d.r.DEF, d.r.MID, d.r.RUC, d.r.FWD);
      games += d.c[name];
      if (best > rating) { rating = best; nat = d.nat; }
    }
    if (played) byKey.set(c.key, { c, rating, games, nat });
  }

  const greats: ClubGreat[] = [...byKey.values()]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 30)
    .map(({ c, rating, games, nat }) => ({
      slug: c.slug, name: c.name, rating, games, nat, decades: eraSpan(c),
    }));

  return { name, slug, flags, runnerUps, greats, playerCount: byKey.size };
}

export function allPremierships(): Premiership[] {
  return premierships();
}

export function flagTally(): { name: string; slug: string; flags: number }[] {
  const t = new Map<string, number>();
  for (const p of premierships()) t.set(p.premier, (t.get(p.premier) ?? 0) + 1);
  return [...t.entries()]
    .map(([name, flags]) => ({ name, slug: clubSlug(name), flags }))
    .sort((a, b) => b.flags - a.flags);
}
