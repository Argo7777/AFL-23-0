"use client";

import { useMemo, useState } from "react";
import { ScShell, useScFeed, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, money, signed } from "@/lib/supercoach";

type View = "all" | "cows" | "risers" | "fallers";

export default function ScPricesPage() {
  const { feed, err } = useScFeed();
  const [view, setView] = useState<View>("all");

  const rows = useMemo(() => {
    if (!feed) return [];
    let r = feed.players.filter((p) => p.price > 0);
    if (view === "cows") r = r.filter((p) => p.price <= 350_000 && p.games >= 2);   // cheap & playing
    if (view === "risers") r = r.filter((p) => p.priceChange > 0);
    if (view === "fallers") r = r.filter((p) => p.priceChange < 0);
    return r;
  }, [feed, view]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{p.name}</span>
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div></div>
    ) },
    { key: "price", label: "Price", value: (p) => p.price, render: (p) => money(p.price), cls: "font-bold" },
    { key: "pc", label: "Round $Δ", value: (p) => p.priceChange, render: (p) => (
      <span className={p.priceChange > 0 ? "text-grass" : p.priceChange < 0 ? "text-hot" : "text-slate-500"}>{signed(p.priceChange)}</span>
    ) },
    { key: "tpc", label: "Season $Δ", value: (p) => p.totalPriceChange, render: (p) => (
      <span className={p.totalPriceChange > 0 ? "text-grass" : p.totalPriceChange < 0 ? "text-hot" : "text-slate-500"}>{signed(p.totalPriceChange)}</span>
    ) },
    { key: "avg", label: "Avg", value: (p) => p.avg, render: (p) => p.avg || "—" },
    { key: "proj", label: "Proj", value: (p) => p.proj, render: (p) => <span className="text-gold">{p.proj || "—"}</span> },
    { key: "own", label: "Own%", value: (p) => p.owned, render: (p) => p.owned ? p.owned + "%" : "—" },
  ];

  const tabs: [View, string][] = [["all", "All"], ["risers", "Risers"], ["fallers", "Fallers"], ["cows", "Cash cows"]];

  if (err) return <ScShell title="Prices" blurb="Price movements."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Prices" blurb="Price movements."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Prices" blurb="Who rose and fell this round, season-long price change, and the cash cows (cheap players climbing fast). Prices move on a 3-game rolling average of scores.">
      <div className="mb-3 inline-flex rounded-lg border border-line bg-card p-0.5 text-xs">
        {tabs.map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={"rounded-md px-3 py-1.5 font-bold transition " + (view === v ? "bg-gold text-pitch" : "text-slate-300")}>{label}</button>
        ))}
      </div>
      <SortableTable rows={rows} cols={cols} initialSort={view === "fallers" ? "pc" : view === "cows" ? "tpc" : "pc"} initialDir={view === "fallers" ? 1 : -1} max={300} />
      <p className="mt-3 text-xs text-slate-500">Cash cows = players ≤ $350k who’ve played — the rookies generating cash. Sell high once their price plateaus.</p>
    </ScShell>
  );
}
