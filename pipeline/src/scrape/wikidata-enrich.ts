import { db } from "../lib/db.js";
import { normalizeName } from "../lib/clubs.js";

const insWd = db.prepare(`
  INSERT OR IGNORE INTO wd_positions (name, birth_year, position) VALUES (?, ?, ?)
`);

/**
 * One bulk SPARQL query: every Australian rules footballer on Wikidata with a
 * recorded playing position (P413). Primary use is pre-1965 players, who have
 * no footywire profile.
 */
export async function scrapeWikidataPositions() {
  const sparql = `
    SELECT ?personLabel ?posLabel ?birth WHERE {
      ?person wdt:P106 wd:Q13414980;        # occupation: Australian rules football player
              wdt:P413 ?pos.                # position played
      OPTIONAL { ?person wdt:P569 ?birth. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "afl-23-0-game/1.0 (data enrichment; contact: local project)" },
  });
  if (!res.ok) throw new Error(`wikidata HTTP ${res.status}`);
  const json = (await res.json()) as {
    results: { bindings: { personLabel?: { value: string }; posLabel?: { value: string }; birth?: { value: string } }[] };
  };
  let rows = 0;
  const run = db.transaction(() => {
    for (const b of json.results.bindings) {
      const name = b.personLabel?.value;
      const pos = b.posLabel?.value;
      if (!name || !pos || /^Q\d+$/.test(pos)) continue;
      const birthYear = b.birth?.value ? Number(b.birth.value.slice(0, 4)) : null;
      insWd.run(normalizeName(name), birthYear, pos.toLowerCase());
      rows++;
    }
  });
  run();
  console.log(`  wikidata positions: ${rows} rows`);
}
