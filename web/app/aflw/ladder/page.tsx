import type { Metadata } from "next";
import Link from "next/link";
import LadderTable from "@/components/LadderTable";
import AflwSeasonPicker from "@/components/AflwSeasonPicker";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { aflwCurrent, aflwLadder, aflwSeasons, slugMap } from "@/lib/aflwdb";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const cur = aflwCurrent();
  return {
    title: `${cur.label} AFLW Ladder — standings, wins & percentage`,
    description: `The ${cur.label} AFLW ladder: every club's wins, losses, percentage and points through the latest round. Real data from the official AFL feed.`,
    alternates: { canonical: "/aflw/ladder" },
  };
}

export default function AflwLadderPage() {
  const cur = aflwCurrent();
  const rows = aflwLadder(cur.key);
  const seasons = aflwSeasons();
  const slugs = slugMap(rows.map((r) => r.team));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/aflw" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/ladder" aflwHref="/aflw/ladder" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">{cur.label} AFLW Ladder</h1>
      <p className="mt-1 text-sm text-slate-400">
        Current standings — wins, losses, percentage and points.{" "}
        <Link href="/aflw/results" className="text-[#ff8d79] hover:underline">See fixtures &amp; results →</Link>
      </p>

      <div className="mt-5"><AflwSeasonPicker seasons={seasons} current={cur.key} /></div>
      <div className="mt-5"><LadderTable rows={rows} slugs={slugs} finalsCut={6} /></div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/aflw/results" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Fixtures &amp; Results →</Link>
        <Link href="/aflw/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Every AFLW season →</Link>
        <Link href="/aflw/premierships" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Premiers →</Link>
      </div>
    </main>
  );
}
