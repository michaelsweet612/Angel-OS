# Angel OS Changelog

All notable releases of Angel OS are documented here in accordance with the repository release policy.

---

## v2.0.3 — 2026-11-26

### Added
- **Windows 95 Unified Control Center Flyout (`#win11-quick-settings`):** Rebuilt the system tray Control Center flyout with classic Windows 95 window bevels, etched `fieldset`/`legend` groupboxes, sunken active navy toggle states, and recessed footer status readouts matching the unified tray button.
- **Core Hardware Toggles (`Wi-Fi`, `Display / CRT`, `Volume`, `Battery`):**
  - **Wi-Fi (`#qs-tile-wifi`):** Toggles wireless LAN connectivity, updates the Control Center status readout (`Connected` / `Off`), toggles a red diagonal slash on the taskbar `#tray-wifi-indicator`, and records a `NET_WLAN` hardware log entry.
  - **Display / CRT (`#qs-tile-crt`):** Toggles CRT scanlines with live status readout (`Scanlines On` / `Standard`) synchronized with `systemRegistry.crtEnabled` and the tray indicator.
  - **Volume (`#qs-tile-audio`) & Master Volume Slider (`#qs-volume-slider`):** Toggles mute/unmute and adjusts `systemRegistry.masterVolume` directly with a live tabular percentage readout (`#qs-volume-val`) and synced tray mute indicator.
  - **Battery (`#qs-tile-battery`):** Displays live battery charge level and power source (`AC` / `On` / `Saver`), toggles Battery Saver power mode (reducing display brightness and CRT overlay intensity via `body.os-battery-saver`), updates the tray battery fill color and recessed footer status (`#qs-footer-battery-text`), and records an `ACPI_PWR` hardware log entry.
- **Output Levels & Desktop/Devices Groupboxes:** Added tabular percentage readouts beside both the Volume and Brightness sliders and organized secondary desktop toggles (`56k Dial-Up`, `Night Light`, `Center Bar`, `Bar Labels`, `Top Taskbar`, `Auto-Hide`, `Tile Windows`, `Camera`, `Mic Access`) into a compact Win95 3-column grid.

### Removed
- **Flat ungrouped emoji quick-settings grid (`index.html`, `index.css`):** Removed the legacy 290px ungrouped emoji-tile layout inside `#win11-quick-settings` and the `.qs-icon` emoji wrapper class.

### Why Removed
- **Flat ungrouped emoji grid:** The previous flyout lacked dedicated **Wi-Fi** and **Battery** controls, omitted a **Volume** slider, and did not match the four hardware indicators displayed inside the unified taskbar Control Center button or the classic Windows 95 groupbox visual grammar.

---

## v2.0.2 — 2026-11-26

### Added
- **Dev Cache & Stale Service Worker Auto-Purge (`server.ts`, `osDualInstall.ts`, `vite.config.ts`):** Added `Cache-Control: no-store` headers for dev HTML/assets, a self-unregistering `/dev-sw.js` and `/sw.js` cleanup worker in development mode, client-side stale dev Service Worker unregistration, and Workbox `cleanupOutdatedCaches`, `skipWaiting`, and `clientsClaim` flags for production builds.
- **Raised Tactile System Tray Button Styling (`index.css`):** Upgraded `#taskbar .tray-group-btn` so the unified **Control Center** button (`Wi-Fi`, `CRT`, `Volume`, `Battery`) and the combined **Date/Time + Bell** button render as two clearly separated, raised beveled buttons at rest with crisp hover and pressed states.

### Removed
- **Development-mode Workbox Service Worker caching (`devOptions.enabled: true` in `vite.config.ts`):** Disabled the dev-mode PWA service worker in Vite.
- **Unconditional dev Service Worker registration (`osDualInstall.ts`):** Removed dev-mode execution of `registerSW({ immediate: true })`.
- **Orphaned `#tray-notif-btn` CSS selector (`index.css`):** Removed the obsolete rule targeting the retired standalone bell button.

### Why Removed
- **Development-mode Service Worker caching:** Running a precaching Service Worker in development caused browsers to continue serving stale `index.html` snapshots and older taskbar markup even after rebuilding or reloading. Disabling dev-mode SW caching and serving an auto-cleanup worker ensures live UI updates appear immediately while keeping production PWA offline caching intact.
- **Orphaned `#tray-notif-btn` selector:** The standalone bell button was replaced by the unified `#tray-datetime-notif-btn` control in `v2.0.1`, leaving the old CSS rule unused.

---

## v2.0.1 — 2026-11-26

### Added
- **Unified Control Center Taskbar Button (`#tray-qs-btn`):** Grouped the Wi-Fi, Display/CRT, Volume, and Battery status icons into one single interactive system tray button that opens the Quick Settings Control Center flyout. Live state indicators inside the unified button reflect audio mute status, CRT scanline state, and real-time device battery level/charging state via the Battery Status API (with a `100% AC` desktop fallback).
- **Unified Date/Time + Notification Bell Button (`#tray-datetime-notif-btn`):** Placed the notification bell and live unread badge directly beside the taskbar clock and date inside a single combined button at the right edge of the system tray.
- **Stacked Notification Center & Mini Calendar Flyout (`#tray-calendar-notif-flyout`):** Clicking the Date/Time + Bell button opens two distinct stacked cards above the taskbar (or below when docked at the top):
  - **Notifications Card (Top):** Displays recent OS events and trophies with a live count indicator, scrollable history, Clear All button, and empty state.
  - **Mini Interactive Calendar Card (Bottom):** Displays today's full weekday/date banner, an **Open Calendar** shortcut launching the full Calendar app, previous/next month pagination, a one-click **Today** jump button, a 7-column tabular-numeral day grid with a highlighted today indicator, and interactive date selection.
- **Shared Hardware Toggle Helpers & Mutual-Exclusion Dismissal (`index.ts`):** Added `toggleCrtScanlines()` and `toggleRetroSfxAudio()` helpers, synchronized `aria-expanded` and active pressed states on both tray buttons, and wired click-outside and `Escape` key dismissal across all taskbar flyouts.

### Removed
- **Fragmented individual system tray icon buttons (`#tray-notif-btn`, `#tray-crt-btn`, `#tray-sound-btn`):** Removed the separate standalone bell, CRT, and sound icon buttons from `#system-tray`.
- **Legacy clock-to-Quick-Settings redirect (`#tray-clock` click handler):** Removed the handler that forwarded clicks on the taskbar date/time to the Quick Settings Control Center.
- **Standalone unstacked `#notif-drawer` fixed drawer:** Replaced the isolated fixed-position notification drawer with the stacked Notification Center + Mini Calendar flyout container.

### Why Removed
- **Fragmented tray icon buttons:** Rendering Wi-Fi, CRT, and Volume as separate tiny buttons scattered hardware controls and created ambiguous click targets. Grouping Wi-Fi, Display/CRT, Volume, and Battery into one Control Center button gives all quick hardware controls a single logical entry point.
- **Clock-to-Quick-Settings redirect:** Clicking a taskbar clock and date is expected to reveal a calendar and notifications rather than hardware quick settings. Routing the combined Date/Time + Bell button to a stacked Notifications-over-Calendar flyout aligns taskbar interaction with standard desktop ergonomics.
- **Standalone fixed notification drawer:** Positioning notifications independently of the calendar caused awkward layout isolation and lacked date lookup. Mounting both cards inside a unified stacked container guarantees consistent spacing, single-action dismissal, and reliable positioning for both bottom and top taskbar docking.

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
