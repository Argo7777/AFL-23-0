"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface ResultMatch {
  round: string;
  date: string;
  t1: string; s1: number;
  t2: string; s2: number;
  venue: string;
  id?: string; // when set with matchBase, the score links to a match page
}

const FINAL_LABEL: Record<string, string> = {
  EF: "Elimination Final", QF: "Qualifying Final", SF: "Semi Final",
  PF: "Preliminary Final", GF: "Grand Final",
};
function roundLabel(round: string): string {
  return FINAL_LABEL[round] ?? `Round ${round.slice(1)}`;
}

function Row({ m, slugs, matchBase }: { m: ResultMatch; slugs: Record<string, string>; matchBase?: string }) {
  const w1 = m.s1 > m.s2, w2 = m.s2 > m.s1;
  const scoreCls = "font-display font-black tabular-nums";
  const score = (
    <span className="flex shrink-0 items-center gap-2">
      <span className={`w-8 text-right ${scoreCls} ${w1 ? "text-grass" : "text-slate-500"}`}>{m.s1}</span>
      <span className="text-[10px] text-slate-600">v</span>
      <span className={`w-8 ${scoreCls} ${w2 ? "text-grass" : "text-slate-500"}`}>{m.s2}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-2 rounded-lg bg-pitch px-3 py-2 text-sm">
      <Link href={`/club/${slugs[m.t1] ?? ""}`} className={`min-w-0 flex-1 truncate text-right font-display font-black hover:text-ice ${w1 ? "text-slate-100" : "text-slate-500"}`}>
        {m.t1}
      </Link>
      {matchBase && m.id ? (
        <Link href={`${matchBase}/${m.id}`} title="Box score" className="rounded px-1 hover:bg-pitch-light">{score}</Link>
      ) : score}
      <Link href={`/club/${slugs[m.t2] ?? ""}`} className={`min-w-0 flex-1 truncate font-display font-black hover:text-ice ${w2 ? "text-slate-100" : "text-slate-500"}`}>
        {m.t2}
      </Link>
    </div>
  );
}

/** Round-by-round results with round + club filters. */
export default function ResultsList({
  matches,
  slugs,
  matchBase,
}: {
  matches: ResultMatch[];
  slugs: Record<string, string>;
  matchBase?: string;
}) {
  const roundOptions = useMemo(() => {
    const seen: string[] = [];
    for (const m of matches) if (!seen.includes(m.round)) seen.push(m.round);
    return seen;
  }, [matches]);
  const clubOptions = useMemo(
    () => [...new Set(matches.flatMap((m) => [m.t1, m.t2]))].sort(),
    [matches],
  );

  const [round, setRound] = useState("ALL");
  const [club, setClub] = useState("ALL");

  const filtered = matches.filter(
    (m) => (round === "ALL" || m.round === round) && (club === "ALL" || m.t1 === club || m.t2 === club),
  );

  // group filtered into rounds, preserving fixture order
  const groups: { round: string; matches: ResultMatch[] }[] = [];
  for (const m of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.round === m.round) last.matches.push(m);
    else groups.push({ round: m.round, matches: [m] });
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-grass/60"
        >
          <option value="ALL">All rounds</option>
          {roundOptions.map((r) => (
            <option key={r} value={r}>{roundLabel(r)}</option>
          ))}
        </select>
        <select
          value={club}
          onChange={(e) => setClub(e.target.value)}
          className="rounded-full border border-line bg-pitch-light px-3 py-1 font-display text-xs font-black text-slate-300 outline-none focus:border-grass/60"
        >
          <option value="ALL">All clubs</option>
          {clubOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-[11px] text-slate-600">{filtered.length} matches</span>
      </div>

      <div className="grid gap-4">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-2xl border border-line bg-pitch-light p-4">
            <h3 className="mb-2 font-display text-sm font-black uppercase tracking-wide text-gold">
              {roundLabel(g.round)}
            </h3>
            <div className="grid gap-1.5">
              {g.matches.map((m, i) => <Row key={i} m={m} slugs={slugs} matchBase={matchBase} />)}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">No matches for this filter.</p>
        )}
      </div>
    </div>
  );
}
