import ModelNav from "@/components/ModelNav";
import Disclaimer from "@/components/Disclaimer";

export const metadata = {
  title: "How the AFL model works",
  description:
    "Methodology behind the AFL player-stat projections: data, models, the Monte-Carlo engine, and how value & Kelly staking are derived.",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="font-display mb-1 text-sm font-black uppercase text-grass">
        {n}. {title}
      </div>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <main className="mx-auto max-w-3xl px-3 py-5">
      <h1 className="font-display mb-1 text-2xl font-black text-grass">How it works</h1>
      <p className="mb-4 text-sm text-slate-400">
        From raw stats to a priced market, end to end.
      </p>
      <ModelNav />

      <div className="grid gap-3">
        <Step n={1} title="Data">
          Every completed AFL match since 2015 is pulled from the official Champion Data
          StatsPro feed — one row per player per game with the full stat line (disposals,
          kicks, handballs, marks, tackles, goals, behinds, clearances, hit-outs, fantasy
          points) plus context: position, time-on-ground, venue, home/away and opponent.
        </Step>
        <Step n={2} title="Features">
          For each game we build <i>leakage-safe</i> inputs — only what was known beforehand:
          rolling form (last 3/5/10 games), season- and career-to-date rates, role, a primary-ruck
          flag, rest days, and how much the opponent typically concedes. A game never sees its own
          result.
        </Step>
        <Step n={3} title="Models">
          A gradient-boosting model predicts each player’s expected output for every market;
          goals and behinds use a Poisson formulation suited to low counts. Out of sample (seasons
          held back), the models beat a “last-5-games average” baseline on 9 of 10 markets.
          Fantasy points are modelled two ways — directly, and rebuilt from the components — as a
          cross-check.
        </Step>
        <Step n={4} title="Monte-Carlo engine">
          Each match is simulated thousands of times. A team’s total for every stat is drawn around
          its expectation, then handed out to players by their share of the team — jittered each sim
          by the historical spread, so star and role players get realistic variance. Disposals are
          always kicks + handballs; fantasy is rebuilt from the simulated components. Team scores
          (6 × goals + behinds) give the win probability and totals. This yields a full, internally
          consistent distribution for every player and market.
        </Step>
        <Step n={5} title="Comparing the books">
          The <b>Compare</b> page pulls live player-line odds from <b>Sportsbet</b>, <b>TAB</b> and
          <b>Ladbrokes</b> and lays every book’s price side by side for each line, with the best
          highlighted. Next to them sits the model’s own probability and fair price, so you can see at
          a glance where a book is paying over the odds. (Dabble is a Pick’em product, not fixed odds,
          so it lives on the <b>Pick’em</b> page.)
        </Step>
        <Step n={6} title="Value & Kelly staking">
          From the best available price we report the <b>edge</b> (model probability − the market’s
          de-vigged probability) and <b>expected value</b> per dollar. The recommended stake uses the
          <b> Kelly criterion</b> — full Kelly maximises long-run growth; we default to a safer
          quarter-Kelly, sized to your bankroll and capped at 5% per bet. The <b>Value</b> page does the
          same for any price you enter by hand.
        </Step>
        <Step n={7} title="Trust & limits">
          Models are imperfect: lineups change late, roles shift, and weather and tactics aren’t
          fully captured. Treat projections as one input, not certainty. Backtested accuracy and
          calibration are tracked so you can see where the model is reliable — and where it isn’t.
        </Step>
      </div>

      <Disclaimer />
    </main>
  );
}
