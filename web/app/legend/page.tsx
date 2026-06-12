"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadDecade, loadMeta } from "@/lib/game/data";
import { clubColors } from "@/lib/game/clubColors";
import { dailyNumber, dailySeed } from "@/lib/game/profile";
import { mulberry32 } from "@/lib/game/rng";
import { honours } from "@/components/PlayerCard";
import Confetti from "@/components/Confetti";
import { PlayerEntry } from "@/lib/game/types";

const MAX_GUESSES = 6;
const KEY = "afl230-legend";

interface SavedState {
  date: string;
  guesses: string[];
  won: boolean;
  done: boolean;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default function LegendPage() {
  const [answer, setAnswer] = useState<PlayerEntry | null>(null);
  const [decade, setDecade] = useState(0);
  const [names, setNames] = useState<string[]>([]);
  const [guess, setGuess] = useState("");
  const [state, setState] = useState<SavedState>({ date: todayKey(), guesses: [], won: false, done: false });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const meta = await loadMeta();
      const rng = mulberry32(dailySeed() ^ 0x1e9e);
      // keep it guessable: TV-era legends only
      const eligible = meta.decades.filter((d) => d >= 1950);
      const d = eligible[Math.floor(rng() * eligible.length)];
      const pool = await loadDecade(d);
      const candidates = pool.filter(
        (p) => Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD) >= 90 && p.g >= 50,
      );
      const pick = candidates[Math.floor(rng() * Math.max(1, candidates.length))] ?? pool[0];
      setAnswer(pick);
      setDecade(d);
      setNames([...new Set(pool.map((p) => p.n))].sort());
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "") as SavedState;
        if (saved.date === todayKey()) setState(saved);
      } catch { /* fresh day */ }
    })();
  }, []);

  const save = (s: SavedState) => {
    setState(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  const clues = useMemo(() => {
    if (!answer) return [];
    const stat = [
      answer.st.di != null && answer.st.di > 0 ? `${answer.st.di.toFixed(1)} disposals` : null,
      answer.st.gl != null && answer.st.gl >= 0.3 ? `${answer.st.gl.toFixed(1)} goals` : null,
      answer.st.ho != null && answer.st.ho >= 4 ? `${answer.st.ho.toFixed(1)} hitouts` : null,
      answer.st.mk != null && answer.st.mk >= 2 ? `${answer.st.mk.toFixed(1)} marks` : null,
    ].filter(Boolean).join(", ");
    const hon = honours(answer);
    return [
      `Played in the ${decade}s as a ${answer.nat}`,
      `${answer.g} games that decade${answer.h ? ` · ${answer.h}cm` : ""} · career ${answer.y[0]}–${answer.y[1]}`,
      stat ? `Per game: ${stat}` : "A stats sheet from a simpler era — judged on goals and games",
      hon.length ? `Honours: ${hon.join(", ")}` : "No major honours — a great judged on the numbers",
      `Club${Object.keys(answer.c).length > 1 ? "s" : ""}: ${Object.keys(answer.c).join(", ")}`,
      `Initials: ${answer.n.split(" ").map((w) => w[0]).join(".")}.`,
    ];
  }, [answer, decade]);

  if (!answer) {
    return <main className="flex min-h-dvh items-center justify-center text-slate-400">finding today&apos;s legend…</main>;
  }

  const revealed = clues.slice(0, Math.min(clues.length, state.guesses.length + 1));
  const tries = state.guesses.length;

  function submit() {
    if (!guess.trim() || state.done || !answer) return;
    if (norm(guess) === norm(answer.n)) {
      save({ ...state, guesses: [...state.guesses, guess], won: true, done: true });
    } else {
      const g = [...state.guesses, guess];
      save({ ...state, guesses: g, done: g.length >= MAX_GUESSES });
      setError(`Not ${guess.trim()} — clue unlocked`);
      setTimeout(() => setError(""), 1800);
    }
    setGuess("");
  }

  const shareText = `AFL 23-0 Legend #${dailyNumber()}: ${
    state.won ? `✅ got it in ${state.guesses.length}/${MAX_GUESSES}` : `❌ stumped (${MAX_GUESSES}/${MAX_GUESSES})`
  }\n${"🟥".repeat(state.won ? state.guesses.length - 1 : MAX_GUESSES)}${state.won ? "🟩" : ""}\nhttps://afl23-0.com/legend/`;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      {state.done && state.won && <Confetti />}
      <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
      <h1 className="font-display mt-4 text-3xl font-black">
        Guess the Legend <span className="text-gold">#{dailyNumber()}</span>
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        One mystery great per day. Each miss unlocks a clue — name them within six.
      </p>

      <div className="mt-5 grid gap-2">
        {revealed.map((c, i) => (
          <div key={i} className="pop rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-slate-200">
            <span className="mr-2 font-display text-xs font-black text-gold">CLUE {i + 1}</span>
            {c}
          </div>
        ))}
      </div>

      {!state.done ? (
        <div className="mt-5">
          <div className="flex gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              list="legend-names"
              placeholder="Who is it?"
              className="w-full rounded-xl border border-line bg-pitch-light px-4 py-2.5 text-sm outline-none placeholder:text-slate-600 focus:border-grass/60"
            />
            <datalist id="legend-names">
              {names.map((n) => <option key={n} value={n} />)}
            </datalist>
            <button
              onClick={submit}
              className="rounded-xl bg-grass px-6 font-display text-base font-black text-pitch hover:bg-lime-300"
            >
              GUESS
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{error || `${MAX_GUESSES - tries} guesses left`}</span>
            <span>{"🟥".repeat(tries)}{"⬜".repeat(MAX_GUESSES - tries)}</span>
          </div>
          {state.guesses.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {state.guesses.map((g, i) => (
                <span key={i} className="rounded-full bg-hot/10 px-2.5 py-0.5 text-[11px] text-hot line-through">{g}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="pop mt-6 rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {state.won ? "legend identified" : "today's legend was"}
          </p>
          <div className="font-display mt-1 text-4xl font-black">{answer.n}</div>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-400">
            <span className="flex h-4 w-2 flex-col overflow-hidden rounded-sm">
              <span className="flex-1" style={{ background: clubColors(Object.keys(answer.c)[0])[0] }} />
              <span className="flex-1" style={{ background: clubColors(Object.keys(answer.c)[0])[1] }} />
            </span>
            {Object.keys(answer.c).join(", ")} · {decade}s · rating{" "}
            {Math.round(Math.max(answer.r.DEF, answer.r.MID, answer.r.RUC, answer.r.FWD))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(shareText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl bg-grass px-7 py-2.5 font-display text-base font-black text-pitch hover:bg-lime-300"
            >
              {copied ? "COPIED!" : "SHARE RESULT"}
            </button>
            <Link href="/" className="rounded-xl border border-line px-7 py-2.5 font-display text-base font-black text-slate-300 hover:border-grass/50">
              MORE GAMES
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">A new legend lands tomorrow.</p>
        </div>
      )}
    </main>
  );
}
