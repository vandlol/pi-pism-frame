import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import type { FrameConfig } from "./config";
import { paletteForName, type Pastel, type RGB } from "./palette";

const RESET = "\x1b[0m";

/** Visible width of a plain (un-styled) string, counting code points. */
export function plainWidth(s: string): number {
  return Array.from(s).length;
}

/** Map an 8-bit RGB channel triple to the nearest xterm-256 palette index. */
export function rgbTo256([r, g, b]: RGB): number {
  const toCube = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.round((v - 35) / 40));
  const ri = toCube(r);
  const gi = toCube(g);
  const bi = toCube(b);
  const cube = 16 + 36 * ri + 6 * gi + bi;
  // Consider the grayscale ramp too, pick whichever is closer.
  const gray = Math.round((r + g + b) / 3);
  const grayIdx = gray < 8 ? 16 : gray > 238 ? 231 : 232 + Math.round((gray - 8) / 10);
  const cubeVal = [ri, gi, bi].map((i) => (i === 0 ? 0 : 55 + i * 40));
  const dCube = (cubeVal[0] - r) ** 2 + (cubeVal[1] - g) ** 2 + (cubeVal[2] - b) ** 2;
  const dGray = 3 * ((gray - r) ** 2 + (gray - g) ** 2 + (gray - b) ** 2) / 3;
  return dGray < dCube ? grayIdx : cube;
}

/** Foreground SGR for an RGB color (truecolor or nearest 256). */
export function fgSGR(rgb: RGB, truecolor: boolean): string {
  return truecolor ? `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `\x1b[38;5;${rgbTo256(rgb)}m`;
}

/** Background SGR for an RGB color (truecolor or nearest 256). */
export function bgSGR(rgb: RGB, truecolor: boolean): string {
  return truecolor ? `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m` : `\x1b[48;5;${rgbTo256(rgb)}m`;
}

/** Black/white text SGR for an arbitrary background RGB (relative luminance). */
export function textForRGB([r, g, b]: RGB, truecolor: boolean): string {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? fgSGR([0, 0, 0], truecolor) : fgSGR([255, 255, 255], truecolor);
}

/** The pastel backing a config, or null for theme/rgb colors. */
export function resolvePastel(cfg: FrameConfig): Pastel | null {
  if (cfg.color.kind === "pastel") return cfg.color.pastel;
  if (cfg.color.kind === "auto") return paletteForName(cfg.name || "pism");
  return null;
}

/** Style the header name segment according to the chosen color. */
function styleName(theme: Theme, cfg: FrameConfig, text: string): string {
  const truecolor = theme.getColorMode() === "truecolor";
  switch (cfg.color.kind) {
    case "pastel":
      return `${fgSGR(cfg.color.pastel.bg, truecolor)}${text}${RESET}`;
    case "auto":
      return `${fgSGR(paletteForName(cfg.name || "pism").bg, truecolor)}${text}${RESET}`;
    case "rgb":
      return truecolor
        ? `${fgSGR([cfg.color.r, cfg.color.g, cfg.color.b], true)}${text}${RESET}`
        : theme.fg("accent", text);
    case "theme":
      return theme.fg(cfg.color.name, text);
  }
}

/** The plain (un-styled) left segment: "⬢ name  ·  host". */
export function leftPlain(cfg: FrameConfig): string {
  const base = `${cfg.icon} ${cfg.name}`;
  return cfg.host ? `${base}  ·  ${cfg.host}` : base;
}

/**
 * Header line: a colored "icon name · host" followed by a muted rule filling
 * the width. Pure given a theme + width.
 */
export function headerLines(theme: Theme, cfg: FrameConfig, width: number): string[] {
  if (width <= 0) return [""];
  const nameSeg = styleName(theme, cfg, `${cfg.icon} ${cfg.name}`);
  const hostSeg = cfg.host ? theme.fg("muted", `  ·  ${cfg.host}`) : "";
  const used = plainWidth(leftPlain(cfg));
  const ruleLen = width - used - 1;
  const rule = ruleLen > 0 ? " " + theme.fg("borderMuted", "─".repeat(ruleLen)) : "";
  return [nameSeg + hostSeg + rule];
}

/**
 * Status bar: a full-width colored strip carrying the icon, name and host,
 * padded across the whole width so it reads as a bar. Pastel/auto colors use
 * their baked-in AAA-contrast text; theme/hex colors compute a black/white
 * text from luminance.
 */
export function barLines(theme: Theme, cfg: FrameConfig, width: number): string[] {
  if (width <= 0) return [""];
  const truecolor = theme.getColorMode() === "truecolor";

  let bg: string;
  let fg: string;
  const pastel =
    cfg.color.kind === "pastel"
      ? cfg.color.pastel
      : cfg.color.kind === "auto"
        ? paletteForName(cfg.name || "pism")
        : null;
  if (pastel) {
    bg = bgSGR(pastel.bg, truecolor);
    fg = fgSGR(pastel.fg, truecolor);
  } else if (cfg.color.kind === "rgb") {
    const rgb: RGB = [cfg.color.r, cfg.color.g, cfg.color.b];
    bg = bgSGR(rgb, truecolor);
    fg = textForRGB(rgb, truecolor);
  } else {
    // Named theme color: flip its fg ansi to a background, pick contrasting text.
    const name = cfg.color.kind === "theme" ? cfg.color.name : "accent";
    bg = theme.getFgAnsi(name).replace("[38;", "[48;");
    const m = bg.match(/48;2;(\d+);(\d+);(\d+)/);
    fg = m
      ? textForRGB([Number(m[1]), Number(m[2]), Number(m[3])], truecolor)
      : fgSGR([255, 255, 255], truecolor);
  }

  const inner = ` ${cfg.icon} ${cfg.name}${cfg.host ? `  ·  ${cfg.host}` : ""} `;
  const pad = Math.max(0, width - plainWidth(inner));
  return [`${bg}${fg}${inner}${" ".repeat(pad)}${RESET}`];
}

/** Terminal window/tab title (plain text, no escapes). */
export function titleText(cfg: FrameConfig): string {
  const who = cfg.host && cfg.host !== "local" ? `${cfg.host}:${cfg.name}` : cfg.name;
  return `pism: ${who}`;
}

/** A minimal Component wrapping headerLines — the official render(width) contract. */
export function headerComponent(theme: Theme, cfg: FrameConfig): Component {
  return {
    render(width: number): string[] {
      return headerLines(theme, cfg, width);
    },
    invalidate(): void {},
  };
}

/** A full-width bar Component for ctx.ui.setWidget. */
export function barComponent(theme: Theme, cfg: FrameConfig): Component {
  return {
    render(width: number): string[] {
      return barLines(theme, cfg, width);
    },
    invalidate(): void {},
  };
}
