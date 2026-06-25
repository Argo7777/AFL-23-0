"use client";

import { useMemo } from "react";
import { ScShell, useScFeed, SortableTable, Sparkline, PosBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, formDelta, isPlaying } from "@/lib/supercoach";

export default function ScFormPage() {
  const { feed, err } = useScFeed();
  const rows = useMemo(() => (feed ? feed.players.filter((p) => isPlaying(p) && p.games >= 3) : []), [feed]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{p.name}</span>
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div></div>
    ) },
    { key: "delta", label: "Form", value: (p) => formDelta(p), render: (p) => {
      const d = formDelta(p);
      return <span className={"font-bold " + (d > 0 ? "text-grass" : d < 0 ? "text-hot" : "text-slate-400")}>{d > 0 ? "+" : ""}{d.toFixed(1)}</span>;
    } },
    { key: "avg3", label: "L3", value: (p) => p.avg3 },
    { key: "avg5", label: "L5", value: (p) => p.avg5 },
    { key: "avg", label: "Season", value: (p) => p.avg },
    { key: "cons", label: "Consist.", value: (p) => p.consistency, render: (p) => p.consistency ? p.consistency + "%" : "—" },
    { key: "spark", label: "By round", align: "center", value: (p) => formDelta(p), render: (p) => (
      <span className="text-slate-400"><Sparkline scores={p.scores} w={110} /></span>
    ) },
  ];

  if (err) return <ScShell title="Form" blurb="Who's heating up."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Form" blurb="Who's heating up."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Form" blurb="Last-3 average vs season average — positive means trending up. Consistency scores how steady a player is round to round (100 = metronomic).">
      <SortableTable rows={rows} cols={cols} initialSort="delta" max={300} />
      <p className="mt-3 text-xs text-slate-500">Consistency = 100 × (1 − SD ÷ mean) over games played. Higher = fewer cheap weeks.</p>
    </ScShell>
  );
}
