import * as cheerio from "cheerio";
import { fetchPage, isCached } from "../lib/http.js";
import { db } from "../lib/db.js";
import { FOOTYWIRE_CLUBS, normalizeName } from "../lib/clubs.js";

const insStub = db.prepare(`INSERT OR IGNORE INTO fw_profiles (slug, club_slug) VALUES (?, ?)`);
const updProfile = db.prepare(`
  UPDATE fw_profiles SET name = ?, position = ?, height_cm = ?, weight_kg = ?, games = ?
  WHERE slug = ?
`);

/**
 * Discover every player profile slug from the all-time (ti-) and current
 * (tp-) club pages. Profiles are then fetched ordered by the player's career
 * games from afltables, so the most pickable players get real positions first;
 * the crawl is fully resumable (cached pages are free).
 */
export async function discoverProfiles(opts: { force?: boolean } = {}) {
  for (const club of Object.keys(FOOTYWIRE_CLUBS)) {
    for (const prefix of ["ti", "tp"]) {
      let html: string;
      try {
        html = await fetchPage(`https://www.footywire.com/afl/footy/${prefix}-${club}`, {
          force: opts.force,
        });
      } catch {
        console.warn(`  ${prefix}-${club}: unavailable`);
        continue;
      }
      const $ = cheerio.load(html);
      let found = 0;
      const run = db.transaction(() => {
        $("a[href^='pp-']").each((_, a) => {
          const href = ($(a).attr("href") ?? "").split("?")[0];
          if (!href) return;
          insStub.run(href, club);
          found++;
        });
      });
      run();
      console.log(`  ${prefix}-${club}: ${found} profile links`);
    }
  }
  const total = db.prepare(`SELECT COUNT(*) AS c FROM fw_profiles`).get() as { c: number };
  console.log(`  total known profiles: ${total.c}`);
}

function parseProfile(html: string): {
  name: string | null;
  position: string | null;
  height: number | null;
  weight: number | null;
  games: number | null;
} {
  const $ = cheerio.load(html);
  const name = $("#playerProfileName").text().trim() || $("h1").first().text().trim() || null;
  const text = $.root().text();
  const pos = text.match(/Position:\s*([A-Za-z, \-]+?)(?:\n|Drafted|Height|Weight|$)/);
  const height = text.match(/Height:\s*(\d+)\s*cm/);
  const weight = text.match(/Weight:\s*(\d+)\s*kg/);
  const games = text.match(/Games:\s*(\d+)/);
  return {
    name,
    position: pos ? pos[1].replace(/\s+/g, " ").trim() : null,
    height: height ? Number(height[1]) : null,
    weight: weight ? Number(weight[1]) : null,
    games: games ? Number(games[1]) : null,
  };
}

/** career games per normalized name from afltables, to prioritize the crawl */
function careerGamesByName(): Map<string, number> {
  const rows = db
    .prepare(`SELECT player_name, SUM(gm) AS games FROM season_stats GROUP BY player_key`)
    .all() as { player_name: string; games: number }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = normalizeName(r.player_name);
    map.set(key, Math.max(map.get(key) ?? 0, r.games ?? 0));
  }
  return map;
}

export async function crawlProfiles(opts: { limit?: number; minGames?: number } = {}) {
  const pending = db
    .prepare(`SELECT slug FROM fw_profiles WHERE position IS NULL`)
    .all() as { slug: string }[];

  const games = careerGamesByName();
  const prioritized = pending
    .map(({ slug }) => {
      const m = slug.match(/--(.+)$/);
      const name = m ? m[1].replace(/-/g, " ") : "";
      return { slug, games: games.get(normalizeName(name)) ?? 0 };
    })
    .filter((p) => p.games >= (opts.minGames ?? 0))
    .sort((a, b) => b.games - a.games);

  const limit = opts.limit ?? prioritized.length;
  let done = 0;
  for (const { slug } of prioritized.slice(0, limit)) {
    const url = `https://www.footywire.com/afl/footy/${slug}`;
    const cached = isCached(url);
    let html: string;
    try {
      html = await fetchPage(url);
    } catch {
      console.warn(`  profile ${slug}: unavailable`);
      continue;
    }
    const p = parseProfile(html);
    updProfile.run(p.name, p.position ?? "", p.height, p.weight, p.games, slug);
    done++;
    if (done % 100 === 0 || (!cached && done % 25 === 0)) {
      console.log(`  profiles: ${done}/${Math.min(limit, prioritized.length)}`);
    }
  }
  console.log(`  profiles crawled: ${done}`);
}
