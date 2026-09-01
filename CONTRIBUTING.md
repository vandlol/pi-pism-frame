# Contributing to pi-pism-frame

Thanks for hacking on the extension. This mirrors [pism](https://github.com/vandlol/pism)'s
release model, adapted for an npm package.

## TL;DR

```
feature/*  ──PR──▶  dev  ──PR──▶  main
  (work)         (integration)   (stable)
```

- Do your work on a **feature branch** off `dev`.
- Open a **PR into `dev`**. Merging it publishes a **patch pre-release** to npm
  under the `next` dist-tag.
- To ship stable, open a **PR from `dev` into `main`**. Merging it publishes a
  **minor** (default) or **major** release to npm under `latest`.
- You never push directly to `dev` or `main`, and you never PR a feature branch
  straight into `main` (a `guard` check rejects it).

## Branches

| Branch | Purpose | How it changes |
|--------|---------|----------------|
| `feature/*`, `fix/*`, … | your work | push freely |
| `dev` | integration / pre-release channel | **PRs from feature branches only** |
| `main` | stable releases (default branch) | **PRs from `dev` only** |

Both are protected: no direct pushes, PR required, CI (`build`) must be green.
A `guard` check rejects any PR into `main` whose source branch isn't `dev`.

## Workflow

1. Branch off `dev`:
   ```sh
   git switch dev && git pull
   git switch -c feature/my-thing
   ```
2. Keep it green locally:
   ```sh
   npm run check      # typecheck + test + build
   ```
3. Push and open a PR **into `dev`**. CI runs typecheck/test/build.
4. Merge (self-merge is fine; 0 approvals required). → a **patch pre-release** is
   published to npm as `pi-pism-frame@next`.
5. When `dev` is ready to ship, open a PR **from `dev` into `main`**, optionally
   add a release label (below), then merge. → a **stable release** is published
   as `pi-pism-frame@latest`.

## Versioning & releases

Releases are automated from the branch flow — you don't bump `package.json` or
tag by hand. Versions are computed from the highest git tag by
`scripts/next-version.sh`:

- Merge into `dev` → **patch** bump → published to npm `next`, GitHub **pre-release**.
- Merge `dev` → `main` → **minor** (default) bump → published to npm `latest`,
  GitHub **release**. Override the bump with a PR label:

  | Label | Bump |
  |-------|------|
  | `release:major` | major |
  | `release:minor` | minor (default) |
  | `release:patch` | patch |

Tags are plain SemVer (no `v` prefix). The committed `package.json` version stays
`0.0.0`; the release workflow sets the real version at publish time.

## npm publishing

The release workflows publish to npm only when an **`NPM_TOKEN`** repository
secret is present (Settings → Secrets and variables → Actions). Without it, the
git tag + GitHub release are still created and a warning notes that the npm
publish was skipped. The token is never taken from a contributor's machine — it
must be an Actions secret.

## Local testing in pi

Build and drop the bundle into pi's auto-discovery folder, then `/reload`:

```sh
npm run build
cp dist/index.js ~/.pi/agent/extensions/pism-frame.ts
```

Activate it live with `/pism-frame <name>` (see the [README](README.md)).
