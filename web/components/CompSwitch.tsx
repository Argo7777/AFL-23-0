import Link from "next/link";

/** AFL ⇄ AFLW toggle shown on every stats page. AFL is always the primary
 *  (left) option; AFLW is the alternate competition. */
export default function CompSwitch({
  active,
  aflHref,
  aflwHref,
}: {
  active: "afl" | "aflw";
  aflHref: string;
  aflwHref: string;
}) {
  const base = "rounded-full px-4 py-1.5 font-display text-xs font-black uppercase tracking-wide transition";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-pitch-light p-1">
      <Link
        href={aflHref}
        className={`${base} ${active === "afl" ? "bg-grass text-pitch" : "text-slate-400 hover:text-slate-100"}`}
      >
        AFL
      </Link>
      <Link
        href={aflwHref}
        className={`${base} ${active === "aflw" ? "bg-[#ff5e44] text-white" : "text-slate-400 hover:text-slate-100"}`}
      >
        AFLW
      </Link>
    </div>
  );
}
