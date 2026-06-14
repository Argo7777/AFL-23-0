import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clubColors } from "@/lib/game/clubColors";
import { clubSlug } from "@/lib/clubdb";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { aflwCareerBySlug, notableAflwCareers } from "@/lib/aflwplayerdb";

export const dynamic = "force-static";
export const dynamicParams = false;

const POS_LABEL: Record<string, string> = { DEF: "defender", MID: "midfielder", RUC: "ruck", FWD: "forward" };

export function generateStaticParams() {
  return notableAflwCareers().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = aflwCareerBySlug(slug);
  if (!c) return {};
  const yrs = c.seasons.length === 1 ? `${c.seasons[0].year}` : `${c.seasons[0].year}–${c.seasons[c.seasons.length - 1].year}`;
  return {
    title: `${c.name} — AFLW stats, season ratings & career`,
    description: `${c.name} (${c.clubs.join(", ")}, ${yrs}): AFLW season-by-season stats, an era-fair rating peaking at ${Math.round(c.best)}/100, games and position — built from real AFL data.`,
    alternates: { canonical: `/aflw/player/${c.slug}` },
  };
}

export default async function AflwPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = aflwCareerBySlug(slug);
  if (!c) notFound();

  const [c1, c2] = clubColors(c.clubs[0] ?? "");
  const yrs = c.seasons.length === 1 ? `${c.seasons[0].year}` : `${c.seasons[0].year}–${c.seasons[c.seasons.length - 1].year}`;
  const hasGoals = c.primaryPos === "FWD";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: c.name,
      jobTitle: "AFLW footballer",
      memberOf: c.clubs.map((club) => ({ "@type": "SportsTeam", name: club })),
      url: `https://afl23-0.com/aflw/player/${c.slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "AFLW", item: "https://afl23-0.com/aflw" },
        { "@type": "ListItem", position: 2, name: "Players", item: "https://afl23-0.com/aflw/greats" },
        { "@type": "ListItem", position: 3, name: c.name, item: `https://afl23-0.com/aflw/player/${c.slug}` },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <span className="flex items-center gap-2">
        <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href="/aflw/greats" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← AFLW PLAYERS</Link>
      </span>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-10 w-4 shrink-0 flex-col overflow-hidden rounded-sm">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </span>
        <div>
          <h1 className="font-display text-4xl font-black">{c.name}</h1>
          <p className="text-sm text-slate-400">
            {c.clubs.map((club, i) => (
              <span key={club}>
                {i > 0 && ", "}
                <Link href={`/club/${clubSlug(club)}`} className="hover:text-ice hover:underline">{club}</Link>
              </span>
            ))}
            {" · "}AFLW {yrs} · {c.totalGames} games · {POS_LABEL[c.primaryPos]}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#ff5e44]/30 bg-[#ff5e44]/5 p-4">
        <p className="text-[11px] uppercase tracking-widest text-[#ff8d79]">peak AFLW rating</p>
        <p className="mt-1 font-display text-3xl font-black text-slate-100">
          {Math.round(c.best)}<span className="text-base text-slate-500">/100</span>
          <span className="ml-3 align-middle text-sm font-semibold text-slate-400">in {c.peakYear}</span>
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-pitch-light p-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">season by season</p>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[10px] uppercase tracking-wider text-slate-500">
          <span className="text-left">Season</span><span>Games</span>
          <span>{hasGoals ? "Goals" : "Disposals"}</span><span>Pos</span><span>Rating</span>
        </div>
        <div className="mt-1 grid gap-0.5">
          {c.seasons.slice().reverse().map((s) => (
            <div key={s.year} className="grid grid-cols-5 gap-1 rounded bg-pitch px-2 py-1 text-center text-xs text-slate-300">
              <Link href={`/aflw/season/${s.year}`} className="text-left font-display font-black text-slate-100 hover:text-ice">{s.year}</Link>
              <span>{s.games}</span>
              <span>{hasGoals ? (s.st.gl ?? "—") : (s.st.di ?? "—")}</span>
              <span>{s.nat}</span>
              <span className="font-display font-black text-grass">{Math.round(s.best)}</span>
            </div>
          ))}
        </div>
      </div>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <p className="mt-6 text-center">
        <Link href="/play?comp=aflw&mode=classic5" className="font-display inline-block rounded-xl bg-[#ff5e44] px-8 py-3 text-lg font-black text-white hover:bg-[#ff7a63]">
          PLAY AFLW 23-0 →
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-600">
        AFLW ratings are season-by-season, built from real AFL data —{" "}
        <Link href="/aflw/greats" className="underline">all AFLW greats</Link> ·{" "}
        <Link href="/aflw/ladder" className="underline">ladder</Link> ·{" "}
        <Link href="/aflw/premierships" className="underline">premiers</Link>
      </p>
    </main>
  );
}
