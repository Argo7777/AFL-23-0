/**
 * Lightweight sanity tests for the Monte-Carlo (run: tsx src/montecarlo/test.ts).
 * Not a framework — just asserts the invariants we rely on:
 *   - calibration: simulated player means ≈ model expectations
 *   - identity:    disposals mean ≈ kicks + handballs means
 *   - probabilities are well-formed and win probs sum to ~1
 */
import { simulateMatch } from "./simulate.js";
import { ALLOC_STATS, MatchProj, TeamProj, Target, DispersionEntry } from "./types.js";

let fails = 0;
function ok(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) fails++;
}

function team(name: string, scale: number): TeamProj {
  // three archetypes: a ball-magnet mid, a ruck, a small forward
  const mk = (id: string, n: string, role: string, ruck: number,
    s: Partial<Record<Target, number>>) => {
    const exp = {
      disposals: 0, goals: 0, kicks: 0, handballs: 0, marks: 0, tackles: 0,
      behinds: 0, totalClearances: 0, hitouts: 0, dreamTeamPoints: 0, ...s,
    } as Record<Target, number>;
    exp.disposals = exp.kicks + exp.handballs;
    return { player_id: id, player: n, position: role, role, is_ruck: ruck, tog: 85, exp,
      share: {} as Record<Target, number> };
  };
  const players = [
    mk(name + "1", name + " Mid", "MID", 0, { kicks: 18 * scale, handballs: 12 * scale, marks: 4, tackles: 5, totalClearances: 7, goals: 0.5 * scale, behinds: 0.4 * scale }),
    mk(name + "2", name + " Ruck", "RUCK", 1, { kicks: 8, handballs: 5, marks: 3, tackles: 2, totalClearances: 2, hitouts: 30, goals: 0.4 * scale, behinds: 0.3 * scale }),
    mk(name + "3", name + " Fwd", "FWD", 0, { kicks: 7, handballs: 3, marks: 5, tackles: 2, totalClearances: 0.5, goals: 2.2 * scale, behinds: 1.5 * scale }),
  ];
  // team totals + shares
  const total = {} as Record<Target, number>;
  for (const t of ["disposals", ...ALLOC_STATS] as Target[])
    total[t] = players.reduce((a, p) => a + p.exp[t], 0);
  for (const p of players)
    for (const t of ["disposals", ...ALLOC_STATS] as Target[])
      (p.share as Record<Target, number>)[t] = total[t] > 0 ? p.exp[t] / total[t] : 0;
  const exp_points = 6 * total.goals + total.behinds;
  return { team_id: name, team: name, team_total: total, exp_points, players };
}

const disp: Record<Target, DispersionEntry> = Object.fromEntries(
  (["disposals", ...ALLOC_STATS] as Target[]).map((t) => [t, { type: "normal", resid_std: 1, disp_pct: 0.3, mean: 1 }]),
) as Record<Target, DispersionEntry>;

const match: MatchProj = {
  match_id: "TEST_M1", venue: "Test Oval", date: null,
  home: team("Home", 1.0), away: team("Away", 0.85),
  exp_total_points: 0, exp_supremacy: 0,
};
match.exp_total_points = match.home.exp_points + match.away.exp_points;
match.exp_supremacy = match.home.exp_points - match.away.exp_points;

const res = simulateMatch(match, disp, 6000);

// 1. calibration: each player's simulated mean within 8% of model expectation
let worst = 0;
for (const p of res.players) {
  for (const s of ALLOC_STATS) {
    const want = p.model_exp[s];
    if (want < 2) continue;
    const gap = Math.abs(p.dist[s].mean - want) / want;
    worst = Math.max(worst, gap);
  }
}
ok(worst < 0.08, `calibration: worst player-stat mean gap ${(worst * 100).toFixed(1)}% < 8%`);

// 2. disposal identity in the means
let identOk = true;
for (const p of res.players) {
  const d = p.dist.disposals.mean, kh = p.dist.kicks.mean + p.dist.handballs.mean;
  if (Math.abs(d - kh) > 0.05) identOk = false;
}
ok(identOk, "identity: disposals mean == kicks + handballs mean");

// 3. probabilities well-formed
let probOk = true;
for (const p of res.players)
  for (const k in p.dist.disposals.over) {
    const v = p.dist.disposals.over[k];
    if (v < 0 || v > 1) probOk = false;
  }
ok(probOk, "all over-probabilities in [0,1]");

// 4. match result probabilities sum to ~1, favourite is home (stronger team)
const sum = res.home_win_prob + res.away_win_prob + res.draw_prob;
ok(Math.abs(sum - 1) < 0.02, `win/draw/win sum ${sum.toFixed(3)} ≈ 1`);
ok(res.home_win_prob > res.away_win_prob, "stronger (home) team favoured");

console.log(fails ? `\n${fails} FAILED` : "\nAll checks passed");
process.exit(fails ? 1 : 0);
