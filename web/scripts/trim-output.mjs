/* Post-build: shrink the static export to fit GitHub Pages' 1GB limit.
 * Removes two classes of files that are NOT needed by visitors:
 *  1. index.txt RSC payloads — only power client-side soft navigation; without
 *     them <Link> clicks fall back to a normal full page load (fine for a
 *     content site). ~340MB across ~8.6k pages.
 *  2. build-only JSON in out/data — read at BUILD time by the data libs
 *     (seasondb/aflwdb/aflwmatchdb/aflmatchdb), never fetched by the browser.
 * Run automatically after `next build`.                                       */
import { readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "out");
if (!existsSync(OUT)) { console.log("trim-output: no out/ dir, skipping"); process.exit(0); }

let txt = 0, txtBytes = 0;
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "index.txt") { txtBytes += statSync(p).size; rmSync(p); txt++; }
  }
}
walk(OUT);

const dataDir = join(OUT, "data");
let json = 0, jsonBytes = 0;
if (existsSync(dataDir)) {
  for (const f of readdirSync(dataDir)) {
    const buildOnly =
      f === "season-matches.json" || f === "aflw-matches.json" || f === "aflw-boxscores.json" ||
      f === "afl-box-index.json" || f === "afl-match-links.json" || /^afl-boxscores-\d+\.json$/.test(f);
    if (buildOnly) { const p = join(dataDir, f); jsonBytes += statSync(p).size; rmSync(p); json++; }
  }
}

const mb = (b) => (b / 1024 / 1024).toFixed(0);
console.log(`trim-output: removed ${txt} RSC payloads (${mb(txtBytes)}MB) + ${json} build-only JSON (${mb(jsonBytes)}MB)`);
