import Link from "next/link";

const LINKS: [string, string][] = [
  ["Play", "/"],
  ["Ladder", "/ladder"],
  ["Results", "/results"],
  ["Seasons", "/seasons"],
  ["Players", "/greats"],
  ["Clubs", "/clubs"],
  ["Premierships", "/premierships"],
  ["Honours", "/honours"],
  ["Predict", "/predict"],
  ["Model", "/projections"],
];

/** Slim sitewide nav — gives the stats-site feel and strong internal linking. */
export default function NavBar() {
  return (
    <nav className="border-b border-line/60 bg-pitch/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-2 text-sm">
        <Link href="/" className="font-display mr-2 shrink-0 text-lg font-black text-grass">23–0</Link>
        {LINKS.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 rounded-lg px-2.5 py-1 font-display text-xs font-black uppercase tracking-wide text-slate-400 transition hover:bg-pitch-light hover:text-slate-100"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
