<div align="center">

# AngelOS-web (`Angel-OS`)

**An installable, AI-powered Windows 11 & Windows 10/95-hybrid operating system that runs right in your browser.**

🌐 **[Launch AngelOS-web Live on GitHub Pages →](https://michaelsweet612.github.io/Angel-OS/)** · 📦 **[Download Portable Offline Bundle (.ZIP) →](https://github.com/michaelsweet612/Angel-OS/raw/gh-pages/downloads/Angel-OS-v1.8.0-portable-web.zip)** · 🏷️ **[Releases](https://github.com/michaelsweet612/Angel-OS/releases)**

Built with TypeScript, Express, Vite PWA, Web Audio API synthesis, WebRTC MediaDevices (Camera & Microphone), 16-bit x86 Assembly, Python 3, Bash/PowerShell physical installers, and the Google Gemini API.

> **Personal Use Only:** You are welcome to download and run Angel-OS locally for your own personal use. Republishing, redistributing, or re-hosting copies is not permitted without written permission (see [`LICENSE`](./LICENSE)).

</div>

---

## Download & Play Locally

1. **Play Immediately in Your Browser:** Open **[https://michaelsweet612.github.io/Angel-OS/](https://michaelsweet612.github.io/Angel-OS/)** (**AngelOS-web**).
2. **Download Prebuilt Offline Bundle (`.zip`):** Download **[`Angel-OS-v1.8.0-portable-web.zip`](https://github.com/michaelsweet612/Angel-OS/raw/gh-pages/downloads/Angel-OS-v1.8.0-portable-web.zip)** (or browse **[GitHub Releases](https://github.com/michaelsweet612/Angel-OS/releases)**), unzip it, and run `npx serve .` or `python3 -m http.server 3000` inside the extracted folder to run AngelOS-web locally for personal use. Includes the **`physical-booter/`** bare-metal toolchain.
3. **Download Full Source Code:** Click **`<> Code` → `Download ZIP`** on GitHub (or `git clone`), then run `npm install && npm run dev`.

---

## Overview

**AngelOS-web** (the web edition of **Angel-OS**) recreates the tactile nostalgia of a desktop PC—complete with an interactive Award BIOS POST sequence, **Angel-OS Windows Boot Manager**, **Always-Local Account Sign-In (`C:\Users\<Name>`)**, Sound Blaster 16 synthesis, live **Camera & Microphone hardware access**, freely movable desktop/taskbar/Start apps, CRT scanlines, MS-DOS `FDISK.EXE`, InstallShield `.EXE` wizards, and a live Registry—fused with modern Windows 11/10 shell ergonomics (Snap Layouts, Virtual Desktops, Universal Search, Copilot sidebar) and generative AI capabilities across its built-in apps.

It also includes a **Multi-Layer Physical Installation & Booter Toolkit**: you can install software inside the simulated `C:\` / `D:\` drives via Win32 `.EXE` installers, create/format/target partitions during **OS Setup**, sign in strictly with offline **Local Accounts** (never cloud logins), install Angel-OS directly onto your device as an offline-capable **Progressive Web App (PWA)**, or export & build genuine hardware-bootable **`.ISO`** (`El Torito` x86), **raw MBR-partitioned USB/HDD `.IMG`** (`ANGELOS_USB_DISK.img`), and Linux/Windows host booter scripts (`physical-booter/`).

---

## Key Features

### Boot Sequence, Windows Boot Manager, Always-Local Sign-In & Physical Booter
- **Interactive Award Modular BIOS v4.51PG (`POST`)**: Hardware memory check, IDE drive detection (`QUANTUM FIREBALL 1995MB`), Sound Blaster 16 DSP init, and keyboard boot hotkeys (`ENTER`/`SPACE`, `DEL`/`F2`, `F8`, `F9`, `ESC`).
- **Angel-OS Windows Boot Manager**: Selectable boot menu appearing after POST (with pauseable 5-second countdown & keyboard navigation) letting you boot into **Angel-OS Hybrid**, **Safe Mode & Diagnostics**, **Windows-Style Partition Options & OS Setup (`SETUP.EXE`)**, **Physical Hardware Booter**, or **CMOS BIOS Setup**.
- **Always-Local Account Sign-In & Lock Screen (`Local Account Always`)**: Offline-first Windows sign-in screen stored locally under `C:\Users\<Username>` and browser `localStorage`—zero cloud authentication required. Supports optional local password/PIN verification, instant user switching chips, inline `+ New Local Account` creation, clickable Start profile pill, and Start Power → `Lock / Switch Local Account`.
- **CMOS BIOS Setup Utility (5,120+ Registers + Bulk Select / Activate / Deactivate)**: Configure CPU model (`486DX2 66MHz` through `Pentium II 400MHz`), Turbo toggle, **RAM Allocation Mode** (`Auto-Detect Host PC RAM`, `Limited Pool 16–4,096 MB`, or `Custom Manual MB`), Performance Level presets, Cooling Fan curves, live Vcore/Temp/RPM telemetry, Quick POST, boot priority, Audio DSP, CRT scanlines, `FAT16`/`FAT32` file system, and **5,120+ dormant firmware registers** with **per-row selection checkboxes**, **`Select View` / `Select All 5,120` / `Clear`**, **`Activate Selected` / `Deactivate Selected`**, **`Activate ALL 5,120` (`F6`)**, and **`Deactivate ALL` (`F7`)** controls.
- **MS-DOS `FDISK.EXE` Partitioner & Windows-Style Partition Options (`SETUP.EXE`)**: Create, resize, format, or set Active Primary `C:\` and Logical `D:\` partitions inside either MS-DOS `FDISK` or the modern blue-screen **OS Setup Partition Table**, choose `FAT16`/`FAT32` and Bootloader Mode, and provision your initial Local Account before Express Repair or Clean Factory Install.
- **Physical Hardware Booter (`physical-booter/` + In-OS Booter Modal)**: Multi-language bare-metal toolkit written in **16-bit x86 Assembly (`angel_booter.S` / `angel_booter.bin`)**, **Python 3 (`build_physical_booter.py`)**, **Bash + systemd + GRUB2 (`install_angelos_linux.sh`)**, **PowerShell (`Install-AngelOS-Windows.ps1`)**, and **Batch (`Flash-AngelOS-USB.bat`)**—plus one-click browser exports for bootable `64 KB` **ISO-9660/El Torito `.ISO`** and `16 MB` raw MBR-partitioned **`ANGELOS_USB_DISK.img`** images ready for USB flashing (Rufus / BalenaEtcher / `dd`), QEMU, or VirtualBox.
- **Web Audio Lo-Fi Synth Engine (`RetroSoundEngine`)**: Synthesizes the BIOS POST beep, floppy seek clicks, V.90 56k dial-up modem handshakes, window chimes, and an ambient Brian Eno-inspired startup pad with tape saturation and adjustable DAC bit depth (`4`/`8`/`12`/`16`-bit).

### Built-In Applications, Hardware Access & Movable Desktop Shell
- **Camera App (`CAMERA.EXE`) & Hardware Access Permissions (`Camera` + `Microphone`)**:
  - Dedicated **Camera & Microphone Access Permissions** dialog (`#media-perm-modal`), Quick Settings tiles, and in-app permission buttons trigger real browser `navigator.mediaDevices.getUserMedia` requests with live status badges and one-click hardware release.
  - **Camera App** features live webcam viewfinder, camera & microphone device selection, live mic VU meter, 7 real-time filters (*Normal*, *CRT 95*, *B&W Noir*, *1995 Sepia*, *Matrix Green*, *Vaporwave*, *Thermal Vision*), mirror flip, **📸 Take Photo** (saves PNG directly to `C:\Pictures` + downloadable filmstrip), **⏺ Record Video** (`.webm` capture with mic audio), and an offline **Test Pattern** fallback mode.
  - **Sound Studio (`SNDREC32.EXE`)** adds live **Microphone Access**, real-time live voice waveform rendering on the oscilloscope, microphone clip recording/playback, and `.webm` / 16-bit `.WAV` downloads.
- **Freely Movable Apps & Customizable Layout**:
  - Drag and drop **Desktop App Icons** freely anywhere on the desktop (mouse & touch) with persistent saved positions, optional **Snap-to-Grid** toggle, and **Auto-Arrange / Reset App Icons** in the desktop right-click menu.
  - Drag and reorder **Taskbar App Buttons** and **Start Menu Pinned Tiles** directly, and move application windows with both mouse and touch dragging.
- **Ability to Install (Dual-Mode Installer)**:
  - **Way 1 — `.EXE` Setup Files & Portable App**: Drop or run `*_SETUP.EXE` packages in `C:\Downloads`, browse the built-in **Tucows 95 Shareware Depot**, unpack `MZ 0x5A4D` self-extracting cabinets, walk through the 5-step **InstallShield 95 Wizard**, or download a portable `.HTML` (with embedded Registry snapshot) / `.BAT` desktop launcher.
  - **Way 2 — Physical OS & Hardware Boot Media**: Open the **Physical Hardware Booter**, install as a standalone offline **PWA**, lock hardware fullscreen, download raw USB `.IMG` (`ANGELOS_USB_DISK.img`), El Torito `.ISO` (`ANGELOS_BOOTCD.ISO`), or native Linux/Windows installer scripts.
- **Old Java Creator 1995 — Powered by Billy AI (`OLDJAVA95_SETUP.EXE` / `OLDJAVA.EXE`)**: Installable directly from **Ability to Install** into `C:\JDK1995`; pairs a retro 1995 Java-from-scratch IDE, Trash `javac 0.01a` compiler, and fake JVM crash console with **Billy AI**—an intentionally clueless tiny AI agent who invents broken Java syntax on purpose, breaks code further when asked to fix it, tracks a **10-interaction progression arc (`0 / 10` → `10 / 10`)**, unlocks **🏆 ULTRA TRASH MODE (`JDK -0.5`)** and the **`10 Rounds with Billy`** Trophy (`+30 pts`), and exports `.java` files to `C:\Documents` or your host computer.
- **Hockey Cards 95 — McGee & Obliterate Edition (`HOCKEY95.EXE`)**: Retro 1995 collectible hockey card pack ripper, binder, and card obliterator starring **Thomas Mamas McGee**, **Thomas**, **Thomas Robins**, **Obliterate McGee**, and infinite procedurally named **McGee Clan** & **Obliterate Squad** players—rendered via HTML5 Canvas with deliberately non-4K, goofy, asymmetrical cartoon facial features (lumpy/cubic heads, mismatched googly/spiral eyes, missing hockey teeth + gold teeth, neon mullets, lopsided helmets, flying pucks, and `🚫 NOT 4K · 144p` stamps), 5-card foil booster packs, face mutation, **💥 OBLITERATE CARD!** comic shatter mode, `C:\Pictures` / `.PNG` export, and the **`McGee Card Obliterator`** Trophy (`+25 pts`).
- **Performance & Adjustment Levels (`PERFLEVELS.EXE`)**: Available inside **Ability to Install** (`PERFADJ95_SETUP.EXE`) and integrated directly with **CMOS BIOS Setup**; detects host CPU threads, platform, WebGL GPU, physical RAM (`navigator.deviceMemory` / JS heap), network, and battery status, lets you switch between **Auto-Detect**, **Limited (`16`–`4,096 MB`)**, and **Custom** RAM pools, tune CPU clock scaling, core voltage, and TDP limits, toggle individual **CPU / Intake / Exhaust / GPU cooling fans** (including `0 RPM` passive thermal tests), and monitor real-time die/VRM temperatures (`°C`/`°F`).
- **Multi-Engine Web Browser**: Multi-tab browser supporting three swappable/reinstallable engines (**Netscape Navigator 95 Gold**, **Microsoft Internet Explorer 3.0**, **Google Chrome**), **✨ AI Web Synthesis** (`1996`, `2001`, or `modern` eras), **🌐 Live URL** iframe browsing, local `file:///C:/` HTML/text viewing, simulated modem speeds (`14.4k` to `T1 1.0 Mbps`), bookmarks, and a live **HTML Source Inspector & Editor**.
- **My Gemtop (`Explorer`)**: Virtual file system across `C:\` (`Downloads`, `Documents`, `Pictures`, `System95`, `Users\<Account>`) and `D:\` (`Installers`) with live disk usage tracking.
- **GemNotes**: Retro word processor with `C:\Documents` saving, live word/character counter, and streaming AI tools (`Twist Story`, `Continue`, `90s Zine`, `ASCII Art`).
- **GemPaint 95**: 16-color pixel canvas with brush, airbrush spray, flood-fill bucket, shapes, eraser, 15-step undo, drawing prompts, PNG saving to `C:\Pictures`, and **Clippy / Robot AI Art Critic** multimodal canvas critiques.
- **Gemini AIM (Instant Messenger)**: Chat with 1995 personas (`SmarterChild_95`, `ZeroCool_1337`, `Clippy_Pro`, `Win95_Guru`), trigger quick prompts, and save chat transcripts to GemNotes.
- **GemSweeper Deluxe**: Classic Minesweeper (`9×9`, `12×12`, `14×16`) with chord-clicking, timer/flag counters, and AI tactical hints.
- **GemPlayer 95 (5,009-Track Mega Chiptune Jukebox & Retro TV)**: 4-channel Web Audio synthesizer (lead + celesta shimmer + harmony + bass + retro drums) with **9 hand-crafted Featured Themes** (*Mario Theme Music*, *Legend of Z Intro*, *Hello Neighbor Chase Music*, *Big Boy Jim Boss Battle Music*, *Harry Potter Theme Music*, *Canyon.mid*, *CyberWave 95*, *DOOM Boss Riff*, *Teal Desktop Dreams*) plus a searchable, paginated **5,000-track Random Music Library** (`#0001`–`#5000`, each with a unique procedural name, key, BPM, genre, and melody), **`🎲 Random (1–5000)`**, **`🔦 Random Chase Mix`** (random surprise jumps including Hello Neighbor Chase / Big Boy Jim Boss ambushes), **Auto-Shuffle**, dynamic spectrum visualizer, live BPM/volume sliders, and **YouTube Retro CRT TV** playback.
- **MS-DOS Prompt (`COMMAND.COM`)**: Supports built-in commands (`HELP`, `DIR`, `HOCKEY`, `MCGEE`, `OBLITERATE`, `JAVA`, `OLDJAVA`, `JAVAC`, `BILLY`, `CAMERA`, `WEBCAM`, `MIC`, `PERMISSIONS`, `FDISK`, `ISO`, `USBBOOT`, `BOOTER`, `SIGNIN`, `LOCK`, `SWITCHUSER`, `INSTALL`, `SETUP`, `PERF`, `PERFLEVELS`, `RAM`, `FANS`, `*.EXE`, `SYSINFO`, `SETTINGS`, `REGEDIT`, `BIOS`, `MATRIX`, `COLOR`/`PHOSPHOR`, `CLS`, `CHIME`, `OPEN <APP>`) plus natural-language queries handled by the `GEMINI.SYS` AI DOS Kernel.
- **DOOM II**: Protected-mode MS-DOS DOOM II embed (`js-dos`).
- **Master System Settings & Control Panel (`CONTROL.EXE`)**: 8-tab configuration suite covering **Display & CRT**, **Windows & Fonts**, **Taskbar & Snap**, **Sound DSP**, **Browser & Modem**, **CPU, RAM & Power**, **Boot, Accounts, Install & Physical Booter**, and **Registry & BIOS**—including 7 built-in themes (*Standard Teal*, *Hot Dog Stand*, *Cyberpunk*, *Vaporwave*, *Matrix*, *Win 3.1*, *High Contrast*), custom hex palettes, CRT scanline/calibration sliders, idle screensavers (*3D Starfield* / *Matrix*), and `.REG` JSON import/export.
- **Registry Editor (`REGEDIT.EXE`)**: Hierarchical live editor for 60+ `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE` keys with instant search and `REGEDIT4` file export to `C:\System95`.
- **System Resource Monitor (`SYSMON.EXE`)**: Installable real-time plotter for CPU, effective Auto/Limited/Custom RAM, `WIN386.SWP` paging file, temperatures, fans, and modem throughput.

### Windows 11-Inspired Shell Extensions
- **Snap Layouts 95**: Hover any window's maximize (`□`) button to snap into 50/50 split, 3-column, main+stack, or 4-quadrant grids.
- **Task View & Virtual Desktops**: Switch between 3 isolated workspaces (*Main 95*, *Cyber Lab*, *Arcade Zone*) and auto-tile or cascade windows.
- **Widgets Board 95**: Doppler Weather, NASDAQ 1995 Tech Ticker, Focus Session Pomodoro timer, and AI-refreshable 1995 news wire.
- **Universal Search & Command Palette**: Filter apps, `C:\`/`D:\` files, and system actions, or forward queries to Copilot 95.
- **Windows Copilot 95**: Docked AI sidebar that answers questions and executes local OS commands (tiling windows, toggling centered taskbar or Night Light, cycling themes, launching the synth).
- **Quick Settings & Taskbar Customization**: Classic left or Windows 11 centered taskbar, top/bottom docking, auto-hide, Night Light 95 amber filter, and live CRT brightness control.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend Shell** | TypeScript (`~5.8`), HTML5, CSS3, Tailwind CSS v4 (`@tailwindcss/browser`), HTML5 Canvas, Web Audio API |
| **Build & PWA** | Vite 6 (`vite-plugin-pwa`, Workbox Service Worker) |
| **Server & AI Proxy** | Node.js, Express 4, `tsx`, `@google/genai` (`server.ts` + `genaiProxy.ts`) |

---

## Getting Started

### Prerequisites
- **Node.js** (v20+ recommended; verified on Node v24) and **npm** (or [Bun](https://bun.sh/))
- A **Google Gemini API key** (`GEMINI_API_KEY` or `API_KEY`) for AI-powered features (AI Web Synthesis, GemNotes AI, GemPaint Critic, Gemini AIM, Copilot 95, DOS AI Kernel, GemSweeper Hints, and News Wire).  
  > Core OS functionality—BIOS, CMOS, FDISK, Paint, Minesweeper, Chiptune Synth, Live URL mode, Control Panel, Registry Editor, PWA installation, and `.ISO` export—runs locally without an API key.

### Installation

```bash
git clone https://github.com/michaelsweet612/Angel-OS.git
cd Angel-OS
npm install
```

### Running in Development

Set your Gemini API key and start the Express + Vite middleware server:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
npm run dev
```

By default the server listens on `http://0.0.0.0:3000` (override with `PORT=<port>`).

### Type-Checking & Production Build

```bash
# Run TypeScript compiler check
npm run lint

# Build production bundle & PWA Service Worker into dist/
npm run build

# Serve production build
export GEMINI_API_KEY="your-gemini-api-key"
npm start
```

---

## Project Structure

```text
Angel-OS/
├── index.html          # OS desktop DOM, BIOS/BootMgr/Sign-In/FDISK/Setup/Booter overlays & Win11 panels
├── index.css           # Win95 3D bevel styling, themes, CRT scanlines, and Win11 shell layouts
├── index.ts            # Main OS kernel, Boot Manager controller, window manager, VFS & Win11 controllers
├── osSystemCore.ts     # SystemRegistry schema, LocalUserAccount store, package catalog & partition state
├── osHardwarePerf.ts   # Host hardware auto-detect, Auto/Limited/Custom RAM modes & fan/thermal engine
├── osPhysicalBooter.ts # Windows Boot Manager helper, Always-Local Sign-In, Partition Setup & Booter modal
├── osMediaDevices.ts   # Real Camera & Microphone permission manager, Camera App (CAMERA.EXE) & live mic capture
├── osOldJavaCreator.ts # Old Java Creator 1995 IDE, clueless Billy AI agent, 10-interaction arc & Trash JVM
├── osGemPlayerLibrary.ts # GemPlayer 95 Mega Jukebox (9 featured themes + 5,000 unique procedural random tracks)
├── osHockeyCards.ts    # Hockey Cards 95 (McGee & Obliterate Edition) non-4K procedural player card engine & binder
├── osExtendedApps.ts   # Multi-engine browser, InstallShield 95, 8-tab Control Panel, REGEDIT, SYSMON & BIOS
├── osDualInstall.ts    # .EXE SFX runner, Tucows depot, FDISK, ISO-9660/El Torito & Raw USB .IMG builders
├── osMegaFeatures.ts   # Classic Win95 accessories, Arcade games, Run dialog & MegaBridge shell API
├── osBios5000.ts       # 5,120+ dormant CMOS BIOS firmware registers & live hardware hooks
├── physical-booter/    # Real multi-language physical hardware booter (16-bit x86 ASM, Python, Bash, PS1, BAT)
├── genaiProxy.ts       # Browser-side proxy client mirroring @google/genai over /api/*
├── server.ts           # Express server, Gemini API endpoints & Vite dev/static serving
├── public/             # PWA icons & Windows logo asset
├── vite.config.ts      # Vite + VitePWA Workbox manifest & GitHub Pages subpath config
├── tsconfig.json       # TypeScript configuration
├── metadata.json       # App metadata & capabilities
├── LICENSE             # Personal Use Only License (No Republication / Redistribution)
├── CODE_OF_CONDUCT.md  # Community behavioral guidelines (Contributor Covenant v2.1)
├── CONTRIBUTING.md     # Local setup, PR workflow, licensing terms & AGENTS.md release rules
├── AGENTS.md           # Repository release and changelog policy
├── .github/            # GitHub Issue templates & Pull Request changelog template
└── package.json        # Scripts & dependencies
```

---

## Community & Governance

- **[Code of Conduct](./CODE_OF_CONDUCT.md)** — Community participation standards and maintainer enforcement guidelines.
- **[Contributing Guide](./CONTRIBUTING.md)** — Local build/lint workflow, Pull Request structure, and [AGENTS.md](./AGENTS.md) mandatory changelog policy.
- **[Personal Use License](./LICENSE)** — Terms for personal local execution and no-republication protections.

---

## License

Angel-OS is governed by the **[Angel-OS Personal Use License](./LICENSE)**:

- **Allowed:** You may download, clone, build, and run Angel-OS locally for **personal, non-commercial use**.
- **Not Allowed:** You may **not** republish, redistribute, mirror, publicly re-host, sell, or distribute modified/unmodified versions without prior written permission from the copyright holder (`michaelsweet612`).
- Third-party libraries remain under their own respective open-source licenses, and any original template scaffolding files carrying an `Apache-2.0` SPDX header remain subject to their respective template notices where applicable.

