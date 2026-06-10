"use client";

import { Mode, Pick, Slot, SQUADS } from "@/lib/game/types";

export interface SlotInstance {
  slot: Slot;
  x: number; // % of field width (UTL: bench, x ignored)
  y: number; // % of field height
  label?: string; // traditional position name shown on empty spots
}

/**
 * Field placements per mode (UTL renders on the interchange bench strip).
 * Full 23 uses the traditional structure: full-back and half-back lines,
 * centreline of two wingers and a centre, two followers, one ruck,
 * half-forward and full-forward lines, five on the bench.
 */
const LAYOUTS: Record<Mode, SlotInstance[]> = {
  classic5: [
    { slot: "DEF", x: 50, y: 81 },
    { slot: "MID", x: 50, y: 44 },
    { slot: "RUC", x: 50, y: 56 },
    { slot: "FWD", x: 50, y: 17 },
    { slot: "UTL", x: 50, y: 0 },
  ],
  full23: [
    // back six
    { slot: "DEF", x: 30, y: 80, label: "BP" }, { slot: "DEF", x: 50, y: 84, label: "FB" },
    { slot: "DEF", x: 70, y: 80, label: "BP" }, { slot: "DEF", x: 28, y: 69, label: "HB" },
    { slot: "DEF", x: 50, y: 71.5, label: "CHB" }, { slot: "DEF", x: 72, y: 69, label: "HB" },
    // centreline + followers
    { slot: "MID", x: 13, y: 50, label: "W" }, { slot: "MID", x: 50, y: 43, label: "C" },
    { slot: "MID", x: 87, y: 50, label: "W" },
    { slot: "MID", x: 40, y: 56, label: "FOL" }, { slot: "MID", x: 60, y: 56, label: "FOL" },
    // ruck at the bounce
    { slot: "RUC", x: 50, y: 50, label: "RUC" },
    // forward six
    { slot: "FWD", x: 28, y: 30.5, label: "HF" }, { slot: "FWD", x: 50, y: 28, label: "CHF" },
    { slot: "FWD", x: 72, y: 30.5, label: "HF" }, { slot: "FWD", x: 30, y: 19, label: "FP" },
    { slot: "FWD", x: 50, y: 16, label: "FF" }, { slot: "FWD", x: 70, y: 19, label: "FP" },
    // interchange
    { slot: "UTL", x: 0, y: 0 }, { slot: "UTL", x: 0, y: 0 }, { slot: "UTL", x: 0, y: 0 },
    { slot: "UTL", x: 0, y: 0 }, { slot: "UTL", x: 0, y: 0 },
  ],
  cap23: [],
};
LAYOUTS.cap23 = LAYOUTS.full23;

export function slotInstances(mode: Mode): SlotInstance[] {
  const layout = LAYOUTS[mode];
  // sanity: layout must agree with squad spec
  const want = SQUADS[mode].reduce((a, s) => a + s.count, 0);
  if (layout.length !== want) throw new Error(`layout mismatch for ${mode}`);
  return layout;
}

function Chip({
  pick,
  slot,
  label,
  selected,
  movable,
  onClick,
}: {
  pick: Pick | null;
  slot: Slot;
  label?: string;
  selected: boolean;
  movable: boolean;
  onClick: () => void;
}) {
  const surname = pick ? pick.player.n.split(" ").slice(-1)[0] : null;
  return (
    <button
      onClick={onClick}
      disabled={!movable && !pick}
      className={`group flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center ${
        movable ? "cursor-pointer" : "cursor-default"
      }`}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm font-black transition ${
          pick
            ? selected
              ? "border-gold bg-gold text-pitch shadow-[0_0_16px] shadow-gold/60"
              : "border-grass bg-pitch text-grass group-hover:shadow-[0_0_12px] group-hover:shadow-grass/50"
            : selected
              ? "border-gold border-dashed bg-gold/20 text-gold"
              : "border-dashed border-white/40 bg-black/20 text-white/60"
        }`}
      >
        {pick ? Math.round(pick.score) : (label ?? slot)}
      </span>
      <span
        className={`mt-0.5 max-w-20 truncate rounded px-1 text-center text-[9px] font-bold leading-tight ${
          pick ? "bg-pitch/80 text-slate-100" : "text-white/50"
        }`}
      >
        {surname ?? "—"}
      </span>
    </button>
  );
}

/**
 * The team laid out on an AFL oval. Click a filled position then another
 * position to swap/move players between turns; scores recompute for the new
 * role. UTL spots sit on the interchange bench below the field.
 */
export default function TeamField({
  mode,
  roster,
  selected,
  movable,
  onSelect,
}: {
  mode: Mode;
  roster: (Pick | null)[];
  selected: number | null;
  movable: boolean;
  onSelect: (index: number) => void;
}) {
  const instances = slotInstances(mode);
  const field = instances
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.slot !== "UTL");
  const bench = instances
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.slot === "UTL");

  return (
    <div className="mx-auto w-full max-w-105">
      <div className="relative">
        <svg viewBox="0 0 100 134" className="w-full">
          {/* turf */}
          <ellipse cx="50" cy="67" rx="47" ry="64" fill="#14532d" />
          <ellipse cx="50" cy="67" rx="47" ry="64" fill="url(#turf)" />
          <defs>
            <radialGradient id="turf" cx="0.5" cy="0.45" r="0.9">
              <stop offset="0%" stopColor="#1e7a3f" />
              <stop offset="60%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </radialGradient>
          </defs>
          {/* mow rings */}
          {[52, 40, 28, 16].map((ry, k) => (
            <ellipse key={k} cx="50" cy="67" rx={(ry / 64) * 47} ry={ry} fill="none" stroke="#ffffff0d" strokeWidth="6" />
          ))}
          <ellipse cx="50" cy="67" rx="46" ry="63" fill="none" stroke="#e2e8f0" strokeWidth="0.6" opacity="0.8" />
          {/* centre square + circles */}
          <rect x="35" y="52" width="30" height="30" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          <circle cx="50" cy="67" r="4.5" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          <circle cx="50" cy="67" r="1.2" fill="#e2e8f0" opacity="0.7" />
          {/* 50m arcs */}
          <path d="M 21 13 A 38 38 0 0 0 79 13" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          <path d="M 21 121 A 38 38 0 0 1 79 121" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          {/* goal squares */}
          <rect x="44" y="3.2" width="12" height="7" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          <rect x="44" y="123.8" width="12" height="7" fill="none" stroke="#e2e8f0" strokeWidth="0.45" opacity="0.7" />
          {/* goal posts */}
          {[[44, 56], [44, 56]].map((xs, end) =>
            xs.map((x) => (
              <line
                key={`${end}-${x}`}
                x1={x} x2={x}
                y1={end === 0 ? 3.2 : 130.8}
                y2={end === 0 ? 0.2 : 133.8}
                stroke="#fbbf24" strokeWidth="0.8"
              />
            )),
          )}
        </svg>
        {field.map(({ slot, x, y, i, label }) => (
          <div key={i} className="absolute" style={{ left: `${x}%`, top: `${(y / 100) * 100}%` }}>
            <Chip
              pick={roster[i]}
              slot={slot}
              label={label}
              selected={selected === i}
              movable={movable}
              onClick={() => onSelect(i)}
            />
          </div>
        ))}
      </div>
      {bench.length > 0 && (
        <div className="mt-1 rounded-xl border border-line bg-pitch-light px-3 pb-4 pt-2">
          <p className="text-center text-[9px] uppercase tracking-[0.25em] text-slate-500">
            interchange · utility
          </p>
          <div className="relative mt-6 flex justify-center gap-10">
            {bench.map(({ slot, i }) => (
              <div key={i} className="relative h-10 w-4">
                <Chip
                  pick={roster[i]}
                  slot={slot}
                  selected={selected === i}
                  movable={movable}
                  onClick={() => onSelect(i)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
