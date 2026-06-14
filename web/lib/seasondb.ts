import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clubSlug } from "@/lib/clubdb";

/** Build-time season data: real AFL/VFL ladders + fixtures for every year. */

export interface LadderRow {
  team: string;
  p: number; w: number; l: number; d: number;
  pf: number; pa: number; pts: number; pct: number;
}

/** [round, date, team1, score1, team2, score2, venue] */
export type MatchTuple = [string, string, string, number, string, number, string];

export interface Match {
  round: string;
  date: string;
  t1: string; s1: number;
  t2: string; s2: number;
  venue: string;
}

// Franchise identity across eras (mirror of pipeline/src/lib/clubs.ts) so a
// ladder row links to the right canonical club page.
const FRANCHISE: Record<string, string> = {
  "South Melbourne": "Sydney",
  Footscray: "Western Bulldogs",
  Kangaroos: "North Melbourne",
  "GW Sydney": "Greater Western Sydney",
};
export function canonicalClub(team: string): string {
  return FRANCHISE[team.trim()] ?? team.trim();
}
export function teamSlug(team: string): string {
  return clubSlug(canonicalClub(team));
}
/** Serializable team→slug map to pass into client components. */
export function slugMap(teams: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of teams) out[t] = teamSlug(t);
  return out;
}

function read<T>(file: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "data", file), "utf8"));
}

let laddersCache: Record<string, LadderRow[]> | null = null;
function ladders(): Record<string, LadderRow[]> {
  return (laddersCache ??= read<Record<string, LadderRow[]>>("seasons.json"));
}

let matchesCache: Record<string, MatchTuple[]> | null = null;
function matches(): Record<string, MatchTuple[]> {
  return (matchesCache ??= read<Record<string, MatchTuple[]>>("season-matches.json"));
}

/** Every season with data, newest first. */
export function allSeasonYears(): number[] {
  return Object.keys(ladders())
    .map(Number)
    .sort((a, b) => b - a);
}

export function currentYear(): number {
  return Math.max(...Object.keys(ladders()).map(Number));
}

export function seasonLadder(year: number): LadderRow[] {
  return ladders()[year] ?? [];
}

const FINALS = new Set(["EF", "QF", "SF", "PF", "GF"]);
export function isFinal(round: string): boolean {
  return FINALS.has(round);
}
export function isHomeAndAway(round: string): boolean {
  return /^R\d+$/.test(round);
}

function toMatch(t: MatchTuple): Match {
  return { round: t[0], date: t[1], t1: t[2], s1: t[3], t2: t[4], s2: t[5], venue: t[6] };
}

/** All matches for a season in fixture order. */
export function seasonMatches(year: number): Match[] {
  return (matches()[year] ?? []).map(toMatch);
}

/** Home-and-away rounds grouped { "R1": [...], ... } in round order. */
export function seasonRoundsHA(year: number): { round: string; num: number; matches: Match[] }[] {
  const byRound = new Map<string, Match[]>();
  for (const m of seasonMatches(year)) {
    if (!isHomeAndAway(m.round)) continue;
    (byRound.get(m.round) ?? byRound.set(m.round, []).get(m.round)!).push(m);
  }
  return [...byRound.entries()]
    .map(([round, ms]) => ({ round, num: Number(round.slice(1)), matches: ms }))
    .sort((a, b) => a.num - b.num);
}

/** Finals series for a season, in order EF/QF → GF. */
export function seasonFinals(year: number): Match[] {
  const order: Record<string, number> = { EF: 1, QF: 1, SF: 2, PF: 3, GF: 4 };
  return seasonMatches(year)
    .filter((m) => isFinal(m.round))
    .sort((a, b) => (order[a.round] ?? 0) - (order[b.round] ?? 0));
}

/** Premier + runner-up of a season (from the Grand Final), if played. */
export function seasonPremier(year: number): { premier: string; runnerUp: string } | null {
  const gf = seasonMatches(year).find((m) => m.round === "GF");
  if (!gf) return null;
  const homeWon = gf.s1 >= gf.s2;
  return {
    premier: canonicalClub(homeWon ? gf.t1 : gf.t2),
    runnerUp: canonicalClub(homeWon ? gf.t2 : gf.t1),
  };
}
