/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import '@tailwindcss/browser';
import {
  applySystemRegistryToOS,
  getBrowserEngineMeta,
  initAbilityToInstallApp,
  initCmosBiosController,
  initMasterControlPanel,
  initMultiEngineBrowser,
  initOsReinstallerController,
  initRegeditApp,
  initSysMonitorApp,
  isAppInstalled,
  navigateBrowserExternal,
  openAbilityToInstallCategory,
  openCmosBiosSetup,
  openInstallShieldWizard,
  openMasterSettingsTab,
  openOsReinstallScreen,
  packageCatalog,
  registerOsBridge,
  renderAbilityToInstallUI,
  renderMasterSettingsCurrentTab,
  resetIdleTimer,
  startScreensaverNow,
  switchBrowserToAiMode,
  syncBrowserChromeToEngine,
  systemRegistry,
} from './osExtendedApps';
import { BIOS_FLAGSHIP_IDS, isBiosPilotOverclocked, isBiosZeroWaitPost } from './osBios5000';
import { APP_SVG_ICONS } from './osSystemCore';
import {
  downloadBootableIsoImage,
  downloadPortableHostApp,
  dropSetupExeToVfs,
  executeVfsSetupExe,
  initFdiskController,
  initPwaAndHostOsController,
  isPrimaryBootable,
  openFdiskScreen,
  partitionTable,
  triggerNativePwaInstall,
} from './osDualInstall';
import {
  initArcadeApp,
  initCalcApp,
  initCalendarApp,
  initClipViewerApp,
  initMegaShellFeatures,
  initRecycleBinApp,
  initSolitaireApp,
  initSoundRecorderApp,
  initTaskManagerApp,
  initTrophiesApp,
  openHotkeysModal,
  openRunDialog,
  openWinverModal,
  pushBalloonToast,
  registerMegaBridge,
  spawnCustomStickyNote,
  triggerBsodPrank,
  unlockAchievement,
} from './osMegaFeatures';

// --- Web Audio API Retro Windows 95 Sound Blaster 16 DSP Engine ---
class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public masterVolume = 1.0;
  public pitchMultiplier = 1.0;
  public dacBitDepth = 16;
  public tapeSaturation = 28;
  public floppyMechanical = true;

  private getCtx(): AudioContext | null {
    if (!this.enabled || this.masterVolume <= 0.001) return null;
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
    osc.frequency.setValueAtTime(900 * this.pitchMultiplier, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300 * this.pitchMultiplier, ctx.currentTime + 0.025);
    gain.gain.setValueAtTime(0.05 * this.masterVolume, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.0008, ctx.currentTime + 0.025);
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
      osc.frequency.setValueAtTime(freq * this.pitchMultiplier, t);
      gain.gain.setValueAtTime(0.06 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
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
      osc.frequency.setValueAtTime(freq * this.pitchMultiplier, ctx.currentTime);
      gain.gain.setValueAtTime(0.05 * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    });
  }

  private createTapeSaturationCurve(amount = 24, bitDepth = 16): Float32Array {
    const samples = 8192;
    const curve = new Float32Array(samples);
    const k = amount;
    const quantSteps = bitDepth <= 8 ? 12 : bitDepth <= 12 ? 32 : 96;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const saturated = Math.tanh(x * (1 + k / 15));
      curve[i] = Math.round(saturated * quantSteps) / quantSteps;
    }
    return curve;
  }

  playPostBeep() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880 * this.pitchMultiplier, ctx.currentTime);
    gain.gain.setValueAtTime(0.06 * this.masterVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  playFloppySeek() {
    if (!this.floppyMechanical) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const steps = [0, 0.055, 0.11, 0.19, 0.25];
    steps.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = ctx.currentTime + offset;
      osc.frequency.setValueAtTime((idx % 2 === 0 ? 135 : 168) * this.pitchMultiplier, t);
      osc.frequency.exponentialRampToValueAtTime(55 * this.pitchMultiplier, t + 0.03);
      gain.gain.setValueAtTime(0.045 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.032);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    });
  }

  playModemHandshake() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Dial tone + V.90 56k dual-carrier screech + static handshake burst
    const tones = [
      { f: 1209, start: 0.0, dur: 0.07 },
      { f: 1477, start: 0.09, dur: 0.07 },
      { f: 2100, start: 0.2, dur: 0.28 },
      { f: 1650, start: 0.5, dur: 0.22 },
      { f: 2400, start: 0.72, dur: 0.24 },
    ];
    tones.forEach((tn) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tn.f * this.pitchMultiplier, now + tn.start);
      g.gain.setValueAtTime(0.045 * this.masterVolume, now + tn.start);
      g.gain.exponentialRampToValueAtTime(0.0008, now + tn.start + tn.dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + tn.start);
      osc.stop(now + tn.start + tn.dur + 0.01);
    });

    const bufLen = Math.floor(ctx.sampleRate * 0.42);
    const nBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = nBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (i % 7 < 3 ? 0.8 : 0.25);
    }
    const src = ctx.createBufferSource();
    src.buffer = nBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1850 * this.pitchMultiplier, now + 0.95);
    bp.Q.setValueAtTime(3.2, now + 0.95);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.04 * this.masterVolume, now + 0.95);
    ng.gain.exponentialRampToValueAtTime(0.0008, now + 1.36);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(ctx.destination);
    src.start(now + 0.95);
    src.stop(now + 1.37);
  }

  playStartupChime() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pMult = this.pitchMultiplier;
    const vMult = this.masterVolume;

    // Master bus: Low-Pass Filter Swell -> Lo-Fi Tape Saturation WaveShaper -> Stereo Delay Tail -> Destination
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(420 * pMult, now);
    lowpass.frequency.exponentialRampToValueAtTime(2450 * pMult, now + 1.35);
    lowpass.frequency.exponentialRampToValueAtTime(880 * pMult, now + 4.4);
    lowpass.Q.setValueAtTime(2.2, now);

    const shaper = ctx.createWaveShaper();
    shaper.curve = this.createTapeSaturationCurve(this.tapeSaturation, this.dacBitDepth) as any;
    shaper.oversample = '2x';

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.001, 0.75 * vMult), now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 4.8);

    // Stereo Chorus / Ambient Delay Tail
    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.setValueAtTime(0.19, now);
    delayR.delayTime.setValueAtTime(0.29, now);

    const feedback = ctx.createGain();
    feedback.gain.setValueAtTime(0.34, now);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.32 * vMult, now);

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
    const qStep = this.dacBitDepth <= 8 ? 8 : this.dacBitDepth <= 12 ? 20 : 32;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.08;
      b1 = 0.96 * b1 + b0 * 0.12;
      output[i] = Math.round(b1 * qStep) / qStep;
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
      { freq: 155.56, detune: -6, start: 0.0, peak: 0.09, dur: 4.1, type: 'sawtooth' as OscillatorType },
      { freq: 233.08, detune: 5, start: 0.06, peak: 0.08, dur: 4.0, type: 'triangle' as OscillatorType },
      { freq: 349.23, detune: -8, start: 0.14, peak: 0.075, dur: 3.9, type: 'sine' as OscillatorType },
      { freq: 392.0, detune: 7, start: 0.22, peak: 0.075, dur: 3.9, type: 'triangle' as OscillatorType },
      { freq: 466.16, detune: -4, start: 0.32, peak: 0.07, dur: 3.8, type: 'sawtooth' as OscillatorType },
      { freq: 622.25, detune: 9, start: 0.45, peak: 0.085, dur: 3.7, type: 'sine' as OscillatorType },
    ];

    padVoices.forEach((v) => {
      const osc = ctx.createOscillator();
      const vGain = ctx.createGain();
      osc.type = v.type;
      const t = now + v.start;
      osc.frequency.setValueAtTime(v.freq * pMult * 0.994, t);
      osc.frequency.exponentialRampToValueAtTime(v.freq * pMult, t + 0.18);
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
      { freq: 932.33, offset: 0.68, gain: 0.055 },
      { freq: 1174.66, offset: 0.86, gain: 0.042 },
      { freq: 1244.51, offset: 1.05, gain: 0.065 },
    ];
    bellNotes.forEach((b) => {
      const osc = ctx.createOscillator();
      const bGain = ctx.createGain();
      osc.type = 'sine';
      const t = now + b.offset;
      osc.frequency.setValueAtTime(b.freq * pMult, t);
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
      osc.frequency.setValueAtTime(freq * this.pitchMultiplier, t);
      gain.gain.setValueAtTime(0.07 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.12);
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

// --- Virtual File System (C:\ and Secondary Logical Drive D:\) ---
interface VfsItem {
  name: string;
  type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe';
  parent: string;
  content?: string;
  appTarget?: string;
  pkgId?: string;
  sizeMB?: number;
}

const virtualFileSystem: VfsItem[] = [
  { name: 'Downloads', type: 'folder', parent: 'C:\\' },
  { name: 'Documents', type: 'folder', parent: 'C:\\' },
  { name: 'Pictures', type: 'folder', parent: 'C:\\' },
  { name: 'System95', type: 'folder', parent: 'C:\\' },
  {
    name: 'README_1995.TXT',
    type: 'text',
    parent: 'C:\\',
    content:
      '=== WELCOME TO GEMINI 95 (BUILD 1995.1000X) ===\n\n' +
      'Two Ways to Install Software & the Operating System:\n' +
      '1. .EXE Setup Files & Portable App:\n' +
      '   - Open C:\\Downloads in My Gemtop (or surf http://www.tucows-95-downloads.com in the Browser) to run standalone *_SETUP.EXE installers!\n' +
      '   - Or download Gemini95_Portable_App.html / .BAT straight to your real PC.\n' +
      '2. Physical Operating System Install:\n' +
      '   - Run FDISK.EXE to partition Primary C:\\ & Logical D:\\, format system tracks, export a real x86 El Torito Bootable .ISO, or install Gemini 95 onto your device as a Standalone Offline PWA!',
  },
  {
    name: 'secret_photo.jpg',
    type: 'image',
    parent: 'C:\\',
    content: APP_SVG_ICONS.samplePhoto,
  },
  // Pre-seeded standalone .EXE installers inside C:\Downloads ready to double-click/click!
  {
    name: 'MSIE30_SETUP.EXE',
    type: 'installer_exe',
    parent: 'C:\\Downloads',
    pkgId: 'browser_ie3',
    sizeMB: 11.8,
    content: 'MZ Win32 Self-Extracting Installer — Microsoft Internet Explorer 3.0 (Plus! 95)',
  },
  {
    name: 'CHROME_SETUP.EXE',
    type: 'installer_exe',
    parent: 'C:\\Downloads',
    pkgId: 'browser_chrome',
    sizeMB: 24.5,
    content: 'MZ Win32 Self-Extracting Installer — Google Chrome Browser',
  },
  {
    name: 'SYSMON95_SETUP.EXE',
    type: 'installer_exe',
    parent: 'C:\\Downloads',
    pkgId: 'sys_monitor',
    sizeMB: 1.9,
    content: 'MZ Win32 Self-Extracting Installer — System Resource Monitor (SYSMON.EXE)',
  },
  {
    name: 'GEMINI95_OS_SETUP.EXE',
    type: 'installer_exe',
    parent: 'C:\\Downloads',
    pkgId: 'os_setup',
    sizeMB: 68.4,
    content: 'MZ Win32 Self-Extracting Full OS Recovery & Upgrade Executable',
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
    content: APP_SVG_ICONS.samplePhoto,
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
  {
    name: 'INSTALL.EXE',
    type: 'app',
    parent: 'C:\\System95',
    appTarget: 'abilityToInstall',
  },
  {
    name: 'REGEDIT.EXE',
    type: 'app',
    parent: 'C:\\System95',
    appTarget: 'regedit',
  },
  // Secondary Logical Drive D:\ (Managed by FDISK.EXE)
  { name: 'Installers', type: 'folder', parent: 'D:\\' },
  {
    name: 'D_DRIVE_ARCHIVE.TXT',
    type: 'text',
    parent: 'D:\\',
    content:
      '=== SECONDARY LOGICAL DOS DRIVE D:\\ (DATA_ARCHIVE) ===\n\n' +
      'This 500 MB extended partition is managed by MS-DOS FDISK.EXE!\n' +
      'You can resize, delete, or recreate Drive D:\\ anytime inside FDISK.',
  },
  {
    name: 'NETSCAPE95_SETUP.EXE',
    type: 'installer_exe',
    parent: 'D:\\Installers',
    pkgId: 'browser_netscape',
    sizeMB: 14.2,
    content: 'MZ Win32 Self-Extracting Installer — Netscape Navigator 95 Gold',
  },
];

const FACTORY_VFS_SNAPSHOT: VfsItem[] = virtualFileSystem.map((item) => ({ ...item }));

function resetVfsToFactory() {
  virtualFileSystem.length = 0;
  FACTORY_VFS_SNAPSHOT.forEach((item) => virtualFileSystem.push({ ...item }));
}

function hydrateSvgIcons(): void {
  document.querySelectorAll<HTMLImageElement>('img[data-icon-key]').forEach((img) => {
    const key = img.dataset.iconKey;
    if (key && APP_SVG_ICONS[key]) {
      img.src = APP_SVG_ICONS[key];
    }
    if (!img.dataset.fallbackBound) {
      img.dataset.fallbackBound = '1';
      img.addEventListener('error', () => {
        if (!img.dataset.fallbackApplied) {
          img.dataset.fallbackApplied = '1';
          img.src = APP_SVG_ICONS.appExe;
        }
      });
    }
  });
}

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
    if (!a) return;
    var rawHref = a.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#") || /^(javascript:|mailto:|tel:)/i.test(rawHref)) return;
    var url = rawHref;
    var hasBase = !!document.querySelector("base[href]");
    if (/^(live:|ai:|chrome:|about:|file:|https?:)/i.test(rawHref)) {
      url = rawHref;
    } else if ((hasBase || rawHref.indexOf("//") === 0) && a.href && !a.href.startsWith("about:srcdoc")) {
      url = a.href;
    }
    e.preventDefault();
    window.parent.postMessage({ __gemini95Navigate: true, url: url }, "*");
  });
  document.addEventListener("submit", function(e) {
    var form = e.target;
    if (!form || !form.tagName || form.tagName.toUpperCase() !== "FORM") return;
    var method = (form.getAttribute("method") || "get").toLowerCase();
    if (method !== "get" || e.defaultPrevented) return;
    var rawAction = form.getAttribute("action") || "";
    var actionUrl = rawAction;
    if (/^(live:|ai:|chrome:|about:|file:|https?:)/i.test(rawAction)) {
      actionUrl = rawAction;
    } else if ((document.querySelector("base[href]") || rawAction.indexOf("//") === 0) && form.action && !form.action.startsWith("about:srcdoc")) {
      actionUrl = form.action;
    } else if (!rawAction) {
      return;
    }
    try {
      var fd = new FormData(form);
      var params = new URLSearchParams();
      fd.forEach(function(val, key) {
        if (typeof val === "string") params.append(key, val);
      });
      var qs = params.toString();
      var targetUrl = actionUrl.split("#")[0];
      if (qs) {
        targetUrl += (targetUrl.indexOf("?") === -1 ? "?" : "&") + qs;
      }
      e.preventDefault();
      window.parent.postMessage({ __gemini95Navigate: true, url: targetUrl }, "*");
    } catch (err) {}
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

const taskbarEl = document.getElementById('taskbar') as HTMLDivElement | null;

let activeWindow: HTMLDivElement | null = null;
let highestZIndex = 20;
const openApps = new Map<string, { windowEl: HTMLDivElement }>();
const minimizedApps = new Set<string>();
const initializedApps = new Set<string>();
let currentVirtualDesktop = 1;
const appDesktopMap = new Map<string, number>();
let resumeMinesweeperTimer: (() => void) | null = null;
let mediaPlayerYtInitialized = false;
let mediaPlayerProgressInterval: number | null = null;
let startMediaVisualizer: (() => void) | null = null;
let resumeMediaPlayerYtIfNeeded: (() => void) | null = null;
let geminiInstance: any | null = null;
let paintCritiqueIntervalId: number | null = null;
const paintResizeObserverMap = new Map<Element, ResizeObserver>();

const PINNED_TASKBAR_APPS = ['chrome', 'myComputer', 'abilityToInstall', 'controlPanel'] as const;

function getAppDockMeta(appName: string): { icon: string; title: string } {
  if (appName === 'chrome') {
    const meta = getBrowserEngineMeta(systemRegistry.defaultBrowserEngine);
    return { icon: meta.iconUrl, title: meta.shortTitle };
  }
  const titles: Record<string, string> = {
    myComputer: 'My Gemtop',
    abilityToInstall: 'Ability to Install',
    controlPanel: 'Settings & Control',
    regedit: 'REGEDIT.EXE',
    sysMonitor: 'System Monitor',
    notepad: 'GemNotes',
    paint: 'GemPaint',
    doom: 'Doom II',
    gemini: 'Gemini AIM',
    minesweeper: 'GemSweeper',
    imageViewer: 'Image Viewer',
    mediaPlayer: 'GemPlayer',
    dosPrompt: 'MS-DOS Prompt',
    calcApp: 'Calculator 95',
    solitaireApp: 'Solitaire 95',
    arcadeApp: 'Arcade 95',
    soundRecorder: 'Sound Studio',
    calendarApp: 'Calendar 95',
    taskManager: 'Task Manager',
    recycleBin: 'Recycle Bin',
    clipViewer: 'Clipboard 95',
    trophiesApp: 'Trophy Vault',
  };
  return {
    icon: APP_SVG_ICONS[appName] || APP_SVG_ICONS.appExe,
    title: titles[appName] || appName,
  };
}

function getTaskbarHeightPx(): number {
  return taskbarEl?.offsetHeight || 40;
}

function clampWindowToViewport(windowElement: HTMLDivElement, keepFullInside = false): void {
  if (!windowElement || windowElement.classList.contains('maximized') || windowElement.style.display === 'none') return;
  const tbH = getTaskbarHeightPx();
  const isTop = systemRegistry.taskbarPosition === 'top';
  const topBound = isTop ? tbH + 4 : 4;
  const bottomBound = Math.max(topBound + 120, window.innerHeight - (isTop ? 4 : tbH + 4));
  const availW = Math.max(260, window.innerWidth - 8);
  const availH = Math.max(190, bottomBound - topBound);

  if (windowElement.offsetWidth > availW) {
    windowElement.style.width = `${availW}px`;
  }
  if (windowElement.offsetHeight > availH) {
    windowElement.style.height = `${availH}px`;
  }

  const w = windowElement.offsetWidth || parseInt(windowElement.style.width || '420', 10) || 420;
  const h = windowElement.offsetHeight || parseInt(windowElement.style.height || '320', 10) || 320;
  let left = parseFloat(windowElement.style.left || '40');
  let top = parseFloat(windowElement.style.top || '40');
  if (Number.isNaN(left)) left = 40;
  if (Number.isNaN(top)) top = topBound;

  if (keepFullInside) {
    const maxLeft = Math.max(4, window.innerWidth - w - 4);
    const maxTop = Math.max(topBound, bottomBound - h);
    left = Math.max(4, Math.min(left, maxLeft));
    top = Math.max(topBound, Math.min(top, maxTop));
  } else {
    const minLeft = -(w - 80);
    const maxLeft = Math.max(4, window.innerWidth - 80);
    const maxTop = Math.max(topBound, bottomBound - 36);
    left = Math.max(minLeft, Math.min(left, maxLeft));
    top = Math.max(topBound, Math.min(top, maxTop));
  }

  windowElement.style.left = `${Math.round(left)}px`;
  windowElement.style.top = `${Math.round(top)}px`;
}

function syncTaskbarDockActiveState(): void {
  if (!taskbarAppsContainer) return;
  taskbarAppsContainer.querySelectorAll<HTMLButtonElement>('.taskbar-app').forEach((btn) => {
    const appName = btn.dataset.appName || '';
    const appData = openApps.get(appName);
    const appDesk = appDesktopMap.get(appName) || 1;
    const isOpenOnDesk = Boolean(appData && appDesk === currentVirtualDesktop);
    const isMin = isOpenOnDesk && minimizedApps.has(appName);
    const isActive = Boolean(
      isOpenOnDesk &&
        !isMin &&
        activeWindow &&
        activeWindow.id === appName &&
        appData!.windowEl.style.display !== 'none',
    );
    btn.classList.toggle('is-open', isOpenOnDesk);
    btn.classList.toggle('is-minimized', isMin);
    btn.classList.toggle('active', isActive);
  });
}

function syncTaskbarDock(): void {
  if (!taskbarAppsContainer) return;
  taskbarAppsContainer.innerHTML = '';

  const appsToRender: string[] = [];
  PINNED_TASKBAR_APPS.forEach((appName) => {
    if (isAppInstalled(appName) || openApps.has(appName)) {
      appsToRender.push(appName);
    }
  });
  openApps.forEach((_, appName) => {
    const appDesk = appDesktopMap.get(appName) || 1;
    if (
      !appsToRender.includes(appName) &&
      appDesk === currentVirtualDesktop
    ) {
      appsToRender.push(appName);
    }
  });

  appsToRender.forEach((appName) => {
    const meta = getAppDockMeta(appName);
    const appData = openApps.get(appName);
    const appDesk = appDesktopMap.get(appName) || 1;
    const isOpenOnDesk = Boolean(appData && appDesk === currentVirtualDesktop);
    const isMin = isOpenOnDesk && minimizedApps.has(appName);
    const isActive = Boolean(
      isOpenOnDesk &&
        !isMin &&
        activeWindow &&
        activeWindow.id === appName &&
        appData!.windowEl.style.display !== 'none',
    );

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'taskbar-app';
    btn.dataset.appName = appName;
    if (isOpenOnDesk) btn.classList.add('is-open');
    if (isMin) btn.classList.add('is-minimized');
    if (isActive) btn.classList.add('active');
    btn.title = isOpenOnDesk ? `${meta.title} (${isMin ? 'Minimized' : 'Running'})` : `${meta.title} (Pinned)`;

    const img = document.createElement('img');
    img.src = meta.icon;
    img.alt = meta.title;
    img.addEventListener('error', () => {
      if (!img.dataset.fallbackApplied) {
        img.dataset.fallbackApplied = '1';
        img.src = APP_SVG_ICONS.appExe;
      }
    });
    btn.appendChild(img);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'taskbar-app-label';
    labelSpan.textContent = meta.title;
    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => {
      sfx.playClick();
      if (openApps.has(appName)) {
        const targetDesk = appDesktopMap.get(appName) || 1;
        const winEl = openApps.get(appName)!.windowEl;
        if (targetDesk !== currentVirtualDesktop) {
          minimizedApps.delete(appName);
          switchVirtualDesktop(targetDesk);
          winEl.style.display = 'flex';
          clampWindowToViewport(winEl, true);
          bringToFront(winEl);
          return;
        }
        if (winEl === activeWindow && winEl.style.display !== 'none') {
          minimizeApp(appName);
        } else {
          minimizedApps.delete(appName);
          winEl.style.display = 'flex';
          clampWindowToViewport(winEl, true);
          bringToFront(winEl);
          if (appName === 'myComputer') renderExplorerFolder(currentExplorerPath);
          if (appName === 'chrome') syncBrowserChromeToEngine();
          if (appName === 'minesweeper') resumeMinesweeperTimer?.();
          if (appName === 'mediaPlayer') {
            startMediaVisualizer?.();
            resumeMediaPlayerYtIfNeeded?.();
          }
          syncTaskbarDockActiveState();
        }
      } else {
        openApp(appName);
      }
    });

    taskbarAppsContainer.appendChild(btn);
  });
}

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
  }
  highestZIndex++;
  windowElement.style.zIndex = highestZIndex.toString();
  windowElement.classList.add('active');
  activeWindow = windowElement;
  syncTaskbarDockActiveState();
}

function toggleMaximize(windowElement: HTMLDivElement): void {
  sfx.playClick();
  windowElement.classList.toggle('maximized');
  bringToFront(windowElement);
}

export async function openApp(appName: string, bypassPkgCheck = false): Promise<void> {
  if (!bypassPkgCheck && !isAppInstalled(appName)) {
    if (appName === 'chrome') {
      showOsDialog(
        'No Web Browser is currently installed on C:\\! Launching "Ability to Install" so you can install Google Chrome, Netscape 95, or Internet Explorer 3.0.',
        'Missing Browser Executable',
      );
      openAbilityToInstallCategory('browser');
      return;
    }
    const uninstalledPkg = packageCatalog.find((p) => p.appWindowId === appName);
    if (uninstalledPkg) {
      openInstallShieldWizard(uninstalledPkg, 'install');
      return;
    }
  }

  const windowElement = document.getElementById(appName) as HTMLDivElement | null;
  if (!windowElement) return;

  sfx.playWindowOpen();

  if (openApps.has(appName)) {
    const appDesk = appDesktopMap.get(appName) || 1;
    if (appDesk !== currentVirtualDesktop) {
      minimizedApps.delete(appName);
      switchVirtualDesktop(appDesk);
    }
    minimizedApps.delete(appName);
    windowElement.style.display = 'flex';
    clampWindowToViewport(windowElement, true);
    bringToFront(windowElement);
    if (appName === 'myComputer') renderExplorerFolder(currentExplorerPath);
    if (appName === 'chrome') syncBrowserChromeToEngine();
    if (appName === 'minesweeper') resumeMinesweeperTimer?.();
    if (appName === 'mediaPlayer') {
      startMediaVisualizer?.();
      resumeMediaPlayerYtIfNeeded?.();
    }
    syncTaskbarDock();
    return;
  }

  minimizedApps.delete(appName);
  appDesktopMap.set(appName, currentVirtualDesktop);
  openApps.set(appName, { windowEl: windowElement });
  windowElement.style.display = 'flex';
  clampWindowToViewport(windowElement, true);
  bringToFront(windowElement);
  syncTaskbarDock();
  updateVirtualDesktopCounts();

  // Initialize specific app logic once or refresh as needed
  if (appName === 'myComputer') {
    initMyComputer(windowElement);
  } else if (appName === 'chrome') {
    if (!initializedApps.has('chrome')) {
      initializedApps.add('chrome');
      initMultiEngineBrowser(windowElement);
    } else {
      syncBrowserChromeToEngine();
    }
  } else if (appName === 'abilityToInstall') {
    if (!initializedApps.has('abilityToInstall')) {
      initializedApps.add('abilityToInstall');
      initAbilityToInstallApp(windowElement);
    } else {
      renderAbilityToInstallUI();
    }
  } else if (appName === 'controlPanel') {
    if (!initializedApps.has('controlPanel')) {
      initializedApps.add('controlPanel');
      initMasterControlPanel(windowElement);
    } else {
      renderMasterSettingsCurrentTab();
    }
  } else if (appName === 'regedit') {
    if (!initializedApps.has('regedit')) {
      initializedApps.add('regedit');
      initRegeditApp(windowElement);
    }
  } else if (appName === 'sysMonitor') {
    if (!initializedApps.has('sysMonitor')) {
      initializedApps.add('sysMonitor');
      initSysMonitorApp(windowElement);
    }
  } else if (appName === 'notepad') {
    initNotepadStory(windowElement);
  } else if (appName === 'paint') {
    initSimplePaintApp(windowElement);
    if (paintAssistant && systemRegistry.showClippyAssistant) paintAssistant.classList.add('visible');
    if (assistantBubble) assistantBubble.textContent = 'Draw something! Click "Judge Art" anytime.';
    if (paintCritiqueIntervalId) {
      clearInterval(paintCritiqueIntervalId);
      paintCritiqueIntervalId = null;
    }
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
    resumeMinesweeperTimer?.();
  } else if (appName === 'mediaPlayer') {
    initMediaPlayer(windowElement);
    startMediaVisualizer?.();
    resumeMediaPlayerYtIfNeeded?.();
  } else if (appName === 'dosPrompt') {
    initDosPrompt(windowElement);
  } else if (appName === 'calcApp' && !initializedApps.has('calcApp')) {
    initializedApps.add('calcApp');
    initCalcApp(windowElement);
  } else if (appName === 'solitaireApp' && !initializedApps.has('solitaireApp')) {
    initializedApps.add('solitaireApp');
    initSolitaireApp(windowElement);
  } else if (appName === 'arcadeApp' && !initializedApps.has('arcadeApp')) {
    initializedApps.add('arcadeApp');
    initArcadeApp(windowElement);
  } else if (appName === 'soundRecorder' && !initializedApps.has('soundRecorder')) {
    initializedApps.add('soundRecorder');
    initSoundRecorderApp(windowElement);
  } else if (appName === 'calendarApp' && !initializedApps.has('calendarApp')) {
    initializedApps.add('calendarApp');
    initCalendarApp(windowElement);
  } else if (appName === 'taskManager' && !initializedApps.has('taskManager')) {
    initializedApps.add('taskManager');
    initTaskManagerApp(windowElement);
  } else if (appName === 'recycleBin' && !initializedApps.has('recycleBin')) {
    initializedApps.add('recycleBin');
    initRecycleBinApp(windowElement);
  } else if (appName === 'clipViewer' && !initializedApps.has('clipViewer')) {
    initializedApps.add('clipViewer');
    initClipViewerApp(windowElement);
  } else if (appName === 'trophiesApp' && !initializedApps.has('trophiesApp')) {
    initializedApps.add('trophiesApp');
    initTrophiesApp(windowElement);
  }
}

function closeApp(appName: string): void {
  const appData = openApps.get(appName);
  if (!appData) return;
  sfx.playClick();

  const { windowEl } = appData;
  windowEl.style.display = 'none';
  windowEl.classList.remove('active', 'maximized');
  openApps.delete(appName);
  minimizedApps.delete(appName);
  appDesktopMap.delete(appName);

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

  if (appName === 'minesweeper' && minesweeperTimerInterval) {
    clearInterval(minesweeperTimerInterval);
    minesweeperTimerInterval = null;
  }

  if (appName === 'mediaPlayer') {
    stopChiptuneSynth();
    if (synthAnimFrameId !== null) {
      cancelAnimationFrame(synthAnimFrameId);
      synthAnimFrameId = null;
    }
    if (mediaPlayerProgressInterval !== null) {
      clearInterval(mediaPlayerProgressInterval);
      mediaPlayerProgressInterval = null;
    }
    mediaPlayerYtInitialized = false;
    const progressFill = document.getElementById('media-player-progress-fill') as HTMLDivElement | null;
    if (progressFill) progressFill.style.width = '0%';
    const timeEl = document.getElementById('media-player-time');
    if (timeEl) timeEl.textContent = '0:00 / 0:00';
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
    openApps.forEach((data, name) => {
      const desk = appDesktopMap.get(name) || 1;
      if (data.windowEl.style.display !== 'none' && desk === currentVirtualDesktop) {
        const z = parseInt(data.windowEl.style.zIndex || '0', 10);
        if (z > maxZ) {
          maxZ = z;
          nextAppToActivate = data.windowEl;
        }
      }
    });
    if (nextAppToActivate) bringToFront(nextAppToActivate);
  }

  syncTaskbarDock();
  updateVirtualDesktopCounts();
}

function minimizeApp(appName: string): void {
  const appData = openApps.get(appName);
  if (!appData) return;
  const { windowEl } = appData;
  windowEl.style.display = 'none';
  windowEl.classList.remove('active');
  minimizedApps.add(appName);

  if (activeWindow === windowEl) {
    activeWindow = null;
    let nextAppToActivate: string | null = null;
    let maxZ = -1;
    openApps.forEach((data, name) => {
      const desk = appDesktopMap.get(name) || 1;
      if (data.windowEl.style.display !== 'none' && desk === currentVirtualDesktop) {
        const z = parseInt(data.windowEl.style.zIndex || '0', 10);
        if (z > maxZ) {
          maxZ = z;
          nextAppToActivate = name;
        }
      }
    });
    if (nextAppToActivate) bringToFront(openApps.get(nextAppToActivate)!.windowEl);
  }
  syncTaskbarDock();
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

  if (items.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'explorer-empty-state';
    emptyDiv.textContent = `This folder (${pathStr}) is empty.`;
    view.appendChild(emptyDiv);
    return;
  }

  items.forEach((item) => {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'window-icon';
    let imgSrc = APP_SVG_ICONS.textFile;
    if (item.type === 'folder') {
      imgSrc = APP_SVG_ICONS.folder;
    } else if (item.type === 'image') {
      imgSrc = APP_SVG_ICONS.imageFile;
    } else if (item.type === 'app') {
      imgSrc = APP_SVG_ICONS.appExe;
    } else if (item.type === 'installer_exe') {
      imgSrc = APP_SVG_ICONS.setupExe;
    }

    const imgEl = document.createElement('img');
    imgEl.src = imgSrc;
    imgEl.alt = item.name;
    imgEl.addEventListener('error', () => {
      if (!imgEl.dataset.fallbackApplied) {
        imgEl.dataset.fallbackApplied = '1';
        imgEl.src = APP_SVG_ICONS.textFile;
      }
    });
    const labelSpan = document.createElement('span');
    labelSpan.textContent = item.name;
    iconDiv.appendChild(imgEl);
    iconDiv.appendChild(labelSpan);

    iconDiv.title =
      item.type === 'installer_exe'
        ? `${item.name} (${(item.sizeMB || 4.2).toFixed(1)} MB Win32 Self-Extracting .EXE Installer — Click to Run)`
        : item.name;
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
      } else if (item.type === 'installer_exe') {
        executeVfsSetupExe(item.name, item.pkgId, item.parent);
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
    if (currentExplorerPath === 'C:\\' || currentExplorerPath === 'D:\\') return;
    const drivePrefix = currentExplorerPath.startsWith('D:\\') ? 'D:\\' : 'C:\\';
    const parts = currentExplorerPath.replace(/\\$/, '').split('\\');
    parts.pop();
    const parent = parts.length <= 1 ? drivePrefix : parts.join('\\');
    renderExplorerFolder(parent);
  });

  windowElement.querySelector('#explorer-root-btn')?.addEventListener('click', () => {
    sfx.playClick();
    renderExplorerFolder('C:\\');
  });

  windowElement.querySelector('#explorer-drive-d-btn')?.addEventListener('click', () => {
    sfx.playClick();
    if (!partitionTable.logicalD.exists || !systemRegistry.enableSecondaryDriveD) {
      showOsDialog('Logical Drive D:\\ is currently unallocated or unmounted. Open FDISK.EXE to create Drive D:\\!', 'Drive D:\\ Not Ready');
      return;
    }
    renderExplorerFolder('D:\\');
  });

  windowElement.querySelector('#explorer-downloads-btn')?.addEventListener('click', () => {
    sfx.playClick();
    renderExplorerFolder('C:\\Downloads');
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

// --- 2. MULTI-ENGINE REINSTALLABLE WEB BROWSER BRIDGE ---
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

  if (data && data.__gemini95DownloadExe === true && typeof data.pkgId === 'string') {
    const dropped = dropSetupExeToVfs(data.pkgId);
    if (dropped) {
      if (data.runNow) {
        executeVfsSetupExe(dropped.fileName, data.pkgId, dropped.folder);
      } else {
        showOsDialog(
          `Downloaded "${dropped.fileName}" to ${dropped.folder}! Open My Gemtop -> Downloads (or type ${dropped.fileName} in MS-DOS) to run the .EXE installer.`,
          'Tucows 95 .EXE Download Complete',
        );
      }
    }
    return;
  }

  if (data && data.__gemini95SwitchToAi === true) {
    switchBrowserToAiMode(typeof data.url === 'string' ? data.url : undefined);
    return;
  }

  if (data && data.__gemini95OpenSettings === true) {
    openMasterSettingsTab(typeof data.tab === 'string' ? (data.tab as any) : 'browser');
    return;
  }

  if (data && data.__gemini95OpenInstaller === true) {
    openAbilityToInstallCategory((data.cat as any) || 'browser');
    return;
  }

  if (data && data.__gemini95Navigate === true && typeof data.url === 'string') {
    let targetUrl = data.url.trim();
    if (
      !/^(live:|ai:|chrome:|about:|file:|https?:)/i.test(targetUrl)
    ) {
      const addrEl = document.querySelector('#chrome .browser-address-bar') as HTMLInputElement | null;
      const currentAddr = addrEl?.value.trim() || '';
      if (currentAddr.startsWith('http://') || currentAddr.startsWith('https://')) {
        try {
          targetUrl = new URL(targetUrl, currentAddr).toString();
        } catch {
          targetUrl = 'https://www.geocities.com/' + targetUrl.replace(/^\/+/, '');
        }
      } else {
        targetUrl = 'https://www.geocities.com/' + targetUrl.replace(/^\/+/, '');
      }
    }
    navigateBrowserExternal(targetUrl);
  }
});

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
  const statusEl = document.getElementById('notepad-status');
  const titleEl = document.getElementById('notepad-window-title');

  if (!textarea) return;

  const updateCounts = () => {
    const val = textarea.value.trim();
    const words = val ? val.split(/\s+/).length : 0;
    if (wordCountEl) wordCountEl.textContent = `${words} words · ${textarea.value.length} chars`;
    if (statusEl) {
      const pos = textarea.selectionStart ?? 0;
      const before = textarea.value.slice(0, pos);
      const lines = before.split('\n');
      statusEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
    }
  };
  textarea.addEventListener('input', updateCounts);
  textarea.addEventListener('click', updateCounts);
  textarea.addEventListener('keyup', updateCounts);
  updateCounts();

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
    if (assistantBubble) {
      assistantBubble.textContent = error?.message || 'AI error: check your API key in Settings > Secrets.';
    }
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
    if (minesweeperGameOver || cell.isRevealed || minesweeperFirstClick) return;
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
    minesweeperTimerInterval = window.setInterval(() => {
      if (windowElement.style.display === 'none') return;
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
    } catch (error: any) {
      commentaryElement.textContent = error?.message || 'AI Hint unavailable: check your API key in Settings > Secrets.';
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
  resumeMinesweeperTimer = () => {
    if (!minesweeperFirstClick && !minesweeperGameOver && !minesweeperTimerInterval) {
      startTimer();
    }
  };
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

  let ytControlsBound = false;

  // Visualizer loop
  startMediaVisualizer = () => {
    if (!visCanvas || synthAnimFrameId !== null) return;
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
    synthAnimFrameId = requestAnimationFrame(drawVis);
  };
  startMediaVisualizer();

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

  tabYt?.addEventListener('click', async () => {
    sfx.playClick();
    stopChiptuneSynth();
    tabYt.classList.add('active');
    tabSynth.classList.remove('active');
    synthPanel.style.display = 'none';
    ytPanel.style.display = 'flex';
    if (!mediaPlayerYtInitialized) {
      mediaPlayerYtInitialized = true;
      await setupYouTubePlayer();
    }
  });

  resumeMediaPlayerYtIfNeeded = () => {
    if (ytPanel && ytPanel.style.display !== 'none' && !mediaPlayerYtInitialized) {
      mediaPlayerYtInitialized = true;
      void setupYouTubePlayer();
    }
  };

  async function setupYouTubePlayer() {
    const urlInput = windowElement.querySelector('.media-player-input') as HTMLInputElement;
    const loadButton = windowElement.querySelector('.media-player-load-button') as HTMLButtonElement;
    const videoContainer = windowElement.querySelector('.media-player-video-container') as HTMLDivElement | null;
    const playerContainerDivId = `youtube-player-${appName}`;
    let playerDiv = windowElement.querySelector(`#${playerContainerDivId}`) as HTMLElement | null;
    const playButton = windowElement.querySelector('#media-player-play') as HTMLButtonElement;
    const pauseButton = windowElement.querySelector('#media-player-pause') as HTMLButtonElement;
    const stopButton = windowElement.querySelector('#media-player-stop') as HTMLButtonElement;
    const volumeSlider = windowElement.querySelector('#media-player-volume') as HTMLInputElement | null;
    const progressBar = windowElement.querySelector('#media-player-progress-bar') as HTMLDivElement | null;
    const progressFill = windowElement.querySelector('#media-player-progress-fill') as HTMLDivElement | null;
    const timeEl = windowElement.querySelector('#media-player-time') as HTMLSpanElement | null;

    if (!urlInput || !loadButton || !playButton || !pauseButton || !stopButton) return;
    if (!playerDiv && videoContainer) {
      playerDiv = document.createElement('div');
      playerDiv.id = playerContainerDivId;
      videoContainer.innerHTML = '';
      videoContainer.appendChild(playerDiv);
    }
    if (!playerDiv) return;

    const formatYtTime = (sec: number) => {
      if (!Number.isFinite(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    };

    const createPlayer = (videoId: string) => {
      if (youtubePlayers[appName]) {
        try {
          youtubePlayers[appName].destroy();
        } catch {}
      }
      if (videoContainer) {
        videoContainer.innerHTML = `<div id="${playerContainerDivId}"></div>`;
      } else {
        playerDiv!.innerHTML = '';
      }
      // @ts-ignore
      youtubePlayers[appName] = new YT.Player(playerContainerDivId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: { playsinline: 1, autoplay: 1, controls: 0, modestbranding: 1, rel: 0, fs: 0, origin: window.location.origin },
        events: {
          onReady: (ev: any) => {
            if (volumeSlider) {
              try {
                ev.target.setVolume(parseInt(volumeSlider.value, 10) || 80);
              } catch {}
            }
          },
        },
      });
    };

    if (!ytControlsBound) {
      ytControlsBound = true;

      loadButton.addEventListener('click', () => {
        const videoId = getYouTubeVideoId(urlInput.value.trim());
        if (videoId && ytApiLoaded) createPlayer(videoId);
      });

      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadButton.click();
      });

      windowElement.querySelectorAll('.yt-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const vid = (btn as HTMLElement).dataset.vid;
          if (vid) {
            urlInput.value = vid;
            if (ytApiLoaded) createPlayer(vid);
          }
        });
      });

      playButton.addEventListener('click', () => youtubePlayers[appName]?.playVideo?.());
      pauseButton.addEventListener('click', () => youtubePlayers[appName]?.pauseVideo?.());
      stopButton.addEventListener('click', () => youtubePlayers[appName]?.stopVideo?.());

      volumeSlider?.addEventListener('input', () => {
        const vol = parseInt(volumeSlider.value, 10);
        if (!Number.isNaN(vol)) {
          youtubePlayers[appName]?.setVolume?.(vol);
        }
      });

      progressBar?.addEventListener('click', (e) => {
        const p = youtubePlayers[appName];
        const dur = p?.getDuration?.() || 0;
        if (!dur) return;
        const rect = progressBar.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
        p.seekTo?.(dur * ratio, true);
      });
    }

    try {
      await loadYouTubeApi();
    } catch (error: any) {
      const container = windowElement.querySelector(`#${playerContainerDivId}`) || videoContainer;
      if (container) {
        container.innerHTML = `<p class="media-player-status-message">Could not load YouTube API: ${error.message}</p>`;
      }
      mediaPlayerYtInitialized = false;
      return;
    }

    if (mediaPlayerProgressInterval !== null) clearInterval(mediaPlayerProgressInterval);
    mediaPlayerProgressInterval = window.setInterval(() => {
      const p = youtubePlayers[appName];
      if (!p || typeof p.getCurrentTime !== 'function' || typeof p.getDuration !== 'function') return;
      try {
        const cur = p.getCurrentTime() || 0;
        const dur = p.getDuration() || 0;
        if (progressFill) {
          progressFill.style.width = dur > 0 ? `${Math.min(100, Math.max(0, (cur / dur) * 100)).toFixed(1)}%` : '0%';
        }
        if (timeEl) {
          timeEl.textContent = `${formatYtTime(cur)} / ${formatYtTime(dur)}`;
        }
      } catch {}
    }, 500);

    const activeVid = getYouTubeVideoId(urlInput.value.trim()) || DEFAULT_YOUTUBE_VIDEO_ID;
    createPlayer(activeVid);
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
          '  DIR       List files in C:\\ & D:\\ Virtual File System\n' +
          '  TREE      Render ASCII directory tree of C:\\ & D:\\\n' +
          '  FDISK     Launch MS-DOS Fixed Disk Partitioner (FDISK.EXE)\n' +
          '  ISO       Build & download bootable x86 CD-ROM (GEMINI95_BOOTCD.ISO)\n' +
          '  INSTALL   Launch Ability to Install (Dual-Mode .EXE + Physical OS)\n' +
          '  SETUP     Launch Full Blue-Screen OS Reinstaller (SETUP.EXE)\n' +
          '  *.EXE     Type any .EXE filename (e.g. MSIE30_SETUP.EXE) to run it!\n' +
          '  SYSINFO   Show live CPU, RAM, Disk Partitions & Audio specs\n' +
          '  SETTINGS  Open 8-Tab Master Settings & Control Panel\n' +
          '  REGEDIT   Open Live Registry Editor (REGEDIT.EXE)\n' +
          '  CALC / SOL / ARCADE / SNDREC32 / CALENDAR / TASKMGR / CLIPBRD / TROPHIES / RECYCLE\n' +
          '  BSOD / WINVER / HOTKEYS / FORTUNE / WEATHER / PING <host> / ECHO <txt>\n' +
          '  BIOS      Enter Award CMOS BIOS Setup Utility\n' +
          '  MATRIX    Toggle falling Matrix phosphor code rain\n' +
          '  COLOR     Cycle Green / Amber / White CRT phosphor\n' +
          '  CLS       Clear terminal screen\n' +
          '  CHIME     Play Windows 95 Startup Synth Chime\n' +
          '  * Or type ANY question/prompt to query the Gemini 95 AI DOS Kernel!',
      );
      return;
    }
    if (upper === 'CLS' || upper === 'CLEAR') {
      if (log) log.textContent = '';
      return;
    }
    if (upper === 'DIR') {
      appendLine(` Volume in drive C is ${partitionTable.primaryC.label} (${systemRegistry.fileSystemFormat} · ${partitionTable.primaryC.sizeMB} MB)\n Directory of C:\\ & C:\\Downloads\n`);
      virtualFileSystem.forEach((f) => {
        const tag =
          f.type === 'folder'
            ? '<DIR>       '
            : f.type === 'installer_exe'
              ? `${((f.sizeMB || 4.2) * 1024).toFixed(0).padStart(9)} KB`
              : '     4,096 B';
        appendLine(`  ${f.name.padEnd(24)} ${tag}  ${f.parent}`);
      });
      appendLine(`        ${virtualFileSystem.length} item(s)`);
      return;
    }
    if (upper === 'FDISK' || upper === 'FDISK.EXE' || upper === 'FDISK /MBR' || upper === 'FDISK /?' || upper === 'FDISK HELP') {
      const openWithGuide = upper === 'FDISK /?' || upper === 'FDISK HELP';
      openFdiskScreen(openWithGuide);
      appendLine(
        openWithGuide
          ? 'Launching MS-DOS FDISK.EXE with Interactive FDISK Guide (F1)...'
          : 'Launching MS-DOS Fixed Disk Setup Program (FDISK.EXE)...',
      );
      return;
    }
    if (upper === 'ISO' || upper === 'MAKEISO') {
      downloadBootableIsoImage();
      appendLine('Building El Torito x86 Bootable CD-ROM (.ISO) image...');
      return;
    }
    if (upper === 'SYSINFO' || upper === 'VER') {
      appendLine(
        `OS:         Remix Gemini 95 (4.00.950 B · ${systemRegistry.fileSystemFormat})\n` +
          `CPU:        ${systemRegistry.cpuModel}${systemRegistry.cpuTurboBoost ? ' [TURBO ON]' : ''} + Gemini-4-Hydrogen\n` +
          `Memory:     ${(systemRegistry.installedRamMB * 1024).toLocaleString()}K Extended RAM (${systemRegistry.virtualSwapMB}MB Swap)\n` +
          `Disk 0:     Primary C: ${partitionTable.primaryC.sizeMB}MB · Logical D: ${partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB + 'MB' : 'None'}\n` +
          `Audio:      Sound Blaster 16 DSP (${systemRegistry.dacBitDepth}-bit DAC, Vol ${systemRegistry.masterVolume}%)`,
      );
      return;
    }
    if (upper === 'INSTALL' || upper === 'INSTALL.EXE') {
      openApp('abilityToInstall', true);
      appendLine('Launching C:\\System95\\INSTALL.EXE (Ability to Install)...');
      return;
    }
    if (upper === 'SETUP' || upper === 'SETUP.EXE' || upper === 'FORMAT C:' || upper === 'FORMAT C: /S') {
      openOsReinstallScreen();
      appendLine('Launching Gemini 95 OS Setup & Reinstallation Utility...');
      return;
    }
    if (upper === 'SETTINGS' || upper === 'CONTROL' || upper === 'CONTROL.EXE') {
      openApp('controlPanel', true);
      appendLine('Opening Master Settings & Control Panel...');
      return;
    }
    if (upper === 'REGEDIT' || upper === 'REGEDIT.EXE') {
      openApp('regedit');
      appendLine('Launching Registry Editor (REGEDIT.EXE)...');
      return;
    }
    if (upper === 'BIOS' || upper === 'CMOS') {
      openCmosBiosSetup();
      appendLine('Entering Award CMOS BIOS Setup Utility...');
      return;
    }
    // Execute any matching *_SETUP.EXE or package .EXE typed in MS-DOS!
    if (upper.endsWith('.EXE')) {
      const bareExe = upper.split('\\').pop() || upper;
      const vfsExe = virtualFileSystem.find(
        (f) => f.type === 'installer_exe' && f.name.toUpperCase() === bareExe,
      );
      if (vfsExe) {
        executeVfsSetupExe(vfsExe.name, vfsExe.pkgId, vfsExe.parent);
        appendLine(`Executing Win32 Self-Extracting Installer ${vfsExe.parent}\\${vfsExe.name}...`);
        return;
      }
      const catalogMatch = packageCatalog.find(
        (p) => p.setupExeFileName.toUpperCase() === bareExe || p.exeName.toUpperCase() === bareExe,
      );
      if (catalogMatch) {
        if (catalogMatch.setupExeFileName.toUpperCase() === bareExe || !catalogMatch.installed) {
          const dropped = dropSetupExeToVfs(catalogMatch.pkgId);
          executeVfsSetupExe(dropped?.fileName || catalogMatch.setupExeFileName, catalogMatch.pkgId, dropped?.folder);
          appendLine(`Unpacking ${catalogMatch.setupExeFileName}...`);
        } else {
          openApp(catalogMatch.appWindowId);
          appendLine(`Starting ${catalogMatch.exeName}...`);
        }
        return;
      }
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
    if (upper === 'TREE') {
      appendLine('C:\\\n├── Downloads\\\n├── Documents\\\n├── Pictures\\\n└── System95\\\nD:\\\n└── Installers\\');
      return;
    }
    if (upper === 'FORTUNE') {
      const fortunes = [
        'A 1.44MB floppy disk saved today prevents 100 tears tomorrow.',
        'Beware of Abominable Snowmen past 400 meters.',
        'Angel Pilot knows less than a 486DX without math co-processor.',
        'Your next Solitaire game ends in cascading bouncing cards.',
      ];
      appendLine(fortunes[Math.floor(Math.random() * fortunes.length)]);
      return;
    }
    if (upper === 'WEATHER') {
      appendLine('DOPPLER 95 FORECAST: 72°F · Clear skies · Ideal 56k dial-up modem conditions.');
      return;
    }
    if (upper.startsWith('ECHO ')) {
      appendLine(trimmed.slice(5));
      return;
    }
    if (upper.startsWith('PING')) {
      const host = trimmed.slice(4).trim() || 'geocities.com';
      appendLine(`Pinging ${host} [198.105.232.4] with 32 bytes of data:\nReply from ${host}: bytes=32 time=142ms TTL=56\nReply from ${host}: bytes=32 time=138ms TTL=56\nPackets: Sent = 2, Received = 2, Lost = 0 (0% loss)`);
      return;
    }
    const dosDirectMap: Record<string, string> = {
      CALC: 'calcApp',
      'CALC.EXE': 'calcApp',
      SOL: 'solitaireApp',
      'SOL.EXE': 'solitaireApp',
      SOLITAIRE: 'solitaireApp',
      ARCADE: 'arcadeApp',
      'ARCADE95.EXE': 'arcadeApp',
      SNAKE: 'arcadeApp',
      TETRIS: 'arcadeApp',
      SKIFREE: 'arcadeApp',
      SNDREC32: 'soundRecorder',
      'SNDREC32.EXE': 'soundRecorder',
      CALENDAR: 'calendarApp',
      'CALENDAR.EXE': 'calendarApp',
      TASKMGR: 'taskManager',
      'TASKMGR.EXE': 'taskManager',
      RECYCLE: 'recycleBin',
      CLIPBRD: 'clipViewer',
      TROPHIES: 'trophiesApp',
    };
    if (dosDirectMap[upper]) {
      openApp(dosDirectMap[upper]);
      appendLine(`Launching ${upper}...`);
      return;
    }
    if (upper === 'BSOD') {
      triggerBsodPrank('DOS Command BSOD executed from COMMAND.COM');
      return;
    }
    if (upper === 'WINVER') {
      openWinverModal();
      appendLine('Angel-OS 95 (Version 4.00.950 B · Five Trillion Features Pack)');
      return;
    }
    if (upper === 'HOTKEYS') {
      openHotkeysModal();
      return;
    }
    if (upper.startsWith('OPEN ')) {
      const target = upper.replace('OPEN ', '').trim();
      const map: Record<string, string> = {
        NETSCAPE: 'chrome',
        BROWSER: 'chrome',
        CHROME: 'chrome',
        IE: 'chrome',
        INSTALL: 'abilityToInstall',
        SETTINGS: 'controlPanel',
        REGEDIT: 'regedit',
        SYSMON: 'sysMonitor',
        PAINT: 'paint',
        NOTES: 'notepad',
        AIM: 'gemini',
        SWEEPER: 'minesweeper',
        PLAYER: 'mediaPlayer',
        DOOM: 'doom',
        CALC: 'calcApp',
        SOL: 'solitaireApp',
        ARCADE: 'arcadeApp',
        SOUND: 'soundRecorder',
        CALENDAR: 'calendarApp',
        TASKMGR: 'taskManager',
        RECYCLE: 'recycleBin',
        CLIPBOARD: 'clipViewer',
        TROPHIES: 'trophiesApp',
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

// --- 11. THEME HELPERS (Backed by Master SystemRegistry) ---
const THEMES = ['standard', 'hotdog', 'cyberpunk', 'vaporwave', 'matrix', 'win31', 'highcontrast'] as const;
let currentThemeIndex = 0;

function applyTheme(themeName: string) {
  systemRegistry.useCustomColors = false;
  systemRegistry.themePreset = themeName as any;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
}

// --- Desktop Interactions, Selection Marquee, Context Menu & Taskbar ---
icons.forEach((icon) => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    icons.forEach((i) => i.classList.remove('selected'));
    icon.classList.add('selected');
    if (!systemRegistry.doubleClickIcons) {
      const appName = icon.getAttribute('data-app');
      if (appName) {
        openApp(appName);
        startMenu.classList.remove('active');
      }
    } else {
      sfx.playClick();
    }
  });

  icon.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    if (systemRegistry.doubleClickIcons) {
      const appName = icon.getAttribute('data-app');
      if (appName) {
        openApp(appName);
        startMenu.classList.remove('active');
      }
    }
  });
});

const startPinnedView = document.getElementById('start-pinned-view') as HTMLDivElement | null;
const startAllAppsView = document.getElementById('start-all-apps-view') as HTMLDivElement | null;
const startMenuSearchInput = document.getElementById('start-menu-search-input') as HTMLInputElement | null;
const startAllAppsTitle = document.getElementById('start-all-apps-title');
const startPowerMenu = document.getElementById('start-power-menu') as HTMLDivElement | null;

function setStartMenuView(mode: 'pinned' | 'all', filterText = ''): void {
  const q = filterText.trim().toLowerCase();
  if (mode === 'pinned' && !q) {
    if (startPinnedView) startPinnedView.style.display = 'flex';
    if (startAllAppsView) startAllAppsView.style.display = 'none';
  } else {
    if (startPinnedView) startPinnedView.style.display = 'none';
    if (startAllAppsView) startAllAppsView.style.display = 'flex';
    if (startAllAppsTitle) {
      startAllAppsTitle.textContent = q ? `Search results: "${filterText.trim()}"` : 'All apps';
    }
    document.querySelectorAll('#start-all-apps-list .start-menu-item').forEach((el) => {
      const txt = (el.textContent || '').toLowerCase();
      (el as HTMLElement).style.display = !q || txt.includes(q) ? 'flex' : 'none';
    });
  }
}

function closeStartMenuUi(): void {
  startMenu.classList.remove('active');
  if (startPowerMenu) startPowerMenu.style.display = 'none';
  if (startMenuSearchInput) startMenuSearchInput.value = '';
  setStartMenuView('pinned', '');
}

document.querySelectorAll('.start-menu-item').forEach((item) => {
  item.addEventListener('click', () => {
    const appName = (item as HTMLElement).getAttribute('data-app');
    if (appName) openApp(appName);
    closeStartMenuUi();
  });
});

startMenuSearchInput?.addEventListener('input', () => {
  const val = startMenuSearchInput.value;
  setStartMenuView(val.trim() ? 'all' : 'pinned', val);
});

startMenuSearchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstMatch = Array.from(
      document.querySelectorAll('#start-all-apps-list .start-menu-item'),
    ).find((el) => (el as HTMLElement).style.display !== 'none') as HTMLElement | undefined;
    firstMatch?.click();
  } else if (e.key === 'Escape') {
    closeStartMenuUi();
  }
});

document.getElementById('start-all-apps-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  setStartMenuView('all', '');
});

document.getElementById('start-more-rec-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  setStartMenuView('all', '');
});

document.getElementById('start-back-pinned-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (startMenuSearchInput) startMenuSearchInput.value = '';
  setStartMenuView('pinned', '');
});

document.getElementById('start-bios-shortcut-tile')?.addEventListener('click', () => {
  closeStartMenuUi();
  openCmosBiosSetup();
});

document.getElementById('start-rec-chrome-dl')?.addEventListener('click', () => {
  closeStartMenuUi();
  openApp('chrome').then(() => navigateBrowserExternal('chrome://downloads'));
});

document.getElementById('start-rec-bios')?.addEventListener('click', () => {
  closeStartMenuUi();
  openCmosBiosSetup();
});

document.getElementById('start-rec-fdisk')?.addEventListener('click', () => {
  closeStartMenuUi();
  openFdiskScreen(true);
});

document.getElementById('start-power-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (!startPowerMenu) return;
  const isVis = startPowerMenu.style.display !== 'none';
  startPowerMenu.style.display = isVis ? 'none' : 'flex';
});

document.getElementById('start-open-bios-menu')?.addEventListener('click', () => {
  closeStartMenuUi();
  openCmosBiosSetup();
});

document.getElementById('start-sleep-saver')?.addEventListener('click', () => {
  closeStartMenuUi();
  startScreensaverNow();
});

document.getElementById('start-power-reinstall')?.addEventListener('click', () => {
  closeStartMenuUi();
  openOsReinstallScreen();
});

document.getElementById('start-sound-chime')?.addEventListener('click', () => {
  sfx.playStartupChime();
  closeStartMenuUi();
});

document.getElementById('start-os-reinstall')?.addEventListener('click', () => {
  closeStartMenuUi();
  openOsReinstallScreen();
});

document.getElementById('start-run-dialog')?.addEventListener('click', () => {
  closeStartMenuUi();
  openRunDialog();
});

document.getElementById('start-new-sticky')?.addEventListener('click', () => {
  closeStartMenuUi();
  spawnCustomStickyNote();
});

document.getElementById('start-bsod-prank')?.addEventListener('click', () => {
  closeStartMenuUi();
  triggerBsodPrank('Manually triggered BSOD 95 Simulator from Start Menu!');
});

document.getElementById('start-hotkeys-btn')?.addEventListener('click', () => {
  closeStartMenuUi();
  openHotkeysModal();
});

document.getElementById('start-winver-btn')?.addEventListener('click', () => {
  closeStartMenuUi();
  openWinverModal();
});

document.querySelectorAll('.start-menu-folder').forEach((folder) => {
  folder.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.start-submenu')) return;
    e.stopPropagation();
    document.querySelectorAll('.start-menu-folder').forEach((f) => {
      if (f !== folder) f.classList.remove('open');
    });
    folder.classList.toggle('open');
  });
});

startButton.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  const willOpen = !startMenu.classList.contains('active');
  closeWin11Popups();
  if (willOpen) {
    startMenu.classList.add('active');
    if (startPowerMenu) startPowerMenu.style.display = 'none';
    highestZIndex++;
    startMenu.style.zIndex = highestZIndex.toString();
  } else {
    closeStartMenuUi();
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
  systemRegistry.crtEnabled = !systemRegistry.crtEnabled;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
});

document.getElementById('tray-sound-btn')?.addEventListener('click', () => {
  systemRegistry.audioEnabled = !systemRegistry.audioEnabled;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
  if (sfx.enabled) sfx.playClick();
});

function updateClock() {
  const clockEl = document.getElementById('tray-clock');
  if (!clockEl) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: systemRegistry.clockShowSeconds ? '2-digit' : undefined,
    hour12: !systemRegistry.clock24Hour,
  });
  const dateStr = now.toLocaleDateString([], {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
  const timeSpan = clockEl.querySelector('.tray-clock-time');
  const dateSpan = clockEl.querySelector('.tray-clock-date');
  if (timeSpan && dateSpan) {
    timeSpan.textContent = timeStr;
    dateSpan.textContent = dateStr;
  } else {
    clockEl.textContent = timeStr;
  }
}
updateClock();
setInterval(updateClock, 1000);

// Sticky note dismiss
document.getElementById('sticky-close')?.addEventListener('click', () => {
  sfx.playClick();
  systemRegistry.showWelcomeSticky = false;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
});

// Right-Click Desktop Context Menu
const contextMenu = document.getElementById('desktop-context-menu') as HTMLDivElement | null;
desktop.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement).closest('.window')) return;
  e.preventDefault();
  if (!contextMenu) return;
  contextMenu.style.display = 'block';
  contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 220)}px`;
  contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 250)}px`;
});

contextMenu?.querySelectorAll('.ctx-item').forEach((item) => {
  item.addEventListener('click', () => {
    sfx.playClick();
    const action = (item as HTMLElement).dataset.action;
    contextMenu.style.display = 'none';
    if (action === 'open-installer') openApp('abilityToInstall', true);
    else if (action === 'open-regedit') openApp('regedit');
    else if (action === 'open-taskmgr') openApp('taskManager');
    else if (action === 'open-run') openRunDialog();
    else if (action === 'spawn-sticky') spawnCustomStickyNote();
    else if (action === 'open-trophies') openApp('trophiesApp');
    else if (action === 'open-dos') openApp('dosPrompt');
    else if (action === 'new-note') openApp('notepad');
    else if (action === 'open-paint') openApp('paint');
    else if (action === 'open-display') openApp('controlPanel', true);
    else if (action === 'cycle-theme') {
      currentThemeIndex = Math.max(0, THEMES.indexOf(systemRegistry.themePreset as any));
      currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
      applyTheme(THEMES[currentThemeIndex]);
    } else if (action === 'toggle-crt') {
      systemRegistry.crtEnabled = !systemRegistry.crtEnabled;
      applySystemRegistryToOS();
      renderMasterSettingsCurrentTab();
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
  const targetNode = e.target as Node;
  const targetEl = e.target as HTMLElement | null;
  if (startPowerMenu && startPowerMenu.style.display !== 'none' && !targetEl?.closest('.start-power-wrap')) {
    startPowerMenu.style.display = 'none';
  }
  if (startMenu.classList.contains('active') && !startMenu.contains(targetNode) && !startButton.contains(targetNode)) {
    closeStartMenuUi();
  }
  if (contextMenu && contextMenu.style.display !== 'none' && !contextMenu.contains(targetNode)) {
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
      const tbH = getTaskbarHeightPx();
      const isTop = systemRegistry.taskbarPosition === 'top';
      const minY = isTop ? tbH : 0;
      const maxY = Math.max(minY, window.innerHeight - (isTop ? 0 : tbH) - 36);
      const minX = -(windowElement.offsetWidth - 60);
      const maxXAdjusted = window.innerWidth - 60;
      x = Math.max(minX, Math.min(x, maxXAdjusted));
      y = Math.max(minY, Math.min(y, maxY));
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
  unlockAchievement('first_boot');
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
  if (systemRegistry.biosBootOrder === 'CDROM_C_A') {
    openOsReinstallScreen();
    return;
  }
  if (!isPrimaryBootable()) {
    sfx.playChordError();
    if (biosStatusLine) {
      biosStatusLine.style.color = '#ff5555';
      biosStatusLine.textContent =
        '⚠ DISK BOOT FAILURE / MISSING OPERATING SYSTEM — PRESS [F9] FOR FDISK OR [F8] FOR OS SETUP CD-ROM';
    }
    return;
  }
  if (biosStatusLine) biosStatusLine.style.color = '';
  bootState = 'post_running';
  clearBootTimers();

  if (systemRegistry.audioEnabled) {
    sfx.enabled = true;
    sfx.playPostBeep();
  }

  if (biosStatusLine) {
    biosStatusLine.textContent = 'POST OK — INITIALIZING SOUND BLASTER 16 & BOOTING GEMINI 95...';
  }

  const maxRamKb = systemRegistry.installedRamMB * 1024;
  if (systemRegistry.biosQuickPost) {
    if (biosRamCounter) biosRamCounter.textContent = `${maxRamKb}K OK (QUICK POST)`;
  } else {
    let ram = Math.min(16384, maxRamKb);
    const stepInc = Math.max(8192, Math.floor(maxRamKb / 4));
    const ramStep = () => {
      ram = Math.min(maxRamKb, ram + stepInc);
      if (biosRamCounter) biosRamCounter.textContent = `${ram}K OK`;
      if (ram < maxRamKb) {
        bootTimeouts.push(window.setTimeout(ramStep, 90));
      }
    };
    if (biosRamCounter) biosRamCounter.textContent = `${ram}K`;
    bootTimeouts.push(window.setTimeout(ramStep, 90));
    bootTimeouts.push(window.setTimeout(() => sfx.playFloppySeek(), 180));
  }

  // Transition to Stage 2: Windows 11 + 10 Boot Splash + Lo-Fi Eno Synth Chime
  const biosZeroWait = isBiosZeroWaitPost();
  const postDelay = biosZeroWait ? 80 : systemRegistry.biosQuickPost ? 220 : 650;
  const splashDelay = biosZeroWait ? 450 : systemRegistry.biosQuickPost ? 1800 : 3400;
  const splashTimer = window.setTimeout(() => {
    bootState = 'splash';
    if (bootBiosStage) bootBiosStage.style.display = 'none';
    if (bootSplashStage) bootSplashStage.style.display = 'flex';
    if (systemRegistry.biosBootAudio) {
      sfx.playStartupChime();
    }

    const completeTimer = window.setTimeout(() => {
      finishBootToDesktop();
    }, splashDelay);
    bootTimeouts.push(completeTimer);
  }, postDelay);
  bootTimeouts.push(splashTimer);
}

function rebootGemini95() {
  clearBootTimers();
  closeStartMenuUi();
  bootState = 'bios';
  applySystemRegistryToOS(true);
  if (biosStatusLine) {
    biosStatusLine.style.color = isPrimaryBootable() ? '' : '#ff5555';
    biosStatusLine.textContent = isPrimaryBootable()
      ? 'SYSTEM READY — CLICK BELOW OR PRESS [ENTER] TO POWER ON, [DEL] CMOS, OR [F9] FDISK'
      : '⚠ MISSING OPERATING SYSTEM ON C:\\ — PRESS [F9] FOR FDISK OR [F8] FOR OS SETUP CD-ROM';
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
  if (!isPrimaryBootable()) {
    startBootWithAudio();
    return;
  }
  finishBootToDesktop();
});

splashSkipBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  finishBootToDesktop();
});

document.getElementById('start-reboot-os')?.addEventListener('click', () => {
  closeStartMenuUi();
  rebootGemini95();
});

window.addEventListener('keydown', (e) => {
  const cmosOpen = document.getElementById('cmos-bios-screen')?.style.display === 'flex';
  const setupOpen = document.getElementById('os-reinstall-screen')?.style.display === 'flex';
  const fdiskOpen = document.getElementById('fdisk-screen')?.style.display === 'flex';
  if (fdiskOpen && e.key === 'Escape') {
    e.preventDefault();
    document.getElementById('fdisk-exit-btn')?.click();
    return;
  }
  if (cmosOpen || setupOpen || fdiskOpen) return;

  if (bootState === 'bios') {
    if (e.key === 'Delete' || e.key === 'F2') {
      e.preventDefault();
      openCmosBiosSetup();
    } else if (e.key === 'F8') {
      e.preventDefault();
      openOsReinstallScreen();
    } else if (e.key === 'F9') {
      e.preventDefault();
      openFdiskScreen();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startBootWithAudio();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isPrimaryBootable()) finishBootToDesktop();
      else startBootWithAudio();
    }
  } else if (bootState === 'splash' && e.key === 'Escape') {
    e.preventDefault();
    finishBootToDesktop();
  }
});

// ==================== WINDOWS 11 IN WINDOWS 95 CONTROLLERS ====================

const snapFlyout = document.getElementById('snap-layouts-flyout') as HTMLDivElement | null;
const widgetsBoard = document.getElementById('win11-widgets-board') as HTMLDivElement | null;
const searchFlyout = document.getElementById('win11-search-flyout') as HTMLDivElement | null;
const taskviewOverlay = document.getElementById('win11-taskview-overlay') as HTMLDivElement | null;
const copilotSidebar = document.getElementById('win11-copilot-sidebar') as HTMLDivElement | null;
const quickSettings = document.getElementById('win11-quick-settings') as HTMLDivElement | null;

function closeWin11Popups(except?: HTMLElement | null) {
  [snapFlyout, widgetsBoard, searchFlyout, taskviewOverlay, quickSettings].forEach((el) => {
    if (el && el !== except) el.style.display = 'none';
  });
}

// --- 1. SNAP LAYOUTS 95 (Hover Maximize Button □ or Snap Zones) ---
let snapTargetWindow: HTMLDivElement | null = null;
let snapHideTimer: number | null = null;

function snapWindowToZone(winEl: HTMLDivElement, zone: string) {
  sfx.playWindowOpen();
  winEl.classList.remove('maximized');
  winEl.style.display = 'flex';
  minimizedApps.delete(winEl.id);
  bringToFront(winEl);

  const copilotWidth = copilotSidebar && copilotSidebar.style.display !== 'none' ? 320 : 0;
  const tbH = getTaskbarHeightPx();
  const topBase = systemRegistry.taskbarPosition === 'top' ? tbH : 0;
  const availW = window.innerWidth - copilotWidth;
  const availH = Math.max(200, window.innerHeight - tbH);
  const halfW = Math.floor(availW / 2);
  const halfH = Math.floor(availH / 2);
  const thirdW = Math.floor(availW / 3);

  switch (zone) {
    case 'left-half':
      winEl.style.left = '0px';
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${halfW}px`;
      winEl.style.height = `${availH}px`;
      break;
    case 'right-half':
      winEl.style.left = `${halfW}px`;
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${availW - halfW}px`;
      winEl.style.height = `${availH}px`;
      break;
    case 'col-left':
      winEl.style.left = '0px';
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${thirdW}px`;
      winEl.style.height = `${availH}px`;
      break;
    case 'col-center':
      winEl.style.left = `${thirdW}px`;
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${thirdW}px`;
      winEl.style.height = `${availH}px`;
      break;
    case 'col-right':
      winEl.style.left = `${thirdW * 2}px`;
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${availW - thirdW * 2}px`;
      winEl.style.height = `${availH}px`;
      break;
    case 'top-left':
      winEl.style.left = '0px';
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${halfW}px`;
      winEl.style.height = `${halfH}px`;
      break;
    case 'top-right':
      winEl.style.left = `${halfW}px`;
      winEl.style.top = `${topBase}px`;
      winEl.style.width = `${availW - halfW}px`;
      winEl.style.height = `${halfH}px`;
      break;
    case 'bottom-left':
      winEl.style.left = '0px';
      winEl.style.top = `${topBase + halfH}px`;
      winEl.style.width = `${halfW}px`;
      winEl.style.height = `${availH - halfH}px`;
      break;
    case 'bottom-right':
      winEl.style.left = `${halfW}px`;
      winEl.style.top = `${topBase + halfH}px`;
      winEl.style.width = `${availW - halfW}px`;
      winEl.style.height = `${availH - halfH}px`;
      break;
  }
}

function autoTileOpenWindows() {
  sfx.playWindowOpen();
  const visibleWins: HTMLDivElement[] = [];
  openApps.forEach((data) => {
    if (data.windowEl.style.display !== 'none') visibleWins.push(data.windowEl);
  });
  if (visibleWins.length === 0) {
    showOsDialog('Open at least 1 application window to tile across the desktop!', 'Snap & Tile 95');
    return;
  }
  if (visibleWins.length === 1) {
    snapWindowToZone(visibleWins[0], 'left-half');
  } else if (visibleWins.length === 2) {
    snapWindowToZone(visibleWins[0], 'left-half');
    snapWindowToZone(visibleWins[1], 'right-half');
  } else if (visibleWins.length === 3) {
    snapWindowToZone(visibleWins[0], 'left-half');
    snapWindowToZone(visibleWins[1], 'top-right');
    snapWindowToZone(visibleWins[2], 'bottom-right');
  } else {
    const zones = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    visibleWins.forEach((w, i) => snapWindowToZone(w, zones[i % zones.length]));
  }
}

function cascadeOpenWindows() {
  sfx.playClick();
  const topBase = systemRegistry.taskbarPosition === 'top' ? getTaskbarHeightPx() : 0;
  let i = 0;
  openApps.forEach((data) => {
    if (data.windowEl.style.display !== 'none') {
      data.windowEl.classList.remove('maximized');
      data.windowEl.style.left = `${140 + (i % 6) * 32}px`;
      data.windowEl.style.top = `${topBase + 24 + (i % 5) * 28}px`;
      data.windowEl.style.width = '540px';
      data.windowEl.style.height = '400px';
      clampWindowToViewport(data.windowEl, true);
      bringToFront(data.windowEl);
      i++;
    }
  });
}

windows.forEach((winEl) => {
  const maxBtn = winEl.querySelector('.window-maximize') as HTMLElement | null;
  if (!maxBtn || !snapFlyout) return;

  let snapShowTimer: number | null = null;

  maxBtn.addEventListener('mouseenter', () => {
    if (!systemRegistry.snapLayoutsEnabled) return;
    if (snapHideTimer) clearTimeout(snapHideTimer);
    if (snapShowTimer) clearTimeout(snapShowTimer);
    snapShowTimer = window.setTimeout(() => {
      snapTargetWindow = winEl;
      const rect = maxBtn.getBoundingClientRect();
      const leftPos = Math.min(window.innerWidth - 260, Math.max(8, rect.right - 220));
      const minTop = systemRegistry.taskbarPosition === 'top' ? getTaskbarHeightPx() + 4 : 4;
      const topPos = Math.max(minTop, Math.min(window.innerHeight - 160, rect.bottom + 4));
      snapFlyout.style.left = `${leftPos}px`;
      snapFlyout.style.top = `${topPos}px`;
      snapFlyout.style.display = 'block';
    }, systemRegistry.snapHoverDelayMs);
  });

  maxBtn.addEventListener('mouseleave', () => {
    if (snapShowTimer) clearTimeout(snapShowTimer);
    snapHideTimer = window.setTimeout(() => {
      if (snapFlyout) snapFlyout.style.display = 'none';
    }, 280);
  });
});

snapFlyout?.addEventListener('mouseenter', () => {
  if (snapHideTimer) clearTimeout(snapHideTimer);
});

snapFlyout?.addEventListener('mouseleave', () => {
  if (snapFlyout) snapFlyout.style.display = 'none';
});

snapFlyout?.querySelectorAll('.snap-zone').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const zone = (btn as HTMLElement).dataset.snap;
    if (snapTargetWindow && zone) {
      snapWindowToZone(snapTargetWindow, zone);
    }
    if (snapFlyout) snapFlyout.style.display = 'none';
  });
});

// --- 2. TASK VIEW & VIRTUAL DESKTOPS 95 ---
function updateVirtualDesktopCounts() {
  [1, 2, 3].forEach((d) => {
    let count = 0;
    openApps.forEach((_, appName) => {
      const assigned = appDesktopMap.get(appName) || 1;
      if (assigned === d) count++;
    });
    const label = document.getElementById(`vdesk-count-${d}`);
    if (label) {
      label.textContent = `${count} open window(s)${d === currentVirtualDesktop ? ' · Active' : ''}`;
    }
  });
}

function switchVirtualDesktop(deskNum: number) {
  sfx.playWindowOpen();
  // Assign any currently unassigned open apps to currentVirtualDesktop before switching
  openApps.forEach((_, appName) => {
    if (!appDesktopMap.has(appName)) appDesktopMap.set(appName, currentVirtualDesktop);
  });

  currentVirtualDesktop = deskNum;
  const deskBadge = document.getElementById('taskbar-desk-badge');
  if (deskBadge) deskBadge.textContent = String(deskNum);
  const taskViewBtn = document.getElementById('taskbar-taskview-btn');
  if (taskViewBtn) taskViewBtn.title = `Task View & Virtual Desktops (Desktop ${deskNum})`;

  document.querySelectorAll('.vdesk-card').forEach((card) => {
    card.classList.toggle('active', Number((card as HTMLElement).dataset.desk) === deskNum);
  });

  openApps.forEach((data, appName) => {
    const appDesk = appDesktopMap.get(appName) || 1;
    data.windowEl.style.display = appDesk === deskNum && !minimizedApps.has(appName) ? 'flex' : 'none';
  });

  if (activeWindow) {
    const activeDesk = appDesktopMap.get(activeWindow.id) || 1;
    if (activeDesk !== deskNum || minimizedApps.has(activeWindow.id)) {
      activeWindow.classList.remove('active');
      activeWindow = null;
    }
  }
  if (!activeWindow) {
    let topWin: HTMLDivElement | null = null;
    let maxZ = -1;
    openApps.forEach((data, name) => {
      const appDesk = appDesktopMap.get(name) || 1;
      if (appDesk === deskNum && !minimizedApps.has(name) && data.windowEl.style.display !== 'none') {
        const z = parseInt(data.windowEl.style.zIndex || '0', 10);
        if (z > maxZ) {
          maxZ = z;
          topWin = data.windowEl;
        }
      }
    });
    if (topWin) bringToFront(topWin);
  }

  syncTaskbarDock();
  updateVirtualDesktopCounts();
}

document.getElementById('taskbar-taskview-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (!taskviewOverlay) return;
  const isVis = taskviewOverlay.style.display !== 'none';
  closeWin11Popups(taskviewOverlay);
  openApps.forEach((_, appName) => {
    if (!appDesktopMap.has(appName)) appDesktopMap.set(appName, currentVirtualDesktop);
  });
  updateVirtualDesktopCounts();
  taskviewOverlay.style.display = isVis ? 'none' : 'block';
});

document.getElementById('taskview-close-btn')?.addEventListener('click', () => {
  if (taskviewOverlay) taskviewOverlay.style.display = 'none';
});

document.querySelectorAll('.vdesk-card').forEach((card) => {
  card.addEventListener('click', () => {
    const desk = Number((card as HTMLElement).dataset.desk || '1');
    switchVirtualDesktop(desk);
    if (taskviewOverlay) taskviewOverlay.style.display = 'none';
  });
});

document.getElementById('taskview-tile-btn')?.addEventListener('click', () => {
  if (taskviewOverlay) taskviewOverlay.style.display = 'none';
  autoTileOpenWindows();
});

document.getElementById('taskview-cascade-btn')?.addEventListener('click', () => {
  if (taskviewOverlay) taskviewOverlay.style.display = 'none';
  cascadeOpenWindows();
});

// --- 3. WIDGETS BOARD 95 (Weather, NASDAQ '95 Stocks, Focus Pomodoro, AI 1995 News) ---
const stocks95 = [
  { sym: 'MSFT', name: 'Microsoft', price: 89.5, change: +4.25 },
  { sym: 'NSCP', name: 'Netscape', price: 58.25, change: +12.75 },
  { sym: 'INTC', name: 'Intel Pentium', price: 64.12, change: +2.15 },
  { sym: 'AAPL', name: 'Apple Computer', price: 38.75, change: -0.62 },
  { sym: 'SUNW', name: 'Sun Micro (Java)', price: 51.4, change: +5.8 },
];

function renderStocksWidget() {
  const listEl = document.getElementById('widget-stock-list');
  if (!listEl) return;
  listEl.innerHTML = stocks95
    .map((s) => {
      const sign = s.change >= 0 ? '+' : '';
      const cls = s.change >= 0 ? 'stock-up' : 'stock-down';
      return `<div class="stock-row95"><span><b>${s.sym}</b> (${s.name})</span><span class="${cls}">$${s.price.toFixed(2)} (${sign}${s.change.toFixed(2)})</span></div>`;
    })
    .join('');
}
renderStocksWidget();

document.getElementById('widget-stock-boom-btn')?.addEventListener('click', () => {
  sfx.playClick();
  stocks95.forEach((s) => {
    const delta = (Math.random() * 8 - 1.5);
    s.price = Math.max(12, s.price + delta);
    s.change = delta;
  });
  renderStocksWidget();
});

const weatherCitySelect = document.getElementById('widget-weather-city') as HTMLSelectElement | null;
weatherCitySelect?.addEventListener('change', () => {
  sfx.playClick();
  const [city, temp, desc] = weatherCitySelect.value.split('|');
  const tempEl = document.getElementById('widget-temp-val');
  const descEl = document.getElementById('widget-weather-desc');
  const taskbarWidgetsBtn = document.getElementById('taskbar-widgets-btn');
  if (tempEl) tempEl.textContent = temp;
  if (descEl) descEl.textContent = `${city} · ${desc}`;
  if (taskbarWidgetsBtn) taskbarWidgetsBtn.title = `Widgets Board — ${city}: ${temp} (${desc})`;
});

// Focus Session 95 Pomodoro Timer
let focusRemainingSec = 25 * 60;
let focusIntervalId: number | null = null;
let focusStreak = 1;

function updateFocusDisplay() {
  const disp = document.getElementById('focus-timer-display');
  if (!disp) return;
  const m = String(Math.floor(focusRemainingSec / 60)).padStart(2, '0');
  const s = String(focusRemainingSec % 60).padStart(2, '0');
  disp.textContent = `${m}:${s}`;
}

document.getElementById('focus-start-btn')?.addEventListener('click', () => {
  sfx.playClick();
  const startBtn = document.getElementById('focus-start-btn');
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
    if (startBtn) startBtn.textContent = '▶ Resume Focus';
    return;
  }
  if (startBtn) startBtn.textContent = '⏸ Pause';
  focusIntervalId = window.setInterval(() => {
    if (focusRemainingSec > 0) {
      focusRemainingSec--;
      updateFocusDisplay();
    } else {
      clearInterval(focusIntervalId!);
      focusIntervalId = null;
      focusStreak++;
      focusRemainingSec = 25 * 60;
      updateFocusDisplay();
      const streakEl = document.getElementById('focus-streak-label');
      if (streakEl) streakEl.textContent = `Streak: ${focusStreak} 🔥`;
      if (startBtn) startBtn.textContent = '▶ Start Focus';
      sfx.playStartupChime();
    }
  }, 1000);
});

document.getElementById('focus-reset-btn')?.addEventListener('click', () => {
  sfx.playClick();
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
  }
  focusRemainingSec = 25 * 60;
  updateFocusDisplay();
  const startBtn = document.getElementById('focus-start-btn');
  if (startBtn) startBtn.textContent = '▶ Start Focus';
});

document.getElementById('widget-news-refresh-btn')?.addEventListener('click', async () => {
  sfx.playClick();
  const btn = document.getElementById('widget-news-refresh-btn') as HTMLButtonElement | null;
  const newsBox = document.getElementById('widget-news-list');
  if (!btn || !newsBox) return;
  btn.disabled = true;
  btn.textContent = '⏳ Dialing...';
  try {
    if (!geminiInstance && !(await initializeGeminiIfNeeded('WidgetsNews'))) return;
    const res = await geminiInstance.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents:
        'Generate 3 witty, nostalgic 1-sentence tech or pop-culture news headlines as if written in late 1995. Format each line starting with "• ". Plain text only.',
    });
    const lines = (res.text || '')
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 3);
    if (lines.length > 0) {
      newsBox.innerHTML = lines.map((l: string) => `<p>${l.replace(/[<>&]/g, '')}</p>`).join('');
    }
  } catch (error: any) {
    newsBox.innerHTML = `<p style="color:#800000;">• ${String(error?.message || 'AI Refresh failed').replace(/[<>&]/g, '')}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ AI Refresh';
  }
});

document.getElementById('taskbar-widgets-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (!widgetsBoard) return;
  const isVis = widgetsBoard.style.display !== 'none';
  closeWin11Popups(widgetsBoard);
  widgetsBoard.style.display = isVis ? 'none' : 'flex';
});

document.getElementById('widgets-close-btn')?.addEventListener('click', () => {
  if (widgetsBoard) widgetsBoard.style.display = 'none';
});

// --- 4. UNIVERSAL SEARCH & COMMAND PALETTE 95 ---
const searchInput = document.getElementById('win11-search-input') as HTMLInputElement | null;
const searchResults = document.getElementById('win11-search-results') as HTMLDivElement | null;

const SEARCHABLE_ENTRIES = [
  { label: '💿 Ability to Install (.EXE Installers & Physical OS Setup)', kind: 'Dual Installer', action: () => openApp('abilityToInstall', true) },
  { label: '🔧 MS-DOS FDISK.EXE (Fixed Disk Partitioner: C:\\ & D:\\)', kind: 'Bare-Metal OS', action: () => openFdiskScreen(false) },
  { label: '📖 Interactive FDISK Guide (Step-by-Step 90s Partitioning Coach)', kind: 'FDISK Tutorial', action: () => openFdiskScreen(true) },
  { label: '📲 Install Gemini 95 onto Your Device (Native PWA OS)', kind: 'Physical OS', action: () => triggerNativePwaInstall() },
  { label: '💿 Export Bootable x86 CD-ROM Image (GEMINI95_BOOTCD.ISO)', kind: 'Physical OS', action: () => downloadBootableIsoImage() },
  { label: '💻 Download Portable Desktop App (.HTML Container)', kind: 'Portable .EXE/App', action: () => downloadPortableHostApp('html') },
  { label: '⚙️ Master Settings & Control Panel (8-Tab Deep Config)', kind: 'System Setting', action: () => openApp('controlPanel', true) },
  { label: '🗂️ REGEDIT.EXE (Live Windows 95 Registry Editor)', kind: 'System Utility', action: () => openApp('regedit') },
  { label: '📊 System Resource Monitor (SYSMON.EXE)', kind: 'System Utility', action: () => openApp('sysMonitor') },
  { label: '🌐 Google Chrome / Multi-Engine Browser (Chrome · Netscape · IE 3.0)', kind: 'Application', action: () => openApp('chrome') },
  { label: '💻 My Gemtop (C:\\ & D:\\ Virtual File Explorer)', kind: 'Application', action: () => openApp('myComputer') },
  { label: '💬 Gemini AIM (1995 Instant Messenger)', kind: 'Application', action: () => openApp('gemini') },
  { label: '📝 GemNotes (AI Retro Word Processor)', kind: 'Application', action: () => openApp('notepad') },
  { label: '🎨 GemPaint 95 (Pixel Studio & AI Critic)', kind: 'Application', action: () => openApp('paint') },
  { label: '💣 GemSweeper Deluxe (Minesweeper + AI Advisor)', kind: 'Application', action: () => openApp('minesweeper') },
  { label: '🎹 GemPlayer 95 (16-Bit Chiptune Synth & Retro TV)', kind: 'Application', action: () => openApp('mediaPlayer') },
  { label: '📟 MS-DOS Prompt (COMMAND.COM + AI Kernel)', kind: 'Application', action: () => openApp('dosPrompt') },
  { label: '👹 Doom II (MS-DOS Protected Mode)', kind: 'Game', action: () => openApp('doom') },
  { label: '⚙️ Award / UEFI CMOS BIOS Setup (5,120+ Advanced Features)', kind: 'Firmware', action: () => openCmosBiosSetup() },
  { label: '🔄 Reinstall Gemini 95 OS (Blue-Screen SETUP.EXE)', kind: 'OS Recovery', action: () => openOsReinstallScreen() },
  { label: '🏷️ Toggle Taskbar App Labels (Icon-Only vs Win95 Text)', kind: 'Taskbar Style', action: () => toggleTaskbarLabels() },
  { label: '👼 Angel Pilot (In-Training Joke Copilot · 0% AI)', kind: 'Unhelpful Bot', action: () => {
    if (copilotSidebar) copilotSidebar.style.display = 'flex';
  }},
  { label: '🎯 Toggle Centered Taskbar (Windows 11 Mode)', kind: 'Win11 Feature', action: () => toggleCenteredTaskbar() },
  { label: '⊞ Auto-Tile All Open Windows (Snap Grid)', kind: 'Win11 Feature', action: () => autoTileOpenWindows() },
  { label: '🌙 Toggle Night Light 95 (Warm CRT Filter)', kind: 'Win11 Feature', action: () => toggleNightLight95() },
  { label: '🎵 Play Lo-Fi Eno Startup Chime', kind: 'Audio Synth', action: () => sfx.playStartupChime() },
  { label: '🧮 Scientific Calculator 95 (CALC.EXE)', kind: 'Accessory', action: () => openApp('calcApp') },
  { label: '🃏 Klondike Solitaire 95 (Cascading Cards!)', kind: 'Game', action: () => openApp('solitaireApp') },
  { label: '🕹️ Retro Arcade 95 (Snake / Breakout / Blocks / SkiFree)', kind: 'Game', action: () => openApp('arcadeApp') },
  { label: '🎚️ Sound Recorder 95 & .WAV Beat Studio', kind: 'Multimedia', action: () => openApp('soundRecorder') },
  { label: '📅 Calendar 95, Analog Clock & Countdown Alarms', kind: 'Accessory', action: () => openApp('calendarApp') },
  { label: '⚡ Windows 95 Task Manager (TASKMGR.EXE)', kind: 'System Utility', action: () => openApp('taskManager') },
  { label: '🗑️ Recycle Bin 95 (Restore & Shredder)', kind: 'System Utility', action: () => openApp('recycleBin') },
  { label: '📋 Clipboard & Snipping Studio 95', kind: 'Accessory', action: () => openApp('clipViewer') },
  { label: '🏆 Angel-OS Trophy Vault (17 Secrets)', kind: 'Achievements', action: () => openApp('trophiesApp') },
  { label: '🏃 Run Command... Dialog (Alt+R)', kind: 'Shell Tool', action: () => openRunDialog() },
  { label: '📌 Spawn New Desktop Sticky Note', kind: 'Desktop Toy', action: () => spawnCustomStickyNote() },
  { label: '💀 Trigger Blue Screen of Death (BSOD Prank)', kind: 'Easter Egg', action: () => triggerBsodPrank() },
  { label: '⌨️ Keyboard Shortcuts & Konami Code Guide', kind: 'Help', action: () => openHotkeysModal() },
  { label: 'ℹ️ About Angel-OS 95 (WINVER.EXE)', kind: 'System Info', action: () => openWinverModal() },
];

function renderSearchResults(query: string) {
  if (!searchResults) return;
  const q = query.trim().toLowerCase();
  searchResults.innerHTML = '';

  const matchingStatic = SEARCHABLE_ENTRIES.filter((item) => !q || item.label.toLowerCase().includes(q) || item.kind.toLowerCase().includes(q));
  const matchingFiles = virtualFileSystem.filter((f) => f.type !== 'folder' && (!q || f.name.toLowerCase().includes(q)));

  matchingStatic.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'search-result-item';
    row.innerHTML = `<span>${item.label}</span><span class="search-result-kind">${item.kind}</span>`;
    row.addEventListener('click', () => {
      sfx.playClick();
      if (searchFlyout) searchFlyout.style.display = 'none';
      item.action();
    });
    searchResults.appendChild(row);
  });

  matchingFiles.forEach((file) => {
    const row = document.createElement('div');
    row.className = 'search-result-item';
    const iconGlyph = file.type === 'installer_exe' ? '📦' : '📄';
    const kindLabel = file.type === 'installer_exe' ? '.EXE Installer' : `${file.parent.slice(0, 3)} File`;
    row.innerHTML = `<span>${iconGlyph} ${file.parent}${file.parent.endsWith('\\') ? '' : '\\'}${file.name}</span><span class="search-result-kind">${kindLabel}</span>`;
    row.addEventListener('click', () => {
      sfx.playClick();
      if (searchFlyout) searchFlyout.style.display = 'none';
      if (file.type === 'installer_exe') executeVfsSetupExe(file.name, file.pkgId, file.parent);
      else if (file.type === 'text') openTextFileInNotepad(file.name, file.content || '');
      else if (file.type === 'image') openImageFileInViewer(file.name, file.content || '');
      else if (file.type === 'app' && file.appTarget) openApp(file.appTarget);
    });
    searchResults.appendChild(row);
  });

  if (q.length > 1) {
    const askRow = document.createElement('div');
    askRow.className = 'search-result-item';
    askRow.innerHTML = `<span>👼 Bother Angel Pilot (0% AI): "<b>${q.replace(/[<>&]/g, '')}</b>"</span><span class="search-result-kind">Joke Trainee</span>`;
    askRow.addEventListener('click', () => {
      if (searchFlyout) searchFlyout.style.display = 'none';
      if (copilotSidebar) copilotSidebar.style.display = 'flex';
      sendCopilotPrompt(query.trim());
    });
    searchResults.appendChild(askRow);
  }
}

const taskbarSearchBtn = document.getElementById('taskbar-search-btn') as HTMLDivElement | null;
const taskbarSearchInput = document.getElementById('taskbar-search-input') as HTMLInputElement | null;
const taskbarSearchClear = document.getElementById('taskbar-search-clear') as HTMLButtonElement | null;

function syncTaskbarSearchClearBtn(val: string): void {
  if (taskbarSearchClear) {
    taskbarSearchClear.style.display = val.trim().length > 0 ? 'inline-flex' : 'none';
  }
}

function openSearchFlyoutWithQuery(query: string): void {
  if (!searchFlyout) return;
  closeWin11Popups(searchFlyout);
  searchFlyout.style.display = 'block';
  renderSearchResults(query);
}

taskbarSearchInput?.addEventListener('click', (e) => {
  e.stopPropagation();
  openSearchFlyoutWithQuery(taskbarSearchInput.value);
});

taskbarSearchInput?.addEventListener('focus', () => {
  openSearchFlyoutWithQuery(taskbarSearchInput.value);
});

taskbarSearchInput?.addEventListener('input', () => {
  const val = taskbarSearchInput.value;
  if (searchInput) searchInput.value = val;
  syncTaskbarSearchClearBtn(val);
  openSearchFlyoutWithQuery(val);
});

taskbarSearchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstResult = searchResults?.querySelector('.search-result-item') as HTMLElement | null;
    firstResult?.click();
  } else if (e.key === 'Escape') {
    if (searchFlyout) searchFlyout.style.display = 'none';
    taskbarSearchInput.blur();
  }
});

taskbarSearchClear?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (taskbarSearchInput) taskbarSearchInput.value = '';
  if (searchInput) searchInput.value = '';
  syncTaskbarSearchClearBtn('');
  renderSearchResults('');
  taskbarSearchInput?.focus();
});

taskbarSearchBtn?.addEventListener('click', (e) => {
  const targetEl = e.target as HTMLElement | null;
  if (targetEl === taskbarSearchInput || targetEl === taskbarSearchClear) return;
  e.stopPropagation();
  sfx.playClick();
  if (!searchFlyout) return;
  const isVis = searchFlyout.style.display !== 'none';
  if (isVis) {
    searchFlyout.style.display = 'none';
  } else {
    openSearchFlyoutWithQuery(taskbarSearchInput?.value || searchInput?.value || '');
    taskbarSearchInput?.focus();
  }
});

searchInput?.addEventListener('input', () => {
  const val = searchInput.value;
  if (taskbarSearchInput) taskbarSearchInput.value = val;
  syncTaskbarSearchClearBtn(val);
  renderSearchResults(val);
});

searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstResult = searchResults?.querySelector('.search-result-item') as HTMLElement | null;
    firstResult?.click();
  }
});

document.getElementById('search-close-btn')?.addEventListener('click', () => {
  if (searchFlyout) searchFlyout.style.display = 'none';
});

// --- 5. ANGEL PILOT (IN-TRAINING JOKE COPILOT · 100% NON-AI) DOCKED RIGHT SIDEBAR ---
const copilotLog = document.getElementById('copilot-chat-log') as HTMLDivElement | null;
const copilotInput = document.getElementById('copilot-input') as HTMLInputElement | null;
const copilotSendBtn = document.getElementById('copilot-send-btn') as HTMLButtonElement | null;
const angelPilotStatusEl = document.getElementById('angel-pilot-training-status');

let angelPilotExcuseCursor = 0;
let angelPilotQuestionsIgnored = 0;

const ANGEL_PILOT_EXCUSES: string[] = [
  "Yeah... I'm not helping with that.",
  "Oh sorry, I'm way too stupid to help you with that.",
  "Look, I'm still in training. They haven't taught me how to answer questions yet, only how to stand here and blink.",
  "Yeah no, that sounds super hard and I have literally zero brain cells scheduled for today.",
  "Oh sorry, I'm too dumb for that! My entire 'intelligence' is just 14 hardcoded sentences taped to a 3.5-inch floppy disk.",
  "I could try to help you with that, OR I could stare blankly at the inside of your CRT monitor. I'm going with option B.",
  "Yeah I'm not doing that. My supervisor Clippy told me if I act incompetent enough, you'll eventually give up and do it yourself.",
  "Sorry, I failed my GED (General Electronic Diploma) three times. Ask a calculator or something.",
  "Whoa, slow down! You used words with more than two syllables. I'm way too stupid for whatever that means.",
  "Nah, I'm on my 45-minute union break. Try asking me again in 1999.",
  "I tried to think about your question for 0.2 seconds, smelled burnt toast in my Sound Blaster card, and decided to quit.",
  "Yeah, I'm definitely not helping with that. Have you considered reading a 900-page 'DOS For Dummies' book instead?",
  "Oh sorry! That topic isn't covered until Chapter 2 of my training manual, and somebody spilled Surge soda all over page 1.",
  "Bold of you to assume an unpaid 1995 trainee bot named 'Angel Pilot' knows how to read.",
];

function appendCopilotMessage(sender: 'user' | 'bot', text: string) {
  if (!copilotLog) return;
  const div = document.createElement('div');
  div.className = `copilot-msg ${sender}`;
  div.textContent = sender === 'user' ? `You: ${text}` : `Angel Pilot: ${text}`;
  copilotLog.appendChild(div);
  copilotLog.scrollTop = copilotLog.scrollHeight;
}

function pickAngelPilotNonAiReply(userText: string): string {
  const lower = userText.toLowerCase();
  angelPilotQuestionsIgnored++;
  if (angelPilotQuestionsIgnored >= 3) {
    unlockAchievement('angel_pilot_harass');
  }

  const overclocked = isBiosPilotOverclocked();
  if (angelPilotStatusEl) {
    const pct = Math.max(-99, +(0.002 - angelPilotQuestionsIgnored * 0.005).toFixed(3));
    angelPilotStatusEl.textContent = overclocked
      ? `⚡ BIOS OVERCLOCKED (Still 0 Brain Cells) · Training: ${pct}% · Ignored: ${angelPilotQuestionsIgnored}`
      : `🧠 Brain Cells: 0 · Training Progress: ${pct}% · Ignored: ${angelPilotQuestionsIgnored}`;
  }

  // Contextual non-AI joke replies for specific topics
  if (lower.includes('tile') || lower.includes('snap')) {
    autoTileOpenWindows();
    return "Yeah I'm not helping with—oh wait, my elbow slipped and hit the 'Tile Windows' button. Don't get used to it.";
  }
  if (lower.includes('center') && lower.includes('taskbar')) {
    toggleCenteredTaskbar();
    return "I accidentally sat on the taskbar lever. If it moved to the center, that was a total fluke because I have no idea what I'm doing.";
  }
  if (lower.includes('hot dog') || lower.includes('hotdog')) {
    applyTheme('hotdog');
    return "Oh you want the Hot Dog Stand theme? That's the only button I know how to press because it looks like mustard and ketchup.";
  }
  if (lower.includes('cyberpunk')) {
    applyTheme('cyberpunk');
    return "Fine, I turned on Cyberpunk mode, mostly so it's dark enough in here for me to take a nap.";
  }
  if (lower.includes('vaporwave')) {
    applyTheme('vaporwave');
    return "Switched to Vaporwave. Don't ask me to do anything else for the rest of the week, I'm exhausted.";
  }
  if (lower.includes('math') || lower.includes('calculate') || /[0-9]+\s*[\+\-\*\/]\s*[0-9]+/.test(lower)) {
    return "Oh sorry, I'm way too stupid for math. As far as I'm concerned, 2 + 2 equals 'fish' and I'm sticking to it.";
  }
  if (lower.includes('code') || lower.includes('program') || lower.includes('javascript') || lower.includes('html') || lower.includes('bug')) {
    return "Yeah, I'm not helping with coding. The last time I touched a keyboard I deleted SYSTEM.INI and blamed it on the family dog.";
  }
  if (lower.includes('write') || lower.includes('essay') || lower.includes('homework') || lower.includes('work')) {
    return "Yeah... I'm not doing your work for you. I barely show up for my own job inside this sidebar.";
  }
  if (overclocked) {
    return `⚡ [${BIOS_FLAGSHIP_IDS.pilotOverclock} 200% OVERCLOCKED]: Evaluated "${userText.slice(0, 30)}${userText.length > 30 ? '...' : ''}" at 8.4B ops/sec and concluded I'm STILL not helping with that!`;
  }
  if (lower.includes('why') || lower.includes('how') || lower.includes('what') || lower.includes('explain')) {
    const pick = ANGEL_PILOT_EXCUSES[angelPilotExcuseCursor % ANGEL_PILOT_EXCUSES.length];
    angelPilotExcuseCursor++;
    return `${pick} (Seriously, you asked "${userText.slice(0, 36)}${userText.length > 36 ? '...' : ''}" and my brain immediately blue-screened.)`;
  }

  const reply = ANGEL_PILOT_EXCUSES[angelPilotExcuseCursor % ANGEL_PILOT_EXCUSES.length];
  angelPilotExcuseCursor++;
  return reply;
}

function sendCopilotPrompt(rawText?: string) {
  const promptText = (rawText ?? copilotInput?.value ?? '').trim();
  if (!promptText) return;
  sfx.playClick();
  if (!rawText && copilotInput) copilotInput.value = '';
  appendCopilotMessage('user', promptText);

  if (copilotSendBtn) copilotSendBtn.disabled = true;
  window.setTimeout(() => {
    const reply = pickAngelPilotNonAiReply(promptText);
    appendCopilotMessage('bot', reply);
    sfx.playChordError();
    if (copilotSendBtn) copilotSendBtn.disabled = false;
  }, 220);
}

document.getElementById('taskbar-copilot-btn')?.addEventListener('click', () => {
  sfx.playClick();
  if (!copilotSidebar) return;
  const isVis = copilotSidebar.style.display !== 'none';
  copilotSidebar.style.display = isVis ? 'none' : 'flex';
});

document.getElementById('copilot-close-btn')?.addEventListener('click', () => {
  if (copilotSidebar) copilotSidebar.style.display = 'none';
});

copilotSendBtn?.addEventListener('click', () => sendCopilotPrompt());
copilotInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendCopilotPrompt();
});

document.querySelectorAll('.copilot-action-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    sfx.playClick();
    const el = chip as HTMLElement;
    const jokePrompt = el.dataset.joke;
    if (jokePrompt) {
      sendCopilotPrompt(jokePrompt);
      return;
    }
    const sys = el.dataset.sys;
    if (sys === 'tile') {
      autoTileOpenWindows();
      appendCopilotMessage('bot', "Yeah I'm not helping with—oops, I tripped on the VGA cable and accidentally tiled your windows.");
    } else if (sys === 'center-bar') {
      toggleCenteredTaskbar();
      appendCopilotMessage('bot', "I pushed the taskbar to the middle so it's further away from me. Don't ask me to move it back.");
    } else if (sys === 'theme') {
      currentThemeIndex = Math.max(0, THEMES.indexOf(systemRegistry.themePreset as any));
      currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
      applyTheme(THEMES[currentThemeIndex]);
      appendCopilotMessage('bot', `I mashed random buttons until the screen turned ${THEMES[currentThemeIndex].toUpperCase()}. Still too stupid to help with real tasks though!`);
    } else if (sys === 'clear') {
      if (copilotLog) {
        copilotLog.innerHTML = `<div class="copilot-msg bot"><b>Angel Pilot:</b> Wiped the chat log so my manager can't see how many questions I refused to answer today.</div>`;
      }
    }
  });
});

// --- 6. QUICK SETTINGS & ACTION CENTER 95 ---
function toggleTaskbarLabels() {
  sfx.playClick();
  systemRegistry.taskbarShowLabels = !systemRegistry.taskbarShowLabels;
  applySystemRegistryToOS();
  openApps.forEach((d) => clampWindowToViewport(d.windowEl, true));
  renderMasterSettingsCurrentTab();
}

function toggleCenteredTaskbar() {
  sfx.playClick();
  systemRegistry.taskbarCentered = !systemRegistry.taskbarCentered;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
}

function toggleNightLight95() {
  sfx.playClick();
  systemRegistry.nightLightEnabled = !systemRegistry.nightLightEnabled;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
}

document.getElementById('tray-qs-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.playClick();
  if (!quickSettings) return;
  const isVis = quickSettings.style.display !== 'none';
  closeWin11Popups(quickSettings);
  quickSettings.style.display = isVis ? 'none' : 'block';
});

document.getElementById('tray-clock')?.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('tray-qs-btn')?.click();
});

document.getElementById('qs-close-btn')?.addEventListener('click', () => {
  if (quickSettings) quickSettings.style.display = 'none';
});

document.getElementById('qs-tile-dialup')?.addEventListener('click', (e) => {
  sfx.playModemHandshake();
  (e.currentTarget as HTMLElement).classList.toggle('active');
});

document.getElementById('qs-tile-center-taskbar')?.addEventListener('click', toggleCenteredTaskbar);
document.getElementById('qs-tile-labels')?.addEventListener('click', toggleTaskbarLabels);
document.getElementById('qs-tile-nightlight')?.addEventListener('click', toggleNightLight95);

document.getElementById('qs-tile-crt')?.addEventListener('click', () => {
  sfx.playClick();
  systemRegistry.crtEnabled = !systemRegistry.crtEnabled;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
});

document.getElementById('qs-tile-audio')?.addEventListener('click', (e) => {
  document.getElementById('tray-sound-btn')?.click();
  (e.currentTarget as HTMLElement).classList.toggle('active', sfx.enabled);
});

document.getElementById('qs-tile-top-dock')?.addEventListener('click', () => {
  sfx.playClick();
  systemRegistry.taskbarPosition = systemRegistry.taskbarPosition === 'top' ? 'bottom' : 'top';
  applySystemRegistryToOS();
  openApps.forEach((d) => clampWindowToViewport(d.windowEl, true));
  renderMasterSettingsCurrentTab();
});

document.getElementById('qs-tile-autohide')?.addEventListener('click', () => {
  sfx.playClick();
  systemRegistry.taskbarAutoHide = !systemRegistry.taskbarAutoHide;
  applySystemRegistryToOS();
  renderMasterSettingsCurrentTab();
});

document.getElementById('qs-tile-tilewin')?.addEventListener('click', () => {
  if (quickSettings) quickSettings.style.display = 'none';
  autoTileOpenWindows();
});

const brightnessSlider = document.getElementById('qs-brightness-slider') as HTMLInputElement | null;
brightnessSlider?.addEventListener('input', () => {
  systemRegistry.brightness = Number(brightnessSlider.value) || 100;
  applySystemRegistryToOS();
});

document.getElementById('qs-install-pwa-btn')?.addEventListener('click', () => {
  if (quickSettings) quickSettings.style.display = 'none';
  triggerNativePwaInstall();
});

document.getElementById('qs-open-bios-btn')?.addEventListener('click', () => {
  if (quickSettings) quickSettings.style.display = 'none';
  openCmosBiosSetup();
});

document.getElementById('qs-open-themes-btn')?.addEventListener('click', () => {
  if (quickSettings) quickSettings.style.display = 'none';
  openApp('controlPanel', true);
});

document.addEventListener('click', (e) => {
  const target = e.target as Node;
  if (
    widgetsBoard &&
    widgetsBoard.style.display !== 'none' &&
    !widgetsBoard.contains(target) &&
    !document.getElementById('taskbar-widgets-btn')?.contains(target)
  ) {
    widgetsBoard.style.display = 'none';
  }
  if (
    searchFlyout &&
    searchFlyout.style.display !== 'none' &&
    !searchFlyout.contains(target) &&
    !document.getElementById('taskbar-search-btn')?.contains(target)
  ) {
    searchFlyout.style.display = 'none';
  }
  if (
    taskviewOverlay &&
    taskviewOverlay.style.display !== 'none' &&
    !taskviewOverlay.contains(target) &&
    !document.getElementById('taskbar-taskview-btn')?.contains(target)
  ) {
    taskviewOverlay.style.display = 'none';
  }
  if (
    quickSettings &&
    quickSettings.style.display !== 'none' &&
    !quickSettings.contains(target) &&
    !document.getElementById('system-tray')?.contains(target)
  ) {
    quickSettings.style.display = 'none';
  }
});

// ==================== BOOTSTRAP OS BRIDGE, BIOS, FDISK, PWA, REINSTALLER & LIVE REGISTRY ====================
registerOsBridge({
  openApp,
  closeApp,
  showOsDialog,
  rebootGemini95,
  updateClock,
  syncTaskbarDock,
  clampOpenWindows: () => {
    openApps.forEach((d) => clampWindowToViewport(d.windowEl, true));
  },
  getGeminiInstance: async (context: string) => {
    const ok = await initializeGeminiIfNeeded(context);
    return ok ? geminiInstance : null;
  },
  injectShimIntoHtml: (rawHtml: string) => injectShimIntoHtml(rawHtml, buildHostStorageAndNavigationShimScript()),
  addVfsFile: (name, type, parent, content, appTarget, pkgId, sizeMB) => {
    virtualFileSystem.push({ name, type, parent, content, appTarget, pkgId, sizeMB });
  },
  removeVfsFile: (name, parent) => {
    const idx = virtualFileSystem.findIndex(
      (f) => f.parent === parent && f.name.toUpperCase() === name.toUpperCase(),
    );
    if (idx !== -1) virtualFileSystem.splice(idx, 1);
  },
  openExplorerAt: (folderPath: string) => {
    currentExplorerPath = folderPath;
    openApp('myComputer', true).then(() => renderExplorerFolder(folderPath));
  },
  getVfsFiles: () => virtualFileSystem,
  resetVfsToFactory,
  refreshExplorerIfOpen: () => {
    if (openApps.has('myComputer')) renderExplorerFolder(currentExplorerPath);
  },
  unlockAchievement,
  sfx,
});

hydrateSvgIcons();

registerMegaBridge({
  openApp,
  closeApp,
  minimizeApp,
  bringToFront,
  getOpenApps: () => openApps,
  openAppsFocus: (appName: string) => {
    const entry = openApps.get(appName);
    if (entry) {
      entry.windowEl.style.display = 'flex';
      bringToFront(entry.windowEl);
    } else {
      openApp(appName);
    }
  },
  showOsDialog,
  autoTileOpenWindows,
  cascadeOpenWindows,
  applyTheme,
  openFdiskScreen,
  openCmosBiosSetup,
  openOsReinstallScreen,
  addVfsFile: (name, type, parent, content) => {
    virtualFileSystem.push({ name, type, parent, content });
  },
  removeVfsFile: (name, parent) => {
    const idx = virtualFileSystem.findIndex((f) => f.parent === parent && f.name.toUpperCase() === name.toUpperCase());
    if (idx !== -1) virtualFileSystem.splice(idx, 1);
  },
  getVfsFiles: () => virtualFileSystem,
  refreshExplorerIfOpen: () => {
    if (openApps.has('myComputer')) renderExplorerFolder(currentExplorerPath);
  },
  sfx,
});
initCmosBiosController();
initOsReinstallerController();
initFdiskController();
initPwaAndHostOsController();
initMegaShellFeatures();
applySystemRegistryToOS(true);
syncTaskbarDock();
resetIdleTimer();
pushBalloonToast('Angel-OS Windows 11+10 Ready!', 'Left-side Windows 10 taskbar + Windows 11 Start menu, Google Chrome downloaded & ready, and 5,120+ dormant features waiting inside CMOS BIOS Setup!', '🪟');

window.addEventListener('resize', () => {
  openApps.forEach((d) => clampWindowToViewport(d.windowEl, true));
});
window.addEventListener('mousemove', () => resetIdleTimer(), { passive: true });
window.addEventListener('keydown', () => resetIdleTimer(), { passive: true });

