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
- Added `.github/workflows/pre-production.yml`. It reuses the production Node version, dependency installation fallback, build scripts, Electron Builder configuration, NSIS setup, and Windows x64 target. It uploads a test artifact and does not publish releases or tags.
- Added `docs/PRE_PRODUCTION_AND_RELEASE_STRATEGY.md` documenting the branch policy, release bridge, data isolation, language requirements, and release safety.
- The first CI attempt exposed an existing package manifest/lockfile mismatch: strict `npm ci` fails because many declared packages are missing from the lockfile. The workflow is being aligned with the production `npm ci || npm install` fallback; the lockfile must be repaired separately.

## Critical Compatibility Blocker
The currently installed `v1.1.20` app has `allowPrerelease = false`. It cannot discover a GitHub prerelease. A small stable updater-bridge release must be built, tested, and published first. Existing installations can then receive the bridge through the current stable channel; only after that should beta prereleases be published.

The bridge must keep the production app identity and production data path. The prerelease build must use the same installer identity for in-place updating, but switch to a separate deterministic beta `userData` directory before the backend starts. Switching back to a stable build must restore the original production data path.

## Tests and Release Status
- Repository inspection: **COMPLETED**
- Production workflow source inspection: **COMPLETED**
- Updater and data-path inspection: **COMPLETED**
- Pre-production branch creation: **COMPLETED**
- Pre-production workflow source added: **COMPLETED**
- Strict `npm ci` on current lockfile: **FAILED — manifest and lockfile out of sync**
- Updated production-compatible dependency fallback: **COMMITTED; CI PENDING**
- TypeScript validation: **PENDING**
- Web/backend build: **PENDING**
- Windows installer build: **PENDING**
- Stable updater bridge: **NOT IMPLEMENTED**
- Beta release: **NOT PUBLISHED**
- Security remediation: **NOT STARTED**
- Business Mode enhancements: **NOT STARTED**
- Production deployment: **NOT READY**

## Next Actions
1. Run and inspect the updated pre-production GitHub Actions workflow.
2. Repair and validate the package lockfile without changing dependency versions unnecessarily.
3. Verify the generated installer artifact and current production build parity.
4. Implement isolated beta `userData` selection without changing the production data path.
5. Implement the updater bridge in a separate, minimal change and validate the stable update path.
6. Complete the stable bridge release before publishing beta releases.
7. Continue security remediation and Business Mode improvements in separately testable milestones.
