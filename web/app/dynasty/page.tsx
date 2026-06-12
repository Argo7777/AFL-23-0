"use client";

import { useState } from "react";
import Link from "next/link";
import QuickDraft, { bestOpenSlot, QuickPick } from "@/components/QuickDraft";
import Confetti from "@/components/Confetti";
import { playerAge } from "@/lib/game/finals";
import { quickSeason, QuickSeasonResult } from "@/lib/game/quickSim";
import { Slot, scoreInSlot } from "@/lib/game/types";

const SLOTS: Slot[] = ["DEF", "MID", "RUC", "FWD", "UTL"];
const RETIRE_AGE = 33;
const AGE_DECAY = 1.5; // rating lost per extra season of wear
const MAX_SEASONS = 12;

interface DynastyPlayer {
  name: string;
  club: string;
  decade: number;
  key: string;
  baseScore: number;
  startAge: number;
}

interface SeasonRow extends QuickSeasonResult {
  year: number;
  retirements: string[];
}

const currentScore = (p: DynastyPlayer, seasonsPlayed: number) =>
  Math.max(20, p.baseScore - AGE_DECAY * seasonsPlayed);
const currentAge = (p: DynastyPlayer, seasonsPlayed: number) => p.startAge + seasonsPlayed;

export default function DynastyPage() {
  const [squad, setSquad] = useState<Partial<Record<Slot, DynastyPlayer>>>({});
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [phase, setPhase] = useState<"draft" | "ready" | "simming" | "refill" | "over">("draft");
  const [refillSlots, setRefillSlots] = useState<Slot[]>([]);

  const year = seasons.length;
  const filled = SLOTS.filter((s) => squad[s]);
  const excludeKeys = new Set(filled.map((s) => squad[s]!.key));
  const rating = filled.length
    ? filled.reduce((a, s) => a + currentScore(squad[s]!, year), 0) / SLOTS.length
    : 0;
  const flags = seasons.filter((s) => s.flag).length;

  function draftPick(q: QuickPick) {
    const open = SLOTS.filter((s) => !squad[s]);
    const slot = bestOpenSlot(q.player, open);
    const p: DynastyPlayer = {
      name: q.player.n, club: q.club, decade: q.decade,
      key: q.player.id.split("|")[0],
      baseScore: scoreInSlot(q.player, slot),
      startAge: playerAge(q.player),
    };
    const next = { ...squad, [slot]: p };
    setSquad(next);
    if (SLOTS.every((s) => next[s])) setPhase("ready");
  }

  function refillPick(q: QuickPick) {
    const slot = refillSlots[0];
    const p: DynastyPlayer = {
      name: q.player.n, club: q.club, decade: q.decade,
      key: q.player.id.split("|")[0],
      baseScore: scoreInSlot(q.player, slot) + AGE_DECAY * year, // joins fresh at current year
      startAge: playerAge(q.player) - year, // ages from arrival
    };
    setSquad((prev) => ({ ...prev, [slot]: p }));
    const rest = refillSlots.slice(1);
    setRefillSlots(rest);
    if (!rest.length) setPhase("ready");
  }

  async function playSeason() {
    setPhase("simming");
    const result = await quickSeason(rating);
    const nextYear = year + 1;
    // father time: anyone past the retirement age hangs them up
    const retiring = SLOTS.filter(
      (s) => squad[s] && currentAge(squad[s]!, nextYear) > RETIRE_AGE,
    );
    setSeasons((prev) => [
      ...prev,
      { ...result, year: nextYear, retirements: retiring.map((s) => squad[s]!.name) },
    ]);
    if (nextYear >= MAX_SEASONS) {
      setPhase("over");
      return;
    }
    if (retiring.length) {
      setSquad((prev) => {
        const next = { ...prev };
        for (const s of retiring) delete next[s];
        return next;
      });
      setRefillSlots(retiring);
      setPhase("refill");
    } else {
      setPhase("ready");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2"><Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link><Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link></span>
      <h1 className="font-display mt-4 text-3xl font-black">Dynasty</h1>
      <p className="mt-1 text-sm text-slate-400">
        Draft five, then coach them through the years. Players age, decline and retire —
        how many flags before the era ends? ({MAX_SEASONS} seasons max)
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
        <span>Season <b className="font-display text-lg text-slate-100">{Math.min(year + 1, MAX_SEASONS)}</b></span>
        <span>Rating <b className="font-display text-lg text-grass">{rating.toFixed(1)}</b></span>
        <span>Flags <b className="font-display text-lg text-gold">{flags} 🏆</b></span>
      </div>

      {filled.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-pitch-light p-3">
          <div className="grid gap-1">
            {filled.map((s) => {
              const p = squad[s]!;
              const age = currentAge(p, year);
              return (
                <div key={s} className="flex items-center gap-2 rounded bg-pitch px-2.5 py-1 text-sm">
                  <span className="w-9 shrink-0 font-display font-black text-ice">{s}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-200">{p.name}</span>
                  <span className={`shrink-0 text-xs ${age >= RETIRE_AGE - 1 ? "text-hot" : "text-slate-500"}`}>
                    age {age.toFixed(0)}{age >= RETIRE_AGE - 1 ? " ⚠️" : ""}
                  </span>
                  <span className="shrink-0 font-display font-black text-grass">
                    {Math.round(currentScore(p, year))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {seasons.length > 0 && (
        <div className="mt-3 grid gap-1">
          {seasons.map((s) => (
            <div key={s.year} className={`rounded-xl border px-3 py-1.5 text-sm ${s.flag ? "border-gold bg-gold/10" : "border-line bg-pitch-light"}`}>
              <div className="flex items-center gap-3">
                <span className="font-display font-black text-slate-400">Y{s.year}</span>
                <span className="flex-1 text-xs text-slate-400">
                  {s.flag ? "PREMIERS 🏆" : s.madeFinals ? `finals — won ${s.finalsWon} of 4` : "missed September"}
                </span>
                <span className="font-display font-black text-slate-200">{s.wins}-{s.losses}</span>
              </div>
              {s.retirements.length > 0 && (
                <p className="mt-0.5 text-xs text-hot">👋 retired: {s.retirements.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {phase === "draft" && (
        <div className="mt-4">
          <QuickDraft
            key={filled.length}
            prompt={`founding draft — pick ${filled.length + 1} of 5`}
            forSlot={null}
            excludeKeys={excludeKeys}
            onPick={draftPick}
          />
        </div>
      )}

      {phase === "refill" && refillSlots.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-center text-sm text-hot">
            Your {refillSlots[0]} retired — the recruiters bring you one spin:
          </p>
          <QuickDraft
            key={`refill-${year}-${refillSlots[0]}`}
            prompt={`replace your ${refillSlots[0]}`}
            forSlot={refillSlots[0]}
            excludeKeys={excludeKeys}
            onPick={refillPick}
          />
        </div>
      )}

      {phase === "ready" && (
        <div className="mt-5 text-center">
          <button
            onClick={playSeason}
            className="rounded-xl bg-grass px-10 py-3.5 font-display text-xl font-black text-pitch hover:bg-lime-300"
          >
            PLAY SEASON {year + 1} →
          </button>
        </div>
      )}

      {phase === "simming" && <p className="mt-6 text-center text-slate-400">the season unfolds…</p>}

      {phase === "over" && (
        <div className="pop mt-5 rounded-2xl border border-gold bg-card p-6 text-center">
          {flags >= 3 && <Confetti big />}
          <p className="text-xs uppercase tracking-widest text-slate-500">the era ends</p>
          <p className="font-display mt-1 text-4xl font-black text-gold">
            {flags} FLAG{flags === 1 ? "" : "S"} IN {MAX_SEASONS} SEASONS
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {flags >= 3 ? "A true dynasty — they'll name a stand after you." : flags >= 1 ? "A premiership era. Respect." : "The rebuild begins anew."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `My AFL 23-0 dynasty: ${flags} flag${flags === 1 ? "" : "s"} in ${MAX_SEASONS} seasons 👑 Build yours: https://afl23-0.com/dynasty/`,
                );
              }}
              className="rounded-xl bg-grass px-7 py-2.5 font-display text-base font-black text-pitch hover:bg-lime-300"
            >
              SHARE THE DYNASTY
            </button>
            <button
              onClick={() => { setSquad({}); setSeasons([]); setRefillSlots([]); setPhase("draft"); }}
              className="rounded-xl border border-line px-7 py-2.5 font-display text-base font-black text-slate-300 hover:border-grass/50"
            >
              NEW DYNASTY
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
