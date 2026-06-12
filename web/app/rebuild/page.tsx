"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QuickDraft, { QuickPick } from "@/components/QuickDraft";
import Confetti from "@/components/Confetti";
import { loadMeta, loadPool } from "@/lib/game/data";
import { quickSeason, QuickSeasonResult } from "@/lib/game/quickSim";
import { Slot, scoreInSlot } from "@/lib/game/types";

const SLOTS: Slot[] = ["DEF", "MID", "RUC", "FWD", "UTL"];

interface RosterSpot {
  name: string;
  club: string;
  decade: number;
  key: string;
  score: number;
}

interface SeasonRow extends QuickSeasonResult {
  year: number;
}

export default function RebuildPage() {
  const [roster, setRoster] = useState<Record<Slot, RosterSpot> | null>(null);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [phase, setPhase] = useState<"loading" | "trade" | "slotpick" | "simming" | "won">("loading");
  const [trade, setTrade] = useState<QuickPick | null>(null);

  // a deliberately awful starting five: the worst eligible body in each pool
  const buildStarters = useCallback(async () => {
    const meta = await loadMeta();
    const out = {} as Record<Slot, RosterSpot>;
    const taken = new Set<string>();
    for (const slot of SLOTS) {
      for (let attempt = 0; attempt < 25; attempt++) {
        const d = meta.decades[Math.floor(Math.random() * meta.decades.length)];
        const clubs = meta.clubsByDecade[String(d)] ?? [];
        const club = clubs[Math.floor(Math.random() * clubs.length)];
        if (!club) continue;
        // eslint-disable-next-line no-await-in-loop
        const pool = (await loadPool(d, club)).filter(
          (p) => p.g >= 20 && !taken.has(p.id.split("|")[0]),
        );
        if (pool.length < 5) continue;
        const worst = pool.reduce((a, b) => (scoreInSlot(a, slot) <= scoreInSlot(b, slot) ? a : b));
        taken.add(worst.id.split("|")[0]);
        out[slot] = {
          name: worst.n, club, decade: d, key: worst.id.split("|")[0],
          score: scoreInSlot(worst, slot),
        };
        break;
      }
    }
    setRoster(out);
    setPhase("trade");
  }, []);

  useEffect(() => { buildStarters(); }, [buildStarters]);

  const rating = roster
    ? SLOTS.reduce((a, s) => a + (roster[s]?.score ?? 0), 0) / 5
    : 0;

  function chooseTrade(q: QuickPick) {
    setTrade(q);
    setPhase("slotpick");
  }

  async function applyTradeAndSim(slot: Slot) {
    if (!trade || !roster) return;
    const next = { ...roster };
    next[slot] = {
      name: trade.player.n, club: trade.club, decade: trade.decade,
      key: trade.player.id.split("|")[0], score: scoreInSlot(trade.player, slot),
    };
    setRoster(next);
    setTrade(null);
    setPhase("simming");
    const r = SLOTS.reduce((a, s) => a + next[s].score, 0) / 5;
    const result = await quickSeason(r);
    setSeasons((prev) => [...prev, { ...result, year: prev.length + 1 }]);
    setPhase(result.flag ? "won" : "trade");
  }

  if (!roster || phase === "loading") {
    return <main className="flex min-h-dvh items-center justify-center text-slate-400">assembling a terrible football team…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <span className="flex items-center gap-2"><Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link><Link href="/" className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 HOME</Link></span>
      <h1 className="font-display mt-4 text-3xl font-black">The Rebuild</h1>
      <p className="mt-1 text-sm text-slate-400">
        You inherit a shocker. One trade per season — climb from basket case to premiers
        in as few seasons as you can.
      </p>

      <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-widest text-slate-500">your list</p>
          <p className="text-sm text-slate-400">rating <b className="font-display text-lg text-grass">{rating.toFixed(1)}</b></p>
        </div>
        <div className="mt-1 grid gap-1">
          {SLOTS.map((s) => (
            <div key={s} className="flex items-center gap-2 rounded bg-pitch px-2.5 py-1 text-sm">
              <span className="w-9 shrink-0 font-display font-black text-ice">{s}</span>
              <span className="min-w-0 flex-1 truncate text-slate-200">{roster[s].name}</span>
              <span className="shrink-0 text-xs text-slate-500">{roster[s].club} {roster[s].decade}s</span>
              <span className="shrink-0 font-display font-black text-grass">{Math.round(roster[s].score)}</span>
            </div>
          ))}
        </div>
      </div>

      {seasons.length > 0 && (
        <div className="mt-3 grid gap-1">
          {seasons.map((s) => (
            <div key={s.year} className={`flex items-center gap-3 rounded-xl border px-3 py-1.5 text-sm ${s.flag ? "border-gold bg-gold/10" : "border-line bg-pitch-light"}`}>
              <span className="font-display font-black text-slate-400">S{s.year}</span>
              <span className="flex-1 text-xs text-slate-400">
                {s.flag ? "PREMIERS 🏆" : s.madeFinals ? `finals — won ${s.finalsWon} of 4` : "missed September"}
              </span>
              <span className="font-display font-black text-slate-200">{s.wins}-{s.losses}</span>
            </div>
          ))}
        </div>
      )}

      {phase === "won" ? (
        <div className="pop mt-5 rounded-2xl border border-gold bg-card p-6 text-center">
          <Confetti big />
          <p className="font-display text-4xl font-black text-gold">🏆 REBUILT!</p>
          <p className="mt-1 text-slate-300">
            Premiers in <b className="text-gold">{seasons.length} season{seasons.length === 1 ? "" : "s"}</b>.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `I rebuilt a basket-case footy club into premiers in ${seasons.length} seasons on AFL 23-0 🔨🏆 https://afl23-0.com/rebuild/`,
                );
              }}
              className="rounded-xl bg-grass px-7 py-2.5 font-display text-base font-black text-pitch hover:bg-lime-300"
            >
              SHARE THE REBUILD
            </button>
            <button
              onClick={() => { setSeasons([]); setRoster(null); setPhase("loading"); buildStarters(); }}
              className="rounded-xl border border-line px-7 py-2.5 font-display text-base font-black text-slate-300 hover:border-grass/50"
            >
              NEW REBUILD
            </button>
          </div>
        </div>
      ) : phase === "slotpick" && trade ? (
        <div className="pop mt-4 rounded-2xl border border-gold/60 bg-card p-4">
          <p className="font-display text-lg font-black">
            Signing <span className="text-gold">{trade.player.n}</span> — who makes way?
          </p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => applyTradeAndSim(s)}
                className="rounded-xl border border-line bg-pitch-light p-2 text-center hover:border-grass"
              >
                <div className="font-display text-sm font-black">{s}</div>
                <div className="font-display text-lg font-black text-grass">
                  {Math.round(scoreInSlot(trade.player, s))}
                </div>
                <div className="truncate text-[9px] text-slate-500">out: {roster[s].name.split(" ").slice(-1)[0]}</div>
              </button>
            ))}
          </div>
        </div>
      ) : phase === "simming" ? (
        <p className="mt-6 text-center text-slate-400">season {seasons.length + 1} underway…</p>
      ) : (
        <div className="mt-4">
          <QuickDraft
            key={seasons.length}
            prompt={`season ${seasons.length + 1} — your one trade`}
            forSlot={null}
            excludeKeys={new Set(SLOTS.map((s) => roster[s].key))}
            onPick={chooseTrade}
          />
        </div>
      )}
    </main>
  );
}
