import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { careerBySlug, notableCareers } from "@/lib/playerdb";
import { honours } from "@/lib/game/honours";
import { clubColors } from "@/lib/game/clubColors";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return notableCareers().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = careerBySlug(slug);
  if (!c) return {};
  const clubs = [...new Set(c.decades.flatMap((d) => Object.keys(d.c)))];
  return {
    title: `${c.name} — career stats, honours and era rating`,
    description: `${c.name} (${clubs.join(", ")}): season-by-season AFL/VFL stats, Brownlow votes, honours and an era-fair rating of ${Math.round(c.best)}/100, derived from real data.`,
    alternates: { canonical: `/player/${c.slug}` },
  };
}

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = careerBySlug(slug);
  if (!c) notFound();

  const clubs = [...new Set(c.decades.flatMap((d) => Object.keys(d.c)))];
  const years: [number, number] = [
    Math.min(...c.decades.map((d) => d.y[0])),
    Math.max(...c.decades.map((d) => d.y[1])),
  ];
  const games = c.decades.reduce((a, d) => a + d.g, 0);
  const allHonours = [...new Set(c.decades.flatMap((d) => honours(d)))];
  const sea = c.decades
    .flatMap((d) => d.sea ?? [])
    .sort((a, b) => a[0] - b[0]);
  const hasDi = sea.some((s) => s[2] != null);
  const [c1, c2] = clubColors(clubs[0] ?? "");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2"><Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link><Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link></span>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-10 w-4 shrink-0 flex-col overflow-hidden rounded-sm">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </span>
        <div>
          <h1 className="font-display text-4xl font-black">{c.name}</h1>
          <p className="text-sm text-slate-400">
            {clubs.join(", ")} · {years[0]}–{years[1]} · {games} games
            {c.decades[0].h ? ` · ${c.decades[0].h}cm` : ""}
          </p>
        </div>
      </div>

      {allHonours.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allHonours.map((h) => (
            <span key={h} className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold">{h}</span>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-pitch-light p-4">
        <p className="text-[11px] uppercase tracking-widest text-slate-500">era-fair rating by decade</p>
        <div className="mt-2 grid gap-1">
          {c.decades.map((d) => {
            const best = Math.max(d.r.DEF, d.r.MID, d.r.RUC, d.r.FWD);
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-lg bg-pitch px-3 py-1.5 text-sm">
                <span className="w-14 shrink-0 font-display font-black text-slate-200">
                  {d.id.split("|")[1]}s
                </span>
                <span className="flex-1 text-xs text-slate-500">
                  {d.g} games as a {d.nat} · DEF {Math.round(d.r.DEF)} / MID {Math.round(d.r.MID)} / RUC {Math.round(d.r.RUC)} / FWD {Math.round(d.r.FWD)}
                </span>
                <span className="shrink-0 rounded-lg bg-pitch-light px-2 py-0.5 font-display text-lg font-black text-grass">
                  {Math.round(best)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {sea.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">season by season</p>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px] uppercase tracking-wider text-slate-500">
            <span className="text-left">Season</span><span>Games</span>
            <span>{hasDi ? "Disposals" : "Goals"}</span><span>Brownlow votes</span>
          </div>
          <div className="mt-1 grid gap-0.5">
            {sea.map(([yr, gm, di, gl, br]) => (
              <div key={yr} className="grid grid-cols-4 gap-1 rounded bg-pitch px-2 py-1 text-center text-xs text-slate-300">
                <span className="text-left font-display font-black text-slate-100">{yr}</span>
                <span>{gm}</span>
                <span>{hasDi ? (di ?? "—") : (gl ?? "—")}</span>
                <span>{br ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center">
        <Link href="/" className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300">
          DRAFT {c.name.split(" ").slice(-1)[0].toUpperCase()} INTO YOUR TEAM →
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-slate-600">
        Ratings are era-fair and derived from real stats —{" "}
        <Link href="/about" className="underline">methodology</Link> ·{" "}
        <Link href="/greats" className="underline">all the greats</Link>
      </p>
    </main>
  );
}
