"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

/** Season (year) filter — jumps to a per-season page. Recent years get quick
 *  chips; the full back-catalogue lives in the dropdown. */
export default function SeasonPicker({
  years,
  current,
  basePath = "/season",
}: {
  years: number[];
  current: number;
  basePath?: string;
}) {
  const router = useRouter();
  const recent = years.slice(0, 6);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-widest text-slate-500">Season</span>
      {recent.map((y) => (
        <Link
          key={y}
          href={`${basePath}/${y}`}
          className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
            y === current
              ? "border-grass bg-grass/15 text-grass"
              : "border-line text-slate-400 hover:border-grass/50"
          }`}
        >
          {y}
        </Link>
      ))}
      <select
        value=""
        onChange={(e) => e.target.value && router.push(`${basePath}/${e.target.value}`)}
        className="rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-grass/60"
      >
        <option value="">More seasons…</option>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
