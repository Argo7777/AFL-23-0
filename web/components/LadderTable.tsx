"use client";

import { useState } from "react";
import Link from "next/link";
import { clubColors } from "@/lib/game/clubColors";

export interface LadderRow {
  team: string;
  p: number; w: number; l: number; d: number;
  pf: number; pa: number; pts: number; pct: number;
}

/** A real AFL/VFL ladder with a club-highlight filter. `finalsCut` draws the
 *  finals line (8 in the modern era, fewer historically). */
export default function LadderTable({
  rows,
  slugs,
  finalsCut = 8,
}: {
  rows: LadderRow[];
  slugs: Record<string, string>;
  finalsCut?: number;
}) {
  const [focus, setFocus] = useState("ALL");
  const cut = Math.min(finalsCut, rows.length);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] uppercase tracking-widest text-slate-500">Highlight</label>
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-grass/60"
        >
          <option value="ALL">All clubs</option>
          {rows.map((r) => (
            <option key={r.team} value={r.team}>{r.team}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-pitch-light">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Club</th>
              <th className="px-2 py-2 text-right">P</th>
              <th className="px-2 py-2 text-right">W</th>
              <th className="px-2 py-2 text-right">L</th>
              <th className="px-2 py-2 text-right">D</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">PF</th>
              <th className="hidden px-2 py-2 text-right sm:table-cell">PA</th>
              <th className="px-2 py-2 text-right">%</th>
              <th className="px-2 py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const [c1] = clubColors(r.team);
              const dim = focus !== "ALL" && focus !== r.team;
              const hi = focus === r.team;
              return (
                <tr
                  key={r.team}
                  className={`border-t border-line/60 transition ${
                    hi ? "bg-grass/10" : ""
                  } ${dim ? "opacity-35" : ""}`}
                >
                  <td className="px-2 py-2">
                    <span
                      className={`font-display font-black ${
                        i < cut ? "text-grass" : "text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/club/${slugs[r.team] ?? ""}`}
                      className="flex items-center gap-2 font-display font-black text-slate-100 hover:text-ice"
                    >
                      <span className="h-4 w-1.5 shrink-0 rounded-sm" style={{ background: c1 }} />
                      {r.team}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right text-slate-400">{r.p}</td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-200">{r.w}</td>
                  <td className="px-2 py-2 text-right text-slate-400">{r.l}</td>
                  <td className="px-2 py-2 text-right text-slate-400">{r.d}</td>
                  <td className="hidden px-2 py-2 text-right text-slate-500 sm:table-cell">{r.pf}</td>
                  <td className="hidden px-2 py-2 text-right text-slate-500 sm:table-cell">{r.pa}</td>
                  <td className="px-2 py-2 text-right text-slate-300">{r.pct.toFixed(1)}</td>
                  <td className="px-2 py-2 text-right font-display font-black text-gold">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {cut < rows.length && (
        <p className="mt-2 text-[11px] text-slate-600">
          Top {cut} (green) made the finals. Ladder is home-and-away only; percentage = points for ÷ points against.
        </p>
      )}
    </div>
  );
}
