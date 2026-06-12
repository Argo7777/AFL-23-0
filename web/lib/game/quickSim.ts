import { loadMeta, loadStrengths, loadTopRatings, poolStrengths } from "./data";
import { finalsGameProb } from "./finals";
import { randomSeed } from "./rng";
import { buildOpponents, simulateSeason } from "./sim";

export interface QuickSeasonResult {
  wins: number;
  losses: number;
  madeFinals: boolean;
  finalsWon: number; // 0-4; 4 = premiers
  flag: boolean;
}

/** one fast season + auto finals lottery — engine for Rebuild and Dynasty */
export async function quickSeason(rating: number): Promise<QuickSeasonResult> {
  const meta = await loadMeta();
  const strengths = await loadStrengths();
  const { values } = poolStrengths(strengths, meta.decades);
  const seed = randomSeed();
  const opponents = buildOpponents(await loadTopRatings(), meta.decades, 5, seed, 200);
  const sim = simulateSeason(rating, values, seed, opponents, [], 2000);
  const madeFinals = sim.wins >= 13;
  let finalsWon = 0;
  if (madeFinals) {
    const p = finalsGameProb(rating);
    while (finalsWon < 4 && Math.random() < p) finalsWon++;
  }
  return {
    wins: sim.wins,
    losses: sim.losses,
    madeFinals,
    finalsWon,
    flag: finalsWon === 4,
  };
}
