import { db } from "../lib/db.js";
import { canonicalClub } from "../lib/clubs.js";

export interface ClubSeason {
  club: string;
  year: number;
  decade: number;
  games: number;
  winPct: number;
  scoreShare: number; // points for / (for + against)
  strength: number; // blended expected win share
}

/** Real club-season strengths from every home-and-away match since 1897. */
export function computeTeamStrengths(): ClubSeason[] {
  const rows = db
    .prepare(`SELECT year, round, team1, score1, team2, score2 FROM matches WHERE round LIKE 'R%'`)
    .all() as { year: number; round: string; team1: string; score1: number; team2: string; score2: number }[];

  const agg = new Map<string, { w: number; d: number; l: number; pf: number; pa: number }>();
  const bump = (club: string, year: number, pf: number, pa: number) => {
    const key = `${club}|${year}`;
    if (!agg.has(key)) agg.set(key, { w: 0, d: 0, l: 0, pf: 0, pa: 0 });
    const a = agg.get(key)!;
    a.pf += pf;
    a.pa += pa;
    if (pf > pa) a.w++;
    else if (pf === pa) a.d++;
    else a.l++;
  };
  for (const m of rows) {
    bump(canonicalClub(m.team1), m.year, m.score1, m.score2);
    bump(canonicalClub(m.team2), m.year, m.score2, m.score1);
  }

  const out: ClubSeason[] = [];
  for (const [key, a] of agg) {
    const [club, yearStr] = key.split("|");
    const year = Number(yearStr);
    const games = a.w + a.d + a.l;
    if (games < 4) continue;
    const winPct = (a.w + a.d / 2) / games;
    const scoreShare = a.pf / Math.max(1, a.pf + a.pa);
    out.push({
      club, year, decade: Math.floor(year / 10) * 10, games, winPct, scoreShare,
      strength: 0.5 * winPct + 0.5 * scoreShare,
    });
  }
  return out.sort((a, b) => a.year - b.year || a.club.localeCompare(b.club));
}
