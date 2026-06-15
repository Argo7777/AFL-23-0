import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LadderTable from "@/components/LadderTable";
import ResultsList from "@/components/ResultsList";
import AflwSeasonPicker from "@/components/AflwSeasonPicker";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import {
  aflwSeasonKeys, aflwSeasonInfo, aflwLadder, aflwMatches, aflwFinals,
  aflwCurrent, aflwSeasons, slugMap, teamSlug,
} from "@/lib/aflwdb";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return aflwSeasonKeys().map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const info = aflwSeasonInfo(key);
  if (!info) return {};
  const premBit = info.premier ? ` ${info.premier} won the flag.` : "";
  return {
    title: `${info.label} AFLW Season — ladder, results & premiers`,
    description: `The complete ${info.label} AFLW season: final ladder, every result, finals and premiership.${premBit} Real data.`,
    alternates: { canonical: `/aflw/season/${key}` },
  };
}

export default async function AflwSeasonPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const info = aflwSeasonInfo(key);
  if (!info) notFound();

  const rows = aflwLadder(key);
  const matches = aflwMatches(key);
  const finals = aflwFinals(key);
  const current = key === aflwCurrent().key;
  const finalsTeams = new Set(finals.flatMap((m) => [m.t1, m.t2])).size;
  const finalsCut = finalsTeams || 6;
  const slugs = slugMap(matches.flatMap((m) => [m.t1, m.t2]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/aflw/seasons" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW SEASONS</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/seasons" aflwHref="/aflw/seasons" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">
        {info.label} AFLW Season{current ? <span className="ml-2 align-middle text-xs font-black text-[#ff8d79]">LIVE</span> : null}
      </h1>

      {info.premier ? (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Premiers</span>
          <p className="mt-0.5 font-display text-lg font-black text-slate-100">
            <Link href={`/club/${teamSlug(info.premier)}`} className="hover:text-ice">🏆 {info.premier}</Link>
            <span className="ml-2 text-sm font-semibold text-slate-500">def. {info.runnerUp}</span>
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          {current ? "Standings and results so far this season." : "Season completed without a Grand Final."}
        </p>
      )}

      <div className="mt-5"><AflwSeasonPicker seasons={aflwSeasons()} current={key} /></div>

      <h2 className="font-display mt-7 text-xl font-black">Ladder</h2>
      <div className="mt-3"><LadderTable rows={rows} slugs={slugs} finalsCut={finalsCut} /></div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <h2 className="font-display mt-8 text-xl font-black">Results</h2>
      <div className="mt-3"><ResultsList matches={matches} slugs={slugs} matchBase="/aflw/match" /></div>

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/aflw/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Every AFLW season →</Link>
        <Link href="/aflw/premierships" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">AFLW premiers →</Link>
      </div>
    </main>
  );
}
