"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

/** AFLW season filter — keyed by season_key (handles the 2022 S6/S7 split). */
export default function AflwSeasonPicker({
  seasons,
  current,
}: {
  seasons: { key: string; label: string }[];
  current: string;
}) {
  const router = useRouter();
  const recent = seasons.slice(0, 6);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] uppercase tracking-widest text-slate-500">Season</span>
      {recent.map((s) => (
        <Link
          key={s.key}
          href={`/aflw/season/${s.key}`}
          className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
            s.key === current
              ? "border-[#ff5e44] bg-[#ff5e44]/15 text-[#ff8d79]"
              : "border-line text-slate-400 hover:border-[#ff5e44]/50"
          }`}
        >
          {s.label}
        </Link>
      ))}
      {seasons.length > recent.length && (
        <select
          value=""
          onChange={(e) => e.target.value && router.push(`/aflw/season/${e.target.value}`)}
          className="rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-[#ff5e44]/60"
        >
          <option value="">More seasons…</option>
          {seasons.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
