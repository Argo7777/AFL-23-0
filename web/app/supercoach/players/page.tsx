"use client";

import { useMemo, useState } from "react";
import { ScShell, useScFeed, SortableTable, Sparkline, PosBadge, AvailBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, SC_POSITIONS, money, signed } from "@/lib/supercoach";

export default function ScPlayersPage() {
  const { feed, err } = useScFeed();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("ALL");

  const rows = useMemo(() => {
    if (!feed) return [];
    return feed.players.filter((p) =>
      (pos === "ALL" || p.positions.includes(pos)) &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.teamAbbr.toLowerCase().includes(q.toLowerCase())));
  }, [feed, q, pos]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[10rem]">
        <span className="font-semibold">{p.name}</span><AvailBadge p={p} />
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div>
      </div>
    ) },
    { key: "price", label: "Price", value: (p) => p.price, render: (p) => money(p.price), cls: "font-bold" },
    { key: "pc", label: "$Δ", value: (p) => p.priceChange, render: (p) => (
      <span className={p.priceChange > 0 ? "text-grass" : p.priceChange < 0 ? "text-hot" : "text-slate-500"}>{signed(p.priceChange)}</span>
    ) },
    { key: "proj", label: "Proj", value: (p) => p.proj, render: (p) => <span className="font-bold text-gold">{p.proj || "—"}</span> },
    { key: "avg", label: "Avg", value: (p) => p.avg, render: (p) => p.avg || "—" },
    { key: "avg3", label: "L3", value: (p) => p.avg3, render: (p) => p.avg3 || "—" },
    { key: "own", label: "Own%", value: (p) => p.owned, render: (p) => p.owned ? p.owned + "%" : "—" },
    { key: "gms", label: "GP", value: (p) => p.games },
    { key: "std", label: "± SD", value: (p) => p.std, render: (p) => p.std || "—" },
    { key: "form", label: "Form", align: "center", value: (p) => p.avg3 - p.avg, render: (p) => (
      <span className="text-slate-400"><Sparkline scores={p.scores} /></span>
    ) },
  ];

  if (err) return <ScShell title="Players" blurb="Every player."><p className="text-hot">Feed not built — run <code>npm run supercoach</code>.</p></ScShell>;
  if (!feed) return <ScShell title="Players" blurb="Every player."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Players" blurb={`All ${feed.n_players} players — price, projection, averages, ownership and form. Tap any header to sort.`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-xs">
          {["ALL", ...SC_POSITIONS.map((p) => p.code)].map((c) => (
            <button key={c} onClick={() => setPos(c)}
              className={"rounded-md px-2.5 py-1.5 font-bold transition " + (pos === c ? "bg-gold text-pitch" : "text-slate-300")}>{c}</button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player / team…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
        <span className="text-xs text-slate-400">{rows.length} shown</span>
      </div>
      <SortableTable rows={rows} cols={cols} initialSort="proj" max={900} />
    </ScShell>
  );
}
