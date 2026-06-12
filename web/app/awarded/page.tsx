"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BASE_PATH, loadDecade } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { PlayerEntry } from "@/lib/game/types";

const BEST_KEY = "afl230-awarded-best";

interface Awards {
  aa: Record<string, string[]>;
  brownlow: Record<string, string>;
  coleman: Record<string, string>;
}

type AwardKind = "brownlow" | "aa" | "coleman";

const QUESTION: Record<AwardKind, (y: number) => string> = {
  brownlow: (y) => `Who won the ${y} Brownlow Medal?`,
  aa: (y) => `Who was All-Australian in ${y}?`,
  coleman: (y) => `Who won the ${y} ${y >= 1955 ? "Coleman Medal" : "leading goalkicker award"}?`,
};

interface Card {
  p: PlayerEntry;
  year: number;
  gm: number;
  di: number | null;
  gl: number | null;
  br: number | null;
}

interface Round {
  kind: AwardKind;
  year: number;
  a: Card;
  b: Card;
  winner: "a" | "b";
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").trim();
/** awards lists use "G McKenna"; players are "Guy McKenna" */
function nameMatches(awardName: string, fullName: string): boolean {
  const a = norm(awardName);
  const f = norm(fullName);
  if (a === f) return true;
  const m = a.match(/^([a-z])\s+(.+)$/);
  return !!m && f.startsWith(m[1]) && f.endsWith(` ${m[2]}`);
}

function seasonOf(p: PlayerEntry, year: number) {
  const s = p.sea?.find((x) => x[0] === year);
  if (!s || s[1] < 8) return null;
  return { gm: s[1], di: s[2] != null ? s[2] / s[1] : null, gl: s[3] != null ? s[3] / s[1] : null, br: s[4] };
}

export default function AwardedPage() {
  const [awards, setAwards] = useState<Awards | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [reveal, setReveal] = useState(false);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    fetch(`${BASE_PATH}/data/awards.json`).then((r) => r.json()).then(setAwards);
    setBest(Number(localStorage.getItem(BEST_KEY) ?? 0));
  }, []);

  const nextRound = useCallback(async (): Promise<void> => {
    if (!awards) return;
    for (let attempt = 0; attempt < 60; attempt++) {
      const kind: AwardKind = (["brownlow", "aa", "coleman", "aa"] as AwardKind[])[
        Math.floor(Math.random() * 4)
      ];
      const years = Object.keys(kind === "aa" ? awards.aa : kind === "brownlow" ? awards.brownlow : awards.coleman)
        .map(Number)
        .filter((y) => (kind === "coleman" ? y >= 1930 : y >= 1965));
      const year = years[Math.floor(Math.random() * years.length)];
      const winnerNames = kind === "aa" ? awards.aa[year] : [awards[kind][year]];
      if (!winnerNames?.length) continue;
      const winnerName = winnerNames[Math.floor(Math.random() * winnerNames.length)];

      const pool = await loadDecade(Math.floor(year / 10) * 10);
      const winner = pool.find((p) => nameMatches(winnerName, p.n) && seasonOf(p, year));
      if (!winner) continue;
      const ws = seasonOf(winner, year)!;

      // a believable decoy: same year, similar output, did NOT win
      const isWinnerName = (p: PlayerEntry) =>
        winnerNames.some((w) => nameMatches(w, p.n)) ||
        (kind !== "aa" && nameMatches(awards[kind][year] ?? "", p.n));
      const decoys = pool.filter((p) => {
        if (p.id === winner.id || isWinnerName(p)) return false;
        const s = seasonOf(p, year);
        if (!s || s.gm < 12) return false;
        if (kind === "brownlow" && (s.br ?? 0) > 4) return false; // genuinely didn't poll
        if (kind === "coleman") return (s.gl ?? 0) > 1 && (s.gl ?? 0) < (ws.gl ?? 99) * 0.95;
        if (ws.di != null && s.di != null) return Math.abs(s.di - ws.di) / ws.di < 0.2;
        if (ws.gl != null && s.gl != null) return Math.abs(s.gl - ws.gl) < 0.8;
        return false;
      });
      if (!decoys.length) continue;
      const decoy = decoys[Math.floor(Math.random() * decoys.length)];
      const ds = seasonOf(decoy, year)!;

      const winnerFirst = Math.random() < 0.5;
      const wCard: Card = { p: winner, year, ...ws };
      const dCard: Card = { p: decoy, year, ...ds };
      setRound({
        kind, year,
        a: winnerFirst ? wCard : dCard,
        b: winnerFirst ? dCard : wCard,
        winner: winnerFirst ? "a" : "b",
      });
      setReveal(false);
      return;
    }
  }, [awards]);

  useEffect(() => {
    if (awards && !round) nextRound();
  }, [awards, round, nextRound]);

  function answer(side: "a" | "b") {
    if (!round || reveal || busy.current) return;
    busy.current = true;
    setReveal(true);
    const correct = side === round.winner;
    setTimeout(() => {
      busy.current = false;
      if (correct) {
        setStreak((s) => s + 1);
        nextRound();
      } else {
        if (streak > best) {
          setBest(streak);
          localStorage.setItem(BEST_KEY, String(streak));
        }
        setOver(true);
      }
    }, 1800);
  }

  if (!round) {
    return <main className="flex min-h-dvh items-center justify-center text-slate-400">digging through the archives…</main>;
  }

  const CardView = ({ side }: { side: "a" | "b" }) => {
    const c = round[side];
    const isWinner = side === round.winner;
    const club = Object.keys(c.p.c)[0] ?? "";
    return (
      <button
        onClick={() => answer(side)}
        disabled={reveal}
        className={`flex-1 rounded-2xl border p-5 text-center transition ${
          reveal
            ? isWinner
              ? "border-gold bg-gold/10"
              : "border-line bg-card opacity-60"
            : "border-line bg-card hover:border-gold/60 hover:bg-card-hover"
        }`}
      >
        <div className="mx-auto flex h-1.5 w-16 overflow-hidden rounded-full">
          <span className="flex-1" style={{ background: clubColors(club)[0] }} />
          <span className="flex-1" style={{ background: clubColors(club)[1] }} />
        </div>
        <div className="font-display mt-3 text-2xl font-black leading-tight">{c.p.n}</div>
        <div className="mt-1 text-xs text-slate-400">{club} · {round.year}</div>
        <div className="mt-3 grid gap-0.5 text-sm text-slate-300">
          <span>{c.gm} games</span>
          {c.di != null && <span>{c.di.toFixed(1)} disposals/game</span>}
          {c.gl != null && c.gl > 0.2 && <span>{c.gl.toFixed(1)} goals/game</span>}
        </div>
        {reveal && (
          <div className={`font-display mt-3 text-lg font-black ${isWinner ? "text-gold" : "text-slate-600"}`}>
            {isWinner
              ? round.kind === "brownlow" ? `🏅 WON IT${c.br != null ? ` — ${c.br} votes` : ""}`
                : round.kind === "aa" ? "🏅 ALL-AUSTRALIAN" : "🏅 WON IT"
              : round.kind === "brownlow" ? `${c.br ?? 0} votes` : "missed out"}
          </div>
        )}
      </button>
    );
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <div className="text-sm text-slate-400">
          Streak <b className="font-display text-xl text-grass">{streak}</b>
          <span className="mx-2 text-slate-600">·</span>
          Best <b className="font-display text-xl text-gold">{best}</b>
        </div>
      </div>

      {!over ? (
        <>
          <h1 className="font-display mt-6 text-center text-2xl font-black sm:text-3xl">
            {QUESTION[round.kind](round.year)}
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            similar seasons — only one took home the silverware
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <CardView side="a" />
            <CardView side="b" />
          </div>
        </>
      ) : (
        <div className="pop mt-10 rounded-2xl border border-line bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">streak over</p>
          <div className="font-display mt-1 text-7xl font-black text-gold">{streak}</div>
          <p className="mt-1 text-sm text-slate-400">
            {streak >= best && streak > 0 ? "New personal best!" : `Best: ${best}`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { setStreak(0); setOver(false); setRound(null); }}
              className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch hover:bg-lime-300"
            >
              GO AGAIN
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `I picked ${streak} award winners straight on AFL 23-0 🏅 Beat it: https://afl23-0.com/awarded/`,
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl border border-gold px-8 py-3 font-display text-lg font-black text-gold hover:bg-gold/10"
            >
              {copied ? "COPIED!" : "SHARE STREAK"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
