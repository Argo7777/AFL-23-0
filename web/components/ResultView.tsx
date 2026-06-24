"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Meta, Mode, Pick } from "@/lib/game/types";
import { OppTeam, SeriesResult, SimResult } from "@/lib/game/sim";
import { CULT_BOOST } from "@/lib/game/cultHeroes";
import { buildShareCard } from "@/lib/game/shareCard";
import { Badge, dailyNumber, flagLastGame, todayMelbourne } from "@/lib/game/profile";
import { coachName, LEADERBOARD_URL, setCoachName, submitScore } from "@/lib/game/leaderboard";
import { finalsQualifyWins } from "@/lib/game/finals";
import FinalsCampaign from "@/components/FinalsCampaign";
import Confetti from "@/components/Confetti";
import { KOFI_URL } from "@/lib/affiliate";
import TeamField from "@/components/TeamField";

/** median decade of the squad drives a film-stock tint on the oval */
function medianDecade(picks: Pick[]): number {
  if (!picks.length) return 2020;
  const ds = picks.map((p) => p.decade).sort((a, b) => a - b);
  return ds[Math.floor(ds.length / 2)];
}
function eraFilter(picks: Pick[]): string {
  const d = medianDecade(picks);
  if (d < 1950) return "sepia(0.45) contrast(0.95) brightness(1.02)";
  if (d < 1980) return "sepia(0.2) saturate(0.85)";
  if (d < 2000) return "saturate(1.15) contrast(1.03)";
  return "none";
}
function eraLabel(picks: Pick[]): string | null {
  const d = medianDecade(picks);
  if (d < 1950) return "old boots era";
  if (d < 1980) return "black & white TV era";
  if (d < 2000) return "VHS era";
  return null;
}

/** count from 0 to the final record — the dopamine moment */
function useCountUp(target: number, ms = 1100): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function ResultView({
  mode,
  roster,
  teamRating,
  sim,
  eras,
  meta,
  shareUrl,
  challengeUrl,
  oppLabels,
  targetRecord,
  daily,
  spoon,
  series,
  newBadges,
  replay,
  opponents,
  cultCount,
  draftPct,
  comp = "afl",
}: {
  mode: Mode;
  roster: (Pick | null)[];
  teamRating: number;
  sim: SimResult;
  eras: number[];
  meta: Meta | null;
  shareUrl: string;
  challengeUrl: string;
  oppLabels: string[];
  targetRecord?: string | null;
  daily?: boolean;
  spoon?: boolean;
  series?: SeriesResult | null;
  newBadges?: Badge[];
  replay?: boolean;
  opponents?: OppTeam[];
  cultCount?: number;
  draftPct?: number | null;
  comp?: "afl" | "aflw";
}) {
  const [copied, setCopied] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [ladderName, setLadderName] = useState("");
  const [ladderState, setLadderState] = useState<"idle" | "sending" | "done" | "failed">("idle");
  const [postedFin, setPostedFin] = useState<string | null>(null); // fin at last post
  const [flagWon, setFlagWon] = useState(false);
  const [finResult, setFinResult] = useState(""); // QF/SF/PF/GF exit or P
  const [oppView, setOppView] = useState<OppTeam | null>(null);

  useEffect(() => setLadderName(coachName()), []);

  async function postToLadder() {
    if (!ladderName.trim() || ladderState === "sending") return;
    setLadderState("sending");
    setCoachName(ladderName.trim());
    const ok = await submitScore({
      name: ladderName.trim(), wins: sim.wins, losses: sim.losses,
      rating: Math.round(teamRating * 10) / 10,
      flag: flagWon, mode, fin: finResult, comp,
      ...(daily ? { daily: todayMelbourne() } : {}),
    });
    setLadderState(ok ? "done" : "failed");
    if (ok) setPostedFin(finResult);
  }
  const picks = roster.filter((p): p is Pick => p !== null);
  const seasonGames = comp === "aflw" ? 12 : 23;
  const qualifyWins = finalsQualifyWins(seasonGames);
  const perfect = spoon ? sim.wins === 0 : sim.wins === seasonGames;
  const shownWins = useCountUp(sim.wins);
  const shownLosses = useCountUp(sim.losses);
  const maxDist = Math.max(...sim.distribution);
  const finalsEligible = !spoon && mode !== "gauntlet" && sim.wins >= qualifyWins;

  const targetWins = targetRecord ? Number(targetRecord.split("-")[0]) : null;
  const beatTarget = targetWins != null ? sim.wins - targetWins : null;

  const league = comp === "aflw" ? "AFLW" : "AFL";
  const shareText = daily
    ? `${league} 23-0 Daily #${dailyNumber()}: ${sim.wins}-${sim.losses}${
        flagWon ? " 🏆" : ""
      }${perfect ? " — PERFECTION" : ""}. Play today's:`
    : spoon
      ? `I went ${sim.wins}-${sim.losses} chasing the wooden spoon 🥄${
          perfect ? " — PERFECT SPOON!" : ""
        } on ${league} 23-0. Build worse:`
      : `I went ${sim.wins}-${sim.losses}${
          flagWon ? " and won the flag 🏆" : ""
        } with my all-era ${league} team. Build yours:`;

  async function cardFile(): Promise<File> {
    const blob = await buildShareCard(
      mode, roster, sim, teamRating, flagWon,
      draftPct != null
        ? `Team rating ${teamRating.toFixed(1)}  ·  drafted ${draftPct.toFixed(0)}% of the spins' ${spoon ? "floor" : "ceiling"}`
        : undefined,
    );
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
      {(flagWon || perfect) && <Confetti big={perfect || flagWon} />}
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {daily ? `daily challenge #${dailyNumber()}` : spoon ? "the spoon chase" : "your season"}
        </p>
        <div
          className={`font-display mt-2 text-6xl font-black tabular-nums sm:text-8xl ${
            perfect ? "text-grass" : sim.wins >= 18 ? "text-gold" : "text-slate-200"
          }`}
        >
          {shownWins}–{shownLosses}
        </div>
        {flagWon && (
          <div className="font-display mt-1 text-2xl font-black text-gold sm:text-3xl">
            🏆 PREMIERS
          </div>
        )}
        {spoon && perfect && (
          <div className="font-display mt-1 text-2xl font-black text-grass sm:text-3xl">
            🥄 PERFECT SPOON
          </div>
        )}
        {newBadges && newBadges.length > 0 && (
          <div className="pop mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {newBadges.map((b) => (
              <span
                key={b.label}
                className="rounded-full border border-gold bg-gold/15 px-3 py-1 text-xs font-bold text-gold"
              >
                NEW BADGE · {b.emoji} {b.label}
              </span>
            ))}
          </div>
        )}
        {series && (
          <div
            className={`font-display mt-3 inline-block rounded-xl border px-4 py-2 text-lg font-black ${
              series.won ? "border-grass bg-grass/10 text-grass" : "border-hot bg-hot/10 text-hot"
            }`}
          >
            ⚔️ SHOWDOWN {series.won ? "WON" : "LOST"} {series.myWins}–{series.theirWins}
            <span className="ml-2 align-middle text-sm">
              {series.games.map((g, i) => (g ? "🟢" : "🔴")).join("")}
            </span>
            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              best-of-5 vs their actual team
            </div>
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
          {spoon
            ? perfect
              ? "Flawless incompetence. Not a single accidental win."
              : sim.wins <= 3
                ? "Gloriously bad — but those wins cost you the spoon."
                : "Too talented for the spoon. Try drafting worse."
            : flagWon
              ? perfect
                ? "PERFECTION. Undefeated, and the flag to prove it."
                : "Premiers. The hardest prize in the game, won."
              : perfect
                ? "An undefeated season — now win the one that matters."
                : sim.wins >= 20
                  ? "An all-time great season. September will test it."
                  : finalsEligible
                    ? "Finals footy awaits — and finals show no mercy."
                    : sim.wins >= 10
                      ? "Mid-table. September watches on from the couch."
                      : "Back to the drawing board, coach."}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-slate-400">
          <span>
            Team rating <b className="text-slate-100">{teamRating.toFixed(1)}</b>
            {(cultCount ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                🔥 cult hero +{CULT_BOOST * cultCount!}
              </span>
            )}
          </span>
          {draftPct != null ? (
            <span>
              {spoon ? "Tanked to" : "Drafted"}{" "}
              <b className={draftPct >= 99.5 ? "text-grass" : "text-slate-100"}>
                {draftPct.toFixed(1)}%
              </b>{" "}
              of your spins&apos; {spoon ? "floor" : "ceiling"}
              {draftPct >= 99.5 ? " — flawless" : ""}
            </span>
          ) : (
            <span>
              Better than <b className="text-slate-100">{sim.realPercentile.toFixed(1)}%</b> of real{" "}
              {eras.length > 4 ? "all-era" : eras.map((e) => `${e}s`).join("/")} teams
            </span>
          )}
          {spoon ? (
            <span>
              Goes 0-{seasonGames} in <b className="text-slate-100">{sim.distribution[0].toFixed(1)}%</b> of seasons
            </span>
          ) : (
            <span>
              Goes {seasonGames}-0 in <b className="text-slate-100">{sim.perfectPct.toFixed(1)}%</b> of seasons
            </span>
          )}
        </div>

        {/* September: a separate, brutal campaign */}
        {finalsEligible ? (
          <FinalsCampaign
            mode={mode}
            eras={eras}
            meta={meta}
            initialRoster={roster}
            oppLabels={
              // finals face the same era all-star sides as the season (drawn
              // strongest-first), not random real club-seasons — sorted ascending
              // by rating so FinalsCampaign's top-decile pick lands on the best.
              opponents && opponents.length
                ? [...opponents].sort((a, b) => a.rating - b.rating).map((o) => o.label)
                : oppLabels
            }
            onFlag={() => {
              setFlagWon(true);
              if (!replay) flagLastGame();
            }}
            onResult={setFinResult}
          />
        ) : (
          !spoon && mode !== "gauntlet" && (
            <p className="mt-4 text-sm text-slate-500">
              {sim.wins}-{sim.losses} misses September — {qualifyWins}+ wins books a finals berth.
            </p>
          )
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,380px)_1fr]">
        {/* era-tinted field: the older the squad, the older the film stock */}
        <div style={{ filter: eraFilter(picks) }} className="relative">
          <TeamField mode={mode} roster={roster} selected={null} movable={false} onSelect={() => {}} />
          {eraLabel(picks) && (
            <span className="absolute right-2 top-2 rounded bg-pitch/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400">
              {eraLabel(picks)}
            </span>
          )}
        </div>

        <div>
          <div className="rounded-2xl border border-line bg-pitch-light p-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-500">
              Season outcomes across 10,000 simulations
            </p>
            <div className="flex h-24 items-end gap-[2px]">
              {sim.distribution.map((pct, w) => (
                <div key={w} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-sm ${w === seasonGames ? "bg-grass" : w === sim.wins ? "bg-gold" : "bg-line"}`}
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
              <span>{seasonGames} wins</span>
            </div>
          </div>

          {sim.story.length > 0 && (
            <details className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
              <summary className="cursor-pointer text-[11px] uppercase tracking-widest text-slate-500">
                Season story — round by round
              </summary>
              <div className="mt-3 grid gap-1 sm:grid-cols-2">
                {sim.story.map((g, i) => {
                  const clickable = g.oppIdx != null && opponents?.[g.oppIdx];
                  return (
                    <button
                      key={i}
                      disabled={!clickable}
                      onClick={() => clickable && setOppView(opponents![g.oppIdx!])}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-left text-xs ${
                        g.win ? "bg-pitch" : "bg-hot/10"
                      } ${clickable ? "cursor-pointer hover:ring-1 hover:ring-ice/50" : ""}`}
                    >
                      <span className="w-8 shrink-0 font-display font-black text-slate-500">
                        {g.round}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-300">
                        vs {g.oppLabel}{clickable ? " ▸" : ""}
                      </span>
                      <span className={`ml-2 font-display font-black ${g.win ? "text-grass" : "text-hot"}`}>
                        {g.win ? "W" : "L"}
                      </span>
                    </button>
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

      {LEADERBOARD_URL && mode !== "gauntlet" && !spoon && (
        <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-2xl border border-line bg-pitch-light p-3">
          {ladderState === "done" ? (
            postedFin !== finResult ? (
              <div className="flex w-full items-center justify-center gap-3 text-sm">
                <span className="text-slate-300">September played —</span>
                <button
                  onClick={postToLadder}
                  className="rounded-xl bg-gold px-4 py-1.5 font-display text-sm font-black text-pitch"
                >
                  UPDATE LADDER WITH {finResult === "P" ? "🏆" : `${finResult} RESULT`}
                </button>
              </div>
            ) : (
              <p className="w-full text-center text-sm text-grass">
                On the board! <Link href="/leaderboard" className="underline">See the global leaderboard →</Link>
              </p>
            )
          ) : (
            <>
              <input
                value={ladderName}
                onChange={(e) => setLadderName(e.target.value.slice(0, 12))}
                placeholder="Coach name"
                className="w-full min-w-0 rounded-xl border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-grass/60"
              />
              <button
                onClick={postToLadder}
                disabled={!ladderName.trim() || ladderState === "sending"}
                className="shrink-0 rounded-xl bg-gold px-4 py-2 font-display text-sm font-black text-pitch disabled:opacity-50"
              >
                {ladderState === "sending" ? "…" : ladderState === "failed" ? "RETRY" : "POST TO GLOBAL LADDER"}
              </button>
            </>
          )}
        </div>
      )}

      {/* No ad here: the result screen is interactive game output, not
          publisher content — AdSense disallows ads on such screens. */}

      {/* opposing line-up viewer */}
      {oppView && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-pitch/80 backdrop-blur-sm sm:items-center"
          onClick={() => setOppView(null)}
        >
          <div
            className="pop max-h-[80dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="font-display text-xl font-black">{oppView.label}</div>
              <button onClick={() => setOppView(null)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-400 hover:border-grass/50">✕</button>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">the side they fielded against you</p>
            <div className="mt-3 grid gap-1">
              {oppView.players.map(([name, rating, club], i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-pitch px-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-display font-black text-slate-100">{name}</span>
                  <span className="shrink-0 text-xs text-slate-500">{club}</span>
                  <span className="shrink-0 font-display font-black text-grass">{Math.round(rating)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          href={daily ? (comp === "aflw" ? "/aflw" : "/") : `/play?mode=${mode}${comp === "aflw" ? "&comp=aflw" : ""}&eras=${eras.join(",")}&r=${Date.now().toString(36)}`}
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-300 transition hover:border-grass/50"
        >
          PLAY AGAIN
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-line px-6 py-3 font-display text-lg font-black text-slate-500 transition hover:border-grass/50"
        >
          HOME
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        The share image works anywhere — Instagram stories, X, Facebook, group chats.
      </p>
      <p className="mt-4 text-center">
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold/80 hover:text-gold hover:underline"
        >
          ☕ Enjoying 23-0? Shout the coach a beer →
        </a>
      </p>
    </div>
  );
}
