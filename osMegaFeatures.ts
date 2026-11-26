// ==================== ANGEL-OS MEGA FEATURE SUITE (osMegaFeatures.ts) ====================
// 100% Client-Side Classic Win95 Accessories, Arcade Games, System Utilities & Shell Goodies

import { getActivatedBiosCount, TOTAL_BIOS_FEATURES } from './osBios5000';
import {
  getLiveMicWaveform,
  initSoundStudioMicControls,
  openMediaPermissionsModal,
} from './osMediaDevices';
import {
  initSystemLogsComponent,
  logLegacyOsEvent,
  logVfsEvent,
  refreshSystemLogsView,
} from './osSystemLogs';

export interface MegaBridge {
  openApp: (appName: string, bypassPkgCheck?: boolean) => Promise<void>;
  closeApp: (appName: string) => void;
  minimizeApp: (appName: string) => void;
  bringToFront: (winEl: HTMLDivElement) => void;
  getOpenApps: () => Map<string, { windowEl: HTMLDivElement; taskbarButton?: HTMLDivElement }>;
  openAppsFocus: (appName: string) => void;
  showOsDialog: (msg: string, title?: string) => void;
  autoTileOpenWindows: () => void;
  cascadeOpenWindows: () => void;
  applyTheme: (themeName: string) => void;
  openFdiskScreen: (withGuide?: boolean) => void;
  openCmosBiosSetup: () => void;
  openOsReinstallScreen: () => void;
  openPhysicalBooterModal?: () => void;
  openLocalSignInScreen?: () => void;
  downloadBootableUsbDiskImage?: () => void;
  addVfsFile: (name: string, type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe', parent: string, content?: string) => void;
  removeVfsFile: (name: string, parent: string) => void;
  getVfsFiles: () => Array<{ name: string; type: string; parent: string; content?: string; appTarget?: string; pkgId?: string; sizeMB?: number }>;
  refreshExplorerIfOpen: () => void;
  onUserStateMutated?: () => void;
  sfx: {
    enabled: boolean;
    masterVolume: number;
    pitchMultiplier: number;
    playClick: () => void;
    playWindowOpen: () => void;
    playChordError: () => void;
    playStartupChime: () => void;
    playAimReceive: () => void;
  };
}

let megaBridge: MegaBridge | null = null;
const bootedAtMs = Date.now();

export function registerMegaBridge(bridge: MegaBridge): void {
  megaBridge = bridge;
}

// Retro synthesized tone helper for games/alarms/recorder
let sharedMegaAudioCtx: AudioContext | null = null;
function playTone(
  freq: number,
  durationSec = 0.08,
  type: OscillatorType = 'square',
  vol = 0.06,
  slideToFreq?: number,
): void {
  if (megaBridge && !megaBridge.sfx.enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedMegaAudioCtx) sharedMegaAudioCtx = new AudioCtx();
    if (sharedMegaAudioCtx.state === 'suspended') sharedMegaAudioCtx.resume().catch(() => {});
    const ctx = sharedMegaAudioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const mult = megaBridge?.sfx.pitchMultiplier ?? 1;
    const masterVol = megaBridge?.sfx.masterVolume ?? 1;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq * mult), now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideToFreq * mult), now + durationSec);
    }
    gain.gain.setValueAtTime(Math.max(0.001, vol * masterVol), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  } catch {
    // Ignore audio context errors on locked tabs
  }
}

// ==================== 1. NOTIFICATION TOASTS & NOTIFICATION CENTER ====================
interface NotifEntry {
  id: number;
  title: string;
  body: string;
  icon: string;
  time: string;
}

const notifHistory: NotifEntry[] = [];
let notifCounter = 1;

export function pushBalloonToast(title: string, body: string, icon = '🔔'): void {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  notifHistory.unshift({ id: notifCounter++, title, body, icon, time });
  if (notifHistory.length > 40) notifHistory.pop();

  const bellBadge = document.getElementById('tray-notif-count');
  if (bellBadge) {
    bellBadge.textContent = String(notifHistory.length);
    bellBadge.style.display = notifHistory.length > 0 ? 'inline-block' : 'none';
  }
  renderNotifDrawer();

  const stack = document.getElementById('os-balloon-stack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = 'os-balloon-toast';
  toast.innerHTML = `
    <div class="os-balloon-hdr">
      <span>${icon} <b>${escapeHtml(title)}</b></span>
      <button class="os-balloon-close" title="Dismiss">✕</button>
    </div>
    <div class="os-balloon-body">${escapeHtml(body)}</div>
  `;
  const removeToast = () => {
    toast.classList.add('closing');
    window.setTimeout(() => toast.remove(), 180);
  };
  toast.querySelector('.os-balloon-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeToast();
  });
  stack.appendChild(toast);
  while (stack.children.length > 4) {
    stack.firstElementChild?.remove();
  }
  window.setTimeout(removeToast, 5200);
}

function renderNotifDrawer(): void {
  const listEl = document.getElementById('notif-drawer-list');
  if (!listEl) return;
  if (notifHistory.length === 0) {
    listEl.innerHTML = '<div class="notif-empty">No system notifications yet. Open apps, win games, or bother Angel Pilot!</div>';
    return;
  }
  listEl.innerHTML = notifHistory
    .map(
      (n) => `
      <div class="notif-drawer-item">
        <div class="notif-drawer-item-top">
          <span>${n.icon} <b>${escapeHtml(n.title)}</b></span>
          <span class="tabular-nums">${n.time}</span>
        </div>
        <div class="notif-drawer-item-body">${escapeHtml(n.body)}</div>
      </div>`,
    )
    .join('');
}

// ==================== 2. ACHIEVEMENT TROPHY VAULT (TROPHIES.EXE) ====================
interface TrophyDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  points: number;
}

const TROPHY_CATALOG: TrophyDef[] = [
  { id: 'first_boot', icon: '🖥️', title: 'Plug & Pray', desc: 'Successfully booted Angel-OS 95 to the Desktop.', points: 10 },
  { id: 'angel_pilot_harass', icon: '👼', title: 'Zero Brain Cells', desc: 'Asked Angel Pilot 3 useless questions without rage-quitting.', points: 15 },
  { id: 'calc_nerd', icon: '🧮', title: 'Pentium FDIV Survivor', desc: 'Computed 10 calculations in Scientific Calculator 95.', points: 10 },
  { id: 'solitaire_deal', icon: '🃏', title: 'Green Felt Regular', desc: 'Moved 10 cards or triggered cascading cards in Solitaire 95.', points: 15 },
  { id: 'solitaire_win', icon: '👑', title: 'Bouncing Cards Royalty', desc: 'Won Klondike Solitaire or launched Cascade Celebration!', points: 30 },
  { id: 'arcade_gamer', icon: '🕹️', title: 'Quarter Muncher', desc: 'Scored 100+ points in any Arcade 95 cabinet game.', points: 20 },
  { id: 'yeti_snack', icon: '☃️', title: 'Abominable Lunch', desc: 'Outran or met the Yeti in SkiFree 95.', points: 20 },
  { id: 'wav_producer', icon: '🎚️', title: 'Sound Blaster DJ', desc: 'Recorded or exported a .WAV beat in Sound Recorder 95.', points: 20 },
  { id: 'task_killer', icon: '🔪', title: 'End Task Enforcer', desc: 'Used Task Manager 95 to inspect or end a running task.', points: 10 },
  { id: 'bsod_survivor', icon: '💀', title: 'Fatal Exception 0E', desc: 'Triggered and recovered from a classic 1995 BSOD.', points: 25 },
  { id: 'konami_legend', icon: '🎮', title: '30 Extra Lives', desc: 'Entered the secret Konami Code on the desktop!', points: 50 },
  { id: 'sticky_hoarder', icon: '📌', title: 'Neon Post-It Wall', desc: 'Pinned a custom desktop Sticky Note.', points: 10 },
  { id: 'run_poweruser', icon: '⚡', title: 'CLI Speedrunner', desc: 'Launched an app using the Win95 Run... dialog.', points: 15 },
  { id: 'clipboard_snip', icon: '📋', title: 'Ctrl+C Collector', desc: 'Saved a clip or screen snip in Clipboard Viewer.', points: 10 },
  { id: 'calendar_planner', icon: '📅', title: 'Y2K Scheduler', desc: 'Saved a schedule note or set an alarm in Calendar 95.', points: 15 },
  { id: 'recycle_cleaner', icon: '🗑️', title: 'Disk Clean Freak', desc: 'Restored or emptied items inside Recycle Bin 95.', points: 10 },
  { id: 'bios_tinkerer', icon: '⚙️', title: 'Silicon Whisperer', desc: 'Activated advanced firmware registers inside CMOS BIOS Setup.', points: 25 },
  { id: 'billy_java_10', icon: '☕', title: '10 Rounds with Billy', desc: 'Interacted 10 times with Billy AI in Old Java Creator 1995 and unlocked Ultra Trash Mode.', points: 30 },
  { id: 'gemplayer_dj_5000', icon: '🎹', title: '5,000-Track DJ', desc: 'Spun themes and random selections inside AngelPlayer Mega Jukebox.', points: 20 },
  { id: 'hockey_cards_obliterate', icon: '🏒', title: 'McGee Card Obliterator', desc: 'Obliterated a goofy non-4K hockey card in Hockey Cards 95 (McGee & Obliterate Edition).', points: 25 },
  { id: 'foreign_program_installed', icon: '🧩', title: 'Host Program Importer', desc: 'Installed a real external program (.jar, .java, .exe, .apk, or web app) into Angel Runtime Host.', points: 30 },
];

const TROPHY_LS_KEY = 'gemini95_trophies_v1';
let unlockedTrophies: Record<string, string> = {};
try {
  const raw = localStorage.getItem(TROPHY_LS_KEY);
  if (raw) unlockedTrophies = JSON.parse(raw);
} catch {
  unlockedTrophies = {};
}

export function getUnlockedTrophiesSnapshot(): string[] {
  return Object.keys(unlockedTrophies);
}

export function hydrateUnlockedTrophies(ids: string[]): void {
  unlockedTrophies = {};
  const stamp = new Date().toLocaleDateString();
  for (const id of ids || []) {
    if (typeof id === 'string' && id) unlockedTrophies[id] = stamp;
  }
  try {
    localStorage.setItem(TROPHY_LS_KEY, JSON.stringify(unlockedTrophies));
  } catch {}
  renderTrophiesUI();
}

export function unlockAchievement(id: string): void {
  if (unlockedTrophies[id]) return;
  const def = TROPHY_CATALOG.find((t) => t.id === id);
  if (!def) return;
  unlockedTrophies[id] = new Date().toLocaleString();
  try {
    localStorage.setItem(TROPHY_LS_KEY, JSON.stringify(unlockedTrophies));
  } catch {}
  playTone(587.33, 0.08, 'triangle', 0.06);
  window.setTimeout(() => playTone(880, 0.16, 'triangle', 0.07), 90);
  pushBalloonToast(`Trophy Unlocked! (+${def.points} pts)`, `${def.icon} ${def.title}: ${def.desc}`, '🏆');
  renderTrophiesUI();
  megaBridge?.onUserStateMutated?.();
}

function renderTrophiesUI(): void {
  const grid = document.getElementById('trophies-grid');
  const summary = document.getElementById('trophies-summary');
  if (!grid) return;

  const unlockedCount = TROPHY_CATALOG.filter((t) => unlockedTrophies[t.id]).length;
  const totalPts = TROPHY_CATALOG.reduce((acc, t) => acc + (unlockedTrophies[t.id] ? t.points : 0), 0);
  const maxPts = TROPHY_CATALOG.reduce((acc, t) => acc + t.points, 0);

  if (summary) {
    summary.textContent = `Unlocked: ${unlockedCount} / ${TROPHY_CATALOG.length} Trophies · Score: ${totalPts} / ${maxPts} pts (${Math.round((unlockedCount / TROPHY_CATALOG.length) * 100)}%)`;
  }

  grid.innerHTML = TROPHY_CATALOG.map((t) => {
    const unlockedAt = unlockedTrophies[t.id];
    return `
      <div class="trophy-card95 ${unlockedAt ? 'unlocked' : 'locked'}">
        <div class="trophy-icon">${unlockedAt ? t.icon : '🔒'}</div>
        <div class="trophy-info">
          <div class="trophy-title">${escapeHtml(t.title)} <span class="trophy-pts">+${t.points}</span></div>
          <div class="trophy-desc">${escapeHtml(t.desc)}</div>
          <div class="trophy-time tabular-nums">${unlockedAt ? `Unlocked: ${escapeHtml(unlockedAt)}` : 'Locked — Keep exploring Angel-OS!'}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function initTrophiesApp(windowElement: HTMLDivElement): void {
  renderTrophiesUI();
  windowElement.querySelector('#trophies-reset-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    unlockedTrophies = {};
    try {
      localStorage.removeItem(TROPHY_LS_KEY);
    } catch {}
    renderTrophiesUI();
    megaBridge?.onUserStateMutated?.();
    pushBalloonToast('Trophy Case Reset', `All ${TROPHY_CATALOG.length} Angel-OS achievements cleared.`, '🏆');
  });
}

// ==================== 3. SCIENTIFIC & PROGRAMMER CALCULATOR 95 (CALC.EXE) ====================
let calcEvalCount = 0;

export function initCalcApp(windowElement: HTMLDivElement): void {
  const display = windowElement.querySelector('#calc-display') as HTMLInputElement | null;
  const exprEl = windowElement.querySelector('#calc-expr') as HTMLDivElement | null;
  const memBadge = windowElement.querySelector('#calc-mem-badge') as HTMLSpanElement | null;
  const tapeEl = windowElement.querySelector('#calc-tape') as HTMLDivElement | null;
  const progReadout = windowElement.querySelector('#calc-prog-readout') as HTMLDivElement | null;
  const sciRow = windowElement.querySelector('#calc-sci-grid') as HTMLDivElement | null;
  if (!display) return;

  let current = '0';
  let storedValue: number | null = null;
  let pendingOp: string | null = null;
  let clearNext = false;
  let memory = 0;
  let mode: 'std' | 'sci' | 'prog' = 'sci';

  const updateDisplay = () => {
    display.value = current;
    if (memBadge) memBadge.style.visibility = memory !== 0 ? 'visible' : 'hidden';
    if (progReadout) {
      const intVal = Math.trunc(Number(current) || 0);
      progReadout.innerHTML = `
        <span>HEX: <b>${(intVal >>> 0).toString(16).toUpperCase()}</b></span>
        <span>DEC: <b>${intVal}</b></span>
        <span>OCT: <b>${(intVal >>> 0).toString(8)}</b></span>
        <span>BIN: <b>${(intVal >>> 0).toString(2).slice(-16)}</b></span>
      `;
    }
  };

  const pushTape = (line: string) => {
    if (!tapeEl) return;
    const item = document.createElement('div');
    item.className = 'calc-tape-line';
    item.textContent = line;
    item.title = 'Click to copy result';
    item.addEventListener('click', () => {
      const eqParts = line.split('=');
      if (eqParts[1]) {
        current = eqParts[1].trim();
        updateDisplay();
        captureClipboardText(current, 'CALC.EXE');
      }
    });
    tapeEl.prepend(item);
    calcEvalCount++;
    if (calcEvalCount >= 10) unlockAchievement('calc_nerd');
  };

  const applyPending = (b: number): number => {
    if (storedValue === null || !pendingOp) return b;
    switch (pendingOp) {
      case '+': return storedValue + b;
      case '-': return storedValue - b;
      case '*': return storedValue * b;
      case '/': return b === 0 ? NaN : storedValue / b;
      case '^': return Math.pow(storedValue, b);
      case 'MOD': return b === 0 ? NaN : storedValue % b;
      default: return b;
    }
  };

  const formatNum = (n: number): string => {
    if (!Number.isFinite(n)) return 'Error';
    return String(Number(n.toPrecision(12)));
  };

  const handleKey = (key: string) => {
    playTone(key === '=' ? 720 : 540, 0.03, 'square', 0.03);
    if (/^[0-9]$/.test(key)) {
      if (clearNext || current === '0' || current === 'Error') {
        current = key;
        clearNext = false;
      } else {
        current += key;
      }
    } else if (key === '.') {
      if (clearNext || current === 'Error') {
        current = '0.';
        clearNext = false;
      } else if (!current.includes('.')) {
        current += '.';
      }
    } else if (key === 'C') {
      current = '0';
      storedValue = null;
      pendingOp = null;
      clearNext = false;
      if (exprEl) exprEl.textContent = '';
    } else if (key === 'CE') {
      current = '0';
      clearNext = false;
    } else if (key === 'BACK') {
      current = current.length > 1 ? current.slice(0, -1) : '0';
    } else if (key === 'NEG') {
      current = current.startsWith('-') ? current.slice(1) : current === '0' ? '0' : '-' + current;
    } else if (['+', '-', '*', '/', '^', 'MOD'].includes(key)) {
      const val = parseFloat(current);
      if (!Number.isNaN(val)) {
        if (storedValue !== null && pendingOp && !clearNext) {
          storedValue = applyPending(val);
          current = formatNum(storedValue);
        } else {
          storedValue = val;
        }
        pendingOp = key;
        clearNext = true;
        if (exprEl) exprEl.textContent = `${formatNum(storedValue)} ${key}`;
      }
    } else if (key === '=') {
      const val = parseFloat(current);
      if (storedValue !== null && pendingOp && !Number.isNaN(val)) {
        const res = applyPending(val);
        const formatted = formatNum(res);
        pushTape(`${formatNum(storedValue)} ${pendingOp} ${formatNum(val)} = ${formatted}`);
        if (exprEl) exprEl.textContent = `${formatNum(storedValue)} ${pendingOp} ${formatNum(val)} =`;
        current = formatted;
        storedValue = null;
        pendingOp = null;
        clearNext = true;
      }
    } else if (key === 'SQRT' || key === 'SQR' || key === 'INV' || key === 'SIN' || key === 'COS' || key === 'TAN' || key === 'LN' || key === 'LOG' || key === 'FACT') {
      const val = parseFloat(current);
      if (Number.isNaN(val)) return;
      let res = val;
      if (key === 'SQRT') res = val < 0 ? NaN : Math.sqrt(val);
      if (key === 'SQR') res = val * val;
      if (key === 'INV') res = val === 0 ? NaN : 1 / val;
      if (key === 'SIN') res = Math.sin((val * Math.PI) / 180);
      if (key === 'COS') res = Math.cos((val * Math.PI) / 180);
      if (key === 'TAN') res = Math.tan((val * Math.PI) / 180);
      if (key === 'LN') res = val <= 0 ? NaN : Math.log(val);
      if (key === 'LOG') res = val <= 0 ? NaN : Math.log10(val);
      if (key === 'FACT') {
        const n = Math.min(170, Math.max(0, Math.floor(val)));
        let f = 1;
        for (let i = 2; i <= n; i++) f *= i;
        res = f;
      }
      const formatted = formatNum(res);
      pushTape(`${key.toLowerCase()}(${val}) = ${formatted}`);
      current = formatted;
      clearNext = true;
    } else if (key === 'PI') {
      current = String(Math.PI);
      clearNext = true;
    } else if (key === 'MC') {
      memory = 0;
    } else if (key === 'MR') {
      current = formatNum(memory);
      clearNext = true;
    } else if (key === 'MS') {
      memory = parseFloat(current) || 0;
    } else if (key === 'M+') {
      memory += parseFloat(current) || 0;
    }
    updateDisplay();
  };

  windowElement.querySelectorAll('.calc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = (btn as HTMLElement).dataset.key;
      if (k) handleKey(k);
    });
  });

  windowElement.querySelectorAll('.calc-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      megaBridge?.sfx.playClick();
      mode = ((btn as HTMLElement).dataset.mode as 'std' | 'sci' | 'prog') || 'sci';
      windowElement.querySelectorAll('.calc-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      if (sciRow) sciRow.style.display = mode === 'std' ? 'none' : 'grid';
      if (progReadout) progReadout.style.display = mode === 'prog' ? 'grid' : 'none';
    });
  });

  windowElement.querySelector('#calc-clear-tape')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    if (tapeEl) tapeEl.innerHTML = '';
  });

  windowElement.querySelector('#calc-copy-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    captureClipboardText(current, 'CALC.EXE');
    pushBalloonToast('Copied from CALC.EXE', `Copied "${current}" to Clipboard Viewer.`, '🧮');
  });

  windowElement.tabIndex = 0;
  windowElement.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') handleKey(e.key);
    else if (e.key === '.') handleKey('.');
    else if (['+', '-', '*', '/'].includes(e.key)) handleKey(e.key);
    else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      handleKey('=');
    } else if (e.key === 'Backspace') handleKey('BACK');
    else if (e.key === 'Escape') handleKey('C');
  });

  updateDisplay();
}

// ==================== 4. KLONDIKE SOLITAIRE 95 (SOL.EXE) ====================
interface SolCard {
  suit: '♠' | '♥' | '♦' | '♣';
  color: 'red' | 'black';
  rank: number; // 1..13
  faceUp: boolean;
}

const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function initSolitaireApp(windowElement: HTMLDivElement): void {
  const board = windowElement.querySelector('#sol-board') as HTMLDivElement | null;
  const scoreEl = windowElement.querySelector('#sol-score');
  const movesEl = windowElement.querySelector('#sol-moves');
  const timeEl = windowElement.querySelector('#sol-time');
  const drawModeBtn = windowElement.querySelector('#sol-draw-btn') as HTMLButtonElement | null;
  const cascadeCanvas = windowElement.querySelector('#sol-cascade-canvas') as HTMLCanvasElement | null;
  if (!board) return;

  let stock: SolCard[] = [];
  let waste: SolCard[] = [];
  let foundations: SolCard[][] = [[], [], [], []];
  let tableau: SolCard[][] = [[], [], [], [], [], [], []];
  let selected: { source: 'waste' | 'tableau' | 'foundation'; colIdx: number; cardIdx: number } | null = null;
  let score = 0;
  let moves = 0;
  let elapsedSec = 0;
  let drawCount: 1 | 3 = 1;
  let timerId: number | null = null;
  let cascadeRaf: number | null = null;
  const undoHistory: string[] = [];

  const stopCascade = () => {
    if (cascadeRaf) {
      cancelAnimationFrame(cascadeRaf);
      cascadeRaf = null;
    }
    if (cascadeCanvas) cascadeCanvas.style.display = 'none';
  };

  const launchCascadeCelebration = () => {
    if (!cascadeCanvas) return;
    stopCascade();
    cascadeCanvas.style.display = 'block';
    cascadeCanvas.width = board.clientWidth || 620;
    cascadeCanvas.height = board.clientHeight || 400;
    const ctx = cascadeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f5132';
    ctx.fillRect(0, 0, cascadeCanvas.width, cascadeCanvas.height);

    const suits = ['♠', '♥', '♦', '♣'];
    let cardX = cascadeCanvas.width - 90;
    let cardY = 24;
    let vx = -4.2 - Math.random() * 2.5;
    let vy = -2;
    let suitIdx = 0;
    let rank = 13;

    unlockAchievement('solitaire_win');
    playTone(523.25, 0.1, 'triangle', 0.06);
    window.setTimeout(() => playTone(659.25, 0.1, 'triangle', 0.06), 110);
    window.setTimeout(() => playTone(783.99, 0.18, 'triangle', 0.07), 220);

    const step = () => {
      vy += 0.48;
      cardX += vx;
      cardY += vy;
      if (cardY + 78 >= cascadeCanvas.height) {
        cardY = cascadeCanvas.height - 78;
        vy = -Math.abs(vy) * 0.82;
      }

      // Draw retro crisp card trail (never clears previous frame — authentic Win95 effect!)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cardX, cardY, 54, 78);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cardX, cardY, 54, 78);
      const isRed = suitIdx === 1 || suitIdx === 2;
      ctx.fillStyle = isRed ? '#dc2626' : '#111827';
      ctx.font = 'bold 14px monospace';
      const label = `${RANK_LABELS[rank]}${suits[suitIdx]}`;
      ctx.fillText(label, cardX + 5, cardY + 17);
      ctx.font = '24px serif';
      ctx.fillText(suits[suitIdx], cardX + 18, cardY + 48);

      if (cardX < -60 || cardX > cascadeCanvas.width + 60) {
        suitIdx = (suitIdx + 1) % 4;
        if (suitIdx === 0) rank = rank > 1 ? rank - 1 : 13;
        cardX = 120 + Math.random() * (cascadeCanvas.width - 200);
        cardY = 18;
        vx = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 4);
        vy = -2 - Math.random() * 2;
      }
      cascadeRaf = requestAnimationFrame(step);
    };
    cascadeRaf = requestAnimationFrame(step);
  };

  cascadeCanvas?.addEventListener('click', () => {
    stopCascade();
  });

  const saveUndo = () => {
    undoHistory.push(JSON.stringify({ stock, waste, foundations, tableau, score, moves }));
    if (undoHistory.length > 35) undoHistory.shift();
  };

  const newDeal = () => {
    stopCascade();
    const suits: Array<{ suit: '♠' | '♥' | '♦' | '♣'; color: 'red' | 'black' }> = [
      { suit: '♠', color: 'black' },
      { suit: '♥', color: 'red' },
      { suit: '♦', color: 'red' },
      { suit: '♣', color: 'black' },
    ];
    const deck: SolCard[] = [];
    for (const s of suits) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ suit: s.suit, color: s.color, rank: r, faceUp: false });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    tableau = [[], [], [], [], [], [], []];
    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const c = deck.pop()!;
        c.faceUp = row === col;
        tableau[col].push(c);
      }
    }
    stock = deck;
    waste = [];
    foundations = [[], [], [], []];
    selected = null;
    score = 0;
    moves = 0;
    elapsedSec = 0;
    undoHistory.length = 0;
    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      if (windowElement.style.display === 'none') return;
      elapsedSec++;
      if (timeEl) timeEl.textContent = `Time: ${elapsedSec}s`;
    }, 1000);
    render();
  };

  const canPlaceOnFoundation = (card: SolCard, pile: SolCard[]): boolean => {
    if (pile.length === 0) return card.rank === 1;
    const top = pile[pile.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  };

  const canPlaceOnTableau = (card: SolCard, col: SolCard[]): boolean => {
    if (col.length === 0) return card.rank === 13;
    const top = col[col.length - 1];
    return top.faceUp && top.color !== card.color && card.rank === top.rank - 1;
  };

  const checkWin = () => {
    const total = foundations.reduce((acc, f) => acc + f.length, 0);
    if (total === 52) {
      launchCascadeCelebration();
    }
  };

  const tryAutoMoveToFoundation = (card: SolCard, removeFn: () => void): boolean => {
    for (let f = 0; f < 4; f++) {
      if (canPlaceOnFoundation(card, foundations[f])) {
        saveUndo();
        removeFn();
        foundations[f].push(card);
        score += 10;
        moves++;
        if (moves >= 10) unlockAchievement('solitaire_deal');
        playTone(680, 0.07, 'triangle', 0.05);
        selected = null;
        render();
        checkWin();
        return true;
      }
    }
    return false;
  };

  const renderCardHtml = (card: SolCard, extraCls = ''): string => {
    if (!card.faceUp) {
      return `<div class="sol-card back ${extraCls}"></div>`;
    }
    const lbl = RANK_LABELS[card.rank];
    return `
      <div class="sol-card face ${card.color} ${extraCls}">
        <div class="sol-card-corner">${lbl}${card.suit}</div>
        <div class="sol-card-center">${card.suit}</div>
      </div>
    `;
  };

  const render = () => {
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (movesEl) movesEl.textContent = `Moves: ${moves}`;

    const wasteShown = waste.slice(-3);
    const foundationsHtml = foundations
      .map((pile, fIdx) => {
        const top = pile[pile.length - 1];
        const isSel = selected?.source === 'foundation' && selected.colIdx === fIdx;
        return `<div class="sol-slot sol-foundation ${isSel ? 'selected' : ''}" data-found="${fIdx}">
          ${top ? renderCardHtml(top, isSel ? 'selected' : '') : '<span class="sol-empty-glyph">A</span>'}
        </div>`;
      })
      .join('');

    const tableauHtml = tableau
      .map((col, cIdx) => {
        const cardsHtml = col
          .map((c, rIdx) => {
            const isSel = selected?.source === 'tableau' && selected.colIdx === cIdx && rIdx >= selected.cardIdx;
            const topPx = rIdx * 22;
            return `<div class="sol-tab-card-wrap" style="top:${topPx}px" data-tcol="${cIdx}" data-tidx="${rIdx}">
              ${renderCardHtml(c, isSel ? 'selected' : '')}
            </div>`;
          })
          .join('');
        return `<div class="sol-tableau-col" data-tcol-empty="${cIdx}">
          ${col.length === 0 ? '<div class="sol-slot">K</div>' : ''}
          ${cardsHtml}
        </div>`;
      })
      .join('');

    board.innerHTML = `
      <div class="sol-top-row">
        <div class="sol-stock-area">
          <div class="sol-slot sol-stock" id="sol-stock-pile" title="Click to Draw Card(s)">
            ${stock.length > 0 ? '<div class="sol-card back"></div>' : '<span class="sol-empty-glyph">↻</span>'}
          </div>
          <div class="sol-waste-fan">
            ${wasteShown
              .map((c, idx) => {
                const isTop = idx === wasteShown.length - 1;
                const isSel = isTop && selected?.source === 'waste';
                return `<div class="sol-waste-card" style="left:${idx * 18}px" data-waste-top="${isTop ? '1' : '0'}">${renderCardHtml(c, isSel ? 'selected' : '')}</div>`;
              })
              .join('')}
          </div>
        </div>
        <div class="sol-foundations-row">${foundationsHtml}</div>
      </div>
      <div class="sol-tableau-row">${tableauHtml}</div>
    `;

    // Stock click
    board.querySelector('#sol-stock-pile')?.addEventListener('click', () => {
      saveUndo();
      selected = null;
      playTone(360, 0.04, 'triangle', 0.04);
      if (stock.length > 0) {
        for (let i = 0; i < drawCount && stock.length > 0; i++) {
          const c = stock.pop()!;
          c.faceUp = true;
          waste.push(c);
        }
      } else if (waste.length > 0) {
        stock = waste.reverse().map((c) => ({ ...c, faceUp: false }));
        waste = [];
        score = Math.max(0, score - 20);
      }
      moves++;
      if (moves >= 10) unlockAchievement('solitaire_deal');
      render();
    });

    // Waste top card click / dblclick
    const topWaste = board.querySelector('[data-waste-top="1"]');
    topWaste?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (waste.length === 0) return;
      if (selected?.source === 'waste') {
        selected = null;
      } else {
        selected = { source: 'waste', colIdx: 0, cardIdx: waste.length - 1 };
      }
      playTone(480, 0.03, 'triangle', 0.03);
      render();
    });
    topWaste?.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (waste.length === 0) return;
      const card = waste[waste.length - 1];
      tryAutoMoveToFoundation(card, () => waste.pop());
    });

    // Foundations click (target placement)
    board.querySelectorAll('.sol-foundation').forEach((el) => {
      el.addEventListener('click', () => {
        const fIdx = Number((el as HTMLElement).dataset.found);
        if (!selected) return;
        let movingCard: SolCard | null = null;
        if (selected.source === 'waste' && waste.length > 0) {
          movingCard = waste[waste.length - 1];
        } else if (selected.source === 'tableau') {
          const col = tableau[selected.colIdx];
          if (selected.cardIdx === col.length - 1) movingCard = col[col.length - 1];
        }
        if (movingCard && canPlaceOnFoundation(movingCard, foundations[fIdx])) {
          saveUndo();
          if (selected.source === 'waste') {
            foundations[fIdx].push(waste.pop()!);
          } else {
            const col = tableau[selected.colIdx];
            foundations[fIdx].push(col.pop()!);
            if (col.length > 0) col[col.length - 1].faceUp = true;
          }
          score += 10;
          moves++;
          if (moves >= 10) unlockAchievement('solitaire_deal');
          playTone(700, 0.06, 'triangle', 0.05);
          selected = null;
          render();
          checkWin();
        }
      });
    });

    // Tableau card clicks & dblclicks
    board.querySelectorAll('.sol-tab-card-wrap').forEach((wrap) => {
      const cIdx = Number((wrap as HTMLElement).dataset.tcol);
      const rIdx = Number((wrap as HTMLElement).dataset.tidx);
      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        const col = tableau[cIdx];
        const card = col[rIdx];
        if (!card.faceUp) {
          if (rIdx === col.length - 1) {
            saveUndo();
            card.faceUp = true;
            score += 5;
            render();
          }
          return;
        }
        if (selected) {
          // Try moving selected onto this column
          let leadCard: SolCard | null = null;
          if (selected.source === 'waste') leadCard = waste[waste.length - 1];
          else if (selected.source === 'tableau' && selected.colIdx !== cIdx) {
            leadCard = tableau[selected.colIdx][selected.cardIdx];
          }
          if (leadCard && canPlaceOnTableau(leadCard, col)) {
            saveUndo();
            if (selected.source === 'waste') {
              col.push(waste.pop()!);
              score += 5;
            } else if (selected.source === 'tableau') {
              const srcCol = tableau[selected.colIdx];
              const chunk = srcCol.splice(selected.cardIdx);
              col.push(...chunk);
              if (srcCol.length > 0 && !srcCol[srcCol.length - 1].faceUp) {
                srcCol[srcCol.length - 1].faceUp = true;
                score += 5;
              }
            }
            moves++;
            if (moves >= 10) unlockAchievement('solitaire_deal');
            playTone(520, 0.05, 'triangle', 0.04);
            selected = null;
            render();
            return;
          }
          // Otherwise toggle selection
          if (selected.source === 'tableau' && selected.colIdx === cIdx && selected.cardIdx === rIdx) {
            selected = null;
          } else {
            selected = { source: 'tableau', colIdx: cIdx, cardIdx: rIdx };
          }
        } else {
          selected = { source: 'tableau', colIdx: cIdx, cardIdx: rIdx };
        }
        playTone(440, 0.03, 'triangle', 0.03);
        render();
      });

      wrap.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const col = tableau[cIdx];
        if (rIdx !== col.length - 1 || !col[rIdx].faceUp) return;
        tryAutoMoveToFoundation(col[rIdx], () => {
          col.pop();
          if (col.length > 0) col[col.length - 1].faceUp = true;
        });
      });
    });

    // Empty tableau column click (King placement)
    board.querySelectorAll('.sol-tableau-col').forEach((colEl) => {
      colEl.addEventListener('click', () => {
        const cIdx = Number((colEl as HTMLElement).dataset.tcolEmpty);
        if (tableau[cIdx].length > 0 || !selected) return;
        if (selected.source === 'waste' && waste.length > 0 && canPlaceOnTableau(waste[waste.length - 1], tableau[cIdx])) {
          saveUndo();
          tableau[cIdx].push(waste.pop()!);
          moves++;
          selected = null;
          render();
        } else if (selected.source === 'tableau') {
          const src = tableau[selected.colIdx];
          if (canPlaceOnTableau(src[selected.cardIdx], tableau[cIdx])) {
            saveUndo();
            const chunk = src.splice(selected.cardIdx);
            tableau[cIdx].push(...chunk);
            if (src.length > 0) src[src.length - 1].faceUp = true;
            moves++;
            selected = null;
            render();
          }
        }
      });
    });
  };

  windowElement.querySelector('#sol-new-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    newDeal();
  });

  windowElement.querySelector('#sol-undo-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    const prev = undoHistory.pop();
    if (!prev) return;
    const state = JSON.parse(prev);
    stock = state.stock;
    waste = state.waste;
    foundations = state.foundations;
    tableau = state.tableau;
    score = state.score;
    moves = state.moves;
    selected = null;
    render();
  });

  drawModeBtn?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    drawCount = drawCount === 1 ? 3 : 1;
    drawModeBtn.textContent = `Draw: ${drawCount}`;
  });

  windowElement.querySelector('#sol-auto-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    let moved = true;
    while (moved) {
      moved = false;
      if (waste.length > 0) {
        const c = waste[waste.length - 1];
        for (let f = 0; f < 4; f++) {
          if (canPlaceOnFoundation(c, foundations[f])) {
            foundations[f].push(waste.pop()!);
            score += 10;
            moves++;
            moved = true;
            break;
          }
        }
      }
      for (const col of tableau) {
        if (col.length > 0 && col[col.length - 1].faceUp) {
          const c = col[col.length - 1];
          for (let f = 0; f < 4; f++) {
            if (canPlaceOnFoundation(c, foundations[f])) {
              foundations[f].push(col.pop()!);
              if (col.length > 0) col[col.length - 1].faceUp = true;
              score += 10;
              moves++;
              moved = true;
              break;
            }
          }
        }
      }
    }
    render();
    checkWin();
  });

  windowElement.querySelector('#sol-cascade-demo-btn')?.addEventListener('click', () => {
    launchCascadeCelebration();
  });

  newDeal();
}

// ==================== 5. ARCADE 95 MULTI-GAME CABINET (ARCADE95.EXE) ====================
type ArcadeGameId = 'snake' | 'breakout' | 'tetris' | 'skifree';
const ARCADE_HS_KEY = 'gemini95_arcade_highscores_v1';
let arcadeHighScores: Record<ArcadeGameId, number> = { snake: 0, breakout: 0, tetris: 0, skifree: 0 };
try {
  const raw = localStorage.getItem(ARCADE_HS_KEY);
  if (raw) arcadeHighScores = { ...arcadeHighScores, ...JSON.parse(raw) };
} catch {}

export function initArcadeApp(windowElement: HTMLDivElement): void {
  const canvas = windowElement.querySelector('#arcade-canvas') as HTMLCanvasElement | null;
  const scoreEl = windowElement.querySelector('#arcade-score');
  const bestEl = windowElement.querySelector('#arcade-best');
  const statusEl = windowElement.querySelector('#arcade-status');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let activeGame: ArcadeGameId = 'snake';
  let score = 0;
  let running = true;
  let paused = false;
  let tickTimer: number | null = null;
  let rafId: number | null = null;

  const setScore = (val: number) => {
    score = val;
    if (scoreEl) scoreEl.textContent = `SCORE: ${score}`;
    if (score > arcadeHighScores[activeGame]) {
      arcadeHighScores[activeGame] = score;
      try {
        localStorage.setItem(ARCADE_HS_KEY, JSON.stringify(arcadeHighScores));
      } catch {}
    }
    if (bestEl) bestEl.textContent = `BEST: ${arcadeHighScores[activeGame]}`;
    if (score >= 100) unlockAchievement('arcade_gamer');
  };

  // Game states
  // 1) Snake
  let snake: Array<{ x: number; y: number }> = [];
  let snakeDir = { x: 1, y: 0 };
  let nextSnakeDir = { x: 1, y: 0 };
  let food = { x: 14, y: 10 };

  // 2) Breakout
  let padX = 190;
  let ball = { x: 230, y: 260, vx: 3.4, vy: -3.6 };
  let bricks: Array<{ x: number; y: number; w: number; h: number; color: string; alive: boolean }> = [];
  let lives = 3;

  // 3) Tetris
  const T_COLS = 10;
  const T_ROWS = 18;
  let tBoard: number[][] = [];
  const T_SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
  ];
  const T_COLORS = ['#000000', '#00ffff', '#ffff00', '#a855f7', '#f97316', '#3b82f6', '#ef4444', '#22c55e'];
  let curPiece = { shape: T_SHAPES[0], x: 3, y: 0, colorIdx: 1 };
  let dropCounter = 0;

  // 4) SkiFree
  let skierX = 230;
  let skiVx = 0;
  let skiDist = 0;
  let jumpTicks = 0;
  let yeti = { active: false, x: 230, y: -40 };
  let obstacles: Array<{ x: number; y: number; kind: 'tree' | 'rock' | 'ramp' }> = [];

  const clearLoops = () => {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const resetGame = (gameId: ArcadeGameId) => {
    clearLoops();
    activeGame = gameId;
    running = true;
    paused = false;
    setScore(0);

    if (gameId === 'snake') {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      snakeDir = { x: 1, y: 0 };
      nextSnakeDir = { x: 1, y: 0 };
      food = { x: 16, y: 10 };
      if (statusEl) statusEl.textContent = 'Use Arrow Keys / WASD or D-Pad to steer Cyber Snake!';
      tickTimer = window.setInterval(stepSnake, 105);
    } else if (gameId === 'breakout') {
      padX = 185;
      ball = { x: 230, y: 240, vx: 3.3, vy: -3.4 };
      lives = 3;
      bricks = [];
      const rowColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8'];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 8; c++) {
          bricks.push({ x: 18 + c * 54, y: 34 + r * 20, w: 48, h: 14, color: rowColors[r], alive: true });
        }
      }
      if (statusEl) statusEl.textContent = 'Move paddle with Left/Right arrows or mouse!';
      const loop = () => {
        stepBreakout();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } else if (gameId === 'tetris') {
      tBoard = Array.from({ length: T_ROWS }, () => new Array(T_COLS).fill(0));
      spawnTetrisPiece();
      if (statusEl) statusEl.textContent = 'Arrows: Move/Drop · Up/Space: Rotate!';
      tickTimer = window.setInterval(stepTetris, 65);
    } else if (gameId === 'skifree') {
      skierX = 230;
      skiVx = 0;
      skiDist = 0;
      jumpTicks = 0;
      yeti = { active: false, x: 230, y: -50 };
      obstacles = [];
      for (let i = 0; i < 14; i++) {
        obstacles.push({
          x: 20 + Math.random() * 420,
          y: 120 + Math.random() * 340,
          kind: Math.random() < 0.16 ? 'ramp' : Math.random() < 0.35 ? 'rock' : 'tree',
        });
      }
      if (statusEl) statusEl.textContent = 'Left/Right to carve, Space to jump! Beware the Yeti at 400m!';
      const loop = () => {
        stepSkiFree();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    }
  };

  // --- Snake ---
  function stepSnake() {
    if (!running || paused || windowElement.style.display === 'none') return;
    snakeDir = nextSnakeDir;
    const cols = 23;
    const rows = 17;
    const head = {
      x: (snake[0].x + snakeDir.x + cols) % cols,
      y: (snake[0].y + snakeDir.y + rows) % rows,
    };
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      running = false;
      playTone(160, 0.28, 'sawtooth', 0.08, 70);
      if (statusEl) statusEl.textContent = `GAME OVER! Final Score: ${score} — Click Restart!`;
      drawOverlay('GAME OVER', `Score: ${score}`);
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      setScore(score + 15);
      playTone(660, 0.07, 'square', 0.05, 880);
      food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    } else {
      snake.pop();
    }

    ctx!.fillStyle = '#030b14';
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    ctx!.strokeStyle = 'rgba(0, 255, 136, 0.09)';
    for (let x = 0; x < canvas!.width; x += 20) {
      ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, canvas!.height); ctx!.stroke();
    }
    for (let y = 0; y < canvas!.height; y += 20) {
      ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(canvas!.width, y); ctx!.stroke();
    }
    ctx!.fillStyle = '#ff3366';
    ctx!.fillRect(food.x * 20 + 3, food.y * 20 + 3, 14, 14);
    snake.forEach((seg, idx) => {
      ctx!.fillStyle = idx === 0 ? '#00ffff' : '#00ff66';
      ctx!.fillRect(seg.x * 20 + 1, seg.y * 20 + 1, 18, 18);
    });
  }

  // --- Breakout ---
  function stepBreakout() {
    if (!running || paused || windowElement.style.display === 'none') return;
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.x <= 6 || ball.x >= canvas!.width - 6) {
      ball.vx *= -1;
      playTone(420, 0.03, 'square', 0.03);
    }
    if (ball.y <= 6) {
      ball.vy *= -1;
      playTone(420, 0.03, 'square', 0.03);
    }
    // Paddle hit
    if (ball.y >= canvas!.height - 24 && ball.y <= canvas!.height - 12 && ball.x >= padX && ball.x <= padX + 90 && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy);
      const hitOffset = (ball.x - (padX + 45)) / 45;
      ball.vx = hitOffset * 4.5;
      playTone(540, 0.05, 'triangle', 0.05);
    }
    // Bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x >= b.x && ball.x <= b.x + b.w && ball.y >= b.y && ball.y <= b.y + b.h) {
        b.alive = false;
        ball.vy *= -1;
        setScore(score + 20);
        playTone(760, 0.05, 'square', 0.04);
        break;
      }
    }
    if (bricks.every((b) => !b.alive)) {
      running = false;
      drawOverlay('LEVEL CLEARED!', `Score: ${score}`);
      return;
    }
    if (ball.y > canvas!.height + 10) {
      lives--;
      playTone(180, 0.2, 'sawtooth', 0.07);
      if (lives <= 0) {
        running = false;
        if (statusEl) statusEl.textContent = `GAME OVER! Score: ${score}`;
        drawOverlay('GAME OVER', `Score: ${score}`);
        return;
      }
      ball = { x: padX + 45, y: 240, vx: 3.1, vy: -3.4 };
    }

    ctx!.fillStyle = '#090d1f';
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    bricks.forEach((b) => {
      if (!b.alive) return;
      ctx!.fillStyle = b.color;
      ctx!.fillRect(b.x, b.y, b.w, b.h);
      ctx!.strokeStyle = '#ffffff';
      ctx!.strokeRect(b.x, b.y, b.w, b.h);
    });
    ctx!.fillStyle = '#e2e8f0';
    ctx!.fillRect(padX, canvas!.height - 18, 90, 10);
    ctx!.fillStyle = '#ffff55';
    ctx!.beginPath();
    ctx!.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx!.fill();
    ctx!.fillStyle = '#94a3b8';
    ctx!.font = 'bold 12px monospace';
    ctx!.fillText(`LIVES: ${'♥'.repeat(lives)}`, 12, 18);
  }

  // --- Tetris ---
  function spawnTetrisPiece() {
    const idx = Math.floor(Math.random() * T_SHAPES.length);
    curPiece = { shape: T_SHAPES[idx].map((r) => [...r]), x: 3, y: 0, colorIdx: idx + 1 };
    if (collidesTetris(curPiece.shape, curPiece.x, curPiece.y)) {
      running = false;
      playTone(140, 0.3, 'sawtooth', 0.07);
      drawOverlay('STACK OVERFLOW!', `Score: ${score}`);
    }
  }

  function collidesTetris(shape: number[][], px: number, py: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = px + c;
        const ny = py + r;
        if (nx < 0 || nx >= T_COLS || ny >= T_ROWS) return true;
        if (ny >= 0 && tBoard[ny][nx] !== 0) return true;
      }
    }
    return false;
  }

  function lockTetris() {
    for (let r = 0; r < curPiece.shape.length; r++) {
      for (let c = 0; c < curPiece.shape[r].length; c++) {
        if (curPiece.shape[r][c] && curPiece.y + r >= 0) {
          tBoard[curPiece.y + r][curPiece.x + c] = curPiece.colorIdx;
        }
      }
    }
    let cleared = 0;
    for (let r = T_ROWS - 1; r >= 0; r--) {
      if (tBoard[r].every((cell) => cell !== 0)) {
        tBoard.splice(r, 1);
        tBoard.unshift(new Array(T_COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      setScore(score + cleared * cleared * 50);
      playTone(880, 0.12, 'square', 0.06);
    } else {
      setScore(score + 5);
    }
    spawnTetrisPiece();
  }

  function stepTetris() {
    if (!running || paused || windowElement.style.display === 'none') return;
    dropCounter++;
    if (dropCounter >= 7) {
      dropCounter = 0;
      if (!collidesTetris(curPiece.shape, curPiece.x, curPiece.y + 1)) {
        curPiece.y++;
      } else {
        lockTetris();
      }
    }
    drawTetris();
  }

  function drawTetris() {
    ctx!.fillStyle = '#0a0f1e';
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    const cell = 18;
    const offX = 140;
    const offY = 8;
    ctx!.strokeStyle = '#334155';
    ctx!.strokeRect(offX, offY, T_COLS * cell, T_ROWS * cell);
    for (let r = 0; r < T_ROWS; r++) {
      for (let c = 0; c < T_COLS; c++) {
        if (tBoard[r][c]) {
          ctx!.fillStyle = T_COLORS[tBoard[r][c]];
          ctx!.fillRect(offX + c * cell + 1, offY + r * cell + 1, cell - 2, cell - 2);
        }
      }
    }
    ctx!.fillStyle = T_COLORS[curPiece.colorIdx];
    for (let r = 0; r < curPiece.shape.length; r++) {
      for (let c = 0; c < curPiece.shape[r].length; c++) {
        if (curPiece.shape[r][c]) {
          ctx!.fillRect(offX + (curPiece.x + c) * cell + 1, offY + (curPiece.y + r) * cell + 1, cell - 2, cell - 2);
        }
      }
    }
  }

  // --- SkiFree 95 ---
  function stepSkiFree() {
    if (!running || paused || windowElement.style.display === 'none') return;
    skierX = Math.max(16, Math.min(canvas!.width - 16, skierX + skiVx));
    if (jumpTicks > 0) jumpTicks--;
    const speed = jumpTicks > 0 ? 4.4 : 3.2;
    skiDist += speed * 0.45;
    setScore(Math.floor(skiDist));

    obstacles.forEach((o) => {
      o.y -= speed;
      if (o.y < -20) {
        o.y = canvas!.height + 20;
        o.x = 20 + Math.random() * (canvas!.width - 40);
      }
      const dx = Math.abs(o.x - skierX);
      const dy = Math.abs(o.y - 95);
      if (dx < 14 && dy < 12) {
        if (o.kind === 'ramp') {
          jumpTicks = 32;
          setScore(score + 25);
          playTone(720, 0.09, 'triangle', 0.05, 1100);
        } else if (jumpTicks === 0) {
          running = false;
          playTone(130, 0.25, 'sawtooth', 0.08);
          drawOverlay('WIPED OUT!', `Distance: ${Math.floor(skiDist)}m`);
        }
      }
    });

    if (skiDist >= 260 && !yeti.active) {
      yeti.active = true;
      yeti.y = -20;
      yeti.x = skierX;
      unlockAchievement('yeti_snack');
      pushBalloonToast('SKIFREE ALERT!', 'The Abominable Snowman has spotted you! Press SPACE on ramps!', '☃️');
    }
    if (yeti.active) {
      yeti.y += 2.6;
      yeti.x += Math.sign(skierX - yeti.x) * 2.1;
      if (Math.abs(yeti.x - skierX) < 15 && Math.abs(yeti.y - 95) < 16) {
        running = false;
        playTone(110, 0.3, 'sawtooth', 0.09);
        drawOverlay('EATEN BY YETI!', `Made it ${Math.floor(skiDist)}m!`);
      }
      if (yeti.y > canvas!.height + 40) yeti.y = -30;
    }

    ctx!.fillStyle = '#f8fafc';
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    obstacles.forEach((o) => {
      if (o.kind === 'tree') {
        ctx!.fillStyle = '#15803d';
        ctx!.beginPath();
        ctx!.moveTo(o.x, o.y - 16);
        ctx!.lineTo(o.x - 11, o.y + 8);
        ctx!.lineTo(o.x + 11, o.y + 8);
        ctx!.fill();
        ctx!.fillStyle = '#78350f';
        ctx!.fillRect(o.x - 2, o.y + 8, 4, 5);
      } else if (o.kind === 'rock') {
        ctx!.fillStyle = '#64748b';
        ctx!.beginPath();
        ctx!.arc(o.x, o.y, 9, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        ctx!.fillStyle = '#f59e0b';
        ctx!.fillRect(o.x - 12, o.y - 4, 24, 8);
      }
    });

    // Skier
    ctx!.fillStyle = jumpTicks > 0 ? '#ec4899' : '#dc2626';
    ctx!.fillRect(skierX - 5, jumpTicks > 0 ? 82 : 90, 10, 14);
    ctx!.fillStyle = '#1e293b';
    ctx!.fillRect(skierX - 7, 103, 4, 9);
    ctx!.fillRect(skierX + 3, 103, 4, 9);

    if (yeti.active) {
      ctx!.font = '26px serif';
      ctx!.fillText('☃️', yeti.x - 12, yeti.y + 8);
    }
  }

  function drawOverlay(title: string, sub: string) {
    ctx!.fillStyle = 'rgba(0,0,0,0.72)';
    ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
    ctx!.fillStyle = '#ffff55';
    ctx!.font = 'bold 26px monospace';
    ctx!.textAlign = 'center';
    ctx!.fillText(title, canvas!.width / 2, canvas!.height / 2 - 10);
    ctx!.fillStyle = '#ffffff';
    ctx!.font = '15px monospace';
    ctx!.fillText(sub, canvas!.width / 2, canvas!.height / 2 + 20);
    ctx!.textAlign = 'start';
  }

  const handleDirection = (dir: 'left' | 'right' | 'up' | 'down' | 'action') => {
    if (!running) return;
    if (activeGame === 'snake') {
      if (dir === 'left' && snakeDir.x === 0) nextSnakeDir = { x: -1, y: 0 };
      if (dir === 'right' && snakeDir.x === 0) nextSnakeDir = { x: 1, y: 0 };
      if (dir === 'up' && snakeDir.y === 0) nextSnakeDir = { x: 0, y: -1 };
      if (dir === 'down' && snakeDir.y === 0) nextSnakeDir = { x: 0, y: 1 };
    } else if (activeGame === 'breakout') {
      if (dir === 'left') padX = Math.max(4, padX - 28);
      if (dir === 'right') padX = Math.min(canvas.width - 94, padX + 28);
    } else if (activeGame === 'tetris') {
      if (dir === 'left' && !collidesTetris(curPiece.shape, curPiece.x - 1, curPiece.y)) curPiece.x--;
      if (dir === 'right' && !collidesTetris(curPiece.shape, curPiece.x + 1, curPiece.y)) curPiece.x++;
      if (dir === 'down' && !collidesTetris(curPiece.shape, curPiece.x, curPiece.y + 1)) curPiece.y++;
      if (dir === 'up' || dir === 'action') {
        const rot = curPiece.shape[0].map((_, idx) => curPiece.shape.map((row) => row[idx]).reverse());
        if (!collidesTetris(rot, curPiece.x, curPiece.y)) curPiece.shape = rot;
      }
      drawTetris();
    } else if (activeGame === 'skifree') {
      if (dir === 'left') skiVx = -3.4;
      if (dir === 'right') skiVx = 3.4;
      if (dir === 'down') skiVx = 0;
      if ((dir === 'up' || dir === 'action') && jumpTicks === 0) {
        jumpTicks = 22;
        playTone(620, 0.08, 'triangle', 0.05, 880);
      }
    }
  };

  windowElement.tabIndex = 0;
  windowElement.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); handleDirection('left'); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); handleDirection('right'); }
    else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); handleDirection('up'); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); handleDirection('down'); }
    else if (e.key === ' ') { e.preventDefault(); handleDirection('action'); }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (activeGame !== 'breakout') return;
    const rect = canvas.getBoundingClientRect();
    padX = Math.max(4, Math.min(canvas.width - 94, e.clientX - rect.left - 45));
  });

  windowElement.querySelectorAll('.arcade-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      megaBridge?.sfx.playClick();
      windowElement.querySelectorAll('.arcade-tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const g = (btn as HTMLElement).dataset.game as ArcadeGameId;
      if (g) resetGame(g);
      windowElement.focus();
    });
  });

  windowElement.querySelectorAll('.arcade-dpad-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = (btn as HTMLElement).dataset.dir as 'left' | 'right' | 'up' | 'down' | 'action';
      if (dir) handleDirection(dir);
    });
  });

  windowElement.querySelector('#arcade-restart-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    resetGame(activeGame);
    windowElement.focus();
  });

  windowElement.querySelector('#arcade-pause-btn')?.addEventListener('click', (e) => {
    megaBridge?.sfx.playClick();
    paused = !paused;
    (e.currentTarget as HTMLButtonElement).textContent = paused ? '▶ Resume' : '⏸ Pause';
  });

  resetGame('snake');
}

// ==================== 6. SOUND RECORDER 95 & 8-BIT BEAT STUDIO (SNDREC32.EXE) ====================
export function initSoundRecorderApp(windowElement: HTMLDivElement): void {
  const scope = windowElement.querySelector('#sndrec-scope') as HTMLCanvasElement | null;
  const gridEl = windowElement.querySelector('#sndrec-seq-grid') as HTMLDivElement | null;
  const bpmInput = windowElement.querySelector('#sndrec-bpm') as HTMLInputElement | null;
  const speedSelect = windowElement.querySelector('#sndrec-speed') as HTMLSelectElement | null;
  const echoChk = windowElement.querySelector('#sndrec-echo') as HTMLInputElement | null;
  const statusEl = windowElement.querySelector('#sndrec-status');
  if (!gridEl || !scope) return;

  const TRACKS = [
    { name: 'Kick', freq: 110, type: 'sine' as OscillatorType, dur: 0.14 },
    { name: 'Snare', freq: 240, type: 'triangle' as OscillatorType, dur: 0.09 },
    { name: 'HiHat', freq: 1200, type: 'square' as OscillatorType, dur: 0.03 },
    { name: 'Lead', freq: 523.25, type: 'sawtooth' as OscillatorType, dur: 0.12 },
  ];
  const pattern: boolean[][] = [
    [true, false, false, false, true, false, false, false, true, false, false, false, true, false, true, false],
    [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true, true, true, false],
    [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, true],
  ];

  let step = 0;
  let playing = false;
  let reverseMode = false;
  let seqTimer: number | null = null;
  let lastAmp = 0.2;

  const renderGrid = () => {
    gridEl.innerHTML = TRACKS.map(
      (tr, r) => `
      <div class="sndrec-seq-row">
        <span class="sndrec-track-name">${tr.name}</span>
        ${pattern[r]
          .map(
            (on, c) =>
              `<button class="sndrec-step-btn ${on ? 'on' : ''} ${playing && c === step ? 'now' : ''}" data-r="${r}" data-c="${c}"></button>`,
          )
          .join('')}
      </div>`,
    ).join('');

    gridEl.querySelectorAll('.sndrec-step-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = Number((btn as HTMLElement).dataset.r);
        const c = Number((btn as HTMLElement).dataset.c);
        pattern[r][c] = !pattern[r][c];
        playTone(TRACKS[r].freq, 0.05, TRACKS[r].type, 0.04);
        renderGrid();
      });
    });
  };

  // Live green 1995 oscilloscope (disabled/flatlined when global mute is active)
  const sCtx = scope.getContext('2d');
  let phase = 0;
  const drawScope = () => {
    if (sCtx && windowElement.style.display !== 'none') {
      const isGloballyMuted = megaBridge ? !megaBridge.sfx.enabled : false;
      sCtx.fillStyle = isGloballyMuted ? '#100606' : '#001400';
      sCtx.fillRect(0, 0, scope.width, scope.height);
      sCtx.strokeStyle = isGloballyMuted ? 'rgba(255, 85, 85, 0.25)' : 'rgba(0, 255, 102, 0.2)';
      sCtx.beginPath();
      sCtx.moveTo(0, scope.height / 2);
      sCtx.lineTo(scope.width, scope.height / 2);
      sCtx.stroke();

      const liveMicBuf = getLiveMicWaveform();
      if (liveMicBuf) {
        sCtx.strokeStyle = '#38bdf8';
        sCtx.lineWidth = 2;
        sCtx.beginPath();
        const sliceW = scope.width / liveMicBuf.length;
        for (let i = 0; i < liveMicBuf.length; i++) {
          const v = liveMicBuf[i] / 128.0;
          const y = (v * scope.height) / 2;
          if (i === 0) sCtx.moveTo(0, y);
          else sCtx.lineTo(i * sliceW, y);
        }
        sCtx.stroke();
        sCtx.fillStyle = '#38bdf8';
        sCtx.font = 'bold 10px "IBM Plex Mono", monospace';
        sCtx.fillText('🎤 LIVE MIC INPUT', 6, 12);
      } else if (isGloballyMuted) {
        sCtx.fillStyle = '#ff6666';
        sCtx.font = 'bold 11px "IBM Plex Mono", monospace';
        sCtx.textAlign = 'center';
        sCtx.fillText('🔇 SYSTEM MUTED — OSCILLOSCOPE DISABLED', scope.width / 2, scope.height / 2 - 8);
        sCtx.textAlign = 'start';
        lastAmp = 0;
      } else {
        sCtx.strokeStyle = '#00ff66';
        sCtx.lineWidth = 2;
        sCtx.beginPath();
        for (let x = 0; x < scope.width; x++) {
          const y =
            scope.height / 2 +
            Math.sin(x * 0.06 + phase) * (lastAmp * 28) +
            Math.cos(x * 0.14 - phase * 1.4) * (lastAmp * 12);
          if (x === 0) sCtx.moveTo(x, y);
          else sCtx.lineTo(x, y);
        }
        sCtx.stroke();
        phase += playing ? 0.35 : 0.06;
        lastAmp = Math.max(0.08, lastAmp * 0.92);
      }
    }
    requestAnimationFrame(drawScope);
  };
  drawScope();

  const triggerStep = () => {
    for (let r = 0; r < TRACKS.length; r++) {
      if (pattern[r][step]) {
        const spd = parseFloat(speedSelect?.value || '1');
        const freq = TRACKS[r].freq * spd * (r === 3 ? 1 + (step % 4) * 0.15 : 1);
        playTone(freq, TRACKS[r].dur, TRACKS[r].type, 0.06, r === 0 ? 45 : undefined);
        if (echoChk?.checked) {
          window.setTimeout(() => playTone(freq, TRACKS[r].dur, TRACKS[r].type, 0.025), 110);
        }
        lastAmp = 1.0;
      }
    }
    renderGrid();
    step = reverseMode ? (step + 15) % 16 : (step + 1) % 16;
  };

  const startLoop = () => {
    if (seqTimer) clearInterval(seqTimer);
    playing = true;
    const bpm = Math.max(60, Math.min(200, Number(bpmInput?.value || 120)));
    const spd = parseFloat(speedSelect?.value || '1');
    const ms = Math.floor((60 / bpm / 4 / spd) * 1000);
    seqTimer = window.setInterval(triggerStep, ms);
    if (statusEl) statusEl.textContent = `PLAYING · ${bpm} BPM · ${reverseMode ? 'REVERSE' : 'FORWARD'}`;
  };

  const stopLoop = () => {
    playing = false;
    if (seqTimer) {
      clearInterval(seqTimer);
      seqTimer = null;
    }
    renderGrid();
    if (statusEl) statusEl.textContent = 'STOPPED · SNDREC32.EXE Ready';
  };

  windowElement.querySelector('#sndrec-play-btn')?.addEventListener('click', () => {
    if (playing) stopLoop();
    else startLoop();
  });
  windowElement.querySelector('#sndrec-stop-btn')?.addEventListener('click', stopLoop);
  windowElement.querySelector('#sndrec-reverse-btn')?.addEventListener('click', () => {
    reverseMode = !reverseMode;
    if (playing) startLoop();
  });
  bpmInput?.addEventListener('change', () => {
    if (playing) startLoop();
  });
  speedSelect?.addEventListener('change', () => {
    if (playing) startLoop();
  });

  // Sampler FX Pads
  windowElement.querySelectorAll('.sndrec-pad-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = Number((btn as HTMLElement).dataset.freq || 440);
      const slide = Number((btn as HTMLElement).dataset.slide || 0);
      const t = ((btn as HTMLElement).dataset.wave || 'square') as OscillatorType;
      playTone(f, 0.16, t, 0.08, slide || undefined);
      lastAmp = 1.0;
    });
  });

  // Export Real 16-bit PCM .WAV file!
  windowElement.querySelector('#sndrec-export-wav-btn')?.addEventListener('click', () => {
    const sampleRate = 22050;
    const bpm = Number(bpmInput?.value || 120);
    const stepSec = 60 / bpm / 4;
    const totalSec = stepSec * 16;
    const numSamples = Math.floor(sampleRate * totalSec);
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buf);
    const writeStr = (off: number, s: string) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const curStep = Math.min(15, Math.floor(t / stepSec));
      const localT = t - curStep * stepSec;
      let sample = 0;
      for (let r = 0; r < TRACKS.length; r++) {
        if (pattern[r][curStep] && localT < TRACKS[r].dur) {
          const env = 1 - localT / TRACKS[r].dur;
          const freq = TRACKS[r].freq * (r === 3 ? 1 + (curStep % 4) * 0.15 : 1);
          sample += Math.sin(2 * Math.PI * freq * localT) * env * 0.22;
        }
      }
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, Math.floor(clamped * 32767), true);
    }

    const blob = new Blob([buf], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ANGEL95_BEAT_${bpm}BPM.WAV`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    unlockAchievement('wav_producer');
    pushBalloonToast('Exported 16-Bit .WAV!', `Downloaded ANGEL95_BEAT_${bpm}BPM.WAV to your computer.`, '🎚️');
  });

  renderGrid();
  initSoundStudioMicControls(windowElement);
}

// ==================== 7. CALENDAR, ANALOG CLOCK & ALARMS 95 (CALENDAR.EXE) ====================
const CALENDAR_NOTES_KEY = 'gemini95_calendar_notes_v1';

export function initCalendarApp(windowElement: HTMLDivElement): void {
  const monthLabel = windowElement.querySelector('#cal-month-label');
  const grid = windowElement.querySelector('#cal-days-grid');
  const selectedLabel = windowElement.querySelector('#cal-selected-date-label');
  const noteInput = windowElement.querySelector('#cal-note-input') as HTMLTextAreaElement | null;
  const clockCanvas = windowElement.querySelector('#cal-analog-clock') as HTMLCanvasElement | null;
  const alarmSecInput = windowElement.querySelector('#cal-alarm-seconds') as HTMLInputElement | null;
  const alarmLabelInput = windowElement.querySelector('#cal-alarm-label') as HTMLInputElement | null;
  const alarmStatusEl = windowElement.querySelector('#cal-alarm-status');
  if (!grid) return;

  let viewDate = new Date();
  let selectedIso = new Date().toISOString().slice(0, 10);
  let notesMap: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(CALENDAR_NOTES_KEY);
    if (raw) notesMap = JSON.parse(raw);
  } catch {}

  let alarmRemaining = 0;
  let alarmTimerId: number | null = null;

  const renderCalendar = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    if (monthLabel) {
      monthLabel.textContent = viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }
    const headers = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
      .map((d) => `<div class="cal-cell hdr">${d}</div>`)
      .join('');
    let cells = headers;
    for (let i = 0; i < firstDay; i++) cells += '<div class="cal-cell empty"></div>';
    const todayIso = new Date().toISOString().slice(0, 10);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasNote = Boolean(notesMap[iso]?.trim());
      cells += `<button class="cal-cell day ${iso === selectedIso ? 'selected' : ''} ${iso === todayIso ? 'today' : ''} ${hasNote ? 'has-note' : ''}" data-iso="${iso}">${d}</button>`;
    }
    grid.innerHTML = cells;
    grid.querySelectorAll('.cal-cell.day').forEach((btn) => {
      btn.addEventListener('click', () => {
        megaBridge?.sfx.playClick();
        selectedIso = (btn as HTMLElement).dataset.iso || selectedIso;
        renderCalendar();
      });
    });
    if (selectedLabel) selectedLabel.textContent = `Schedule for ${selectedIso}:`;
    if (noteInput) noteInput.value = notesMap[selectedIso] || '';
  };

  windowElement.querySelector('#cal-prev-month')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  windowElement.querySelector('#cal-next-month')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  windowElement.querySelector('#cal-save-note-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    if (noteInput) {
      notesMap[selectedIso] = noteInput.value;
      try {
        localStorage.setItem(CALENDAR_NOTES_KEY, JSON.stringify(notesMap));
      } catch {}
      renderCalendar();
      unlockAchievement('calendar_planner');
      pushBalloonToast('Calendar Note Saved', `Saved agenda for ${selectedIso}.`, '📅');
    }
  });

  windowElement.querySelector('#cal-alarm-start-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    if (alarmTimerId) clearInterval(alarmTimerId);
    alarmRemaining = Math.max(1, Number(alarmSecInput?.value || 10));
    const msg = alarmLabelInput?.value.trim() || 'Time is up!';
    unlockAchievement('calendar_planner');
    if (alarmStatusEl) alarmStatusEl.textContent = `⏱️ Ringing in ${alarmRemaining}s...`;
    alarmTimerId = window.setInterval(() => {
      alarmRemaining--;
      if (alarmRemaining > 0) {
        if (alarmStatusEl) alarmStatusEl.textContent = `⏱️ Ringing in ${alarmRemaining}s...`;
      } else {
        clearInterval(alarmTimerId!);
        alarmTimerId = null;
        if (alarmStatusEl) alarmStatusEl.textContent = `🔔 ALARM: ${msg}`;
        megaBridge?.sfx.playStartupChime();
        pushBalloonToast('Alarm 95 Ringing!', msg, '⏰');
      }
    }, 1000);
  });

  // Live Analog Win95 Wall Clock
  if (clockCanvas) {
    const cCtx = clockCanvas.getContext('2d');
    const drawClock = () => {
      if (cCtx && windowElement.style.display !== 'none') {
        const w = clockCanvas.width;
        const h = clockCanvas.height;
        const r = Math.min(w, h) / 2 - 6;
        cCtx.clearRect(0, 0, w, h);
        cCtx.save();
        cCtx.translate(w / 2, h / 2);
        cCtx.fillStyle = '#c0c0c0';
        cCtx.beginPath(); cCtx.arc(0, 0, r, 0, Math.PI * 2); cCtx.fill();
        cCtx.strokeStyle = '#000080';
        cCtx.lineWidth = 2;
        cCtx.stroke();
        for (let i = 0; i < 12; i++) {
          const ang = (i * Math.PI) / 6;
          cCtx.fillStyle = '#008080';
          cCtx.fillRect(Math.sin(ang) * (r - 8) - 2, -Math.cos(ang) * (r - 8) - 2, 4, 4);
        }
        const now = new Date();
        const sec = now.getSeconds();
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;
        const drawHand = (ang: number, len: number, width: number, col: string) => {
          cCtx.beginPath();
          cCtx.lineWidth = width;
          cCtx.strokeStyle = col;
          cCtx.moveTo(0, 0);
          cCtx.lineTo(Math.sin(ang) * len, -Math.cos(ang) * len);
          cCtx.stroke();
        };
        drawHand((hr * Math.PI) / 6, r * 0.52, 3, '#000000');
        drawHand((min * Math.PI) / 30, r * 0.72, 2, '#000080');
        drawHand((sec * Math.PI) / 30, r * 0.82, 1, '#dc2626');
        cCtx.restore();
      }
      window.setTimeout(drawClock, 500);
    };
    drawClock();
  }

  renderCalendar();
}

// ==================== 8. WINDOWS 95 TASK MANAGER (TASKMGR.EXE) ====================
const SYSTEM_PROCESSES = [
  { pid: 4, name: 'KERNEL32.DLL', mem: '4,120 K', desc: 'Win32 Base Kernel Core', protected: true },
  { pid: 108, name: 'EXPLORER.EXE', mem: '6,840 K', desc: 'Windows 95 Desktop Shell', protected: true },
  { pid: 214, name: 'ANGEL.SYS', mem: '8,210 K', desc: 'Angel OS Neural Co-Processor', protected: false },
  { pid: 333, name: 'ANGEL_PILOT.EXE', mem: '0,004 K', desc: 'In-Training Slacker Copilot (0% AI)', protected: false },
  { pid: 440, name: 'SB16_DSP.VXD', mem: '1,280 K', desc: 'Sound Blaster 16 Audio Synth', protected: false },
];

export function initTaskManagerApp(windowElement: HTMLDivElement): void {
  const appsBody = windowElement.querySelector('#taskmgr-apps-tbody');
  const procsBody = windowElement.querySelector('#taskmgr-procs-tbody');
  const perfCanvas = windowElement.querySelector('#taskmgr-perf-canvas') as HTMLCanvasElement | null;
  const statsLine = windowElement.querySelector('#taskmgr-stats-line');
  const cpuHistory: number[] = new Array(36).fill(18);

  const refreshTaskMgr = () => {
    if (!megaBridge) return;
    const appsMap = megaBridge.getOpenApps();
    if (appsBody) {
      if (appsMap.size === 0) {
        appsBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#555;">No open application windows.</td></tr>';
      } else {
        appsBody.innerHTML = Array.from(appsMap.entries())
          .map(([id, data]) => {
            const title = data.windowEl.querySelector('.window-title')?.textContent || id;
            const visible = data.windowEl.style.display !== 'none';
            return `<tr>
              <td><b>${escapeHtml(title)}</b></td>
              <td>${visible ? 'Running' : 'Minimized'}</td>
              <td class="tabular-nums">${18 + ((id.length * 7) % 24)} MB</td>
              <td>
                <button class="win95-btn taskmgr-switch" data-app="${escapeHtml(id)}">Switch To</button>
                <button class="win95-btn taskmgr-end" data-app="${escapeHtml(id)}" style="color:#800000">End Task</button>
              </td>
            </tr>`;
          })
          .join('');

        appsBody.querySelectorAll('.taskmgr-switch').forEach((btn) => {
          btn.addEventListener('click', () => {
            const appId = (btn as HTMLElement).dataset.app;
            if (appId) megaBridge?.openAppsFocus(appId);
          });
        });
        appsBody.querySelectorAll('.taskmgr-end').forEach((btn) => {
          btn.addEventListener('click', () => {
            const appId = (btn as HTMLElement).dataset.app;
            if (appId) {
              megaBridge?.closeApp(appId);
              unlockAchievement('task_killer');
              refreshTaskMgr();
            }
          });
        });
      }
    }

    if (procsBody) {
      const openRows = Array.from(appsMap.keys()).map((id, i) => ({
        pid: 600 + i * 24,
        name: `${id.toUpperCase()}.EXE`,
        mem: `${3200 + i * 850} K`,
        desc: 'User Application Process',
        appId: id,
        protected: false,
      }));
      const allProcs = [...SYSTEM_PROCESSES.map((p) => ({ ...p, appId: '' })), ...openRows];
      procsBody.innerHTML = allProcs
        .map(
          (p) => `<tr>
          <td class="tabular-nums">${p.pid}</td>
          <td><b>${escapeHtml(p.name)}</b></td>
          <td class="tabular-nums">${p.mem}</td>
          <td>${escapeHtml(p.desc)}</td>
          <td><button class="win95-btn taskmgr-kill-proc" data-pname="${escapeHtml(p.name)}" data-app="${escapeHtml(p.appId)}">End Process</button></td>
        </tr>`,
        )
        .join('');

      procsBody.querySelectorAll('.taskmgr-kill-proc').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pname = (btn as HTMLElement).dataset.pname || '';
          const appId = (btn as HTMLElement).dataset.app || '';
          unlockAchievement('task_killer');
          if (pname === 'ANGEL_PILOT.EXE') {
            pushBalloonToast('Angel Pilot Refuses to Die', 'Angel Pilot: "Nice try! I have 0 processes running anyway because I do zero work."', '👼');
            return;
          }
          if (pname === 'KERNEL32.DLL') {
            triggerBsodPrank('Terminated critical Win32 KERNEL32.DLL via Task Manager!');
            return;
          }
          if (appId) {
            megaBridge?.closeApp(appId);
            refreshTaskMgr();
          } else {
            pushBalloonToast('Process Restarted', `${pname} automatically respawned by ANGEL.SYS watchdog.`, '⚙️');
          }
        });
      });
    }

    const upSec = Math.floor((Date.now() - bootedAtMs) / 1000);
    if (statsLine) {
      statsLine.textContent = `Open Tasks: ${appsMap.size} · Processes: ${SYSTEM_PROCESSES.length + appsMap.size} · Uptime: ${upSec}s`;
    }
  };

  windowElement.querySelectorAll('.taskmgr-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      megaBridge?.sfx.playClick();
      const tab = (btn as HTMLElement).dataset.tab;
      windowElement.querySelectorAll('.taskmgr-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      windowElement.querySelectorAll('.taskmgr-pane').forEach((p) => {
        (p as HTMLElement).style.display = (p as HTMLElement).dataset.pane === tab ? 'flex' : 'none';
      });
    });
  });

  windowElement.querySelector('#taskmgr-new-task-btn')?.addEventListener('click', () => openRunDialog());
  windowElement.querySelector('#taskmgr-refresh-btn')?.addEventListener('click', refreshTaskMgr);

  window.setInterval(() => {
    if (windowElement.style.display === 'none') return;
    const appsCount = megaBridge?.getOpenApps().size || 1;
    const nextCpu = Math.min(98, Math.max(6, Math.round(10 + appsCount * 6 + Math.random() * 14)));
    cpuHistory.push(nextCpu);
    if (cpuHistory.length > 36) cpuHistory.shift();
    if (perfCanvas) {
      const pCtx = perfCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = '#000000';
        pCtx.fillRect(0, 0, perfCanvas.width, perfCanvas.height);
        pCtx.strokeStyle = '#004400';
        for (let y = 0; y < perfCanvas.height; y += 20) {
          pCtx.beginPath(); pCtx.moveTo(0, y); pCtx.lineTo(perfCanvas.width, y); pCtx.stroke();
        }
        pCtx.strokeStyle = '#00ff66';
        pCtx.lineWidth = 2;
        pCtx.beginPath();
        cpuHistory.forEach((v, idx) => {
          const x = (idx / (cpuHistory.length - 1)) * perfCanvas.width;
          const y = perfCanvas.height - (v / 100) * perfCanvas.height;
          if (idx === 0) pCtx.moveTo(x, y);
          else pCtx.lineTo(x, y);
        });
        pCtx.stroke();
      }
    }
    refreshTaskMgr();
  }, 1100);

  refreshTaskMgr();
}

// ==================== 9. RECYCLE BIN 95 (RECYCLE.EXE) ====================
export interface TrashItem {
  id: string;
  name: string;
  originalParent: string;
  type: 'text' | 'image' | 'app' | 'installer_exe';
  content?: string;
  deletedAt: string;
}

const recycleBinItems: TrashItem[] = [
  {
    id: 'seed_1',
    name: 'CLIPPY_APOLOGY_DRAFT.TXT',
    originalParent: 'C:\\Documents',
    type: 'text',
    content: 'Dear User, I apologize for interrupting your Paint session. Sincerely, Angel Pilot.',
    deletedAt: 'Yesterday 4:20 PM',
  },
  {
    id: 'seed_2',
    name: 'INTERNET_EXPLORER_INSTALLER_OLD.TMP',
    originalParent: 'C:\\Downloads',
    type: 'text',
    content: 'Temporary setup cabinet left over from 1995.',
    deletedAt: 'Today 9:15 AM',
  },
];

export function sendToRecycleBin(item: Omit<TrashItem, 'id' | 'deletedAt'>): void {
  recycleBinItems.unshift({
    ...item,
    id: `trash_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    deletedAt: new Date().toLocaleTimeString(),
  });
  renderRecycleBinUI();
  pushBalloonToast('Moved to Recycle Bin', `${item.name} moved from ${item.originalParent}`, '🗑️');
}

function renderRecycleBinUI(): void {
  const listEl = document.getElementById('recycle-list-tbody');
  const statusEl = document.getElementById('recycle-status-line');
  if (!listEl) return;
  if (statusEl) statusEl.textContent = `${recycleBinItems.length} deleted object(s) in Recycle Bin`;
  if (recycleBinItems.length === 0) {
    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#555;padding:18px;">✨ Recycle Bin is squeaky clean!</td></tr>';
    return;
  }
  listEl.innerHTML = recycleBinItems
    .map(
      (item) => `<tr>
      <td><b>${escapeHtml(item.name)}</b></td>
      <td>${escapeHtml(item.originalParent)}</td>
      <td class="tabular-nums">${escapeHtml(item.deletedAt)}</td>
      <td><button class="win95-btn recycle-restore-one" data-tid="${item.id}">♻️ Restore</button></td>
    </tr>`,
    )
    .join('');

  listEl.querySelectorAll('.recycle-restore-one').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tid = (btn as HTMLElement).dataset.tid;
      const idx = recycleBinItems.findIndex((i) => i.id === tid);
      if (idx !== -1) {
        const [item] = recycleBinItems.splice(idx, 1);
        megaBridge?.addVfsFile(item.name, item.type, item.originalParent, item.content);
        logVfsEvent('RESTORE', `${item.originalParent}\\${item.name}`, 'Restored from C:\\RECYCLED', 'OK');
        megaBridge?.refreshExplorerIfOpen();
        unlockAchievement('recycle_cleaner');
        renderRecycleBinUI();
        pushBalloonToast('File Restored!', `${item.name} restored to ${item.originalParent}.`, '♻️');
      }
    });
  });
}

export function initRecycleBinApp(windowElement: HTMLDivElement): void {
  renderRecycleBinUI();
  windowElement.querySelector('#recycle-empty-btn')?.addEventListener('click', () => {
    if (recycleBinItems.length === 0) return;
    const count = recycleBinItems.length;
    playTone(180, 0.08, 'sawtooth', 0.05, 90);
    recycleBinItems.length = 0;
    logVfsEvent('DELETE', 'C:\\RECYCLED\\*', `Permanently shredded ${count} deleted object(s)`, 'WARN');
    renderRecycleBinUI();
    unlockAchievement('recycle_cleaner');
    pushBalloonToast('Recycle Bin Emptied', 'All deleted files permanently shredded!', '🗑️');
  });

  windowElement.querySelector('#recycle-restore-all-btn')?.addEventListener('click', () => {
    if (recycleBinItems.length === 0) return;
    const count = recycleBinItems.length;
    while (recycleBinItems.length > 0) {
      const item = recycleBinItems.pop()!;
      megaBridge?.addVfsFile(item.name, item.type, item.originalParent, item.content);
    }
    logVfsEvent('RESTORE', 'C:\\RECYCLED\\*', `Restored all ${count} item(s) to original directories`, 'OK');
    megaBridge?.refreshExplorerIfOpen();
    renderRecycleBinUI();
    unlockAchievement('recycle_cleaner');
    pushBalloonToast('All Items Restored', 'Every item returned to My AngelTop C:\\!', '♻️');
  });
}

// ==================== 10. CLIPBOARD VIEWER & SNIPPING STUDIO 95 (CLIPBRD.EXE) ====================
const clipboardHistory: Array<{ text: string; source: string; time: string }> = [
  { text: 'PROMPT $P$G — Welcome to Angel-OS Clipboard Viewer!', source: 'SYSTEM95', time: 'Boot' },
];

export function captureClipboardText(text: string, source = 'OS'): void {
  if (!text.trim()) return;
  clipboardHistory.unshift({ text, source, time: new Date().toLocaleTimeString() });
  if (clipboardHistory.length > 25) clipboardHistory.pop();
  try {
    navigator.clipboard?.writeText(text).catch(() => {});
  } catch {}
  renderClipboardViewerUI();
}

function renderClipboardViewerUI(): void {
  const listEl = document.getElementById('clip-history-list');
  if (!listEl) return;
  listEl.innerHTML = clipboardHistory
    .map(
      (c, idx) => `
      <div class="clip-item95">
        <div class="clip-item-meta"><span><b>${escapeHtml(c.source)}</b></span><span class="tabular-nums">${escapeHtml(c.time)}</span></div>
        <pre class="clip-item-text">${escapeHtml(c.text.slice(0, 220))}</pre>
        <div class="clip-item-actions">
          <button class="win95-btn clip-copy-idx" data-idx="${idx}">📋 Copy Again</button>
          <button class="win95-btn clip-save-note" data-idx="${idx}">📝 Save to C:\\Documents</button>
        </div>
      </div>`,
    )
    .join('');

  listEl.querySelectorAll('.clip-copy-idx').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number((b as HTMLElement).dataset.idx);
      const item = clipboardHistory[idx];
      if (item) {
        try { navigator.clipboard?.writeText(item.text).catch(() => {}); } catch {}
        playTone(620, 0.05, 'triangle', 0.04);
      }
    });
  });

  listEl.querySelectorAll('.clip-save-note').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number((b as HTMLElement).dataset.idx);
      const item = clipboardHistory[idx];
      if (item) {
        const fname = `CLIP_${Math.floor(100 + Math.random() * 900)}.TXT`;
        megaBridge?.addVfsFile(fname, 'text', 'C:\\Documents', item.text);
        megaBridge?.refreshExplorerIfOpen();
        unlockAchievement('clipboard_snip');
        pushBalloonToast('Saved Clip to C:\\Documents', `Created ${fname}`, '💾');
      }
    });
  });
}

export function initClipViewerApp(windowElement: HTMLDivElement): void {
  renderClipboardViewerUI();
  windowElement.querySelector('#clip-add-btn')?.addEventListener('click', () => {
    const inp = windowElement.querySelector('#clip-manual-input') as HTMLInputElement | null;
    if (inp && inp.value.trim()) {
      captureClipboardText(inp.value.trim(), 'Manual Entry');
      inp.value = '';
      unlockAchievement('clipboard_snip');
    }
  });

  windowElement.querySelector('#clip-snip-paint-btn')?.addEventListener('click', () => {
    const paintCanvas = document.getElementById('paint-canvas') as HTMLCanvasElement | null;
    if (!paintCanvas || paintCanvas.width < 10) {
      pushBalloonToast('AngelPaint Not Ready', 'Open AngelPaint Studio first so Snipping Tool can capture its canvas!', '✂️');
      return;
    }
    const dataUrl = paintCanvas.toDataURL('image/png');
    const fname = `SNIP_${Math.floor(100 + Math.random() * 900)}.PNG`;
    megaBridge?.addVfsFile(fname, 'image', 'C:\\Pictures', dataUrl);
    megaBridge?.refreshExplorerIfOpen();
    unlockAchievement('clipboard_snip');
    pushBalloonToast('Screen Snip Captured!', `Saved ${fname} into C:\\Pictures!`, '✂️');
  });

  windowElement.querySelector('#clip-clear-btn')?.addEventListener('click', () => {
    clipboardHistory.length = 0;
    renderClipboardViewerUI();
  });
}

// ==================== 11. MULTI-STICKY NOTES MANAGER ====================
interface StickyData {
  id: string;
  text: string;
  color: 'yellow' | 'cyan' | 'pink' | 'lime';
  x: number;
  y: number;
}
const STICKIES_LS_KEY = 'gemini95_custom_stickies_v1';
let customStickies: StickyData[] = [];
try {
  const raw = localStorage.getItem(STICKIES_LS_KEY);
  if (raw) customStickies = JSON.parse(raw);
} catch {
  customStickies = [];
}

export function getCustomStickiesSnapshot(): StickyData[] {
  return customStickies.map((s) => ({ ...s }));
}

export function hydrateCustomStickies(list: StickyData[]): void {
  customStickies = Array.isArray(list) ? list.map((s) => ({ ...s })) : [];
  try {
    localStorage.setItem(STICKIES_LS_KEY, JSON.stringify(customStickies));
  } catch {}
  renderAllCustomStickies();
}

function saveStickies() {
  try {
    localStorage.setItem(STICKIES_LS_KEY, JSON.stringify(customStickies));
  } catch {}
  megaBridge?.onUserStateMutated?.();
}

export function spawnCustomStickyNote(initialText = 'New 1995 Reminder:\nFeed Tamagotchi & back up floppies!'): void {
  const colors: Array<'yellow' | 'cyan' | 'pink' | 'lime'> = ['yellow', 'cyan', 'pink', 'lime'];
  const note: StickyData = {
    id: `stk_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    text: initialText,
    color: colors[customStickies.length % colors.length],
    x: Math.min(window.innerWidth - 240, 260 + (customStickies.length % 5) * 34),
    y: Math.min(window.innerHeight - 220, 80 + (customStickies.length % 5) * 34),
  };
  customStickies.push(note);
  saveStickies();
  renderAllCustomStickies();
  unlockAchievement('sticky_hoarder');
}

function renderAllCustomStickies(): void {
  const layer = document.getElementById('desktop-stickies-layer');
  if (!layer) return;
  layer.innerHTML = '';

  customStickies.forEach((stk) => {
    const el = document.createElement('div');
    el.className = `custom-sticky-note color-${stk.color}`;
    el.style.left = `${stk.x}px`;
    el.style.top = `${stk.y}px`;
    el.innerHTML = `
      <div class="custom-sticky-hdr">
        <span>📌 Sticky</span>
        <div class="custom-sticky-btns">
          <button class="stk-color-btn" title="Cycle Color">🎨</button>
          <button class="stk-del-btn" title="Delete Sticky">✕</button>
        </div>
      </div>
      <textarea class="custom-sticky-text">${escapeHtml(stk.text)}</textarea>
    `;

    const hdr = el.querySelector('.custom-sticky-hdr') as HTMLDivElement;
    const ta = el.querySelector('.custom-sticky-text') as HTMLTextAreaElement;
    ta.addEventListener('input', () => {
      stk.text = ta.value;
      saveStickies();
    });

    el.querySelector('.stk-color-btn')?.addEventListener('click', () => {
      const order: Array<'yellow' | 'cyan' | 'pink' | 'lime'> = ['yellow', 'cyan', 'pink', 'lime'];
      stk.color = order[(order.indexOf(stk.color) + 1) % order.length];
      saveStickies();
      renderAllCustomStickies();
    });

    el.querySelector('.stk-del-btn')?.addEventListener('click', () => {
      customStickies = customStickies.filter((s) => s.id !== stk.id);
      saveStickies();
      renderAllCustomStickies();
    });

    let dragging = false;
    let ox = 0;
    let oy = 0;
    hdr.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      dragging = true;
      ox = e.clientX - stk.x;
      oy = e.clientY - stk.y;
      const onMove = (me: MouseEvent) => {
        if (!dragging) return;
        stk.x = Math.max(0, Math.min(window.innerWidth - 200, me.clientX - ox));
        stk.y = Math.max(0, Math.min(window.innerHeight - 160, me.clientY - oy));
        el.style.left = `${stk.x}px`;
        el.style.top = `${stk.y}px`;
      };
      const onUp = () => {
        dragging = false;
        saveStickies();
        document.removeEventListener('mousemove', onMove);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, { once: true });
    });

    layer.appendChild(el);
  });
}

// ==================== 12. RUN DIALOG, BSOD PRANK, WINVER & HOTKEYS ====================
export function openRunDialog(): void {
  const modal = document.getElementById('run-dialog-modal');
  const inp = document.getElementById('run-dialog-input') as HTMLInputElement | null;
  if (!modal) return;
  modal.style.display = 'flex';
  if (inp) {
    inp.focus();
    inp.select();
  }
}

export function executeRunCommand(raw: string): boolean {
  const cmd = raw.trim().toLowerCase().replace(/\.exe$/, '');
  if (!cmd) return false;
  unlockAchievement('run_poweruser');
  logOsEvent('APP', 'RUN.DLL', `User executed Run command: "${raw}"`, 'INFO');
  const map: Record<string, string> = {
    calc: 'calcApp',
    sol: 'solitaireApp',
    solitaire: 'solitaireApp',
    arcade: 'arcadeApp',
    arcade95: 'arcadeApp',
    snake: 'arcadeApp',
    tetris: 'arcadeApp',
    skifree: 'arcadeApp',
    sndrec32: 'soundRecorder',
    sound: 'soundRecorder',
    calendar: 'calendarApp',
    clock: 'calendarApp',
    taskmgr: 'taskManager',
    recycle: 'recycleBin',
    trophies: 'trophiesApp',
    clipbrd: 'clipViewer',
    eventvwr: 'sysLogsApp',
    logs: 'sysLogsApp',
    syslogs: 'sysLogsApp',
    bootlog: 'sysLogsApp',
    vfslog: 'sysLogsApp',
    notepad: 'notepad',
    angelnotes: 'notepad',
    gemnotes: 'notepad',
    paint: 'paint',
    mspaint: 'paint',
    angelpaint: 'paint',
    gempaint: 'paint',
    cmd: 'dosPrompt',
    dos: 'dosPrompt',
    command: 'dosPrompt',
    explorer: 'myComputer',
    regedit: 'regedit',
    control: 'controlPanel',
    settings: 'controlPanel',
    sysmon: 'sysMonitor',
    perf: 'perfAdjust',
    perflevels: 'perfAdjust',
    ram: 'perfAdjust',
    fans: 'perfAdjust',
    temps: 'perfAdjust',
    minesweeper: 'minesweeper',
    winmine: 'minesweeper',
    angelsweeper: 'minesweeper',
    doom: 'doom',
    aim: 'gemini',
    angelaim: 'gemini',
    mplayer: 'mediaPlayer',
    angelplayer: 'mediaPlayer',
    install: 'abilityToInstall',
    chrome: 'chrome',
    google: 'chrome',
    netscape: 'chrome',
    angelnav: 'chrome',
    iexplore: 'chrome',
    camera: 'cameraApp',
    webcam: 'cameraApp',
    cam: 'cameraApp',
    java: 'javaCreatorApp',
    oldjava: 'javaCreatorApp',
    javac: 'javaCreatorApp',
    billy: 'javaCreatorApp',
    hockey: 'hockeyCardsApp',
    hockeycards: 'hockeyCardsApp',
    mcgee: 'hockeyCardsApp',
    obliterate: 'hockeyCardsApp',
    cards: 'hockeyCardsApp',
  };

  if (map[cmd]) {
    megaBridge?.openApp(map[cmd]);
    return true;
  }
  if (cmd === 'mic' || cmd === 'microphone' || cmd === 'permissions' || cmd === 'privacy') { openMediaPermissionsModal(); return true; }
  if (cmd === 'fdisk') { megaBridge?.openFdiskScreen(false); return true; }
  if (cmd === 'fdisk /?' || cmd === 'fdisk help') { megaBridge?.openFdiskScreen(true); return true; }
  if (cmd === 'bios' || cmd === 'cmos') { megaBridge?.openCmosBiosSetup(); return true; }
  if (cmd === 'setup') { megaBridge?.openOsReinstallScreen(); return true; }
  if (cmd === 'booter' || cmd === 'physicalboot' || cmd === 'physical') { megaBridge?.openPhysicalBooterModal?.(); return true; }
  if (cmd === 'usbboot' || cmd === 'usbimg') { megaBridge?.downloadBootableUsbDiskImage?.(); return true; }
  if (cmd === 'lock' || cmd === 'signin' || cmd === 'switchuser') { megaBridge?.openLocalSignInScreen?.(); return true; }
  if (cmd === 'bsod') { triggerBsodPrank('User executed BSOD.EXE from Run dialog.'); return true; }
  if (cmd === 'winver') { openWinverModal(); return true; }
  if (cmd === 'hotkeys') { openHotkeysModal(); return true; }
  if (cmd === 'sticky') { spawnCustomStickyNote(); return true; }
  if (cmd === 'tile') { megaBridge?.autoTileOpenWindows(); return true; }
  if (cmd === 'cascade') { megaBridge?.cascadeOpenWindows(); return true; }

  megaBridge?.showOsDialog(`Cannot find '${raw}'. Try hockey, mcgee, oldjava, billy, camera, mic, chrome, perf, bios, booter, usbboot, signin, setup, eventvwr, calc, sol, arcade, taskmgr, sndrec32, calendar, bsod, winver, fdisk, or cmd.`, 'Run');
  return false;
}

export function triggerBsodPrank(reason = 'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01).'): void {
  const bsod = document.getElementById('bsod-prank-overlay');
  const reasonEl = document.getElementById('bsod-reason-line');
  if (!bsod) return;
  if (reasonEl) reasonEl.textContent = reason;
  bsod.style.display = 'flex';
  megaBridge?.sfx.playChordError();
  logOsEvent('KERNEL', 'VMM32.VXD', `BSOD Fatal Exception 0E: ${reason}`, 'ERROR');
  unlockAchievement('bsod_survivor');
}

export function openWinverModal(): void {
  const modal = document.getElementById('winver-modal');
  const uptimeEl = document.getElementById('winver-uptime');
  const biosCountEl = document.getElementById('winver-bios-count');
  if (!modal) return;
  const upSec = Math.floor((Date.now() - bootedAtMs) / 1000);
  if (uptimeEl) uptimeEl.textContent = `${upSec} seconds · ${navigator.platform || 'x86 PC'}`;
  if (biosCountEl) {
    const active = getActivatedBiosCount();
    biosCountEl.textContent =
      active === 0
        ? `0 / ${TOTAL_BIOS_FEATURES.toLocaleString()} Active (All Dormant Until BIOS Setup)`
        : `${active.toLocaleString()} / ${TOTAL_BIOS_FEATURES.toLocaleString()} Advanced Registers Activated`;
  }
  modal.style.display = 'flex';
}

export function openHotkeysModal(): void {
  const modal = document.getElementById('hotkeys-modal');
  if (modal) modal.style.display = 'flex';
}

// ==================== 13. SYSTEM LOGS BRIDGE (DELEGATES TO osSystemLogs.ts) ====================
export type OsLogCategory = 'KERNEL' | 'APP' | 'SETUP' | 'TERMINAL' | 'NETWORK' | 'AUDIO' | 'SECURITY';
export type OsLogLevel = 'INFO' | 'WARN' | 'ERROR';

export function logOsEvent(
  category: OsLogCategory,
  source: string,
  message: string,
  level: OsLogLevel = 'INFO',
): void {
  logLegacyOsEvent(category, source, message, level);
}

// Expose globally for other modules
(window as any).__logOsEvent = logOsEvent;

export function renderSysLogsUI(): void {
  refreshSystemLogsView();
}

export function initSysLogsApp(windowElement: HTMLDivElement): void {
  initSystemLogsComponent(windowElement);
}

// ==================== 14. UNIVERSAL WIN32 APP HOST FOR ALL 136+ INSTALLABLE CATALOG APPS ====================
export function populateUniversalCatalogAppWindow(pkg: {
  pkgId: string;
  name: string;
  version: string;
  publisher: string;
  category: string;
  exeName: string;
  installDir: string;
  sizeMB: number;
  description: string;
  iconUrl?: string;
  iconHtml: string;
  appWindowId: string;
}): void {
  const win = document.getElementById('universalCatalogApp');
  if (!win) return;

  const titleSpan = win.querySelector('#ucat-window-title');
  const bodyEl = win.querySelector('#ucat-body-content') as HTMLDivElement | null;
  if (titleSpan) {
    titleSpan.textContent = `${pkg.name} (${pkg.exeName})`;
  }
  if (!bodyEl) return;

  const iconImg = pkg.iconUrl
    ? `<img src="${pkg.iconUrl}" alt="" style="width:32px;height:32px;image-rendering:pixelated;" />`
    : `<span style="font-size:28px;">${pkg.iconHtml}</span>`;

  let workspaceHtml = '';
  if (pkg.category === 'browser') {
    workspaceHtml = `
      <div style="border:2px inset #808080;background:#000;color:#00ff66;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:10px;height:175px;overflow-y:auto;" id="ucat-net-log">
        <div>[${new Date().toLocaleTimeString()}] ${escapeHtml(pkg.exeName)} Winsock 1.1 stack initialized on ANGEL-PC95.</div>
        <div>[TCP/IP] Bound local socket 192.168.95.10:1028 -> Cloudflare Tunnel Active.</div>
        <div>[STATUS] ${escapeHtml(pkg.description)}</div>
        <div style="color:#ffff55;margin-top:6px;">Ready for packet transmission or command input below...</div>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <input type="text" id="ucat-net-input" class="win95-text-input" style="flex:1;" placeholder="Enter host, IRC message, FTP command, or search query..." value="ping archive.org" />
        <button class="win95-btn" id="ucat-net-send-btn"><b>⚡ Execute</b></button>
        <button class="win95-btn" id="ucat-net-proxy-btn">🌐 Open in Angel Navigator</button>
      </div>
    `;
  } else if (pkg.category === 'multimedia') {
    workspaceHtml = `
      <div style="display:flex;gap:10px;align-items:stretch;height:185px;">
        <canvas id="ucat-mm-canvas" width="320" height="180" style="border:2px inset #808080;background:#001122;flex:1;cursor:crosshair;"></canvas>
        <div style="width:175px;border:2px inset #808080;background:#dfdfdf;padding:8px;display:flex;flex-direction:column;justify-content:space-between;font-size:11px;">
          <div>
            <b>🎮 Interactive Engine</b>
            <div style="margin-top:4px;color:#333;">Click inside the viewport or press buttons below to interact with <b>${escapeHtml(pkg.name)}</b>!</div>
            <div id="ucat-mm-score" class="tabular-nums" style="margin-top:8px;background:#000;color:#00ff66;padding:4px 6px;font-family:monospace;font-weight:bold;">PTS: 0000 · FPS: 60</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button class="win95-btn" id="ucat-mm-action-btn" style="font-weight:700;">▶ Trigger Action / Synth</button>
            <button class="win95-btn" id="ucat-mm-mode-btn">🎨 Cycle Visual Mode</button>
          </div>
        </div>
      </div>
    `;
  } else if (pkg.category === 'system') {
    workspaceHtml = `
      <div style="border:2px inset #808080;background:#fff;padding:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;height:145px;overflow-y:auto;" id="ucat-sys-report">
        <b>=== ${escapeHtml(pkg.name.toUpperCase())} DIAGNOSTIC CONSOLE ===</b><br/>
        Binary Path : ${escapeHtml(pkg.installDir)}\\${escapeHtml(pkg.exeName)}<br/>
        Target Drive: C:\\ (ANGEL_95 · FAT16 · 1,495 MB)<br/>
        Memory Model: 32-Bit Protected Mode Flat Thunk<br/>
        Status      : Ready to run hardware/system operation.
      </div>
      <div style="border:2px inset #808080;background:#000;height:18px;margin-top:6px;position:relative;">
        <div id="ucat-sys-bar" style="background:#000080;height:100%;width:0%;transition:width 0.15s;"></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button class="win95-btn" id="ucat-sys-run-btn" style="background:#ffffcc;font-weight:700;">🔧 Run Diagnostic / Optimize Now</button>
        <button class="win95-btn" id="ucat-sys-save-btn">💾 Save Report to C:\\Documents</button>
      </div>
    `;
  } else {
    workspaceHtml = `
      <div style="display:flex;gap:6px;margin-bottom:4px;">
        <button class="win95-btn ucat-doc-tpl" data-tpl="memo">📄 Load 1995 Template</button>
        <button class="win95-btn ucat-doc-tpl" data-tpl="calc">📊 Insert Data Table</button>
        <button class="win95-btn" id="ucat-doc-save">💾 Save to C:\\Documents</button>
      </div>
      <textarea id="ucat-doc-editor" style="width:100%;height:165px;box-sizing:border-box;border:2px inset #808080;font-family:'IBM Plex Mono',monospace;font-size:11.5px;padding:8px;">=== ${escapeHtml(pkg.name)} (v${escapeHtml(pkg.version)}) ===
Author: Angel
Created on: ${new Date().toLocaleString()}
----------------------------------------
${escapeHtml(pkg.description)}

[Workspace Ready — Type or edit your document/project here!]</textarea>
    `;
  }

  bodyEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:#dfdfdf;border:2px groove #fff;padding:8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${iconImg}
        <div>
          <div style="font-weight:700;font-size:13px;color:#000080;">${escapeHtml(pkg.name)}</div>
          <div style="font-size:11px;color:#333;">Publisher: <b>${escapeHtml(pkg.publisher)}</b> · Version ${escapeHtml(pkg.version)} · <code>${escapeHtml(pkg.installDir)}\\${escapeHtml(pkg.exeName)}</code></div>
        </div>
      </div>
      <button class="win95-btn" id="ucat-uninstall-this-btn" style="color:#880000;font-weight:700;">🗑️ De-install App</button>
    </div>
    <div style="margin-top:8px;">
      ${workspaceHtml}
    </div>
  `;

  logOsEvent('APP', pkg.exeName, `Launched catalog application "${pkg.name}" (${pkg.installDir}\\${pkg.exeName})`, 'INFO');

  // Wire Uninstall button
  bodyEl.querySelector('#ucat-uninstall-this-btn')?.addEventListener('click', () => {
    (window as any).__uninstallCatalogApp?.(pkg.pkgId);
  });

  // Wire Category-Specific Interactive Controls
  if (pkg.category === 'browser') {
    const logBox = bodyEl.querySelector('#ucat-net-log');
    const netIn = bodyEl.querySelector('#ucat-net-input') as HTMLInputElement | null;
    bodyEl.querySelector('#ucat-net-send-btn')?.addEventListener('click', () => {
      const cmd = netIn?.value.trim() || 'STATUS';
      playTone(680, 0.06, 'square', 0.04);
      if (logBox) {
        const line = document.createElement('div');
        line.innerHTML = `&gt; <b>${escapeHtml(cmd)}</b><br/><span style="color:#38bdf8;">[200 OK] Reply from 198.41.0.4: bytes=64 time=14ms TTL=56 (${escapeHtml(pkg.exeName)})</span>`;
        logBox.appendChild(line);
        logBox.scrollTop = logBox.scrollHeight;
      }
    });
    bodyEl.querySelector('#ucat-net-proxy-btn')?.addEventListener('click', () => {
      megaBridge?.openApp('chrome');
    });
  } else if (pkg.category === 'multimedia') {
    const c = bodyEl.querySelector('#ucat-mm-canvas') as HTMLCanvasElement | null;
    const scoreBox = bodyEl.querySelector('#ucat-mm-score');
    let pts = 0;
    let visMode = 0;
    const drawDemo = () => {
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = visMode % 2 === 0 ? '#001428' : '#1a0022';
      ctx.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = `hsl(${(i * 25 + pts * 7) % 360}, 85%, 60%)`;
        const x = ((i * 37 + pts * 11) % (c.width - 24)) + 8;
        const y = ((i * 29 + pts * 5) % (c.height - 24)) + 8;
        ctx.fillRect(x, y, 14, 14);
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(pkg.name.slice(0, 26), 12, 22);
      ctx.fillStyle = '#00ffcc';
      ctx.font = '11px monospace';
      ctx.fillText('Click viewport or [Trigger Action] to play!', 12, c.height - 12);
    };
    drawDemo();
    const bump = () => {
      pts += 25;
      playTone(330 + (pts % 500), 0.08, 'triangle', 0.05);
      if (scoreBox) scoreBox.textContent = `PTS: ${String(pts).padStart(4, '0')} · FPS: 60`;
      drawDemo();
    };
    c?.addEventListener('click', bump);
    bodyEl.querySelector('#ucat-mm-action-btn')?.addEventListener('click', bump);
    bodyEl.querySelector('#ucat-mm-mode-btn')?.addEventListener('click', () => {
      visMode++;
      bump();
    });
  } else if (pkg.category === 'system') {
    const rep = bodyEl.querySelector('#ucat-sys-report');
    const bar = bodyEl.querySelector('#ucat-sys-bar') as HTMLDivElement | null;
    bodyEl.querySelector('#ucat-sys-run-btn')?.addEventListener('click', () => {
      let pct = 0;
      const iv = window.setInterval(() => {
        pct = Math.min(100, pct + 20);
        if (bar) bar.style.width = `${pct}%`;
        playTone(400 + pct * 4, 0.04, 'square', 0.03);
        if (pct >= 100) {
          clearInterval(iv);
          if (rep) {
            rep.innerHTML += `<br/><span style="color:#006600;font-weight:bold;">[${new Date().toLocaleTimeString()}] ✓ Operation completed: 0 bad sectors, 100% cluster integrity verified!</span>`;
            rep.scrollTop = rep.scrollHeight;
          }
          logOsEvent('KERNEL', pkg.exeName, `Completed system utility scan in ${pkg.name}`, 'INFO');
        }
      }, 140);
    });
    bodyEl.querySelector('#ucat-sys-save-btn')?.addEventListener('click', () => {
      const fname = `${pkg.exeName.replace('.EXE', '')}_REPORT.TXT`;
      megaBridge?.addVfsFile(fname, 'text', 'C:\\Documents', rep?.textContent || pkg.description);
      megaBridge?.refreshExplorerIfOpen();
      pushBalloonToast('Report Saved', `Saved ${fname} to C:\\Documents!`, '💾');
    });
  } else {
    const ed = bodyEl.querySelector('#ucat-doc-editor') as HTMLTextAreaElement | null;
    bodyEl.querySelectorAll('.ucat-doc-tpl').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = (btn as HTMLElement).dataset.tpl;
        if (!ed) return;
        if (tpl === 'memo') {
          ed.value += `\n\nMEMORANDUM — ANGEL-OS 95 CORP.\nTO: All Engineering Staff\nFROM: Angel (CEO)\nSUBJECT: Q4 1995 Release Schedule\n`;
        } else {
          ed.value += `\n\nITEM       | QTY | PRICE\n-----------+-----+-------\nPentium PC |  1  | $1,995\nSoundBlast |  1  |   $149\n`;
        }
      });
    });
    bodyEl.querySelector('#ucat-doc-save')?.addEventListener('click', () => {
      const fname = `${pkg.exeName.replace('.EXE', '')}_DOC.TXT`;
      megaBridge?.addVfsFile(fname, 'text', 'C:\\Documents', ed?.value || '');
      megaBridge?.refreshExplorerIfOpen();
      pushBalloonToast('Saved to C:\\Documents', `Saved ${fname}!`, '💾');
    });
  }
}

// ==================== 15. INITIALIZE ALL SHELL EXTRAS & GLOBAL HOTKEYS ====================
const KONAMI_SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

export function initMegaShellFeatures(): void {
  renderAllCustomStickies();
  renderNotifDrawer();
  renderTrophiesUI();
  renderRecycleBinUI();
  renderClipboardViewerUI();
  renderSysLogsUI();

  // Notification Bell Drawer Toggle
  const notifDrawer = document.getElementById('notif-drawer');
  document.getElementById('tray-notif-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    megaBridge?.sfx.playClick();
    if (!notifDrawer) return;
    notifDrawer.style.display = notifDrawer.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('notif-drawer-close')?.addEventListener('click', () => {
    if (notifDrawer) notifDrawer.style.display = 'none';
  });
  document.getElementById('notif-drawer-clear')?.addEventListener('click', () => {
    notifHistory.length = 0;
    const bellBadge = document.getElementById('tray-notif-count');
    if (bellBadge) bellBadge.style.display = 'none';
    renderNotifDrawer();
  });

  // Run Dialog Controls
  const runModal = document.getElementById('run-dialog-modal');
  const runInput = document.getElementById('run-dialog-input') as HTMLInputElement | null;
  document.getElementById('run-ok-btn')?.addEventListener('click', () => {
    megaBridge?.sfx.playClick();
    if (runModal) runModal.style.display = 'none';
    if (runInput) executeRunCommand(runInput.value);
  });
  document.getElementById('run-cancel-btn')?.addEventListener('click', () => {
    if (runModal) runModal.style.display = 'none';
  });
  document.getElementById('run-close-btn')?.addEventListener('click', () => {
    if (runModal) runModal.style.display = 'none';
  });
  runInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (runModal) runModal.style.display = 'none';
      executeRunCommand(runInput.value);
    } else if (e.key === 'Escape' && runModal) {
      runModal.style.display = 'none';
    }
  });
  document.querySelectorAll('.run-preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      if (runInput) runInput.value = (chip as HTMLElement).dataset.cmd || '';
    });
  });

  // BSOD Prank dismiss
  const bsod = document.getElementById('bsod-prank-overlay');
  bsod?.addEventListener('click', () => {
    bsod.style.display = 'none';
  });

  // WINVER & Hotkeys Modals
  document.getElementById('winver-close-btn')?.addEventListener('click', () => {
    const m = document.getElementById('winver-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('winver-ok-btn')?.addEventListener('click', () => {
    const m = document.getElementById('winver-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('hotkeys-close-btn')?.addEventListener('click', () => {
    const m = document.getElementById('hotkeys-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('hotkeys-ok-btn')?.addEventListener('click', () => {
    const m = document.getElementById('hotkeys-modal');
    if (m) m.style.display = 'none';
  });

  // Global Keyboard Shortcuts + Konami Code
  window.addEventListener('keydown', (e) => {
    if (bsod && bsod.style.display === 'flex') {
      e.preventDefault();
      bsod.style.display = 'none';
      return;
    }

    // Konami code detector
    const expected = KONAMI_SEQ[konamiPos];
    if (e.key.toLowerCase() === expected.toLowerCase()) {
      konamiPos++;
      if (konamiPos === KONAMI_SEQ.length) {
        konamiPos = 0;
        unlockAchievement('konami_legend');
        megaBridge?.sfx.playStartupChime();
        megaBridge?.applyTheme('cyberpunk');
        pushBalloonToast('30 EXTRA LIVES UNLOCKED!', 'Konami Code accepted! Switching to Cyberpunk Turbo Theme!', '🎮');
      }
    } else {
      konamiPos = 0;
    }

    if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      openRunDialog();
    } else if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
      e.preventDefault();
      megaBridge?.openApp('taskManager');
    } else if (e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      megaBridge?.autoTileOpenWindows();
    } else if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      megaBridge?.cascadeOpenWindows();
    }
  });
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

