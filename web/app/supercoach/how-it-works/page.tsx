import type { Metadata } from "next";
import Link from "next/link";
import { ScShell } from "@/components/ScBits";

export const metadata: Metadata = {
  title: "How SuperCoach works — scoring, prices & projections | AFL 23–0",
  description: "A plain-English guide to AFL SuperCoach: how points are scored (Champion Data ratings), how prices and breakevens move, and what every metric on our SuperCoach pages means.",
};

export default function HowScWorks() {
  return (
    <ScShell title="How SuperCoach works" blurb="Scoring, prices, breakevens and projections — explained, plus exactly how we calculate the numbers on these pages.">
      <div className="space-y-6 text-sm leading-relaxed text-slate-300">

        <Section title="What SuperCoach is">
          <p>
            SuperCoach is a salary-cap fantasy game. You’re given a budget and pick a squad; each player has a
            <b> price</b> and earns <b>SuperCoach points</b> each round based on how they actually performed. Score more
            than your rivals, and as players rise and fall in price you trade to bank cash and upgrade. Three numbers
            drive everything: <b>how a player scores</b>, <b>how their price moves</b>, and <b>how many points they’re
            projected to score next</b>.
          </p>
        </Section>

        <Section title="How points are scored">
          <p>
            AFL SuperCoach scores are built from <b>Champion Data player ratings</b> — the official AFL statistician.
            Every action on the ground is weighted by its real value: an uncontested handball in defence is worth far
            less than a contested clearance or a goal. It is <i>not</i> a simple “1 point per disposal” system, which is
            why a player can rack up touches and still score modestly, while a lower-possession defender posts a big
            number off intercept marks and rebound.
          </p>
          <p>Broadly, you’re <b className="text-grass">rewarded</b> for:</p>
          <ul className="ml-5 list-disc space-y-0.5 text-slate-400">
            <li>Effective/contested possessions, clearances and metres gained</li>
            <li>Marks (especially contested and intercept), goals and behinds</li>
            <li>Tackles, hit-outs to advantage, score involvements and goal assists</li>
          </ul>
          <p>and <b className="text-hot">penalised</b> for:</p>
          <ul className="ml-5 list-disc space-y-0.5 text-slate-400">
            <li>Turnovers — ineffective disposals and clangers</li>
            <li>Free kicks given away, and dropped/spoiled contests against you</li>
          </ul>
          <p className="rounded-lg border border-line bg-card p-3 text-slate-400">
            A round score near <b className="text-slate-200">100</b> is strong; elite midfielders average 110–120, while
            cheap rookies might sit in the 40s–60s. The exact AFL weights are proprietary to Champion Data, but the
            system is <b>deterministic</b> — the same stat line always produces the same score.
          </p>
        </Section>

        <Section title="Can the formula be reconstructed?">
          <p>
            Yes — closely. Because every player exposes both their total points and their full stat line, we can fit the
            scoring weights statistically. For <b>NRL SuperCoach</b> the formula is clean and we recover it
            <b className="text-grass"> exactly</b> (R² = 1.00). <b>AFL SuperCoach</b> is more contextual (the value of an
            act depends on game state), so a straight fit lands at about <b className="text-grass">R² ≈ 0.995</b> — very
            close, and enough to project from. In practice we don’t need to: SuperCoach publishes its <i>own</i> projected
            score for each player, which is what the <Link href="/supercoach/players" className="text-gold underline">Proj</Link> column shows.
          </p>
        </Section>

        <Section title="How prices move">
          <p>
            A player’s price tracks their recent scoring. SuperCoach divides points by a “magic number” to set a dollar
            value, and updates it off a <b>rolling average of the last few games</b> (not the whole season). So price
            chases <b>recent form</b>: a player on a hot streak rises; a slump drops them.
          </p>
          <p>
            The key trading concept is the <b>breakeven</b> — the score a player must post this round just to hold their
            price. Beat it and they rise; miss it and they fall. Cheap players who keep beating their breakeven are
            <b> cash cows</b>: you buy them low, let them generate cash, and sell before they plateau. Our{" "}
            <Link href="/supercoach/prices" className="text-gold underline">Prices</Link> page tracks the round and
            season price change and flags the cash cows.
          </p>
        </Section>

        <Section title="Positions & DPP">
          <p>
            Players are classified <b className="text-ice">DEF</b>, <b className="text-grass">MID</b>,
            <b className="text-gold"> RUC</b> or <b className="text-hot">FWD</b>. Some hold <b>dual position (DPP)</b>
            eligibility — listed in two groups — which gives valuable flexibility when trading. We show every player’s
            position(s) throughout, with DPP players carrying both chips.
          </p>
        </Section>

        <Section title="What the metrics on these pages mean">
          <Defs items={[
            ["Price", "Current SuperCoach salary, in dollars. Round $Δ / Season $Δ are the change this round and across the season."],
            ["Proj", "SuperCoach’s own projected score for the upcoming round."],
            ["Avg / L3 / L5", "Season average, and the average of the last 3 and last 5 games — recent form vs the long-run."],
            ["Form", "L3 average minus season average. Positive = heating up."],
            ["Consistency", "100 × (1 − SD ÷ mean) across games played — higher means fewer cheap weeks."],
            ["Own%", "Share of teams holding the player. Differentials are low-owned players projected to score well."],
            ["Value", "Projected points per $100k of price — the best bang for your salary."],
            ["Avg v Opp / @ Ven", "The player’s historical average against this round’s opponent and at the venue — a quick matchup read."],
          ]} />
        </Section>

        <Section title="Where the data comes from">
          <p>
            All figures are pulled live from SuperCoach’s public feed and refreshed through the week (prices settle after
            each round). We add the derived metrics — value, form delta, consistency and the round-by-round sparklines —
            on top. This is an independent stats resource and isn’t affiliated with or endorsed by SuperCoach or the AFL.
          </p>
          <p className="text-xs text-slate-500">
            Start exploring: <Link href="/supercoach/players" className="text-gold underline">all players</Link> ·{" "}
            <Link href="/supercoach/value" className="text-gold underline">value</Link> ·{" "}
            <Link href="/supercoach/prices" className="text-gold underline">prices</Link> ·{" "}
            <Link href="/supercoach/form" className="text-gold underline">form</Link>.
          </p>
        </Section>
      </div>
    </ScShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display mb-2 text-lg font-black text-gold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Defs({ items }: { items: [string, string][] }) {
  return (
    <dl className="divide-y divide-line/40 rounded-xl border border-line bg-card">
      {items.map(([term, def]) => (
        <div key={term} className="flex gap-3 px-3 py-2">
          <dt className="w-28 shrink-0 font-bold text-slate-200">{term}</dt>
          <dd className="text-slate-400">{def}</dd>
        </div>
      ))}
    </dl>
  );
}
