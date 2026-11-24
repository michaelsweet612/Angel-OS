<div align="center">

# Angel-OS (`Remix Gemini 95`)

**An installable, AI-powered Windows 11 & Windows 10/95-hybrid operating system that runs right in your browser.**

🌐 **[Launch Angel-OS Live on GitHub Pages →](https://michaelsweet612.github.io/Angel-OS/)** · 📦 **[Download Latest Release (.ZIP) →](https://github.com/michaelsweet612/Angel-OS/releases)**

Built with TypeScript, Express, Vite PWA, Web Audio API synthesis, and the Google Gemini API.

> **Personal Use Only:** You are welcome to download and run Angel-OS locally for your own personal use. Republishing, redistributing, or re-hosting copies is not permitted without written permission (see [`LICENSE`](./LICENSE)).

</div>

---

## Download & Play Locally

1. **Play Immediately in Your Browser:** Open **[https://michaelsweet612.github.io/Angel-OS/](https://michaelsweet612.github.io/Angel-OS/)**.
2. **Download Prebuilt Offline Bundle (`.zip`):** Download **`Angel-OS-v1.1.0-portable-web.zip`** from the **[GitHub Releases page](https://github.com/michaelsweet612/Angel-OS/releases)**, unzip it, and run `npx serve .` or `python3 -m http.server 3000` in that folder to run Angel-OS locally.
3. **Download Full Source Code:** Click **`<> Code` → `Download ZIP`** on GitHub (or `git clone`), then run `npm install && npm run dev`.

---

## Overview

**Angel-OS** (codenamed **Remix Gemini 95** inside the shell) recreates the tactile nostalgia of a 1995 desktop PC—complete with an interactive Award BIOS POST sequence, Sound Blaster 16 synthesis, CRT scanlines, MS-DOS `FDISK.EXE`, InstallShield `.EXE` wizards, and a live Registry—fused with modern Windows 11 shell ergonomics (Snap Layouts, Virtual Desktops, Universal Search, Copilot sidebar) and generative AI capabilities across its built-in apps.

It also includes a **Dual-Mode Installation Architecture**: you can install software inside the simulated `C:\` drive via Win32 `.EXE` installers, export a portable standalone HTML/BAT desktop launcher, install Angel-OS directly onto your device as an offline-capable **Progressive Web App (PWA)**, or generate and download a real **16-bit x86 El Torito Bootable CD-ROM (`.ISO`)** image.

---

## Key Features

### Boot Sequence, Firmware & Bare-Metal Disk Tools
- **Interactive Award Modular BIOS v4.51PG (`POST`)**: Hardware memory check, IDE drive detection (`QUANTUM FIREBALL 1995MB`), Sound Blaster 16 DSP init, and keyboard boot hotkeys:
  - `ENTER` / `SPACE` — Power on and boot with synthesized audio
  - `DEL` / `F2` — Enter the **CMOS BIOS Setup Utility**
  - `F8` — Boot CD-ROM into **OS Setup (`SETUP.EXE`)**
  - `F9` — Launch **MS-DOS `FDISK.EXE`**
  - `ESC` — Skip boot sequence straight to the desktop
- **CMOS BIOS Setup Utility**: Configure CPU model (`486DX2 66MHz` through `Pentium II 400MHz`), Turbo toggle, EDO/SDRAM capacity (`16`–`256 MB`), Quick POST, boot priority (`C, A, CDROM` / `A, C, CDROM` / `CDROM, C, A`), Audio DSP, CRT scanlines, and `FAT16`/`FAT32` file system—synced directly with `HKLM\Hardware\BIOS`.
- **MS-DOS `FDISK.EXE` Partitioner**: Create, resize, or delete Primary `C:\` and Logical `D:\` partitions, toggle the `Active` boot flag, run `FORMAT C: /S`, and write or wipe the `0x55AA` Master Boot Record (`FDISK /MBR`) to test real BIOS boot halting.
- **Full Blue-Screen OS Reinstaller (`SETUP.EXE`)**: Perform an **Express In-Place Repair** (preserves `C:\Documents` and `C:\Pictures`) or a **Clean Format `C:\` Factory Reinstall** with selectable bundled browser engines.
- **Web Audio Lo-Fi Synth Engine (`RetroSoundEngine`)**: Synthesizes the BIOS POST beep, floppy seek clicks, V.90 56k dial-up modem handshakes, window chimes, and an ambient Brian Eno-inspired startup pad with tape saturation and adjustable DAC bit depth (`4`/`8`/`12`/`16`-bit).

### Built-In Applications & Utilities
- **Ability to Install (Dual-Mode Installer)**:
  - **Way 1 — `.EXE` Setup Files & Portable App**: Drop or run `*_SETUP.EXE` packages in `C:\Downloads`, browse the built-in **Tucows 95 Shareware Depot**, unpack `MZ 0x5A4D` self-extracting cabinets, walk through the 5-step **InstallShield 95 Wizard**, or download a portable `.HTML` (with embedded Registry snapshot) / `.BAT` desktop launcher.
  - **Way 2 — Physical OS Install & Media Export**: Install as a standalone offline **PWA**, lock hardware fullscreen, or export a real 64 KB **ISO-9660 + El Torito x86 Bootable `.ISO`** (`GEMINI95_BOOTCD.ISO`) containing an x86 real-mode boot sector at `0x7C00`, `AUTORUN.INF`, `README.TXT`, and `REGISTRY.JSON` (testable in QEMU via `qemu-system-i386 -cdrom <LABEL>_BOOTCD.ISO`).
- **Multi-Engine Web Browser**: Multi-tab browser supporting three swappable/reinstallable engines (**Netscape Navigator 95 Gold**, **Microsoft Internet Explorer 3.0**, **CyberChrome 95 Turbo**), **✨ AI Web Synthesis** (`1996`, `2001`, or `modern` eras), **🌐 Live URL** iframe browsing, local `file:///C:/` HTML/text viewing, simulated modem speeds (`14.4k` to `T1 1.0 Mbps`), bookmarks, and a live **HTML Source Inspector & Editor**.
- **My Gemtop (`Explorer`)**: Virtual file system across `C:\` (`Downloads`, `Documents`, `Pictures`, `System95`) and `D:\` (`Installers`) with live disk usage tracking.
- **GemNotes**: Retro word processor with `C:\Documents` saving, live word/character counter, and streaming AI tools (`Twist Story`, `Continue`, `90s Zine`, `ASCII Art`).
- **GemPaint 95**: 16-color pixel canvas with brush, airbrush spray, flood-fill bucket, shapes, eraser, 15-step undo, drawing prompts, PNG saving to `C:\Pictures`, and **Clippy / Robot AI Art Critic** multimodal canvas critiques.
- **Gemini AIM (Instant Messenger)**: Chat with 1995 personas (`SmarterChild_95`, `ZeroCool_1337`, `Clippy_Pro`, `Win95_Guru`), trigger quick prompts, and save chat transcripts to GemNotes.
- **GemSweeper Deluxe**: Classic Minesweeper (`9×9`, `12×12`, `14×16`) with chord-clicking, timer/flag counters, and AI tactical hints.
- **GemPlayer 95**: 4-track 16-bit Web Audio FM Chiptune Synthesizer (`Canyon.mid`, `CyberWave 95`, `DOOM Boss Riff`, `Teal Desktop Dreams`) with a live spectrum visualizer and tempo control, plus **YouTube Retro CRT TV** playback.
- **MS-DOS Prompt (`COMMAND.COM`)**: Supports built-in commands (`HELP`, `DIR`, `FDISK`, `ISO`, `INSTALL`, `SETUP`, `*.EXE`, `SYSINFO`, `SETTINGS`, `REGEDIT`, `BIOS`, `MATRIX`, `COLOR`/`PHOSPHOR`, `CLS`, `CHIME`, `OPEN <APP>`) plus natural-language queries handled by the `GEMINI.SYS` AI DOS Kernel.
- **DOOM II**: Protected-mode MS-DOS DOOM II embed (`js-dos`).
- **Master System Settings & Control Panel (`CONTROL.EXE`)**: 8-tab configuration suite covering **Display & CRT**, **Windows & Fonts**, **Taskbar & Snap**, **Sound DSP**, **Browser & Modem**, **CPU, RAM & Power**, **Install & OS Setup**, and **Registry & BIOS**—including 7 built-in themes (*Standard Teal*, *Hot Dog Stand*, *Cyberpunk*, *Vaporwave*, *Matrix*, *Win 3.1*, *High Contrast*), custom hex palettes, CRT scanline/calibration sliders, idle screensavers (*3D Starfield* / *Matrix*), and `.REG` JSON import/export.
- **Registry Editor (`REGEDIT.EXE`)**: Hierarchical live editor for 50+ `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE` keys with instant search and `REGEDIT4` file export to `C:\System95`.
- **System Resource Monitor (`SYSMON.EXE`)**: Installable real-time plotter for CPU, RAM, `WIN386.SWP` paging file, and modem throughput.

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
├── index.html          # OS desktop DOM, BIOS/CMOS/FDISK/Setup overlays, app windows & Win11 panels
├── index.css           # Win95 3D bevel styling, themes, CRT scanlines, and Win11 shell layouts
├── index.ts            # Main OS kernel, window manager, VFS, RetroSoundEngine, apps & Win11 controllers
├── osSystemCore.ts     # SystemRegistry schema, software package catalog, partition state & defaults
├── osExtendedApps.ts   # Multi-engine browser, InstallShield 95, 8-tab Control Panel, REGEDIT, SYSMON & BIOS
├── osDualInstall.ts    # .EXE SFX runner, Tucows depot, Portable exporter, FDISK, ISO-9660/El Torito builder & PWA
├── osBios5000.ts       # 5,120+ dormant CMOS BIOS firmware registers & live hardware hooks
├── genaiProxy.ts       # Browser-side proxy client mirroring @google/genai over /api/*
├── server.ts           # Express server, Gemini API endpoints & Vite dev/static serving
├── public/             # PWA icons & Windows logo asset
├── vite.config.ts      # Vite + VitePWA Workbox manifest & GitHub Pages subpath config
├── tsconfig.json       # TypeScript configuration
├── metadata.json       # App metadata & capabilities
├── LICENSE             # Personal Use Only License (No Republication / Redistribution)
├── AGENTS.md           # Repository release and changelog policy
└── package.json        # Scripts & dependencies
```

---

## License

Angel-OS is governed by the **[Angel-OS Personal Use License](./LICENSE)**:

- **Allowed:** You may download, clone, build, and run Angel-OS locally for **personal, non-commercial use**.
- **Not Allowed:** You may **not** republish, redistribute, mirror, publicly re-host, sell, or distribute modified/unmodified versions without prior written permission from the copyright holder (`michaelsweet612`).
- Third-party libraries remain under their own respective open-source licenses, and any original template scaffolding files carrying an `Apache-2.0` SPDX header remain subject to their respective template notices where applicable.

