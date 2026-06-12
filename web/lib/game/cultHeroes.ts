/**
 * Cult heroes: picking one of these blokes — in any era they played — lifts
 * the whole side. Stats never measured the vibe.
 */
const CULT_HEROES: Record<string, string> = {
  "daniel gorringe": "CULT HERO",
  "matthew spangher": "HAWTHORN JESUS",
  "lewis roberts-thomson": "CULT HERO",
  "jake king": "PUSH UP KING",
  "leon davis": "CULT HERO",
  "graham johncock": "STIFFY JOHNCOCK",
  "israel folau": "CULT HERO",
  "justin westhoff": "THE HOFF",
  "warwick capper": "THE WIZ",
  "dennis armfield": "CULT HERO",
  "robin nahas": "THE TRIPOD",
};

/** team-rating bonus per cult hero in the side */
export const CULT_BOOST = 3;

export function cultNickname(playerName: string): string | null {
  return CULT_HEROES[playerName.toLowerCase()] ?? null;
}
