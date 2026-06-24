"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import {
  loadProjections, MARKETS, probOver, type Market, type ProjectionsOutput,
} from "@/lib/modeldb";
import {
  devigTwoWay, impliedProb, ev, edgePct, fairOdds, recommendedStake,
} from "@/lib/staking";
import Disclaimer from "@/components/Disclaimer";

type Row = { line: string; over: string; under: string };
const keyOf = (pid: string, market: string) => `${pid}|${market}`;

export default function ValuePage() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [market, setMarket] = useState<Market>("disposals");
  const [rows, setRows] = useState<Record<string, Row>>({});

  // bankroll + Kelly fraction (persisted)
  const [bankroll, setBankroll] = useState(1000);
  const [kFrac, setKFrac] = useState(0.25);
  useEffect(() => {
    const b = Number(localStorage.getItem("afl_bankroll"));
    const k = Number(localStorage.getItem("afl_kfrac"));
    if (b > 0) setBankroll(b);
    if (k > 0) setKFrac(k);
  }, []);
  useEffect(() => { localStorage.setItem("afl_bankroll", String(bankroll)); }, [bankroll]);
  useEffect(() => { localStorage.setItem("afl_kfrac", String(kFrac)); }, [kFrac]);

  useEffect(() => { loadProjections().then(setData).catch((e) => setErr(String(e))); }, []);

  const m = data?.matches[mi];
  const computed = useMemo(() => {
    if (!m) return [];
    return m.players.map((p) => {
      const d = p.dist[market];
      const defaultLine = Math.max(0.5, Math.round(d.mean) - 0.5);
      const r = rows[keyOf(p.player_id, market)] ?? { line: defaultLine.toFixed(1), over: "", under: "" };
      const line = Number(r.line);
      const overOdds = Number(r.over);
      const underOdds = Number(r.under);
      const modelP = probOver(d, line);
      let marketP = overOdds > 1 ? impliedProb(overOdds) : NaN;
      if (overOdds > 1 && underOdds > 1) marketP = devigTwoWay(overOdds, underOdds)[0];
      const evVal = overOdds > 1 ? ev(modelP, overOdds) : NaN;
      const edge = Number.isFinite(marketP) ? edgePct(modelP, marketP) : NaN;
      const stake = overOdds > 1 ? recommendedStake(modelP, overOdds, bankroll, kFrac) : 0;
      return { p, d, r, line, modelP, marketP, evVal, edge, overOdds, stake };
    }).sort((a, b) => (Number.isFinite(b.evVal) ? b.evVal : -9) - (Number.isFinite(a.evVal) ? a.evVal : -9));
  }, [m, market, rows, bankroll, kFrac]);

  const setRow = (pid: string, patch: Partial<Row>) =>
    setRows((prev) => {
      const k = keyOf(pid, market);
      const cur = prev[k] ?? { line: "", over: "", under: "" };
      return { ...prev, [k]: { ...cur, ...patch } };
    });

  if (err) return <Shell><p className="text-hot">Projections feed not built yet.</p></Shell>;
  if (!data || !m) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm">
          {data.matches.map((mm, i) => (
            <option key={mm.match_id} value={i}>{mm.home_team} v {mm.away_team}</option>
          ))}
        </select>
        <label className="text-xs text-slate-400">
          Bankroll $
          <input type="number" value={bankroll} min={0}
            onChange={(e) => setBankroll(Number(e.target.value))}
            className="ml-1 w-24 rounded-md border border-line bg-card px-2 py-1 text-sm text-slate-100" />
        </label>
        <div className="text-xs text-slate-400">
          Kelly
          {[[1, "Full"], [0.5, "½"], [0.25, "¼"]].map(([v, l]) => (
            <button key={String(v)} onClick={() => setKFrac(v as number)}
              className={"ml-1 rounded px-2 py-1 text-xs font-bold " +
                (kFrac === v ? "bg-grass text-pitch" : "bg-card text-slate-300")}>{l as string}</button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {MARKETS.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k as Market)}
            className={"rounded-md px-2.5 py-1 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300 hover:text-slate-100")}>
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-pitch-light text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Line</th>
              <th className="px-2 py-2 text-right">Model P</th>
              <th className="px-2 py-2 text-right">Fair</th>
              <th className="px-2 py-2 text-right">Over $</th>
              <th className="px-2 py-2 text-right">Under $</th>
              <th className="px-2 py-2 text-right">Edge</th>
              <th className="px-2 py-2 text-right">EV</th>
              <th className="px-2 py-2 text-right">Stake</th>
            </tr>
          </thead>
          <tbody>
            {computed.map(({ p, line, r, modelP, evVal, edge, stake }) => {
              const pos = Number.isFinite(evVal) && evVal > 0;
              return (
                <tr key={p.player_id} className={"border-t border-line/50 " + (pos ? "bg-grass/5" : "")}>
                  <td className="px-3 py-1.5">
                    <span className="font-semibold">{p.player}</span>
                    <span className="ml-1.5 text-xs text-slate-500">{p.team}</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input value={r.line} onChange={(e) => setRow(p.player_id, { line: e.target.value })}
                      className="w-14 rounded border border-line bg-card px-1 py-0.5 text-right" />
                  </td>
                  <td className="px-2 py-1.5 text-right text-slate-300">{(modelP * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{fairOdds(modelP).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input inputMode="decimal" placeholder="$" value={r.over}
                      onChange={(e) => setRow(p.player_id, { over: e.target.value })}
                      className="w-16 rounded border border-line bg-card px-1 py-0.5 text-right" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input inputMode="decimal" placeholder="$" value={r.under}
                      onChange={(e) => setRow(p.player_id, { under: e.target.value })}
                      className="w-16 rounded border border-line bg-card px-1 py-0.5 text-right" />
                  </td>
                  <td className={"px-2 py-1.5 text-right " + (edge > 0 ? "text-grass" : "text-slate-400")}>
                    {Number.isFinite(edge) ? `${edge > 0 ? "+" : ""}${edge.toFixed(1)}` : "–"}
                  </td>
                  <td className={"px-2 py-1.5 text-right font-bold " + (pos ? "text-grass" : "text-slate-400")}>
                    {Number.isFinite(evVal) ? `${evVal > 0 ? "+" : ""}${(evVal * 100).toFixed(0)}%` : "–"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold text-gold">
                    {stake > 0 ? `$${stake.toFixed(2)}` : "–"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Enter the book’s Over price (and Under, to de-vig) to see model edge, EV per $1 and the
        recommended {kFrac === 1 ? "full" : kFrac === 0.5 ? "half" : "quarter"}-Kelly stake from your
        ${bankroll.toLocaleString()} bankroll (full Kelly clamped to 20% of bankroll). Positive-EV rows are highlighted.
      </p>
      <Disclaimer />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Value &amp; staking</h1>
      <p className="mb-4 text-sm text-slate-400">
        Model price vs the market — with Kelly staking sized to your bankroll.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}
