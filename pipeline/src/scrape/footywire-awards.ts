import * as cheerio from "cheerio";
import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

const BROWNLOW_FIRST = 1965; // footywire tally coverage starts here
const AA_FIRST = 1991; // All-Australian became an annual AFL team in 1991
const RS_FIRST = 1993;

const insBrownlow = db.prepare(`
  INSERT OR REPLACE INTO brownlow (year, player_name, team, votes, v3, v2, v1, played, polled, winner)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insAA = db.prepare(`
  INSERT OR REPLACE INTO all_australian (year, player_name, team, pos) VALUES (?, ?, ?, ?)
`);
const insRS = db.prepare(`
  INSERT OR REPLACE INTO rising_star (year, player_name, team, winner) VALUES (?, ?, ?, ?)
`);
const insProfileStub = db.prepare(`
  INSERT OR IGNORE INTO fw_profiles (slug, club_slug) VALUES (?, ?)
`);

/** pp-{club-slug}--{player-slug} -> club slug; also queue the profile for the position crawl */
function clubFromPP(href: string): string {
  const m = href.match(/^pp-(.+)--(.+)$/);
  if (m) insProfileStub.run(href, m[1]);
  return m ? m[1] : "";
}

export async function scrapeBrownlow(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const to = opts.to ?? new Date().getFullYear();
  for (let year = opts.from ?? BROWNLOW_FIRST; year <= to; year++) {
    let html: string;
    try {
      html = await fetchPage(`https://www.footywire.com/afl/footy/brownlow_medal?year=${year}`, {
        force: opts.force,
      });
    } catch {
      console.warn(`  brownlow ${year}: unavailable`);
      continue;
    }
    const $ = cheerio.load(html);
    let rows = 0;
    const run = db.transaction(() => {
      $("a[href^='pp-']").each((_, a) => {
        const $row = $(a).closest("tr");
        const cells = $row.find("td");
        if (cells.length < 9) return;
        const name = $(a).text().trim();
        const club = clubFromPP($(a).attr("href") ?? "");
        const winner = $row.find("span.playerflag[title='Winner']").length > 0 ? 1 : 0;
        const nums = cells
          .slice(2, 8)
          .toArray()
          .map((td) => Number($(td).text().trim()) || 0);
        const [votes, v3, v2, v1, played, polled] = nums;
        if (!name || !votes) return;
        insBrownlow.run(year, name, club, votes, v3, v2, v1, played, polled, winner);
        rows++;
      });
    });
    run();
    console.log(`  brownlow ${year}: ${rows} pollers`);
  }
}

export async function scrapeAllAustralian(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const to = opts.to ?? new Date().getFullYear();
  for (let year = opts.from ?? AA_FIRST; year <= to; year++) {
    let html: string;
    try {
      html = await fetchPage(
        `https://www.footywire.com/afl/footy/all_australian_selection?year=${year}`,
        { force: opts.force },
      );
    } catch {
      console.warn(`  all-australian ${year}: unavailable`);
      continue;
    }
    const $ = cheerio.load(html);
    let rows = 0;
    const run = db.transaction(() => {
      $("a[href^='pp-']").each((_, a) => {
        const name = $(a).text().trim();
        const club = clubFromPP($(a).attr("href") ?? "");
        if (!name) return;
        // Final-22 rows are labelled with a line (FB/HB/C/HF/FF/Fol/Int);
        // the extended-squad section labels rows with club names instead.
        const label = $(a).closest("tr").find("td").first().text().trim();
        const line = label.match(/^(FB|HB|C|HF|FF|Foll?|Int|IC|R)$/i);
        const pos = line ? line[1].toUpperCase() : label === "" ? "INT" : "SQUAD";
        insAA.run(year, name, club, pos);
        rows++;
      });
    });
    run();
    console.log(`  all-australian ${year}: ${rows} selections`);
  }
}

export async function scrapeRisingStar(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const to = opts.to ?? new Date().getFullYear();
  for (let year = opts.from ?? RS_FIRST; year <= to; year++) {
    let html: string;
    try {
      html = await fetchPage(
        `https://www.footywire.com/afl/footy/ft_rising_stars_round_performances?year=${year}`,
        { force: opts.force },
      );
    } catch {
      console.warn(`  rising star ${year}: unavailable`);
      continue;
    }
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const run = db.transaction(() => {
      $("a[href^='pp-']").each((_, a) => {
        const name = $(a).text().trim();
        if (!name || seen.has(name)) return;
        seen.add(name);
        const club = clubFromPP($(a).attr("href") ?? "");
        const winner = $(a).closest("tr").find("span.playerflag[title='Winner']").length > 0 ? 1 : 0;
        insRS.run(year, name, club, winner);
      });
    });
    run();
    console.log(`  rising star ${year}: ${seen.size} nominees`);
  }
}
