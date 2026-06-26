/** Client-side types + helpers for the SuperCoach feed (supercoach-latest.json). */
import { BASE_PATH } from "@/lib/game/data";
import { playerKey } from "@/lib/modeldb";

export interface ScPlayer {
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
/** Fitted SuperCoach-from-stats model: SC ≈ intercept + Σ weights[stat]·(per-game stat). */
export interface ScModelFit {
  stats: string[]; weights: Record<string, number>; intercept: number; r2: number; n: number;
}
export interface ScFeed {
  generated: string; season: number; round: number; n_players: number;
  model_fit?: ScModelFit; players: ScPlayer[];
}

/** Turn a set of projected per-game stats into a modelled SuperCoach score. */
export function modelScFromStats(fit: ScModelFit, stats: Record<string, number>): number {
  let v = fit.intercept;
  for (const k of fit.stats) v += (fit.weights[k] ?? 0) * (stats[k] ?? 0);
  return v;
}

export async function loadSuperCoach(): Promise<ScFeed | null> {
  try {
    const r = await fetch(`${BASE_PATH}/data/supercoach-latest.json`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

/** SuperCoach position groups, in display order, with a colour token. */
export const SC_POSITIONS: Array<{ code: string; label: string; cls: string }> = [
  { code: "DEF", label: "Defender", cls: "text-ice" },
  { code: "MID", label: "Midfielder", cls: "text-grass" },
  { code: "RUC", label: "Ruck", cls: "text-gold" },
  { code: "FWD", label: "Forward", cls: "text-hot" },
];
export const posClass = (code: string) => SC_POSITIONS.find((p) => p.code === code)?.cls ?? "text-slate-300";

/** Money helpers — SuperCoach prices are whole dollars (e.g. 561100). */
export const money = (v: number) => "$" + Math.round(v).toLocaleString();
export const moneyK = (v: number) => "$" + Math.round(v / 1000) + "k";
export const signed = (v: number) => (v > 0 ? "+" : "") + Math.round(v).toLocaleString();

/** Projected points per $100k of price — the core value metric. */
export const valuePer100k = (p: ScPlayer): number =>
  p.price > 0 ? (p.proj || p.avg) / (p.price / 100_000) : 0;

/** Recent-form delta: last-3 average vs season average (+ = heating up). */
export const formDelta = (p: ScPlayer): number => (p.avg3 && p.avg ? p.avg3 - p.avg : 0);

/** A player is "playing" if not flagged out/omitted and has a price. */
export const isPlaying = (p: ScPlayer): boolean =>
  p.price > 0 && p.status !== "out" && p.status !== "did-not-play";

/** Availability badge from played_status / injury text. */
export function availability(p: ScPlayer): { label: string; cls: string } | null {
  const t = (p.statusText || "").toLowerCase();
  if (t.includes("out") || p.status === "out") return { label: "OUT", cls: "bg-hot/20 text-hot" };
  if (t.includes("test") || t.includes("doubt") || t.includes("quest")) return { label: "TEST", cls: "bg-gold/20 text-gold" };
  if (t.includes("susp")) return { label: "SUSP", cls: "bg-hot/20 text-hot" };
  if (p.statusText) return { label: "NEWS", cls: "bg-ice/20 text-ice" };
  return null;
}

/** Standard-normal CDF (Abramowitz–Stegun 7.1.26) → P(Z ≤ x). */
export function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x >= mean ? 1 : 0;
  const z = (x - mean) / (sd * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  const erf = z >= 0 ? y : -y;
  return 0.5 * (1 + erf);
}

/**
 * P(SuperCoach score > line) for a player. SC doesn't publish a distribution, so
 * we model it as Normal(mean = projection, sd = the player's own game-to-game
 * std, falling back to ~28% of the mean — typical SC scoring spread).
 *
 * `meanOverride` swaps in a different projection (e.g. our stats-fitted model's
 * SC score) while keeping the player's own scoring spread.
 */
export function probScOver(p: ScPlayer, line: number, meanOverride?: number): number {
  const mean = meanOverride ?? (p.proj || p.avg3 || p.avg);
  if (!mean) return 0;
  const sd = p.std > 3 ? p.std : Math.max(10, 0.28 * mean);
  return 1 - normalCdf(line, mean, sd);
}

/** Build a fast lookup from the model's player-key → SuperCoach player. */
export function scIndex(feed: ScFeed | null): Map<string, ScPlayer> {
  const m = new Map<string, ScPlayer>();
  if (!feed) return m;
  for (const p of feed.players) {
    const k = playerKey(p.name);
    if (!m.has(k)) m.set(k, p);   // first (highest-avg, feed is pre-sorted) wins on collision
  }
  return m;
}
