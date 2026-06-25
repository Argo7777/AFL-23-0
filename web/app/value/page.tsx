"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import {
  loadProjections, MARKETS, probOver, playerKey, type Market, type ProjectionsOutput,
} from "@/lib/modeldb";
import { devigTwoWay, impliedProb, ev, edgePct, fairOdds, recommendedStake } from "@/lib/staking";
import { BASE_PATH } from "@/lib/game/data";
import Disclaimer from "@/components/Disclaimer";

interface OddsRow { book: string; market: string; player: string; line: number; price: number }
interface OddsFeed { generated: string; rows: OddsRow[] }
type Override = { line?: string; over?: string; under?: string };
const keyOf = (pid: string, market: string) => `${pid}|${market}`;

export default function ValuePage() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [odds, setOdds] = useState<OddsFeed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [market, setMarket] = useState<Market>("disposals");
  const [ov, setOv] = useState<Record<string, Override>>({}); // manual overrides
  const [q, setQ] = useState("");

  const [bankroll, setBankroll] = useState(1000);
  const [kFrac, setKFrac] = useState(0.25);
  useEffect(() => {
    const b = Number(localStorage.getItem("afl_bankroll")); const k = Number(localStorage.getItem("afl_kfrac"));
    if (b > 0) setBankroll(b); if (k > 0) setKFrac(k);
  }, []);
  useEffect(() => { localStorage.setItem("afl_bankroll", String(bankroll)); }, [bankroll]);
  useEffect(() => { localStorage.setItem("afl_kfrac", String(kFrac)); }, [kFrac]);

  useEffect(() => {
    loadProjections().then(setData).catch((e) => setErr(String(e)));
    fetch(`${BASE_PATH}/data/odds-latest.json`).then((r) => r.ok ? r.json() : null).then(setOdds).catch(() => {});
  }, []);

  // best over price (and which book) per playerKey|market -> line
  const book = useMemo(() => {
    const m = new Map<string, Map<number, { price: number; book: string }>>();
    for (const r of odds?.rows ?? []) {
      const k = `${playerKey(r.player)}|${r.market}`;
      let lm = m.get(k); if (!lm) m.set(k, (lm = new Map()));
      const cur = lm.get(r.line);
      if (!cur || r.price > cur.price) lm.set(r.line, { price: r.price, book: r.book });
    }
    return m;
  }, [odds]);
  const BOOK_LABEL: Record<string, string> = { sportsbet: "Sportsbet", tab: "TAB", ladbrokes: "Ladbrokes", dabble: "Dabble" };

  const m = data?.matches[mi];
  const computed = useMemo(() => {
    if (!m) return [];
    return m.players.filter((p) => !q || p.player.toLowerCase().includes(q.toLowerCase())).map((p) => {
      const d = p.dist[market];
      const lines = book.get(`${playerKey(p.player)}|${market}`); // line -> best over
      const modelLine = Math.max(0.5, Math.round(d.mean) - 0.5);
      // default line = the book line nearest the projection, else the model line
      let defLine = modelLine;
      if (lines && lines.size) {
        defLine = [...lines.keys()].reduce((best, l) => Math.abs(l - d.mean) < Math.abs(best - d.mean) ? l : best, [...lines.keys()][0]);
      }
      const o = ov[keyOf(p.player_id, market)] ?? {};
      const line = o.line != null && o.line !== "" ? Number(o.line) : defLine;
      const auto = lines?.get(line); // {price, book} at the chosen line (auto-fill)
      const autoOver = auto?.price;
      const overOdds = o.over != null && o.over !== "" ? Number(o.over) : (autoOver ?? NaN);
      const underOdds = o.under != null && o.under !== "" ? Number(o.under) : NaN;

      const modelP = probOver(d, line);
      let marketP = overOdds > 1 ? impliedProb(overOdds) : NaN;
      if (overOdds > 1 && underOdds > 1) marketP = devigTwoWay(overOdds, underOdds)[0];
      const evVal = overOdds > 1 ? ev(modelP, overOdds) : NaN;
      const edge = Number.isFinite(marketP) ? edgePct(modelP, marketP) : NaN;
      const stake = overOdds > 1 ? recommendedStake(modelP, overOdds, bankroll, kFrac) : 0;
      const isAuto = !o.over && autoOver != null;
      const overStr = o.over != null && o.over !== "" ? o.over : (autoOver != null ? autoOver.toFixed(2) : "");
      // where the value is: the Over is +EV at this price → name the book
      const valueAt = Number.isFinite(evVal) && evVal > 0
        ? `Over${isAuto && auto ? ` · ${BOOK_LABEL[auto.book] ?? auto.book}` : ""}` : "";
      return { p, line: String(o.line ?? defLine), overStr, underStr: o.under ?? "", proj: d.mean,
        modelP, evVal, edge, overOdds, stake, isAuto, valueAt };
    }).sort((a, b) => (Number.isFinite(b.evVal) ? b.evVal : -9) - (Number.isFinite(a.evVal) ? a.evVal : -9));
  }, [m, market, ov, book, bankroll, kFrac, q]);

  const setRow = (pid: string, patch: Override) =>
    setOv((prev) => ({ ...prev, [keyOf(pid, market)]: { ...prev[keyOf(pid, market)], ...patch } }));

  if (err) return <Shell><p className="text-hot">Projections feed not built yet.</p></Shell>;
  if (!data || !m) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))}
          className="max-w-[45vw] rounded-lg border border-line bg-card px-3 py-2 text-base">
          {data.matches.map((mm, i) => <option key={mm.match_id} value={i}>{mm.home_team} v {mm.away_team}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
        <label className="text-xs text-slate-400">Bankroll $
          <input type="number" inputMode="decimal" value={bankroll} min={0}
            onChange={(e) => setBankroll(Number(e.target.value))}
            className="ml-1 w-24 rounded-md border border-line bg-card px-2 py-1.5 text-base text-slate-100" /></label>
        <span className="text-xs text-slate-400">Kelly
          {[[1, "Full"], [0.5, "½"], [0.25, "¼"]].map(([v, l]) => (
            <button key={String(v)} onClick={() => setKFrac(v as number)}
              className={"ml-1 rounded px-2.5 py-1.5 text-xs font-bold " + (kFrac === v ? "bg-grass text-pitch" : "bg-card text-slate-300")}>{l as string}</button>
          ))}
        </span>
      </div>

      <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        {MARKETS.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k as Market)}
            className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300")}>{label}</button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-pitch-light text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Proj</th>
              <th className="px-2 py-2 text-right">Line</th>
              <th className="px-2 py-2 text-right">Model</th>
              <th className="px-2 py-2 text-right">My $</th>
              <th className="px-2 py-2 text-right">Over $</th>
              <th className="px-2 py-2 text-right">Under $</th>
              <th className="px-2 py-2 text-right">Edge</th>
              <th className="px-2 py-2 text-right">EV</th>
              <th className="px-2 py-2 text-right">Stake</th>
              <th className="px-2 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row) => {
              const pos = Number.isFinite(row.evVal) && row.evVal > 0;
              const k = `${mi}|${market}|${row.p.player_id}`;
              return (
                <tr key={k} className={"border-t border-line/50 " + (pos ? "bg-grass/5" : "")}>
                  <td className="px-3 py-1.5"><span className="font-semibold">{row.p.player}</span>
                    <span className="ml-1.5 text-xs text-slate-500">{row.p.team}</span></td>
                  <td className="px-2 py-1.5 text-right text-ice">{row.proj.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input value={row.line} onChange={(e) => setRow(row.p.player_id, { line: e.target.value })}
                      className="w-14 rounded border border-line bg-card px-1 py-1 text-right text-base" /></td>
                  <td className="px-2 py-1.5 text-right text-slate-300">{(row.modelP * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{fairOdds(row.modelP).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input inputMode="decimal" placeholder="$" value={row.overStr}
                      onChange={(e) => setRow(row.p.player_id, { over: e.target.value })}
                      className={"w-16 rounded border bg-card px-1 py-1 text-right text-base " + (row.isAuto ? "border-grass/40 text-grass" : "border-line")} /></td>
                  <td className="px-2 py-1.5 text-right">
                    <input inputMode="decimal" placeholder="$" value={row.underStr}
                      onChange={(e) => setRow(row.p.player_id, { under: e.target.value })}
                      className="w-16 rounded border border-line bg-card px-1 py-1 text-right text-base" /></td>
                  <td className={"px-2 py-1.5 text-right " + (row.edge > 0 ? "text-grass" : "text-slate-400")}>
                    {Number.isFinite(row.edge) ? `${row.edge > 0 ? "+" : ""}${row.edge.toFixed(1)}` : "–"}</td>
                  <td className={"px-2 py-1.5 text-right font-bold " + (pos ? "text-grass" : "text-slate-400")}>
                    {Number.isFinite(row.evVal) ? `${row.evVal > 0 ? "+" : ""}${(row.evVal * 100).toFixed(0)}%` : "–"}</td>
                  <td className="px-2 py-1.5 text-right font-bold text-gold">{row.stake > 0 ? `$${row.stake.toFixed(0)}` : "–"}</td>
                  <td className="px-2 py-1.5 text-left whitespace-nowrap">
                    {row.valueAt
                      ? <span className="rounded bg-grass/15 px-1.5 py-0.5 text-xs font-bold text-grass">{row.valueAt}</span>
                      : <span className="text-slate-600">–</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        <span className="text-grass">Green</span> Over prices are auto-filled from the best book; type to
        override, or add an Under to de-vig. Edit the line and the book price re-fills for that line.
        The <b className="text-grass">Value</b> column names the bet when it’s +EV — e.g. “Over · TAB” is the
        side and book to take. <b>My $</b> is the model’s fair price; recommended {kFrac === 1 ? "full" : kFrac === 0.5 ? "half" : "quarter"}-Kelly
        stake from your ${bankroll.toLocaleString()} bankroll (full Kelly clamped to 20%).
      </p>
      <Disclaimer />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Value &amp; staking</h1>
      <p className="mb-4 text-sm text-slate-400">Model price vs the market — auto-filled, with manual override and Kelly staking.</p>
      <ModelNav />
      {children}
    </main>
  );
}
