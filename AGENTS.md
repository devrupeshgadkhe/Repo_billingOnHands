# AGENTS.md — Permanent Instructions for AI Coding Agents

## 1. Core Principles & Architecture
- **Framework**: React SPA (Vite, TypeScript, Tailwind CSS) with Express backend (`server.ts`).
- **Database**: Local JSON file storage with normalized state management (`data/db.json`).
- **Architecture Integrity**: Keep the existing .NET/MVC structure or full-stack Node/Express architecture as configured. Do not refactor core patterns or introduce unnecessary framework dependencies.
- **AI-Independent Development Continuity**: Always maintain and respect the 5 core project memory files: `AGENTS.md`, `PROJECT_CONTEXT.md`, `CURRENT_TASK.md`, `CHANGELOG.md`, and `TESTING.md`.

## 2. Rules for Inspecting and Modifying Code
- Use `view_file` and `list_dir` instead of shell commands where possible.
- Make the smallest safe change that satisfies the user request.
- Avoid unrelated refactoring, duplicate documentation, and unnecessary package installations.
- Respect UI design guidelines: clean typography, zero-pill discipline, high contrast, responsive design, and Tailwind CSS.

## 3. Synchronization & Checkpoint Procedures
- **GitHub is the canonical source of truth.**
- Before starting work, verify git status and pull latest changes if applicable.
- After each meaningful milestone, update `CURRENT_TASK.md`, commit code changes, and push to GitHub (`main` branch).
- Use the provided GitHub Personal Access Token (PAT) for pushes and remote synchronization.

## 4. Secrets, Environment Variables & Data Protection
- Never commit actual API keys, private credentials, or production databases.
- Use `.env.example` for environment variable templates.
- Never print secret tokens or credentials in logs or documentation.

## 5. Verification & Testing
- Run `compile_applet` and `lint_applet` (`npm run build` / `tsc --noEmit`) before reporting success.
- Record actual test results in `CURRENT_TASK.md` and `TESTING.md`.
