/**
 * AFL player-prop odds from four books → web/public/data/odds-latest.json
 *
 *   Sportsbet  public JSON, no auth   — "K+ Stat" threshold markets
 *   Dabble     public JSON, no auth   — "<Player> - <Stat> O/U (L)" markets
 *   TAB        OAuth2 (env creds)     — "K+ Disposals" / "To Kick K+ Goals" propositions
 *   Ladbrokes  public JSON, no auth   — GraphQL event list → REST event-card "To Have K+ Stat"
 *
 * Every book normalises to one OddsRow. A row is the "over" side at a given line
 * (price = P(value > line)), so the Compare page prices it directly against the
 * model's P(value > line). TAB is skipped (logged) without creds; the feed always
 * builds with whatever is live.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "..", "web", "public", "data", "odds-latest.json");
// load pipeline/.env (git-ignored) so local runs pick up TAB creds
const ENV_FILE = join(__dirname, "..", "..", ".env");
if (existsSync(ENV_FILE) && (process as any).loadEnvFile) {
  try { (process as any).loadEnvFile(ENV_FILE); } catch { /* ignore */ }
}
const stripTeam = (s: string) => (s || "").replace(/\s*\([^)]*\)\s*$/, "").trim();

// Sportsbet/Dabble/TAB/Ladbrokes stat word → model market key
const STAT_MAP: Record<string, string> = {
  Disposals: "disposals", Disposal: "disposals", Goal: "goals", Goals: "goals",
  Kicks: "kicks", Kick: "kicks", Handballs: "handballs", Handball: "handballs",
  Marks: "marks", Mark: "marks", Tackles: "tackles", Tackle: "tackles",
  Behinds: "behinds", Behind: "behinds", Clearances: "totalClearances",
  Clearance: "totalClearances", Hitouts: "hitouts", Hitout: "hitouts",
  Fantasy: "dreamTeamPoints", "Fantasy Points": "dreamTeamPoints",
  "AFL Fantasy Points": "dreamTeamPoints", "AFL Fantasy": "dreamTeamPoints",
};
const STAT_ALT = "Disposals|Goals?|Kicks|Handballs|Marks|Tackles|Behinds|Clearances|Hitouts|Fantasy(?: Points)?";

export interface OddsRow {
  book: string; event: string; home: string; away: string; start_iso: string | null;
  market: string; player: string; line: number; price: number;
}

// Dabble Pick'em (flat-multiplier parlay) lines — not priced odds, so they go to
// their own feed; the model judges the line on the Pick'em page.
export interface PickemLine { player: string; event: string; market: string; line: number; }
const PICKEM_STAT: Record<string, string> = {
  disposals: "disposals", goals: "goals", marks: "marks", tackles: "tackles",
  kicks: "kicks", handballs: "handballs", "fantasy-points": "dreamTeamPoints",
};
const pickemLines: PickemLine[] = [];

async function getJson<T>(url: string, headers: Record<string, string>, tries = 4): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as T;
    } catch {
      await new Promise((res) => setTimeout(res, 700 * (i + 1)));
    }
  }
  return null;
}
const isoEpoch = (e?: number) => (e ? new Date(e * 1000).toISOString().replace(/\.\d+Z$/, "Z") : null);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────── Sportsbet (no auth) ─────────────────────────────
const SB = "https://www.sportsbet.com.au/apigw/sportsbook-sports/Sportsbook/Sports";
const SB_HDR = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };
const SB_AFL = 4165;
const SB_THRESHOLD = new RegExp(`^(\\d+)\\+ (${STAT_ALT})$`);

async function fetchSportsbet(): Promise<OddsRow[]> {
  const comp = await getJson<{ events?: any[] }>(
    `${SB}/Competitions/${SB_AFL}?displayType=default&eventFilter=matches`, SB_HDR);
  const events = comp?.events ?? [];
  const rows: OddsRow[] = [];
  for (const ev of events) {
    const markets = await getJson<any[]>(`${SB}/Events/${ev.id}/Markets`, SB_HDR);
    if (!Array.isArray(markets)) continue;
    for (const m of markets) {
      const mm = SB_THRESHOLD.exec(m.name || "");
      if (!mm) continue;
      const market = STAT_MAP[mm[2]];
      if (!market) continue;
      const line = Number(mm[1]) - 0.5;
      for (const s of m.selections ?? []) {
        const price = s.price?.winPrice;
        if (price && s.name) rows.push({
          book: "sportsbet", event: ev.name, home: ev.participant1, away: ev.participant2,
          start_iso: isoEpoch(ev.startTime), market, player: s.name.trim(), line, price,
        });
      }
    }
    await sleep(250);
  }
  console.log(`  [sportsbet] ${rows.length} rows`);
  return rows;
}

// ───────────────────────────── Dabble (no auth) ─────────────────────────────
const DAB = "https://api.dabble.com.au";
const DAB_HDR = {
  accept: "application/json",
  "user-agent": process.env.DABBLE_UA || "Dabble/1000041710 CFNetwork/3826.600.41.2.1 Darwin/24.6.0",
  "x-device-id": process.env.DABBLE_DEVICE_ID || "00000000-0000-0000-0000-000000000000",
  ...(process.env.DABBLE_AUTH ? { authorization: process.env.DABBLE_AUTH.startsWith("Bearer") ? process.env.DABBLE_AUTH : `Bearer ${process.env.DABBLE_AUTH}` } : {}),
};
const DAB_OU = new RegExp(`^(.+?) - (${STAT_ALT}) O/U \\(([\\d.]+)\\)$`);

async function fetchDabble(): Promise<OddsRow[]> {
  const comps = await getJson<any>(`${DAB}/competitions`, DAB_HDR);
  const list = (comps?.data ?? comps) || [];
  const afl = list.find((c: any) => String(c.name).trim() === "AFL Matches");
  if (!afl) { console.log("  [dabble] AFL Matches competition not found"); return []; }
  const fx = await getJson<any>(`${DAB}/frontend-api/competitions/${afl.id}/sport-fixtures?includeInPlay=false&exclude%5B%5D=none`, DAB_HDR);
  const fixtures = (fx?.data ?? fx) || [];
  const rows: OddsRow[] = [];
  for (const fixture of fixtures) {
    if (!fixture.id) continue;
    const detail = await getJson<any>(`${DAB}/frontend-api/sport-fixtures/details/${fixture.id}`, DAB_HDR);
    const sfd = detail?.sportFixtureDetail ?? detail?.data?.sportFixtureDetail ?? {};
    const selName: Record<string, string> = {};
    for (const s of sfd.selections ?? []) selName[s.id] = s.name || "";
    const priceByMkt: Record<string, Array<[string, number]>> = {};
    for (const p of sfd.prices ?? []) {
      (priceByMkt[p.marketId] ??= []).push([selName[p.selectionId], p.price]);
    }
    const name = fixture.name || sfd.name || "";
    const [home, away] = name.includes(" v ") ? name.split(" v ", 2) : [null, null];
    for (const m of sfd.markets ?? []) {
      // Dabble runs a Pick'em (flat multiplier) product alongside its sportsbook;
      // exclude it so only true fixed-odds lines enter the EV comparison.
      const rt = (m.resultingType || "").toLowerCase();
      if (rt.startsWith("pickem") || rt === "player_sgm") continue;
      const mm = DAB_OU.exec((m.name || "").trim());
      if (!mm) continue;
      const market = STAT_MAP[mm[2]];
      if (!market) continue;
      const line = Number(mm[3]);
      for (const [snm, price] of priceByMkt[m.id] ?? []) {
        // selection names are the full phrase, e.g. "Zac Bailey Over 22.5 Disposals"
        if (snm && /\bover\b/i.test(snm) && !/\bunder\b/i.test(snm) && price) rows.push({
          book: "dabble", event: name, home, away,
          start_iso: fixture.advertisedStart ?? null, market, player: mm[1].trim(), line, price: Number(price),
        });
      }
    }
    // Pick'em product: one line per player+stat (over/under share a value)
    const seen = new Set<string>();
    for (const pp of sfd.playerProps ?? []) {
      const stat = PICKEM_STAT[String((pp.stats ?? [])[0] ?? "").toLowerCase()];
      if (!stat || pp.value == null || !pp.playerName) continue;
      const key = `${pp.playerName}|${stat}|${pp.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pickemLines.push({ player: String(pp.playerName).trim(), event: name, market: stat, line: Number(pp.value) });
    }
    await sleep(200);
  }
  console.log(`  [dabble] ${rows.length} rows, ${pickemLines.length} pick'em lines`);
  return rows;
}

// ───────────────────────────── TAB (OAuth env) ─────────────────────────────
const TAB_BASE = "https://api.beta.tab.com.au/v1/tab-info-service";
const TAB_TOKEN_URL = "https://api.beta.tab.com.au/oauth/token";
// betOption forms: "20+ Disposals" / "To Kick 3+ Goals" / "To Kick A Goal"
const TAB_THRESH = /^(\d+)\+ (Disposals|Kicks|Handballs|Marks|Tackles|Behinds|Clearances|Hitouts)$/;
const TAB_GOALS = /^To Kick (\d+)\+ Goals$/;

async function tabToken(): Promise<string | null> {
  const id = process.env.TAB_CLIENT_ID?.trim(), sec = process.env.TAB_CLIENT_SECRET?.trim();
  if (id && sec) {
    try {
      const r = await fetch(TAB_TOKEN_URL, {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: sec }),
      });
      if (r.ok) { const j = await r.json() as any; if (j.access_token) return j.access_token; }
    } catch { /* fall through */ }
  }
  return process.env.TAB_ACCESS_TOKEN?.trim() || null;
}

async function fetchTab(): Promise<OddsRow[]> {
  const tok = await tabToken();
  if (!tok) { console.log("  [tab] no TAB_CLIENT_ID+SECRET / TAB_ACCESS_TOKEN — skipping"); return []; }
  const hdr = { Authorization: `Bearer ${tok}`, Accept: "application/json", "User-Agent": "Mozilla/5.0" };
  const d = await getJson<any>(`${TAB_BASE}/sports/AFL%20Football/competitions/AFL?jurisdiction=VIC&homeState=VIC`, hdr);
  if (!d) { console.log("  [tab] AFL competition fetch failed"); return []; }
  const rows: OddsRow[] = [];
  for (const match of d.matches ?? []) {
    const cons = match.contestants ?? [];
    const home = cons.find((c: any) => c.isHome)?.name ?? null;
    const away = cons.find((c: any) => !c.isHome)?.name ?? null;
    const name = match.name ?? `${home} v ${away}`;
    for (const mk of match.markets ?? []) {
      const bo = (mk.betOption || "").trim();
      let market: string | null = null, line = 0;
      const th = TAB_THRESH.exec(bo), gl = TAB_GOALS.exec(bo);
      if (th) { market = STAT_MAP[th[2]]; line = Number(th[1]) - 0.5; }
      else if (gl) { market = "goals"; line = Number(gl[1]) - 0.5; }
      else if (/^To Kick A Goal$/.test(bo)) { market = "goals"; line = 0.5; }
      else continue;
      if (!market) continue;
      for (const p of mk.propositions ?? []) {
        const price = p.returnWin;
        if (!price) continue;
        rows.push({ book: "tab", event: name, home, away, start_iso: match.startTime ?? null,
          market, player: stripTeam(p.name || ""), line, price: Number(price) });
      }
    }
  }
  console.log(`  [tab] ${rows.length} rows`);
  return rows;
}

// ───────────────────────────── Ladbrokes (Entain, no auth) ─────────────────────────────
// Event list comes from the GraphQL persisted query (hash may drift on a Ladbrokes
// redeploy — override with LAD_GQL_HASH); the heavy market data is stable REST.
const LAD = "https://api.ladbrokes.com.au";
const LAD_HDR = { "User-Agent": "Mozilla/5.0", Origin: "https://www.ladbrokes.com.au",
  Referer: "https://www.ladbrokes.com.au/", "Content-Type": "application/json" };
const LAD_GQL_HDR = { "User-Agent": "Mozilla/5.0", Origin: "https://www.ladbrokes.com.au",
  Referer: "https://www.ladbrokes.com.au/", "graphql-client-name": "sportsbook",
  Accept: "application/graphql-response+json, application/json" };
const LAD_GQL_HASH = process.env.LAD_GQL_HASH ||
  "3f427adebc982bfd437404d8e62e820a8b1ba217097ae9998abe316bd7244c2a";
const LAD_HAVE = /^To Have (\d+)\+ (Disposals|Kicks|Handballs|Marks|Tackles|Behinds|Clearances|Hitouts|AFL Fantasy Points)$/;
const LAD_GOAL = /^Player Goals - To Kick (\d+)\+ Goals$/;

function ladDecimal(p: any): number | null {
  const o = p?.odds || {};
  if (o.decimal) return Math.round(Number(o.decimal) * 100) / 100;
  if (o.numerator && o.denominator) return Math.round((o.numerator / o.denominator + 1) * 100) / 100;
  return null;
}

async function ladEvents(): Promise<Array<{ id: string; name: string; start: string | null }>> {
  const variables = {
    category: "AUSTRALIAN_RULES", regionSlug: "", competitionSlug: "afl",
    statuses: ["OPEN", "LIVE"], excludeCategoryIds: [], includeLeagues: false,
    includeUpcomingEvents: true, upcomingEventsGroupBy: "UNSPECIFIED",
    includeFutures: false, futuresGroupBy: "UNSPECIFIED",
  };
  const url = `${LAD}/gql/router?variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&operationName=SportingCompetitionScreen` +
    `&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: LAD_GQL_HASH } }))}`;
  const d = await getJson<any>(url, LAD_GQL_HDR);
  const nodes = d?.data?.upcomingEvents?.events?.nodes ?? [];
  return nodes
    .filter((n: any) => / vs /i.test(n.name || ""))
    .map((n: any) => ({ id: String(n.id).replace("SportingEvent:", ""), name: n.name, start: n.advertisedStart ?? null }));
}

async function fetchLadbrokes(): Promise<OddsRow[]> {
  const events = await ladEvents();
  if (!events.length) { console.log("  [ladbrokes] no events (GraphQL hash may have drifted — set LAD_GQL_HASH)"); return []; }
  const rows: OddsRow[] = [];
  for (const ev of events) {
    const [home, away] = ev.name.split(/ vs /i, 2);
    const card = await getJson<any>(`${LAD}/v2/sport/event-card?id=${ev.id}`, LAD_HDR);
    if (!card) continue;
    const entrants = card.entrants || {}, prices = card.prices || {};
    const priceOf = (entId: string) => {
      for (const [k, v] of Object.entries<any>(prices)) if (k.startsWith(entId + ":")) return ladDecimal(v);
      return null;
    };
    for (const market of Object.values<any>(card.markets || {})) {
      const nm = market.name || "";
      let market_key: string | null = null, line = 0;
      const hv = LAD_HAVE.exec(nm), gl = LAD_GOAL.exec(nm);
      if (hv) { market_key = STAT_MAP[hv[2]]; line = Number(hv[1]) - 0.5; }
      else if (gl) { market_key = "goals"; line = Number(gl[1]) - 0.5; }
      else if (nm === "Player Goals - Anytime Goal Kicker") { market_key = "goals"; line = 0.5; }
      else continue;
      if (!market_key) continue;
      for (const e of Object.values<any>(entrants).filter((e) => e.market_id === market.id)) {
        const price = priceOf(e.id);
        if (price) rows.push({ book: "ladbrokes", event: ev.name, home, away,
          start_iso: ev.start, market: market_key, player: stripTeam(e.name || ""), line, price });
      }
    }
    await sleep(250);
  }
  console.log(`  [ladbrokes] ${rows.length} rows`);
  return rows;
}

// ───────────────────────────── aggregate ─────────────────────────────
export async function fetchOdds() {
  const results = await Promise.allSettled([fetchSportsbet(), fetchDabble(), fetchTab(), fetchLadbrokes()]);
  const rows: OddsRow[] = [];
  for (const r of results) if (r.status === "fulfilled") rows.push(...r.value);
  // Dabble's two-way "O/U" markets are its Pick'em product (flat ~1.85 prices),
  // not competitive fixed odds — keep them out of the odds feed (they live in
  // pickem-latest.json for the Pick'em page). Only real bookmaker prices here.
  // Also drop deep-longshot ladder rungs the Compare page never shows (price ≤ 8).
  const kept = rows.filter((r) => r.price <= 8 && r.book !== "dabble");
  const books = [...new Set(kept.map((r) => r.book))];
  const generated = new Date().toISOString();
  const out = { generated, books, n_rows: kept.length, rows: kept };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT}: ${kept.length} rows from ${books.length} book(s) [${books.join(", ")}]`);
  // Dabble Pick'em lines → their own feed for the Pick'em page
  const PICKEM_OUT = join(dirname(OUT), "pickem-latest.json");
  writeFileSync(PICKEM_OUT, JSON.stringify({ generated, n: pickemLines.length, lines: pickemLines }));
  console.log(`Wrote ${PICKEM_OUT}: ${pickemLines.length} pick'em lines`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) fetchOdds();
