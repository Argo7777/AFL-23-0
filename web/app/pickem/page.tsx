"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";
import {
  loadProjections, loadPickem, probOver, playerKey, PICKEM_MULTIPLIERS,
  type Market, type ProjectionsOutput, type PlayerProjection,
} from "@/lib/modeldb";

// the stats Dabble Pick'em offers that we model
const PICKEM_MARKETS: [Market, string][] = [
  ["disposals", "Disposals"], ["dreamTeamPoints", "Fantasy"], ["goals", "Goals"],
  ["marks", "Marks"], ["tackles", "Tackles"],
];

interface Leg { key: string; player: string; market: Market; line: number; side: "over" | "under"; prob: number; }

export default function PickemPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>("disposals");
  const [matchFilter, setMatchFilter] = useState("all");
  const [lines, setLines] = useState<Record<string, number>>({}); // key -> overridden line
  const [slip, setSlip] = useState<Leg[]>([]);
  const [posted, setPosted] = useState<Map<string, number>>(new Map()); // key -> Dabble line
  const [havePosted, setHavePosted] = useState(false);

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr("Projections feed not built."));
    loadPickem().then((pk) => {
      if (!pk?.lines?.length) return;
      const m = new Map<string, number>();
      for (const l of pk.lines) m.set(`${playerKey(l.player)}|${l.market}`, l.line);
      setPosted(m); setHavePosted(true);
    });
  }, []);

  const matches = useMemo(() => proj?.matches.map((m) => `${m.home_team} v ${m.away_team}`) ?? [], [proj]);

  const rows = useMemo(() => {
    if (!proj) return [];
    const out: Array<{ key: string; p: PlayerProjection; match: string; line: number; pOver: number; lean: "over" | "under"; conf: number; isPosted: boolean }> = [];
    for (const mt of proj.matches) {
      const match = `${mt.home_team} v ${mt.away_team}`;
      if (matchFilter !== "all" && match !== matchFilter) continue;
      for (const p of mt.players) {
        const d = p.dist[market];
        if (!d || d.mean < 1) continue;
        const key = `${playerKey(p.player)}|${market}`;
        const postedLine = posted.get(key);
        const line = lines[key] ?? postedLine ?? Math.max(0.5, Math.round(d.mean) - 0.5);
        const pOver = probOver(d, line);
        const lean = pOver >= 0.5 ? "over" : "under";
        out.push({ key, p, match, line, pOver, lean, conf: Math.abs(pOver - 0.5), isPosted: postedLine != null });
      }
    }
    // if Dabble has posted lines for this market, show those first
    return out.sort((a, b) => Number(b.isPosted) - Number(a.isPosted) || b.conf - a.conf);
  }, [proj, market, matchFilter, lines, posted]);

  const inSlip = (key: string) => slip.find((l) => l.key === key);
  const toggleLeg = (key: string, player: string, line: number, side: "over" | "under", prob: number) =>
    setSlip((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex && ex.side === side) return prev.filter((l) => l.key !== key);
      const without = prev.filter((l) => l.key !== key);
      return [...without, { key, player, market, line, side, prob }];
    });

  const combined = slip.reduce((a, l) => a * l.prob, 1);
  const mult = PICKEM_MULTIPLIERS[slip.length] ?? 0;
  const evVal = mult ? combined * mult - 1 : 0;

  if (err) return <Shell><p className="text-hot">{err}</p></Shell>;
  if (!proj) return <Shell><p className="text-slate-400">Loading…</p></Shell>;

  return (
    <Shell>
      <p className="mb-3 text-xs text-slate-500">
        Pick’em is a fixed-multiplier parlay — pick {Object.keys(PICKEM_MULTIPLIERS)[0]}+ players over/under a
        line; the model rates each line and the slip below shows your combined model probability vs the payout.
        {havePosted ? " Lines are Dabble’s where posted (★), else the model’s suggestion." : " Dabble hasn’t posted lines yet — showing model-suggested lines; edit any to match your screen."}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}
          className="max-w-[60vw] rounded-lg border border-line bg-card px-2.5 py-2 text-base">
          <option value="all">All matches</option>
          {matches.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="-mx-3 mb-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
        {PICKEM_MARKETS.map(([k, label]) => (
          <button key={k} onClick={() => setMarket(k)}
            className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition " +
              (market === k ? "bg-ice text-pitch" : "bg-pitch-light text-slate-300")}>
            {label}
          </button>
        ))}
      </div>

      <div className="-mx-3 overflow-x-auto px-3 pb-28">
        <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="sticky left-0 z-10 bg-pitch px-2 py-2 text-left">Player</th>
              <th className="bg-pitch px-2 py-2 text-right">Proj</th>
              <th className="bg-pitch px-2 py-2 text-right">Line</th>
              <th className="bg-pitch px-2 py-2 text-center">Under</th>
              <th className="bg-pitch px-2 py-2 text-center">Over</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((r) => {
              const leg = inSlip(r.key);
              const pUnder = 1 - r.pOver;
              const Cell = ({ side, prob }: { side: "over" | "under"; prob: number }) => {
                const on = leg?.side === side;
                const lean = r.lean === side;
                return (
                  <button onClick={() => toggleLeg(r.key, r.p.player, r.line, side, prob)}
                    className={"w-full rounded-md px-2 py-1.5 text-xs font-bold transition " +
                      (on ? "bg-grass text-pitch" : lean ? "bg-pitch-light text-grass ring-1 ring-grass/40" : "bg-pitch-light text-slate-400")}>
                    {(prob * 100).toFixed(0)}%
                  </button>
                );
              };
              return (
                <tr key={r.key}>
                  <td className="sticky left-0 z-10 border-t border-line/40 bg-pitch px-2 py-2">
                    <div className="font-semibold leading-tight">{r.p.player}{r.isPosted && <span title="Dabble posted line" className="ml-1 text-gold">★</span>}</div>
                    <div className="text-[11px] leading-tight text-slate-500">{r.match}</div>
                  </td>
                  <td className="border-t border-line/40 px-2 py-2 text-right text-slate-400">{r.p.dist[market].mean.toFixed(1)}</td>
                  <td className="border-t border-line/40 px-2 py-2 text-right">
                    <input inputMode="decimal" value={r.line}
                      onChange={(e) => setLines((p) => ({ ...p, [r.key]: Number(e.target.value) || r.line }))}
                      className="w-14 rounded border border-line bg-card px-1 py-1 text-right text-base" />
                  </td>
                  <td className="border-t border-line/40 px-1 py-1.5"><Cell side="under" prob={pUnder} /></td>
                  <td className="border-t border-line/40 px-1 py-1.5"><Cell side="over" prob={r.pOver} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* slip — fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-pitch/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto max-w-5xl px-3 py-2">
          {slip.length === 0 ? (
            <p className="py-1 text-center text-xs text-slate-500">Tap Over / Under to build a Pick’em slip (min 2 legs). Model-favoured side is outlined.</p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs">
                {slip.map((l) => (
                  <button key={l.key} onClick={() => setSlip((p) => p.filter((x) => x.key !== l.key))}
                    className="mr-1.5 rounded-full bg-card px-2 py-1 text-slate-200">
                    {l.player.split(" ").slice(-1)[0]} {l.side === "over" ? "O" : "U"}{l.line} ✕
                  </button>
                ))}
              </div>
              <div className="shrink-0 text-right text-xs">
                <div className="text-slate-400">{slip.length} legs · ×{mult || "—"}</div>
                <div className={"font-bold " + (evVal > 0 ? "text-grass" : "text-slate-300")}>
                  {(combined * 100).toFixed(1)}% · EV {mult ? `${evVal > 0 ? "+" : ""}${(evVal * 100).toFixed(0)}%` : "need 2+"}
                </div>
              </div>
              <button onClick={() => setSlip([])} className="shrink-0 rounded-md bg-card px-2 py-1 text-xs text-slate-400">Clear</button>
            </div>
          )}
        </div>
      </div>

      <Disclaimer />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">Pick’em</h1>
      <p className="mb-4 text-sm text-slate-400">
        The model’s read on every Dabble Pick’em line, plus a slip builder that prices your parlay.
      </p>
      <ModelNav />
      {children}
    </main>
  );
}
