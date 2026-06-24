/**
 * Deterministic, seedable PRNG + sampling helpers for the AFL Monte-Carlo.
 *
 * Seeded from the fixture id with mulberry32 so a given fixture always produces
 * identical sims (reproducible site builds).
 */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  /** uniform [0,1) */
  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** standard normal via Box–Muller */
  normal(): number {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** non-negative gaussian draw, rounded to an integer count */
  countDraw(mean: number, cv: number): number {
    const sd = Math.max(0, mean * cv);
    return Math.max(0, Math.round(mean + sd * this.normal()));
  }
  /** lognormal multiplicative jitter with ~`pct` coefficient of variation */
  jitter(pct: number): number {
    const sigma = Math.sqrt(Math.log(1 + pct * pct));
    return Math.exp(-0.5 * sigma * sigma + sigma * this.normal());
  }
}

/** stable string hash -> 32-bit seed (so a fixture id maps to a fixed seed) */
export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Allocate `n` indivisible events across `weights` (need not be normalised).
 * Equivalent to a multinomial draw: each event takes a uniform draw mapped into
 * a player's cumulative share band, in one pass. Returns an integer count per weight.
 */
export function allocate(n: number, weights: number[], rng: Rng): number[] {
  const out = new Array(weights.length).fill(0);
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0 || n <= 0) return out;
  // cumulative bands
  const cum = new Array(weights.length);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i] > 0 ? weights[i] : 0;
    cum[i] = acc / total;
  }
  for (let e = 0; e < n; e++) {
    const u = rng.next();
    // binary search the band containing u
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (u <= cum[mid]) hi = mid; else lo = mid + 1;
    }
    out[lo]++;
  }
  return out;
}
