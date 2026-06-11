import Link from "next/link";

export const metadata = {
  title: "About the numbers",
  description:
    "How AFL 23-0 rates 130 years of footballers from real scraped data: era-relative stats, Brownlow votes, All-Australian selections, premierships, derived salaries and a season simulation calibrated to real team performance.",
  alternates: { canonical: "/about" },
};

const sections: { h: string; body: string[] }[] = [
  {
    h: "Where the data comes from",
    body: [
      "Every number in the game is scraped from public, authoritative footy sources — nothing is hand-entered or invented. Season-by-season player statistics (1897→today) and match results come from afltables.com; Brownlow vote tallies, All-Australian teams, Rising Star nominations, player positions and profiles come from footywire.com (1924–1964 Brownlow tallies from afltables); a handful of pre-1965 playing positions come from Wikidata. Premiership players are read from the actual Grand Final team sheets.",
      "The current decade updates as seasons are played: a data refresh re-scrapes the 2020s, and because ratings are built on per-game averages, established players stay stable mid-season — new games, new players and end-of-season honours flow in.",
    ],
  },
  {
    h: "How players are rated",
    body: [
      "Players are rated within their decade, against their peers — a 1950s champion is measured against the 1950s, never against modern stat lines. For every statistic that was actually recorded in that era (goals all the way back to 1897; kicks, marks and handballs from 1965; tackles from 1987; contested possessions from the late 1990s) we compute era-relative z-scores of per-game rates across all qualified players of the decade.",
      "Each position has its own weighting profile: forwards are judged on goals, goal assists, marks inside 50 and contested marks; midfielders on disposals, clearances, contested possessions, inside 50s and tackles; defenders on rebound 50s, one-percenters, marks and kicks; rucks on hitouts, contested marks, clearances and tackles. Your pick's score at a position is his percentile against the real specialists in that role — put a midfielder at full-forward and he is graded as a forward, against forwards.",
      "Stats are only half the story. An accolade score adds Brownlow medals, votes-per-game, top-10 Brownlow finishes, All-Australian selections (team and squad), leading the league goalkicking (the Coleman of its day), premierships from real Grand Final lineups, Rising Star honours and durability. In stat-poor eras the accolade side carries more of the weight — for a 1920s champion, medals, flags and goalkicking titles are the honest evidence that exists.",
      "Short careers carry less information: players below the decade's games threshold are shrunk toward the median, so seven hot games can't outrate 150 great ones.",
    ],
  },
  {
    h: "Utility and versatility",
    body: [
      "The UTL spot scores a player at his best position with a versatility multiplier — up to +12% for genuine swingmen who rate strongly in multiple roles. Position eligibility comes from footywire profiles, All-Australian line selections, Wikidata, or — where no record exists — the player's own statistical archetype.",
    ],
  },
  {
    h: "Salaries and the cap",
    body: [
      "No public dataset of historical AFL salaries exists, so prices are derived, transparently, from the data: a player's market value blends his on-field rating (60%) with his fame — the accolade score (40%) — mapped onto a realistic modern pay scale (set against the AFL's published Total Player Payments figures: senior minimum ≈ $100k, top of market ≈ $1.9M). Decorated superstars price at the top; under-decorated stat machines become bargains, exactly the value a sharp list manager hunts for. The cap funds 23 players at a 0.70-market average, so a list of nothing but legends cannot fit.",
    ],
  },
  {
    h: "The season simulation",
    body: [
      "Every real club season since 1897 gets a strength score from its actual results (win percentage blended with points share). Your team rating maps onto that real distribution for the eras you selected — a 2020s-only side is measured against real 2020s teams. Your season is then simulated 10,000 times, 23 games against opponents drawn from those real club-seasons, using head-to-head win probabilities. The record you see is the most common outcome; the 23-0 figure is how often your side ran the table.",
      "Two rules keep perfection honest. The schedule skips the bottom quartile of history's teams and leans toward quality — no fixture is 23 games against wooden-spooners. And no side, however stacked, escapes the chance of an upset: injuries, weather and freak days are part of the sport. Even the greatest team ever assembled almost never gets through a season untouched — 23-0 is meant to be the stuff of legend.",
      "A strong enough home-and-away record earns a finals berth in each simulated season — top of the ladder gets the double chance, lower seeds must win four straight — and every September game is played against opponents drawn from the era's best teams. The campaign summary shows how often your side lifts the cup, loses the Grand Final, or bows out earlier.",
    ],
  },
];

export default function About() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="font-display text-2xl font-black text-grass">23–0</Link>
      <h1 className="font-display mt-6 text-4xl font-black">About the numbers</h1>
      {sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="font-display text-2xl font-black text-gold">{s.h}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-3 text-sm leading-relaxed text-slate-300">{p}</p>
          ))}
        </section>
      ))}
      <p className="mt-10 text-xs text-slate-500">
        Data: afltables.com · footywire.com · wikidata.org. Access patterns follow the
        open-source fitzRoy project. This is a fan project — stats belong to their sources.
      </p>
    </main>
  );
}
