"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDecade, loadMeta } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { honours } from "@/components/PlayerCard";
import { PlayerEntry } from "@/lib/game/types";

export default function GreatsPage() {
  const [decades, setDecades] = useState<number[]>([]);
  const [decade, setDecade] = useState(0);
  const [pos, setPos] = useState<"ALL" | "DEF" | "MID" | "RUC" | "FWD">("ALL");
  const [pool, setPool] = useState<PlayerEntry[]>([]);

  useEffect(() => {
    loadMeta().then((m) => {
      setDecades(m.decades);
      setDecade(m.decades[m.decades.length - 1]);
    });
  }, []);

  useEffect(() => {
    if (decade) loadDecade(decade).then(setPool);
  }, [decade]);

  const best = (p: PlayerEntry) =>
    pos === "ALL" ? Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD) : p.r[pos];
  const top = [...pool]
    .filter((p) => pos === "ALL" || p.elig.includes(pos))
    .sort((a, b) => best(b) - best(a))
    .slice(0, 25);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
      <h1 className="font-display mt-4 text-3xl font-black">The Greats, decade by decade</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every player rated from real stats, Brownlow votes and honours — era-fair, so the
        champions of 1925 stand beside the champions of 2025.{" "}
        <Link href="/about" className="text-ice underline">How the ratings work</Link>.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {decades.map((d) => (
          <button
            key={d}
            onClick={() => setDecade(d)}
            className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
              decade === d ? "border-gold bg-gold/15 text-gold" : "border-line text-slate-400 hover:border-gold/50"
            }`}
          >
            {d}s
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {(["ALL", "DEF", "MID", "RUC", "FWD"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={`rounded-full border px-3 py-1 font-display text-xs font-black transition ${
              pos === p ? "border-grass bg-grass/15 text-grass" : "border-line text-slate-400 hover:border-grass/50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-1.5">
        {top.map((p, i) => {
          const club = Object.keys(p.c)[0] ?? "";
          const hon = honours(p).slice(0, 3);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2"
              style={{ borderLeft: `4px solid ${clubColors(club)[0]}` }}
            >
              <span className="w-7 shrink-0 text-right font-display text-sm font-black text-slate-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <span className="font-display text-base font-black">{p.n}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {Object.keys(p.c).join(", ")} · {p.g} games · {p.nat}
                  </span>
                </div>
                {hon.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {hon.map((h) => (
                      <span key={h} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="shrink-0 rounded-lg bg-pitch px-2 py-1 font-display text-lg font-black text-grass">
                {Math.round(best(p))}
              </span>
            </div>
          );
        })}
        {top.length === 0 && <p className="text-sm text-slate-500">loading the {decade}s…</p>}
      </div>

      <p className="mt-6 text-center">
        <Link
          href="/"
          className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300"
        >
          DRAFT THESE LEGENDS →
        </Link>
      </p>
    </main>
  );
}
