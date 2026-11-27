# TESTING.md — Verification & Testing Guide

## Automated Verification Commands
1. **Release channel and data isolation**: `npm run test:release-channel`.
2. **Type Check**: `npm run lint` (runs `tsc --noEmit`).
3. **Production Web and Backend Build**: `npm run build`.
4. **Windows Installer Build**: `npx electron-builder --win --x64 --publish never`.
5. **Dependency Installation**: `npm ci || npm install` (matches the current production workflow; the package manifest and lockfile are currently out of sync and must be repaired).

## Pre-Production Workflow
Workflow: `.github/workflows/pre-production.yml`

The workflow is triggered by pushes to `pre-production` or manually through GitHub Actions. It:
- Uses Windows latest and Node.js 20, matching the current production workflow.
- Uses the same `npm ci || npm install` dependency fallback as production.
- Runs `npm run test:release-channel`, `npm run lint`, and `npm run build`.
- Reuses the existing Electron Builder configuration and Windows x64 NSIS target.
- Verifies that a non-empty installer and matching `latest.yml` are generated.
- Uploads an artifact for manual testing.
- Does not publish GitHub Releases, modify tags, or change production assets.

## Current Verification Status
- Production baseline `v1.1.20`: GitHub Actions run #128 succeeded on 2026-11-27.
- Pre-production branch creation: **PASSED**.
- First strict `npm ci` run: **FAILED** because `package.json` and `package-lock.json` are out of sync.
- Production-compatible dependency fallback: **PASSED**.
- Initial baseline TypeScript validation: **PASSED**.
- Initial baseline web/backend build: **PASSED**.
- Initial baseline Windows installer packaging: **IN PROGRESS**.
- Release-channel/data-isolation unit test on latest commit: **PENDING**.
- Windows installer artifact verification: **PENDING**.
- Updater bridge compatibility test: **PENDING**.
- Beta data isolation runtime test: **PENDING**.

Do not report the pre-production build or deployment as successful until the latest GitHub Actions run and artifact have been inspected.

## Existing Feature Regression Tests
- Restaurant menu item creation/editing, availability toggle, Half/Full pricing, KOT kitchen station labels, and `trackStock === false` stock behavior.
- Installation business-mode lock preservation across updates and clearing only on full uninstall.
- Restaurant table lifecycle and persistence.
- Offers and cashback schemes.
- Existing invoice, purchase, stock, GST, print, backup/restore, and auto-update flows.

## Required Manual Windows Smoke Tests
- Install the pre-production artifact without uninstalling the stable application.
- Verify the production database and installation lock remain unchanged.
- Verify the beta application creates and uses only its dedicated data directory.
- Verify restart, invoice creation, printing, camera/microphone, local API startup, and backup behavior.
- Verify beta-to-beta update and stable rollback/update behavior before production promotion.
