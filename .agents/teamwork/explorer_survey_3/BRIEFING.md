# BRIEFING — 2026-11-26T14:08:30Z

## Mission
Survey Angel-OS git state, GitHub PRs/releases, version string references, build/artifact/testing infrastructure, and AGENTS.md compliance workflow.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, synthesizer
- Working directory: /home/antigravity/michaelsweet612/Angel-OS
- State folder: /home/antigravity/michaelsweet612/Angel-OS/.agents/teamwork/explorer_survey_3
- Original parent: a43cece4a8e2b5d4717734e2e005f522
- Milestone: Survey (3 of 3)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify any repository files, branches, PRs, or releases
- Write structured 5-component handoff report to `.agents/teamwork/explorer_survey_3/handoff.md`
- Keep `progress.md` updated in state folder
- Send concise completion message to `a43cece4a8e2b5d4717734e2e005f522`

## Current Parent
- Conversation ID: a43cece4a8e2b5d4717734e2e005f522
- Updated: not yet

## Investigation State
- **Explored paths**: `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, `package.json`, `tsconfig.json`, `vite.config.ts`, `metadata.json`, `.gitignore`, `.github/PULL_REQUEST_TEMPLATE.md`, git refs/branches/tags/`gh-pages` tree, GitHub PRs/Releases/Rulesets/Pages API, `Angel-OS-v1.9.0-portable-web.zip` archive contents, local toolchain (`node`, `npm`, `bun`, `tsc`, `zip`, `tar`, Python `playwright` + Chromium).
- **Key findings**:
  - Local repo is checked out on already-merged `feat/v190-runtime-host-complete` (`cf2e9f5`); local `origin/main` (`b7bac17`) and `main` (`e526cfc`) are stale relative to remote `origin/main` (`c84cef5`, PR #8 merge). Must `git fetch origin` and branch from `origin/main` before making new changes.
  - Version `1.9.0` appears in 4 tracked files (`package.json`, `index.ts` x3, `README.md` x3, `osForeignRuntime.ts` x1 comment). No `CHANGELOG.md` exists; changelogs live in GitHub Release bodies and PR descriptions.
  - Downloadable artifacts are hosted on `gh-pages` under `downloads/Angel-OS-vX.Y.Z-portable-web.zip` (built with `VITE_BASE=./` plus `physical-booter/`, `java-src/`, governance docs), while `gh-pages` live site is built with `VITE_BASE=/Angel-OS/`. All 12 GitHub Releases have `assets: []` and link to `raw/gh-pages/downloads/...`.
  - No unit test runner or `.github/workflows` exist. Verification uses `npm run lint` (`tsc --noEmit`, currently 0 errors), `npm run build`, and ad-hoc Python Playwright E2E scripts (Python 3.12 + Playwright + Chromium `/opt/ms-playwright/chromium-1255/chrome-linux64/chrome` and `/usr/bin/google-chrome` are ready).
  - `main` has an active GitHub ruleset requiring `pull_request` (no direct push / force-push / deletion); `gh-pages` has `deletion` protection only.
- **Unexplored areas**: None within scope.

## Key Decisions Made
- Completed read-only survey without modifying any repo files, branches, PRs, or releases.
- Documented exact dual-build (`VITE_BASE=/Angel-OS/` vs `VITE_BASE=./`), `gh-pages` artifact publishing, PR, and `gh release create` workflow for `v1.10.0`.

## Artifact Index
- `/home/antigravity/michaelsweet612/Angel-OS/.agents/teamwork/explorer_survey_3/DISPATCH.md` — recorded dispatch
- `/home/antigravity/michaelsweet612/Angel-OS/.agents/teamwork/explorer_survey_3/progress.md` — liveness heartbeat
- `/home/antigravity/michaelsweet612/Angel-OS/.agents/teamwork/explorer_survey_3/handoff.md` — final 5-component handoff report
