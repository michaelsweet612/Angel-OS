# Contributing to Angel-OS

Thank you for your interest in contributing to **Angel-OS (`AngelOS-web`)**. All participants and contributors are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md) and review the licensing and release requirements below before submitting changes.

---

## Licensing & Contribution Terms

Angel-OS is governed by the **[Angel-OS Personal Use License](./LICENSE)**:

- Anyone may download, clone, build, and run Angel-OS locally for **personal, non-commercial use**.
- Republishing, redistributing, mirroring, or publicly re-hosting modified or unmodified builds without written permission from the copyright holder (`michaelsweet612`) is not permitted.
- By submitting a pull request, issue patch, or code suggestion to this repository, you agree that your contribution may be incorporated into Angel-OS and distributed by the repository maintainer under the terms of [`LICENSE`](./LICENSE). Do not include third-party code or incompatible license terms that conflict with [`LICENSE`](./LICENSE), while preserving any pre-existing template `SPDX-License-Identifier` notices where present.

---

## Local Development Setup

### Prerequisites
- **Node.js** `20+` (verified on `v22` / `v24`) and **npm**
- Optional: `GEMINI_API_KEY` environment variable to test live Gemini API integrations (BIOS, Taskbar shell, apps, Hardware Telemetry, FDISK, Paint, Sweeper, Chiptunes, and Registry run fully offline without a key)

### Workflow Commands

```bash
git clone https://github.com/michaelsweet612/Angel-OS.git
cd Angel-OS
npm install

# Run local Express + Vite development server (port 3000)
npm run dev

# Type-check all TypeScript sources
npm run lint

# Build production bundle & PWA service worker
npm run build
```

If testing GitHub Pages subpath builds locally, set `VITE_BASE=/Angel-OS/` prior to running `npm run build`; for portable offline ZIP builds use `VITE_BASE=./`.

---

## Pull Request & Release Policy (`AGENTS.md`)

Per [AGENTS.md](./AGENTS.md), every change—including minor bug fixes, styling tweaks, and documentation updates—must adhere to the following checklist:

1. **Feature Branches:** Open pull requests targeting `main` from a descriptive feature branch (`feat/...`, `fix/...`, `docs/...`). Direct unreviewed pushes to `main` are protected by branch rulesets.
2. **Type-Check & Browser Verification:**
   - Ensure `npm run lint` passes with zero TypeScript errors.
   - Verify affected UI flows in a real browser (`npm run dev` or preview server) with zero uncaught console/page errors.
3. **Versioned Release Changelog Format:**
   Every release and pull request summary must include three clear sections:
   - **Added:** Every new file, setting, behavior, symbol, or UI capability introduced.
   - **Removed:** Every deleted, replaced, or retired item.
   - **Why Removed:** Engineering rationale explaining why each removed item was retired or replaced.
4. **Direct Engineering Prose:** Write release notes and PR descriptions clearly and concisely without meta phrasing.

---

## Reporting Bugs or Suggesting Enhancements

- Open an issue using the **Bug Report** or **Feature Request** templates under [Issues](https://github.com/michaelsweet612/Angel-OS/issues).
- Include clear reproduction steps, browser/OS details, screenshots when UI-related, and any console errors observed.
