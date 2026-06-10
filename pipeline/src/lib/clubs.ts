/**
 * Club identity across eras. AFLTables prints era-specific names
 * (South Melbourne, Footscray, Kangaroos...). The game treats a franchise as
 * one club through time; defunct clubs (Fitzroy, University, Brisbane Bears
 * pre-merger) remain pickable clubs in the eras they existed.
 */
export const FRANCHISE: Record<string, string> = {
  "South Melbourne": "Sydney",
  "Footscray": "Western Bulldogs",
  "Kangaroos": "North Melbourne",
  "GW Sydney": "Greater Western Sydney",
};

export function canonicalClub(team: string): string {
  return FRANCHISE[team.trim()] ?? team.trim();
}

/** Footywire club URL slugs (used by ti-/tp-/pp- pages) → canonical club. */
export const FOOTYWIRE_CLUBS: Record<string, string> = {
  "adelaide-crows": "Adelaide",
  "brisbane-lions": "Brisbane Lions",
  "carlton-blues": "Carlton",
  "collingwood-magpies": "Collingwood",
  "essendon-bombers": "Essendon",
  "fremantle-dockers": "Fremantle",
  "geelong-cats": "Geelong",
  "gold-coast-suns": "Gold Coast",
  "greater-western-sydney-giants": "Greater Western Sydney",
  "hawthorn-hawks": "Hawthorn",
  "melbourne-demons": "Melbourne",
  "kangaroos": "North Melbourne",
  "port-adelaide-power": "Port Adelaide",
  "richmond-tigers": "Richmond",
  "st-kilda-saints": "St Kilda",
  "sydney-swans": "Sydney",
  "west-coast-eagles": "West Coast",
  "western-bulldogs": "Western Bulldogs",
  "brisbane-bears": "Brisbane Bears",
  "fitzroy-lions": "Fitzroy",
};

/**
 * Footywire prints formal given names where afltables prints the common form
 * (Nathan Fyfe vs Nat Fyfe). Both sides are folded to the short form.
 */
const DIMINUTIVES: Record<string, string> = {
  matthew: "matt", nathan: "nat", oliver: "ollie", joshua: "josh",
  daniel: "dan", cameron: "cam", mitchell: "mitch", bradley: "brad",
  thomas: "tom", samuel: "sam", benjamin: "ben", timothy: "tim",
  nicholas: "nick", alexander: "alex", christopher: "chris",
  jonathon: "jon", jonathan: "jon", zachary: "zac", lachlan: "lachie",
};

export function foldFirstName(normName: string): string {
  const sp = normName.indexOf(" ");
  if (sp === -1) return normName;
  const first = normName.slice(0, sp);
  const folded = DIMINUTIVES[first];
  return folded ? `${folded}${normName.slice(sp)}` : normName;
}

/** "Laird, Rory" or "Rory Laird" -> "rory laird" */
export function normalizeName(name: string): string {
  let n = name.trim();
  const comma = n.indexOf(",");
  if (comma !== -1) {
    n = `${n.slice(comma + 1).trim()} ${n.slice(0, comma).trim()}`;
  }
  return n
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
