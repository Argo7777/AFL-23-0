import { db } from "../lib/db.js";

/**
 * AFLW player ratings — PER SEASON (a player is rated on a single year's form,
 * not a decade), because AFLW has only ~10 seasons. Output matches the AFL game's
 * PlayerEntry shape so the whole game/sim reuses it. The 2022 doubleheader
 * (S6 + S7) is merged into one "2022" season for the game pool.
 */

type Pos = "DEF" | "MID" | "RUC" | "FWD";
const POSITIONS: Pos[] = ["DEF", "MID", "RUC", "FWD"];

interface Agg {
  playerId: string; name: string; team: string; games: number;
  // per-game rate accumulators (summed totals; divided by games later)
  gl: number; kk: number; hb: number; di: number; mk: number; tk: number; cp: number;
  i5: number; mi5: number; cm: number; ho: number; op: number; cl: number; r5: number;
  ic: number; ga: number; mg: number;
}

// per-game stat weights per position cohort
const W: Record<Pos, Partial<Record<keyof Agg, number>>> = {
  DEF: { r5: 0.3, ic: 0.25, op: 0.15, mk: 0.15, di: 0.1, cp: 0.05 },
  MID: { di: 0.3, cp: 0.2, cl: 0.2, tk: 0.12, i5: 0.1, mg: 0.08 },
  RUC: { ho: 0.55, cl: 0.15, cp: 0.12, mk: 0.1, tk: 0.08 },
  FWD: { gl: 0.4, mi5: 0.18, ga: 0.14, cm: 0.12, mk: 0.1, i5: 0.06 },
};

const SALARY_MIN = 100_000, SALARY_TOP = 1_900_000, SALARY_GAMMA = 2.2;

export interface AflwPlayerEntry {
  id: string; n: string; g: number; h: null; y: [number, number]; d0: number;
  c: Record<string, number>; r: Record<Pos, number>; nat: Pos; elig: (Pos | "UTL")[];
  src: string; u: number; s: number;
  a: { bw: number; bwW: number; t10: number; aa: number; aas: number; col: number; c3: number; pr: number; rs: number; acc: number };
  st: { di: number | null; gl: number | null; mk: number | null; tk: number | null; ho: number | null };
  sea: [number, number, number | null, number | null, number | null][];
}

export interface AflwPlayersResult {
  byYear: Record<number, AflwPlayerEntry[]>;
  years: number[];
  clubsByYear: Record<number, string[]>;
}

/** Map a season_key ("2022-s6") to its game-season year (2022). */
function seasonYear(key: string): number {
  return Number(key.slice(0, 4));
}

export function buildAflwPlayers(): AflwPlayersResult {
  const rows = db
    .prepare(`SELECT season_key, year, player_id, name, team, position,
                     gl, kk, hb, di, mk, tk, cp, i5, mi5, cm, ho, op, cl, r5, ic, ga, mg
                FROM aflw_player_games`)
    .all() as (Omit<Agg, "games"> & { season_key: string; year: number; position: string | null })[];

  // aggregate per (gameYear, player) — merges the 2022 S6/S7 rows by year
  const byYearPlayer = new Map<string, Agg & { year: number }>();
  for (const r of rows) {
    const y = seasonYear(r.season_key);
    const k = `${y}|${r.player_id}`;
    let a = byYearPlayer.get(k);
    if (!a) {
      a = {
        year: y, playerId: r.player_id, name: r.name, team: r.team, games: 0,
        gl: 0, kk: 0, hb: 0, di: 0, mk: 0, tk: 0, cp: 0, i5: 0, mi5: 0, cm: 0,
        ho: 0, op: 0, cl: 0, r5: 0, ic: 0, ga: 0, mg: 0,
      };
      byYearPlayer.set(k, a);
    }
    a.games++;
    for (const s of ["gl","kk","hb","di","mk","tk","cp","i5","mi5","cm","ho","op","cl","r5","ic","ga","mg"] as (keyof Agg)[]) {
      (a[s] as number) += (r[s as keyof typeof r] as number) ?? 0;
    }
    // keep the club where they played most recently in the season
    a.team = r.team;
  }

  // career sheet (per player, across all AFLW seasons) for the `sea` field
  const careerByPlayer = new Map<string, Map<number, { g: number; di: number; gl: number }>>();
  for (const a of byYearPlayer.values()) {
    let m = careerByPlayer.get(a.playerId);
    if (!m) careerByPlayer.set(a.playerId, (m = new Map()));
    m.set(a.year, { g: a.games, di: a.di, gl: a.gl });
  }

  const years = [...new Set([...byYearPlayer.values()].map((a) => a.year))].sort((x, y) => x - y);
  const byYear: Record<number, AflwPlayerEntry[]> = {};
  const clubsByYear: Record<number, string[]> = {};

  for (const year of years) {
    const aggs = [...byYearPlayer.values()].filter((a) => a.year === year && a.games >= 1);
    if (aggs.length === 0) continue;

    // per-game rates
    type Rate = Record<keyof Agg, number>;
    const rate = new Map<string, Rate>();
    for (const a of aggs) {
      const r = {} as Rate;
      for (const s of ["gl","kk","hb","di","mk","tk","cp","i5","mi5","cm","ho","op","cl","r5","ic","ga","mg"] as (keyof Agg)[]) {
        r[s] = (a[s] as number) / a.games;
      }
      rate.set(a.playerId, r);
    }

    // standardise each stat across the season
    const stats = ["gl","kk","hb","di","mk","tk","cp","i5","mi5","cm","ho","op","cl","r5","ic","ga","mg"] as (keyof Agg)[];
    const mean = {} as Record<keyof Agg, number>, std = {} as Record<keyof Agg, number>;
    for (const s of stats) {
      const vals = aggs.map((a) => rate.get(a.playerId)![s]);
      const m = vals.reduce((x, y) => x + y, 0) / vals.length;
      const v = vals.reduce((x, y) => x + (y - m) * (y - m), 0) / vals.length;
      mean[s] = m; std[s] = Math.sqrt(v) || 1e-6;
    }
    const z = (pid: string, s: keyof Agg) => (rate.get(pid)![s] - mean[s]) / std[s];

    // raw weighted-z per position, shrunk for low games
    const rawPos = new Map<string, Record<Pos, number>>();
    for (const a of aggs) {
      const rel = a.games / (a.games + 3); // reliability shrink (short AFLW seasons)
      const rp = {} as Record<Pos, number>;
      for (const pos of POSITIONS) {
        let sum = 0;
        for (const [stat, w] of Object.entries(W[pos]) as [keyof Agg, number][]) {
          sum += w * z(a.playerId, stat);
        }
        rp[pos] = sum * rel;
      }
      rawPos.set(a.playerId, rp);
    }

    // rank-calibrate each position to 0-100 within the season (best≈100, median≈40)
    const rating = new Map<string, Record<Pos, number>>();
    for (const a of aggs) rating.set(a.playerId, { DEF: 0, MID: 0, RUC: 0, FWD: 0 });
    for (const pos of POSITIONS) {
      const sorted = [...aggs].sort((x, y) => rawPos.get(y.playerId)![pos] - rawPos.get(x.playerId)![pos]);
      const n = sorted.length;
      sorted.forEach((a, i) => {
        const pct = n > 1 ? 1 - i / (n - 1) : 1;
        rating.get(a.playerId)![pos] = Math.max(20, Math.round(100 * Math.pow(pct, 1.32) * 10) / 10);
      });
    }

    const entries: AflwPlayerEntry[] = [];
    const clubs = new Set<string>();
    for (const a of aggs) {
      const r = rating.get(a.playerId)!;
      const rt = rate.get(a.playerId)!;
      const best = Math.max(r.DEF, r.MID, r.RUC, r.FWD);
      const nat = POSITIONS.reduce((b, p) => (r[p] > r[b] ? p : b), "MID" as Pos);
      // eligibility: positions within 12 of best and >= 60; RUC also needs real hitouts
      const elig: (Pos | "UTL")[] = POSITIONS.filter((p) => {
        if (r[p] < Math.max(60, best - 12)) return false;
        if (p === "RUC" && rt.ho < 2) return false;
        return true;
      });
      if (!elig.includes(nat)) elig.unshift(nat);
      const strong = elig.length;
      const u = Math.min(1.12, 1 + 0.04 * Math.max(0, strong - 1));
      const norm = Math.min(1, Math.max(0, (best - 20) / 80));
      const s = Math.round((SALARY_MIN + (SALARY_TOP - SALARY_MIN) * Math.pow(norm, SALARY_GAMMA)) / 5000) * 5000;

      const career = [...(careerByPlayer.get(a.playerId)?.entries() ?? [])]
        .sort((x, y) => x[0] - y[0])
        .map(([yr, c]) => [yr, c.g, Math.round((c.di / c.g) * 10) / 10, Math.round((c.gl / c.g) * 10) / 10, null] as [number, number, number | null, number | null, number | null]);
      const d0 = career.length ? career[0][0] : year;

      entries.push({
        id: `aflw/${a.playerId}|${year}`,
        n: a.name,
        g: a.games,
        h: null,
        y: [year, year],
        d0,
        c: { [a.team]: a.games },
        r,
        nat,
        elig,
        src: "afl-api",
        u: Math.round(u * 100) / 100,
        s,
        a: { bw: 0, bwW: 0, t10: 0, aa: 0, aas: 0, col: 0, c3: 0, pr: 0, rs: 0, acc: 0 },
        st: {
          di: Math.round(rt.di * 10) / 10,
          gl: Math.round(rt.gl * 10) / 10,
          mk: Math.round(rt.mk * 10) / 10,
          tk: Math.round(rt.tk * 10) / 10,
          ho: rt.ho >= 1 ? Math.round(rt.ho * 10) / 10 : null,
        },
        sea: career,
      });
      clubs.add(a.team);
    }
    entries.sort((x, y) => Math.max(y.r.DEF, y.r.MID, y.r.RUC, y.r.FWD) - Math.max(x.r.DEF, x.r.MID, x.r.RUC, x.r.FWD));
    byYear[year] = entries;
    clubsByYear[year] = [...clubs].sort();
  }

  return { byYear, years, clubsByYear };
}
