/**
 * Generate assets/demo.svg — a synthetic, privacy-safe preview of the frame.
 * Uses the real palette but only fake session names / generic placeholder text,
 * so no real conversation, path, or host ever appears.
 *
 *   npm run demo   # -> assets/demo.svg
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTE, paletteForName, type RGB } from "../src/palette";

const hex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Terminal-ish theme (dark) for the mock — not the user's real theme.
const TERM_BG = "#181825";
const TERM_STROKE = "#313244";
const DIM = "#9399b2";
const MUTED = "#6b7089";
const TITLE = "#cdd6f4";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const CH = 8.4; // approx monospace advance at 14px
const W = 860;
const PAD = 22;

// A fake session for the mock (no real data).
const demoName = "calm-otter";
const demoHost = "mac";
const demoPastel = paletteForName(demoName); // authentic auto-assignment

const parts: string[] = [];
const add = (s: string) => parts.push(s);

// ---- layout math -------------------------------------------------------------
const cols = 4;
const cellW = Math.floor((W - PAD * 2 - (cols - 1) * 12) / cols);
const rowH = 30;
const gridTop = 300;
const rows = Math.ceil(PALETTE.length / cols);
const H = gridTop + rows * (rowH + 8) + PAD;

// ---- SVG header --------------------------------------------------------------
add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${MONO}" font-size="14">`);
add(`<rect width="${W}" height="${H}" rx="12" fill="#11111b"/>`);

// ---- session mock panel ------------------------------------------------------
const panelX = PAD;
const panelY = PAD;
const panelW = W - PAD * 2;
const panelH = 230;
add(`<rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="10" fill="${TERM_BG}" stroke="${TERM_STROKE}"/>`);
// window dots
["#f38ba8", "#f9e2af", "#a6e3a1"].forEach((c, i) =>
  add(`<circle cx="${panelX + 22 + i * 18}" cy="${panelY + 20}" r="5" fill="${c}"/>`),
);
// title (tab)
add(`<text x="${panelX + panelW / 2}" y="${panelY + 24}" fill="${TITLE}" text-anchor="middle" opacity="0.8">pism: ${demoHost}:${demoName}</text>`);

const icon = "\u2b22"; // ⬢
const label = `${icon} ${demoName}  \u00b7  ${demoHost}`;

// A rounded pill (fully-rounded ends) with pastel fill + readable dark text.
const drawPill = (x: number, y: number) => {
  const h = 26;
  const w = Math.round((label.length + 3) * CH);
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${hex(demoPastel.bg)}"/>`);
  add(`<text x="${x + 16}" y="${y + 18}" fill="${hex(demoPastel.fg)}" font-weight="bold" xml:space="preserve">${esc(label)}</text>`);
};

// top pill (header) — the "neat top bar"
drawPill(panelX + 14, panelY + 40);

// generic placeholder transcript (no real content)
const lines = [
  ["\u203a", "you: plan the migration in small steps"],
  [" ", "pi: sure \u2014 here\u2019s a first pass\u2026"],
  [" ", "  1. inventory the current schema"],
  [" ", "  2. write a reversible migration"],
];
lines.forEach((ln, i) => {
  const y = panelY + 92 + i * 22;
  add(`<text x="${panelX + 18}" y="${y}" fill="${DIM}" xml:space="preserve">${esc(ln[0] + " " + ln[1])}</text>`);
});

// bottom pill (status bar)
drawPill(panelX + 14, panelY + panelH - 26 - 12);

// ---- palette showcase --------------------------------------------------------
add(`<text x="${PAD}" y="${gridTop - 16}" fill="${TITLE}">32 readable pastels \u2014 auto-assigned per session name</text>`);
PALETTE.forEach((p, i) => {
  const c = i % cols;
  const r = Math.floor(i / cols);
  const x = PAD + c * (cellW + 12);
  const y = gridTop + r * (rowH + 8);
  add(`<rect x="${x}" y="${y}" width="${cellW}" height="${rowH}" rx="5" fill="${hex(p.bg)}"/>`);
  add(`<text x="${x + 12}" y="${y + rowH / 2 + 5}" fill="${hex(p.fg)}" font-weight="bold">${icon} ${esc(p.name)}</text>`);
});

add(`</svg>`);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(outDir, { recursive: true });
const out = join(outDir, "demo.svg");
writeFileSync(out, parts.join("\n") + "\n");
console.log("wrote", out, `(${parts.length} nodes, ${W}x${H})`);
