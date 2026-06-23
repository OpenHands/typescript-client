# Release Automation Workflows

This document describes the automated release process for the OpenHands Agent
Server TypeScript Client. It mirrors the
[software-agent-sdk](https://github.com/OpenHands/software-agent-sdk) release
flow, adapted for an npm package.

## Overview

The release process is driven by merging a release PR — humans never push tags
or create releases by hand:

1. **prepare-release.yml** — manually triggered; opens a `rel-X.Y.Z` PR that
   bumps the package version.
2. **create-release.yml** — on merge of that PR, creates the GitHub release and
   triggers the publish workflows.
3. **npm-publish.yml** — publishes to **npmjs.org** (OIDC trusted publishing,
   with provenance), then dispatches the version bump workflow.
4. **release.yml** — publishes to **GitHub Packages**.
5. **version-bump-prs.yml** — opens a PR in downstream consumers that pin an
   exact version (currently `agent-canvas`).

```
prepare-release.yml ──▶ rel-X.Y.Z PR ──(merge)──▶ create-release.yml ──┬─▶ npm-publish.yml ──▶ version-bump-prs.yml
   (manual dispatch)        (review/CI)            (GitHub Release)      └─▶ release.yml (GitHub Packages)
```

## Prerequisites (one-time)

- **`OPENHANDS_BOT_GITHUB_PAT_PUBLIC`** secret — a classic PAT (with `repo` and
  `workflow` scope) used by:
  - `prepare-release.yml`, so the release PR triggers CI + integration tests
    (PRs opened by `GITHUB_TOKEN` do not start other workflow runs), and
  - `version-bump-prs.yml`, to push a branch and open a PR in `agent-canvas`.
- **npm trusted publishing** — `@openhands/typescript-client` on npmjs.org must
  list `OpenHands/typescript-client` as a trusted publisher (already configured
  for the existing `npm-publish.yml`).
- `GITHUB_TOKEN` (automatic) covers GitHub Packages publishing and dispatching
  the publish workflows.

## How to Create a New Release

### Step 1: Trigger Prepare Release

1. Go to the **Actions** tab → **Prepare Release** → **Run workflow**.
2. Enter the version (e.g., `1.25.0`) — must be `X.Y.Z`.
3. Run it.

The workflow creates `rel-X.Y.Z`, sets the version with
`npm version X.Y.Z --no-git-tag-version` (updates `package.json` and
`package-lock.json`), commits, pushes, and opens a PR with a checklist.

### Step 2: Review the PR

CI (`ci.yml`) and integration tests (`integration-tests.yml`) run automatically
on the PR. Complete the checklist, then review and merge.

### Step 3: Everything else is automatic

On merge, `create-release.yml`:
- Creates GitHub release `vX.Y.Z` with auto-generated notes plus a preamble
  listing any merged `release-note-required` PRs since the previous release.
- Dispatches `npm-publish.yml` and `release.yml` against the new tag (releases
  created by `GITHUB_TOKEN` do not auto-trigger workflows, so they are
  dispatched explicitly).

`npm-publish.yml` publishes to npmjs.org and then dispatches
`version-bump-prs.yml`, which waits for the version to be resolvable on npm and
opens a bump PR in `agent-canvas`.

### Step 4: Post-Release

- Review and merge the `agent-canvas` bump PR.
- Announce the release.

## Downstream consumers

Only consumers that pin an **exact** version are bumped automatically:

| Repo | How it references the client | Auto-bumped? |
|---|---|---|
| `agent-canvas` | exact pin (`"1.25.0"`) | ✅ yes |
| `data-transfer` | floating (`"*"`) | no — always latest |
| `openhands-code-coverage` | `git+https://…` | no — tracks git HEAD |
| `vulnerability-fixer` | `git+https://…` | no — tracks git HEAD |
| `CodeClaw` | tsconfig path alias only | no — not an npm dep |

To add another exact-pinned consumer later, extend `version-bump-prs.yml`.

## Manual / Recovery

- **Re-publish to npm**: Actions → **Publish to npm** → run with the `version`
  input.
- **Re-publish to GitHub Packages**: Actions → **Release** → run with the
  `version` input, or `.github/workflows/publish-github-packages.yml`.
- **Re-run version bumps**: Actions → **Create Version Bump PRs** → run with the
  `version` input.

## Troubleshooting

- **Version format error** — use `X.Y.Z`, not `vX.Y.Z`.
- **PR not triggering CI** — confirm `OPENHANDS_BOT_GITHUB_PAT_PUBLIC` is set and
  not expired.
- **npm publish failed** — confirm trusted publishing is configured and the
  version does not already exist on npm.
- **Bump PR not opening** — `version-bump-prs.yml` waits up to ~20 min for the
  version to appear on npm; check the npm publish succeeded first.

## Tracking the upstream agent-server / SDK version

Separate from cutting a release, the pinned `software-agent-sdk` / agent-server
image (`config.agentServerImage` in `package.json`, plus the
`integration-tests.yml`, `AGENTS.md`, and `README.md` mirrors) is kept current
by the **SDK's own release automation**: when `software-agent-sdk` publishes a
new release, it opens a `bump-agent-server-X.Y.Z` PR here (once the matching
agent-server image is published to GHCR). That PR's CI + integration tests
validate the client against the new server. This is independent of the npm
package version and publishes nothing.

## Workflow Files

- `.github/workflows/prepare-release.yml`
- `.github/workflows/create-release.yml`
- `.github/workflows/npm-publish.yml`
- `.github/workflows/release.yml`
- `.github/workflows/version-bump-prs.yml`
- `.github/workflows/publish-github-packages.yml` (manual recovery)
