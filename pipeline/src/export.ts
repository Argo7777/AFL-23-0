import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeRatings, PlayerDecade } from "./compute/ratings.js";
import { computeTeamStrengths } from "./compute/team-strengths.js";
import {
  SALARY_MIN, SALARY_TOP, SALARY_GAMMA, SALARY_RATING_WEIGHT, SALARY_FAME_WEIGHT,
  CAP_TEAM_SIZE, CAP_TARGET_MARKET, minGamesForDecade,
} from "./compute/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "web", "public", "data");

function round1(v: number) {
  return Math.round(v * 10) / 10;
}

/**
 * Salary: pure function of the player's market value — on-field rating
 * blended with fame (accolade score). Both inputs derive from scraped stats,
 * so prices regenerate on every refresh.
 */
function assignSalaries(players: PlayerDecade[]): Map<PlayerDecade, number> {
  const salaries = new Map<PlayerDecade, number>();
  for (const p of players) {
    const market =
      (SALARY_RATING_WEIGHT * p.best + SALARY_FAME_WEIGHT * p.accScore) / 100;
    const salary =
      SALARY_MIN + (SALARY_TOP - SALARY_MIN) * Math.pow(Math.max(0, market), SALARY_GAMMA);
    salaries.set(p, Math.round(salary / 5000) * 5000);
  }
  return salaries;
}

export function exportData() {
  console.log("Computing ratings...");
  const players = computeRatings();
  console.log(`  ${players.length} player-decade rows`);
  const salaries = assignSalaries(players);

  console.log("Computing team strengths...");
  const strengths = computeTeamStrengths();

  mkdirSync(OUT_DIR, { recursive: true });

  // ---- per-decade player files ----
  const decades = [...new Set(players.map((p) => p.decade))].sort();
  const capByDecade: Record<string, number> = {};
  for (const decade of decades) {
    const pool = players.filter((p) => p.decade === decade);
    const entries = pool
      .sort((a, b) => b.best - a.best)
      .map((p) => ({
        id: `${p.key}|${p.decade}`,
        n: p.name,
        g: p.games,
        h: p.height,
        y: p.years,
        c: Object.fromEntries(p.clubs),
        r: p.posRating,
        nat: p.natural,
        elig: p.eligible,
        src: p.posSource,
        u: p.utlMult,
        s: salaries.get(p) ?? SALARY_MIN,
        a: {
          bw: p.br, bwW: p.brWins, t10: p.brTop10, aa: p.aaTeam, aas: p.aaSquad,
          col: p.colemanTop1, c3: p.colemanTop3, pr: p.premierships, rs: p.risingStarWin,
          acc: round1(p.accScore),
        },
        st: {
          di: p.rates.di != null ? round1(p.rates.di) : null,
          gl: p.rates.gl != null ? round1(p.rates.gl) : null,
          mk: p.rates.mk != null ? round1(p.rates.mk) : null,
          tk: p.rates.tk != null ? round1(p.rates.tk) : null,
          ho: p.rates.ho != null ? round1(p.rates.ho) : null,
        },
      }));
    writeFileSync(join(OUT_DIR, `players-${decade}.json`), JSON.stringify(entries));

    const targetSalary =
      SALARY_MIN + (SALARY_TOP - SALARY_MIN) * Math.pow(CAP_TARGET_MARKET, SALARY_GAMMA);
    capByDecade[decade] = Math.round((targetSalary * CAP_TEAM_SIZE) / 100_000) * 100_000;
    console.log(`  decade ${decade}: ${entries.length} players, cap $${capByDecade[decade] / 1e6}M`);
  }

  // ---- strengths ----
  // [strength, "Club YYYY"] tuples so the sim can narrate real opponents
  const strengthsByDecade: Record<string, [number, string][]> = {};
  for (const s of strengths) {
    (strengthsByDecade[s.decade] ??= []).push([
      Math.round(s.strength * 1000) / 1000,
      `${s.year} ${s.club}`,
    ]);
  }
  for (const d of Object.keys(strengthsByDecade)) strengthsByDecade[d].sort((a, b) => a[0] - b[0]);
  writeFileSync(join(OUT_DIR, "strengths.json"), JSON.stringify(strengthsByDecade));

  // ---- meta: which clubs exist per decade (from real fixtures) ----
  const clubsByDecade: Record<string, string[]> = {};
  for (const decade of decades) {
    const clubs = new Set<string>();
    for (const p of players.filter((q) => q.decade === decade && q.games >= 5)) {
      for (const club of p.clubs.keys()) clubs.add(club);
    }
    clubsByDecade[decade] = [...clubs].sort();
  }
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      decades,
      clubsByDecade,
      capByDecade,
      salary: { min: SALARY_MIN, top: SALARY_TOP, gamma: SALARY_GAMMA },
      sources: ["afltables.com", "footywire.com", "wikidata.org"],
    }),
  );
  console.log(`Exported to ${OUT_DIR}`);
}
