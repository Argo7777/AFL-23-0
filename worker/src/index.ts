/**
 * AFL 23-0 global leaderboard — Cloudflare Worker + KV.
 *
 * POST /score  { name, wins, losses, rating, flag, mode, daily? }
 * GET  /board?d=YYYY-MM-DD  -> { daily: Entry[], alltime: Entry[] }
 */
export interface Env {
  BOARD: KVNamespace;
}

interface Entry {
  n: string; // display name
  w: number;
  l: number;
  r: number; // team rating
  f: boolean; // premiers
  m: string; // mode
  t: number; // timestamp
  fin: string; // finals result: QF/SF/PF/GF exit, P premiers, "" not played
}

const ALLOWED_ORIGINS = [
  "https://afl23-0.com",
  "https://www.afl23-0.com",
  "http://localhost:3023",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

const byBest = (a: Entry, b: Entry) => b.w - a.w || b.r - a.r || a.t - b.t;

// awards people can predict (one tally per comp+category in KV)
const VOTE_CATS = new Set(["premiership", "spoon", "brownlow", "coleman", "rising"]);

// AFL keeps its original key names (backward-compatible); AFLW is namespaced so
// the two competitions have completely separate boards.
function comp(v: unknown): "afl" | "aflw" {
  return v === "aflw" ? "aflw" : "afl";
}
function dailyKey(c: "afl" | "aflw", daily: string): string {
  return c === "afl" ? `d:${daily}` : `d:${c}:${daily}`;
}
function clubKey(c: "afl" | "aflw"): string {
  return c === "afl" ? "club230" : `club230:${c}`;
}

async function addTo(env: Env, key: string, entry: Entry, max = 100, ttl?: number): Promise<void> {
  const cur = JSON.parse((await env.BOARD.get(key)) ?? "[]") as Entry[];
  cur.push(entry);
  cur.sort(byBest);
  // daily keys carry a TTL so they don't accumulate forever; the all-time
  // club board is permanent (no ttl).
  await env.BOARD.put(key, JSON.stringify(cur.slice(0, max)), ttl ? { expirationTtl: ttl } : undefined);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { headers });
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/score") {
      // naive per-IP rate limit: 3 posts per minute keeps the boards honest
      // (a season + its finals update fit comfortably; spam scripts don't)
      const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
      const rlKey = `rl:${ip}`;
      const count = Number((await env.BOARD.get(rlKey)) ?? 0);
      if (count >= 3) {
        return new Response(`{"error":"slow down"}`, { status: 429, headers });
      }
      await env.BOARD.put(rlKey, String(count + 1), { expirationTtl: 60 });

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return new Response(`{"error":"bad json"}`, { status: 400, headers });
      }
      const name = String(body.name ?? "").replace(/[^A-Za-z0-9 _.\-]/g, "").trim().slice(0, 12);
      const wins = Math.round(Number(body.wins));
      const losses = Math.round(Number(body.losses));
      const rating = Math.round(Number(body.rating) * 10) / 10;
      const mode = String(body.mode ?? "").slice(0, 12);
      const daily = String(body.daily ?? "");
      const c = comp(body.comp);
      if (!name || !Number.isFinite(wins) || wins < 0 || wins > 23 || losses < 0 || losses > 23 ||
          wins + losses > 23 || !Number.isFinite(rating) || rating < 0 || rating > 100) {
        return new Response(`{"error":"invalid"}`, { status: 400, headers });
      }
      const fin = ["QF", "SF", "PF", "GF", "P"].includes(String(body.fin)) ? String(body.fin) : "";
      const entry: Entry = {
        n: name, w: wins, l: losses, r: rating, f: Boolean(body.flag), m: mode, t: Date.now(), fin,
      };
      // daily boards expire after ~45 days so KV doesn't grow forever
      if (/^\d{4}-\d{2}-\d{2}$/.test(daily)) await addTo(env, dailyKey(c, daily), entry, 100, 3_888_000);
      // the perfect-season Club: 23-0 (AFL) or 12-0 (AFLW), newest first
      const perfectWins = c === "aflw" ? 12 : 23;
      if (wins === perfectWins && losses === 0 && mode !== "spoon" && mode !== "gauntlet") {
        const ck = clubKey(c);
        const cur = JSON.parse((await env.BOARD.get(ck)) ?? "[]") as Entry[];
        cur.unshift(entry);
        await env.BOARD.put(ck, JSON.stringify(cur.slice(0, 200)));
      }
      return new Response(`{"ok":true}`, { headers });
    }

    // ---- awards predictor: people vote on who'll win the season's awards ----
    if (req.method === "POST" && url.pathname === "/vote") {
      const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
      const vrl = `vrl:${ip}`;
      const vc = Number((await env.BOARD.get(vrl)) ?? 0);
      if (vc >= 40) return new Response(`{"error":"slow down"}`, { status: 429, headers });
      await env.BOARD.put(vrl, String(vc + 1), { expirationTtl: 60 });

      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { return new Response(`{"error":"bad json"}`, { status: 400, headers }); }
      const c = comp(body.comp);
      const category = String(body.category ?? "");
      if (!VOTE_CATS.has(category)) return new Response(`{"error":"bad category"}`, { status: 400, headers });
      const clean = (s: unknown) => String(s ?? "").replace(/[^A-Za-z0-9 .'\-]/g, "").trim().slice(0, 40);
      const choice = clean(body.choice);
      const prev = clean(body.prev);
      if (!choice) return new Response(`{"error":"no choice"}`, { status: 400, headers });

      const key = `v:${c}:${category}`;
      const tally = JSON.parse((await env.BOARD.get(key)) ?? "{}") as Record<string, number>;
      tally[choice] = (tally[choice] ?? 0) + 1;
      if (prev && prev !== choice && (tally[prev] ?? 0) > 0) tally[prev]--;
      // ~400-day TTL so tallies reset between seasons
      await env.BOARD.put(key, JSON.stringify(tally), { expirationTtl: 34_560_000 });
      return new Response(`{"ok":true}`, { headers });
    }

    if (req.method === "GET" && url.pathname === "/votes") {
      const c = comp(url.searchParams.get("comp"));
      const out: Record<string, Record<string, number>> = {};
      for (const cat of VOTE_CATS) {
        out[cat] = JSON.parse((await env.BOARD.get(`v:${c}:${cat}`)) ?? "{}");
      }
      return new Response(JSON.stringify(out), {
        headers: { ...headers, "Cache-Control": "public, max-age=30" },
      });
    }

    if (req.method === "GET" && url.pathname === "/board") {
      const c = comp(url.searchParams.get("comp"));
      const d = url.searchParams.get("d") ?? "";
      const daily = /^\d{4}-\d{2}-\d{2}$/.test(d)
        ? JSON.parse((await env.BOARD.get(dailyKey(c, d))) ?? "[]")
        : [];
      const club = JSON.parse((await env.BOARD.get(clubKey(c))) ?? "[]");
      // `alltime` kept for clients still running the previous page bundle
      return new Response(JSON.stringify({ daily, club, alltime: club }), {
        headers: { ...headers, "Cache-Control": "public, max-age=30" },
      });
    }

    return new Response(`{"error":"not found"}`, { status: 404, headers });
  },
};
