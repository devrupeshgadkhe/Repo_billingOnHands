# CURRENT_TASK.md — Live Development State

## Current Task Information
- **Task ID**: TASK-004
- **Objective**: Establish a safe pre-production release pipeline, preserve the current production installer, and prepare secure updater/data isolation before implementing security and Business Mode improvements.
- **Status**: IN PROGRESS
- **Current Branch**: `pre-production`
- **Production Baseline**: `main` at commit `524a91b1bbc847f72650b6d27c8a0ef39640c6b0`, application version `1.1.20`
- **Latest Production Release**: `v1.1.20`
- **Production Workflow**: `.github/workflows/build-electron.yml` (unchanged)

## User Requirements
1. Marathi is chat-only. All UI strings, menu names, titles, labels, dialogs, validation messages, notifications, code comments, and new technical documentation must be English.
2. Preserve the current production architecture and reuse the exact existing Windows x64 Electron build configuration wherever possible.
3. Keep pre-production database, Electron user data, installation lock, and backups separate from production.
4. Existing installed applications must be able to receive prereleases through automatic updates, without requiring a manual reinstall.
5. Preserve all existing features and avoid production changes until reviewed and validated.
6. Update project context, task, roadmap, changelog, and testing documentation as implementation progresses.

## Verified Repository Findings
- The current production release is `v1.1.20`; its installer is approximately 115 MB.
- The existing workflow uses Node.js 20, `npm ci || npm install`, `npm run build`, and `npx electron-builder --win --x64 --publish never`.
- The production workflow auto-increments versions, pushes commits/tags, and publishes a stable GitHub Release. It must not be reused unchanged for beta publishing.
- The existing updater uses the GitHub provider for this repository and sets `allowPrerelease = false`.
- Electron `userData` is passed to the backend as `ELECTRON_USER_DATA`; the backend stores `data/db.json`, `install-lock.json`, and backups under that directory.
- The current branch protection status for `main` is disabled. Do not change repository protection settings without a separately reviewed plan.
- A successful production workflow run exists for release `v1.1.20`.

## Completed in This Task
- Created `pre-production` from the current `main` head without modifying `main`.
- Added `.github/workflows/pre-production.yml`. It mirrors the production dependency fallback, Node version, build scripts, Electron Builder configuration, NSIS setup, and Windows x64 target. It uploads a test artifact and does not publish releases or tags.
- Added `docs/PRE_PRODUCTION_AND_RELEASE_STRATEGY.md`.
- Updated `AGENTS.md`, `CURRENT_TASK.md`, and `TESTING.md` with English-only UI/code requirements and the pre-production branch policy.
- Added `release-channel.cjs` to select a dedicated `BillingOnHand-PreProduction` user-data directory for prerelease versions while preserving the exact existing production user-data path for stable versions.
- Added `scripts/test-release-channel.cjs` and the `test:release-channel` npm script to cover stable, beta, alpha, and release-candidate version behavior.
- Added the release-channel/data-isolation test to the pre-production workflow.
- The first strict `npm ci` run exposed a package manifest/lockfile mismatch. The workflow now mirrors the existing production `npm ci || npm install` fallback; lockfile repair remains tracked.

## Critical Compatibility Blocker
The currently installed `v1.1.20` app has `allowPrerelease = false`. It cannot discover a GitHub prerelease. A small stable updater-bridge release must be built, tested, and published first. Existing installations can then receive the bridge through the current stable channel; only after that should beta prereleases be published.

The bridge must keep the production app identity and production data path. The prerelease build must use the same installer identity for in-place updating, but switch to a separate deterministic beta `userData` directory before the backend starts. Switching back to a stable build must restore the original production data path.

## Tests and Release Status
- Repository and production workflow inspection: **COMPLETED**
- Pre-production branch creation: **PASSED**
- First strict `npm ci` attempt: **FAILED — manifest and lockfile out of sync**
- Production-compatible dependency fallback: **PASSED** in the initial baseline CI run
- Initial baseline TypeScript validation: **PASSED**
- Initial baseline web/backend build: **PASSED**
- Initial baseline Windows installer packaging: **IN PROGRESS**
- Release-channel/data-isolation unit test: **ADDED; LATEST CI PENDING**
- Windows installer artifact verification: **PENDING**
- Stable updater bridge: **NOT IMPLEMENTED**
- Beta release: **NOT PUBLISHED**
- Security remediation: **NOT STARTED**
- Business Mode enhancements: **NOT STARTED**
- Production deployment: **NOT READY**

## Next Actions
1. Complete and inspect the current Windows packaging run.
2. Ensure the latest commit runs the new release-channel/data-isolation test and produces a valid Windows installer.
3. Repair and validate the package lockfile without changing dependency versions unnecessarily.
4. Implement and test updater bridge compatibility.
5. Complete the stable bridge release before publishing beta releases.
6. Continue security remediation and Business Mode improvements in separately testable milestones.
