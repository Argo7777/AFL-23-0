import * as cheerio from "cheerio";
import { fetchPage } from "../lib/http.js";
import { db } from "../lib/db.js";

/**
 * Per-match AFL player stats from footywire (1965+; full advanced stats 2010+).
 *   ft_match_list?year=Y   → match meta + footywire match ids (mid)
 *   ft_match_statistics?mid=X → both teams' player stat tables
 * Cache-first and throttled via fetchPage. AFLW already has box scores from the
 * official API; this fills the AFL side.
 */

interface MatchMeta {
  mid: number; year: number; round: string;
  home: string; away: string; hscore: number; ascore: number;
  venue: string; date: string;
}

/** Parse a season's match-list page into match meta rows. */
function parseMatchList(html: string, year: number): MatchMeta[] {
  const $ = cheerio.load(html);
  const out: MatchMeta[] = [];
  let round = "";
  $("tr").each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr.find("td");
    const rowText = $tr.text().replace(/\s+/g, " ").trim();
    // round headers are short rows like "Round 1" / "Grand Final"
    const rh = /^(Round \d+|Finals Week \d+|Semi Finals?|Preliminary Finals?|Qualifying Finals?|Elimination Finals?|Grand Final)\b/.exec(rowText);
    if (rh && cells.length <= 2) { round = rh[1]; return; }

    const link = $tr.find('a[href^="ft_match_statistics?mid="]').first();
    if (!link.length) return;
    const mid = Number(/mid=(\d+)/.exec(link.attr("href") ?? "")?.[1]);
    const c = cells.map((_i, td) => $(td).text().trim().replace(/\s+/g, " ")).get();
    // [date, "Home v Away", venue, crowd, "hs-as", best..]
    const teams = /^(.+?) v (.+)$/.exec(c[1] ?? "");
    const score = /^(\d+)\s*-\s*(\d+)$/.exec((link.text() ?? "").trim());
    if (!mid || !teams || !score) return;
    out.push({
      mid, year, round: round || "Round ?",
      home: teams[1].trim(), away: teams[2].trim(),
      hscore: Number(score[1]), ascore: Number(score[2]),
      venue: c[2] ?? "", date: c[0] ?? "",
    });
  });
  return out;
}

interface BoxPlayer {
  name: string; kk: number; hb: number; di: number; mk: number; gl: number; bh: number;
  tk: number; ho: number; ga: number; i5: number; cl: number; cg: number;
  r5: number; ff: number; fa: number; af: number; sc: number;
}

/** Parse one team's stat block out of the match-stats page text. */
function parseTeamStats(text: string, team: string): BoxPlayer[] {
  const idx = text.indexOf(`${team} Match Statistics`);
  if (idx < 0) return [];
  let blk = text.slice(idx);
  const hp = blk.indexOf("AF SC ");
  if (hp < 0) return [];
  blk = blk.slice(hp + 6);
  const cut = blk.search(/Match Statistics|Head to Head|Track your favourite/);
  if (cut > 0) blk = blk.slice(0, cut);
  const toks = blk.replace(/[↗↙]/g, " ").trim().split(/\s+/);
  const out: BoxPlayer[] = [];
  let i = 0;
  while (i < toks.length) {
    const name: string[] = [];
    while (i < toks.length && !/^\d+$/.test(toks[i])) name.push(toks[i++]);
    const n: number[] = [];
    while (i < toks.length && /^\d+$/.test(toks[i]) && n.length < 17) n.push(Number(toks[i++]));
    if (name.length && n.length === 17) {
      out.push({
        name: name.join(" "),
        kk: n[0], hb: n[1], di: n[2], mk: n[3], gl: n[4], bh: n[5], tk: n[6],
        ho: n[7], ga: n[8], i5: n[9], cl: n[10], cg: n[11], r5: n[12],
        ff: n[13], fa: n[14], af: n[15], sc: n[16],
      });
    }
  }
  return out;
}

export async function scrapeAflMatches(opts: { from?: number; to?: number; force?: boolean } = {}): Promise<void> {
  const to = opts.to ?? new Date().getFullYear();
  const from = opts.from ?? to;

  const insMeta = db.prepare(`
    INSERT OR REPLACE INTO afl_match_meta (mid, year, round, home, away, hscore, ascore, venue, date)
    VALUES (@mid, @year, @round, @home, @away, @hscore, @ascore, @venue, @date)
  `);
  const insStat = db.prepare(`
    INSERT OR REPLACE INTO afl_match_player_stats
      (mid, team, name, kk, hb, di, mk, gl, bh, tk, ho, ga, i5, cl, cg, r5, ff, fa, af, sc)
    VALUES (@mid, @team, @name, @kk, @hb, @di, @mk, @gl, @bh, @tk, @ho, @ga, @i5, @cl, @cg, @r5, @ff, @fa, @af, @sc)
  `);
  const insStats = db.transaction((mid: number, team: string, ps: BoxPlayer[]) => {
    for (const p of ps) insStat.run({ mid, team, ...p });
  });

  for (let year = to; year >= from; year--) {
    const listHtml = await fetchPage(
      `https://www.footywire.com/afl/footy/ft_match_list?year=${year}`,
      { force: opts.force && year >= to - 1 },
    );
    const meta = parseMatchList(listHtml, year);
    console.log(`AFL matches ${year}: ${meta.length} matches`);
    for (const m of meta) insMeta.run(m);

    let done = 0;
    for (const m of meta) {
      // skip matches already fully scraped (resumable) unless forcing recent
      const have = (db.prepare(`SELECT COUNT(*) n FROM afl_match_player_stats WHERE mid=?`).get(m.mid) as { n: number }).n;
      if (have > 0 && !(opts.force && year >= to - 1)) { done++; continue; }
      let html: string;
      try {
        html = await fetchPage(
          `https://www.footywire.com/afl/footy/ft_match_statistics?mid=${m.mid}`,
          { force: opts.force && year >= to - 1 },
        );
      } catch { continue; }
      const text = cheerio.load(html)("body").text().replace(/\s+/g, " ");
      insStats(m.mid, m.home, parseTeamStats(text, m.home));
      insStats(m.mid, m.away, parseTeamStats(text, m.away));
      done++;
      if (done % 50 === 0) console.log(`  …${done}/${meta.length} (${year})`);
    }
  }
  const n = (db.prepare(`SELECT COUNT(*) n FROM afl_match_player_stats`).get() as { n: number }).n;
  const mn = (db.prepare(`SELECT COUNT(*) n FROM afl_match_meta`).get() as { n: number }).n;
  console.log(`AFL matches: ${mn} matches, ${n} player-match stat rows`);
}
