import { mulberry32 } from "./rng";

export type FinalsOutcome =
  | "missed" // no September
  | "elim" // out in week one
  | "semi" // out in the semi
  | "prelim" // out in the prelim
  | "runnerUp" // lost the big one
  | "premiers";

export interface StoryGame {
  round: string; // "R1".."R23"
  oppLabel: string; // "1990s All-Stars (93.4)" or "1995 Carlton"
  oppIdx: number | null; // into the opponents array (null in legacy mode)
  win: boolean;
}

export type TopPlayer = [string, number, string]; // [name, rating, club]

export interface OppTeam {
  rating: number;
  label: string;
  players: TopPlayer[]; // the actual drawn line-up
}

/**
 * Synthetic opposition: every week you face a random all-star side — K
 * players drawn at random from a random selected decade's top-N. Your
 * hand-picked legends play other hand-picked legends, not 1997's mortals.
 */
export function buildOpponents(
  topRatings: Record<string, TopPlayer[]>,
  eras: number[],
  squadSize: number, // 5 or 23
  seed: number,
  count = 400,
): OppTeam[] {
  const poolN = squadSize <= 5 ? 50 : 100;
  const rand = mulberry32(seed ^ 0x0a11);
  const out: OppTeam[] = [];
  const usable = eras.filter((e) => (topRatings[String(e)] ?? []).length >= poolN / 2);
  if (!usable.length) return out;
  for (let i = 0; i < count; i++) {
    const decade = usable[Math.floor(rand() * usable.length)];
    const pool = topRatings[String(decade)];
    const n = Math.min(poolN, pool.length);
    const players: TopPlayer[] = [];
    const taken = new Set<number>();
    while (players.length < Math.min(squadSize, n)) {
      const idx = Math.floor(rand() * n);
      if (taken.has(idx)) continue; // no doubling up in a line-up
      taken.add(idx);
      players.push(pool[idx]);
    }
    const rating = players.reduce((a, p) => a + p[1], 0) / players.length;
    players.sort((a, b) => b[1] - a[1]);
    out.push({ rating, label: `${decade}s All-Stars (${rating.toFixed(1)})`, players });
  }
  return out;
}

export interface SimResult {
  wins: number;
  losses: number;
  perfectPct: number; // % of simulated seasons that went 23-0
  userStrength: number;
  realPercentile: number; // vs real club-seasons of the chosen eras
  distribution: number[]; // index = wins, value = % of seasons
  /** one representative season matching the modal record */
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

/**
 * the Gauntlet: a best-of-3 series against each decade's BEST real team,
 * oldest era first — win the series to advance, survive all 14 to conquer
 * history
 */
export interface GauntletLeg {
  decade: number;
  oppLabel: string; // "1995 Carlton"
  oppStrength: number;
  games: boolean[]; // series games from the player's perspective
  wins: number;
  losses: number;
  survived: boolean;
}

export function simulateGauntlet(
  teamRating: number,
  strengthsByDecade: Record<string, [number, string][]>,
  seed: number,
): GauntletLeg[] {
  const legs: GauntletLeg[] = [];
  const decades = Object.keys(strengthsByDecade).map(Number).sort((a, b) => a - b);
  for (const d of decades) {
    const pairs = strengthsByDecade[String(d)];
    if (!pairs || pairs.length < 8) continue;
    const values = pairs.map((p) => p[0]); // already sorted ascending
    const [oppStrength, oppLabel] = pairs[pairs.length - 1]; // the decade's champion
    const s = ratingToStrength(teamRating, values);
    const p = winProb(s, oppStrength);
    const rand = mulberry32((seed ^ d) >>> 0);
    const games: boolean[] = [];
    let w = 0, l = 0;
    while (w < 2 && l < 2) {
      const win = rand() < p;
      games.push(win);
      if (win) w++;
      else l++;
    }
    legs.push({ decade: d, oppLabel, oppStrength, games, wins: w, losses: l, survived: w === 2 });
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
  opponents: OppTeam[] | null = null, // synthetic all-star opposition
  legacyLabels: string[] = [], // real club-season labels (spoon mode)
  runs = 10_000,
): SimResult {
  const n = strengths.length;
  const userStrength = ratingToStrength(teamRating, strengths);
  const realPercentile = (strengths.filter((s) => s < userStrength).length / n) * 100;

  // precompute each opponent's win probability against us
  let oppProbs: number[];
  let oppLabelOf: (i: number) => string;
  let drawIdx: (rand: () => number) => number;
  if (opponents && opponents.length) {
    oppProbs = opponents.map((o) => winProb(userStrength, ratingToStrength(o.rating, strengths)));
    oppLabelOf = (i) => opponents[i].label;
    drawIdx = (rand) => Math.floor(rand() * opponents.length);
  } else {
    // legacy schedule (wooden spoon): real club-seasons, skipping the
    // bottom quartile and leaning toward quality
    const idxFor = (rand: () => number) => Math.floor((0.25 + 0.75 * rand() ** 0.7) * (n - 1));
    oppProbs = strengths.map((s) => winProb(userStrength, s));
    oppLabelOf = (i) => legacyLabels[i] ?? "a real club of the era";
    drawIdx = idxFor;
  }

  const rand = mulberry32(seed);
  const winCounts = new Array(24).fill(0);
  for (let r = 0; r < runs; r++) {
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      if (rand() < oppProbs[drawIdx(rand)]) wins++;
    }
    winCounts[wins]++;
  }

  let modalWins = 0;
  for (let w = 0; w < winCounts.length; w++) {
    if (winCounts[w] >= winCounts[modalWins]) modalWins = w;
  }

  // ---- the story: replay seasons until one matches the modal record ----
  const storyRand = mulberry32(seed ^ 0x5eed);
  let story: StoryGame[] = [];
  for (let attempt = 0; attempt < 4000; attempt++) {
    const games: StoryGame[] = [];
    let wins = 0;
    for (let g = 0; g < 23; g++) {
      const i = drawIdx(storyRand);
      const win = storyRand() < oppProbs[i];
      if (win) wins++;
      games.push({
        round: `R${g + 1}`,
        oppLabel: oppLabelOf(i),
        oppIdx: opponents && opponents.length ? i : null,
        win,
      });
    }
    if (wins === modalWins) {
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
    story,
  };
}
