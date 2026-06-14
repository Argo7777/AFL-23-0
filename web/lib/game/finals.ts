import { PlayerEntry } from "./types";

export const FINALS_STAGES = [
  "Qualifying Final",
  "Semi Final",
  "Preliminary Final",
  "Grand Final",
] as const;

/** make finals with a winning September-worthy record (AFL, 23-game season) */
export const FINALS_QUALIFY_WINS = 13;

/** finals cutoff by season length — AFLW's 12-game season tops out at 12 wins,
 *  so its threshold must be lower (≈ top 6). */
export function finalsQualifyWins(seasonGames: number): number {
  return seasonGames <= 14 ? 7 : 13;
}

/**
 * Per-final win probability, tuned so the premiership is as rare as 23-0:
 * a perfect-rated side wins each final ~47% — four straight ≈ 5%.
 * Finals are a lottery; the home-and-away season buys the ticket.
 */
export function finalsGameProb(teamRating: number): number {
  const x = Math.max(0, Math.min(1, (teamRating - 60) / 39));
  return 0.473 * Math.pow(x, 1.5);
}

/**
 * A player's representative age: the average of the years he played in this
 * decade, anchored to his real career debut (assumed at ~20 years old).
 */
export function playerAge(p: PlayerEntry): number {
  const years = p.sea?.length ? p.sea.map((s) => s[0]) : [p.y[0], p.y[1]];
  const avgYear = years.reduce((a, b) => a + b, 0) / years.length;
  return Math.round((avgYear - (p.d0 ?? p.y[0]) + 20) * 10) / 10;
}

/**
 * Injury risk per final: 5% for the young, rising with age and sharply after
 * 30, capped at 20%. Veterans are matchwinners — and liabilities.
 */
export function injuryChance(p: PlayerEntry): number {
  const age = playerAge(p);
  const c = 0.05 + Math.max(0, age - 26) * 0.012 + Math.max(0, age - 30) * 0.02;
  return Math.min(0.2, c);
}

export const MAX_INJURIES_PER_GAME = 2;
