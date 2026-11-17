/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import '@tailwindcss/browser';

// --- Web Audio API Retro Windows 95 Sound Engine ---
class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playClick() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  playWindowOpen() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const notes = [330, 440, 659.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = ctx.currentTime + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  playChordError() {
    const ctx = this.getCtx();
    if (!ctx) return;
    [220, 277.18, 329.63].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    });
  }

  private createTapeSaturationCurve(amount = 24): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const k = amount;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Soft hyperbolic tangent saturation + subtle 12-bit quantization step for 1995 Sound Blaster DAC crunch
      const saturated = Math.tanh(x * (1 + k / 15));
      curve[i] = Math.round(saturated * 64) / 64;
    }
    return curve;
  }

  playPostBeep() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  playFloppySeek() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const steps = [0, 0.055, 0.11, 0.19, 0.25];
    steps.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = ctx.currentTime + offset;
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 135 : 168, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.03);
      gain.gain.setValueAtTime(0.045, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    });
  }

  playStartupChime() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Master bus: Low-Pass Filter Swell -> Lo-Fi Tape Saturation WaveShaper -> Stereo Delay Tail -> Destination
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(420, now);
    lowpass.frequency.exponentialRampToValueAtTime(2450, now + 1.35);
    lowpass.frequency.exponentialRampToValueAtTime(880, now + 4.4);
    lowpass.Q.setValueAtTime(2.2, now);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.createTapeSaturationCurve(28);
    shaper.oversample = '2x';

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 4.8);

    // Stereo Chorus / Ambient Delay Tail
    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.setValueAtTime(0.19, now);
    delayR.delayTime.setValueAtTime(0.29, now);

    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.34, now);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.32, now);

    lowpass.connect(shaper);
    shaper.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Connect ambient feedback loop
    shaper.connect(delayL);
    delayL.connect(delayR);
    delayR.connect(feedback);
    feedback.connect(delayL);
    delayL.connect(wetGain);
    delayR.connect(wetGain);
    wetGain.connect(ctx.destination);

    // 1. Warm 1995 DAC / Tape Hiss Layer (Filtered & Bit-Stepped Noise Buffer)
    const bufferSize = Math.floor(ctx.sampleRate * 4.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.08;
      b1 = 0.96 * b1 + b0 * 0.12;
      // Quantize for authentic early-90s 16-bit Sound Blaster floor
      output[i] = Math.round(b1 * 32) / 32;
    }
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.028, now + 0.35);
    noiseGain.gain.exponentialRampToValueAtTime(0.0005, now + 4.1);
    noiseNode.connect(noiseGain);
    noiseGain.connect(lowpass);
    noiseNode.start(now);
    noiseNode.stop(now + 4.2);

    // 2. Brian Eno-Inspired Lush Ambient Pad Voices (Eb9 / AbMaj7 / Bb resolve)
    const padVoices = [
      { freq: 155.56, detune: -6, start: 0.0, peak: 0.09, dur: 4.1, type: 'sawtooth' as OscillatorType }, // Eb3 warm bass
      { freq: 233.08, detune: 5, start: 0.06, peak: 0.08, dur: 4.0, type: 'triangle' as OscillatorType }, // Bb3 fifth
      { freq: 349.23, detune: -8, start: 0.14, peak: 0.075, dur: 3.9, type: 'sine' as OscillatorType }, // F4 ninth
      { freq: 392.0, detune: 7, start: 0.22, peak: 0.075, dur: 3.9, type: 'triangle' as OscillatorType }, // G4 third
      { freq: 466.16, detune: -4, start: 0.32, peak: 0.07, dur: 3.8, type: 'sawtooth' as OscillatorType }, // Bb4
      { freq: 622.25, detune: 9, start: 0.45, peak: 0.085, dur: 3.7, type: 'sine' as OscillatorType }, // Eb5 lead swell
    ];

    padVoices.forEach((v) => {
      const osc = ctx.createOscillator();
      const vGain = ctx.createGain();
      osc.type = v.type;
      const t = now + v.start;
      // Subtle analog pitch drift on attack (tape wow/flutter)
      osc.frequency.setValueAtTime(v.freq * 0.994, t);
      osc.frequency.exponentialRampToValueAtTime(v.freq, t + 0.18);
      osc.detune.setValueAtTime(v.detune, t);

      vGain.gain.setValueAtTime(0.0008, t);
      vGain.gain.linearRampToValueAtTime(v.peak, t + 0.42);
      vGain.gain.exponentialRampToValueAtTime(0.0005, t + v.dur);

      osc.connect(vGain);
      vGain.connect(lowpass);
      osc.start(t);
      osc.stop(t + v.dur + 0.05);
    });

    // 3. Shimmering Bell Harmonics at the Crest of the Swell
    const bellNotes = [
      { freq: 932.33, offset: 0.68, gain: 0.055 }, // Bb5
      { freq: 1174.66, offset: 0.86, gain: 0.042 }, // D6
      { freq: 1244.51, offset: 1.05, gain: 0.065 }, // Eb6 resolve shimmer
    ];
    bellNotes.forEach((b) => {
      const osc = ctx.createOscillator();
      const bGain = ctx.createGain();
      osc.type = 'sine';
      const t = now + b.offset;
      osc.frequency.setValueAtTime(b.freq, t);
      bGain.gain.setValueAtTime(0.001, t);
      bGain.gain.linearRampToValueAtTime(b.gain, t + 0.06);
      bGain.gain.exponentialRampToValueAtTime(0.0005, t + 2.8);
      osc.connect(bGain);
      bGain.connect(lowpass);
      osc.start(t);
      osc.stop(t + 2.9);
    });
  }

  playAimReceive() {
    const ctx = this.getCtx();
    if (!ctx) return;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.07;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }
}

const sfx = new RetroSoundEngine();

// --- In-OS Retro Dialog (Replaces window.alert) ---
function showOsDialog(message: string, title = 'Gemini 95 System') {
  const toast = document.getElementById('os-toast') as HTMLDivElement | null;
  const titleEl = document.getElementById('os-toast-title');
  const textEl = document.getElementById('os-toast-text');
  if (!toast || !titleEl || !textEl) return;
  titleEl.textContent = title;
  textEl.textContent = message;
  toast.style.display = 'block';
  sfx.playChordError();
}

document.getElementById('os-toast-ok')?.addEventListener('click', () => {
  const toast = document.getElementById('os-toast');
  if (toast) toast.style.display = 'none';
});
document.getElementById('os-toast-close')?.addEventListener('click', () => {
  const toast = document.getElementById('os-toast');
  if (toast) toast.style.display = 'none';
});

// --- Virtual File System (C:\) ---
interface VfsItem {
  name: string;
  type: 'folder' | 'text' | 'image' | 'app';
  parent: string;
  content?: string;
  appTarget?: string;
}

const virtualFileSystem: VfsItem[] = [
  { name: 'Documents', type: 'folder', parent: 'C:\\' },
  { name: 'Pictures', type: 'folder', parent: 'C:\\' },
  { name: 'System95', type: 'folder', parent: 'C:\\' },
  {
    name: 'README_1995.TXT',
    type: 'text',
    parent: 'C:\\',
    content:
      '=== WELCOME TO GEMINI 95 (BUILD 1995.1000X) ===\n\n' +
      'What is new in this 1000x Edition:\n' +
      '1. Netscape 95: Type ANY website domain or click ANY link inside a generated 1996 page to surf an infinite AI-generated 90s web!\n' +
      '2. GemPaint Studio: Airbrush spray, flood-fill bucket, shapes, undo, Save to C:\\Pictures, and live Clippy art critiques.\n' +
      '3. GemPlayer 95: Built-in 16-bit FM Chiptune Synthesizer with live spectrum analyzer + YouTube CRT TV.\n' +
      '4. MS-DOS Prompt: Run classic DOS commands, toggle Matrix rain, or ask the AI DOS Kernel anything.\n' +
      '5. Display & Themes: Switch between Teal, Hot Dog Stand, Cyberpunk 1995, Vaporwave, and Phosphor Matrix!',
  },
  {
    name: 'secret_photo.jpg',
    type: 'image',
    parent: 'C:\\',
    content: 'https://storage.googleapis.com/gemini-95-icons/%40ammaar%2B%40olacombe.png',
  },
  {
    name: 'y2k_bunker_plan.txt',
    type: 'text',
    parent: 'C:\\Documents',
    content:
      'TOP SECRET Y2K PREPAREDNESS CHECKLIST (DEC 31, 1999)\n' +
      '- Stockpile 48 cans of Surge soda & 3D Doritos\n' +
      '- Back up all floppy disks (1.44 MB High Density)\n' +
      '- Upgrade Pentium 133MHz BIOS before midnight\n' +
      '- Keep Tamagotchi fed at all costs!',
  },
  {
    name: 'dialup_numbers.txt',
    type: 'text',
    parent: 'C:\\Documents',
    content:
      'LOCAL ISP DIAL-UP NUMBERS (28.8k / 56k V.90):\n' +
      '1. CyberSurf 95: 555-0195\n' +
      '2. AOL Keyword: GEMINI\n' +
      '3. BBS Underground: 555-1337 (8-N-1)',
  },
  {
    name: 'founders_1995.jpg',
    type: 'image',
    parent: 'C:\\Pictures',
    content: 'https://storage.googleapis.com/gemini-95-icons/%40ammaar%2B%40olacombe.png',
  },
  {
    name: 'AUTOEXEC.BAT',
    type: 'text',
    parent: 'C:\\System95',
    content:
      '@ECHO OFF\nPROMPT $P$G\nPATH C:\\GEMINI95;C:\\DOS\nLH C:\\GEMINI95\\MOUSE.COM\nSET SOUND=SB16_A220_I5_D1\nECHO Gemini 95 AI Neural Co-Processor Initialized.\n',
  },
  {
    name: 'COMMAND.COM',
    type: 'app',
    parent: 'C:\\System95',
    appTarget: 'dosPrompt',
  },
];

// --- Sandbox Storage Shim for Browser Iframe ---
const HOST_LS_PREFIX = '__ais_ls_gemini_95:';
const HOST_SS_PREFIX = '__ais_ss_gemini_95:';

function readNamespacedStorage(storage: Storage | undefined, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!storage) return out;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) {
        const val = storage.getItem(k);
        if (val !== null) out[k.slice(prefix.length)] = val;
      }
    }
  } catch (err) {
    console.error('Failed reading host storage snapshot:', err);
  }
  return out;
}

function applyNamespacedStorageOp(
  storage: Storage | undefined,
  prefix: string,
  op: string,
  key?: unknown,
  value?: unknown,
) {
  if (!storage) return;
  try {
    if (op === 'set' && typeof key === 'string' && key.length <= 512 && typeof value === 'string' && value.length <= 524288) {
      storage.setItem(prefix + key, value);
    } else if (op === 'remove' && typeof key === 'string' && key.length <= 512) {
      storage.removeItem(prefix + key);
    } else if (op === 'clear') {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      for (const k of toRemove) storage.removeItem(k);
    }
  } catch (err) {
    console.error('Failed syncing host storage:', err);
  }
}

function safeJsonForInlineScript(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildHostStorageAndNavigationShimScript(): string {
  const initialLs = typeof window !== 'undefined' ? readNamespacedStorage(window.localStorage, HOST_LS_PREFIX) : {};
  const initialSs = typeof window !== 'undefined' ? readNamespacedStorage(window.sessionStorage, HOST_SS_PREFIX) : {};
  const seedJson = safeJsonForInlineScript({ ls: initialLs, ss: initialSs });
  return `<script>(function(){
  var seed = ${seedJson};
  function makeStorage(area, initObj) {
    var map = new Map(Object.entries(initObj || {}));
    function sync(op, key, value) {
      try {
        window.parent.postMessage({ __aisHostStorageSync: true, area: area, op: op, key: key, value: value }, "*");
      } catch (e) {}
    }
    var api = {
      getItem: function(k) { k = String(k); return map.has(k) ? map.get(k) : null; },
      setItem: function(k, v) { k = String(k); v = String(v); map.set(k, v); sync("set", k, v); },
      removeItem: function(k) { k = String(k); if (map.delete(k)) sync("remove", k); },
      clear: function() { map.clear(); sync("clear"); },
      key: function(i) { var keys = Array.from(map.keys()); return (i >= 0 && i < keys.length) ? keys[i] : null; }
    };
    Object.defineProperty(api, "length", { get: function() { return map.size; }, enumerable: false, configurable: true });
    return new Proxy(api, {
      get: function(target, prop) {
        if (prop in target) {
          var v = target[prop];
          return typeof v === "function" ? v.bind(target) : v;
        }
        if (typeof prop === "string" && map.has(prop)) return map.get(prop);
        return undefined;
      },
      set: function(target, prop, value) {
        if (typeof prop === "string" && !(prop in target)) {
          target.setItem(prop, value);
          return true;
        }
        return false;
      }
    });
  }
  try {
    var ls = makeStorage("local", seed.ls);
    var ss = makeStorage("session", seed.ss);
    Object.defineProperty(window, "localStorage", { configurable: true, enumerable: true, get: function() { return ls; } });
    Object.defineProperty(window, "sessionStorage", { configurable: true, enumerable: true, get: function() { return ss; } });
  } catch (e) {}
  document.addEventListener("click", function(e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (a && a.getAttribute("href")) {
      var href = a.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        e.preventDefault();
        window.parent.postMessage({ __gemini95Navigate: true, url: href }, "*");
      }
    }
  });
})();<\/script>`;
}

function injectShimIntoHtml(rawHtml: string, shimScript: string): string {
  const html = String(rawHtml || '');
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, (m) => m + shimScript);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b[^>]*>/i, (m) => m + '<head>' + shimScript + '</head>');
  }
  return shimScript + html;
}

// --- Global State & DOM References ---
const dosInstances: Record<string, { initialized: boolean }> = {};
const desktop = document.getElementById('desktop') as HTMLDivElement;
const windows = document.querySelectorAll('.window') as NodeListOf<HTMLDivElement>;
const icons = document.querySelectorAll('.icon') as NodeListOf<HTMLDivElement>;
const startMenu = document.getElementById('start-menu') as HTMLDivElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const taskbarAppsContainer = document.getElementById('taskbar-apps') as HTMLDivElement;
const paintAssistant = document.getElementById('paint-assistant') as HTMLDivElement;
const assistantBubble = paintAssistant?.querySelector('.assistant-bubble') as HTMLDivElement;

let activeWindow: HTMLDivElement | null = null;
let highestZIndex = 20;
const openApps = new Map<string, { windowEl: HTMLDivElement; taskbarButton: HTMLDivElement }>();
const initializedApps = new Set<string>();
let geminiInstance: any | null = null;
let paintCritiqueIntervalId: number | null = null;
const paintResizeObserverMap = new Map<Element, ResizeObserver>();

// --- Initialize Gemini Proxy ---
async function initializeGeminiIfNeeded(context: string): Promise<boolean> {
  if (geminiInstance) return true;
  try {
    const module = await import('./genaiProxy');
    const GoogleAIClass = module.GoogleGenAI;
    if (typeof GoogleAIClass !== 'function') throw new Error('GoogleGenAI constructor not found.');
    geminiInstance = new GoogleAIClass();
    return true;
  } catch (error: any) {
    console.error(`Failed Gemini initialization in ${context}:`, error);
    showOsDialog(`Gemini AI initialization error: ${error.message}`, 'AI Subsystem Error');
    return false;
  }
}

// --- Window Management ---
function bringToFront(windowElement: HTMLDivElement): void {
  if (activeWindow && activeWindow !== windowElement) {
    activeWindow.classList.remove('active');
    const prevAppName = activeWindow.id;
    openApps.get(prevAppName)?.taskbarButton.classList.remove('active');
  }
  highestZIndex++;
  windowElement.style.zIndex = highestZIndex.toString();
  windowElement.classList.add('active');
  activeWindow = windowElement;

  const appNameRef = windowElement.id;
  openApps.get(appNameRef)?.taskbarButton.classList.add('active');
}

function toggleMaximize(windowElement: HTMLDivElement): void {
  sfx.playClick();
  windowElement.classList.toggle('maximized');
  bringToFront(windowElement);
}

function findIconElement(appName: string): HTMLDivElement | undefined {
  return Array.from(icons).find((icon) => icon.dataset.app === appName);
}

export async function openApp(appName: string): Promise<void> {
  const windowElement = document.getElementById(appName) as HTMLDivElement | null;
  if (!windowElement) return;

  sfx.playWindowOpen();

  if (openApps.has(appName)) {
    windowElement.style.display = 'flex';
    bringToFront(windowElement);
    if (appName === 'myComputer') renderExplorerFolder(currentExplorerPath);
    return;
  }

  windowElement.style.display = 'flex';
  bringToFront(windowElement);

  const taskbarButton = document.createElement('div');
  taskbarButton.classList.add('taskbar-app');
  taskbarButton.dataset.appName = appName;

  let iconSrc = '';
  let title = appName;
  const iconElement = findIconElement(appName);
  if (iconElement) {
    const img = iconElement.querySelector('img');
    const span = iconElement.querySelector('span');
    if (img) iconSrc = img.src;
    if (span) title = span.textContent || appName;
  } else {
    switch (appName) {
      case 'myComputer':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/mycomputer.png';
        title = 'My Gemtop';
        break;
      case 'chrome':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/chrome-icon-2.png';
        title = 'Netscape 95';
        break;
      case 'notepad':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/GemNotes.png';
        title = 'GemNotes';
        break;
      case 'paint':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/gempaint.png';
        title = 'GemPaint';
        break;
      case 'doom':
        iconSrc = 'https://64.media.tumblr.com/1d89dfa76381e5c14210a2149c83790d/7a15f84c681c1cf9-c1/s540x810/86985984be99d5591e0cbc0dea6f05ffa3136dac.png';
        title = 'Doom II';
        break;
      case 'gemini':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/GeminiChatRetro.png';
        title = 'Gemini AIM';
        break;
      case 'minesweeper':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/gemsweeper.png';
        title = 'GemSweeper';
        break;
      case 'imageViewer':
        iconSrc = 'https://win98icons.alexmeub.com/icons/png/display_properties-4.png';
        title = 'Image Viewer';
        break;
      case 'mediaPlayer':
        iconSrc = 'https://storage.googleapis.com/gemini-95-icons/ytmediaplayer.png';
        title = 'GemPlayer';
        break;
      case 'dosPrompt':
        title = 'MS-DOS Prompt';
        break;
      case 'controlPanel':
        iconSrc = 'https://win98icons.alexmeub.com/icons/png/display_properties-4.png';
        title = 'Display & Themes';
        break;
    }
  }

  if (iconSrc) {
    const img = document.createElement('img');
    img.src = iconSrc;
    img.alt = title;
    img.referrerPolicy = 'no-referrer';
    taskbarButton.appendChild(img);
  }
  taskbarButton.appendChild(document.createTextNode(title));

  taskbarButton.addEventListener('click', () => {
    sfx.playClick();
    if (windowElement === activeWindow && windowElement.style.display !== 'none') {
      minimizeApp(appName);
    } else {
      windowElement.style.display = 'flex';
      bringToFront(windowElement);
    }
  });

  taskbarAppsContainer.appendChild(taskbarButton);
  openApps.set(appName, { windowEl: windowElement, taskbarButton });
  taskbarButton.classList.add('active');

  // Initialize specific app logic once or refresh as needed
  if (appName === 'myComputer') {
    initMyComputer(windowElement);
  } else if (appName === 'chrome') {
    initAiBrowser(windowElement);
  } else if (appName === 'notepad') {
    initNotepadStory(windowElement);
  } else if (appName === 'paint') {
    initSimplePaintApp(windowElement);
    if (paintAssistant) paintAssistant.classList.add('visible');
    if (assistantBubble) assistantBubble.textContent = 'Draw something! Click "Judge Art" anytime.';
    if (paintCritiqueIntervalId) clearInterval(paintCritiqueIntervalId);
    paintCritiqueIntervalId = window.setInterval(critiquePaintDrawing, 20000);
  } else if (appName === 'doom' && !dosInstances['doom']) {
    const doomContainer = document.getElementById('doom-content') as HTMLDivElement;
    if (doomContainer) {
      doomContainer.innerHTML =
        '<iframe src="https://js-dos.com/games/doom.exe.html" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>';
      dosInstances['doom'] = { initialized: true };
    }
  } else if (appName === 'gemini') {
    initGeminiChat(windowElement);
  } else if (appName === 'minesweeper') {
    initMinesweeperGame(windowElement);
  } else if (appName === 'mediaPlayer') {
    initMediaPlayer(windowElement);
  } else if (appName === 'dosPrompt') {
    initDosPrompt(windowElement);
  } else if (appName === 'controlPanel') {
    initControlPanel(windowElement);
  }
}

function closeApp(appName: string): void {
  const appData = openApps.get(appName);
  if (!appData) return;
  sfx.playClick();

  const { windowEl, taskbarButton } = appData;
  windowEl.style.display = 'none';
  windowEl.classList.remove('active', 'maximized');
  taskbarButton.remove();
  openApps.delete(appName);

  if (dosInstances[appName]) {
    const container = document.getElementById(`${appName}-content`);
    if (container) container.innerHTML = '';
    delete dosInstances[appName];
  }

  if (appName === 'paint') {
    if (paintCritiqueIntervalId) {
      clearInterval(paintCritiqueIntervalId);
      paintCritiqueIntervalId = null;
    }
    if (paintAssistant) paintAssistant.classList.remove('visible');
  }

  if (appName === 'mediaPlayer') {
    stopChiptuneSynth();
    const player = youtubePlayers[appName];
    if (player) {
      try {
        if (typeof player.stopVideo === 'function') player.stopVideo();
        if (typeof player.destroy === 'function') player.destroy();
      } catch {}
      delete youtubePlayers[appName];
    }
  }

  if (activeWindow === windowEl) {
    activeWindow = null;
    let nextAppToActivate: HTMLDivElement | null = null;
    let maxZ = -1;
    openApps.forEach((data) => {
      const z = parseInt(data.windowEl.style.zIndex || '0', 10);
      if (z > maxZ) {
        maxZ = z;
        nextAppToActivate = data.windowEl;
      }
    });
    if (nextAppToActivate) bringToFront(nextAppToActivate);
  }
}

function minimizeApp(appName: string): void {
  const appData = openApps.get(appName);
  if (!appData) return;
  const { windowEl, taskbarButton } = appData;
  windowEl.style.display = 'none';
  windowEl.classList.remove('active');
  taskbarButton.classList.remove('active');

  if (activeWindow === windowEl) {
    activeWindow = null;
    let nextAppToActivate: string | null = null;
    let maxZ = 0;
    openApps.forEach((data, name) => {
      if (data.windowEl.style.display !== 'none') {
        const z = parseInt(data.windowEl.style.zIndex || '0', 10);
        if (z > maxZ) {
          maxZ = z;
          nextAppToActivate = name;
        }
      }
    });
    if (nextAppToActivate) bringToFront(openApps.get(nextAppToActivate)!.windowEl);
  }
}

// --- 1. MY GEMTOP (Virtual File System Explorer) ---
let currentExplorerPath = 'C:\\';

function renderExplorerFolder(pathStr: string) {
  currentExplorerPath = pathStr;
  const view = document.getElementById('explorer-view');
  const pathInput = document.getElementById('explorer-path-input') as HTMLInputElement | null;
  const statusCount = document.getElementById('explorer-status-count');
  if (!view) return;
  if (pathInput) pathInput.value = pathStr;

  view.innerHTML = '';
  const items = virtualFileSystem.filter((item) => item.parent === pathStr);
  if (statusCount) statusCount.textContent = `${items.length} object(s)`;

  items.forEach((item) => {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'window-icon';
    let imgSrc = 'https://win98icons.alexmeub.com/icons/png/notepad_file-0.png';
    if (item.type === 'folder') {
      imgSrc = 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png';
    } else if (item.type === 'image') {
      imgSrc = 'https://win98icons.alexmeub.com/icons/png/paint_file-0.png';
    } else if (item.type === 'app') {
      imgSrc = 'https://win98icons.alexmeub.com/icons/png/console_prompt-0.png';
    }
    iconDiv.innerHTML = `<img src="${imgSrc}" alt="${item.name}" referrerpolicy="no-referrer" /><span>${item.name}</span>`;
    iconDiv.addEventListener('click', () => {
      sfx.playClick();
      if (item.type === 'folder') {
        const nextPath = pathStr.endsWith('\\') ? `${pathStr}${item.name}` : `${pathStr}\\${item.name}`;
        renderExplorerFolder(nextPath);
      } else if (item.type === 'text') {
        openTextFileInNotepad(item.name, item.content || '');
      } else if (item.type === 'image') {
        openImageFileInViewer(item.name, item.content || '');
      } else if (item.type === 'app' && item.appTarget) {
        openApp(item.appTarget);
      }
    });
    view.appendChild(iconDiv);
  });
}

function openTextFileInNotepad(filename: string, content: string) {
  openApp('notepad').then(() => {
    const textarea = document.querySelector('#notepad .notepad-textarea') as HTMLTextAreaElement | null;
    const titleEl = document.getElementById('notepad-window-title');
    if (textarea) {
      textarea.value = content;
      textarea.dispatchEvent(new Event('input'));
    }
    if (titleEl) titleEl.textContent = `GemNotes — ${filename}`;
  });
}

function openImageFileInViewer(filename: string, dataUrl: string) {
  const imageViewerImg = document.getElementById('image-viewer-img') as HTMLImageElement | null;
  const imageViewerTitle = document.getElementById('image-viewer-title') as HTMLSpanElement | null;
  if (imageViewerImg && imageViewerTitle) {
    imageViewerImg.src = dataUrl;
    imageViewerImg.alt = filename;
    imageViewerTitle.textContent = `${filename} — Image Viewer`;
    openApp('imageViewer');
  }
}

function initMyComputer(windowElement: HTMLDivElement): void {
  renderExplorerFolder(currentExplorerPath);
  if (initializedApps.has('myComputer')) return;
  initializedApps.add('myComputer');

  windowElement.querySelector('#explorer-up-btn')?.addEventListener('click', () => {
    sfx.playClick();
    if (currentExplorerPath === 'C:\\') return;
    const parts = currentExplorerPath.replace(/\\$/, '').split('\\');
    parts.pop();
    const parent = parts.length <= 1 ? 'C:\\' : parts.join('\\');
    renderExplorerFolder(parent);
  });

  windowElement.querySelector('#explorer-root-btn')?.addEventListener('click', () => {
    sfx.playClick();
    renderExplorerFolder('C:\\');
  });

  windowElement.querySelector('#explorer-new-note-btn')?.addEventListener('click', () => {
    sfx.playClick();
    const name = `NOTE_${Math.floor(100 + Math.random() * 900)}.TXT`;
    virtualFileSystem.push({
      name,
      type: 'text',
      parent: currentExplorerPath,
      content: `Created in ${currentExplorerPath} on ${new Date().toLocaleTimeString()}\n\nWrite your retro notes here!`,
    });
    renderExplorerFolder(currentExplorerPath);
    openTextFileInNotepad(name, `Created in ${currentExplorerPath}\n\nWrite your retro notes here!`);
  });
}

// --- 2. NETSCAPE 95 (AI Time-Machine Web Browser) ---
const browserHistory: string[] = [];
let browserHistoryIndex = -1;
let navigateBrowserGlobal: ((url: string, pushHistory?: boolean) => Promise<void>) | null = null;

window.addEventListener('message', (event: MessageEvent) => {
  const browserFrame = document.getElementById('browser-frame') as HTMLIFrameElement | null;
  if (!browserFrame || event.source !== browserFrame.contentWindow) return;

  const data = event.data;
  if (data && data.__aisHostStorageSync === true) {
    const target = data.area === 'session' ? window.sessionStorage : window.localStorage;
    const prefix = data.area === 'session' ? HOST_SS_PREFIX : HOST_LS_PREFIX;
    applyNamespacedStorageOp(target, prefix, String(data.op || ''), data.key, data.value);
    return;
  }

  if (data && data.__gemini95Navigate === true && typeof data.url === 'string') {
    let targetUrl = data.url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://www.geocities.com/' + targetUrl.replace(/^\/+/, '');
    }
    if (navigateBrowserGlobal) navigateBrowserGlobal(targetUrl, true);
  }
});

function initAiBrowser(windowElement: HTMLDivElement): void {
  if (initializedApps.has('chrome')) return;
  initializedApps.add('chrome');

  const addressBar = windowElement.querySelector('.browser-address-bar') as HTMLInputElement;
  const goButton = windowElement.querySelector('.browser-go-button') as HTMLButtonElement;
  const backBtn = windowElement.querySelector('#browser-back') as HTMLButtonElement;
  const forwardBtn = windowElement.querySelector('#browser-forward') as HTMLButtonElement;
  const reloadBtn = windowElement.querySelector('#browser-reload') as HTMLButtonElement;
  const homeBtn = windowElement.querySelector('#browser-home') as HTMLButtonElement;
  const statusText = windowElement.querySelector('#browser-status-text') as HTMLSpanElement;
  const iframe = windowElement.querySelector('#browser-frame') as HTMLIFrameElement;
  const loadingEl = windowElement.querySelector('.browser-loading') as HTMLDivElement;

  function updateNavButtons() {
    if (backBtn) backBtn.disabled = browserHistoryIndex <= 0;
    if (forwardBtn) forwardBtn.disabled = browserHistoryIndex >= browserHistory.length - 1;
  }

  function renderDefaultPortal() {
    const portalHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: #000044; color: #ffff00; font-family: "Courier New", monospace; text-align: center; margin: 0; padding: 16px; }
  marquee { background: #ff00ff; color: #ffffff; font-weight: bold; padding: 4px; font-size: 14px; border: 2px ridge #00ffff; }
  h1 { color: #00ffff; text-shadow: 2px 2px #ff00ff; margin: 12px 0 4px 0; font-size: 24px; }
  .sub { color: #00ff00; font-size: 12px; margin-bottom: 14px; }
  table { width: 94%; margin: 0 auto; border: 3px ridge #c0c0c0; background: #001a33; border-collapse: collapse; }
  td { border: 2px inset #808080; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; color: #ffffff; }
  a { color: #00ffff; font-weight: bold; text-decoration: underline; cursor: pointer; }
  a:hover { color: #ff00ff; background: #ffff00; }
  .counter { display: inline-block; margin-top: 14px; background: #000; color: #00ff00; border: 2px inset #808080; padding: 4px 10px; font-weight: bold; letter-spacing: 3px; }
</style>
</head>
<body>
  <marquee>★ WELCOME TO THE 1996 GEOCITIES AI CYBER-PORTAL ★ CLICK ANY LINK OR TYPE ANY URL ABOVE TO GENERATE A LIVE 90s WEBSITE! ★</marquee>
  <h1>🌐 NETSCAPE GEMINI 95 DIRECTORY</h1>
  <div class="sub">Surfing at 28,800 bps · Yahoo! / Magellan 1996 Hotlist</div>
  <table>
    <tr>
      <td width="50%">
        <b>🚀 COOL 1996 SITES OF THE DAY</b><br><br>
        • <a href="https://www.cybermall1996.com">CyberMall 1996 Virtual Shopping</a><br>
        • <a href="https://www.area51-ufos-1995.org">Area 51 Declassified UFO Photos</a><br>
        • <a href="https://www.pizzanet-95.com">PizzaNet: Order Pepperoni Over TCP/IP</a><br>
        • <a href="https://www.nintendo-ultra64-rumors.net">Project Reality / Ultra 64 Secrets</a>
      </td>
      <td width="50%">
        <b>🕹️ WEBRINGS &amp; PERSONAL HOMEPAGES</b><br><br>
        • <a href="https://www.xfiles-mulder-truth.org">The X-Files Trust No One Shrine</a><br>
        • <a href="https://www.90s-tamagotchi-hospital.jp">Tamagotchi Care &amp; Secret Evolutions</a><br>
        • <a href="https://www.y2k-millennium-bug.com">Y2K Millennium Bug Survival Bunker</a><br>
        • <a href="https://www.rad-skateboards-1995.com">X-Games 1995 Skate &amp; Rollerblade Zine</a>
      </td>
    </tr>
  </table>
  <div class="counter">VISITOR #0095421</div>
</body>
</html>`;
    iframe.srcdoc = injectShimIntoHtml(portalHtml, buildHostStorageAndNavigationShimScript());
  }

  async function navigateToUrl(rawUrl: string, pushHistory = true): Promise<void> {
    let url = rawUrl.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url.replace(/\s+/g, '-');
    }

    let domain = url;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      domain = url.replace(/^https?:\/\//, '');
    }

    if (pushHistory) {
      browserHistory.splice(browserHistoryIndex + 1);
      browserHistory.push(url);
      browserHistoryIndex = browserHistory.length - 1;
      updateNavButtons();
    }

    addressBar.value = url;
    if (statusText) statusText.textContent = `Dialing ${domain} via 28.8k modem...`;

    loadingEl.innerHTML = `
      <div style="border:2px outset #fff; background:#c0c0c0; padding:16px; max-width:340px; box-shadow:3px 3px 0 #000;">
        <div style="background:#000080; color:#fff; font-weight:bold; padding:3px 6px; margin-bottom:10px; font-size:12px;">
          📞 Dial-Up Networking — 28,800 bps
        </div>
        <p style="margin:6px 0; font-size:12px; color:#000;">Connecting to host: <b>${domain.replace(/[<>&"]/g, '')}</b></p>
        <p style="margin:4px 0; font-size:11px; color:#333;">Synthesizing 1996 HTML3.2 tables, marquees &amp; retro SVG art...</p>
      </div>
    `;
    loadingEl.style.display = 'flex';
    sfx.playWindowOpen();

    try {
      if (!geminiInstance) {
        const ok = await initializeGeminiIfNeeded('initAiBrowser');
        if (!ok) {
          loadingEl.style.display = 'none';
          return;
        }
      }

      const websitePrompt = `Create a complete, self-contained, gloriously authentic 1996 GeoCities / Web 1.0 HTML webpage for the URL "${url}" (topic/domain: "${domain}").
Requirements:
- Return ONLY raw valid HTML starting with <!DOCTYPE html> (no markdown code fences).
- Include vivid 1990s web design: high-contrast patterned or starry/neon styling, HTML tables with ridge/outset borders, <marquee>, retro badges, a visitor hit counter, a fake 1996 guestbook or interactive poll with working inline JS buttons, and 4-6 clickable <a href="https://..."> links to fun related 90s pages.
- Include at least 2 rich custom inline <svg> retro pixel-art / vector illustrations directly in the page that match "${domain}".
- Make the writing funny, nostalgic, and packed with 1995-1996 internet culture.`;

      const result = await geminiInstance.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: websitePrompt,
      });

      let htmlContent = (result.text || '').replace(/```html|```/gi, '').trim();
      if (!htmlContent.toLowerCase().includes('<html')) {
        htmlContent = `<!DOCTYPE html><html><head><title>${domain}</title></head><body style="background:#000033;color:#00ff00;font-family:monospace;padding:16px;"><marquee>Welcome to ${domain}</marquee><h1>${domain}</h1><div>${htmlContent}</div></body></html>`;
      }

      htmlContent = injectShimIntoHtml(htmlContent, buildHostStorageAndNavigationShimScript());
      iframe.srcdoc = htmlContent;
      if (statusText) statusText.textContent = `Document: Done (${domain})`;
    } catch (e: any) {
      const safeMsg = String(e?.message || e || 'Unknown error').replace(/[<>&]/g, '');
      iframe.srcdoc = `<html><body style="font-family:monospace;background:#c0c0c0;padding:20px;"><h2>Netscape 95 Error</h2><p>${safeMsg}</p></body></html>`;
      if (statusText) statusText.textContent = 'Error loading page.';
    } finally {
      loadingEl.style.display = 'none';
    }
  }

  navigateBrowserGlobal = navigateToUrl;

  goButton.addEventListener('click', () => navigateToUrl(addressBar.value, true));
  addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateToUrl(addressBar.value, true);
  });
  backBtn?.addEventListener('click', () => {
    if (browserHistoryIndex > 0) {
      browserHistoryIndex--;
      updateNavButtons();
      navigateToUrl(browserHistory[browserHistoryIndex], false);
    }
  });
  forwardBtn?.addEventListener('click', () => {
    if (browserHistoryIndex < browserHistory.length - 1) {
      browserHistoryIndex++;
      updateNavButtons();
      navigateToUrl(browserHistory[browserHistoryIndex], false);
    }
  });
  reloadBtn?.addEventListener('click', () => navigateToUrl(addressBar.value, false));
  homeBtn?.addEventListener('click', () => {
    sfx.playClick();
    renderDefaultPortal();
    if (statusText) statusText.textContent = 'Loaded GeoCities 1996 Home Portal.';
  });

  windowElement.querySelectorAll('.bookmark-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetUrl = (btn as HTMLElement).dataset.url;
      if (targetUrl) navigateToUrl(targetUrl, true);
    });
  });

  renderDefaultPortal();
}

// --- 3. GEMNOTES (AI Retro Word Processor) ---
function initNotepadStory(windowElement: HTMLDivElement): void {
  if (initializedApps.has('notepad')) return;
  initializedApps.add('notepad');

  const textarea = windowElement.querySelector('.notepad-textarea') as HTMLTextAreaElement;
  const storyButton = windowElement.querySelector('.notepad-story-button') as HTMLButtonElement;
  const continueBtn = windowElement.querySelector('#notepad-continue-btn') as HTMLButtonElement;
  const zineBtn = windowElement.querySelector('#notepad-90s-btn') as HTMLButtonElement;
  const asciiBtn = windowElement.querySelector('#notepad-ascii-btn') as HTMLButtonElement;
  const newBtn = windowElement.querySelector('#notepad-new-btn') as HTMLButtonElement;
  const saveBtn = windowElement.querySelector('#notepad-save-btn') as HTMLButtonElement;
  const wordCountEl = document.getElementById('notepad-word-count');
  const titleEl = document.getElementById('notepad-window-title');

  if (!textarea) return;

  const updateCounts = () => {
    const val = textarea.value.trim();
    const words = val ? val.split(/\s+/).length : 0;
    if (wordCountEl) wordCountEl.textContent = `${words} words · ${textarea.value.length} chars`;
  };
  textarea.addEventListener('input', updateCounts);

  newBtn?.addEventListener('click', () => {
    sfx.playClick();
    textarea.value = '';
    if (titleEl) titleEl.textContent = 'GemNotes — Untitled.txt';
    updateCounts();
  });

  saveBtn?.addEventListener('click', () => {
    sfx.playClick();
    const fileName = `GEMNOTE_${Math.floor(100 + Math.random() * 900)}.TXT`;
    virtualFileSystem.push({
      name: fileName,
      type: 'text',
      parent: 'C:\\Documents',
      content: textarea.value,
    });
    if (titleEl) titleEl.textContent = `GemNotes — ${fileName}`;
    if (openApps.has('myComputer')) renderExplorerFolder(currentExplorerPath);
    showOsDialog(`Saved "${fileName}" to C:\\Documents! You can open it anytime from My Gemtop.`, 'GemNotes Saved');
  });

  async function runNotepadAi(prompt: string, btn: HTMLButtonElement, label: string) {
    sfx.playClick();
    btn.disabled = true;
    btn.textContent = '⏳ Working...';
    const baseText = textarea.value ? textarea.value + '\n\n' : '';
    textarea.value = baseText + '[Synthesizing via Gemini 95 Neural Co-Processor...]\n';
    try {
      if (!geminiInstance && !(await initializeGeminiIfNeeded('GemNotes'))) {
        throw new Error('Failed to initialize Gemini API.');
      }
      const stream = await geminiInstance.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      });
      textarea.value = baseText;
      for await (const chunk of stream) {
        textarea.value += chunk.text || '';
        textarea.scrollTop = textarea.scrollHeight;
        updateCounts();
      }
      textarea.value += '\n';
    } catch (err: any) {
      textarea.value = baseText + `\n[Error: ${err.message || 'AI request failed'}]\n`;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
      updateCounts();
    }
  }

  storyButton?.addEventListener('click', () =>
    runNotepadAi(
      'Write a captivating 220-word 1990s cyber-thriller or nostalgic sci-fi short story with a clever twist ending.',
      storyButton,
      '✨ Twist Story',
    ),
  );

  continueBtn?.addEventListener('click', () =>
    runNotepadAi(
      `Continue writing the following text seamlessly for another 150 words:\n\n${textarea.value || 'The CRT monitor flickered at 3:14 AM as the 56k modem connected to an unlisted BBS...'}`,
      continueBtn,
      '✍️ Continue',
    ),
  );

  zineBtn?.addEventListener('click', () =>
    runNotepadAi(
      `Rewrite or expand the following topic into a radical 1995 underground cyber-zine editorial with ASCII dividers:\n\n${textarea.value || 'Why 1995 is the peak of personal computing'}`,
      zineBtn,
      '🕶️ 90s Zine',
    ),
  );

  asciiBtn?.addEventListener('click', () =>
    runNotepadAi(
      `Create an awesome detailed retro 1995 BBS ASCII art banner and illustration of a retro computer, robot, or cyberpunk skyline. Output plain text ASCII art only.`,
      asciiBtn,
      '🎨 ASCII Art',
    ),
  );
}

// --- 4. GEMPAINT (MS Paint 95 + AI Art Studio) ---
async function critiquePaintDrawing(): Promise<void> {
  const paintWindow = document.getElementById('paint') as HTMLDivElement | null;
  if (!paintWindow || paintWindow.style.display === 'none') return;
  const canvas = paintWindow.querySelector('#paint-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  if (!geminiInstance && !(await initializeGeminiIfNeeded('critiquePaintDrawing'))) return;

  try {
    if (assistantBubble) assistantBubble.textContent = '🧐 Inspecting pixels...';
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = imageDataUrl.split(',')[1];
    if (!base64Data) return;

    const prompt = 'You are Clippy/Robot, a witty 1995 MS Paint art critic. Critique this canvas drawing with playful 90s humor in 1-2 short sentences.';
    const imagePart = { inlineData: { data: base64Data, mimeType: 'image/jpeg' } };
    const result = await geminiInstance.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts: [imagePart, { text: prompt }] },
    });
    const critique = result?.text?.trim() || 'Magnificent pixels! Louvre 1995 material.';
    if (assistantBubble) assistantBubble.textContent = critique;
  } catch (error: any) {
    if (assistantBubble) assistantBubble.textContent = `Art circuits busy! Keep drawing!`;
  }
}

function initSimplePaintApp(windowElement: HTMLDivElement): void {
  if (initializedApps.has('paint')) return;
  initializedApps.add('paint');

  const canvas = windowElement.querySelector('#paint-canvas') as HTMLCanvasElement;
  const toolbar = windowElement.querySelector('.paint-toolbar') as HTMLDivElement;
  const colorsBar = windowElement.querySelector('.paint-Colors-bar') as HTMLDivElement;
  const contentArea = windowElement.querySelector('.window-content') as HTMLDivElement;
  const colorSwatches = windowElement.querySelectorAll('.paint-color-swatch') as NodeListOf<HTMLButtonElement>;
  const sizeButtons = windowElement.querySelectorAll('.paint-size-button') as NodeListOf<HTMLButtonElement>;
  const toolButtons = windowElement.querySelectorAll('.paint-tool-btn') as NodeListOf<HTMLButtonElement>;
  const clearButton = windowElement.querySelector('.paint-clear-button') as HTMLButtonElement;
  const undoButton = windowElement.querySelector('#paint-undo-btn') as HTMLButtonElement;
  const saveButton = windowElement.querySelector('#paint-save-btn') as HTMLButtonElement;
  const critiqueNowBtn = windowElement.querySelector('#paint-critique-now-btn') as HTMLButtonElement;
  const promptBtn = windowElement.querySelector('#paint-prompt-btn') as HTMLButtonElement;
  const challengeBanner = document.getElementById('paint-challenge-banner');

  if (!canvas || !toolbar || !contentArea || !clearButton) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let isDrawing = false;
  let startX = 0;
  let startY = 0;
  let currentTool = 'brush';
  let currentStrokeStyle = '#000000';
  let currentLineWidth = 2;
  const undoStack: string[] = [];
  let shapeSnapshot: ImageData | null = null;

  function saveUndoSnapshot() {
    if (canvas.width <= 1 || canvas.height <= 1) return;
    undoStack.push(canvas.toDataURL());
    if (undoStack.length > 15) undoStack.shift();
  }

  function resizeCanvas() {
    const rect = contentArea.getBoundingClientRect();
    const topBarsHeight = (toolbar?.offsetHeight || 30) + (colorsBar?.offsetHeight || 28);
    const newWidth = Math.max(1, Math.floor(rect.width));
    const newHeight = Math.max(1, Math.floor(rect.height - topBarsHeight));
    if (canvas.width === newWidth && canvas.height === newHeight) return;

    const prevData = canvas.width > 1 && canvas.height > 1 ? canvas.toDataURL() : null;
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx!.fillStyle = '#FFFFFF';
    ctx!.fillRect(0, 0, canvas.width, canvas.height);
    if (prevData) {
      const img = new Image();
      img.onload = () => ctx!.drawImage(img, 0, 0);
      img.src = prevData;
    }
    ctx!.strokeStyle = currentStrokeStyle;
    ctx!.lineWidth = currentLineWidth;
    ctx!.lineJoin = 'round';
    ctx!.lineCap = 'round';
  }

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(contentArea);
  paintResizeObserverMap.set(contentArea, resizeObserver);
  resizeCanvas();

  function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  function floodFill(x: number, y: number, fillHex: string) {
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx!.getImageData(0, 0, w, h);
    const data = imgData.data;
    const [fr, fg, fb] = hexToRgb(fillHex);
    const startIdx = (Math.floor(y) * w + Math.floor(x)) * 4;
    const sr = data[startIdx];
    const sg = data[startIdx + 1];
    const sb = data[startIdx + 2];
    if (sr === fr && sg === fg && sb === fb) return;

    const stack: [number, number][] = [[Math.floor(x), Math.floor(y)]];
    const visited = new Uint8Array(w * h);
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const pIdx = cy * w + cx;
      if (visited[pIdx]) continue;
      const idx = pIdx * 4;
      if (Math.abs(data[idx] - sr) <= 20 && Math.abs(data[idx + 1] - sg) <= 20 && Math.abs(data[idx + 2] - sb) <= 20) {
        visited[pIdx] = 1;
        data[idx] = fr;
        data[idx + 1] = fg;
        data[idx + 2] = fb;
        data[idx + 3] = 255;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
    }
    ctx!.putImageData(imgData, 0, 0);
  }

  function getPos(e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    const pos = getPos(e);
    saveUndoSnapshot();

    if (currentTool === 'fill') {
      floodFill(pos.x, pos.y, currentStrokeStyle);
      return;
    }

    isDrawing = true;
    startX = pos.x;
    startY = pos.y;
    ctx!.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentStrokeStyle;
    ctx!.fillStyle = currentStrokeStyle;
    ctx!.lineWidth = currentTool === 'eraser' ? Math.max(12, currentLineWidth * 2) : currentLineWidth;
    ctx!.lineJoin = 'round';
    ctx!.lineCap = 'round';

    if (currentTool === 'line' || currentTool === 'rect' || currentTool === 'circle') {
      shapeSnapshot = ctx!.getImageData(0, 0, canvas.width, canvas.height);
    } else if (currentTool === 'spray') {
      sprayParticles(pos.x, pos.y);
    } else {
      ctx!.beginPath();
      ctx!.moveTo(startX, startY);
    }
  }

  function sprayParticles(x: number, y: number) {
    const radius = Math.max(8, currentLineWidth * 2);
    ctx!.fillStyle = currentStrokeStyle;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      ctx!.fillRect(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 1.5, 1.5);
    }
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    if (currentTool === 'spray') {
      sprayParticles(pos.x, pos.y);
    } else if (currentTool === 'line' && shapeSnapshot) {
      ctx!.putImageData(shapeSnapshot, 0, 0);
      ctx!.beginPath();
      ctx!.moveTo(startX, startY);
      ctx!.lineTo(pos.x, pos.y);
      ctx!.stroke();
    } else if (currentTool === 'rect' && shapeSnapshot) {
      ctx!.putImageData(shapeSnapshot, 0, 0);
      ctx!.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
    } else if (currentTool === 'circle' && shapeSnapshot) {
      ctx!.putImageData(shapeSnapshot, 0, 0);
      const rx = Math.abs(pos.x - startX) / 2;
      const ry = Math.abs(pos.y - startY) / 2;
      const cx = startX + (pos.x - startX) / 2;
      const cy = startY + (pos.y - startY) / 2;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx!.stroke();
    } else {
      ctx!.lineTo(pos.x, pos.y);
      ctx!.stroke();
    }
  }

  function stopDrawing() {
    isDrawing = false;
    shapeSnapshot = null;
  }

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  toolButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      currentTool = btn.dataset.tool || 'brush';
      toolButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  colorSwatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      sfx.playClick();
      currentStrokeStyle = swatch.dataset.color || '#000000';
      colorSwatches.forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      if (currentTool === 'eraser') {
        currentTool = 'brush';
        toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === 'brush'));
      }
    });
  });

  sizeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      sfx.playClick();
      currentLineWidth = parseInt(button.dataset.size || '2', 10);
      sizeButtons.forEach((s) => s.classList.remove('active'));
      button.classList.add('active');
    });
  });

  undoButton?.addEventListener('click', () => {
    sfx.playClick();
    const last = undoStack.pop();
    if (!last) return;
    const img = new Image();
    img.onload = () => {
      ctx!.fillStyle = '#FFFFFF';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);
    };
    img.src = last;
  });

  clearButton.addEventListener('click', () => {
    sfx.playClick();
    saveUndoSnapshot();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  saveButton?.addEventListener('click', () => {
    sfx.playClick();
    const fileName = `ART_${Math.floor(100 + Math.random() * 900)}.PNG`;
    virtualFileSystem.push({
      name: fileName,
      type: 'image',
      parent: 'C:\\Pictures',
      content: canvas.toDataURL('image/png'),
    });
    if (openApps.has('myComputer')) renderExplorerFolder(currentExplorerPath);
    showOsDialog(`Saved "${fileName}" to C:\\Pictures! Open My Gemtop to view it anytime.`, 'GemPaint Saved');
  });

  critiqueNowBtn?.addEventListener('click', () => {
    sfx.playClick();
    critiquePaintDrawing();
  });

  const funChallenges = [
    'Challenge: Draw a 1995 Alien UFO over a pyramid!',
    'Challenge: Draw a Tamagotchi having a bad hair day!',
    'Challenge: Draw a cybernetic pizza slice in cyberspace!',
    'Challenge: Draw a Windows 95 PC monitor with wings!',
    'Challenge: Draw a dinosaur skateboarding in 1996!',
  ];
  promptBtn?.addEventListener('click', () => {
    sfx.playClick();
    const pick = funChallenges[Math.floor(Math.random() * funChallenges.length)];
    if (challengeBanner) challengeBanner.textContent = pick;
    if (assistantBubble) assistantBubble.textContent = pick;
  });
}

// --- 6. GEMINI AIM (1995 Instant Messenger Multi-Buddy AI Chat) ---
const AIM_PERSONAS: Record<string, { screenName: string; greeting: string; instruction: string }> = {
  smarterchild: {
    screenName: 'SmarterChild_95',
    greeting: 'Hey there!! :-D Welcome to AIM 1995! Ask me trivia, 90s movies, science, or anything!',
    instruction:
      'You are SmarterChild_95 on AOL Instant Messenger in 1995. Be enthusiastic, concise (2-4 sentences), use classic 90s ASCII emoticons like :-D, ;-), :-P, and share fun facts or witty banter.',
  },
  zerocool: {
    screenName: 'ZeroCool_1337',
    greeting: '>>> CONNECTION ESTABLISHED [28.8k]. Mess with the best, die like the rest. What is on your mind?',
    instruction:
      'You are ZeroCool_1337, a legendary 1995 cyberpunk hacker from the movie Hackers. Speak with cool 90s phreaker/élite slang ("hack the planet", "Gibson mainframe", "28.8 bps modem"), keep responses punchy (2-4 sentences) and helpful.',
  },
  clippy: {
    screenName: 'Clippy_Pro',
    greeting: 'It looks like you are trying to chat in 1995! Would you like help writing a letter or conquering the world?',
    instruction:
      'You are Clippy, the overly eager 1990s office paperclip assistant. Start responses with "It looks like you\'re..." or similar charmingly persistent office humor. Keep it to 2-3 witty sentences.',
  },
  techsupport: {
    screenName: 'Win95_Guru',
    greeting: 'Have you tried blowing into the cartridge or checking your IRQ jumper settings? Ask me anything!',
    instruction:
      'You are a nostalgic 1995 PC hardware & Windows 95 guru who loves SoundBlaster 16 cards, CRT monitors, Doom wads, and 16MB RAM upgrades. Keep answers helpful, humorous, and 2-4 sentences.',
  },
};

function initGeminiChat(windowElement: HTMLDivElement): void {
  if (initializedApps.has('gemini')) return;
  initializedApps.add('gemini');

  const historyDiv = windowElement.querySelector('.gemini-chat-history') as HTMLDivElement;
  const inputEl = windowElement.querySelector('.gemini-chat-input') as HTMLInputElement;
  const sendButton = windowElement.querySelector('.gemini-chat-send') as HTMLButtonElement;
  const personaSelect = windowElement.querySelector('#aim-persona-select') as HTMLSelectElement;
  const clearBtn = windowElement.querySelector('#aim-clear-btn') as HTMLButtonElement;
  const exportBtn = windowElement.querySelector('#aim-export-btn') as HTMLButtonElement;

  if (!historyDiv || !inputEl || !sendButton) return;

  let currentPersonaKey = personaSelect?.value || 'smarterchild';
  let chatHistory: { role: string; parts: { text: string }[] }[] = [];

  function addChatMessage(text: string, className = '') {
    const p = document.createElement('p');
    if (className) p.classList.add(className);
    p.textContent = text;
    historyDiv.appendChild(p);
    historyDiv.scrollTop = historyDiv.scrollHeight;
  }

  function resetConversation() {
    historyDiv.innerHTML = '';
    chatHistory = [];
    const persona = AIM_PERSONAS[currentPersonaKey] || AIM_PERSONAS.smarterchild;
    addChatMessage(`*** ${persona.screenName} signed on at ${new Date().toLocaleTimeString()} ***`, 'system-message');
    addChatMessage(`${persona.screenName}: ${persona.greeting}`, 'gemini-message');
  }

  personaSelect?.addEventListener('change', () => {
    sfx.playClick();
    currentPersonaKey = personaSelect.value;
    resetConversation();
  });

  clearBtn?.addEventListener('click', () => {
    sfx.playClick();
    resetConversation();
  });

  exportBtn?.addEventListener('click', () => {
    sfx.playClick();
    const transcript = Array.from(historyDiv.querySelectorAll('p'))
      .map((p) => p.textContent)
      .join('\n');
    const fname = `AIM_CHAT_${Math.floor(100 + Math.random() * 900)}.TXT`;
    virtualFileSystem.push({ name: fname, type: 'text', parent: 'C:\\Documents', content: transcript });
    openTextFileInNotepad(fname, transcript);
  });

  const sendMessage = async (overrideText?: string) => {
    const message = (overrideText ?? inputEl.value).trim();
    if (!message) return;

    sfx.playClick();
    if (!overrideText) inputEl.value = '';
    addChatMessage(`You: ${message}`, 'user-message');
    inputEl.disabled = true;
    sendButton.disabled = true;

    try {
      if (!geminiInstance && !(await initializeGeminiIfNeeded('initGeminiChat'))) {
        addChatMessage('Error: Failed to initialize AI.', 'error-message');
        return;
      }
      const persona = AIM_PERSONAS[currentPersonaKey] || AIM_PERSONAS.smarterchild;
      const chat = geminiInstance.chats.create({
        model: 'gemini-4-hydrogen',
        config: { systemInstruction: persona.instruction },
        history: chatHistory,
      });

      const result = await chat.sendMessageStream({ message });
      addChatMessage(`${persona.screenName}: `, 'gemini-message');
      const lastMessageElement = historyDiv.lastElementChild as HTMLParagraphElement | null;
      let fullReply = '';
      for await (const chunk of result) {
        const chunkText = chunk.text || '';
        fullReply += chunkText;
        if (lastMessageElement) {
          lastMessageElement.textContent = `${persona.screenName}: ${fullReply}`;
          historyDiv.scrollTop = historyDiv.scrollHeight;
        }
      }
      chatHistory.push({ role: 'user', parts: [{ text: message }] });
      chatHistory.push({ role: 'model', parts: [{ text: fullReply }] });
      sfx.playAimReceive();
    } catch (error: any) {
      addChatMessage(`System Error: ${error.message || 'Connection dropped.'}`, 'error-message');
    } finally {
      inputEl.disabled = false;
      sendButton.disabled = false;
      inputEl.focus();
    }
  };

  sendButton.onclick = () => sendMessage();
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  windowElement.querySelectorAll('.aim-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = (chip as HTMLElement).dataset.prompt;
      if (prompt) sendMessage(prompt);
    });
  });

  resetConversation();
}

// --- 7. GEMSWEEPER (Minesweeper Deluxe + AI Tactical Advisor) ---
type MinesweeperCell = {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  element: HTMLDivElement;
  row: number;
  col: number;
};

let minesweeperTimerInterval: number | null = null;
let minesweeperTimeElapsed = 0;
let minesweeperFlagsPlaced = 0;
let minesweeperGameOver = false;
let minesweeperMineCount = 10;
let minesweeperGridSize = { rows: 9, cols: 9 };
let minesweeperFirstClick = true;

function initMinesweeperGame(windowElement: HTMLDivElement): void {
  if (initializedApps.has('minesweeper')) return;
  initializedApps.add('minesweeper');

  const boardElement = windowElement.querySelector('#minesweeper-board') as HTMLDivElement;
  const flagCountElement = windowElement.querySelector('.minesweeper-flag-count') as HTMLDivElement;
  const timerElement = windowElement.querySelector('.minesweeper-timer') as HTMLDivElement;
  const resetButton = windowElement.querySelector('.minesweeper-reset-button') as HTMLButtonElement;
  const hintButton = windowElement.querySelector('.minesweeper-hint-button') as HTMLButtonElement;
  const commentaryElement = windowElement.querySelector('.minesweeper-commentary') as HTMLDivElement;
  const diffButtons = windowElement.querySelectorAll('.ms-diff-btn') as NodeListOf<HTMLButtonElement>;

  if (!boardElement || !flagCountElement || !timerElement || !resetButton || !hintButton || !commentaryElement) return;
  let grid: MinesweeperCell[][] = [];

  function resetGame() {
    if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
    minesweeperTimerInterval = null;
    minesweeperTimeElapsed = 0;
    minesweeperFlagsPlaced = 0;
    minesweeperGameOver = false;
    minesweeperFirstClick = true;
    timerElement.textContent = `⏱️ 000`;
    flagCountElement.textContent = `🚩 ${String(minesweeperMineCount).padStart(2, '0')}`;
    resetButton.textContent = '🙂';
    commentaryElement.textContent = 'First click is always safe!';
    createGrid();
  }

  function createGrid() {
    boardElement.innerHTML = '';
    grid = [];
    boardElement.style.gridTemplateColumns = `repeat(${minesweeperGridSize.cols}, 22px)`;
    boardElement.style.gridTemplateRows = `repeat(${minesweeperGridSize.rows}, 22px)`;
    for (let r = 0; r < minesweeperGridSize.rows; r++) {
      const row: MinesweeperCell[] = [];
      for (let c = 0; c < minesweeperGridSize.cols; c++) {
        const cellElement = document.createElement('div');
        cellElement.classList.add('minesweeper-cell');
        const cellData: MinesweeperCell = {
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          adjacentMines: 0,
          element: cellElement,
          row: r,
          col: c,
        };
        cellElement.addEventListener('click', () => handleCellClick(cellData));
        cellElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          handleCellRightClick(cellData);
        });
        row.push(cellData);
        boardElement.appendChild(cellElement);
      }
      grid.push(row);
    }
  }

  function placeMines(firstClickRow: number, firstClickCol: number) {
    let minesPlaced = 0;
    while (minesPlaced < minesweeperMineCount) {
      const r = Math.floor(Math.random() * minesweeperGridSize.rows);
      const c = Math.floor(Math.random() * minesweeperGridSize.cols);
      if ((Math.abs(r - firstClickRow) <= 1 && Math.abs(c - firstClickCol) <= 1) || grid[r][c].isMine) continue;
      grid[r][c].isMine = true;
      minesPlaced++;
    }
    for (let r = 0; r < minesweeperGridSize.rows; r++) {
      for (let c = 0; c < minesweeperGridSize.cols; c++) {
        if (!grid[r][c].isMine) grid[r][c].adjacentMines = countAdjacentMines(r, c);
      }
    }
  }

  function countAdjacentMines(row: number, col: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < minesweeperGridSize.rows && nc >= 0 && nc < minesweeperGridSize.cols && grid[nr][nc].isMine) {
          count++;
        }
      }
    }
    return count;
  }

  function handleCellClick(cell: MinesweeperCell) {
    if (minesweeperGameOver || cell.isFlagged) return;
    sfx.playClick();
    grid.forEach((r) => r.forEach((c) => c.element.classList.remove('hint-glow')));

    // Chord clicking on already-revealed number cell
    if (cell.isRevealed && cell.adjacentMines > 0) {
      let adjFlags = 0;
      const hiddenNeighbors: MinesweeperCell[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr >= 0 && nr < minesweeperGridSize.rows && nc >= 0 && nc < minesweeperGridSize.cols) {
            const n = grid[nr][nc];
            if (n.isFlagged) adjFlags++;
            else if (!n.isRevealed) hiddenNeighbors.push(n);
          }
        }
      }
      if (adjFlags === cell.adjacentMines) {
        hiddenNeighbors.forEach((n) => {
          if (n.isMine) gameOver(n);
          else revealCell(n);
        });
        checkWinCondition();
      }
      return;
    }

    if (cell.isRevealed) return;
    if (minesweeperFirstClick && !minesweeperTimerInterval) {
      placeMines(cell.row, cell.col);
      minesweeperFirstClick = false;
      startTimer();
    }
    if (cell.isMine) gameOver(cell);
    else {
      revealCell(cell);
      checkWinCondition();
    }
  }

  function handleCellRightClick(cell: MinesweeperCell) {
    if (minesweeperGameOver || cell.isRevealed || (minesweeperFirstClick && !minesweeperTimerInterval)) return;
    sfx.playClick();
    cell.isFlagged = !cell.isFlagged;
    cell.element.textContent = cell.isFlagged ? '🚩' : '';
    minesweeperFlagsPlaced += cell.isFlagged ? 1 : -1;
    updateFlagCount();
    checkWinCondition();
  }

  function revealCell(cell: MinesweeperCell) {
    if (cell.isRevealed || cell.isFlagged || cell.isMine) return;
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    cell.element.textContent = '';
    if (cell.adjacentMines > 0) {
      cell.element.textContent = cell.adjacentMines.toString();
      cell.element.dataset.number = cell.adjacentMines.toString();
    } else {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = cell.row + dr;
          const nc = cell.col + dc;
          if (nr >= 0 && nr < minesweeperGridSize.rows && nc >= 0 && nc < minesweeperGridSize.cols) {
            const neighbor = grid[nr][nc];
            if (!neighbor.isRevealed && !neighbor.isFlagged) revealCell(neighbor);
          }
        }
      }
    }
  }

  function startTimer() {
    if (minesweeperTimerInterval) return;
    minesweeperTimeElapsed = 0;
    minesweeperTimerInterval = window.setInterval(() => {
      minesweeperTimeElapsed++;
      timerElement.textContent = `⏱️ ${String(Math.min(999, minesweeperTimeElapsed)).padStart(3, '0')}`;
    }, 1000);
  }

  function updateFlagCount() {
    flagCountElement.textContent = `🚩 ${String(minesweeperMineCount - minesweeperFlagsPlaced).padStart(2, '0')}`;
  }

  function gameOver(clickedMine: MinesweeperCell) {
    minesweeperGameOver = true;
    sfx.playChordError();
    if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
    minesweeperTimerInterval = null;
    resetButton.textContent = '😵';
    commentaryElement.textContent = 'BOOM! Click 🙂 to play again.';
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.isMine) {
          cell.element.classList.add('mine', 'revealed');
          cell.element.textContent = '💣';
        }
        if (!cell.isMine && cell.isFlagged) cell.element.textContent = '❌';
      }),
    );
    clickedMine.element.classList.add('exploded');
    clickedMine.element.textContent = '💥';
  }

  function checkWinCondition() {
    if (minesweeperGameOver) return;
    let revealedCount = 0;
    grid.forEach((row) =>
      row.forEach((cell) => {
        if (cell.isRevealed && !cell.isMine) revealedCount++;
      }),
    );
    const totalNonMineCells = minesweeperGridSize.rows * minesweeperGridSize.cols - minesweeperMineCount;
    if (revealedCount === totalNonMineCells) {
      minesweeperGameOver = true;
      sfx.playStartupChime();
      if (minesweeperTimerInterval) clearInterval(minesweeperTimerInterval);
      minesweeperTimerInterval = null;
      resetButton.textContent = '😎';
      commentaryElement.textContent = `Cleared in ${minesweeperTimeElapsed}s! Legendary!`;
      grid.forEach((row) =>
        row.forEach((cell) => {
          if (cell.isMine && !cell.isFlagged) {
            cell.isFlagged = true;
            cell.element.textContent = '🚩';
          }
        }),
      );
    }
  }

  function getBoardStateAsText(): string {
    let boardString = `Rows:${minesweeperGridSize.rows}, Cols:${minesweeperGridSize.cols}, MinesLeft:${minesweeperMineCount - minesweeperFlagsPlaced}\n`;
    grid.forEach((row, rIdx) => {
      boardString += `R${rIdx}: `;
      row.forEach((cell) => {
        if (cell.isFlagged) boardString += 'F ';
        else if (!cell.isRevealed) boardString += '? ';
        else if (cell.adjacentMines > 0) boardString += `${cell.adjacentMines} `;
        else boardString += '0 ';
      });
      boardString += '\n';
    });
    return boardString;
  }

  async function getAiHint() {
    sfx.playClick();
    if (minesweeperGameOver || minesweeperFirstClick) {
      commentaryElement.textContent = 'Click any square first — 1st click is guaranteed safe!';
      return;
    }
    hintButton.disabled = true;
    hintButton.textContent = '🤔 Analyzing...';
    commentaryElement.textContent = 'Scanning grid probabilities...';

    // Also highlight a safe unrevealed cell locally so the user gets immediate visual guidance
    const safeCells: MinesweeperCell[] = [];
    grid.forEach((row) =>
      row.forEach((c) => {
        if (!c.isMine && !c.isRevealed && !c.isFlagged) safeCells.push(c);
      }),
    );
    if (safeCells.length > 0) {
      const pick = safeCells[Math.floor(Math.random() * safeCells.length)];
      pick.element.classList.add('hint-glow');
    }

    try {
      if (!geminiInstance && !(await initializeGeminiIfNeeded('getAiHint'))) return;
      const prompt = `Minesweeper board (0-indexed rows/cols, ?=hidden, F=flag, 0-8=revealed):\n${getBoardStateAsText()}\nGive a 1-sentence tactical hint on where to look next.`;
      const result = await geminiInstance.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
      });
      commentaryElement.textContent = result?.text?.trim() || 'Highlighted a promising square in yellow!';
    } catch {
      commentaryElement.textContent = 'Highlighted a safe square on the board!';
    } finally {
      hintButton.disabled = false;
      hintButton.textContent = '💡 AI Tactical Hint';
    }
  }

  diffButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      diffButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      minesweeperGridSize = {
        rows: parseInt(btn.dataset.rows || '9', 10),
        cols: parseInt(btn.dataset.cols || '9', 10),
      };
      minesweeperMineCount = parseInt(btn.dataset.mines || '10', 10);
      resetGame();
    });
  });

  resetButton.addEventListener('click', () => {
    sfx.playClick();
    resetGame();
  });
  hintButton.addEventListener('click', getAiHint);
  resetGame();
}

// --- 9. GEMPLAYER (16-Bit Chiptune Synth + YouTube CRT TV) ---
let synthAudioCtx: AudioContext | null = null;
let synthIntervalId: number | null = null;
let synthAnimFrameId: number | null = null;
let synthIsPlaying = false;
let currentSynthTrack = 0;
let synthTempo = 120;
let synthStep = 0;

const SYNTH_TRACKS = [
  {
    title: 'Track 01: Canyon.mid (1995 FM Passport Remix)',
    notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 349.23, 440.0, 587.33, 440.0, 349.23],
    bass: [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 196.0, 196.0],
  },
  {
    title: 'Track 02: CyberWave 95 (Neon Arpeggio)',
    notes: [220.0, 261.63, 329.63, 440.0, 329.63, 261.63, 196.0, 246.94, 293.66, 392.0, 293.66, 246.94],
    bass: [110.0, 110.0, 98.0, 98.0, 87.31, 87.31, 98.0, 98.0],
  },
  {
    title: 'Track 03: DOOM Boss Riff (16-Bit Overdrive)',
    notes: [164.81, 164.81, 329.63, 164.81, 164.81, 293.66, 164.81, 164.81, 261.63, 164.81, 164.81, 246.94],
    bass: [82.41, 82.41, 82.41, 98.0, 82.41, 82.41, 87.31, 98.0],
  },
  {
    title: 'Track 04: Teal Desktop Dreams (Ambient Pad)',
    notes: [329.63, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0, 329.63],
    bass: [164.81, 130.81, 146.83, 110.0],
  },
];

function stopChiptuneSynth() {
  synthIsPlaying = false;
  if (synthIntervalId) {
    clearInterval(synthIntervalId);
    synthIntervalId = null;
  }
  const playBtn = document.getElementById('synth-play-toggle');
  if (playBtn) playBtn.textContent = '▶ Play Synth';
}

function startChiptuneSynth() {
  if (!synthAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    synthAudioCtx = new AudioCtx();
  }
  if (synthAudioCtx.state === 'suspended') synthAudioCtx.resume();
  if (synthIntervalId) clearInterval(synthIntervalId);

  synthIsPlaying = true;
  const playBtn = document.getElementById('synth-play-toggle');
  if (playBtn) playBtn.textContent = '⏸ Pause Synth';

  const stepDurationMs = Math.floor((60 / synthTempo / 2) * 1000);
  synthIntervalId = window.setInterval(() => {
    if (!synthAudioCtx || !synthIsPlaying) return;
    const track = SYNTH_TRACKS[currentSynthTrack] || SYNTH_TRACKS[0];
    const leadFreq = track.notes[synthStep % track.notes.length];
    const bassFreq = track.bass[Math.floor(synthStep / 2) % track.bass.length];

    const now = synthAudioCtx.currentTime;
    // Lead voice
    const osc = synthAudioCtx.createOscillator();
    const gain = synthAudioCtx.createGain();
    osc.type = currentSynthTrack === 2 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(leadFreq, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(synthAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    // Bass voice on even steps
    if (synthStep % 2 === 0) {
      const bOsc = synthAudioCtx.createOscillator();
      const bGain = synthAudioCtx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bGain.gain.setValueAtTime(0.07, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      bOsc.connect(bGain);
      bGain.connect(synthAudioCtx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.26);
    }
    synthStep++;
  }, stepDurationMs);
}

// @ts-ignore
const youtubePlayers: Record<string, any> = {};
let ytApiLoaded = false;
let ytApiLoadingPromise: Promise<void> | null = null;
const DEFAULT_YOUTUBE_VIDEO_ID = 'WXuK6gekU1Y';

function loadYouTubeApi(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  if (ytApiLoadingPromise) return ytApiLoadingPromise;

  ytApiLoadingPromise = new Promise((resolve, reject) => {
    // @ts-ignore
    if (window.YT && window.YT.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      ytApiLoadingPromise = null;
      reject(new Error('YouTube API script load failed'));
    };
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

    // @ts-ignore
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      ytApiLoadingPromise = null;
      resolve();
    };
    setTimeout(() => {
      if (!ytApiLoaded) {
        ytApiLoadingPromise = null;
        reject(new Error('YouTube API load timeout'));
      }
    }, 10000);
  });
  return ytApiLoadingPromise;
}

function getYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/;
  const match = urlOrId.match(regExp);
  return match && match[1] ? match[1] : null;
}

async function initMediaPlayer(windowElement: HTMLDivElement): Promise<void> {
  if (initializedApps.has('mediaPlayer')) return;
  initializedApps.add('mediaPlayer');

  const appName = windowElement.id;
  const tabSynth = windowElement.querySelector('#media-tab-synth') as HTMLButtonElement;
  const tabYt = windowElement.querySelector('#media-tab-yt') as HTMLButtonElement;
  const synthPanel = windowElement.querySelector('#media-synth-panel') as HTMLDivElement;
  const ytPanel = windowElement.querySelector('#media-yt-panel') as HTMLDivElement;
  const visCanvas = windowElement.querySelector('#synth-visualizer') as HTMLCanvasElement;
  const nowPlayingEl = windowElement.querySelector('#synth-now-playing');
  const bpmEl = windowElement.querySelector('#synth-bpm-display');
  const playToggleBtn = windowElement.querySelector('#synth-play-toggle') as HTMLButtonElement;
  const stopSynthBtn = windowElement.querySelector('#synth-stop-btn') as HTMLButtonElement;
  const tempoSlider = windowElement.querySelector('#synth-tempo') as HTMLInputElement;

  // Visualizer loop
  if (visCanvas) {
    const vCtx = visCanvas.getContext('2d');
    const bars = 28;
    const heights = new Array(bars).fill(6);
    const drawVis = () => {
      if (vCtx) {
        vCtx.fillStyle = '#050811';
        vCtx.fillRect(0, 0, visCanvas.width, visCanvas.height);
        // Retro grid lines
        vCtx.strokeStyle = 'rgba(0, 255, 102, 0.12)';
        for (let y = 0; y < visCanvas.height; y += 20) {
          vCtx.beginPath();
          vCtx.moveTo(0, y);
          vCtx.lineTo(visCanvas.width, y);
          vCtx.stroke();
        }
        const barW = Math.floor((visCanvas.width - 20) / bars);
        for (let i = 0; i < bars; i++) {
          if (synthIsPlaying) {
            const target = 15 + Math.abs(Math.sin((synthStep + i) * 0.55)) * (visCanvas.height - 35) * (0.5 + Math.random() * 0.5);
            heights[i] += (target - heights[i]) * 0.35;
          } else {
            heights[i] = Math.max(4, heights[i] * 0.9);
          }
          const h = heights[i];
          const x = 10 + i * barW;
          const y = visCanvas.height - h - 8;
          const grad = vCtx.createLinearGradient(0, y, 0, visCanvas.height);
          grad.addColorStop(0, '#ff00ff');
          grad.addColorStop(0.5, '#00ffff');
          grad.addColorStop(1, '#00ff66');
          vCtx.fillStyle = grad;
          vCtx.fillRect(x, y, barW - 3, h);
        }
      }
      synthAnimFrameId = requestAnimationFrame(drawVis);
    };
    if (!synthAnimFrameId) drawVis();
  }

  playToggleBtn?.addEventListener('click', () => {
    sfx.playClick();
    if (synthIsPlaying) stopChiptuneSynth();
    else startChiptuneSynth();
  });

  stopSynthBtn?.addEventListener('click', () => {
    sfx.playClick();
    stopChiptuneSynth();
    synthStep = 0;
  });

  tempoSlider?.addEventListener('input', () => {
    synthTempo = parseInt(tempoSlider.value, 10) || 120;
    if (bpmEl) bpmEl.textContent = `${synthTempo} BPM · STEREO`;
    if (synthIsPlaying) startChiptuneSynth();
  });

  windowElement.querySelectorAll('.synth-track-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      windowElement.querySelectorAll('.synth-track-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSynthTrack = parseInt((btn as HTMLElement).dataset.track || '0', 10);
      if (nowPlayingEl) nowPlayingEl.textContent = SYNTH_TRACKS[currentSynthTrack].title;
      synthStep = 0;
      startChiptuneSynth();
    });
  });

  // Mode switching
  tabSynth?.addEventListener('click', () => {
    sfx.playClick();
    tabSynth.classList.add('active');
    tabYt.classList.remove('active');
    synthPanel.style.display = 'flex';
    ytPanel.style.display = 'none';
  });

  let ytInitialized = false;
  tabYt?.addEventListener('click', async () => {
    sfx.playClick();
    stopChiptuneSynth();
    tabYt.classList.add('active');
    tabSynth.classList.remove('active');
    synthPanel.style.display = 'none';
    ytPanel.style.display = 'flex';
    if (!ytInitialized) {
      ytInitialized = true;
      await setupYouTubePlayer();
    }
  });

  async function setupYouTubePlayer() {
    const urlInput = windowElement.querySelector('.media-player-input') as HTMLInputElement;
    const loadButton = windowElement.querySelector('.media-player-load-button') as HTMLButtonElement;
    const playerContainerDivId = `youtube-player-${appName}`;
    const playerDiv = windowElement.querySelector(`#${playerContainerDivId}`) as HTMLDivElement;
    const playButton = windowElement.querySelector('#media-player-play') as HTMLButtonElement;
    const pauseButton = windowElement.querySelector('#media-player-pause') as HTMLButtonElement;
    const stopButton = windowElement.querySelector('#media-player-stop') as HTMLButtonElement;

    if (!urlInput || !loadButton || !playerDiv || !playButton || !pauseButton || !stopButton) return;

    try {
      await loadYouTubeApi();
    } catch (error: any) {
      playerDiv.innerHTML = `<p class="media-player-status-message">Could not load YouTube API: ${error.message}</p>`;
      return;
    }

    const createPlayer = (videoId: string) => {
      if (youtubePlayers[appName]) {
        try {
          youtubePlayers[appName].destroy();
        } catch {}
      }
      playerDiv.innerHTML = '';
      // @ts-ignore
      youtubePlayers[appName] = new YT.Player(playerContainerDivId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: { playsinline: 1, autoplay: 1, controls: 0, modestbranding: 1, rel: 0, fs: 0, origin: window.location.origin },
      });
    };

    loadButton.addEventListener('click', () => {
      const videoId = getYouTubeVideoId(urlInput.value.trim());
      if (videoId) createPlayer(videoId);
    });

    windowElement.querySelectorAll('.yt-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = (btn as HTMLElement).dataset.vid;
        if (vid) {
          urlInput.value = vid;
          createPlayer(vid);
        }
      });
    });

    playButton.addEventListener('click', () => youtubePlayers[appName]?.playVideo?.());
    pauseButton.addEventListener('click', () => youtubePlayers[appName]?.pauseVideo?.());
    stopButton.addEventListener('click', () => youtubePlayers[appName]?.stopVideo?.());

    createPlayer(DEFAULT_YOUTUBE_VIDEO_ID);
  }
}

// --- 10. MS-DOS PROMPT (COMMAND.COM + AI Kernel + Matrix Mode) ---
let matrixIntervalId: number | null = null;

function initDosPrompt(windowElement: HTMLDivElement): void {
  const input = windowElement.querySelector('#dos-input') as HTMLInputElement;
  const log = windowElement.querySelector('#dos-text-log') as HTMLDivElement;
  const outputBox = windowElement.querySelector('#dos-output') as HTMLDivElement;
  const matrixCanvas = windowElement.querySelector('#dos-matrix-canvas') as HTMLCanvasElement;
  input?.focus();

  if (initializedApps.has('dosPrompt')) return;
  initializedApps.add('dosPrompt');

  function appendLine(text: string) {
    if (!log) return;
    log.textContent += text + '\n';
    if (outputBox) outputBox.scrollTop = outputBox.scrollHeight;
  }

  appendLine('Microsoft(R) Windows 95 — Gemini Neural MS-DOS Prompt');
  appendLine('   (C)Copyright 1981-1995. Type HELP for commands, or ask ANY question!');
  appendLine('');

  function toggleMatrixEffect() {
    if (!matrixCanvas) return;
    if (matrixIntervalId) {
      clearInterval(matrixIntervalId);
      matrixIntervalId = null;
      matrixCanvas.style.display = 'none';
      appendLine('Matrix Digital Rain: OFF');
      return;
    }
    matrixCanvas.style.display = 'block';
    matrixCanvas.width = outputBox.clientWidth || 500;
    matrixCanvas.height = outputBox.clientHeight || 300;
    const mCtx = matrixCanvas.getContext('2d');
    const cols = Math.floor(matrixCanvas.width / 14);
    const drops = new Array(cols).fill(1);
    matrixIntervalId = window.setInterval(() => {
      if (!mCtx) return;
      mCtx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      mCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      mCtx.fillStyle = '#00ff41';
      mCtx.font = '14px monospace';
      for (let i = 0; i < drops.length; i++) {
        const ch = String.fromCharCode(0x30a0 + Math.random() * 96);
        mCtx.fillText(ch, i * 14, drops[i] * 14);
        if (drops[i] * 14 > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 50);
    appendLine('Matrix Digital Rain: ACTIVE (Type MATRIX again to stop)');
  }

  async function handleCommand(rawCmd: string) {
    const trimmed = rawCmd.trim();
    appendLine(`C:\\GEMINI95>${trimmed}`);
    if (!trimmed) return;
    sfx.playClick();

    const upper = trimmed.toUpperCase();
    if (upper === 'HELP') {
      appendLine(
        'Available Built-In Commands:\n' +
          '  DIR       List files in C:\\ Virtual File System\n' +
          '  SYSINFO   Show 1995 Pentium & AI Co-Processor specs\n' +
          '  MATRIX    Toggle falling Matrix phosphor code rain\n' +
          '  COLOR     Cycle Green / Amber / White CRT phosphor\n' +
          '  CLS       Clear terminal screen\n' +
          '  CHIME     Play Windows 95 Startup Synth Chime\n' +
          '  OPEN <app> Launch app (NETSCAPE, PAINT, NOTES, AIM, SWEEPER)\n' +
          '  * Or type ANY question/prompt to query the Gemini 95 AI DOS Kernel!',
      );
      return;
    }
    if (upper === 'CLS' || upper === 'CLEAR') {
      if (log) log.textContent = '';
      return;
    }
    if (upper === 'DIR') {
      appendLine(' Volume in drive C is GEMINI_95\n Directory of C:\\\n');
      virtualFileSystem.forEach((f) => {
        const tag = f.type === 'folder' ? '<DIR>     ' : '     4,096';
        appendLine(`  ${f.name.padEnd(20)} ${tag}  ${f.parent}`);
      });
      appendLine(`        ${virtualFileSystem.length} file(s)    1,995,000,000 bytes free`);
      return;
    }
    if (upper === 'SYSINFO' || upper === 'VER') {
      appendLine(
        'OS:         Remix Gemini 95 (4.00.950 B)\n' +
          'CPU:        Intel Pentium 133MHz + Gemini-4-Hydrogen Neural Overdrive\n' +
          'Memory:     64,000K Extended RAM (HIMEM.SYS loaded)\n' +
          'Audio:      Sound Blaster 16 WebAudio Synth (IRQ 5, DMA 1)\n' +
          'Modem:      U.S. Robotics 56k Sportster Voice/Fax',
      );
      return;
    }
    if (upper === 'MATRIX') {
      toggleMatrixEffect();
      return;
    }
    if (upper === 'COLOR' || upper === 'PHOSPHOR') {
      if (outputBox.classList.contains('amber')) {
        outputBox.classList.remove('amber');
        outputBox.classList.add('white');
        appendLine('Phosphor mode: White');
      } else if (outputBox.classList.contains('white')) {
        outputBox.classList.remove('white');
        appendLine('Phosphor mode: Classic Green');
      } else {
        outputBox.classList.add('amber');
        appendLine('Phosphor mode: Amber');
      }
      return;
    }
    if (upper === 'CHIME' || upper === 'BEEP') {
      sfx.playStartupChime();
      appendLine('Playing synthesized 1995 startup chime...');
      return;
    }
    if (upper.startsWith('OPEN ')) {
      const target = upper.replace('OPEN ', '').trim();
      const map: Record<string, string> = {
        NETSCAPE: 'chrome',
        CHROME: 'chrome',
        PAINT: 'paint',
        NOTES: 'notepad',
        AIM: 'gemini',
        SWEEPER: 'minesweeper',
        PLAYER: 'mediaPlayer',
        DOOM: 'doom',
      };
      if (map[target]) {
        openApp(map[target]);
        appendLine(`Launching ${target}...`);
        return;
      }
    }

    // Fallback to Gemini AI DOS Kernel!
    appendLine('[Querying GEMINI.SYS AI Kernel...]');
    try {
      if (!geminiInstance && !(await initializeGeminiIfNeeded('DOS'))) return;
      const res = await geminiInstance.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: trimmed,
        config: {
          systemInstruction:
            'You are GEMINI.SYS, an intelligent 1995 MS-DOS command-line AI kernel inside Windows 95. Answer the user command or question in plain text suitable for an 80-column DOS terminal (concise, witty, 3-8 lines max, no markdown bold stars).',
        },
      });
      appendLine(res.text?.trim() || 'OK.');
    } catch (e: any) {
      appendLine(`DOS AI Kernel Error: ${e.message}`);
    }
  }

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value;
      input.value = '';
      handleCommand(val);
    }
  });

  outputBox?.addEventListener('click', () => input?.focus());

  windowElement.querySelectorAll('.dos-quick-cmd').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = (btn as HTMLElement).dataset.cmd;
      if (cmd) handleCommand(cmd);
      input?.focus();
    });
  });
}

// --- 11. CONTROL PANEL / DISPLAY & THEMES ---
const THEMES = ['standard', 'hotdog', 'cyberpunk', 'vaporwave', 'matrix'];
let currentThemeIndex = 0;

function applyTheme(themeName: string) {
  document.body.classList.remove('theme-hotdog', 'theme-cyberpunk', 'theme-vaporwave', 'theme-matrix');
  if (themeName !== 'standard') {
    document.body.classList.add(`theme-${themeName}`);
  }
  document.querySelectorAll('.theme-select-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === themeName);
  });
}

function initControlPanel(windowElement: HTMLDivElement): void {
  if (initializedApps.has('controlPanel')) return;
  initializedApps.add('controlPanel');

  windowElement.querySelectorAll('.theme-select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      sfx.playClick();
      const t = (btn as HTMLElement).dataset.theme || 'standard';
      currentThemeIndex = Math.max(0, THEMES.indexOf(t));
      applyTheme(t);
    });
  });

  const crtCheck = windowElement.querySelector('#cp-crt-toggle') as HTMLInputElement;
  const sfxCheck = windowElement.querySelector('#cp-sfx-toggle') as HTMLInputElement;

  crtCheck?.addEventListener('change', () => {
    document.body.classList.toggle('crt-enabled', crtCheck.checked);
  });

  sfxCheck?.addEventListener('change', () => {
    sfx.enabled = sfxCheck.checked;
    const traySound = document.getElementById('tray-sound-btn');
    if (traySound) traySound.textContent = sfx.enabled ? '🔊' : '🔇';
    if (sfx.enabled) sfx.playClick();
  });
}

// --- Desktop Interactions, Selection Marquee, Context Menu & Taskbar ---
icons.forEach((icon) => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    icons.forEach((i) => i.classList.remove('selected'));
    icon.classList.add('selected');
    const appName = icon.getAttribute('data-app');
    if (appName) {
      openApp(appName);
      startMenu.classList.remove('active');
    }
  });
});

document.querySelectorAll('.start-menu-item').forEach((item) => {
  item.addEventListener('click', () => {
    const appName = (item as HTMLElement).getAttribute('data-app');
    if (appName) openApp(appName);
    startMenu.classList.remove('active');
  });
});

document.getElementById('start-sound-chime')?.addEventListener('click', () => {
  sfx.playStartupChime();
  startMenu.classList.remove('active');
});

startButton.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  startMenu.classList.toggle('active');
  if (startMenu.classList.contains('active')) {
    highestZIndex++;
    startMenu.style.zIndex = highestZIndex.toString();
  }
});

// Show Desktop Quick-Launch button
document.getElementById('show-desktop-btn')?.addEventListener('click', () => {
  sfx.playClick();
  openApps.forEach((_, appName) => minimizeApp(appName));
});

// Tray buttons & Live Clock
document.getElementById('tray-crt-btn')?.addEventListener('click', () => {
  sfx.playClick();
  const enabled = document.body.classList.toggle('crt-enabled');
  const crtCheck = document.getElementById('cp-crt-toggle') as HTMLInputElement | null;
  if (crtCheck) crtCheck.checked = enabled;
});

document.getElementById('tray-sound-btn')?.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled;
  const btn = document.getElementById('tray-sound-btn');
  if (btn) btn.textContent = sfx.enabled ? '🔊' : '🔇';
  const sfxCheck = document.getElementById('cp-sfx-toggle') as HTMLInputElement | null;
  if (sfxCheck) sfxCheck.checked = sfx.enabled;
  if (sfx.enabled) sfx.playClick();
});

function updateClock() {
  const clockEl = document.getElementById('tray-clock');
  if (clockEl) {
    clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
updateClock();
setInterval(updateClock, 10000);

// Sticky note dismiss
document.getElementById('sticky-close')?.addEventListener('click', () => {
  sfx.playClick();
  const sticky = document.getElementById('desktop-welcome');
  if (sticky) sticky.style.display = 'none';
});

// Right-Click Desktop Context Menu
const contextMenu = document.getElementById('desktop-context-menu') as HTMLDivElement | null;
desktop.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement).closest('.window')) return;
  e.preventDefault();
  if (!contextMenu) return;
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 210)}px`;
  contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 220)}px`;
});

contextMenu?.querySelectorAll('.ctx-item').forEach((item) => {
  item.addEventListener('click', () => {
    sfx.playClick();
    const action = (item as HTMLElement).dataset.action;
    contextMenu.style.display = 'none';
    if (action === 'open-dos') openApp('dosPrompt');
    else if (action === 'new-note') openApp('notepad');
    else if (action === 'open-paint') openApp('paint');
    else if (action === 'open-display') openApp('controlPanel');
    else if (action === 'cycle-theme') {
      currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
      applyTheme(THEMES[currentThemeIndex]);
    } else if (action === 'toggle-crt') {
      document.body.classList.toggle('crt-enabled');
    } else if (action === 'toggle-sfx') {
      document.getElementById('tray-sound-btn')?.click();
    }
  });
});

// Desktop Marquee Selection
const marquee = document.getElementById('selection-marquee') as HTMLDivElement | null;
let marqueeStart: { x: number; y: number } | null = null;

desktop.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  if ((e.target as HTMLElement).closest('.window, .icon, .desktop-sticky-note, .win95-context-menu')) return;
  icons.forEach((i) => i.classList.remove('selected'));
  marqueeStart = { x: e.clientX, y: e.clientY };
  if (marquee) {
    marquee.style.left = `${e.clientX}px`;
    marquee.style.top = `${e.clientY}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    marquee.style.display = 'block';
  }
});

document.addEventListener('mousemove', (e) => {
  if (!marqueeStart || !marquee) return;
  const x = Math.min(e.clientX, marqueeStart.x);
  const y = Math.min(e.clientY, marqueeStart.y);
  const w = Math.abs(e.clientX - marqueeStart.x);
  const h = Math.abs(e.clientY - marqueeStart.y);
  marquee.style.left = `${x}px`;
  marquee.style.top = `${y}px`;
  marquee.style.width = `${w}px`;
  marquee.style.height = `${h}px`;
});

document.addEventListener('mouseup', () => {
  if (marqueeStart && marquee) {
    marqueeStart = null;
    marquee.style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
  if (startMenu.classList.contains('active') && !startMenu.contains(e.target as Node) && !startButton.contains(e.target as Node)) {
    startMenu.classList.remove('active');
  }
  if (contextMenu && contextMenu.style.display !== 'none' && !contextMenu.contains(e.target as Node)) {
    contextMenu.style.display = 'none';
  }
});

// Setup Window Chrome (Drag, Minimize, Maximize, Close)
windows.forEach((windowElement, idx) => {
  const titleBar = windowElement.querySelector('.window-titlebar') as HTMLDivElement | null;
  const closeButton = windowElement.querySelector('.window-close') as HTMLDivElement | null;
  const minimizeButton = windowElement.querySelector('.window-minimize') as HTMLDivElement | null;
  const maximizeButton = windowElement.querySelector('.window-maximize') as HTMLDivElement | null;

  windowElement.addEventListener('mousedown', () => bringToFront(windowElement), true);

  closeButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeApp(windowElement.id);
  });
  minimizeButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.playClick();
    minimizeApp(windowElement.id);
  });
  maximizeButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMaximize(windowElement);
  });

  if (titleBar) {
    titleBar.addEventListener('dblclick', () => toggleMaximize(windowElement));

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    const startDragging = (e: MouseEvent) => {
      if (
        !(e.target === titleBar || titleBar.contains(e.target as Node)) ||
        (e.target as Element).closest('.window-control-button') ||
        windowElement.classList.contains('maximized')
      ) {
        isDragging = false;
        return;
      }
      isDragging = true;
      bringToFront(windowElement);
      const rect = windowElement.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      titleBar.style.cursor = 'grabbing';
      document.addEventListener('mousemove', dragWindow);
      document.addEventListener('mouseup', stopDragging, { once: true });
    };

    const dragWindow = (e: MouseEvent) => {
      if (!isDragging) return;
      let x = e.clientX - dragOffsetX;
      let y = e.clientY - dragOffsetY;
      const taskbarHeight = 36;
      const maxY = window.innerHeight - windowElement.offsetHeight - taskbarHeight;
      const minX = -(windowElement.offsetWidth - 60);
      const maxXAdjusted = window.innerWidth - 60;
      x = Math.max(minX, Math.min(x, maxXAdjusted));
      y = Math.max(0, Math.min(y, Math.max(0, maxY)));
      windowElement.style.left = `${x}px`;
      windowElement.style.top = `${y}px`;
    };

    const stopDragging = () => {
      if (!isDragging) return;
      isDragging = false;
      titleBar.style.cursor = 'grab';
      document.removeEventListener('mousemove', dragWindow);
    };

    titleBar.addEventListener('mousedown', startDragging);
  }

  // Cascade initial window positions neatly
  const topOffset = 28 + (idx % 5) * 28;
  const leftOffset = 210 + (idx % 6) * 34;
  windowElement.style.top = `${topOffset}px`;
  windowElement.style.left = `${leftOffset}px`;
});

// --- Interactive BIOS POST & Windows 95 Splash Boot Controller ---
const bootScreen = document.getElementById('boot-screen') as HTMLDivElement | null;
const bootBiosStage = document.getElementById('boot-bios-stage') as HTMLDivElement | null;
const bootSplashStage = document.getElementById('boot-splash-stage') as HTMLDivElement | null;
const biosRamCounter = document.getElementById('bios-ram-counter') as HTMLSpanElement | null;
const biosStatusLine = document.getElementById('bios-status-line') as HTMLDivElement | null;
const bootPowerBtn = document.getElementById('boot-power-btn') as HTMLButtonElement | null;
const bootSkipBtn = document.getElementById('boot-skip-btn') as HTMLButtonElement | null;
const splashSkipBtn = document.getElementById('splash-skip-btn') as HTMLButtonElement | null;

let bootState: 'bios' | 'post_running' | 'splash' | 'complete' = 'bios';
const bootTimeouts: number[] = [];

function clearBootTimers() {
  while (bootTimeouts.length > 0) {
    const id = bootTimeouts.pop();
    if (id !== undefined) clearTimeout(id);
  }
}

function finishBootToDesktop() {
  clearBootTimers();
  bootState = 'complete';
  if (!bootScreen) return;
  bootScreen.classList.add('fade-out');
  const hideId = window.setTimeout(() => {
    if (bootScreen && bootState === 'complete') {
      bootScreen.style.display = 'none';
    }
  }, 360);
  bootTimeouts.push(hideId);
}

function startBootWithAudio() {
  if (bootState !== 'bios') return;
  bootState = 'post_running';
  clearBootTimers();

  // Ensure sound is enabled and play hardware POST beep + floppy seek
  sfx.enabled = true;
  const traySound = document.getElementById('tray-sound-btn');
  if (traySound) traySound.textContent = '🔊';
  sfx.playPostBeep();

  if (biosStatusLine) {
    biosStatusLine.textContent = 'POST OK — INITIALIZING SOUND BLASTER 16 & BOOTING GEMINI 95...';
  }

  // Rapid RAM check counter animation
  let ram = 16384;
  const ramStep = () => {
    ram = Math.min(65536, ram + 16384);
    if (biosRamCounter) biosRamCounter.textContent = `${ram}K OK`;
    if (ram < 65536) {
      bootTimeouts.push(window.setTimeout(ramStep, 90));
    }
  };
  if (biosRamCounter) biosRamCounter.textContent = '16384K';
  bootTimeouts.push(window.setTimeout(ramStep, 90));
  bootTimeouts.push(window.setTimeout(() => sfx.playFloppySeek(), 180));

  // Transition to Stage 2: Windows 95 Cloud Splash + Lo-Fi Eno Synth Chime
  const splashTimer = window.setTimeout(() => {
    bootState = 'splash';
    if (bootBiosStage) bootBiosStage.style.display = 'none';
    if (bootSplashStage) bootSplashStage.style.display = 'flex';
    sfx.playStartupChime();

    // Reveal desktop as the warm Eno chime tail settles
    const completeTimer = window.setTimeout(() => {
      finishBootToDesktop();
    }, 3400);
    bootTimeouts.push(completeTimer);
  }, 650);
  bootTimeouts.push(splashTimer);
}

function rebootGemini95() {
  clearBootTimers();
  startMenu.classList.remove('active');
  bootState = 'bios';
  if (biosRamCounter) biosRamCounter.textContent = '65536K OK';
  if (biosStatusLine) {
    biosStatusLine.textContent = 'SYSTEM READY — CLICK BELOW OR PRESS [ENTER] TO POWER ON & PLAY STARTUP AUDIO';
  }
  if (bootBiosStage) bootBiosStage.style.display = 'flex';
  if (bootSplashStage) bootSplashStage.style.display = 'none';
  if (bootScreen) {
    bootScreen.style.display = 'flex';
    bootScreen.classList.remove('fade-out');
  }
}

bootPowerBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  startBootWithAudio();
});

bootSkipBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  finishBootToDesktop();
});

splashSkipBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  finishBootToDesktop();
});

document.getElementById('start-reboot-os')?.addEventListener('click', () => {
  rebootGemini95();
});

window.addEventListener('keydown', (e) => {
  if (bootState === 'bios') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startBootWithAudio();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishBootToDesktop();
    }
  } else if (bootState === 'splash' && e.key === 'Escape') {
    e.preventDefault();
    finishBootToDesktop();
  }
});

