"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BASE_PATH, loadMeta } from "@/lib/game/data";
import {
  Badge, badges, dailyNumber, GameRecord, readProfile, summary, todaysDaily,
} from "@/lib/game/profile";
import { Meta, Mode } from "@/lib/game/types";

const MODES: { id: Mode; name: string; tag: string; desc: string }[] = [
  {
    id: "classic5",
    name: "Classic 5",
    tag: "the original",
    desc: "Five spins, five picks — one per line: DEF, MID, RUC, FWD and a Utility. Chase 23-0.",
  },
  {
    id: "full23",
    name: "Full 23",
    tag: "deep squad",
    desc: "Draft a true match-day 23: back six, forward six, wingers and centre, two followers, a ruck — and five on the bench.",
  },
  {
    id: "cap23",
    name: "Salary Cap 23",
    tag: "hard mode",
    desc: "Full 23 under a salary cap. Stars cost a fortune — spend like a list manager.",
  },
  {
    id: "gauntlet",
    name: "The Gauntlet",
    tag: "survival",
    desc: "Pick five, then survive every decade of history in order — 12+ wins in each era or the run ends.",
  },
  {
    id: "spoon",
    name: "Wooden Spoon",
    tag: "anti-footy",
    desc: "Build the WORST side imaginable and chase a perfect 0-23. Harder than it sounds.",
  },
];

export default function Home() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [mode, setMode] = useState<Mode>("classic5");
  const [eras, setEras] = useState<Set<number>>(new Set());
  const [daily, setDaily] = useState<GameRecord | null>(null);
  const [prof, setProf] = useState<{ s: ReturnType<typeof summary>; b: Badge[] } | null>(null);
  const [oneClub, setOneClub] = useState("");
  const [otd, setOtd] = useState<{ y: number; r: string; t1: string; s1: number; t2: string; s2: number } | null>(null);

  useEffect(() => {
    loadMeta().then((m) => {
      setMeta(m);
      // default to the modern game; the full 130 years is one tap away
      setEras(new Set(m.decades.filter((d) => d >= 1980)));
    });
    setDaily(todaysDaily() ?? null);
    const p = readProfile();
    setProf({ s: summary(p), b: badges(p) });
    // today's slice of footy history (Melbourne time)
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Melbourne", month: "2-digit", day: "2-digit",
    }).format(new Date()).replace("/", "-");
    fetch(`${BASE_PATH}/data/onthisday.json`)
      .then((r) => r.json())
      .then((d) => setOtd(d[key] ?? null))
      .catch(() => {});
  }, []);

  const toggleEra = (d: number) => {
    setEras((prev) => {
      const next = new Set(prev);
      if (next.has(d)) {
        if (next.size > 1) next.delete(d);
      } else {
        next.add(d);
      }
      return next;
    });
  };

  const allEras = meta ? eras.size === meta.decades.length : true;
  const eraParam = meta ? `&eras=${[...eras].sort((a, b) => a - b).join(",")}` : "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="text-center">
        <div className="relative inline-block">
          <div className="hero-glow" aria-hidden />
          <div className="font-display relative text-7xl font-black tracking-tight text-grass">
            23<span className="text-slate-500">–</span>0
          </div>
        </div>
        <p className="mt-1 text-sm uppercase tracking-[0.3em] text-slate-400">
          AFL all-era edition
        </p>
        <p className="mx-auto mt-4 max-w-xl text-slate-300">
          Spin a club and an era from 130 years of VFL/AFL footy, pick a player,
          build your side — then see if it could run a season undefeated.
          Every rating is derived from real career stats and honours.
        </p>
      </header>

      {/* how it works */}
      <section className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["🎰", "Spin", "a random club and decade"],
          ["🧠", "Pick", "any player from that pool"],
          ["🏉", "Place", "them on the oval — position matters"],
          ["🏆", "Simulate", "a real season. Chase 23-0."],
        ].map(([emoji, title, desc]) => (
          <div key={title as string} className="rounded-xl border border-line bg-pitch-light p-3 text-center">
            <div className="text-xl">{emoji}</div>
            <div className="font-display text-sm font-black text-slate-100">{title}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{desc}</div>
          </div>
        ))}
      </section>

      {/* daily challenge */}
      <section className="mt-8 rounded-2xl border border-gold/60 bg-card p-5 shadow-[0_0_24px_-8px] shadow-gold/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gold">
              one attempt · same spins for everyone · all 14 decades
            </div>
            <div className="font-display mt-1 text-2xl font-black">
              Daily Challenge <span className="text-gold">#{dailyNumber()}</span>
            </div>
            {daily ? (
              <p className="mt-1 text-sm text-slate-300">
                Today: <b className="text-grass">{daily.wins}-{daily.losses}</b>
                {daily.flag ? " 🏆" : ""} — back tomorrow for #{dailyNumber() + 1}.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                Five picks, the whole world gets the same clubs and eras. Post your record.
              </p>
            )}
          </div>
          <Link
            href="/play?daily=1"
            className={`font-display rounded-xl px-6 py-3 text-lg font-black transition ${
              daily
                ? "border border-line text-slate-400 hover:border-gold/50"
                : "bg-gold text-pitch hover:scale-105"
            }`}
          >
            {daily ? "PLAY AGAIN (UNRANKED)" : "PLAY TODAY'S"}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === m.id
                ? "border-grass bg-card shadow-[0_0_24px_-6px] shadow-grass/40"
                : "border-line bg-pitch-light hover:bg-card"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-gold">{m.tag}</div>
            <div className="font-display mt-1 text-2xl font-black">{m.name}</div>
            <p className="mt-2 text-sm text-slate-400">{m.desc}</p>
          </button>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-pitch-light p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-black">Eras in play</h2>
          {meta && (
            <button
              className="text-xs font-semibold uppercase tracking-wider text-ice hover:underline"
              onClick={() =>
                setEras(allEras ? new Set([meta.decades[meta.decades.length - 1]]) : new Set(meta.decades))
              }
            >
              {allEras ? "pick one era" : "select all"}
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Your spins only land on these decades — and your season is simulated against the real
          teams of these decades.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {meta?.decades.map((d) => (
            <button
              key={d}
              onClick={() => toggleEra(d)}
              className={`rounded-full border px-4 py-1.5 font-display text-sm font-bold transition ${
                eras.has(d)
                  ? "border-grass bg-grass/15 text-grass"
                  : "border-line text-slate-500 hover:text-slate-300"
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </section>

      {/* one-club legends */}
      <section className="mt-8 rounded-2xl border border-line bg-pitch-light p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-black">One-Club Legends</h2>
            <p className="mt-1 text-xs text-slate-500">
              Build the best 23 in your club&apos;s history — spins roll only the decades your club existed.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={oneClub}
              onChange={(e) => setOneClub(e.target.value)}
              className="rounded-xl border border-line bg-card px-3 py-2 font-display text-sm font-black text-slate-200 outline-none focus:border-grass/60"
            >
              <option value="">Pick your club…</option>
              {meta &&
                [...new Set(Object.values(meta.clubsByDecade).flat())].sort().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
            <Link
              href={oneClub ? `/play?mode=full23&club=${encodeURIComponent(oneClub)}` : "#"}
              aria-disabled={!oneClub}
              className={`rounded-xl px-5 py-2 font-display text-sm font-black ${
                oneClub
                  ? "bg-grass text-pitch hover:bg-lime-300"
                  : "pointer-events-none border border-line text-slate-600"
              }`}
            >
              DRAFT →
            </Link>
          </div>
        </div>
      </section>

      {/* on this day */}
      {otd && (
        <section className="mt-8 rounded-2xl border border-line bg-pitch-light px-5 py-4 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ice">
            on this day in {otd.y}
          </span>
          <p className="mt-1 text-sm text-slate-300">
            <b className={otd.s1 > otd.s2 ? "text-grass" : ""}>{otd.t1} {otd.s1}</b>
            {" "}{otd.s1 > otd.s2 ? "defeated" : otd.s1 === otd.s2 ? "drew with" : "fell to"}{" "}
            <b className={otd.s2 > otd.s1 ? "text-grass" : ""}>{otd.t2} {otd.s2}</b>
            {otd.r === "GF" ? " in the Grand Final" : /^(PF|SF|QF|EF)$/.test(otd.r) ? " in a final" : ` in round ${otd.r.slice(1)}`}.
          </p>
        </section>
      )}

      {/* more games */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/legend"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            daily mystery · 6 guesses
          </div>
          <div className="font-display mt-1 text-2xl font-black">
            Guess the Legend <span className="text-ice">#{dailyNumber()}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            One mystery great per day. Every miss unlocks a clue — era, stats, honours, clubs.
          </p>
        </Link>
        <Link
          href="/battler"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            daily cult hero · 6 guesses
          </div>
          <div className="font-display mt-1 text-2xl font-black">
            Guess the Battler <span className="text-ice">#{dailyNumber()}</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            No superstars — name the honest toiler. Only real fans survive this one.
          </p>
        </Link>
        <Link
          href="/higher"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            endless streak
          </div>
          <div className="font-display mt-1 text-2xl font-black">Higher or Lower</div>
          <p className="mt-2 text-sm text-slate-400">
            Two players, one stat — who averaged more? Real numbers, brutal streaks.
          </p>
        </Link>
        <Link
          href="/awarded"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            award trivia streak
          </div>
          <div className="font-display mt-1 text-2xl font-black">Who Won It?</div>
          <p className="mt-2 text-sm text-slate-400">
            Near-identical seasons, one Brownlow. Pick the winner from the stat lines.
          </p>
        </Link>
        <Link
          href="/tips"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            tip real history
          </div>
          <div className="font-display mt-1 text-2xl font-black">The Tipping Run</div>
          <p className="mt-2 text-sm text-slate-400">
            Real matches since 1920. Tip winners, ride the streak — underdogs pay double.
          </p>
        </Link>
        <Link
          href="/greats"
          className="lift rounded-2xl border border-line bg-pitch-light p-5 hover:border-ice/50 hover:bg-card"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ice">
            the hall of fame
          </div>
          <div className="font-display mt-1 text-2xl font-black">The Greats</div>
          <p className="mt-2 text-sm text-slate-400">
            Every decade&apos;s top 25, by position and club. Settle the pub argument.
          </p>
        </Link>
      </section>

      {/* coach's record */}
      {prof?.s && (
        <section className="mt-8 rounded-2xl border border-line bg-pitch-light p-5">
          <h2 className="font-display text-xl font-black">Your coaching record</h2>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-300">
            <span>Seasons <b className="font-display text-lg text-slate-100">{prof.s.played}</b></span>
            <span>Premierships <b className="font-display text-lg text-gold">{prof.s.flags}</b></span>
            <span>Best <b className="font-display text-lg text-grass">{prof.s.best}</b></span>
            {prof.s.perfects > 0 && (
              <span>Perfect seasons <b className="font-display text-lg text-grass">{prof.s.perfects}</b></span>
            )}
          </div>
          {prof.b.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prof.b.map((b) => (
                <span
                  key={b.label}
                  className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold"
                >
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] text-slate-600">Stored on this device only.</p>
        </section>
      )}

      <div className="mt-8 text-center">
        <Link
          href={`/play?mode=${mode}${eraParam}`}
          className="font-display inline-block rounded-xl bg-grass px-12 py-4 text-2xl font-black text-pitch transition hover:scale-105 hover:bg-lime-300"
        >
          START THE SPIN
        </Link>
        {meta && (
          <p className="mt-4 text-xs text-slate-600">
            {meta.decades.length} decades · data generated{" "}
            {new Date(meta.generatedAt).toLocaleDateString()} from{" "}
            {meta.sources.join(", ")} ·{" "}
            <Link href="/greats" className="text-slate-400 underline hover:text-ice">
              the greats
            </Link>{" "}
            ·{" "}
            <Link href="/about" className="text-slate-400 underline hover:text-ice">
              about the numbers
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
