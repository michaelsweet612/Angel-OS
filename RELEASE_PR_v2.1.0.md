# Pull Request — Angel OS v2.1.0 (Taskbar Overhaul, Win95 Control Center, Stacked Notifications + Calendar & Release Packaging)

> **Branch name suggestion:** `release/v2.1.0`  
> **Release tag:** `v2.1.0`  
> **Downloadable artifact:** `releases/Angel-OS-v2.1.0-portable-web.zip`

---

## Summary
Consolidates the Angel OS v2.0.x–v2.1.0 shell, account, software catalog, and taskbar system tray upgrades into release **v2.1.0**, paired with an automated portable `.ZIP` release packager, live Express `/downloads/:filename` distribution route, and GitHub Actions release pipeline.

## Added
- **Unified System Tray Architecture (`index.html`, `index.css`, `index.ts`, `osExtendedApps.ts`):**
  - Combined Wi-Fi, Display/CRT, Volume, and Battery indicators into one raised beveled **Control Center** tray button (`#tray-qs-btn`) with live audio mute, Wi-Fi off slash, CRT dim, and Battery Status API telemetry.
  - Combined live taskbar time/date with the notification bell and unread badge inside one unified **Date/Time + Bell** button (`#tray-datetime-notif-btn`) at the right edge of the tray.
- **Stacked Notifications + Interactive Mini Calendar Flyout (`#tray-calendar-notif-flyout`):**
  - Clicking the Date/Time + Bell button opens two distinct stacked cards anchored above the taskbar (or below when top-docked): **Notifications** on top (with live count, Clear All, and empty state) directly above an interactive **Mini Calendar** card (month navigation, today highlight, date selection, Today jump button, and **Open Calendar** app shortcut).
- **Windows 95 Unified Control Center Flyout (`#win11-quick-settings`):**
  - Rebuilt with authentic Windows 95 window bevels, etched `fieldset`/`legend` groupboxes, sunken navy active toggles, and a recessed power status bar.
  - Added dedicated **Wi-Fi**, **Display / CRT**, **Volume** (with master volume slider & percentage readout), and **Battery** (live charge readout & Battery Saver power toggle) controls alongside Brightness and desktop quick toggles.
- **Dev Cache & Stale Service Worker Auto-Purge (`server.ts`, `vite.config.ts`, `osDualInstall.ts`):**
  - Disabled dev-mode PWA precaching, added `Cache-Control: no-store` headers and self-unregistering `/dev-sw.js` cleanup in dev mode, and enabled Workbox `cleanupOutdatedCaches`, `skipWaiting`, and `clientsClaim` for production builds.
- **Automated Portable Release Packaging & Download Pipeline (`scripts/build-release-zip.mjs`, `server.ts`, `.github/workflows/release.yml`, `index.html`, `osMegaFeatures.ts`):**
  - Added `npm run release:zip` and `npm run release:build` to package `dist/`, `physical-booter/`, `java/` + `java-src/`, `LICENSE`, `CHANGELOG.md`, and `OFFLINE_QUICKSTART.txt` into `releases/Angel-OS-v2.1.0-portable-web.zip`.
  - Added a hardened `/downloads/:filename` Express endpoint (strict filename allow-list + attachment headers) and a direct **Download v2.1.0 (.ZIP)** button inside the About Angel OS (`WINVER`) modal.
  - Added `.github/workflows/release.yml` to automatically build, zip, extract `CHANGELOG.md` notes, and publish GitHub Releases with downloadable `.ZIP` artifacts on `v*.*.*` tags or manual dispatch.

## Removed
- **Fragmented individual system tray buttons (`#tray-notif-btn`, `#tray-crt-btn`, `#tray-sound-btn`) and orphaned `#tray-notif-btn` CSS rules.**
- **Legacy clock-to-Quick-Settings click redirect (`#tray-clock` forwarding clicks to `#tray-qs-btn`).**
- **Standalone unstacked `#notif-drawer` fixed drawer and flat ungrouped emoji Quick Settings grid.**
- **Development-mode Workbox Service Worker caching (`devOptions.enabled: true` in `vite.config.ts`).**
- **Stale `v1.9.0` portable download URLs in `README.md`.**

## Why Removed
- **Fragmented tray buttons & clock redirect:** Splitting Wi-Fi, CRT, and Volume into tiny separate targets and routing clock clicks to Quick Settings contradicted standard desktop taskbar muscle memory. Grouping all hardware icons into one Control Center trigger and placing the Notification Bell beside Date/Time to open Notifications + Calendar makes the tray logical and predictable.
- **Flat emoji Quick Settings grid:** The legacy panel lacked Wi-Fi, Battery, and Volume slider controls and did not reflect the four hardware icons shown in the tray button or the Windows 95 groupbox aesthetic.
- **Dev-mode Workbox Service Worker caching:** Precaching assets in development caused browsers to serve stale HTML snapshots across updates. Limiting Service Worker registration to production builds while purging stale dev workers guarantees fresh live previews.
- **Stale `v1.9.0` README links:** Outdated links pointed users to an older pre-v2 archive lacking the 500-app store, per-user saves, and redesigned taskbar/Control Center.

## Verification
- [x] `npm run lint` (`tsc --noEmit`) passed with zero errors
- [x] Production build (`npm run build`) succeeded
- [x] Portable offline bundle (`npm run release:zip`) generated and verified at `releases/Angel-OS-v2.1.0-portable-web.zip`
- [x] Live `/downloads/Angel-OS-v2.1.0-portable-web.zip` HTTP attachment download verified on port 3000
- [x] Complies with `AGENTS.md` release policy and `LICENSE` (Personal Use Only)

---

### Quick GitHub Publish Commands (Run After Pushing/Syncing Workspace)
```bash
git checkout -b release/v2.1.0
git add .
git commit -m "Release v2.1.0: Unified Win95 Control Center, stacked Notifications + Calendar & portable bundle"
git push -u origin release/v2.1.0
# Open PR on GitHub using this file as the PR description, merge into main, then publish tag:
git checkout main && git pull
git tag -a v2.1.0 -m "Angel OS v2.1.0"
git push origin v2.1.0
```
