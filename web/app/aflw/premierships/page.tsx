import type { Metadata } from "next";
import Link from "next/link";
import CompSwitch from "@/components/CompSwitch";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { aflwPremierships, teamSlug } from "@/lib/aflwdb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFLW Premiers — every Grand Final & flag tally since 2017",
  description: "Every AFLW premiership: Grand Final results and the all-time flag tally by club, from the 2017 inaugural season to today.",
  alternates: { canonical: "/aflw/premierships" },
};

export default function AflwPremiershipsPage() {
  const prems = aflwPremierships();
  const tally = new Map<string, number>();
  for (const p of prems) tally.set(p.premier, (tally.get(p.premier) ?? 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href="/aflw" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW</Link>
        </span>
        <CompSwitch active="aflw" aflHref="/premierships" aflwHref="/aflw/premierships" />
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">AFLW Premiers</h1>
      <p className="mt-1 text-sm text-slate-400">Every Grand Final since the inaugural 2017 season.</p>

      <h2 className="font-display mt-6 text-xl font-black">Flags by club</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {ranked.map(([club, n]) => (
          <Link
            key={club}
            href={`/club/${teamSlug(club)}`}
            className="flex items-center gap-2 rounded-xl border border-line bg-pitch-light px-3 py-2 hover:border-[#ff5e44]/50"
          >
            <span className="font-display font-black text-slate-100">{club}</span>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 font-display text-xs font-black text-gold">{n}</span>
          </Link>
        ))}
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-7" />

      <h2 className="font-display mt-8 text-xl font-black">Every Grand Final</h2>
      <div className="mt-3 grid gap-1.5">
        {prems.map((p) => (
          <div key={p.key} className="flex items-center gap-3 rounded-xl border border-line bg-pitch-light px-4 py-2.5">
            <span className="w-16 shrink-0 font-display text-sm font-black text-slate-400">{p.label}</span>
            <Link href={`/club/${teamSlug(p.premier)}`} className="min-w-0 flex-1 truncate font-display font-black text-slate-100 hover:text-ice">
              🏆 {p.premier}
            </Link>
            <span className="shrink-0 text-xs text-slate-500">{p.premierScore}–{p.runnerScore}</span>
            <span className="hidden min-w-0 max-w-[40%] shrink truncate text-right text-xs text-slate-500 sm:block">def. {p.runnerUp}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
