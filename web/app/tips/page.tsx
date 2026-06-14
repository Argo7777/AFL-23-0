"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BASE_PATH, type Comp } from "@/lib/game/data";
import { compFromUrl } from "@/lib/game/useComp";
import { clubColors } from "@/lib/game/clubColors";

/** [year/label, round, team1, score1, team2, score2, p(team1 wins)] */
type Tip = [string | number, string, string, number, string, number, number];

// the model's pre-match win chance for a side, as a percentage (no betting framing)
const winChance = (p: number) => `${Math.round(Math.max(1, Math.min(99, p * 100)))}%`;

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [m, setM] = useState<Tip | null>(null);
  const [pickIdx, setPickIdx] = useState<0 | 1 | null>(null);
  const [bank, setBank] = useState(0); // points
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const [comp, setCompState] = useState<Comp>("afl");
  const bestKey = `afl230-tips-best-${comp}`;
  const homeHref = comp === "aflw" ? "/aflw" : "/";

  useEffect(() => {
    const c = compFromUrl();
    setCompState(c);
    const file = c === "aflw" ? "aflw-tips.json" : "tips.json";
    fetch(`${BASE_PATH}/data/${file}`).then((r) => r.json()).then(setTips);
    setBest(Number(localStorage.getItem(`afl230-tips-best-${c}`) ?? 0));
  }, []);

  const next = useCallback(() => {
    if (!tips) return;
    setM(tips[Math.floor(Math.random() * tips.length)]);
    setPickIdx(null);
  }, [tips]);

  useEffect(() => {
    if (tips && !m) next();
  }, [tips, m, next]);

  function pick(side: 0 | 1) {
    if (!m || pickIdx !== null || busy.current) return;
    busy.current = true;
    setPickIdx(side);
    const won = side === 0 ? m[3] > m[5] : m[5] > m[3];
    const underdog = side === 0 ? m[6] < 0.5 : m[6] > 0.5;
    setTimeout(() => {
      busy.current = false;
      if (won) {
        const pts = underdog ? 2 : 1;
        setBank((b) => b + pts);
        setStreak((s) => s + 1);
        next();
      } else {
        const finalBank = bank;
        if (finalBank > best) {
          setBest(finalBank);
          localStorage.setItem(bestKey, String(finalBank));
        }
        setOver(true);
      }
    }, 1700);
  }

  if (!m) {
    return <main className="flex min-h-dvh items-center justify-center text-slate-400">checking the form…</main>;
  }

  const [year, round, t1, s1, t2, s2, p1] = m;

  const Side = ({ idx }: { idx: 0 | 1 }) => {
    const team = idx === 0 ? t1 : t2;
    const score = idx === 0 ? s1 : s2;
    const otherScore = idx === 0 ? s2 : s1;
    const prob = idx === 0 ? p1 : 1 - p1;
    const won = score > otherScore;
    const [c1, c2] = clubColors(team);
    const revealed = pickIdx !== null;
    return (
      <button
        onClick={() => pick(idx)}
        disabled={revealed}
        className={`flex-1 rounded-2xl border p-5 text-center transition ${
          revealed
            ? won
              ? "border-grass bg-grass/10"
              : "border-hot bg-hot/10 opacity-75"
            : "border-line bg-card hover:-translate-y-0.5 hover:border-gold/60 hover:bg-card-hover"
        }`}
      >
        <div className="mx-auto flex h-1.5 w-16 overflow-hidden rounded-full">
          <span className="flex-1" style={{ background: c1 }} />
          <span className="flex-1" style={{ background: c2 }} />
        </div>
        <div className="font-display mt-3 text-2xl font-black leading-tight">{team}</div>
        <div className={`font-display mt-2 text-xl font-black ${prob < 0.5 ? "text-gold" : "text-slate-400"}`}>
          {winChance(prob)}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-slate-600">
          {prob < 0.42 ? "upset pick · 2 pts" : prob > 0.58 ? "form pick" : "line ball"}
        </div>
        <div className={`font-display mt-3 text-3xl font-black ${revealed ? (won ? "text-grass" : "text-hot") : "text-slate-700"}`}>
          {revealed ? score : "?"}
        </div>
      </button>
    );
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2"><Link href={homeHref} className="font-display text-2xl font-black text-grass">23–0</Link><Link href={homeHref} className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 {comp === "aflw" ? "AFLW" : "HOME"}</Link></span>
        <div className="text-sm text-slate-400">
          Points <b className="font-display text-xl text-grass">{bank}</b>
          <span className="mx-2 text-slate-600">·</span>
          Streak <b className="font-display text-xl text-slate-200">{streak}</b>
          <span className="mx-2 text-slate-600">·</span>
          Best <b className="font-display text-xl text-gold">{best}</b>
        </div>
      </div>

      {!over ? (
        <>
          <h1 className="font-display mt-6 text-center text-2xl font-black sm:text-3xl">
            {round === "GF" ? "🏆 GRAND FINAL" : /^(PF|SF|QF|EF)$/.test(round) ? "🔥 FINAL" : `Round ${round.slice(1)}`}
            , <span className="text-gold">{year}</span>
          </h1>
          <p className="mt-1 text-center text-xs text-slate-500">
            a real match — pick the winner · upsets score double · one miss ends the run
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <Side idx={0} />
            <Side idx={1} />
          </div>
        </>
      ) : (
        <div className="pop mt-10 rounded-2xl border border-line bg-card p-6 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">run over</p>
          <div className="font-display mt-1 text-7xl font-black text-gold">{bank} pts</div>
          <p className="mt-1 text-sm text-slate-400">
            {streak} straight tips{bank >= best && bank > 0 ? " — new personal best!" : ` · best ${best}`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { setBank(0); setStreak(0); setOver(false); setM(null); }}
              className="rounded-xl bg-grass px-8 py-3 font-display text-lg font-black text-pitch hover:bg-lime-300"
            >
              GO AGAIN
            </button>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `I banked ${bank} points tipping real ${comp === "aflw" ? "AFLW" : "footy"} history on AFL 23-0 🎯 Beat my run: https://afl23-0.com/tips/${comp === "aflw" ? "?comp=aflw" : ""}`,
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl border border-gold px-8 py-3 font-display text-lg font-black text-gold hover:bg-gold/10"
            >
              {copied ? "COPIED!" : "SHARE THE RUN"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
