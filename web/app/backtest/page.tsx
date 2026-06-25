"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ModelNav from "@/components/ModelNav";
import { BASE_PATH } from "@/lib/game/data";
import { loadSuperCoach, type ScFeed } from "@/lib/supercoach";

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/**
 * Backtest of simple SuperCoach forecasters on completed rounds, computed from
 * each player's round-by-round score series: predict a game from the trailing
 * season average / last-5 / last-3, and measure mean absolute error. Shows which
 * form window best predicts a SuperCoach score and how noisy scoring is.
 */
function scForecastMae(feed: ScFeed | null) {
  if (!feed) return null;
  const err = { season: [] as number[], l5: [] as number[], l3: [] as number[] };
  let actualSum = 0, actualN = 0;
  for (const p of feed.players) {
    const s = [...p.scores].sort((a, b) => a.round - b.round).map((x) => x.pts);
    for (let i = 3; i < s.length; i++) {            // need ≥3 prior games
      const prior = s.slice(0, i), actual = s[i];
      err.season.push(Math.abs(actual - mean(prior)));
      err.l5.push(Math.abs(actual - mean(prior.slice(-5))));
      err.l3.push(Math.abs(actual - mean(prior.slice(-3))));
      actualSum += actual; actualN++;
    }
  }
  if (!err.season.length) return null;
  return {
    n: err.season.length,
    avgScore: actualSum / actualN,
    rows: [
      { label: "Season average", mae: mean(err.season) },
      { label: "Last 5 games", mae: mean(err.l5) },
      { label: "Last 3 games", mae: mean(err.l3) },
    ],
  };
}

interface Metric {
  target: string; type: string; n: number;
  model_mae: number; baseline_mae: number; improvement_pct: number;
}
interface Backtest {
  holdout_seasons: number[]; n_train: number; n_holdout: number;
  generated: string; metrics: Metric[];
}
const LABEL: Record<string, string> = {
  disposals: "Disposals", goals: "Goals", kicks: "Kicks", handballs: "Handballs",
  marks: "Marks", tackles: "Tackles", behinds: "Behinds",
  totalClearances: "Clearances", hitouts: "Hit Outs", dreamTeamPoints: "Fantasy",
};

export default function BacktestPage() {
  const [d, setD] = useState<Backtest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sc, setSc] = useState<ScFeed | null>(null);
  useEffect(() => {
    fetch(`${BASE_PATH}/data/model-metrics.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setD).catch(() => setErr("Backtest data not built yet."));
    loadSuperCoach().then(setSc);
  }, []);
  const scMae = useMemo(() => scForecastMae(sc), [sc]);

  return (
    <main className="mx-auto max-w-3xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Backtest</h1>
      <p className="mb-4 text-sm text-slate-400">
        Out-of-sample accuracy — how the model does on seasons it never trained on.
      </p>
      <ModelNav />

      {err && <p className="text-hot">{err}</p>}
      {!d && !err && <p className="text-slate-400">Loading…</p>}
      {d && (
        <>
          <p className="mb-3 text-sm text-slate-400">
            Trained on {d.n_train.toLocaleString()} player-games; tested on{" "}
            {d.n_holdout.toLocaleString()} from held-out seasons{" "}
            <b className="text-slate-200">{d.holdout_seasons.join(" & ")}</b>. Lower mean
            absolute error (MAE) is better; the bar shows improvement over a
            “last-5-games average” baseline.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-pitch-light text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left">Market</th>
                  <th className="px-2 py-2 text-right">Model MAE</th>
                  <th className="px-2 py-2 text-right">Baseline</th>
                  <th className="px-2 py-2 text-left">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {d.metrics.map((m) => {
                  const pos = m.improvement_pct > 0;
                  const w = Math.min(100, Math.abs(m.improvement_pct) * 8);
                  return (
                    <tr key={m.target} className="border-t border-line/50">
                      <td className="px-3 py-1.5 font-semibold">
                        {LABEL[m.target] ?? m.target}
                        {m.type === "poisson" && (
                          <span className="ml-1.5 text-xs text-ice">Poisson</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold">{m.model_mae.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right text-slate-400">{m.baseline_mae.toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded bg-pitch-light">
                            <div className={pos ? "h-full bg-grass" : "h-full bg-hot"}
                              style={{ width: `${w}%` }} />
                          </div>
                          <span className={pos ? "text-grass" : "text-hot"}>
                            {pos ? "+" : ""}{m.improvement_pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Hit-outs are dominated by which ruck plays, so a simple average is already hard to
            beat. Everywhere else the model adds 4–6% accuracy. Goals and behinds are scored as
            Poisson rates (anytime / 2+ / 3+), not point estimates.
          </p>
        </>
      )}

      {scMae && (
        <section className="mt-8">
          <h2 className="font-display mb-1 text-lg font-black text-gold">SuperCoach — how predictable is a score?</h2>
          <p className="mb-3 text-sm text-slate-400">
            Backtested on {scMae.n.toLocaleString()} completed player-games this season: predict each game from a
            player’s trailing form, then measure mean absolute error. The average SuperCoach score here is{" "}
            <b className="text-slate-200">{scMae.avgScore.toFixed(0)}</b>, so even the best simple forecaster is off by
            ~{Math.round(scMae.rows.reduce((m, r) => Math.min(m, r.mae), 99))} points a game — SuperCoach scoring is
            genuinely noisy.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-pitch-light text-xs uppercase text-slate-400">
                <tr><th className="px-3 py-2 text-left">Forecaster</th><th className="px-2 py-2 text-right">MAE</th><th className="px-2 py-2 text-left">Error (lower is better)</th></tr>
              </thead>
              <tbody>
                {(() => { const worst = Math.max(...scMae.rows.map((r) => r.mae)); const best = Math.min(...scMae.rows.map((r) => r.mae));
                  return scMae.rows.map((r) => (
                    <tr key={r.label} className="border-t border-line/50">
                      <td className="px-3 py-1.5 font-semibold">{r.label}{r.mae === best && <span className="ml-1.5 text-xs text-grass">best</span>}</td>
                      <td className="px-2 py-1.5 text-right font-bold">{r.mae.toFixed(1)}</td>
                      <td className="px-2 py-1.5">
                        <div className="h-2 w-40 overflow-hidden rounded bg-pitch-light">
                          <div className={r.mae === best ? "h-full bg-grass" : "h-full bg-ice"} style={{ width: `${(r.mae / worst) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  )); })()}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            This is why projections matter more than last week’s score. See how our model’s view compares to
            SuperCoach’s own projection on the <Link href="/supercoach/model" className="text-gold underline">Model vs SuperCoach</Link> page.
          </p>
        </section>
      )}
    </main>
  );
}
