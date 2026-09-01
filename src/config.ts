import type { ThemeColor } from "@earendil-works/pi-coding-agent";

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

/** A resolved color: a named theme color, or a truecolor RGB triple. */
export type FrameColor =
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

export interface FrameConfig {
  /** Session name shown in the frame. Empty means the extension is dormant. */
  name: string;
  /** Optional host label (e.g. "mac", "local"); shown after the name. */
  host: string;
  style: FrameStyle;
  color: FrameColor;
  /** Glyph shown before the name. */
  icon: string;
}

export function parseStyle(raw: string | undefined): FrameStyle {
  const v = (raw ?? "").trim().toLowerCase();
  return (STYLES as string[]).includes(v) ? (v as FrameStyle) : "full";
}

/**
 * Parse a color spec: a theme color name (e.g. "accent", "warning") or a hex
 * value ("#c96442" / "c96442" / "#abc"). Falls back to the theme accent.
 */
export function parseColor(raw: string | undefined): FrameColor {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return { kind: "theme", name: "accent" };
  if ((THEME_COLOR_NAMES as string[]).includes(v)) {
    return { kind: "theme", name: v as ThemeColor };
  }
  const rgb = parseHex(v);
  if (rgb) return { kind: "rgb", ...rgb };
  return { kind: "theme", name: "accent" };
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
  return { name, host, style: name ? style : "off", color, icon };
}
