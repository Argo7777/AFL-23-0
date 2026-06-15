"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BASE_PATH, type Comp } from "@/lib/game/data";
import { compFromUrl } from "@/lib/game/useComp";
import { clubColors } from "@/lib/game/clubColors";
import { fetchVotes, submitVote, type Tallies } from "@/lib/game/predict";
import AdSlot, { AD_SLOTS } from "@/components/AdSlot";

interface Option { name: string; club?: string }
interface Category { key: string; title: string; desc: string; options: Option[] }

type PlayerLite = {
  n: string; c: Record<string, number>;
  r: { DEF: number; MID: number; RUC: number; FWD: number };
  st: { gl: number | null };
  sea?: [number, number, number | null, number | null, number | null][];
};
const best = (p: PlayerLite) => Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
function dedupeByName(ps: PlayerLite[]): PlayerLite[] {
  const seen = new Set<string>();
  return ps.filter((p) => (seen.has(p.n) ? false : seen.add(p.n)));
}
const opt = (p: PlayerLite): Option => ({ name: p.n, club: Object.keys(p.c)[0] });

async function loadCategories(comp: Comp): Promise<Category[]> {
  const get = (f: string) => fetch(`${BASE_PATH}/data/${f}`).then((r) => r.json());
  if (comp === "aflw") {
    const aflw = await get("aflw.json");
    const clubs: Option[] = aflw.current.ladder.map((r: { team: string }) => ({ name: r.team }));
    const players: PlayerLite[] = await get(`aflw-players-${aflw.current.year}.json`);
    const byRating = dedupeByName([...players].sort((a, b) => best(b) - best(a))).slice(0, 40);
    const byGoals = dedupeByName([...players].filter((p) => (p.st.gl ?? 0) > 0).sort((a, b) => (b.st.gl ?? 0) - (a.st.gl ?? 0))).slice(0, 24);
    return [
      { key: "premiership", title: `${aflw.current.label} AFLW Premiership`, desc: "Who lifts the cup?", options: clubs },
      { key: "brownlow", title: "AFLW League Best & Fairest", desc: "The season's best player", options: byRating.map(opt) },
      { key: "coleman", title: "AFLW Leading Goalkicker", desc: "Most goals this season", options: byGoals.map(opt) },
      { key: "spoon", title: "Wooden Spoon", desc: "Who finishes last?", options: clubs },
    ];
  }
  const cur = await get("season-current.json");
  const clubs: Option[] = cur.ladder.map((r: { team: string }) => ({ name: r.team }));
  const players: PlayerLite[] = await get("players-2020.json");
  const active = players.filter((p) => p.sea?.some((s) => s[0] >= cur.year - 1));
  const byRating = dedupeByName([...active].sort((a, b) => best(b) - best(a))).slice(0, 44);
  const byGoals = dedupeByName([...active].filter((p) => (p.st.gl ?? 0) >= 0.8).sort((a, b) => (b.st.gl ?? 0) - (a.st.gl ?? 0))).slice(0, 28);
  return [
    { key: "premiership", title: `${cur.year} AFL Premiership`, desc: "Who wins the flag?", options: clubs },
    { key: "brownlow", title: "Brownlow Medal", desc: "The fairest and best", options: byRating.map(opt) },
    { key: "coleman", title: "Coleman Medal", desc: "The leading goalkicker", options: byGoals.map(opt) },
    { key: "spoon", title: "Wooden Spoon", desc: "Who finishes last?", options: clubs },
  ];
}

function CategoryCard({
  cat, comp, tally, picked, onVote,
}: {
  cat: Category; comp: Comp; tally: Record<string, number>;
  picked: string | undefined; onVote: (choice: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = Object.values(tally).reduce((a, b) => a + b, 0);
  // sort options: most-voted first, then keep the seeded order
  const ranked = [...cat.options].sort((a, b) => (tally[b.name] ?? 0) - (tally[a.name] ?? 0));
  const shown = expanded ? ranked : ranked.slice(0, 8);

  return (
    <section className="rounded-2xl border border-line bg-pitch-light p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-black text-slate-100">{cat.title}</h2>
        <span className="text-[11px] text-slate-500">{total.toLocaleString()} votes</span>
      </div>
      <p className="text-xs text-slate-500">{cat.desc}</p>
      <div className="mt-3 grid gap-1.5">
        {shown.map((o) => {
          const v = tally[o.name] ?? 0;
          const pct = total > 0 ? (v / total) * 100 : 0;
          const mine = picked === o.name;
          const [c1] = clubColors(o.club ?? o.name);
          return (
            <button
              key={o.name}
              onClick={() => onVote(o.name)}
              className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition ${
                mine ? "border-grass bg-grass/10" : "border-line bg-pitch hover:border-grass/50"
              }`}
            >
              <span className="absolute inset-y-0 left-0 bg-grass/15" style={{ width: `${pct}%` }} aria-hidden />
              <span className="relative flex items-center gap-2">
                <span className="h-3 w-1.5 shrink-0 rounded-sm" style={{ background: c1 }} />
                <span className="min-w-0 flex-1 truncate font-display font-black text-slate-100">
                  {o.name}{o.club ? <span className="ml-1.5 text-[11px] font-semibold text-slate-500">{o.club}</span> : null}
                </span>
                {mine && <span className="shrink-0 text-[10px] font-black uppercase text-grass">your pick</span>}
                <span className="shrink-0 font-display font-black text-slate-300 tabular-nums">{pct.toFixed(0)}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {ranked.length > 8 && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-2 text-xs font-semibold text-ice hover:underline">
          {expanded ? "show fewer" : `show all ${ranked.length} →`}
        </button>
      )}
    </section>
  );
}

export default function PredictPage() {
  const [comp, setComp] = useState<Comp>("afl");
  const [cats, setCats] = useState<Category[] | null>(null);
  const [tallies, setTallies] = useState<Tallies>({});
  const [picks, setPicks] = useState<Record<string, string>>({});

  const storeKey = useMemo(() => `afl230-predict-${comp}`, [comp]);

  useEffect(() => {
    const c = compFromUrl();
    setComp(c);
    setCats(null);
    loadCategories(c).then(setCats).catch(() => setCats([]));
    fetchVotes(c).then(setTallies).catch(() => {});
    try { setPicks(JSON.parse(localStorage.getItem(`afl230-predict-${c}`) ?? "{}")); } catch { setPicks({}); }
  }, []);

  function vote(category: string, choice: string) {
    const prev = picks[category];
    if (prev === choice) return;
    // optimistic update
    setTallies((t) => {
      const cat = { ...(t[category] ?? {}) };
      cat[choice] = (cat[choice] ?? 0) + 1;
      if (prev && cat[prev] > 0) cat[prev]--;
      return { ...t, [category]: cat };
    });
    const next = { ...picks, [category]: choice };
    setPicks(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ }
    submitVote({ comp, category, choice, prev });
  }

  const homeHref = comp === "aflw" ? "/aflw" : "/";
  const accent = comp === "aflw" ? "#ff5e44" : "#a3e635";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Link href={homeHref} className="font-display text-2xl font-black text-grass">23–0</Link>
          <Link href={homeHref} className="rounded-lg border border-line px-2.5 py-1 font-display text-[11px] font-black text-slate-300 hover:border-grass/50">🏠 {comp === "aflw" ? "AFLW" : "HOME"}</Link>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-pitch-light p-1">
          <Link href="/predict" className={`rounded-full px-3 py-1 font-display text-xs font-black ${comp === "afl" ? "bg-grass text-pitch" : "text-slate-400"}`}>AFL</Link>
          <Link href="/predict?comp=aflw" className={`rounded-full px-3 py-1 font-display text-xs font-black ${comp === "aflw" ? "bg-[#ff5e44] text-white" : "text-slate-400"}`}>AFLW</Link>
        </span>
      </div>

      <h1 className="font-display mt-4 text-3xl font-black sm:text-4xl">Awards Predictor</h1>
      <p className="mt-1 text-sm text-slate-400">
        Tip the season&apos;s big awards — premiership, {comp === "aflw" ? "best &amp; fairest, leading goalkicker" : "Brownlow, Coleman"} and the spoon.
        Tap to vote, see what everyone else thinks. Change your pick any time.
      </p>

      {!cats ? (
        <p className="mt-8 text-center text-sm text-slate-500">loading the candidates…</p>
      ) : cats.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">Couldn&apos;t load the predictor.</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {cats.slice(0, 2).map((c) => (
            <CategoryCard key={c.key} cat={c} comp={comp} tally={tallies[c.key] ?? {}} picked={picks[c.key]} onVote={(ch) => vote(c.key, ch)} />
          ))}
          <AdSlot slot={AD_SLOTS.content} />
          {cats.slice(2).map((c) => (
            <CategoryCard key={c.key} cat={c} comp={comp} tally={tallies[c.key] ?? {}} picked={picks[c.key]} onVote={(ch) => vote(c.key, ch)} />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-600" style={{ color: accent }}>
        Predictions are community votes, not betting. <Link href="/" className="underline">Back to 23-0 →</Link>
      </p>
    </main>
  );
}
