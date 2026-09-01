# Contributing to pi-pism-frame

Thanks for hacking on the extension. This mirrors [pism](https://github.com/vandlol/pism)'s
release model, adapted for an npm package.

## TL;DR

```
feature/*  ──PR──▶  dev  ──PR──▶  main
  (work)         (integration)   (stable)
```

- Do your work on a **feature branch** off `dev`.
- Open a **PR into `dev`**. Merging it cuts a **patch pre-release** (git tag +
  GitHub pre-release). Pre-releases are **not** on npm — install them from git.
- To ship stable, open a **PR from `dev` into `main`**. Merging it publishes a
  **minor** (default) or **major** release to **npm** under `latest`.
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

- Merge into `dev` → **patch** bump → git tag + GitHub **pre-release** (no npm).
  Install a pre-release straight from git:
  `pi install git:github.com/vandlol/pi-pism-frame@<tag>`.
- Merge `dev` → `main` → **minor** (default) bump → published to npm `latest` +
  GitHub **release**. Override the bump with a PR label:

  | Label | Bump |
  |-------|------|
  | `release:major` | major |
  | `release:minor` | minor (default) |
  | `release:patch` | patch |

Tags are plain SemVer (no `v` prefix). The committed `package.json` version stays
`0.0.0`; the release workflow sets the real version at publish time.

## npm publishing (Trusted Publishing / OIDC)

Stable releases publish to npm using **Trusted Publishing** — no long-lived
token. `release.yml` requests an OIDC token (`id-token: write`) and npm accepts
the publish from this authorized workflow. Publishing from this public repo also
**auto-generates provenance**.

One-time setup (owner only):

1. Create a free npm account and ensure the package name `pi-pism-frame` is
   yours (a first `npm publish` may be needed to claim a brand-new name).
2. On npmjs.com → Packages → `pi-pism-frame` → Settings → **Trusted publishing**,
   add a GitHub Actions publisher: repo `vandlol/pi-pism-frame`, workflow file
   **`release.yml`**, action `npm publish`. (A package can have only **one**
   trusted publisher — that's why only stable releases go to npm.)
3. In the repo → Settings → Secrets and variables → Actions → **Variables**, set
   **`NPM_PUBLISH=true`** to enable the publish step.

Until `NPM_PUBLISH` is `true`, stable releases still tag + create a GitHub
release and simply skip the npm step (with a warning).

## Local testing in pi

Build and drop the bundle into pi's auto-discovery folder, then `/reload`:

```sh
npm run build
cp dist/index.js ~/.pi/agent/extensions/pism-frame.ts
```

Activate it live with `/pism-frame <name>` (see the [README](README.md)).
