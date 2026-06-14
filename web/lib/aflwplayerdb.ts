import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Build-time AFLW player careers — groups the per-season player pools into one
 *  record per player, for the AFLW player pages and /aflw/greats. */

type Pos = "DEF" | "MID" | "RUC" | "FWD";

interface SeasonEntry {
  id: string; n: string; g: number;
  c: Record<string, number>;
  r: Record<Pos, number>;
  nat: Pos; elig: string[];
  st: { di: number | null; gl: number | null; mk: number | null; tk: number | null; ho: number | null };
}

export interface AflwSeason {
  year: number; club: string; games: number;
  r: Record<Pos, number>; best: number; nat: Pos;
  st: SeasonEntry["st"];
}
export interface AflwCareer {
  slug: string; playerId: string; name: string;
  clubs: string[]; seasons: AflwSeason[];
  best: number; peakYear: number; primaryPos: Pos; totalGames: number;
}

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "data", file), "utf8"));
}

function baseSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

let cache: AflwCareer[] | null = null;
let bySlug: Map<string, AflwCareer> | null = null;

function build(): AflwCareer[] {
  if (cache) return cache;
  const meta = read<{ decades: number[] }>("aflw-meta.json");
  const byPlayer = new Map<string, { name: string; seasons: AflwSeason[] }>();

  for (const year of meta.decades) {
    let pool: SeasonEntry[];
    try {
      pool = read<SeasonEntry[]>(`aflw-players-${year}.json`);
    } catch {
      continue;
    }
    for (const p of pool) {
      const playerId = p.id.split("|")[0]; // "aflw/CD_I..."
      const club = Object.keys(p.c)[0] ?? "";
      const best = Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
      let rec = byPlayer.get(playerId);
      if (!rec) byPlayer.set(playerId, (rec = { name: p.n, seasons: [] }));
      rec.seasons.push({ year, club, games: p.g, r: p.r, best, nat: p.nat, st: p.st });
    }
  }

  // assign unique slugs (suffix on collision)
  const used = new Map<string, number>();
  const careers: AflwCareer[] = [];
  for (const [playerId, rec] of byPlayer) {
    rec.seasons.sort((a, b) => a.year - b.year);
    const peak = rec.seasons.reduce((b, s) => (s.best > b.best ? s : b), rec.seasons[0]);
    const clubs = [...new Set(rec.seasons.map((s) => s.club).filter(Boolean))];
    // primary position = nat of the peak season
    let slug = baseSlug(rec.name);
    const n = used.get(slug) ?? 0;
    used.set(slug, n + 1);
    if (n > 0) slug = `${slug}-${n + 1}`;
    careers.push({
      slug, playerId, name: rec.name, clubs,
      seasons: rec.seasons,
      best: peak.best, peakYear: peak.year, primaryPos: peak.nat,
      totalGames: rec.seasons.reduce((a, s) => a + s.games, 0),
    });
  }
  careers.sort((a, b) => b.best - a.best);
  cache = careers;
  return careers;
}

export function allAflwCareers(): AflwCareer[] {
  return build();
}
export function aflwCareerBySlug(slug: string): AflwCareer | undefined {
  if (!bySlug) bySlug = new Map(build().map((c) => [c.slug, c]));
  return bySlug.get(slug);
}
/** Notable enough for a static page — anyone who played ≥3 AFLW games. */
export function notableAflwCareers(): AflwCareer[] {
  return build().filter((c) => c.totalGames >= 3);
}
export function aflwSlugByName(name: string): string | undefined {
  return build().find((c) => c.name === name)?.slug;
}
