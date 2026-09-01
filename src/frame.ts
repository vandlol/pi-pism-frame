import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import type { CapStyle, FrameConfig } from "./config";
import { paletteForName, type RGB } from "./palette";

const RESET = "\x1b[0m";

// [leftCap, rightCap] glyphs per style. Caps are drawn in the pill's color as
// foreground on the terminal background, so they read as the pill's rounded
// (or squared) ends.
const CAPS: Record<CapStyle, [string, string]> = {
  half: ["\u25d6", "\u25d7"], // ◖ ◗ rounded, broad font support (default)
  round: ["\ue0b6", "\ue0b4"], // Powerline rounded (needs a Nerd/Powerline font)
  block: ["\u2590", "\u258c"], // ▐ ▌ squared half-blocks
  none: ["", ""],
};

/** Visible width of a plain (un-styled) string, counting code points. */
export function plainWidth(s: string): number {
  return Array.from(s).length;
}

/** Map an 8-bit RGB triple to the nearest xterm-256 palette index. */
export function rgbTo256([r, g, b]: RGB): number {
  const toCube = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.round((v - 35) / 40));
  const ri = toCube(r);
  const gi = toCube(g);
  const bi = toCube(b);
  const cube = 16 + 36 * ri + 6 * gi + bi;
  const gray = Math.round((r + g + b) / 3);
  const grayIdx = gray < 8 ? 16 : gray > 238 ? 231 : 232 + Math.round((gray - 8) / 10);
  const cubeVal = [ri, gi, bi].map((i) => (i === 0 ? 0 : 55 + i * 40));
  const dCube = (cubeVal[0] - r) ** 2 + (cubeVal[1] - g) ** 2 + (cubeVal[2] - b) ** 2;
  const dGray = (gray - r) ** 2 + (gray - g) ** 2 + (gray - b) ** 2;
  return dGray < dCube ? grayIdx : cube;
}

export function fgSGR(rgb: RGB, truecolor: boolean): string {
  return truecolor ? `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `\x1b[38;5;${rgbTo256(rgb)}m`;
}

export function bgSGR(rgb: RGB, truecolor: boolean): string {
  return truecolor ? `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `\x1b[48;5;${rgbTo256(rgb)}m`;
}

/** Black/white text SGR for an arbitrary background RGB (relative luminance). */
export function textForRGB([r, g, b]: RGB, truecolor: boolean): string {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? fgSGR([0, 0, 0], truecolor) : fgSGR([255, 255, 255], truecolor);
}

/** Resolved SGR sequences for a pill: fill background, text, and cap color. */
interface PillColors {
  bg: string; // background SGR for the fill
  fg: string; // text SGR
  cap: string; // foreground SGR (pill color) for the end caps
}

function resolveColors(theme: Theme, cfg: FrameConfig): PillColors {
  const truecolor = theme.getColorMode() === "truecolor";
  const pastel =
    cfg.color.kind === "pastel"
      ? cfg.color.pastel
      : cfg.color.kind === "auto"
        ? paletteForName(cfg.name || "pism")
        : null;

  if (pastel) {
    return { bg: bgSGR(pastel.bg, truecolor), fg: fgSGR(pastel.fg, truecolor), cap: fgSGR(pastel.bg, truecolor) };
  }
  if (cfg.color.kind === "rgb") {
    const rgb: RGB = [cfg.color.r, cfg.color.g, cfg.color.b];
    return { bg: bgSGR(rgb, truecolor), fg: textForRGB(rgb, truecolor), cap: fgSGR(rgb, truecolor) };
  }
  // Named theme color: derive from its fg ansi.
  const name = cfg.color.kind === "theme" ? cfg.color.name : "accent";
  const fgAnsi = theme.getFgAnsi(name);
  const bg = fgAnsi.replace("[38;", "[48;");
  const m = bg.match(/48;2;(\d+);(\d+);(\d+)/);
  const fg = m ? textForRGB([Number(m[1]), Number(m[2]), Number(m[3])], truecolor) : fgSGR([255, 255, 255], truecolor);
  return { bg, fg, cap: fgAnsi };
}

/** The label inside a pill: "⬢ name  ·  host". */
export function pillLabel(cfg: FrameConfig): string {
  const base = `${cfg.icon} ${cfg.name}`;
  return cfg.host ? `${base}  \u00b7  ${cfg.host}` : base;
}

/**
 * Render an inset rounded pill: a colored fill carrying the label, with end
 * caps per the configured cap style. Pure given a theme + width; truncates the
 * label if it would exceed the width.
 */
export function pillLines(theme: Theme, cfg: FrameConfig, width: number): string[] {
  if (width <= 0) return [""];
  const { bg, fg, cap } = resolveColors(theme, cfg);
  const [cl, cr] = CAPS[cfg.cap];
  const indent = " "; // small left margin so the pill is inset

  // Budget: indent + capL + " label " + capR must fit the width.
  const capCols = (cl ? 1 : 0) + (cr ? 1 : 0);
  const avail = width - indent.length - capCols - 2; // 2 = padding spaces
  let label = pillLabel(cfg);
  if (avail > 0 && plainWidth(label) > avail) {
    label = Array.from(label).slice(0, Math.max(1, avail - 1)).join("") + "\u2026";
  }

  const capL = cl ? `${cap}${cl}${RESET}` : "";
  const capR = cr ? `${cap}${cr}${RESET}` : "";
  const fill = `${bg}${fg} ${label} ${RESET}`;
  return [`${indent}${capL}${fill}${capR}`];
}

/** Terminal window/tab title (plain text, no escapes). */
export function titleText(cfg: FrameConfig): string {
  const who = cfg.host && cfg.host !== "local" ? `${cfg.host}:${cfg.name}` : cfg.name;
  return `pism: ${who}`;
}

function pill(theme: Theme, cfg: FrameConfig): Component {
  return {
    render(width: number): string[] {
      return pillLines(theme, cfg, width);
    },
    invalidate(): void {},
  };
}

/** Top pill (via ctx.ui.setHeader). */
export function headerComponent(theme: Theme, cfg: FrameConfig): Component {
  return pill(theme, cfg);
}

/** Bottom pill (via ctx.ui.setWidget). */
export function barComponent(theme: Theme, cfg: FrameConfig): Component {
  return pill(theme, cfg);
}
