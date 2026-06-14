import type { Metadata } from "next";
import Link from "next/link";
import SeasonsGrid, { type SeasonCard } from "@/components/SeasonsGrid";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { allSeasonYears, seasonPremier } from "@/lib/seasondb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Every AFL/VFL Season since 1897 — ladders, results & premiers",
  description: "Browse every VFL/AFL season from 1897 to today — final ladders, every result and the premiers of each year. Filter by decade.",
  alternates: { canonical: "/seasons" },
};

export default function SeasonsPage() {
  const seasons: SeasonCard[] = allSeasonYears().map((year) => ({
    year,
    premier: seasonPremier(year)?.premier ?? null,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
        </span>
        <CompSwitch active="afl" aflHref="/seasons" aflwHref="/aflw/seasons" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">Every Season since 1897</h1>
      <p className="mt-1 text-sm text-slate-400">
        {seasons.length} seasons of VFL/AFL history — tap a year for its full ladder, results and finals.{" "}
        <Link href="/ladder" className="text-ice hover:underline">This season&apos;s ladder →</Link>
      </p>

      <div className="mt-6">
        <SeasonsGrid seasons={seasons} />
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-8" />
    </main>
  );
}
