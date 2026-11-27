# Pre-Production and Release Strategy

## Scope

This document records the safe implementation plan for the `pre-production` branch. The existing `main` branch and its production release workflow remain unchanged until a separately reviewed production pull request is approved.

## Baseline

- Repository: `devrupeshgadkhe/Repo_billingOnHands`
- Production branch: `main`
- Pre-production branch: `pre-production`
- Baseline application version: `1.1.20`
- Baseline production release: `v1.1.20`
- Existing Windows build: Node.js 20, `npm ci || npm install`, `npm run build`, and `npx electron-builder --win --x64 --publish never`
- Existing installer identity: `com.billingonhand.app`
- Existing update provider: GitHub Releases for this repository
- Existing update policy: `allowPrerelease = false`

## Branch and CI Policy

1. All implementation changes are made on `pre-production`.
2. The pre-production workflow reuses the existing build scripts, Electron Builder configuration, icons, NSIS installer configuration, and Windows x64 target.
3. Dependency installation initially mirrors the existing production workflow (`npm ci || npm install`) because the current package manifest and lockfile are out of sync. This compatibility fallback is temporary; the lockfile mismatch must be repaired in a separately validated change.
4. The workflow runs TypeScript validation, the production web/backend build, and Windows installer packaging.
5. The workflow uploads a test artifact only. It does not create or overwrite a GitHub Release, tag, or production asset.
6. A beta release is published only after the update-channel and data-isolation work has been implemented and verified.

## Auto-Update Compatibility Requirement

The currently installed `v1.1.20` executable has `allowPrerelease = false`. It cannot discover a GitHub prerelease by simply publishing a beta release.

A compatibility bridge is therefore required:

1. Build and validate a minimal stable updater-bridge release using the existing production release workflow and stable channel.
2. The bridge must preserve the production application identity and production data path while enabling prerelease discovery.
3. Existing installations first receive the bridge as a normal stable update.
4. Only after the bridge is verified should a beta release be published.
5. The beta build must keep the same installer identity so the existing installed application can update in place.

Do not claim that the current `v1.1.20` installation can receive a prerelease until the bridge has been released and verified.

## Data Isolation Requirement

- Production builds must continue using the existing Electron `userData` location.
- Pre-production builds must use a separate, deterministic user-data directory before the backend starts.
- The pre-production database, installation lock, backups, and local settings must be isolated from production.
- Returning to a stable build must restore the original production data path without deleting either data set.
- The beta build must never migrate, overwrite, reset, or copy production data automatically.

## Release Safety

- Never publish a prerelease with the production workflow's `--latest` behavior.
- Never overwrite the existing `v1.1.20` tag or assets.
- Keep beta version numbers strictly greater than the updater bridge version.
- Validate the generated `latest.yml`, installer checksum, release tag, and prerelease flag.
- Keep the production workflow unchanged until a reviewed PR is approved.
- A Windows GUI smoke test is required before promoting a beta build to production.

## Language Requirement

All new UI labels, menus, titles, dialogs, validation messages, notifications, code comments, and technical documentation added during this implementation must use English. Marathi is reserved for conversation only. Existing language features must not be removed without a separate requirement.

## Current Status

- [x] Create `pre-production` from the current `main` commit.
- [x] Add an isolated pre-production CI workflow that reuses the production build commands and configuration.
- [x] Document the updater bridge requirement and data-isolation rules.
- [x] Match the production dependency-installation fallback after the strict `npm ci` run exposed a lockfile mismatch.
- [ ] Repair and verify the package lockfile.
- [ ] Run the updated Windows workflow and verify the installer artifact.
- [ ] Implement and test pre-production data-directory isolation.
- [ ] Implement and test updater bridge compatibility.
- [ ] Publish and verify the stable updater bridge.
- [ ] Publish and verify a beta prerelease.
- [ ] Complete security remediation and Business Mode implementation phases.
- [ ] Open a reviewed PR to `main` after all acceptance criteria pass.
