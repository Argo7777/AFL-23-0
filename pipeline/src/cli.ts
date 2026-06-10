import { scrapeSeasonStats } from "./scrape/afltables-season-stats.js";
import { scrapeResults } from "./scrape/afltables-results.js";
import { scrapeGrandFinals } from "./scrape/afltables-grandfinals.js";
import { scrapeBrownlow, scrapeAllAustralian, scrapeRisingStar } from "./scrape/footywire-awards.js";
import { discoverProfiles, crawlProfiles } from "./scrape/footywire-players.js";
import { scrapeWikidataPositions } from "./scrape/wikidata-enrich.js";
import { exportData } from "./export.js";
import { scrapeAfltablesBrownlow } from "./scrape/afltables-brownlow.js";

const [, , command, ...args] = process.argv;

function argNum(flag: string): number | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? Number(args[i + 1]) : undefined;
}

async function main() {
  switch (command) {
    case "scrape:afltables": {
      console.log("Scraping afltables results (bg3.txt)...");
      await scrapeResults();
      console.log("Scraping afltables season stats 1897->now...");
      await scrapeSeasonStats({ from: argNum("--from"), to: argNum("--to") });
      console.log("Scraping grand final lineups...");
      await scrapeGrandFinals({ from: argNum("--from"), to: argNum("--to") });
      break;
    }
    case "scrape:awards": {
      console.log("Scraping afltables Brownlow tallies (1924-1964)...");
      await scrapeAfltablesBrownlow({ from: argNum("--from"), to: argNum("--to") });
      console.log("Scraping footywire Brownlow tallies...");
      await scrapeBrownlow({ from: argNum("--from"), to: argNum("--to") });
      console.log("Scraping footywire All-Australian teams...");
      await scrapeAllAustralian({ from: argNum("--from"), to: argNum("--to") });
      console.log("Scraping footywire Rising Star nominations...");
      await scrapeRisingStar({ from: argNum("--from"), to: argNum("--to") });
      break;
    }
    case "scrape:positions": {
      console.log("Discovering footywire profiles from club pages...");
      await discoverProfiles();
      console.log("Fetching wikidata positions...");
      await scrapeWikidataPositions();
      console.log("Crawling footywire profiles (career-games priority)...");
      await crawlProfiles({ limit: argNum("--limit"), minGames: argNum("--min-games") });
      break;
    }
    case "scrape:wikidata": {
      await scrapeWikidataPositions();
      break;
    }
    case "refresh": {
      // re-scrape only what changes during a season: the current decade's
      // stats/results/awards, then recompute ratings/salaries and re-export.
      // Per-game averages keep established players stable mid-season.
      const year = new Date().getFullYear();
      const decadeStart = Math.floor(year / 10) * 10;
      console.log(`Refreshing ${decadeStart}s data (seasons ${decadeStart}-${year})...`);
      await scrapeResults({ force: true });
      await scrapeSeasonStats({ from: decadeStart, to: year, force: true });
      await scrapeGrandFinals({ from: decadeStart, to: year, force: true });
      await scrapeBrownlow({ from: decadeStart, to: year, force: true });
      await scrapeAllAustralian({ from: decadeStart, to: year, force: true });
      await scrapeRisingStar({ from: decadeStart, to: year, force: true });
      console.log("Recomputing ratings, salaries and strengths...");
      exportData();
      break;
    }
    case "export": {
      exportData();
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
