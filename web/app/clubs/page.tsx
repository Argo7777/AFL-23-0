import type { Metadata } from "next";
import Link from "next/link";
import { allClubNames, clubSlug, flagTally } from "@/lib/clubdb";
import { clubColors } from "@/lib/game/clubColors";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "AFL clubs — greatest players & premierships for every club",
  description:
    "Every AFL/VFL club: their greatest all-time players ranked by era-fair rating and their complete premiership history. Pick a club to explore its legends.",
  alternates: { canonical: "/clubs" },
};

export default function ClubsIndex() {
  const flags = new Map(flagTally().map((f) => [f.name, f.flags]));
  const clubs = allClubNames();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">AFL clubs — all-time</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every VFL/AFL club, their greatest players and premiership tallies — from real data.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {clubs.map((name) => {
          const [c1, c2] = clubColors(name);
          const f = flags.get(name) ?? 0;
          return (
            <Link
              key={name}
              href={`/club/${clubSlug(name)}`}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition hover:border-ice/50"
              style={{ borderLeft: `4px solid ${c1}` }}
            >
              <span className="flex h-5 w-2.5 shrink-0 flex-col overflow-hidden rounded-sm">
                <span className="flex-1" style={{ background: c1 }} />
                <span className="flex-1" style={{ background: c2 }} />
              </span>
              <span className="min-w-0 flex-1 truncate font-display font-black">{name}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {f > 0 ? `${f} flag${f === 1 ? "" : "s"}` : "—"}
              </span>
            </Link>
          );
        })}
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <p className="mt-6 text-center text-xs text-slate-600">
        <Link href="/premierships" className="underline">premiership history</Link> ·{" "}
        <Link href="/greats" className="underline">the greats</Link> ·{" "}
        <Link href="/honours" className="underline">honour roll</Link>
      </p>
    </main>
  );
}
