import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../lib/db.js";

/**
 * AFLW ingest from the official AFL API (the public feed the AFL site itself
 * uses). Two surfaces:
 *   - api.afl.com.au/cfs/afl/WMCTok  → short-lived auth token (POST)
 *   - aflapi.afl.com.au/afl/v2/...   → competitions / compseasons / matches
 *
 * Only factual data (scores, ladders, fixtures) is stored — the same class of
 * public sporting fact the rest of the pipeline derives from afltables.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, "..", "..", "cache", "aflapi");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const AFLW_COMP_ID = 3; // numeric id in aflapi v2 (providerId CD_C264)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let token: string | null = null;
async function getToken(): Promise<string> {
  if (token) return token;
  // undici auto-sets Content-Length from the body; setting it manually is a
  // forbidden-header error (UND_ERR_INVALID_ARG). A single space body keeps
  // Akamai's "411 length required" check happy.
  const res = await fetch("https://api.afl.com.au/cfs/afl/WMCTok", {
    method: "POST",
    headers: { "User-Agent": UA },
    body: " ",
  });
  const j = (await res.json()) as { token: string };
  token = j.token;
  return token;
}

function cachePath(url: string): string {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 10);
  return join(CACHE_DIR, `${hash}.json`);
}

/** Cached, throttled GET against the AFL API. `force` re-fetches (current season). */
async function apiGet<T>(url: string, force = false): Promise<T> {
  const file = cachePath(url);
  if (!force && existsSync(file)) return JSON.parse(readFileSync(file, "utf-8"));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const tok = await getToken();
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "x-media-mis-token": tok,
          Origin: "https://www.afl.com.au",
          Referer: "https://www.afl.com.au/",
          Accept: "application/json",
        },
      });
      if (res.status === 401 || res.status === 403) {
        token = null; // refresh token and retry
        throw new Error(`auth ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.text();
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, body);
      await sleep(500);
      return JSON.parse(body);
    } catch (err) {
      lastErr = err;
      await sleep(1200 * attempt);
    }
  }
  throw new Error(`AFL API failed after retries: ${url}: ${lastErr}`);
}

// ---- AFLW team name → canonical club identity (matches AFL club slugs/colours) ----
const AFLW_CLUB: Record<string, string> = {
  "Adelaide Crows": "Adelaide",
  "Brisbane Lions": "Brisbane Lions",
  Carlton: "Carlton",
  Collingwood: "Collingwood",
  Essendon: "Essendon",
  Fremantle: "Fremantle",
  "GWS GIANTS": "Greater Western Sydney",
  "Geelong Cats": "Geelong",
  "Gold Coast SUNS": "Gold Coast",
  Hawthorn: "Hawthorn",
  Melbourne: "Melbourne",
  "North Melbourne Kangaroos": "North Melbourne",
  "Port Adelaide": "Port Adelaide",
  Richmond: "Richmond",
  "St Kilda": "St Kilda",
  "Sydney Swans": "Sydney",
  "West Coast Eagles": "West Coast",
  "Western Bulldogs": "Western Bulldogs",
};
function canonAflw(name: string): string {
  return AFLW_CLUB[name?.trim()] ?? name?.trim() ?? "";
}

// round.abbreviation → our code. "Rd 7" → "R7"; finals mapped to EF/SF/PF/GF.
function roundCode(abbr: string, name: string, roundNumber: number): string {
  const m = /^Rd\s*(\d+)$/i.exec(abbr ?? "");
  if (m) return `R${m[1]}`;
  const a = (abbr ?? "").toUpperCase();
  if (a === "GF" || /grand final/i.test(name)) return "GF";
  if (a === "PF" || /prelim/i.test(name)) return "PF";
  if (a === "SF" || /semi/i.test(name)) return "SF";
  // "Finals Week 1" / elimination / qualifying → elimination-week bucket
  if (/^FW/i.test(a) || /week 1|elimination|qualifying/i.test(name)) return "EF";
  // fallback: treat as H&A round by number, else a generic final
  return roundNumber > 0 && roundNumber <= 14 ? `R${roundNumber}` : "EF";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** ISO UTC → "8-Nov-2025" in Melbourne local time. */
function melbourneDate(utc: string): string {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    day: "numeric", month: "2-digit", year: "numeric",
  }).formatToParts(new Date(utc));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const d = Number(get("day")), mo = Number(get("month")), y = get("year");
  return `${d}-${MONTHS[mo - 1]}-${y}`;
}

interface CompSeason { id: number; providerId: string; name: string; }
interface ApiMatch {
  id: string; providerId: string;
  round: { abbreviation: string; name: string; roundNumber: number };
  home: { team: { name: string }; score?: { totalScore: number } };
  away: { team: { name: string }; score?: { totalScore: number } };
  venue?: { name: string };
  utcStartTime: string;
  status: string;
}

async function compSeasons(force: boolean): Promise<CompSeason[]> {
  const j = await apiGet<{ compSeasons: CompSeason[] }>(
    `https://aflapi.afl.com.au/afl/v2/competitions/${AFLW_COMP_ID}/compseasons?pageSize=100`,
    force,
  );
  return j.compSeasons ?? [];
}

async function seasonMatches(compSeasonId: number, force: boolean): Promise<ApiMatch[]> {
  const out: ApiMatch[] = [];
  for (let page = 0; page < 10; page++) {
    const j = await apiGet<{ matches: ApiMatch[]; meta: { pagination: { numPages: number } } }>(
      `https://aflapi.afl.com.au/afl/v2/matches?compSeasonId=${compSeasonId}&pageSize=200&page=${page}`,
      force,
    );
    out.push(...(j.matches ?? []));
    if (page >= (j.meta?.pagination?.numPages ?? 1) - 1) break;
  }
  return out;
}

/** Year from the season NAME ("2025 NAB AFLW Season" → 2025). The providerId is
 *  unreliable (S7's is CD_S2101264). */
function yearFromSeason(s: CompSeason): number {
  const m = /(\d{4})/.exec(s.name);
  return m ? Number(m[1]) : 0;
}
/** "Season 7" suffix, if the name carries one (only the 2022 doubleheader does). */
function seasonNum(s: CompSeason): number | null {
  const m = /Season\s+(\d+)/i.exec(s.name);
  return m ? Number(m[1]) : null;
}

/**
 * Scrape every AFLW season's fixtures/results into `aflw_matches`.
 * `force` re-fetches the latest two seasons (live updates).
 */
export async function scrapeAflw(force = false): Promise<void> {
  const seasons = await compSeasons(force);
  console.log(`AFLW: ${seasons.length} comp seasons`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO aflw_matches
      (match_id, season_key, label, date, year, round, team1, score1, team2, score2, venue)
    VALUES (@match_id, @season_key, @label, @date, @year, @round, @team1, @score1, @team2, @score2, @venue)
  `);
  const insertMany = db.transaction((rows: Record<string, unknown>[]) => {
    for (const r of rows) insert.run(r);
  });

  // disambiguate the 2022 doubleheader (S6 + S7 are both calendar 2022)
  const perYear = new Map<number, number>();
  for (const s of seasons) {
    const y = yearFromSeason(s);
    if (y) perYear.set(y, (perYear.get(y) ?? 0) + 1);
  }
  const keyOf = (s: CompSeason) => {
    const y = yearFromSeason(s);
    const n = seasonNum(s);
    return perYear.get(y)! > 1 && n != null ? { key: `${y}-s${n}`, label: `${y} S${n}` }
      : { key: `${y}`, label: `${y}` };
  };

  // newest two seasons are "live" → force refresh; older ones are cache-stable
  const sorted = [...seasons].sort((a, b) => yearFromSeason(b) - yearFromSeason(a));

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const year = yearFromSeason(s);
    if (!year) continue;
    const { key, label } = keyOf(s);
    const liveSeason = force && i < 2;
    const matches = await seasonMatches(s.id, liveSeason);
    const rows = matches
      .filter((m) => m.status === "CONCLUDED" && m.home?.score && m.away?.score)
      .map((m) => ({
        match_id: m.providerId || m.id,
        season_key: key,
        label,
        date: melbourneDate(m.utcStartTime),
        year,
        round: roundCode(m.round?.abbreviation, m.round?.name, m.round?.roundNumber),
        team1: canonAflw(m.home.team.name),
        score1: m.home.score!.totalScore,
        team2: canonAflw(m.away.team.name),
        score2: m.away.score!.totalScore,
        venue: m.venue?.name ?? "",
      }));
    insertMany(rows);
    console.log(`  ${label}: ${rows.length} completed matches`);
  }

  const total = (db.prepare(`SELECT COUNT(*) n FROM aflw_matches`).get() as { n: number }).n;
  console.log(`AFLW: ${total} matches stored`);
}

interface MatchPlayerStat {
  player: { player: { position: string; player: { playerId: string; playerName: { givenName: string; surname: string } } } };
  teamId: string;
  playerStats: { stats: Record<string, number | null | { totalClearances?: number }> };
}

/**
 * Per-match AFLW player stats (the season-aggregate stats endpoint isn't
 * comp-scoped, so we aggregate match by match — fitzRoy does the same).
 * Stores one row per (match, player) in aflw_player_games.
 */
export async function scrapeAflwPlayers(force = false): Promise<void> {
  const matches = db
    .prepare(`SELECT match_id, season_key, year, team1, team2 FROM aflw_matches ORDER BY year, rowid`)
    .all() as { match_id: string; season_key: string; year: number; team1: string; team2: string }[];
  console.log(`AFLW players: ${matches.length} matches to read`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO aflw_player_games
      (match_id, season_key, year, player_id, name, team, position,
       gl, kk, hb, di, mk, tk, cp, i5, mi5, cm, ho, op, cl, r5, ic, ga, mg, rp)
    VALUES (@match_id, @season_key, @year, @player_id, @name, @team, @position,
       @gl, @kk, @hb, @di, @mk, @tk, @cp, @i5, @mi5, @cm, @ho, @op, @cl, @r5, @ic, @ga, @mg, @rp)
  `);
  const insertMany = db.transaction((rows: Record<string, unknown>[]) => {
    for (const r of rows) insert.run(r);
  });

  const num = (v: number | null | undefined) => (typeof v === "number" ? v : 0);
  let done = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    // current-year matches refresh; older are cache-stable
    const live = force && m.year >= new Date().getFullYear() - 1;
    let data: { homeTeamPlayerStats?: MatchPlayerStat[]; awayTeamPlayerStats?: MatchPlayerStat[] };
    try {
      data = await apiGet(`https://api.afl.com.au/cfs/afl/playerStats/match/${m.match_id}`, live);
    } catch {
      continue; // skip a match that won't load rather than abort the run
    }
    const rows: Record<string, unknown>[] = [];
    const take = (list: MatchPlayerStat[] | undefined, team: string) => {
      for (const ps of list ?? []) {
        const p = ps.player.player;
        const s = ps.playerStats.stats;
        const cl = s.clearances as { totalClearances?: number } | null;
        rows.push({
          match_id: m.match_id, season_key: m.season_key, year: m.year,
          player_id: p.player.playerId,
          name: `${p.player.playerName.givenName} ${p.player.playerName.surname}`.trim(),
          team, position: p.position ?? null,
          gl: num(s.goals as number), kk: num(s.kicks as number), hb: num(s.handballs as number),
          di: num(s.disposals as number), mk: num(s.marks as number), tk: num(s.tackles as number),
          cp: num(s.contestedPossessions as number), i5: num(s.inside50s as number),
          mi5: num(s.marksInside50 as number), cm: num(s.contestedMarks as number),
          ho: num(s.hitouts as number), op: num(s.onePercenters as number),
          cl: num(cl?.totalClearances), r5: num(s.rebound50s as number),
          ic: num(s.intercepts as number), ga: num(s.goalAssists as number),
          mg: num(s.metresGained as number), rp: num(s.ratingPoints as number),
        });
      }
    };
    take(data.homeTeamPlayerStats, m.team1);
    take(data.awayTeamPlayerStats, m.team2);
    insertMany(rows);
    done++;
    if (done % 100 === 0) console.log(`  …${done}/${matches.length} matches`);
  }
  const n = (db.prepare(`SELECT COUNT(DISTINCT player_id) n FROM aflw_player_games`).get() as { n: number }).n;
  console.log(`AFLW players: ${done} matches read, ${n} distinct players`);
}
