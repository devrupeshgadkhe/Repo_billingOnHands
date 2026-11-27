# AGENTS.md — Permanent Instructions for AI Coding Agents

## 1. Core Principles & Architecture
- **Framework**: React SPA (Vite, TypeScript, Tailwind CSS) with Express backend (`server.ts`).
- **Database**: Local JSON file storage with normalized state management (`data/db.json`).
- **Architecture Integrity**: Preserve the existing React, Express, Electron, and JSON database architecture. Do not introduce an unrelated framework or broad refactor.
- **Development continuity**: Maintain `AGENTS.md`, `PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `TESTING.md`.

## 2. Language Requirements
- Chat language may be Marathi.
- All UI text, menu names, titles, labels, buttons, dialogs, validation messages, notifications, code comments, and new technical documentation must be English only.
- Do not hardcode Marathi text into application code or UI.
- Do not remove existing voice or language capabilities unless explicitly required.

## 3. Rules for Inspecting and Modifying Code
- Make the smallest safe change that satisfies the requirement.
- Inspect the latest source and relevant call sites before editing.
- Avoid unrelated refactoring, duplicate documentation, and unnecessary package installations.
- Preserve existing features, data formats, Electron bridges, installer identity, and production update behavior unless a reviewed change requires otherwise.

## 4. Branch and Synchronization Policy
- `main` is production and must not receive direct development changes.
- `pre-production` is the integration, validation, and beta-build branch.
- Create feature branches only when a change needs independent review.
- Keep the production GitHub Actions workflow unchanged while developing pre-production.
- Update `CURRENT_TASK.md` after each meaningful milestone.
- Promote to `main` only through a reviewed pull request after required checks and manual smoke tests pass.
- Never claim a change, commit, build, test, or deployment succeeded unless the corresponding tool or CI result confirms it.

## 5. Secrets and Data Protection
- Never commit API keys, credentials, private tokens, or production databases.
- Use `.env.example` for environment templates.
- Never print secrets in logs or documentation.
- Pre-production must use a separate Electron user-data directory, database, installation lock, and backup folder.
- Never copy, reset, or migrate production data as part of a beta update.

## 6. Verification and Release
- Run `npm ci`, `npm run lint`, `npm run build`, and the Windows Electron packaging workflow before reporting build success.
- Add targeted API, integration, and regression tests for changed behavior.
- Record actual test results in `CURRENT_TASK.md` and `TESTING.md`.
- The existing production updater must be compatibility-bridged through a stable release before it can discover prereleases.
- Never publish beta artifacts as the latest stable release.
