/**
 * Run the Monte-Carlo over a projection-inputs artifact (produced by the
 * AFL-Modelling Python pipeline) and emit per-round site JSON.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { simulateMatch } from "./simulate.js";
import { ProjectionInputs, ProjectionsOutput } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_ROOT = join(__dirname, "..", "..");
const DEFAULT_IN = join(PIPELINE_ROOT, "data", "projection_inputs.json");
const DEFAULT_OUT = join(PIPELINE_ROOT, "..", "web", "public", "data");

export interface RunOpts {
  inPath?: string;
  outDir?: string;
  nSims?: number;
}

export function runProjections(opts: RunOpts = {}): ProjectionsOutput {
  const inPath = opts.inPath ?? DEFAULT_IN;
  const outDir = opts.outDir ?? DEFAULT_OUT;
  const nSims = opts.nSims ?? 4000;
  if (!existsSync(inPath)) {
    throw new Error(
      `projection inputs not found: ${inPath}\n` +
        `Generate it in AFL-Modelling (python src/predict.py) and copy artifacts/` +
        `projection_inputs.json to pipeline/data/.`,
    );
  }
  const inputs: ProjectionInputs = JSON.parse(readFileSync(inPath, "utf-8"));
  console.log(
    `Simulating ${inputs.matches.length} matches × ${nSims} sims ` +
      `(${inputs.season} R${inputs.round})...`,
  );

  const matches = inputs.matches.map((m) => {
    const out = simulateMatch(m, inputs.dispersion, nSims);
    console.log(
      `  ${out.home_team} ${(out.home_win_prob * 100).toFixed(0)}% vs ` +
        `${(out.away_win_prob * 100).toFixed(0)}% ${out.away_team}  ` +
        `(median total ${out.median_total_points})`,
    );
    return out;
  });

  const output: ProjectionsOutput = {
    season: inputs.season, round: inputs.round,
    generated: inputs.generated, n_sims: nSims, matches,
  };

  mkdirSync(outDir, { recursive: true });
  const named = join(outDir, `projections-${inputs.season}-r${inputs.round}.json`);
  const latest = join(outDir, "projections-latest.json");
  const body = JSON.stringify(output);
  writeFileSync(named, body);
  writeFileSync(latest, body);
  const nPlayers = matches.reduce((a, m) => a + m.players.length, 0);
  console.log(`Wrote ${named} and projections-latest.json (${nPlayers} players)`);
  return output;
}

// allow direct invocation: tsx src/montecarlo/index.ts [--sims N] [--in p] [--out d]
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const get = (f: string) => { const i = a.indexOf(f); return i !== -1 ? a[i + 1] : undefined; };
  runProjections({
    nSims: get("--sims") ? Number(get("--sims")) : undefined,
    inPath: get("--in"), outDir: get("--out"),
  });
}
