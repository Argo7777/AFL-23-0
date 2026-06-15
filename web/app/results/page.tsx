import type { Metadata } from "next";
import Link from "next/link";
import ResultsList from "@/components/ResultsList";
import SeasonPicker from "@/components/SeasonPicker";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { allSeasonYears, currentYear, seasonMatches, slugMap } from "@/lib/seasondb";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const y = currentYear();
  return {
    title: `${y} AFL Fixtures & Results — every match, round by round`,
    description: `Every ${y} AFL result round by round — scores, venues and winners for all clubs. Filter by round or club. Real data, updated through the latest round.`,
    alternates: { canonical: "/results" },
  };
}

export default function ResultsPage() {
  const year = currentYear();
  // latest round first for a results page
  const matches = seasonMatches(year).slice().reverse();
  const years = allSeasonYears();
  const slugs = slugMap(matches.flatMap((m) => [m.t1, m.t2]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
        </span>
        <CompSwitch active="afl" aflHref="/results" aflwHref="/aflw/results" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">{year} AFL Fixtures &amp; Results</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every match this season — scores and winners, round by round.{" "}
        <Link href="/ladder" className="text-ice hover:underline">See the ladder →</Link>
      </p>

      <div className="mt-5">
        <SeasonPicker years={years} current={year} />
      </div>

      <div className="mt-5">
        <ResultsList matches={matches} slugs={slugs} matchBase="/match" />
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/ladder" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">{year} Ladder →</Link>
        <Link href="/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Every season since 1897 →</Link>
      </div>
    </main>
  );
}
