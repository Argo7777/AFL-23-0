"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDecade } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { Mode, Pick, PlayerEntry } from "@/lib/game/types";
import { GauntletLeg } from "@/lib/game/sim";
import Confetti from "@/components/Confetti";
import TeamField from "@/components/TeamField";

/** the decade's best on demand when a leg is expanded */
function DecadeBest({ decade }: { decade: number }) {
  const [top, setTop] = useState<PlayerEntry[] | null>(null);
  useEffect(() => {
    loadDecade(decade).then((pool) => setTop(pool.slice(0, 6)));
  }, [decade]);
  if (!top) return <p className="py-2 text-xs text-slate-500">loading the {decade}s&apos; finest…</p>;
  return (
    <div className="mt-2 grid gap-1">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">the decade&apos;s best players</p>
      {top.map((p) => {
        const club = Object.keys(p.c)[0] ?? "";
        return (
          <div key={p.id} className="flex items-center gap-2 rounded-lg bg-pitch px-2.5 py-1 text-xs">
            <span className="flex h-3.5 w-1.5 shrink-0 flex-col overflow-hidden rounded-sm">
              <span className="flex-1" style={{ background: clubColors(club)[0] }} />
              <span className="flex-1" style={{ background: clubColors(club)[1] }} />
            </span>
            <span className="min-w-0 flex-1 truncate font-display font-black text-slate-200">{p.n}</span>
            <span className="shrink-0 text-slate-500">{club} · {p.nat}</span>
            <span className="shrink-0 font-display font-black text-grass">
              {Math.round(Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function GauntletResult({
  mode,
  roster,
  teamRating,
  legs,
}: {
  mode: Mode;
  roster: (Pick | null)[];
  teamRating: number;
  legs: GauntletLeg[];
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const fellAt = legs.findIndex((l) => !l.survived);
  const cleared = fellAt === -1 ? legs.length : fellAt;
  const sweep = fellAt === -1;

  const shareText = sweep
    ? `🛡️ My team CONQUERED ALL ${legs.length} DECADES of footy history on AFL 23-0. Try the Gauntlet:`
    : `My team beat ${cleared}/${legs.length} decade champions in the AFL 23-0 Gauntlet before ${legs[fellAt].oppLabel} ended the run. Beat that:`;

  return (
    <div className="mx-auto max-w-5xl pop">
      {sweep && <Confetti big />}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">the gauntlet</p>
        <div className={`font-display mt-2 text-6xl font-black sm:text-7xl ${sweep ? "text-grass" : "text-gold"}`}>
          {sweep ? "HISTORY CONQUERED" : `${cleared}/${legs.length} DECADES`}
        </div>
        <p className="mt-2 text-slate-300">
          {sweep
            ? "Every decade champion, beaten in a best-of-three. Immortality."
            : `Beat each decade's greatest team in a best-of-three — ${legs[fellAt].oppLabel} proved a bridge too far.`}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Team rating <b className="text-slate-100">{teamRating.toFixed(1)}</b> · tap a decade to
          scout the opponent
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <TeamField mode={mode} roster={roster} selected={null} movable={false} onSelect={() => {}} />
        <div className="grid gap-1.5 self-start">
          {legs.map((l, i) => {
            const reached = i <= cleared || sweep;
            const expanded = open === l.decade;
            return (
              <div
                key={l.decade}
                className={`rounded-xl border ${
                  !reached
                    ? "border-line/40 bg-pitch-light/40 opacity-50"
                    : l.survived
                      ? "border-grass/40 bg-grass/5"
                      : "border-hot/60 bg-hot/10"
                }`}
              >
                <button
                  onClick={() => setOpen(expanded ? null : l.decade)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left"
                >
                  <span className="w-14 shrink-0 font-display text-lg font-black">{l.decade}s</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                    {reached ? <>vs <b className="text-slate-100">{l.oppLabel}</b></> : "scout the era…"}
                  </span>
                  {reached && (
                    <span className="shrink-0 text-sm tracking-wider">
                      {l.games.map((g) => (g ? "🟢" : "🔴")).join("")}
                    </span>
                  )}
                  <span className="shrink-0 font-display text-lg font-black">
                    {!reached ? "🔒" : l.survived ? "✅" : "💀"}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{expanded ? "▲" : "▼"}</span>
                </button>
                {expanded && (
                  <div className="border-t border-line/50 px-4 py-2">
                    <p className="text-xs text-slate-400">
                      The {l.decade}s&apos; champion: <b className="text-slate-200">{l.oppLabel}</b>,
                      a {(l.oppStrength * 100).toFixed(0)}%-strength season — the best any club
                      managed that decade.
                      {reached && (
                        <> Series: <b className={l.survived ? "text-grass" : "text-hot"}>
                          {l.wins}–{l.losses} {l.survived ? "win" : "loss"}
                        </b>.</>
                      )}
                    </p>
                    <DecadeBest decade={l.decade} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(`${shareText} https://afl23-0.com/play/?mode=gauntlet`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch transition hover:bg-lime-300"
        >
          {copied ? "COPIED!" : "SHARE THE RUN"}
        </button>
        <Link
          href={`/play?mode=gauntlet&r=${Date.now().toString(36)}`}
          className="rounded-xl border border-line px-8 py-3 font-display text-lg font-black text-slate-300 transition hover:border-grass/50"
        >
          RUN IT AGAIN
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-line px-8 py-3 font-display text-lg font-black text-slate-500 transition hover:border-grass/50"
        >
          HOME
        </Link>
      </div>
    </div>
  );
}
