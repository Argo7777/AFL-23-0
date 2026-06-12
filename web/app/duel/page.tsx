"use client";

import { useState } from "react";
import Link from "next/link";
import QuickDraft, { bestOpenSlot, QuickPick } from "@/components/QuickDraft";
import Confetti from "@/components/Confetti";
import { loadMeta, loadStrengths, poolStrengths } from "@/lib/game/data";
import { randomSeed } from "@/lib/game/rng";
import { SeriesResult, simulateSeries } from "@/lib/game/sim";
import { Slot, scoreInSlot } from "@/lib/game/types";

const SLOTS: Slot[] = ["DEF", "MID", "RUC", "FWD", "UTL"];

interface DuelPick extends QuickPick {
  slot: Slot;
  score: number;
}

function TeamList({ name, picks, color }: { name: string; picks: DuelPick[]; color: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-pitch-light p-3">
      <p className={`font-display text-lg font-black ${color}`}>{name}</p>
      <div className="mt-1 grid gap-1">
        {picks.map((p, i) => (
          <div key={i} className="flex items-center gap-2 rounded bg-pitch px-2 py-1 text-xs">
            <span className="w-8 shrink-0 font-display font-black text-ice">{p.slot}</span>
            <span className="min-w-0 flex-1 truncate text-slate-200">{p.player.n}</span>
            <span className="shrink-0 font-display font-black text-grass">{Math.round(p.score)}</span>
          </div>
        ))}
        {picks.length === 0 && <p className="py-2 text-center text-xs text-slate-600">no picks yet</p>}
      </div>
    </div>
  );
}

export default function DuelPage() {
  const [picksA, setPicksA] = useState<DuelPick[]>([]);
  const [picksB, setPicksB] = useState<DuelPick[]>([]);
  const [turn, setTurn] = useState<"A" | "B">("A");
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [ratings, setRatings] = useState<[number, number]>([0, 0]);
  const [simming, setSimming] = useState(false);

  const done = picksA.length === 5 && picksB.length === 5;
  const excludeKeys = new Set(
    [...picksA, ...picksB].map((p) => p.player.id.split("|")[0]),
  );

  function takePick(q: QuickPick) {
    const mine = turn === "A" ? picksA : picksB;
    const open = SLOTS.filter((s) => !mine.some((p) => p.slot === s));
    const slot = bestOpenSlot(q.player, open);
    const pick: DuelPick = { ...q, slot, score: scoreInSlot(q.player, slot) };
    if (turn === "A") {
      setPicksA([...picksA, pick]);
      setTurn("B");
    } else {
      setPicksB([...picksB, pick]);
      setTurn("A");
    }
  }

  async function fight() {
    setSimming(true);
    const meta = await loadMeta();
    const { values } = poolStrengths(await loadStrengths(), meta.decades);
    const rA = picksA.reduce((a, p) => a + p.score, 0) / 5;
    const rB = picksB.reduce((a, p) => a + p.score, 0) / 5;
    setRatings([rA, rB]);
    setSeries(simulateSeries(rA, rB, values, randomSeed()));
    setSimming(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2"><Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link><Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link></span>
      <h1 className="font-display mt-4 text-3xl font-black">Draft Duel</h1>
      <p className="mt-1 text-sm text-slate-400">
        Pass the phone. Two coaches alternate spins, five picks each — then the teams
        play a best-of-5 series. Loser buys the pies.
      </p>

      <div className="mt-5 flex gap-3">
        <TeamList name="Coach A" picks={picksA} color={turn === "A" && !done ? "text-grass" : "text-slate-300"} />
        <TeamList name="Coach B" picks={picksB} color={turn === "B" && !done ? "text-grass" : "text-slate-300"} />
      </div>

      {!done ? (
        <div className="mt-4">
          <p className="mb-2 text-center font-display text-lg font-black">
            <span className={turn === "A" ? "text-grass" : "text-gold"}>COACH {turn}</span> — your spin
          </p>
          <QuickDraft
            key={picksA.length + picksB.length}
            prompt={`pick ${turn === "A" ? picksA.length + 1 : picksB.length + 1} of 5`}
            forSlot={null}
            excludeKeys={excludeKeys}
            onPick={takePick}
          />
        </div>
      ) : !series ? (
        <div className="mt-6 text-center">
          <button
            onClick={fight}
            disabled={simming}
            className="rounded-xl bg-grass px-10 py-3.5 font-display text-xl font-black text-pitch hover:bg-lime-300 disabled:opacity-60"
          >
            {simming ? "…" : "⚔️ PLAY THE SERIES"}
          </button>
        </div>
      ) : (
        <div className="pop mt-6 rounded-2xl border border-gold bg-card p-6 text-center">
          {series.won && <Confetti />}
          <p className="text-xs uppercase tracking-widest text-slate-500">best of five</p>
          <p className="font-display mt-1 text-4xl font-black text-gold">
            COACH {series.won ? "A" : "B"} WINS {series.won ? series.myWins : series.theirWins}–
            {series.won ? series.theirWins : series.myWins}
          </p>
          <p className="mt-1 text-lg tracking-wider">{series.games.map((g) => (g ? "🟢" : "🔴")).join("")}</p>
          <p className="mt-1 text-xs text-slate-500">
            (from Coach A&apos;s view) · ratings {ratings[0].toFixed(1)} vs {ratings[1].toFixed(1)}
          </p>
          <button
            onClick={() => { setPicksA([]); setPicksB([]); setSeries(null); setTurn("A"); }}
            className="mt-4 rounded-xl border border-line px-8 py-2.5 font-display text-base font-black text-slate-300 hover:border-grass/50"
          >
            REMATCH
          </button>
        </div>
      )}
    </main>
  );
}
