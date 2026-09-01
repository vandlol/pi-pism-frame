import type { ThemeColor } from "@earendil-works/pi-coding-agent";
import { paletteByName, type Pastel } from "./palette";

/**
 * Which pieces of chrome to show. The user chooses the style — no piece is
 * forced (there is deliberately no full-viewport rectangle; pi owns the
 * screen, so we decorate the header/footer/title instead).
 *
 *  - "full":   header line + status bar + terminal title
 *  - "header": header line + terminal title
 *  - "bar":    status bar + terminal title
 *  - "title":  terminal title only
 *  - "off":    nothing (extension stays dormant)
 */
export type FrameStyle = "full" | "header" | "bar" | "title" | "off";

const STYLES: FrameStyle[] = ["full", "header", "bar", "title", "off"];

/**
 * A resolved color:
 *  - "auto":   derive a stable pastel from the session name (default)
 *  - "pastel": one of the 32 curated pastels (readable text baked in)
 *  - "theme":  a named pi theme color
 *  - "rgb":    an arbitrary hex color
 */
export type FrameColor =
  | { kind: "auto" }
  | { kind: "pastel"; pastel: Pastel }
  | { kind: "theme"; name: ThemeColor }
  | { kind: "rgb"; r: number; g: number; b: number };

/** Theme color names a user may pick by name. */
const THEME_COLOR_NAMES: ThemeColor[] = [
  "accent",
  "success",
  "error",
  "warning",
  "muted",
  "dim",
  "text",
  "border",
  "borderAccent",
  "borderMuted",
];

/**
 * End-cap style for the status bar pill:
 *  - "half":  ◖ ◗  rounded, widely supported (default)
 *  - "round": Powerline rounded caps (needs a Nerd/Powerline font)
 *  - "block": ▌ ▐  squared half-blocks
 *  - "none":  flat, no caps
 */
export type CapStyle = "half" | "round" | "block" | "none";

const CAP_STYLES: CapStyle[] = ["half", "round", "block", "none"];

export function parseCap(raw: string | undefined): CapStyle {
  const v = (raw ?? "").trim().toLowerCase();
  return (CAP_STYLES as string[]).includes(v) ? (v as CapStyle) : "half";
}

/** True when raw is an exact cap-style word (half/round/block/none). */
export function isCapWord(raw: string): boolean {
  return (CAP_STYLES as string[]).includes(raw.trim().toLowerCase());
}

export interface FrameConfig {
  /** Session name shown in the frame. Empty means the extension is dormant. */
  name: string;
  /** Optional host label (e.g. "mac", "local"); shown after the name. */
  host: string;
  style: FrameStyle;
  color: FrameColor;
  /** Glyph shown before the name. */
  icon: string;
  /** Status-bar pill end-cap style. */
  cap: CapStyle;
}

export function parseStyle(raw: string | undefined): FrameStyle {
  const v = (raw ?? "").trim().toLowerCase();
  return (STYLES as string[]).includes(v) ? (v as FrameStyle) : "full";
}

/** True when raw is an exact style word (unlike parseStyle, no "full" default). */
export function isStyleWord(raw: string): boolean {
  return (STYLES as string[]).includes(raw.trim().toLowerCase());
}

/** True when raw is a recognized color: a pastel name, theme color, or hex. */
export function isColorToken(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return (
    paletteByName(v) !== undefined ||
    (THEME_COLOR_NAMES as string[]).includes(v) ||
    parseHex(v) !== null
  );
}

/**
 * Parse a color spec, in priority order: a curated pastel name (e.g. "rose",
 * "sky"), a pi theme color name (e.g. "accent"), or a hex value. An empty or
 * unrecognized spec means "auto" — derive a stable pastel from the name.
 */
export function parseColor(raw: string | undefined): FrameColor {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return { kind: "auto" };
  const pastel = paletteByName(v);
  if (pastel) return { kind: "pastel", pastel };
  if ((THEME_COLOR_NAMES as string[]).includes(v)) {
    return { kind: "theme", name: v as ThemeColor };
  }
  const rgb = parseHex(v);
  if (rgb) return { kind: "rgb", ...rgb };
  return { kind: "auto" };
}

export function parseHex(raw: string): { r: number; g: number; b: number } | null {
  let h = raw.trim().toLowerCase();
  if (h.startsWith("#")) h = h.slice(1);
  if (/^[0-9a-f]{3}$/.test(h)) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Build the frame config from environment. pism sets these when it launches
 * pi; a user running pi directly can set them too. Returns a dormant config
 * (empty name / style "off") when nothing is configured.
 */
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): FrameConfig {
  const name = (env.PISM_SESSION_NAME ?? "").trim();
  const host = (env.PISM_HOST ?? "").trim();
  const style = parseStyle(env.PISM_FRAME_STYLE);
  const color = parseColor(env.PISM_FRAME_COLOR);
  const icon = (env.PISM_FRAME_ICON ?? "⬢").trim() || "⬢";
  const cap = parseCap(env.PISM_FRAME_CAP);
  return { name, host, style: name ? style : "off", color, icon, cap };
}
