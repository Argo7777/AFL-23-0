"use client";

import { useMemo } from "react";
import { ScShell, useScFeed, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, money, valuePer100k, isPlaying } from "@/lib/supercoach";

export default function ScValuePage() {
  const { feed, err } = useScFeed();
  const rows = useMemo(() => (feed ? feed.players.filter((p) => isPlaying(p) && p.games >= 3 && p.proj > 0) : []), [feed]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{p.name}</span>
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div></div>
    ) },
    { key: "val", label: "Value", value: (p) => valuePer100k(p), render: (p) => <span className="font-bold text-gold">{valuePer100k(p).toFixed(1)}</span> },
    { key: "proj", label: "Proj", value: (p) => p.proj },
    { key: "avg", label: "Avg", value: (p) => p.avg },
    { key: "price", label: "Price", value: (p) => p.price, render: (p) => money(p.price) },
    { key: "own", label: "Own%", value: (p) => p.owned, render: (p) => p.owned ? p.owned + "%" : "—" },
  ];

  if (err) return <ScShell title="Value" blurb="Best bang for buck."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Value" blurb="Best bang for buck."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Value" blurb="Projected points per $100k of price — the players returning the most score for their salary. Cheap scorers rank highest; premiums with elite ceilings still feature.">
      <SortableTable rows={rows} cols={cols} initialSort="val" max={300} />
      <p className="mt-3 text-xs text-slate-500">Value = projected points ÷ (price ÷ $100k). Filtered to players with 3+ games and a projection.</p>
    </ScShell>
  );
}
