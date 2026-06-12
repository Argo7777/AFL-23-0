"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadDecade, loadMeta } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { PlayerEntry } from "@/lib/game/types";

const BEST_KEY = "afl230-higher-best";

interface Question {
  decade: number;
  a: PlayerEntry;
  b: PlayerEntry;
  label: string;
  value: (p: PlayerEntry) => number;
  fmt: (v: number) => string;
}

const STATS: { key: string; label: string; get: (p: PlayerEntry) => number | null; fmt: (v: number) => string }[] = [
  { key: "di", label: "averaged more disposals per game", get: (p) => p.st.di ?? null, fmt: (v) => v.toFixed(1) },
  { key: "gl", label: "kicked more goals per game", get: (p) => p.st.gl ?? null, fmt: (v) => v.toFixed(1) },
  { key: "mk", label: "took more marks per game", get: (p) => p.st.mk ?? null, fmt: (v) => v.toFixed(1) },
  { key: "tk", label: "laid more tackles per game", get: (p) => p.st.tk ?? null, fmt: (v) => v.toFixed(1) },
  { key: "g", label: "played more games that decade", get: (p) => p.g, fmt: (v) => String(Math.round(v)) },
  { key: "h", label: "is taller", get: (p) => p.h ?? null, fmt: (v) => `${Math.round(v)}cm` },
  { key: "bw", label: "polled more Brownlow votes that decade", get: (p) => p.a.bw, fmt: (v) => String(Math.round(v)) },
];

export default function HigherPage() {
  const [decades, setDecades] = useState<number[]>([]);
  const [q, setQ] = useState<Question | null>(null);
  const [reveal, setReveal] = useState<"a" | "b" | null>(null); // chosen card
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    loadMeta().then((m) => setDecades(m.decades.filter((d) => d >= 1970)));
    setBest(Number(localStorage.getItem(BEST_KEY) ?? 0));
  }, []);

  const nextQuestion = useCallback(async (): Promise<void> => {
    const d = decades[Math.floor(Math.random() * decades.length)];
    const pool = (await loadDecade(d)).filter((p) => p.g >= 45);
    for (let attempt = 0; attempt < 60; attempt++) {
      const a = pool[Math.floor(Math.random() * pool.length)];
      const b = pool[Math.floor(Math.random() * pool.length)];
      if (!a || !b || a.id === b.id) continue;
      const stat = STATS[Math.floor(Math.random() * STATS.length)];
      const va = stat.get(a);
      const vb = stat.get(b);
      if (va == null || vb == null || va === vb) continue;
      // skip gimmes where one side is near zero on a rate stat
      if (stat.key !== "h" && stat.key !== "g" && Math.min(va, vb) === 0 && Math.max(va, vb) > 2) continue;
      setQ({ decade: d, a, b, label: stat.label, value: (p) => stat.get(p)!, fmt: stat.fmt });
      setReveal(null);
      return;
    }
    return nextQuestion();
  }, [decades]);

  useEffect(() => {
    if (decades.length && !q) nextQuestion();
  }, [decades, q, nextQuestion]);

  function answer(side: "a" | "b") {
    if (!q || reveal || busy.current) return;
    busy.current = true;
    setReveal(side);
    const correct = q.value(q[side]) > q.value(side === "a" ? q.b : q.a);
    setTimeout(() => {
      busy.current = false;
      if (correct) {
        setStreak((s) => s + 1);
        nextQuestion();
      } else {
        const finalStreak = streak;
        if (finalStreak > best) {
          setBest(finalStreak);
          localStorage.setItem(BEST_KEY, String(finalStreak));
        }
        setOver(true);
      }
    }, 1400);
  }

  function restart() {
    setStreak(0);
    setOver(false);
    setQ(null);
  }

  if (!q) {
    return <main className="flex min-h-dvh items-center justify-center text-slate-400">shuffling the decks…</main>;
  }

  const Card = ({ side }: { side: "a" | "b" }) => {
    const p = q[side];
    const [c1, c2] = clubColors(Object.keys(p.c)[0] ?? "");
    const v = q.value(p);
    const otherV = q.value(side === "a" ? q.b : q.a);
    const isWinner = v > otherV;
    return (
      <button
        onClick={() => answer(side)}
        disabled={!!reveal}
        className={`flex-1 rounded-2xl border p-5 text-center transition ${
          reveal
            ? isWinner
              ? "border-grass bg-grass/10"
              : "border-hot bg-hot/10 opacity-80"
            : "border-line bg-card hover:border-grass/60 hover:bg-card-hover"
        }`}
      >
        <div className="mx-auto flex h-1.5 w-16 overflow-hidden rounded-full">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </div>
        <div className="font-display mt-3 text-2xl font-black leading-tight">{p.n}</div>
        <div className="mt-1 text-xs text-slate-400">
          {Object.keys(p.c)[0]} · {q.decade}s · {p.nat}
        </div>
        <div className={`font-display mt-4 text-4xl font-black ${reveal ? (isWinner ? "text-grass" : "text-hot") : "text-slate-600"}`}>
          {reveal ? q.fmt(v) : "?"}
        </div>
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
            Who <span className="text-gold">{q.label}</span>?
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500">both from the {q.decade}s — tap your pick</p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Card side="a" />
            <Card side="b" />
          </div>
        </>
      ) : (
        <div className="pop mt-10 rounded-2xl border border-line bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">streak over</p>
          <div className="font-display mt-1 text-7xl font-black text-grass">{streak}</div>
          <p className="mt-1 text-sm text-slate-400">
            {streak >= best && streak > 0 ? "New personal best!" : `Best: ${best}`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={restart}
              className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch hover:bg-lime-300"
            >
              GO AGAIN
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `I hit a streak of ${streak} on AFL Higher or Lower 📊 Beat it: https://afl23-0.com/higher/`,
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
