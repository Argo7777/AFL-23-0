"use client";

import { PlayerEntry } from "@/lib/game/types";
import { clubColors } from "@/lib/game/clubColors";
import { honours } from "@/components/PlayerCard";

/** Season-by-season career sheet, shown as a modal. */
export default function PlayerSheet({
  p,
  onClose,
}: {
  p: PlayerEntry;
  onClose: () => void;
}) {
  const club = Object.keys(p.c)[0] ?? "";
  const hasDi = p.sea?.some((s) => s[2] != null);
  const hasBr = p.sea?.some((s) => (s[4] ?? 0) > 0);
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-pitch/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="pop max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-card p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-2.5 shrink-0 flex-col overflow-hidden rounded-sm">
                <span className="flex-1" style={{ background: clubColors(club)[0] }} />
                <span className="flex-1" style={{ background: clubColors(club)[1] }} />
              </span>
              <span className="font-display text-2xl font-black">{p.n}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {Object.keys(p.c).join(", ")} · {p.y[0]}–{p.y[1]} · {p.g} games
              {p.h ? ` · ${p.h}cm` : ""} · {p.nat}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-line px-2.5 py-1 text-xs text-slate-400 hover:border-grass/50">
            ✕
          </button>
        </div>

        {honours(p).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {honours(p).map((h) => (
              <span key={h} className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                {h}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[10px] uppercase tracking-wider text-slate-500">
          <span className="text-left">Season</span>
          <span>Games</span>
          <span>{hasDi ? "Disposals" : "Goals"}</span>
          <span>{hasBr ? "Votes" : hasDi ? "Goals" : "—"}</span>
        </div>
        <div className="mt-1 grid gap-0.5">
          {(p.sea ?? []).map(([yr, gm, di, gl, br]) => (
            <div key={yr} className="grid grid-cols-4 gap-1 rounded-lg bg-pitch px-2 py-1 text-center text-xs text-slate-300">
              <span className="text-left font-display font-black text-slate-100">{yr}</span>
              <span>{gm}</span>
              <span>{hasDi ? (di ?? "—") : gl ?? "—"}</span>
              <span>{hasBr ? (br ?? 0) : hasDi ? (gl ?? "—") : "—"}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          This decade only — players appear separately in each decade they played.
        </p>
      </div>
    </div>
  );
}
