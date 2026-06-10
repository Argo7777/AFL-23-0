import { db } from "../lib/db.js";
import { normalizeName, FOOTYWIRE_CLUBS } from "../lib/clubs.js";
import { Position } from "./config.js";

/**
 * Position evidence cascade (strongest first):
 *  1. footywire profile "Position:" string (1965+, supports multi-position)
 *  2. All-Australian line (FB/HB -> DEF, C -> MID, HF/FF -> FWD, FOL -> RUC/MID)
 *  3. wikidata position-played labels (covers many pre-1965 players)
 *  4. stat-derived archetype, decided later from the player's own era z-scores
 */

function footywireWords(position: string): Position[] {
  const out = new Set<Position>();
  for (const word of position.split(/[,/]/)) {
    const w = word.trim().toLowerCase();
    if (w.startsWith("defend") || w.includes("back")) out.add("DEF");
    if (w.startsWith("midfield") || w === "centre" || w === "wing") out.add("MID");
    if (w.startsWith("ruck")) out.add("RUC");
    if (w.startsWith("forward")) out.add("FWD");
  }
  return [...out];
}

function wikidataLabel(label: string): Position | null {
  const l = label.toLowerCase();
  if (/ruck(man)?$/.test(l) || l === "ruck") return "RUC";
  if (/(full|half).?forward|forward pocket|forward$/.test(l)) return "FWD";
  if (/(full|half).?back|back pocket|fullback|defender/.test(l)) return "DEF";
  if (/midfield|centre$|center$|wing(man)?$|rover$|ruck.?rover|follower/.test(l)) return "MID";
  if (/utility/.test(l)) return null;
  return null;
}

export interface PositionEvidence {
  positions: Position[];
  source: "footywire" | "all-australian" | "wikidata" | "stats";
}

/**
 * Build a lookup of position evidence keyed by normalized player name.
 * Club info disambiguates same-name players where available.
 */
export function buildPositionEvidence(): Map<string, PositionEvidence> {
  const evidence = new Map<string, PositionEvidence>();

  // 3. wikidata (weakest of the explicit sources -> applied first, overwritten)
  const wd = db.prepare(`SELECT name, position FROM wd_positions`).all() as {
    name: string;
    position: string;
  }[];
  const wdByName = new Map<string, Set<Position>>();
  for (const row of wd) {
    const p = wikidataLabel(row.position);
    if (!p) continue;
    if (!wdByName.has(row.name)) wdByName.set(row.name, new Set());
    wdByName.get(row.name)!.add(p);
  }
  for (const [name, set] of wdByName) {
    evidence.set(name, { positions: [...set], source: "wikidata" });
  }

  // 2. All-Australian lines (real selections, 1991+)
  const AA_LINE: Record<string, Position | null> = {
    FB: "DEF", HB: "DEF", C: "MID", HF: "FWD", FF: "FWD", FOL: "RUC", R: "RUC",
    INT: null, IC: null, SQUAD: null,
  };
  const aa = db
    .prepare(`SELECT player_name, pos, COUNT(*) AS n FROM all_australian GROUP BY player_name, pos`)
    .all() as { player_name: string; pos: string | null; n: number }[];
  const aaByName = new Map<string, Set<Position>>();
  for (const row of aa) {
    const p = row.pos ? AA_LINE[row.pos] : null;
    if (!p) continue;
    const key = normalizeName(row.player_name);
    if (!aaByName.has(key)) aaByName.set(key, new Set());
    aaByName.get(key)!.add(p);
  }
  for (const [name, set] of aaByName) {
    evidence.set(name, { positions: [...set], source: "all-australian" });
  }

  // 1. footywire profiles (authoritative where present)
  const fw = db
    .prepare(`SELECT slug, club_slug, position FROM fw_profiles WHERE position IS NOT NULL AND position != ''`)
    .all() as { slug: string; club_slug: string; position: string }[];
  for (const row of fw) {
    const m = row.slug.match(/--(.+)$/);
    if (!m) continue;
    const name = normalizeName(m[1].replace(/-/g, " "));
    const positions = footywireWords(row.position);
    if (positions.length === 0) continue;
    const prev = evidence.get(name);
    if (prev?.source === "footywire") {
      // same name, multiple profiles: union (club disambiguation handled by caller)
      evidence.set(name, {
        positions: [...new Set([...prev.positions, ...positions])],
        source: "footywire",
      });
    } else {
      evidence.set(name, { positions, source: "footywire" });
    }
  }

  return evidence;
}

export { FOOTYWIRE_CLUBS };
