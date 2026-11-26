/**
 * Award/UEFI Hybrid CMOS BIOS Engine — 5,120+ Advanced Dormant Firmware Registers
 *
 * All 5,120 advanced BIOS features start completely INACTIVE (Disabled / Default)
 * and have zero runtime footprint unless the user explicitly enters BIOS Setup
 * and activates one or more features.
 */

import { computeHardwareTelemetry, getEffectiveRamDisplay } from './osHardwarePerf';

export interface BiosCategoryDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  count: number;
}

export interface BiosFeatureDef {
  id: string; // e.g. 'BIOS-0001'
  hexAddr: string; // e.g. '0x0000'
  categoryId: string;
  name: string;
  subsystem: string;
  defaultValue: string;
  options: string[];
  description: string;
  liveEffect?: boolean;
  effectBadge?: string;
}

export const BIOS_CATEGORIES: BiosCategoryDef[] = [
  { id: 'main', label: 'Main & Legacy CMOS', icon: '🖥️', description: 'Standard system hardware, ISA/IRQ/DMA routing, RTC, and legacy I/O bridges.', count: 200 },
  { id: 'cpu', label: 'AI Overclock & CPU', icon: '⚡', description: 'Per-core clock multipliers, BCLK, Vcore offsets, cache prefetchers, and branch predictors.', count: 480 },
  { id: 'memory', label: 'DRAM & Timings', icon: '🧠', description: 'XMP/EXPO profiles, primary/tertiary memory timings, ECC scrubbing, and ODT impedances.', count: 440 },
  { id: 'pcie', label: 'PCIe & Chipset', icon: '🔌', description: 'PCIe Gen1-5 lane bifurcation, Resizable BAR, Above 4G decoding, and DMI links.', count: 420 },
  { id: 'storage', label: 'NVMe, SATA & IDE', icon: '💾', description: 'AHCI/NVMe queues, IDE UDMA/PIO timing, SMART polling, RAID stripes, and FDISK MBR hooks.', count: 380 },
  { id: 'display', label: 'GPU, Display & CRT', icon: '📺', description: 'iGPU aperture, VBIOS GOP modes, CRT phosphor tube filters, and refresh rate overdrive.', count: 400 },
  { id: 'audio', label: 'Sound Blaster & DSP', icon: '🔊', description: 'SB16 IRQ/DMA channels, OPL3 FM polyphony, stereo wideners, and DAC oversampling.', count: 340 },
  { id: 'usb', label: 'USB & Thunderbolt', icon: '🔗', description: 'XHCI controller handoff, per-port power gates, USB4 tunneling, and high-Hz polling.', count: 360 },
  { id: 'network', label: 'LAN, Modem & PXE', icon: '🌐', description: '10GbE offload engines, V.90 modem AT init strings, Wake-on-LAN, and PXE network boot.', count: 340 },
  { id: 'power', label: 'ACPI, Fans & Thermal', icon: '🌡️', description: 'Q-Fan PWM curves, VRM switching phases, C-States, S3/S5 sleep, and TDP PL1/PL2 limits.', count: 420 },
  { id: 'security', label: 'TPM 2.0 & Secure Boot', icon: '🛡️', description: 'fTPM/dTPM PCR banks, Secure Boot PK/KEK/DB attestation, IOMMU VT-d, and supervisor locks.', count: 360 },
  { id: 'os_hooks', label: 'Win10/11 & Chrome', icon: '🪟', description: 'OS kernel bridges for Windows 11 glass compositor, Chrome GPU raster, and telemetry HUD.', count: 360 },
  { id: 'diag', label: 'Sensors & Diagnostics', icon: '📊', description: 'Motherboard voltage rails, thermal probes, POST hex code logging, and ECC fault injection.', count: 260 },
  { id: 'secret', label: 'Hidden Lab & Secrets', icon: '🧪', description: 'Experimental firmware overrides, Matrix rain mode, retro phosphor themes, and secret tweaks.', count: 360 },
];

export const TOTAL_BIOS_FEATURES = BIOS_CATEGORIES.reduce((sum, c) => sum + c.count, 0); // 5,120

const CAT_START_INDEX: Record<string, number> = {};
{
  let acc = 0;
  for (const cat of BIOS_CATEGORIES) {
    CAT_START_INDEX[cat.id] = acc;
    acc += cat.count;
  }
}

function catBiosId(catId: string, offset: number): string {
  return `BIOS-${String((CAT_START_INDEX[catId] ?? 0) + 1 + offset).padStart(4, '0')}`;
}

export const BIOS_FLAGSHIP_IDS = {
  cpuOverclock: catBiosId('cpu', 0),
  cpuSimd: catBiosId('cpu', 1),
  xmpRam: catBiosId('memory', 0),
  crtAmber: catBiosId('display', 0),
  crtGreen: catBiosId('display', 1),
  crtBloom: catBiosId('display', 2),
  audioDsp: catBiosId('audio', 0),
  tpmSecureBoot: catBiosId('security', 0),
  acrylicUi: catBiosId('os_hooks', 0),
  chromeGpu: catBiosId('os_hooks', 1),
  fpsHud: catBiosId('os_hooks', 2),
  trayPulse: catBiosId('os_hooks', 3),
  matrixRain: catBiosId('secret', 0),
  biosSkin: catBiosId('secret', 1),
  pilotOverclock: catBiosId('secret', 2),
  zeroWaitPost: catBiosId('secret', 3),
  rgbTrim: catBiosId('secret', 4),
} as const;

const BIOS_5000_STORAGE_KEY = '__angelos_bios_5000_active_v1';

// Stores ONLY non-default activated feature values. Empty object = 0 / 5,120 active.
let activatedBiosFeatures: Record<string, string> = loadActivatedBiosMap();
let cachedCatalog: BiosFeatureDef[] | null = null;
let cachedByCategory: Map<string, BiosFeatureDef[]> | null = null;

export function loadActivatedBiosMap(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(BIOS_5000_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to empty (zero active)
  }
  return {};
}

export function saveActivatedBiosMap(): void {
  try {
    if (Object.keys(activatedBiosFeatures).length === 0) {
      window.localStorage.removeItem(BIOS_5000_STORAGE_KEY);
    } else {
      window.localStorage.setItem(BIOS_5000_STORAGE_KEY, JSON.stringify(activatedBiosFeatures));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getActivatedBiosMap(): Record<string, string> {
  return activatedBiosFeatures;
}

export function getActivatedBiosCount(): number {
  return Object.keys(activatedBiosFeatures).length;
}

export function isBiosFeatureActivated(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(activatedBiosFeatures, id);
}

export function getBiosFeatureValue(id: string, defaultValue = 'Disabled'): string {
  return activatedBiosFeatures[id] ?? defaultValue;
}

export function setBiosFeatureValue(id: string, value: string, defaultValue = 'Disabled'): void {
  if (!value || value === defaultValue) {
    delete activatedBiosFeatures[id];
  } else {
    activatedBiosFeatures[id] = value;
  }
  saveActivatedBiosMap();
}

export function resetAllBios5000ToDefaults(): void {
  activatedBiosFeatures = {};
  saveActivatedBiosMap();
}

export function activateBiosFeaturesBatch(ids: Iterable<string>): number {
  const catalog = getBiosFeatureCatalog();
  const byId = new Map<string, BiosFeatureDef>();
  for (const f of catalog) byId.set(f.id, f);
  let count = 0;
  for (const id of ids) {
    const feat = byId.get(id);
    if (!feat) continue;
    const enabledVal = feat.options.find((o) => o !== feat.defaultValue) || 'Enabled';
    activatedBiosFeatures[feat.id] = enabledVal;
    count++;
  }
  saveActivatedBiosMap();
  return count;
}

export function deactivateBiosFeaturesBatch(ids: Iterable<string>): number {
  let count = 0;
  for (const id of ids) {
    if (Object.prototype.hasOwnProperty.call(activatedBiosFeatures, id)) {
      delete activatedBiosFeatures[id];
      count++;
    }
  }
  saveActivatedBiosMap();
  return count;
}

export function activateAllBios5000Features(): number {
  const catalog = getBiosFeatureCatalog();
  const nextMap: Record<string, string> = {};
  for (const feat of catalog) {
    nextMap[feat.id] = feat.options.find((o) => o !== feat.defaultValue) || 'Enabled';
  }
  activatedBiosFeatures = nextMap;
  saveActivatedBiosMap();
  return catalog.length;
}

// Curated flagship registers that produce visible/audible live OS behavior ONLY when activated in BIOS
const FLAGSHIP_BY_CATEGORY: Record<
  string,
  Array<Omit<BiosFeatureDef, 'id' | 'hexAddr' | 'categoryId'>>
> = {
  main: [
    {
      name: 'Fast A20 Gate & Shadow Firmware Acceleration',
      subsystem: 'CMOS Core',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Fast)', 'Aggressive 0-Wait'],
      description: 'Bypasses legacy 8042 keyboard controller A20 gate polling and shadows BIOS ROM into high SRAM.',
    },
    {
      name: 'ACPI APIC 256-IRQ Interrupt Remapping',
      subsystem: 'Interrupt Controller',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (IO-APIC)', 'x2APIC Mode'],
      description: 'Enables extended 256-vector hardware interrupt routing beyond legacy dual-8259 PIC 16 IRQs.',
    },
  ],
  cpu: [
    {
      name: 'CPU Extreme LN2 Overclock Multiplier (5.20 GHz)',
      subsystem: 'Ratio Control',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (4.60 GHz OC)', 'Enabled (5.20 GHz LN2 OC)'],
      description: 'LIVE OS EFFECT: Unlocks extreme multi-GHz CPU telemetry readout in BIOS POST, Task Manager, System Monitor & WINVER.',
      liveEffect: true,
      effectBadge: 'CPU OC',
    },
    {
      name: 'Neural Co-Processor AVX-512 Vector Pipeline',
      subsystem: 'Execution Core',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (512-bit)', 'Turbo Fusion'],
      description: 'Activates 512-bit SIMD vector execution lanes on the Angel Neural Co-Processor.',
      liveEffect: true,
      effectBadge: 'SIMD BOOST',
    },
    {
      name: 'Hardware L1/L2/L3 Stream Stride Prefetcher',
      subsystem: 'Cache Fabric',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Balanced)', 'Enabled (Aggressive)'],
      description: 'Predictively streams contiguous cache lines into L1/L2 SRAM ahead of instruction retirement.',
    },
  ],
  memory: [
    {
      name: 'DRAM XMP-6400 Extreme Bandwidth Profile (+256 MB Boost)',
      subsystem: 'XMP/EXPO Engine',
      defaultValue: 'Disabled',
      options: ['Disabled', 'XMP Profile 1 (6000 MT/s)', 'XMP Profile 2 (6400 MT/s)'],
      description: 'LIVE OS EFFECT: Unlocks high-speed XMP DRAM profile and expands effective RAM telemetry in System Monitor & BIOS POST.',
      liveEffect: true,
      effectBadge: 'XMP RAM',
    },
    {
      name: 'Dual-Channel Gear-1 Tightened CAS Timings (CL28)',
      subsystem: 'Memory Controller',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (CL30)', 'Enabled (CL28 Extreme)'],
      description: 'Locks IMC 1:1 Gear-1 ratio with tightened tCL/tRCD/tRP command timings.',
    },
  ],
  pcie: [
    {
      name: 'PCIe Resizable BAR (ReBAR) Full VRAM Aperture',
      subsystem: 'PCIe Root Complex',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (4GB Window)', 'Enabled (16GB Full BAR)'],
      description: 'Allows the CPU to map the entire graphics framebuffer over PCIe instead of 256 MB chunks.',
    },
    {
      name: 'Above 4G MMIO Space Decoding',
      subsystem: 'PCIe Root Complex',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (64-bit MMIO)'],
      description: 'Enables 64-bit capable PCIe devices to allocate memory-mapped I/O ranges above the 4 GB boundary.',
    },
  ],
  storage: [
    {
      name: 'NVMe Direct-to-RAM DMA Queue Bypass',
      subsystem: 'Storage Fabric',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (64K Queues)', 'Enabled (Zero-Copy)'],
      description: 'Routes NVMe submission/completion queues directly across PCIe DMA lanes with minimal interrupt overhead.',
    },
    {
      name: 'IDE Quantum Fireball Overdrive Caching',
      subsystem: 'IDE Controller',
      defaultValue: 'Disabled',
      options: ['Disabled', 'UDMA Mode 5', 'UDMA Mode 6 Turbo'],
      description: 'Enables high-speed Ultra-DMA burst transfers and write-back cache on Primary IDE C:\\.',
    },
  ],
  display: [
    {
      name: 'CRT Amber VT220 Monochrome Phosphor Filter',
      subsystem: 'CRT Tube DSP',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Warm Amber)', 'Enabled (Deep Amber)'],
      description: 'LIVE OS EFFECT: Applies an authentic vintage Amber VT220 monochrome phosphor screen tint across the desktop.',
      liveEffect: true,
      effectBadge: 'AMBER CRT',
    },
    {
      name: 'CRT Green IBM 5151 Monochrome Phosphor Filter',
      subsystem: 'CRT Tube DSP',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (P39 Green)', 'Enabled (Bright Terminal)'],
      description: 'LIVE OS EFFECT: Applies an authentic IBM 5151 Green monochrome phosphor tint across the desktop.',
      liveEffect: true,
      effectBadge: 'GREEN CRT',
    },
    {
      name: 'CRT Curved Vignette & Phosphor Bloom',
      subsystem: 'CRT Tube DSP',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Subtle)', 'Enabled (Heavy Aperture)'],
      description: 'LIVE OS EFFECT: Adds hardware tube edge curvature vignette and phosphor glow to the CRT overlay.',
      liveEffect: true,
      effectBadge: 'CRT BLOOM',
    },
  ],
  audio: [
    {
      name: 'SB16 OPL3 Harmonic Stereo Widener & Sub-Bass Boost',
      subsystem: 'Sound Blaster DSP',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (+6dB Warmth)', 'Enabled (Studio Wide)'],
      description: 'LIVE OS EFFECT: Drives richer harmonic tape saturation and stereo boost in the Sound Blaster 16 synth engine.',
      liveEffect: true,
      effectBadge: 'AUDIO DSP',
    },
  ],
  usb: [
    {
      name: 'USB 8000Hz Ultra-Low-Latency HID Polling Override',
      subsystem: 'xHCI Host',
      defaultValue: 'Disabled',
      options: ['Disabled', '1000Hz (1ms)', '8000Hz (0.125ms)'],
      description: 'Locks USB mouse/keyboard interrupt endpoints to ultra-low microframe polling intervals.',
    },
  ],
  network: [
    {
      name: 'V.90 + 10GbE Hardware TCP Chimney Offload',
      subsystem: 'Network MAC',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (TCP/UDP Offload)'],
      description: 'Offloads TCP checksums and segmentation to the hardware MAC controller.',
    },
  ],
  power: [
    {
      name: 'Unlimited TDP Power Envelope (PL1/PL2 Unlocked)',
      subsystem: 'VRM Power Delivery',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (250W)', 'Enabled (4096W Unlimited)'],
      description: 'Removes motherboard VRM current and package thermal throttling limits for sustained boost clocks.',
    },
  ],
  security: [
    {
      name: 'Windows 11 TPM 2.0 + Secure Boot Attestation',
      subsystem: 'Security Enclave',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (fTPM 2.0 + Secure Boot)'],
      description: 'LIVE OS EFFECT: Enables hardware TPM 2.0 & UEFI Secure Boot attestation badges across BIOS POST, WINVER & Task Manager.',
      liveEffect: true,
      effectBadge: 'TPM 2.0',
    },
  ],
  os_hooks: [
    {
      name: 'Windows 11 Acrylic Taskbar Extra-Glass Compositor',
      subsystem: 'Shell Kernel Hook',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Mica Blur)', 'Enabled (Deep Acrylic)'],
      description: 'LIVE OS EFFECT: Activates enhanced frosted glass blur & luminous edge highlights on the Taskbar and Start Menu.',
      liveEffect: true,
      effectBadge: 'GLASS UI',
    },
    {
      name: 'Chrome Hardware GPU Rasterization & V8 Turbo Hook',
      subsystem: 'Browser Kernel',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (GPU Raster)', 'Enabled (GPU + Zero-Copy)'],
      description: 'LIVE OS EFFECT: Displays a live ⚡ GPU Accelerated status badge inside Google Chrome and chrome://settings.',
      liveEffect: true,
      effectBadge: 'CHROME GPU',
    },
    {
      name: 'Desktop Live Hardware Telemetry & FPS HUD Overlay',
      subsystem: 'OS Overlay Hook',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Compact)', 'Enabled (Full Sensors)'],
      description: 'LIVE OS EFFECT: Pins a sleek real-time FPS, CPU clock, RAM, and Active BIOS Register HUD on the desktop corner.',
      liveEffect: true,
      effectBadge: 'FPS HUD',
    },
    {
      name: 'Taskbar Live System Activity Pulse Strip',
      subsystem: 'Taskbar Kernel',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (CPU Badge)'],
      description: 'LIVE OS EFFECT: Adds a live mini CPU/BIOS status telemetry pill inside the taskbar system tray.',
      liveEffect: true,
      effectBadge: 'TRAY CPU',
    },
  ],
  diag: [
    {
      name: 'BIOS POST Code Hex Tracer & Ring-0 Audit',
      subsystem: 'POST Telemetry',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Verbose 80h Port)'],
      description: 'Streams real-time port 80h POST diagnostic hex codes during boot and sensor polling.',
    },
  ],
  secret: [
    {
      name: 'BIOS Matrix Digital Code Rain Desktop Layer',
      subsystem: 'Secret Firmware',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Subtle Rain)', 'Enabled (Neon Overdrive)'],
      description: 'LIVE OS EFFECT: Activates animated falling Matrix phosphor code rain behind desktop icons.',
      liveEffect: true,
      effectBadge: 'MATRIX RAIN',
    },
    {
      name: 'BIOS Firmware UI Phosphor Skin',
      subsystem: 'Secret Firmware',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Matrix Green BIOS', 'Amber VT220 BIOS', 'Obsidian UEFI Dark'],
      description: 'LIVE OS EFFECT: Transforms the BIOS Setup screen itself into Matrix Green, Amber Terminal, or Dark UEFI mode!',
      liveEffect: true,
      effectBadge: 'BIOS SKIN',
    },
    {
      name: 'Angel Pilot Overclocked IQ Firmware Override',
      subsystem: 'Secret Firmware',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (5,000-Register Panic)'],
      description: 'LIVE OS EFFECT: Plugs all 5,120 BIOS registers directly into Angel Pilot so he reacts dramatically to the overclock!',
      liveEffect: true,
      effectBadge: 'ANGEL PILOT',
    },
    {
      name: 'Zero-Wait Instant BIOS Boot Sequence',
      subsystem: 'Secret Firmware',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (0ms POST Skip)'],
      description: 'LIVE OS EFFECT: Accelerates BIOS POST & splash transitions to near-instant speed when booting.',
      liveEffect: true,
      effectBadge: 'FAST BOOT',
    },
    {
      name: 'Desktop RGB Neon Active Window Accent',
      subsystem: 'Secret Firmware',
      defaultValue: 'Disabled',
      options: ['Disabled', 'Enabled (Cyan Glow)', 'Enabled (Cyber Rainbow)'],
      description: 'LIVE OS EFFECT: Adds a glowing neon hardware trim around the currently active desktop window.',
      liveEffect: true,
      effectBadge: 'RGB TRIM',
    },
  ],
};

interface CategoryBlueprint {
  subsystems: string[];
  targets: string[];
  params: string[];
  optionSets: string[][];
}

const CATEGORY_BLUEPRINTS: Record<string, CategoryBlueprint> = {
  main: {
    subsystems: ['Legacy ISA Bridge', 'Super I/O', 'RTC Clock', 'PIC 8259A', 'DMA 8237', 'PnP ROM', 'CMOS NVRAM', 'PS/2 Controller', 'Serial UART', 'Parallel ECP'],
    targets: ['Bank 0', 'Bank 1', 'Channel A', 'Channel B', 'Port 0', 'Port 1'],
    params: ['Wait-State Timing', 'IRQ Routing Lock', 'Address Shadowing', 'Bus Recovery Delay', 'FIFO Buffer Gate'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Auto', 'Enabled'], ['Disabled', '1 Wait', '2 Waits', 'Zero Wait']],
  },
  cpu: {
    subsystems: ['P-Core Ratio', 'E-Core Cluster', 'BCLK PLL', 'Vcore Curve', 'Load-Line Cal', 'L1/L2 Cache', 'L3 Ring Bus', 'Branch Predictor', 'AVX Pipeline', 'Microcode Hook', 'C-State Arbiter', 'Thermal Guard'],
    targets: ['Core 0', 'Core 1', 'Core 2', 'Core 3', 'Core 4', 'Core 5', 'Core 6', 'Core 7'],
    params: ['Multiplier Offset', 'Adaptive Voltage Bias', 'Prefetch Aggression', 'Clock Gating Override', 'Slew Rate Trim'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', '+1 Bin', '+2 Bins', '+4 Bins'], ['Disabled', 'Level 1', 'Level 2', 'Extreme']],
  },
  memory: {
    subsystems: ['Primary Timings', 'Secondary tRFC', 'Tertiary tRRD', 'DRAM Voltage', 'ODT Termination', 'IMC Gear Ratio', 'ECC Scrubber', 'Row Hammer TRR', 'MRC Fast Train', 'XMP Sub-Timings', 'Refresh Interval'],
    targets: ['Ch-A DIMM0', 'Ch-A DIMM1', 'Ch-B DIMM0', 'Ch-B DIMM1', 'Rank 0', 'Rank 1', 'Bank Group 0', 'Bank Group 1'],
    params: ['CAS Latency Offset', 'Command Rate 1T Lock', 'RTT_NOM Impedance', 'Write Recovery Clamp', 'ZQ Calibration Trim'],
    optionSets: [['Disabled', 'Auto Tight', 'Manual 1T'], ['Disabled', 'Enabled'], ['Disabled', '-1 Clock', '-2 Clocks', 'Aggressive']],
  },
  pcie: {
    subsystems: ['Root Port', 'Bifurcation Mux', 'ASPM Power', 'DMI Southbridge', 'AER Error Handler', 'LTR Latency', 'SR-IOV Fabric', 'Slot Equalization', 'Clock Buffer', 'ARI Forwarding', 'DMA Remapper', 'Link De-Emphasis'],
    targets: ['Slot x16_1', 'Slot x16_2', 'Slot x4_1', 'M.2_1 Lane', 'M.2_2 Lane', 'Chipset Mux', 'DMI Link'],
    params: ['Gen5 Link Lock', 'Payload Max 512B', 'Relaxed Ordering', 'L1 Substate Override', 'Tx Equalization Preset'],
    optionSets: [['Disabled', 'Gen3', 'Gen4', 'Gen5'], ['Disabled', 'Enabled'], ['Disabled', 'Auto', 'x8/x8', 'x4/x4/x4/x4']],
  },
  storage: {
    subsystems: ['NVMe Host', 'SATA AHCI', 'IDE Primary', 'IDE Secondary', 'RAID Engine', 'SMART Daemon', 'TRIM Pass-Thru', 'Write Cache', 'Spin-Up Stagger', 'Hot-Plug Gate'],
    targets: ['Port 0', 'Port 1', 'Port 2', 'Port 3', 'Port 4', 'Port 5', 'Port 6', 'Port 7'],
    params: ['Aggressive LPM', 'NCQ Depth 32', 'PIO/UDMA Override', 'Boot Sector Guard', 'Queue Arbitration'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'UDMA-5', 'UDMA-6'], ['Disabled', 'Auto', 'Enabled']],
  },
  display: {
    subsystems: ['iGPU Core', 'DVMT Framebuffer', 'VBIOS GOP', 'DisplayPort Link', 'HDMI TMDS', 'VGA RAMDAC', 'CRT Phosphor', 'Shader Cache', 'Frame Pacer', 'EDID Override'],
    targets: ['Pipe A', 'Pipe B', 'Pipe C', 'Output 1', 'Output 2', 'DAC 0', 'Plane 0', 'Plane 1'],
    params: ['Clock Boost', 'Aperture Allocation', 'Refresh Overclock', 'Subpixel Dither', 'VSync Bypass'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', '128 MB', '512 MB', '2048 MB'], ['Disabled', '120 Hz', '144 Hz', '240 Hz']],
  },
  audio: {
    subsystems: ['Azalia HDA', 'SB16 Emulation', 'OPL3 FM Synth', 'DAC Upsampler', 'Stereo Matrix', 'MIDI MPU-401', 'Mic Pre-Amp', 'DMA Buffer', 'SPDIF Optical'],
    targets: ['Channel 0', 'Channel 1', 'Voice Bank A', 'Voice Bank B', 'Mixer Bus 1', 'Mixer Bus 2', 'Port 220h', 'Port 330h'],
    params: ['Bit-Depth Lock', 'Zero-Latency DMA', 'Harmonic Saturation', 'IRQ Sharing Guard', 'Jack Sense Override'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', '16-Bit', '24-Bit / 96kHz'], ['Disabled', '+6 dB', '+12 dB', '+20 dB']],
  },
  usb: {
    subsystems: ['xHCI Controller', 'EHCI Legacy', 'USB4 Tunneling', 'Thunderbolt Security', 'Port Power Gate', 'Wake-on-HID', 'Type-C Alt Mode', 'Isochronous Sched', 'ESD Guard'],
    targets: ['Root Port 1', 'Root Port 2', 'Root Port 3', 'Root Port 4', 'Front Header A', 'Front Header B', 'Type-C 1', 'Type-C 2'],
    params: ['Fast Charge S4/S5', 'Legacy Emulation', '10Gb/s SuperSpeed+', 'Polling Interval Lock', 'Overcurrent Mask'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Legacy Auto', 'Full xHCI'], ['Disabled', '500Hz', '1000Hz', '4000Hz']],
  },
  network: {
    subsystems: ['10GbE MAC', '2.5GbE PHY', 'PXE OpROM', 'HTTP Boot', 'Wake-on-LAN', 'TCP Offload', 'Wi-Fi RF Mux', 'Modem COM1', 'DNS HW Cache'],
    targets: ['NIC 0', 'NIC 1', 'Queue 0', 'Queue 1', 'VLAN Tag 1', 'VLAN Tag 2', 'COM1 UART', 'RF Band'],
    params: ['Magic Packet Wake', 'Jumbo Frame 9K', 'Interrupt Moderation', 'V.90 AT Init Boost', 'EEE Power Gate'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'IPv4 PXE', 'IPv4 + IPv6'], ['Disabled', 'Low Latency', 'Throughput']],
  },
  power: {
    subsystems: ['CPU Fan PWM', 'Chassis Fan', 'Pump Header', 'VRM Phase Ctrl', 'ACPI C-States', 'S3/S5 Sleep', 'ErP Lot 6', 'TDP PL1/PL2', 'Thermal Trip', 'AC Loss Policy', 'Voltage Guard'],
    targets: ['Header 1', 'Header 2', 'Header 3', 'Phase Bank A', 'Phase Bank B', 'Zone 1', 'Zone 2', 'Rail 0'],
    params: ['PWM Duty Curve', 'Zero-RPM Stop', 'Hysteresis Delay', 'Phase Doubler Mode', 'Package State Lock'],
    optionSets: [['Disabled', 'Silent', 'Turbo', 'Full Speed'], ['Disabled', 'Enabled'], ['Disabled', 'Auto', 'Performance']],
  },
  security: {
    subsystems: ['fTPM 2.0', 'Discrete SPI TPM', 'Secure Boot PK', 'KEK/DB Store', 'IOMMU VT-d', 'Memory Encrypt', 'BIOS Write Lock', 'Chassis Sensor', 'Boot Password'],
    targets: ['PCR Bank 0', 'PCR Bank 7', 'PCR Bank 11', 'Domain 0', 'Domain 1', 'Key Slot A', 'Key Slot B', 'Enclave 0'],
    params: ['SHA-384 Attestation', 'DMA Page Isolation', 'Flash Lock Override', 'Physical Presence', 'Audit Log Guard'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Standard', 'Strict'], ['Disabled', 'SHA-256', 'SHA-384']],
  },
  os_hooks: {
    subsystems: ['Win11 Shell', 'Taskbar Acrylic', 'Chrome GPU', 'V8 Turbo JIT', 'VDesk Animator', 'Snap Grid Hook', 'Boot Fast-Path', 'Kernel Timer', 'Angel Pilot Bus'],
    targets: ['Ring 0', 'Ring 3', 'Compositor', 'Renderer', 'Tray Daemon', 'Start Host', 'Search Indexer', 'DWM Pipe'],
    params: ['Zero-Copy Surface', 'Hardware Raster', 'Pre-Fetch Manifest', '1ms Timer Tick', 'Telemetry Hook'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Balanced', 'Ultra']],
  },
  diag: {
    subsystems: ['Voltage Probe', 'Thermal Diode', 'POST Tracer', 'ECC Injector', 'Bus Profiler', 'Burn-In Hook', 'CMOS Checksum', 'Clock Jitter', 'Latch Monitor'],
    targets: ['+12V Rail', '+5V Rail', '+3.3V Rail', 'Vcore Sense', 'VRM Sensor', 'PCH Probe'],
    params: ['Alert Threshold', 'Sampling 1000Hz', 'Log to NVRAM', 'CRC Verification', 'Spike Trap'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Warn Only', 'Log & Alert']],
  },
  secret: {
    subsystems: ['Matrix BIOS', 'Phosphor Lab', 'Overdrive Hook', 'Dev Mode Gate', 'Telemetry HUD', 'NVRAM Unlock', 'Clock Multiplier', 'Easter Egg Bus', 'Legacy Turbo'],
    targets: ['Lab 01', 'Lab 02', 'Lab 03', 'Lab 04', 'Lab 05', 'Lab 06'],
    params: ['Experimental Bit', 'Override Latch', 'Hidden Switch', 'Phosphor Bias', 'Dev Flag'],
    optionSets: [['Disabled', 'Enabled'], ['Disabled', 'Experimental', 'Overdrive']],
  },
};

function buildCatalog(): BiosFeatureDef[] {
  const list: BiosFeatureDef[] = [];
  let globalIndex = 0;

  for (const cat of BIOS_CATEGORIES) {
    const flagships = FLAGSHIP_BY_CATEGORY[cat.id] || [];
    let countInCat = 0;

    for (const f of flagships) {
      if (countInCat >= cat.count) break;
      const id = `BIOS-${String(globalIndex + 1).padStart(4, '0')}`;
      const hexAddr = `0x${globalIndex.toString(16).toUpperCase().padStart(4, '0')}`;
      list.push({
        id,
        hexAddr,
        categoryId: cat.id,
        ...f,
      });
      globalIndex++;
      countInCat++;
    }

    const bp = CATEGORY_BLUEPRINTS[cat.id];
    let sIdx = 0;
    let tIdx = 0;
    let pIdx = 0;
    let extraGen = 1;

    while (countInCat < cat.count) {
      const sub = bp.subsystems[sIdx % bp.subsystems.length];
      const tgt = bp.targets[tIdx % bp.targets.length];
      const prm = bp.params[pIdx % bp.params.length];
      const opts = bp.optionSets[(sIdx + tIdx + pIdx) % bp.optionSets.length];

      const cycleExhausted =
        sIdx >= bp.subsystems.length &&
        tIdx >= bp.targets.length &&
        pIdx >= bp.params.length;

      const suffix = cycleExhausted ? ` [Reg #${extraGen++}]` : '';
      const id = `BIOS-${String(globalIndex + 1).padStart(4, '0')}`;
      const hexAddr = `0x${globalIndex.toString(16).toUpperCase().padStart(4, '0')}`;

      list.push({
        id,
        hexAddr,
        categoryId: cat.id,
        name: `${sub} — ${tgt} ${prm}${suffix}`,
        subsystem: sub,
        defaultValue: 'Disabled',
        options: opts,
        description: `Firmware register ${hexAddr} (${cat.label} / ${sub}). Controls ${prm.toLowerCase()} on ${tgt}. Inactive by default until explicitly activated inside CMOS BIOS Setup.`,
      });

      globalIndex++;
      countInCat++;

      pIdx++;
      if (pIdx % bp.params.length === 0) {
        tIdx++;
        if (tIdx % bp.targets.length === 0) {
          sIdx++;
        }
      }
    }
  }

  return list;
}

export function getBiosFeatureCatalog(): BiosFeatureDef[] {
  if (!cachedCatalog) {
    cachedCatalog = buildCatalog();
    cachedByCategory = new Map();
    for (const cat of BIOS_CATEGORIES) {
      cachedByCategory.set(cat.id, []);
    }
    for (const item of cachedCatalog) {
      cachedByCategory.get(item.categoryId)?.push(item);
    }
  }
  return cachedCatalog;
}

export function getBiosCategoryFeatures(categoryId: string): BiosFeatureDef[] {
  getBiosFeatureCatalog();
  return cachedByCategory?.get(categoryId) || [];
}

// ==================== LIVE OS EFFECT HOOKS (ONLY WHEN ACTIVATED IN BIOS) ====================

export function isBiosZeroWaitPost(): boolean {
  return isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.zeroWaitPost);
}

export function isBiosTpmVerified(): boolean {
  return isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.tpmSecureBoot);
}

export function isBiosChromeGpuAccelerated(): boolean {
  return isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.chromeGpu);
}

export function isBiosPilotOverclocked(): boolean {
  return isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.pilotOverclock);
}

export function getBiosCpuLabelSuffix(): string {
  const oc = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.cpuOverclock];
  const simd = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.cpuSimd];
  const parts: string[] = [];
  if (oc) parts.push(oc.includes('5.20') ? '5.20GHz LN2 OC' : '4.60GHz OC');
  if (simd) parts.push('AVX-512');
  return parts.length > 0 ? ` [${parts.join(' · ')}]` : '';
}

export function getBiosRamBoostMB(): number {
  const xmp = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.xmpRam];
  if (!xmp) return 0;
  return xmp.includes('6400') ? 256 : 128;
}

let matrixRainAnimId: number | null = null;
let hudIntervalId: number | null = null;

function stopBiosMatrixRain(): void {
  if (matrixRainAnimId !== null) {
    cancelAnimationFrame(matrixRainAnimId);
    matrixRainAnimId = null;
  }
  const c = document.getElementById('bios-matrix-canvas') as HTMLCanvasElement | null;
  if (c) c.style.display = 'none';
}

function startBiosMatrixRain(overdrive: boolean): void {
  const c = document.getElementById('bios-matrix-canvas') as HTMLCanvasElement | null;
  if (!c) return;
  c.style.display = 'block';
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  if (matrixRainAnimId !== null) cancelAnimationFrame(matrixRainAnimId);

  const cols = Math.max(20, Math.floor(c.width / 18));
  const drops = new Array(cols).fill(1).map(() => Math.floor(Math.random() * 35));
  let frame = 0;

  const tick = () => {
    if (c.style.display === 'none') return;
    frame++;
    if (frame % (overdrive ? 2 : 3) === 0) {
      ctx.fillStyle = overdrive ? 'rgba(0, 8, 2, 0.14)' : 'rgba(0, 12, 8, 0.22)';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = overdrive ? '#22ff66' : 'rgba(0, 255, 110, 0.55)';
      ctx.font = '14px "IBM Plex Mono", monospace';
      for (let i = 0; i < drops.length; i++) {
        const ch = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
        ctx.fillText(ch, i * 18, drops[i] * 16);
        if (drops[i] * 16 > c.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }
    matrixRainAnimId = requestAnimationFrame(tick);
  };
  tick();
}

function stopBiosHud(): void {
  if (hudIntervalId !== null) {
    clearInterval(hudIntervalId);
    hudIntervalId = null;
  }
  const hud = document.getElementById('bios-hardware-hud');
  if (hud) hud.style.display = 'none';
}

function startBiosHud(fullMode: boolean): void {
  const hud = document.getElementById('bios-hardware-hud');
  if (!hud) return;
  hud.style.display = 'block';

  const updateHud = () => {
    const activeCount = getActivatedBiosCount();
    const t = computeHardwareTelemetry();
    const fps = 60;
    const ocTxt = getBiosCpuLabelSuffix() || '';
    const tpmTxt = isBiosTpmVerified() ? 'TPM 2.0 ON' : 'TPM OFF';
    hud.innerHTML = `
      <div class="bios-hud-title">⚡ BIOS TELEMETRY HUD</div>
      <div class="bios-hud-row"><span>FPS / VSYNC:</span><b>${fps} FPS</b></div>
      <div class="bios-hud-row"><span>BIOS REGS:</span><b>${activeCount.toLocaleString()} / ${TOTAL_BIOS_FEATURES.toLocaleString()}</b></div>
      <div class="bios-hud-row"><span>CPU / TEMP:</span><b>${t.cpuClockGHz}GHz${ocTxt} · ${t.cpuTempC.toFixed(1)}°C</b></div>
      <div class="bios-hud-row"><span>RAM / FANS:</span><b>${getEffectiveRamDisplay()} · ${t.cpuFanRpm} RPM</b></div>
      ${fullMode ? `<div class="bios-hud-row"><span>PWR / SEC:</span><b>${t.powerDrawW}W · ${tpmTxt}</b></div>` : ''}
    `;
  };
  updateHud();
  if (hudIntervalId !== null) clearInterval(hudIntervalId);
  hudIntervalId = window.setInterval(updateHud, 1200);
}

export function applyBios5000EffectsToOS(): void {
  const body = document.body;
  const taskbar = document.getElementById('taskbar');

  // 1. Display CRT phosphor overrides (only if activated in BIOS!)
  const amber = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.crtAmber];
  const green = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.crtGreen];
  const bloom = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.crtBloom];
  body.classList.toggle('bios-crt-amber', Boolean(amber));
  body.classList.toggle('bios-crt-green', Boolean(green) && !amber);
  body.classList.toggle('bios-crt-bloom', Boolean(bloom));

  // 2. Shell Glass / Acrylic Blur & RGB Window Border
  body.classList.toggle('bios-win11-acrylic', isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.acrylicUi));
  body.classList.toggle('bios-rgb-trim', isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.rgbTrim));

  // 3. Chrome GPU Acceleration Badge
  const chromeGpuBadge = document.getElementById('chrome-bios-gpu-badge');
  if (chromeGpuBadge) {
    chromeGpuBadge.style.display = isBiosChromeGpuAccelerated() ? 'inline-flex' : 'none';
  }

  // 4. Taskbar Live Tray CPU Pulse (only when activated in BIOS)
  const trayPulse = document.getElementById('tray-bios-pulse');
  if (trayPulse) {
    const showPulse = isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.trayPulse);
    trayPulse.style.display = showPulse ? 'inline-flex' : 'none';
    if (showPulse) {
      trayPulse.textContent = `BIOS:${getActivatedBiosCount()}`;
    }
  }

  // 5. Desktop Matrix Rain (only when activated in BIOS)
  const matrixVal = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.matrixRain];
  if (matrixVal) {
    startBiosMatrixRain(matrixVal.includes('Overdrive'));
  } else {
    stopBiosMatrixRain();
  }

  // 6. Desktop Live Telemetry HUD (only when activated in BIOS)
  const hudVal = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.fpsHud];
  if (hudVal) {
    startBiosHud(hudVal.includes('Full'));
  } else {
    stopBiosHud();
  }

  // 7. BIOS Screen itself theme (Blue / Matrix Green / Amber / Dark UEFI)
  const biosScreen = document.getElementById('cmos-bios-screen');
  if (biosScreen) {
    biosScreen.classList.remove('bios-skin-green', 'bios-skin-amber', 'bios-skin-obsidian');
    const skin = activatedBiosFeatures[BIOS_FLAGSHIP_IDS.biosSkin] || '';
    if (skin.includes('Green')) biosScreen.classList.add('bios-skin-green');
    else if (skin.includes('Amber')) biosScreen.classList.add('bios-skin-amber');
    else if (skin.includes('Obsidian')) biosScreen.classList.add('bios-skin-obsidian');
  }

  // 8. Update Angel Pilot status indicator if overclocked in BIOS
  const pilotStatus = document.getElementById('angel-pilot-training-status');
  if (pilotStatus && isBiosPilotOverclocked()) {
    pilotStatus.textContent = '⚡ BIOS OVERCLOCKED: 5,120 Firmware Registers Plugged In (Still Zero Brain Cells)';
  }

  // 9. Update BIOS Active Badge inside Control Panel / Post Screen
  const biosCountChip = document.getElementById('bios-post-active-chip');
  if (biosCountChip) {
    const cnt = getActivatedBiosCount();
    biosCountChip.textContent = cnt > 0 ? `⚡ ${cnt} / ${TOTAL_BIOS_FEATURES.toLocaleString()} BIOS FEATURES ACTIVE` : `0 / ${TOTAL_BIOS_FEATURES.toLocaleString()} ADVANCED FEATURES ACTIVE (DORMANT)`;
    biosCountChip.style.color = cnt > 0 ? '#55ff55' : '#94a3b8';
  }

  if (taskbar) {
    taskbar.classList.toggle('bios-acrylic-boost', isBiosFeatureActivated(BIOS_FLAGSHIP_IDS.acrylicUi));
  }
}

// ==================== BIOS 5,120+ UI CONTROLLER ====================
let activeCategoryId = 'main';
let biosFilterMode: 'all' | 'active' | 'live' = 'all';
let biosSearchQuery = '';
let biosPage = 1;
const PAGE_SIZE = 60;
let selectedBiosFeatureId = 'BIOS-0001';
const selectedBiosIds = new Set<string>();

function syncBiosSelectionUI(pageItems?: BiosFeatureDef[]): void {
  const cntEl = document.getElementById('cmos-selected-counter');
  if (cntEl) {
    cntEl.textContent = `${selectedBiosIds.size.toLocaleString()} selected`;
  }
  const actSelBtn = document.getElementById('cmos-activate-selected-btn') as HTMLButtonElement | null;
  const deactSelBtn = document.getElementById('cmos-deactivate-selected-btn') as HTMLButtonElement | null;
  if (actSelBtn) actSelBtn.disabled = selectedBiosIds.size === 0;
  if (deactSelBtn) deactSelBtn.disabled = selectedBiosIds.size === 0;

  const pageChk = document.getElementById('cmos-select-page-chk') as HTMLInputElement | null;
  if (pageChk && pageItems) {
    const selectedOnPage = pageItems.filter((f) => selectedBiosIds.has(f.id)).length;
    pageChk.checked = pageItems.length > 0 && selectedOnPage === pageItems.length;
    pageChk.indeterminate = selectedOnPage > 0 && selectedOnPage < pageItems.length;
  }
}

export interface BiosUiCallbacks {
  onFeatureChanged?: () => void;
  onPlayClick?: () => void;
  onUnlockTrophy?: (id: string) => void;
}

let uiCallbacks: BiosUiCallbacks = {};

export function registerBios5000Callbacks(cb: BiosUiCallbacks): void {
  uiCallbacks = cb;
}

function getFilteredBiosFeatures(): BiosFeatureDef[] {
  const q = biosSearchQuery.trim().toLowerCase();
  let pool: BiosFeatureDef[];

  if (q || biosFilterMode !== 'all') {
    pool = getBiosFeatureCatalog();
  } else {
    pool = getBiosCategoryFeatures(activeCategoryId);
  }

  return pool.filter((item) => {
    if (biosFilterMode === 'active' && !isBiosFeatureActivated(item.id)) return false;
    if (biosFilterMode === 'live' && !item.liveEffect) return false;
    if (q) {
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.hexAddr.toLowerCase().includes(q) ||
        item.subsystem.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    if (biosFilterMode === 'all') {
      return item.categoryId === activeCategoryId;
    }
    return true;
  });
}

function updateBiosTelemetryStrip(): void {
  const activeCount = getActivatedBiosCount();
  const countEl = document.getElementById('cmos-5000-active-counter');
  if (countEl) {
    countEl.textContent = `${activeCount.toLocaleString()} / ${TOTAL_BIOS_FEATURES.toLocaleString()} ACTIVATED`;
    countEl.classList.toggle('has-active', activeCount > 0);
  }

  const sensorsEl = document.getElementById('cmos-live-sensors');
  if (sensorsEl) {
    const t = computeHardwareTelemetry();
    sensorsEl.textContent = `Vcore: ${t.vcoreV}V · CPU: ${t.cpuTempC.toFixed(1)}°C · Fan: ${t.cpuFanRpm} RPM · RAM: ${t.effectiveRamMB.toLocaleString()} MB · VBAT: ${t.vbatV}V`;
  }
}

export function renderCmos5000Browser(): void {
  const catListEl = document.getElementById('cmos-cat-list');
  const rowsEl = document.getElementById('cmos-features-tbody');
  const pageLabel = document.getElementById('cmos-page-label');
  const prevBtn = document.getElementById('cmos-page-prev') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('cmos-page-next') as HTMLButtonElement | null;
  const firstBtn = document.getElementById('cmos-page-first') as HTMLButtonElement | null;
  const lastBtn = document.getElementById('cmos-page-last') as HTMLButtonElement | null;
  const helpBox = document.getElementById('cmos-item-help-box');
  const stdPanel = document.getElementById('cmos-standard-panel');

  if (!catListEl || !rowsEl) return;

  updateBiosTelemetryStrip();

  // Show classic 9 standard settings panel on Main tab when not searching
  if (stdPanel) {
    stdPanel.style.display =
      activeCategoryId === 'main' && biosFilterMode === 'all' && !biosSearchQuery.trim()
        ? 'grid'
        : 'none';
  }

  // Render Category Sidebar with per-category active count
  const activeIds = Object.keys(activatedBiosFeatures);
  const catalog = getBiosFeatureCatalog();
  const catActiveCounts = new Map<string, number>();
  for (const id of activeIds) {
    const idx = parseInt(id.replace('BIOS-', ''), 10) - 1;
    const item = catalog[idx];
    if (item) {
      catActiveCounts.set(item.categoryId, (catActiveCounts.get(item.categoryId) || 0) + 1);
    }
  }

  catListEl.innerHTML = '';
  BIOS_CATEGORIES.forEach((cat) => {
    const actInCat = catActiveCounts.get(cat.id) || 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `cmos-cat-btn${cat.id === activeCategoryId && !biosSearchQuery.trim() && biosFilterMode === 'all' ? ' active' : ''}`;
    btn.innerHTML = `
      <span class="cmos-cat-name">${cat.icon} ${cat.label}</span>
      <span class="cmos-cat-count tabular-nums ${actInCat > 0 ? 'has-active' : ''}">${actInCat}/${cat.count}</span>
    `;
    btn.addEventListener('click', () => {
      uiCallbacks.onPlayClick?.();
      activeCategoryId = cat.id;
      biosFilterMode = 'all';
      biosSearchQuery = '';
      const searchIn = document.getElementById('cmos-5000-search') as HTMLInputElement | null;
      if (searchIn) searchIn.value = '';
      document.querySelectorAll('.cmos-filter-pill').forEach((p) => {
        p.classList.toggle('active', (p as HTMLElement).dataset.filter === 'all');
      });
      biosPage = 1;
      renderCmos5000Browser();
    });
    catListEl.appendChild(btn);
  });

  // Paginate filtered features
  const filtered = getFilteredBiosFeatures();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (biosPage > totalPages) biosPage = totalPages;
  if (biosPage < 1) biosPage = 1;

  const startIdx = (biosPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  if (pageLabel) {
    const endIdx = Math.min(filtered.length, startIdx + PAGE_SIZE);
    pageLabel.textContent =
      filtered.length === 0
        ? '0 matching registers'
        : `Page ${biosPage} / ${totalPages} · Showing ${startIdx + 1}–${endIdx} of ${filtered.length.toLocaleString()} registers`;
  }
  if (firstBtn) firstBtn.disabled = biosPage <= 1;
  if (prevBtn) prevBtn.disabled = biosPage <= 1;
  if (nextBtn) nextBtn.disabled = biosPage >= totalPages;
  if (lastBtn) lastBtn.disabled = biosPage >= totalPages;

  rowsEl.innerHTML = '';
  if (pageItems.length === 0) {
    const emptyTr = document.createElement('tr');
    emptyTr.innerHTML = `<td colspan="5" class="cmos-empty-row">No matching BIOS registers. ${biosFilterMode === 'active' ? 'No features are activated yet — switch to "All 5,120", click "Activate ALL 5,120", or check individual features inside BIOS!' : 'Try another search keyword.'}</td>`;
    rowsEl.appendChild(emptyTr);
  } else {
    const frag = document.createDocumentFragment();
    pageItems.forEach((feat) => {
      const val = getBiosFeatureValue(feat.id, feat.defaultValue);
      const isActive = isBiosFeatureActivated(feat.id);
      const isChecked = selectedBiosIds.has(feat.id);

      const tr = document.createElement('tr');
      tr.className = `cmos-feat-row${isActive ? ' is-activated' : ''}${feat.id === selectedBiosFeatureId ? ' is-selected' : ''}${isChecked ? ' is-checked' : ''}`;
      tr.dataset.featId = feat.id;

      const tdChk = document.createElement('td');
      tdChk.className = 'cmos-td-chk';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'cmos-row-chk';
      chk.checked = isChecked;
      chk.dataset.featId = feat.id;
      chk.title = `Select ${feat.id}`;
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', () => {
        uiCallbacks.onPlayClick?.();
        if (chk.checked) selectedBiosIds.add(feat.id);
        else selectedBiosIds.delete(feat.id);
        tr.classList.toggle('is-checked', chk.checked);
        syncBiosSelectionUI(pageItems);
      });
      tdChk.appendChild(chk);

      const tdAddr = document.createElement('td');
      tdAddr.className = 'cmos-td-addr tabular-nums';
      tdAddr.textContent = `${feat.hexAddr} · ${feat.id}`;

      const tdName = document.createElement('td');
      tdName.className = 'cmos-td-name';
      const badgeHtml = feat.liveEffect
        ? `<span class="cmos-live-badge">⚡ ${feat.effectBadge || 'LIVE'}</span>`
        : '';
      const activeBadge = isActive
        ? `<span class="cmos-active-pill">ACTIVATED</span>`
        : '';
      tdName.innerHTML = `<span class="cmos-feat-title">${feat.name}</span> ${badgeHtml} ${activeBadge}`;

      const tdSub = document.createElement('td');
      tdSub.className = 'cmos-td-sub';
      tdSub.textContent = feat.subsystem;

      const tdCtrl = document.createElement('td');
      tdCtrl.className = 'cmos-td-ctrl';
      const select = document.createElement('select');
      select.className = `cmos-reg-select${isActive ? ' active' : ''}`;
      select.dataset.featId = feat.id;
      feat.options.forEach((optLabel) => {
        const opt = document.createElement('option');
        opt.value = optLabel;
        opt.textContent = optLabel === feat.defaultValue ? `${optLabel} (Inactive)` : optLabel;
        if (optLabel === val) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener('change', (e) => {
        e.stopPropagation();
        uiCallbacks.onPlayClick?.();
        const nextVal = select.value;
        setBiosFeatureValue(feat.id, nextVal, feat.defaultValue);
        selectedBiosFeatureId = feat.id;
        applyBios5000EffectsToOS();
        uiCallbacks.onFeatureChanged?.();
        if (getActivatedBiosCount() >= 1) {
          uiCallbacks.onUnlockTrophy?.('bios_tinkerer');
        }
        renderCmos5000Browser();
      });

      tdCtrl.appendChild(select);
      tr.appendChild(tdChk);
      tr.appendChild(tdAddr);
      tr.appendChild(tdName);
      tr.appendChild(tdSub);
      tr.appendChild(tdCtrl);

      tr.addEventListener('click', () => {
        selectedBiosFeatureId = feat.id;
        rowsEl.querySelectorAll('.cmos-feat-row').forEach((r) => r.classList.remove('is-selected'));
        tr.classList.add('is-selected');
        updateHelpBox(feat);
      });

      frag.appendChild(tr);
    });
    rowsEl.appendChild(frag);
  }

  syncBiosSelectionUI(pageItems);

  const selFeat =
    pageItems.find((f) => f.id === selectedBiosFeatureId) ||
    pageItems[0] ||
    getBiosFeatureCatalog()[0];
  if (selFeat && helpBox) {
    updateHelpBox(selFeat);
  }

  function updateHelpBox(feat: BiosFeatureDef): void {
    if (!helpBox) return;
    const val = getBiosFeatureValue(feat.id, feat.defaultValue);
    const active = isBiosFeatureActivated(feat.id);
    helpBox.innerHTML = `
      <div class="cmos-help-top">
        <b>[${feat.id} · ${feat.hexAddr}] ${feat.name}</b>
        <span class="cmos-help-state ${active ? 'on' : 'off'}">${active ? `ACTIVATED: ${val}` : 'INACTIVE (DEFAULT)'}</span>
      </div>
      <div>${feat.description}</div>
    `;
  }
}

export function initCmos5000Listeners(): void {
  const searchIn = document.getElementById('cmos-5000-search') as HTMLInputElement | null;
  searchIn?.addEventListener('input', () => {
    biosSearchQuery = searchIn.value;
    biosPage = 1;
    renderCmos5000Browser();
  });

  document.querySelectorAll('.cmos-filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      uiCallbacks.onPlayClick?.();
      const mode = ((btn as HTMLElement).dataset.filter as 'all' | 'active' | 'live') || 'all';
      biosFilterMode = mode;
      biosPage = 1;
      document.querySelectorAll('.cmos-filter-pill').forEach((p) => {
        p.classList.toggle('active', p === btn);
      });
      renderCmos5000Browser();
    });
  });

  // Bulk Select / Activate / Deactivate Controls
  const triggerActivateAll = () => {
    uiCallbacks.onPlayClick?.();
    activateAllBios5000Features();
    applyBios5000EffectsToOS();
    uiCallbacks.onFeatureChanged?.();
    uiCallbacks.onUnlockTrophy?.('bios_tinkerer');
    renderCmos5000Browser();
  };

  const triggerDeactivateAll = () => {
    uiCallbacks.onPlayClick?.();
    resetAllBios5000ToDefaults();
    applyBios5000EffectsToOS();
    uiCallbacks.onFeatureChanged?.();
    renderCmos5000Browser();
  };

  document.getElementById('cmos-select-page-chk')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    const filtered = getFilteredBiosFeatures();
    const startIdx = (biosPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
    pageItems.forEach((f) => {
      if (checked) selectedBiosIds.add(f.id);
      else selectedBiosIds.delete(f.id);
    });
    renderCmos5000Browser();
  });

  document.getElementById('cmos-select-filtered-btn')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    getFilteredBiosFeatures().forEach((f) => selectedBiosIds.add(f.id));
    renderCmos5000Browser();
  });

  document.getElementById('cmos-select-all-5120-btn')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    getBiosFeatureCatalog().forEach((f) => selectedBiosIds.add(f.id));
    renderCmos5000Browser();
  });

  document.getElementById('cmos-clear-selection-btn')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    selectedBiosIds.clear();
    renderCmos5000Browser();
  });

  document.getElementById('cmos-activate-selected-btn')?.addEventListener('click', () => {
    if (selectedBiosIds.size === 0) return;
    uiCallbacks.onPlayClick?.();
    activateBiosFeaturesBatch(selectedBiosIds);
    applyBios5000EffectsToOS();
    uiCallbacks.onFeatureChanged?.();
    if (getActivatedBiosCount() >= 1) {
      uiCallbacks.onUnlockTrophy?.('bios_tinkerer');
    }
    renderCmos5000Browser();
  });

  document.getElementById('cmos-deactivate-selected-btn')?.addEventListener('click', () => {
    if (selectedBiosIds.size === 0) return;
    uiCallbacks.onPlayClick?.();
    deactivateBiosFeaturesBatch(selectedBiosIds);
    applyBios5000EffectsToOS();
    uiCallbacks.onFeatureChanged?.();
    renderCmos5000Browser();
  });

  document.getElementById('cmos-activate-all-btn')?.addEventListener('click', triggerActivateAll);
  document.getElementById('cmos-footer-activate-all-btn')?.addEventListener('click', triggerActivateAll);
  document.getElementById('cmos-deactivate-all-btn')?.addEventListener('click', triggerDeactivateAll);

  document.getElementById('cmos-page-first')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    biosPage = 1;
    renderCmos5000Browser();
  });
  document.getElementById('cmos-page-prev')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    biosPage = Math.max(1, biosPage - 1);
    renderCmos5000Browser();
  });
  document.getElementById('cmos-page-next')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    biosPage++;
    renderCmos5000Browser();
  });
  document.getElementById('cmos-page-last')?.addEventListener('click', () => {
    uiCallbacks.onPlayClick?.();
    const total = Math.max(1, Math.ceil(getFilteredBiosFeatures().length / PAGE_SIZE));
    biosPage = total;
    renderCmos5000Browser();
  });
}
