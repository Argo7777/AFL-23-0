"use client";

import { useEffect, useMemo, useState } from "react";
import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";
import {
  loadProjections, loadPickem, probOver, playerKey, PICKEM_MULTIPLIERS,
  type Market, type ProjectionsOutput, type PlayerProjection,
} from "@/lib/modeldb";
import { loadSuperCoach, scIndex, probScOver, type ScPlayer } from "@/lib/supercoach";

// Dabble Pick'em markets. SuperCoach is special — priced from the SuperCoach
// projection (not the Monte-Carlo model, which doesn't score SC points).
type PkMarket = Market | "supercoach";
const PICKEM_MARKETS: [PkMarket, string][] = [
  ["disposals", "Disposals"], ["dreamTeamPoints", "Fantasy"], ["goals", "Goals"],
  ["marks", "Marks"], ["tackles", "Tackles"], ["supercoach", "SuperCoach"],
];
// full-name key so two players sharing an initial+surname never collide
const normName = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

interface Leg { key: string; player: string; market: PkMarket; line: number; side: "over" | "under"; prob: number; }

export default function PickemPage() {
  const [proj, setProj] = useState<ProjectionsOutput | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sc, setSc] = useState<Map<string, ScPlayer>>(new Map());
  const [market, setMarket] = useState<PkMarket>("disposals");
  const [matchFilter, setMatchFilter] = useState("all");
  const [lines, setLines] = useState<Record<string, number>>({}); // key -> overridden line
  const [slip, setSlip] = useState<Leg[]>([]);
  // Dabble posted lines, indexed by full name (and a collision-safe initial+surname fallback)
  const [posted, setPosted] = useState<{ full: Map<string, number>; key: Map<string, number | null> }>({ full: new Map(), key: new Map() });
  const [havePosted, setHavePosted] = useState(false);
  const [mode, setMode] = useState<"dabble" | "manual">("dabble"); // auto-fill from Dabble vs all players
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "conf", dir: -1 });
  const [q, setQ] = useState("");

  useEffect(() => {
    loadProjections().then(setProj).catch(() => setErr("Projections feed not built."));
    loadSuperCoach().then((f) => setSc(scIndex(f)));
    loadPickem().then((pk) => {
      if (!pk?.lines?.length) { setMode("manual"); return; } // no Dabble lines yet → manual
      const full = new Map<string, number>();
      const key = new Map<string, number | null>();          // null = two different players share this key
      const owner = new Map<string, string>();
      for (const l of pk.lines) {
        const nm = normName(l.player);
        full.set(`${nm}|${l.market}`, l.line);
        const kk = `${playerKey(l.player)}|${l.market}`;
        if (owner.has(kk) && owner.get(kk) !== nm) key.set(kk, null);
        else { owner.set(kk, nm); if (!key.has(kk)) key.set(kk, l.line); }
      }
      setPosted({ full, key }); setHavePosted(true);
    });
  }, []);

  const matches = useMemo(() => proj?.matches.map((m) => `${m.home_team} v ${m.away_team}`) ?? [], [proj]);

  // how many projected players share each initial+surname key — gates the fuzzy fallback
  const keyCount = useMemo(() => {
    const m = new Map<string, number>();
    proj?.matches.forEach((mt) => mt.players.forEach((p) => m.set(playerKey(p.player), (m.get(playerKey(p.player)) ?? 0) + 1)));
    return m;
  }, [proj]);

  const postedLineFor = (player: string, mkt: string): number | null => {
    const byFull = posted.full.get(`${normName(player)}|${mkt}`);
    if (byFull != null) return byFull;
    const fromKey = posted.key.get(`${playerKey(player)}|${mkt}`);
    if (fromKey != null && keyCount.get(playerKey(player)) === 1) return fromKey; // unambiguous only
    return null;
  };

  const rows = useMemo(() => {
    if (!proj) return [];
    const out: Array<{ key: string; p: PlayerProjection; match: string; proj: number; line: number; pOver: number; lean: "over" | "under"; conf: number; isPosted: boolean }> = [];
    for (const mt of proj.matches) {
      const match = `${mt.home_team} v ${mt.away_team}`;
      if (matchFilter !== "all" && match !== matchFilter) continue;
      for (const p of mt.players) {
        if (q && !p.player.toLowerCase().includes(q.toLowerCase())) continue;
        // projection + a P(over) function — from the SuperCoach feed for the SC
        // market, otherwise from the Monte-Carlo distribution.
        let projection: number;
        let pOverFn: (line: number) => number;
        if (market === "supercoach") {
          const scp = sc.get(playerKey(p.player));
          if (!scp) continue;
          projection = scp.proj || scp.avg;
          if (projection < 1) continue;
          pOverFn = (line) => probScOver(scp, line);
        } else {
          const d = p.dist[market];
          if (!d || d.mean < 1) continue;
          projection = d.mean;
          pOverFn = (line) => probOver(d, line);
        }
        const key = `${playerKey(p.player)}|${market}`;
        const postedLine = postedLineFor(p.player, market);
        // Dabble mode: only the lines Dabble actually posted (auto-filled board)
        if (mode === "dabble" && havePosted && postedLine == null && lines[key] == null) continue;
        const line = lines[key] ?? postedLine ?? Math.max(0.5, Math.round(projection) - 0.5);
        const pOver = pOverFn(line);
        const lean = pOver >= 0.5 ? "over" : "under";
        out.push({ key, p, match, proj: projection, line, pOver, lean, conf: Math.abs(pOver - 0.5), isPosted: postedLine != null });
      }
    }
    const val = (r: typeof out[number]): number | string =>
      sort.key === "player" ? r.p.player
      : sort.key === "proj" ? r.proj : sort.key === "line" ? r.line
      : sort.key === "over" ? r.pOver : sort.key === "under" ? 1 - r.pOver
      : r.conf; // default: model confidence (lean strength)
    out.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string") return va.localeCompare(vb as string) * sort.dir;
      return (va - (vb as number)) * sort.dir;
    });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj, sc, market, matchFilter, lines, posted, keyCount, mode, havePosted, sort, q]);

  const dabbleCount = useMemo(() => {
    if (!proj || !havePosted) return 0;
    let n = 0;
    for (const mt of proj.matches)
      for (const p of mt.players)
        if (postedLineFor(p.player, market) != null) n++;
    return n;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proj, posted, keyCount, market, havePosted]);

  const sortBy = (key: string) =>
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) as 1 | -1 : (key === "player" ? 1 : -1) }));

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
        {mode === "dabble"
          ? " Showing Dabble’s posted lines (★), auto-filled — edit any to match your screen."
          : " Manual mode: every projected player at the model’s suggested line — edit any line."}
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* auto-fill from Dabble vs manual entry */}
        <div className="inline-flex rounded-lg border border-line bg-card p-0.5 text-xs">
          <button onClick={() => setMode("dabble")} disabled={!havePosted}
            className={"rounded-md px-3 py-1.5 font-bold transition " +
              (mode === "dabble" ? "bg-grass text-pitch" : "text-slate-300 disabled:text-slate-600")}>
            {havePosted ? `Dabble ★ (${dabbleCount})` : "Dabble (soon)"}
          </button>
          <button onClick={() => setMode("manual")}
            className={"rounded-md px-3 py-1.5 font-bold transition " + (mode === "manual" ? "bg-grass text-pitch" : "text-slate-300")}>
            Manual / all
          </button>
        </div>
        <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)}
          className="max-w-[40vw] rounded-lg border border-line bg-card px-2.5 py-2 text-base">
          <option value="all">All matches</option>
          {matches.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base" />
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
              <ThP k="player" label="Player" align="left" sticky sort={sort} onSort={sortBy} />
              <ThP k="proj" label="Proj" sort={sort} onSort={sortBy} />
              <ThP k="line" label="Line" sort={sort} onSort={sortBy} />
              <ThP k="under" label="Under" align="center" sort={sort} onSort={sortBy} />
              <ThP k="over" label="Over" align="center" sort={sort} onSort={sortBy} />
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
                  <td className="border-t border-line/40 px-2 py-2 text-right text-slate-400">{r.proj.toFixed(1)}</td>
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
                <div className="text-slate-400">{slip.length} legs · ×{mult || "—"} · model {(combined * 100).toFixed(1)}%</div>
                <div className={"font-bold " + (mult ? (evVal > 0 ? "text-grass" : "text-hot") : "text-slate-300")}>
                  {mult
                    ? (evVal > 0 ? `✅ Edge +${(evVal * 100).toFixed(0)}%` : `❌ No edge ${(evVal * 100).toFixed(0)}%`)
                    : "add 2+ legs"}
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

function ThP({ k, label, align = "right", sticky = false, sort, onSort }: {
  k: string; label: string; align?: "left" | "right" | "center"; sticky?: boolean;
  sort: { key: string; dir: 1 | -1 }; onSort: (k: string) => void;
}) {
  const active = sort.key === k;
  const a = align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";
  return (
    <th className={(sticky ? "sticky left-0 z-10 " : "") + "bg-pitch px-2 py-2 " + a}>
      <button onClick={() => onSort(k)}
        className={"font-bold uppercase tracking-wide " + (active ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
        {label}{active ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
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
