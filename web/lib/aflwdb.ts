import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clubSlug } from "@/lib/clubdb";
import { isHomeAndAway, isFinal, type LadderRow, type Match, type MatchTuple } from "@/lib/seasondb";

/** Build-time AFLW data: ladders + fixtures per season, from the AFL API feed.
 *  AFLW team names are already canonicalised to AFL club identities upstream,
 *  so club colours/links/slugs work unchanged. */

export interface AflwSeasonInfo {
  key: string; label: string; year: number;
  premier: string | null; runnerUp: string | null;
}
export interface AflwPremiership {
  key: string; label: string; year: number;
  premier: string; runnerUp: string;
  premierScore: number; runnerScore: number; venue: string;
}
interface AflwData {
  current: { key: string; label: string; year: number; round: number; ladder: LadderRow[]; results: unknown[] };
  seasons: AflwSeasonInfo[];
  ladders: Record<string, LadderRow[]>;
  premierships: AflwPremiership[];
}

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "data", file), "utf8"));
}

let dataCache: AflwData | null = null;
function data(): AflwData {
  return (dataCache ??= read<AflwData>("aflw.json"));
}
let matchesCache: Record<string, MatchTuple[]> | null = null;
function matches(): Record<string, MatchTuple[]> {
  return (matchesCache ??= read<Record<string, MatchTuple[]>>("aflw-matches.json"));
}

export function teamSlug(team: string): string {
  return clubSlug(team);
}
export function slugMap(teams: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of teams) out[t] = clubSlug(t);
  return out;
}

export function aflwSeasons(): AflwSeasonInfo[] {
  return data().seasons;
}
export function aflwCurrent() {
  return data().current;
}
export function aflwSeasonInfo(key: string): AflwSeasonInfo | undefined {
  return data().seasons.find((s) => s.key === key);
}
export function aflwLadder(key: string): LadderRow[] {
  return data().ladders[key] ?? [];
}
export function aflwPremierships(): AflwPremiership[] {
  return data().premierships;
}
export function aflwSeasonKeys(): string[] {
  return data().seasons.map((s) => s.key);
}

function toMatch(t: MatchTuple): Match {
  return { round: t[0], date: t[1], t1: t[2], s1: t[3], t2: t[4], s2: t[5], venue: t[6] };
}
export function aflwMatches(key: string): Match[] {
  return (matches()[key] ?? []).map(toMatch);
}
export function aflwFinals(key: string): Match[] {
  const order: Record<string, number> = { EF: 1, QF: 1, SF: 2, PF: 3, GF: 4 };
  return aflwMatches(key)
    .filter((m) => isFinal(m.round))
    .sort((a, b) => (order[a.round] ?? 0) - (order[b.round] ?? 0));
}
export { isHomeAndAway };
