import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About AFL 23-0",
  description: "What AFL 23-0 is, how players are rated from 130 years of real VFL/AFL data, where the stats come from, and who makes it.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link>
      </span>

      <h1 className="font-display mt-4 text-3xl font-black">About AFL 23-0</h1>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-slate-300">
        <p>
          <b className="text-slate-100">AFL 23-0</b> is a free, fan-made footy game and statistics site.
          You spin a random club and decade from 130 years of VFL/AFL history, draft your side, and
          simulate a season chasing a perfect 23–0 record. Alongside the game, the site is a deep
          reference: <Link href="/ladder" className="text-ice underline">live ladders</Link>,{" "}
          <Link href="/results" className="text-ice underline">fixtures &amp; results</Link>,{" "}
          <Link href="/seasons" className="text-ice underline">every season since 1897</Link>,{" "}
          <Link href="/premierships" className="text-ice underline">premiership history</Link>,{" "}
          <Link href="/clubs" className="text-ice underline">club pages</Link> and thousands of{" "}
          <Link href="/greats" className="text-ice underline">player ratings</Link> — plus a full{" "}
          <Link href="/aflw" className="text-ice underline">AFLW section</Link>.
        </p>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">How players are rated</h2>
          <p className="mt-2">
            Every player is rated <b>within their own era</b>, against the peers they actually played
            against. We standardise per-game statistics decade by decade and blend in real honours —
            Brownlow votes, All-Australian selections, premierships from actual Grand Final line-ups and
            leading-goalkicker titles. Each decade is calibrated to the same scale, so the champions of
            the 1920s can stand beside the champions of the 2020s on a fair footing. No ratings are
            hand-typed or invented — every number is derived from real data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Where the data comes from</h2>
          <p className="mt-2">
            Historical results and per-season player statistics come from public records at{" "}
            <a href="https://afltables.com" target="_blank" rel="noopener noreferrer" className="text-ice underline">afltables.com</a>{" "}
            (1897–present) and{" "}
            <a href="https://www.footywire.com" target="_blank" rel="noopener noreferrer" className="text-ice underline">footywire.com</a>{" "}
            (awards, positions and profiles, 1965+). AFLW fixtures and results come from the official AFL
            data feed. Data is refreshed regularly through the season.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Not affiliated with the AFL</h2>
          <p className="mt-2">
            AFL 23-0 is an independent fan project. It is not affiliated with, endorsed by, or sponsored
            by the Australian Football League, the AFLW, or any club. All club names and trademarks belong
            to their respective owners and are used for identification only.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-black text-slate-100">Free to play</h2>
          <p className="mt-2">
            Every mode, daily challenge and stats page is free, with no account required. The site is
            supported by advertising and by readers who{" "}
            <a href="https://ko-fi.com/danieltomaro" target="_blank" rel="noopener noreferrer" className="text-ice underline">shout the coach a coffee</a>.
            See our <Link href="/privacy" className="text-ice underline">privacy policy</Link> for how ads
            and data are handled.
          </p>
        </section>
      </div>

      <p className="mt-8 text-center">
        <Link href="/" className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300">
          PLAY AFL 23-0 →
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-slate-600">
        <Link href="/privacy" className="underline hover:text-ice">Privacy</Link> ·{" "}
        <Link href="/contact" className="underline hover:text-ice">Contact</Link>
      </p>
    </main>
  );
}
