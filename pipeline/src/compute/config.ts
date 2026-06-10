/**
 * All tunable weights for the rating engine live here. Every INPUT is a real
 * scraped stat; these constants only express how much each real signal counts.
 */

export const POSITIONS = ["DEF", "MID", "RUC", "FWD"] as const;
export type Position = (typeof POSITIONS)[number];

/** Decade qualification: minimum games in the decade to enter rating cohorts. */
export function minGamesForDecade(decade: number): number {
  return decade < 1920 ? 10 : 20;
}

/**
 * Per-position stat weights, applied to era z-scores of per-game rates.
 * Stats missing in an era contribute nothing and the remaining weights are
 * renormalized — nothing is imputed.
 */
export const POS_WEIGHTS: Record<Position, Record<string, number>> = {
  FWD: { gl: 3.0, ga: 1.25, mi: 1.5, cm: 1.0, mk: 0.75, bh: 0.5, ki: 0.25, tk: 0.25 },
  MID: { di: 2.5, cl: 2.0, cp: 1.5, i5: 1.25, tk: 1.0, ki: 0.5, hb: 0.5, gl: 0.5, ga: 0.5 },
  DEF: { rb: 2.5, op: 1.5, mk: 1.5, ki: 1.0, di: 0.75, tk: 0.5, cm: 0.5 },
  RUC: { ho: 3.5, cm: 1.0, cl: 1.0, tk: 0.5, mk: 0.5, gl: 0.25, ff: 0.25 },
};

/**
 * Stats and accolades are complementary evidence: counting stats miss
 * lockdown defenders, medals miss underdecorated stat machines. The final
 * rating leans toward whichever signal is STRONGER for the player, so an
 * era's best goalkicker isn't dragged down by modest honours and an
 * all-time full-back isn't buried by invisible-in-the-stats defending.
 */
export const BLEND_HI = 0.62; // weight on the stronger of (stat pct, accolades)
export const BLEND_LO = 0.38; // weight on the weaker
/** stat percentile trust decays gently with era coverage: cov^this */
export const COVERAGE_TRUST_EXP = 0.25;

/**
 * All-Australian line selections are direct, positional proof of elite play
 * (FB/HB lines certify defence, C the midfield, HF/FF the attack, FOL the
 * followers). Added straight onto that position's rating.
 */
export const AA_LINE_BONUS = 6; // per selection in a named line
export const AA_INT_BONUS = 4; // interchange selection -> natural position
export const AA_SQUAD_BONUS = 2; // extended squad -> natural position
export const AA_POS_BONUS_CAP = 25;

/**
 * Off-position discounts: accolades were earned somewhere specific, and in
 * eras without defensive stats a champion forward's marks/kicks would
 * otherwise score like a champion defender's. Playing a player outside his
 * recorded positions costs him.
 */
export const OFF_POS_ACC_FACTOR = 0.6; // accolade signal off-position
export const OFF_POS_RATING_FACTOR = 0.85; // final rating off-position

/**
 * Accolade points (each input scraped): converted to a 0-100 score by capping.
 * Values are per occurrence unless noted.
 */
export const ACCOLADE_POINTS = {
  brownlowWin: 25,
  brownlowTop10: 8, // per top-10 finish in the decade
  brownlowVotesPerGamePctWeight: 30, // percentile (0-1) * this
  aaSelection: 12, // All-Australian final team
  aaSquad: 4, // extended squad only
  colemanTop1: 15, // led the league in goals that season
  colemanTop3: 6,
  premiership: 10,
  risingStarWin: 5,
  durabilityPctWeight: 12, // games-in-decade percentile * this
};
export const ACCOLADE_CAP = 100;

/**
 * Ruck plausibility: a high clearance/tackle profile must not make a 180cm
 * midfielder an elite ruck pick. The RUC rating is gated by the best of three
 * real signals — hitouts actually won, listed height, or a recorded ruck
 * position — with a hard floor (anyone can stand in the square, badly).
 */
export const RUCK_FLOOR = 0.45;
export function ruckHitoutMult(hoZ: number): number {
  return hoZ >= 1.5 ? 1.0 : hoZ >= 0.75 ? 0.85 : hoZ >= 0.25 ? 0.7 : 0;
}
export function ruckHeightMult(heightCm: number): number {
  return heightCm >= 202 ? 1.0 : heightCm >= 198 ? 0.85 : heightCm >= 194 ? 0.65 : heightCm >= 190 ? 0.5 : 0;
}

/** Key-position size: genuine talls get a bump at FWD and DEF. */
export function keyPositionHeightBonus(heightCm: number | null): number {
  if (heightCm == null) return 1;
  return heightCm >= 196 ? 1.06 : heightCm >= 192 ? 1.04 : heightCm >= 188 ? 1.02 : 1;
}

/** UTL versatility: bonus per extra position the player rates >= threshold in. */
export const VERSATILITY_THRESHOLD = 62; // rating out of 100
export const VERSATILITY_BONUS = 0.04;
export const VERSATILITY_MAX_MULT = 1.12;

/**
 * Salary scale anchored to real, public AFL figures (2025 season):
 * Total Player Payments cap ≈ A$17.72M per club (~44-player list, avg ≈ A$403k);
 * reported top-of-market deals ≈ A$1.7-1.9M; senior minimum ≈ A$100k+.
 * A player's salary is a pure function of his era-relative rating.
 */
export const SALARY_MIN = 100_000;
export const SALARY_TOP = 1_900_000;
export const SALARY_GAMMA = 2.2; // convexity: stars cost disproportionately more

/**
 * Market value drives salary: mostly on-field rating, but fame (accolades)
 * inflates the price. Underdecorated stat machines become cap bargains, the
 * way real list managers find value.
 */
export const SALARY_RATING_WEIGHT = 0.6;
export const SALARY_FAME_WEIGHT = 0.4;

/**
 * Salary-cap mode: the cap funds 23 players at a 0.70-market-value average
 * (≈$920k). All-superstar lists (~$1.85M avg) can't fit; a value-hunted side
 * averaging mid-80s ratings just can. Derived from the salary curve above.
 */
export const CAP_TEAM_SIZE = 23;
export const CAP_TARGET_MARKET = 0.7;
