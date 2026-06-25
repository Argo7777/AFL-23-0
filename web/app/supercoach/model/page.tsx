"use client";

import { useEffect, useMemo, useState } from "react";
import { ScShell, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { loadProjections, playerKey, type ProjectionsOutput } from "@/lib/modeldb";
import { loadSuperCoach, modelScFromStats, type ScFeed, type ScPlayer } from "@/lib/supercoach";

interface Row {
  id: number; name: string; team: string; positions: string[];
  modelSc: number;   // model's projected stats → SuperCoach points
  scProj: number;    // SuperCoach's own next-round projection
  scAvg: number;
  edge: number;      // modelSc − scProj  (+ = our model is higher than SC)
}

export default function ModelVsScPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [feed, setFeed] = useState<ScFeed | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr(true));
    loadSuperCoach().then(setFeed);
  }, []);

  const rows = useMemo<Row[]>(() => {
    if (!proj || !feed?.model_fit) return [];
    const fit = feed.model_fit;
    const idx = new Map<string, ScPlayer>();
    for (const p of feed.players) if (!idx.has(playerKey(p.name))) idx.set(playerKey(p.name), p);
    const out: Row[] = [];
    for (const m of proj.matches) for (const p of m.players) {
      const scp = idx.get(playerKey(p.player));
      if (!scp || !scp.proj) continue;
      const stats: Record<string, number> = {};
      for (const k of fit.stats) stats[k] = p.dist?.[k as keyof typeof p.dist]?.mean ?? 0;
      const modelSc = modelScFromStats(fit, stats);
      if (modelSc < 5) continue;
      out.push({
        id: scp.id, name: p.player, team: scp.teamAbbr, positions: scp.positions,
        modelSc: Math.round(modelSc), scProj: Math.round(scp.proj), scAvg: Math.round(scp.avg),
        edge: Math.round(modelSc - scp.proj),
      });
    }
    return out;
  }, [proj, feed]);

  const cols: Col<Row>[] = [
    { key: "name", label: "Player", align: "left", value: (r) => r.name, render: (r) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{r.name}</span>
        <div className="text-[11px] text-slate-500">{r.team} · <PosBadge positions={r.positions} /></div></div>
    ) },
    { key: "modelSc", label: "Model SC", value: (r) => r.modelSc, render: (r) => <span className="font-bold text-ice">{r.modelSc}</span> },
    { key: "scProj", label: "SC proj", value: (r) => r.scProj, render: (r) => <span className="font-bold text-gold">{r.scProj}</span> },
    { key: "scAvg", label: "SC avg", value: (r) => r.scAvg, render: (r) => <span className="text-slate-400">{r.scAvg}</span> },
    { key: "edge", label: "Edge", value: (r) => r.edge, render: (r) => (
      <span className={"font-bold " + (r.edge > 0 ? "text-grass" : r.edge < 0 ? "text-hot" : "text-slate-400")}>{r.edge > 0 ? "+" : ""}{r.edge}</span>
    ) },
  ];

  const blurb = "Our model projects each player's stats; we convert those into a SuperCoach score using SuperCoach's own stat values, then compare to SuperCoach's projection. A positive edge means our model rates the player higher than SuperCoach does.";
  if (err) return <ScShell title="Model vs SuperCoach" blurb={blurb}><p className="text-hot">Projections feed not built.</p></ScShell>;
  if (!proj || !feed) return <ScShell title="Model vs SuperCoach" blurb={blurb}><p className="text-slate-400">Loading…</p></ScShell>;
  if (!feed.model_fit) return <ScShell title="Model vs SuperCoach" blurb={blurb}><p className="text-slate-400">SuperCoach scoring fit not available yet — rerun the SuperCoach scraper.</p></ScShell>;

  const f = feed.model_fit;
  return (
    <ScShell title="Model vs SuperCoach" blurb={blurb}>
      <div className="mb-3 rounded-xl border border-line bg-card p-3 text-xs text-slate-400">
        <b className="text-slate-200">How “Model SC” is built:</b> we fit SuperCoach scores to per-game stats
        (R² = {f.r2.toFixed(2)} on {f.n} players), then feed in the model’s projection for each stat:
        {" "}{f.stats.map((s) => `${s} ${f.weights[s] > 0 ? "+" : ""}${f.weights[s]}`).join(" · ")}.
        Sort the <b className="text-grass">Edge</b> column to find players our model is higher (positive) or lower
        (negative) on than SuperCoach.
      </div>
      <SortableTable rows={rows} cols={cols} initialSort="edge" max={900} />
      <p className="mt-3 text-xs text-slate-500">
        “Model SC” = the model’s projected stats scored with SuperCoach’s fitted stat values; “SC proj” is
        SuperCoach’s own next-round projection; “SC avg” is the season average for context. Both projections are
        forward-looking for the upcoming round. Big gaps are usually a form call: SuperCoach leans harder on the
        last few weeks, while our model is more season-anchored — so an in-form player can sit well above their
        season average on “SC proj” but nearer it on “Model SC”.
      </p>
    </ScShell>
  );
}
