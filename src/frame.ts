import type { Theme } from "@earendil-works/pi-coding-agent";
import type { Component } from "@earendil-works/pi-tui";
import type { FrameColor, FrameConfig } from "./config";

/** Visible width of a plain (un-styled) string, counting code points. */
export function plainWidth(s: string): number {
  return Array.from(s).length;
}

/**
 * Apply the chosen color to text. Named theme colors go through the theme so
 * they respect the active palette; an RGB color emits a truecolor escape when
 * the terminal supports it, otherwise falls back to the theme accent.
 */
export function applyColor(theme: Theme, color: FrameColor, text: string): string {
  if (color.kind === "theme") return theme.fg(color.name, text);
  if (theme.getColorMode() === "truecolor") {
    return `\x1b[38;2;${color.r};${color.g};${color.b}m${text}\x1b[39m`;
  }
  return theme.fg("accent", text);
}

/** The plain (un-styled) left segment: "⬢ name  ·  host". */
export function leftPlain(cfg: FrameConfig): string {
  const base = `${cfg.icon} ${cfg.name}`;
  return cfg.host ? `${base}  ·  ${cfg.host}` : base;
}

/**
 * Render the header line(s): a colored "icon name · host" followed by a muted
 * rule filling the width. Pure given a theme + width, so it's unit-testable.
 */
export function headerLines(theme: Theme, cfg: FrameConfig, width: number): string[] {
  if (width <= 0) return [""];
  const nameSeg = applyColor(theme, cfg.color, `${cfg.icon} ${cfg.name}`);
  const hostSeg = cfg.host ? theme.fg("muted", `  ·  ${cfg.host}`) : "";
  const used = plainWidth(leftPlain(cfg));
  const ruleLen = width - used - 1;
  const rule = ruleLen > 0 ? " " + theme.fg("borderMuted", "─".repeat(ruleLen)) : "";
  return [nameSeg + hostSeg + rule];
}

/** Status-bar text (colored icon + name + host) for ctx.ui.setStatus. */
export function statusText(theme: Theme, cfg: FrameConfig): string {
  const nameSeg = applyColor(theme, cfg.color, `${cfg.icon} ${cfg.name}`);
  return cfg.host ? `${nameSeg}${theme.fg("muted", " · " + cfg.host)}` : nameSeg;
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
    // We render fresh from the (immutable) config each frame, so there's no
    // cached state to drop.
    invalidate(): void {},
  };
}
