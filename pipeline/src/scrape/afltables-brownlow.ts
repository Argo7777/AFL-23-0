import * as cheerio from "cheerio";
import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

db.exec(`
CREATE TABLE IF NOT EXISTS at_brownlow (
  year INTEGER NOT NULL,
  player_name TEXT NOT NULL,     -- "Surname, First" (afltables format)
  team TEXT NOT NULL,
  votes INTEGER NOT NULL,
  PRIMARY KEY (year, player_name, team)
);
`);

const ins = db.prepare(`
  INSERT OR REPLACE INTO at_brownlow (year, player_name, team, votes) VALUES (?, ?, ?, ?)
`);

/**
 * afltables.com/afl/brownlow/brownlow{year}.html — full vote tally per year.
 * Covers the pre-footywire era (Brownlow first awarded 1924; footywire tallies
 * start 1965). Row: Player | Teams | Votes | Games | ...
 */
export async function scrapeAfltablesBrownlow(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const from = opts.from ?? 1924;
  const to = opts.to ?? 1964;
  for (let year = from; year <= to; year++) {
    let html: string;
    try {
      html = await fetchPage(`https://afltables.com/afl/brownlow/brownlow${year}.html`, {
        force: opts.force,
      });
    } catch {
      console.warn(`  at-brownlow ${year}: unavailable`);
      continue;
    }
    const $ = cheerio.load(html);
    let rows = 0;
    const run = db.transaction(() => {
      $("tr").each((_, tr) => {
        const cells = $(tr).find("td");
        if (cells.length < 4) return;
        const name = $(cells[0]).text().trim();
        const team = $(cells[1]).text().trim();
        const votes = Number($(cells[2]).text().trim());
        if (!name.includes(",") || !team || !Number.isFinite(votes) || votes <= 0) return;
        ins.run(year, name, team, votes);
        rows++;
      });
    });
    run();
    console.log(`  at-brownlow ${year}: ${rows} pollers`);
  }
}
