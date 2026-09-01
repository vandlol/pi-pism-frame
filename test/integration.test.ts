import assert from "node:assert/strict";
import { test } from "node:test";
import pismFrame from "../src/index";

// Minimal fakes matching the shapes the extension actually touches.
function fakeTheme() {
  return {
    fg: (color: string, text: string) => `<${color}>${text}</>`,
    getColorMode: () => "truecolor" as const,
  };
}

function fakeUI() {
  const state: {
    title?: string;
    header?: ((tui: unknown, theme: unknown) => { render(w: number): string[] }) | undefined;
    status: Record<string, string | undefined>;
    notes: string[];
  } = { status: {}, notes: [] };
  const theme = fakeTheme();
  return {
    state,
    theme,
    setTitle: (t: string) => (state.title = t),
    setHeader: (f: typeof state.header) => (state.header = f),
    setStatus: (key: string, text: string | undefined) => (state.status[key] = text),
    notify: (msg: string) => state.notes.push(msg),
  };
}

function fakePi() {
  const handlers: Record<string, (e: unknown, ctx: unknown) => unknown> = {};
  const commands: Record<string, (args: string, ctx: unknown) => unknown> = {};
  return {
    handlers,
    commands,
    on: (event: string, h: (e: unknown, ctx: unknown) => unknown) => (handlers[event] = h),
    registerCommand: (name: string, opts: { handler: (a: string, c: unknown) => unknown }) =>
      (commands[name] = opts.handler),
  };
}

function withEnv(env: Record<string, string>, fn: () => void) {
  const keys = Object.keys(env);
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("full style wires title + header + status", () => {
  withEnv(
    { PISM_SESSION_NAME: "calm-otter", PISM_HOST: "mac", PISM_FRAME_STYLE: "full", PISM_FRAME_COLOR: "#c96442" },
    () => {
      const pi = fakePi();
      pismFrame(pi as never);
      const ui = fakeUI();
      pi.handlers["session_start"](null, { ui } as never);

      assert.equal(ui.state.title, "pism: mac:calm-otter");
      assert.ok(ui.state.header, "header factory should be set");
      assert.ok(ui.state.status["pism"], "status should be set");

      // Render the header component the extension handed to pi.
      const comp = ui.state.header!(null, ui.theme);
      const [line] = comp.render(50);
      assert.match(line, /calm-otter/);
      assert.match(line, /mac/);
      assert.match(line, /─/); // rule fills width
    },
  );
});

test("bar style: status only, no header", () => {
  withEnv({ PISM_SESSION_NAME: "zippy-rabbit", PISM_FRAME_STYLE: "bar" }, () => {
    const pi = fakePi();
    pismFrame(pi as never);
    const ui = fakeUI();
    pi.handlers["session_start"](null, { ui } as never);
    assert.equal(ui.state.header, undefined, "no header in bar style");
    assert.ok(ui.state.status["pism"], "status set in bar style");
    assert.equal(ui.state.title, "pism: zippy-rabbit");
  });
});

test("dormant without a name: clears everything", () => {
  withEnv({ PISM_FRAME_STYLE: "full" }, () => {
    const pi = fakePi();
    pismFrame(pi as never);
    const ui = fakeUI();
    pi.handlers["session_start"](null, { ui } as never);
    assert.equal(ui.state.header, undefined);
    assert.equal(ui.state.status["pism"], undefined);
    assert.equal(ui.state.title, undefined);
  });
});

test("/pism-frame command changes style live", async () => {
  await withEnvAsync(
    { PISM_SESSION_NAME: "calm-otter", PISM_FRAME_STYLE: "full" },
    async () => {
      const pi = fakePi();
      pismFrame(pi as never);
      const ui = fakeUI();
      // Switch to title-only via the command.
      await pi.commands["pism-frame"]("title", { ui } as never);
      assert.equal(ui.state.header, undefined, "title style drops the header");
      assert.equal(ui.state.status["pism"], undefined, "title style drops the status");
      assert.equal(ui.state.title, "pism: calm-otter");
      assert.ok(ui.state.notes.length > 0, "command should notify");
    },
  );
});

async function withEnvAsync(env: Record<string, string>, fn: () => Promise<void>) {
  const keys = Object.keys(env);
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    process.env[k] = env[k];
  }
  try {
    await fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}
