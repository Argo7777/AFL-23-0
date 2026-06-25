"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ScShell, useScFeed, Sparkline, PosBadge } from "@/components/ScBits";
import {
  type ScPlayer, money, moneyK, signed, valuePer100k, formDelta, isPlaying,
} from "@/lib/supercoach";

export default function SuperCoachOverview() {
  const { feed, err } = useScFeed();

  const lists = useMemo(() => {
    if (!feed) return null;
    const playing = feed.players.filter(isPlaying);
    const proj = (p: ScPlayer) => p.proj || p.avg;
    return {
      topProj: [...playing].sort((a, b) => proj(b) - proj(a)).slice(0, 8),
      value: [...playing].filter((p) => p.games >= 3).sort((a, b) => valuePer100k(b) - valuePer100k(a)).slice(0, 8),
      risers: [...feed.players].sort((a, b) => b.priceChange - a.priceChange).slice(0, 8),
      fallers: [...feed.players].sort((a, b) => a.priceChange - b.priceChange).slice(0, 8),
      form: [...playing].filter((p) => p.games >= 3).sort((a, b) => formDelta(b) - formDelta(a)).slice(0, 8),
      owned: [...feed.players].sort((a, b) => b.owned - a.owned).slice(0, 8),
    };
  }, [feed]);

  if (err) return <ScShell title="Overview" blurb="SuperCoach hub."><Missing /></ScShell>;
  if (!feed || !lists) return <ScShell title="Overview" blurb="SuperCoach hub."><p className="text-slate-400">Loading SuperCoach…</p></ScShell>;

  return (
    <ScShell title="Overview" blurb={`Live SuperCoach prices, projections, form and ownership for ${feed.n_players} players — Round ${feed.round}, ${feed.season}.`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Top projected" href="/supercoach/players" note="Highest projected score this round">
          {lists.topProj.map((p) => <Row key={p.id} p={p} right={`${Math.round(p.proj || p.avg)}`} />)}
        </Card>
        <Card title="Best value" href="/supercoach/value" note="Projected points per $100k">
          {lists.value.map((p) => <Row key={p.id} p={p} right={valuePer100k(p).toFixed(1)} />)}
        </Card>
        <Card title="Biggest risers" href="/supercoach/prices" note="This round's price change">
          {lists.risers.map((p) => <Row key={p.id} p={p} right={signed(p.priceChange)} pos={p.priceChange > 0} />)}
        </Card>
        <Card title="Biggest fallers" href="/supercoach/prices" note="This round's price change">
          {lists.fallers.map((p) => <Row key={p.id} p={p} right={signed(p.priceChange)} pos={p.priceChange > 0} />)}
        </Card>
        <Card title="Hot form" href="/supercoach/form" note="Last-3 average vs season">
          {lists.form.map((p) => <Row key={p.id} p={p} right={signed(formDelta(p))} pos={formDelta(p) > 0} />)}
        </Card>
        <Card title="Most owned" href="/supercoach/ownership" note="Share of teams holding the player">
          {lists.owned.map((p) => <Row key={p.id} p={p} right={`${p.owned}%`} />)}
        </Card>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        SuperCoach scores come from Champion Data’s player ratings. New to it? Start with{" "}
        <Link href="/supercoach/how-it-works" className="text-gold underline">How SuperCoach works</Link>.
        Data refreshes through the week; prices settle after each round.
      </p>
    </ScShell>
  );
}

function Card({ title, href, note, children }: { title: string; href: string; note: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-display text-sm font-black uppercase tracking-wide text-slate-200">{title}</h2>
        <Link href={href} className="text-xs text-gold hover:underline">All →</Link>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{note}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ p, right, pos }: { p: ScPlayer; right: string; pos?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-0 flex-1 truncate">
        <span className="font-semibold">{p.name}</span>
        <span className="ml-1.5 text-[11px] text-slate-500">{p.teamAbbr}</span>
        <span className="ml-1"><PosBadge positions={p.positions} /></span>
      </span>
      <span className="hidden shrink-0 text-slate-500 sm:inline"><Sparkline scores={p.scores} w={56} h={16} /></span>
      <span className="w-16 shrink-0 text-right text-xs text-slate-500">{moneyK(p.price)}</span>
      <span className={"w-16 shrink-0 text-right font-bold " + (pos === undefined ? "text-slate-100" : pos ? "text-grass" : "text-hot")}>{right}</span>
    </div>
  );
}

function Missing() {
  return (
    <p className="text-hot">
      SuperCoach feed not built yet. Run <code>npm run supercoach --prefix pipeline</code>.
    </p>
  );
}
