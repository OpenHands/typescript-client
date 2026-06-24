# Publishing Guide

This document explains how to publish the OpenHands TypeScript Client.

## Overview

Releases are **merge-driven**: you trigger **Prepare Release**, merge the
resulting `rel-X.Y.Z` PR, and the rest is automated. The package is published to
**two registries**:

| Registry | Workflow | Auth |
|----------|----------|------|
| **npm** (`registry.npmjs.org`) | `.github/workflows/npm-publish.yml` | OIDC trusted publishing |
| **GitHub Packages** (`npm.pkg.github.com`) | `.github/workflows/release.yml` | `GITHUB_TOKEN` |

The full process, prerequisites, and downstream version-bump behavior are
documented in [`.github/workflows/README-RELEASE.md`](.github/workflows/README-RELEASE.md).

## Automated Publishing (Recommended)

### Prerequisites

- **npm trusted publishing**: The `@openhands/typescript-client` package on npmjs.org must have the `OpenHands/typescript-client` repository configured as a trusted publisher (see [npm docs](https://docs.npmjs.com/trusted-publishers/)).
- **`OPENHANDS_BOT_GITHUB_TYPESCRIPT_CLIENT`**: A classic PAT (with `repo` + `workflow` scope) so the release PR triggers CI and so the downstream bump PR can be opened in `agent-canvas`.
- **GitHub Token**: Automatically provided by GitHub Actions as `GITHUB_TOKEN` for GitHub Packages.

### Publishing Process

1. **Trigger Prepare Release**: Actions tab → **Prepare Release** → **Run workflow** → enter the version (e.g. `1.25.0`). This opens a `rel-X.Y.Z` PR that bumps the version.

2. **Review and merge the PR**. CI and integration tests run automatically.

3. **On merge, the automation runs**:
   - `create-release.yml`: creates the GitHub Release `vX.Y.Z` (auto notes + `release-note-required` preamble) and dispatches the two publish workflows.
   - `npm-publish.yml`: publishes to **npm** with provenance, then dispatches the version bump.
   - `release.yml`: publishes to **GitHub Packages**.
   - `version-bump-prs.yml`: opens a bump PR in `agent-canvas` once the version is live on npm.

The publish workflows can also be run manually with a `version` input for recovery if a publish job fails after the GitHub Release is created.

## Manual Publishing

### Setup

1. **Configure npm for GitHub Packages**:
   ```bash
   npm login --registry=https://npm.pkg.github.com
   # Username: your-github-username
   # Password: your-github-token
   ```

### Publishing Steps

1. **Update version**:

   ```bash
   npm version patch  # or minor, major
   ```

2. **Build the package**:

   ```bash
   npm run build
   ```

3. **Run tests**:

   ```bash
   npm test
   ```

4. **Publish to GitHub Packages**:
   ```bash
   npm publish --registry=https://npm.pkg.github.com --access public
   ```

## Installation Instructions for Users

### From npm (Recommended)

```bash
npm install @openhands/typescript-client
```

### From GitHub Packages

Add to your `.npmrc` file:

```
@openhands:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @openhands/typescript-client
```

## Troubleshooting

### Authentication Issues

- **GitHub Packages**: Ensure the `GITHUB_TOKEN` has `packages:write` permission

### Version Conflicts

If you encounter version conflicts, ensure:

- The version in `package.json` matches the git tag
- The version doesn't already exist in the registry

### Build Failures

Common issues:

- TypeScript compilation errors: Fix in source code
- Test failures: Ensure all tests pass before publishing
- Missing dependencies: Run `npm ci` to install exact versions

## Workflow Files

- `.github/workflows/prepare-release.yml`: Manual dispatch workflow that opens the version-bump `rel-X.Y.Z` PR.
- `.github/workflows/create-release.yml`: Runs when a `rel-*` PR is merged; creates the GitHub Release and dispatches publish workflows.
- `.github/workflows/npm-publish.yml`: `release: published` / manual npmjs.org publish workflow (OIDC trusted publishing) that dispatches downstream version bumps after success.
- `.github/workflows/release.yml`: `release: published` / manual GitHub Packages publish workflow. GitHub Release creation lives in `create-release.yml`.
- `.github/workflows/version-bump-prs.yml`: Manual dispatch workflow used by `npm-publish.yml` to open exact-pin consumer bump PRs.
- `.github/workflows/publish-github-packages.yml`: Legacy manual GitHub Packages recovery workflow (`workflow_dispatch` only).
