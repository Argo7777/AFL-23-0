/* Difficulty calibration: sweep team rating × upset-cap and report the chance
 * of a perfect home-and-away season, so we can set caps where a ~100 team is
 * ~5% to run the table and the odds collapse as the rating falls.
 * Run: npx tsx scripts/calibrate.ts                                          */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildOpponents, simulateSeason } from "../lib/game/sim";

const dir = join(process.cwd(), "public", "data");
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

function pool(strengths: Record<string, [number, string][]>, eras: number[]): number[] {
  return eras.flatMap((e) => strengths[String(e)] ?? []).map((p) => p[0]).sort((a, b) => a - b);
}

function sweep(label: string, strengthsFile: string, topFile: string, eras: number[], N: number, caps: number[]) {
  const strengths = read(strengthsFile);
  const top = read(topFile);
  const values = pool(strengths, eras);
  const opps = buildOpponents(top, eras, 5, 12345, 400);
  console.log(`\n###### ${label}  N=${N}  (${values.length} strengths, ${opps.length} opponents) ######`);
  for (const cap of caps) {
    const row = [100, 96, 92, 90, 88, 85, 80].map((R) => {
      const sim = simulateSeason(R, values, 999, opps, [], 30000, { seasonGames: N, upsetCap: cap });
      return `R${R} ${sim.wins}/${N} ${sim.perfectPct.toFixed(1)}%`;
    });
    console.log(`cap ${cap.toFixed(3)} | ${row.join("  ")}`);
  }
}

const aflStr = read("strengths.json");
const aflEras = Object.keys(aflStr).map(Number).filter((d) => d >= 1980);
const aflwStr = read("aflw-strengths.json");
const aflwEras = Object.keys(aflwStr).map(Number);

sweep("AFL (modern eras default)", "strengths.json", "topratings.json", aflEras, 23, [0.88, 0.90, 0.91, 0.92, 0.93]);
sweep("AFLW (all seasons)", "aflw-strengths.json", "aflw-topratings.json", aflwEras, 12, [0.80, 0.82, 0.83, 0.85, 0.87]);
