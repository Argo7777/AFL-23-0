import * as cheerio from "cheerio";
import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

const insert = db.prepare(`
  INSERT OR REPLACE INTO gf_players (year, team, player_name, premiers)
  VALUES (?, ?, ?, ?)
`);

/**
 * Premiership lineups: seas/{year}.html links the Grand Final's "Match stats"
 * page; the match page has one "{Team} Match Statistics" table per side.
 * Drawn grand finals (1948, 1977, 2010) produce multiple GF links — the last
 * one (the replay) decides the premiers. Some early seasons (1897, 1924) had
 * no grand final; they are skipped.
 */
export async function scrapeGrandFinals(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const to = opts.to ?? new Date().getFullYear();
  const from = opts.from ?? 1898;

  for (let year = from; year <= to; year++) {
    let seas: string;
    try {
      seas = await fetchPage(`https://afltables.com/afl/seas/${year}.html`, { force: opts.force });
    } catch {
      continue;
    }

    // every "Match stats" link that appears after a "Grand Final" heading
    const gfLinks: string[] = [];
    const re = /Grand Final[\s\S]{0,4000}?\[<a href="(\.\.\/stats\/games\/\d+\/\d+\.html)">Match stats<\/a>\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(seas)) !== null) gfLinks.push(m[1]);
    if (gfLinks.length === 0) {
      console.warn(`  GF ${year}: no grand final found, skipping`);
      continue;
    }
    const url = `https://afltables.com/afl/seas/${gfLinks[gfLinks.length - 1]}`.replace("/seas/../", "/");

    let page: string;
    try {
      page = await fetchPage(url, { force: opts.force });
    } catch {
      console.warn(`  GF ${year}: match page unavailable`);
      continue;
    }
    const $ = cheerio.load(page);

    const teams: { team: string; players: string[] }[] = [];
    $("table").each((_, table) => {
      const head = $(table).find("th").first().text().trim();
      const tm = head.match(/^(.+?) Match Statistics/);
      if (!tm) return;
      const players: string[] = [];
      $(table).find("a[href*='players/']").each((_, a) => {
        const name = $(a).text().trim();
        if (name) players.push(name);
      });
      if (players.length) teams.push({ team: tm[1].trim(), players });
    });

    if (teams.length !== 2) {
      console.warn(`  GF ${year}: expected 2 team tables, found ${teams.length}`);
      continue;
    }

    const gfRow = db
      .prepare(`SELECT * FROM matches WHERE year = ? AND round = 'GF' ORDER BY match_num DESC LIMIT 1`)
      .get(year) as { team1: string; score1: number; team2: string; score2: number } | undefined;

    const winner =
      gfRow == null ? null
      : gfRow.score1 > gfRow.score2 ? gfRow.team1
      : gfRow.score2 > gfRow.score1 ? gfRow.team2
      : null;

    const run = db.transaction(() => {
      for (const { team, players } of teams) {
        for (const p of players) insert.run(year, team, p, team === winner ? 1 : 0);
      }
    });
    run();
    console.log(`  GF ${year}: ${teams.map((t) => t.team).join(" v ")} -> premiers: ${winner ?? "?"}`);
  }
}
