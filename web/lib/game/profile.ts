import { Mode } from "./types";

export interface GameRecord {
  t: number; // timestamp
  mode: Mode;
  daily?: string; // YYYY-MM-DD when it was that day's daily challenge
  wins: number;
  losses: number;
  flag: boolean;
  perfect: boolean;
  rating: number;
  eras: number[];
}

interface Profile {
  games: GameRecord[];
}

const KEY = "afl230-profile";
export const DAILY_EPOCH = "2026-06-12"; // Daily #1

export function readProfile(): Profile {
  if (typeof window === "undefined") return { games: [] };
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "") as Profile;
  } catch {
    return { games: [] };
  }
}

/** records the game; returns any badges earned by this result */
export function recordGame(rec: GameRecord): Badge[] {
  const p = readProfile();
  // one recorded result per daily
  if (rec.daily && p.games.some((g) => g.daily === rec.daily)) return [];
  const before = new Set(badges(p).map((b) => b.label));
  p.games.push(rec);
  if (p.games.length > 200) p.games = p.games.slice(-200);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full/blocked */
  }
  return badges(p).filter((b) => !before.has(b.label));
}

/** mark the most recent recorded game as a premiership (finals won) */
export function flagLastGame() {
  const p = readProfile();
  if (!p.games.length) return;
  p.games[p.games.length - 1].flag = true;
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/** Melbourne-time date string — footy runs on AEST */
export function todayMelbourne(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dailyNumber(date = todayMelbourne()): number {
  const ms = Date.parse(date) - Date.parse(DAILY_EPOCH);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function dailySeed(date = todayMelbourne()): number {
  return Number(date.replaceAll("-", "")) ^ 0x230230;
}

export function todaysDaily(): GameRecord | undefined {
  return readProfile().games.find((g) => g.daily === todayMelbourne());
}

export interface Badge {
  emoji: string;
  label: string;
}

export function badges(p: Profile): Badge[] {
  const g = p.games;
  const flags = g.filter((x) => x.flag);
  const out: Badge[] = [];
  if (g.length >= 1) out.push({ emoji: "🏉", label: "First bounce" });
  if (g.length >= 25) out.push({ emoji: "🎯", label: "25 seasons coached" });
  if (flags.length >= 1) out.push({ emoji: "🏆", label: "Premiership coach" });
  if (flags.length >= 5) out.push({ emoji: "👑", label: "Dynasty — 5 flags" });
  if (g.some((x) => x.perfect)) out.push({ emoji: "🔥", label: "23-0 — PERFECTION" });
  if (flags.some((x) => x.mode === "cap23")) out.push({ emoji: "💰", label: "Flag under the cap" });
  if (flags.some((x) => x.eras.length === 1)) out.push({ emoji: "⏳", label: "Single-era flag" });
  if (flags.some((x) => x.mode !== "classic5")) out.push({ emoji: "📋", label: "Deep-squad flag" });
  if (g.filter((x) => x.daily).length >= 3) out.push({ emoji: "📅", label: "Daily regular" });
  if (g.some((x) => x.wins >= 21 && x.mode !== "gauntlet")) out.push({ emoji: "⚡", label: "21+ win season" });
  if (g.some((x) => x.mode === "spoon" && x.wins === 0)) out.push({ emoji: "🥄", label: "Perfect Spoon — 0-23" });
  if (g.some((x) => x.mode === "gauntlet" && x.flag)) out.push({ emoji: "🛡️", label: "Conquered all of history" });
  return out;
}

export function summary(p: Profile) {
  const g = p.games;
  if (!g.length) return null;
  const best = g.reduce((a, b) => (b.wins > a.wins ? b : a));
  return {
    played: g.length,
    flags: g.filter((x) => x.flag).length,
    best: `${best.wins}-${best.losses}`,
    perfects: g.filter((x) => x.perfect).length,
  };
}
