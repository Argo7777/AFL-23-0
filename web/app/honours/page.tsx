import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { loadCareers } from "@/lib/playerdb";

export const dynamic = "force-static";

interface Awards {
  aa: Record<string, string[]>;
  brownlow: Record<string, string>;
  coleman: Record<string, string>;
}

function getAwards(): Awards {
  return JSON.parse(readFileSync(join(process.cwd(), "public", "data", "awards.json"), "utf8"));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

/** map winner names to a player-page slug where we have one */
function buildNameIndex(): Map<string, string> {
  const idx = new Map<string, string>();
  for (const c of loadCareers().values()) {
    if (c.best >= 75) idx.set(norm(c.name), c.slug);
  }
  return idx;
}

function NameLink({ name, slug }: { name: string; slug?: string }) {
  return slug ? (
    <Link href={`/player/${slug}`} className="text-slate-100 hover:text-ice hover:underline">{name}</Link>
  ) : (
    <span className="text-slate-100">{name}</span>
  );
}

function WinnerTable({
  title, sub, winners, nameIdx,
}: {
  title: string;
  sub: string;
  winners: [string, string][]; // [year, name] newest first
  nameIdx: Map<string, string>;
}) {
  return (
    <section className="rounded-2xl border border-line bg-pitch-light p-4">
      <h2 className="font-display text-xl font-black text-gold">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
      <div className="mt-3 grid gap-0.5">
        {winners.map(([year, name]) => (
          <div key={year} className="flex items-center gap-3 rounded-lg bg-pitch px-3 py-1.5 text-sm">
            <span className="w-12 shrink-0 font-display font-black text-slate-400">{year}</span>
            <span className="min-w-0 flex-1 truncate font-display font-black">
              <NameLink name={name} slug={nameIdx.get(norm(name))} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export const metadata = {
  title: "AFL honour roll — every Brownlow, Coleman & All-Australian winner",
  description:
    "The complete list of AFL/VFL award winners: Brownlow Medallists (1924–today), Coleman Medal / leading goalkickers, and All-Australian teams — every year, with links to full career profiles.",
  alternates: { canonical: "/honours" },
};

export default function HonoursPage() {
  const awards = getAwards();
  const nameIdx = buildNameIndex();
  const sortDesc = (o: Record<string, string>): [string, string][] =>
    Object.entries(o).sort((a, b) => Number(b[0]) - Number(a[0]));

  const brownlow = sortDesc(awards.brownlow);
  const coleman = sortDesc(awards.coleman);
  const aaYears = Object.keys(awards.aa).map(Number).sort((a, b) => b - a);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">The AFL Honour Roll</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every Brownlow Medallist, Coleman Medal winner and All-Australian team in
        VFL/AFL history — derived from real data. Tap a name for their full career.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <WinnerTable
          title="Brownlow Medal"
          sub={`${brownlow.length} winners · the league's best & fairest`}
          winners={brownlow}
          nameIdx={nameIdx}
        />
        <WinnerTable
          title="Coleman Medal"
          sub={`${coleman.length} winners · the leading goalkicker each season`}
          winners={coleman}
          nameIdx={nameIdx}
        />
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-pitch-light p-4">
        <h2 className="font-display text-xl font-black text-gold">All-Australian teams</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          The best XXII of each season since 1991. {aaYears.length} teams named.
        </p>
        <div className="mt-3 grid gap-3">
          {aaYears.map((year) => (
            <div key={year}>
              <div className="font-display text-sm font-black text-slate-300">{year}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {awards.aa[year].map((name) => {
                  const slug = nameIdx.get(norm(name));
                  return (
                    <span key={name} className="rounded-full bg-pitch px-2.5 py-0.5 text-xs">
                      <NameLink name={name} slug={slug} />
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center">
        <Link href="/" className="font-display inline-block rounded-xl bg-grass px-8 py-3 text-lg font-black text-pitch hover:bg-lime-300">
          BUILD A TEAM OF LEGENDS →
        </Link>
      </p>
    </main>
  );
}
