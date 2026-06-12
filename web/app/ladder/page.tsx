"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BoardEntry, fetchBoard, LEADERBOARD_URL } from "@/lib/game/leaderboard";
import { dailyNumber, todayMelbourne } from "@/lib/game/profile";

function Board({ title, entries }: { title: string; entries: BoardEntry[] }) {
  return (
    <section className="rounded-2xl border border-line bg-pitch-light p-4">
      <h2 className="font-display text-lg font-black text-gold">{title}</h2>
      <div className="mt-2 grid gap-1">
        {entries.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">No entries yet — be the first.</p>
        )}
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-pitch px-3 py-1.5 text-sm">
            <span className={`w-6 shrink-0 text-right font-display font-black ${i < 3 ? "text-gold" : "text-slate-500"}`}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-display font-black text-slate-100">
              {e.n} {e.f && "🏆"}
            </span>
            <span className="shrink-0 text-xs text-slate-500">r{e.r.toFixed(0)}</span>
            <span className="w-12 shrink-0 text-right font-display font-black text-grass">
              {e.w}-{e.l}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LadderPage() {
  const [board, setBoard] = useState<{ daily: BoardEntry[]; alltime: BoardEntry[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchBoard(todayMelbourne()).then((b) => {
      setBoard(b);
      setLoaded(true);
    });
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
      <h1 className="font-display mt-4 text-3xl font-black">The Global Ladder</h1>
      <p className="mt-1 text-sm text-slate-400">
        Best seasons from coaches everywhere. Post a score from any result screen.
      </p>

      {!LEADERBOARD_URL || (loaded && !board) ? (
        <div className="mt-8 rounded-2xl border border-line bg-pitch-light p-8 text-center text-slate-400">
          The global ladder is warming up — check back soon. 🏗️
        </div>
      ) : !loaded ? (
        <p className="mt-8 text-center text-slate-500">loading the ladder…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Board title={`Daily #${dailyNumber()} — today`} entries={board!.daily} />
          <Board title="All-time best seasons" entries={board!.alltime} />
        </div>
      )}
    </main>
  );
}
