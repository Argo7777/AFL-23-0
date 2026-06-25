"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";
import {
  loadProjections, MARKETS, probOver, playerKey,
  type Market, type ProjectionsOutput, type PlayerProjection,
} from "@/lib/modeldb";
import { fairOdds, ev } from "@/lib/staking";
import { BASE_PATH } from "@/lib/game/data";

interface OddsRow { book: string; market: string; player: string; line: number; price: number }
const BOOK_LABEL: Record<string, string> = { sportsbet: "Sportsbet", tab: "TAB", ladbrokes: "Ladbrokes", dabble: "Dabble" };

/** Clean one-line-per-player over/under board: the main line, model over/under, best over price. */
export default function OverUndersPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [oddsRows, setOddsRows] = useState<OddsRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>("disposals");
  const [matchFilter, setMatchFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "edge", dir: -1 });

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr("Projections feed not built."));
    fetch(`${BASE_PATH}/data/odds-latest.json`).then((r) => r.ok ? r.json() : null)
      .then((d) => setOddsRows(d?.rows ?? [])).catch(() => {});
  }, []);

  // best over price (+book) per playerKey|market -> line
  const book = useMemo(() => {
    const m = new Map<string, Map<number, { price: number; book: string }>>();
    for (const r of oddsRows) {
      if (r.market !== market) continue;
      const k = playerKey(r.player);
      let lm = m.get(k); if (!lm) m.set(k, (lm = new Map()));
      const cur = lm.get(r.line);
      if (!cur || r.price > cur.price) lm.set(r.line, { price: r.price, book: r.book });
    }
    return m;
  }, [oddsRows, market]);

  const matches = useMemo(() => proj?.matches.map((m) => `${m.home_team} v ${m.away_team}`) ?? [], [proj]);

  const rows = useMemo(() => {
    if (!proj) return [];
    const out = [];
    for (const mt of proj.matches) {
      const match = `${mt.home_team} v ${mt.away_team}`;
      if (matchFilter !== "all" && match !== matchFilter) continue;
      for (const p of mt.players as PlayerProjection[]) {
        const d = p.dist[market];
        if (!d || d.mean < 1) continue;
        if (q && !p.player.toLowerCase().includes(q.toLowerCase())) continue;
        const lines = book.get(playerKey(p.player));
        // main line = book line nearest the projection, else the model's half-line
        let line = Math.max(0.5, Math.round(d.mean) - 0.5);
        if (lines && lines.size) line = [...lines.keys()].reduce((b, l) => Math.abs(l - d.mean) < Math.abs(b - d.mean) ? l : b, [...lines.keys()][0]);
        const over = probOver(d, line);
        const auto = lines?.get(line);
        const evOver = auto ? ev(over, auto.price) : NaN;
        out.push({ p, match, proj: d.mean, line, over, under: 1 - over,
          bestOver: auto?.price, bestBook: auto?.book,
          lean: over >= 0.5 ? "Over" : "Under", edge: Number.isFinite(evOver) ? evOver : -9, evOver });
      }
    }
    const val = (r: typeof out[number]): number | string =>
      sort.key === "player" ? r.p.player : sort.key === "proj" ? r.proj : sort.key === "line" ? r.line
      : sort.key === "over" ? r.over : sort.key === "edge" ? r.edge : r.proj;
    out.sort((a, b) => { const va = val(a), vb = val(b); return typeof va === "string" ? va.localeCompare(vb as string) * sort.dir : (va - (vb as number)) * sort.dir; });
    return out;
  }, [proj, market, matchFilter, q, book, sort]);

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

      <div className="-mx-3 overflow-x-auto px-3 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <Th k="player" label="Player" align="left" sticky sort={sort} onSort={sortBy} />
              <Th k="proj" label="Proj" sort={sort} onSort={sortBy} />
              <Th k="line" label="Line" sort={sort} onSort={sortBy} />
              <th className="bg-pitch px-2 py-2 text-center">Over / Under</th>
              <Th k="over" label="Over %" sort={sort} onSort={sortBy} />
              <th className="bg-pitch px-2 py-2 text-right">Best Over</th>
              <Th k="edge" label="Lean" sort={sort} onSort={sortBy} />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((r, i) => {
              const overPct = Math.round(r.over * 100);
              const leanOver = r.lean === "Over";
              return (
                <tr key={i}>
                  <td className="sticky left-0 z-10 border-t border-line/40 bg-pitch px-2 py-2">
                    <div className="font-semibold leading-tight">{r.p.player}</div>
                    <div className="text-[11px] leading-tight text-slate-500">{r.match}</div>
                  </td>
                  <td className="border-t border-line/40 px-2 py-2 text-right font-semibold text-ice">{r.proj.toFixed(1)}</td>
                  <td className="border-t border-line/40 px-2 py-2 text-right text-slate-300">{r.line}</td>
                  <td className="border-t border-line/40 px-2 py-2">
                    <div className="mx-auto h-2 w-28 overflow-hidden rounded-full bg-hot/30">
                      <div className="h-full bg-grass" style={{ width: `${overPct}%` }} />
                    </div>
                    <div className="mt-0.5 flex w-28 justify-between text-[10px] text-slate-500 mx-auto">
                      <span className="text-grass">O {overPct}%</span><span className="text-hot">U {100 - overPct}%</span>
                    </div>
                  </td>
                  <td className="border-t border-line/40 px-2 py-2 text-right text-slate-300">
                    {overPct}%<span className="ml-1 text-[11px] text-slate-600">{fairOdds(r.over).toFixed(2)}</span>
                  </td>
                  <td className="border-t border-line/40 px-2 py-2 text-right">
                    {r.bestOver ? <span className="font-bold text-grass">{r.bestOver.toFixed(2)}</span> : <span className="text-slate-600">–</span>}
                    {r.bestBook && <span className="ml-1 text-[10px] text-slate-500">{BOOK_LABEL[r.bestBook]?.slice(0, 4)}</span>}
                  </td>
                  <td className="border-t border-line/40 px-2 py-2 text-right">
                    <span className={"rounded px-1.5 py-0.5 text-xs font-bold " + (leanOver ? "bg-grass/15 text-grass" : "bg-hot/15 text-hot")}>
                      {r.lean} {Math.round(Math.max(r.over, r.under) * 100)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        One line per player — the main line nearest the projection. The bar shows the model’s
        <span className="text-grass"> Over</span> vs <span className="text-hot">Under</span> probability;
        <b> Best Over</b> is the top book price (green when it beats the model’s fair price). For every
        alternate line and all four books side by side, see <b>Compare odds</b>.
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
      <p className="mb-4 text-sm text-slate-400">The model’s over/under read on every player’s main line — one row each.</p>
      <ModelNav />
      {children}
    </main>
  );
}
