import { mulberry32 } from "./rng";

export type FinalsOutcome =
  | "missed" // no September
  | "elim" // out in week one
  | "semi" // out in the semi
  | "prelim" // out in the prelim
  | "runnerUp" // lost the big one
  | "premiers";

export interface StoryGame {
  round: string; // "R1".."R23", "Qualifying Final", "Grand Final"…
  opp: number; // index into the sorted strengths array (label lookup)
  win: boolean;
}

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
  /** one representative season matching the modal record & finals outcome */
  story: StoryGame[];
}

/**
 * Any given Sunday: no side, however stacked, escapes the irreducible chance
 * of an upset — injuries, weather, freak days. The cap bounds a perfect
 * season at cap^23 for even a flawless team.
 */
const UPSET_CAP = 0.855;

/** log5 head-to-head win probability in win-share units, upset-capped */
function winProb(a: number, b: number): number {
  return Math.min(UPSET_CAP, (a * (1 - b)) / (a * (1 - b) + b * (1 - a)));
}

/** map a team rating onto the real strength distribution (sorted ascending) */
export function ratingToStrength(teamRating: number, strengths: number[]): number {
  const n = strengths.length;
  const min = strengths[0];
  const max = strengths[n - 1];
  const q = Math.max(0, (teamRating - 35) / 57) ** 1.25;
  let s: number;
  if (q <= 1) {
    const idx = q * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(n - 1, lo + 1);
    s = strengths[lo] + (strengths[hi] - strengths[lo]) * (idx - lo);
  } else {
    s = max + Math.min(1, (q - 1) / 0.2) * (0.997 - max);
  }
  return Math.max(min, Math.min(0.997, s));
}

/** best-of-5 showdown between two teams — your roster vs a mate's */
export interface SeriesResult {
  games: boolean[]; // from my perspective
  myWins: number;
  theirWins: number;
  won: boolean;
}

export function simulateSeries(
  myRating: number,
  theirRating: number,
  strengths: number[],
  seed: number,
): SeriesResult {
  const me = ratingToStrength(myRating, strengths);
  const them = ratingToStrength(theirRating, strengths);
  // head-to-head: cap symmetrically so neither side is a lock
  const p = Math.max(1 - UPSET_CAP, Math.min(UPSET_CAP, (me * (1 - them)) / (me * (1 - them) + them * (1 - me))));
  const rand = mulberry32(seed ^ 0xd0e1);
  const games: boolean[] = [];
  let my = 0, their = 0;
  while (my < 3 && their < 3) {
    const win = rand() < p;
    games.push(win);
    if (win) my++;
    else their++;
  }
  return { games, myWins: my, theirWins: their, won: my === 3 };
}

/** the Gauntlet: survive every decade of history in sequence */
export interface GauntletLeg {
  decade: number;
  wins: number;
  losses: number;
  survived: boolean; // 12+ wins to advance
}

export function simulateGauntlet(
  teamRating: number,
  strengthsByDecade: Record<string, [number, string][]>,
  seed: number,
): GauntletLeg[] {
  const legs: GauntletLeg[] = [];
  const decades = Object.keys(strengthsByDecade).map(Number).sort((a, b) => a - b);
  for (const d of decades) {
    const values = strengthsByDecade[String(d)].map((p) => p[0]).sort((a, b) => a - b);
    if (values.length < 8) continue;
    const s = ratingToStrength(teamRating, values);
    const n = values.length;
    const rand = mulberry32((seed ^ d) >>> 0);
    const wc = new Array(24).fill(0);
    for (let r = 0; r < 2000; r++) {
      let w = 0;
      for (let g = 0; g < 23; g++) {
        const opp = values[Math.floor((0.25 + 0.75 * rand() ** 0.7) * (n - 1))];
        if (rand() < winProb(s, opp)) w++;
      }
      wc[w]++;
    }
    let modal = 0;
    for (let w = 0; w < 24; w++) if (wc[w] >= wc[modal]) modal = w;
    legs.push({ decade: d, wins: modal, losses: 23 - modal, survived: modal >= 12 });
  }
  return legs;
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
  const userStrength = ratingToStrength(teamRating, strengths);

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

  // schedule strength: no fixture is 23 games against wooden-spooners — the
  // draw skips the bottom quartile of real teams and leans toward quality
  const drawOpponent = (rand: () => number) =>
    strengths[Math.floor((0.25 + 0.75 * rand() ** 0.7) * (n - 1))];

  for (let r = 0; r < runs; r++) {
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      const opp = drawOpponent(rand);
      if (rand() < winProb(userStrength, opp)) wins++;
    }
    winCounts[wins]++;

    // ---- September ----
    const winShare = wins / 23;
    if (winShare < qualifyShare) {
      outcomes.missed++;
      continue;
    }
    const beat = (lo: number, hi: number) => rand() < winProb(userStrength, sampleBand(rand, lo, hi));
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

  // ---- the story: replay seasons until one matches the modal outcome ----
  const storyRand = mulberry32(seed ^ 0x5eed);
  let story: StoryGame[] = [];
  for (let attempt = 0; attempt < 4000; attempt++) {
    const games: StoryGame[] = [];
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      const oppIdx = Math.floor((0.25 + 0.75 * storyRand() ** 0.7) * (n - 1));
      const win = storyRand() < winProb(userStrength, strengths[oppIdx]);
      if (win) wins++;
      games.push({ round: `R${g + 1}`, opp: oppIdx, win });
    }
    if (wins !== modalWins) continue;

    const winShare = wins / 23;
    let outcome: FinalsOutcome = "missed";
    if (winShare >= qualifyShare) {
      const final = (round: string, lo: number, hi: number): boolean => {
        const oppIdx = Math.floor((lo + storyRand() * (hi - lo)) * (n - 1));
        const win = storyRand() < winProb(userStrength, strengths[oppIdx]);
        games.push({ round, opp: oppIdx, win });
        return win;
      };
      if (winShare >= top4Share) {
        if (final("Qualifying Final", 0.85, 1)) {
          outcome = final("Preliminary Final", 0.85, 1)
            ? final("Grand Final", 0.9, 1) ? "premiers" : "runnerUp"
            : "prelim";
        } else if (final("Semi Final", 0.7, 0.95)) {
          outcome = final("Preliminary Final", 0.85, 1)
            ? final("Grand Final", 0.9, 1) ? "premiers" : "runnerUp"
            : "prelim";
        } else {
          outcome = "semi";
        }
      } else {
        if (!final("Elimination Final", 0.62, 0.9)) outcome = "elim";
        else if (!final("Semi Final", 0.7, 0.95)) outcome = "semi";
        else if (!final("Preliminary Final", 0.85, 1)) outcome = "prelim";
        else outcome = final("Grand Final", 0.9, 1) ? "premiers" : "runnerUp";
      }
    }
    if (outcome === modalFinals) {
      story = games;
      break;
    }
  }

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
    story,
  };
}
