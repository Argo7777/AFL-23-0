import type { Metadata } from "next";
import Link from "next/link";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { aflwSeasons } from "@/lib/aflwdb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Every AFLW Season since 2017 — ladders, results & premiers",
  description: "Browse every AFLW season from 2017 to today — final ladders, every result and the premiers of each year, including the 2022 double season.",
  alternates: { canonical: "/aflw/seasons" },
};

export default function AflwSeasonsPage() {
  const seasons = aflwSeasons();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/aflw" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/seasons" aflwHref="/aflw/seasons" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">Every AFLW Season</h1>
      <p className="mt-1 text-sm text-slate-400">
        {seasons.length} seasons since 2017 — tap a season for its full ladder, results and finals.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {seasons.map((s) => (
          <Link
            key={s.key}
            href={`/aflw/season/${s.key}`}
            className="rounded-xl border border-line bg-pitch-light px-3 py-2.5 transition hover:border-[#ff5e44]/50 hover:bg-card"
          >
            <div className="font-display text-lg font-black text-slate-100">{s.label}</div>
            <div className="truncate text-[11px] text-slate-500">
              {s.premier ? <>🏆 {s.premier}</> : <span className="text-[#ff8d79]">no GF</span>}
            </div>
          </Link>
        ))}
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-8" />
    </main>
  );
}
