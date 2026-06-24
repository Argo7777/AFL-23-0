"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadProjections, type ProjectionsOutput } from "@/lib/modeldb";

// normal CDF (Abramowitz–Stegun) for the margin → win-probability map
function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const MARGIN_SD = 36; // historical AFL margin spread

export default function LabPage() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [total, setTotal] = useState(180);
  const [sup, setSup] = useState(0);

  useEffect(() => { loadProjections().then(setData).catch((e) => setErr(String(e))); }, []);
  const m = data?.matches[mi];
  useEffect(() => {
    if (m) { setTotal(Math.round(m.exp_total_points)); setSup(Math.round(m.exp_supremacy)); }
  }, [mi, m]);

  const view = useMemo(() => {
    if (!m) return null;
    const homePts = (total + sup) / 2, awayPts = (total - sup) / 2;
    const baseHome = (m.exp_total_points + m.exp_supremacy) / 2;
    const baseAway = (m.exp_total_points - m.exp_supremacy) / 2;
    const homeWin = normCdf(sup / MARGIN_SD);
    const scale = (isHome: number) =>
      isHome ? homePts / Math.max(1, baseHome) : awayPts / Math.max(1, baseAway);
    // recompute each player's scoring with the new team points; volume stats steady
    const players = m.players.map((p) => {
      const s = scale(p.is_home);
      const goals = p.model_exp.goals * s;
      const behinds = p.model_exp.behinds * s;
      const fantasy = p.model_exp.dreamTeamPoints + 6 * (goals - p.model_exp.goals) + (behinds - p.model_exp.behinds);
      return { ...p, adjGoals: goals, adjFantasy: fantasy };
    }).sort((a, b) => b.adjFantasy - a.adjFantasy);
    return { homePts, awayPts, homeWin, players };
  }, [m, total, sup]);

  if (err) return <Shell><p className="text-hot">Projections feed not built yet.</p></Shell>;
  if (!data || !m || !view) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <select value={mi} onChange={(e) => setMi(Number(e.target.value))}
        className="mb-4 rounded-lg border border-line bg-card px-3 py-1.5 text-sm">
        {data.matches.map((mm, i) => (
          <option key={mm.match_id} value={i}>{mm.home_team} v {mm.away_team}</option>
        ))}
      </select>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-4">
          <Slider label="Total points" min={120} max={240} value={total} onChange={setTotal} />
          <Slider label="Supremacy (home − away)" min={-60} max={60} value={sup} onChange={setSup} />
          <p className="mt-2 text-xs text-slate-500">
            The model calibrates its sims to a target total + supremacy. Drag to see how the
            implied team scores and win probability move.
          </p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-display font-black">{m.home_team}</span>
            <span className="font-display font-black">{m.away_team}</span>
          </div>
          <div className="mt-1 flex justify-between text-2xl font-black">
            <span className="text-grass">{Math.round(view.homePts)}</span>
            <span className="text-gold">{Math.round(view.awayPts)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded bg-pitch-light">
            <div className="h-full bg-grass" style={{ width: `${Math.round(view.homeWin * 100)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-grass">{Math.round(view.homeWin * 100)}% win</span>
            <span className="text-gold">{Math.round((1 - view.homeWin) * 100)}% win</span>
          </div>
        </div>
      </div>

      <h2 className="font-display mt-5 mb-2 text-sm font-black uppercase text-slate-400">
        Adjusted scoring (top fantasy)
      </h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-pitch-light text-xs uppercase text-slate-400">
            <tr><th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Goals</th>
              <th className="px-2 py-2 text-right">Fantasy</th></tr>
          </thead>
          <tbody>
            {view.players.slice(0, 12).map((p) => (
              <tr key={p.player_id} className="border-t border-line/50">
                <td className="px-3 py-1.5">
                  <span className="font-semibold">{p.player}</span>
                  <span className="ml-1.5 text-xs text-slate-500">{p.team}</span>
                </td>
                <td className="px-2 py-1.5 text-right">{p.adjGoals.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-bold">{p.adjFantasy.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function Slider({ label, min, max, value, onChange }:
  { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="mb-3 block text-xs text-slate-400">
      <span className="flex justify-between"><span>{label}</span><b className="text-slate-200">{value}</b></span>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-grass" />
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Model lab</h1>
      <p className="mb-4 text-sm text-slate-400">
        A live what-if: calibrate a game to a total and supremacy, watch scoring and win
        probability respond.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}
