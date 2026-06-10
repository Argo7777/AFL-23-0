"use client";

import { useState } from "react";
import Link from "next/link";
import { Mode, Pick } from "@/lib/game/types";
import { SimResult } from "@/lib/game/sim";
import TeamField from "@/components/TeamField";

export default function ResultView({
  mode,
  roster,
  teamRating,
  sim,
  eras,
  shareUrl,
}: {
  mode: Mode;
  roster: (Pick | null)[];
  teamRating: number;
  sim: SimResult;
  eras: number[];
  shareUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const picks = roster.filter((p): p is Pick => p !== null);
  const perfect = sim.wins === 23;
  const maxDist = Math.max(...sim.distribution);

  return (
    <div className="mx-auto max-w-5xl pop">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">your season</p>
        <div
          className={`font-display mt-2 text-8xl font-black ${
            perfect ? "text-grass" : sim.wins >= 18 ? "text-gold" : "text-slate-200"
          }`}
        >
          {sim.wins}–{sim.losses}
        </div>
        <p className="mt-2 text-slate-300">
          {perfect
            ? "PERFECTION. An undefeated season across the eras."
            : sim.wins >= 20
              ? "An all-time great side — agonisingly short of immortality."
              : sim.wins >= 15
                ? "A genuine contender, but the perfect season stays a dream."
                : sim.wins >= 10
                  ? "Finals footy, maybe. Perfection, no."
                  : "Back to the drawing board, coach."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-slate-400">
          <span>
            Team rating <b className="text-slate-100">{teamRating.toFixed(1)}</b>
          </span>
          <span>
            Better than <b className="text-slate-100">{sim.realPercentile.toFixed(1)}%</b> of real{" "}
            {eras.length > 4 ? "all-era" : eras.map((e) => `${e}s`).join("/")} teams
          </span>
          <span>
            Goes 23-0 in <b className="text-slate-100">{sim.perfectPct.toFixed(1)}%</b> of seasons
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <TeamField mode={mode} roster={roster} selected={null} movable={false} onSelect={() => {}} />

        <div>
          <div className="rounded-2xl border border-line bg-pitch-light p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-500">
              Season outcomes across 10,000 simulations
            </p>
            <div className="flex h-24 items-end gap-[2px]">
              {sim.distribution.map((pct, w) => (
                <div key={w} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-sm ${w === 23 ? "bg-grass" : w === sim.wins ? "bg-gold" : "bg-line"}`}
                    style={{ height: `${Math.max(2, (pct / maxDist) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-pitch px-1.5 py-0.5 text-[10px] text-slate-300 group-hover:block">
                    {w}W · {pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>0 wins</span>
              <span>23 wins</span>
            </div>
          </div>

          <div className="mt-4 grid max-h-105 gap-1.5 overflow-y-auto pr-1">
            {picks.map((pk, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 shrink-0 rounded bg-pitch px-1.5 py-0.5 text-center font-display text-xs font-black text-ice">
                    {pk.slot}
                  </span>
                  <div className="min-w-0 truncate">
                    <span className="font-display text-base font-black">{pk.player.n}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {pk.club} · {pk.decade}s
                    </span>
                  </div>
                </div>
                <span className="font-display text-lg font-black text-grass">{pk.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch transition hover:bg-lime-300"
        >
          {copied ? "COPIED!" : "COPY SHARE LINK"}
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line px-8 py-3 font-display text-lg font-black text-slate-300 transition hover:border-grass/50"
        >
          PLAY AGAIN
        </Link>
      </div>
    </div>
  );
}
