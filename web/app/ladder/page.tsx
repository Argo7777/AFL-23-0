import type { Metadata } from "next";
import Link from "next/link";
import LadderTable from "@/components/LadderTable";
import SeasonPicker from "@/components/SeasonPicker";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { allSeasonYears, currentYear, seasonLadder, slugMap } from "@/lib/seasondb";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const y = currentYear();
  return {
    title: `${y} AFL Ladder — current standings, wins, percentage & points`,
    description: `The live ${y} AFL ladder: every club's wins, losses, draws, points for and against, percentage and premiership points — updated through the latest round. Real data, era-fair.`,
    alternates: { canonical: "/ladder" },
  };
}

export default function LadderPage() {
  const year = currentYear();
  const rows = seasonLadder(year);
  const years = allSeasonYears();
  const slugs = slugMap(rows.map((r) => r.team));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <span className="flex items-center gap-2">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
      </span>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">{year} AFL Ladder</h1>
      <p className="mt-1 text-sm text-slate-400">
        Current standings — home-and-away wins, losses, percentage and premiership points.{" "}
        <Link href="/results" className="text-ice hover:underline">See the fixtures &amp; results →</Link>
      </p>

      <div className="mt-5">
        <SeasonPicker years={years} current={year} />
      </div>

      <div className="mt-5">
        <LadderTable rows={rows} slugs={slugs} finalsCut={8} />
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/results" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Fixtures &amp; Results →</Link>
        <Link href="/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Every season since 1897 →</Link>
        <Link href="/premierships" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-ice/50">Premiership history →</Link>
      </div>

      <p className="mt-6 text-center">
        <Link href="/play" className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300">
          BUILD YOUR ALL-ERA TEAM →
        </Link>
      </p>
    </main>
  );
}
