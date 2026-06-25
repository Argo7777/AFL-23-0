/**
 * AFL SuperCoach player data → web/public/data/supercoach-latest.json
 *
 * SuperCoach is News Corp / Champion Data's salary-cap fantasy game. Its public
 * JSON API (no auth) exposes every player's price, scoring averages, projection,
 * ownership, position(s), availability, news and matchup context. We pull the
 * current round's snapshot plus a per-round score series (for std / sparklines),
 * and emit one tidy feed the site joins onto the model by player name.
 *
 * Source: https://www.supercoach.com.au/2026/api/afl/classic/v1/...   (anonymous)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "..", "web", "public", "data", "supercoach-latest.json");

const YEAR = new Date().getFullYear();
const BASE = `https://www.supercoach.com.au/${YEAR}/api/afl/classic/v1`;
const HDR = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  Accept: "application/json",
};

async function getJson<T>(url: string, tries = 4): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: HDR });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as T;
    } catch {
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
  return null;
}
const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);
const round1 = (v: number) => Math.round(v * 10) / 10;

// Stats the AFL model projects that also drive SuperCoach scoring. We fit
// SC_avg ≈ Σ w·(per-game stat) so the site can turn the model's stat projections
// into a SuperCoach score (R²≈0.9), instead of a cruder Fantasy→SC proxy.
const FIT_STATS = ["kicks", "handballs", "marks", "tackles", "goals", "behinds", "hitouts"] as const;

/** Ordinary least squares via the normal equations (Gaussian elimination). */
function ols(X: number[][], y: number[]): number[] {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let r = 0; r < X.length; r++) {
    for (let i = 0; i < k; i++) {
      b[i] += X[r][i] * y[r];
      for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j];
    }
  }
  for (let i = 0; i < k; i++) {            // forward elimination w/ partial pivot
    let p = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < k; r++) {
      const f = A[r][i] / A[i][i];
      for (let j = i; j < k; j++) A[r][j] -= f * A[i][j];
      b[r] -= f * b[i];
    }
  }
  const w = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < k; j++) s -= A[i][j] * w[j];
    w[i] = s / A[i][i];
  }
  return w;
}

interface ScPlayer {
  id: number; name: string; first: string; last: string;
  team: string; teamAbbr: string;
  positions: string[]; dpp: boolean;
  price: number; priceChange: number; totalPriceChange: number;
  avg: number; avg3: number; avg5: number; proj: number;
  games: number; totalPoints: number; std: number; consistency: number;
  scores: Array<{ round: number; pts: number }>;
  owned: number; ppm: number;
  status: string; statusText: string | null; note: string | null; noteDate: string | null;
  opp: string | null; oppHome: boolean; oppAvg: number;
  ven: string | null; venAvg: number;
  next: Array<{ opp: string; home: boolean }>;
}

export async function fetchSuperCoach() {
  // 1) rounds. `completed` = last round scored; `upcoming` = the round we project.
  //    Snapshot the upcoming round so price/projection/opponent are forward-looking;
  //    the score series covers completed rounds only.
  const settings = await getJson<any>(`${BASE}/settings?min=false`);
  const completed = num(settings?.competition?.current_round);
  const round = num(settings?.competition?.next_round) || completed + 1;

  // 2) full player snapshot for the upcoming round (stats + positions + news + odds)
  const embed = encodeURIComponent("positions,player_stats,notes,odds");
  const raw = await getJson<any[]>(`${BASE}/players-cf?embed=${embed}&round=${round}`);
  if (!raw?.length) {
    console.error("[supercoach] no players returned — aborting (feed left unchanged)");
    process.exit(1);
  }

  // 3) per-round score series → std / consistency / sparkline. Each round's
  //    player_match_stats carries that round's `points`; iterate and collect.
  const series = new Map<number, Array<{ round: number; pts: number }>>();
  for (let rd = 1; rd <= completed; rd++) {
    const rows = await getJson<any[]>(`${BASE}/players-cf?embed=player_match_stats&round=${rd}`);
    if (!rows) continue;
    for (const p of rows) {
      const ms = (p.player_match_stats || [])[0];
      if (!ms || num(ms.games) < 1) continue;            // only count games actually played
      const arr = series.get(p.id) ?? [];
      arr.push({ round: rd, pts: num(ms.points) });
      series.set(p.id, arr);
    }
    await new Promise((res) => setTimeout(res, 120));
  }

  const players: ScPlayer[] = [];
  const fitX: number[][] = [], fitY: number[] = [];   // for the SC-from-stats fit
  for (const p of raw) {
    const ps = (p.player_stats || [])[0] || {};
    const g = num(ps.total_games);
    if (g >= 4 && num(ps.avg) > 20) {
      fitX.push([...FIT_STATS.map((k) => num(ps[`total_${k}`]) / g), 1]);
      fitY.push(num(ps.avg));
    }
    const scores = (series.get(p.id) ?? []).sort((a, b) => a.round - b.round);
    const vals = scores.map((s) => s.pts);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : num(ps.avg);
    const std = vals.length > 1
      ? Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1))
      : 0;
    const positions: string[] = (p.positions || []).map((x: any) => x.position).filter(Boolean);
    const note = (p.notes || [])[0] || null;
    const oppAbbr = ps.opp?.abbrev ?? null;
    const venName = ps.ven?.display_name ?? ps.ven?.short_name ?? ps.ven?.name ?? null;
    const next = [
      [ps.opp1?.abbrev, ps.opp1h], [ps.opp2?.abbrev, ps.opp2h], [ps.opp3?.abbrev, ps.opp3h],
    ].filter(([a]) => a).map(([abbrev, h]) => ({ opp: String(abbrev), home: !!num(h) }));

    players.push({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      first: p.first_name, last: p.last_name,
      team: p.team?.name ?? "", teamAbbr: p.team?.abbrev ?? "",
      positions, dpp: positions.length > 1,
      price: num(ps.price),
      priceChange: num(ps.price_change),
      totalPriceChange: num(ps.total_price_change),
      avg: round1(num(ps.avg)),
      avg3: round1(num(ps.avg3)),
      avg5: round1(num(ps.avg5)),
      // `ppts1` is SuperCoach's next-round projection (tracks form, corr≈0.86 with
      // avg). `ppts` is a different, erratic figure (often inflated or ~0) — do NOT
      // use it. Fall back to the season average when no projection is posted.
      proj: round1(num(ps.ppts1) || num(ps.avg)),
      games: num(ps.total_games),
      totalPoints: num(ps.total_points),
      std: round1(std),
      consistency: mean > 0 ? round1(100 * (1 - std / mean)) : 0,   // 100 = metronomic
      scores,
      owned: round1(num(ps.owned)),
      ppm: round1(num(ps.total_points_per_min)),
      status: p.played_status?.status ?? "",
      statusText: p.injury_suspension_status_text ?? null,
      note: note?.note ?? null,
      noteDate: note?.created_on ?? null,
      opp: oppAbbr, oppHome: !!num(ps.opph), oppAvg: round1(num(ps.oppavg)),
      ven: venName, venAvg: round1(num(ps.venavg)),
      next,
    });
  }

  // value = projected points per $100k. Only meaningful for priced, playing types.
  players.sort((a, b) => b.avg - a.avg);

  // Fit SuperCoach score from the stats the AFL model projects, so the site can
  // turn model stat projections into a modelled SuperCoach score.
  const w = ols(fitX, fitY);
  const yMean = fitY.reduce((a, b) => a + b, 0) / fitY.length;
  const ssTot = fitY.reduce((a, b) => a + (b - yMean) ** 2, 0);
  const ssRes = fitX.reduce((a, row, i) => a + (fitY[i] - row.reduce((s, v, j) => s + v * w[j], 0)) ** 2, 0);
  const model_fit = {
    stats: [...FIT_STATS] as string[],
    weights: Object.fromEntries(FIT_STATS.map((k, i) => [k, round1(w[i])])) as Record<string, number>,
    intercept: round1(w[FIT_STATS.length]),
    r2: round1(1 - ssRes / ssTot) / 1,
    n: fitY.length,
  };

  const out = {
    generated: new Date().toISOString(),
    season: YEAR,
    round,
    n_players: players.length,
    model_fit,
    players,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT}: ${players.length} players, round ${round}, ${series.size} w/ history; SC-from-stats R²=${model_fit.r2}`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) fetchSuperCoach();
