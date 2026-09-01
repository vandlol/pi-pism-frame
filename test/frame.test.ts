import assert from "node:assert/strict";
import { test } from "node:test";
import { configFromEnv, parseColor, parseHex, parseStyle } from "../src/config";
import { applyColor, headerLines, plainWidth, titleText } from "../src/frame";

// A tiny stand-in for the pi Theme with the two methods the frame uses.
const fakeTheme = (mode: "truecolor" | "256color" = "truecolor") => ({
  fg: (color: string, text: string) => `<${color}>${text}</>`,
  getColorMode: () => mode,
});

test("parseStyle accepts known styles, defaults to full", () => {
  assert.equal(parseStyle("bar"), "bar");
  assert.equal(parseStyle("OFF"), "off");
  assert.equal(parseStyle("nonsense"), "full");
  assert.equal(parseStyle(undefined), "full");
});

test("parseHex handles #rrggbb, rrggbb and shorthand", () => {
  assert.deepEqual(parseHex("#c96442"), { r: 0xc9, g: 0x64, b: 0x42 });
  assert.deepEqual(parseHex("abcdef"), { r: 0xab, g: 0xcd, b: 0xef });
  assert.deepEqual(parseHex("#abc"), { r: 0xaa, g: 0xbb, b: 0xcc });
  assert.equal(parseHex("nope"), null);
});

test("parseColor: theme name vs hex vs fallback", () => {
  assert.deepEqual(parseColor("warning"), { kind: "theme", name: "warning" });
  assert.deepEqual(parseColor("#010203"), { kind: "rgb", r: 1, g: 2, b: 3 });
  assert.deepEqual(parseColor("bogus"), { kind: "theme", name: "accent" });
  assert.deepEqual(parseColor(undefined), { kind: "theme", name: "accent" });
});

test("configFromEnv stays dormant without a name", () => {
  const cfg = configFromEnv({});
  assert.equal(cfg.name, "");
  assert.equal(cfg.style, "off");
});

test("configFromEnv reads name/host/style/color/icon", () => {
  const cfg = configFromEnv({
    PISM_SESSION_NAME: "calm-otter",
    PISM_HOST: "mac",
    PISM_FRAME_STYLE: "header",
    PISM_FRAME_COLOR: "#c96442",
    PISM_FRAME_ICON: "◆",
  });
  assert.equal(cfg.name, "calm-otter");
  assert.equal(cfg.host, "mac");
  assert.equal(cfg.style, "header");
  assert.deepEqual(cfg.color, { kind: "rgb", r: 0xc9, g: 0x64, b: 0x42 });
  assert.equal(cfg.icon, "◆");
});

test("applyColor uses theme for named colors, truecolor for rgb", () => {
  const t = fakeTheme("truecolor") as never;
  assert.equal(applyColor(t, { kind: "theme", name: "accent" }, "x"), "<accent>x</>");
  assert.equal(
    applyColor(t, { kind: "rgb", r: 1, g: 2, b: 3 }, "x"),
    "\x1b[38;2;1;2;3mx\x1b[39m",
  );
  // 256color falls back to the theme accent for rgb.
  const t256 = fakeTheme("256color") as never;
  assert.equal(applyColor(t256, { kind: "rgb", r: 1, g: 2, b: 3 }, "x"), "<accent>x</>");
});

test("headerLines fills the width with a rule and never overflows", () => {
  const t = fakeTheme() as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "calm-otter", PISM_HOST: "mac" });
  const [line] = headerLines(t, cfg, 40);
  // The rule is built from the remaining plain width; verify the plain content
  // (icon+name+host) is present and a rule was appended.
  assert.match(line, /calm-otter/);
  assert.match(line, /mac/);
  assert.match(line, /─/);
  // Narrow widths must not throw or produce a rule.
  const narrow = headerLines(t, cfg, 3);
  assert.equal(narrow.length, 1);
  assert.doesNotMatch(narrow[0], /─/);
});

test("titleText prefixes host only when remote", () => {
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "mac" })), "pism: mac:api");
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "local" })), "pism: api");
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api" })), "pism: api");
});

test("plainWidth counts code points", () => {
  assert.equal(plainWidth("abc"), 3);
  assert.equal(plainWidth("◆ x"), 3);
});
