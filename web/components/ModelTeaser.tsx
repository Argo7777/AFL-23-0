"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadProjections, probOver, playerKey, MARKETS, type ProjectionsOutput } from "@/lib/modeldb";
import { ev } from "@/lib/staking";
import { BASE_PATH } from "@/lib/game/data";

const LINKS: [string, string][] = [
  ["Value", "/value"],
  ["Compare odds", "/compare"],
  ["Projections", "/projections"],
  ["Pick’em", "/pickem"],
  ["Over / Unders", "/overunders"],
];

interface OddsRow { book: string; market: string; player: string; line: number; price: number }
const MARKET_LABEL: Record<string, string> = Object.fromEntries(MARKETS);

/** Short team tag from a club name, e.g. "West Coast" → "WC", "Carlton" → "CAR". */
const teamTag = (team: string) => {
  const words = team.trim().split(/\s+/);
  return (words.length > 1 ? words.map((w) => w[0]).join("") : team.slice(0, 3)).toUpperCase();
};

/** Homepage teaser for the model section — leads with the live top value bets. */
export default function ModelTeaser() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  const [odds, setOdds] = useState<OddsRow[] | null>(null);
  useEffect(() => {
    loadProjections().then(setData).catch(() => {});
    fetch(`${BASE_PATH}/data/odds-latest.json`).then((r) => r.ok ? r.json() : null)
      .then((d) => setOdds(d?.rows ?? null)).catch(() => {});
  }, []);

  // best over price per player|market|line, then top +EV over bets vs the model
  const value = useMemo(() => {
    if (!data || !odds) return [];
    const proj = new Map<string, { player: string; team: string; dist: ProjectionsOutput["matches"][number]["players"][number]["dist"] }>();
    data.matches.forEach((mt) => mt.players.forEach((p) => proj.set(playerKey(p.player), { player: p.player, team: p.team, dist: p.dist })));
    const best = new Map<string, { price: number }>(); // pkey|market|line -> best over
    for (const r of odds) {
      if (r.price < 1.3 || r.price > 4) continue;
      const k = `${playerKey(r.player)}|${r.market}|${r.line}`;
      const cur = best.get(k);
      if (!cur || r.price > cur.price) best.set(k, { price: r.price });
    }
    const picks: Array<{ player: string; team: string; market: string; line: number; price: number; evVal: number }> = [];
    for (const [k, b] of best) {
      const [pkey, market, lineStr] = k.split("|");
      const hit = proj.get(pkey); if (!hit) continue;
      const d = (hit.dist as Record<string, { mean: number; sd: number } | undefined>)[market]; if (!d) continue;
      const line = Number(lineStr);
      const evVal = ev(probOver(d as never, line), b.price);
      if (evVal > 0) picks.push({ player: hit.player, team: hit.team, market, line, price: b.price, evVal });
    }
    // one best pick per player, top 4 by EV
    const byPlayer = new Map<string, typeof picks[number]>();
    for (const p of picks) { const e = byPlayer.get(p.player); if (!e || p.evVal > e.evVal) byPlayer.set(p.player, p); }
    return [...byPlayer.values()].sort((a, b) => b.evVal - a.evVal).slice(0, 4);
  }, [data, odds]);

  return (
    <section className="mt-8 rounded-2xl border border-grass/30 bg-gradient-to-b from-grass/10 to-pitch-light p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-black text-grass">
            🎯 The Model{data ? ` · Round ${data.round}` : ""}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            Every game predicted — win probability, projected margin and total — plus player
            projections for 10 markets priced against Sportsbet · TAB · Ladbrokes · PointsBet · Dabble.
          </p>
        </div>
        <Link href="/projections"
          className="shrink-0 rounded-lg bg-grass px-3 py-2 font-display text-xs font-black uppercase tracking-wide text-pitch transition hover:bg-lime-300">
          All predictions →
        </Link>
      </div>

      {/* this round — match predictions (win prob · margin · total) */}
      {data && data.matches.length > 0 && (
        <>
          <div className="mt-4 text-[11px] uppercase tracking-wide text-slate-500">
            🔮 Round {data.round} predictions
          </div>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {data.matches.map((m) => {
              const homeFav = m.home_win_prob >= m.away_win_prob;
              const favTeam = homeFav ? m.home_team : m.away_team;
              const margin = Math.abs(m.exp_supremacy);
              return (
                <Link key={m.match_id} href="/projections"
                  className="block rounded-lg border border-line bg-card px-3 py-2 transition hover:bg-card-hover">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className={`min-w-0 flex-1 truncate ${homeFav ? "text-grass" : "text-slate-300"}`}>{m.home_team}</span>
                    <span className="shrink-0 text-[10px] font-normal text-slate-600">v</span>
                    <span className={`min-w-0 flex-1 truncate text-right ${!homeFav ? "text-grass" : "text-slate-300"}`}>{m.away_team}</span>
                  </div>
                  {/* win-probability split bar */}
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-pitch">
                    <span className="bg-grass" style={{ width: `${Math.round(m.home_win_prob * 100)}%` }} />
                    <span className="bg-slate-600" style={{ width: `${Math.round(m.away_win_prob * 100)}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{Math.round(m.home_win_prob * 100)}%</span>
                    <span className="font-semibold text-slate-400">
                      {teamTag(favTeam)} by {margin.toFixed(1)} · {Math.round(m.exp_total_points)} pts
                    </span>
                    <span>{Math.round(m.away_win_prob * 100)}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {value.length > 0 && (
        <>
          <div className="mt-3 text-[11px] uppercase tracking-wide text-slate-500">💰 Top value right now — model vs the market</div>
          <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
            {value.map((v, i) => (
              <Link key={i} href="/value" className="min-w-[10rem] shrink-0 rounded-lg border border-grass/40 bg-card px-3 py-2 transition hover:bg-card-hover">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold">{v.player}</div>
                  <div className="shrink-0 rounded bg-grass/15 px-1.5 py-0.5 text-[11px] font-bold text-grass">+{(v.evVal * 100).toFixed(0)}%</div>
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">{v.team}</div>
                <div className="mt-1 text-sm font-bold text-grass">
                  {v.line}+ {MARKET_LABEL[v.market] ?? v.market}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">@ {v.price.toFixed(2)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {LINKS.map(([label, href]) => (
          <Link key={href} href={href}
            className="rounded-full bg-card px-3 py-1.5 font-display text-xs font-black uppercase tracking-wide text-slate-200 ring-1 ring-line transition hover:bg-card-hover">
            {label} →
          </Link>
        ))}
      </div>
    </section>
  );
}
