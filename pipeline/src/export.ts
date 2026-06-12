import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./lib/db.js";
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

  // debut year per player (full career, not decade-clamped) for age modelling
  const debutByKey = new Map<string, number>();
  for (const r of db.prepare(`SELECT player_key k, MIN(year) y FROM season_stats GROUP BY player_key`).all() as
    { k: string; y: number }[]) {
    debutByKey.set(r.k, r.y);
  }

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
        d0: debutByKey.get(p.key) ?? p.years[0],
        sea: [...p.seasons.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([yr, s]) => [yr, ...s]),
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

  // ---- on this day ----
  // for each calendar day: prefer the most recent Grand Final, then any
  // final, then the biggest-margin home-and-away game played on that day
  const MONTHS: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const matchRows = db
    .prepare(`SELECT date, year, round, team1, score1, team2, score2 FROM matches`)
    .all() as { date: string; year: number; round: string; team1: string; score1: number; team2: string; score2: number }[];
  const byDay = new Map<string, { score: number; m: (typeof matchRows)[0] }>();
  for (const m of matchRows) {
    const parts = m.date.split("-"); // "27-Sep-2025"
    if (parts.length !== 3 || !MONTHS[parts[1]]) continue;
    const key = `${MONTHS[parts[1]]}-${parts[0].padStart(2, "0")}`;
    const finalsRank = m.round === "GF" ? 3 : /^(PF|SF|QF|EF)$/.test(m.round) ? 2 : 1;
    const score = finalsRank * 1_000_000 + m.year * 100 + Math.min(99, Math.abs(m.score1 - m.score2));
    const prev = byDay.get(key);
    if (!prev || score > prev.score) byDay.set(key, { score, m });
  }
  const onThisDay: Record<string, unknown> = {};
  for (const [k, { m }] of byDay) {
    onThisDay[k] = { y: m.year, r: m.round, t1: m.team1, s1: m.score1, t2: m.team2, s2: m.score2 };
  }
  writeFileSync(join(OUT_DIR, "onthisday.json"), JSON.stringify(onThisDay));

  // ---- top players per decade (synthetic all-star opponents) ----
  // [name, best rating, primary club] so opposing line-ups can be inspected
  const topRatings: Record<string, [string, number, string][]> = {};
  for (const decade of decades) {
    topRatings[decade] = players
      .filter((p) => p.decade === decade)
      .sort((a, b) => b.best - a.best)
      .slice(0, 100)
      .map((p) => [
        p.name,
        p.best,
        [...p.clubs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "",
      ]);
  }
  writeFileSync(join(OUT_DIR, "topratings.json"), JSON.stringify(topRatings));

  // ---- award winners by year (for the Who Won It game) ----
  const flipName = (n: string) => {
    const i = n.indexOf(",");
    return i === -1 ? n : `${n.slice(i + 1).trim()} ${n.slice(0, i).trim()}`;
  };
  const aaByYear: Record<string, string[]> = {};
  for (const r of db.prepare(`SELECT year, player_name, pos FROM all_australian`).all() as
    { year: number; player_name: string; pos: string | null }[]) {
    if (r.pos === "SQUAD") continue;
    (aaByYear[r.year] ??= []).push(r.player_name);
  }
  const brownlowByYear: Record<string, string> = {};
  for (const r of db.prepare(`SELECT year, player_name FROM brownlow WHERE winner = 1`).all() as
    { year: number; player_name: string }[]) {
    brownlowByYear[r.year] = r.player_name;
  }
  // some footywire years lack the winner flag — fall back to the top of the tally
  for (const r of db.prepare(
    `SELECT year, player_name FROM brownlow a WHERE votes = (SELECT MAX(votes) FROM brownlow b WHERE b.year = a.year)`,
  ).all() as { year: number; player_name: string }[]) {
    brownlowByYear[r.year] ??= r.player_name;
  }
  for (const r of db.prepare(
    `SELECT year, player_name FROM at_brownlow a WHERE votes = (SELECT MAX(votes) FROM at_brownlow b WHERE b.year = a.year)`,
  ).all() as { year: number; player_name: string }[]) {
    brownlowByYear[r.year] ??= flipName(r.player_name);
  }
  const colemanByYear: Record<string, string> = {};
  for (const r of db.prepare(
    `SELECT year, player_name FROM season_stats a WHERE gl IS NOT NULL AND gl = (SELECT MAX(gl) FROM season_stats b WHERE b.year = a.year)`,
  ).all() as { year: number; player_name: string }[]) {
    colemanByYear[r.year] = flipName(r.player_name);
  }
  writeFileSync(
    join(OUT_DIR, "awards.json"),
    JSON.stringify({ aa: aaByYear, brownlow: brownlowByYear, coleman: colemanByYear }),
  );

  // ---- tipping sample (real matches with strength-implied odds) ----
  const strengthByClubYear = new Map<string, number>();
  for (const s of strengths) strengthByClubYear.set(`${s.club}|${s.year}`, s.strength);
  const allMatches = db
    .prepare(`SELECT year, round, team1, score1, team2, score2 FROM matches WHERE year >= 1920 AND score1 != score2`)
    .all() as { year: number; round: string; team1: string; score1: number; team2: string; score2: number }[];
  const tips: [number, string, string, number, string, number, number][] = [];
  for (let i = 0; i < allMatches.length; i += 4) {
    const m = allMatches[i];
    const s1 = strengthByClubYear.get(`${m.team1}|${m.year}`);
    const s2 = strengthByClubYear.get(`${m.team2}|${m.year}`);
    if (s1 == null || s2 == null) continue;
    const p1 = (s1 * (1 - s2)) / (s1 * (1 - s2) + s2 * (1 - s1));
    tips.push([
      m.year, m.round, m.team1, m.score1, m.team2, m.score2, Math.round(p1 * 1000) / 1000,
    ]);
  }
  writeFileSync(join(OUT_DIR, "tips.json"), JSON.stringify(tips));

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
