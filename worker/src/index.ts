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

async function addTo(env: Env, key: string, entry: Entry, max = 100): Promise<void> {
  const cur = JSON.parse((await env.BOARD.get(key)) ?? "[]") as Entry[];
  cur.push(entry);
  cur.sort(byBest);
  await env.BOARD.put(key, JSON.stringify(cur.slice(0, max)));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { headers });
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/score") {
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
      if (!name || !Number.isFinite(wins) || wins < 0 || wins > 23 || losses < 0 || losses > 23 ||
          !Number.isFinite(rating) || rating < 0 || rating > 100) {
        return new Response(`{"error":"invalid"}`, { status: 400, headers });
      }
      const fin = ["QF", "SF", "PF", "GF", "P"].includes(String(body.fin)) ? String(body.fin) : "";
      const entry: Entry = {
        n: name, w: wins, l: losses, r: rating, f: Boolean(body.flag), m: mode, t: Date.now(), fin,
      };
      if (/^\d{4}-\d{2}-\d{2}$/.test(daily)) await addTo(env, `d:${daily}`, entry);
      // the 23-0 Club: perfect seasons only, newest first
      if (wins === 23 && losses === 0 && mode !== "spoon" && mode !== "gauntlet") {
        const cur = JSON.parse((await env.BOARD.get("club230")) ?? "[]") as Entry[];
        cur.unshift(entry);
        await env.BOARD.put("club230", JSON.stringify(cur.slice(0, 200)));
      }
      return new Response(`{"ok":true}`, { headers });
    }

    if (req.method === "GET" && url.pathname === "/board") {
      const d = url.searchParams.get("d") ?? "";
      const daily = /^\d{4}-\d{2}-\d{2}$/.test(d)
        ? JSON.parse((await env.BOARD.get(`d:${d}`)) ?? "[]")
        : [];
      const club = JSON.parse((await env.BOARD.get("club230")) ?? "[]");
      // `alltime` kept for clients still running the previous page bundle
      return new Response(JSON.stringify({ daily, club, alltime: club }), {
        headers: { ...headers, "Cache-Control": "public, max-age=30" },
      });
    }

    return new Response(`{"error":"not found"}`, { status: 404, headers });
  },
};
