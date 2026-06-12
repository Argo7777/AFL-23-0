/** Real club colours (incl. historical names) for visual accents. */
const COLORS: Record<string, [string, string]> = {
  Adelaide: ["#002b5c", "#e21937"],
  "Brisbane Lions": ["#7c003e", "#f37021"],
  "Brisbane Bears": ["#7c003e", "#ffc425"],
  Carlton: ["#0e1e2d", "#8ba2b5"],
  Collingwood: ["#000000", "#ffffff"],
  Essendon: ["#cc2031", "#000000"],
  Fitzroy: ["#6e0e1e", "#ffc425"],
  Footscray: ["#014896", "#dd0033"],
  "Western Bulldogs": ["#014896", "#dd0033"],
  Fremantle: ["#2a0d54", "#ffffff"],
  Geelong: ["#001f3d", "#ffffff"],
  "Gold Coast": ["#d93e39", "#ffc425"],
  "Greater Western Sydney": ["#f15c22", "#231f20"],
  Hawthorn: ["#4d2004", "#fbbf15"],
  Melbourne: ["#0f1131", "#cc2031"],
  "North Melbourne": ["#013b9f", "#ffffff"],
  Kangaroos: ["#013b9f", "#ffffff"],
  "Port Adelaide": ["#008aab", "#000000"],
  Richmond: ["#fed102", "#000000"],
  "South Melbourne": ["#ed171f", "#ffffff"],
  Sydney: ["#ed171f", "#ffffff"],
  "St Kilda": ["#ed0f05", "#ffffff"],
  University: ["#172f66", "#000000"],
  "West Coast": ["#062ee2", "#ffc425"],
};

export function clubColors(club: string): [string, string] {
  return COLORS[club] ?? ["#166534", "#a3e635"];
}
