"use client";

import { useState } from "react";
import Link from "next/link";
import { clubColors } from "@/lib/game/clubColors";

export interface GreatRow {
  name: string; slug: string; club: string; nat: string; best: number;
}

/** AFLW greats browser — top players by season, filterable by position & club. */
export default function AflwGreats({
  byYear,
  years,
  clubs,
}: {
  byYear: Record<string, GreatRow[]>;
  years: number[];
  clubs: string[];
}) {
  const [year, setYear] = useState(years[0]);
  const [pos, setPos] = useState<"ALL" | "DEF" | "MID" | "RUC" | "FWD">("ALL");
  const [club, setClub] = useState("ALL");

  const rows = (byYear[year] ?? [])
    .filter((r) => pos === "ALL" || r.nat === pos)
    .filter((r) => club === "ALL" || r.club === club)
    .slice(0, 30);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
              year === y ? "border-[#ff5e44] bg-[#ff5e44]/15 text-[#ff8d79]" : "border-line text-slate-400 hover:border-[#ff5e44]/50"
            }`}
          >
            {y}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["ALL", "DEF", "MID", "RUC", "FWD"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
              pos === p ? "border-grass bg-grass/15 text-grass" : "border-line text-slate-400 hover:border-grass/50"
            }`}
          >
            {p}
          </button>
        ))}
        <select
          value={club}
          onChange={(e) => setClub(e.target.value)}
          className="ml-auto rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-grass/60"
        >
          <option value="ALL">ALL CLUBS</option>
          {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mt-4 grid gap-1.5">
        {rows.map((r, i) => (
          <Link
            key={r.slug}
            href={`/aflw/player/${r.slug}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 transition hover:border-ice/50"
            style={{ borderLeft: `4px solid ${clubColors(r.club)[0]}` }}
          >
            <span className="w-7 shrink-0 text-right font-display text-sm font-black text-slate-500">{i + 1}</span>
            <div className="min-w-0 flex-1 truncate">
              <span className="font-display text-base font-black">{r.name}</span>
              <span className="ml-2 text-xs text-slate-500">{r.club} · {r.nat}</span>
            </div>
            <span className="shrink-0 rounded-lg bg-pitch px-2 py-1 font-display text-lg font-black text-grass">{Math.round(r.best)}</span>
          </Link>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No players for this filter.</p>}
      </div>
    </div>
  );
}
