"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";
import {
  loadProjections, MARKETS, probOver, playerKey, type Market, type ProjectionsOutput,
  type PlayerProjection,
} from "@/lib/modeldb";
import { BASE_PATH } from "@/lib/game/data";
import { ev, fairOdds, impliedProb, recommendedStake } from "@/lib/staking";

interface OddsRow {
  book: string; event: string; home: string; away: string;
  market: string; player: string; line: number; price: number;
}
interface OddsFeed { generated: string; books: string[]; n_rows: number; rows: OddsRow[] }

const BOOK_LABEL: Record<string, string> = {
  sportsbet: "Sportsbet", tab: "TAB", ladbrokes: "Ladbrokes", dabble: "Dabble",
};

export default function ComparePage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [odds, setOdds] = useState<OddsFeed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>("disposals");
  const [matchFilter, setMatchFilter] = useState("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [posOnly, setPosOnly] = useState(true);
  const [bankroll, setBankroll] = useState(1000);
  const [kFrac, setKFrac] = useState(0.25);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "ev", dir: -1 });
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string>>({}); // `${pkey}|${line}` -> typed price

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr("Projections feed not built."));
    fetch(`${BASE_PATH}/data/odds-latest.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setOdds).catch(() => setErr("Odds feed not built — run the pipeline’s odds command."));
  }, []);
  useEffect(() => {
    const b = Number(localStorage.getItem("afl_bankroll")); const k = Number(localStorage.getItem("afl_kfrac"));
    if (b > 0) setBankroll(b); if (k > 0) setKFrac(k);
  }, []);
  useEffect(() => { localStorage.setItem("afl_bankroll", String(bankroll)); }, [bankroll]);
  useEffect(() => { localStorage.setItem("afl_kfrac", String(kFrac)); }, [kFrac]);

  const matches = useMemo(
    () => proj?.matches.map((m) => `${m.home_team} v ${m.away_team}`) ?? [], [proj]);
  const allBooks = odds?.books ?? [];
  const books = allBooks.filter((b) => !hidden.has(b));

  const index = useMemo(() => {
    const m = new Map<string, { p: PlayerProjection; match: string }>();
    proj?.matches.forEach((mt) =>
      mt.players.forEach((p) => m.set(playerKey(p.player), { p, match: `${mt.home_team} v ${mt.away_team}` })));
    return m;
  }, [proj]);

  const rows = useMemo(() => {
    if (!odds || !index.size) return [];
    const groups = new Map<string, {
      pkey: string; player: string; match: string; line: number; proj: number; prices: Record<string, number>; modelP: number;
    }>();
    for (const r of odds.rows) {
      if (r.market !== market || r.price < 1.1 || r.price > 6.0) continue;
      if (hidden.has(r.book)) continue;
      const hit = index.get(playerKey(r.player));
      if (!hit) continue;
      if (matchFilter !== "all" && hit.match !== matchFilter) continue;
      if (q && !hit.p.player.toLowerCase().includes(q.toLowerCase())) continue;
      const pk = playerKey(r.player);
      const key = `${pk}|${r.line}`;
      let g = groups.get(key);
      if (!g) {
        g = { pkey: pk, player: hit.p.player, match: hit.match, line: r.line, proj: hit.p.dist[market].mean,
          prices: {}, modelP: probOver(hit.p.dist[market], r.line) };
        groups.set(key, g);
      }
      g.prices[r.book] = Math.max(g.prices[r.book] ?? 0, r.price);
    }
    // price each line-row — a typed manual price counts as another book ("manual")
    const lineRows = [...groups.values()].map((g) => {
      const mk = Number(manual[`${g.pkey}|${g.line}`]);
      const prices = Number.isFinite(mk) && mk > 1 ? { ...g.prices, manual: mk } : g.prices;
      let bestBook = "", best = 0;
      for (const [b, p] of Object.entries(prices)) if (p > best) { best = p; bestBook = b; }
      return { ...g, prices, bestBook, best, fair: fairOdds(g.modelP), edge: (g.modelP - impliedProb(best)) * 100,
        evVal: ev(g.modelP, best), stake: recommendedStake(g.modelP, best, bankroll, kFrac) };
    });
    // collapse: one entry per player; "best" = its top-EV line, keep all lines for expand
    const byPlayer = new Map<string, typeof lineRows>();
    for (const r of lineRows) (byPlayer.get(r.pkey) ?? byPlayer.set(r.pkey, []).get(r.pkey)!).push(r);
    type Line = typeof lineRows[number];
    const out = [...byPlayer.values()].map((lines) => {
      lines.sort((a, b) => a.line - b.line);
      const best = lines.reduce((a, b) => (b.evVal > a.evVal ? b : a));
      return { best, lines };
    });
    const filtered = out.filter((g) => (posOnly ? g.best.evVal > 0 : true));
    const val = (g: Line): number | string =>
      sort.key === "player" ? g.player
      : sort.key === "proj" ? g.proj : sort.key === "line" ? g.line
      : sort.key === "model" ? g.modelP : sort.key === "fair" ? g.fair
      : sort.key === "edge" ? g.edge : sort.key === "stake" ? g.stake
      : sort.key === "ev" ? g.evVal : (g.prices[sort.key] ?? -1); // book column
    filtered.sort((a, b) => {
      const va = val(a.best), vb = val(b.best);
      if (typeof va === "string") return va.localeCompare(vb as string) * sort.dir;
      return (va - (vb as number)) * sort.dir;
    });
    return filtered;
  }, [odds, index, market, matchFilter, hidden, posOnly, bankroll, kFrac, sort, q, manual]);

  const sortBy = (key: string) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) as 1 | -1 : (key === "player" || key === "line" ? 1 : -1) }));
  const toggleExp = (pk: string) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(pk) ? n.delete(pk) : n.add(pk); return n; });

  const toggleBook = (b: string) =>
    setHidden((prev) => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; });

  if (err) return <Shell><p className="text-hot">{err}</p></Shell>;
  if (!proj || !odds) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  // the proj→stake cells, shared by the summary row and the expanded alt-lines
  const cells = (r: typeof rows[number]["best"]) => {
    const pos = r.evVal > 0;
    return (
      <>
        <td className="border-t border-line/40 px-2 py-2 text-right font-semibold text-ice">{r.proj.toFixed(1)}</td>
        <td className="border-t border-line/40 px-2 py-2 text-right text-slate-300">{r.line}+</td>
        <td className="border-t border-line/40 px-2 py-2 text-right text-slate-400">{(r.modelP * 100).toFixed(0)}%</td>
        <td className="border-t border-line/40 px-2 py-2 text-right text-slate-300">{r.fair.toFixed(2)}</td>
        {books.map((b) => {
          const p = r.prices[b]; const isBest = b === r.bestBook && !!p;
          return <td key={b} className={"border-t border-line/40 px-2 py-2 text-right " +
            (isBest ? "font-bold text-grass" : p ? "text-slate-200" : "text-slate-600")}>{p ? p.toFixed(2) : "–"}</td>;
        })}
        <td className="border-t border-line/40 px-2 py-2 text-right">
          <input inputMode="decimal" placeholder="$" value={manual[`${r.pkey}|${r.line}`] ?? ""}
            onChange={(e) => setManual((prev) => ({ ...prev, [`${r.pkey}|${r.line}`]: e.target.value }))}
            className={"w-16 rounded border bg-card px-1 py-1 text-right text-base " +
              (r.bestBook === "manual" ? "border-grass/50 font-bold text-grass" : "border-line text-slate-200")} />
        </td>
        <td className={"border-t border-line/40 px-2 py-2 text-right font-bold " + (pos ? "text-grass" : "text-slate-400")}>
          {r.evVal > 0 ? "+" : ""}{(r.evVal * 100).toFixed(0)}%
          {r.evVal > 0.15 && <span title="Large edge — usually a late lineup change or a soft/mismatched line, not free money." className="ml-0.5 text-gold">⚠</span>}
        </td>
        <td className="border-t border-line/40 px-2 py-2 text-right font-bold text-gold">{r.stake > 0 ? `$${r.stake.toFixed(0)}` : "–"}</td>
      </>
    );
  };

  return (
    <Shell>
      {/* filters */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}
            className="min-w-0 max-w-[40vw] rounded-lg border border-line bg-card px-2.5 py-2 text-base">
            <option value="all">All matches</option>
            {matches.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <input type="checkbox" checked={posOnly} onChange={(e) => setPosOnly(e.target.checked)}
              className="h-4 w-4 accent-grass" /> +EV only
          </label>
        </div>
        {/* book toggles */}
        <div className="flex flex-wrap gap-1.5">
          {allBooks.map((b) => (
            <button key={b} onClick={() => toggleBook(b)}
              className={"rounded-full px-3 py-1.5 text-xs font-bold transition " +
                (hidden.has(b) ? "bg-card text-slate-500 line-through" : "bg-pitch-light text-slate-200 ring-1 ring-line")}>
              {BOOK_LABEL[b] ?? b}
            </button>
          ))}
        </div>
        {/* bankroll + kelly */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <label className="flex items-center gap-1">Bankroll $
            <input type="number" inputMode="decimal" value={bankroll} min={0}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="w-24 rounded-md border border-line bg-card px-2 py-1.5 text-base text-slate-100" /></label>
          <span className="flex items-center gap-1">Kelly
            {[[1, "Full"], [0.5, "½"], [0.25, "¼"]].map(([v, l]) => (
              <button key={String(v)} onClick={() => setKFrac(v as number)}
                className={"rounded px-2.5 py-1.5 font-bold " + (kFrac === v ? "bg-grass text-pitch" : "bg-card text-slate-300")}>{l as string}</button>
            ))}
          </span>
        </div>
      </div>

      {/* market chips — horizontal scroll on mobile */}
      <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
        {MARKETS.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k as Market)}
            className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300")}>
            {label}
          </button>
        ))}
      </div>

      {/* table — momentum scroll on iOS, sticky player column, sortable headers */}
      <div className="-mx-3 overflow-x-auto px-3 [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <Th k="player" label="Player" align="left" sticky sort={sort} onSort={sortBy} />
              <Th k="proj" label="Proj" sort={sort} onSort={sortBy} />
              <Th k="line" label="Line" sort={sort} onSort={sortBy} />
              <Th k="model" label="Model" sort={sort} onSort={sortBy} />
              <Th k="fair" label="My $" sort={sort} onSort={sortBy} />
              {books.map((b) => <Th key={b} k={b} label={BOOK_LABEL[b] ?? b} sort={sort} onSort={sortBy} />)}
              <th className="bg-pitch px-2 py-2 text-right font-bold uppercase tracking-wide text-slate-400">Manual</th>
              <Th k="ev" label="EV" sort={sort} onSort={sortBy} />
              <Th k="stake" label="Stake" sort={sort} onSort={sortBy} />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 250).flatMap((g) => {
              const open = expanded.has(g.best.pkey);
              const list = [g.best, ...(open ? g.lines.filter((l) => l !== g.best) : [])];
              const multi = g.lines.length > 1;
              return list.map((r, idx) => {
                const summary = idx === 0;
                const pos = r.evVal > 0;
                return (
                  <tr key={`${g.best.pkey}-${r.line}-${summary ? "s" : "l"}`} className={pos ? "bg-grass/5" : ""}>
                    <td className={"sticky left-0 z-10 border-t border-line/40 px-2 py-2 " + (pos ? "bg-[#10331f]" : "bg-pitch")}>
                      {summary ? (
                        <div className="flex items-start gap-1">
                          <button onClick={() => multi && toggleExp(g.best.pkey)}
                            className={"mt-0.5 w-3 shrink-0 text-slate-500 " + (multi ? "hover:text-slate-200" : "opacity-0")}>
                            {open ? "▾" : "▸"}
                          </button>
                          <div>
                            <div className="font-semibold leading-tight">{r.player}
                              {multi && <span className="ml-1 text-[11px] font-normal text-slate-500">{g.lines.length} lines</span>}</div>
                            <div className="text-[11px] leading-tight text-slate-500">{r.match}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="block pl-4 text-xs text-slate-600">↳ alt line</span>
                      )}
                    </td>
                    {cells(r)}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No {posOnly ? "+EV " : ""}lines for this filter.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        One row per player showing their <b>best-value line</b> — tap <b className="text-slate-300">▸</b> to
        see every alternate line. Tap a column header to sort. <b className="text-ice">Proj</b> is the model’s
        projection; <b>My $</b> its fair price; best book price is <span className="text-grass">green</span>.
        Type your own price in <b>Manual</b> (e.g. a book we don’t scrape) and it competes for best price.
        EV &amp; Stake use the best price ({kFrac === 1 ? "full" : kFrac === 0.5 ? "half" : "quarter"}-Kelly,
        ${bankroll.toLocaleString()} bankroll, full Kelly clamped to 20%). Big edges (⚠) usually mean a late
        lineup change or a soft line, not free money. {rows.length.toLocaleString()} players (top 250).
        Odds {new Date(odds.generated).toLocaleString()}.
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
      <button onClick={() => onSort(k)}
        className={"font-bold uppercase tracking-wide " + (active ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
        {label}{active ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Compare odds</h1>
      <p className="mb-4 text-sm text-slate-400">
        Sportsbet, TAB &amp; Ladbrokes side by side, with the model’s fair price, best-price
        edge and Kelly staking.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}
