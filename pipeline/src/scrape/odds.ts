/**
 * AFL player-prop odds from five books → web/public/data/odds-latest.json
 *
 *   Sportsbet  public JSON, no auth   — "K+ Stat" threshold markets
 *   Dabble     public JSON, no auth   — "<Player> - <Stat> O/U (L)" markets
 *   TAB        OAuth2 (env creds)     — "K+ Disposals" / "To Kick K+ Goals" propositions
 *   Ladbrokes  public JSON, no auth   — GraphQL event list → REST event-card "To Have K+ Stat"
 *   PointsBet  public JSON, no auth   — "Player Disposals Over/Under" + "To Get/Pick Your Own" ladders
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

// True two-way over/under markets (a single main line with both Over and Under
// prices, e.g. "Lachie Neale - Disposals" Over/Under 28.5). Their own feed →
// the Over/Unders page. Sportsbet posts these now; TAB/Ladbrokes/Dabble later.
export interface OuRow { book: string; event: string; market: string; player: string; line: number; over: number; under: number; }
const ouRows: OuRow[] = [];

// Dabble Pick'em (flat-multiplier parlay) lines — not priced odds, so they go to
// their own feed; the model judges the line on the Pick'em page.
export interface PickemLine { player: string; event: string; market: string; line: number; }
// Dabble resultingType suffix (odds_on_pickem_<suffix>) → our model market key
const PICKEM_RT: Record<string, string> = {
  disposals: "disposals", goals: "goals", marks: "marks", tackles: "tackles",
  fantasy: "dreamTeamPoints", supercoach: "supercoach",
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
// two-way O/U market: "Lachie Neale - Disposals" (line in selection.unformattedHandicap)
const SB_OU = new RegExp(`^(.+?) - (${STAT_ALT})$`);

async function fetchSportsbet(): Promise<OddsRow[]> {
  const comp = await getJson<{ events?: any[] }>(
    `${SB}/Competitions/${SB_AFL}?displayType=default&eventFilter=matches`, SB_HDR);
  const events = comp?.events ?? [];
  const rows: OddsRow[] = [];
  for (const ev of events) {
    const markets = await getJson<any[]>(`${SB}/Events/${ev.id}/Markets`, SB_HDR);
    if (!Array.isArray(markets)) continue;
    for (const m of markets) {
      const name = m.name || "";
      const mm = SB_THRESHOLD.exec(name);
      if (mm) {
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
        continue;
      }
      // two-way over/under: "<Player> - <Stat>", Over/Under selections w/ a line
      const ou = SB_OU.exec(name);
      if (ou && (m.selections?.length ?? 0) === 2) {
        const market = STAT_MAP[ou[2]];
        if (!market) continue;
        let over = 0, under = 0, line = 0;
        for (const s of m.selections) {
          const p = s.price?.winPrice; const hc = Number(s.unformattedHandicap);
          if (!p) continue;
          if (/\bover$/i.test(s.name || "")) { over = p; if (hc) line = hc; }
          else if (/\bunder$/i.test(s.name || "")) { under = p; if (hc) line = hc; }
        }
        if (over && under && line) ouRows.push({
          book: "sportsbet", event: ev.name, market, player: ou[1].trim(), line, over, under,
        });
      }
    }
    await sleep(250);
  }
  console.log(`  [sportsbet] ${rows.length} rows, ${ouRows.length} O/U`);
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
// Dabble posts AFL player props three ways, all genuine fixed odds:
//   • two-way O/U  — resultingType "*_over_under"; player+stat in the MARKET name
//                    ("Jai Newcombe Over/Under Disposals"), side+line in the SELECTION
//                    ("Over 27.5"). Often unpriced shells until near game time.
//   • threshold singles — MARKET name carries stat+line ("To Have 20+ Disposals",
//                    "To Score 3+ Goals", "To Get 90+ Fantasy Points", "To Get 5+ Tackles");
//                    each SELECTION is just a player name with the over price.
//   • Anytime Goalscorer — MARKET "Anytime Goalscorer", selections = players → goals line 0.5.
// Multi-leg SGM bundles ("*_sgm"), two-player "combine"/"& " markets, and the flat-multiplier
// Pick'em product ("odds_on_pickem_*", handled below) are NOT single-player fixed odds → excluded.
const DAB_OU_TYPE = /_over_under$/i;
const DAB_MKT_OU = new RegExp(`^(.+?) Over/Under (${STAT_ALT})$`, "i");      // O/U market: player + stat
const DAB_SIDE = /\b(Over|Under)\b/i;                                        // O/U selection: side
const DAB_NUM = /([\d.]+)/;                                                  // line
const DAB_THRESH = new RegExp(`^To (?:Have|Get|Score|Kick) (\\d+)\\+ (${STAT_ALT})$`, "i"); // single ladder
const DAB_ANYTIME = /^Anytime Goal\s?scorer$/i;

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
    const rtById: Record<string, string> = {};
    for (const m of sfd.markets ?? []) rtById[m.id] = (m.resultingType || "").toLowerCase();
    const name = fixture.name || sfd.name || "";
    const [home, away] = name.includes(" v ") ? name.split(" v ", 2) : [null, null];
    const start = fixture.advertisedStart ?? null;
    const dab: OddsRow[] = [];
    for (const m of sfd.markets ?? []) {
      const rt = (m.resultingType || "").toLowerCase();
      const mname = (m.name || "").trim();
      const outs = priceByMkt[m.id] ?? [];
      // Skip multi-leg / two-player products — not single-player fixed odds.
      if (rt.endsWith("_sgm") || rt.startsWith("combine") || rt.startsWith("special") || / & | and /i.test(mname)) continue;

      // 1) two-way player Over/Under (player + stat in the market name)
      if (DAB_OU_TYPE.test(rt)) {
        const mk = DAB_MKT_OU.exec(mname);
        if (!mk) continue;
        const market = STAT_MAP[mk[2]] ?? STAT_MAP[mk[2].replace(/\b\w/g, (c) => c.toUpperCase())];
        if (!market) continue;
        const player = mk[1].trim();
        const mNum = DAB_NUM.exec(mname);
        let line: number | null = null, over: number | null = null, under: number | null = null;
        for (const [snm, price] of outs) {
          if (!price) continue;
          const side = DAB_SIDE.exec(snm || "");
          if (!side) continue;
          const num = DAB_NUM.exec(snm || "") ?? mNum;
          if (num) line = Number(num[1]);
          if (/over/i.test(side[1])) over = Number(price); else under = Number(price);
        }
        if (line == null) continue;
        if (over) dab.push({ book: "dabble", event: name, home, away, start_iso: start, market, player, line, price: over });
        if (over && under) ouRows.push({ book: "dabble", event: name, market, player, line, over, under });
        continue;
      }

      // 2) threshold singles: "To Have/Get/Score N+ <Stat>" — selections are player names
      const th = DAB_THRESH.exec(mname);
      if (th) {
        const market = STAT_MAP[th[2]] ?? STAT_MAP[th[2].replace(/\b\w/g, (c) => c.toUpperCase())];
        if (!market) continue;
        const line = Number(th[1]) - 0.5;
        for (const [snm, price] of outs) {
          if (!price || !snm || snm.includes("&")) continue;
          dab.push({ book: "dabble", event: name, home, away, start_iso: start, market, player: snm.trim(), line, price: Number(price) });
        }
        continue;
      }

      // 3) Anytime Goalscorer → goals over 0.5
      if (DAB_ANYTIME.test(mname)) {
        for (const [snm, price] of outs) {
          if (!price || !snm || snm.includes("&")) continue;
          dab.push({ book: "dabble", event: name, home, away, start_iso: start, market: "goals", player: snm.trim(), line: 0.5, price: Number(price) });
        }
      }
    }
    // Dabble lists the same player+line under several resultingTypes (e.g. "to_get_30+_disposals"
    // and "sportcast_to_get_30_plus_disposals"). Keep one row per player+market+line — best price.
    const best: Record<string, OddsRow> = {};
    for (const r of dab) {
      const k = `${r.player}|${r.market}|${r.line}`;
      if (!best[k] || r.price > best[k].price) best[k] = r;
    }
    rows.push(...Object.values(best));
    // Pick'em product: ONLY the main full-game line per player+stat. Dabble bundles
    // alt-line ("sportcast_to_get_30_plus_disposals") and period ("first_qtr"/
    // "first_half") props into playerProps too — those produced bogus lines like
    // Neale 39.5 disposals. The genuine pick'em line is resultingType
    // "odds_on_pickem_<stat>" exactly (full game), so gate on that.
    const seen = new Set<string>();
    for (const pp of sfd.playerProps ?? []) {
      const rt = rtById[pp.marketId] || "";
      const mm = /^odds_on_pickem_(disposals|goals|marks|tackles|fantasy|supercoach)$/.exec(rt);
      if (!mm || pp.value == null || !pp.playerName) continue;
      const stat = PICKEM_RT[mm[1]];
      const key = `${pp.playerName}|${stat}`;          // one main line per player+stat
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

// ───────────────────────────── PointsBet (no auth) ─────────────────────────────
// Anonymous JSON. AFL competition key from /sports/list, events from the featured
// feed, then the full book per event. PointsBet's AFL market names are idiosyncratic:
//   "Player Disposals Over/Under"  → two-way O/U ("<Player> Over 21.5" / "Under 21.5")
//   "To Get Disposals" / "To Kick Goals" / "To Get Fantasy Points"  → "<Player> N+" ladders
//   "Pick Your Own Tackles|Marks|Clearances"                        → "<Player> N+" ladders
// (the per-quarter, head-to-head, "Leading Disposals Group" etc. markets are ignored.)
const PB_V2 = "https://api.au.pointsbet.com/api/v2";
const PB_MES = "https://api.au.pointsbet.com/api/mes/v3";
const PB_HDR = { "User-Agent": "Mozilla/5.0", Accept: "application/json", Origin: "https://pointsbet.com.au" };
// stripped market name → model market key
const PB_OU = new RegExp(`^Player (${STAT_ALT}) Over/Under$`, "i");          // two-way O/U
const PB_THRESH: Record<string, string> = {                                  // "<Player> N+" ladders
  "to get disposals": "disposals", "to kick goals": "goals",
  "to get fantasy points": "dreamTeamPoints", "to get kicks": "kicks",
  "to get handballs": "handballs", "to get marks": "marks",
  "to get tackles": "tackles", "to get clearances": "totalClearances",
  "pick your own tackles": "tackles", "pick your own marks": "marks",
  "pick your own clearances": "totalClearances", "pick your own kicks": "kicks",
  "pick your own handballs": "handballs", "pick your own disposals": "disposals",
};
const PB_PLUS = /^(.+?)\s+(\d+(?:\.\d+)?)\+$/;            // "Mitch Lewis 10+"
const PB_OVU = /^(.+?)\s+(Over|Under)\s+([\d.]+)$/i;      // "Brent Daniels Over 21.5"

async function pointsbetAflKey(): Promise<string | null> {
  const d = await getJson<any>(`${PB_V2}/sports/list/`, PB_HDR);
  const sports = (d?.sports ?? d) || [];
  for (const s of sports) {
    if (/aussie rules|australian rules/i.test(String(s.name || ""))) {
      for (const c of s.competitions ?? []) {
        if (String(c.name || "").trim().toLowerCase() === "afl")
          return String(c.key ?? c.competitionKey ?? c.id);
      }
    }
  }
  return null;
}

async function fetchPointsbet(): Promise<OddsRow[]> {
  const key = await pointsbetAflKey();
  if (!key) { console.log("  [pointsbet] AFL competition not found"); return []; }
  const feat = await getJson<any>(`${PB_MES}/events/featured/competition/${key}`, PB_HDR);
  const evs = (feat?.events ?? feat) || [];
  const rows: OddsRow[] = [];
  for (const ev of evs) {
    const eid = ev.key ?? ev.eventId ?? ev.id;
    if (!eid) continue;
    const name = ev.name || `${ev.homeTeam} v ${ev.awayTeam}`;
    const home = ev.homeTeam ?? null, away = ev.awayTeam ?? null, start = ev.startsAt ?? null;
    const det = await getJson<any>(`${PB_MES}/events/${eid}`, PB_HDR);
    const markets = det?.fixedOddsMarkets ?? det?.markets ?? [];
    for (const m of markets) {
      const mname = stripTeam(m.name || "");          // drop trailing " (Home v Away)"
      const ouM = PB_OU.exec(mname);
      const threshMarket = PB_THRESH[mname.toLowerCase()];
      if (ouM) {
        const market = STAT_MAP[ouM[1]] ?? STAT_MAP[ouM[1].replace(/\b\w/g, (c) => c.toUpperCase())];
        if (!market) continue;
        const byPlayer: Record<string, { over?: number; under?: number; line?: number }> = {};
        for (const o of m.outcomes ?? []) {
          const mm = PB_OVU.exec((o.name || "").trim());
          if (!mm || !o.price) continue;
          const rec = (byPlayer[mm[1].trim()] ??= {});
          rec.line = o.points != null ? Number(o.points) : Number(mm[3]);
          if (/over/i.test(mm[2])) rec.over = Number(o.price); else rec.under = Number(o.price);
        }
        for (const [player, r] of Object.entries(byPlayer)) {
          if (r.line == null) continue;
          if (r.over) rows.push({ book: "pointsbet", event: name, home, away, start_iso: start, market, player, line: r.line, price: r.over });
          if (r.over && r.under) ouRows.push({ book: "pointsbet", event: name, market, player, line: r.line, over: r.over, under: r.under });
        }
        continue;
      }
      if (threshMarket) {
        for (const o of m.outcomes ?? []) {
          const mm = PB_PLUS.exec((o.name || "").trim());
          if (!mm || !o.price) continue;
          const n = o.points != null ? Number(o.points) : Number(mm[2]);
          rows.push({ book: "pointsbet", event: name, home, away, start_iso: start,
            market: threshMarket, player: mm[1].trim(), line: n - 0.5, price: Number(o.price) });
        }
      }
    }
    await sleep(250);
  }
  console.log(`  [pointsbet] ${evs.length} events, ${rows.length} rows`);
  return rows;
}

// ───────────────────────────── aggregate ─────────────────────────────
export async function fetchOdds() {
  const results = await Promise.allSettled([fetchSportsbet(), fetchDabble(), fetchTab(), fetchLadbrokes(), fetchPointsbet()]);
  const rows: OddsRow[] = [];
  for (const r of results) if (r.status === "fulfilled") rows.push(...r.value);
  // Dabble's genuine fixed-odds player over/under markets are included; its separate
  // Pick'em product (flat multipliers) is filtered out upstream and lives in
  // pickem-latest.json for the Pick'em page. Drop deep-longshot ladder rungs the
  // Compare page never shows (price ≤ 8).
  const kept = rows.filter((r) => r.price <= 8);
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
  // true two-way over/under markets → their own feed for the Over/Unders page
  const OU_OUT = join(dirname(OUT), "ou-latest.json");
  const ouBooks = [...new Set(ouRows.map((r) => r.book))];
  writeFileSync(OU_OUT, JSON.stringify({ generated, books: ouBooks, n: ouRows.length, rows: ouRows }));
  console.log(`Wrote ${OU_OUT}: ${ouRows.length} O/U lines from [${ouBooks.join(", ")}]`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) fetchOdds();
