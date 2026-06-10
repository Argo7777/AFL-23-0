import { mulberry32 } from "./rng";

export interface SimResult {
  wins: number;
  losses: number;
  perfectPct: number; // % of simulated seasons that went 23-0
  userStrength: number;
  realPercentile: number; // vs real club-seasons of the chosen eras
  distribution: number[]; // index = wins, value = % of seasons
  bestComparable: string;
}

/**
 * Map the team rating (0-100) onto the REAL strength distribution of club
 * seasons from the selected decades, then Monte-Carlo a 23-game season
 * against opponents drawn from those same real seasons.
 *
 * A team has to be packed with all-era greats before 23-0 becomes likely —
 * a rating around the real-best-team level wins ~20 of 23.
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

  // rating -> quantile of the real strength distribution (with headroom above
  // the best real team for all-time-great lineups)
  const q = Math.max(0, (teamRating - 35) / 62) ** 1.25;
  let userStrength: number;
  if (q <= 1) {
    const idx = q * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(n - 1, lo + 1);
    userStrength = strengths[lo] + (strengths[hi] - strengths[lo]) * (idx - lo);
  } else {
    // beyond the best real club-season: an all-legend lineup should outclass
    // anything history produced — ramp toward near-certainty as the rating
    // approaches a perfect 100
    const frac = Math.min(1, ((q - 1) / 0.06) ** 0.75);
    userStrength = max + frac * (0.997 - max);
  }
  userStrength = Math.max(min, Math.min(0.997, userStrength));

  const realPercentile =
    (strengths.filter((s) => s < userStrength).length / n) * 100;

  const rand = mulberry32(seed);
  const winCounts = new Array(24).fill(0);
  for (let r = 0; r < runs; r++) {
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      const opp = strengths[Math.floor(rand() * n)];
      // log5: P(win) for strength a vs b in win-share units
      const p =
        (userStrength * (1 - opp)) /
        (userStrength * (1 - opp) + opp * (1 - userStrength));
      if (rand() < p) wins++;
    }
    winCounts[wins]++;
  }

  let modalWins = 0;
  for (let w = 0; w < winCounts.length; w++) {
    if (winCounts[w] >= winCounts[modalWins]) modalWins = w;
  }

  return {
    wins: modalWins,
    losses: 23 - modalWins,
    perfectPct: (winCounts[23] / runs) * 100,
    userStrength,
    realPercentile,
    distribution: winCounts.map((c) => (c / runs) * 100),
    bestComparable: "",
  };
}
