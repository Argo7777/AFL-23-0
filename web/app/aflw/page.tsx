import type { Metadata } from "next";
import Link from "next/link";
import LadderTable from "@/components/LadderTable";
import ResultsList from "@/components/ResultsList";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { aflwCurrent, aflwMatches, slugMap } from "@/lib/aflwdb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFLW — ladder, results, seasons & premiers",
  description: "AFLW stats hub: the current ladder, latest results, every season since 2017 and all AFLW premiers. Real data from the official AFL feed.",
  alternates: { canonical: "/aflw" },
};

export default function AflwHub() {
  const cur = aflwCurrent();
  const latest = aflwMatches(cur.key).filter((m) => m.round === `R${cur.round}`);
  const slugs = slugMap([
    ...cur.ladder.map((r) => r.team),
    ...latest.flatMap((m) => [m.t1, m.t2]),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/ladder" aflwHref="/aflw/ladder" />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="inline-block h-9 w-1.5 rounded-sm bg-[#ff5e44]" />
        <div>
          <h1 className="font-display text-3xl font-black sm:text-4xl">AFLW</h1>
          <p className="text-sm text-slate-400">Women&apos;s AFL — ladders, results &amp; premiers since 2017.</p>
        </div>
      </div>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-black">{cur.label} Season <span className="text-sm text-slate-500">· Round {cur.round}</span></h2>
          <Link href="/aflw/ladder" className="text-xs font-semibold text-[#ff8d79] hover:underline">full ladder →</Link>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff8d79]">Ladder · top 6</h3>
            <LadderTable rows={cur.ladder.slice(0, 6)} slugs={slugs} finalsCut={6} />
          </div>
          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#ff8d79]">Round {cur.round} results</h3>
            <ResultsList matches={latest} slugs={slugs} />
          </div>
        </div>
      </section>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/aflw/ladder" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Ladder →</Link>
        <Link href="/aflw/results" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Fixtures &amp; Results →</Link>
        <Link href="/aflw/seasons" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">All seasons →</Link>
        <Link href="/aflw/premierships" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Premiers →</Link>
      </div>

      <p className="mt-8 text-center text-xs text-slate-600">
        AFL is our main game — <Link href="/" className="text-slate-400 underline hover:text-grass">back to AFL 23-0</Link>.
      </p>
    </main>
  );
}
