"use client";

import { useEffect, useMemo, useState } from "react";
import { ScShell, SortableTable, PosBadge, type Col } from "@/components/ScBits";
import { loadProjections, playerKey, type ProjectionsOutput } from "@/lib/modeldb";
import { loadSuperCoach, scIndex, type ScPlayer } from "@/lib/supercoach";

interface Row {
  id: number; name: string; team: string; positions: string[];
  modelFantasy: number;   // our Monte-Carlo AFL Fantasy projection
  modelSc: number;        // that projection mapped onto the SuperCoach scale
  scProj: number;         // SuperCoach's own projection
  edge: number;           // modelSc − scProj  (+ = our model is higher than SC)
}

export default function ModelVsScPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [sc, setSc] = useState<Map<string, ScPlayer>>(new Map());
  const [err, setErr] = useState(false);

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr(true));
    loadSuperCoach().then((f) => setSc(scIndex(f)));
  }, []);

  const { rows, fit } = useMemo(() => {
    if (!proj || !sc.size) return { rows: [] as Row[], fit: null as null | { a: number; b: number; r: number; n: number } };
    // pair each model player with their SuperCoach projection
    const pairs: Array<{ p: any; scp: ScPlayer; mf: number; sp: number }> = [];
    for (const m of proj.matches) for (const p of m.players) {
      const scp = sc.get(playerKey(p.player));
      const mf = p.dist?.dreamTeamPoints?.mean ?? 0;
      const sp = scp ? (scp.proj || scp.avg) : 0;
      if (scp && mf > 5 && sp > 5) pairs.push({ p, scp, mf, sp });
    }
    // OLS: SuperCoach projection ≈ a + b·(model Fantasy projection)
    const n = pairs.length;
    const mx = pairs.reduce((s, p) => s + p.mf, 0) / n;
    const my = pairs.reduce((s, p) => s + p.sp, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (const p of pairs) { sxy += (p.mf - mx) * (p.sp - my); sxx += (p.mf - mx) ** 2; syy += (p.sp - my) ** 2; }
    const b = sxx ? sxy / sxx : 1;
    const a = my - b * mx;
    const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    const rows: Row[] = pairs.map(({ p, scp, mf, sp }) => {
      const modelSc = a + b * mf;
      return {
        id: scp.id, name: p.player, team: scp.teamAbbr, positions: scp.positions,
        modelFantasy: Math.round(mf), modelSc: Math.round(modelSc), scProj: Math.round(sp),
        edge: Math.round(modelSc - sp),
      };
    });
    return { rows, fit: { a, b, r, n } };
  }, [proj, sc]);

  const cols: Col<Row>[] = [
    { key: "name", label: "Player", align: "left", value: (r) => r.name, render: (r) => (
      <div className="min-w-[9rem]"><span className="font-semibold">{r.name}</span>
        <div className="text-[11px] text-slate-500">{r.team} · <PosBadge positions={r.positions} /></div></div>
    ) },
    { key: "modelSc", label: "Model→SC", value: (r) => r.modelSc, render: (r) => <span className="font-bold text-ice">{r.modelSc}</span> },
    { key: "scProj", label: "SC proj", value: (r) => r.scProj, render: (r) => <span className="font-bold text-gold">{r.scProj}</span> },
    { key: "edge", label: "Edge", value: (r) => r.edge, render: (r) => (
      <span className={"font-bold " + (r.edge > 0 ? "text-grass" : r.edge < 0 ? "text-hot" : "text-slate-400")}>{r.edge > 0 ? "+" : ""}{r.edge}</span>
    ) },
    { key: "modelFantasy", label: "Model AF", value: (r) => r.modelFantasy, render: (r) => <span className="text-slate-400">{r.modelFantasy}</span> },
  ];

  if (err) return <ScShell title="Model vs SuperCoach" blurb="Where our model and SuperCoach disagree."><p className="text-hot">Projections feed not built.</p></ScShell>;
  if (!proj || !sc.size) return <ScShell title="Model vs SuperCoach" blurb="Where our model and SuperCoach disagree."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Model vs SuperCoach" blurb="Our Monte-Carlo model projects AFL Fantasy points; SuperCoach projects SuperCoach points. We map our projection onto the SuperCoach scale, then compare — a positive edge means our model rates the player higher than SuperCoach does.">
      {fit && (
        <div className="mb-3 rounded-xl border border-line bg-card p-3 text-xs text-slate-400">
          Fit on {fit.n} players this round: SuperCoach ≈ {fit.a.toFixed(1)} + {fit.b.toFixed(2)} × Model-Fantasy,
          correlation <b className="text-slate-200">r = {fit.r.toFixed(2)}</b>. The two systems track closely;
          the <b className="text-grass">Edge</b> column is where they part ways — sort it to find players our model is
          higher (positive) or lower (negative) on than SuperCoach.
        </div>
      )}
      <SortableTable rows={rows} cols={cols} initialSort="edge" max={900} />
      <p className="mt-3 text-xs text-slate-500">
        “Model AF” is our raw Monte-Carlo AFL Fantasy (DreamTeam) projection; “Model→SC” rescales it to the
        SuperCoach scale using this round’s fit. SuperCoach and Fantasy are different scoring systems, so treat the
        edge as a directional signal, not a guaranteed points gap.
      </p>
    </ScShell>
  );
}
