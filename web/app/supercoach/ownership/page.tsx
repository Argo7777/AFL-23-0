"use client";

import { useMemo, useState } from "react";
import { ScShell, useScFeed, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, money, valuePer100k, isPlaying } from "@/lib/supercoach";

export default function ScOwnershipPage() {
  const { feed, err } = useScFeed();
  const [view, setView] = useState<"owned" | "diff">("owned");

  const rows = useMemo(() => {
    if (!feed) return [];
    if (view === "diff") // low-owned, high-projection differentials
      return feed.players.filter((p) => isPlaying(p) && p.games >= 3 && p.owned > 0 && p.owned < 10 && p.proj >= 80);
    return feed.players.filter((p) => p.owned > 0);
  }, [feed, view]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{p.name}</span>
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div></div>
    ) },
    { key: "own", label: "Own%", value: (p) => p.owned, render: (p) => <span className="font-bold">{p.owned}%</span> },
    { key: "proj", label: "Proj", value: (p) => p.proj, render: (p) => <span className="text-gold">{p.proj || "—"}</span> },
    { key: "avg", label: "Avg", value: (p) => p.avg },
    { key: "val", label: "Value", value: (p) => valuePer100k(p), render: (p) => valuePer100k(p).toFixed(1) },
    { key: "price", label: "Price", value: (p) => p.price, render: (p) => money(p.price) },
  ];

  if (err) return <ScShell title="Ownership" blurb="Who the field holds."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Ownership" blurb="Who the field holds."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Ownership" blurb="How widely each player is held. Differentials are low-owned (<10%) players projected to score well — points the field doesn't have.">
      <div className="mb-3 inline-flex rounded-lg border border-line bg-card p-0.5 text-xs">
        <button onClick={() => setView("owned")} className={"rounded-md px-3 py-1.5 font-bold transition " + (view === "owned" ? "bg-gold text-pitch" : "text-slate-300")}>Most owned</button>
        <button onClick={() => setView("diff")} className={"rounded-md px-3 py-1.5 font-bold transition " + (view === "diff" ? "bg-gold text-pitch" : "text-slate-300")}>Differentials</button>
      </div>
      <SortableTable rows={rows} cols={cols} initialSort={view === "diff" ? "proj" : "own"} max={300} />
    </ScShell>
  );
}
