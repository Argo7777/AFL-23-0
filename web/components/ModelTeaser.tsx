"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProjections, type ProjectionsOutput } from "@/lib/modeldb";

const LINKS: [string, string][] = [
  ["Projections", "/projections"],
  ["Fantasy XXII", "/fantasy"],
  ["Lineups", "/lineups"],
  ["Compare odds", "/compare"],
  ["Pick’em", "/pickem"],
];

/** Homepage teaser for the model section — live top projections + quick links. */
export default function ModelTeaser() {
  const [data, setData] = useState<ProjectionsOutput | null>(null);
  useEffect(() => { loadProjections().then(setData).catch(() => {}); }, []);

  const top = data
    ? [...data.matches.flatMap((m) => m.players)]
        .sort((a, b) => b.dist.dreamTeamPoints.mean - a.dist.dreamTeamPoints.mean)
        .slice(0, 6)
    : [];

  return (
    <section className="mt-8 rounded-2xl border border-grass/30 bg-gradient-to-b from-grass/10 to-pitch-light p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg font-black text-grass">
            🎯 The Model{data ? ` · Round ${data.round}` : ""}
          </div>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            Player projections for 10 markets, a bookmaker odds comparison (Sportsbet · TAB ·
            Ladbrokes), Dabble Pick’em, value edges &amp; Kelly staking.
          </p>
        </div>
        <Link href="/projections"
          className="shrink-0 rounded-lg bg-grass px-3 py-2 font-display text-xs font-black uppercase tracking-wide text-pitch transition hover:bg-lime-300">
          Open →
        </Link>
      </div>

      {top.length > 0 && (
        <>
          <div className="mt-3 text-[11px] uppercase tracking-wide text-slate-500">Top projected fantasy this round</div>
          <div className="-mx-1 mt-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
            {top.map((p) => (
              <div key={p.player_id} className="min-w-[8.5rem] shrink-0 rounded-lg border border-line bg-card px-3 py-2">
                <div className="truncate text-sm font-semibold">{p.player}</div>
                <div className="truncate text-[11px] text-slate-500">{p.team} · {p.role}</div>
                <div className="mt-1 text-sm font-bold text-grass">
                  {p.dist.dreamTeamPoints.mean.toFixed(0)}
                  <span className="ml-1 text-[11px] font-normal text-slate-500">proj FP</span>
                </div>
              </div>
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
