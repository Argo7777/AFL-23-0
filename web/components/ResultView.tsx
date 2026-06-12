"use client";

import { useState } from "react";
import Link from "next/link";
import { Mode, Pick } from "@/lib/game/types";
import { FinalsOutcome, SimResult } from "@/lib/game/sim";
import { buildShareCard } from "@/lib/game/shareCard";
import { dailyNumber } from "@/lib/game/profile";
import Confetti from "@/components/Confetti";
import TeamField from "@/components/TeamField";

const FINALS_LABELS: Record<FinalsOutcome, string> = {
  premiers: "Premiers",
  runnerUp: "Grand Final loss",
  prelim: "Preliminary final exit",
  semi: "Semi final exit",
  elim: "Out in week one",
  missed: "Missed September",
};

export default function ResultView({
  mode,
  roster,
  teamRating,
  sim,
  eras,
  shareUrl,
  challengeUrl,
  oppLabels,
  targetRecord,
  daily,
}: {
  mode: Mode;
  roster: (Pick | null)[];
  teamRating: number;
  sim: SimResult;
  eras: number[];
  shareUrl: string;
  challengeUrl: string;
  oppLabels: string[];
  targetRecord?: string | null;
  daily?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const picks = roster.filter((p): p is Pick => p !== null);
  const perfect = sim.wins === 23;
  const maxDist = Math.max(...sim.distribution);

  const targetWins = targetRecord ? Number(targetRecord.split("-")[0]) : null;
  const beatTarget = targetWins != null ? sim.wins - targetWins : null;

  const shareText = daily
    ? `AFL 23-0 Daily #${dailyNumber()}: ${sim.wins}-${sim.losses}${
        sim.finals.modal === "premiers" ? " 🏆" : ""
      }${perfect ? " — PERFECTION" : ""}. Play today's:`
    : `I went ${sim.wins}-${sim.losses}${
        sim.finals.modal === "premiers" ? " and won the flag 🏆" : ""
      } with my all-era AFL team. Build yours:`;

  async function cardFile(): Promise<File> {
    const blob = await buildShareCard(mode, roster, sim, teamRating);
    return new File([blob], "my-afl-23-0-season.png", { type: "image/png" });
  }

  function downloadCard(file: File) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /** share the rendered card via the native sheet (Instagram & co live
   *  there); fall back to downloading the PNG on desktop */
  async function shareImage() {
    setSharing(true);
    try {
      const file = await cardFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText} ${shareUrl}` });
      } else {
        downloadCard(file);
      }
    } catch {
      /* user dismissed the share sheet */
    } finally {
      setSharing(false);
    }
  }

  /** Instagram has no web share intent: on mobile the share sheet (with the
   *  image attached) is the official route in; on desktop, download the card
   *  and open Instagram so it can be posted manually */
  async function shareInstagram() {
    setSharing(true);
    try {
      const file = await cardFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${shareText} ${shareUrl}` });
      } else {
        downloadCard(file);
        window.open("https://www.instagram.com/", "_blank", "noopener");
      }
    } catch {
      /* dismissed */
    } finally {
      setSharing(false);
    }
  }

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="mx-auto max-w-5xl pop">
      {(sim.finals.modal === "premiers" || perfect) && <Confetti big={perfect} />}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {daily ? `daily challenge #${dailyNumber()}` : "your season"}
        </p>
        <div
          className={`font-display mt-2 text-6xl font-black sm:text-8xl ${
            perfect ? "text-grass" : sim.wins >= 18 ? "text-gold" : "text-slate-200"
          }`}
        >
          {sim.wins}–{sim.losses}
        </div>
        {sim.finals.modal === "premiers" && (
          <div className="font-display mt-1 text-2xl font-black text-gold sm:text-3xl">
            🏆 PREMIERS
          </div>
        )}
        {beatTarget != null && (
          <div
            className={`font-display mt-2 inline-block rounded-xl border px-4 py-1.5 text-lg font-black ${
              beatTarget > 0
                ? "border-grass bg-grass/10 text-grass"
                : beatTarget === 0
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-hot bg-hot/10 text-hot"
            }`}
          >
            {beatTarget > 0
              ? `🎯 CHALLENGE BEATEN — ${sim.wins}-${sim.losses} vs their ${targetRecord}`
              : beatTarget === 0
                ? `🤝 CHALLENGE TIED at ${targetRecord}`
                : `❌ CHALLENGE LOST — ${sim.wins}-${sim.losses} vs their ${targetRecord}`}
          </div>
        )}
        <p className="mt-2 text-slate-300">
          {perfect && sim.finals.modal === "premiers"
            ? "PERFECTION. Undefeated, and the flag to prove it."
            : sim.finals.modal === "premiers"
              ? "A September juggernaut — this side salutes more often than not."
              : sim.wins >= 20
                ? "An all-time great season — September is theirs to lose."
                : sim.finals.modal !== "missed"
                  ? `Finals footy: most seasons end in a ${FINALS_LABELS[sim.finals.modal].toLowerCase()}.`
                  : sim.wins >= 10
                    ? "Mid-table. September watches on from the couch."
                    : "Back to the drawing board, coach."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-slate-400">
          <span>
            Team rating <b className="text-slate-100">{teamRating.toFixed(1)}</b>
          </span>
          <span>
            Better than <b className="text-slate-100">{sim.realPercentile.toFixed(1)}%</b> of real{" "}
            {eras.length > 4 ? "all-era" : eras.map((e) => `${e}s`).join("/")} teams
          </span>
          <span>
            Goes 23-0 in <b className="text-slate-100">{sim.perfectPct.toFixed(1)}%</b> of seasons
          </span>
          <span>
            Wins the flag in <b className="text-gold">{sim.finals.premiersPct.toFixed(1)}%</b>
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        <TeamField mode={mode} roster={roster} selected={null} movable={false} onSelect={() => {}} />

        <div>
          <div className="rounded-2xl border border-line bg-pitch-light p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-500">
              Season outcomes across 10,000 simulations
            </p>
            <div className="flex h-24 items-end gap-[2px]">
              {sim.distribution.map((pct, w) => (
                <div key={w} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-sm ${w === 23 ? "bg-grass" : w === sim.wins ? "bg-gold" : "bg-line"}`}
                    style={{ height: `${Math.max(2, (pct / maxDist) * 100)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-pitch px-1.5 py-0.5 text-[10px] text-slate-300 group-hover:block">
                    {w}W · {pct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>0 wins</span>
              <span>23 wins</span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-500">
              September — how the campaign ends ({sim.finals.madeFinalsPct.toFixed(0)}% of seasons make finals)
            </p>
            <div className="grid gap-1.5">
              {(["premiers", "runnerUp", "prelim", "semi", "elim", "missed"] as FinalsOutcome[]).map((o) => (
                <div key={o} className="flex items-center gap-2 text-xs">
                  <span className={`w-28 shrink-0 sm:w-36 ${o === "premiers" ? "font-bold text-gold" : "text-slate-400"}`}>
                    {FINALS_LABELS[o]}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded bg-pitch">
                    <div
                      className={`h-full rounded ${o === "premiers" ? "bg-gold" : o === "missed" ? "bg-line" : "bg-ice/60"}`}
                      style={{ width: `${Math.min(100, sim.finals.pct[o])}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-slate-300">
                    {sim.finals.pct[o].toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {sim.story.length > 0 && oppLabels.length > 0 && (
            <details className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
              <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-slate-500">
                Season story — round by round
              </summary>
              <div className="mt-3 grid gap-1 sm:grid-cols-2">
                {sim.story.map((g, i) => {
                  const finalGame = !g.round.startsWith("R");
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-xs ${
                        finalGame ? "bg-gold/10" : g.win ? "bg-pitch" : "bg-hot/10"
                      } ${finalGame ? "sm:col-span-2" : ""}`}
                    >
                      <span className={`w-8 shrink-0 font-display font-black ${finalGame ? "w-auto pr-2 text-gold" : "text-slate-500"}`}>
                        {g.round}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-300">
                        vs {oppLabels[g.opp] ?? "?"}
                      </span>
                      <span className={`ml-2 font-display font-black ${g.win ? "text-grass" : "text-hot"}`}>
                        {g.win ? "W" : "L"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          <div className="mt-4 grid max-h-105 gap-1.5 overflow-y-auto pr-1">
            {picks.map((pk, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-10 shrink-0 rounded bg-pitch px-1.5 py-0.5 text-center font-display text-xs font-black text-ice">
                    {pk.slot}
                  </span>
                  <div className="min-w-0 truncate">
                    <span className="font-display text-base font-black">{pk.player.n}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {pk.club} · {pk.decade}s
                    </span>
                  </div>
                </div>
                <span className="font-display text-lg font-black text-grass">{pk.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={shareImage}
          disabled={sharing}
          className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch transition hover:bg-lime-300 disabled:opacity-60"
        >
          {sharing ? "PREPARING…" : "SHARE MY SEASON 📸"}
        </button>
        <button
          onClick={shareInstagram}
          disabled={sharing}
          className="rounded-xl border border-line px-5 py-3 transition hover:border-grass/50 disabled:opacity-60"
          aria-label="Share on Instagram"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" className="text-slate-200" />
            <circle cx="12" cy="12" r="4.5" className="text-slate-200" />
            <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" stroke="none" className="text-slate-200" />
          </svg>
        </button>
        <a
          href={tweetHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-200 transition hover:border-grass/50"
          aria-label="Share on X"
        >
          𝕏
        </a>
        <a
          href={fbHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-200 transition hover:border-grass/50"
          aria-label="Share on Facebook"
        >
          f
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(
              `Beat my ${sim.wins}-${sim.losses} — same spins, your picks: ${challengeUrl}`,
            );
            setChallengeCopied(true);
            setTimeout(() => setChallengeCopied(false), 2000);
          }}
          className="rounded-xl border border-gold px-6 py-3 font-display text-lg font-black text-gold transition hover:bg-gold/10"
        >
          {challengeCopied ? "COPIED!" : "CHALLENGE A MATE 🎯"}
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-300 transition hover:border-grass/50"
        >
          {copied ? "COPIED!" : "COPY LINK"}
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-300 transition hover:border-grass/50"
        >
          PLAY AGAIN
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        The share image works anywhere — Instagram stories, X, Facebook, group chats.
      </p>
    </div>
  );
}
