import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LadderTable from "@/components/LadderTable";
import ResultsList from "@/components/ResultsList";
import SeasonPicker from "@/components/SeasonPicker";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import {
  allSeasonYears, currentYear, seasonLadder, seasonMatches, seasonFinals,
  seasonPremier, slugMap, teamSlug,
} from "@/lib/seasondb";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allSeasonYears().map((y) => ({ year: String(y) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  const y = Number(year);
  const prem = seasonPremier(y);
  const league = y < 1990 ? "VFL" : "AFL";
  const premBit = prem ? ` ${prem.premier} won the flag.` : "";
  return {
    title: `${y} ${league} Season — ladder, results & premiers`,
    description: `The complete ${y} ${league} season: final ladder, every match result round by round, finals series and premiership.${premBit} Real data.`,
    alternates: { canonical: `/season/${y}` },
  };
}

export default async function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = Number(year);
  const rows = seasonLadder(y);
  if (rows.length === 0) notFound();

  const matches = seasonMatches(y);
  const finals = seasonFinals(y);
  const prem = seasonPremier(y);
  const years = allSeasonYears();
  const league = y < 1990 ? "VFL" : "AFL";
  const current = y === currentYear();

  const finalsTeams = new Set(finals.flatMap((m) => [m.t1, m.t2])).size;
  const finalsCut = finalsTeams || (y >= 1994 ? 8 : y >= 1972 ? 5 : 4);
  const slugs = slugMap(matches.flatMap((m) => [m.t1, m.t2]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/seasons" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">← ALL SEASONS</Link>
        </span>
        <CompSwitch active="afl" aflHref="/seasons" aflwHref="/aflw/seasons" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">
        {y} {league} Season{current ? <span className="ml-2 align-middle text-xs font-black text-grass">LIVE</span> : null}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {current
          ? "Standings and results so far this season."
          : `The complete ${y} season — final ladder, results and finals.`}
      </p>

      {prem && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Premiers</span>
          <p className="mt-0.5 font-display text-lg font-black text-slate-100">
            <Link href={`/club/${teamSlug(prem.premier)}`} className="hover:text-ice">🏆 {prem.premier}</Link>
            <span className="ml-2 text-sm font-semibold text-slate-500">def. {prem.runnerUp}</span>
          </p>
        </div>
      )}

      <div className="mt-5">
        <SeasonPicker years={years} current={y} />
      </div>

      <h2 className="font-display mt-7 text-xl font-black">Ladder</h2>
      <div className="mt-3">
        <LadderTable rows={rows} slugs={slugs} finalsCut={finalsCut} />
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <h2 className="font-display mt-8 text-xl font-black">Results</h2>
      <div className="mt-3">
        <ResultsList matches={matches} slugs={slugs} matchBase="/match" />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Every season →</Link>
        <Link href="/premierships" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Premiership history →</Link>
        {y > Math.min(...years) && (
          <Link href={`/season/${y - 1}`} className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">← {y - 1}</Link>
        )}
        {y < Math.max(...years) && (
          <Link href={`/season/${y + 1}`} className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">{y + 1} →</Link>
        )}
      </div>
    </main>
  );
}
