"use client";

import { useEffect, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { BASE_PATH } from "@/lib/game/data";

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
  useEffect(() => {
    fetch(`${BASE_PATH}/data/model-metrics.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setD).catch(() => setErr("Backtest data not built yet."));
  }, []);

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
    </main>
  );
}
