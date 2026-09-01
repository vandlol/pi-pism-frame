/**
 * A curated palette of 32 modern pastel backgrounds, each paired with a
 * hue-tinted dark text color. Every pair is verified to meet WCAG AAA contrast
 * (>= 7:1), so bar text is always readable regardless of the pastel chosen.
 *
 * Colors are generated (pastel bg at HSL L86/S68, text at a darkened same-hue
 * tone) and frozen here; see scripts/gen-palette.mjs to regenerate.
 */
export type RGB = readonly [number, number, number];

export interface Pastel {
  name: string;
  bg: RGB;
  fg: RGB;
}

const RAW: { name: string; bg: string; fg: string }[] = [
  { name: "rose", bg: "#f4c3cf", fg: "#6f2034" },
  { name: "coral", bg: "#f4c9c3", fg: "#6b291f" },
  { name: "salmon", bg: "#f4cec3", fg: "#672f1e" },
  { name: "peach", bg: "#f4d6c3", fg: "#63391d" },
  { name: "apricot", bg: "#f4ddc3", fg: "#5f3f1c" },
  { name: "amber", bg: "#f4e3c3", fg: "#5b451a" },
  { name: "honey", bg: "#f4e8c3", fg: "#574919" },
  { name: "gold", bg: "#f4ebc3", fg: "#574d19" },
  { name: "lemon", bg: "#f4f0c3", fg: "#534f18" },
  { name: "citron", bg: "#eff4c3", fg: "#4d5318" },
  { name: "lime", bg: "#e2f4c3", fg: "#3d5318" },
  { name: "fern", bg: "#d3f4c3", fg: "#2e5719" },
  { name: "green", bg: "#c3f4c5", fg: "#19571b" },
  { name: "sage", bg: "#c3f4cf", fg: "#195729" },
  { name: "mint", bg: "#c3f4dd", fg: "#19573a" },
  { name: "emerald", bg: "#c3f4e5", fg: "#185341" },
  { name: "teal", bg: "#c3f4f0", fg: "#18534e" },
  { name: "aqua", bg: "#c3f0f4", fg: "#195257" },
  { name: "cyan", bg: "#c3eaf4", fg: "#1a4e5b" },
  { name: "sky", bg: "#c3e2f4", fg: "#1d4963" },
  { name: "azure", bg: "#c3dbf4", fg: "#1e4267" },
  { name: "cerulean", bg: "#c3d5f4", fg: "#203d6f" },
  { name: "blue", bg: "#c3d0f4", fg: "#223977" },
  { name: "denim", bg: "#c3c9f4", fg: "#25317e" },
  { name: "indigo", bg: "#c9c3f4", fg: "#342786" },
  { name: "violet", bg: "#d8c3f4", fg: "#49247b" },
  { name: "grape", bg: "#e2c3f4", fg: "#552173" },
  { name: "plum", bg: "#ebc3f4", fg: "#5e1f6b" },
  { name: "orchid", bg: "#f4c3f2", fg: "#671e64" },
  { name: "magenta", bg: "#f4c3e3", fg: "#6b1f51" },
  { name: "fuchsia", bg: "#f4c3db", fg: "#6b1f45" },
  { name: "blush", bg: "#f4c3c9", fg: "#6f202b" },
];

function toRGB(hex: string): RGB {
  const s = hex.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

export const PALETTE: Pastel[] = RAW.map((r) => ({
  name: r.name,
  bg: toRGB(r.bg),
  fg: toRGB(r.fg),
}));

export const PALETTE_NAMES: string[] = PALETTE.map((p) => p.name);

const BY_NAME = new Map(PALETTE.map((p) => [p.name, p]));

export function paletteByName(name: string): Pastel | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

/** Deterministically map a session name to a stable pastel (djb2 hash). */
export function paletteForName(sessionName: string): Pastel {
  let h = 5381;
  for (const ch of sessionName) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
