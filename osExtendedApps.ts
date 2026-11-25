import { fetchLivePageClientSide, isBrowseBackendMissing, markBrowseBackend, type StaticWebResult } from './osStaticWeb';
import {
  APP_SVG_ICONS,
  BrowserAiEra,
  BrowserBookmark,
  BrowserEngineId,
  BrowserRenderMode,
  DEFAULT_BOOKMARKS,
  DEFAULT_PACKAGE_CATALOG,
  DEFAULT_SYSTEM_REGISTRY,
  loadBrowserBookmarks,
  loadPackageCatalog,
  loadSystemRegistry,
  REGISTRY_DESCRIPTORS,
  RegistryEntryDescriptor,
  saveBrowserBookmarks,
  savePackageCatalog,
  saveSystemRegistry,
  SoftwarePackage,
  SystemRegistry,
} from './osSystemCore';
import {
  buildSharewareDepotHtml,
  downloadBootableIsoImage,
  downloadBootableUsbDiskImage,
  downloadPortableHostApp,
  dropSetupExeToVfs,
  executeVfsSetupExe,
  getPwaHostState,
  isPrimaryBootable,
  openFdiskScreen,
  partitionTable,
  repairBootablePrimaryPartition,
  syncPartitionTableWithRegistry,
  toggleHardwareFullscreen,
  triggerNativePwaInstall,
} from './osDualInstall';
import {
  getActiveLocalUser,
  openLocalSignInScreen,
  openPhysicalBooterModal,
  renderBootManagerOptions,
  renderOsSetupPartitionOptionsUI,
  syncLocalAccountStartPill,
  upsertLocalAccount,
} from './osPhysicalBooter';
import {
  applyPerfPreset,
  computeHardwareTelemetry,
  detectHostHardware,
  getEffectiveRamDisplay,
  getEffectiveRamMB,
  refreshPerfAdjustIfOpen,
  registerPerfRegistryProvider,
} from './osHardwarePerf';
import {
  applyBios5000EffectsToOS,
  BIOS_FLAGSHIP_IDS,
  getActivatedBiosCount,
  getBiosCpuLabelSuffix,
  getBiosRamBoostMB,
  initCmos5000Listeners,
  isBiosChromeGpuAccelerated,
  isBiosTpmVerified,
  registerBios5000Callbacks,
  renderCmos5000Browser,
  resetAllBios5000ToDefaults,
  TOTAL_BIOS_FEATURES,
} from './osBios5000';

export interface OsBridgeCallbacks {
  openApp: (appName: string, bypassPkgCheck?: boolean) => Promise<void>;
  closeApp: (appName: string) => void;
  showOsDialog: (message: string, title?: string) => void;
  rebootGemini95: () => void;
  updateClock: () => void;
  syncTaskbarDock?: () => void;
  clampOpenWindows?: () => void;
  unlockAchievement?: (id: string) => void;
  getGeminiInstance: (context: string) => Promise<any | null>;
  injectShimIntoHtml: (rawHtml: string) => string;
  addVfsFile: (
    name: string,
    type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe',
    parent: string,
    content?: string,
    appTarget?: string,
    pkgId?: string,
    sizeMB?: number,
  ) => void;
  removeVfsFile: (name: string, parent: string) => void;
  openExplorerAt: (folderPath: string) => void;
  getVfsFiles: () => Array<{
    name: string;
    type: string;
    parent: string;
    content?: string;
    appTarget?: string;
    pkgId?: string;
    sizeMB?: number;
  }>;
  resetVfsToFactory: () => void;
  refreshExplorerIfOpen: () => void;
  sfx: {
    enabled: boolean;
    masterVolume: number;
    pitchMultiplier: number;
    dacBitDepth: number;
    tapeSaturation: number;
    floppyMechanical: boolean;
    playClick: () => void;
    playWindowOpen: () => void;
    playChordError: () => void;
    playPostBeep: () => void;
    playFloppySeek: () => void;
    playStartupChime: () => void;
    playAimReceive: () => void;
    playModemHandshake: () => void;
  };
}

// Singleton runtime state shared across OS modules
export let systemRegistry: SystemRegistry = loadSystemRegistry();
registerPerfRegistryProvider(() => systemRegistry);
export let packageCatalog: SoftwarePackage[] = loadPackageCatalog();
export let browserBookmarks: BrowserBookmark[] = loadBrowserBookmarks();

let bridgeRef: OsBridgeCallbacks | null = null;
let currentSettingsTab = 'display';
let currentInstallerMode: 'exe' | 'os' = 'exe';
let currentInstallerCategory: 'all' | 'browser' | 'core' | 'multimedia' | 'system' = 'all';
let selectedInstallerPkgId = 'browser_chrome';
let activeRegeditSubkey = 'HKEY_CURRENT_USER\\Control Panel\\Colors';
let selectedRegDescriptor: RegistryEntryDescriptor | null = null;

export function registerOsBridge(cb: OsBridgeCallbacks) {
  bridgeRef = cb;
}

export function getOsBridge(): OsBridgeCallbacks | null {
  return bridgeRef;
}

export function getInstalledBrowsers(): SoftwarePackage[] {
  return packageCatalog.filter((p) => p.category === 'browser' && p.installed);
}

export function isAppInstalled(appWindowId: string): boolean {
  // Always-available core OS utilities so user can never brick their ability to reinstall or configure!
  if (
    appWindowId === 'abilityToInstall' ||
    appWindowId === 'controlPanel' ||
    appWindowId === 'myComputer' ||
    appWindowId === 'dosPrompt' ||
    appWindowId === 'imageViewer'
  ) {
    return true;
  }
  if (appWindowId === 'chrome') {
    return getInstalledBrowsers().length > 0;
  }
  const matching = packageCatalog.filter((p) => p.appWindowId === appWindowId);
  if (matching.length === 0) return true;
  return matching.some((p) => p.installed);
}

export function getBrowserEngineMeta(engine: BrowserEngineId) {
  switch (engine) {
    case 'ie3':
      return {
        shortTitle: 'Internet Explorer 3.0',
        fullTitle: 'Microsoft Internet Explorer 3.0',
        throbber: 'e',
        iconUrl: APP_SVG_ICONS.ie3,
        uaBadge: 'MSIE 3.02 · Win95',
      };
    case 'netscape':
      return {
        shortTitle: 'Netscape 95',
        fullTitle: 'Netscape Navigator 95 Gold',
        throbber: 'N',
        iconUrl: APP_SVG_ICONS.netscape,
        uaBadge: 'Mozilla/3.04Gold',
      };
    case 'chrome':
    default:
      return {
        shortTitle: 'Google Chrome',
        fullTitle: 'Google Chrome',
        throbber: 'G',
        iconUrl: APP_SVG_ICONS.chrome,
        uaBadge: 'Chrome/131.0 · Angel-OS',
      };
  }
}

// ==================== APPLY SYSTEM REGISTRY LIVE TO ENTIRE OS ====================
export function applySystemRegistryToOS(skipSave = false): void {
  if (!skipSave) {
    saveSystemRegistry(systemRegistry);
  }

  const root = document.documentElement;
  const body = document.body;

  // 1. Theme Preset & Custom Color Overrides
  body.classList.remove(
    'theme-hotdog',
    'theme-cyberpunk',
    'theme-vaporwave',
    'theme-matrix',
    'theme-win31',
    'theme-highcontrast',
  );
  if (!systemRegistry.useCustomColors && systemRegistry.themePreset !== 'standard' && systemRegistry.themePreset !== 'custom') {
    body.classList.add(`theme-${systemRegistry.themePreset}`);
  }

  if (systemRegistry.useCustomColors || systemRegistry.themePreset === 'custom') {
    root.style.setProperty('--desktop-bg', systemRegistry.desktopBgColor);
    root.style.setProperty('--win-bg', systemRegistry.windowBgColor);
    root.style.setProperty('--win-text', systemRegistry.windowTextColor);
    root.style.setProperty(
      '--title-active-bg',
      `linear-gradient(90deg, ${systemRegistry.titleActiveStart}, ${systemRegistry.titleActiveEnd})`,
    );
    root.style.setProperty('--title-active-text', systemRegistry.titleActiveText);
    root.style.setProperty('--title-inactive-bg', systemRegistry.titleInactiveBg);
  } else {
    root.style.removeProperty('--desktop-bg');
    root.style.removeProperty('--win-bg');
    root.style.removeProperty('--win-text');
    root.style.removeProperty('--title-active-bg');
    root.style.removeProperty('--title-active-text');
    root.style.removeProperty('--title-inactive-bg');
  }

  // Wallpaper Pattern Override
  if (systemRegistry.wallpaperPattern === 'grid') {
    root.style.setProperty(
      '--desktop-pattern',
      'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
    );
  } else if (systemRegistry.wallpaperPattern === 'dots') {
    root.style.setProperty('--desktop-pattern', 'radial-gradient(rgba(255,255,255,0.22) 1.5px, transparent 1.5px)');
  } else if (systemRegistry.wallpaperPattern === 'diagonal') {
    root.style.setProperty(
      '--desktop-pattern',
      'repeating-linear-gradient(45deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 4px, transparent 4px, transparent 12px)',
    );
  } else if (systemRegistry.wallpaperPattern === 'stars') {
    root.style.setProperty(
      '--desktop-pattern',
      'radial-gradient(circle at 20% 35%, rgba(255,255,255,0.5) 1px, transparent 2px), radial-gradient(circle at 75% 65%, rgba(255,255,160,0.45) 1px, transparent 2px)',
    );
  } else {
    root.style.removeProperty('--desktop-pattern');
  }

  // 2. CRT, Monitor Filter & Night Light
  body.classList.toggle('crt-enabled', systemRegistry.crtEnabled);
  root.style.setProperty('--os-crt-opacity', String((systemRegistry.crtOpacity / 100).toFixed(2)));
  root.style.setProperty('--os-crt-pitch', `${systemRegistry.crtScanlinePitch}px`);

  body.classList.toggle('night-light-active', systemRegistry.nightLightEnabled);
  root.style.setProperty('--os-nightlight-alpha', String((systemRegistry.nightLightWarmth / 100).toFixed(2)));

  const desktopEl = document.getElementById('desktop');
  if (desktopEl) {
    desktopEl.style.filter = `brightness(${systemRegistry.brightness}%) contrast(${systemRegistry.contrast}%) saturate(${systemRegistry.saturation}%) hue-rotate(${systemRegistry.hueRotate}deg)`;
  }

  const qsBrightness = document.getElementById('qs-brightness-slider') as HTMLInputElement | null;
  if (qsBrightness) qsBrightness.value = String(systemRegistry.brightness);

  // 3. Window Geometry, Typography & Desktop Shell
  root.style.setProperty('--os-border-w', `${systemRegistry.windowBorderWidth}px`);
  root.style.setProperty('--os-shadow-px', `${systemRegistry.windowShadowSize}px`);
  root.style.setProperty('--os-radius-px', `${systemRegistry.windowCornerRadius}px`);
  root.style.setProperty('--os-titlebar-h', `${systemRegistry.titlebarHeight}px`);
  root.style.setProperty('--os-icon-size', `${systemRegistry.desktopIconSize}px`);
  root.style.fontSize = `${systemRegistry.uiFontScale}%`;

  const fontMap: Record<SystemRegistry['uiFontFamily'], string> = {
    jakarta: "'Plus Jakarta Sans', Tahoma, sans-serif",
    mono: "'IBM Plex Mono', monospace",
    vt323: "'VT323', monospace",
    serif: "Georgia, 'Times New Roman', serif",
    courier: "'Courier New', Courier, monospace",
  };
  root.style.setProperty('--os-font-family', fontMap[systemRegistry.uiFontFamily] || fontMap.jakarta);

  const stickyNote = document.getElementById('desktop-welcome');
  if (stickyNote) {
    stickyNote.style.display = systemRegistry.showWelcomeSticky ? 'block' : 'none';
  }

  // 4. Taskbar, Quick Settings Tiles & Shell Visibility
  const taskbar = document.getElementById('taskbar');
  if (taskbar) {
    taskbar.classList.toggle('centered-taskbar', systemRegistry.taskbarCentered);
    taskbar.classList.toggle('with-labels', Boolean(systemRegistry.taskbarShowLabels));
    taskbar.classList.toggle('top-docked', systemRegistry.taskbarPosition === 'top');
    taskbar.classList.toggle('auto-hide-taskbar', systemRegistry.taskbarAutoHide);
  }
  body.classList.toggle('taskbar-is-top', systemRegistry.taskbarPosition === 'top');
  body.classList.toggle('taskbar-is-centered', systemRegistry.taskbarCentered);

  const setVis = (id: string, show: boolean) => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  };
  setVis('taskbar-search-btn', systemRegistry.showSearchBtn);
  setVis('taskbar-taskview-btn', systemRegistry.showTaskViewBtn);
  setVis('taskbar-widgets-btn', systemRegistry.showWidgetsBtn);
  setVis('show-desktop-btn', systemRegistry.showDesktopBtn);
  setVis('taskbar-copilot-btn', systemRegistry.showCopilotBtn);

  const startLabelSpan = document.getElementById('start-button-label') as HTMLElement | null;
  if (startLabelSpan) {
    startLabelSpan.textContent = systemRegistry.startButtonLabel || 'Start';
    startLabelSpan.style.display = systemRegistry.showStartText ? 'inline' : 'none';
  }

  // Sync Quick Settings active tiles
  document.getElementById('qs-tile-center-taskbar')?.classList.toggle('active', systemRegistry.taskbarCentered);
  document.getElementById('qs-tile-labels')?.classList.toggle('active', Boolean(systemRegistry.taskbarShowLabels));
  document.getElementById('qs-tile-nightlight')?.classList.toggle('active', systemRegistry.nightLightEnabled);
  document.getElementById('qs-tile-crt')?.classList.toggle('active', systemRegistry.crtEnabled);
  document.getElementById('qs-tile-audio')?.classList.toggle('active', systemRegistry.audioEnabled);
  document.getElementById('qs-tile-top-dock')?.classList.toggle('active', systemRegistry.taskbarPosition === 'top');
  document.getElementById('qs-tile-autohide')?.classList.toggle('active', systemRegistry.taskbarAutoHide);

  // 5. Sound Blaster 16 DSP Sync
  if (bridgeRef) {
    bridgeRef.sfx.enabled = systemRegistry.audioEnabled;
    bridgeRef.sfx.masterVolume = systemRegistry.masterVolume / 100;
    bridgeRef.sfx.pitchMultiplier = systemRegistry.sfxPitchMultiplier;
    bridgeRef.sfx.dacBitDepth = systemRegistry.dacBitDepth;
    bridgeRef.sfx.tapeSaturation = systemRegistry.chimeTapeSaturation;
    bridgeRef.sfx.floppyMechanical = systemRegistry.floppyMechanicalSfx;
    bridgeRef.updateClock();
  }
  const traySound = document.getElementById('tray-sound-btn');
  if (traySound) {
    traySound.classList.toggle('is-muted', !systemRegistry.audioEnabled);
    traySound.title = systemRegistry.audioEnabled ? 'Sound On — Click to Mute Retro SFX' : 'Sound Muted — Click to Enable Retro SFX';
  }
  const trayCrt = document.getElementById('tray-crt-btn');
  if (trayCrt) {
    trayCrt.classList.toggle('is-crt-off', !systemRegistry.crtEnabled);
    trayCrt.title = systemRegistry.crtEnabled ? 'CRT Scanlines On — Click to Toggle' : 'CRT Scanlines Off — Click to Toggle';
  }

  // 6. BIOS POST & Explorer Hardware Labels (Including Activated BIOS 5,120 Overrides)
  const biosCpu = document.getElementById('bios-cpu-label');
  if (biosCpu) {
    const tpmTag = isBiosTpmVerified() ? ' · TPM 2.0 + Secure Boot' : '';
    biosCpu.textContent = `${systemRegistry.cpuModel}${systemRegistry.cpuTurboBoost ? ' [TURBO]' : ''}${getBiosCpuLabelSuffix()} + Gemini Neural Co-Processor${tpmTag}`;
  }
  const biosRam = document.getElementById('bios-ram-counter');
  if (biosRam) {
    const totalRamMb = getEffectiveRamMB(systemRegistry, getBiosRamBoostMB());
    biosRam.textContent = `${totalRamMb * 1024}K OK${getBiosRamBoostMB() > 0 ? ' [XMP-6400]' : ''}`;
  }
  const biosFs = document.getElementById('bios-fs-label');
  if (biosFs) biosFs.textContent = systemRegistry.fileSystemFormat;

  refreshPerfAdjustIfOpen();
  syncPartitionTableWithRegistry();

  const driveDBtn = document.getElementById('explorer-drive-d-btn');
  if (driveDBtn) {
    driveDBtn.style.display =
      partitionTable.logicalD.exists && systemRegistry.enableSecondaryDriveD ? 'inline-flex' : 'none';
  }

  const explorerSpace = document.getElementById('explorer-status-space');
  if (explorerSpace) {
    const cCap = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : systemRegistry.primaryPartitionSizeMB;
    const usedMb = packageCatalog.reduce((acc, p) => acc + (p.installed ? p.sizeMB : 0), 24.5);
    const freeMb = Math.max(40, Math.round(cCap - usedMb));
    explorerSpace.textContent = `Free Space: ${freeMb.toLocaleString()} MB / ${cCap.toLocaleString()} MB (${systemRegistry.fileSystemFormat})`;
  }

  // 7. Synchronize Installed Package Icons, Browser Engine Branding & Dormant BIOS 5,120 Effects
  syncInstalledShortcutsToDesktop();
  syncBrowserChromeToEngine();
  syncLocalAccountStartPill();
  applyBios5000EffectsToOS();
  refreshRegeditIfOpen();
  refreshMasterSettingsPreview();
}

export function syncInstalledShortcutsToDesktop(): void {
  // Regular single-package shortcuts
  document.querySelectorAll<HTMLElement>('[data-pkg-id]').forEach((el) => {
    const pkgId = el.dataset.pkgId;
    const pkg = packageCatalog.find((p) => p.pkgId === pkgId);
    if (!pkg) return;
    const isDesktopIcon = el.classList.contains('icon');
    const shouldShow = pkg.installed && (isDesktopIcon ? pkg.desktopShortcut : pkg.startMenuShortcut);
    el.style.display = shouldShow ? '' : 'none';
  });
  window.dispatchEvent(new CustomEvent('angelos:icons-changed'));

  // Browser desktop & start menu shortcut (visible if ANY browser engine is installed)
  const installedBrowsers = getInstalledBrowsers();
  const hasAnyBrowser = installedBrowsers.length > 0;

  // Ensure active defaultBrowserEngine is one of the installed ones if any exist
  if (hasAnyBrowser && !installedBrowsers.some((b) => b.browserEngine === systemRegistry.defaultBrowserEngine)) {
    systemRegistry.defaultBrowserEngine = installedBrowsers[0].browserEngine || 'chrome';
    saveSystemRegistry(systemRegistry);
  }

  const activeEnginePkg = installedBrowsers.find((b) => b.browserEngine === systemRegistry.defaultBrowserEngine) || installedBrowsers[0];
  const meta = getBrowserEngineMeta(systemRegistry.defaultBrowserEngine);

  const deskBrowserIcon = document.querySelector<HTMLElement>('.icon[data-pkg-app="chrome"]');
  if (deskBrowserIcon) {
    deskBrowserIcon.style.display = hasAnyBrowser && (activeEnginePkg?.desktopShortcut ?? true) ? '' : 'none';
    const img = document.getElementById('desktop-browser-icon-img') as HTMLImageElement | null;
    const lbl = document.getElementById('desktop-browser-icon-label');
    if (img) img.src = meta.iconUrl;
    if (lbl) lbl.textContent = meta.shortTitle;
  }

  const startBrowserItem = document.getElementById('start-menu-browser-item');
  if (startBrowserItem) {
    startBrowserItem.style.display = hasAnyBrowser && (activeEnginePkg?.startMenuShortcut ?? true) ? '' : 'none';
    const tileImg = startBrowserItem.querySelector('img') as HTMLImageElement | null;
    const tileSpan = startBrowserItem.querySelector('span');
    if (tileImg && tileSpan) {
      tileImg.src = meta.iconUrl;
      tileSpan.textContent = meta.shortTitle === 'Google Chrome' ? 'Chrome' : meta.shortTitle;
    } else {
      startBrowserItem.innerHTML = `${activeEnginePkg?.iconHtml || '🟢'} ${meta.shortTitle}`;
    }
  }

  // Disk space meter in Ability to Install
  const diskMeter = document.getElementById('ability-disk-meter');
  if (diskMeter) {
    const cCap = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : systemRegistry.primaryPartitionSizeMB;
    const used = packageCatalog.reduce((sum, p) => sum + (p.installed ? p.sizeMB : 0), 24.5);
    diskMeter.textContent = `C:\\ Used: ${used.toFixed(1)} / ${cCap} MB (${systemRegistry.fileSystemFormat})`;
  }

  bridgeRef?.syncTaskbarDock?.();
  bridgeRef?.clampOpenWindows?.();
}

// ==================== MULTI-ENGINE & PHYSICAL GOOGLE CHROME WEB BROWSER ====================
interface BrowserTabState {
  id: string;
  title: string;
  url: string;
  mode: BrowserRenderMode;
  cachedHtml: string;
  embedUrl?: string;
  history: string[];
  historyIdx: number;
}

const browserTabs: BrowserTabState[] = [];
let activeTabId = '';
let renderActiveBrowserTabFn: (() => void) | null = null;
let navigateActiveBrowserTabFn: ((url: string, pushHistory?: boolean, explicitMode?: BrowserRenderMode) => Promise<void>) | null = null;
let switchBrowserToAiFn: ((url?: string) => void) | null = null;

export function switchBrowserToAiMode(url?: string): void {
  switchBrowserToAiFn?.(url);
}

function escapeHtml(raw: string): string {
  return String(raw || '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return ch;
    }
  });
}

function extractYouTubeId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\/+/, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const v = u.searchParams.get('v') || '';
        return /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
      }
      const embedMatch = u.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {}
  return null;
}

function isHomePortalUrl(rawUrl: string): boolean {
  const lower = (rawUrl || '').trim().toLowerCase();
  return !lower || lower === 'chrome://newtab' || lower === 'about:portal' || lower === 'about:home' || lower === 'about:blank';
}

export function syncBrowserChromeToEngine(): void {
  const win = document.getElementById('chrome');
  if (!win) return;
  const installedBrowsers = getInstalledBrowsers();
  const engineSelect = document.getElementById('browser-engine-select') as HTMLSelectElement | null;
  const eraSelect = document.getElementById('chrome-era-select') as HTMLSelectElement | null;
  const zoomReadout = document.getElementById('chrome-zoom-readout');
  const throbber = document.getElementById('browser-throbber');
  const connBadge = document.getElementById('browser-conn-badge');
  const winTitle = document.getElementById('browser-window-title');

  win.classList.remove('browser-engine-chrome', 'browser-engine-netscape', 'browser-engine-ie3', 'browser-engine-cyberchrome');
  win.classList.add(`browser-engine-${systemRegistry.defaultBrowserEngine}`);

  if (engineSelect) {
    engineSelect.innerHTML = '';
    installedBrowsers.forEach((pkg) => {
      if (!pkg.browserEngine) return;
      const opt = document.createElement('option');
      opt.value = pkg.browserEngine;
      opt.textContent = `${pkg.iconHtml} ${pkg.name.replace(' Gold', '')}`;
      if (pkg.browserEngine === systemRegistry.defaultBrowserEngine) opt.selected = true;
      engineSelect.appendChild(opt);
    });
  }

  if (eraSelect) {
    eraSelect.value = systemRegistry.browserAiEra;
  }
  if (zoomReadout) {
    zoomReadout.textContent = `${systemRegistry.browserZoomPercent}%`;
  }

  const meta = getBrowserEngineMeta(systemRegistry.defaultBrowserEngine);
  const currentTab = browserTabs.find((t) => t.id === activeTabId);
  if (throbber) throbber.textContent = meta.throbber;
  if (connBadge) {
    const kbps = systemRegistry.modemBaudRate >= 1000000 ? 'T1 1.0 Mbps' : `${(systemRegistry.modemBaudRate / 1000).toFixed(1)} kbps`;
    const modeLabel = (currentTab?.mode || systemRegistry.defaultBrowserMode) === 'live' ? 'Live Web' : 'AI Web';
    connBadge.textContent = `${meta.shortTitle} · ${modeLabel} · ${kbps}`;
  }

  if (winTitle) {
    const tabTitle = currentTab?.title || (systemRegistry.defaultBrowserEngine === 'chrome' ? 'New Tab' : 'Home Portal');
    winTitle.textContent =
      systemRegistry.defaultBrowserEngine === 'chrome' ? `${meta.shortTitle} — ${tabTitle}` : `${meta.fullTitle} — [${tabTitle}]`;
  }

  const iframe = document.getElementById('browser-frame') as HTMLIFrameElement | null;
  if (iframe) {
    iframe.style.zoom = `${systemRegistry.browserZoomPercent}%`;
  }
}

function buildChromeNewTabHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>New Tab</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: #ffffff;
    color: #202124;
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    display: flex;
    flex-direction: column;
  }
  .ntp-topbar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
    padding: 14px 22px;
    font-size: 13px;
  }
  .ntp-topbar a {
    color: #3c4043;
    text-decoration: none;
    cursor: pointer;
  }
  .ntp-topbar a:hover {
    text-decoration: underline;
  }
  .ntp-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #1a73e8;
    color: #ffffff;
    font-weight: 700;
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .ntp-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 20px 44px 20px;
  }
  .google-wordmark {
    margin-bottom: 24px;
    user-select: none;
  }
  .ntp-search-form {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .ntp-search-box {
    width: 100%;
    height: 46px;
    border-radius: 999px;
    border: 1px solid #dfe1e5;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(32, 33, 36, 0.1);
    display: flex;
    align-items: center;
    padding: 0 18px;
    gap: 12px;
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }
  .ntp-search-box:hover,
  .ntp-search-box:focus-within {
    border-color: rgba(223, 225, 229, 0);
    box-shadow: 0 3px 12px rgba(32, 33, 36, 0.2);
  }
  .ntp-search-icon {
    color: #9aa0a6;
    font-size: 16px;
    flex-shrink: 0;
  }
  .ntp-search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 15px;
    color: #202124;
    background: transparent;
  }
  .ntp-btn-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .ntp-btn {
    background: #f8f9fa;
    border: 1px solid #f8f9fa;
    border-radius: 4px;
    color: #3c4043;
    font-size: 13px;
    font-weight: 500;
    padding: 9px 18px;
    cursor: pointer;
  }
  .ntp-btn:hover {
    border-color: #dadce0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    color: #202124;
  }
  .ntp-btn.ai {
    background: #e8f0fe;
    color: #1967d2;
    border-color: #d2e3fc;
  }
  .ntp-shortcuts {
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(6, 92px);
    gap: 10px;
    max-width: 100%;
  }
  @media (max-width: 620px) {
    .ntp-shortcuts { grid-template-columns: repeat(3, 92px); }
  }
  .shortcut-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 6px;
    border-radius: 8px;
    text-decoration: none;
    color: #202124;
    font-size: 12px;
    text-align: center;
    transition: background-color 0.12s ease;
  }
  .shortcut-tile:hover {
    background: #f1f3f4;
  }
  .shortcut-circle {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #f1f3f4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    color: #1a73e8;
  }
  .shortcut-name {
    max-width: 82px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ntp-footer {
    padding: 10px 18px;
    border-top: 1px solid #f1f3f4;
    color: #5f6368;
    font-size: 11.5px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
</head>
<body>
  <div class="ntp-topbar">
    <a href="live://https://en.m.wikipedia.org/wiki/Main_Page">Wikipedia</a>
    <a href="http://www.tucows-95-downloads.com">.EXE Depot</a>
    <a href="chrome://settings">Settings</a>
    <span class="ntp-avatar" title="Angel-OS User">A</span>
  </div>

  <div class="ntp-main">
    <svg class="google-wordmark" width="248" height="82" viewBox="0 0 272 92" aria-label="Google">
      <text x="10" y="68" font-family="'Product Sans', 'Plus Jakarta Sans', Arial, sans-serif" font-size="68" font-weight="700" letter-spacing="-2">
        <tspan fill="#4285F4">G</tspan><tspan fill="#EA4335">o</tspan><tspan fill="#FBBC05">o</tspan><tspan fill="#4285F4">g</tspan><tspan fill="#34A853">l</tspan><tspan fill="#EA4335">e</tspan>
      </text>
    </svg>

    <form class="ntp-search-form" id="ntp-search-form">
      <div class="ntp-search-box">
        <span class="ntp-search-icon">🔍</span>
        <input
          type="text"
          id="ntp-query"
          class="ntp-search-input"
          placeholder="Search Google or type a URL (e.g. example.com, wikipedia.org)"
          autocomplete="off"
          autofocus
        />
      </div>
      <div class="ntp-btn-row">
        <button type="submit" class="ntp-btn">Search Live Web</button>
        <button type="button" class="ntp-btn ai" id="ntp-ai-btn">✨ Synthesize with AI Web</button>
      </div>
    </form>

    <div class="ntp-shortcuts">
      <a class="shortcut-tile" href="live://https://en.m.wikipedia.org/wiki/Windows_95">
        <div class="shortcut-circle" style="background:#e8f0fe;color:#1967d2;">W</div>
        <span class="shortcut-name">Windows 95</span>
      </a>
      <a class="shortcut-tile" href="live://https://example.com">
        <div class="shortcut-circle" style="background:#e6f4ea;color:#137333;">🌐</div>
        <span class="shortcut-name">Example.com</span>
      </a>
      <a class="shortcut-tile" href="live://https://www.youtube.com/watch?v=4xDzrJKXOOY">
        <div class="shortcut-circle" style="background:#fce8e6;color:#c5221f;">▶</div>
        <span class="shortcut-name">Synthwave TV</span>
      </a>
      <a class="shortcut-tile" href="http://www.tucows-95-downloads.com">
        <div class="shortcut-circle" style="background:#fef7e0;color:#b06000;">📥</div>
        <span class="shortcut-name">.EXE Depot</span>
      </a>
      <a class="shortcut-tile" href="https://www.area51-truth-1995.org">
        <div class="shortcut-circle" style="background:#f3e8fd;color:#7627bb;">👽</div>
        <span class="shortcut-name">Area 51 (AI)</span>
      </a>
      <a class="shortcut-tile" href="chrome://settings">
        <div class="shortcut-circle" style="background:#f1f3f4;color:#3c4043;">⚙️</div>
        <span class="shortcut-name">Settings</span>
      </a>
    </div>
  </div>

  <div class="ntp-footer">
    <span>Google Chrome · Angel-OS Edition</span>
    <span>Type any URL or search — Live Web works with or without a backend (static Wikipedia + relay engine), or toggle ✨ AI for Time-Machine pages</span>
  </div>

  <script>
    (function() {
      var form = document.getElementById('ntp-search-form');
      var input = document.getElementById('ntp-query');
      var aiBtn = document.getElementById('ntp-ai-btn');
      function go(forceAi) {
        var q = (input && input.value || '').trim();
        if (!q) return;
        if (forceAi) {
          window.parent.postMessage({ __gemini95Navigate: true, url: 'ai://' + q }, '*');
          return;
        }
        var target = (/^(https?:|chrome:|about:|file:|live:)/i.test(q) || (q.indexOf('.') !== -1 && q.indexOf(' ') === -1))
          ? (q.indexOf('://') === -1 ? 'live://https://' + q : q)
          : 'live://' + q;
        window.parent.postMessage({ __gemini95Navigate: true, url: target }, '*');
      }
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          go(false);
        });
      }
      if (aiBtn) {
        aiBtn.addEventListener('click', function() {
          go(true);
        });
      }
    })();
  </script>
</body>
</html>`;
}

function buildChromeSettingsHtml(): string {
  const meta = getBrowserEngineMeta(systemRegistry.defaultBrowserEngine);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Chrome Settings</title>
<style>
  body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f8f9fa; color: #202124; }
  header { background: #ffffff; border-bottom: 1px solid #dadce0; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
  h1 { margin: 0; font-size: 18px; font-weight: 600; color: #202124; }
  main { max-width: 660px; margin: 20px auto; padding: 0 16px; display: flex; flex-direction: column; gap: 14px; }
  .card { background: #ffffff; border: 1px solid #dadce0; border-radius: 8px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .card h2 { margin: 0 0 8px 0; font-size: 14px; color: #1a73e8; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-top: 1px solid #f1f3f4; font-size: 13px; }
  .row:first-of-type { border-top: none; }
  .btn { background: #1a73e8; color: #fff; border: none; border-radius: 4px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
  .btn.secondary { background: #f1f3f4; color: #202124; border: 1px solid #dadce0; }
  code { background: #f1f3f4; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
</style>
</head>
<body>
  <header>
    <h1>⚙️ Google Chrome — Settings</h1>
    <a class="btn secondary" href="chrome://newtab">← Back to New Tab</a>
  </header>
  <main>
    <div class="card">
      <h2>Active Engine &amp; Connection Profile</h2>
      <div class="row"><span>Default Browser Engine</span><b>${escapeHtml(meta.fullTitle)} (Downloaded &amp; Installed on C:\\)</b></div>
      <div class="row"><span>Installer Binary</span><code>C:\\Downloads\\CHROME_SETUP.EXE</code></div>
      <div class="row"><span>BIOS GPU Hardware Hook</span><code>${isBiosChromeGpuAccelerated() ? `⚡ ACTIVE (${BIOS_FLAGSHIP_IDS.chromeGpu})` : 'Dormant (Enable in BIOS)'}</code></div>
      <div class="row"><span>Default Browsing Mode</span><code>${systemRegistry.defaultBrowserMode.toUpperCase()}</code></div>
      <div class="row"><span>AI Time-Machine Era</span><code>${systemRegistry.browserAiEra}</code></div>
      <div class="row"><span>Viewport Zoom</span><code>${systemRegistry.browserZoomPercent}%</code></div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" onclick="window.parent.postMessage({ __gemini95OpenSettings: true, tab: 'browser' }, '*')">Open OS Browser &amp; Modem Settings</button>
        <button class="btn secondary" onclick="window.parent.postMessage({ __gemini95OpenInstaller: true, cat: 'browser' }, '*')">Manage Classic Browser Engines...</button>
      </div>
    </div>
    <div class="card">
      <h2>Built-in Chrome Pages</h2>
      <div class="row"><span>New Tab Page</span><a href="chrome://newtab">chrome://newtab</a></div>
      <div class="row"><span>Downloads &amp; .EXE Shareware Mirror</span><a href="chrome://downloads">chrome://downloads</a></div>
    </div>
  </main>
</body>
</html>`;
}

function buildChromeErrorPageHtml(url: string, reason: string): string {
  const safeUrl = escapeHtml(url);
  const safeReason = escapeHtml(reason);
  const encodedUrlArg = JSON.stringify(url);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Site Unreachable</title>
<style>
  body { margin: 0; font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: #ffffff; color: #202124; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; box-sizing: border-box; }
  .err-wrap { max-width: 540px; width: 100%; }
  .dino { font-size: 42px; margin-bottom: 12px; }
  h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #202124; }
  p { margin: 6px 0; font-size: 13.5px; color: #5f6368; line-height: 1.5; }
  .reason { margin: 12px 0; padding: 10px 12px; background: #f8f9fa; border: 1px solid #dadce0; border-radius: 6px; font-family: monospace; font-size: 12px; color: #c5221f; word-break: break-word; }
  .code { font-family: monospace; font-size: 11.5px; color: #70757a; margin-top: 10px; }
  .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
  .btn { border: none; border-radius: 999px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: #1a73e8; color: #ffffff; }
  .btn-primary:hover { background: #1765cc; }
  .btn-secondary { background: #ffffff; color: #1a73e8; border: 1px solid #dadce0; }
  .btn-secondary:hover { background: #f1f3f4; }
</style>
</head>
<body>
  <div class="err-wrap">
    <div class="dino">🦖</div>
    <h1>This site can’t be reached in Live Web mode</h1>
    <p><b>${safeUrl}</b> could not be loaded through any Live Web route (backend proxy, Wikipedia API, direct CORS, public relays, Reader View).</p>
    <div class="reason">${safeReason}</div>
    <p>You can synthesize a working version of this destination with <b>✨ AI Web</b> or try reloading it.</p>
    <div class="actions">
      <button class="btn btn-primary" onclick='window.parent.postMessage({ __gemini95SwitchToAi: true, url: ${encodedUrlArg} }, "*")'>✨ Load with AI Web</button>
      <button class="btn btn-secondary" onclick='window.parent.postMessage({ __gemini95Navigate: true, url: ${encodedUrlArg} }, "*")'>↻ Reload Live</button>
      <a class="btn btn-secondary" href="chrome://newtab">🏠 New Tab</a>
    </div>
    <div class="code">ERR_LIVE_PROXY_UNAVAILABLE</div>
  </div>
</body>
</html>`;
}

function buildEnginePortalHtml(engine: BrowserEngineId): string {
  if (engine === 'ie3') {
    return `<!DOCTYPE html>
<html><head><title>MSN Start Page</title><style>
  body { background: #ffffff; color: #000000; font-family: Tahoma, Arial, sans-serif; margin: 0; padding: 0; }
  .hdr { background: linear-gradient(90deg, #003399, #0066cc); color: #fff; padding: 14px 18px; border-bottom: 3px solid #ffcc00; }
  .hdr h1 { margin: 0; font-size: 21px; }
  .hdr p { margin: 4px 0 0 0; font-size: 12px; color: #cce6ff; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px; }
  .box { border: 2px outset #d4d0c8; background: #f4f4f0; padding: 12px; font-size: 13px; }
  .box h3 { margin: 0 0 8px 0; color: #003399; font-size: 14px; border-bottom: 1px solid #999; padding-bottom: 4px; }
  a { color: #0033cc; font-weight: bold; text-decoration: underline; }
  a:hover { color: #cc0000; }
</style></head><body>
  <div class="hdr">
    <h1>📘 The Microsoft Network (MSN) — Internet Explorer 3.0 Start Page</h1>
    <p>ActiveX &amp; HTML 3.2 Ready · Switch between 🌐 Live and ✨ AI anytime in the toolbar!</p>
  </div>
  <div class="grid">
    <div class="box">
      <h3>🌐 AI Time-Machine Channels</h3>
      • <a href="ai://https://www.msn-1996-news.com">MSN 1996 Computing &amp; Windows 95 Central</a><br><br>
      • <a href="ai://https://www.encarta-95-atlas.org">Encarta 95 World Knowledge Encyclopedia</a><br><br>
      • <a href="http://www.tucows-95-downloads.com">Tucows 95 .EXE Shareware Mirror</a>
    </div>
    <div class="box">
      <h3>📚 Live Wikipedia &amp; Real Web</h3>
      Click <b>🌐 Live</b> above or try:<br><br>
      • <a href="live://https://en.m.wikipedia.org/wiki/Internet_Explorer_3">Wikipedia: Internet Explorer 3 (Live)</a><br><br>
      • <a href="live://https://en.m.wikipedia.org/wiki/Windows_95">Wikipedia: Windows 95 History (Live)</a><br><br>
      • <a href="live://https://example.com">Example.com (Live)</a>
    </div>
  </div>
</body></html>`;
  }

  if (engine === 'netscape') {
    return `<!DOCTYPE html>
<html><head><title>Netscape Portal</title><style>
  body { background: #000044; color: #ffff00; font-family: "Courier New", monospace; text-align: center; margin: 0; padding: 16px; }
  marquee { background: #ff00ff; color: #ffffff; font-weight: bold; padding: 4px; font-size: 13px; border: 2px ridge #00ffff; }
  h1 { color: #00ffff; text-shadow: 2px 2px #ff00ff; margin: 10px 0 4px 0; font-size: 22px; }
  .sub { color: #00ff00; font-size: 12px; margin-bottom: 12px; }
  table { width: 96%; margin: 0 auto; border: 3px ridge #c0c0c0; background: #001a33; border-collapse: collapse; }
  td { border: 2px inset #808080; padding: 10px; text-align: left; vertical-align: top; font-size: 12.5px; color: #ffffff; }
  a { color: #00ffff; font-weight: bold; text-decoration: underline; cursor: pointer; }
  a:hover { color: #ff00ff; background: #ffff00; }
  .counter { display: inline-block; margin-top: 12px; background: #000; color: #00ff00; border: 2px inset #808080; padding: 4px 10px; font-weight: bold; letter-spacing: 3px; }
</style></head><body>
  <marquee>★ NETSCAPE NAVIGATOR 95 GOLD ★ MULTI-TAB LIVE REAL WEB + AI TIME-MACHINE BROWSER ★ SWAP ENGINES ANYTIME IN CHROME SETTINGS OR "ABILITY TO INSTALL"! ★</marquee>
  <h1>🌐 NETSCAPE GEMINI 95 CYBER-PORTAL</h1>
  <div class="sub">Dual Engine: 🌐 Live Web Proxy + ✨ AI Time-Machine · Customizable in Master Settings</div>
  <table>
    <tr>
      <td width="50%">
        <b>🚀 1996 AI TIME-MACHINE SITES</b><br><br>
        • <a href="ai://https://www.cybermall1996.com">CyberMall 1996 Virtual Shopping</a><br>
        • <a href="ai://https://www.area51-ufos-1995.org">Area 51 Declassified UFO Photos</a><br>
        • <a href="ai://https://www.pizzanet-95.com">PizzaNet: Order Pepperoni Over TCP/IP</a><br>
        • <a href="http://www.tucows-95-downloads.com">Tucows 95 .EXE Shareware Mirror</a>
      </td>
      <td width="50%">
        <b>🌍 LIVE REAL-WORLD WEB &amp; LOCAL C:\</b><br><br>
        • <a href="live://https://en.m.wikipedia.org/wiki/Windows_95">Live Wikipedia: Windows 95</a><br>
        • <a href="live://https://en.m.wikipedia.org/wiki/Netscape_Navigator">Live Wikipedia: Netscape Navigator</a><br>
        • <a href="live://https://example.com">Live Example.com</a><br>
        • <a href="ai://https://www.y2k-millennium-bug.com">Y2K Millennium Bug Survival Guide</a>
      </td>
    </tr>
  </table>
  <div class="counter">VISITOR #0095884</div>
</body></html>`;
  }

  return buildChromeNewTabHtml();
}

export function navigateBrowserExternal(url: string): void {
  if (!isAppInstalled('chrome')) {
    bridgeRef?.showOsDialog(
      'No Web Browser is currently installed on C:\\! Launching "Ability to Install" so you can install Google Chrome, Netscape 95, or Internet Explorer 3.0.',
      'Missing Browser Executable',
    );
    openAbilityToInstallCategory('browser');
    return;
  }
  bridgeRef?.openApp('chrome').then(() => {
    if (url.startsWith('live://')) {
      navigateActiveBrowserTabFn?.(url.replace(/^live:\/\//, ''), true, 'live');
    } else if (url.startsWith('ai://')) {
      navigateActiveBrowserTabFn?.(url.replace(/^ai:\/\//, ''), true, 'ai');
    } else {
      navigateActiveBrowserTabFn?.(url, true);
    }
  });
}

export function initMultiEngineBrowser(windowElement: HTMLDivElement): void {
  const tabsListEl = windowElement.querySelector('#browser-tabs-list') as HTMLDivElement;
  const newTabBtn = windowElement.querySelector('#browser-new-tab-btn') as HTMLButtonElement;
  const engineSelect = windowElement.querySelector('#browser-engine-select') as HTMLSelectElement;
  const eraSelect = windowElement.querySelector('#chrome-era-select') as HTMLSelectElement | null;
  const zoomOutBtn = windowElement.querySelector('#chrome-zoom-out') as HTMLButtonElement | null;
  const zoomInBtn = windowElement.querySelector('#chrome-zoom-in') as HTMLButtonElement | null;
  const manageInstallBtn = windowElement.querySelector('#browser-manage-install-btn') as HTMLElement | null;
  const addressBar = windowElement.querySelector('.browser-address-bar') as HTMLInputElement;
  const securityPill = windowElement.querySelector('#chrome-security-pill') as HTMLElement | null;
  const goButton = windowElement.querySelector('.browser-go-button') as HTMLButtonElement;
  const backBtn = windowElement.querySelector('#browser-back') as HTMLButtonElement;
  const forwardBtn = windowElement.querySelector('#browser-forward') as HTMLButtonElement;
  const reloadBtn = windowElement.querySelector('#browser-reload') as HTMLButtonElement;
  const homeBtn = windowElement.querySelector('#browser-home') as HTMLButtonElement;
  const modeAiBtn = windowElement.querySelector('#browser-mode-ai') as HTMLButtonElement;
  const modeLiveBtn = windowElement.querySelector('#browser-mode-live') as HTMLButtonElement;
  const bookmarksContainer = windowElement.querySelector('#browser-bookmarks-items') as HTMLDivElement;
  const exeDepotBtn = windowElement.querySelector('#browser-exe-depot-btn') as HTMLButtonElement | null;
  const addBookmarkBtn = windowElement.querySelector('#browser-add-bookmark-btn') as HTMLButtonElement | null;
  const sourceBtn = windowElement.querySelector('#browser-source-btn') as HTMLButtonElement | null;
  const settingsBtn = windowElement.querySelector('#browser-settings-btn') as HTMLElement | null;
  const chromeMenuBtn = windowElement.querySelector('#chrome-menu-btn') as HTMLButtonElement | null;
  const chromeMenuDropdown = windowElement.querySelector('#chrome-menu-dropdown') as HTMLDivElement | null;
  const chromeMenuNewTab = windowElement.querySelector('#chrome-menu-newtab') as HTMLElement | null;
  const chromeDownloadsMenu = windowElement.querySelector('#chrome-downloads-menu') as HTMLElement | null;
  const chromeExeDepotMenu = windowElement.querySelector('#browser-exe-depot-menu') as HTMLElement | null;
  const chromeAboutBtn = windowElement.querySelector('#chrome-about-btn') as HTMLElement | null;
  const sourceDrawer = windowElement.querySelector('#browser-source-drawer') as HTMLDivElement;
  const sourceTextarea = windowElement.querySelector('#browser-source-textarea') as HTMLTextAreaElement;
  const applySourceBtn = windowElement.querySelector('#browser-apply-source-btn') as HTMLButtonElement;
  const saveVfsBtn = windowElement.querySelector('#browser-save-vfs-btn') as HTMLButtonElement;
  const closeSourceBtn = windowElement.querySelector('#browser-close-source-btn') as HTMLButtonElement;
  const statusText = windowElement.querySelector('#browser-status-text') as HTMLSpanElement;
  const iframe = windowElement.querySelector('#browser-frame') as HTMLIFrameElement;
  const loadingEl = windowElement.querySelector('.browser-loading') as HTMLDivElement;

  function closeChromeMenu() {
    if (chromeMenuDropdown) chromeMenuDropdown.style.display = 'none';
  }

  function getDefaultHomeUrl(): string {
    const configured = (systemRegistry.browserHomePage || '').trim();
    if (!configured || configured === 'about:portal') {
      return systemRegistry.defaultBrowserEngine === 'chrome' ? 'chrome://newtab' : 'about:portal';
    }
    return configured;
  }

  function getActiveTab(): BrowserTabState {
    let tab = browserTabs.find((t) => t.id === activeTabId);
    if (!tab) {
      tab = createNewTab(getDefaultHomeUrl(), false);
    }
    return tab;
  }

  function createNewTab(initialUrl = getDefaultHomeUrl(), autoNav = true): BrowserTabState {
    const id = `tab_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    const portal = buildEnginePortalHtml(systemRegistry.defaultBrowserEngine);
    const defaultTitle = systemRegistry.defaultBrowserEngine === 'chrome' ? 'New Tab' : 'Home Portal';
    const tab: BrowserTabState = {
      id,
      title: isHomePortalUrl(initialUrl) ? defaultTitle : initialUrl.slice(0, 22),
      url: initialUrl,
      mode: systemRegistry.defaultBrowserMode,
      cachedHtml: portal,
      history: [initialUrl],
      historyIdx: 0,
    };
    browserTabs.push(tab);
    activeTabId = id;
    renderTabsBar();
    if (autoNav && !isHomePortalUrl(initialUrl)) {
      navigateTab(initialUrl, false, tab.mode);
    } else {
      displayTabContent(tab);
    }
    return tab;
  }

  function renderBookmarksBar() {
    if (!bookmarksContainer) return;
    bookmarksContainer.innerHTML = '';
    browserBookmarks.forEach((bm, idx) => {
      const btn = document.createElement('button');
      btn.className = 'bookmark-chip';
      btn.textContent = bm.title;
      btn.title = `${bm.url} (${bm.mode.toUpperCase()} mode · Right-click to delete)`;
      btn.addEventListener('click', () => {
        bridgeRef?.sfx.playClick();
        navigateTab(bm.url, true, bm.mode);
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        browserBookmarks.splice(idx, 1);
        saveBrowserBookmarks(browserBookmarks);
        renderBookmarksBar();
        const t = browserTabs.find((x) => x.id === activeTabId);
        if (t) updateToolbarFromTab(t);
      });
      bookmarksContainer.appendChild(btn);
    });
  }

  function renderTabsBar() {
    if (!tabsListEl) return;
    tabsListEl.innerHTML = '';
    browserTabs.forEach((t) => {
      const div = document.createElement('div');
      div.className = `browser-tab-item${t.id === activeTabId ? ' active' : ''}`;

      const fav = document.createElement('span');
      fav.className = 'browser-tab-favicon';
      const lowerUrl = t.url.toLowerCase();
      if (isHomePortalUrl(t.url)) {
        fav.textContent = systemRegistry.defaultBrowserEngine === 'chrome' ? 'G' : '🏠';
      } else if (lowerUrl.startsWith('chrome://settings')) {
        fav.textContent = '⚙️';
      } else if (lowerUrl.startsWith('chrome://downloads') || lowerUrl.includes('tucows')) {
        fav.textContent = '📥';
      } else if (lowerUrl.startsWith('file://')) {
        fav.textContent = '📁';
      } else {
        fav.textContent = t.mode === 'live' ? '🌐' : '✨';
      }
      div.appendChild(fav);

      const span = document.createElement('span');
      span.className = 'browser-tab-title';
      span.textContent = t.title;
      div.appendChild(span);

      if (browserTabs.length > 1) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'browser-tab-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          bridgeRef?.sfx.playClick();
          const idx = browserTabs.findIndex((x) => x.id === t.id);
          if (idx >= 0) browserTabs.splice(idx, 1);
          if (activeTabId === t.id && browserTabs.length > 0) {
            activeTabId = browserTabs[Math.max(0, idx - 1)].id;
          }
          renderTabsBar();
          displayTabContent(getActiveTab());
        });
        div.appendChild(closeBtn);
      }

      div.addEventListener('click', () => {
        bridgeRef?.sfx.playClick();
        activeTabId = t.id;
        renderTabsBar();
        displayTabContent(t);
      });
      tabsListEl.appendChild(div);
    });
  }

  function updateToolbarFromTab(tab: BrowserTabState) {
    addressBar.value = tab.url;
    backBtn.disabled = tab.historyIdx <= 0;
    forwardBtn.disabled = tab.historyIdx >= tab.history.length - 1;
    modeAiBtn.classList.toggle('active', tab.mode === 'ai');
    modeLiveBtn.classList.toggle('active', tab.mode === 'live');

    if (securityPill) {
      const lower = tab.url.toLowerCase();
      if (isHomePortalUrl(tab.url) || lower.startsWith('chrome://') || lower.startsWith('about:')) {
        securityPill.textContent = 'G';
        securityPill.title = 'Google Chrome Internal Page';
      } else if (lower.startsWith('file://')) {
        securityPill.textContent = '📁';
        securityPill.title = 'Local C:\\ File';
      } else if (tab.mode === 'ai') {
        securityPill.textContent = '✨';
        securityPill.title = 'AI Web Time-Machine Page';
      } else if (lower.startsWith('https://')) {
        securityPill.textContent = '🔒';
        securityPill.title = 'Live HTTPS Connection via Angel-OS Proxy';
      } else {
        securityPill.textContent = '🌐';
        securityPill.title = 'Live HTTP Connection via Angel-OS Proxy';
      }
    }

    if (addBookmarkBtn) {
      const isBm = browserBookmarks.some((b) => b.url === tab.url);
      addBookmarkBtn.classList.toggle('bookmarked', isBm);
      addBookmarkBtn.textContent = isBm ? '★' : '☆';
      addBookmarkBtn.title = isBm ? 'Remove bookmark for this tab' : 'Bookmark this tab';
    }

    syncBrowserChromeToEngine();
  }

  function displayTabContent(tab: BrowserTabState) {
    updateToolbarFromTab(tab);
    if (isHomePortalUrl(tab.url)) {
      const portal = buildEnginePortalHtml(systemRegistry.defaultBrowserEngine);
      tab.cachedHtml = portal;
      tab.embedUrl = undefined;
      iframe.removeAttribute('src');
      iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(portal) : portal;
      return;
    }
    if (tab.url.toLowerCase() === 'chrome://settings') {
      const settingsHtml = buildChromeSettingsHtml();
      tab.cachedHtml = settingsHtml;
      tab.embedUrl = undefined;
      iframe.removeAttribute('src');
      iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(settingsHtml) : settingsHtml;
      return;
    }
    if (tab.embedUrl) {
      iframe.removeAttribute('srcdoc');
      iframe.src = tab.embedUrl;
      return;
    }
    iframe.removeAttribute('src');
    iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(tab.cachedHtml) : tab.cachedHtml;
  }

  async function navigateTab(rawUrl: string, pushHistory = true, explicitMode?: BrowserRenderMode): Promise<void> {
    const tab = getActiveTab();
    if (explicitMode) tab.mode = explicitMode;

    let url = rawUrl.trim();
    if (!url) return;

    if (url.startsWith('live://')) {
      url = url.replace(/^live:\/\//, '');
      tab.mode = 'live';
    } else if (url.startsWith('ai://')) {
      url = url.replace(/^ai:\/\//, '');
      tab.mode = 'ai';
    }

    if (isHomePortalUrl(url)) {
      const homeTarget = systemRegistry.defaultBrowserEngine === 'chrome' ? 'chrome://newtab' : 'about:portal';
      tab.url = homeTarget;
      tab.title = systemRegistry.defaultBrowserEngine === 'chrome' ? 'New Tab' : 'Home Portal';
      tab.embedUrl = undefined;
      if (pushHistory) {
        tab.history.splice(tab.historyIdx + 1);
        tab.history.push(homeTarget);
        tab.historyIdx = tab.history.length - 1;
      }
      renderTabsBar();
      displayTabContent(tab);
      if (statusText) {
        statusText.textContent = systemRegistry.defaultBrowserEngine === 'chrome' ? 'Google Chrome — New Tab' : 'Loaded Engine Start Portal.';
      }
      return;
    }

    if (url.toLowerCase() === 'chrome://settings') {
      tab.url = 'chrome://settings';
      tab.title = 'Settings';
      tab.embedUrl = undefined;
      tab.cachedHtml = buildChromeSettingsHtml();
      if (pushHistory) {
        tab.history.splice(tab.historyIdx + 1);
        tab.history.push('chrome://settings');
        tab.historyIdx = tab.history.length - 1;
      }
      renderTabsBar();
      displayTabContent(tab);
      if (statusText) statusText.textContent = 'Google Chrome Settings loaded.';
      return;
    }

    // Built-in Tucows / WinSite .EXE Shareware Depot & chrome://downloads!
    if (url.toLowerCase().includes('tucows-95-downloads') || url.toLowerCase() === 'about:downloads' || url.toLowerCase() === 'chrome://downloads') {
      const depotUrl = url.toLowerCase() === 'chrome://downloads' ? 'chrome://downloads' : 'http://www.tucows-95-downloads.com';
      tab.url = depotUrl;
      tab.title = depotUrl === 'chrome://downloads' ? 'Downloads' : 'Tucows .EXE Depot';
      tab.embedUrl = undefined;
      tab.cachedHtml = buildSharewareDepotHtml();
      if (pushHistory) {
        tab.history.splice(tab.historyIdx + 1);
        tab.history.push(depotUrl);
        tab.historyIdx = tab.history.length - 1;
      }
      renderTabsBar();
      displayTabContent(tab);
      if (statusText) statusText.textContent = 'Loaded .EXE Shareware & Downloads Mirror — Click Save .EXE or Run .EXE!';
      return;
    }

    // Local C:\ Virtual File System HTML/TXT support!
    if (url.toLowerCase().startsWith('file:///c:/') || url.toLowerCase().startsWith('c:\\')) {
      const fileName = url.split(/[/\\]/).pop() || '';
      const found = bridgeRef?.getVfsFiles().find((f) => f.name.toLowerCase() === fileName.toLowerCase());
      if (found && found.content) {
        tab.url = `file:///C:/Documents/${found.name}`;
        tab.title = found.name;
        tab.embedUrl = undefined;
        tab.cachedHtml = found.content.includes('<html')
          ? found.content
          : `<html><body style="font-family:monospace;padding:16px;background:#fff;color:#000;"><pre>${escapeHtml(found.content)}</pre></body></html>`;
        if (pushHistory) {
          tab.history.splice(tab.historyIdx + 1);
          tab.history.push(tab.url);
          tab.historyIdx = tab.history.length - 1;
        }
        renderTabsBar();
        displayTabContent(tab);
        if (statusText) statusText.textContent = `Opened local file ${found.name} from C:\\`;
        return;
      }
    }

    // Normalize URL for Live vs AI mode
    if (tab.mode === 'live') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          // Treat plain search query in Live Mode as a live Wikipedia search/article lookup
          url = `https://en.m.wikipedia.org/w/index.php?search=${encodeURIComponent(url.trim())}`;
        }
      }
    } else {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url.trim().replace(/\s+/g, '-').toLowerCase() + '.com';
      }
    }

    let domain = url;
    try {
      const u = new URL(url);
      domain = u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      domain = url.replace(/^https?:\/\//, '');
    }

    tab.url = url;
    tab.title = domain.slice(0, 24);
    tab.embedUrl = undefined;
    if (pushHistory) {
      tab.history.splice(tab.historyIdx + 1);
      tab.history.push(url);
      tab.historyIdx = tab.history.length - 1;
    }
    renderTabsBar();
    updateToolbarFromTab(tab);

    // Simulated Modem Handshake & Baud Latency
    if (systemRegistry.playModemHandshake) {
      bridgeRef?.sfx.playModemHandshake();
    } else {
      bridgeRef?.sfx.playClick();
    }

    const simulatedDelayMs =
      systemRegistry.modemBaudRate <= 14400
        ? 950
        : systemRegistry.modemBaudRate <= 28800
          ? 550
          : systemRegistry.modemBaudRate <= 56000
            ? 180
            : 0;

    // LIVE REAL-WORLD PROXY MODE (Fetches via /api/browse -> srcdoc with YouTube embed fast-path)
    if (tab.mode === 'live') {
      const ytId = extractYouTubeId(url);
      if (ytId) {
        const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0`;
        tab.embedUrl = embedUrl;
        tab.title = `YouTube · ${ytId}`;
        tab.cachedHtml = `<!DOCTYPE html><html><body style="margin:0;background:#000;"><iframe src="${embedUrl}" style="width:100%;height:100vh;border:0;" allowfullscreen></iframe></body></html>`;
        loadingEl.style.display = 'none';
        iframe.removeAttribute('srcdoc');
        iframe.src = embedUrl;
        renderTabsBar();
        updateToolbarFromTab(tab);
        if (statusText) statusText.textContent = `Embedded YouTube video: ${ytId}`;
        return;
      }

      if (statusText) statusText.textContent = `Connecting to live host ${domain}...`;
      loadingEl.innerHTML = `<div style="border:1px solid #dadce0;border-radius:8px;background:#ffffff;padding:16px 20px;color:#202124;box-shadow:0 4px 14px rgba(0,0,0,0.12);"><b>🌐 Fetching Live Page...</b><br/><small style="color:#5f6368;">${escapeHtml(domain)}</small></div>`;
      loadingEl.style.display = 'flex';

      const showStaticResult = (res: StaticWebResult): void => {
        tab.url = res.finalUrl || url;
        tab.title = (res.title || domain).slice(0, 26);
        tab.cachedHtml = res.html;
        tab.embedUrl = res.embedUrl;
        if (res.embedUrl) {
          iframe.removeAttribute('srcdoc');
          iframe.src = res.embedUrl;
        } else {
          iframe.removeAttribute('src');
          iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(res.html) : res.html;
        }
        if (pushHistory && tab.history[tab.historyIdx] !== tab.url) {
          tab.history[tab.historyIdx] = tab.url;
        }
        renderTabsBar();
        updateToolbarFromTab(tab);
        if (statusText) statusText.textContent = `Loaded Live: ${tab.url} (via ${res.via})`;
      };
      const showLiveError = (reason: string): void => {
        tab.title = 'Site Unreachable';
        tab.embedUrl = undefined;
        tab.cachedHtml = buildChromeErrorPageHtml(url, reason);
        iframe.removeAttribute('src');
        iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(tab.cachedHtml) : tab.cachedHtml;
        renderTabsBar();
        updateToolbarFromTab(tab);
        if (statusText) statusText.textContent = `Live Web could not reach ${domain} — Click "Load with ✨ AI Web" inside page.`;
      };
      const runStaticEngine = async (): Promise<void> => {
        const res = await fetchLivePageClientSide(url, (msg) => {
          if (statusText) statusText.textContent = `${domain}: ${msg}`;
        });
        if (res.ok) showStaticResult(res);
        else showLiveError(`Every browser-side route was tried (no backend needed): ${res.error || 'unreachable'}`);
      };

      try {
        if (simulatedDelayMs > 0) {
          await new Promise((r) => setTimeout(r, simulatedDelayMs));
        }

        // Static hosting (GitHub Pages, portable ZIP, file://): no Express backend -> browser-side engine.
        if (isBrowseBackendMissing() || window.location.protocol === 'file:') {
          await runStaticEngine();
          return;
        }

        let resp: Response | null = null;
        let data: any = null;
        try {
          resp = await fetch(`/api/browse?url=${encodeURIComponent(url)}`);
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          data = ct.includes('application/json') ? await resp.json().catch(() => null) : null;
        } catch {
          resp = null;
        }
        if (!resp || !data || typeof data.ok !== 'boolean') {
          markBrowseBackend('missing');
          await runStaticEngine();
          return;
        }
        markBrowseBackend('present');
        if (resp.ok && data && data.ok && typeof data.html === 'string') {
          if (typeof data.finalUrl === 'string' && data.finalUrl) tab.url = data.finalUrl;
          if (typeof data.title === 'string' && data.title) tab.title = data.title.slice(0, 26);
          tab.cachedHtml = data.html;
          tab.embedUrl = undefined;
          iframe.removeAttribute('src');
          iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(data.html) : data.html;
          renderTabsBar();
          updateToolbarFromTab(tab);
          if (statusText) statusText.textContent = `Loaded Live: ${tab.url} (HTTP ${data.status || 200})`;
        } else {
          const backendReason = data?.error || `HTTP ${resp.status || 'Error'} from proxy`;
          const res = await fetchLivePageClientSide(url, (msg) => {
            if (statusText) statusText.textContent = `${domain}: ${msg}`;
          });
          if (res.ok) showStaticResult(res);
          else showLiveError(`${backendReason} · ${res.error || ''}`);
        }
      } catch (err: any) {
        showLiveError(String(err?.message || 'Network connection error'));
        if (statusText) statusText.textContent = `Live Web error: ${String(err?.message || 'Network connection error')}`;
      } finally {
        loadingEl.style.display = 'none';
      }
      return;
    }

    // AI TIME-MACHINE / MULTI-ERA SYNTHESIS MODE
    const eraDesc =
      systemRegistry.browserAiEra === '1996'
        ? 'gloriously authentic 1996 GeoCities / Netscape 3.0 Web 1.0 HTML3.2 webpage (high-contrast retro backgrounds, ridge/outset HTML tables, <marquee>, visitor counter, guestbook/poll with working inline JS)'
        : systemRegistry.browserAiEra === '2001'
          ? 'nostalgic 2001 Web 1.5 Dot-Com / XP-era portal webpage (glossy bevel headers, 3-column portal layout, poll widget, forum thread box, working JS tabs)'
          : 'crisp, modern, responsive HTML5 interactive webpage with clean typography, interactive JS widgets, and structured cards';

    const imgInstruction = systemRegistry.browserShowImages
      ? `Include at least 2 detailed custom inline <svg> illustrations matching "${domain}".`
      : `TEXT-ONLY MODE ACTIVE: Do NOT include any <svg> or <img> elements; use ASCII boxes instead.`;

    const scriptInstruction = systemRegistry.browserEnableScripts
      ? `Include interactive inline <script> buttons/widgets so the user can interact with the page.`
      : `SCRIPTS DISABLED: Do NOT include any <script> tags.`;

    loadingEl.innerHTML = `
      <div style="border:2px outset #fff; background:#c0c0c0; padding:16px; max-width:360px; box-shadow:3px 3px 0 #000; color:#000;">
        <div style="background:#000080; color:#fff; font-weight:bold; padding:3px 6px; margin-bottom:10px; font-size:12px;">
          ✨ AI Web Synthesizer — ${systemRegistry.browserAiEra} Era (${systemRegistry.modemBaudRate.toLocaleString()} bps)
        </div>
        <p style="margin:6px 0; font-size:12px;">Host: <b>${escapeHtml(domain)}</b></p>
        <p style="margin:4px 0; font-size:11px; color:#333;">Engine: ${escapeHtml(getBrowserEngineMeta(systemRegistry.defaultBrowserEngine).fullTitle)}</p>
      </div>
    `;
    loadingEl.style.display = 'flex';
    if (statusText) statusText.textContent = `Synthesizing ${domain} (${systemRegistry.browserAiEra} Era)...`;

    try {
      if (simulatedDelayMs > 0) await new Promise((r) => setTimeout(r, simulatedDelayMs));
      const gemini = await bridgeRef?.getGeminiInstance('MultiEngineBrowser');
      if (!gemini) {
        loadingEl.style.display = 'none';
        return;
      }

      const prompt = `Create a complete, self-contained ${eraDesc} for URL "${url}" (topic/domain: "${domain}").
Requirements:
- Return ONLY valid HTML starting with <!DOCTYPE html> (no markdown fences).
- ${imgInstruction}
- ${scriptInstruction}
- Include 4-6 clickable <a href="https://..."> links to related pages.`;

      const result = await gemini.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      });

      let htmlContent = (result.text || '').replace(/```html|```/gi, '').trim();
      if (!htmlContent.toLowerCase().includes('<html')) {
        htmlContent = `<!DOCTYPE html><html><head><title>${escapeHtml(domain)}</title></head><body style="background:#001a33;color:#00ffcc;font-family:monospace;padding:16px;"><h1>${escapeHtml(domain)}</h1><div>${htmlContent}</div></body></html>`;
      }

      const titleMatch = htmlContent.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch?.[1]) {
        tab.title = titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 24) || tab.title;
      }

      tab.cachedHtml = htmlContent;
      tab.embedUrl = undefined;
      iframe.removeAttribute('src');
      iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(htmlContent) : htmlContent;
      renderTabsBar();
      updateToolbarFromTab(tab);
      if (statusText) statusText.textContent = `Document: Done (${domain} · ${htmlContent.length} bytes)`;
    } catch (err: any) {
      const msg = escapeHtml(String(err?.message || 'Connection failed'));
      const safeDomain = escapeHtml(domain);
      tab.cachedHtml = `<!DOCTYPE html><html><body style="font-family:'MS Sans Serif',Tahoma,sans-serif;background:#008080;padding:24px;color:#000;">
        <div style="max-width:480px;margin:20px auto;background:#c0c0c0;border:2px outset #fff;box-shadow:4px 4px 0 #000;padding:3px;">
          <div style="background:#000080;color:#fff;font-weight:bold;padding:4px 8px;font-size:12px;">
            ⚠️ ${escapeHtml(getBrowserEngineMeta(systemRegistry.defaultBrowserEngine).fullTitle)} — AI Synthesis Error
          </div>
          <div style="padding:14px;font-size:12px;line-height:1.5;">
            <p style="margin:0 0 10px 0;"><b>Could not synthesize "${safeDomain}" via Gemini API:</b></p>
            <div style="background:#fff;border:2px inset #808080;padding:8px;font-family:monospace;font-size:11px;color:#800000;margin-bottom:12px;">
              ${msg}
            </div>
            <p style="margin:0 0 8px 0;color:#222;">
              • To use AI Web Synthesis, please check or select a billing-enabled Gemini API key in the <b>Settings &gt; Secrets</b> panel.<br>
              • You can also switch the browser toolbar above to <b>🌐 Live Web</b> mode or return to <a href="chrome://newtab">chrome://newtab</a>.
            </p>
          </div>
        </div>
      </body></html>`;
      iframe.removeAttribute('src');
      iframe.srcdoc = bridgeRef ? bridgeRef.injectShimIntoHtml(tab.cachedHtml) : tab.cachedHtml;
      if (statusText) statusText.textContent = 'AI synthesis error — check Settings > Secrets API key.';
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  renderActiveBrowserTabFn = () => displayTabContent(getActiveTab());
  navigateActiveBrowserTabFn = navigateTab;
  switchBrowserToAiFn = (targetUrl?: string) => {
    const tab = getActiveTab();
    tab.mode = 'ai';
    systemRegistry.defaultBrowserMode = 'ai';
    applySystemRegistryToOS();
    updateToolbarFromTab(tab);
    navigateTab(targetUrl || tab.url, false, 'ai');
  };

  // Wire Browser UI Controls
  newTabBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    closeChromeMenu();
    createNewTab(getDefaultHomeUrl(), false);
  });

  engineSelect?.addEventListener('change', () => {
    bridgeRef?.sfx.playClick();
    systemRegistry.defaultBrowserEngine = engineSelect.value as BrowserEngineId;
    applySystemRegistryToOS();
    const t = getActiveTab();
    if (isHomePortalUrl(t.url)) {
      t.url = systemRegistry.defaultBrowserEngine === 'chrome' ? 'chrome://newtab' : 'about:portal';
      t.title = systemRegistry.defaultBrowserEngine === 'chrome' ? 'New Tab' : 'Home Portal';
      renderTabsBar();
      displayTabContent(t);
    }
    closeChromeMenu();
  });

  eraSelect?.addEventListener('change', () => {
    bridgeRef?.sfx.playClick();
    systemRegistry.browserAiEra = eraSelect.value as BrowserAiEra;
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
  });

  zoomOutBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    bridgeRef?.sfx.playClick();
    systemRegistry.browserZoomPercent = Math.max(80, systemRegistry.browserZoomPercent - 10);
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
  });

  zoomInBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    bridgeRef?.sfx.playClick();
    systemRegistry.browserZoomPercent = Math.min(130, systemRegistry.browserZoomPercent + 10);
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
  });

  manageInstallBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    closeChromeMenu();
    openAbilityToInstallCategory('browser');
  });

  chromeMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    bridgeRef?.sfx.playClick();
    if (!chromeMenuDropdown) return;
    chromeMenuDropdown.style.display = chromeMenuDropdown.style.display === 'none' ? 'block' : 'none';
  });

  chromeMenuNewTab?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    closeChromeMenu();
    createNewTab(getDefaultHomeUrl(), false);
  });

  chromeDownloadsMenu?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    closeChromeMenu();
    navigateTab('chrome://downloads', true);
  });

  chromeExeDepotMenu?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    closeChromeMenu();
    navigateTab('http://www.tucows-95-downloads.com', true, 'ai');
  });

  chromeAboutBtn?.addEventListener('click', () => {
    closeChromeMenu();
    const meta = getBrowserEngineMeta(systemRegistry.defaultBrowserEngine);
    bridgeRef?.showOsDialog(
      `${meta.fullTitle} (${meta.uaBadge})\nMode: ${systemRegistry.defaultBrowserMode.toUpperCase()} · AI Era: ${systemRegistry.browserAiEra} · Zoom: ${systemRegistry.browserZoomPercent}%`,
      `About ${meta.shortTitle}`,
    );
  });

  document.addEventListener('click', (e) => {
    if (
      chromeMenuDropdown &&
      chromeMenuDropdown.style.display !== 'none' &&
      !chromeMenuDropdown.contains(e.target as Node) &&
      e.target !== chromeMenuBtn &&
      !chromeMenuBtn?.contains(e.target as Node)
    ) {
      closeChromeMenu();
    }
  });
  window.addEventListener('blur', closeChromeMenu);

  modeAiBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const tab = getActiveTab();
    tab.mode = 'ai';
    systemRegistry.defaultBrowserMode = 'ai';
    applySystemRegistryToOS();
    updateToolbarFromTab(tab);
    if (!isHomePortalUrl(tab.url) && !tab.url.startsWith('chrome://')) {
      navigateTab(tab.url, false, 'ai');
    }
  });

  modeLiveBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const tab = getActiveTab();
    tab.mode = 'live';
    systemRegistry.defaultBrowserMode = 'live';
    applySystemRegistryToOS();
    updateToolbarFromTab(tab);
    if (!isHomePortalUrl(tab.url) && !tab.url.startsWith('chrome://')) {
      navigateTab(tab.url, false, 'live');
    }
  });

  goButton?.addEventListener('click', () => navigateTab(addressBar.value, true));
  addressBar?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateTab(addressBar.value, true);
  });

  backBtn?.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab.historyIdx > 0) {
      tab.historyIdx--;
      navigateTab(tab.history[tab.historyIdx], false, tab.mode);
    }
  });

  forwardBtn?.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab.historyIdx < tab.history.length - 1) {
      tab.historyIdx++;
      navigateTab(tab.history[tab.historyIdx], false, tab.mode);
    }
  });

  reloadBtn?.addEventListener('click', () => {
    const tab = getActiveTab();
    navigateTab(tab.url, false, tab.mode);
  });

  homeBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    navigateTab(getDefaultHomeUrl(), true);
  });

  addBookmarkBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const tab = getActiveTab();
    const existingIdx = browserBookmarks.findIndex((b) => b.url === tab.url);
    if (existingIdx >= 0) {
      browserBookmarks.splice(existingIdx, 1);
      saveBrowserBookmarks(browserBookmarks);
      renderBookmarksBar();
      updateToolbarFromTab(tab);
      if (statusText) statusText.textContent = `Removed bookmark for "${tab.title}".`;
      return;
    }
    const label = `${isHomePortalUrl(tab.url) ? '➕' : tab.mode === 'live' ? '🌐' : '✨'} ${tab.title.slice(0, 14)}`;
    browserBookmarks.push({ title: label, url: tab.url, mode: tab.mode });
    saveBrowserBookmarks(browserBookmarks);
    renderBookmarksBar();
    updateToolbarFromTab(tab);
    if (statusText) statusText.textContent = `Bookmarked "${tab.title}"! (Right-click any bookmark or click ★ to remove)`;
  });

  sourceBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    if (!sourceDrawer || !sourceTextarea) return;
    const isHidden = sourceDrawer.style.display === 'none';
    if (isHidden) {
      sourceTextarea.value = getActiveTab().cachedHtml;
      sourceDrawer.style.display = 'flex';
    } else {
      sourceDrawer.style.display = 'none';
    }
  });

  applySourceBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const tab = getActiveTab();
    tab.cachedHtml = sourceTextarea.value;
    tab.embedUrl = undefined;
    if (sourceDrawer) sourceDrawer.style.display = 'none';
    displayTabContent(tab);
    if (statusText) statusText.textContent = 'Rendered live-edited HTML source!';
  });

  saveVfsBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const tab = getActiveTab();
    const fname = `WEBPAGE_${Math.floor(100 + Math.random() * 900)}.HTML`;
    bridgeRef?.addVfsFile(fname, 'text', 'C:\\Documents', sourceTextarea.value || tab.cachedHtml);
    bridgeRef?.refreshExplorerIfOpen();
    bridgeRef?.showOsDialog(
      `Saved webpage HTML as "C:\\Documents\\${fname}"! You can inspect it in GemNotes or load file:///C:/Documents/${fname} in the browser.`,
      'Saved HTML to C:\\',
    );
  });

  closeSourceBtn?.addEventListener('click', () => {
    if (sourceDrawer) sourceDrawer.style.display = 'none';
  });

  exeDepotBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    navigateTab('http://www.tucows-95-downloads.com', true, 'ai');
  });

  settingsBtn?.addEventListener('click', () => {
    closeChromeMenu();
    openMasterSettingsTab('browser');
  });

  renderBookmarksBar();
  if (browserTabs.length === 0) {
    createNewTab(getDefaultHomeUrl(), true);
  } else {
    renderTabsBar();
    displayTabContent(getActiveTab());
  }
}

// ==================== ABILITY TO INSTALL (DUAL-PATH: .EXE FILES + PHYSICAL OS SETUP) ====================
export function switchInstallerMode(mode: 'exe' | 'os'): void {
  currentInstallerMode = mode;
  document.getElementById('ability-tab-exe')?.classList.toggle('active', mode === 'exe');
  document.getElementById('ability-tab-os')?.classList.toggle('active', mode === 'os');
  const paneExe = document.getElementById('ability-pane-exe');
  const paneOs = document.getElementById('ability-pane-os');
  if (paneExe) paneExe.style.display = mode === 'exe' ? 'flex' : 'none';
  if (paneOs) paneOs.style.display = mode === 'os' ? 'flex' : 'none';
  renderAbilityToInstallUI();
}

export function openAbilityToInstallCategory(cat: 'all' | 'browser' | 'core' | 'multimedia' | 'system' = 'all') {
  currentInstallerCategory = cat;
  currentInstallerMode = 'exe';
  bridgeRef?.openApp('abilityToInstall', true).then(() => {
    switchInstallerMode('exe');
    document.querySelectorAll('.ability-cat-btn').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.cat === cat);
    });
    renderAbilityToInstallUI();
  });
}

function renderPhysicalOsDeckUI(): void {
  const deck = document.getElementById('ability-physical-os-deck');
  if (!deck) return;

  const pwa = getPwaHostState();
  const bootOk = isPrimaryBootable();
  const cDesc = partitionTable.primaryC.exists
    ? `${partitionTable.primaryC.sizeMB} MB · ${partitionTable.primaryC.formatted ? partitionTable.primaryC.fileSystem : 'UNFORMATTED'}${partitionTable.primaryC.active ? ' · ACTIVE' : ' · INACTIVE'}`
    : 'DELETED (UNALLOCATED)';
  const dDesc =
    partitionTable.logicalD.exists && systemRegistry.enableSecondaryDriveD
      ? `${partitionTable.logicalD.sizeMB} MB · ${partitionTable.logicalD.fileSystem} (Mounted)`
      : 'Unmounted / None';

  deck.innerHTML = `
    <div class="phys-os-card">
      <div class="phys-os-card-hdr">🔧 A. Inside Gemini 95 — Bare-Metal Disk &amp; OS Setup</div>
      <p style="margin:0;line-height:1.4;">
        Partition &amp; format simulated IDE Fixed Disk 0 with <b>MS-DOS FDISK.EXE</b>, test Master Boot Record (<code>0x55AA</code>) bootability, or run a clean/repair <b>SETUP.EXE</b> OS installation.
      </p>
      <div class="phys-os-kv tabular-nums">
        DISK 0 : QUANTUM FIREBALL 1,995 MB IDE<br/>
        PRI C: : ${cDesc}<br/>
        LOG D: : ${dDesc}<br/>
        MBR    : ${bootOk ? '0x55AA BOOTABLE OK' : '⚠ HALT ON NEXT REBOOT'}
      </div>
      <div class="phys-os-actions">
        <button class="win95-btn" id="phys-btn-fdisk" style="height:27px;font-weight:700;">🔧 Launch MS-DOS FDISK.EXE Partitioner</button>
        <button class="win95-btn" id="phys-btn-fdisk-guide" style="height:26px;background:#e0f2fe;font-weight:700;">📖 Interactive FDISK Guide (Step-by-Step)</button>
        <button class="win95-btn" id="phys-btn-os-setup" style="height:27px;background:#ffffcc;font-weight:700;">💿 Boot CD-ROM OS Installer (SETUP.EXE)</button>
        <button class="win95-btn" id="phys-btn-drop-os-exe" style="height:25px;">📥 Drop GEMINI95_OS_SETUP.EXE to C:\\Downloads</button>
      </div>
    </div>

    <div class="phys-os-card">
      <div class="phys-os-card-hdr">📲 B. Physical Hardware Booter, Bare-Metal Install &amp; Real OS Media</div>
      <p style="margin:0;line-height:1.4;">
        Install Angel-OS as an actual operating system via <b>Physical Bootable Media (.ISO / Raw USB .IMG / Linux GRUB2 / Windows Local Shell)</b> or Standalone PWA with <b>Local Account Always</b> (<code>${getActiveLocalUser().displayName}</code>).
      </p>
      <div class="phys-os-kv tabular-nums">
        PWA SHELL  : ${pwa.isInstalledStandalone ? 'INSTALLED (STANDALONE OS)' : pwa.canPromptInstall ? 'READY FOR 1-CLICK INSTALL' : 'BROWSER / IFRAME MODE'}<br/>
        ACCOUNT    : 🔒 ${getActiveLocalUser().displayName} (LOCAL ACCOUNT ALWAYS)<br/>
        TARGET     : ${systemRegistry.selectedInstallTargetPartition || 'C:'}\\ · ${(systemRegistry.isoVolumeLabel || 'ANGELOS_BOOT').toUpperCase()}_BOOTCD.ISO
      </div>
      <div class="phys-os-actions">
        <button class="win95-btn" id="phys-btn-open-booter" style="height:27px;background:#ffffcc;font-weight:700;">
          💾 Open Physical Booter &amp; Real OS Media Wizard
        </button>
        <button class="win95-btn" id="phys-btn-export-iso" style="height:26px;background:#e0f2fe;font-weight:700;">
          💿 Download Interactive x86 Bootable (.ISO)
        </button>
        <button class="win95-btn" id="phys-btn-export-usb" style="height:26px;background:#fef3c7;font-weight:700;">
          🔌 Download Partitioned USB / HDD Disk (.IMG)
        </button>
        <button class="win95-btn" id="phys-btn-pwa-install" style="height:26px;background:#dcfce7;font-weight:700;">
          ${pwa.isInstalledStandalone ? '✓ Installed as Native OS (View Info)' : '📲 Install Standalone OS App (PWA)'}
        </button>
        <button class="win95-btn" id="phys-btn-fullscreen" style="height:25px;">
          ${pwa.isFullscreen ? '❐ Exit Fullscreen Hardware Lock' : '⛶ Enter Fullscreen Hardware Lock (F11)'}
        </button>
      </div>
    </div>
  `;

  deck.querySelector('#phys-btn-fdisk')?.addEventListener('click', () => openFdiskScreen(false));
  deck.querySelector('#phys-btn-fdisk-guide')?.addEventListener('click', () => openFdiskScreen(true));
  deck.querySelector('#phys-btn-os-setup')?.addEventListener('click', () => openOsReinstallScreen());
  deck.querySelector('#phys-btn-drop-os-exe')?.addEventListener('click', () => {
    const res = dropSetupExeToVfs('os_setup');
    if (res) {
      bridgeRef?.showOsDialog(
        `Saved "${res.fileName}" into ${res.folder}! Double-click it in My Gemtop Explorer or run it in MS-DOS anytime.`,
        'OS Setup .EXE Created',
      );
    }
  });
  deck.querySelector('#phys-btn-open-booter')?.addEventListener('click', () => openPhysicalBooterModal());
  deck.querySelector('#phys-btn-export-iso')?.addEventListener('click', () => downloadBootableIsoImage());
  deck.querySelector('#phys-btn-export-usb')?.addEventListener('click', () => downloadBootableUsbDiskImage());
  deck.querySelector('#phys-btn-pwa-install')?.addEventListener('click', () => triggerNativePwaInstall());
  deck.querySelector('#phys-btn-fullscreen')?.addEventListener('click', () => toggleHardwareFullscreen());
}

export function renderAbilityToInstallUI(): void {
  renderPhysicalOsDeckUI();

  const listEl = document.getElementById('ability-pkg-list');
  const inspectorEl = document.getElementById('ability-pkg-inspector');
  if (!listEl || !inspectorEl) return;

  const filtered = packageCatalog.filter((p) => currentInstallerCategory === 'all' || p.category === currentInstallerCategory);
  if (!filtered.some((p) => p.pkgId === selectedInstallerPkgId) && filtered.length > 0) {
    selectedInstallerPkgId = filtered[0].pkgId;
  }

  const vfsExes = (bridgeRef?.getVfsFiles() || []).filter((f) => f.type === 'installer_exe');

  listEl.innerHTML = '';
  filtered.forEach((pkg) => {
    const row = document.createElement('div');
    row.className = `ability-pkg-row${pkg.pkgId === selectedInstallerPkgId ? ' selected' : ''}`;
    row.dataset.pkgId = pkg.pkgId;
    const hasExeOnDisk = vfsExes.some((f) => f.name.toUpperCase() === pkg.setupExeFileName.toUpperCase());
    const statusText = pkg.installed ? '● INSTALLED' : hasExeOnDisk ? '📦 .EXE ON C:\\' : '○ NOT INSTALLED';
    const statusColor = pkg.installed
      ? pkg.pkgId === selectedInstallerPkgId
        ? '#86efac'
        : '#006600'
      : pkg.pkgId === selectedInstallerPkgId
        ? '#fde047'
        : '#884400';

    row.innerHTML = `
      <div>
        <b>${pkg.iconHtml} ${pkg.name}</b>
        <div style="font-size:0.67rem;opacity:0.85;">${pkg.setupExeFileName} · ${pkg.sizeMB.toFixed(1)} MB</div>
      </div>
      <span class="ability-pkg-status-tag" style="color:${statusColor}">${statusText}</span>
    `;
    row.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      selectedInstallerPkgId = pkg.pkgId;
      renderAbilityToInstallUI();
    });
    listEl.appendChild(row);
  });

  const sel = packageCatalog.find((p) => p.pkgId === selectedInstallerPkgId) || filtered[0];
  if (!sel) {
    inspectorEl.innerHTML = '<p>No packages in this category.</p>';
    return;
  }

  const isDefaultEngine = sel.browserEngine && sel.browserEngine === systemRegistry.defaultBrowserEngine && sel.installed;
  const targetExeDir = systemRegistry.defaultExeDownloadDir || 'C:\\Downloads';
  const exeOnDisk = vfsExes.find((f) => f.name.toUpperCase() === sel.setupExeFileName.toUpperCase());

  inspectorEl.innerHTML = `
    <div>
      <div style="font-size:0.93rem;font-weight:700;color:#000080;margin-bottom:4px;">
        ${sel.iconHtml} ${sel.name}
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:0.68rem;color:#333;margin-bottom:6px;line-height:1.4;">
        Setup Binary: <b>${sel.setupExeFileName}</b> (${sel.sizeMB.toFixed(1)} MB · MZ PE32)<br/>
        Install Path: <b>${sel.installDir}\\${sel.exeName}</b><br/>
        .EXE Status : <b>${exeOnDisk ? `Saved in ${exeOnDisk.parent}\\${exeOnDisk.name}` : `Not yet saved to ${targetExeDir}`}</b>
        ${isDefaultEngine ? '<br/><span style="color:#006600;font-weight:bold;">★ Active Default OS Browser Engine</span>' : ''}
      </div>
      <p style="margin:4px 0 8px 0;line-height:1.38;font-size:0.74rem;">${sel.description}</p>
    </div>
    <div class="ability-inspector-actions">
      <button class="win95-btn" id="pkg-act-run-exe" style="background:#ffffcc;font-weight:700;">
        📦 ${exeOnDisk ? 'Run' : 'Drop &amp; Run'} ${sel.setupExeFileName}
      </button>
      <button class="win95-btn" id="pkg-act-save-exe">
        📥 Save .EXE to ${targetExeDir}
      </button>
      ${
        sel.installed
          ? `
            <button class="win95-btn" id="pkg-act-launch"><b>▶ Launch</b></button>
            ${
              sel.browserEngine && sel.browserEngine !== systemRegistry.defaultBrowserEngine
                ? `<button class="win95-btn" id="pkg-act-setdefault">⭐ Set Default</button>`
                : ''
            }
            ${sel.canUninstall ? `<button class="win95-btn" id="pkg-act-uninstall" style="color:#880000;">🗑️ Uninstall</button>` : ''}
          `
          : ''
      }
    </div>
  `;

  inspectorEl.querySelector('#pkg-act-run-exe')?.addEventListener('click', () => {
    const saved = exeOnDisk ? { fileName: exeOnDisk.name, folder: exeOnDisk.parent } : dropSetupExeToVfs(sel.pkgId);
    executeVfsSetupExe(saved?.fileName || sel.setupExeFileName, sel.pkgId, saved?.folder || targetExeDir);
  });
  inspectorEl.querySelector('#pkg-act-save-exe')?.addEventListener('click', () => {
    const res = dropSetupExeToVfs(sel.pkgId);
    if (res) {
      const statusLine = document.getElementById('ability-status-line');
      if (statusLine) {
        statusLine.textContent = `Saved ${res.fileName} to ${res.folder}! Click "Open C:\\Downloads" above to run it from Explorer.`;
      }
    }
  });
  inspectorEl.querySelector('#pkg-act-launch')?.addEventListener('click', () => {
    if (sel.browserEngine) {
      systemRegistry.defaultBrowserEngine = sel.browserEngine;
      applySystemRegistryToOS();
    }
    bridgeRef?.openApp(sel.appWindowId);
  });
  inspectorEl.querySelector('#pkg-act-setdefault')?.addEventListener('click', () => {
    if (!sel.browserEngine) return;
    bridgeRef?.sfx.playWindowOpen();
    systemRegistry.defaultBrowserEngine = sel.browserEngine;
    applySystemRegistryToOS();
    renderAbilityToInstallUI();
    renderMasterSettingsCurrentTab();
  });
  inspectorEl.querySelector('#pkg-act-uninstall')?.addEventListener('click', () => {
    uninstallSoftwarePackage(sel);
  });
}

export function uninstallSoftwarePackage(pkg: SoftwarePackage): void {
  bridgeRef?.sfx.playChordError();
  // Close running app window if needed
  if (pkg.category === 'browser') {
    const remainingOtherBrowsers = packageCatalog.filter((p) => p.category === 'browser' && p.pkgId !== pkg.pkgId && p.installed);
    if (remainingOtherBrowsers.length === 0) {
      bridgeRef?.closeApp('chrome');
    } else if (systemRegistry.defaultBrowserEngine === pkg.browserEngine) {
      systemRegistry.defaultBrowserEngine = remainingOtherBrowsers[0].browserEngine || 'chrome';
    }
  } else {
    bridgeRef?.closeApp(pkg.appWindowId);
  }

  pkg.installed = false;
  savePackageCatalog(packageCatalog);
  applySystemRegistryToOS();
  renderAbilityToInstallUI();
  renderMasterSettingsCurrentTab();

  const statusLine = document.getElementById('ability-status-line');
  if (statusLine) {
    statusLine.textContent = `Uninstalled ${pkg.name} (${pkg.exeName}) and freed ${pkg.sizeMB.toFixed(1)} MB on C:\\.`;
  }
}

// --- Multi-Step InstallShield 95 Wizard ---
let ishieldInterval: number | null = null;

export function openInstallShieldWizard(pkg: SoftwarePackage, mode: 'install' | 'reinstall'): void {
  bridgeRef?.sfx.playWindowOpen();
  const modal = document.getElementById('installshield-modal');
  const titleEl = document.getElementById('ishield-window-title');
  const iconEl = document.getElementById('ishield-pkg-icon');
  const stageEl = document.getElementById('ishield-stage-content');
  const backBtn = document.getElementById('ishield-back-btn') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('ishield-next-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('ishield-cancel-btn') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('ishield-close-btn') as HTMLButtonElement | null;

  if (!modal || !stageEl || !backBtn || !nextBtn || !cancelBtn) return;
  if (ishieldInterval) clearInterval(ishieldInterval);

  let step = 1;
  let eulaAccepted = true;
  let customDir = pkg.installDir;
  let optDesktop = true;
  let optStartMenu = true;
  let optDefaultBrowser = true;
  let optLaunchAfter = true;

  if (titleEl) titleEl.textContent = `${pkg.name} — InstallShield® 95 Wizard`;
  if (iconEl) iconEl.textContent = pkg.iconHtml;
  modal.style.display = 'flex';

  function closeWizard() {
    if (ishieldInterval) {
      clearInterval(ishieldInterval);
      ishieldInterval = null;
    }
    if (modal) modal.style.display = 'none';
  }

  function renderStep() {
    if (!stageEl || !backBtn || !nextBtn || !cancelBtn) return;
    if (step === 1) {
      backBtn.disabled = true;
      nextBtn.disabled = false;
      nextBtn.innerHTML = '<b>Next &gt;</b>';
      cancelBtn.disabled = false;
      stageEl.innerHTML = `
        <div style="font-size:0.92rem;font-weight:700;color:#000080;">
          Welcome to ${pkg.name} Setup
        </div>
        <p style="margin:2px 0;">
          The InstallShield® 95 Wizard will ${mode === 'reinstall' ? 'cleanly reinstall & repair' : 'install'} <b>${pkg.name} (v${pkg.version})</b> on your Gemini 95 computer.
        </p>
        <div style="background:#dfdfdf;border:1px inset #808080;padding:8px;font-family:'IBM Plex Mono',monospace;font-size:0.7rem;">
          Publisher: ${pkg.publisher}<br/>
          Executable: ${pkg.exeName}<br/>
          Required Space: ${pkg.sizeMB.toFixed(1)} MB on Drive C:\\ (${systemRegistry.fileSystemFormat})
        </div>
        <p style="margin:2px 0;font-size:0.72rem;color:#333;">
          It is strongly recommended that you exit any conflicting MS-DOS TSR programs before continuing. Click <b>Next</b> to continue.
        </p>
      `;
    } else if (step === 2) {
      backBtn.disabled = false;
      nextBtn.disabled = !eulaAccepted;
      nextBtn.innerHTML = '<b>Next &gt;</b>';
      stageEl.innerHTML = `
        <div style="font-size:0.88rem;font-weight:700;color:#000080;">Software License Agreement (1995 EULA)</div>
        <div class="ishield-eula-box">
          END-USER SOFTWARE LICENSE AGREEMENT FOR ${pkg.name.toUpperCase()}<br/>
          =====================================================<br/>
          1. GRANT OF LICENSE: Publisher (${pkg.publisher}) grants you a non-exclusive right to install ${pkg.exeName} onto one (1) Pentium or 486 personal computer.<br/>
          2. MEDIA: Distributed on 13 High-Density 3.5" Floppy Diskettes or 8X CD-ROM.<br/>
          3. Y2K COMPLIANCE NOTICE: Software is certified through December 31, 1999.<br/>
          4. BROWSER &amp; OS CUSTOMIZATION: All parameters may be freely modified in CONTROL.EXE and REGEDIT.EXE.
        </div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;">
          <input type="checkbox" id="ishield-eula-check" ${eulaAccepted ? 'checked' : ''} />
          <span>I accept the terms of the 1995 License Agreement</span>
        </label>
      `;
      stageEl.querySelector('#ishield-eula-check')?.addEventListener('change', (e) => {
        eulaAccepted = (e.target as HTMLInputElement).checked;
        nextBtn.disabled = !eulaAccepted;
      });
    } else if (step === 3) {
      backBtn.disabled = false;
      nextBtn.disabled = false;
      nextBtn.innerHTML = `<b>${mode === 'reinstall' ? 'Reinstall Now >' : 'Install Now >'}</b>`;
      stageEl.innerHTML = `
        <div style="font-size:0.88rem;font-weight:700;color:#000080;">Choose Destination Location &amp; Shortcuts</div>
        <div>
          <label style="font-size:0.72rem;font-weight:700;">Destination Directory on C:\:</label>
          <input type="text" id="ishield-dir-input" class="win95-text-input" style="width:100%;margin-top:3px;" value="${customDir}" />
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="ishield-opt-desk" ${optDesktop ? 'checked' : ''} />
            <span>Create Shortcut Icon on Desktop</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="ishield-opt-start" ${optStartMenu ? 'checked' : ''} />
            <span>Register Program in Start Menu</span>
          </label>
          ${
            pkg.browserEngine
              ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#000080;font-weight:700;">
                  <input type="checkbox" id="ishield-opt-defbrowser" ${optDefaultBrowser ? 'checked' : ''} />
                  <span>Set ${pkg.name} as Default OS Web Browser</span>
                </label>`
              : ''
          }
        </div>
      `;
      stageEl.querySelector('#ishield-dir-input')?.addEventListener('input', (e) => {
        customDir = (e.target as HTMLInputElement).value.trim() || pkg.installDir;
      });
      stageEl.querySelector('#ishield-opt-desk')?.addEventListener('change', (e) => {
        optDesktop = (e.target as HTMLInputElement).checked;
      });
      stageEl.querySelector('#ishield-opt-start')?.addEventListener('change', (e) => {
        optStartMenu = (e.target as HTMLInputElement).checked;
      });
      stageEl.querySelector('#ishield-opt-defbrowser')?.addEventListener('change', (e) => {
        optDefaultBrowser = (e.target as HTMLInputElement).checked;
      });
    } else if (step === 4) {
      backBtn.disabled = true;
      nextBtn.disabled = true;
      cancelBtn.disabled = true;
      const filesToCopy = [
        `${customDir}\\${pkg.exeName}`,
        `${customDir}\\CORE95.DLL`,
        `${customDir}\\WIN32S.VXD`,
        `${customDir}\\README.TXT`,
        `HKEY_LOCAL_MACHINE\\SOFTWARE\\${pkg.pkgId.toUpperCase()}`,
      ];
      stageEl.innerHTML = `
        <div style="font-size:0.88rem;font-weight:700;color:#000080;">Copying Program Files &amp; Writing Registry...</div>
        <div id="ishield-copy-file" style="font-family:'IBM Plex Mono',monospace;font-size:0.7rem;background:#000;color:#00ff66;padding:5px;border:1px inset #808080;">
          Preparing ${filesToCopy[0]}...
        </div>
        <div class="installshield-bar-outer">
          <div class="installshield-bar-fill" id="ishield-prog-bar" style="width: 0%"></div>
        </div>
        <div id="ishield-pct-text" class="tabular-nums" style="font-family:'IBM Plex Mono',monospace;font-size:0.74rem;font-weight:700;">0% Complete</div>
      `;
      let pct = 0;
      const bar = stageEl.querySelector('#ishield-prog-bar') as HTMLDivElement | null;
      const pctTxt = stageEl.querySelector('#ishield-pct-text');
      const fileTxt = stageEl.querySelector('#ishield-copy-file');

      ishieldInterval = window.setInterval(() => {
        pct = Math.min(100, pct + 14);
        if (bar) bar.style.width = `${pct}%`;
        if (pctTxt) pctTxt.textContent = `${pct}% Complete`;
        const fIdx = Math.min(filesToCopy.length - 1, Math.floor((pct / 100) * filesToCopy.length));
        if (fileTxt) fileTxt.textContent = `Extracting: ${filesToCopy[fIdx]}`;
        if (pct % 28 === 0) bridgeRef?.sfx.playFloppySeek();

        if (pct >= 100) {
          if (ishieldInterval) clearInterval(ishieldInterval);
          ishieldInterval = null;

          // Commit Installation!
          pkg.installed = true;
          pkg.installDir = customDir;
          pkg.desktopShortcut = optDesktop;
          pkg.startMenuShortcut = optStartMenu;
          if (pkg.browserEngine && optDefaultBrowser) {
            systemRegistry.defaultBrowserEngine = pkg.browserEngine;
          }
          savePackageCatalog(packageCatalog);

          // Also register executable inside C:\System95 in Virtual File System if not already present
          const existingVfs = bridgeRef?.getVfsFiles().some((f) => f.name === pkg.exeName);
          if (!existingVfs) {
            bridgeRef?.addVfsFile(pkg.exeName, 'app', 'C:\\System95', undefined, pkg.appWindowId);
          }

          applySystemRegistryToOS();
          renderAbilityToInstallUI();
          renderMasterSettingsCurrentTab();
          bridgeRef?.sfx.playAimReceive();

          step = 5;
          renderStep();
        }
      }, 170);
    } else if (step === 5) {
      backBtn.disabled = true;
      nextBtn.disabled = false;
      cancelBtn.disabled = true;
      nextBtn.innerHTML = '<b>Finish</b>';
      stageEl.innerHTML = `
        <div style="font-size:0.92rem;font-weight:700;color:#006600;">✓ Setup Complete!</div>
        <p style="margin:4px 0;">
          InstallShield® 95 has successfully installed <b>${pkg.name}</b> into <code>${pkg.installDir}</code> and updated your system registry.
        </p>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:700;margin-top:8px;">
          <input type="checkbox" id="ishield-launch-now" ${optLaunchAfter ? 'checked' : ''} />
          <span>Launch ${pkg.name} now</span>
        </label>
      `;
      stageEl.querySelector('#ishield-launch-now')?.addEventListener('change', (e) => {
        optLaunchAfter = (e.target as HTMLInputElement).checked;
      });
    }
  }

  backBtn.onclick = () => {
    bridgeRef?.sfx.playClick();
    if (step > 1 && step < 4) {
      step--;
      renderStep();
    }
  };

  nextBtn.onclick = () => {
    bridgeRef?.sfx.playClick();
    if (step < 4) {
      step++;
      renderStep();
    } else if (step === 5) {
      closeWizard();
      if (optLaunchAfter) {
        bridgeRef?.openApp(pkg.appWindowId);
      }
    }
  };

  cancelBtn.onclick = () => {
    bridgeRef?.sfx.playClick();
    closeWizard();
  };
  if (closeBtn) closeBtn.onclick = closeWizard;

  renderStep();
}

export function initAbilityToInstallApp(windowElement: HTMLDivElement): void {
  windowElement.querySelectorAll('.ability-mode-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      const mode = ((tabBtn as HTMLElement).dataset.imode as 'exe' | 'os') || 'exe';
      switchInstallerMode(mode);
    });
  });

  windowElement.querySelectorAll('.ability-cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      windowElement.querySelectorAll('.ability-cat-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentInstallerCategory = ((btn as HTMLElement).dataset.cat as any) || 'all';
      renderAbilityToInstallUI();
    });
  });

  windowElement.querySelector('#ability-dl-portable-html-btn')?.addEventListener('click', () => {
    downloadPortableHostApp('html');
  });
  windowElement.querySelector('#ability-dl-portable-bat-btn')?.addEventListener('click', () => {
    downloadPortableHostApp('bat');
  });
  windowElement.querySelector('#ability-open-downloads-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    bridgeRef?.openExplorerAt(systemRegistry.defaultExeDownloadDir || 'C:\\Downloads');
  });

  switchInstallerMode(currentInstallerMode);
}

// ==================== FULL BLUE-SCREEN OS REINSTALLER (SETUP.EXE) ====================
let osSetupTimerId: number | null = null;

export function openOsReinstallScreen(): void {
  const screen = document.getElementById('os-reinstall-screen');
  const selectStep = document.getElementById('os-setup-step-select');
  const progStep = document.getElementById('os-setup-step-progress');
  if (!screen || !selectStep || !progStep) return;

  if (osSetupTimerId) clearInterval(osSetupTimerId);
  renderOsSetupPartitionOptionsUI();
  selectStep.style.display = 'flex';
  progStep.style.display = 'none';
  screen.style.display = 'flex';
  bridgeRef?.sfx.playPostBeep();
}

export function initOsReinstallerController(): void {
  const screen = document.getElementById('os-reinstall-screen');
  const selectStep = document.getElementById('os-setup-step-select');
  const progStep = document.getElementById('os-setup-step-progress');
  const beginBtn = document.getElementById('os-setup-begin-btn');
  const cancelBtn = document.getElementById('os-setup-cancel-btn');
  const browserPick = document.getElementById('os-setup-browser-select') as HTMLSelectElement | null;
  const progTitle = document.getElementById('os-setup-progress-title');
  const stageDesc = document.getElementById('os-setup-stage-desc');
  const fileTicker = document.getElementById('os-setup-file-ticker');
  const barFill = document.getElementById('os-setup-bar-fill') as HTMLDivElement | null;
  const pctLabel = document.getElementById('os-setup-pct-label');

  cancelBtn?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    if (screen) screen.style.display = 'none';
  });

  beginBtn?.addEventListener('click', () => {
    if (!screen || !selectStep || !progStep) return;
    bridgeRef?.sfx.playPostBeep();

    const modeRadio = document.querySelector<HTMLInputElement>('input[name="os-setup-mode"]:checked');
    const setupMode = modeRadio?.value === 'clean' ? 'clean' : 'repair';
    const chosenBrowser = browserPick?.value || 'chrome';
    const targetPartition = systemRegistry.selectedInstallTargetPartition || 'C:';
    const userInp = (document.getElementById('os-setup-username') as HTMLInputElement | null)?.value.trim() || systemRegistry.activeLocalAccount || 'Michael';
    const pinInp = (document.getElementById('os-setup-pin') as HTMLInputElement | null)?.value || '';

    selectStep.style.display = 'none';
    progStep.style.display = 'flex';

    const cabSteps = [
      { pct: 8, stage: setupMode === 'clean' ? `Formatting Partition ${targetPartition}\\ (${systemRegistry.fileSystemFormat})...` : `Running ScanDisk check on ${targetPartition}\\...`, file: `FORMAT ${targetPartition} /Q /FS:${systemRegistry.fileSystemFormat}` },
      { pct: 22, stage: `Writing MBR & ${systemRegistry.selectedBootloaderMode === 'win_hybrid_mbr' ? 'Windows Boot Manager' : 'DOS Boot Sector'}...`, file: `BOOTREC.EXE -> ${targetPartition}\\BOOTMGR` },
      { pct: 38, stage: 'Extracting 32-Bit Window Manager & Win11+10 Shell...', file: `WIN95_04.CAB -> ${targetPartition}\\System95\\EXPLORER.EXE` },
      { pct: 56, stage: `Provisioning Always-Local Account "${userInp}" (Offline Profile)...`, file: `NETUSER /ADD ${userInp} -> C:\\Users\\${userInp}` },
      { pct: 74, stage: `Installing Bundled Web Browser (${chosenBrowser.toUpperCase()})...`, file: `WIN95_10.CAB -> C:\\Program Files\\Internet\\BROWSER.DLL` },
      { pct: 90, stage: 'Building HKEY_LOCAL_MACHINE & HKEY_CURRENT_USER Registry...', file: 'WIN95_13.CAB -> C:\\System95\\SYSTEM.DAT' },
      { pct: 100, stage: 'OS Installation Complete! Booting via Boot Manager & Local Sign-In...', file: 'Rebooting System...' },
    ];

    let idx = 0;
    if (progTitle) {
      progTitle.textContent = setupMode === 'clean' ? `Clean Installing Angel-OS onto ${targetPartition}\\...` : `Upgrading & Repairing Angel-OS on ${targetPartition}\\...`;
    }

    osSetupTimerId = window.setInterval(() => {
      const stepInfo = cabSteps[Math.min(idx, cabSteps.length - 1)];
      if (stageDesc) stageDesc.textContent = stepInfo.stage;
      if (fileTicker) fileTicker.textContent = `Extracting: ${stepInfo.file}`;
      if (barFill) barFill.style.width = `${stepInfo.pct}%`;
      if (pctLabel) pctLabel.textContent = `${stepInfo.pct}% Complete`;
      bridgeRef?.sfx.playFloppySeek();

      idx++;
      if (idx > cabSteps.length) {
        if (osSetupTimerId) clearInterval(osSetupTimerId);
        osSetupTimerId = null;

        const preservedAccounts = (systemRegistry.localAccounts || []).map((a) => ({ ...a }));
        if (setupMode === 'clean') {
          const keptBootMode = systemRegistry.selectedBootloaderMode;
          const keptTarget = systemRegistry.selectedInstallTargetPartition;
          const keptFs = systemRegistry.fileSystemFormat;
          systemRegistry = {
            ...DEFAULT_SYSTEM_REGISTRY,
            selectedBootloaderMode: keptBootMode,
            selectedInstallTargetPartition: keptTarget,
            fileSystemFormat: keptFs,
            localAccounts: preservedAccounts.length ? preservedAccounts : DEFAULT_SYSTEM_REGISTRY.localAccounts.map((a) => ({ ...a })),
          };
          browserBookmarks = DEFAULT_BOOKMARKS.map((b) => ({ ...b }));
          saveBrowserBookmarks(browserBookmarks);
          bridgeRef?.resetVfsToFactory();
          packageCatalog = DEFAULT_PACKAGE_CATALOG.map((p) => ({ ...p }));
        } else {
          packageCatalog.forEach((p) => {
            if (p.category === 'core' || p.pkgId === 'sys_regedit' || p.pkgId === 'sys_perf_adjust') p.installed = true;
          });
        }

        upsertLocalAccount(userInp, pinInp, 'Administrator');

        packageCatalog.forEach((p) => {
          if (p.category === 'browser') {
            if (chosenBrowser === 'all') {
              p.installed = true;
            } else {
              p.installed = p.browserEngine === chosenBrowser;
            }
            p.desktopShortcut = true;
            p.startMenuShortcut = true;
          }
        });
        systemRegistry.defaultBrowserEngine = chosenBrowser === 'all' ? 'chrome' : (chosenBrowser as BrowserEngineId);
        if (systemRegistry.biosBootOrder === 'CDROM_C_A') {
          systemRegistry.biosBootOrder = 'C_A_CDROM';
        }

        repairBootablePrimaryPartition();
        savePackageCatalog(packageCatalog);
        applySystemRegistryToOS();
        syncLocalAccountStartPill();
        renderBootManagerOptions();
        renderAbilityToInstallUI();
        renderMasterSettingsCurrentTab();

        screen.style.display = 'none';
        bridgeRef?.rebootGemini95();
      }
    }, 440);
  });
}

// ==================== 8-TAB MASTER SETTINGS & ULTRA-DETAILED CONTROL PANEL ====================
export function openMasterSettingsTab(tabId: string): void {
  currentSettingsTab = tabId;
  bridgeRef?.openApp('controlPanel', true).then(() => {
    document.querySelectorAll('.settings-tab-btn').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.stab === tabId);
    });
    renderMasterSettingsCurrentTab();
  });
}

function refreshMasterSettingsPreview(): void {
  const statusEl = document.getElementById('settings-live-status');
  if (statusEl) {
    statusEl.textContent = `● Live Sync OK — Theme: ${systemRegistry.useCustomColors ? 'CUSTOM HEX' : systemRegistry.themePreset.toUpperCase()} · CPU: ${systemRegistry.cpuModel} · RAM: ${getEffectiveRamDisplay(systemRegistry)}`;
  }
}

export function renderMasterSettingsCurrentTab(): void {
  const container = document.getElementById('settings-panes-container');
  if (!container) return;

  const r = systemRegistry;

  if (currentSettingsTab === 'display') {
    container.innerHTML = `
      <div class="cp-monitor-preview" style="height:86px;">
        <div class="cp-mini-window">
          <div class="cp-mini-titlebar">Active Titlebar Preview</div>
          <div class="cp-mini-body">Border: ${r.windowBorderWidth}px · CRT: ${r.crtEnabled ? r.crtOpacity + '%' : 'OFF'}</div>
        </div>
      </div>

      <fieldset class="settings-fieldset">
        <legend>Theme Presets &amp; Desktop Pattern</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>OS Color Theme:</label>
            <select id="st-theme-preset" class="win95-select">
              <option value="standard" ${r.themePreset === 'standard' ? 'selected' : ''}>🟩 Windows 95 Standard (Teal)</option>
              <option value="hotdog" ${r.themePreset === 'hotdog' ? 'selected' : ''}>🌭 Hot Dog Stand (1995)</option>
              <option value="cyberpunk" ${r.themePreset === 'cyberpunk' ? 'selected' : ''}>🌌 Cyberpunk 1995 Grid</option>
              <option value="vaporwave" ${r.themePreset === 'vaporwave' ? 'selected' : ''}>🌅 Vaporwave Sunset</option>
              <option value="matrix" ${r.themePreset === 'matrix' ? 'selected' : ''}>💻 Phosphor Matrix</option>
              <option value="win31" ${r.themePreset === 'win31' ? 'selected' : ''}>🪟 Program Manager 3.1</option>
              <option value="highcontrast" ${r.themePreset === 'highcontrast' ? 'selected' : ''}>⚡ High Contrast Dark</option>
              <option value="custom" ${r.themePreset === 'custom' ? 'selected' : ''}>🎨 Custom RGB Override</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Wallpaper Pattern:</label>
            <select id="st-wallpaper-pat" class="win95-select">
              <option value="none" ${r.wallpaperPattern === 'none' ? 'selected' : ''}>Solid Color</option>
              <option value="grid" ${r.wallpaperPattern === 'grid' ? 'selected' : ''}>Drafting Grid (32px)</option>
              <option value="dots" ${r.wallpaperPattern === 'dots' ? 'selected' : ''}>1995 Halftone Dither</option>
              <option value="diagonal" ${r.wallpaperPattern === 'diagonal' ? 'selected' : ''}>Diagonal pinstripes</option>
              <option value="stars" ${r.wallpaperPattern === 'stars' ? 'selected' : ''}>Deep Space Starfield</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Per-Element Custom Hex Palette (Overrides Preset When Checked)</legend>
        <label style="display:flex;align-items:center;gap:6px;font-size:0.74rem;font-weight:700;margin-bottom:6px;cursor:pointer;">
          <input type="checkbox" id="st-use-custom-colors" ${r.useCustomColors ? 'checked' : ''} />
          <span>Enable Granular Custom Hex Colors</span>
        </label>
        <div class="settings-grid-3col">
          <div class="settings-row"><label>Desktop BG:</label><input type="color" id="st-col-desk" class="settings-color-input" value="${r.desktopBgColor}" /></div>
          <div class="settings-row"><label>3D Surface:</label><input type="color" id="st-col-win" class="settings-color-input" value="${r.windowBgColor}" /></div>
          <div class="settings-row"><label>Window Text:</label><input type="color" id="st-col-text" class="settings-color-input" value="${r.windowTextColor}" /></div>
          <div class="settings-row"><label>Title Left:</label><input type="color" id="st-col-t1" class="settings-color-input" value="${r.titleActiveStart}" /></div>
          <div class="settings-row"><label>Title Right:</label><input type="color" id="st-col-t2" class="settings-color-input" value="${r.titleActiveEnd}" /></div>
          <div class="settings-row"><label>Title Text:</label><input type="color" id="st-col-ttext" class="settings-color-input" value="${r.titleActiveText}" /></div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>CRT Cathode-Ray Tube &amp; Color Calibration</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;">
            <span>CRT Scanlines &amp; Vignette</span>
            <input type="checkbox" id="st-crt-on" ${r.crtEnabled ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Night Light 95 (Amber Eye-Saver)</span>
            <input type="checkbox" id="st-nl-on" ${r.nightLightEnabled ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Scanline Intensity:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-crt-op" min="10" max="100" value="${r.crtOpacity}" />
              <span class="settings-val-readout" id="st-crt-op-v">${r.crtOpacity}%</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Scanline Pitch:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-crt-pitch" min="2" max="6" value="${r.crtScanlinePitch}" />
              <span class="settings-val-readout" id="st-crt-pitch-v">${r.crtScanlinePitch}px</span>
            </div>
          </div>
          <div class="settings-row">
            <label>CRT Brightness:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-bright" min="55" max="125" value="${r.brightness}" />
              <span class="settings-val-readout" id="st-bright-v">${r.brightness}%</span>
            </div>
          </div>
          <div class="settings-row">
            <label>CRT Contrast:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-contrast" min="75" max="135" value="${r.contrast}" />
              <span class="settings-val-readout" id="st-contrast-v">${r.contrast}%</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Color Saturation:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-sat" min="0" max="160" value="${r.saturation}" />
              <span class="settings-val-readout" id="st-sat-v">${r.saturation}%</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Night Light Warmth:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-nl-warm" min="8" max="50" value="${r.nightLightWarmth}" />
              <span class="settings-val-readout" id="st-nl-warm-v">${r.nightLightWarmth}%</span>
            </div>
          </div>
        </div>
      </fieldset>
    `;

    bindSelect('st-theme-preset', (v) => {
      r.themePreset = v as any;
      if (v !== 'custom') r.useCustomColors = false;
      else r.useCustomColors = true;
      renderMasterSettingsCurrentTab();
    });
    bindSelect('st-wallpaper-pat', (v) => (r.wallpaperPattern = v as any));
    bindCheck('st-use-custom-colors', (c) => {
      r.useCustomColors = c;
      if (c) r.themePreset = 'custom';
      renderMasterSettingsCurrentTab();
    });
    bindColor('st-col-desk', (v) => { r.desktopBgColor = v; r.useCustomColors = true; });
    bindColor('st-col-win', (v) => { r.windowBgColor = v; r.useCustomColors = true; });
    bindColor('st-col-text', (v) => { r.windowTextColor = v; r.useCustomColors = true; });
    bindColor('st-col-t1', (v) => { r.titleActiveStart = v; r.useCustomColors = true; });
    bindColor('st-col-t2', (v) => { r.titleActiveEnd = v; r.useCustomColors = true; });
    bindColor('st-col-ttext', (v) => { r.titleActiveText = v; r.useCustomColors = true; });
    bindCheck('st-crt-on', (c) => (r.crtEnabled = c));
    bindCheck('st-nl-on', (c) => (r.nightLightEnabled = c));
    bindSlider('st-crt-op', 'st-crt-op-v', '%', (n) => (r.crtOpacity = n));
    bindSlider('st-crt-pitch', 'st-crt-pitch-v', 'px', (n) => (r.crtScanlinePitch = n));
    bindSlider('st-bright', 'st-bright-v', '%', (n) => (r.brightness = n));
    bindSlider('st-contrast', 'st-contrast-v', '%', (n) => (r.contrast = n));
    bindSlider('st-sat', 'st-sat-v', '%', (n) => (r.saturation = n));
    bindSlider('st-nl-warm', 'st-nl-warm-v', '%', (n) => (r.nightLightWarmth = n));
  } else if (currentSettingsTab === 'shell') {
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>3D Window Bevel Geometry &amp; Metrics (HKCU\\Control Panel\\WindowMetrics)</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>3D Bevel Border:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-border-w" min="1" max="6" value="${r.windowBorderWidth}" />
              <span class="settings-val-readout" id="st-border-w-v">${r.windowBorderWidth}px</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Hard Shadow Offset:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-shadow-w" min="0" max="10" value="${r.windowShadowSize}" />
              <span class="settings-val-readout" id="st-shadow-w-v">${r.windowShadowSize}px</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Corner Radius (95 vs 11):</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-radius" min="0" max="8" value="${r.windowCornerRadius}" />
              <span class="settings-val-readout" id="st-radius-v">${r.windowCornerRadius}px</span>
            </div>
          </div>
          <div class="settings-row">
            <label>Caption Bar Height:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-cap-h" min="18" max="32" value="${r.titlebarHeight}" />
              <span class="settings-val-readout" id="st-cap-h-v">${r.titlebarHeight}px</span>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>System Typography &amp; Global Scaling</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>UI Font Family:</label>
            <select id="st-font-fam" class="win95-select">
              <option value="jakarta" ${r.uiFontFamily === 'jakarta' ? 'selected' : ''}>Plus Jakarta Sans (Crisp 95)</option>
              <option value="mono" ${r.uiFontFamily === 'mono' ? 'selected' : ''}>IBM Plex Mono (Technical)</option>
              <option value="vt323" ${r.uiFontFamily === 'vt323' ? 'selected' : ''}>VT323 (8-Bit Pixel Bitmap)</option>
              <option value="serif" ${r.uiFontFamily === 'serif' ? 'selected' : ''}>Georgia Classic Serif</option>
              <option value="courier" ${r.uiFontFamily === 'courier' ? 'selected' : ''}>Courier New Typewriter</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Global Font Scale:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-font-scale" min="85" max="115" value="${r.uiFontScale}" />
              <span class="settings-val-readout" id="st-font-scale-v">${r.uiFontScale}%</span>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Desktop Shell Icons &amp; Assistants</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>Desktop Icon Size:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-icon-sz" min="32" max="60" value="${r.desktopIconSize}" />
              <span class="settings-val-readout" id="st-icon-sz-v">${r.desktopIconSize}px</span>
            </div>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Require Double-Click on Icons</span>
            <input type="checkbox" id="st-dblclick" ${r.doubleClickIcons ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Show Desktop Guide Sticky Note</span>
            <input type="checkbox" id="st-sticky" ${r.showWelcomeSticky ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Enable Clippy Paint Art Critic</span>
            <input type="checkbox" id="st-clippy" ${r.showClippyAssistant ? 'checked' : ''} />
          </label>
        </div>
      </fieldset>
    `;

    bindSlider('st-border-w', 'st-border-w-v', 'px', (n) => (r.windowBorderWidth = n));
    bindSlider('st-shadow-w', 'st-shadow-w-v', 'px', (n) => (r.windowShadowSize = n));
    bindSlider('st-radius', 'st-radius-v', 'px', (n) => (r.windowCornerRadius = n));
    bindSlider('st-cap-h', 'st-cap-h-v', 'px', (n) => (r.titlebarHeight = n));
    bindSelect('st-font-fam', (v) => (r.uiFontFamily = v as any));
    bindSlider('st-font-scale', 'st-font-scale-v', '%', (n) => (r.uiFontScale = n));
    bindSlider('st-icon-sz', 'st-icon-sz-v', 'px', (n) => (r.desktopIconSize = n));
    bindCheck('st-dblclick', (c) => (r.doubleClickIcons = c));
    bindCheck('st-sticky', (c) => (r.showWelcomeSticky = c));
    bindCheck('st-clippy', (c) => (r.showClippyAssistant = c));
  } else if (currentSettingsTab === 'taskbar') {
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Windows 11 + 10 Hybrid Taskbar &amp; Left-Side Search Controls</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>Taskbar Alignment:</label>
            <select id="st-tb-align" class="win95-select">
              <option value="left" ${!r.taskbarCentered ? 'selected' : ''}>Left-Side Win10 + Win11 Style (Default)</option>
              <option value="center" ${r.taskbarCentered ? 'selected' : ''}>Centered Icon Dock</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Screen Dock Edge:</label>
            <select id="st-tb-edge" class="win95-select">
              <option value="bottom" ${r.taskbarPosition === 'bottom' ? 'selected' : ''}>Bottom Edge (Standard)</option>
              <option value="top" ${r.taskbarPosition === 'top' ? 'selected' : ''}>Top Menu-Bar Style</option>
            </select>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Show App Labels on Taskbar</span>
            <input type="checkbox" id="st-tb-labels" ${r.taskbarShowLabels ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Auto-Hide Taskbar Until Hover</span>
            <input type="checkbox" id="st-tb-autohide" ${r.taskbarAutoHide ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Show Text Next to Windows Icon</span>
            <input type="checkbox" id="st-start-txt-on" ${r.showStartText ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Start Button Text:</label>
            <input type="text" id="st-start-lbl" class="win95-text-input" style="width:110px;" maxlength="12" value="${r.startButtonLabel}" />
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Taskbar Button &amp; System Tray Visibility</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;"><span>Show 🔍 Left Search Bar</span><input type="checkbox" id="st-vis-search" ${r.showSearchBtn ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>Show 🪟 Task View (Desktops)</span><input type="checkbox" id="st-vis-tv" ${r.showTaskViewBtn ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>Show 🌤️ Widgets Pill</span><input type="checkbox" id="st-vis-wid" ${r.showWidgetsBtn ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>Show 👼 Angel Pilot Button</span><input type="checkbox" id="st-vis-cop" ${r.showCopilotBtn ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>Show 🖥️ Minimize-All Button</span><input type="checkbox" id="st-vis-desk" ${r.showDesktopBtn ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>24-Hour Military Tray Clock</span><input type="checkbox" id="st-clk-24" ${r.clock24Hour ? 'checked' : ''} /></label>
          <label class="settings-row" style="cursor:pointer;"><span>Show Seconds in Tray Clock</span><input type="checkbox" id="st-clk-sec" ${r.clockShowSeconds ? 'checked' : ''} /></label>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Snap Layouts (WINSNAP.DRV)</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;">
            <span>Enable Snap Grid on □ Hover</span>
            <input type="checkbox" id="st-snap-on" ${r.snapLayoutsEnabled ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Hover Trigger Delay:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-snap-ms" min="50" max="800" step="50" value="${r.snapHoverDelayMs}" />
              <span class="settings-val-readout" id="st-snap-ms-v">${r.snapHoverDelayMs}ms</span>
            </div>
          </div>
        </div>
      </fieldset>
    `;

    bindSelect('st-tb-align', (v) => (r.taskbarCentered = v === 'center'));
    bindSelect('st-tb-edge', (v) => (r.taskbarPosition = v as any));
    bindCheck('st-tb-labels', (c) => (r.taskbarShowLabels = c));
    bindCheck('st-tb-autohide', (c) => (r.taskbarAutoHide = c));
    bindCheck('st-start-txt-on', (c) => (r.showStartText = c));
    container.querySelector('#st-start-lbl')?.addEventListener('input', (e) => {
      r.startButtonLabel = (e.target as HTMLInputElement).value || 'Start';
      applySystemRegistryToOS();
    });
    bindCheck('st-vis-search', (c) => (r.showSearchBtn = c));
    bindCheck('st-vis-tv', (c) => (r.showTaskViewBtn = c));
    bindCheck('st-vis-wid', (c) => (r.showWidgetsBtn = c));
    bindCheck('st-vis-cop', (c) => (r.showCopilotBtn = c));
    bindCheck('st-vis-desk', (c) => (r.showDesktopBtn = c));
    bindCheck('st-clk-24', (c) => (r.clock24Hour = c));
    bindCheck('st-clk-sec', (c) => (r.clockShowSeconds = c));
    bindCheck('st-snap-on', (c) => (r.snapLayoutsEnabled = c));
    bindSlider('st-snap-ms', 'st-snap-ms-v', 'ms', (n) => (r.snapHoverDelayMs = n));
  } else if (currentSettingsTab === 'audio') {
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Creative Sound Blaster 16 ASP DSP (Port 220h, IRQ 5, DMA 1)</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;">
            <span>Enable Master Audio Synthesizer</span>
            <input type="checkbox" id="st-aud-on" ${r.audioEnabled ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Mechanical Floppy / HDD Seek Clicks</span>
            <input type="checkbox" id="st-aud-floppy" ${r.floppyMechanicalSfx ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Master Output Gain:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-aud-vol" min="10" max="150" value="${r.masterVolume}" />
              <span class="settings-val-readout" id="st-aud-vol-v">${r.masterVolume}%</span>
            </div>
          </div>
          <div class="settings-row">
            <label>SFX Pitch Shift:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-aud-pitch" min="60" max="160" value="${Math.round(r.sfxPitchMultiplier * 100)}" />
              <span class="settings-val-readout" id="st-aud-pitch-v">${r.sfxPitchMultiplier.toFixed(2)}x</span>
            </div>
          </div>
          <div class="settings-row">
            <label>DAC Quantization:</label>
            <select id="st-aud-bits" class="win95-select">
              <option value="16" ${r.dacBitDepth === 16 ? 'selected' : ''}>16-Bit CD Quality</option>
              <option value="12" ${r.dacBitDepth === 12 ? 'selected' : ''}>12-Bit Vintage Sampler</option>
              <option value="8" ${r.dacBitDepth === 8 ? 'selected' : ''}>8-Bit Sound Blaster Pro</option>
              <option value="4" ${r.dacBitDepth === 4 ? 'selected' : ''}>4-Bit PC Speaker Crunch</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Chime Tape Crunch:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-aud-tape" min="0" max="50" value="${r.chimeTapeSaturation}" />
              <span class="settings-val-readout" id="st-aud-tape-v">${r.chimeTapeSaturation}</span>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Interactive DSP Diagnostic Soundboard</legend>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button class="win95-btn" data-sfx="post">🔊 BIOS POST Beep</button>
          <button class="win95-btn" data-sfx="floppy">💾 Floppy Seek</button>
          <button class="win95-btn" data-sfx="open">🪟 Window Arpeggio</button>
          <button class="win95-btn" data-sfx="error">⚠️ Chord Error</button>
          <button class="win95-btn" data-sfx="aim">💬 AIM Buddy Ring</button>
          <button class="win95-btn" data-sfx="modem">📞 V.90 56k Handshake</button>
          <button class="win95-btn" data-sfx="chime">🎵 <b>Lo-Fi Eno Startup Chime</b></button>
        </div>
      </fieldset>
    `;

    bindCheck('st-aud-on', (c) => (r.audioEnabled = c));
    bindCheck('st-aud-floppy', (c) => (r.floppyMechanicalSfx = c));
    bindSlider('st-aud-vol', 'st-aud-vol-v', '%', (n) => (r.masterVolume = n));
    container.querySelector('#st-aud-pitch')?.addEventListener('input', (e) => {
      const pct = Number((e.target as HTMLInputElement).value);
      r.sfxPitchMultiplier = Number((pct / 100).toFixed(2));
      const vEl = document.getElementById('st-aud-pitch-v');
      if (vEl) vEl.textContent = `${r.sfxPitchMultiplier.toFixed(2)}x`;
      applySystemRegistryToOS();
    });
    bindSelect('st-aud-bits', (v) => (r.dacBitDepth = Number(v) as any));
    bindSlider('st-aud-tape', 'st-aud-tape-v', '', (n) => (r.chimeTapeSaturation = n));

    container.querySelectorAll('[data-sfx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = (btn as HTMLElement).dataset.sfx;
        if (!bridgeRef) return;
        bridgeRef.sfx.enabled = true;
        if (kind === 'post') bridgeRef.sfx.playPostBeep();
        else if (kind === 'floppy') bridgeRef.sfx.playFloppySeek();
        else if (kind === 'open') bridgeRef.sfx.playWindowOpen();
        else if (kind === 'error') bridgeRef.sfx.playChordError();
        else if (kind === 'aim') bridgeRef.sfx.playAimReceive();
        else if (kind === 'modem') bridgeRef.sfx.playModemHandshake();
        else if (kind === 'chime') bridgeRef.sfx.playStartupChime();
      });
    });
  } else if (currentSettingsTab === 'browser') {
    const installedBrowsers = getInstalledBrowsers();
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Multi-Engine Web Browser Architecture (INETCPL.CPL)</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>Default Browser:</label>
            <select id="st-br-engine" class="win95-select">
              ${
                installedBrowsers.length > 0
                  ? installedBrowsers
                      .map(
                        (p) =>
                          `<option value="${p.browserEngine}" ${p.browserEngine === r.defaultBrowserEngine ? 'selected' : ''}>${p.iconHtml} ${p.name}</option>`,
                      )
                      .join('')
                  : '<option value="none">⚠️ No Browser Installed!</option>'
              }
            </select>
          </div>
          <div class="settings-row">
            <label>Default Render Mode:</label>
            <select id="st-br-mode" class="win95-select">
              <option value="ai" ${r.defaultBrowserMode === 'ai' ? 'selected' : ''}>✨ AI Web Synthesis</option>
              <option value="live" ${r.defaultBrowserMode === 'live' ? 'selected' : ''}>🌐 Live Real-World URL / Wiki</option>
            </select>
          </div>
          <div class="settings-row">
            <label>AI Time-Machine Era:</label>
            <select id="st-br-era" class="win95-select">
              <option value="1996" ${r.browserAiEra === '1996' ? 'selected' : ''}>1996 GeoCities Web 1.0</option>
              <option value="2001" ${r.browserAiEra === '2001' ? 'selected' : ''}>2001 Dot-Com Portal</option>
              <option value="modern" ${r.browserAiEra === 'modern' ? 'selected' : ''}>Modern Clean HTML5</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Viewport Zoom:</label>
            <div class="settings-slider-wrap">
              <input type="range" id="st-br-zoom" min="80" max="130" step="5" value="${r.browserZoomPercent}" />
              <span class="settings-val-readout" id="st-br-zoom-v">${r.browserZoomPercent}%</span>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
          <label style="font-size:0.74rem;font-weight:700;">Home URL:</label>
          <input type="text" id="st-br-home" class="win95-text-input" style="flex:1;" value="${r.browserHomePage}" />
          <button class="win95-btn" id="st-br-reinstall-btn">💿 Install / Reinstall Browsers...</button>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>U.S. Robotics Dial-Up Modem &amp; Content Security</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>Modem Baud Speed:</label>
            <select id="st-modem-baud" class="win95-select">
              <option value="14400" ${r.modemBaudRate === 14400 ? 'selected' : ''}>14.4k Baud (Slow 1993)</option>
              <option value="28800" ${r.modemBaudRate === 28800 ? 'selected' : ''}>28.8k V.34 (1995 Standard)</option>
              <option value="56000" ${r.modemBaudRate === 56000 ? 'selected' : ''}>56k V.90 Sportster</option>
              <option value="128000" ${r.modemBaudRate === 128000 ? 'selected' : ''}>128k Dual-ISDN</option>
              <option value="1000000" ${r.modemBaudRate === 1000000 ? 'selected' : ''}>T1 1.0 Mbps (Zero Delay)</option>
            </select>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Play V.90 Handshake Audio</span>
            <input type="checkbox" id="st-modem-sfx" ${r.playModemHandshake ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Render Inline Images &amp; SVGs</span>
            <input type="checkbox" id="st-br-imgs" ${r.browserShowImages ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Allow Inline Page Scripts</span>
            <input type="checkbox" id="st-br-js" ${r.browserEnableScripts ? 'checked' : ''} />
          </label>
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;">
          <button class="win95-btn" id="st-br-reset-bm">↺ Restore Default Bookmarks</button>
          <button class="win95-btn" id="st-br-launch">🌐 Launch Active Browser</button>
        </div>
      </fieldset>
    `;

    bindSelect('st-br-engine', (v) => {
      if (v !== 'none') {
        r.defaultBrowserEngine = v as BrowserEngineId;
        renderActiveBrowserTabFn?.();
      }
    });
    bindSelect('st-br-mode', (v) => (r.defaultBrowserMode = v as BrowserRenderMode));
    bindSelect('st-br-era', (v) => (r.browserAiEra = v as BrowserAiEra));
    bindSlider('st-br-zoom', 'st-br-zoom-v', '%', (n) => (r.browserZoomPercent = n));
    container.querySelector('#st-br-home')?.addEventListener('input', (e) => {
      r.browserHomePage = (e.target as HTMLInputElement).value.trim() || 'chrome://newtab';
      applySystemRegistryToOS();
    });
    container.querySelector('#st-br-reinstall-btn')?.addEventListener('click', () => {
      openAbilityToInstallCategory('browser');
    });
    bindSelect('st-modem-baud', (v) => (r.modemBaudRate = Number(v) as any));
    bindCheck('st-modem-sfx', (c) => (r.playModemHandshake = c));
    bindCheck('st-br-imgs', (c) => (r.browserShowImages = c));
    bindCheck('st-br-js', (c) => (r.browserEnableScripts = c));
    container.querySelector('#st-br-reset-bm')?.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      browserBookmarks = DEFAULT_BOOKMARKS.map((b) => ({ ...b }));
      saveBrowserBookmarks(browserBookmarks);
      bridgeRef?.showOsDialog('Default Google Chrome + Live Web + 1995 bookmarks restored!', 'Browser Settings');
    });
    container.querySelector('#st-br-launch')?.addEventListener('click', () => {
      navigateBrowserExternal(r.browserHomePage || 'chrome://newtab');
    });
  } else if (currentSettingsTab === 'hardware') {
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Motherboard CPU, EDO Memory &amp; Virtual Swap (SYSDM.CPL)</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>CPU Architecture:</label>
            <select id="st-hw-cpu" class="win95-select">
              <option value="Intel 486DX2 66MHz" ${r.cpuModel === 'Intel 486DX2 66MHz' ? 'selected' : ''}>Intel 486DX2 66MHz</option>
              <option value="Intel Pentium 133MHz" ${r.cpuModel === 'Intel Pentium 133MHz' ? 'selected' : ''}>Intel Pentium 133MHz</option>
              <option value="Intel Pentium MMX 233MHz" ${r.cpuModel === 'Intel Pentium MMX 233MHz' ? 'selected' : ''}>Intel Pentium MMX 233MHz</option>
              <option value="Intel Pentium II 400MHz" ${r.cpuModel === 'Intel Pentium II 400MHz' ? 'selected' : ''}>Intel Pentium II 400MHz</option>
            </select>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Front-Panel Hardware [TURBO]</span>
            <input type="checkbox" id="st-hw-turbo" ${r.cpuTurboBoost ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Detected Host PC:</label>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:0.71rem;color:#000080;">${detectHostHardware().cpuThreads} Threads · ${detectHostHardware().autoDetectedRamMB.toLocaleString()}MB Host RAM · ${detectHostHardware().gpuRenderer}</span>
          </div>
          <div class="settings-row">
            <label>RAM Selection Mode:</label>
            <select id="st-hw-ram-mode" class="win95-select">
              <option value="auto" ${r.ramMode === 'auto' ? 'selected' : ''}>Auto-Detect Host PC RAM (${detectHostHardware().autoDetectedRamMB.toLocaleString()} MB)</option>
              <option value="limited" ${r.ramMode === 'limited' ? 'selected' : ''}>Limited Pool (Cap 16–4096 MB)</option>
              <option value="custom" ${r.ramMode === 'custom' ? 'selected' : ''}>Custom Manual MB</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Limited RAM Cap:</label>
            <select id="st-hw-ram" class="win95-select">
              <option value="16" ${r.installedRamMB === 16 ? 'selected' : ''}>16 MB SIMM</option>
              <option value="32" ${r.installedRamMB === 32 ? 'selected' : ''}>32 MB SIMM</option>
              <option value="64" ${r.installedRamMB === 64 ? 'selected' : ''}>64 MB EDO DRAM</option>
              <option value="128" ${r.installedRamMB === 128 ? 'selected' : ''}>128 MB PC66 SDRAM</option>
              <option value="256" ${r.installedRamMB === 256 ? 'selected' : ''}>256 MB Workstation</option>
              <option value="512" ${r.installedRamMB === 512 ? 'selected' : ''}>512 MB Extended</option>
              <option value="1024" ${r.installedRamMB === 1024 ? 'selected' : ''}>1,024 MB (1 GB)</option>
              <option value="2048" ${r.installedRamMB === 2048 ? 'selected' : ''}>2,048 MB (2 GB)</option>
              <option value="4096" ${r.installedRamMB === 4096 ? 'selected' : ''}>4,096 MB (4 GB)</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Custom RAM (MB):</label>
            <input type="number" id="st-hw-ram-custom" class="win95-input" min="16" max="65536" step="16" value="${r.customRamMB}" style="width:110px;" />
          </div>
          <div class="settings-row">
            <label>Performance &amp; Fans:</label>
            <button type="button" class="win95-btn" id="st-hw-open-perf">🎛️ Open Performance &amp; Adjustment Levels</button>
          </div>
          <div class="settings-row">
            <label>WIN386.SWP Swap:</label>
            <select id="st-hw-swap" class="win95-select">
              <option value="64" ${r.virtualSwapMB === 64 ? 'selected' : ''}>64 MB Paging File</option>
              <option value="128" ${r.virtualSwapMB === 128 ? 'selected' : ''}>128 MB Paging File</option>
              <option value="256" ${r.virtualSwapMB === 256 ? 'selected' : ''}>256 MB Paging File</option>
              <option value="512" ${r.virtualSwapMB === 512 ? 'selected' : ''}>512 MB Paging File</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Energy Star Power &amp; CRT Screensaver</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>Idle Timeout:</label>
            <select id="st-ss-min" class="win95-select">
              <option value="0" ${r.screensaverMinutes === 0 ? 'selected' : ''}>Disabled (Always On)</option>
              <option value="1" ${r.screensaverMinutes === 1 ? 'selected' : ''}>After 1 Minute</option>
              <option value="3" ${r.screensaverMinutes === 3 ? 'selected' : ''}>After 3 Minutes</option>
              <option value="5" ${r.screensaverMinutes === 5 ? 'selected' : ''}>After 5 Minutes</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Screensaver:</label>
            <div style="display:flex;gap:4px;">
              <select id="st-ss-style" class="win95-select">
                <option value="starfield" ${r.screensaverStyle === 'starfield' ? 'selected' : ''}>3D Starfield 95</option>
                <option value="matrix" ${r.screensaverStyle === 'matrix' ? 'selected' : ''}>Phosphor Matrix</option>
              </select>
              <button class="win95-btn" id="st-ss-preview-btn">Preview</button>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Device Manager Hardware IRQ / DMA Allocation Table</legend>
        <table class="irq-table tabular-nums">
          <thead><tr><th>IRQ</th><th>I/O Port</th><th>Hardware Device</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>IRQ 00</td><td>0040h</td><td>System CMOS / 8254 Programmable Timer</td><td>OK</td></tr>
            <tr><td>IRQ 04</td><td>03F8h</td><td>U.S. Robotics ${r.modemBaudRate / 1000}k Sportster Modem (COM1)</td><td>OK</td></tr>
            <tr><td>IRQ 05</td><td>0220h</td><td>Creative Sound Blaster 16 DSP (${r.dacBitDepth}-Bit)</td><td>${r.audioEnabled ? 'ACTIVE' : 'MUTED'}</td></tr>
            <tr><td>IRQ 14</td><td>01F0h</td><td>Quantum Fireball 1995MB IDE (${r.fileSystemFormat})</td><td>OK</td></tr>
          </tbody>
        </table>
      </fieldset>
    `;

    bindSelect('st-hw-cpu', (v) => (r.cpuModel = v as any));
    bindCheck('st-hw-turbo', (c) => (r.cpuTurboBoost = c));
    bindSelect('st-hw-ram-mode', (v) => (r.ramMode = v as any));
    bindSelect('st-hw-ram', (v) => {
      r.installedRamMB = Number(v) as any;
      r.ramMode = 'limited';
      const modeEl = container.querySelector<HTMLSelectElement>('#st-hw-ram-mode');
      if (modeEl) modeEl.value = 'limited';
    });
    container.querySelector<HTMLInputElement>('#st-hw-ram-custom')?.addEventListener('change', (e) => {
      const val = Math.max(16, Math.min(65536, Math.round(Number((e.target as HTMLInputElement).value) || 512)));
      (e.target as HTMLInputElement).value = String(val);
      r.customRamMB = val;
      r.ramMode = 'custom';
      const modeEl = container.querySelector<HTMLSelectElement>('#st-hw-ram-mode');
      if (modeEl) modeEl.value = 'custom';
      applySystemRegistryToOS();
      refreshMasterSettingsPreview();
    });
    container.querySelector('#st-hw-open-perf')?.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      bridgeRef?.openApp('perfAdjust', true);
    });
    bindSelect('st-hw-swap', (v) => (r.virtualSwapMB = Number(v) as any));
    bindSelect('st-ss-min', (v) => (r.screensaverMinutes = Number(v) as any));
    bindSelect('st-ss-style', (v) => (r.screensaverStyle = v as any));
    container.querySelector('#st-ss-preview-btn')?.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      startScreensaverNow();
    });
  } else if (currentSettingsTab === 'software') {
    const installedCount = packageCatalog.filter((p) => p.installed).length;
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Boot Manager, Always-Local Accounts &amp; Physical Booter (Multi-OS Boot)</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;">
            <span>Show Windows Boot Manager on Boot</span>
            <input type="checkbox" id="st-boot-mgr" ${r.enableBootManagerOnBoot ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Require Local Account Sign-In on Boot</span>
            <input type="checkbox" id="st-boot-signin" ${r.requireSignInOnBoot ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Bootloader Style:</label>
            <select id="st-boot-loader" class="win95-select">
              <option value="win_hybrid_mbr" ${r.selectedBootloaderMode === 'win_hybrid_mbr' ? 'selected' : ''}>Win Boot Mgr + Local Sign-In</option>
              <option value="legacy_95_mbr" ${r.selectedBootloaderMode === 'legacy_95_mbr' ? 'selected' : ''}>Classic 95 Direct MBR</option>
            </select>
          </div>
          <div class="settings-row">
            <span>Active Profile: <b>${getActiveLocalUser().avatar} ${getActiveLocalUser().displayName}</b> <small>(Local Always)</small></span>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;">
          <input type="text" id="st-local-name" class="win95-text-input" placeholder="New Local Username..." style="width:140px;" />
          <input type="password" id="st-local-pin" class="win95-text-input" placeholder="Optional PIN" style="width:105px;" />
          <button class="win95-btn" id="st-local-add-btn"><b>+ Create &amp; Switch Local User</b></button>
          <button class="win95-btn" id="st-act-signin" style="background:#fef3c7;">🔒 Lock / Switch Local Account</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          <button class="win95-btn" id="st-act-booter" style="background:#dcfce7;font-weight:700;">💾 Physical Hardware Booter (.ISO / .IMG / Scripts)</button>
          <button class="win95-btn" id="st-act-usb-img" style="background:#e0e7ff;font-weight:700;">🔌 Export Bootable USB Disk (.IMG)</button>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Dual-Path Installation Policy (.EXE Verifier, FDISK Disk &amp; Host OS PWA / ISO)</legend>
        <div class="settings-grid-2col">
          <label class="settings-row" style="cursor:pointer;">
            <span>Win32 SFX .EXE Header Prompt</span>
            <input type="checkbox" id="st-exe-sfx" ${r.sfxVerifyPrompt ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Auto-Delete .EXE After Install</span>
            <input type="checkbox" id="st-exe-autodel" ${r.autoDeleteExeAfterInstall ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Default .EXE Folder:</label>
            <select id="st-exe-dir" class="win95-select">
              <option value="C:\\Downloads" ${r.defaultExeDownloadDir === 'C:\\Downloads' ? 'selected' : ''}>C:\\Downloads</option>
              <option value="C:\\" ${r.defaultExeDownloadDir === 'C:\\' ? 'selected' : ''}>C:\\ (Root)</option>
              <option value="D:\\Installers" ${r.defaultExeDownloadDir === 'D:\\Installers' ? 'selected' : ''}>D:\\Installers</option>
            </select>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Auto-Fullscreen Installed PWA</span>
            <input type="checkbox" id="st-pwa-fs" ${r.autoFullscreenStandalone ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Primary C:\\ (MB):</label>
            <input type="range" id="st-c-mb" min="400" max="1995" step="5" value="${r.primaryPartitionSizeMB}" style="width:95px;" />
            <span id="st-c-mb-v" class="tabular-nums" style="font-size:0.7rem;">${r.primaryPartitionSizeMB}M</span>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Mount Logical Drive D:\\</span>
            <input type="checkbox" id="st-drv-d" ${r.enableSecondaryDriveD ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Strict BIOS MBR 0x55AA Check</span>
            <input type="checkbox" id="st-strict-mbr" ${r.strictMbrBootCheck ? 'checked' : ''} />
          </label>
          <div class="settings-row">
            <label>Boot .ISO Label:</label>
            <input type="text" id="st-iso-lbl" class="win95-text-input" value="${r.isoVolumeLabel.replace(/"/g, '')}" style="width:120px;" />
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          <button class="win95-btn" id="st-act-fdisk">🔧 MS-DOS FDISK.EXE</button>
          <button class="win95-btn" id="st-act-iso" style="background:#e0f2fe;font-weight:700;">💿 Export Bootable .ISO</button>
          <button class="win95-btn" id="st-act-portable">💻 Download Portable App (.HTML)</button>
          <button class="win95-btn" id="st-act-pwa" style="background:#dcfce7;font-weight:700;">📲 Install Native OS (PWA)</button>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Add/Remove Programs &amp; Full OS Reinstallation (APPWIZ.CPL)</legend>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span style="font-size:0.75rem;"><b>${installedCount} / ${packageCatalog.length}</b> software packages installed on C:\\</span>
          <div style="display:flex;gap:6px;">
            <button class="win95-btn" id="st-sw-open-installer"><b>💿 Open Ability to Install</b></button>
            <button class="win95-btn" id="st-sw-os-reinstall" style="background:#ffffcc;font-weight:700;">💿 Reinstall Entire OS (SETUP.EXE)</button>
          </div>
        </div>
        <table class="irq-table">
          <thead><tr><th>Package</th><th>Setup .EXE</th><th>Status</th><th>Quick Action</th></tr></thead>
          <tbody>
            ${packageCatalog
              .map(
                (p) => `
              <tr>
                <td><b>${p.iconHtml} ${p.name}</b></td>
                <td style="font-family:'IBM Plex Mono',monospace;font-size:0.66rem;">${p.setupExeFileName}</td>
                <td style="color:${p.installed ? '#006600' : '#883300'};font-weight:700;">${p.installed ? 'INSTALLED' : 'UNINSTALLED'}</td>
                <td>
                  <button class="win95-btn st-quick-pkg-btn" data-pkg="${p.pkgId}" data-act="${p.installed ? 'reinstall' : 'install'}" style="height:19px;font-size:0.67rem;">
                    ${p.installed ? '↻ Reinstall' : '💿 Install'}
                  </button>
                  <button class="win95-btn st-quick-pkg-btn" data-pkg="${p.pkgId}" data-act="dropexe" style="height:19px;font-size:0.67rem;">📥 .EXE</button>
                  ${
                    p.installed && p.canUninstall
                      ? `<button class="win95-btn st-quick-pkg-btn" data-pkg="${p.pkgId}" data-act="uninstall" style="height:19px;font-size:0.67rem;color:#880000;">✕</button>`
                      : ''
                  }
                </td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>Export / Import Complete OS Configuration (.REG JSON)</legend>
        <div style="display:flex;gap:6px;margin-bottom:4px;">
          <button class="win95-btn" id="st-export-json-btn">💾 Save Profile to C:\\System95\\CONFIG.REG</button>
          <button class="win95-btn" id="st-import-json-btn">📥 Apply JSON From Box Below</button>
        </div>
        <textarea id="st-profile-json" style="width:100%;height:62px;font-family:'IBM Plex Mono',monospace;font-size:0.68rem;box-sizing:border-box;">${JSON.stringify(systemRegistry)}</textarea>
      </fieldset>
    `;

    bindCheck('st-boot-mgr', (c) => {
      r.enableBootManagerOnBoot = c;
      renderBootManagerOptions();
    });
    bindCheck('st-boot-signin', (c) => (r.requireSignInOnBoot = c));
    bindSelect('st-boot-loader', (v) => {
      r.selectedBootloaderMode = v as 'win_hybrid_mbr' | 'legacy_95_mbr';
      r.enableBootManagerOnBoot = v === 'win_hybrid_mbr';
      r.requireSignInOnBoot = v === 'win_hybrid_mbr';
      renderBootManagerOptions();
      renderOsSetupPartitionOptionsUI();
      renderMasterSettingsCurrentTab();
    });
    container.querySelector('#st-local-add-btn')?.addEventListener('click', () => {
      const nEl = container.querySelector('#st-local-name') as HTMLInputElement | null;
      const pEl = container.querySelector('#st-local-pin') as HTMLInputElement | null;
      const uname = nEl?.value.trim() || '';
      if (!uname) {
        bridgeRef?.sfx.playChordError();
        return;
      }
      upsertLocalAccount(uname, pEl?.value || '', 'Standard');
      renderMasterSettingsCurrentTab();
    });
    container.querySelector('#st-act-signin')?.addEventListener('click', () => openLocalSignInScreen());
    container.querySelector('#st-act-booter')?.addEventListener('click', () => openPhysicalBooterModal());
    container.querySelector('#st-act-usb-img')?.addEventListener('click', () => downloadBootableUsbDiskImage());

    bindCheck('st-exe-sfx', (c) => (r.sfxVerifyPrompt = c));
    bindCheck('st-exe-autodel', (c) => (r.autoDeleteExeAfterInstall = c));
    bindSelect('st-exe-dir', (v) => (r.defaultExeDownloadDir = v as any));
    bindCheck('st-pwa-fs', (c) => (r.autoFullscreenStandalone = c));
    bindSlider('st-c-mb', 'st-c-mb-v', 'M', (n) => {
      r.primaryPartitionSizeMB = n;
      if (partitionTable.primaryC.exists) {
        partitionTable.primaryC.sizeMB = n;
      }
    });
    bindCheck('st-drv-d', (c) => (r.enableSecondaryDriveD = c));
    bindCheck('st-strict-mbr', (c) => (r.strictMbrBootCheck = c));
    container.querySelector('#st-iso-lbl')?.addEventListener('input', (e) => {
      r.isoVolumeLabel = (e.target as HTMLInputElement).value.trim() || 'GEMINI95_OS';
      applySystemRegistryToOS();
    });

    container.querySelector('#st-act-fdisk')?.addEventListener('click', () => openFdiskScreen());
    container.querySelector('#st-act-iso')?.addEventListener('click', () => downloadBootableIsoImage());
    container.querySelector('#st-act-portable')?.addEventListener('click', () => downloadPortableHostApp('html'));
    container.querySelector('#st-act-pwa')?.addEventListener('click', () => triggerNativePwaInstall());

    container.querySelector('#st-sw-open-installer')?.addEventListener('click', () => openAbilityToInstallCategory('all'));
    container.querySelector('#st-sw-os-reinstall')?.addEventListener('click', () => openOsReinstallScreen());
    container.querySelectorAll('.st-quick-pkg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pkgId = (btn as HTMLElement).dataset.pkg;
        const act = (btn as HTMLElement).dataset.act;
        const pkg = packageCatalog.find((x) => x.pkgId === pkgId);
        if (!pkg) return;
        if (act === 'dropexe') {
          const saved = dropSetupExeToVfs(pkg.pkgId);
          if (saved) bridgeRef?.showOsDialog(`Dropped ${saved.fileName} into ${saved.folder}!`, '.EXE Saved');
        } else if (act === 'uninstall') {
          uninstallSoftwarePackage(pkg);
        } else {
          openInstallShieldWizard(pkg, act === 'reinstall' ? 'reinstall' : 'install');
        }
      });
    });
    container.querySelector('#st-export-json-btn')?.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      const dump = JSON.stringify(systemRegistry, null, 2);
      bridgeRef?.addVfsFile('USER_CONFIG.REG', 'text', 'C:\\System95', dump);
      bridgeRef?.refreshExplorerIfOpen();
      bridgeRef?.showOsDialog('Saved full OS Settings & Registry dump to C:\\System95\\USER_CONFIG.REG!', 'Profile Exported');
    });
    container.querySelector('#st-import-json-btn')?.addEventListener('click', () => {
      const box = container.querySelector('#st-profile-json') as HTMLTextAreaElement | null;
      if (!box) return;
      try {
        const parsed = JSON.parse(box.value);
        systemRegistry = { ...DEFAULT_SYSTEM_REGISTRY, ...parsed };
        applySystemRegistryToOS();
        renderMasterSettingsCurrentTab();
        bridgeRef?.sfx.playAimReceive();
      } catch {
        bridgeRef?.showOsDialog('Invalid JSON configuration syntax. Please verify brackets and quotes.', 'Import Error');
      }
    });
  } else if (currentSettingsTab === 'registry') {
    const activeBios = getActivatedBiosCount();
    container.innerHTML = `
      <fieldset class="settings-fieldset">
        <legend>Low-Level Kernel, REGEDIT.EXE &amp; Award CMOS BIOS (5,120+ Registers)</legend>
        <p style="margin:0 0 8px 0;font-size:0.75rem;line-height:1.4;">
          Every slider, toggle, hex color, and hardware jumper is stored in <b>${REGISTRY_DESCRIPTORS.length} live Registry Keys</b>, plus <b>${TOTAL_BIOS_FEATURES.toLocaleString()} dormant BIOS firmware features</b> inside CMOS Setup (currently <b>${activeBios.toLocaleString()} / ${TOTAL_BIOS_FEATURES.toLocaleString()} activated</b>).
        </p>
        <div class="settings-grid-2col">
          <button class="win95-btn" id="st-reg-launch-regedit" style="height:30px;font-weight:700;">🗂️ Launch Live REGEDIT.EXE</button>
          <button class="win95-btn" id="st-reg-launch-bios" style="height:30px;font-weight:700;">⚙️ Enter CMOS BIOS (5,120+ Features)</button>
          <button class="win95-btn" id="st-reg-launch-sysmon" style="height:30px;">📊 Open / Install System Monitor</button>
          <button class="win95-btn" id="st-reg-reboot" style="height:30px;">🔄 Reboot via BIOS POST</button>
        </div>
      </fieldset>

      <fieldset class="settings-fieldset">
        <legend>CMOS Boot Parameters (HKLM\\Hardware\\BIOS\\Award451PG)</legend>
        <div class="settings-grid-2col">
          <div class="settings-row">
            <label>BIOS Boot Priority:</label>
            <select id="st-bios-order" class="win95-select">
              <option value="C_A_CDROM" ${r.biosBootOrder === 'C_A_CDROM' ? 'selected' : ''}>C:, A:, CD-ROM (Normal)</option>
              <option value="A_C_CDROM" ${r.biosBootOrder === 'A_C_CDROM' ? 'selected' : ''}>A:, C:, CD-ROM (Floppy Seek)</option>
              <option value="CDROM_C_A" ${r.biosBootOrder === 'CDROM_C_A' ? 'selected' : ''}>CD-ROM, C:, A: (Boots OS Setup!)</option>
            </select>
          </div>
          <div class="settings-row">
            <label>IDE Disk Format:</label>
            <select id="st-bios-fs" class="win95-select">
              <option value="FAT16" ${r.fileSystemFormat === 'FAT16' ? 'selected' : ''}>FAT16 (1995 Standard)</option>
              <option value="FAT32" ${r.fileSystemFormat === 'FAT32' ? 'selected' : ''}>FAT32 (OSR2 Extended)</option>
            </select>
          </div>
          <label class="settings-row" style="cursor:pointer;">
            <span>Quick Power-On Self Test (POST)</span>
            <input type="checkbox" id="st-bios-qpost" ${r.biosQuickPost ? 'checked' : ''} />
          </label>
          <label class="settings-row" style="cursor:pointer;">
            <span>Play Eno Synth Chime on Boot</span>
            <input type="checkbox" id="st-bios-audio" ${r.biosBootAudio ? 'checked' : ''} />
          </label>
        </div>
      </fieldset>
    `;

    container.querySelector('#st-reg-launch-regedit')?.addEventListener('click', () => {
      if (!isAppInstalled('regedit')) {
        const regPkg = packageCatalog.find((p) => p.pkgId === 'sys_regedit');
        if (regPkg) openInstallShieldWizard(regPkg, 'install');
        return;
      }
      bridgeRef?.openApp('regedit');
    });
    container.querySelector('#st-reg-launch-bios')?.addEventListener('click', () => openCmosBiosSetup());
    container.querySelector('#st-reg-launch-sysmon')?.addEventListener('click', () => {
      if (!isAppInstalled('sysMonitor')) {
        const monPkg = packageCatalog.find((p) => p.pkgId === 'sys_monitor');
        if (monPkg) openInstallShieldWizard(monPkg, 'install');
        return;
      }
      bridgeRef?.openApp('sysMonitor');
    });
    container.querySelector('#st-reg-reboot')?.addEventListener('click', () => bridgeRef?.rebootGemini95());

    bindSelect('st-bios-order', (v) => (r.biosBootOrder = v as any));
    bindSelect('st-bios-fs', (v) => (r.fileSystemFormat = v as any));
    bindCheck('st-bios-qpost', (c) => (r.biosQuickPost = c));
    bindCheck('st-bios-audio', (c) => (r.biosBootAudio = c));
  }

  function bindCheck(id: string, setter: (checked: boolean) => void) {
    const el = container?.querySelector(`#${id}`) as HTMLInputElement | null;
    el?.addEventListener('change', () => {
      bridgeRef?.sfx.playClick();
      setter(el.checked);
      applySystemRegistryToOS();
    });
  }

  function bindSelect(id: string, setter: (val: string) => void) {
    const el = container?.querySelector(`#${id}`) as HTMLSelectElement | null;
    el?.addEventListener('change', () => {
      bridgeRef?.sfx.playClick();
      setter(el.value);
      applySystemRegistryToOS();
    });
  }

  function bindColor(id: string, setter: (hex: string) => void) {
    const el = container?.querySelector(`#${id}`) as HTMLInputElement | null;
    el?.addEventListener('input', () => {
      setter(el.value);
      applySystemRegistryToOS();
    });
  }

  function bindSlider(id: string, valId: string, unit: string, setter: (num: number) => void) {
    const el = container?.querySelector(`#${id}`) as HTMLInputElement | null;
    const vEl = container?.querySelector(`#${valId}`);
    el?.addEventListener('input', () => {
      const n = Number(el.value);
      if (vEl) vEl.textContent = `${n}${unit}`;
      setter(n);
      applySystemRegistryToOS();
    });
  }
}

export function initMasterControlPanel(windowElement: HTMLDivElement): void {
  windowElement.querySelectorAll('.settings-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      windowElement.querySelectorAll('.settings-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSettingsTab = (btn as HTMLElement).dataset.stab || 'display';
      renderMasterSettingsCurrentTab();
    });
  });

  windowElement.querySelector('#settings-open-regedit-btn')?.addEventListener('click', () => {
    const regPkg = packageCatalog.find((p) => p.pkgId === 'sys_regedit');
    if (regPkg && !regPkg.installed) {
      openInstallShieldWizard(regPkg, 'install');
      return;
    }
    bridgeRef?.openApp('regedit');
  });

  windowElement.querySelector('#settings-open-bios-btn')?.addEventListener('click', () => {
    openCmosBiosSetup();
  });

  windowElement.querySelector('#settings-factory-reset-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playStartupChime();
    systemRegistry = { ...DEFAULT_SYSTEM_REGISTRY };
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
    bridgeRef?.showOsDialog('All 50+ Master Settings & Registry keys have been restored to 1995 factory defaults!', 'Factory Reset Complete');
  });

  renderMasterSettingsCurrentTab();
}

// ==================== LIVE REGEDIT.EXE (REGISTRY EDITOR) ====================
function refreshRegeditIfOpen(): void {
  const win = document.getElementById('regedit');
  if (!win || win.style.display === 'none') return;
  renderRegeditValues();
}

function renderRegeditTree(): void {
  const treeEl = document.getElementById('regedit-tree');
  if (!treeEl) return;

  const uniquePaths = Array.from(new Set(REGISTRY_DESCRIPTORS.map((d) => `${d.hive}\\${d.subkey}`)));
  treeEl.innerHTML = `<div style="font-weight:700;padding:2px 4px;color:#000080;">💻 My Computer</div>`;

  uniquePaths.forEach((fullPath) => {
    const div = document.createElement('div');
    div.className = `regedit-tree-node${fullPath === activeRegeditSubkey ? ' active' : ''}`;
    const shortLabel = fullPath.replace('HKEY_CURRENT_USER\\', 'HKCU\\').replace('HKEY_LOCAL_MACHINE\\', 'HKLM\\');
    div.textContent = `📁 ${shortLabel}`;
    div.title = fullPath;
    div.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      activeRegeditSubkey = fullPath;
      const searchIn = document.getElementById('regedit-search-input') as HTMLInputElement | null;
      if (searchIn) searchIn.value = '';
      renderRegeditTree();
      renderRegeditValues();
    });
    treeEl.appendChild(div);
  });
}

function renderRegeditValues(): void {
  const tbody = document.getElementById('regedit-tbody');
  const statusEl = document.getElementById('regedit-path-status');
  const searchInput = document.getElementById('regedit-search-input') as HTMLInputElement | null;
  if (!tbody) return;

  const q = (searchInput?.value || '').trim().toLowerCase();
  const rows = REGISTRY_DESCRIPTORS.filter((d) => {
    if (q) {
      return (
        d.name.toLowerCase().includes(q) ||
        d.subkey.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }
    return `${d.hive}\\${d.subkey}` === activeRegeditSubkey;
  });

  if (statusEl) {
    statusEl.textContent = q ? `Search Results (${rows.length} keys)` : `My Computer\\${activeRegeditSubkey}`;
  }

  tbody.innerHTML = '';
  rows.forEach((desc) => {
    const tr = document.createElement('tr');
    if (selectedRegDescriptor?.key === desc.key) tr.classList.add('selected');
    const rawVal = systemRegistry[desc.key];
    const displayVal =
      typeof rawVal === 'boolean' ? (rawVal ? '0x00000001 (1)' : '0x00000000 (0)') : String(rawVal);

    tr.innerHTML = `
      <td><b>${desc.name}</b></td>
      <td>${desc.regType}</td>
      <td>${displayVal}</td>
      <td>${desc.description}</td>
    `;
    tr.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      selectedRegDescriptor = desc;
      const lbl = document.getElementById('regedit-selected-label');
      const valIn = document.getElementById('regedit-value-input') as HTMLInputElement | null;
      const applyBtn = document.getElementById('regedit-apply-btn') as HTMLButtonElement | null;
      if (lbl) lbl.textContent = `${desc.name} (${desc.regType}):`;
      if (valIn) {
        valIn.disabled = false;
        valIn.value = typeof rawVal === 'boolean' ? (rawVal ? '1' : '0') : String(rawVal);
        valIn.focus();
      }
      if (applyBtn) applyBtn.disabled = false;
      renderRegeditValues();
    });
    tbody.appendChild(tr);
  });
}

export function initRegeditApp(windowElement: HTMLDivElement): void {
  const searchIn = windowElement.querySelector('#regedit-search-input') as HTMLInputElement | null;
  const valIn = windowElement.querySelector('#regedit-value-input') as HTMLInputElement | null;
  const applyBtn = windowElement.querySelector('#regedit-apply-btn') as HTMLButtonElement | null;

  searchIn?.addEventListener('input', () => renderRegeditValues());

  const commitRegValue = () => {
    if (!selectedRegDescriptor || !valIn) return;
    bridgeRef?.sfx.playWindowOpen();
    const key = selectedRegDescriptor.key;
    const current = systemRegistry[key];
    const raw = valIn.value.trim();

    if (typeof current === 'boolean') {
      (systemRegistry as any)[key] = raw === '1' || raw.toLowerCase() === 'true';
    } else if (typeof current === 'number') {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) (systemRegistry as any)[key] = parsed;
    } else {
      (systemRegistry as any)[key] = raw;
    }

    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
    renderRegeditValues();
  };

  applyBtn?.addEventListener('click', commitRegValue);
  valIn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitRegValue();
  });

  windowElement.querySelector('#regedit-open-settings-btn')?.addEventListener('click', () => {
    bridgeRef?.openApp('controlPanel', true);
  });

  windowElement.querySelector('#regedit-export-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    const regContent =
      'REGEDIT4\n\n' +
      REGISTRY_DESCRIPTORS.map((d) => `[${d.hive}\\${d.subkey}]\n"${d.name}"="${String(systemRegistry[d.key])}"`).join('\n\n');
    bridgeRef?.addVfsFile('GEMINI95_EXPORT.REG', 'text', 'C:\\System95', regContent);
    bridgeRef?.refreshExplorerIfOpen();
    bridgeRef?.showOsDialog('Exported REGEDIT4 hive dump to C:\\System95\\GEMINI95_EXPORT.REG!', 'Registry Exported');
  });

  renderRegeditTree();
  renderRegeditValues();
}

// ==================== SYSTEM RESOURCE MONITOR (SYSMON.EXE) ====================
let sysmonTimerId: number | null = null;

export function initSysMonitorApp(windowElement: HTMLDivElement): void {
  windowElement.querySelector('#sysmon-tune-hw-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playClick();
    bridgeRef?.openApp('perfAdjust', true);
  });

  if (sysmonTimerId) clearInterval(sysmonTimerId);
  const cpuHist = new Array(32).fill(18);
  const ramHist = new Array(32).fill(38);
  const swapHist = new Array(32).fill(14);
  const netHist = new Array(32).fill(25);

  const drawGraph = (canvasId: string, data: number[], stroke: string) => {
    const c = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#001a09';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(0,255,100,0.16)';
    for (let y = 18; y < c.height; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = c.width / (data.length - 1);
    data.forEach((v, idx) => {
      const py = c.height - Math.min(c.height - 4, Math.max(4, (v / 100) * c.height));
      if (idx === 0) ctx.moveTo(0, py);
      else ctx.lineTo(idx * step, py);
    });
    ctx.stroke();
  };

  sysmonTimerId = window.setInterval(() => {
    if (windowElement.style.display === 'none') return;
    const cpuBase = systemRegistry.cpuModel.includes('486') ? 52 : systemRegistry.cpuModel.includes('400MHz') ? 11 : 24;
    const cpuVal = Math.min(99, Math.max(4, Math.round(cpuBase + Math.random() * 24)));
    const totalRamMb = getEffectiveRamMB(systemRegistry, getBiosRamBoostMB());
    const usedMb = Math.min(totalRamMb - 2, Math.max(8, Math.round(totalRamMb * (0.24 + Math.random() * 0.08))));
    const ramPct = Math.round((usedMb / totalRamMb) * 100);
    const swapMb = Math.round(8 + Math.random() * 8);
    const kbps = ((systemRegistry.modemBaudRate / 1000) * (0.4 + Math.random() * 0.55)).toFixed(1);

    cpuHist.push(cpuVal); cpuHist.shift();
    ramHist.push(ramPct); ramHist.shift();
    swapHist.push(Math.min(95, swapMb * 3)); swapHist.shift();
    netHist.push(Math.min(95, 20 + Math.random() * 65)); netHist.shift();

    drawGraph('sysmon-canvas-cpu', cpuHist, '#00ff66');
    drawGraph('sysmon-canvas-ram', ramHist, '#38bdf8');
    drawGraph('sysmon-canvas-swap', swapHist, '#facc15');
    drawGraph('sysmon-canvas-net', netHist, '#f472b6');

    const setTxt = (id: string, t: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = t;
    };
    setTxt('sysmon-cpu-val', `${cpuVal}%`);
    setTxt('sysmon-ram-val', `${usedMb} / ${totalRamMb} MB`);
    setTxt('sysmon-swap-val', `${swapMb} / ${systemRegistry.virtualSwapMB} MB`);
    setTxt('sysmon-net-val', `${kbps} kbps`);
    const t = computeHardwareTelemetry(systemRegistry);
    setTxt('sysmon-hw-summary', `${systemRegistry.cpuModel}${getBiosCpuLabelSuffix()} · ${totalRamMb}MB (${systemRegistry.ramMode}) · ${t.cpuTempC.toFixed(1)}°C · Fans ${t.cpuFanRpm} RPM · BIOS Regs: ${getActivatedBiosCount()}`);
  }, 700);
}

// ==================== AWARD / UEFI CMOS BIOS SETUP UTILITY (5,120+ FEATURES) ====================
let cmosSensorsTickerId: number | null = null;

function updateCmosLiveSensorsStrip(): void {
  const t = computeHardwareTelemetry(systemRegistry);
  const headerEl = document.getElementById('cmos-live-sensors');
  if (headerEl) {
    headerEl.textContent = `Vcore: ${t.vcoreV}V · CPU: ${t.cpuTempC.toFixed(1)}°C · Fan: ${t.cpuFanRpm} RPM · RAM: ${t.effectiveRamMB.toLocaleString()} MB`;
  }
  const panelEl = document.getElementById('cmos-panel-sensors');
  if (panelEl) {
    panelEl.textContent = `${t.cpuClockGHz}GHz · ${t.cpuTempC.toFixed(1)}°C · CPU Fan ${t.cpuFanRpm} RPM · RAM: ${t.effectiveRamMB.toLocaleString()}MB (${systemRegistry.ramMode.toUpperCase()})`;
  }
}

export function openCmosBiosSetup(): void {
  const screen = document.getElementById('cmos-bios-screen');
  if (!screen) return;
  bridgeRef?.sfx.playPostBeep();
  syncCmosControlsFromRegistry();
  updateCmosLiveSensorsStrip();
  renderCmos5000Browser();
  screen.style.display = 'flex';
  if (cmosSensorsTickerId !== null) clearInterval(cmosSensorsTickerId);
  cmosSensorsTickerId = window.setInterval(() => {
    const s = document.getElementById('cmos-bios-screen');
    if (s && s.style.display !== 'none') {
      updateCmosLiveSensorsStrip();
    } else if (cmosSensorsTickerId !== null) {
      clearInterval(cmosSensorsTickerId);
      cmosSensorsTickerId = null;
    }
  }, 1000);
}

function syncCmosControlsFromRegistry(): void {
  const cpuSel = document.getElementById('cmos-cpu-select') as HTMLSelectElement | null;
  const ramModeSel = document.getElementById('cmos-ram-mode-select') as HTMLSelectElement | null;
  const ramSel = document.getElementById('cmos-ram-select') as HTMLSelectElement | null;
  const ramCustomInp = document.getElementById('cmos-ram-custom-input') as HTMLInputElement | null;
  const perfSel = document.getElementById('cmos-perf-select') as HTMLSelectElement | null;
  const fanSel = document.getElementById('cmos-fan-select') as HTMLSelectElement | null;
  const bootSel = document.getElementById('cmos-bootorder-select') as HTMLSelectElement | null;
  const fsSel = document.getElementById('cmos-fs-select') as HTMLSelectElement | null;
  if (cpuSel) cpuSel.value = systemRegistry.cpuModel;
  if (ramModeSel) ramModeSel.value = systemRegistry.ramMode;
  if (ramSel) ramSel.value = String(systemRegistry.installedRamMB);
  if (ramCustomInp) ramCustomInp.value = String(systemRegistry.customRamMB);
  if (perfSel) perfSel.value = systemRegistry.perfProfile;
  if (fanSel) fanSel.value = systemRegistry.perfFanMode;
  if (bootSel) bootSel.value = systemRegistry.biosBootOrder;
  if (fsSel) fsSel.value = systemRegistry.fileSystemFormat;

  const setBtn = (id: string, on: boolean) => {
    const b = document.getElementById(id);
    if (b) {
      b.textContent = on ? 'ENABLED' : 'DISABLED';
      (b as HTMLElement).style.color = on ? '#00ffff' : '#ff8888';
    }
  };
  setBtn('cmos-turbo-btn', systemRegistry.cpuTurboBoost);
  setBtn('cmos-quickpost-btn', systemRegistry.biosQuickPost);
  setBtn('cmos-audio-btn', systemRegistry.audioEnabled);
  setBtn('cmos-bootchime-btn', systemRegistry.biosBootAudio);
  setBtn('cmos-crt-btn', systemRegistry.crtEnabled);
}

export function initCmosBiosController(): void {
  const screen = document.getElementById('cmos-bios-screen');
  if (!screen) return;

  registerBios5000Callbacks({
    onPlayClick: () => bridgeRef?.sfx.playClick(),
    onFeatureChanged: () => {
      applySystemRegistryToOS();
    },
    onUnlockTrophy: (id) => bridgeRef?.unlockAchievement?.(id),
  });
  initCmos5000Listeners();

  document.getElementById('boot-cmos-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openCmosBiosSetup();
  });

  document.getElementById('boot-os-setup-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openOsReinstallScreen();
  });

  const wireToggle = (id: string, getter: () => boolean, setter: (v: boolean) => void) => {
    document.getElementById(id)?.addEventListener('click', () => {
      bridgeRef?.sfx.playClick();
      setter(!getter());
      syncCmosControlsFromRegistry();
    });
  };

  wireToggle('cmos-turbo-btn', () => systemRegistry.cpuTurboBoost, (v) => (systemRegistry.cpuTurboBoost = v));
  wireToggle('cmos-quickpost-btn', () => systemRegistry.biosQuickPost, (v) => (systemRegistry.biosQuickPost = v));
  wireToggle('cmos-audio-btn', () => systemRegistry.audioEnabled, (v) => (systemRegistry.audioEnabled = v));
  wireToggle('cmos-bootchime-btn', () => systemRegistry.biosBootAudio, (v) => (systemRegistry.biosBootAudio = v));
  wireToggle('cmos-crt-btn', () => systemRegistry.crtEnabled, (v) => (systemRegistry.crtEnabled = v));

  document.getElementById('cmos-cpu-select')?.addEventListener('change', (e) => {
    systemRegistry.cpuModel = (e.target as HTMLSelectElement).value as any;
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-ram-mode-select')?.addEventListener('change', (e) => {
    systemRegistry.ramMode = (e.target as HTMLSelectElement).value as any;
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-ram-select')?.addEventListener('change', (e) => {
    systemRegistry.installedRamMB = Number((e.target as HTMLSelectElement).value) as any;
    systemRegistry.ramMode = 'limited';
    const modeSel = document.getElementById('cmos-ram-mode-select') as HTMLSelectElement | null;
    if (modeSel) modeSel.value = 'limited';
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-ram-custom-input')?.addEventListener('change', (e) => {
    const val = Math.max(16, Math.min(65536, Math.round(Number((e.target as HTMLInputElement).value) || 512)));
    (e.target as HTMLInputElement).value = String(val);
    systemRegistry.customRamMB = val;
    systemRegistry.ramMode = 'custom';
    const modeSel = document.getElementById('cmos-ram-mode-select') as HTMLSelectElement | null;
    if (modeSel) modeSel.value = 'custom';
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-perf-select')?.addEventListener('change', (e) => {
    const profile = (e.target as HTMLSelectElement).value as SystemRegistry['perfProfile'];
    if (profile === 'custom') systemRegistry.perfProfile = 'custom';
    else applyPerfPreset(profile, systemRegistry);
    const fanSel = document.getElementById('cmos-fan-select') as HTMLSelectElement | null;
    if (fanSel) fanSel.value = systemRegistry.perfFanMode;
    syncCmosControlsFromRegistry();
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-fan-select')?.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value as SystemRegistry['perfFanMode'];
    systemRegistry.perfFanMode = mode;
    if (mode === 'off') systemRegistry.perfFanDutyPct = 0;
    else if (mode === 'silent') systemRegistry.perfFanDutyPct = 28;
    else if (mode === 'balanced') systemRegistry.perfFanDutyPct = 54;
    else if (mode === 'turbo') systemRegistry.perfFanDutyPct = 100;
    updateCmosLiveSensorsStrip();
  });
  document.getElementById('cmos-open-perf-btn')?.addEventListener('click', () => {
    applySystemRegistryToOS();
    screen.style.display = 'none';
    bridgeRef?.openApp('perfAdjust', true);
  });
  document.getElementById('cmos-bootorder-select')?.addEventListener('change', (e) => {
    systemRegistry.biosBootOrder = (e.target as HTMLSelectElement).value as any;
  });
  document.getElementById('cmos-fs-select')?.addEventListener('change', (e) => {
    systemRegistry.fileSystemFormat = (e.target as HTMLSelectElement).value as any;
  });

  document.getElementById('cmos-save-exit-btn')?.addEventListener('click', () => {
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
    screen.style.display = 'none';
    if (systemRegistry.biosBootOrder === 'CDROM_C_A') {
      openOsReinstallScreen();
    } else {
      bridgeRef?.rebootGemini95();
    }
  });

  document.getElementById('cmos-apply-desktop-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playWindowOpen();
    applySystemRegistryToOS();
    renderMasterSettingsCurrentTab();
    screen.style.display = 'none';
  });

  document.getElementById('cmos-os-setup-btn')?.addEventListener('click', () => {
    applySystemRegistryToOS();
    screen.style.display = 'none';
    openOsReinstallScreen();
  });

  document.getElementById('cmos-defaults-btn')?.addEventListener('click', () => {
    bridgeRef?.sfx.playPostBeep();
    systemRegistry = { ...DEFAULT_SYSTEM_REGISTRY };
    resetAllBios5000ToDefaults();
    syncCmosControlsFromRegistry();
    applySystemRegistryToOS();
    renderCmos5000Browser();
  });

  document.getElementById('cmos-cancel-btn')?.addEventListener('click', () => {
    applySystemRegistryToOS();
    screen.style.display = 'none';
  });

  window.addEventListener('keydown', (e) => {
    if (screen.style.display !== 'flex') return;
    if (e.key === 'F6') {
      e.preventDefault();
      document.getElementById('cmos-activate-all-btn')?.click();
    } else if (e.key === 'F7') {
      e.preventDefault();
      document.getElementById('cmos-defaults-btn')?.click();
    } else if (e.key === 'F10') {
      e.preventDefault();
      document.getElementById('cmos-save-exit-btn')?.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      document.getElementById('cmos-cancel-btn')?.click();
    }
  });
}

// ==================== OPTIONAL CRT STARFIELD / MATRIX SCREENSAVER ====================
let screensaverAnimId: number | null = null;
let idleResetTimer: number | null = null;

export function startScreensaverNow(): void {
  const canvas = document.getElementById('os-screensaver') as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (screensaverAnimId) cancelAnimationFrame(screensaverAnimId);

  const stars = Array.from({ length: 140 }, () => ({
    x: (Math.random() - 0.5) * canvas.width,
    y: (Math.random() - 0.5) * canvas.height,
    z: Math.random() * canvas.width,
  }));

  const stopSaver = () => {
    if (screensaverAnimId) cancelAnimationFrame(screensaverAnimId);
    screensaverAnimId = null;
    canvas.style.display = 'none';
    resetIdleTimer();
  };

  canvas.onclick = stopSaver;
  canvas.onmousemove = stopSaver;

  const loop = () => {
    if (canvas.style.display === 'none') return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (systemRegistry.screensaverStyle === 'matrix') {
      ctx.fillStyle = '#00ff66';
      ctx.font = '16px monospace';
      for (let i = 0; i < 18; i++) {
        ctx.fillText(String.fromCharCode(33 + Math.floor(Math.random() * 90)), Math.random() * canvas.width, Math.random() * canvas.height);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      stars.forEach((s) => {
        s.z -= 6;
        if (s.z <= 1) s.z = canvas.width;
        const sx = (s.x / s.z) * cx + cx;
        const sy = (s.y / s.z) * cy + cy;
        const size = Math.max(1, (1 - s.z / canvas.width) * 3.5);
        ctx.fillRect(sx, sy, size, size);
      });
    }
    screensaverAnimId = requestAnimationFrame(loop);
  };
  loop();
}

export function resetIdleTimer(): void {
  if (idleResetTimer) clearTimeout(idleResetTimer);
  if (systemRegistry.screensaverMinutes > 0) {
    idleResetTimer = window.setTimeout(() => {
      startScreensaverNow();
    }, systemRegistry.screensaverMinutes * 60 * 1000);
  }
}
