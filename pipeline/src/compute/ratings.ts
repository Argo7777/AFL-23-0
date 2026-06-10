import { db } from "../lib/db.js";
import { canonicalClub, normalizeName, foldFirstName, FOOTYWIRE_CLUBS } from "../lib/clubs.js";
import {
  POSITIONS, Position, POS_WEIGHTS, STAT_BLEND, ACCOLADE_POINTS, ACCOLADE_CAP,
  VERSATILITY_THRESHOLD, VERSATILITY_BONUS, VERSATILITY_MAX_MULT, minGamesForDecade,
} from "./config.js";
import { buildPositionEvidence } from "./positions.js";

const STATS = [
  "ki", "mk", "hb", "di", "gl", "bh", "ho", "tk", "rb", "i5", "cl",
  "cg", "ff", "fa", "cp", "up", "cm", "mi", "op", "bo", "ga",
] as const;
type Stat = (typeof STATS)[number];

export interface PlayerDecade {
  key: string; // player_key
  name: string; // display "First Last"
  decade: number;
  games: number;
  clubs: Map<string, number>; // canonical club -> games for that club in decade
  years: [number, number];
  totals: Partial<Record<Stat, number>>;
  rates: Partial<Record<Stat, number>>;
  br: number; // brownlow votes in decade (afltables BR column)
  // accolades
  brWins: number;
  brTop10: number;
  aaTeam: number;
  aaSquad: number;
  colemanTop1: number;
  colemanTop3: number;
  premierships: number;
  risingStarWin: number;
  // computed
  accScore: number;
  posRating: Record<Position, number>;
  natural: Position;
  eligible: Position[];
  posSource: string;
  utlMult: number;
  best: number;
}

interface SeasonRow {
  player_key: string;
  player_name: string;
  team: string;
  year: number;
  gm: number | null;
  br: number | null;
  [stat: string]: unknown;
}

function displayName(afltablesName: string): string {
  const i = afltablesName.indexOf(",");
  if (i === -1) return afltablesName;
  return `${afltablesName.slice(i + 1).trim()} ${afltablesName.slice(0, i).trim()}`;
}

function percentileOf(sorted: number[], v: number): number {
  // fraction of values strictly below v, midpoint for ties
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  let hi2 = sorted.length;
  let lo2 = lo;
  while (lo2 < hi2) {
    const mid = (lo2 + hi2) >> 1;
    if (sorted[mid] <= v) lo2 = mid + 1;
    else hi2 = mid;
  }
  return sorted.length ? (lo + lo2) / 2 / sorted.length : 0.5;
}

export function computeRatings(): PlayerDecade[] {
  const rows = db.prepare(`SELECT * FROM season_stats`).all() as SeasonRow[];

  // ---- aggregate player x decade ----
  const byPD = new Map<string, PlayerDecade>();
  // (normName|year) -> player_keys, for joining footywire-keyed awards
  const nameYearIndex = new Map<string, Set<string>>();
  // (player_name|team|year) -> player_key, for joining GF lineups
  const gfIndex = new Map<string, string>();
  // per (year) leaderboards
  const goalsByYear = new Map<number, { key: string; gl: number }[]>();
  const votesByYear = new Map<number, { key: string; br: number }[]>();
  // Brownlow votes need three sources: season-page BR column (1980s+),
  // afltables brownlow pages (1924-1964), footywire tallies (fills 1965-1979)
  const seasonVotes: { key: string; year: number; br: number }[] = [];
  const brSumByYear = new Map<number, number>();

  for (const r of rows) {
    const decade = Math.floor(r.year / 10) * 10;
    const id = `${r.player_key}|${decade}`;
    let pd = byPD.get(id);
    if (!pd) {
      pd = {
        key: r.player_key, name: displayName(r.player_name), decade,
        games: 0, clubs: new Map(), years: [r.year, r.year], totals: {}, rates: {},
        br: 0, brWins: 0, brTop10: 0, aaTeam: 0, aaSquad: 0, colemanTop1: 0,
        colemanTop3: 0, premierships: 0, risingStarWin: 0, accScore: 0,
        posRating: { DEF: 0, MID: 0, RUC: 0, FWD: 0 }, natural: "MID",
        eligible: [], posSource: "stats", utlMult: 1, best: 0,
      };
      byPD.set(id, pd);
    }
    const club = canonicalClub(r.team);
    pd.games += r.gm ?? 0;
    pd.clubs.set(club, (pd.clubs.get(club) ?? 0) + (r.gm ?? 0));
    pd.years = [Math.min(pd.years[0], r.year), Math.max(pd.years[1], r.year)];
    if (r.br != null && r.br > 0) {
      seasonVotes.push({ key: r.player_key, year: r.year, br: r.br });
      brSumByYear.set(r.year, (brSumByYear.get(r.year) ?? 0) + r.br);
    }
    for (const s of STATS) {
      const v = r[s] as number | null;
      if (v != null) pd.totals[s] = (pd.totals[s] ?? 0) + v;
    }

    const norm = normalizeName(r.player_name);
    // index under full name, diminutive-folded name, and "initial surname"
    // (All-Australian pages print "J Sicily")
    const folded = foldFirstName(norm);
    const initialForm = norm.includes(" ") ? `${norm[0]} ${norm.slice(norm.indexOf(" ") + 1)}` : norm;
    for (const form of new Set([norm, folded, initialForm])) {
      const ny = `${form}|${r.year}`;
      if (!nameYearIndex.has(ny)) nameYearIndex.set(ny, new Set());
      nameYearIndex.get(ny)!.add(r.player_key);
    }
    gfIndex.set(`${r.player_name}|${r.team}|${r.year}`, r.player_key);

    const gl = r.gl as number | null;
    if (gl != null && gl > 0) {
      if (!goalsByYear.has(r.year)) goalsByYear.set(r.year, []);
      goalsByYear.get(r.year)!.push({ key: r.player_key, gl });
    }
  }

  for (const pd of byPD.values()) {
    if (pd.games > 0) {
      for (const s of STATS) {
        if (pd.totals[s] != null) pd.rates[s] = pd.totals[s]! / pd.games;
      }
    }
  }

  const pdByKeyDecade = (key: string, year: number) =>
    byPD.get(`${key}|${Math.floor(year / 10) * 10}`);

  const resolveByNameYearClub = (name: string, year: number, clubSlug: string): PlayerDecade | undefined => {
    const norm = normalizeName(name);
    const keys =
      nameYearIndex.get(`${norm}|${year}`) ??
      nameYearIndex.get(`${foldFirstName(norm)}|${year}`);
    if (!keys) return undefined;
    const club = FOOTYWIRE_CLUBS[clubSlug];
    let fallback: PlayerDecade | undefined;
    for (const key of keys) {
      const pd = pdByKeyDecade(key, year);
      if (!pd) continue;
      if (club && pd.clubs.has(club)) return pd;
      fallback = pd;
    }
    return fallback;
  };

  // ---- unified Brownlow votes ----
  const applyVotes = (key: string, year: number, br: number) => {
    const pd = pdByKeyDecade(key, year);
    if (!pd || br <= 0) return;
    pd.br += br;
    if (!votesByYear.has(year)) votesByYear.set(year, []);
    votesByYear.get(year)!.push({ key, br });
  };
  for (const sv of seasonVotes) applyVotes(sv.key, sv.year, sv.br);

  const atBrownlow = db
    .prepare(`SELECT year, player_name, team, votes FROM at_brownlow`)
    .all() as { year: number; player_name: string; team: string; votes: number }[];
  for (const row of atBrownlow) {
    if ((brSumByYear.get(row.year) ?? 0) > 0) continue; // season pages already cover it
    const key = gfIndex.get(`${row.player_name}|${row.team}|${row.year}`);
    if (key) {
      applyVotes(key, row.year, row.votes);
    } else {
      const keys = nameYearIndex.get(`${normalizeName(row.player_name)}|${row.year}`);
      if (keys?.size) applyVotes([...keys][0], row.year, row.votes);
    }
  }

  const atYears = new Set(atBrownlow.map((r) => r.year));
  const fwVotes = db
    .prepare(`SELECT year, player_name, team, votes FROM brownlow`)
    .all() as { year: number; player_name: string; team: string; votes: number }[];
  for (const row of fwVotes) {
    if ((brSumByYear.get(row.year) ?? 0) > 0 || atYears.has(row.year)) continue;
    const pd = resolveByNameYearClub(row.player_name, row.year, row.team);
    if (!pd) continue;
    pd.br += row.votes;
    if (!votesByYear.has(row.year)) votesByYear.set(row.year, []);
    // keyed back through the pd's own key so leaderboards stay consistent
    votesByYear.get(row.year)!.push({ key: pd.key, br: row.votes });
  }

  // ---- accolades ----
  // Coleman (leading goalkicker) & Brownlow top-10 / pre-1965 derived winners
  for (const [year, list] of goalsByYear) {
    list.sort((a, b) => b.gl - a.gl);
    const top1 = list[0]?.gl ?? 0;
    list.slice(0, 8).forEach((e, i) => {
      const pd = pdByKeyDecade(e.key, year);
      if (!pd) return;
      if (e.gl === top1) pd.colemanTop1++;
      else if (i < 3) pd.colemanTop3++;
    });
  }
  const fwWinnerYears = new Set(
    (db.prepare(`SELECT DISTINCT year FROM brownlow WHERE winner = 1`).all() as { year: number }[])
      .map((r) => r.year),
  );
  for (const [year, list] of votesByYear) {
    list.sort((a, b) => b.br - a.br);
    list.slice(0, 12).forEach((e, i) => {
      const pd = pdByKeyDecade(e.key, year);
      if (!pd) return;
      if (i < 10) pd.brTop10++;
      // derived winner only for years footywire's authoritative flag doesn't cover
      if (!fwWinnerYears.has(year) && e.br === list[0].br && e.br > 0) pd.brWins++;
    });
  }

  // footywire-flagged Brownlow winners (handles ineligible top-pollers correctly)
  const fwWinners = db
    .prepare(`SELECT year, player_name, team FROM brownlow WHERE winner = 1`)
    .all() as { year: number; player_name: string; team: string }[];
  for (const w of fwWinners) {
    const pd = resolveByNameYearClub(w.player_name, w.year, w.team);
    if (pd) pd.brWins++;
    else console.warn(`  unmatched brownlow winner: ${w.year} ${w.player_name}`);
  }

  // All-Australian
  const aaRows = db
    .prepare(`SELECT year, player_name, team, pos FROM all_australian`)
    .all() as { year: number; player_name: string; team: string; pos: string | null }[];
  let aaUnmatched = 0;
  for (const row of aaRows) {
    const pd = resolveByNameYearClub(row.player_name, row.year, row.team);
    if (!pd) { aaUnmatched++; continue; }
    if (row.pos === "SQUAD") pd.aaSquad++;
    else pd.aaTeam++;
  }

  // Rising Star winners
  const rsRows = db
    .prepare(`SELECT year, player_name, team FROM rising_star WHERE winner = 1`)
    .all() as { year: number; player_name: string; team: string }[];
  for (const row of rsRows) {
    const pd = resolveByNameYearClub(row.player_name, row.year, row.team);
    if (pd) pd.risingStarWin++;
  }

  // Premierships (afltables GF lineups -> exact key match)
  const gfRows = db
    .prepare(`SELECT year, team, player_name FROM gf_players WHERE premiers = 1`)
    .all() as { year: number; team: string; player_name: string }[];
  let gfUnmatched = 0;
  for (const row of gfRows) {
    const key = gfIndex.get(`${row.player_name}|${row.team}|${row.year}`);
    const pd = key ? pdByKeyDecade(key, row.year) : undefined;
    if (pd) pd.premierships++;
    else gfUnmatched++;
  }
  if (aaUnmatched || gfUnmatched) {
    console.warn(`  unmatched joins: AA ${aaUnmatched}, GF ${gfUnmatched}`);
  }

  // ---- era-relative z-scores & cohorts per decade ----
  const decades = [...new Set([...byPD.values()].map((p) => p.decade))].sort();
  const evidence = buildPositionEvidence();
  const all: PlayerDecade[] = [];

  for (const decade of decades) {
    const pool = [...byPD.values()].filter((p) => p.decade === decade);
    const minGames = minGamesForDecade(decade);
    const qualified = pool.filter((p) => p.games >= minGames);
    if (qualified.length < 30) {
      // tiny partial decades still get rated against whoever exists
      qualified.push(...pool.filter((p) => !qualified.includes(p) && p.games >= 5));
    }

    // which stats actually exist this decade
    const statMeta = new Map<Stat, { mean: number; sd: number }>();
    for (const s of STATS) {
      const vals = qualified.map((p) => p.rates[s]).filter((v): v is number => v != null);
      if (vals.length < qualified.length * 0.3) continue;
      const sum = vals.reduce((a, b) => a + b, 0);
      if (sum <= 0) continue;
      const mean = sum / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      if (sd > 0) statMeta.set(s, { mean, sd });
    }

    const z = (p: PlayerDecade, s: Stat): number | null => {
      const meta = statMeta.get(s);
      const v = p.rates[s];
      if (!meta || v == null) return null;
      return Math.max(-3, Math.min(3, (v - meta.mean) / meta.sd));
    };

    // raw positional stat scores + era coverage per position
    const rawScore = new Map<PlayerDecade, Record<Position, number>>();
    const coverage: Record<Position, number> = { DEF: 0, MID: 0, RUC: 0, FWD: 0 };
    for (const pos of POSITIONS) {
      const weights = POS_WEIGHTS[pos];
      const totalW = Object.values(weights).reduce((a, b) => a + Math.abs(b), 0);
      const availW = Object.entries(weights)
        .filter(([s]) => statMeta.has(s as Stat))
        .reduce((a, [, w]) => a + Math.abs(w), 0);
      coverage[pos] = totalW ? availW / totalW : 0;
    }
    for (const p of pool) {
      const scores = { DEF: 0, MID: 0, RUC: 0, FWD: 0 } as Record<Position, number>;
      for (const pos of POSITIONS) {
        let acc = 0, wsum = 0;
        for (const [s, w] of Object.entries(POS_WEIGHTS[pos])) {
          const zv = z(p, s as Stat);
          if (zv == null) continue;
          acc += w * zv;
          wsum += Math.abs(w);
        }
        scores[pos] = wsum > 0 ? acc / wsum : 0;
      }
      rawScore.set(p, scores);
    }

    // accolade scores (percentile inputs computed within decade)
    const votesPerGame = qualified.map((p) => p.br / Math.max(1, p.games)).sort((a, b) => a - b);
    const gamesSorted = qualified.map((p) => p.games).sort((a, b) => a - b);
    for (const p of pool) {
      const vpgPct = percentileOf(votesPerGame, p.br / Math.max(1, p.games));
      const durPct = percentileOf(gamesSorted, p.games);
      const pts =
        p.brWins * ACCOLADE_POINTS.brownlowWin +
        p.brTop10 * ACCOLADE_POINTS.brownlowTop10 +
        vpgPct * ACCOLADE_POINTS.brownlowVotesPerGamePctWeight +
        p.aaTeam * ACCOLADE_POINTS.aaSelection +
        p.aaSquad * ACCOLADE_POINTS.aaSquad +
        p.colemanTop1 * ACCOLADE_POINTS.colemanTop1 +
        p.colemanTop3 * ACCOLADE_POINTS.colemanTop3 +
        p.premierships * ACCOLADE_POINTS.premiership +
        p.risingStarWin * ACCOLADE_POINTS.risingStarWin +
        durPct * ACCOLADE_POINTS.durabilityPctWeight;
      p.accScore = Math.min(ACCOLADE_CAP, pts);
    }

    // natural position from evidence cascade, else stat archetype
    for (const p of pool) {
      const ev = evidence.get(normalizeName(p.name));
      const scores = rawScore.get(p)!;
      if (ev && ev.positions.length) {
        p.eligible = ev.positions;
        p.posSource = ev.source;
        p.natural = ev.positions.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
      } else if (coverage.MID >= 0.35) {
        const archetype = POSITIONS.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
        p.eligible = [archetype];
        p.posSource = "stats";
        p.natural = archetype;
      } else {
        // goals-only era with no recorded position: a strong goalkicker is a
        // forward; otherwise the position is genuinely unknown -> eligible
        // anywhere, no off-position penalty pretended
        const glZ = z(p, "gl");
        if (glZ != null && glZ >= 1) {
          p.eligible = ["FWD"];
          p.natural = "FWD";
        } else {
          p.eligible = [...POSITIONS];
          p.natural = POSITIONS.reduce((a, b) => (scores[a] >= scores[b] ? a : b));
        }
        p.posSource = "stats";
      }
    }

    // cohort percentiles: a player's score at position P is ranked against
    // the scores-at-P of players whose natural position is P
    const cohortSorted: Record<Position, number[]> = { DEF: [], MID: [], RUC: [], FWD: [] };
    for (const pos of POSITIONS) {
      let cohort = qualified.filter((p) => p.natural === pos);
      if (cohort.length < 25) cohort = qualified;
      cohortSorted[pos] = cohort.map((p) => rawScore.get(p)![pos]).sort((a, b) => a - b);
    }
    for (const p of pool) {
      const scores = rawScore.get(p)!;
      // small samples carry little information: shrink a player's stat
      // percentile toward the median by how far short of the games
      // qualification he falls (7 hot games shouldn't outrate 150 good ones)
      const reliability = Math.min(1, p.games / minGames) ** 0.7;
      for (const pos of POSITIONS) {
        const statPct0 = percentileOf(cohortSorted[pos], scores[pos]);
        const statPct = 0.5 + (statPct0 - 0.5) * reliability;
        // stat weight scales with how much real stat coverage this era has
        const wStat = STAT_BLEND * coverage[pos];
        const rating = 100 * wStat * statPct + (1 - wStat) * p.accScore;
        p.posRating[pos] = Math.round(Math.max(0, Math.min(100, rating)) * 10) / 10;
      }
      const strong = POSITIONS.filter((pos) => p.posRating[pos] >= VERSATILITY_THRESHOLD).length;
      const extra = Math.max(0, Math.max(strong, p.eligible.length) - 1);
      p.utlMult = Math.min(VERSATILITY_MAX_MULT, 1 + VERSATILITY_BONUS * extra);
      p.best = Math.max(...POSITIONS.map((pos) => p.posRating[pos]));
    }

    all.push(...pool);
  }

  return all;
}
