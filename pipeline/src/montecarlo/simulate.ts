/**
 * AFL match Monte-Carlo.
 *
 * Per sim, per team:
 *   1. draw the team total for each stat around its model expectation
 *      (totals are a function of score + noise);
 *   2. allocate each unit of that total to a player by their share band,
 *      jittered per-sim by the empirical dispersion (cumulative share ranges);
 *   3. disposals = kicks + handballs (hard identity); dreamTeamPoints composed
 *      from the allocated components.
 * Team points (6·goals + behinds) give the match result distribution.
 *
 * A light calibration pass first corrects each player's allocation weight so
 * the simulated mean matches the model expectation.
 */
import { Rng, hashSeed, allocate } from "./rng.js";
import {
  ALLOC_STATS, TARGETS, AllocStat, Target,
  MatchProj, TeamProj, DispersionEntry, StatDist, PlayerProjection, MatchProjection,
} from "./types.js";

/** fallback team-total CVs; superseded by dispersion[stat].team_cv when the
 *  Python artifact carries the empirically calibrated value */
const TEAM_CV: Record<AllocStat, number> = {
  kicks: 0.09, handballs: 0.11, marks: 0.12, tackles: 0.13,
  totalClearances: 0.15, hitouts: 0.12, goals: 0.20, behinds: 0.20,
};
const FANTASY: Partial<Record<AllocStat, number>> = {
  kicks: 3, handballs: 2, marks: 3, tackles: 4, hitouts: 1, goals: 6, behinds: 1,
};
const HALF_LINES_CAP_SD = 3.2;
const CAL_SIMS = 1200; // calibration batch size
// Baseline per-game "form" multiplier on a player's allocation weight. The
// multinomial allocation supplies mean-scaled spread already; the variance
// calibration pass then widens each player individually until the simulated
// sd matches the Python model's per-player sigma target (when provided).
const FORM_CV = 0.1;
const MAX_JITTER_CV = 1.0;
// Period thinning for Q1 / 1st-half disposal markets: each simulated disposal
// lands in Q1 with p=F_Q1 and in the first half with p=F_H1 (nested draws, so
// Q1 ⊆ H1 by construction). Fractions are the market-implied medians from
// Dabble's own posted lines (Q1/full ≈ 0.244, H1/full ≈ 0.491) — i.e. play is
// near-uniform across quarters with a slight first-quarter discount.
const F_Q1 = 0.245;
const F_H1 = 0.49;

type Counts = Record<AllocStat, number[]>;

/** per-side calibration state: mean corrections + per-player jitter CVs */
interface Calib {
  corr: Record<AllocStat, number[]>;
  jcv: Record<AllocStat, number[]>;
}

function teamCv(stat: AllocStat, dispersion: Record<Target, DispersionEntry>): number {
  const cv = dispersion[stat]?.team_cv;
  return cv && cv > 0 ? cv : TEAM_CV[stat];
}

/** one simulated team-game: per-player allocated counts + team goals/behinds */
function simSide(
  team: TeamProj, dispersion: Record<Target, DispersionEntry>,
  rng: Rng, cal: Calib,
): { counts: Counts; goals: number; behinds: number } {
  const counts = {} as Counts;
  for (const stat of ALLOC_STATS) {
    const N = rng.countDraw(team.team_total[stat] || 0, teamCv(stat, dispersion));
    const weights = team.players.map(
      (p, i) => Math.max(0, p.share[stat]) * cal.corr[stat][i] * rng.jitter(cal.jcv[stat][i]),
    );
    counts[stat] = allocate(N, weights, rng);
  }
  const goals = counts.goals.reduce((a, b) => a + b, 0);
  const behinds = counts.behinds.reduce((a, b) => a + b, 0);
  return { counts, goals, behinds };
}

/** unit calibration (no-op corrections, baseline jitter) */
function unitCalib(team: TeamProj): Calib {
  const corr = {} as Record<AllocStat, number[]>;
  const jcv = {} as Record<AllocStat, number[]>;
  for (const s of ALLOC_STATS) {
    corr[s] = team.players.map(() => 1);
    jcv[s] = team.players.map(() => FORM_CV);
  }
  return { corr, jcv };
}

/** Two-pass calibration.
 *  Pass 1: correct each player's allocation weight so simulated mean ≈ model
 *  expectation. Pass 2: measure the simulated per-player sd under those
 *  corrections and, where the Python artifact supplies a per-player sigma
 *  target, widen that player's form jitter until sim sd ≈ sigma. (Jitter is
 *  mean-one lognormal, so pass-2 widening leaves pass-1 means intact. If the
 *  natural sim spread already exceeds the target we can't shrink — keep base.) */
function calibrate(
  team: TeamProj, dispersion: Record<Target, DispersionEntry>, rng: Rng,
): Calib {
  const cal = unitCalib(team);
  const nP = team.players.length;

  // pass 1: means
  const sums = {} as Record<AllocStat, number[]>;
  for (const s of ALLOC_STATS) sums[s] = team.players.map(() => 0);
  for (let i = 0; i < CAL_SIMS; i++) {
    const { counts } = simSide(team, dispersion, rng, cal);
    for (const s of ALLOC_STATS)
      for (let p = 0; p < nP; p++) sums[s][p] += counts[s][p];
  }
  for (const s of ALLOC_STATS) {
    for (let p = 0; p < nP; p++) {
      const simMean = sums[s][p] / CAL_SIMS;
      const want = team.players[p].exp[s] ?? 0;
      cal.corr[s][p] = simMean > 1e-6 ? clamp(want / simMean, 0.4, 2.5) : 1;
    }
  }

  // pass 2: variance, under the corrected means
  const s1 = {} as Record<AllocStat, number[]>;
  const s2 = {} as Record<AllocStat, number[]>;
  for (const s of ALLOC_STATS) {
    s1[s] = team.players.map(() => 0);
    s2[s] = team.players.map(() => 0);
  }
  for (let i = 0; i < CAL_SIMS; i++) {
    const { counts } = simSide(team, dispersion, rng, cal);
    for (const s of ALLOC_STATS)
      for (let p = 0; p < nP; p++) {
        s1[s][p] += counts[s][p];
        s2[s][p] += counts[s][p] * counts[s][p];
      }
  }
  for (const s of ALLOC_STATS) {
    const teamMean = team.team_total[s] || 0;
    for (let p = 0; p < nP; p++) {
      const tgt = team.players[p].sigma?.[s];
      if (!tgt || tgt <= 0) continue;
      const m = s1[s][p] / CAL_SIMS;
      if (m < 0.3) continue; // near-zero expectations: leave the natural spread
      // sensitivity of an allocated count to this player's weight jitter is
      // damped by (1 − share): for near-monopoly shares (a ruck's hitouts)
      // weight jitter can't move the count — the team-total CV carries it
      const share = teamMean > 0 ? m / teamMean : 0;
      if (share > 0.7) continue;
      const simVar = Math.max(0, s2[s][p] / CAL_SIMS - m * m);
      const gap = tgt * tgt - simVar;
      if (gap <= 0) continue; // already at/above target width
      const extra = Math.sqrt(gap) / (m * (1 - share));
      cal.jcv[s][p] = Math.min(Math.hypot(FORM_CV, extra), MAX_JITTER_CV);
    }
  }

  // pass 3: re-correct means under the final jitter — wide lognormal jitter on
  // a large share biases the allocated mean (Jensen), so recalibrate against it
  const s3 = {} as Record<AllocStat, number[]>;
  for (const s of ALLOC_STATS) s3[s] = team.players.map(() => 0);
  for (let i = 0; i < CAL_SIMS; i++) {
    const { counts } = simSide(team, dispersion, rng, cal);
    for (const s of ALLOC_STATS)
      for (let p = 0; p < nP; p++) s3[s][p] += counts[s][p];
  }
  for (const s of ALLOC_STATS) {
    for (let p = 0; p < nP; p++) {
      const simMean = s3[s][p] / CAL_SIMS;
      const want = team.players[p].exp[s] ?? 0;
      if (simMean > 1e-6) cal.corr[s][p] = clamp(cal.corr[s][p] * (want / simMean), 0.3, 4);
    }
  }
  return cal;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function sizeFor(t: Target): number {
  return t === "dreamTeamPoints" ? 320 : t === "disposals" ? 90
    : t === "disposals_q1" || t === "disposals_h1" ? 60 : 80;
}

function statDist(hist: Int32Array): StatDist {
  let sum = 0, sumsq = 0, total = 0;
  for (let v = 0; v < hist.length; v++) {
    const c = hist[v]; if (!c) continue;
    total += c; sum += v * c; sumsq += v * v * c;
  }
  const mean = total ? sum / total : 0;
  const sd = total ? Math.sqrt(Math.max(0, sumsq / total - mean * mean)) : 0;
  const q = (p: number) => {
    const target = p * total; let acc = 0;
    for (let v = 0; v < hist.length; v++) { acc += hist[v]; if (acc >= target) return v; }
    return hist.length - 1;
  };
  const over: Record<string, number> = {};
  const cap = Math.min(hist.length - 1, Math.ceil(mean + HALF_LINES_CAP_SD * sd));
  for (let line = 0.5; line <= cap + 0.5; line += 1) {
    const k = Math.ceil(line);
    let cnt = 0;
    for (let v = k; v < hist.length; v++) cnt += hist[v];
    const prob = total ? cnt / total : 0;
    if (prob < 0.015 && line > mean) break;
    over[line.toFixed(1)] = Math.round(prob * 1e4) / 1e4;
  }
  return {
    mean: round2(mean), sd: round2(sd),
    p10: q(0.10), p25: q(0.25), p50: q(0.50), p75: q(0.75), p90: q(0.90), over,
  };
}

export function simulateMatch(
  match: MatchProj, dispersion: Record<Target, DispersionEntry>, nSims: number,
): MatchProjection {
  const seed = hashSeed(match.match_id || `${match.home.team}-${match.away.team}`);
  const sides = [match.home, match.away];

  // calibrate each side on its own RNG stream (reproducible)
  const cal = sides.map((s, i) => calibrate(s, dispersion, new Rng(seed + 101 * (i + 1))));

  const rng = new Rng(seed);
  const hist = sides.map((s) =>
    s.players.map(() => {
      const h: Partial<Record<Target, Int32Array>> = {};
      for (const t of TARGETS) h[t] = new Int32Array(sizeFor(t));
      return h as Record<Target, Int32Array>;
    }),
  );

  let homeWins = 0, awayWins = 0, draws = 0;
  const totalPointsHist = new Int32Array(401);

  for (let sim = 0; sim < nSims; sim++) {
    const teamPts = [0, 0];
    for (let si = 0; si < 2; si++) {
      const team = sides[si];
      const { counts, goals: tg, behinds: tb } = simSide(team, dispersion, rng, cal[si]);
      for (let pi = 0; pi < team.players.length; pi++) {
        const k = counts.kicks[pi], hb = counts.handballs[pi];
        const disposals = k + hb;
        // thin the game's disposals into Q1 / 1st half (nested: Q1 ⊆ H1)
        let q1 = 0, h1 = 0;
        for (let e = 0; e < disposals; e++) {
          const r = rng.next();
          if (r < F_Q1) { q1++; h1++; }
          else if (r < F_H1) h1++;
        }
        let fantasy = 0;
        for (const stat of ALLOC_STATS) fantasy += (FANTASY[stat] ?? 0) * counts[stat][pi];
        const h = hist[si][pi];
        const put = (t: Target, v: number) => h[t][Math.min(v, h[t].length - 1)]++;
        put("kicks", k); put("handballs", hb); put("disposals", disposals);
        put("disposals_q1", q1); put("disposals_h1", h1);
        put("marks", counts.marks[pi]); put("tackles", counts.tackles[pi]);
        put("totalClearances", counts.totalClearances[pi]); put("hitouts", counts.hitouts[pi]);
        put("goals", counts.goals[pi]); put("behinds", counts.behinds[pi]);
        put("dreamTeamPoints", fantasy);
      }
      teamPts[si] = 6 * tg + tb;
    }
    if (teamPts[0] > teamPts[1]) homeWins++;
    else if (teamPts[1] > teamPts[0]) awayWins++;
    else draws++;
    totalPointsHist[Math.min(teamPts[0] + teamPts[1], totalPointsHist.length - 1)]++;
  }

  const players: PlayerProjection[] = [];
  for (let si = 0; si < 2; si++) {
    const team = sides[si];
    for (let pi = 0; pi < team.players.length; pi++) {
      const p = team.players[pi];
      const dist = {} as Record<Target, StatDist>;
      for (const t of TARGETS) dist[t] = statDist(hist[si][pi][t]);
      // model_exp for the derived period markets = thinning fraction × full-game
      // expectation (the Python model has no direct Q1/H1 target)
      const model_exp = {
        ...p.exp,
        disposals_q1: round2((p.exp.disposals ?? 0) * F_Q1),
        disposals_h1: round2((p.exp.disposals ?? 0) * F_H1),
      };
      players.push({
        player_id: p.player_id, player: p.player, team: team.team,
        position: p.position, role: p.role, named_pos: p.named_pos ?? null,
        is_ruck: p.is_ruck,
        is_home: si === 0 ? 1 : 0, tog: p.tog, model_exp, dist,
      });
    }
  }

  let acc = 0, median = 0;
  for (let v = 0; v < totalPointsHist.length; v++) {
    acc += totalPointsHist[v];
    if (acc >= nSims / 2) { median = v; break; }
  }

  return {
    match_id: match.match_id, venue: match.venue, date: match.date,
    home_team: match.home.team, away_team: match.away.team,
    home_lineup: match.home.lineup ?? "proxy", away_lineup: match.away.lineup ?? "proxy",
    home_win_prob: round2(homeWins / nSims), away_win_prob: round2(awayWins / nSims),
    draw_prob: round2(draws / nSims),
    exp_total_points: match.exp_total_points, exp_supremacy: match.exp_supremacy,
    median_total_points: median, players,
  };
}
