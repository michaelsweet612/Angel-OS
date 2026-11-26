# Angel OS Changelog

All notable releases of Angel OS are documented here in accordance with the repository release policy.

---

## v2.0.0 — 2026-11-26

### Added
- **Windows-Style First-Run Setup Wizard (OOBE):** Brand-new visitors now enter a guided three-step desktop setup flow asking whether to create an account, choose a desktop theme, and configure default browser behavior before entering the desktop.
- **Private Per-User Accounts & Isolated Cloud/Local Saves (`osUserAccounts.ts`):**
  - Integrated Firebase Google Authentication and Firestore cloud persistence (`/users/{uid}/saves/primary`) protected by owner-only, schema-validated `firestore.rules` so each authenticated user's settings, installed apps, documents, bookmarks, stickies, taskbar order, and trophies remain strictly private and automatically restore on return visits.
  - Added isolated Local Offline Accounts (`angelos_v2_save_<profileId>`) with optional PIN protection and profile deletion, plus an ephemeral Temporary Guest mode.
  - Added Start Menu manual Save/Sync button, Account Setup Wizard launcher, and Sign Out / Switch Account flow that flushes saves and wipes workspace state cleanly before switching users.
- **500 New Interactive Apps in Ability to Install (`osAppStore500.ts`):**
  - Added 500 distinct, installable applications across 8 categories (`Games`, `Calculators`, `Creative`, `Dev Tools`, `Productivity`, `Science`, `Text`, `Utilities`) powered by 14 interactive mini-app engines (arcade games, memory match, reaction/typing tests, formula calculators, unit converters, pixel & sketch studios, drum/synth step sequencer, JSON/Base64/regex/UUID/hash dev tools, kanban/pomodoro/habit trackers, physics/astronomy/chemistry simulators, markdown & text analyzers, and system utilities).
  - Upgraded the Ability to Install UI with instant search across all 514 packages, 13 category tabs, an Installed-Only toggle, 50-items-per-page pagination, 1-click Quick Install alongside classic `.EXE` InstallShield setup, and dynamic Desktop & Start Menu shortcuts.
- **Hardened Live Web Proxy & Browser Recovery (`server.ts`, `osExtendedApps.ts`, `osStaticWeb.ts`):**
  - Expanded `/api/browse` redirect traversal from 4 to 8 hops, raised upstream request timeout from 7.5 seconds to 12 seconds, stripped `Content-Security-Policy-Report-Only` and duplicate `<base>` tags, and added formatted JSON/plain-text rendering.
  - Added `resetBrowseBackendState()` and prevented transient upstream failures from permanently marking the Express proxy as unavailable.
- **Dynamic Window Lifecycle & Taskbar Resilience (`index.ts`, `index.css`):**
  - Added reusable window chrome binding and dynamic window spawning/teardown (`ensureDynamicStoreWindow`, `storeMiniAppCleanups`) for all 500 store applications.
  - Added dynamic icon and title resolution in `getAppDockMeta()` and horizontal scroll containment on `#taskbar #taskbar-apps` so large numbers of open windows never compress the system tray or clock.

### Removed
- **Pre-seeded default local accounts (`Michael` and `Guest95`):** Removed hardcoded `Michael` and `Guest95` entries from `DEFAULT_SYSTEM_REGISTRY`, `loadSystemRegistry()` fallbacks, `osPhysicalBooter.ts`, and static `index.html` markup.
- **Shared global single-workspace persistence on boot:** Removed automatic fallback into a shared browser-wide profile without user sign-in or setup resolution.
- **Permanent session-wide Live Web proxy disabling on first transient error:** Removed the unconditional `markBrowseBackend('missing')` call on non-404/transient `/api/browse` fetch errors.

### Why Removed
- **Pre-seeded accounts (`Michael` / `Guest95`):** Hardcoded default profiles caused every visitor to land inside an unwanted pre-configured identity instead of setting up their own account. Removing them ensures clean first-run onboarding and strict account ownership.
- **Shared global persistence:** Storing all state under a single unisolated browser key caused different visitors or accounts to view and overwrite each other's workspace state. Replacing it with UID-scoped Firestore documents and profile-scoped local buckets ensures every user only loads their own save.
- **Unconditional proxy disabling:** Marking the `/api/browse` backend missing after a single slow or failing upstream host broke Live Web browsing for every subsequent URL in the session. Restricting the missing flag strictly to definitive HTTP 404 or SPA HTML fallback responses keeps Live Web reliable after transient network errors.
