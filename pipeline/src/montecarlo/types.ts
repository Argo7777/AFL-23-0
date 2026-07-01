/** Types for the AFL Monte-Carlo: the projection-input artifact (from the
 *  Python models) in, summarised per-player distributions out. */

export const TARGETS = [
  "disposals", "goals", "kicks", "handballs", "marks", "tackles",
  "behinds", "totalClearances", "hitouts", "dreamTeamPoints",
  // period splits, derived per-sim by thinning full-game disposals (Q1 ⊂ H1);
  // they have no exp/share in the projection inputs
  "disposals_q1", "disposals_h1",
] as const;
export type Target = (typeof TARGETS)[number];

/** Stats allocated independently from team totals. disposals = kicks+handballs
 *  (identity); dreamTeamPoints is composed from the components per sim. */
export const ALLOC_STATS = [
  "kicks", "handballs", "marks", "tackles", "totalClearances", "hitouts",
  "goals", "behinds",
] as const;
export type AllocStat = (typeof ALLOC_STATS)[number];

export interface PlayerProj {
  player_id: string;
  player: string;
  position: string;
  role: string;
  /** field position in the CONFIRMED team (e.g. "RK", "C"), when named */
  named_pos?: string | null;
  is_ruck: number;
  tog: number;
  exp: Record<Target, number>;
  share: Record<Target, number>;
  /** per-player predictive sigma from the Python sigma model (optional —
   *  older artifacts don't carry it; sims then keep their natural spread) */
  sigma?: Partial<Record<Target, number>>;
}

export interface TeamProj {
  team_id: string;
  team: string;
  /** "confirmed" / "provisional" (named team) or "proxy" (most recent XVIII) */
  lineup?: string;
  team_total: Record<Target, number>;
  exp_points: number;
  players: PlayerProj[];
}

export interface MatchProj {
  match_id: string;
  venue: string | null;
  date: string | null;
  home: TeamProj;
  away: TeamProj;
  exp_total_points: number;
  exp_supremacy: number;
}

export interface DispersionEntry {
  type: "normal" | "poisson";
  resid_std: number;
  disp_pct: number;
  mean: number;
  /** heteroscedastic sigma model: sigma(pred) = sigma_a + sigma_b·sqrt(pred) */
  sigma_a?: number;
  sigma_b?: number;
  sigma_floor?: number;
  /** Poisson overdispersion Var/mean */
  phi?: number;
  /** empirical CV of (actual − expected)/expected TEAM totals on the holdout —
   *  the spread team totals should be drawn with (replaces hardcoded guesses) */
  team_cv?: number;
}

export interface ProjectionInputs {
  season: number;
  round: number;
  generated: string;
  dispersion: Record<Target, DispersionEntry>;
  matches: MatchProj[];
}

/** Summary of a player's simulated distribution for one stat. */
export interface StatDist {
  mean: number;
  sd: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** P(value > line) at each half-line, e.g. {"19.5": 0.61} (sparse, near mean) */
  over: Record<string, number>;
}

export interface PlayerProjection {
  player_id: string;
  player: string;
  team: string;
  position: string;
  role: string;
  named_pos?: string | null;
  is_ruck: number;
  is_home: number;
  tog: number;
  /** direct model expectation per target (kept for reconciliation vs sim mean) */
  model_exp: Record<Target, number>;
  /** simulated distribution per target */
  dist: Record<Target, StatDist>;
}

export interface MatchProjection {
  match_id: string;
  venue: string | null;
  date: string | null;
  home_team: string;
  away_team: string;
  /** lineup source per side: "confirmed" (named 23) or "proxy" */
  home_lineup?: string;
  away_lineup?: string;
  home_win_prob: number;
  away_win_prob: number;
  draw_prob: number;
  exp_total_points: number;
  exp_supremacy: number;
  median_total_points: number;
  players: PlayerProjection[];
}

export interface ProjectionsOutput {
  season: number;
  round: number;
  generated: string;
  n_sims: number;
  matches: MatchProjection[];
}
