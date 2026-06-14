/**
 * Daily analytics report for afl23-0.com.
 *
 * Pulls the last 24h of Cloudflare Web Analytics (RUM) via the GraphQL
 * Analytics API and writes a plain-text + HTML report to report.txt / report.html
 * for the workflow to email.
 *
 * Env:
 *   CF_API_TOKEN   - Cloudflare token with "Account Analytics: Read"
 *   CF_ACCOUNT_ID  - Cloudflare account id
 *   CF_SITE_TAG    - Web Analytics site tag (NOT the beacon token)
 */
import { writeFileSync } from "node:fs";

const TOKEN = process.env.CF_API_TOKEN;
const ACCOUNT = process.env.CF_ACCOUNT_ID;
const SITE = process.env.CF_SITE_TAG;

if (!TOKEN || !ACCOUNT || !SITE) {
  console.error("Missing CF_API_TOKEN / CF_ACCOUNT_ID / CF_SITE_TAG");
  process.exit(1);
}

const end = new Date();
const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
const iso = (d) => d.toISOString();
const dayLabel = end.toLocaleDateString("en-AU", {
  weekday: "long", day: "numeric", month: "long",
  timeZone: "Australia/Melbourne",
});

async function gql(query) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.viewer.accounts[0];
}

const filter = `filter: { AND: [{ datetime_geq: "${iso(start)}" }, { datetime_leq: "${iso(end)}" }, { siteTag: "${SITE}" }] }`;

/** grouped query helper for a single dimension */
async function group(dimension, limit = 8) {
  const data = await gql(`{
    viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      rumPageloadEventsAdaptiveGroups(${filter}, limit: ${limit}, orderBy: [count_DESC]) {
        count
        sum { visits }
        dimensions { ${dimension} }
      }
    } }
  }`);
  return data.rumPageloadEventsAdaptiveGroups.map((g) => ({
    key: g.dimensions[dimension] || "(none)",
    views: g.count,
    visits: g.sum.visits,
  }));
}

async function totals() {
  const data = await gql(`{
    viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      rumPageloadEventsAdaptiveGroups(${filter}, limit: 1) {
        count
        sum { visits }
      }
    } }
  }`);
  const g = data.rumPageloadEventsAdaptiveGroups[0];
  return { views: g?.count ?? 0, visits: g?.sum.visits ?? 0 };
}

const t = await totals();
const paths = await group("requestPath", 12);
const countries = await group("countryName", 6);
const referers = await group("refererHost", 6);
const devices = await group("deviceType", 4);

// crude engagement signal: views-per-visit on the busiest pages
const engagement = paths
  .filter((p) => p.visits >= 3)
  .map((p) => ({ ...p, vpv: p.views / p.visits }))
  .sort((a, b) => b.vpv - a.vpv);
const stickiest = engagement.slice(0, 3);
const bounciest = [...engagement].reverse().slice(0, 3);

const line = (rows) =>
  rows.map((r) => `  ${String(r.views).padStart(5)} views · ${String(r.visits).padStart(4)} visits  ${r.key}`).join("\n");

const txt = `AFL 23-0 — daily analytics · ${dayLabel}
(last 24 hours, afl23-0.com)

OVERVIEW
  ${t.visits} visitors · ${t.views} page views${t.visits ? ` · ${(t.views / t.visits).toFixed(1)} pages/visit` : ""}

TOP PAGES
${line(paths) || "  (no data)"}

WHERE FROM (referrers)
${line(referers) || "  (direct/none)"}

COUNTRIES
${line(countries) || "  (no data)"}

DEVICES
${line(devices) || "  (no data)"}

WORKING WELL (most pages per visit — people exploring)
${stickiest.map((p) => `  ${p.vpv.toFixed(1)} pages/visit  ${p.key}`).join("\n") || "  (not enough traffic yet)"}

DROP-OFF (fewest pages per visit — people leaving fast)
${bounciest.map((p) => `  ${p.vpv.toFixed(1)} pages/visit  ${p.key}`).join("\n") || "  (not enough traffic yet)"}

— full dashboard: https://dash.cloudflare.com/${ACCOUNT}/web-analytics
`;

const htmlRows = (rows) =>
  rows.map((r) => `<tr><td style="text-align:right;padding:2px 10px">${r.views}</td><td style="text-align:right;padding:2px 10px;color:#888">${r.visits}</td><td style="padding:2px 10px">${r.key}</td></tr>`).join("");

const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:560px;color:#111">
<h2 style="margin:0">AFL 23-0 — daily analytics</h2>
<p style="color:#666;margin:2px 0 16px">${dayLabel} · last 24 hours</p>
<div style="font-size:28px;font-weight:800">${t.visits} visitors <span style="color:#888;font-weight:400;font-size:16px">/ ${t.views} page views${t.visits ? ` · ${(t.views / t.visits).toFixed(1)} pages per visit` : ""}</span></div>
<h3 style="margin:18px 0 4px">Top pages</h3><table style="border-collapse:collapse;font-size:13px">${htmlRows(paths)}</table>
<h3 style="margin:18px 0 4px">Where they came from</h3><table style="border-collapse:collapse;font-size:13px">${htmlRows(referers) || "<tr><td>(direct)</td></tr>"}</table>
<h3 style="margin:18px 0 4px">Countries</h3><table style="border-collapse:collapse;font-size:13px">${htmlRows(countries)}</table>
<h3 style="margin:18px 0 4px">Devices</h3><table style="border-collapse:collapse;font-size:13px">${htmlRows(devices)}</table>
<h3 style="margin:18px 0 4px;color:#1a7a3a">Working well (people exploring)</h3>
<table style="font-size:13px">${stickiest.map((p) => `<tr><td style="padding:2px 10px;font-weight:700">${p.vpv.toFixed(1)} pages/visit</td><td>${p.key}</td></tr>`).join("") || "<tr><td>not enough traffic yet</td></tr>"}</table>
<h3 style="margin:18px 0 4px;color:#b03030">Drop-off (people leaving fast)</h3>
<table style="font-size:13px">${bounciest.map((p) => `<tr><td style="padding:2px 10px;font-weight:700">${p.vpv.toFixed(1)} pages/visit</td><td>${p.key}</td></tr>`).join("") || "<tr><td>not enough traffic yet</td></tr>"}</table>
<p style="margin-top:18px"><a href="https://dash.cloudflare.com/${ACCOUNT}/web-analytics">Open the full dashboard →</a></p>
</div>`;

writeFileSync("report.txt", txt);
writeFileSync("report.html", html);
console.log(txt);
