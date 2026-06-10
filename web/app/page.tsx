"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadMeta } from "@/lib/game/data";
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
];

export default function Home() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [mode, setMode] = useState<Mode>("classic5");
  const [eras, setEras] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadMeta().then((m) => {
      setMeta(m);
      // default to the modern game; the full 130 years is one tap away
      setEras(new Set(m.decades.filter((d) => d >= 1980)));
    });
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
        <div className="font-display text-7xl font-black tracking-tight text-grass">
          23<span className="text-slate-500">–</span>0
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
            <Link href="/about" className="text-slate-400 underline hover:text-ice">
              about the numbers
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
