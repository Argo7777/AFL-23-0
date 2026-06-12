import { Mode, Pick } from "./types";
import { SimResult } from "./sim";
import { slotInstances } from "@/components/TeamField";

const W = 1080;
const H = 1350; // 4:5 portrait — native on Instagram, fine on X/Facebook

const FONT = "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

/**
 * Draw the result card — record, the oval with the user's team, branding —
 * onto an offscreen canvas and return it as a PNG blob for the share sheet.
 */
export async function buildShareCard(
  mode: Mode,
  roster: (Pick | null)[],
  sim: SimResult,
  teamRating: number,
  flagWon = false,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -100, 50, W / 2, -100, 900);
  glow.addColorStop(0, "#1e293b");
  glow.addColorStop(1, "#0b1120");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // header
  ctx.fillStyle = "#94a3b8";
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText("M Y   S E A S O N   ·   A F L   2 3 - 0", W / 2, 78);

  const perfect = sim.wins === 23;
  ctx.fillStyle = perfect ? "#a3e635" : sim.wins >= 18 ? "#fbbf24" : "#e2e8f0";
  ctx.font = `900 190px ${FONT}`;
  ctx.fillText(`${sim.wins}–${sim.losses}`, W / 2, 250);

  let y = 320;
  if (flagWon) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText("🏆 PREMIERS", W / 2, y);
    y += 56;
  }
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `500 34px Arial, sans-serif`;
  ctx.fillText(
    `Team rating ${teamRating.toFixed(1)}  ·  better than ${sim.realPercentile.toFixed(0)}% of real teams`,
    W / 2,
    y,
  );

  // ---- the oval ----
  const fieldTop = y + 40;
  const fieldH = H - fieldTop - 240;
  const fieldW = Math.min(W - 160, fieldH * 0.75);
  const fx = W / 2;
  const fy = fieldTop + fieldH / 2;
  const rx = fieldW / 2;
  const ry = fieldH / 2;

  // turf rings
  for (const [r, color] of [
    [1.0, "#166534"], [0.82, "#1a7038"], [0.62, "#166534"], [0.4, "#1a7038"], [0.2, "#166534"],
  ] as [number, string][]) {
    ctx.beginPath();
    ctx.ellipse(fx, fy, rx * r, ry * r, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(226,232,240,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(fx, fy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  // centre square + circle
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(226,232,240,0.6)";
  ctx.strokeRect(fx - rx * 0.3, fy - ry * 0.22, rx * 0.6, ry * 0.44);
  ctx.beginPath();
  ctx.arc(fx, fy, rx * 0.09, 0, Math.PI * 2);
  ctx.stroke();
  // goal squares
  ctx.strokeRect(fx - rx * 0.12, fy - ry + 2, rx * 0.24, ry * 0.1);
  ctx.strokeRect(fx - rx * 0.12, fy + ry - ry * 0.1 - 2, rx * 0.24, ry * 0.1);

  // ---- player chips ----
  const instances = slotInstances(mode);
  let field = instances.map((s, i) => ({ ...s, i })).filter((s) => s.slot !== "UTL");
  const bench = instances.map((s, i) => ({ ...s, i })).filter((s) => s.slot === "UTL");
  const big = mode === "classic5";
  if (big) {
    // larger chips need more vertical separation than the web layout
    const spread: Record<string, number> = { FWD: 15, MID: 39, RUC: 63, DEF: 87 };
    field = field.map((s) => ({ ...s, y: spread[s.slot] ?? s.y }));
  }
  const chipR = big ? 44 : 30;
  const nameFont = big ? 26 : 19;
  const scoreFont = big ? 34 : 24;

  const drawChip = (cx: number, cy: number, pick: Pick | null) => {
    ctx.beginPath();
    ctx.arc(cx, cy, chipR, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1120";
    ctx.fill();
    ctx.lineWidth = big ? 4 : 3;
    ctx.strokeStyle = pick ? "#a3e635" : "rgba(255,255,255,0.35)";
    ctx.stroke();
    if (pick) {
      ctx.fillStyle = "#a3e635";
      ctx.font = `900 ${scoreFont}px ${FONT}`;
      ctx.fillText(String(Math.round(pick.score)), cx, cy + scoreFont * 0.34);
      const surname = pick.player.n.split(" ").slice(-1)[0];
      ctx.font = `700 ${nameFont}px ${FONT}`;
      const tw = ctx.measureText(surname).width;
      ctx.fillStyle = "rgba(11,17,32,0.85)";
      ctx.fillRect(cx - tw / 2 - 8, cy + chipR + 6, tw + 16, nameFont + 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(surname, cx, cy + chipR + nameFont + 1);
    }
  };

  // field coords are percentages of a 100-wide x (field height) box
  for (const s of field) {
    const cx = fx - rx + (s.x / 100) * (rx * 2);
    const cy = fieldTop + (s.y / 100) * fieldH;
    drawChip(cx, cy, roster[s.i]);
  }

  // bench strip
  if (bench.length) {
    const benchY = fieldTop + fieldH + 76;
    ctx.fillStyle = "#64748b";
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText("I N T E R C H A N G E", W / 2, benchY - chipR - 22);
    const gap = Math.min(170, (W - 200) / bench.length);
    const start = W / 2 - ((bench.length - 1) * gap) / 2;
    bench.forEach((s, k) => drawChip(start + k * gap, benchY, roster[s.i]));
  }

  // footer
  ctx.fillStyle = "#a3e635";
  ctx.font = `900 44px ${FONT}`;
  ctx.fillText("Build yours at afl23-0.com", W / 2, H - 44);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
