/**
 * Pricing + staking helpers (pure, framework-free) — the maths behind the
 * Value page. Mirrors the distribution-pricing approach in AFL-Modelling:
 * model probability vs de-vigged market price → edge, EV, Kelly stake.
 */

/** decimal odds → implied probability (with vig) */
export const impliedProb = (odds: number) => (odds > 1 ? 1 / odds : 0);

/** de-vig a two-way (over/under) market to probabilities summing to 1 */
export function devigTwoWay(over: number, under: number): [number, number] {
  const a = impliedProb(over), b = impliedProb(under);
  const s = a + b;
  return s > 0 ? [a / s, b / s] : [0, 0];
}

/** fair decimal odds from a probability */
export const fairOdds = (p: number) => (p > 0 ? 1 / p : Infinity);

/** EV per $1 staked at `odds` when true probability is `p` (push returns stake) */
export const ev = (p: number, odds: number) => p * (odds - 1) - (1 - p);

/** edge in percentage points: model prob − market (de-vigged) prob */
export const edgePct = (modelP: number, marketP: number) => (modelP - marketP) * 100;

/** full-Kelly fraction of bankroll for a bet at `odds` with win prob `p` */
export function kellyFraction(p: number, odds: number): number {
  const b = odds - 1;
  if (b <= 0) return 0;
  return (p * b - (1 - p)) / b;
}

/**
 * Recommended stake = (fraction of Kelly) × bankroll.
 *
 * Full Kelly is first clamped to `fullCap` of bankroll (so a huge/edge-artifact
 * line can't recommend an absurd bet); the chosen fraction (kFrac: 1 / ½ / ¼)
 * then scales below that — so the Full/½/¼ buttons always change the number.
 * Returns 0 when the edge is non-positive.
 */
export function recommendedStake(
  p: number, odds: number, bankroll: number,
  kFrac = 0.25, fullCap = 0.2,
): number {
  const f = Math.min(Math.max(0, kellyFraction(p, odds)), fullCap);
  return Math.round(f * kFrac * bankroll * 100) / 100;
}
