"use client";

import { useMemo, useState } from "react";
import { ScShell, useScFeed, PosBadge, AvailBadge } from "@/components/ScBits";
import { type ScPlayer, availability } from "@/lib/supercoach";

export default function ScInjuriesPage() {
  const { feed, err } = useScFeed();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    if (!feed) return [];
    return feed.players
      .filter((p) => availability(p) || p.statusText || (p.status && p.status !== "pre" && p.status !== "played"))
      .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.teamAbbr.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const rank = (p: ScPlayer) => (availability(p)?.label === "OUT" ? 0 : availability(p)?.label === "SUSP" ? 1 : availability(p)?.label === "TEST" ? 2 : 3);
        return rank(a) - rank(b) || (b.noteDate || "").localeCompare(a.noteDate || "");
      });
  }, [feed, q]);

  if (err) return <ScShell title="Injuries & news" blurb="Availability."><p className="text-hot">Feed not built.</p></ScShell>;
  if (!feed) return <ScShell title="Injuries & news" blurb="Availability."><p className="text-slate-400">Loading…</p></ScShell>;

  return (
    <ScShell title="Injuries & news" blurb="Players carrying an availability flag (out, test, suspended) or recent news. Check before locking your team in.">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player / team…"
        className="mb-3 w-full rounded-lg border border-line bg-card px-3 py-2 text-base" />
      <div className="space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{p.name}</span>
              <AvailBadge p={p} />
              <span className="text-[11px] text-slate-500">{p.teamAbbr} · <PosBadge positions={p.positions} /></span>
              <span className="ml-auto text-xs text-slate-500">avg {p.avg || "—"} · {p.owned}% owned</span>
            </div>
            {p.statusText && <p className="mt-1 text-sm text-gold">{p.statusText}</p>}
            {p.note && (
              <p className="mt-1 text-xs text-slate-400">
                “{p.note}”{p.noteDate && <span className="text-slate-600"> — {new Date(p.noteDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>}
              </p>
            )}
          </div>
        ))}
        {!rows.length && <p className="py-6 text-center text-sm text-slate-500">No flagged players right now.</p>}
      </div>
    </ScShell>
  );
}
