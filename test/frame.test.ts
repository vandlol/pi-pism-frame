import assert from "node:assert/strict";
import { test } from "node:test";
import { configFromEnv, parseCap, parseColor, parseHex, parseStyle } from "../src/config";
import { pillLines, plainWidth, rgbTo256, titleText } from "../src/frame";
import { PALETTE, paletteForName, type RGB } from "../src/palette";

const fakeTheme = (mode: "truecolor" | "256color" = "truecolor") => ({
  fg: (color: string, text: string) => `<${color}>${text}</>`,
  getColorMode: () => mode,
  getFgAnsi: (color: string) =>
    color === "accent" ? "\x1b[38;2;10;20;30m" : "\x1b[38;5;109m",
});

const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function contrast(a: RGB, b: RGB): number {
  const lum = ([r, g, b]: RGB) => {
    const c = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const hi = Math.max(lum(a), lum(b));
  const lo = Math.min(lum(a), lum(b));
  return (hi + 0.05) / (lo + 0.05);
}

test("palette has 32 entries, all AAA contrast", () => {
  assert.equal(PALETTE.length, 32);
  for (const p of PALETTE) assert.ok(contrast(p.bg, p.fg) >= 7, `${p.name} < 7`);
});

test("paletteForName is deterministic", () => {
  assert.equal(paletteForName("calm-otter").name, paletteForName("calm-otter").name);
});

test("parseStyle / parseCap defaults", () => {
  assert.equal(parseStyle("bar"), "bar");
  assert.equal(parseStyle("nope"), "full");
  assert.equal(parseCap("round"), "round");
  assert.equal(parseCap("nope"), "half"); // default
  assert.equal(parseCap(undefined), "half");
});

test("parseHex + parseColor priority", () => {
  assert.deepEqual(parseHex("#abc"), { r: 0xaa, g: 0xbb, b: 0xcc });
  assert.deepEqual(parseColor("rose"), { kind: "pastel", pastel: PALETTE.find((p) => p.name === "rose") });
  assert.deepEqual(parseColor("warning"), { kind: "theme", name: "warning" });
  assert.deepEqual(parseColor("#010203"), { kind: "rgb", r: 1, g: 2, b: 3 });
  assert.deepEqual(parseColor(""), { kind: "auto" });
});

test("configFromEnv reads cap; default auto color + half caps", () => {
  const cfg = configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_CAP: "round" });
  assert.equal(cfg.cap, "round");
  const d = configFromEnv({ PISM_SESSION_NAME: "x" });
  assert.equal(d.cap, "half");
  assert.deepEqual(d.color, { kind: "auto" });
});

test("rgbTo256 maps black/white", () => {
  assert.equal(rgbTo256([0, 0, 0]), 16);
  assert.equal(rgbTo256([255, 255, 255]), 231);
});

test("pillLines: pastel fill, baked fg, rounded half caps", () => {
  const t = fakeTheme("truecolor") as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "x", PISM_HOST: "mac", PISM_FRAME_COLOR: "rose" });
  const [line] = pillLines(t, cfg, 40);
  const rose = PALETTE.find((p) => p.name === "rose")!;
  assert.match(line, new RegExp(`48;2;${rose.bg[0]};${rose.bg[1]};${rose.bg[2]}m`)); // fill
  assert.match(line, new RegExp(`38;2;${rose.fg[0]};${rose.fg[1]};${rose.fg[2]}m`)); // text
  assert.ok(line.includes("\u25d6") && line.includes("\u25d7"), "has ◖ ◗ caps");
  assert.match(line, /x/);
});

test("pillLines: cap style none has no cap glyphs; block uses half-blocks", () => {
  const t = fakeTheme("truecolor") as never;
  const none = pillLines(t, configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_CAP: "none" }), 40)[0];
  assert.ok(!none.includes("\u25d6") && !none.includes("\u25d7") && !none.includes("\ue0b6"));
  const block = pillLines(t, configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_CAP: "block" }), 40)[0];
  assert.ok(block.includes("\u2590") && block.includes("\u258c"), "has ▐ ▌");
});

test("pillLines: 256-color emits 5-bit codes", () => {
  const t = fakeTheme("256color") as never;
  const [line] = pillLines(t, configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_COLOR: "sky" }), 20);
  assert.match(line, /48;5;\d+m/);
  assert.match(line, /38;5;\d+m/);
});

test("pillLines: arbitrary hex uses luminance text", () => {
  const t = fakeTheme("truecolor") as never;
  const [line] = pillLines(t, configFromEnv({ PISM_SESSION_NAME: "x", PISM_FRAME_COLOR: "#f0f0f0" }), 20);
  assert.match(line, /48;2;240;240;240m/);
  assert.match(line, /38;2;0;0;0m/);
});

test("pillLines: truncates an over-wide label with an ellipsis", () => {
  const t = fakeTheme("truecolor") as never;
  const cfg = configFromEnv({ PISM_SESSION_NAME: "a-really-very-long-session-name-here" });
  const [line] = pillLines(t, cfg, 16);
  assert.match(stripAnsi(line), /…/);
});

test("titleText prefixes host only when remote", () => {
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "mac" })), "pism: mac:api");
  assert.equal(titleText(configFromEnv({ PISM_SESSION_NAME: "api", PISM_HOST: "local" })), "pism: api");
});

test("plainWidth counts code points", () => {
  assert.equal(plainWidth("◆ x"), 3);
});
