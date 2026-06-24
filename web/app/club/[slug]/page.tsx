import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allClubNames, clubData, clubSlug } from "@/lib/clubdb";
import { clubRecord } from "@/lib/seasondb";
import { clubProse } from "@/lib/prose";
import { clubColors } from "@/lib/game/clubColors";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { jsonLd as ldScript } from "@/lib/jsonld";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allClubNames().map((n) => ({ slug: clubSlug(n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = clubData(slug);
  if (!c) return {};
  return {
    title: `${c.name} — greatest players, premierships & all-time team`,
    description: `${c.name}'s greatest AFL/VFL players ranked by era-fair rating, ${c.flags.length} premierships (${c.flags.slice(0, 5).join(", ")}${c.flags.length > 5 ? "…" : ""}), and complete club history from real data.`,
    alternates: { canonical: `/club/${c.slug}` },
  };
}

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = clubData(slug);
  if (!c) notFound();

  const [c1, c2] = clubColors(c.name);
  const POS: Record<string, string> = { DEF: "defenders", MID: "midfielders", RUC: "rucks", FWD: "forwards" };
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "SportsTeam",
      name: c.name,
      sport: "Australian rules football",
      url: `https://afl23-0.com/club/${c.slug}`,
      ...(c.flags.length ? { award: `${c.flags.length} VFL/AFL premierships` } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Clubs", item: "https://afl23-0.com/clubs" },
        { "@type": "ListItem", position: 2, name: c.name, item: `https://afl23-0.com/club/${c.slug}` },
      ],
    },
  ];

  const rec = clubRecord(c.name);
  const prose = clubProse(c, rec);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldScript(ld) }} />
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-4 shrink-0 flex-col overflow-hidden rounded-sm">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </span>
        <h1 className="font-display text-4xl font-black">{c.name}</h1>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {c.name}&apos;s greatest players, ranked by an era-fair rating built from real career stats,
        Brownlow votes and honours — plus the club&apos;s complete premiership history.
      </p>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-300">
        <span>Premierships <b className="font-display text-xl text-gold">{c.flags.length}</b></span>
        <span>Grand Final losses <b className="font-display text-xl text-slate-100">{c.runnerUps.length}</b></span>
        <span>Players rated <b className="font-display text-xl text-grass">{c.playerCount}</b></span>
      </div>

      {rec.played > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">
            all-time VFL/AFL record · {rec.firstYear}–{rec.lastYear}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-300">
            <span>Played <b className="font-display text-lg text-slate-100">{rec.played.toLocaleString()}</b></span>
            <span>Record <b className="font-display text-lg text-slate-100">{rec.w}-{rec.l}{rec.d ? `-${rec.d}` : ""}</b></span>
            <span>Win rate <b className="font-display text-lg text-grass">{rec.winPct}%</b></span>
            <span>Scoring % <b className="font-display text-lg text-slate-100">{rec.pct}</b></span>
          </div>
          {rec.biggestWin && (
            <p className="mt-2 text-xs text-slate-500">
              Biggest win: {rec.biggestWin.margin} pts v {rec.biggestWin.opp} ({rec.biggestWin.year}).
            </p>
          )}
        </div>
      )}

      {c.flags.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-pitch-light p-4">
          <p className="text-[11px] uppercase tracking-widest text-gold">premiership years</p>
          <p className="mt-1 font-display text-sm font-black leading-relaxed text-slate-200">
            {c.flags.join(" · ")}
          </p>
        </div>
      )}

      <section className="mt-6 space-y-3 text-sm leading-relaxed text-slate-300">
        <h2 className="font-display text-2xl font-black text-slate-100">
          {c.name} — club history &amp; record
        </h2>
        {prose.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <h2 className="mt-6 font-display text-2xl font-black">
        Greatest {c.name} players
      </h2>
      <div className="mt-2 grid gap-1">
        {c.greats.map((p, i) => (
          <Link
            key={p.slug}
            href={`/player/${p.slug}`}
            className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2 transition hover:border-ice/50"
          >
            <span className="w-7 shrink-0 text-right font-display text-sm font-black text-slate-500">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-base font-black">{p.name}</div>
              <div className="text-xs text-slate-500">{p.decades} · {p.games} games · {POS[p.nat] ?? p.nat}</div>
            </div>
            <span className="shrink-0 rounded-lg bg-pitch px-2 py-1 font-display text-lg font-black text-grass">
              {Math.round(p.rating)}
            </span>
          </Link>
        ))}
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <p className="mt-6 text-center">
        <Link href={`/play?mode=full23&club=${encodeURIComponent(c.name)}`} className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300">
          BUILD AN ALL-TIME {c.name.toUpperCase()} 23 →
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-600">
        <Link href="/clubs" className="underline">all clubs</Link> ·{" "}
        <Link href="/premierships" className="underline">premiership history</Link> ·{" "}
        <Link href="/honours" className="underline">honour roll</Link>
      </p>
    </main>
  );
}
