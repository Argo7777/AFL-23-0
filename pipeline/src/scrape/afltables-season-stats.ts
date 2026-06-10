import * as cheerio from "cheerio";
import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

const FIRST_SEASON = 1897;

// header code on afltables stats/{year}.html -> season_stats column
const COL: Record<string, string> = {
  GM: "gm", KI: "ki", MK: "mk", HB: "hb", DI: "di",
  GL: "gl", BH: "bh", HO: "ho", TK: "tk", RB: "rb",
  IF: "i5", CL: "cl", CG: "cg", FF: "ff", FA: "fa",
  BR: "br", CP: "cp", UP: "up", CM: "cm", MI: "mi",
  "1%": "op", BO: "bo", GA: "ga", "%P": "pp",
};

const insert = db.prepare(`
  INSERT OR REPLACE INTO season_stats
  (player_key, player_name, team, year, gm, ki, mk, hb, di, gl, bh, ho, tk,
   rb, i5, cl, cg, ff, fa, br, cp, up, cm, mi, op, bo, ga, pp)
  VALUES (@player_key, @player_name, @team, @year, @gm, @ki, @mk, @hb, @di,
   @gl, @bh, @ho, @tk, @rb, @i5, @cl, @cg, @ff, @fa, @br, @cp, @up, @cm,
   @mi, @op, @bo, @ga, @pp)
`);

function num(text: string): number | null {
  const t = text.replace(/ /g, "").trim();
  if (t === "" || t === "-") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export async function scrapeSeasonStats(opts: { from?: number; to?: number; force?: boolean } = {}) {
  const to = opts.to ?? new Date().getFullYear();
  const from = opts.from ?? FIRST_SEASON;

  for (let year = from; year <= to; year++) {
    let html: string;
    try {
      html = await fetchPage(`https://afltables.com/afl/stats/${year}.html`, { force: opts.force });
    } catch {
      console.warn(`  season ${year}: page unavailable, skipping`);
      continue;
    }
    const $ = cheerio.load(html);
    let rows = 0;

    const insertYear = db.transaction(() => {
      $("table.sortable").each((_, table) => {
        const $table = $(table);
        const teamLink = $table.find("thead th a[href*='_idx.html']").first();
        const team = teamLink.text().trim();
        if (!team) return;

        // second thead row holds the stat codes; map column index -> field
        const headers: string[] = [];
        $table.find("thead tr").last().find("th").each((i, th) => {
          headers[i] = $(th).text().trim();
        });

        $table.find("tbody tr").each((_, tr) => {
          const cells = $(tr).find("td");
          const link = $(cells).find("a[href*='players/']").first();
          if (!link.length) return;
          const row: Record<string, string | number | null> = {
            player_key: link.attr("href") ?? "",
            player_name: link.text().trim(),
            team,
            year,
          };
          for (const col of Object.values(COL)) row[col] = null;
          cells.each((i, td) => {
            const field = COL[headers[i]];
            if (!field) return;
            row[field] = num($(td).text());
          });
          if (!row.player_key) return;
          insert.run(row);
          rows++;
        });
      });
    });
    insertYear();
    console.log(`  season ${year}: ${rows} player rows`);
  }
}
