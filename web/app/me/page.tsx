"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, badges, GameRecord, readProfile, summary } from "@/lib/game/profile";

const MODE_LABEL: Record<string, string> = {
  classic5: "Classic 5", full23: "Full 23", cap23: "Salary Cap",
  gauntlet: "Gauntlet", spoon: "Spoon",
};

export default function MePage() {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [sum, setSum] = useState<ReturnType<typeof summary>>(null);
  const [earned, setEarned] = useState<Badge[]>([]);

  useEffect(() => {
    const p = readProfile();
    setGames([...p.games].reverse());
    setSum(summary(p));
    setEarned(badges(p));
  }, []);

  // win-count sparkline over the last 30 seasons (oldest -> newest)
  const spark = [...games].reverse().slice(-30).filter((g) => g.mode !== "gauntlet");
  const sparkPath = spark
    .map((g, i) => `${i === 0 ? "M" : "L"} ${(i / Math.max(1, spark.length - 1)) * 280},${60 - (g.wins / 23) * 56}`)
    .join(" ");

  const byMode = games.reduce<Record<string, { n: number; w: number; flags: number }>>((acc, g) => {
    (acc[g.mode] ??= { n: 0, w: 0, flags: 0 });
    acc[g.mode].n++;
    acc[g.mode].w += g.wins;
    if (g.flag) acc[g.mode].flags++;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2"><Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link><Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link></span>
      <h1 className="font-display mt-4 text-3xl font-black">My coaching career</h1>
      <p className="mt-1 text-sm text-slate-400">Stored on this device only.</p>

      {!sum ? (
        <div className="mt-8 rounded-2xl border border-line bg-pitch-light p-8 text-center text-slate-400">
          No seasons coached yet — <Link href="/" className="text-grass underline">go draft a team</Link>.
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["Seasons", sum.played, "text-slate-100"],
              ["Premierships", sum.flags, "text-gold"],
              ["Best record", sum.best, "text-grass"],
              ["Perfect 23-0s", sum.perfects, "text-grass"],
            ] as [string, number | string, string][]).map(([label, v, color]) => (
              <div key={label} className="rounded-xl border border-line bg-pitch-light p-3 text-center">
                <div className={`font-display text-2xl font-black ${color}`}>{v}</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          {spark.length >= 3 && (
            <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500">
                wins per season — last {spark.length}
              </p>
              <svg viewBox="0 0 280 64" className="mt-2 w-full">
                <line x1="0" y1={60 - 56} x2="280" y2={60 - 56} stroke="#2b3a5e" strokeDasharray="3 4" strokeWidth="1" />
                <path d={sparkPath} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>0 wins</span><span>top line = 23-0</span>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">by mode</p>
            <div className="mt-2 grid gap-1">
              {Object.entries(byMode).map(([m, s]) => (
                <div key={m} className="flex items-center gap-3 rounded-lg bg-pitch px-3 py-1.5 text-sm">
                  <span className="w-24 shrink-0 font-display font-black text-slate-200">{MODE_LABEL[m] ?? m}</span>
                  <span className="flex-1 text-xs text-slate-500">{s.n} seasons · avg {(s.w / s.n).toFixed(1)} wins</span>
                  {s.flags > 0 && <span className="text-xs text-gold">🏆 ×{s.flags}</span>}
                </div>
              ))}
            </div>
          </div>

          {earned.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {earned.map((b) => (
                <span key={b.label} className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold">
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
            <p className="text-[11px] uppercase tracking-widest text-slate-500">recent seasons</p>
            <div className="mt-2 grid gap-1">
              {games.slice(0, 20).map((g, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg bg-pitch px-3 py-1.5 text-sm">
                  <span className="w-20 shrink-0 text-xs text-slate-500">
                    {new Date(g.t).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                  <span className="flex-1 truncate text-xs text-slate-400">
                    {MODE_LABEL[g.mode] ?? g.mode}{g.daily ? " · daily" : ""} · r{g.rating.toFixed(0)}
                  </span>
                  {g.flag && <span>🏆</span>}
                  <span className={`shrink-0 font-display font-black ${g.mode === "spoon" && g.wins === 0 ? "text-grass" : g.wins >= 18 ? "text-gold" : "text-slate-200"}`}>
                    {g.wins}-{g.losses}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
