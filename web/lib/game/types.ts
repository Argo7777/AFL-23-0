export type Position = "DEF" | "MID" | "RUC" | "FWD";
export type Slot = Position | "UTL";

export interface PlayerEntry {
  id: string;
  n: string; // name
  g: number; // games in decade
  h?: number | null; // height cm where known
  y: [number, number];
  d0?: number; // career debut year (full career, for age modelling)
  c: Record<string, number>; // club -> games
  r: Record<Position, number>; // rating per position, 0-100
  nat: Position;
  elig: Slot[];
  src: string;
  u: number; // UTL versatility multiplier
  s: number; // salary
  a: {
    bw: number; bwW: number; t10: number; aa: number; aas: number;
    col: number; c3: number; pr: number; rs: number; acc: number;
  };
  st: { di: number | null; gl: number | null; mk: number | null; tk: number | null; ho: number | null };
  /** career sheet: [year, games, disposals|null, goals|null, brownlow votes|null] */
  sea?: [number, number, number | null, number | null, number | null][];
}

export interface Meta {
  generatedAt: string;
  decades: number[];
  clubsByDecade: Record<string, string[]>;
  capByDecade: Record<string, number>;
  salary: { min: number; top: number; gamma: number };
  sources: string[];
}

export type Mode = "classic5" | "full23" | "cap23" | "gauntlet" | "spoon";

export interface SlotSpec {
  slot: Slot;
  count: number;
}

export const SQUADS: Record<Mode, SlotSpec[]> = {
  classic5: [
    { slot: "DEF", count: 1 }, { slot: "MID", count: 1 }, { slot: "RUC", count: 1 },
    { slot: "FWD", count: 1 }, { slot: "UTL", count: 1 },
  ],
  // traditional structure: back six, centreline (2 wings + centre),
  // 2 followers, 1 ruck, forward six, 5 on the bench
  full23: [
    { slot: "DEF", count: 6 }, { slot: "MID", count: 5 }, { slot: "RUC", count: 1 },
    { slot: "FWD", count: 6 }, { slot: "UTL", count: 5 },
  ],
  cap23: [
    { slot: "DEF", count: 6 }, { slot: "MID", count: 5 }, { slot: "RUC", count: 1 },
    { slot: "FWD", count: 6 }, { slot: "UTL", count: 5 },
  ],
  // gauntlet & spoon play with the classic five
  gauntlet: [
    { slot: "DEF", count: 1 }, { slot: "MID", count: 1 }, { slot: "RUC", count: 1 },
    { slot: "FWD", count: 1 }, { slot: "UTL", count: 1 },
  ],
  spoon: [
    { slot: "DEF", count: 1 }, { slot: "MID", count: 1 }, { slot: "RUC", count: 1 },
    { slot: "FWD", count: 1 }, { slot: "UTL", count: 1 },
  ],
};

export const REROLLS: Record<Mode, number> = {
  classic5: 2, full23: 5, cap23: 5, gauntlet: 2, spoon: 2,
};

export interface Pick {
  player: PlayerEntry;
  decade: number;
  club: string;
  slot: Slot;
  score: number; // rating in the assigned slot (incl. UTL multiplier)
  /** best & worst achievable score per slot from this spin's pool, captured
   *  at pick time — powers the "vs your spins' ceiling" verdict */
  pb?: Record<Slot, number>;
  pw?: Record<Slot, number>;
}

/** per-slot best/worst achievable from a pool (excluding taken players) */
export function poolExtremes(
  pool: PlayerEntry[],
  usedKeys: Set<string>,
): { pb: Record<Slot, number>; pw: Record<Slot, number> } {
  const slots: Slot[] = ["DEF", "MID", "RUC", "FWD", "UTL"];
  const pb = { DEF: 0, MID: 0, RUC: 0, FWD: 0, UTL: 0 } as Record<Slot, number>;
  const pw = { DEF: 999, MID: 999, RUC: 999, FWD: 999, UTL: 999 } as Record<Slot, number>;
  for (const p of pool) {
    if (usedKeys.has(p.id.split("|")[0])) continue;
    for (const s of slots) {
      const v = scoreInSlot(p, s);
      if (v > pb[s]) pb[s] = v;
      if (v < pw[s]) pw[s] = v;
    }
  }
  for (const s of slots) if (pw[s] === 999) pw[s] = 0;
  return { pb, pw };
}

/** Score a player in a slot: off-position uses that position's cohort rating;
 * UTL uses best position x versatility multiplier. */
export function scoreInSlot(p: PlayerEntry, slot: Slot): number {
  if (slot === "UTL") {
    const best = Math.max(p.r.DEF, p.r.MID, p.r.RUC, p.r.FWD);
    return Math.min(100, Math.round(best * p.u * 10) / 10);
  }
  return p.r[slot];
}
