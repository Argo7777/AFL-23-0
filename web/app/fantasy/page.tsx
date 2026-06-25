"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import { loadProjections, type ProjectionsOutput, type PlayerProjection } from "@/lib/modeldb";

// AFL Fantasy on-field structure
const LINES: { role: string; label: string; n: number; color: string }[] = [
  { role: "DEF", label: "Defenders", n: 6, color: "text-ice" },
  { role: "MID", label: "Midfielders", n: 8, color: "text-grass" },
  { role: "RUCK", label: "Rucks", n: 2, color: "text-gold" },
  { role: "FWD", label: "Forwards", n: 6, color: "text-hot" },
];

export default function FantasyPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { loadProjections().then(setProj).catch(() => setErr("Projections feed not built.")); }, []);

  const team = useMemo(() => {
    if (!proj) return null;
    const all = proj.matches.flatMap((m) => m.players)
      .filter((p) => p.dist.dreamTeamPoints.mean > 0)
      .sort((a, b) => b.dist.dreamTeamPoints.mean - a.dist.dreamTeamPoints.mean);
    const picked = new Set<string>();
    const lines: Record<string, PlayerProjection[]> = {};
    for (const { role, n } of LINES) {
      const sel = all.filter((p) => p.role === role && !picked.has(p.player_id)).slice(0, n);
      sel.forEach((p) => picked.add(p.player_id));
      lines[role] = sel;
    }
    // utility = best remaining player of any position
    const util = all.find((p) => !picked.has(p.player_id)) ?? null;
    if (util) picked.add(util.player_id);
    const total = [...Object.values(lines).flat(), ...(util ? [util] : [])]
      .reduce((s, p) => s + p.dist.dreamTeamPoints.mean, 0);
    return { lines, util, total };
  }, [proj]);

  if (err) return <Shell><p className="text-hot">{err}</p></Shell>;
  if (!proj || !team) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">Round {proj.round} · top projected fantasy by position</span>
        <span className="font-display text-sm font-black text-grass">{Math.round(team.total)} <span className="text-[11px] font-normal text-slate-400">proj total</span></span>
      </div>

      {/* the field */}
      <div className="rounded-2xl border border-grass/30 bg-gradient-to-b from-[#0e2a17] via-[#10331f] to-[#0e2a17] p-3 sm:p-5">
        {LINES.map(({ role, label, color }) => (
          <Line key={role} label={label} color={color} players={team.lines[role] ?? []} />
        ))}
        <Line label="Utility" color="text-slate-200" players={team.util ? [team.util] : []} util />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        The best projected AFL Fantasy team for the round by the model — top 6 defenders, 8 midfielders,
        2 rucks, 6 forwards, plus a utility (the best remaining player, any position). Numbers are projected
        fantasy (DreamTeam) points. Tap <b>Projections</b> for every player.
      </p>
    </Shell>
  );
}

function Line({ label, color, players, util }: { label: string; color: string; players: PlayerProjection[]; util?: boolean }) {
  return (
    <div className={"py-2 " + (util ? "mt-1 border-t border-white/10 pt-3" : "")}>
      <div className={"mb-1.5 text-center text-[11px] font-black uppercase tracking-widest " + color}>{label}</div>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {players.map((p) => <Card key={p.player_id} p={p} />)}
      </div>
    </div>
  );
}

function Card({ p }: { p: PlayerProjection }) {
  return (
    <div className="w-[5.4rem] rounded-lg border border-white/10 bg-pitch/80 px-1.5 py-1.5 text-center backdrop-blur sm:w-24">
      <div className="font-display text-base font-black leading-none text-grass">{Math.round(p.dist.dreamTeamPoints.mean)}</div>
      <div className="mt-1 truncate text-[11px] font-semibold leading-tight">{shortName(p.player)}</div>
      <div className="truncate text-[10px] leading-tight text-slate-500">{p.team.replace(/ (Lions|Swans|Crows|Suns|Giants|Eagles|Bombers|Kangaroos|Cats|Magpies|Tigers|Demons|Saints|Power|Dockers|Blues|Hawks|Bulldogs)$/, "")}</div>
    </div>
  );
}

const shortName = (n: string) => {
  const t = n.split(" ");
  return t.length > 1 ? `${t[0][0]}. ${t.slice(1).join(" ")}` : n;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Fantasy team of the round</h1>
      <p className="mb-4 text-sm text-slate-400">The model’s best projected AFL Fantasy XXII, by position.</p>
      <ModelNav />
      {children}
    </main>
  );
}
