"use client";

import { useMemo, useState } from "react";
import { loadPool } from "@/lib/game/data";
import {
  FINALS_STAGES, finalsGameProb, injuryChance, MAX_INJURIES_PER_GAME, playerAge,
} from "@/lib/game/finals";
import { clubColors } from "@/lib/game/clubColors";
import { Meta, Mode, Pick, PlayerEntry, scoreInSlot } from "@/lib/game/types";
import { slotInstances } from "@/components/TeamField";

interface LogRow {
  stage: string;
  opp: string;
  win: boolean;
  injuries: string[];
}

export default function FinalsCampaign({
  mode,
  eras,
  meta,
  initialRoster,
  oppLabels,
  onFlag,
}: {
  mode: Mode;
  eras: number[];
  meta: Meta | null;
  initialRoster: (Pick | null)[];
  oppLabels: string[];
  onFlag: () => void;
}) {
  const instances = useMemo(() => slotInstances(mode), [mode]);
  const injuriesOn = mode === "full23" || mode === "cap23";

  const [roster, setRoster] = useState<(Pick | null)[]>(() => [...initialRoster]);
  const [stage, setStage] = useState(0); // index into FINALS_STAGES
  const [status, setStatus] = useState<"idle" | "ready" | "swaps" | "out" | "champions">("idle");
  const [log, setLog] = useState<LogRow[]>([]);
  const [pendingInjury, setPendingInjury] = useState<number[]>([]); // roster indices to replace
  const [emergencyUsed, setEmergencyUsed] = useState(false);
  const [emergencyPool, setEmergencyPool] = useState<{ club: string; decade: number; players: PlayerEntry[] } | null>(null);

  const rating = useMemo(() => {
    const filled = roster.filter((p): p is Pick => p !== null);
    // an unfilled (undermanned) slot drags the average down hard
    return filled.reduce((a, p) => a + p.score, 0) / instances.length;
  }, [roster, instances.length]);

  const usedKeys = useMemo(
    () => new Set(roster.filter((p): p is Pick => p !== null).map((p) => p.player.id.split("|")[0])),
    [roster],
  );

  function drawOpponent(): string {
    const n = oppLabels.length;
    return oppLabels[Math.floor((0.9 + Math.random() * 0.0999) * (n - 1))] ?? "the era's best";
  }

  function playFinal() {
    const opp = drawOpponent();
    const win = Math.random() < finalsGameProb(rating);
    let injuredNames: string[] = [];
    let injuredIdx: number[] = [];
    if (injuriesOn) {
      const candidates: number[] = [];
      roster.forEach((p, i) => {
        if (p && instances[i].slot !== "UTL" && Math.random() < injuryChance(p.player)) {
          candidates.push(i);
        }
      });
      injuredIdx = candidates.sort(() => Math.random() - 0.5).slice(0, MAX_INJURIES_PER_GAME);
      injuredNames = injuredIdx.map((i) => {
        const p = roster[i]!.player;
        return `${p.n} (${playerAge(p) >= 30 ? "veteran, " : ""}${instances[i].slot})`;
      });
    }
    setLog((l) => [...l, { stage: FINALS_STAGES[stage], opp, win, injuries: injuredNames }]);
    if (!win) {
      setStatus("out");
      return;
    }
    if (stage === FINALS_STAGES.length - 1) {
      setStatus("champions");
      onFlag();
      return;
    }
    if (injuredIdx.length) {
      const next = [...roster];
      for (const i of injuredIdx) next[i] = null; // stretchered off
      setRoster(next);
      setPendingInjury(injuredIdx);
      setStage((s) => s + 1);
      setStatus("swaps");
    } else {
      setStage((s) => s + 1);
      setStatus("ready");
    }
  }

  const benchIndices = roster
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p !== null && instances[i].slot === "UTL")
    .map(({ i }) => i);

  function coverWithBench(slotIdx: number, benchIdx: number) {
    const next = [...roster];
    const benchPick = next[benchIdx]!;
    next[slotIdx] = {
      ...benchPick,
      slot: instances[slotIdx].slot,
      score: scoreInSlot(benchPick.player, instances[slotIdx].slot),
    };
    next[benchIdx] = null;
    setRoster(next);
    advanceInjuryQueue();
  }

  async function startEmergencySpin() {
    if (!meta || emergencyUsed) return;
    const combos: { decade: number; club: string }[] = [];
    for (const d of eras) {
      for (const club of meta.clubsByDecade[String(d)] ?? []) combos.push({ decade: d, club });
    }
    const c = combos[Math.floor(Math.random() * combos.length)];
    const players = await loadPool(c.decade, c.club);
    setEmergencyPool({ club: c.club, decade: c.decade, players });
  }

  function pickEmergency(slotIdx: number, player: PlayerEntry) {
    if (!emergencyPool) return;
    const next = [...roster];
    next[slotIdx] = {
      player,
      decade: emergencyPool.decade,
      club: emergencyPool.club,
      slot: instances[slotIdx].slot,
      score: scoreInSlot(player, instances[slotIdx].slot),
    };
    setRoster(next);
    setEmergencyUsed(true);
    setEmergencyPool(null);
    advanceInjuryQueue();
  }

  function advanceInjuryQueue() {
    setPendingInjury((q) => {
      const rest = q.slice(1);
      if (!rest.length) setStatus("ready");
      return rest;
    });
  }

  // ---------- render ----------
  if (status === "idle") {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold/50 bg-card p-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold">september awaits</p>
        <p className="mt-2 text-sm text-slate-300">
          Your record books a finals berth — but finals are a lottery. Four cut-throat games
          {injuriesOn ? ", live injuries," : ""} and even perfect seasons usually fall short of the cup.
        </p>
        <button
          onClick={() => setStatus("ready")}
          className="mt-4 rounded-xl bg-gold px-8 py-3 font-display text-lg font-black text-pitch hover:scale-105"
        >
          ENTER THE FINALS →
        </button>
      </div>
    );
  }

  const currentInjury = pendingInjury[0];

  return (
    <div className="mx-auto mt-6 max-w-xl">
      {/* campaign log */}
      {log.length > 0 && (
        <div className="grid gap-1.5">
          {log.map((row, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-2 ${row.win ? "border-grass/40 bg-grass/5" : "border-hot/60 bg-hot/10"}`}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-display font-black text-gold">{row.stage}</span>
                <span className="min-w-0 flex-1 truncate text-slate-300">vs {row.opp}</span>
                <span className={`font-display text-lg font-black ${row.win ? "text-grass" : "text-hot"}`}>
                  {row.win ? "WON" : "LOST"}
                </span>
              </div>
              {row.injuries.length > 0 && (
                <p className="mt-0.5 text-xs text-hot">🚑 Injured: {row.injuries.join(", ")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* injury resolution */}
      {status === "swaps" && currentInjury != null && (
        <div className="pop mt-3 rounded-2xl border border-hot/60 bg-card p-4">
          <p className="font-display text-lg font-black text-hot">
            🚑 Your {instances[currentInjury].slot} is gone. Who covers the hole?
          </p>
          {emergencyPool ? (
            <>
              <p className="mt-2 text-xs text-slate-400">
                Emergency spin landed on <b className="text-gold">{emergencyPool.club} {emergencyPool.decade}s</b> —
                pick anyone, he plays {instances[currentInjury].slot}:
              </p>
              <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto">
                {[...emergencyPool.players]
                  .filter((p) => !usedKeys.has(p.id.split("|")[0]))
                  .sort(
                    (a, b) =>
                      scoreInSlot(b, instances[currentInjury].slot) -
                      scoreInSlot(a, instances[currentInjury].slot),
                  )
                  .slice(0, 10)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pickEmergency(currentInjury, p)}
                      className="flex items-center justify-between rounded-lg border border-line bg-pitch px-3 py-1.5 text-left text-sm hover:border-grass/60"
                    >
                      <span className="font-display font-black">{p.n}</span>
                      <span className="font-display font-black text-grass">
                        {Math.round(scoreInSlot(p, instances[currentInjury].slot))}
                      </span>
                    </button>
                  ))}
              </div>
            </>
          ) : (
            <div className="mt-3 grid gap-1.5">
              {benchIndices.map((bi) => {
                const b = roster[bi]!;
                const newScore = scoreInSlot(b.player, instances[currentInjury].slot);
                const [c1] = clubColors(b.club);
                return (
                  <button
                    key={bi}
                    onClick={() => coverWithBench(currentInjury, bi)}
                    style={{ borderLeft: `3px solid ${c1}` }}
                    className="flex items-center justify-between rounded-lg border border-line bg-pitch px-3 py-1.5 text-left text-sm hover:border-grass/60"
                  >
                    <span className="font-display font-black">{b.player.n}
                      <span className="ml-2 text-xs font-normal text-slate-500">from the bench</span>
                    </span>
                    <span className="font-display font-black text-grass">{Math.round(newScore)}</span>
                  </button>
                );
              })}
              {benchIndices.length === 0 && (
                <p className="text-xs text-slate-500">Your bench is spent.</p>
              )}
              {!emergencyUsed && (
                <button
                  onClick={startEmergencySpin}
                  className="rounded-lg border border-gold px-3 py-1.5 font-display text-sm font-black text-gold hover:bg-gold/10"
                >
                  🎰 EMERGENCY SPIN — one random pool, once per campaign
                </button>
              )}
              <button
                onClick={advanceInjuryQueue}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate-400 hover:border-hot/50"
              >
                Play on undermanned (slot scores 0)
              </button>
            </div>
          )}
        </div>
      )}

      {/* next final */}
      {status === "ready" && (
        <div className="mt-3 rounded-2xl border border-gold/50 bg-card p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold">
            {FINALS_STAGES[stage]}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Team rating <b className="text-slate-100">{rating.toFixed(1)}</b> · win chance{" "}
            <b className="text-gold">{(finalsGameProb(rating) * 100).toFixed(0)}%</b>
          </p>
          <button
            onClick={playFinal}
            className="mt-3 rounded-xl bg-gold px-8 py-2.5 font-display text-lg font-black text-pitch hover:scale-105"
          >
            PLAY THE {FINALS_STAGES[stage].toUpperCase()}
          </button>
        </div>
      )}

      {status === "out" && (
        <div className="pop mt-3 rounded-2xl border border-hot/60 bg-hot/10 p-4 text-center">
          <p className="font-display text-2xl font-black text-hot">
            ELIMINATED — {log[log.length - 1]?.stage}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {log[log.length - 1]?.opp} ends the dream. September shows no mercy.
          </p>
        </div>
      )}

      {status === "champions" && (
        <div className="pop mt-3 rounded-2xl border border-gold bg-gold/10 p-4 text-center">
          <p className="font-display text-3xl font-black text-gold">🏆 PREMIERS!</p>
          <p className="mt-1 text-sm text-slate-300">
            Four finals, four scalps. The rarest achievement in the game.
          </p>
        </div>
      )}
    </div>
  );
}
