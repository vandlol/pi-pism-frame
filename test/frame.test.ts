import assert from "node:assert/strict";
import { test } from "node:test";
import { configFromEnv, parseColor, parseHex, parseStyle } from "../src/config";
import { barLines, headerLines, plainWidth, rgbTo256, titleText } from "../src/frame";
import { PALETTE, paletteForName, type RGB } from "../src/palette";

// A stand-in for the pi Theme with the methods the frame uses.
const fakeTheme = (mode: "truecolor" | "256color" = "truecolor") => ({
  fg: (color: string, text: string) => `<${color}>${text}</>`,
  getColorMode: () => mode,
  getFgAnsi: (color: string) =>
    color === "accent" ? "\x1b[38;2;10;20;30m" : "\x1b[38;5;109m",
});

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function contrast(a: RGB, b: RGB): number {
  const lum = ([r, g, b]: RGB) => {
    const c = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const L1 = lum(a);
  const L2 = lum(b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

test("palette has 32 entries, all AAA contrast", () => {
  assert.equal(PALETTE.length, 32);
  for (const p of PALETTE) {
    const c = contrast(p.bg, p.fg);
    assert.ok(c >= 7, `${p.name} contrast ${c.toFixed(2)} < 7`);
  }
});

test("paletteForName is deterministic and in-range", () => {
  const a = paletteForName("calm-otter");
  const b = paletteForName("calm-otter");
  assert.equal(a.name, b.name);
  assert.ok(PALETTE.includes(a));
});

test("parseStyle accepts known styles, defaults to full", () => {
  assert.equal(parseStyle("bar"), "bar");
  assert.equal(parseStyle("OFF"), "off");
  assert.equal(parseStyle("nonsense"), "full");
});

test("parseHex handles #rrggbb, rrggbb and shorthand", () => {
  assert.deepEqual(parseHex("#c96442"), { r: 0xc9, g: 0x64, b: 0x42 });
  assert.deepEqual(parseHex("#abc"), { r: 0xaa, g: 0xbb, b: 0xcc });
  assert.equal(parseHex("nope"), null);
});

test("parseColor: pastel name > theme name > hex > auto", () => {
  assert.deepEqual(parseColor("rose"), { kind: "pastel", pastel: PALETTE.find((p) => p.name === "rose") });
  assert.deepEqual(parseColor("warning"), { kind: "theme", name: "warning" });
  assert.deepEqual(parseColor("#010203"), { kind: "rgb", r: 1, g: 2, b: 3 });
  assert.deepEqual(parseColor(""), { kind: "auto" });
  assert.deepEqual(parseColor("totally-unknown"), { kind: "auto" });
});

test("configFromEnv default color is auto (per-name pastel)", () => {
  const cfg = configFromEnv({ PISM_SESSION_NAME: "calm-otter" });
  assert.deepEqual(cfg.color, { kind: "auto" });
});

test("rgbTo256 maps primaries sensibly", () => {
  assert.equal(rgbTo256([0, 0, 0]), 16);
  assert.equal(rgbTo256([255, 255, 255]), 231);
  assert.ok(rgbTo256([255, 0, 0]) >= 16);
});

test("barLines: pastel fills full width with baked-in fg", () => {
  const t = fakeTheme("truecolor") as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "x", PISM_HOST: "mac", PISM_FRAME_COLOR: "rose" });
  const [line] = barLines(t, cfg, 40);
  const rose = PALETTE.find((p) => p.name === "rose")!;
  assert.match(line, new RegExp(`48;2;${rose.bg[0]};${rose.bg[1]};${rose.bg[2]}m`));
  assert.match(line, new RegExp(`38;2;${rose.fg[0]};${rose.fg[1]};${rose.fg[2]}m`));
  assert.match(line, /\x1b\[0m$/);
  assert.equal(plainWidth(stripAnsi(line)), 40);
});

test("barLines: 256-color mode emits 5-bit codes", () => {
  const t = fakeTheme("256color") as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_COLOR: "sky" });
  const [line] = barLines(t, cfg, 20);
  assert.match(line, /48;5;\d+m/);
  assert.match(line, /38;5;\d+m/);
});

test("barLines: arbitrary hex uses luminance text", () => {
  const t = fakeTheme("truecolor") as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_COLOR: "#f0f0f0" });
  const [line] = barLines(t, cfg, 20);
  assert.match(line, /48;2;240;240;240m/);
  assert.match(line, /38;2;0;0;0m/); // light bg -> black text
});

test("headerLines fills the width with a rule and never overflows", () => {
  const t = fakeTheme() as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "calm-otter", PISM_HOST: "mac" });
  const [line] = headerLines(t, cfg, 40);
  assert.match(line, /calm-otter/);
  assert.match(line, /─/);
  const narrow = headerLines(t, cfg, 3);
  assert.doesNotMatch(narrow[0], /─/);
});

test("titleText prefixes host only when remote", () => {
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "mac" })), "pism: mac:api");
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "local" })), "pism: api");
});

test("plainWidth counts code points", () => {
  assert.equal(plainWidth("◆ x"), 3);
});
