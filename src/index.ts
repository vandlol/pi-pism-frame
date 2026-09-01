import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import {
  configFromEnv,
  isCapWord,
  isColorToken,
  isStyleWord,
  parseCap,
  parseColor,
  parseStyle,
  type FrameConfig,
} from "./config";
import { barComponent, headerComponent, titleText } from "./frame";

const BAR_KEY = "pism-bar";
const COMMAND = "pism-frame";

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
      // A full-width widget below the editor — a real bar, not a footer pill.
      ui.setWidget(BAR_KEY, (_tui: TUI, theme: Theme) => barComponent(theme, cfg), {
        placement: "belowEditor",
      });
    } else {
      ui.setWidget(BAR_KEY, undefined);
    }
  };

  const clear = (ui: ExtensionContext["ui"]): void => {
    ui.setHeader(undefined);
    ui.setWidget(BAR_KEY, undefined);
  };

  // Apply on session start and whenever the session identity changes.
  pi.on("session_start", (_event, ctx) => apply(ctx));
  pi.on("session_info_changed", (_event, ctx) => apply(ctx));

  // Live control: `/pism-frame [style] [color]`
  pi.registerCommand(COMMAND, {
    description:
      "Set the pism frame: /pism-frame [name] [full|header|bar|title|off] [color|#hex] [half|round|block|none]",
    handler: async (args, ctx) => {
      const arg = (args ?? "").trim();
      if (arg) {
        cfg = applyArgs(cfg, arg);
      }
      apply(ctx);
      ctx.ui.notify(
        cfg.name
          ? `pism frame: ${cfg.name} · ${cfg.style}${cfg.style === "off" ? "" : ` (${describeColor(cfg)})`}`
          : "pism frame: set a name with  /pism-frame <name>",
        "info",
      );
    },
  });
}

/**
 * Parse `/pism-frame` args. Tokens are classified: an exact style word sets the
 * style, a theme-color name or #hex sets the color, and anything else is taken
 * as the session name (so `/pism-frame calm-otter bar warning` works). Setting
 * a name while dormant switches the style on.
 */
function applyArgs(cfg: FrameConfig, arg: string): FrameConfig {
  const tokens = arg.split(/\s+/).filter(Boolean);
  let { style, color, name, cap } = cfg;
  for (const tok of tokens) {
    if (isStyleWord(tok)) style = parseStyle(tok);
    else if (isCapWord(tok)) cap = parseCap(tok);
    else if (isColorToken(tok)) color = parseColor(tok);
    else name = tok;
  }
  if (name && style === "off") style = "full";
  return { ...cfg, style, color, name, cap };
}

function describeColor(cfg: FrameConfig): string {
  switch (cfg.color.kind) {
    case "auto":
      return "auto";
    case "pastel":
      return cfg.color.pastel.name;
    case "theme":
      return cfg.color.name;
    case "rgb":
      return `#${[cfg.color.r, cfg.color.g, cfg.color.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
  }
}
