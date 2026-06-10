"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE_PATH, loadMeta, loadPool, loadStrengths } from "@/lib/game/data";
import { mulberry32, randomSeed } from "@/lib/game/rng";
import { simulateSeason, SimResult } from "@/lib/game/sim";
import {
  Meta, Mode, Pick, PlayerEntry, Slot, REROLLS, scoreInSlot,
} from "@/lib/game/types";
import Spinner from "@/components/Spinner";
import PlayerCard, { fmtSalary, honours } from "@/components/PlayerCard";
import ResultView from "@/components/ResultView";
import TeamField, { slotInstances } from "@/components/TeamField";

type Phase = "loading" | "spin" | "pick" | "review" | "result";

const LIFELINES = 3;

interface Combo {
  decade: number;
  club: string;
}

function encodeShare(state: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeShare(d: string) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(d.replace(/-/g, "+").replace(/_/g, "/")))));
  } catch {
    return null;
  }
}

function PlayInner() {
  const params = useSearchParams();
  const mode = (params.get("mode") as Mode) || "classic5";
  const shared = params.get("d");

  const instances = useMemo(() => slotInstances(mode), [mode]);
  const totalPicks = instances.length;
  const isCap = mode === "cap23";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [eras, setEras] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [seed] = useState<number>(() => randomSeed());
  const rng = useRef<() => number>(() => Math.random());
  const [combo, setCombo] = useState<Combo | null>(null);
  const [pool, setPool] = useState<PlayerEntry[]>([]);
  const [roster, setRoster] = useState<(Pick | null)[]>(() => Array(totalPicks).fill(null));
  const [rerolls, setRerolls] = useState(REROLLS[mode]);
  const [lifelines, setLifelines] = useState(LIFELINES);
  const [search, setSearch] = useState("");
  const [pendingPlayer, setPendingPlayer] = useState<PlayerEntry | null>(null);
  const [fieldSel, setFieldSel] = useState<number | null>(null);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [swapPool, setSwapPool] = useState<PlayerEntry[]>([]);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [teamRating, setTeamRating] = useState(0);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const picks = useMemo(() => roster.filter((p): p is Pick => p !== null), [roster]);
  const pickCount = picks.length;

  const cap = useMemo(() => {
    if (!meta || !isCap || eras.length === 0) return 0;
    const caps = eras.map((e) => meta.capByDecade[String(e)] ?? 21_000_000);
    return Math.round(caps.reduce((a, b) => a + b, 0) / caps.length / 100_000) * 100_000;
  }, [meta, isCap, eras]);

  const spent = picks.reduce((a, p) => a + p.player.s, 0);
  const remainingBudget = cap - spent;
  const minSalary = meta?.salary.min ?? 100_000;

  const usedPlayerKeys = useMemo(
    () => new Set(picks.map((p) => p.player.id.split("|")[0])),
    [picks],
  );

  const allCombos = useMemo(() => {
    if (!meta) return [];
    const out: Combo[] = [];
    for (const d of eras) {
      for (const club of meta.clubsByDecade[String(d)] ?? []) out.push({ decade: d, club });
    }
    return out;
  }, [meta, eras]);

  const rollCombo = useCallback(async (): Promise<void> => {
    if (allCombos.length === 0) return;
    setPhase("spin");
    setSearch("");
    setPendingPlayer(null);
    for (let attempt = 0; attempt < 40; attempt++) {
      const c = allCombos[Math.floor(rng.current() * allCombos.length)];
      // eslint-disable-next-line no-await-in-loop
      const players = await loadPool(c.decade, c.club);
      const pickable = players.filter((p) => !usedPlayerKeys.has(p.id.split("|")[0]));
      if (pickable.length >= 15 || attempt === 39) {
        setCombo(c);
        setPool(players);
        return;
      }
    }
  }, [allCombos, usedPlayerKeys]);

  // boot: meta + eras + share replay
  useEffect(() => {
    (async () => {
      try {
        const m = await loadMeta();
        setMeta(m);
        if (shared) {
          const st = decodeShare(shared);
          if (st) {
            const rebuilt: (Pick | null)[] = Array(totalPicks).fill(null);
            for (let i = 0; i < st.p.length && i < totalPicks; i++) {
              const pk = st.p[i];
              const players = await loadPool(pk.d, pk.c);
              const player = players.find((pl) => pl.id === pk.id);
              if (player && pk.i < totalPicks) {
                rebuilt[pk.i] = {
                  player, decade: pk.d, club: pk.c, slot: instances[pk.i].slot,
                  score: scoreInSlot(player, instances[pk.i].slot),
                };
              }
            }
            if (rebuilt.some(Boolean)) {
              setEras(st.e);
              setRoster(rebuilt);
              await finishGame(rebuilt, st.e, st.s, st.m);
              return;
            }
          }
        }
        const eraParam = params.get("eras");
        const chosen = eraParam
          ? eraParam.split(",").map(Number).filter((d) => m.decades.includes(d))
          : m.decades;
        setEras(chosen.length ? chosen : m.decades);
      } catch {
        setError("Couldn't load game data. Run the data pipeline first.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (meta && eras.length && phase === "loading" && !shared) {
      rng.current = mulberry32(seed);
      rollCombo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, eras]);

  async function finishGame(
    finalRoster: (Pick | null)[],
    finalEras: number[],
    simSeed: number,
    m: Mode,
  ) {
    const filled = finalRoster.filter((p): p is Pick => p !== null);
    const strengths = await loadStrengths();
    const pooled = finalEras.flatMap((e) => strengths[String(e)] ?? []).sort((a, b) => a - b);
    const rating = filled.reduce((a, p) => a + p.score, 0) / filled.length;
    const result = simulateSeason(rating, pooled, simSeed);
    setTeamRating(rating);
    setSim(result);
    const payload = encodeShare({
      m, e: finalEras, s: simSeed,
      p: finalRoster
        .map((p, i) => (p ? { d: p.decade, c: p.club, id: p.player.id, i } : null))
        .filter(Boolean),
    });
    setShareUrl(`${window.location.origin}${BASE_PATH}/play/?mode=${m}&d=${payload}`);
    setPhase("result");
  }

  function placePick(player: PlayerEntry, slotType: Slot) {
    if (!combo) return;
    const idx = instances.findIndex((s, i) => s.slot === slotType && roster[i] === null);
    if (idx === -1) return;
    const next = [...roster];
    next[idx] = {
      player, decade: combo.decade, club: combo.club, slot: slotType,
      score: scoreInSlot(player, slotType),
    };
    setRoster(next);
    setPendingPlayer(null);
    if (next.every(Boolean)) setPhase("review");
    else rollCombo();
  }

  function confirmLifelineSwap(player: PlayerEntry) {
    if (swapIndex === null) return;
    const old = roster[swapIndex];
    if (!old) return;
    const next = [...roster];
    next[swapIndex] = {
      player, decade: old.decade, club: old.club, slot: instances[swapIndex].slot,
      score: scoreInSlot(player, instances[swapIndex].slot),
    };
    setRoster(next);
    setLifelines((l) => l - 1);
    setSwapIndex(null);
    setSwapPool([]);
    setPendingPlayer(null);
    setFieldSel(null);
  }

  /** field interaction: select, then swap/move; recomputes role scores */
  function onFieldSelect(i: number) {
    if (phase === "result") return;
    if (fieldSel === null) {
      if (roster[i]) setFieldSel(i);
      return;
    }
    if (fieldSel === i) {
      setFieldSel(null);
      return;
    }
    const a = roster[fieldSel];
    const b = roster[i];
    if (!a) {
      setFieldSel(null);
      return;
    }
    const next = [...roster];
    next[i] = { ...a, slot: instances[i].slot, score: scoreInSlot(a.player, instances[i].slot) };
    next[fieldSel] = b
      ? { ...b, slot: instances[fieldSel].slot, score: scoreInSlot(b.player, instances[fieldSel].slot) }
      : null;
    setRoster(next);
    setFieldSel(null);
  }

  async function startLifeline() {
    if (fieldSel === null || lifelines <= 0) return;
    const target = roster[fieldSel];
    if (!target) return;
    const players = await loadPool(target.decade, target.club);
    setSwapIndex(fieldSel);
    setSwapPool(players);
    setSearch("");
  }

  const slotsLeft = useMemo(() => {
    const left: Record<Slot, number> = { DEF: 0, MID: 0, RUC: 0, FWD: 0, UTL: 0 };
    instances.forEach((s, i) => {
      if (!roster[i]) left[s.slot]++;
    });
    return left;
  }, [instances, roster]);

  const inSwap = swapIndex !== null;
  const activePool = inSwap ? swapPool : pool;
  const activeCombo: Combo | null = inSwap && roster[swapIndex!]
    ? { decade: roster[swapIndex!]!.decade, club: roster[swapIndex!]!.club }
    : combo;

  const canAfford = (p: PlayerEntry) => {
    if (!isCap) return true;
    const refund = inSwap && roster[swapIndex!] ? roster[swapIndex!]!.player.s : 0;
    const emptyAfter = totalPicks - pickCount - (inSwap ? 0 : 1);
    return remainingBudget + refund - p.s >= emptyAfter * minSalary;
  };

  const visiblePool = useMemo(() => {
    const replacingKey = inSwap && roster[swapIndex!] ? roster[swapIndex!]!.player.id.split("|")[0] : null;
    const base = activePool.filter((p) => {
      const key = p.id.split("|")[0];
      return !usedPlayerKeys.has(key) || key === replacingKey;
    });
    const sorted = isCap ? [...base].sort((a, b) => b.s - a.s) : base;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return sorted.filter((p) => p.n.toLowerCase().includes(q)).slice(0, 30);
    }
    return sorted.slice(0, 20);
  }, [activePool, usedPlayerKeys, search, isCap, inSwap, roster, swapIndex]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-hot">{error}</p>
        <Link href="/" className="mt-4 inline-block text-ice underline">back home</Link>
      </main>
    );
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-400">
        loading the eras…
      </main>
    );
  }

  if (phase === "result" && sim) {
    return (
      <main className="px-4 py-10">
        <ResultView
          mode={mode}
          roster={roster}
          teamRating={teamRating}
          sim={sim}
          eras={eras}
          shareUrl={shareUrl}
        />
      </main>
    );
  }

  const selPick = fieldSel !== null ? roster[fieldSel] : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          {phase !== "review" && (
            <span>Pick <b className="text-slate-100">{Math.min(pickCount + 1, totalPicks)}</b>/{totalPicks}</span>
          )}
          <span>Re-rolls <b className="text-slate-100">{rerolls}</b></span>
          {isCap && (
            <>
              <span>Lifelines <b className="text-gold">{lifelines}</b></span>
              <span>
                Budget{" "}
                <b className={remainingBudget < cap * 0.15 ? "text-hot" : "text-gold"}>
                  {fmtSalary(remainingBudget)}
                </b>{" "}/ {fmtSalary(cap)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        {/* field column */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TeamField
            mode={mode}
            roster={roster}
            selected={fieldSel}
            movable={phase !== "result"}
            onSelect={onFieldSelect}
          />
          <p className="mt-2 text-center text-[11px] text-slate-500">
            {fieldSel === null
              ? "Tap a player, then another spot, to move them between turns."
              : "Now tap a destination — or tap again to cancel."}
          </p>
          {selPick && (
            <div className="mt-2 flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-slate-300">
                <b>{selPick.player.n}</b> · {selPick.club} {selPick.decade}s
                {isCap ? ` · ${fmtSalary(selPick.player.s)}` : ""}
              </p>
              {isCap && lifelines > 0 && !inSwap && (
                <button
                  onClick={startLifeline}
                  className="rounded-lg border border-gold px-3 py-1 text-xs font-black text-gold hover:bg-gold/10"
                >
                  USE LIFELINE — swap this player ({lifelines} left)
                </button>
              )}
            </div>
          )}
        </div>

        {/* action column */}
        <div>
          {inSwap && activeCombo ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-black">
                  Lifeline swap <span className="text-gold">{activeCombo.club} {activeCombo.decade}s</span>
                </h2>
                <button
                  onClick={() => { setSwapIndex(null); setSwapPool([]); }}
                  className="text-xs text-slate-400 underline"
                >
                  cancel
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Replacing <b>{roster[swapIndex!]?.player.n}</b> — same spin pool, salary refunded.
              </p>
            </div>
          ) : phase === "review" ? (
            <div className="rounded-2xl border border-line bg-pitch-light p-6 text-center">
              <h2 className="font-display text-3xl font-black">Squad complete</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Shuffle players around the ground until the structure feels right
                {isCap && lifelines > 0 ? ", spend a lifeline on a weak link," : ""} then run the season.
              </p>
              <p className="mt-3 text-sm text-slate-300">
                Team rating{" "}
                <b className="font-display text-2xl text-grass">
                  {(picks.reduce((a, p) => a + p.score, 0) / Math.max(1, picks.length)).toFixed(1)}
                </b>
              </p>
              <button
                onClick={() => finishGame(roster, eras, seed, mode)}
                className="mt-5 rounded-xl bg-grass px-10 py-3.5 font-display text-xl font-black text-pitch hover:bg-lime-300"
              >
                RUN THE SEASON
              </button>
            </div>
          ) : combo && phase === "spin" ? (
            <Spinner
              decade={combo.decade}
              club={combo.club}
              candidates={allCombos}
              onDone={() => setPhase("pick")}
            />
          ) : null}

          {((phase === "pick" && combo) || inSwap) && activeCombo && (
            <div className={inSwap ? "mt-4" : "mt-1"}>
              {!inSwap && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h1 className="font-display text-3xl font-black">
                    {activeCombo.club} <span className="text-gold">{activeCombo.decade}s</span>
                  </h1>
                  <button
                    disabled={rerolls <= 0}
                    onClick={() => { setRerolls((r) => r - 1); rollCombo(); }}
                    className={`rounded-lg border px-4 py-1.5 font-display text-sm font-black ${
                      rerolls > 0 ? "border-gold text-gold hover:bg-gold/10" : "border-line text-slate-600"
                    }`}
                  >
                    RE-ROLL ({rerolls})
                  </button>
                </div>
              )}

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search all ${activePool.length} ${activeCombo.club} players of the ${activeCombo.decade}s…`}
                className="mt-4 w-full rounded-xl border border-line bg-pitch-light px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-grass/60"
              />
              <p className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">
                {search ? "search results" : isCap ? "top 20 by salary" : "top 20 rated"}
              </p>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {visiblePool.map((p) => (
                  <PlayerCard
                    key={p.id}
                    p={p}
                    club={activeCombo.club}
                    showSalary={isCap}
                    disabled={isCap && !canAfford(p)}
                    onPick={() => (inSwap ? confirmLifelineSwap(p) : setPendingPlayer(p))}
                  />
                ))}
                {visiblePool.length === 0 && <p className="text-sm text-slate-500">No matching players.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* slot assignment sheet */}
      {pendingPlayer && combo && !inSwap && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-pitch/80 backdrop-blur-sm sm:items-center"
          onClick={() => setPendingPlayer(null)}
        >
          <div
            className="pop w-full max-w-lg rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-2xl font-black">{pendingPlayer.n}</div>
            <div className="mt-0.5 text-xs text-slate-400">
              {combo.club} · {combo.decade}s · natural {pendingPlayer.nat}
              {pendingPlayer.elig.length > 1 ? ` · plays ${pendingPlayer.elig.join("/")}` : ""}
              {isCap ? ` · ${fmtSalary(pendingPlayer.s)}` : ""}
            </div>
            {honours(pendingPlayer).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {honours(pendingPlayer).map((h) => (
                  <span key={h} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    {h}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] uppercase tracking-widest text-slate-500">assign to position</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {(["DEF", "MID", "RUC", "FWD", "UTL"] as Slot[]).map((s) => {
                const available = slotsLeft[s] > 0;
                const score = scoreInSlot(pendingPlayer, s);
                const offPos = s !== "UTL" && !pendingPlayer.elig.includes(s);
                return (
                  <button
                    key={s}
                    disabled={!available}
                    onClick={() => placePick(pendingPlayer, s)}
                    className={`rounded-xl border p-2 text-center transition ${
                      available
                        ? "border-line bg-pitch-light hover:border-grass"
                        : "cursor-not-allowed border-line/40 bg-pitch-light/40 opacity-30"
                    }`}
                  >
                    <div className="font-display text-sm font-black text-slate-200">{s}</div>
                    <div className={`font-display text-xl font-black ${
                      s === "UTL" ? "text-ice" : offPos ? "text-hot" : "text-grass"
                    }`}>
                      {score.toFixed(0)}
                    </div>
                    {s === "UTL" && pendingPlayer.u > 1 && (
                      <div className="text-[9px] text-ice">×{pendingPlayer.u.toFixed(2)}</div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              Off-position picks are rated against real specialists in that role — a midfielder
              thrown forward is compared to actual forwards of the era.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center text-slate-400">loading…</main>}>
      <PlayInner />
    </Suspense>
  );
}
