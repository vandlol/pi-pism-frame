import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import {
  configFromEnv,
  parseColor,
  parseStyle,
  type FrameConfig,
  type FrameStyle,
} from "./config";
import { headerComponent, statusText, titleText } from "./frame";

const STATUS_KEY = "pism";
const HEADER_KEY = "pism-frame";

/**
 * pi-pism-frame — frame a pi session with a colored, named header, a status
 * bar, and the terminal title. Configuration comes from the environment
 * (set by pism, or by hand):
 *
 *   PISM_SESSION_NAME   the session name to display (required to activate)
 *   PISM_HOST           optional host label shown after the name
 *   PISM_FRAME_STYLE    full | header | bar | title | off        (default full)
 *   PISM_FRAME_COLOR    a theme color name or #hex                (default accent)
 *   PISM_FRAME_ICON     glyph before the name                     (default ⬢)
 *
 * A live `/pism-frame [style] [color]` command lets you change it in-session.
 */
export default function pismFrame(pi: ExtensionAPI): void {
  let cfg = configFromEnv();

  const apply = (ctx: ExtensionContext): void => {
    const ui = ctx.ui;
    if (!cfg.name || cfg.style === "off") {
      clear(ui);
      return;
    }
    const showHeader = cfg.style === "full" || cfg.style === "header";
    const showBar = cfg.style === "full" || cfg.style === "bar";

    // Terminal title is shown for every active style.
    ui.setTitle(titleText(cfg));

    if (showHeader) {
      ui.setHeader((_tui: TUI, theme: Theme) => headerComponent(theme, cfg));
    } else {
      ui.setHeader(undefined);
    }

    if (showBar) {
      // setStatus wants a plain string; we style it with the active theme.
      ui.setStatus(STATUS_KEY, statusText(ui.theme, cfg));
    } else {
      ui.setStatus(STATUS_KEY, undefined);
    }
  };

  const clear = (ui: ExtensionContext["ui"]): void => {
    ui.setHeader(undefined);
    ui.setStatus(STATUS_KEY, undefined);
  };

  // Apply on session start and whenever the session identity changes.
  pi.on("session_start", (_event, ctx) => apply(ctx));
  pi.on("session_info_changed", (_event, ctx) => apply(ctx));

  // Live control: `/pism-frame [style] [color]`
  pi.registerCommand(HEADER_KEY, {
    description: "Set the pism session frame: /pism-frame [full|header|bar|title|off] [color|#hex]",
    handler: async (args, ctx) => {
      const arg = (args ?? "").trim();
      if (arg) {
        cfg = applyArgs(cfg, arg);
      }
      apply(ctx);
      ctx.ui.notify(
        cfg.name
          ? `pism frame: ${cfg.style}${cfg.style === "off" ? "" : ` (${describeColor(cfg)})`}`
          : "pism frame: no session name set (PISM_SESSION_NAME)",
        "info",
      );
    },
  });
}

/** Parse `/pism-frame` args: an optional style word and/or a color token. */
function applyArgs(cfg: FrameConfig, arg: string): FrameConfig {
  const tokens = arg.split(/\s+/).filter(Boolean);
  let style: FrameStyle = cfg.style;
  let color = cfg.color;
  for (const tok of tokens) {
    const s = parseStyle(tok);
    // parseStyle defaults unknown tokens to "full"; only accept exact matches.
    if (["full", "header", "bar", "title", "off"].includes(tok.toLowerCase())) {
      style = s;
    } else {
      color = parseColor(tok);
    }
  }
  return { ...cfg, style, color };
}

function describeColor(cfg: FrameConfig): string {
  return cfg.color.kind === "theme"
    ? cfg.color.name
    : `#${[cfg.color.r, cfg.color.g, cfg.color.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
