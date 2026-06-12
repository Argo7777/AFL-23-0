"use client";

import { useState } from "react";
import Link from "next/link";
import { Mode, Pick } from "@/lib/game/types";
import { GauntletLeg } from "@/lib/game/sim";
import Confetti from "@/components/Confetti";
import TeamField from "@/components/TeamField";

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
  const fellAt = legs.findIndex((l) => !l.survived);
  const cleared = fellAt === -1 ? legs.length : fellAt;
  const sweep = fellAt === -1;

  const shareText = sweep
    ? `🛡️ My team CONQUERED ALL ${legs.length} DECADES of footy history on AFL 23-0. Try the Gauntlet:`
    : `My team survived ${cleared}/${legs.length} decades of the AFL 23-0 Gauntlet before the ${legs[fellAt].decade}s got us. Beat that:`;

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
            ? "Every era, every dynasty — your side beat them all."
            : `A winning record in every decade until the ${legs[fellAt].decade}s brought the run undone.`}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Team rating <b className="text-slate-100">{teamRating.toFixed(1)}</b> · survive a decade
          with 12+ wins against its real teams
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <TeamField mode={mode} roster={roster} selected={null} movable={false} onSelect={() => {}} />
        <div className="grid gap-1.5 self-start">
          {legs.map((l, i) => {
            const reached = i <= cleared || sweep;
            return (
              <div
                key={l.decade}
                className={`flex items-center justify-between rounded-xl border px-4 py-2 ${
                  !reached
                    ? "border-line/40 bg-pitch-light/40 opacity-40"
                    : l.survived
                      ? "border-grass/40 bg-grass/5"
                      : "border-hot/60 bg-hot/10"
                }`}
              >
                <span className="font-display text-lg font-black">{l.decade}s</span>
                <span className="text-sm text-slate-300">
                  {reached ? `${l.wins}–${l.losses}` : "—"}
                </span>
                <span className="font-display text-lg font-black">
                  {!reached ? "🔒" : l.survived ? "✅" : "💀"}
                </span>
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
          href="/play?mode=gauntlet"
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
