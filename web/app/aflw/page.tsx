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
          <p className="text-sm text-slate-400">Women&apos;s AFL — build a team, chase 23-0, plus ladders &amp; results since 2017.</p>
        </div>
      </div>

      {/* play AFLW 23-0 — per-season ratings (2017–2025) */}
      <section className="mt-6 rounded-2xl border border-[#ff5e44]/40 bg-[#ff5e44]/5 p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff8d79]">The game · AFLW edition</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-300">
          Spin a club and <b>season</b>, draft your side from real AFLW stars rated on that year&apos;s form, and chase a perfect record.
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/play?comp=aflw&mode=classic5"
            className="font-display w-full max-w-xs rounded-xl bg-[#ff5e44] px-10 py-4 text-2xl font-black text-white transition hover:scale-105 hover:bg-[#ff7a63] sm:w-auto"
          >
            START THE SPIN ▸
          </Link>
          <Link
            href="/play?comp=aflw&mode=full23"
            className="font-display w-full max-w-xs rounded-xl border border-[#ff5e44]/60 px-8 py-4 text-lg font-black text-[#ff8d79] transition hover:bg-[#ff5e44]/10 sm:w-auto"
          >
            FULL 23
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-600">Separate AFLW leaderboard · 2017–2025 seasons · 12-0 is perfect</p>
      </section>

      {/* every game mode, in AFLW */}
      <section className="mt-6">
        <h2 className="font-display text-sm font-black uppercase tracking-wide text-[#ff8d79]">Game modes · AFLW</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["classic5", "Classic 5", "Five spins, five picks — chase a perfect 12-0."],
            ["full23", "Full 23", "Draft a full match-day side from real AFLW seasons."],
            ["cap23", "Salary Cap 23", "Full squad under a cap — spend like a list manager."],
            ["gauntlet", "The Gauntlet", "Beat every AFLW season's best in a best-of-three."],
            ["spoon", "Wooden Spoon", "Build the worst side and chase a perfect 0-12."],
          ].map(([mode, name, desc]) => (
            <Link
              key={mode}
              href={`/play?comp=aflw&mode=${mode}`}
              className="rounded-2xl border border-line bg-pitch-light p-4 transition hover:border-[#ff5e44]/50 hover:bg-card"
            >
              <div className="font-display text-lg font-black text-slate-100">{name}</div>
              <p className="mt-1 text-sm text-slate-400">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
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

      {/* daily & arcade games, in AFLW */}
      <section className="mt-8">
        <h2 className="font-display text-sm font-black uppercase tracking-wide text-[#ff8d79]">Daily &amp; arcade · AFLW</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["/legend?comp=aflw", "Guess the Legend", "A mystery AFLW great per day — six clues."],
            ["/battler?comp=aflw", "Guess the Battler", "Name the honest AFLW toiler. Real fans only."],
            ["/higher?comp=aflw", "Higher or Lower", "Two AFLW players, one stat — pick the bigger number."],
            ["/tips?comp=aflw", "The Tipping Run", "Pick real AFLW results — upsets score double points."],
            ["/dynasty?comp=aflw", "Dynasty", "Coach an AFLW era — your stars age and retire."],
            ["/rebuild?comp=aflw", "The Rebuild", "Drag an AFLW basket case to a flag, one trade a year."],
            ["/duel?comp=aflw", "Draft Duel", "Two coaches, one phone — alternating AFLW spins."],
          ].map(([href, name, desc]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-line bg-pitch-light p-4 transition hover:border-[#ff5e44]/50 hover:bg-card"
            >
              <div className="font-display text-lg font-black text-slate-100">{name}</div>
              <p className="mt-1 text-sm text-slate-400">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <AdSlot slot={AD_SLOTS.content} className="mt-6" />

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/aflw/greats" className="rounded-xl border border-line bg-pitch-light px-4 py-2 font-display font-black text-slate-200 hover:border-[#ff5e44]/50">Players &amp; Greats →</Link>
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
