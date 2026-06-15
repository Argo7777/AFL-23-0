import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { clubColors } from "@/lib/game/clubColors";
import { clubSlug } from "@/lib/clubdb";
import AdSlot from "@/components/AdSlot";
import { AD_SLOTS } from "@/lib/ads";
import { allMatchIds, matchBox, type BoxPlayer, type BoxScore } from "@/lib/aflwmatchdb";
import { aflwSlugMap } from "@/lib/aflwplayerdb";

export const dynamic = "force-static";
export const dynamicParams = false;

const FINAL_LABEL: Record<string, string> = {
  EF: "Elimination Final", QF: "Qualifying Final", SF: "Semi Final",
  PF: "Preliminary Final", GF: "Grand Final",
};
const roundLabel = (r: string) => FINAL_LABEL[r] ?? `Round ${r.slice(1)}`;

export function generateStaticParams() {
  return allMatchIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = matchBox(id);
  if (!m) return {};
  const title = `${m.t1} v ${m.t2} — ${m.label} AFLW ${roundLabel(m.round)}`;
  return {
    title: `${title}: ${m.s1}-${m.s2}, box score`,
    description: `${m.t1} ${m.s1} v ${m.t2} ${m.s2} — ${m.label} AFLW ${roundLabel(m.round)} at ${m.venue} on ${m.date}. Full box score, lineups and player stats.`,
    alternates: { canonical: `/aflw/match/${id}` },
  };
}

function BoxTable({ team, players, slugs }: { team: string; players: BoxPlayer[]; slugs: Record<string, string> }) {
  const rows = [...players].sort((a, b) => b.di - a.di);
  const [c1] = clubColors(team);
  const hasRuck = rows.some((p) => p.ho >= 3);
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-black">
        <span className="h-5 w-1.5 rounded-sm" style={{ background: c1 }} />
        <Link href={`/club/${clubSlug(team)}`} className="hover:text-ice">{team}</Link>
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-line bg-pitch-light">
        <table className="w-full min-w-[460px] text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-2 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">DI</th>
              <th className="px-2 py-2 text-right">KK</th>
              <th className="px-2 py-2 text-right">HB</th>
              <th className="px-2 py-2 text-right">MK</th>
              <th className="px-2 py-2 text-right">TK</th>
              <th className="px-2 py-2 text-right">GL</th>
              {hasRuck && <th className="px-2 py-2 text-right">HO</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const slug = slugs[p.n];
              return (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-2 py-1.5 font-display font-black text-slate-100">
                    {slug ? <Link href={`/aflw/player/${slug}`} className="hover:text-ice">{p.n}</Link> : p.n}
                    {p.pos ? <span className="ml-1 text-[10px] font-semibold text-slate-600">{p.pos}</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold text-slate-200">{p.di}</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{p.kk}</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{p.hb}</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{p.mk}</td>
                  <td className="px-2 py-1.5 text-right text-slate-400">{p.tk}</td>
                  <td className="px-2 py-1.5 text-right font-semibold text-gold">{p.gl || ""}</td>
                  {hasRuck && <td className="px-2 py-1.5 text-right text-slate-400">{p.ho || ""}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AflwMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = matchBox(id) as BoxScore | undefined;
  if (!m) notFound();
  const slugs = aflwSlugMap();
  const w1 = m.s1 > m.s2, w2 = m.s2 > m.s1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.t1} v ${m.t2}`,
    sport: "Australian rules football",
    startDate: m.date,
    location: m.venue ? { "@type": "Place", name: m.venue } : undefined,
    competitor: [
      { "@type": "SportsTeam", name: m.t1 },
      { "@type": "SportsTeam", name: m.t2 },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <span className="flex items-center gap-2">
        <Link href="/aflw" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href={`/aflw/season/${m.year}`} className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-[#ff5e44]/50">← {m.label} SEASON</Link>
      </span>

      <p className="mt-4 text-[11px] uppercase tracking-widest text-[#ff8d79]">
        AFLW {m.label} · {roundLabel(m.round)}
      </p>
      <div className="mt-2 flex items-center justify-center gap-4 rounded-2xl border border-line bg-pitch-light px-4 py-5 text-center">
        <Link href={`/club/${clubSlug(m.t1)}`} className={`flex-1 font-display text-xl font-black hover:text-ice ${w1 ? "text-slate-100" : "text-slate-500"}`}>{m.t1}</Link>
        <div className="shrink-0 font-display text-3xl font-black">
          <span className={w1 ? "text-grass" : "text-slate-400"}>{m.s1}</span>
          <span className="mx-2 text-slate-600">–</span>
          <span className={w2 ? "text-grass" : "text-slate-400"}>{m.s2}</span>
        </div>
        <Link href={`/club/${clubSlug(m.t2)}`} className={`flex-1 font-display text-xl font-black hover:text-ice ${w2 ? "text-slate-100" : "text-slate-500"}`}>{m.t2}</Link>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">{m.venue} · {m.date}</p>

      <div className="mt-6 grid gap-6">
        <BoxTable team={m.t1} players={m.home} slugs={slugs} />
        <AdSlot slot={AD_SLOTS.content} />
        <BoxTable team={m.t2} players={m.away} slugs={slugs} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href={`/aflw/season/${m.year}`} className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">{m.label} season →</Link>
        <Link href="/aflw/results" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">All AFLW results →</Link>
      </div>
    </main>
  );
}
