import { mulberry32 } from "./rng";

export type FinalsOutcome =
  | "missed" // no September
  | "elim" // out in week one
  | "semi" // out in the semi
  | "prelim" // out in the prelim
  | "runnerUp" // lost the big one
  | "premiers";

export interface SimResult {
  wins: number;
  losses: number;
  perfectPct: number; // % of simulated seasons that went 23-0
  userStrength: number;
  realPercentile: number; // vs real club-seasons of the chosen eras
  distribution: number[]; // index = wins, value = % of seasons
  finals: {
    pct: Record<FinalsOutcome, number>;
    modal: FinalsOutcome;
    premiersPct: number;
    madeFinalsPct: number;
  };
}

/** log5 head-to-head win probability in win-share units */
function log5(a: number, b: number): number {
  return (a * (1 - b)) / (a * (1 - b) + b * (1 - a));
}

/**
 * Map the team rating (0-100) onto the REAL strength distribution of club
 * seasons from the selected decades, then Monte-Carlo a 23-game season plus
 * a final-8 September campaign against the era's best.
 *
 * Calibration anchors: ~80 -> mid-table, ~88 -> top-four contender,
 * ~91 -> 20+ wins, ~95+ -> chasing 23-0 and the flag.
 */
export function simulateSeason(
  teamRating: number,
  strengths: number[], // sorted ascending, pooled real club-season strengths
  seed: number,
  runs = 10_000,
): SimResult {
  const n = strengths.length;
  const min = strengths[0];
  const max = strengths[n - 1];

  const q = Math.max(0, (teamRating - 35) / 55) ** 1.25;
  let userStrength: number;
  if (q <= 1) {
    const idx = q * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(n - 1, lo + 1);
    userStrength = strengths[lo] + (strengths[hi] - strengths[lo]) * (idx - lo);
  } else {
    // beyond the best real club-season: an all-legend lineup should outclass
    // anything history produced — ramp toward near-certainty
    const frac = Math.min(1, ((q - 1) / 0.12) ** 0.75);
    userStrength = max + frac * (0.997 - max);
  }
  userStrength = Math.max(min, Math.min(0.997, userStrength));

  const realPercentile = (strengths.filter((s) => s < userStrength).length / n) * 100;

  // finals cut-offs in win-share terms, from the real strength distribution
  // (top ~44% of a season qualifies in a final-8 world; top ~22% hosts)
  const qualifyShare = strengths[Math.floor(0.62 * (n - 1))];
  const top4Share = strengths[Math.floor(0.82 * (n - 1))];
  const sampleBand = (rand: () => number, lo: number, hi: number) =>
    strengths[Math.floor((lo + rand() * (hi - lo)) * (n - 1))];

  const rand = mulberry32(seed);
  const winCounts = new Array(24).fill(0);
  const outcomes: Record<FinalsOutcome, number> = {
    missed: 0, elim: 0, semi: 0, prelim: 0, runnerUp: 0, premiers: 0,
  };

  for (let r = 0; r < runs; r++) {
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      const opp = strengths[Math.floor(rand() * n)];
      if (rand() < log5(userStrength, opp)) wins++;
    }
    winCounts[wins]++;

    // ---- September ----
    const winShare = wins / 23;
    if (winShare < qualifyShare) {
      outcomes.missed++;
      continue;
    }
    const beat = (lo: number, hi: number) => rand() < log5(userStrength, sampleBand(rand, lo, hi));
    let outcome: FinalsOutcome;
    if (winShare >= top4Share) {
      // top four: qualifying final, a second chance, then prelim and GF
      if (beat(0.85, 1)) {
        outcome = beat(0.85, 1) ? (beat(0.9, 1) ? "premiers" : "runnerUp") : "prelim";
      } else if (beat(0.7, 0.95)) {
        outcome = beat(0.85, 1) ? (beat(0.9, 1) ? "premiers" : "runnerUp") : "prelim";
      } else {
        outcome = "semi";
      }
    } else {
      // elimination path: win four straight or go home
      if (!beat(0.62, 0.9)) outcome = "elim";
      else if (!beat(0.7, 0.95)) outcome = "semi";
      else if (!beat(0.85, 1)) outcome = "prelim";
      else outcome = beat(0.9, 1) ? "premiers" : "runnerUp";
    }
    outcomes[outcome]++;
  }

  let modalWins = 0;
  for (let w = 0; w < winCounts.length; w++) {
    if (winCounts[w] >= winCounts[modalWins]) modalWins = w;
  }
  const finalsPct = Object.fromEntries(
    Object.entries(outcomes).map(([k, v]) => [k, (v / runs) * 100]),
  ) as Record<FinalsOutcome, number>;
  const modalFinals = (Object.keys(outcomes) as FinalsOutcome[]).reduce((a, b) =>
    outcomes[a] >= outcomes[b] ? a : b,
  );

  return {
    wins: modalWins,
    losses: 23 - modalWins,
    perfectPct: (winCounts[23] / runs) * 100,
    userStrength,
    realPercentile,
    distribution: winCounts.map((c) => (c / runs) * 100),
    finals: {
      pct: finalsPct,
      modal: modalFinals,
      premiersPct: finalsPct.premiers,
      madeFinalsPct: 100 - finalsPct.missed,
    },
  };
}
