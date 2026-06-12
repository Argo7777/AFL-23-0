"use client";

import { clubColors } from "@/lib/game/clubColors";
import { PlayerEntry, Slot } from "@/lib/game/types";

const fmtSalary = (s: number) =>
  s >= 1_000_000 ? `$${(s / 1_000_000).toFixed(2)}M` : `$${Math.round(s / 1000)}k`;

export function honours(p: PlayerEntry): string[] {
  const out: string[] = [];
  if (p.a.bwW > 0) out.push(`${p.a.bwW}× Brownlow Medal`);
  if (p.a.aa > 0) out.push(`${p.a.aa}× All-Australian`);
  // the leading-goalkicker medal has carried Coleman's name since 1955
  if (p.a.col > 0) out.push(`${p.a.col}× ${p.y[0] >= 1955 ? "Coleman Medal" : "leading goalkicker"}`);
  if (p.a.pr > 0) out.push(`${p.a.pr}× premiership`);
  if (p.a.bw > 0 && p.a.bwW === 0) out.push(`${p.a.bw} Brownlow votes`);
  if (p.a.rs > 0) out.push("Rising Star");
  return out;
}

export default function PlayerCard({
  p,
  club,
  showSalary,
  disabled,
  ratingPos,
  onPick,
  onInfo,
}: {
  p: PlayerEntry;
  club: string;
  showSalary: boolean;
  disabled?: boolean;
  /** show the rating for this position instead of the player's best */
  ratingPos?: Exclude<Slot, "UTL"> | null;
  onPick: () => void;
  /** open the season-by-season career sheet */
  onInfo?: () => void;
}) {
  const best = ratingPos ? p.r[ratingPos] : Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
  const hon = honours(p).slice(0, 3);
  const statBits = [
    p.st.di != null && p.st.di > 0 ? `${p.st.di.toFixed(1)} disp` : null,
    p.st.gl != null && p.st.gl >= 0.5 ? `${p.st.gl.toFixed(1)} goals` : null,
    p.st.ho != null && p.st.ho >= 4 ? `${p.st.ho.toFixed(1)} hitouts` : null,
    p.st.mk != null && p.st.mk >= 3 ? `${p.st.mk.toFixed(1)} marks` : null,
    p.st.tk != null && p.st.tk >= 2 ? `${p.st.tk.toFixed(1)} tackles` : null,
  ]
    .filter(Boolean)
    .slice(0, 3);

  return (
    <button
      onClick={onPick}
      disabled={disabled}
      style={{ borderLeft: `4px solid ${clubColors(club)[0]}` }}
      className={`w-full rounded-xl border border-line bg-card p-3 text-left transition ${
        disabled ? "opacity-40" : "hover:border-grass/60 hover:bg-card-hover"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-black">
            {p.n}
            {onInfo && (
              <span
                role="button"
                tabIndex={0}
                aria-label={`${p.n} career stats`}
                onClick={(e) => {
                  e.stopPropagation();
                  onInfo();
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onInfo())}
                className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line align-middle text-[10px] font-bold text-slate-400 hover:border-ice hover:text-ice"
              >
                i
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {p.g} games · {p.y[0]}–{p.y[1]} · {club}
            {p.h ? ` · ${p.h}cm` : ""}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="rounded-lg bg-pitch px-2 py-1 font-display text-xl font-black text-grass">
            {Math.round(best)}
          </div>
          <div className="mt-0.5 text-[10px] font-bold uppercase text-gold">
            {ratingPos && ratingPos !== p.nat ? `at ${ratingPos} · ${p.nat}` : p.nat}
          </div>
        </div>
      </div>
      {showSalary && (
        <div className="mt-1 font-display text-base font-black text-gold">{fmtSalary(p.s)}</div>
      )}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
        {statBits.map((s) => (
          <span key={s as string}>{s}</span>
        ))}
      </div>
      {hon.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {hon.map((h) => (
            <span
              key={h}
              className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold"
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export { fmtSalary };
