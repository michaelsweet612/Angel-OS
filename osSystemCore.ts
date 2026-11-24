/**
 * Centralized System Registry, Package Manifest & Hardware/Audio Settings Core
 * Powers Master Settings (8-Tab Control Panel), Live REGEDIT.EXE, CMOS BIOS,
 * Ability to Install (InstallShield 95), and the Multi-Engine Reinstallable Browser.
 */

export type BrowserEngineId = 'chrome' | 'netscape' | 'ie3';
export type BrowserRenderMode = 'ai' | 'live';
export type BrowserAiEra = '1996' | '2001' | 'modern';

export interface LocalUserAccount {
  username: string;
  displayName: string;
  avatar: string;
  role: 'Administrator' | 'Standard';
  password: string;
  pin: string;
  homeDir: string;
  createdAt: string;
}

export interface SystemRegistry {
  // --- Tab 1: Display, CRT & Compositor (HKCU\Control Panel\Display) ---
  themePreset: 'standard' | 'hotdog' | 'cyberpunk' | 'vaporwave' | 'matrix' | 'win31' | 'highcontrast' | 'custom';
  useCustomColors: boolean;
  desktopBgColor: string;
  windowBgColor: string;
  windowTextColor: string;
  titleActiveStart: string;
  titleActiveEnd: string;
  titleActiveText: string;
  titleInactiveBg: string;
  wallpaperPattern: 'none' | 'grid' | 'dots' | 'diagonal' | 'stars';
  crtEnabled: boolean;
  crtOpacity: number; // 10 - 100 (%)
  crtScanlinePitch: number; // 2 - 6 (px)
  brightness: number; // 55 - 125 (%)
  contrast: number; // 75 - 135 (%)
  saturation: number; // 0 - 160 (%)
  hueRotate: number; // -45 to 45 (deg)
  nightLightEnabled: boolean;
  nightLightWarmth: number; // 8 - 50 (%)

  // --- Tab 2: Window Geometry, Fonts & Desktop Shell (HKCU\Control Panel\Desktop) ---
  windowBorderWidth: number; // 1 - 6 (px)
  windowShadowSize: number; // 0 - 10 (px)
  windowCornerRadius: number; // 0 - 8 (px)
  titlebarHeight: number; // 18 - 32 (px)
  uiFontFamily: 'jakarta' | 'mono' | 'vt323' | 'serif' | 'courier';
  uiFontScale: number; // 85 - 115 (%)
  desktopIconSize: number; // 32 - 60 (px)
  doubleClickIcons: boolean;
  showWelcomeSticky: boolean;
  showClippyAssistant: boolean;

  // --- Tab 3: Taskbar, Snap & Win10/11 Hybrid Shell (HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer) ---
  taskbarCentered: boolean;
  taskbarShowLabels: boolean;
  taskbarPosition: 'bottom' | 'top';
  taskbarAutoHide: boolean;
  showSearchBtn: boolean;
  showTaskViewBtn: boolean;
  showWidgetsBtn: boolean;
  showDesktopBtn: boolean;
  showCopilotBtn: boolean;
  clock24Hour: boolean;
  clockShowSeconds: boolean;
  startButtonLabel: string;
  showStartText: boolean;
  snapLayoutsEnabled: boolean;
  snapHoverDelayMs: number; // 50 - 800

  // --- Tab 4: Sound Blaster 16 DSP & Synth (HKLM\System\CurrentControlSet\Audio) ---
  audioEnabled: boolean;
  masterVolume: number; // 10 - 150 (%)
  sfxPitchMultiplier: number; // 0.6 - 1.6
  dacBitDepth: 16 | 12 | 8 | 4;
  chimeTapeSaturation: number; // 0 - 50
  floppyMechanicalSfx: boolean;

  // --- Tab 5: Browser, Modem & Network (HKCU\Software\Browser) ---
  defaultBrowserEngine: BrowserEngineId;
  defaultBrowserMode: BrowserRenderMode;
  browserAiEra: BrowserAiEra;
  modemBaudRate: 14400 | 28800 | 56000 | 128000 | 1000000;
  playModemHandshake: boolean;
  browserShowImages: boolean;
  browserEnableScripts: boolean;
  browserHomePage: string;
  browserZoomPercent: number; // 80 - 130

  // --- Tab 6: Hardware, CPU, RAM, Performance Levels & Fans (HKLM\Hardware\Description\System) ---
  cpuModel: 'Intel 486DX2 66MHz' | 'Intel Pentium 133MHz' | 'Intel Pentium MMX 233MHz' | 'Intel Pentium II 400MHz';
  cpuTurboBoost: boolean;
  ramMode: 'auto' | 'limited' | 'custom';
  installedRamMB: 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;
  customRamMB: number;
  virtualSwapMB: 64 | 128 | 256 | 512 | 1024;
  perfProfile: 'eco' | 'balanced' | 'performance' | 'turbo' | 'custom';
  perfCpuScalePct: number; // 40 - 200 (%)
  perfVoltageMv: number; // 850 - 1450 mV
  perfPowerLimitW: number; // 15 - 350 W
  perfFanMode: 'auto' | 'silent' | 'balanced' | 'turbo' | 'manual' | 'off';
  perfFanDutyPct: number; // 0 - 100 %
  fanCpuEnabled: boolean;
  fanIntakeEnabled: boolean;
  fanExhaustEnabled: boolean;
  fanGpuEnabled: boolean;
  screensaverMinutes: 0 | 1 | 3 | 5;
  screensaverStyle: 'starfield' | 'matrix';
  fileSystemFormat: 'FAT16' | 'FAT32';

  // --- Tab 7: Dual-Path Install (.EXE Policy, FDISK Disk, Partition Target & Host OS Mode) ---
  sfxVerifyPrompt: boolean;
  autoDeleteExeAfterInstall: boolean;
  defaultExeDownloadDir: 'C:\\Downloads' | 'C:\\' | 'D:\\Installers';
  primaryPartitionSizeMB: number; // 400 - 1995 MB
  enableSecondaryDriveD: boolean;
  strictMbrBootCheck: boolean;
  isoVolumeLabel: string;
  autoFullscreenStandalone: boolean;
  selectedInstallTargetPartition: 'C:' | 'D:';
  selectedBootloaderMode: 'win_hybrid_mbr' | 'legacy_95_mbr';

  // --- Tab 8 / CMOS BIOS & Always-Local Sign-In Settings (HKLM\Hardware\BIOS) ---
  biosQuickPost: boolean;
  biosBootOrder: 'C_A_CDROM' | 'A_C_CDROM' | 'CDROM_C_A';
  biosBootAudio: boolean;
  biosNumLockOn: boolean;
  enableBootManagerOnBoot: boolean;
  requireSignInOnBoot: boolean;
  activeLocalAccount: string;
  localAccounts: LocalUserAccount[];
}

export const DEFAULT_SYSTEM_REGISTRY: SystemRegistry = {
  themePreset: 'standard',
  useCustomColors: false,
  desktopBgColor: '#008080',
  windowBgColor: '#c0c0c0',
  windowTextColor: '#000000',
  titleActiveStart: '#000080',
  titleActiveEnd: '#1084d0',
  titleActiveText: '#ffffff',
  titleInactiveBg: '#808080',
  wallpaperPattern: 'none',
  crtEnabled: true,
  crtOpacity: 85,
  crtScanlinePitch: 3,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  nightLightEnabled: false,
  nightLightWarmth: 18,

  windowBorderWidth: 2,
  windowShadowSize: 3,
  windowCornerRadius: 0,
  titlebarHeight: 22,
  uiFontFamily: 'jakarta',
  uiFontScale: 100,
  desktopIconSize: 44,
  doubleClickIcons: false,
  showWelcomeSticky: true,
  showClippyAssistant: true,

  taskbarCentered: false,
  taskbarShowLabels: false,
  taskbarPosition: 'bottom',
  taskbarAutoHide: false,
  showSearchBtn: true,
  showTaskViewBtn: true,
  showWidgetsBtn: true,
  showDesktopBtn: true,
  showCopilotBtn: true,
  clock24Hour: false,
  clockShowSeconds: false,
  startButtonLabel: 'Start',
  showStartText: false,
  snapLayoutsEnabled: true,
  snapHoverDelayMs: 120,

  audioEnabled: true,
  masterVolume: 100,
  sfxPitchMultiplier: 1.0,
  dacBitDepth: 16,
  chimeTapeSaturation: 28,
  floppyMechanicalSfx: true,

  defaultBrowserEngine: 'chrome',
  defaultBrowserMode: 'live',
  browserAiEra: '1996',
  modemBaudRate: 56000,
  playModemHandshake: true,
  browserShowImages: true,
  browserEnableScripts: true,
  browserHomePage: 'chrome://newtab',
  browserZoomPercent: 100,

  cpuModel: 'Intel Pentium 133MHz',
  cpuTurboBoost: true,
  ramMode: 'auto',
  installedRamMB: 64,
  customRamMB: 4096,
  virtualSwapMB: 128,
  perfProfile: 'balanced',
  perfCpuScalePct: 100,
  perfVoltageMv: 1180,
  perfPowerLimitW: 95,
  perfFanMode: 'auto',
  perfFanDutyPct: 52,
  fanCpuEnabled: true,
  fanIntakeEnabled: true,
  fanExhaustEnabled: true,
  fanGpuEnabled: true,
  screensaverMinutes: 0,
  screensaverStyle: 'starfield',
  fileSystemFormat: 'FAT16',

  sfxVerifyPrompt: true,
  autoDeleteExeAfterInstall: false,
  defaultExeDownloadDir: 'C:\\Downloads',
  primaryPartitionSizeMB: 1495,
  enableSecondaryDriveD: true,
  strictMbrBootCheck: true,
  isoVolumeLabel: 'ANGELOS_BOOT',
  autoFullscreenStandalone: false,
  selectedInstallTargetPartition: 'C:',
  selectedBootloaderMode: 'win_hybrid_mbr',

  biosQuickPost: true,
  biosBootOrder: 'C_A_CDROM',
  biosBootAudio: true,
  biosNumLockOn: true,
  enableBootManagerOnBoot: true,
  requireSignInOnBoot: true,
  activeLocalAccount: 'Michael',
  localAccounts: [
    {
      username: 'Michael',
      displayName: 'Michael',
      avatar: '🧑‍💻',
      role: 'Administrator',
      password: '',
      pin: '',
      homeDir: 'C:\\Users\\Michael',
      createdAt: '1995-08-24',
    },
    {
      username: 'Guest95',
      displayName: 'Guest (Local)',
      avatar: '👤',
      role: 'Standard',
      password: '',
      pin: '',
      homeDir: 'C:\\Users\\Guest95',
      createdAt: '1995-08-24',
    },
  ],
};

export interface PartitionTableState {
  totalDiskMB: number;
  mbrSignatureValid: boolean;
  primaryC: {
    exists: boolean;
    active: boolean;
    formatted: boolean;
    fileSystem: 'FAT16' | 'FAT32';
    sizeMB: number;
    label: string;
  };
  logicalD: {
    exists: boolean;
    formatted: boolean;
    fileSystem: 'FAT16' | 'FAT32';
    sizeMB: number;
    label: string;
  };
}

export const DEFAULT_PARTITION_TABLE: PartitionTableState = {
  totalDiskMB: 1995,
  mbrSignatureValid: true,
  primaryC: {
    exists: true,
    active: true,
    formatted: true,
    fileSystem: 'FAT16',
    sizeMB: 1495,
    label: 'GEMINI_95',
  },
  logicalD: {
    exists: true,
    formatted: true,
    fileSystem: 'FAT16',
    sizeMB: 500,
    label: 'DATA_ARCHIVE',
  },
};

export interface SoftwarePackage {
  pkgId: string;
  name: string;
  version: string;
  publisher: string;
  category: 'browser' | 'core' | 'multimedia' | 'system';
  sizeMB: number;
  installDir: string;
  exeName: string;
  setupExeFileName: string;
  appWindowId: string; // Maps to DOM window id
  browserEngine?: BrowserEngineId;
  iconHtml: string;
  description: string;
  installed: boolean;
  desktopShortcut: boolean;
  startMenuShortcut: boolean;
  canUninstall: boolean;
}

export const DEFAULT_PACKAGE_CATALOG: SoftwarePackage[] = [
  {
    pkgId: 'browser_chrome',
    name: 'Google Chrome',
    version: '131.0.6778',
    publisher: 'Google LLC',
    category: 'browser',
    sizeMB: 24.5,
    installDir: 'C:\\Program Files\\Google\\Chrome\\Application',
    exeName: 'CHROME.EXE',
    setupExeFileName: 'CHROME_SETUP.EXE',
    appWindowId: 'chrome',
    browserEngine: 'chrome',
    iconHtml: '🟢',
    description: 'Physical Google Chrome browser with real Live Web proxy browsing, multi-tab strip, Omnibox search & optional ✨ AI Web Time-Machine.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'browser_netscape',
    name: 'Netscape Navigator 95 Gold',
    version: '3.04',
    publisher: 'Netscape Communications Corp.',
    category: 'browser',
    sizeMB: 14.2,
    installDir: 'C:\\Program Files\\Netscape\\Navigator',
    exeName: 'NETSCAPE.EXE',
    setupExeFileName: 'NETSCAPE95_SETUP.EXE',
    appWindowId: 'chrome',
    browserEngine: 'netscape',
    iconHtml: '🌐',
    description: 'Classic 1996 Web 1.0 Navigator engine with GeoCities AI Time-Machine & Live Web browsing support.',
    installed: false,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'browser_ie3',
    name: 'Microsoft Internet Explorer 3.0',
    version: '3.02.95',
    publisher: 'Microsoft Plus! 95',
    category: 'browser',
    sizeMB: 11.8,
    installDir: 'C:\\Program Files\\Plus!\\Microsoft Internet',
    exeName: 'IEXPLORE.EXE',
    setupExeFileName: 'MSIE30_SETUP.EXE',
    appWindowId: 'chrome',
    browserEngine: 'ie3',
    iconHtml: '📘',
    description: 'Classic Windows 95 Plus! Internet Explorer 3.0 browser engine with MSN 1996 Portal & ActiveFrame.',
    installed: false,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'sys_regedit',
    name: 'Registry Editor Pro (REGEDIT.EXE)',
    version: '4.00.950',
    publisher: 'Gemini Kernel Team',
    category: 'system',
    sizeMB: 2.4,
    installDir: 'C:\\System95',
    exeName: 'REGEDIT.EXE',
    setupExeFileName: 'REGEDIT95_SETUP.EXE',
    appWindowId: 'regedit',
    iconHtml: '🗂️',
    description: 'Direct hierarchical HKEY_CURRENT_USER & HKEY_LOCAL_MACHINE editor wired live to the OS.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'sys_perf_adjust',
    name: 'Performance & Adjustment Levels',
    version: '4.10.950',
    publisher: 'Angel-OS Hardware Lab',
    category: 'system',
    sizeMB: 2.8,
    installDir: 'C:\\System95',
    exeName: 'PERFLEVELS.EXE',
    setupExeFileName: 'PERFADJ95_SETUP.EXE',
    appWindowId: 'perfAdjust',
    iconHtml: '🎛️',
    description: 'Hardware Auto-Detect (RAM/CPU/GPU/Fans/Temps), Limited & Custom RAM sizing, clock scaling, and live thermal cooling curves.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'sys_monitor',
    name: 'System Resource Monitor 95',
    version: '4.00.950',
    publisher: 'Microsoft / Gemini Plus!',
    category: 'system',
    sizeMB: 3.1,
    installDir: 'C:\\System95',
    exeName: 'SYSMON.EXE',
    setupExeFileName: 'SYSMON95_SETUP.EXE',
    appWindowId: 'sysMonitor',
    iconHtml: '📊',
    description: 'Live real-time oscillating kernel CPU, RAM allocation, swap file, and modem throughput plotter.',
    installed: false,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_notepad',
    name: 'GemNotes AI WordPad',
    version: '2.1',
    publisher: 'Gemini Office 95',
    category: 'core',
    sizeMB: 4.5,
    installDir: 'C:\\Program Files\\Accessories',
    exeName: 'GEMNOTES.EXE',
    setupExeFileName: 'GEMNOTES_SETUP.EXE',
    appWindowId: 'notepad',
    iconHtml: '📝',
    description: 'Retro text & zine editor with C:\\ file saving, ASCII art generator, and streaming story writer.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_paint',
    name: 'GemPaint 95 Pixel Studio',
    version: '4.0',
    publisher: 'Gemini Graphics',
    category: 'multimedia',
    sizeMB: 6.8,
    installDir: 'C:\\Program Files\\Accessories',
    exeName: 'GEMPAINT.EXE',
    setupExeFileName: 'GEMPAINT_SETUP.EXE',
    appWindowId: 'paint',
    iconHtml: '🎨',
    description: '16-color MS Paint 95 studio with flood-fill, spray airbrush, shapes, undo, and Clippy art critiques.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_aim',
    name: 'Gemini Instant Messenger (AIM)',
    version: '1.95',
    publisher: 'America Online / Gemini',
    category: 'core',
    sizeMB: 7.4,
    installDir: 'C:\\Program Files\\AIM95',
    exeName: 'AIM95.EXE',
    setupExeFileName: 'AIM95_SETUP.EXE',
    appWindowId: 'gemini',
    iconHtml: '💬',
    description: 'Multi-persona 1995 instant messenger featuring SmarterChild_95, ZeroCool_1337, and Win95_Guru.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_minesweeper',
    name: 'GemSweeper Deluxe',
    version: '95.2',
    publisher: 'Microsoft Entertainment Pack',
    category: 'multimedia',
    sizeMB: 2.9,
    installDir: 'C:\\Program Files\\Games',
    exeName: 'WINMINE.EXE',
    setupExeFileName: 'GEMSWEEPER_SETUP.EXE',
    appWindowId: 'minesweeper',
    iconHtml: '💣',
    description: 'Classic Minesweeper with Beginner/Medium/Expert grids, chord-clicking, and AI tactical hints.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_mediaplayer',
    name: 'GemPlayer 16-Bit Synth & TV',
    version: '5.1',
    publisher: 'Creative Labs / Gemini',
    category: 'multimedia',
    sizeMB: 12.5,
    installDir: 'C:\\Program Files\\Multimedia',
    exeName: 'MPLAYER.EXE',
    setupExeFileName: 'GEMPLAYER_SETUP.EXE',
    appWindowId: 'mediaPlayer',
    iconHtml: '🎹',
    description: 'Built-in 4-track FM Chiptune Synthesizer with spectrum visualizer and YouTube Retro CRT TV.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
  {
    pkgId: 'app_doom',
    name: 'DOOM II (MS-DOS Protected Mode)',
    version: '1.9',
    publisher: 'id Software',
    category: 'multimedia',
    sizeMB: 42.0,
    installDir: 'C:\\GAMES\\DOOM2',
    exeName: 'DOOM2.EXE',
    setupExeFileName: 'DOOM2_SETUP.EXE',
    appWindowId: 'doom',
    iconHtml: '👹',
    description: 'Classic 1994 MS-DOS first-person action powered by DOSBox protected-mode emulation.',
    installed: true,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  },
];

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export const APP_SVG_ICONS: Record<string, string> = {
  windowsLogo: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="w1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6ee7ff"/><stop offset="100%" stop-color="#0078d4"/></linearGradient><linearGradient id="w2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#005fb8"/></linearGradient></defs><rect x="6" y="6" width="24" height="24" rx="2.5" fill="url(#w1)"/><rect x="34" y="6" width="24" height="24" rx="2.5" fill="url(#w1)"/><rect x="6" y="34" width="24" height="24" rx="2.5" fill="url(#w2)"/><rect x="34" y="34" width="24" height="24" rx="2.5" fill="url(#w2)"/></svg>',
  ),
  chrome: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ffffff" stroke="rgba(0,0,0,0.16)" stroke-width="1.5"/><path d="M32 3 A29 29 0 0 1 57.5 18 H32 A14 14 0 0 0 19.8 25 L7.2 17 A29 29 0 0 1 32 3Z" fill="#ea4335"/><path d="M7.2 17 L19.8 25 A14 14 0 0 0 30.8 46 L23.5 59.8 A29 29 0 0 1 7.2 17Z" fill="#34a853"/><path d="M57.5 18 A29 29 0 0 1 23.5 59.8 L30.8 46 A14 14 0 0 0 45.8 29.5 H32 V18Z" fill="#fbbc05"/><circle cx="32" cy="32" r="13.5" fill="#ffffff"/><circle cx="32" cy="32" r="10.5" fill="#1a73e8"/></svg>',
  ),
  netscape: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="8" fill="#0d4f6b" stroke="#000" stroke-width="2"/><path d="M12 48 Q32 22 52 48" fill="none" stroke="#38bdf8" stroke-width="4"/><path d="M20 46 V16 L44 46 V16" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="square" stroke-linejoin="miter"/></svg>',
  ),
  ie3: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#0078d7"/><path d="M10 38 C16 14 54 10 56 26 C40 34 18 46 8 42" fill="none" stroke="#ffd43b" stroke-width="5" stroke-linecap="round"/><text x="32" y="43" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="38" fill="#ffffff">e</text></svg>',
  ),
  abilityToInstall: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="8,24 32,12 56,24 56,50 32,60 8,50" fill="#d97706" stroke="#111" stroke-width="2"/><polygon points="8,24 32,12 56,24 32,34" fill="#fbbf24" stroke="#111" stroke-width="2"/><circle cx="42" cy="20" r="13" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/><circle cx="42" cy="20" r="4" fill="#0078d7"/><path d="M22 40 L32 48 L42 40" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  ),
  controlPanel: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="44" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="8" y="12" width="48" height="10" fill="#000080"/><circle cx="32" cy="38" r="12" fill="#475569" stroke="#000" stroke-width="2"/><circle cx="32" cy="38" r="5" fill="#e2e8f0"/><path d="M32 22v6M32 48v6M16 38h6M42 38h6" stroke="#1e293b" stroke-width="4"/></svg>',
  ),
  regedit: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="10" width="14" height="14" fill="#0284c7" stroke="#000" stroke-width="2"/><rect x="26" y="10" width="14" height="14" fill="#38bdf8" stroke="#000" stroke-width="2"/><rect x="10" y="26" width="14" height="14" fill="#7dd3fc" stroke="#000" stroke-width="2"/><rect x="26" y="26" width="14" height="14" fill="#0ea5e9" stroke="#000" stroke-width="2"/><rect x="38" y="34" width="16" height="16" fill="#38bdf8" stroke="#000" stroke-width="2"/><rect x="22" y="42" width="14" height="14" fill="#0284c7" stroke="#000" stroke-width="2"/></svg>',
  ),
  perfAdjust: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="8" width="52" height="48" rx="3" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="10" y="12" width="44" height="22" fill="#0f172a" stroke="#475569" stroke-width="1.5"/><path d="M16 30 A14 14 0 0 1 44 30" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/><path d="M34 22 A14 14 0 0 1 44 30" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/><line x1="30" y1="30" x2="39" y2="19" stroke="#facc15" stroke-width="2.5" stroke-linecap="round"/><circle cx="30" cy="30" r="2.5" fill="#ffffff"/><rect x="12" y="40" width="40" height="4" fill="#475569"/><rect x="18" y="38" width="6" height="8" fill="#0078d4" stroke="#000" stroke-width="1"/><rect x="12" y="48" width="40" height="4" fill="#475569"/><rect x="34" y="46" width="6" height="8" fill="#16a34a" stroke="#000" stroke-width="1"/></svg>',
  ),
  sysMonitor: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="8" width="52" height="40" rx="2" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="11" y="13" width="42" height="28" fill="#022c22"/><polyline points="13,32 22,32 26,18 32,37 38,23 44,30 51,30" fill="none" stroke="#00ff66" stroke-width="3" stroke-linejoin="round"/><rect x="22" y="48" width="20" height="8" fill="#808080" stroke="#000" stroke-width="2"/></svg>',
  ),
  myComputer: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="6" width="44" height="32" rx="2" fill="#e5e0d8" stroke="#000" stroke-width="2"/><rect x="15" y="11" width="34" height="22" fill="#008080"/><rect x="18" y="14" width="12" height="9" fill="#38bdf8"/><rect x="6" y="40" width="52" height="16" fill="#d6d1c9" stroke="#000" stroke-width="2"/><rect x="34" y="46" width="18" height="3" fill="#334155"/><circle cx="15" cy="48" r="2.5" fill="#16a34a"/></svg>',
  ),
  gemini: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M10 12 H54 V42 H30 L18 54 V42 H10 Z" fill="#facc15" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="24" r="5.5" fill="#1d4ed8"/><path d="M21 37 C23 29 41 29 43 37" fill="#1d4ed8"/></svg>',
  ),
  notepad: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="12" y="10" width="38" height="46" fill="#ffffff" stroke="#000" stroke-width="2"/><rect x="12" y="10" width="38" height="9" fill="#0284c7" stroke="#000" stroke-width="2"/><line x1="18" y1="27" x2="44" y2="27" stroke="#64748b" stroke-width="2.5"/><line x1="18" y1="35" x2="44" y2="35" stroke="#64748b" stroke-width="2.5"/><line x1="18" y1="43" x2="36" y2="43" stroke="#64748b" stroke-width="2.5"/><polygon points="44,18 54,8 58,12 48,22 41,25" fill="#f59e0b" stroke="#000" stroke-width="1.5"/></svg>',
  ),
  paint: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="30" cy="36" rx="22" ry="18" fill="#fef3c7" stroke="#000" stroke-width="2"/><circle cx="20" cy="30" r="4" fill="#ef4444"/><circle cx="31" cy="25" r="4" fill="#3b82f6"/><circle cx="42" cy="31" r="4" fill="#22c55e"/><circle cx="23" cy="43" r="4" fill="#eab308"/><polygon points="36,36 56,10 60,14 40,40" fill="#7c3aed" stroke="#000" stroke-width="1.5"/></svg>',
  ),
  minesweeper: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" fill="#c0c0c0" stroke="#000" stroke-width="2"/><circle cx="32" cy="34" r="14" fill="#111"/><path d="M32 14v40M12 34h40M19 21l26 26M45 21L19 47" stroke="#111" stroke-width="4" stroke-linecap="round"/><circle cx="27" cy="29" r="3.5" fill="#ffffff"/><polygon points="36,12 52,18 36,24" fill="#ef4444"/></svg>',
  ),
  mediaPlayer: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" fill="#1e293b" stroke="#000" stroke-width="2"/><rect x="13" y="15" width="38" height="22" fill="#0f172a"/><rect x="17" y="25" width="5" height="9" fill="#00ff66"/><rect x="24" y="19" width="5" height="15" fill="#38bdf8"/><rect x="31" y="22" width="5" height="12" fill="#f472b6"/><rect x="38" y="17" width="5" height="17" fill="#facc15"/><polygon points="26,41 40,47 26,53" fill="#e2e8f0"/></svg>',
  ),
  dosPrompt: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="10" width="52" height="44" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="9" y="13" width="46" height="7" fill="#000080"/><rect x="9" y="22" width="46" height="29" fill="#000000"/><text x="14" y="42" font-family="monospace" font-weight="bold" font-size="18" fill="#00ff66">C:\\_</text></svg>',
  ),
  doom: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="#450a0a" stroke="#000" stroke-width="2"/><path d="M14 48 L22 14 L32 26 L42 14 L50 48 Z" fill="#dc2626" stroke="#facc15" stroke-width="2"/><text x="32" y="43" text-anchor="middle" font-family="Impact,sans-serif" font-size="16" fill="#fde047">DOOM</text></svg>',
  ),
  imageViewer: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" fill="#ffffff" stroke="#000" stroke-width="2"/><rect x="13" y="15" width="38" height="28" fill="#38bdf8"/><circle cx="23" cy="24" r="5" fill="#fde047"/><polygon points="13,43 27,26 37,37 44,30 51,43" fill="#15803d"/></svg>',
  ),
  folder: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M8 16 H26 L32 22 H56 V50 H8 Z" fill="#facc15" stroke="#000" stroke-width="2"/><path d="M8 24 H56 V50 H8 Z" fill="#fde047" stroke="#000" stroke-width="2"/></svg>',
  ),
  textFile: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="14,8 40,8 50,18 50,56 14,56" fill="#ffffff" stroke="#000" stroke-width="2"/><polygon points="40,8 40,18 50,18" fill="#cbd5e1" stroke="#000" stroke-width="1.5"/><line x1="20" y1="26" x2="44" y2="26" stroke="#475569" stroke-width="2.5"/><line x1="20" y1="34" x2="44" y2="34" stroke="#475569" stroke-width="2.5"/><line x1="20" y1="42" x2="36" y2="42" stroke="#475569" stroke-width="2.5"/></svg>',
  ),
  imageFile: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="12,8 42,8 52,18 52,56 12,56" fill="#ffffff" stroke="#000" stroke-width="2"/><rect x="18" y="22" width="28" height="22" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/><polygon points="18,44 28,31 36,39 41,34 46,44" fill="#16a34a"/><circle cx="24" cy="28" r="3" fill="#f59e0b"/></svg>',
  ),
  appExe: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" fill="#c0c0c0" stroke="#000" stroke-width="2"/><rect x="10" y="12" width="44" height="10" fill="#000080"/><text x="32" y="42" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="14" fill="#000">EXE</text></svg>',
  ),
  setupExe: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="10" width="44" height="44" fill="#fef08a" stroke="#000" stroke-width="2"/><rect x="10" y="10" width="44" height="11" fill="#000080"/><text x="32" y="18" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="8.5" fill="#fff">SETUP</text><path d="M32 26 V42 M24 36 L32 44 L40 36" fill="none" stroke="#b91c1c" stroke-width="3.5" stroke-linecap="round"/></svg>',
  ),
  robotAssistant: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><line x1="32" y1="6" x2="32" y2="14" stroke="#000" stroke-width="3"/><circle cx="32" cy="5" r="3.5" fill="#ef4444"/><rect x="12" y="14" width="40" height="32" rx="6" fill="#cbd5e1" stroke="#000" stroke-width="2.5"/><rect x="18" y="20" width="28" height="18" rx="3" fill="#0f172a"/><circle cx="25" cy="28" r="3" fill="#38bdf8"/><circle cx="39" cy="28" r="3" fill="#38bdf8"/><path d="M26 34 Q32 37 38 34" fill="none" stroke="#00ff66" stroke-width="2"/><rect x="20" y="48" width="24" height="10" rx="2" fill="#94a3b8" stroke="#000" stroke-width="2"/></svg>',
  ),
  samplePhoto: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f172a"/><stop offset="60%" stop-color="#312e81"/><stop offset="100%" stop-color="#db2777"/></linearGradient></defs><rect width="320" height="220" fill="url(#sky)"/><circle cx="160" cy="118" r="44" fill="#facc15"/><rect y="140" width="320" height="80" fill="#1e1b4b"/><path d="M0 160 L320 160 M0 185 L320 185 M160 140 L40 220 M160 140 L160 220 M160 140 L280 220" stroke="#22d3ee" stroke-width="1.5" opacity="0.7"/><text x="160" y="34" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="16" fill="#ffffff">GEMINI 95 ARCHIVE PHOTO</text><text x="160" y="206" text-anchor="middle" font-family="monospace" font-size="12" fill="#a5f3fc">REDMOND · CLASS OF 1995</text></svg>',
  ),
  calcApp: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="10" y="6" width="44" height="52" rx="3" fill="#1e3a8a" stroke="#000" stroke-width="2"/><rect x="16" y="12" width="32" height="12" fill="#c8dec8" stroke="#000" stroke-width="1.5"/><rect x="16" y="28" width="8" height="7" fill="#e2e8f0"/><rect x="28" y="28" width="8" height="7" fill="#e2e8f0"/><rect x="40" y="28" width="8" height="7" fill="#93c5fd"/><rect x="16" y="38" width="8" height="7" fill="#e2e8f0"/><rect x="28" y="38" width="8" height="7" fill="#e2e8f0"/><rect x="40" y="38" width="8" height="17" fill="#facc15"/><rect x="16" y="48" width="20" height="7" fill="#e2e8f0"/></svg>',
  ),
  solitaireApp: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="12" width="30" height="42" rx="3" fill="#065f46" stroke="#000" stroke-width="2"/><rect x="24" y="8" width="32" height="44" rx="3" fill="#ffffff" stroke="#000" stroke-width="2"/><path d="M40 20 L31 32 L40 44 L49 32 Z" fill="#dc2626"/><text x="27" y="19" font-family="monospace" font-weight="bold" font-size="10" fill="#dc2626">A</text></svg>',
  ),
  arcadeApp: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" rx="6" fill="#7c2d12" stroke="#000" stroke-width="2"/><rect x="14" y="14" width="36" height="22" fill="#020617" stroke="#f97316" stroke-width="1.5"/><rect x="20" y="20" width="8" height="4" fill="#22d3ee"/><rect x="34" y="26" width="8" height="4" fill="#facc15"/><circle cx="23" cy="46" r="5" fill="#e2e8f0" stroke="#000" stroke-width="1.5"/><circle cx="42" cy="46" r="4" fill="#ef4444"/><circle cx="50" cy="43" r="3" fill="#22c55e"/></svg>',
  ),
  soundRecorder: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" rx="4" fill="#312e81" stroke="#000" stroke-width="2"/><rect x="13" y="16" width="38" height="22" fill="#001400" stroke="#808080" stroke-width="1.5"/><polyline points="15,27 21,27 25,19 30,35 35,21 40,32 45,27 49,27" fill="none" stroke="#00ff66" stroke-width="2.5"/><circle cx="22" cy="45" r="4.5" fill="#ef4444"/><polygon points="34,40 46,45 34,50" fill="#e2e8f0"/></svg>',
  ),
  calendarApp: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="12" width="48" height="44" rx="3" fill="#ffffff" stroke="#000" stroke-width="2"/><rect x="8" y="12" width="48" height="13" fill="#b91c1c" stroke="#000" stroke-width="2"/><rect x="18" y="7" width="5" height="9" fill="#334155"/><rect x="41" y="7" width="5" height="9" fill="#334155"/><text x="32" y="48" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="22" fill="#0f172a">95</text></svg>',
  ),
  taskManager: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="10" width="48" height="44" rx="2" fill="#0f172a" stroke="#000" stroke-width="2"/><polyline points="13,38 22,38 27,20 33,44 39,26 45,34 51,34" fill="none" stroke="#38bdf8" stroke-width="3.2" stroke-linejoin="round"/><rect x="13" y="14" width="38" height="3" fill="#475569"/></svg>',
  ),
  recycleBin: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="16" width="36" height="5" fill="#94a3b8" stroke="#000" stroke-width="2"/><rect x="24" y="10" width="16" height="6" fill="#cbd5e1" stroke="#000" stroke-width="2"/><polygon points="17,21 47,21 43,54 21,54" fill="#cbd5e1" stroke="#000" stroke-width="2"/><line x1="25" y1="27" x2="26" y2="48" stroke="#475569" stroke-width="2.5"/><line x1="32" y1="27" x2="32" y2="48" stroke="#475569" stroke-width="2.5"/><line x1="39" y1="27" x2="38" y2="48" stroke="#475569" stroke-width="2.5"/></svg>',
  ),
  clipViewer: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="14" y="12" width="36" height="44" rx="2" fill="#0369a1" stroke="#000" stroke-width="2"/><rect x="22" y="8" width="20" height="8" rx="2" fill="#facc15" stroke="#000" stroke-width="1.5"/><rect x="19" y="20" width="26" height="30" fill="#ffffff"/><line x1="23" y1="27" x2="41" y2="27" stroke="#334155" stroke-width="2.5"/><line x1="23" y1="35" x2="41" y2="35" stroke="#334155" stroke-width="2.5"/><line x1="23" y1="43" x2="35" y2="43" stroke="#334155" stroke-width="2.5"/></svg>',
  ),
  trophiesApp: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M18 12 H46 V26 C46 36 39 42 32 42 C25 42 18 36 18 26 Z" fill="#eab308" stroke="#000" stroke-width="2"/><path d="M18 16 H11 C11 26 14 30 19 30" fill="none" stroke="#ca8a04" stroke-width="3"/><path d="M46 16 H53 C53 26 50 30 45 30" fill="none" stroke="#ca8a04" stroke-width="3"/><rect x="28" y="42" width="8" height="8" fill="#ca8a04" stroke="#000" stroke-width="1.5"/><rect x="20" y="50" width="24" height="6" fill="#854d0e" stroke="#000" stroke-width="2"/></svg>',
  ),
};

const REGISTRY_STORAGE_KEY = '__gemini95_system_registry_v4';
const PACKAGES_STORAGE_KEY = '__gemini95_package_catalog_v4';
const BOOKMARKS_STORAGE_KEY = '__gemini95_browser_bookmarks_v3';
const PARTITIONS_STORAGE_KEY = '__gemini95_partition_table_v1';

export interface BrowserBookmark {
  title: string;
  url: string;
  mode: BrowserRenderMode;
}

export const DEFAULT_BOOKMARKS: BrowserBookmark[] = [
  { title: '➕ New Tab', url: 'chrome://newtab', mode: 'live' },
  { title: '📚 Wikipedia', url: 'https://en.m.wikipedia.org/wiki/Windows_95', mode: 'live' },
  { title: '🌐 Example.com', url: 'https://example.com', mode: 'live' },
  { title: '▶ Synthwave TV', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', mode: 'live' },
  { title: '🛍️ CyberMall 96', url: 'https://www.geocities.com/cybermall1996', mode: 'ai' },
  { title: '👽 Area 51 (AI)', url: 'https://www.area51-truth-1995.org', mode: 'ai' },
];

export function loadPartitionTable(): PartitionTableState {
  try {
    const raw = window.localStorage.getItem(PARTITIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PARTITION_TABLE,
        ...parsed,
        primaryC: { ...DEFAULT_PARTITION_TABLE.primaryC, ...(parsed.primaryC || {}) },
        logicalD: { ...DEFAULT_PARTITION_TABLE.logicalD, ...(parsed.logicalD || {}) },
      };
    }
  } catch (e) {
    console.warn('Partition table fallback:', e);
  }
  return {
    ...DEFAULT_PARTITION_TABLE,
    primaryC: { ...DEFAULT_PARTITION_TABLE.primaryC },
    logicalD: { ...DEFAULT_PARTITION_TABLE.logicalD },
  };
}

export function savePartitionTable(pt: PartitionTableState): void {
  try {
    window.localStorage.setItem(PARTITIONS_STORAGE_KEY, JSON.stringify(pt));
  } catch (e) {
    console.warn('Partition table save error:', e);
  }
}

export function loadSystemRegistry(): SystemRegistry {
  try {
    const raw = window.localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.defaultBrowserEngine === 'cyberchrome') {
        parsed.defaultBrowserEngine = 'chrome';
      }
      const merged: SystemRegistry = { ...DEFAULT_SYSTEM_REGISTRY, ...parsed };
      if (!Array.isArray(merged.localAccounts) || merged.localAccounts.length === 0) {
        merged.localAccounts = DEFAULT_SYSTEM_REGISTRY.localAccounts.map((a) => ({ ...a }));
      }
      if (!merged.localAccounts.some((a) => a.username === merged.activeLocalAccount)) {
        merged.activeLocalAccount = merged.localAccounts[0].username;
      }
      return merged;
    }
  } catch (e) {
    console.warn('Registry load fallback:', e);
  }
  return { ...DEFAULT_SYSTEM_REGISTRY };
}

export function saveSystemRegistry(reg: SystemRegistry): void {
  try {
    window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(reg));
  } catch (e) {
    console.warn('Registry save error:', e);
  }
}

export function loadPackageCatalog(): SoftwarePackage[] {
  try {
    const raw = window.localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (raw) {
      const saved: SoftwarePackage[] = JSON.parse(raw);
      return DEFAULT_PACKAGE_CATALOG.map((defPkg) => {
        const match = saved.find((s) => s.pkgId === defPkg.pkgId);
        return match
          ? {
              ...defPkg,
              installed: Boolean(match.installed),
              desktopShortcut: Boolean(match.desktopShortcut),
              startMenuShortcut: Boolean(match.startMenuShortcut),
              installDir: match.installDir || defPkg.installDir,
            }
          : { ...defPkg };
      });
    }
  } catch (e) {
    console.warn('Package catalog load fallback:', e);
  }
  return DEFAULT_PACKAGE_CATALOG.map((p) => ({ ...p }));
}

export function savePackageCatalog(pkgs: SoftwarePackage[]): void {
  try {
    window.localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(pkgs));
  } catch (e) {
    console.warn('Package catalog save error:', e);
  }
}

export function loadBrowserBookmarks(): BrowserBookmark[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_BOOKMARKS.map((b) => ({ ...b }));
}

export function saveBrowserBookmarks(bms: BrowserBookmark[]): void {
  try {
    window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bms));
  } catch {}
}

export interface RegistryEntryDescriptor {
  hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE';
  subkey: string;
  name: string;
  key: keyof SystemRegistry;
  regType: 'REG_SZ' | 'REG_DWORD';
  description: string;
}

export const REGISTRY_DESCRIPTORS: RegistryEntryDescriptor[] = [
  // HKCU\Control Panel\Desktop & Colors
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'ThemePreset', key: 'themePreset', regType: 'REG_SZ', description: 'Active desktop theme preset identifier' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'UseCustomColors', key: 'useCustomColors', regType: 'REG_DWORD', description: '1 = Override theme with custom hex colors' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'Background', key: 'desktopBgColor', regType: 'REG_SZ', description: 'Desktop background hex color' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'ButtonFace', key: 'windowBgColor', regType: 'REG_SZ', description: '3D window & button surface color' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'WindowText', key: 'windowTextColor', regType: 'REG_SZ', description: 'Primary window foreground text color' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'ActiveTitle', key: 'titleActiveStart', regType: 'REG_SZ', description: 'Active window titlebar primary hex' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'GradientActiveTitle', key: 'titleActiveEnd', regType: 'REG_SZ', description: 'Active window titlebar gradient end hex' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'TitleText', key: 'titleActiveText', regType: 'REG_SZ', description: 'Active titlebar text color' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Colors', name: 'InactiveTitle', key: 'titleInactiveBg', regType: 'REG_SZ', description: 'Inactive window titlebar color' },

  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'WallpaperPattern', key: 'wallpaperPattern', regType: 'REG_SZ', description: 'Desktop pattern (none|grid|dots|diagonal|stars)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'CRTScanlines', key: 'crtEnabled', regType: 'REG_DWORD', description: 'Enable CRT scanline & vignette overlay' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'CRTOpacity', key: 'crtOpacity', regType: 'REG_DWORD', description: 'CRT overlay intensity percentage (10-100)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'CRTPitchPx', key: 'crtScanlinePitch', regType: 'REG_DWORD', description: 'Scanline vertical pitch in pixels (2-6)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'MonitorBrightness', key: 'brightness', regType: 'REG_DWORD', description: 'CRT luminance percentage (55-125)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'MonitorContrast', key: 'contrast', regType: 'REG_DWORD', description: 'CRT contrast percentage (75-135)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'ColorSaturation', key: 'saturation', regType: 'REG_DWORD', description: 'Color saturation (0=Monochrome, 100=Normal)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'NightLightActive', key: 'nightLightEnabled', regType: 'REG_DWORD', description: 'Enable warm amber Night Light filter' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\Display', name: 'NightLightWarmth', key: 'nightLightWarmth', regType: 'REG_DWORD', description: 'Night Light amber opacity (8-50)' },

  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'BorderWidth', key: 'windowBorderWidth', regType: 'REG_DWORD', description: '3D bevel border width in pixels (1-6)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'DropShadowPx', key: 'windowShadowSize', regType: 'REG_DWORD', description: 'Hard retro shadow offset in pixels (0-10)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'CornerRadiusPx', key: 'windowCornerRadius', regType: 'REG_DWORD', description: '0 = Win95 Sharp, 6 = Win11 Rounded' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'CaptionHeight', key: 'titlebarHeight', regType: 'REG_DWORD', description: 'Window titlebar height in pixels (18-32)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'SystemFont', key: 'uiFontFamily', regType: 'REG_SZ', description: 'Font family (jakarta|mono|vt323|serif|courier)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'FontScalePct', key: 'uiFontScale', regType: 'REG_DWORD', description: 'Global UI typography scale (85-115)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'ShellIconSize', key: 'desktopIconSize', regType: 'REG_DWORD', description: 'Desktop icon pixel dimension (32-60)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Control Panel\\WindowMetrics', name: 'DoubleClickLaunch', key: 'doubleClickIcons', regType: 'REG_DWORD', description: '1 = Require double-click on desktop icons' },

  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'TaskbarAl', key: 'taskbarCentered', regType: 'REG_DWORD', description: '0 = Left-Aligned Hybrid Dock, 1 = Centered Dock' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowTaskbarLabels', key: 'taskbarShowLabels', regType: 'REG_DWORD', description: '0 = Icon-Only Win10/11 Dock, 1 = Classic Text Labels' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'StuckRectsEdge', key: 'taskbarPosition', regType: 'REG_SZ', description: 'Taskbar dock edge (bottom|top)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'AutoHide', key: 'taskbarAutoHide', regType: 'REG_DWORD', description: '1 = Auto-collapse taskbar until hover' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowSearch', key: 'showSearchBtn', regType: 'REG_DWORD', description: 'Display left-side taskbar Search bar' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowTaskView', key: 'showTaskViewBtn', regType: 'REG_DWORD', description: 'Display Virtual Desktops Task View button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowWidgets', key: 'showWidgetsBtn', regType: 'REG_DWORD', description: 'Display Weather & Widgets drawer button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowCopilot', key: 'showCopilotBtn', regType: 'REG_DWORD', description: 'Display Angel Pilot button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'Clock24Hour', key: 'clock24Hour', regType: 'REG_DWORD', description: 'Use 24-hour clock in system tray' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ClockSeconds', key: 'clockShowSeconds', regType: 'REG_DWORD', description: 'Display live seconds in system tray clock' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowStartText', key: 'showStartText', regType: 'REG_DWORD', description: '0 = Windows 11 Icon Only, 1 = Show Text Label Next to Windows Icon' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'StartLabel', key: 'startButtonLabel', regType: 'REG_SZ', description: 'Optional text label next to the Windows icon' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'SnapAssist', key: 'snapLayoutsEnabled', regType: 'REG_DWORD', description: 'Enable Win11 Snap Layouts flyout on Maximize' },

  // Browser Hive
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'DefaultEngine', key: 'defaultBrowserEngine', regType: 'REG_SZ', description: 'Active engine (chrome|netscape|ie3)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'RenderMode', key: 'defaultBrowserMode', regType: 'REG_SZ', description: 'Default mode (live|ai)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'TimeMachineEra', key: 'browserAiEra', regType: 'REG_SZ', description: 'AI web style (1996|2001|modern)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'StartPage', key: 'browserHomePage', regType: 'REG_SZ', description: 'Browser startup URL or chrome://newtab' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'DisplayInlineImages', key: 'browserShowImages', regType: 'REG_DWORD', description: '1 = Render images & SVGs, 0 = Text-only' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'ZoomPercent', key: 'browserZoomPercent', regType: 'REG_DWORD', description: 'Viewport zoom percentage (80-130)' },

  // HKLM Hardware, Audio, Network & BIOS
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Audio\\SoundBlaster16', name: 'AudioEnabled', key: 'audioEnabled', regType: 'REG_DWORD', description: 'Master Sound Blaster 16 DSP power' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Audio\\SoundBlaster16', name: 'MasterVolumePct', key: 'masterVolume', regType: 'REG_DWORD', description: 'Master output gain (10-150)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Audio\\SoundBlaster16', name: 'DACBitDepth', key: 'dacBitDepth', regType: 'REG_DWORD', description: 'Quantization bit depth (16|12|8|4)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Audio\\SoundBlaster16', name: 'TapeSaturation', key: 'chimeTapeSaturation', regType: 'REG_DWORD', description: 'Analog tape crunch drive on chime (0-50)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Audio\\SoundBlaster16', name: 'FloppySeekSfx', key: 'floppyMechanicalSfx', regType: 'REG_DWORD', description: 'Play mechanical drive ticks on load/install' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Network\\Modem', name: 'BaudRateBps', key: 'modemBaudRate', regType: 'REG_DWORD', description: 'Modem speed (14400|28800|56000|128000|1000000)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'System\\Network\\Modem', name: 'DialHandshakeAudio', key: 'playModemHandshake', regType: 'REG_DWORD', description: 'Play V.90 dial-up handshake tone on connect' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\CentralProcessor', name: 'ProcessorNameString', key: 'cpuModel', regType: 'REG_SZ', description: 'Emulated CPU identifier string' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\CentralProcessor', name: 'TurboBoost', key: 'cpuTurboBoost', regType: 'REG_DWORD', description: 'Front-panel hardware Turbo button state' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'RamAllocationMode', key: 'ramMode', regType: 'REG_SZ', description: 'auto = Host Hardware Auto-Detect, limited = Capped Pool, custom = Manual MB' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'PhysicalMemoryMB', key: 'installedRamMB', regType: 'REG_DWORD', description: 'Installed / Limited RAM pool in MB (16-4096)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'CustomMemoryMB', key: 'customRamMB', regType: 'REG_DWORD', description: 'Manual custom RAM target in MB when RamAllocationMode=custom' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'PagingFileMB', key: 'virtualSwapMB', regType: 'REG_DWORD', description: 'WIN386.SWP virtual memory swap size in MB' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Performance', name: 'AdjustmentProfile', key: 'perfProfile', regType: 'REG_SZ', description: 'Active performance tier (eco|balanced|performance|turbo|custom)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Performance', name: 'CpuClockScalePct', key: 'perfCpuScalePct', regType: 'REG_DWORD', description: 'CPU frequency multiplier scale percentage (40-200)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Performance', name: 'CoreVoltageMv', key: 'perfVoltageMv', regType: 'REG_DWORD', description: 'Vcore voltage regulation setpoint in millivolts (850-1450)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Performance', name: 'PowerLimitWatts', key: 'perfPowerLimitW', regType: 'REG_DWORD', description: 'Package TDP power limit envelope in Watts (15-350)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'FanCurveMode', key: 'perfFanMode', regType: 'REG_SZ', description: 'Thermal fan policy (auto|silent|balanced|turbo|manual|off)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'ManualFanDutyPct', key: 'perfFanDutyPct', regType: 'REG_DWORD', description: 'Manual PWM fan duty cycle percentage (0-100)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'CpuFanActive', key: 'fanCpuEnabled', regType: 'REG_DWORD', description: '1 = CPU cooler fan powered, 0 = Fan halted' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'ChassisIntakeFanActive', key: 'fanIntakeEnabled', regType: 'REG_DWORD', description: '1 = Front intake fan powered, 0 = Fan halted' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'ChassisExhaustFanActive', key: 'fanExhaustEnabled', regType: 'REG_DWORD', description: '1 = Rear exhaust fan powered, 0 = Fan halted' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Cooling', name: 'GpuFansActive', key: 'fanGpuEnabled', regType: 'REG_DWORD', description: '1 = GPU dual-axial fans powered, 0 = Fans halted' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'VerifyMZHeaderPrompt', key: 'sfxVerifyPrompt', regType: 'REG_DWORD', description: '1 = Show Win32 SFX MZ dialog before running .EXE' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'AutoCleanExeAfterSetup', key: 'autoDeleteExeAfterInstall', regType: 'REG_DWORD', description: '1 = Delete .EXE from Downloads after setup finishes' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'DefaultDownloadFolder', key: 'defaultExeDownloadDir', regType: 'REG_SZ', description: 'Target folder for downloaded .EXE installers' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'AutoFullscreenOSMode', key: 'autoFullscreenStandalone', regType: 'REG_DWORD', description: '1 = Auto-enter fullscreen in standalone PWA OS mode' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'PrimaryPartitionMB', key: 'primaryPartitionSizeMB', regType: 'REG_DWORD', description: 'Primary DOS C:\\ size in MB (400-1995)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'MountLogicalDriveD', key: 'enableSecondaryDriveD', regType: 'REG_DWORD', description: '1 = Mount secondary D:\\ partition in Explorer' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'StrictMBRBootGuard', key: 'strictMbrBootCheck', regType: 'REG_DWORD', description: '1 = Halt BIOS POST if C:\\ or MBR is missing' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'BootISOVolumeLabel', key: 'isoVolumeLabel', regType: 'REG_SZ', description: 'ISO-9660 volume label for exported bootable ISO' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\Setup', name: 'TargetInstallPartition', key: 'selectedInstallTargetPartition', regType: 'REG_SZ', description: 'Selected target drive partition for OS installation (C: or D:)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\Setup', name: 'BootloaderMode', key: 'selectedBootloaderMode', regType: 'REG_SZ', description: 'win_hybrid_mbr or legacy_95_mbr boot manager configuration' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'QuickPOST', key: 'biosQuickPost', regType: 'REG_DWORD', description: 'Fast RAM test during power-on boot' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'BootSequence', key: 'biosBootOrder', regType: 'REG_SZ', description: 'Boot priority (C_A_CDROM|A_C_CDROM|CDROM_C_A)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'BootStartupChime', key: 'biosBootAudio', regType: 'REG_DWORD', description: 'Synthesize Eno startup chime during splash' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Boot\\Manager', name: 'EnableBootManager', key: 'enableBootManagerOnBoot', regType: 'REG_DWORD', description: '1 = Show Windows Boot Manager partition selector during boot' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Accounts\\LocalOnly', name: 'RequireLocalSignIn', key: 'requireSignInOnBoot', regType: 'REG_DWORD', description: '1 = Show Windows Always-Local-Account sign-in screen on boot' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Accounts\\LocalOnly', name: 'ActiveLocalAccount', key: 'activeLocalAccount', regType: 'REG_SZ', description: 'Currently active Always-Local user account profile' },
];
