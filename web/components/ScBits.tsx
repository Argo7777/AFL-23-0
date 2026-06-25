"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import SuperCoachNav from "@/components/SuperCoachNav";
import { loadSuperCoach, type ScFeed, type ScPlayer, posClass, availability } from "@/lib/supercoach";

/** Load the SuperCoach feed once per page. */
export function useScFeed(): { feed: ScFeed | null; err: boolean } {
  const [feed, setFeed] = useState<ScFeed | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    loadSuperCoach().then((f) => (f ? setFeed(f) : setErr(true))).catch(() => setErr(true));
  }, []);
  return { feed, err };
}

/** Standard page wrapper for every SuperCoach page. */
export function ScShell({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-3 py-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-md bg-gold px-2 py-0.5 font-display text-xs font-black uppercase text-pitch">SuperCoach</span>
        <h1 className="font-display text-2xl font-black text-gold">{title}</h1>
      </div>
      <p className="mb-4 text-sm text-slate-400">{blurb}</p>
      <SuperCoachNav />
      {children}
    </main>
  );
}

/** Coloured position chips, e.g. MID / FWD (DPP shows both). */
export function PosBadge({ positions }: { positions: string[] }) {
  return (
    <span className="whitespace-nowrap">
      {positions.map((p) => (
        <span key={p} className={"mr-1 text-[11px] font-black uppercase " + posClass(p)}>{p}</span>
      ))}
    </span>
  );
}

/** Availability tag (OUT / TEST / SUSP / NEWS) — null when fit & no news. */
export function AvailBadge({ p }: { p: ScPlayer }) {
  const a = availability(p);
  if (!a) return null;
  return <span className={"ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-black " + a.cls}>{a.label}</span>;
}

/** Tiny inline sparkline of a player's round-by-round SuperCoach scores. */
export function Sparkline({ scores, w = 90, h = 22 }: { scores: Array<{ round: number; pts: number }>; w?: number; h?: number }) {
  if (!scores.length) return <span className="text-slate-600">—</span>;
  const pts = scores.map((s) => s.pts);
  const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
  const span = max - min || 1;
  const step = scores.length > 1 ? w / (scores.length - 1) : 0;
  const d = scores.map((s, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((s.pts - min) / span) * h).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="overflow-visible align-middle">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/70" />
      <circle cx={(step * (scores.length - 1)).toFixed(1)} cy={(h - ((last - min) / span) * h).toFixed(1)} r="2" className="fill-gold" />
    </svg>
  );
}

export type Align = "left" | "right" | "center";
export interface Col<T> {
  key: string; label: string; align?: Align;
  value: (r: T) => number | string;            // for sorting
  render?: (r: T) => ReactNode;                 // optional custom cell
  cls?: string;
}

/**
 * Generic sortable table used by most SuperCoach boards. Click a header to sort;
 * the first column is sticky for horizontal scrolling on mobile.
 */
export function SortableTable<T extends { id: number }>({
  rows, cols, initialSort, initialDir = -1, max = 400,
}: { rows: T[]; cols: Col<T>[]; initialSort: string; initialDir?: 1 | -1; max?: number }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: initialSort, dir: initialDir });
  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sort.key) ?? cols[0];
    return [...rows].sort((a, b) => {
      const va = col.value(a), vb = col.value(b);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * sort.dir;
      return (va - vb) * sort.dir;
    }).slice(0, max);
  }, [rows, cols, sort, max]);
  const onSort = (k: string) =>
    setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : -1 }));
  const al = (a?: Align) => (a === "left" ? "text-left" : a === "center" ? "text-center" : "text-right");
  return (
    <div className="-mx-3 overflow-x-auto px-3">
      <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            {cols.map((c, i) => (
              <th key={c.key} className={(i === 0 ? "sticky left-0 z-10 " : "") + "bg-pitch px-2 py-2 " + al(c.align)}>
                <button onClick={() => onSort(c.key)}
                  className={"font-bold uppercase tracking-wide " + (sort.key === c.key ? "text-slate-100" : "text-slate-400 hover:text-slate-200")}>
                  {c.label}{sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-card-hover/40">
              {cols.map((c, i) => (
                <td key={c.key}
                  className={(i === 0 ? "sticky left-0 z-10 bg-pitch " : "") + "border-t border-line/40 px-2 py-1.5 " + al(c.align) + " " + (c.cls ?? "")}>
                  {c.render ? c.render(r) : c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length && <p className="py-6 text-center text-sm text-slate-500">No players match.</p>}
    </div>
  );
}
