"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import {
  loadProjections, MARKETS, probOver, playerKey, type Market, type ProjectionsOutput,
} from "@/lib/modeldb";
import { impliedProb, ev, edgePct, fairOdds, recommendedStake } from "@/lib/staking";
import { BASE_PATH } from "@/lib/game/data";
import Disclaimer from "@/components/Disclaimer";

interface OddsRow { book: string; market: string; player: string; line: number; price: number }
interface OddsFeed { generated: string; rows: OddsRow[] }
const BOOK_LABEL: Record<string, string> = { sportsbet: "Sportsbet", tab: "TAB", ladbrokes: "Ladbrokes", dabble: "Dabble" };

/** Read-only value board: the model's price vs the best book price, with the edge,
 *  EV and recommended Kelly stake. To plug in your own price, use Compare odds. */
export default function ValuePage() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [odds, setOdds] = useState<OddsFeed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [market, setMarket] = useState<Market>("disposals");
  const [q, setQ] = useState("");
  const [posOnly, setPosOnly] = useState(true);

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

  const m = data?.matches[mi];
  const computed = useMemo(() => {
    if (!m) return [];
    return m.players.filter((p) => !q || p.player.toLowerCase().includes(q.toLowerCase())).map((p) => {
      const d = p.dist[market];
      const lines = book.get(`${playerKey(p.player)}|${market}`); // line -> best over
      if (!lines || !lines.size) return null;
      // line nearest the projection, where the book actually prices it
      const line = [...lines.keys()].reduce((best, l) => Math.abs(l - d.mean) < Math.abs(best - d.mean) ? l : best, [...lines.keys()][0]);
      const auto = lines.get(line)!;                 // { price, book } best over at that line
      const overOdds = auto.price;
      const modelP = probOver(d, line);
      const marketP = impliedProb(overOdds);
      const evVal = ev(modelP, overOdds);
      const edge = edgePct(modelP, marketP);
      const stake = recommendedStake(modelP, overOdds, bankroll, kFrac);
      return { p, line, overOdds, book: auto.book, proj: d.mean, modelP, evVal, edge, stake };
    }).filter((r): r is NonNullable<typeof r> => r != null)
      .filter((r) => (posOnly ? r.evVal > 0 : true))
      .sort((a, b) => b.evVal - a.evVal);
  }, [m, market, book, bankroll, kFrac, q, posOnly]);

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
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={posOnly} onChange={(e) => setPosOnly(e.target.checked)}
            className="h-4 w-4 accent-grass" /> +EV only
        </label>
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
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-pitch-light text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Proj</th>
              <th className="px-2 py-2 text-right">Line</th>
              <th className="px-2 py-2 text-right">Model</th>
              <th className="px-2 py-2 text-right">My $</th>
              <th className="px-2 py-2 text-right">Best Over $</th>
              <th className="px-2 py-2 text-right">Edge</th>
              <th className="px-2 py-2 text-right">EV</th>
              <th className="px-2 py-2 text-right">Stake</th>
              <th className="px-2 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row) => {
              const pos = row.evVal > 0;
              const k = `${mi}|${market}|${row.p.player_id}`;
              return (
                <tr key={k} className={"border-t border-line/50 " + (pos ? "bg-grass/5" : "")}>
                  <td className="px-3 py-1.5"><span className="font-semibold">{row.p.player}</span>
                    <span className="ml-1.5 text-xs text-slate-500">{row.p.team}</span></td>
                  <td className="px-2 py-1.5 text-right text-ice">{row.proj.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-right text-slate-300">{row.line}+</td>
                  <td className="px-2 py-1.5 text-right text-slate-300">{(row.modelP * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{fairOdds(row.modelP).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className={pos ? "font-bold text-grass" : "text-slate-200"}>{row.overOdds.toFixed(2)}</span>
                    <span className="ml-1 text-[10px] text-slate-500">{BOOK_LABEL[row.book] ?? row.book}</span>
                  </td>
                  <td className={"px-2 py-1.5 text-right " + (row.edge > 0 ? "text-grass" : "text-slate-400")}>
                    {row.edge > 0 ? "+" : ""}{row.edge.toFixed(1)}</td>
                  <td className={"px-2 py-1.5 text-right font-bold " + (pos ? "text-grass" : "text-slate-400")}>
                    {row.evVal > 0 ? "+" : ""}{(row.evVal * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right font-bold text-gold">{row.stake > 0 ? `$${row.stake.toFixed(0)}` : "–"}</td>
                  <td className="px-2 py-1.5 text-left whitespace-nowrap">
                    {pos
                      ? <span className="rounded bg-grass/15 px-1.5 py-0.5 text-xs font-bold text-grass">Over · {BOOK_LABEL[row.book] ?? row.book}</span>
                      : <span className="text-slate-600">–</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {computed.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No {posOnly ? "+EV " : ""}priced lines for this match yet.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Auto-filled from the best book price each line — no manual entry here; to plug in your own
        price use <b>Compare odds</b>. <b className="text-ice">Proj</b> is the model’s projection,
        <b> My $</b> its fair price. <b className="text-grass">Edge</b>/<b className="text-grass">EV</b> compare
        the model’s probability to the book’s implied price; the <b className="text-grass">Value</b> tag names the
        side and book. Stake is {kFrac === 1 ? "full" : kFrac === 0.5 ? "half" : "quarter"}-Kelly from your
        ${bankroll.toLocaleString()} bankroll (full Kelly clamped to 20%).
      </p>
      <Disclaimer />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Value &amp; staking</h1>
      <p className="mb-4 text-sm text-slate-400">Where the model beats the market — best book price, edge, EV and Kelly stake.</p>
      <ModelNav />
      {children}
    </main>
  );
}
