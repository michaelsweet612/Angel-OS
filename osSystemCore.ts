/**
 * Centralized System Registry, Package Manifest & Hardware/Audio Settings Core
 * Powers Master Settings (8-Tab Control Panel), Live REGEDIT.EXE, CMOS BIOS,
 * Ability to Install (InstallShield 95), and the Multi-Engine Reinstallable Browser.
 */

export type BrowserEngineId = 'netscape' | 'ie3' | 'cyberchrome';
export type BrowserRenderMode = 'ai' | 'live';
export type BrowserAiEra = '1996' | '2001' | 'modern';

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

  // --- Tab 3: Taskbar, Snap & Win11 Shell (HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer) ---
  taskbarCentered: boolean;
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

  // --- Tab 6: Hardware, CPU, RAM & Power (HKLM\Hardware\Description\System) ---
  cpuModel: 'Intel 486DX2 66MHz' | 'Intel Pentium 133MHz' | 'Intel Pentium MMX 233MHz' | 'Intel Pentium II 400MHz';
  cpuTurboBoost: boolean;
  installedRamMB: 16 | 32 | 64 | 128 | 256;
  virtualSwapMB: 64 | 128 | 256 | 512;
  screensaverMinutes: 0 | 1 | 3 | 5;
  screensaverStyle: 'starfield' | 'matrix';
  fileSystemFormat: 'FAT16' | 'FAT32';

  // --- Tab 7: Dual-Path Install (.EXE Policy, FDISK Disk & Host OS Mode) ---
  sfxVerifyPrompt: boolean;
  autoDeleteExeAfterInstall: boolean;
  defaultExeDownloadDir: 'C:\\Downloads' | 'C:\\' | 'D:\\Installers';
  primaryPartitionSizeMB: number; // 400 - 1995 MB
  enableSecondaryDriveD: boolean;
  strictMbrBootCheck: boolean;
  isoVolumeLabel: string;
  autoFullscreenStandalone: boolean;

  // --- Tab 8 / CMOS BIOS Settings (HKLM\Hardware\BIOS) ---
  biosQuickPost: boolean;
  biosBootOrder: 'C_A_CDROM' | 'A_C_CDROM' | 'CDROM_C_A';
  biosBootAudio: boolean;
  biosNumLockOn: boolean;
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
  snapLayoutsEnabled: true,
  snapHoverDelayMs: 120,

  audioEnabled: true,
  masterVolume: 100,
  sfxPitchMultiplier: 1.0,
  dacBitDepth: 16,
  chimeTapeSaturation: 28,
  floppyMechanicalSfx: true,

  defaultBrowserEngine: 'netscape',
  defaultBrowserMode: 'ai',
  browserAiEra: '1996',
  modemBaudRate: 56000,
  playModemHandshake: true,
  browserShowImages: true,
  browserEnableScripts: true,
  browserHomePage: 'about:portal',
  browserZoomPercent: 100,

  cpuModel: 'Intel Pentium 133MHz',
  cpuTurboBoost: true,
  installedRamMB: 64,
  virtualSwapMB: 128,
  screensaverMinutes: 0,
  screensaverStyle: 'starfield',
  fileSystemFormat: 'FAT16',

  sfxVerifyPrompt: true,
  autoDeleteExeAfterInstall: false,
  defaultExeDownloadDir: 'C:\\Downloads',
  primaryPartitionSizeMB: 1495,
  enableSecondaryDriveD: true,
  strictMbrBootCheck: true,
  isoVolumeLabel: 'GEMINI95_OS',
  autoFullscreenStandalone: false,

  biosQuickPost: true,
  biosBootOrder: 'C_A_CDROM',
  biosBootAudio: true,
  biosNumLockOn: true,
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
    description: 'Classic 1996 Web 1.0 Navigator engine with GeoCities AI Time-Machine & Live Web Iframe support.',
    installed: true,
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
    pkgId: 'browser_cyberchrome',
    name: 'CyberChrome 95 Turbo',
    version: '1.0.95',
    publisher: 'Gemini Neural Systems',
    category: 'browser',
    sizeMB: 18.6,
    installDir: 'C:\\Program Files\\CyberChrome',
    exeName: 'CHROME95.EXE',
    setupExeFileName: 'CYBERCHROME_SETUP.EXE',
    appWindowId: 'chrome',
    browserEngine: 'cyberchrome',
    iconHtml: '⚡',
    description: 'Retro-futuristic multi-tabbed browser backported from the future with Speed-Dial & Live Reader.',
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

const REGISTRY_STORAGE_KEY = '__gemini95_system_registry_v2';
const PACKAGES_STORAGE_KEY = '__gemini95_package_catalog_v2';
const BOOKMARKS_STORAGE_KEY = '__gemini95_browser_bookmarks_v2';
const PARTITIONS_STORAGE_KEY = '__gemini95_partition_table_v1';

export interface BrowserBookmark {
  title: string;
  url: string;
  mode: BrowserRenderMode;
}

export const DEFAULT_BOOKMARKS: BrowserBookmark[] = [
  { title: '📥 .EXE Shareware Depot', url: 'http://www.tucows-95-downloads.com', mode: 'ai' },
  { title: '🛍️ CyberMall 96', url: 'https://www.geocities.com/cybermall1996', mode: 'ai' },
  { title: '👽 Area 51 Truth', url: 'https://www.area51-truth-1995.org', mode: 'ai' },
  { title: '🍕 PizzaNet 95', url: 'https://www.pizzanet-delivery.com', mode: 'ai' },
  { title: '📚 Wikipedia (Live)', url: 'https://en.m.wikipedia.org/wiki/Windows_95', mode: 'live' },
  { title: '🐣 Tamagotchi Club', url: 'https://www.virtual-tamagotchi-club.jp', mode: 'ai' },
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
      return { ...DEFAULT_SYSTEM_REGISTRY, ...parsed };
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

  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'TaskbarAl', key: 'taskbarCentered', regType: 'REG_DWORD', description: '0 = Classic Win95 Left, 1 = Win11 Centered' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'StuckRectsEdge', key: 'taskbarPosition', regType: 'REG_SZ', description: 'Taskbar dock edge (bottom|top)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'AutoHide', key: 'taskbarAutoHide', regType: 'REG_DWORD', description: '1 = Auto-collapse taskbar until hover' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowSearch', key: 'showSearchBtn', regType: 'REG_DWORD', description: 'Display Universal Search button on taskbar' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowTaskView', key: 'showTaskViewBtn', regType: 'REG_DWORD', description: 'Display Virtual Desktops Task View button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowWidgets', key: 'showWidgetsBtn', regType: 'REG_DWORD', description: 'Display Weather & Widgets drawer button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ShowCopilot', key: 'showCopilotBtn', regType: 'REG_DWORD', description: 'Display Windows Copilot 95 button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'Clock24Hour', key: 'clock24Hour', regType: 'REG_DWORD', description: 'Use 24-hour clock in system tray' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'ClockSeconds', key: 'clockShowSeconds', regType: 'REG_DWORD', description: 'Display live seconds in system tray clock' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'StartLabel', key: 'startButtonLabel', regType: 'REG_SZ', description: 'Custom text label on the Start button' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Explorer\\Taskbar', name: 'SnapAssist', key: 'snapLayoutsEnabled', regType: 'REG_DWORD', description: 'Enable Win11 Snap Layouts flyout on Maximize' },

  // Browser Hive
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'DefaultEngine', key: 'defaultBrowserEngine', regType: 'REG_SZ', description: 'Active engine (netscape|ie3|cyberchrome)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'RenderMode', key: 'defaultBrowserMode', regType: 'REG_SZ', description: 'Default mode (ai|live)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'TimeMachineEra', key: 'browserAiEra', regType: 'REG_SZ', description: 'AI web style (1996|2001|modern)' },
  { hive: 'HKEY_CURRENT_USER', subkey: 'Software\\Browser\\Main', name: 'StartPage', key: 'browserHomePage', regType: 'REG_SZ', description: 'Browser startup URL or about:portal' },
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
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'PhysicalMemoryMB', key: 'installedRamMB', regType: 'REG_DWORD', description: 'Installed SIMM/EDO RAM in MB (16-256)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\System\\Memory', name: 'PagingFileMB', key: 'virtualSwapMB', regType: 'REG_DWORD', description: 'WIN386.SWP virtual memory swap size in MB' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'VerifyMZHeaderPrompt', key: 'sfxVerifyPrompt', regType: 'REG_DWORD', description: '1 = Show Win32 SFX MZ dialog before running .EXE' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'AutoCleanExeAfterSetup', key: 'autoDeleteExeAfterInstall', regType: 'REG_DWORD', description: '1 = Delete .EXE from Downloads after setup finishes' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'DefaultDownloadFolder', key: 'defaultExeDownloadDir', regType: 'REG_SZ', description: 'Target folder for downloaded .EXE installers' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Software\\Setup\\ExePolicy', name: 'AutoFullscreenOSMode', key: 'autoFullscreenStandalone', regType: 'REG_DWORD', description: '1 = Auto-enter fullscreen in standalone PWA OS mode' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'PrimaryPartitionMB', key: 'primaryPartitionSizeMB', regType: 'REG_DWORD', description: 'Primary DOS C:\\ size in MB (400-1995)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'MountLogicalDriveD', key: 'enableSecondaryDriveD', regType: 'REG_DWORD', description: '1 = Mount secondary D:\\ partition in Explorer' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'StrictMBRBootGuard', key: 'strictMbrBootCheck', regType: 'REG_DWORD', description: '1 = Halt BIOS POST if C:\\ or MBR is missing' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\Disk\\FDISK', name: 'BootISOVolumeLabel', key: 'isoVolumeLabel', regType: 'REG_SZ', description: 'ISO-9660 volume label for exported bootable ISO' },

  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'QuickPOST', key: 'biosQuickPost', regType: 'REG_DWORD', description: 'Fast RAM test during power-on boot' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'BootSequence', key: 'biosBootOrder', regType: 'REG_SZ', description: 'Boot priority (C_A_CDROM|A_C_CDROM|CDROM_C_A)' },
  { hive: 'HKEY_LOCAL_MACHINE', subkey: 'Hardware\\BIOS\\Award451PG', name: 'BootStartupChime', key: 'biosBootAudio', regType: 'REG_DWORD', description: 'Synthesize Eno startup chime during splash' },
];
