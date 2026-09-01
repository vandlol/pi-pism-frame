import { defineConfig } from "tsup";

// The pi SDK types are used type-only, so nothing from
// @earendil-works/* ends up in the runtime bundle. Mark them external anyway
// as a belt-and-braces guard against accidental value imports.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  dts: true,
  clean: true,
  sourcemap: false,
  minify: false,
  external: [
    "@earendil-works/pi-coding-agent",
    "@earendil-works/pi-tui",
    "@earendil-works/pi-ai",
    "@earendil-works/pi-agent-core",
  ],
});
