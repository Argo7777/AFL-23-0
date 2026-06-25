"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadProjections, type ProjectionsOutput, type MatchProjection, type PlayerProjection } from "@/lib/modeldb";

const fmtPos = (p: string) =>
  (p || "").toLowerCase().split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ") || "—";
const ROLE_ORDER: Record<string, number> = { MID: 0, RUC: 1, RUCK: 1, FWD: 2, DEF: 3 };
const ROLE_COLOR: Record<string, string> = {
  MID: "text-grass", RUC: "text-gold", RUCK: "text-gold", FWD: "text-hot", DEF: "text-ice",
};

export default function LineupsPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mi, setMi] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => { loadProjections().then(setProj).catch(() => setErr("Projections feed not built.")); }, []);

  if (err) return <Shell><p className="text-hot">{err}</p></Shell>;
  if (!proj) return <Shell><p className="text-slate-400">Loading…</p></Shell>;
  const m = proj.matches[mi];

  return (
    <Shell>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={mi} onChange={(e) => setMi(Number(e.target.value))}
          className="max-w-[45vw] rounded-lg border border-line bg-card px-2.5 py-2 text-base">
          {proj.matches.map((mm, i) => (
            <option key={mm.match_id} value={i}>{mm.home_team} v {mm.away_team}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
        <span className="text-xs text-slate-400">Round {proj.round}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamLineup m={m} home q={q} />
        <TeamLineup m={m} home={false} q={q} />
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Expected lineup = each team’s most recent XVIII (the model’s working roster). Confirmed teams
        firm up closer to the bounce; positions are the player’s listed role.
      </p>
    </Shell>
  );
}

function TeamLineup({ m, home, q }: { m: MatchProjection; home: boolean; q: string }) {
  const team = home ? m.home_team : m.away_team;
  const players = useMemo(
    () => m.players
      .filter((p) => (home ? p.is_home : !p.is_home) && (!q || p.player.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4) || b.dist.disposals.mean - a.dist.disposals.mean),
    [m, home, q],
  );
  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between border-b border-line bg-pitch-light px-3 py-2">
        <span className="font-display font-black">{team}</span>
        <span className="text-xs text-slate-400">{home ? "Home" : "Away"} · {players.length}</span>
      </div>
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[24rem] text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Pos</th>
              <th className="px-2 py-2 text-left">Player</th>
              <th className="px-2 py-2 text-right">Disp</th>
              <th className="px-2 py-2 text-right">Goals</th>
              <th className="px-2 py-2 text-right">Fantasy</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p: PlayerProjection) => (
              <tr key={p.player_id} className="border-t border-line/40">
                <td className="px-3 py-1.5">
                  <span className={"text-xs font-bold " + (ROLE_COLOR[p.role] ?? "text-slate-400")}>{p.role}</span>
                  <span className="ml-1 hidden text-[11px] text-slate-500 sm:inline">{fmtPos(p.position)}</span>
                </td>
                <td className="px-2 py-1.5 font-semibold">{p.player}</td>
                <td className="px-2 py-1.5 text-right text-slate-200">{p.dist.disposals.mean.toFixed(0)}</td>
                <td className="px-2 py-1.5 text-right text-slate-300">{p.dist.goals.mean.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-bold text-grass">{p.dist.dreamTeamPoints.mean.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Lineups</h1>
      <p className="mb-4 text-sm text-slate-400">
        Expected XVIII for every match, by position, with the model’s projections.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}
