"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import {
  loadProjections, MARKETS, playerKey, type Market,
  type ProjectionsOutput, type MatchProjection,
} from "@/lib/modeldb";
import { loadSuperCoach, scIndex, money, type ScPlayer } from "@/lib/supercoach";

export default function ProjectionsPage() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [market, setMarket] = useState<Market | "supercoach">("disposals");
  const [q, setQ] = useState("");
  const [sc, setSc] = useState<Map<string, ScPlayer>>(new Map());

  useEffect(() => {
    loadProjections().then(setData).catch((e) => setErr(String(e)));
    loadSuperCoach().then((f) => setSc(scIndex(f)));
  }, []);

  if (err) return <Shell><p className="text-hot">Projections feed not built yet. Run the pipeline’s <code>projections</code> command.</p></Shell>;
  if (!data) return <Shell><p className="text-slate-400">Loading projections…</p></Shell>;

  const m = data.matches[mi];
  return (
    <Shell>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={mi}
          onChange={(e) => setMi(Number(e.target.value))}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm"
        >
          {data.matches.map((mm, i) => (
            <option key={mm.match_id} value={i}>
              {mm.home_team} v {mm.away_team}
            </option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-1.5 text-base" />
        <span className="text-xs text-slate-400">
          Round {data.round} · {data.n_sims.toLocaleString()} sims
        </span>
      </div>

      <MatchHeader m={m} />

      <div className="mb-3 mt-4 flex flex-wrap gap-1.5">
        {MARKETS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setMarket(k as Market)}
            className={
              "rounded-md px-2.5 py-1 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300 hover:text-slate-100")
            }
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setMarket("supercoach")}
          className={
            "rounded-md px-2.5 py-1 text-xs font-bold transition " +
            (market === "supercoach" ? "bg-gold text-pitch" : "bg-pitch-light text-gold hover:text-gold")
          }
        >
          SuperCoach
        </button>
      </div>

      {market === "supercoach"
        ? <ScMatchTable m={m} q={q} sc={sc} />
        : <PlayerTable m={m} market={market as Market} q={q} sc={sc} />}
      <p className="mt-4 text-xs text-slate-500">
        Mean / median / spread come from {data.n_sims.toLocaleString()} Monte-Carlo sims per match.
        “Model” is the direct regressor expectation. Lines show P(over). “SC” is SuperCoach’s projected
        score for the player — see the <a href="/supercoach" className="text-gold underline">SuperCoach hub</a>.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Player projections</h1>
      <p className="mb-4 text-sm text-slate-400">
        Monte-Carlo projections for every AFL player across ten markets.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}

function MatchHeader({ m }: { m: MatchProjection }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-display font-black">{m.home_team}</span>
        <span className="text-xs text-slate-400">
          {m.venue ?? ""} · median total {m.median_total_points}
        </span>
        <span className="font-display font-black">{m.away_team}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <Bar label={`${Math.round(m.home_win_prob * 100)}%`} pct={m.home_win_prob} side="home" />
        <Bar label={`${Math.round(m.away_win_prob * 100)}%`} pct={m.away_win_prob} side="away" />
      </div>
    </div>
  );
}
function Bar({ label, pct, side }: { label: string; pct: number; side: "home" | "away" }) {
  return (
    <div className="flex-1">
      <div className="h-2 overflow-hidden rounded bg-pitch-light">
        <div
          className={side === "home" ? "h-full bg-grass" : "h-full bg-gold"}
          style={{ width: `${Math.round(pct * 100)}%`, marginLeft: side === "away" ? "auto" : 0 }}
        />
      </div>
      <div className={"mt-0.5 text-xs " + (side === "away" ? "text-right" : "")}>{label}</div>
    </div>
  );
}

function PlayerTable({ m, market, q, sc }: { m: MatchProjection; market: Market; q: string; sc: Map<string, ScPlayer> }) {
  const rows = useMemo(
    () => m.players
      .filter((p) => !q || p.player.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.dist[market]?.mean ?? 0) - (a.dist[market]?.mean ?? 0)),
    [m, market, q],
  );
  // two representative over-lines either side of the median
  const lineFor = (mean: number) => Math.max(0.5, Math.round(mean) - 0.5);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-pitch-light text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Player</th>
            <th className="px-2 py-2 text-left">Pos</th>
            <th className="px-2 py-2 text-right">Mean</th>
            <th className="px-2 py-2 text-right">Median</th>
            <th className="px-2 py-2 text-right">10–90%</th>
            <th className="px-2 py-2 text-right">Model</th>
            <th className="px-2 py-2 text-right">Line</th>
            <th className="px-2 py-2 text-right">P(over)</th>
            <th className="px-2 py-2 text-right" title="SuperCoach projected score">SC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const d = p.dist[market];
            if (!d) return null; // stale cached feed without this market
            const line = lineFor(d.mean);
            const pov = d.over[line.toFixed(1)] ?? (line < d.mean ? 1 : 0);
            const scp = sc.get(playerKey(p.player));
            return (
              <tr key={p.player_id} className="border-t border-line/50 hover:bg-card-hover/40">
                <td className="px-3 py-1.5">
                  <span className="font-semibold">{p.player}</span>
                  <span className="ml-1.5 text-xs text-slate-500">
                    {p.is_home ? m.home_team : m.away_team}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-left text-xs font-bold text-slate-300">{p.role}</td>
                <td className="px-2 py-1.5 text-right font-bold">{d.mean.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{d.p50}</td>
                <td className="px-2 py-1.5 text-right text-slate-400">{d.p10}–{d.p90}</td>
                <td className="px-2 py-1.5 text-right text-slate-500">{p.model_exp[market] != null ? p.model_exp[market].toFixed(1) : "—"}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{line.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right">
                  <span className={pov >= 0.5 ? "text-grass" : "text-slate-400"}>
                    {(pov * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-2 py-1.5 text-right" title={scp ? `SC avg ${scp.avg}` : undefined}>
                  {scp?.proj ? <span className="font-bold text-gold">{Math.round(scp.proj)}</span> : <span className="text-slate-600">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** SuperCoach view of a match — each side's players with SC price/projection/form. */
function ScMatchTable({ m, q, sc }: { m: MatchProjection; q: string; sc: Map<string, ScPlayer> }) {
  const rows = useMemo(
    () => m.players
      .filter((p) => !q || p.player.toLowerCase().includes(q.toLowerCase()))
      .map((p) => ({ p, scp: sc.get(playerKey(p.player)) }))
      .filter((r) => r.scp)
      .sort((a, b) => (b.scp!.proj || b.scp!.avg) - (a.scp!.proj || a.scp!.avg)),
    [m, q, sc],
  );
  if (!sc.size) return <p className="text-sm text-slate-500">Loading SuperCoach data…</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="bg-pitch-light text-xs uppercase text-slate-400">
          <tr>
            <th className="px-3 py-2 text-left">Player</th>
            <th className="px-2 py-2 text-left">Pos</th>
            <th className="px-2 py-2 text-right">Price</th>
            <th className="px-2 py-2 text-right text-gold">Proj</th>
            <th className="px-2 py-2 text-right">Avg</th>
            <th className="px-2 py-2 text-right">L3</th>
            <th className="px-2 py-2 text-right">Own%</th>
            <th className="px-2 py-2 text-right">v Opp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, scp }) => (
            <tr key={p.player_id} className="border-t border-line/50 hover:bg-card-hover/40">
              <td className="px-3 py-1.5">
                <span className="font-semibold">{p.player}</span>
                <span className="ml-1.5 text-xs text-slate-500">{p.is_home ? m.home_team : m.away_team}</span>
              </td>
              <td className="px-2 py-1.5 text-left text-[11px] font-black uppercase text-slate-300">{scp!.positions.join("/")}</td>
              <td className="px-2 py-1.5 text-right text-slate-300">{money(scp!.price)}</td>
              <td className="px-2 py-1.5 text-right font-bold text-gold">{scp!.proj ? Math.round(scp!.proj) : "—"}</td>
              <td className="px-2 py-1.5 text-right">{scp!.avg || "—"}</td>
              <td className="px-2 py-1.5 text-right text-slate-400">{scp!.avg3 || "—"}</td>
              <td className="px-2 py-1.5 text-right text-slate-400">{scp!.owned ? scp!.owned + "%" : "—"}</td>
              <td className="px-2 py-1.5 text-right text-slate-400" title={scp!.opp ? `${scp!.oppHome ? "vs" : "@"} ${scp!.opp}` : ""}>{scp!.oppAvg || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="px-3 py-6 text-center text-sm text-slate-500">No SuperCoach matches found for these players.</p>}
    </div>
  );
}
