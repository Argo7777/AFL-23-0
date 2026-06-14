# AFLW — source check & ingestion plan

## Source availability (checked 2026-06-14)

| Source | AFLW data? | Notes |
|---|---|---|
| **afltables.com** | ❌ No | The AFL index links to VFL/SANFL/WAFL and rugby league, but there is **no AFLW section**. `aflw/*` paths 404. |
| **footywire.com** | ❌ No | `/aflw/*` paths redirect to `404.html`. Footywire covers men's AFL only. |
| **Official AFL Stats API** (api.afl.com.au — the feed the `sportsdata` tooling wraps) | ✅ Yes | Exposes **AFLW** as a competition (`code: "AFLW"`, "NAB AFLW", comp id 3) alongside AFL/VFL/SANFL/WAFL. Comp seasons available 2017→present (~9 seasons). Per-round fixtures, ladders, match stats and player stats all available. |

**Conclusion:** our two current scraping sources do **not** carry AFLW. The clean
path is the official AFL Stats API, fetched **directly** from its public endpoints
(same data the MCP wraps — we hit the API ourselves, not the MCP tool).

## Plan to add AFLW

1. **New scraper** `pipeline/src/scrape/afl-api.ts`
   - Resolve the AFLW competition + its comp-seasons (2017→now).
   - Per comp-season: pull fixtures/results (ladder derivable, same as our AFL
     ladder computation), and player season stats.
   - Cache-first + throttled, identical discipline to the afltables/footywire crawlers.
   - The API needs a short-lived bearer token from its token endpoint — fetch once
     per run, reuse. No credentials are committed.

2. **Schema** — reuse the existing tables with a `comp` column
   (`AFL` default | `AFLW`), or parallel `aflw_*` tables. Prefer a `comp` discriminator
   so the rating engine and exports stay generic.

3. **Ratings** — the era-relative engine already standardises within a cohort, so
   AFLW players are rated against AFLW peers automatically. Seasons are short
   (~10–11 H&A rounds), so lower the games threshold for AFLW cohorts.

4. **Exports** — emit `seasons-aflw.json`, `season-matches-aflw.json`, AFLW
   premierships, AFLW honours (best-and-fairest / All-Australian where the API has them).

5. **Web** — a competition switch (AFL ⇄ AFLW) on the Ladder / Results / Seasons /
   Players / Premierships pages, reusing the same components (already parameterised
   by data, not hard-coded to men's AFL). New `/aflw/*` routes or a `?comp=aflw` filter.

6. **Game modes** — an optional "AFLW all-era" team-builder once enough seasons exist.

Effort: ~1 scraper + schema `comp` column + 1 export pass + a comp toggle in the
existing pages. The pages built in this batch (LadderTable, ResultsList, SeasonsGrid,
SeasonPicker) are already data-driven and will render AFLW unchanged.
