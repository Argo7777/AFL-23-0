import type { CareerPlayer } from "@/lib/playerdb";
import type { ClubData } from "@/lib/clubdb";
import type { ClubRecord, LadderRow } from "@/lib/seasondb";
import type { AflwCareer } from "@/lib/aflwplayerdb";

/**
 * Editorial prose generated from real data.
 *
 * These build unique, multi-sentence summaries for the static club / player /
 * season pages so each page carries genuine written content rather than only
 * tables and numbers. Everything here is derived from the same scraped data the
 * rest of the site uses — no invented facts — and each page's text is distinct
 * because it is built from that page's own record, honours and era.
 */

const POS_NOUN: Record<string, string> = {
  DEF: "defender",
  MID: "midfielder",
  RUC: "ruckman",
  FWD: "forward",
  UTL: "utility",
};

/** "a, b and c" */
function list(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`;
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const ordinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const leagueFor = (year: number): string => (year < 1990 ? "VFL" : "AFL");

// ─────────────────────────────────────────────────────────────────────────
// Player
// ─────────────────────────────────────────────────────────────────────────

export function playerProse(c: CareerPlayer): string[] {
  const paras: string[] = [];

  const years: [number, number] = [
    Math.min(...c.decades.map((d) => d.y[0])),
    Math.max(...c.decades.map((d) => d.y[1])),
  ];
  const games = c.decades.reduce((a, d) => a + d.g, 0);

  // clubs in order of games played
  const clubGames = new Map<string, number>();
  for (const d of c.decades) {
    for (const [club, g] of Object.entries(d.c)) {
      clubGames.set(club, (clubGames.get(club) ?? 0) + g);
    }
  }
  const clubs = [...clubGames.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const mainClub = clubs[0];

  // peak decade
  const decScores = c.decades.map((d) => ({
    decade: Number(d.id.split("|")[1]),
    best: Math.max(d.r.DEF, d.r.MID, d.r.RUC, d.r.FWD),
    nat: d.nat,
    g: d.g,
  }));
  const peak = [...decScores].sort((a, b) => b.best - a.best)[0];
  const primaryPos = POS_NOUN[peak.nat] ?? "player";

  const decadeSpan =
    decScores.length === 1
      ? `the ${decScores[0].decade}s`
      : `${decScores.length} decades, from the ${Math.min(...decScores.map((d) => d.decade))}s to the ${Math.max(...decScores.map((d) => d.decade))}s`;

  // Paragraph 1 — career overview
  {
    const clubPhrase =
      clubs.length === 1
        ? `for ${mainClub}`
        : `chiefly for ${mainClub}, as well as ${list(clubs.slice(1))}`;
    const leagueLabel =
      leagueFor(years[0]) === leagueFor(years[1])
        ? leagueFor(years[0])
        : `${leagueFor(years[0])}/${leagueFor(years[1])}`;
    paras.push(
      `${c.name} played ${games.toLocaleString()} senior ${leagueLabel} games ${clubPhrase} between ${years[0]} and ${years[1]}, ` +
        `lining up most often as a ${primaryPos}. On 23-0, ${c.name}'s career spans ${decadeSpan} of football.`,
    );
  }

  // Paragraph 2 — the rating, explained for this player
  {
    paras.push(
      `Our era-fair model rates ${c.name} at a peak of ${Math.round(peak.best)} out of 100, reached in the ${peak.decade}s. ` +
        `That figure measures ${c.name} only against the players of that same era — the teammates and opponents actually faced — using standardised output, ` +
        `honours and finals impact, so a ${peak.decade}s ${primaryPos} can be compared fairly with players from any other decade of the game.`,
    );
  }

  // Paragraph 3 — honours
  {
    const a = c.decades.reduce(
      (acc, d) => {
        acc.bwW += d.a.bwW;
        acc.aa += d.a.aa;
        acc.col += d.a.col;
        acc.pr += d.a.pr;
        acc.bw += d.a.bw;
        acc.rs = acc.rs || d.a.rs > 0;
        return acc;
      },
      { bwW: 0, aa: 0, col: 0, pr: 0, bw: 0, rs: false },
    );
    const h: string[] = [];
    if (a.pr > 0) h.push(`${a.pr} premiership${a.pr > 1 ? "s" : ""}`);
    if (a.bwW > 0) h.push(`${a.bwW} Brownlow Medal${a.bwW > 1 ? "s" : ""}`);
    if (a.aa > 0) h.push(`${a.aa} All-Australian selection${a.aa > 1 ? "s" : ""}`);
    if (a.col > 0) h.push(`${a.col} league leading-goalkicker award${a.col > 1 ? "s" : ""}`);
    if (a.rs) h.push("a Rising Star nomination");
    if (h.length > 0) {
      paras.push(
        `Honours on the record for ${c.name} include ${list(h)}.` +
          (a.bwW === 0 && a.bw > 0 ? ` ${c.name} also polled ${a.bw} Brownlow votes across the career.` : ""),
      );
    } else if (a.bw > 0) {
      paras.push(`${c.name} polled ${a.bw} Brownlow Medal votes across the career.`);
    }
  }

  // Paragraph 4 — statistical peak from the season sheet
  {
    const sea = c.decades.flatMap((d) => d.sea ?? []);
    if (sea.length > 0) {
      const totalGoals = sea.reduce((a, s) => a + (s[3] ?? 0), 0);
      const bestDisp = sea.filter((s) => s[2] != null).sort((a, b) => (b[2] ?? 0) - (a[2] ?? 0))[0];
      const bestBrow = sea.filter((s) => s[4] != null).sort((a, b) => (b[4] ?? 0) - (a[4] ?? 0))[0];
      const bits: string[] = [];
      if (bestDisp && (bestDisp[2] ?? 0) > 0)
        bits.push(`a best season of ${bestDisp[2]} disposals in ${bestDisp[0]}`);
      if (totalGoals > 0) bits.push(`${totalGoals.toLocaleString()} career goals`);
      if (bestBrow && (bestBrow[4] ?? 0) > 0)
        bits.push(`a top Brownlow year of ${bestBrow[4]} votes in ${bestBrow[0]}`);
      if (bits.length > 0) {
        paras.push(
          `Season by season, the data credits ${c.name} with ${list(bits)}. The full year-by-year breakdown is below.`,
        );
      }
    }
  }

  return paras;
}

// ─────────────────────────────────────────────────────────────────────────
// AFLW player
// ─────────────────────────────────────────────────────────────────────────

export function aflwPlayerProse(c: AflwCareer): string[] {
  const paras: string[] = [];
  const first = c.seasons[0].year;
  const last = c.seasons[c.seasons.length - 1].year;
  const span = first === last ? `in ${first}` : `from ${first} to ${last}`;
  const pos = POS_NOUN[c.primaryPos] ?? "player";

  // Paragraph 1 — overview
  {
    const clubPhrase =
      c.clubs.length <= 1
        ? `for ${c.clubs[0] ?? "her club"}`
        : `for ${list(c.clubs)}`;
    paras.push(
      `${c.name} has played ${c.totalGames} AFLW game${c.totalGames === 1 ? "" : "s"} ${clubPhrase} ${span}, ` +
        `lining up primarily as a ${pos}. The profile below tracks ${c.name}'s career season by season across ${c.seasons.length} AFLW campaign${c.seasons.length === 1 ? "" : "s"}.`,
    );
  }

  // Paragraph 2 — rating
  {
    paras.push(
      `Our era-fair model rates ${c.name} at a peak of ${Math.round(c.best)} out of 100, reached in ${c.peakYear}. ` +
        `Each AFLW season is rated within itself — against the players of that same year — so the figure reflects how ${c.name} measured up against direct contemporaries rather than across competitions or eras.`,
    );
  }

  // Paragraph 3 — statistical highlights
  {
    const totalGoals = c.seasons.reduce((a, s) => a + (s.st.gl ?? 0), 0);
    const bestDisp = c.seasons
      .filter((s) => s.st.di != null)
      .sort((a, b) => (b.st.di ?? 0) - (a.st.di ?? 0))[0];
    const bits: string[] = [];
    if (bestDisp && (bestDisp.st.di ?? 0) > 0)
      bits.push(`a best season of ${bestDisp.st.di} disposals in ${bestDisp.year}`);
    if (totalGoals > 0) bits.push(`${totalGoals} career goal${totalGoals === 1 ? "" : "s"}`);
    if (bits.length > 0) {
      paras.push(`The data credits ${c.name} with ${list(bits)}. Full season figures are in the table below.`);
    }
  }

  return paras;
}

// ─────────────────────────────────────────────────────────────────────────
// Club
// ─────────────────────────────────────────────────────────────────────────

export function clubProse(c: ClubData, rec: ClubRecord): string[] {
  const paras: string[] = [];

  // Paragraph 1 — premiership identity
  {
    if (c.flags.length > 0) {
      const newest = Math.max(...c.flags);
      const oldest = Math.min(...c.flags);
      const span = oldest === newest ? `in ${oldest}` : `between ${oldest} and ${newest}`;
      paras.push(
        `${c.name} have won ${c.flags.length} VFL/AFL premiership${c.flags.length > 1 ? "s" : ""} ${span}, ` +
          `the most recent in ${newest}.` +
          (c.runnerUps.length > 0
            ? ` The club has also finished runner-up ${c.runnerUps.length} time${c.runnerUps.length > 1 ? "s" : ""}, losing the Grand Final in ${list(c.runnerUps.slice(0, 4).map(String))}${c.runnerUps.length > 4 ? " and others" : ""}.`
            : ""),
      );
    } else {
      paras.push(
        `${c.name} are yet to win a VFL/AFL premiership` +
          (c.runnerUps.length > 0
            ? `, though the club has reached the Grand Final ${c.runnerUps.length} time${c.runnerUps.length > 1 ? "s" : ""} (${list(c.runnerUps.slice(0, 4).map(String))}${c.runnerUps.length > 4 ? " and others" : ""}).`
            : ` in the data covered here.`),
      );
    }
  }

  // Paragraph 2 — all-time record
  if (rec.played > 0) {
    const bigWin = rec.biggestWin
      ? ` Their biggest recorded victory is a ${rec.biggestWin.margin}-point win over ${rec.biggestWin.opp} in ${rec.biggestWin.year}.`
      : "";
    paras.push(
      `Across ${rec.firstYear}–${rec.lastYear}, ${c.name} have played ${rec.played.toLocaleString()} senior matches in the data here for a record of ` +
        `${rec.w}–${rec.l}${rec.d ? `–${rec.d}` : ""} — a ${rec.winPct}% win rate, with a scoring percentage of ${rec.pct}.${bigWin}`,
    );
  }

  // Paragraph 3 — greatest players
  if (c.greats.length > 0) {
    const top = c.greats.slice(0, 5);
    const named = top.map((p) => `${p.name} (${Math.round(p.rating)})`);
    paras.push(
      `By our era-fair rating, the greatest ${c.name} players are led by ${list(named)}. ` +
        `In all, ${c.playerCount.toLocaleString()} players who pulled on the ${c.name} jumper are rated here, ranked below by how they measured against their own contemporaries.`,
    );
  }

  return paras;
}

// ─────────────────────────────────────────────────────────────────────────
// Season
// ─────────────────────────────────────────────────────────────────────────

export function seasonProse(
  year: number,
  rows: LadderRow[],
  prem: { premier: string; runnerUp: string } | null,
  finalsCut: number,
  current: boolean,
): string[] {
  const paras: string[] = [];
  const league = leagueFor(year);

  // Paragraph 1 — the result
  if (current) {
    const leader = rows[0];
    paras.push(
      `The ${year} ${league} season is still in progress. ${leader ? `${leader.team} currently lead the ladder with ${leader.w} win${leader.w === 1 ? "" : "s"} from ${leader.p} games.` : ""} ` +
        `The live ladder and every result so far are below, updated as the season unfolds.`,
    );
  } else if (prem) {
    const minorPremier = rows[0]?.team;
    const minorBit =
      minorPremier && minorPremier !== prem.premier
        ? ` ${minorPremier} had finished on top of the home-and-away ladder as minor premiers.`
        : minorPremier === prem.premier
          ? ` ${prem.premier} also finished the home-and-away season on top of the ladder.`
          : "";
    paras.push(
      `${prem.premier} won the ${year} ${league} premiership, defeating ${prem.runnerUp} in the Grand Final.${minorBit}`,
    );
  } else {
    const leader = rows[0]?.team;
    paras.push(
      `This is the complete ${year} ${league} season.${leader ? ` ${leader} finished on top of the ladder.` : ""}`,
    );
  }

  // Paragraph 2 — the ladder shape
  if (rows.length > 0) {
    const finalists = rows.slice(0, finalsCut).map((r) => r.team);
    const spoon = rows[rows.length - 1];
    paras.push(
      `${rows.length} teams contested the season. ${finalists.length > 0 ? `The ${ordinal(finalsCut)}-placed cut-off sent ${list(finalists)} into the finals.` : ""} ` +
        `${spoon ? `${spoon.team} finished last with ${spoon.w} win${spoon.w === 1 ? "" : "s"}.` : ""} The full final ladder and round-by-round results follow.`,
    );
  }

  return paras;
}
