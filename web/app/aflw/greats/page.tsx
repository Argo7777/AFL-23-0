import type { Metadata } from "next";
import Link from "next/link";
import AflwGreats, { type GreatRow } from "@/components/AflwGreats";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { allAflwCareers } from "@/lib/aflwplayerdb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFLW Greats — best players by season, rated on real stats",
  description: "The top AFLW players of every season since 2017, rated on that year's form from real AFL data. Filter by season, position and club.",
  alternates: { canonical: "/aflw/greats" },
};

export default function AflwGreatsPage() {
  const careers = allAflwCareers();
  // top ~40 per season, by that season's rating
  const byYear: Record<string, GreatRow[]> = {};
  const clubSet = new Set<string>();
  for (const c of careers) {
    for (const s of c.seasons) {
      if (!s.club) continue;
      clubSet.add(s.club);
      (byYear[s.year] ??= []).push({ name: c.name, slug: c.slug, club: s.club, nat: s.nat, best: s.best });
    }
  }
  for (const y of Object.keys(byYear)) {
    byYear[y].sort((a, b) => b.best - a.best);
    byYear[y] = byYear[y].slice(0, 40);
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const clubs = [...clubSet].sort();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/aflw" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/greats" aflwHref="/aflw/greats" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">AFLW Greats</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every season&apos;s best, rated on that year&apos;s form from real AFLW stats. Tap a player for their full career.
      </p>

      <div className="mt-5">
        <AflwGreats byYear={byYear} years={years} clubs={clubs} />
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <p className="mt-6 text-center">
        <Link href="/play?comp=aflw&mode=classic5" className="font-display inline-block rounded-xl bg-[#ff5e44] px-8 py-3 text-lg font-black text-white hover:bg-[#ff7a63]">
          DRAFT THESE STARS — PLAY AFLW →
        </Link>
      </p>
    </main>
  );
}
