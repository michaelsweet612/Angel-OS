/**
 * SystemLogs Component (SYSLOGS.EXE)
 * Captures and displays live OS events — application launches/closures,
 * virtual file system (VFS) changes, and hardware/BIOS initializations —
 * formatted as retro text-based .LOG files in a scrollable Win95 window.
 */

export type SystemLogStream = 'BOOT' | 'APPS' | 'VFS' | 'HW';
export type SystemLogFileId = 'ALL' | SystemLogStream;
export type SystemLogLevel = 'INFO' | 'OK' | 'WARN' | 'ERR';
export type SystemLogTheme = 'notepad' | 'crt-green' | 'amber';

export interface SystemLogEntry {
  seq: number;
  timestamp: string;
  isoDate: string;
  stream: SystemLogStream;
  level: SystemLogLevel;
  source: string;
  eventId: string;
  message: string;
  isDivider?: boolean;
}

export interface SystemLogsBridge {
  addVfsFile: (name: string, type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe', parent: string, content?: string) => void;
  refreshExplorerIfOpen: () => void;
  pushToast: (title: string, body: string, icon?: string) => void;
  playClick: () => void;
}

interface SystemLogFileSpec {
  id: SystemLogFileId;
  fileName: string;
  dosPath: string;
  description: string;
  tabLabel: string;
}

interface PersistedPrefs {
  activeFile: SystemLogFileId;
  theme: SystemLogTheme;
  wordWrap: boolean;
  levelFilter: 'ALL' | SystemLogLevel;
}

const LOG_ENTRIES_STORAGE_KEY = 'gemini95_system_logs_entries_v1';
const LOG_PREFS_STORAGE_KEY = 'gemini95_system_logs_prefs_v1';
const MAX_LOG_ENTRIES = 600;

export const SYSTEM_LOG_FILES: Record<SystemLogFileId, SystemLogFileSpec> = {
  ALL: {
    id: 'ALL',
    fileName: 'SYSLOG.LOG',
    dosPath: 'C:\\WINDOWS\\LOGS\\SYSLOG.LOG',
    description: 'Unified Operating System Event Journal (All Subsystems)',
    tabLabel: 'SYSLOG.LOG',
  },
  BOOT: {
    id: 'BOOT',
    fileName: 'BOOTLOG.TXT',
    dosPath: 'C:\\WINDOWS\\LOGS\\BOOTLOG.TXT',
    description: 'BIOS POST, Boot Manager, Kernel & Shell Initialization Log',
    tabLabel: 'BOOTLOG.TXT',
  },
  APPS: {
    id: 'APPS',
    fileName: 'APPLOG.TXT',
    dosPath: 'C:\\WINDOWS\\LOGS\\APPLOG.TXT',
    description: 'Win32 Application Lifecycle, Packages & Command Execution Log',
    tabLabel: 'APPLOG.TXT',
  },
  VFS: {
    id: 'VFS',
    fileName: 'VFSIO.LOG',
    dosPath: 'C:\\WINDOWS\\LOGS\\VFSIO.LOG',
    description: 'FAT16/FAT32 Virtual File System Read, Write & Delete Journal',
    tabLabel: 'VFSIO.LOG',
  },
  HW: {
    id: 'HW',
    fileName: 'HWINIT.LOG',
    dosPath: 'C:\\WINDOWS\\LOGS\\HWINIT.LOG',
    description: 'Hardware Detection, Sound Blaster 16 DSP, Display & Disk Init Log',
    tabLabel: 'HWINIT.LOG',
  },
};

const THEME_LABELS: Record<SystemLogTheme, string> = {
  notepad: 'Notepad White',
  'crt-green': 'CRT Green',
  amber: 'Amber Mono',
};

let logsBridge: SystemLogsBridge | null = null;
let entries: SystemLogEntry[] = [];
let nextSeq = 1;
let persistTimerId: number | null = null;
let initializedWindowEl: HTMLDivElement | null = null;
let isComponentMounted = false;
let suppressNextScrollPause = false;
let lastRenderedMaxSeq = 0;

const viewState: {
  activeFile: SystemLogFileId;
  theme: SystemLogTheme;
  levelFilter: 'ALL' | SystemLogLevel;
  searchQuery: string;
  wordWrap: boolean;
  followTail: boolean;
  unreadWhilePaused: number;
} = {
  activeFile: 'ALL',
  theme: 'notepad',
  levelFilter: 'ALL',
  searchQuery: '',
  wordWrap: false,
  followTail: true,
  unreadWhilePaused: 0,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

function formatNowParts(): { timestamp: string; isoDate: string } {
  const d = new Date();
  const timestamp = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const isoDate = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { timestamp, isoDate };
}

function deriveEventId(stream: SystemLogStream, seq: number): string {
  const base =
    stream === 'BOOT'
      ? 0x1000
      : stream === 'HW'
        ? 0x2000
        : stream === 'VFS'
          ? 0x3000
          : 0x4000;
  return `0x${(base + ((seq * 17) % 0x0fff)).toString(16).toUpperCase().padStart(4, '0')}`;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightEscapedText(text: string, query: string): string {
  const escaped = escapeHtml(text);
  const q = query.trim();
  if (!q) return escaped;
  const escapedQuery = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return escaped.replace(regex, '<mark class="syslogs-hl">$1</mark>');
  } catch {
    return escaped;
  }
}

function formatPlainTextLine(entry: SystemLogEntry): string {
  if (entry.isDivider) {
    return `--- ${entry.message} [${entry.isoDate} ${entry.timestamp}] ---`;
  }
  const lvl = entry.level.padEnd(4, ' ');
  const src = entry.source.slice(0, 14).padEnd(14, ' ');
  return `[${entry.timestamp}] [${lvl}] [${src}] [${entry.eventId}] ${entry.message}`;
}

function buildRetroFileHeader(spec: SystemLogFileSpec, lineCount: number): string {
  const now = formatNowParts();
  const divider = '================================================================================';
  return [
    divider,
    `FILE: ${spec.dosPath}   |   FORMAT: ANSI CR/LF   |   HOST: GEMINI-95`,
    `DESC: ${spec.description}`,
    `DATE: ${now.isoDate}   |   LINES: ${lineCount}   |   RING_BUFFER: ${entries.length}/${MAX_LOG_ENTRIES}`,
    divider,
  ].join('\r\n');
}

function schedulePersistEntries(): void {
  if (persistTimerId !== null) return;
  persistTimerId = window.setTimeout(() => {
    persistTimerId = null;
    try {
      window.localStorage.setItem(LOG_ENTRIES_STORAGE_KEY, JSON.stringify(entries.slice(-MAX_LOG_ENTRIES)));
    } catch {
      // Ignore storage quota issues
    }
  }, 220);
}

function savePrefs(): void {
  try {
    const prefs: PersistedPrefs = {
      activeFile: viewState.activeFile,
      theme: viewState.theme,
      wordWrap: viewState.wordWrap,
      levelFilter: viewState.levelFilter,
    };
    window.localStorage.setItem(LOG_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota issues
  }
}

function loadPersistedState(): void {
  try {
    const rawPrefs = window.localStorage.getItem(LOG_PREFS_STORAGE_KEY);
    if (rawPrefs) {
      const parsed = JSON.parse(rawPrefs) as Partial<PersistedPrefs>;
      if (parsed.activeFile && parsed.activeFile in SYSTEM_LOG_FILES) {
        viewState.activeFile = parsed.activeFile;
      }
      if (parsed.theme === 'notepad' || parsed.theme === 'crt-green' || parsed.theme === 'amber') {
        viewState.theme = parsed.theme;
      }
      if (typeof parsed.wordWrap === 'boolean') {
        viewState.wordWrap = parsed.wordWrap;
      }
      if (
        parsed.levelFilter === 'ALL' ||
        parsed.levelFilter === 'INFO' ||
        parsed.levelFilter === 'OK' ||
        parsed.levelFilter === 'WARN' ||
        parsed.levelFilter === 'ERR'
      ) {
        viewState.levelFilter = parsed.levelFilter;
      }
    }
  } catch {
    // Fallback to defaults
  }

  let loadedExisting = false;
  try {
    const rawEntries = window.localStorage.getItem(LOG_ENTRIES_STORAGE_KEY);
    if (rawEntries) {
      const parsed = JSON.parse(rawEntries);
      if (Array.isArray(parsed) && parsed.length > 0) {
        entries = parsed
          .filter((item) => item && typeof item.message === 'string' && typeof item.stream === 'string')
          .slice(-MAX_LOG_ENTRIES);
        if (entries.length > 0) {
          nextSeq = entries.reduce((max, item) => Math.max(max, Number(item.seq) || 0), 0) + 1;
          loadedExisting = true;
        }
      }
    }
  } catch {
    // Ignore malformed persisted data
  }

  const now = formatNowParts();
  if (loadedExisting) {
    entries.push({
      seq: nextSeq++,
      timestamp: now.timestamp,
      isoDate: now.isoDate,
      stream: 'BOOT',
      level: 'INFO',
      source: 'KERNEL',
      eventId: '0x0000',
      message: 'SESSION BOOT',
      isDivider: true,
    });
    if (entries.length > MAX_LOG_ENTRIES) {
      entries = entries.slice(-MAX_LOG_ENTRIES);
    }
    schedulePersistEntries();
  } else {
    // Seed authentic initial power-on records so first-time users immediately see real boot & HW context
    const seeds: Array<{ stream: SystemLogStream; source: string; level: SystemLogLevel; eventId: string; message: string }> = [
      {
        stream: 'BOOT',
        source: 'AWARD_BIOS',
        level: 'OK',
        eventId: '0x1000',
        message: 'Award Modular BIOS v4.51PG initialized — PCI/ISA PnP ROM shadow verified.',
      },
      {
        stream: 'HW',
        source: 'IDE_DISK0',
        level: 'OK',
        eventId: '0x2004',
        message: 'Primary Master Quantum Fireball 1995MB IDE detected (CHS 4054/16/63, LBA).',
      },
      {
        stream: 'HW',
        source: 'SB16_DSP.VXD',
        level: 'OK',
        eventId: '0x2010',
        message: 'Creative Sound Blaster 16 ASP Audio DSP ready at Port 220h, IRQ 5, DMA 1.',
      },
      {
        stream: 'VFS',
        source: 'VFS_FAT16',
        level: 'OK',
        eventId: '0x3001',
        message: 'Mounted Virtual Volume C:\\ (GEMINI95) — C:\\Documents, C:\\Pictures, C:\\Downloads, C:\\System95 online.',
      },
      {
        stream: 'BOOT',
        source: 'EXPLORER.EXE',
        level: 'INFO',
        eventId: '0x1095',
        message: 'Gemini 95 Hybrid Desktop Shell initialized — SystemLogs ring buffer active.',
      },
    ];
    for (const s of seeds) {
      entries.push({
        seq: nextSeq++,
        timestamp: now.timestamp,
        isoDate: now.isoDate,
        stream: s.stream,
        level: s.level,
        source: s.source,
        eventId: s.eventId,
        message: s.message,
      });
    }
    schedulePersistEntries();
  }
}

loadPersistedState();

function matchesActiveFilter(entry: SystemLogEntry): boolean {
  if (viewState.activeFile !== 'ALL' && entry.stream !== viewState.activeFile) {
    return false;
  }
  if (entry.isDivider) {
    return viewState.searchQuery.trim() === '' && viewState.levelFilter === 'ALL';
  }
  if (viewState.levelFilter !== 'ALL' && entry.level !== viewState.levelFilter) {
    return false;
  }
  const q = viewState.searchQuery.trim().toLowerCase();
  if (q) {
    return (
      entry.message.toLowerCase().includes(q) ||
      entry.source.toLowerCase().includes(q) ||
      entry.level.toLowerCase().includes(q) ||
      entry.eventId.toLowerCase().includes(q) ||
      entry.timestamp.toLowerCase().includes(q)
    );
  }
  return true;
}

export function registerSystemLogsBridge(bridge: SystemLogsBridge): void {
  logsBridge = bridge;
}

export function recordSystemLog(
  stream: SystemLogStream,
  source: string,
  message: string,
  level: SystemLogLevel = 'INFO',
  eventId?: string,
): SystemLogEntry {
  const now = formatNowParts();
  const seq = nextSeq++;
  const entry: SystemLogEntry = {
    seq,
    timestamp: now.timestamp,
    isoDate: now.isoDate,
    stream,
    level,
    source: source.toUpperCase().replace(/\s+/g, '_'),
    eventId: eventId || deriveEventId(stream, seq),
    message,
  };
  entries.push(entry);
  if (entries.length > MAX_LOG_ENTRIES) {
    entries.shift();
  }
  schedulePersistEntries();

  if (isComponentMounted && initializedWindowEl) {
    const matchesCurrent = matchesActiveFilter(entry);
    if (!viewState.followTail && matchesCurrent) {
      viewState.unreadWhilePaused += 1;
    }
    renderSystemLogsUI(true);
  }

  return entry;
}

export function logAppEvent(
  action: 'LAUNCH' | 'FOCUS' | 'CLOSE' | 'MINIMIZE' | 'INSTALL' | 'UNINSTALL' | 'RUN',
  appName: string,
  detail?: string,
  level: SystemLogLevel = 'INFO',
): void {
  const sourceMap: Record<typeof action, string> = {
    LAUNCH: 'SHELL32.DLL',
    FOCUS: 'USER32.DLL',
    CLOSE: 'USER32.DLL',
    MINIMIZE: 'USER32.DLL',
    INSTALL: 'APPWIZ.CPL',
    UNINSTALL: 'APPWIZ.CPL',
    RUN: 'RUN.DLL',
  };
  const verbMap: Record<typeof action, string> = {
    LAUNCH: `Launched application "${appName}"`,
    FOCUS: `Focused active window "${appName}"`,
    CLOSE: `Closed application "${appName}"`,
    MINIMIZE: `Minimized window "${appName}" to taskbar`,
    INSTALL: `Installed package "${appName}"`,
    UNINSTALL: `Uninstalled package "${appName}"`,
    RUN: `Executed command "${appName}"`,
  };
  const msg = detail ? `${verbMap[action]} — ${detail}` : verbMap[action];
  recordSystemLog('APPS', sourceMap[action], msg, level);
}

export function logVfsEvent(
  action: 'CREATE' | 'WRITE' | 'READ' | 'DELETE' | 'RESTORE' | 'RESET' | 'EXEC',
  path: string,
  detail?: string,
  level: SystemLogLevel = 'INFO',
): void {
  const verbMap: Record<typeof action, string> = {
    CREATE: `Created VFS object ${path}`,
    WRITE: `Wrote file ${path}`,
    READ: `Opened file ${path}`,
    DELETE: `Deleted VFS object ${path}`,
    RESTORE: `Restored file ${path} from Recycle Bin`,
    RESET: `Reset Virtual File System (${path})`,
    EXEC: `Executed binary ${path}`,
  };
  const msg = detail ? `${verbMap[action]} (${detail})` : verbMap[action];
  recordSystemLog('VFS', 'VFS_FAT16', msg, level);
}

export function logHardwareEvent(
  subsystem: string,
  message: string,
  level: SystemLogLevel = 'INFO',
  eventId?: string,
): void {
  recordSystemLog('HW', subsystem, message, level, eventId);
}

export function logBootEvent(
  stage: string,
  message: string,
  level: SystemLogLevel = 'INFO',
  eventId?: string,
): void {
  recordSystemLog('BOOT', stage, message, level, eventId);
}

/**
 * Bridges legacy `logOsEvent(category, source, message, level)` calls from other modules
 * into the canonical SystemLogs store without losing any events.
 */
export function logLegacyOsEvent(
  category: string,
  source: string,
  message: string,
  level: string = 'INFO',
): void {
  const cat = String(category || '').toUpperCase();
  const lvlRaw = String(level || 'INFO').toUpperCase();

  let stream: SystemLogStream = 'APPS';
  if (cat === 'KERNEL' || cat === 'SECURITY') stream = 'BOOT';
  else if (cat === 'AUDIO' || cat === 'NETWORK' || cat === 'HARDWARE' || cat === 'HW') stream = 'HW';
  else if (cat === 'VFS' || cat === 'DISK' || cat === 'FS') stream = 'VFS';
  else stream = 'APPS';

  let mappedLevel: SystemLogLevel = 'INFO';
  if (lvlRaw === 'ERROR' || lvlRaw === 'ERR') mappedLevel = 'ERR';
  else if (lvlRaw === 'WARN' || lvlRaw === 'WARNING') mappedLevel = 'WARN';
  else if (lvlRaw === 'OK' || lvlRaw === 'SUCCESS') mappedLevel = 'OK';

  recordSystemLog(stream, source || cat || 'OS', message, mappedLevel);
}

function getFilteredEntries(): SystemLogEntry[] {
  return entries.filter(matchesActiveFilter);
}

function buildTimestampedTxtFilename(spec: SystemLogFileSpec): string {
  const baseName = spec.fileName.replace(/\.[^.]+$/, '').toUpperCase();
  const d = new Date();
  const datePart = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const timePart = `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  return `${baseName}_${datePart}_${timePart}.txt`;
}

function serializeActiveLogText(): { fileName: string; content: string; lineCount: number } {
  const spec = SYSTEM_LOG_FILES[viewState.activeFile];
  const filtered = getFilteredEntries();
  const header = buildRetroFileHeader(spec, filtered.length);
  const body = filtered.map(formatPlainTextLine).join('\r\n');
  return {
    fileName: spec.fileName,
    content: body ? `${header}\r\n${body}\r\n` : `${header}\r\n[EOF — 0 matching entries]\r\n`,
    lineCount: filtered.length,
  };
}

function serializeCurrentViewForTxtExport(): { fileName: string; content: string; lineCount: number } {
  const spec = SYSTEM_LOG_FILES[viewState.activeFile];
  const filtered = getFilteredEntries();
  const now = formatNowParts();
  const divider = '================================================================================';
  const searchDisplay = viewState.searchQuery.trim() ? `"${viewState.searchQuery.trim()}"` : 'NONE';
  const header = [
    divider,
    `FILE: ${spec.dosPath}   |   FORMAT: ANSI CR/LF   |   HOST: GEMINI-95`,
    `DESC: ${spec.description}`,
    `EXPORTED: ${now.isoDate} ${now.timestamp}   |   TAB: ${spec.tabLabel}   |   LINES: ${filtered.length}/${entries.length}`,
    `FILTERS: LEVEL=${viewState.levelFilter}   |   SEARCH=${searchDisplay}`,
    divider,
  ].join('\r\n');
  const body = filtered.map(formatPlainTextLine).join('\r\n');
  return {
    fileName: buildTimestampedTxtFilename(spec),
    content: body ? `${header}\r\n${body}\r\n` : `${header}\r\n[EOF — 0 matching entries]\r\n`,
    lineCount: filtered.length,
  };
}

function updateTabCounts(root: HTMLDivElement): void {
  const counts: Record<SystemLogFileId, number> = {
    ALL: entries.length,
    BOOT: 0,
    APPS: 0,
    VFS: 0,
    HW: 0,
  };
  for (const e of entries) {
    counts[e.stream] += 1;
  }
  root.querySelectorAll<HTMLButtonElement>('.syslogs-file-tab').forEach((btn) => {
    const id = (btn.dataset.logFile as SystemLogFileId) || 'ALL';
    const spec = SYSTEM_LOG_FILES[id];
    const countSpan = btn.querySelector<HTMLElement>('.syslogs-tab-count');
    if (countSpan) {
      countSpan.textContent = `(${counts[id]})`;
    } else if (spec) {
      btn.textContent = `${spec.tabLabel} (${counts[id]})`;
    }
    const isActive = id === viewState.activeFile;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function syncToolbarControls(root: HTMLDivElement): void {
  const shell = root.querySelector<HTMLElement>('#syslogs-viewport-shell');
  if (shell) {
    shell.dataset.theme = viewState.theme;
    shell.classList.toggle('syslogs-wrap-on', viewState.wordWrap);
  }

  root.querySelectorAll<HTMLButtonElement>('.syslogs-theme-btn').forEach((btn) => {
    const isSel = btn.dataset.logTheme === viewState.theme;
    btn.classList.toggle('active', isSel);
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
  });

  const followBtn = root.querySelector<HTMLButtonElement>('#syslogs-follow-btn');
  if (followBtn) {
    followBtn.textContent = viewState.followTail ? 'Follow: On' : 'Paused';
    followBtn.classList.toggle('active', viewState.followTail);
    followBtn.setAttribute('aria-pressed', viewState.followTail ? 'true' : 'false');
  }

  const wrapBtn = root.querySelector<HTMLButtonElement>('#syslogs-wrap-btn');
  if (wrapBtn) {
    wrapBtn.textContent = viewState.wordWrap ? 'Wrap: On' : 'Wrap: Off';
    wrapBtn.classList.toggle('active', viewState.wordWrap);
    wrapBtn.setAttribute('aria-pressed', viewState.wordWrap ? 'true' : 'false');
  }

  const levelSel = root.querySelector<HTMLSelectElement>('#syslogs-level-select');
  if (levelSel && levelSel.value !== viewState.levelFilter) {
    levelSel.value = viewState.levelFilter;
  }

  const pausedBar = root.querySelector<HTMLElement>('#syslogs-paused-bar');
  const pausedCountEl = root.querySelector<HTMLElement>('#syslogs-paused-count');
  if (pausedBar && pausedCountEl) {
    if (!viewState.followTail && viewState.unreadWhilePaused > 0) {
      pausedCountEl.textContent = `+${viewState.unreadWhilePaused} new line${viewState.unreadWhilePaused === 1 ? '' : 's'} buffered`;
      pausedBar.style.display = 'flex';
    } else {
      pausedBar.style.display = 'none';
    }
  }
}

export function renderSystemLogsUI(isLiveAppend = false): void {
  if (!initializedWindowEl) return;
  const root = initializedWindowEl;
  const spec = SYSTEM_LOG_FILES[viewState.activeFile];
  const filtered = getFilteredEntries();

  updateTabCounts(root);
  syncToolbarControls(root);

  const titleEl = root.querySelector<HTMLElement>('#syslogs-window-title');
  if (titleEl) {
    titleEl.textContent = `System Logs — ${spec.fileName} (${spec.dosPath})`;
  }

  const headerEl = root.querySelector<HTMLElement>('#syslogs-file-header');
  if (headerEl) {
    headerEl.textContent = buildRetroFileHeader(spec, filtered.length);
  }

  const linesEl = root.querySelector<HTMLElement>('#syslogs-lines');
  const scrollContainer = root.querySelector<HTMLElement>('#syslogs-scroll-area');
  if (linesEl) {
    if (filtered.length === 0) {
      linesEl.innerHTML = `<div class="syslogs-empty-state">
        <div class="syslogs-empty-title">No matching log lines in ${escapeHtml(spec.fileName)}</div>
        <div class="syslogs-empty-sub">Adjust your search query or severity filter to view captured OS events.</div>
        <button type="button" class="win95-btn" id="syslogs-reset-filters-btn">Reset Filters</button>
      </div>`;
      linesEl.querySelector('#syslogs-reset-filters-btn')?.addEventListener('click', () => {
        logsBridge?.playClick();
        viewState.searchQuery = '';
        viewState.levelFilter = 'ALL';
        const searchInput = root.querySelector<HTMLInputElement>('#syslogs-search-input');
        if (searchInput) searchInput.value = '';
        savePrefs();
        renderSystemLogsUI(false);
      });
    } else {
      const q = viewState.searchQuery;
      const prevMax = lastRenderedMaxSeq;
      linesEl.innerHTML = filtered
        .map((entry, idx) => {
          const lineNo = String(idx + 1).padStart(4, '0');
          const isNew = isLiveAppend && entry.seq > prevMax;
          if (entry.isDivider) {
            return `<div class="syslogs-line syslogs-line-divider${isNew ? ' syslogs-line-new' : ''}">` +
              `<span class="syslogs-gutter">${lineNo}</span>` +
              `<span class="syslogs-line-text">--- ${escapeHtml(entry.message)} [${escapeHtml(entry.isoDate)} ${escapeHtml(entry.timestamp)}] ---</span>` +
              `</div>`;
          }
          const lvlToken = entry.level.padEnd(4, ' ');
          const srcToken = entry.source.slice(0, 14).padEnd(14, ' ');
          const levelClass = `syslogs-lvl-${entry.level.toLowerCase()}`;
          return `<div class="syslogs-line${isNew ? ' syslogs-line-new' : ''}" data-seq="${entry.seq}">` +
            `<span class="syslogs-gutter">${lineNo}</span>` +
            `<span class="syslogs-line-text">` +
            `<span class="syslogs-ts">[${highlightEscapedText(entry.timestamp, q)}]</span> ` +
            `<span class="syslogs-lvl ${levelClass}">[${escapeHtml(lvlToken)}]</span> ` +
            `<span class="syslogs-src">[${highlightEscapedText(srcToken, q)}]</span> ` +
            `<span class="syslogs-evid">[${highlightEscapedText(entry.eventId, q)}]</span> ` +
            `<span class="syslogs-msg">${highlightEscapedText(entry.message, q)}</span>` +
            `</span>` +
            `</div>`;
        })
        .join('');
    }
  }

  lastRenderedMaxSeq = entries.length > 0 ? entries[entries.length - 1].seq : 0;

  if (scrollContainer && viewState.followTail) {
    suppressNextScrollPause = true;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    window.requestAnimationFrame(() => {
      if (scrollContainer && viewState.followTail) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      suppressNextScrollPause = false;
    });
  }

  const statusLeft = root.querySelector<HTMLElement>('#syslogs-status-left');
  if (statusLeft) {
    const errCount = filtered.filter((x) => !x.isDivider && x.level === 'ERR').length;
    const warnCount = filtered.filter((x) => !x.isDivider && x.level === 'WARN').length;
    statusLeft.textContent = `${spec.dosPath} · ${filtered.length} / ${entries.length} lines · Warn: ${warnCount} · Err: ${errCount}`;
  }

  const statusRight = root.querySelector<HTMLElement>('#syslogs-status-right');
  if (statusRight) {
    statusRight.textContent = `${THEME_LABELS[viewState.theme]} · ${viewState.followTail ? 'Follow Tail' : 'Scroll Paused'}`;
  }
}

export function refreshSystemLogsView(): void {
  if (isComponentMounted) {
    renderSystemLogsUI(false);
  }
}

export function initSystemLogsComponent(windowElement: HTMLDivElement): void {
  initializedWindowEl = windowElement;
  if (isComponentMounted) {
    renderSystemLogsUI(false);
    return;
  }
  isComponentMounted = true;

  // File tabs
  windowElement.querySelectorAll<HTMLButtonElement>('.syslogs-file-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      logsBridge?.playClick();
      const target = (btn.dataset.logFile as SystemLogFileId) || 'ALL';
      if (target in SYSTEM_LOG_FILES) {
        viewState.activeFile = target;
        viewState.unreadWhilePaused = 0;
        savePrefs();
        renderSystemLogsUI(false);
      }
    });
  });

  // Theme switcher (Notepad White | CRT Green | Amber)
  windowElement.querySelectorAll<HTMLButtonElement>('.syslogs-theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      logsBridge?.playClick();
      const nextTheme = btn.dataset.logTheme as SystemLogTheme;
      if (nextTheme === 'notepad' || nextTheme === 'crt-green' || nextTheme === 'amber') {
        viewState.theme = nextTheme;
        savePrefs();
        renderSystemLogsUI(false);
      }
    });
  });

  // Live search
  const searchInput = windowElement.querySelector<HTMLInputElement>('#syslogs-search-input');
  searchInput?.addEventListener('input', () => {
    viewState.searchQuery = searchInput.value;
    renderSystemLogsUI(false);
  });

  // Severity filter
  const levelSelect = windowElement.querySelector<HTMLSelectElement>('#syslogs-level-select');
  levelSelect?.addEventListener('change', () => {
    const val = levelSelect.value;
    if (val === 'ALL' || val === 'INFO' || val === 'OK' || val === 'WARN' || val === 'ERR') {
      viewState.levelFilter = val;
      savePrefs();
      renderSystemLogsUI(false);
    }
  });

  // Follow tail / Pause scroll toggle
  windowElement.querySelector('#syslogs-follow-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    viewState.followTail = !viewState.followTail;
    if (viewState.followTail) {
      viewState.unreadWhilePaused = 0;
    }
    renderSystemLogsUI(false);
  });

  // Word wrap toggle
  windowElement.querySelector('#syslogs-wrap-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    viewState.wordWrap = !viewState.wordWrap;
    savePrefs();
    renderSystemLogsUI(false);
  });

  // Jump to latest button inside paused banner
  windowElement.querySelector('#syslogs-jump-bottom-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    viewState.followTail = true;
    viewState.unreadWhilePaused = 0;
    renderSystemLogsUI(false);
  });

  // Auto-pause followTail when user manually scrolls up
  const scrollArea = windowElement.querySelector<HTMLElement>('#syslogs-scroll-area');
  scrollArea?.addEventListener('scroll', () => {
    if (suppressNextScrollPause) return;
    const distanceFromBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    if (distanceFromBottom > 28 && viewState.followTail) {
      viewState.followTail = false;
      syncToolbarControls(windowElement);
      const statusRight = windowElement.querySelector<HTMLElement>('#syslogs-status-right');
      if (statusRight) {
        statusRight.textContent = `${THEME_LABELS[viewState.theme]} · Scroll Paused`;
      }
    } else if (distanceFromBottom <= 8 && !viewState.followTail) {
      viewState.followTail = true;
      viewState.unreadWhilePaused = 0;
      syncToolbarControls(windowElement);
      const statusRight = windowElement.querySelector<HTMLElement>('#syslogs-status-right');
      if (statusRight) {
        statusRight.textContent = `${THEME_LABELS[viewState.theme]} · Follow Tail`;
      }
    }
  });

  // Save active .LOG file to C:\Documents
  windowElement.querySelector('#syslogs-save-vfs-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    const { fileName, content, lineCount } = serializeActiveLogText();
    logsBridge?.addVfsFile(fileName, 'text', 'C:\\Documents', content);
    logsBridge?.refreshExplorerIfOpen();
    logsBridge?.pushToast('Log Saved to C:\\', `Saved ${fileName} (${lineCount} lines) to C:\\Documents.`, '📜');
  });

  // Export current filtered log view to a timestamped .TXT file on the user's machine
  windowElement.querySelector('#syslogs-download-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    const { fileName, content, lineCount } = serializeCurrentViewForTxtExport();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    logsBridge?.pushToast('Exported .TXT Log', `Downloaded ${fileName} (${lineCount} lines) to your device.`, '📄');
    recordSystemLog('VFS', 'SYSLOGS.EXE', `Exported ${fileName} (${lineCount} lines, ${blob.size} bytes) to local machine.`, 'OK');
  });

  // Clear log buffer
  windowElement.querySelector('#syslogs-clear-btn')?.addEventListener('click', () => {
    logsBridge?.playClick();
    entries = [];
    viewState.unreadWhilePaused = 0;
    viewState.followTail = true;
    try {
      window.localStorage.removeItem(LOG_ENTRIES_STORAGE_KEY);
    } catch {
      // ignore
    }
    recordSystemLog('BOOT', 'SYSLOGS.EXE', 'System log ring buffer cleared by operator.', 'WARN', '0x10FF');
  });

  renderSystemLogsUI(false);
}

// Expose globally for diagnostic access and legacy bridges
(window as any).__recordSystemLog = recordSystemLog;
