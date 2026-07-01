/** Client-side types + helpers for the Monte-Carlo projections feed. */
import { BASE_PATH } from "@/lib/game/data";

export const MARKETS = [
  ["disposals", "Disposals"],
  ["disposals_q1", "Q1 Disposals"],
  ["disposals_h1", "1st Half Disposals"],
  ["dreamTeamPoints", "Fantasy"],
  ["goals", "Goals"],
  ["kicks", "Kicks"],
  ["handballs", "Handballs"],
  ["marks", "Marks"],
  ["tackles", "Tackles"],
  ["behinds", "Behinds"],
  ["totalClearances", "Clearances"],
  ["hitouts", "Hit Outs"],
] as const;
export type Market = (typeof MARKETS)[number][0];

export interface StatDist {
  mean: number; sd: number;
  p10: number; p25: number; p50: number; p75: number; p90: number;
  over: Record<string, number>;
}
export interface PlayerProjection {
  player_id: string; player: string; team: string;
  position: string; role: string; is_ruck: number; is_home: number; tog: number;
  model_exp: Record<Market, number>;
  dist: Record<Market, StatDist>;
}
export interface MatchProjection {
  match_id: string; venue: string | null; date: string | null;
  home_team: string; away_team: string;
  home_win_prob: number; away_win_prob: number; draw_prob: number;
  exp_total_points: number; exp_supremacy: number; median_total_points: number;
  players: PlayerProjection[];
}
export interface ProjectionsOutput {
  season: number; round: number; generated: string;
  n_sims: number; matches: MatchProjection[];
}

export async function loadProjections(): Promise<ProjectionsOutput> {
  const r = await fetch(`${BASE_PATH}/data/projections-latest.json`);
  if (!r.ok) throw new Error("projections feed unavailable");
  return r.json();
}

/**
 * Bookmaker-agnostic player key = first-initial + surname (accent/punctuation
 * folded). Collapses the different ways books write a name — "Charlie Curnow",
 * "C Curnow", "Charlie Curnow (CAR)" — onto one key so they line up with the
 * model and with each other.
 */
export function playerKey(name: string): string {
  const s = (name || "").toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "")          // accents
    .replace(/\([^)]*\)/g, " ")               // trailing "(Team)"
    .replace(/[^a-z\s'-]/g, " ");
  const toks = s.replace(/['-]/g, "").split(/\s+/).filter(Boolean);
  if (toks.length === 0) return "";
  if (toks.length === 1) return toks[0];
  return `${toks[0][0]}_${toks[toks.length - 1]}`;
}

/**
 * P(value > line) for a stat from the simulated over-map. Lines are posted at
 * X.5; we look the line up directly, falling back to the nearest band or the
 * tails (≈1 below the support, ≈0 above it).
 */
export function probOver(dist: StatDist, line: number): number {
  const key = line.toFixed(1);
  if (dist.over[key] != null) return dist.over[key];
  const keys = Object.keys(dist.over).map(Number).sort((a, b) => a - b);
  if (!keys.length) return line < dist.mean ? 1 : 0;
  if (line < keys[0]) return 1; // below smallest emitted line
  if (line > keys[keys.length - 1]) return 0; // beyond the tail
  let nearest = keys[0];
  for (const k of keys) if (Math.abs(k - line) < Math.abs(nearest - line)) nearest = k;
  return dist.over[nearest.toFixed(1)] ?? 0;
}

/** P(value >= 1) — "anytime" probability (goals/behinds). */
export const probAny = (dist: StatDist) => probOver(dist, 0.5);

export interface PickemLine { player: string; event: string; market: string; line: number; }
export interface PickemFeed { generated: string; n: number; lines: PickemLine[] }

export async function loadPickem(): Promise<PickemFeed | null> {
  try {
    const r = await fetch(`${BASE_PATH}/data/pickem-latest.json`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Dabble Power Play multipliers (2–6 correct legs). Adjust if Dabble changes them.
export const PICKEM_MULTIPLIERS: Record<number, number> = { 2: 3, 3: 6, 4: 10, 5: 20, 6: 38 };
