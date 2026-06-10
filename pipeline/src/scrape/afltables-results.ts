import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

/**
 * bg3.txt lists every VFL/AFL match in chronological order, e.g.
 * `1.     8-May-1897       R1   Fitzroy           6.13.49          Carlton           2.4.16            Brunswick St`
 * Score format is goals.behinds.points; round is R{n} or QF/EF/SF/PF/GF.
 */
const LINE =
  /^(\d+)\.\s+(\d{1,2}-\w{3}-(\d{4}))\s+(\S+)\s+(.+?)\s+(\d+\.\d+\.\d+)\s+(.+?)\s+(\d+\.\d+\.\d+)\s*(.*)$/;

const insert = db.prepare(`
  INSERT OR REPLACE INTO matches (match_num, date, year, round, team1, score1, team2, score2, venue)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

function points(score: string): number {
  return Number(score.split(".")[2]);
}

export async function scrapeResults(opts: { force?: boolean } = {}) {
  const text = await fetchPage("https://afltables.com/afl/stats/biglists/bg3.txt", {
    force: opts.force,
  });
  let count = 0;
  const run = db.transaction(() => {
    for (const line of text.split("\n")) {
      const m = line.match(LINE);
      if (!m) continue;
      const [, numStr, date, yearStr, round, team1, s1, team2, s2, venue] = m;
      insert.run(
        Number(numStr), date, Number(yearStr), round,
        team1.trim(), points(s1), team2.trim(), points(s2), venue.trim(),
      );
      count++;
    }
  });
  run();
  console.log(`  results: ${count} matches`);
}
