"use client";

import { useState } from "react";
import Link from "next/link";

export interface SeasonCard {
  year: number;
  premier: string | null;
}

/** Grid of every season with a decade filter. */
export default function SeasonsGrid({ seasons }: { seasons: SeasonCard[] }) {
  const decades = [...new Set(seasons.map((s) => Math.floor(s.year / 10) * 10))].sort((a, b) => b - a);
  const [decade, setDecade] = useState<number | "ALL">("ALL");

  const shown = decade === "ALL" ? seasons : seasons.filter((s) => Math.floor(s.year / 10) * 10 === decade);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest text-slate-500">Decade</span>
        <button
          onClick={() => setDecade("ALL")}
          className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
            decade === "ALL" ? "border-grass bg-grass/15 text-grass" : "border-line text-slate-400 hover:border-grass/50"
          }`}
        >
          All
        </button>
        {decades.map((d) => (
          <button
            key={d}
            onClick={() => setDecade(d)}
            className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
              decade === d ? "border-grass bg-grass/15 text-grass" : "border-line text-slate-400 hover:border-grass/50"
            }`}
          >
            {d}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shown.map((s) => (
          <Link
            key={s.year}
            href={`/season/${s.year}`}
            className="rounded-xl border border-line bg-pitch-light px-3 py-2.5 transition hover:border-ice/50 hover:bg-card"
          >
            <div className="font-display text-lg font-black text-slate-100">{s.year}</div>
            <div className="truncate text-[11px] text-slate-500">
              {s.premier ? <>🏆 {s.premier}</> : <span className="text-grass">in progress</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
