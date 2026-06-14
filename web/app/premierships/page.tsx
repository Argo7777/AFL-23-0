import type { Metadata } from "next";
import Link from "next/link";
import { allPremierships, clubSlug, flagTally } from "@/lib/clubdb";
import { clubColors } from "@/lib/game/clubColors";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFL premiership history — every Grand Final winner",
  description:
    "The complete list of VFL/AFL premiers: every Grand Final result, winner, runner-up and score, plus the all-time premiership tally by club.",
  alternates: { canonical: "/premierships" },
};

export default function PremiershipsPage() {
  const gfs = allPremierships();
  const tally = flagTally();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">AFL premiership history</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every VFL/AFL Grand Final result — {gfs.length} premierships from {gfs[gfs.length - 1]?.year} to{" "}
        {gfs[0]?.year}.
      </p>

      <h2 className="mt-5 font-display text-xl font-black text-gold">Most premierships</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tally.slice(0, 12).map((t) => (
          <Link
            key={t.name}
            href={`/club/${t.slug}`}
            className="rounded-full bg-pitch px-3 py-1 text-sm transition hover:bg-pitch-light"
            style={{ borderLeft: `3px solid ${clubColors(t.name)[0]}` }}
          >
            <span className="font-display font-black text-slate-100">{t.name}</span>{" "}
            <span className="text-gold">{t.flags}</span>
          </Link>
        ))}
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <h2 className="mt-6 font-display text-xl font-black">Every Grand Final</h2>
      <div className="mt-2 grid gap-1">
        {gfs.map((g) => (
          <div key={g.year} className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 text-sm">
            <span className="w-12 shrink-0 font-display font-black text-slate-400">{g.year}</span>
            <Link href={`/club/${clubSlug(g.premier)}`} className="min-w-0 flex-1 truncate">
              <span className="font-display font-black text-grass">{g.premier}</span>
              <span className="text-slate-500"> def </span>
              <span className="text-slate-300">{g.runnerUp}</span>
            </Link>
            <span className="shrink-0 text-xs text-slate-500">{g.premierScore}–{g.runnerScore}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        <Link href="/clubs" className="underline">all clubs</Link> ·{" "}
        <Link href="/honours" className="underline">honour roll</Link> ·{" "}
        <Link href="/greats" className="underline">the greats</Link>
      </p>
    </main>
  );
}
