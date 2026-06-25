"use client";

import { useMemo, useState } from "react";
import { ScShell, useScFeed, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { type ScPlayer, isPlaying } from "@/lib/supercoach";

export default function ScFixturesPage() {
  const { feed, err } = useScFeed();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!feed) return [];
    return feed.players.filter((p) => isPlaying(p) && p.games >= 3 && p.opp &&
      (!q || p.name.toLowerCase().includes(q.toLowerCase()) || p.teamAbbr.toLowerCase().includes(q.toLowerCase())));
  }, [feed, q]);

  const cols: Col<ScPlayer>[] = [
    { key: "name", label: "Player", align: "left", value: (p) => p.name, render: (p) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{p.name}</span>
        <div className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></div></div>
    ) },
    { key: "opp", label: "Opp", align: "left", value: (p) => p.opp ?? "", render: (p) => (
      <span>{p.oppHome ? "vs " : "@ "}<span className="font-bold">{p.opp}</span></span>
    ) },
    { key: "oppavg", label: "Avg v Opp", value: (p) => p.oppAvg, render: (p) => (
      <span className={p.oppAvg && p.avg ? (p.oppAvg >= p.avg ? "text-grass" : "text-hot") : "text-slate-500"}>{p.oppAvg || "—"}</span>
    ) },
    { key: "venavg", label: "Avg @ Ven", value: (p) => p.venAvg, render: (p) => p.venAvg || "—" },
    { key: "avg", label: "Season", value: (p) => p.avg },
    { key: "next", label: "Next 3", align: "left", value: (p) => 0, render: (p) => (
      <span className="text-[11px] text-slate-400">{p.next.map((n) => `${n.home ? "" : "@"}${n.opp}`).join(" · ") || "—"}</span>
    ) },
  ];

  if (err) return <ScShell title="Fixtures" blurb="Matchups."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Fixtures" blurb="Matchups."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Fixtures" blurb="Matchup context for the round: how each player has averaged against this week's opponent and at the venue, plus their next three fixtures. Green = the matchup beats their season average.">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player / team…"
        className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-base" />
      <SortableTable rows={rows} cols={cols} initialSort="oppavg" max={400} />
      <p className="mt-3 text-xs text-slate-500">“Avg v Opp” and “Avg @ Ven” are the player’s historical SuperCoach average in those splits — a quick read on favourable or tough matchups.</p>
    </ScShell>
  );
}
