// Angel-OS Hardware Detection, RAM Allocation Modes & Performance/Thermal Engine
import { DEFAULT_SYSTEM_REGISTRY, SystemRegistry } from './osSystemCore';
import { getBiosRamBoostMB } from './osBios5000';

let registryAccessor: () => SystemRegistry = () => DEFAULT_SYSTEM_REGISTRY;

export function registerPerfRegistryProvider(provider: () => SystemRegistry): void {
  registryAccessor = provider;
}

function getActiveRegistry(): SystemRegistry {
  return registryAccessor();
}

export interface HostHardwareInfo {
  cpuThreads: number;
  cpuPlatform: string;
  deviceMemoryGB: number | null;
  deviceMemorySource: string;
  jsHeapLimitMB: number | null;
  jsHeapUsedMB: number | null;
  autoDetectedRamMB: number;
  gpuVendor: string;
  gpuRenderer: string;
  screenRes: string;
  pixelRatio: number;
  networkType: string;
  downlinkMbps: number | null;
  batteryLevelPct: number | null;
  batteryCharging: boolean | null;
  userAgentSummary: string;
}

export interface HardwareTelemetry {
  host: HostHardwareInfo;
  effectiveRamMB: number;
  usedRamMB: number;
  ramModeLabel: string;
  cpuClockGHz: number;
  cpuLoadPct: number;
  gpuLoadPct: number;
  cpuTempC: number;
  gpuTempC: number;
  vrmTempC: number;
  ambientTempC: number;
  effectiveFanDutyPct: number;
  cpuFanRpm: number;
  intakeFanRpm: number;
  exhaustFanRpm: number;
  gpuFanRpm: number;
  powerDrawW: number;
  vcoreV: string;
  rail12V: string;
  rail5V: string;
  rail33V: string;
  vbatV: string;
  thermalThrottled: boolean;
  fanStatusSummary: string;
  statusSeverity: 'ok' | 'warm' | 'hot';
}

export interface PerfAdjustCallbacks {
  onApplyHardwareChange: () => void;
  onOpenBios: () => void;
  onOpenSysMonitor: () => void;
}

let cachedGpuVendor = '';
let cachedGpuRenderer = '';
let batteryPct: number | null = null;
let batteryChargingState: boolean | null = null;
let batteryHookStarted = false;

// Stateful thermal model so toggling fans ON/OFF or cranking Turbo shows realistic temperature rise & cooldown
let simCpuTempC = 43.5;
let simGpuTempC = 41.0;
let simVrmTempC = 44.0;
let simLastStepMs = Date.now();
let syntheticStressUntil = 0;

let activeCallbacks: PerfAdjustCallbacks | null = null;
let perfUiTickerId: number | null = null;

function ensureBatteryMonitor(): void {
  if (batteryHookStarted) return;
  batteryHookStarted = true;
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
      addEventListener?: (evt: string, fn: () => void) => void;
    }>;
  };
  if (typeof nav.getBattery !== 'function') return;
  nav
    .getBattery()
    .then((batt) => {
      const syncBatt = () => {
        batteryPct = Math.round((batt.level ?? 1) * 100);
        batteryChargingState = Boolean(batt.charging);
      };
      syncBatt();
      batt.addEventListener?.('levelchange', syncBatt);
      batt.addEventListener?.('chargingchange', syncBatt);
    })
    .catch(() => {
      batteryPct = null;
      batteryChargingState = null;
    });
}

function probeWebglGpu(): { vendor: string; renderer: string } {
  if (cachedGpuVendor || cachedGpuRenderer) {
    return { vendor: cachedGpuVendor, renderer: cachedGpuRenderer };
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) {
      cachedGpuVendor = 'Generic VGA';
      cachedGpuRenderer = 'Software Framebuffer';
      return { vendor: cachedGpuVendor, renderer: cachedGpuRenderer };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      cachedGpuVendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'Unknown Vendor');
      cachedGpuRenderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'WebGL GPU');
    } else {
      cachedGpuVendor = String(gl.getParameter(gl.VENDOR) || 'WebGL Vendor');
      cachedGpuRenderer = String(gl.getParameter(gl.RENDERER) || 'Hardware Accelerated GPU');
    }
  } catch {
    cachedGpuVendor = 'Host GPU';
    cachedGpuRenderer = 'Protected WebGL Adapter';
  }
  return { vendor: cachedGpuVendor, renderer: cachedGpuRenderer };
}

export function detectHostHardware(): HostHardwareInfo {
  ensureBatteryMonitor();
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; downlink?: number };
    userAgentData?: { platform?: string };
  };
  const perf = performance as Performance & {
    memory?: { jsHeapSizeLimit?: number; usedJSHeapSize?: number };
  };

  const cpuThreads = Math.max(1, Number(nav.hardwareConcurrency) || 4);
  const cpuPlatform = nav.userAgentData?.platform || nav.platform || 'Unknown Platform';

  const rawMemGb = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const jsHeapLimitMB =
    perf.memory?.jsHeapSizeLimit && perf.memory.jsHeapSizeLimit > 0
      ? Math.round(perf.memory.jsHeapSizeLimit / (1024 * 1024))
      : null;
  const jsHeapUsedMB =
    perf.memory?.usedJSHeapSize && perf.memory.usedJSHeapSize > 0
      ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
      : null;

  let autoDetectedRamMB = 4096;
  let deviceMemorySource = 'Heuristic Fallback';
  if (rawMemGb !== null) {
    autoDetectedRamMB = Math.round(rawMemGb * 1024);
    deviceMemorySource = 'Host DeviceMemory API';
  } else if (jsHeapLimitMB !== null) {
    autoDetectedRamMB = jsHeapLimitMB >= 3500 ? 8192 : jsHeapLimitMB >= 1500 ? 4096 : 2048;
    deviceMemorySource = 'Inferred via JS Heap Limit';
  } else {
    autoDetectedRamMB = cpuThreads >= 12 ? 16384 : cpuThreads >= 6 ? 8192 : 4096;
    deviceMemorySource = 'Inferred via CPU Topology';
  }

  const gpu = probeWebglGpu();
  const screenRes = `${window.screen?.width || window.innerWidth}×${window.screen?.height || window.innerHeight}`;
  const pixelRatio = Number((window.devicePixelRatio || 1).toFixed(2));
  const networkType = nav.connection?.effectiveType ? nav.connection.effectiveType.toUpperCase() : navigator.onLine ? 'ONLINE' : 'OFFLINE';
  const downlinkMbps = typeof nav.connection?.downlink === 'number' ? nav.connection.downlink : null;

  const ua = navigator.userAgent || '';
  let userAgentSummary = 'Browser Host';
  if (ua.includes('Edg/')) userAgentSummary = 'Microsoft Edge Host';
  else if (ua.includes('Chrome/')) userAgentSummary = 'Google Chrome / Chromium Host';
  else if (ua.includes('Firefox/')) userAgentSummary = 'Mozilla Firefox Host';
  else if (ua.includes('Safari/')) userAgentSummary = 'Safari / WebKit Host';

  return {
    cpuThreads,
    cpuPlatform,
    deviceMemoryGB: rawMemGb,
    deviceMemorySource,
    jsHeapLimitMB,
    jsHeapUsedMB,
    autoDetectedRamMB,
    gpuVendor: gpu.vendor,
    gpuRenderer: gpu.renderer,
    screenRes,
    pixelRatio,
    networkType,
    downlinkMbps,
    batteryLevelPct: batteryPct,
    batteryCharging: batteryChargingState,
    userAgentSummary,
  };
}

export function getEffectiveRamMB(reg: SystemRegistry = getActiveRegistry(), biosBoostMB = getBiosRamBoostMB()): number {
  let baseMB: number = reg.installedRamMB || 64;
  if (reg.ramMode === 'auto') {
    baseMB = detectHostHardware().autoDetectedRamMB;
  } else if (reg.ramMode === 'custom') {
    const parsed = Math.round(Number(reg.customRamMB) || 512);
    baseMB = Math.max(16, Math.min(65536, parsed));
  } else {
    baseMB = Math.max(16, Math.min(4096, Number(reg.installedRamMB) || 64));
  }
  return baseMB + Math.max(0, Number(biosBoostMB) || 0);
}

export function getEffectiveRamDisplay(reg: SystemRegistry = getActiveRegistry(), biosBoostMB = getBiosRamBoostMB()): string {
  const mb = getEffectiveRamMB(reg, biosBoostMB);
  if (reg.ramMode === 'auto') {
    const gb = (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1);
    return `${mb.toLocaleString()} MB (${gb} GB Auto-Detect)`;
  }
  if (reg.ramMode === 'custom') {
    return `${mb.toLocaleString()} MB (Custom)`;
  }
  return `${mb.toLocaleString()} MB (Limited)`;
}

export function applyPerfPreset(profile: SystemRegistry['perfProfile'], reg: SystemRegistry = getActiveRegistry()): void {
  reg.perfProfile = profile;
  if (profile === 'eco') {
    reg.perfCpuScalePct = 70;
    reg.perfVoltageMv = 960;
    reg.perfPowerLimitW = 45;
    reg.perfFanMode = 'silent';
    reg.perfFanDutyPct = 28;
    reg.cpuTurboBoost = false;
  } else if (profile === 'balanced') {
    reg.perfCpuScalePct = 100;
    reg.perfVoltageMv = 1180;
    reg.perfPowerLimitW = 95;
    reg.perfFanMode = 'auto';
    reg.perfFanDutyPct = 52;
    reg.cpuTurboBoost = true;
  } else if (profile === 'performance') {
    reg.perfCpuScalePct = 135;
    reg.perfVoltageMv = 1290;
    reg.perfPowerLimitW = 165;
    reg.perfFanMode = 'balanced';
    reg.perfFanDutyPct = 74;
    reg.cpuTurboBoost = true;
  } else if (profile === 'turbo') {
    reg.perfCpuScalePct = 185;
    reg.perfVoltageMv = 1410;
    reg.perfPowerLimitW = 280;
    reg.perfFanMode = 'turbo';
    reg.perfFanDutyPct = 100;
    reg.cpuTurboBoost = true;
  }
}

function getBaseClockGHz(model: SystemRegistry['cpuModel']): number {
  if (model.includes('486')) return 0.66;
  if (model.includes('133')) return 1.33;
  if (model.includes('233')) return 2.33;
  return 3.2;
}

export function triggerSyntheticBenchSpike(durationMs = 8000): void {
  syntheticStressUntil = Date.now() + durationMs;
}

export function isSyntheticBenchActive(): boolean {
  return Date.now() < syntheticStressUntil;
}

export function computeHardwareTelemetry(reg: SystemRegistry = getActiveRegistry()): HardwareTelemetry {
  const host = detectHostHardware();
  const biosBoostMB = getBiosRamBoostMB();
  const effectiveRamMB = getEffectiveRamMB(reg, biosBoostMB);
  const ramModeLabel =
    reg.ramMode === 'auto'
      ? `Auto-Detect (${host.deviceMemorySource})`
      : reg.ramMode === 'custom'
        ? `Custom Manual (${Math.max(16, Math.min(65536, Math.round(reg.customRamMB || 512))).toLocaleString()} MB)`
        : `Limited Cap (${reg.installedRamMB.toLocaleString()} MB)`;

  const openWinsCount = Array.from(document.querySelectorAll<HTMLElement>('.window')).filter(
    (w) => w.style.display && w.style.display !== 'none',
  ).length;
  const stressActive = isSyntheticBenchActive();
  const scaleFactor = Math.max(0.4, Math.min(2.0, (reg.perfCpuScalePct || 100) / 100));
  const nowSec = Date.now() / 1000;

  const baseLoad = 10 + Math.min(48, openWinsCount * 5) + (stressActive ? 46 : 0);
  const wave = Math.sin(nowSec * 1.4) * 6 + Math.cos(nowSec * 2.7) * 4;
  const cpuLoadPct = Math.round(Math.max(4, Math.min(100, baseLoad + wave + (reg.cpuTurboBoost ? 4 : -2))));
  const gpuLoadPct = Math.round(Math.max(3, Math.min(99, 8 + openWinsCount * 4 + (stressActive ? 54 : 0) + Math.sin(nowSec * 1.1) * 5)));

  // Determine effective PWM fan duty % from fan mode
  let effectiveFanDutyPct = 50;
  if (reg.perfFanMode === 'off') effectiveFanDutyPct = 0;
  else if (reg.perfFanMode === 'silent') effectiveFanDutyPct = 28;
  else if (reg.perfFanMode === 'balanced') effectiveFanDutyPct = 54;
  else if (reg.perfFanMode === 'turbo') effectiveFanDutyPct = 100;
  else if (reg.perfFanMode === 'manual') effectiveFanDutyPct = Math.max(0, Math.min(100, Math.round(reg.perfFanDutyPct)));
  else {
    // Auto smart thermal curve responds cleanly to CPU temperature
    effectiveFanDutyPct = Math.round(Math.max(24, Math.min(100, 22 + (simCpuTempC - 32) * 1.65)));
  }

  // Advance thermal inertia model
  const nowMs = Date.now();
  const dtSec = Math.min(2.5, Math.max(0.15, (nowMs - simLastStepMs) / 1000));
  simLastStepMs = nowMs;

  const voltFactor = Math.pow(Math.max(0.85, (reg.perfVoltageMv || 1180) / 1180), 2);
  const powerDrawW = Math.round(
    Math.min(
      reg.perfPowerLimitW || 95,
      14 + (cpuLoadPct / 100) * 68 * scaleFactor * voltFactor + (gpuLoadPct / 100) * 55 + (effectiveFanDutyPct / 100) * 6,
    ),
  );

  const activeChassisRatio = ((reg.fanIntakeEnabled ? 0.5 : 0) + (reg.fanExhaustEnabled ? 0.5 : 0)) * (effectiveFanDutyPct / 100);
  const cpuCoolingFactor = (reg.fanCpuEnabled ? (effectiveFanDutyPct / 100) * 0.85 : 0.03) + activeChassisRatio * 0.25;
  const gpuCoolingFactor = (reg.fanGpuEnabled ? (effectiveFanDutyPct / 100) * 0.82 : 0.04) + activeChassisRatio * 0.28;

  const ambientTempC = 25;
  const targetCpuTemp = Math.min(99, ambientTempC + (powerDrawW * 0.44) / Math.max(0.16, 0.22 + cpuCoolingFactor * 0.92));
  const targetGpuTemp = Math.min(96, ambientTempC + ((20 + gpuLoadPct * 0.65) * 0.48) / Math.max(0.16, 0.24 + gpuCoolingFactor * 0.9));
  const targetVrmTemp = Math.min(102, ambientTempC + (powerDrawW * 0.42 * voltFactor) / Math.max(0.18, 0.28 + activeChassisRatio * 0.85));

  const alpha = Math.min(1, dtSec * 0.35);
  simCpuTempC += (targetCpuTemp - simCpuTempC) * alpha;
  simGpuTempC += (targetGpuTemp - simGpuTempC) * alpha;
  simVrmTempC += (targetVrmTemp - simVrmTempC) * alpha;

  const cpuTempC = Math.round(simCpuTempC * 10) / 10;
  const gpuTempC = Math.round(simGpuTempC * 10) / 10;
  const vrmTempC = Math.round(simVrmTempC * 10) / 10;
  const thermalThrottled = cpuTempC >= 91;

  const baseClock = getBaseClockGHz(reg.cpuModel);
  const turboMult = reg.cpuTurboBoost ? 1.18 : 0.92;
  const throttleMult = thermalThrottled ? 0.62 : 1.0;
  const cpuClockGHz = Number((baseClock * turboMult * scaleFactor * throttleMult).toFixed(2));

  const dutyFrac = effectiveFanDutyPct / 100;
  const jitter = () => Math.round(Math.sin(nowSec * 3.1) * 18);
  const cpuFanRpm = reg.fanCpuEnabled && effectiveFanDutyPct > 0 ? Math.max(480, Math.round(680 + dutyFrac * 2920 + jitter())) : 0;
  const intakeFanRpm = reg.fanIntakeEnabled && effectiveFanDutyPct > 0 ? Math.max(400, Math.round(520 + dutyFrac * 1880 + jitter())) : 0;
  const exhaustFanRpm = reg.fanExhaustEnabled && effectiveFanDutyPct > 0 ? Math.max(420, Math.round(560 + dutyFrac * 1940 + jitter())) : 0;
  const gpuFanRpm = reg.fanGpuEnabled && effectiveFanDutyPct > 0 ? Math.max(550, Math.round(760 + dutyFrac * 2640 + jitter())) : 0;

  const activeFansCount = [cpuFanRpm, intakeFanRpm, exhaustFanRpm, gpuFanRpm].filter((rpm) => rpm > 0).length;
  const fanStatusSummary =
    activeFansCount === 0
      ? 'COOLING HALTED (0 RPM)'
      : `${activeFansCount}/4 Fans Spinning · CPU ${cpuFanRpm.toLocaleString()} RPM`;

  const statusSeverity: 'ok' | 'warm' | 'hot' = cpuTempC >= 82 ? 'hot' : cpuTempC >= 66 ? 'warm' : 'ok';

  const usedPct = host.jsHeapUsedMB && host.jsHeapLimitMB ? Math.min(0.88, Math.max(0.18, host.jsHeapUsedMB / host.jsHeapLimitMB)) : 0.28 + openWinsCount * 0.04;
  const usedRamMB = Math.min(effectiveRamMB - 2, Math.max(4, Math.round(effectiveRamMB * Math.min(0.86, usedPct))));

  const vcoreV = ((reg.perfVoltageMv || 1180) / 1000 - (cpuLoadPct / 100) * 0.014).toFixed(3);
  const rail12V = (12.06 - (powerDrawW / 350) * 0.09).toFixed(2);
  const rail5V = (5.02 - (activeFansCount * 0.005)).toFixed(2);
  const rail33V = (3.31).toFixed(2);
  const vbatV = '3.04';

  return {
    host,
    effectiveRamMB,
    usedRamMB,
    ramModeLabel,
    cpuClockGHz,
    cpuLoadPct,
    gpuLoadPct,
    cpuTempC,
    gpuTempC,
    vrmTempC,
    ambientTempC,
    effectiveFanDutyPct,
    cpuFanRpm,
    intakeFanRpm,
    exhaustFanRpm,
    gpuFanRpm,
    powerDrawW,
    vcoreV,
    rail12V,
    rail5V,
    rail33V,
    vbatV,
    thermalThrottled,
    fanStatusSummary,
    statusSeverity,
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
}

function fanRowHtml(id: string, title: string, fanKey: 'fanCpuEnabled' | 'fanIntakeEnabled' | 'fanExhaustEnabled' | 'fanGpuEnabled', enabled: boolean): string {
  return `
    <div class="perf-fan-card">
      <div class="perf-fan-top">
        <label class="perf-fan-check">
          <input type="checkbox" class="perf-fan-toggle" data-fan-key="${fanKey}" ${enabled ? 'checked' : ''} />
          <span>${title}</span>
        </label>
        <span class="perf-fan-spin" id="${id}-spin">✳</span>
      </div>
      <div class="perf-fan-rpm-row">
        <b id="${id}-rpm">0 RPM</b>
        <span id="${id}-state">${enabled ? 'Active' : 'Stopped'}</span>
      </div>
      <div class="perf-bar-track"><div class="perf-bar-fill perf-bar-fan" id="${id}-bar" style="width: 0%"></div></div>
    </div>
  `;
}

function renderPerfAdjustShell(container: HTMLElement): void {
  const host = detectHostHardware();
  const r = getActiveRegistry();

  container.innerHTML = `
    <div class="perf-shell">
      <div class="perf-hero-strip">
        <div class="perf-hero-left">
          <div class="perf-hero-title">🎛️ Performance &amp; Adjustment Levels — Real-PC Telemetry &amp; Control</div>
          <div class="perf-hero-sub">Host: ${escapeHtml(host.userAgentSummary)} · ${host.cpuThreads} Logical Threads · ${escapeHtml(host.cpuPlatform)} · ${escapeHtml(host.gpuRenderer)}</div>
        </div>
        <div class="perf-hero-actions">
          <button class="win95-btn" id="perf-rescan-hw-btn">🔍 Re-Detect Host</button>
          <button class="win95-btn" id="perf-bench-btn">⚡ CPU Load Test (8s)</button>
          <button class="win95-btn" id="perf-open-bios-btn">⚙️ CMOS BIOS</button>
        </div>
      </div>

      <div class="perf-kpi-grid">
        <div class="perf-kpi-card">
          <div class="perf-kpi-label">EFFECTIVE RAM</div>
          <div class="perf-kpi-val" id="perf-kpi-ram">-- MB</div>
          <div class="perf-kpi-sub" id="perf-kpi-ram-sub">Detecting...</div>
        </div>
        <div class="perf-kpi-card">
          <div class="perf-kpi-label">CPU CLOCK / LOAD</div>
          <div class="perf-kpi-val" id="perf-kpi-cpu">-- GHz</div>
          <div class="perf-kpi-sub" id="perf-kpi-cpu-sub">--% Load · ${host.cpuThreads} Threads</div>
        </div>
        <div class="perf-kpi-card">
          <div class="perf-kpi-label">CPU / GPU TEMP</div>
          <div class="perf-kpi-val" id="perf-kpi-temp">--°C</div>
          <div class="perf-kpi-sub" id="perf-kpi-temp-sub">GPU --°C · VRM --°C</div>
        </div>
        <div class="perf-kpi-card">
          <div class="perf-kpi-label">FANS &amp; POWER</div>
          <div class="perf-kpi-val" id="perf-kpi-power">-- W</div>
          <div class="perf-kpi-sub" id="perf-kpi-fan-sub">-- RPM</div>
        </div>
      </div>

      <div class="perf-two-col">
        <!-- LEFT COLUMN: RAM ALLOCATION + PERFORMANCE LEVELS -->
        <div class="perf-col">
          <fieldset class="perf-group">
            <legend>🧠 RAM Selection Mode (Auto-Detect / Limited / Custom)</legend>
            <div class="perf-radio-row">
              <label class="perf-radio-pill">
                <input type="radio" name="perf-ram-mode" value="auto" ${r.ramMode === 'auto' ? 'checked' : ''} />
                <span><b>Auto-Detect Host PC</b> (${host.autoDetectedRamMB.toLocaleString()} MB)</span>
              </label>
              <label class="perf-radio-pill">
                <input type="radio" name="perf-ram-mode" value="limited" ${r.ramMode === 'limited' ? 'checked' : ''} />
                <span><b>Limited Pool</b></span>
              </label>
              <label class="perf-radio-pill">
                <input type="radio" name="perf-ram-mode" value="custom" ${r.ramMode === 'custom' ? 'checked' : ''} />
                <span><b>Custom MB</b></span>
              </label>
            </div>

            <div class="perf-form-grid">
              <div class="perf-field-row" id="perf-ram-limited-row">
                <label for="perf-ram-limited-select">Limited RAM Pool:</label>
                <select id="perf-ram-limited-select" class="win95-input">
                  <option value="16" ${r.installedRamMB === 16 ? 'selected' : ''}>16 MB SIMM (1995)</option>
                  <option value="32" ${r.installedRamMB === 32 ? 'selected' : ''}>32 MB SIMM</option>
                  <option value="64" ${r.installedRamMB === 64 ? 'selected' : ''}>64 MB EDO DRAM</option>
                  <option value="128" ${r.installedRamMB === 128 ? 'selected' : ''}>128 MB PC66 SDRAM</option>
                  <option value="256" ${r.installedRamMB === 256 ? 'selected' : ''}>256 MB Workstation</option>
                  <option value="512" ${r.installedRamMB === 512 ? 'selected' : ''}>512 MB Extended</option>
                  <option value="1024" ${r.installedRamMB === 1024 ? 'selected' : ''}>1,024 MB (1 GB)</option>
                  <option value="2048" ${r.installedRamMB === 2048 ? 'selected' : ''}>2,048 MB (2 GB)</option>
                  <option value="4096" ${r.installedRamMB === 4096 ? 'selected' : ''}>4,096 MB (4 GB Max 32-bit)</option>
                </select>
              </div>
              <div class="perf-field-row" id="perf-ram-custom-row">
                <label for="perf-ram-custom-input">Custom RAM Size (16 – 65,536 MB):</label>
                <div class="perf-inline-input">
                  <input id="perf-ram-custom-input" class="win95-input" type="number" min="16" max="65536" step="16" value="${r.customRamMB}" />
                  <button class="win95-btn" id="perf-ram-custom-apply">Apply MB</button>
                </div>
              </div>
              <div class="perf-field-row">
                <label for="perf-swap-select">Virtual Swap File (WIN386.SWP):</label>
                <select id="perf-swap-select" class="win95-input">
                  <option value="64" ${r.virtualSwapMB === 64 ? 'selected' : ''}>64 MB Swap</option>
                  <option value="128" ${r.virtualSwapMB === 128 ? 'selected' : ''}>128 MB Swap</option>
                  <option value="256" ${r.virtualSwapMB === 256 ? 'selected' : ''}>256 MB Swap</option>
                  <option value="512" ${r.virtualSwapMB === 512 ? 'selected' : ''}>512 MB Swap</option>
                  <option value="1024" ${r.virtualSwapMB === 1024 ? 'selected' : ''}>1,024 MB Swap</option>
                </select>
              </div>
            </div>
            <div class="perf-ram-usage-wrap">
              <div class="perf-usage-label">
                <span>Allocated Memory Utilization</span>
                <span id="perf-ram-bar-txt">-- / -- MB</span>
              </div>
              <div class="perf-bar-track"><div class="perf-bar-fill perf-bar-ram" id="perf-ram-bar" style="width: 35%"></div></div>
            </div>
          </fieldset>

          <fieldset class="perf-group">
            <legend>⚡ Performance Adjustment Levels &amp; Power Limits</legend>
            <div class="perf-preset-bar">
              <button class="win95-btn perf-preset-btn" data-profile="eco">🌿 Eco</button>
              <button class="win95-btn perf-preset-btn" data-profile="balanced">⚖️ Balanced</button>
              <button class="win95-btn perf-preset-btn" data-profile="performance">🚀 Performance</button>
              <button class="win95-btn perf-preset-btn" data-profile="turbo">🔥 Turbo OC</button>
            </div>
            <div class="perf-sliders-grid">
              <div class="perf-slider-row">
                <div class="perf-slider-hdr">
                  <label for="perf-cpu-scale">CPU Clock Scale</label>
                  <b id="perf-cpu-scale-val">${r.perfCpuScalePct}%</b>
                </div>
                <input id="perf-cpu-scale" type="range" min="40" max="200" step="5" value="${r.perfCpuScalePct}" />
              </div>
              <div class="perf-slider-row">
                <div class="perf-slider-hdr">
                  <label for="perf-voltage-mv">Vcore Voltage</label>
                  <b id="perf-voltage-mv-val">${r.perfVoltageMv} mV</b>
                </div>
                <input id="perf-voltage-mv" type="range" min="850" max="1450" step="10" value="${r.perfVoltageMv}" />
              </div>
              <div class="perf-slider-row">
                <div class="perf-slider-hdr">
                  <label for="perf-power-w">TDP Power Limit</label>
                  <b id="perf-power-w-val">${r.perfPowerLimitW} W</b>
                </div>
                <input id="perf-power-w" type="range" min="15" max="350" step="5" value="${r.perfPowerLimitW}" />
              </div>
              <label class="perf-check-inline">
                <input type="checkbox" id="perf-turbo-check" ${r.cpuTurboBoost ? 'checked' : ''} />
                <span>Front-Panel Hardware Turbo Boost Enabled</span>
              </label>
            </div>
          </fieldset>
        </div>

        <!-- RIGHT COLUMN: FANS, TEMPERATURES, VOLTAGES & REAL PC SENSORS -->
        <div class="perf-col">
          <fieldset class="perf-group">
            <legend>🌀 Cooling Fans &amp; PWM Thermal Control</legend>
            <div class="perf-field-row perf-fan-policy-row">
              <label for="perf-fan-mode">Cooling Fan Curve Policy:</label>
              <select id="perf-fan-mode" class="win95-input">
                <option value="auto" ${r.perfFanMode === 'auto' ? 'selected' : ''}>Smart Auto Thermal Curve</option>
                <option value="silent" ${r.perfFanMode === 'silent' ? 'selected' : ''}>Silent (Low RPM 28%)</option>
                <option value="balanced" ${r.perfFanMode === 'balanced' ? 'selected' : ''}>Balanced Airflow (54%)</option>
                <option value="turbo" ${r.perfFanMode === 'turbo' ? 'selected' : ''}>Full Turbo Blast (100%)</option>
                <option value="manual" ${r.perfFanMode === 'manual' ? 'selected' : ''}>Manual PWM Duty Slider</option>
                <option value="off" ${r.perfFanMode === 'off' ? 'selected' : ''}>⚠️ ALL FANS OFF (0 RPM Passive)</option>
              </select>
            </div>
            <div class="perf-slider-row" id="perf-fan-duty-wrap">
              <div class="perf-slider-hdr">
                <label for="perf-fan-duty">PWM Fan Duty Target</label>
                <b id="perf-fan-duty-val">${r.perfFanDutyPct}%</b>
              </div>
              <input id="perf-fan-duty" type="range" min="0" max="100" step="2" value="${r.perfFanDutyPct}" />
            </div>
            <div class="perf-fans-grid">
              ${fanRowHtml('perf-fan-cpu', 'CPU Cooler Fan', 'fanCpuEnabled', r.fanCpuEnabled)}
              ${fanRowHtml('perf-fan-intake', 'Chassis Intake', 'fanIntakeEnabled', r.fanIntakeEnabled)}
              ${fanRowHtml('perf-fan-exhaust', 'Chassis Exhaust', 'fanExhaustEnabled', r.fanExhaustEnabled)}
              ${fanRowHtml('perf-fan-gpu', 'GPU Dual-Axial', 'fanGpuEnabled', r.fanGpuEnabled)}
            </div>
          </fieldset>

          <fieldset class="perf-group">
            <legend>🌡️ Live Temperatures, Voltages &amp; Real Host Sensors</legend>
            <div class="perf-thermals-grid">
              <div class="perf-temp-row">
                <span>CPU Die Package</span>
                <b id="perf-temp-cpu">--°C</b>
              </div>
              <div class="perf-bar-track"><div class="perf-bar-fill" id="perf-temp-cpu-bar" style="width: 40%"></div></div>

              <div class="perf-temp-row">
                <span>GPU Core Diode</span>
                <b id="perf-temp-gpu">--°C</b>
              </div>
              <div class="perf-bar-track"><div class="perf-bar-fill" id="perf-temp-gpu-bar" style="width: 38%"></div></div>

              <div class="perf-temp-row">
                <span>Motherboard VRM / PCH</span>
                <b id="perf-temp-vrm">--°C</b>
              </div>
              <div class="perf-bar-track"><div class="perf-bar-fill" id="perf-temp-vrm-bar" style="width: 42%"></div></div>
            </div>

            <div class="perf-sensors-table" id="perf-host-sensors-grid"></div>
          </fieldset>
        </div>
      </div>

      <div class="perf-footer-bar">
        <span id="perf-live-status">● Hardware Monitor Active — Polling CPU, RAM, Fans &amp; Thermal Probes</span>
        <div style="display: flex; gap: 6px;">
          <button class="win95-btn" id="perf-open-sysmon-btn">📊 Open SYSMON.EXE</button>
          <button class="win95-btn" id="perf-reset-defaults-btn">↺ Reset Stock Defaults</button>
        </div>
      </div>
    </div>
  `;

  bindPerfAdjustHandlers(container);
}

function bindPerfAdjustHandlers(container: HTMLElement): void {
  const applyAndNotify = () => {
    activeCallbacks?.onApplyHardwareChange();
    updatePerfAdjustLiveUI();
  };

  container.querySelectorAll<HTMLInputElement>('input[name="perf-ram-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      getActiveRegistry().ramMode = radio.value as SystemRegistry['ramMode'];
      applyAndNotify();
    });
  });

  container.querySelector<HTMLSelectElement>('#perf-ram-limited-select')?.addEventListener('change', (e) => {
    getActiveRegistry().installedRamMB = Number((e.target as HTMLSelectElement).value) as SystemRegistry['installedRamMB'];
    getActiveRegistry().ramMode = 'limited';
    applyAndNotify();
  });

  const applyCustomRam = () => {
    const inp = container.querySelector<HTMLInputElement>('#perf-ram-custom-input');
    const val = Math.max(16, Math.min(65536, Math.round(Number(inp?.value) || 512)));
    if (inp) inp.value = String(val);
    getActiveRegistry().customRamMB = val;
    getActiveRegistry().ramMode = 'custom';
    applyAndNotify();
  };
  container.querySelector('#perf-ram-custom-apply')?.addEventListener('click', applyCustomRam);
  container.querySelector<HTMLInputElement>('#perf-ram-custom-input')?.addEventListener('change', applyCustomRam);

  container.querySelector<HTMLSelectElement>('#perf-swap-select')?.addEventListener('change', (e) => {
    getActiveRegistry().virtualSwapMB = Number((e.target as HTMLSelectElement).value) as SystemRegistry['virtualSwapMB'];
    applyAndNotify();
  });

  container.querySelectorAll<HTMLButtonElement>('.perf-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const profile = btn.dataset.profile as SystemRegistry['perfProfile'];
      applyPerfPreset(profile, getActiveRegistry());
      syncPerfControlValues(container);
      applyAndNotify();
    });
  });

  container.querySelector<HTMLInputElement>('#perf-cpu-scale')?.addEventListener('input', (e) => {
    getActiveRegistry().perfCpuScalePct = Number((e.target as HTMLInputElement).value);
    getActiveRegistry().perfProfile = 'custom';
    applyAndNotify();
  });

  container.querySelector<HTMLInputElement>('#perf-voltage-mv')?.addEventListener('input', (e) => {
    getActiveRegistry().perfVoltageMv = Number((e.target as HTMLInputElement).value);
    getActiveRegistry().perfProfile = 'custom';
    applyAndNotify();
  });

  container.querySelector<HTMLInputElement>('#perf-power-w')?.addEventListener('input', (e) => {
    getActiveRegistry().perfPowerLimitW = Number((e.target as HTMLInputElement).value);
    getActiveRegistry().perfProfile = 'custom';
    applyAndNotify();
  });

  container.querySelector<HTMLInputElement>('#perf-turbo-check')?.addEventListener('change', (e) => {
    getActiveRegistry().cpuTurboBoost = (e.target as HTMLInputElement).checked;
    applyAndNotify();
  });

  container.querySelector<HTMLSelectElement>('#perf-fan-mode')?.addEventListener('change', (e) => {
    const mode = (e.target as HTMLSelectElement).value as SystemRegistry['perfFanMode'];
    getActiveRegistry().perfFanMode = mode;
    if (mode === 'off') getActiveRegistry().perfFanDutyPct = 0;
    else if (mode === 'silent') getActiveRegistry().perfFanDutyPct = 28;
    else if (mode === 'balanced') getActiveRegistry().perfFanDutyPct = 54;
    else if (mode === 'turbo') getActiveRegistry().perfFanDutyPct = 100;
    syncPerfControlValues(container);
    applyAndNotify();
  });

  container.querySelector<HTMLInputElement>('#perf-fan-duty')?.addEventListener('input', (e) => {
    getActiveRegistry().perfFanDutyPct = Number((e.target as HTMLInputElement).value);
    getActiveRegistry().perfFanMode = getActiveRegistry().perfFanDutyPct === 0 ? 'off' : 'manual';
    syncPerfControlValues(container);
    applyAndNotify();
  });

  container.querySelectorAll<HTMLInputElement>('.perf-fan-toggle').forEach((chk) => {
    chk.addEventListener('change', () => {
      const k = chk.dataset.fanKey as 'fanCpuEnabled' | 'fanIntakeEnabled' | 'fanExhaustEnabled' | 'fanGpuEnabled';
      if (k) getActiveRegistry()[k] = chk.checked;
      applyAndNotify();
    });
  });

  container.querySelector('#perf-rescan-hw-btn')?.addEventListener('click', () => {
    cachedGpuVendor = '';
    cachedGpuRenderer = '';
    detectHostHardware();
    updatePerfAdjustLiveUI();
  });

  container.querySelector('#perf-bench-btn')?.addEventListener('click', () => {
    triggerSyntheticBenchSpike(8000);
    updatePerfAdjustLiveUI();
  });

  container.querySelector('#perf-open-bios-btn')?.addEventListener('click', () => {
    activeCallbacks?.onOpenBios();
  });

  container.querySelector('#perf-open-sysmon-btn')?.addEventListener('click', () => {
    activeCallbacks?.onOpenSysMonitor();
  });

  container.querySelector('#perf-reset-defaults-btn')?.addEventListener('click', () => {
    getActiveRegistry().ramMode = 'auto';
    getActiveRegistry().installedRamMB = 64;
    getActiveRegistry().customRamMB = 4096;
    getActiveRegistry().virtualSwapMB = 128;
    applyPerfPreset('balanced', getActiveRegistry());
    getActiveRegistry().fanCpuEnabled = true;
    getActiveRegistry().fanIntakeEnabled = true;
    getActiveRegistry().fanExhaustEnabled = true;
    getActiveRegistry().fanGpuEnabled = true;
    syncPerfControlValues(container);
    applyAndNotify();
  });
}

function syncPerfControlValues(container: HTMLElement): void {
  const r = getActiveRegistry();
  container.querySelectorAll<HTMLInputElement>('input[name="perf-ram-mode"]').forEach((el) => {
    el.checked = el.value === r.ramMode;
  });

  const limSel = container.querySelector<HTMLSelectElement>('#perf-ram-limited-select');
  if (limSel && document.activeElement !== limSel) limSel.value = String(r.installedRamMB);

  const custInp = container.querySelector<HTMLInputElement>('#perf-ram-custom-input');
  if (custInp && document.activeElement !== custInp) custInp.value = String(r.customRamMB);

  const swapSel = container.querySelector<HTMLSelectElement>('#perf-swap-select');
  if (swapSel && document.activeElement !== swapSel) swapSel.value = String(r.virtualSwapMB);

  const scaleInp = container.querySelector<HTMLInputElement>('#perf-cpu-scale');
  if (scaleInp && document.activeElement !== scaleInp) scaleInp.value = String(r.perfCpuScalePct);
  const scaleVal = container.querySelector('#perf-cpu-scale-val');
  if (scaleVal) scaleVal.textContent = `${r.perfCpuScalePct}%`;

  const voltInp = container.querySelector<HTMLInputElement>('#perf-voltage-mv');
  if (voltInp && document.activeElement !== voltInp) voltInp.value = String(r.perfVoltageMv);
  const voltVal = container.querySelector('#perf-voltage-mv-val');
  if (voltVal) voltVal.textContent = `${r.perfVoltageMv} mV`;

  const pwrInp = container.querySelector<HTMLInputElement>('#perf-power-w');
  if (pwrInp && document.activeElement !== pwrInp) pwrInp.value = String(r.perfPowerLimitW);
  const pwrVal = container.querySelector('#perf-power-w-val');
  if (pwrVal) pwrVal.textContent = `${r.perfPowerLimitW} W`;

  const turboChk = container.querySelector<HTMLInputElement>('#perf-turbo-check');
  if (turboChk) turboChk.checked = r.cpuTurboBoost;

  const fanSel = container.querySelector<HTMLSelectElement>('#perf-fan-mode');
  if (fanSel && document.activeElement !== fanSel) fanSel.value = r.perfFanMode;

  const dutyInp = container.querySelector<HTMLInputElement>('#perf-fan-duty');
  if (dutyInp && document.activeElement !== dutyInp) dutyInp.value = String(r.perfFanDutyPct);
  const dutyVal = container.querySelector('#perf-fan-duty-val');
  if (dutyVal) dutyVal.textContent = `${r.perfFanDutyPct}%`;

  container.querySelectorAll<HTMLInputElement>('.perf-fan-toggle').forEach((chk) => {
    const k = chk.dataset.fanKey as 'fanCpuEnabled' | 'fanIntakeEnabled' | 'fanExhaustEnabled' | 'fanGpuEnabled';
    if (k) chk.checked = Boolean(r[k]);
  });

  container.querySelectorAll<HTMLButtonElement>('.perf-preset-btn').forEach((btn) => {
    btn.classList.toggle('active-preset', btn.dataset.profile === r.perfProfile);
  });
}

function updateFanCard(id: string, rpm: number, dutyPct: number, maxRpm: number): void {
  const rpmEl = document.getElementById(`${id}-rpm`);
  const stateEl = document.getElementById(`${id}-state`);
  const barEl = document.getElementById(`${id}-bar`) as HTMLElement | null;
  const spinEl = document.getElementById(`${id}-spin`);
  if (rpmEl) rpmEl.textContent = `${rpm.toLocaleString()} RPM`;
  if (stateEl) stateEl.textContent = rpm > 0 ? `${dutyPct}% PWM` : 'HALTED';
  if (barEl) barEl.style.width = `${rpm > 0 ? Math.min(100, Math.round((rpm / maxRpm) * 100)) : 0}%`;
  if (spinEl) {
    spinEl.classList.toggle('spinning', rpm > 0);
    spinEl.style.animationDuration = rpm > 0 ? `${Math.max(0.18, 1.4 - (rpm / maxRpm) * 1.15).toFixed(2)}s` : '0s';
  }
}

export function updatePerfAdjustLiveUI(): void {
  const container = document.getElementById('perf-adjust-body');
  if (!container || !container.querySelector('.perf-shell')) return;

  syncPerfControlValues(container);
  const t = computeHardwareTelemetry(getActiveRegistry());
  const setText = (id: string, txt: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setText('perf-kpi-ram', `${t.effectiveRamMB.toLocaleString()} MB`);
  setText('perf-kpi-ram-sub', t.ramModeLabel);
  setText('perf-kpi-cpu', `${t.cpuClockGHz} GHz${t.thermalThrottled ? ' ⚠️' : ''}`);
  setText('perf-kpi-cpu-sub', `${t.cpuLoadPct}% Load · ${t.host.cpuThreads} Threads · ${getActiveRegistry().perfProfile.toUpperCase()}`);
  setText('perf-kpi-temp', `${t.cpuTempC.toFixed(1)}°C`);
  setText('perf-kpi-temp-sub', `GPU ${t.gpuTempC.toFixed(1)}°C · VRM ${t.vrmTempC.toFixed(1)}°C · Amb ${t.ambientTempC}°C`);
  setText('perf-kpi-power', `${t.powerDrawW} W`);
  setText('perf-kpi-fan-sub', t.fanStatusSummary);

  const ramPct = Math.min(100, Math.round((t.usedRamMB / Math.max(1, t.effectiveRamMB)) * 100));
  setText('perf-ram-bar-txt', `${t.usedRamMB.toLocaleString()} MB used / ${t.effectiveRamMB.toLocaleString()} MB (${ramPct}%)`);
  const ramBar = document.getElementById('perf-ram-bar') as HTMLElement | null;
  if (ramBar) ramBar.style.width = `${ramPct}%`;

  const limRow = document.getElementById('perf-ram-limited-row');
  const custRow = document.getElementById('perf-ram-custom-row');
  if (limRow) limRow.style.opacity = getActiveRegistry().ramMode === 'limited' ? '1' : '0.62';
  if (custRow) custRow.style.opacity = getActiveRegistry().ramMode === 'custom' ? '1' : '0.62';

  updateFanCard('perf-fan-cpu', t.cpuFanRpm, t.effectiveFanDutyPct, 3600);
  updateFanCard('perf-fan-intake', t.intakeFanRpm, t.effectiveFanDutyPct, 2400);
  updateFanCard('perf-fan-exhaust', t.exhaustFanRpm, t.effectiveFanDutyPct, 2500);
  updateFanCard('perf-fan-gpu', t.gpuFanRpm, t.effectiveFanDutyPct, 3400);

  const setTemp = (labelId: string, barId: string, tempC: number) => {
    const f = Math.round((tempC * 9) / 5 + 32);
    setText(labelId, `${tempC.toFixed(1)}°C (${f}°F)${tempC >= 85 ? ' ⚠️ HOT' : ''}`);
    const bar = document.getElementById(barId) as HTMLElement | null;
    if (bar) {
      bar.style.width = `${Math.min(100, Math.round(((tempC - 20) / 80) * 100))}%`;
      bar.style.background = tempC >= 82 ? '#dc2626' : tempC >= 65 ? '#d97706' : '#16a34a';
    }
  };
  setTemp('perf-temp-cpu', 'perf-temp-cpu-bar', t.cpuTempC);
  setTemp('perf-temp-gpu', 'perf-temp-gpu-bar', t.gpuTempC);
  setTemp('perf-temp-vrm', 'perf-temp-vrm-bar', t.vrmTempC);

  const sensorsGrid = document.getElementById('perf-host-sensors-grid');
  if (sensorsGrid) {
    const battText =
      t.host.batteryLevelPct !== null
        ? `${t.host.batteryLevelPct}% (${t.host.batteryCharging ? 'Charging' : 'On Battery'})`
        : 'AC Mains / Desktop PSU';
    const netText = t.host.downlinkMbps !== null ? `${t.host.networkType} (~${t.host.downlinkMbps} Mbps)` : t.host.networkType;
    sensorsGrid.innerHTML = `
      <div><span>CPU Threads:</span><b>${t.host.cpuThreads} Threads (${escapeHtml(t.host.cpuPlatform)})</b></div>
      <div><span>Host GPU:</span><b>${escapeHtml(t.host.gpuRenderer)}</b></div>
      <div><span>Voltage Rails:</span><b>Vcore ${t.vcoreV}V · +12V ${t.rail12V}V · +5V ${t.rail5V}V · VBAT ${t.vbatV}V</b></div>
      <div><span>Display &amp; Power:</span><b>${t.host.screenRes} @ ${t.host.pixelRatio}x · ${battText}</b></div>
      <div><span>Network / Link:</span><b>${netText} · Swap ${getActiveRegistry().virtualSwapMB} MB</b></div>
      <div><span>JS Heap Probe:</span><b>${t.host.jsHeapUsedMB !== null ? `${t.host.jsHeapUsedMB} MB / ${t.host.jsHeapLimitMB} MB` : 'Browser Protected'}</b></div>
    `;
  }

  const liveStatus = document.getElementById('perf-live-status');
  if (liveStatus) {
    liveStatus.textContent = t.thermalThrottled
      ? '⚠️ THERMAL THROTTLE ACTIVE (>91°C) — Enable or increase Cooling Fans!'
      : isSyntheticBenchActive()
        ? `⚡ Stress Benchmark Running · ${t.cpuTempC.toFixed(1)}°C · ${t.cpuFanRpm} RPM`
        : `● Hardware Live — RAM: ${t.ramModeLabel} · ${t.cpuClockGHz} GHz · ${t.cpuTempC.toFixed(1)}°C · ${t.fanStatusSummary}`;
  }
}

export function initPerfAdjustApp(callbacks: PerfAdjustCallbacks): void {
  activeCallbacks = callbacks;
  const container = document.getElementById('perf-adjust-body');
  if (!container) return;

  if (!container.querySelector('.perf-shell')) {
    renderPerfAdjustShell(container);
  }
  updatePerfAdjustLiveUI();

  if (perfUiTickerId !== null) clearInterval(perfUiTickerId);
  perfUiTickerId = window.setInterval(() => {
    const win = document.getElementById('perfAdjust');
    if (win && win.style.display && win.style.display !== 'none') {
      updatePerfAdjustLiveUI();
    }
  }, 1000);
}

export function refreshPerfAdjustIfOpen(): void {
  const win = document.getElementById('perfAdjust');
  if (win && win.style.display && win.style.display !== 'none') {
    updatePerfAdjustLiveUI();
  }
}
