"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";
import {
  loadProjections, MARKETS, probOver, playerKey,
  type Market, type ProjectionsOutput, type PlayerProjection,
} from "@/lib/modeldb";
import { fairOdds, ev, devigTwoWay } from "@/lib/staking";
import { BASE_PATH } from "@/lib/game/data";

interface OuRow { book: string; market: string; player: string; line: number; over: number; under: number }
const BOOK_LABEL: Record<string, string> = { sportsbet: "Sportsbet", tab: "TAB", ladbrokes: "Ladbrokes" };

/** Real two-way over/under board: only players the bookmakers actually price, with
 *  both book prices, the de-vigged market, the model's read, and the value side. */
export default function OverUndersPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [ou, setOu] = useState<OuRow[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>("disposals");
  const [matchFilter, setMatchFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "edge", dir: -1 });

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr("Projections feed not built."));
    fetch(`${BASE_PATH}/data/ou-latest.json`).then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setOu(d.rows ?? []); setBooks(d.books ?? []); } }).catch(() => {});
  }, []);

  // best over / best under (and book) per playerKey|market|line
  const byPlayer = useMemo(() => {
    const m = new Map<string, { line: number; over: number; overBook: string; under: number; underBook: string }>();
    for (const r of ou) {
      if (r.market !== market) continue;
      const k = playerKey(r.player);
      const cur = m.get(k);
      if (!cur) m.set(k, { line: r.line, over: r.over, overBook: r.book, under: r.under, underBook: r.book });
      else {
        if (r.over > cur.over) { cur.over = r.over; cur.overBook = r.book; }
        if (r.under > cur.under) { cur.under = r.under; cur.underBook = r.book; }
      }
    }
    return m;
  }, [ou, market]);

  const matches = useMemo(() => proj?.matches.map((m) => `${m.home_team} v ${m.away_team}`) ?? [], [proj]);

  const rows = useMemo(() => {
    if (!proj) return [];
    const idx = new Map<string, { p: PlayerProjection; match: string }>();
    proj.matches.forEach((mt) => mt.players.forEach((p) => idx.set(playerKey(p.player), { p, match: `${mt.home_team} v ${mt.away_team}` })));
    const out: Array<{
      p: PlayerProjection; match: string; line: number; proj: number; over: number; under: number;
      overP: number; underP: number; overBook: string; underBook: string; mOver: number; mUnder: number;
      evOver: number; evUnder: number; bestEv: number; side: "Over" | "Under"; bestPrice: number; bestBook: string;
    }> = [];
    for (const [k, b] of byPlayer) {
      const hit = idx.get(k); if (!hit) continue;
      if (matchFilter !== "all" && hit.match !== matchFilter) continue;
      if (q && !hit.p.player.toLowerCase().includes(q.toLowerCase())) continue;
      const d = hit.p.dist[market];
      const mOver = probOver(d, b.line), mUnder = 1 - mOver;
      const [marketOver, marketUnder] = devigTwoWay(b.over, b.under);
      const evOver = ev(mOver, b.over), evUnder = ev(mUnder, b.under);
      const side = evOver >= evUnder ? "Over" : "Under";
      out.push({
        p: hit.p, match: hit.match, line: b.line, proj: d.mean, over: marketOver, under: marketUnder,
        overP: b.over, underP: b.under, overBook: b.overBook, underBook: b.underBook, mOver, mUnder,
        evOver, evUnder, bestEv: Math.max(evOver, evUnder), side,
        bestPrice: side === "Over" ? b.over : b.under, bestBook: side === "Over" ? b.overBook : b.underBook,
      });
    }
    const val = (r: typeof out[number]): number | string =>
      sort.key === "player" ? r.p.player : sort.key === "proj" ? r.proj : sort.key === "line" ? r.line
      : sort.key === "over" ? r.mOver : sort.key === "edge" ? r.bestEv : r.bestEv;
    out.sort((a, b2) => { const va = val(a), vb = val(b2); return typeof va === "string" ? va.localeCompare(vb as string) * sort.dir : (va - (vb as number)) * sort.dir; });
    return out;
  }, [proj, byPlayer, market, matchFilter, q, sort]);

  const sortBy = (key: string) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) as 1 | -1 : (key === "player" ? 1 : -1) }));

  if (err) return <Shell><p className="text-hot">{err}</p></Shell>;
  if (!proj) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}
          className="max-w-[40vw] rounded-lg border border-line bg-card px-2.5 py-2 text-base">
          <option value="all">All matches</option>
          {matches.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
      </div>
      <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        {MARKETS.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k as Market)}
            className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300")}>{label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-6 text-center text-sm text-slate-400">
          No two-way over/under markets posted for {MARKETS.find(([k]) => k === market)?.[1].toLowerCase()} yet —
          bookmakers usually post these closer to game day. Books live: {books.map((b) => BOOK_LABEL[b] ?? b).join(", ") || "none"}.
        </p>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3 [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[38rem] border-separate border-spacing-0 text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <Th k="player" label="Player" align="left" sticky sort={sort} onSort={sortBy} />
                <Th k="proj" label="Proj" sort={sort} onSort={sortBy} />
                <Th k="line" label="Line" sort={sort} onSort={sortBy} />
                <th className="bg-pitch px-2 py-2 text-center">Model O/U</th>
                <th className="bg-pitch px-2 py-2 text-right">Over $</th>
                <th className="bg-pitch px-2 py-2 text-right">Under $</th>
                <Th k="edge" label="Value" sort={sort} onSort={sortBy} />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 300).map((r, i) => {
                const overPct = Math.round(r.mOver * 100);
                const val = r.bestEv > 0;
                return (
                  <tr key={i} className={val ? "bg-grass/5" : ""}>
                    <td className={"sticky left-0 z-10 border-t border-line/40 px-2 py-2 " + (val ? "bg-[#10331f]" : "bg-pitch")}>
                      <div className="font-semibold leading-tight">{r.p.player}</div>
                      <div className="text-[11px] leading-tight text-slate-500">{r.match}</div>
                    </td>
                    <td className="border-t border-line/40 px-2 py-2 text-right font-semibold text-ice">{r.proj.toFixed(1)}</td>
                    <td className="border-t border-line/40 px-2 py-2 text-right text-slate-300">{r.line}</td>
                    <td className="border-t border-line/40 px-2 py-2">
                      <div className="mx-auto h-2 w-24 overflow-hidden rounded-full bg-hot/30">
                        <div className="h-full bg-grass" style={{ width: `${overPct}%` }} />
                      </div>
                      <div className="mx-auto mt-0.5 flex w-24 justify-between text-[10px]">
                        <span className="text-grass">O {overPct}%</span><span className="text-hot">U {100 - overPct}%</span>
                      </div>
                    </td>
                    <td className={"border-t border-line/40 px-2 py-2 text-right " + (r.side === "Over" && val ? "font-bold text-grass" : "text-slate-200")}>
                      {r.overP.toFixed(2)}<span className="ml-1 text-[10px] text-slate-600">{fairOdds(r.mOver).toFixed(2)}</span>
                      <div className="text-[10px] font-normal leading-tight text-slate-500">{BOOK_LABEL[r.overBook] ?? r.overBook}</div>
                    </td>
                    <td className={"border-t border-line/40 px-2 py-2 text-right " + (r.side === "Under" && val ? "font-bold text-grass" : "text-slate-200")}>
                      {r.underP.toFixed(2)}<span className="ml-1 text-[10px] text-slate-600">{fairOdds(r.mUnder).toFixed(2)}</span>
                      <div className="text-[10px] font-normal leading-tight text-slate-500">{BOOK_LABEL[r.underBook] ?? r.underBook}</div>
                    </td>
                    <td className="border-t border-line/40 px-2 py-2 text-right">
                      {val
                        ? <span className="rounded bg-grass/15 px-1.5 py-0.5 text-xs font-bold text-grass">{r.side} +{(r.bestEv * 100).toFixed(0)}%</span>
                        : <span className="text-slate-600">–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Real two-way bookmaker over/under markets (a single main line, both prices). The bar is the
        model’s <span className="text-grass">Over</span>/<span className="text-hot">Under</span> probability;
        small grey figures are the model’s fair price each side. <b className="text-grass">Value</b> flags the
        side the model rates +EV vs the book’s de-vigged price. Sportsbet posts first; TAB, Ladbrokes and
        Dabble add theirs closer to game day. For the full alt-line ladder see <b>Compare odds</b>.
      </p>
      <Disclaimer />
    </Shell>
  );
}

function Th({ k, label, align = "right", sticky = false, sort, onSort }: {
  k: string; label: string; align?: "left" | "right"; sticky?: boolean;
  sort: { key: string; dir: 1 | -1 }; onSort: (k: string) => void;
}) {
  const active = sort.key === k;
  return (
    <th className={(sticky ? "sticky left-0 z-10 " : "") + "bg-pitch px-2 py-2 " + (align === "left" ? "text-left" : "text-right")}>
      <button onClick={() => onSort(k)} className={"font-bold uppercase tracking-wide " + (active ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
        {label}{active ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Over / Unders</h1>
      <p className="mb-4 text-sm text-slate-400">Real two-way bookmaker over/under lines, with the model’s read and the value side.</p>
      <ModelNav />
      {children}
    </main>
  );
}
