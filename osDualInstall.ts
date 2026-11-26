/**
 * Dual-Path Installation Architecture for Gemini 95:
 *  - METHOD 1 (.EXE Setup Files & Portable Desktop App):
 *      • Drop standalone *_SETUP.EXE installers into C:\Downloads (or D:\Installers / C:\)
 *      • Win32 Self-Extracting Cabinet (SFX / MZ 0x5A4D PE Header) verifier & runner
 *      • 1995 Tucows / WinSite Shareware .EXE Download Depot for the Web Browser
 *      • Real PC Portable App Exporter (.HTML self-contained OS launcher + .BAT chromeless app script)
 *  - METHOD 2 (Physical Operating System Install — Inside OS + Real Device):
 *      • MS-DOS FDISK.EXE Fixed Disk Setup Program (Primary C:, Logical D:, Active Boot Flag, MBR, FORMAT C: /S)
 *      • Real binary ISO-9660 + El Torito x86 Bootable CD-ROM Image Builder (GEMINI95_BOOTCD.ISO)
 *      • Native Progressive Web App (PWA) Standalone OS Installer, Service Worker Offline Mode, iOS Guide & Fullscreen Lock
 */

import { registerSW } from 'virtual:pwa-register';
import {
  DEFAULT_PARTITION_TABLE,
  loadPartitionTable,
  PartitionTableState,
  savePartitionTable,
  SoftwarePackage,
} from './osSystemCore';
import { logHardwareEvent, logVfsEvent } from './osSystemLogs';
import {
  applySystemRegistryToOS,
  getOsBridge,
  openInstallShieldWizard,
  openOsReinstallScreen,
  packageCatalog,
  renderAbilityToInstallUI,
  renderMasterSettingsCurrentTab,
  systemRegistry,
} from './osExtendedApps';

export let partitionTable: PartitionTableState = loadPartitionTable();

export function syncPartitionTableWithRegistry(): void {
  partitionTable.primaryC.fileSystem = systemRegistry.fileSystemFormat;
  partitionTable.logicalD.fileSystem = systemRegistry.fileSystemFormat;
  if (!systemRegistry.enableSecondaryDriveD) {
    // Keep partition metadata on disk, Explorer checks both partitionTable.logicalD.exists && enableSecondaryDriveD
  }
  savePartitionTable(partitionTable);
}

export function isPrimaryBootable(): boolean {
  if (!systemRegistry.strictMbrBootCheck) return true;
  return (
    partitionTable.mbrSignatureValid &&
    partitionTable.primaryC.exists &&
    partitionTable.primaryC.active &&
    partitionTable.primaryC.formatted
  );
}

export function repairBootablePrimaryPartition(): void {
  partitionTable = {
    totalDiskMB: DEFAULT_PARTITION_TABLE.totalDiskMB,
    mbrSignatureValid: true,
    primaryC: {
      ...DEFAULT_PARTITION_TABLE.primaryC,
      sizeMB: Math.min(1995, Math.max(400, systemRegistry.primaryPartitionSizeMB || 1495)),
      fileSystem: systemRegistry.fileSystemFormat,
      exists: true,
      active: true,
      formatted: true,
    },
    logicalD: {
      ...DEFAULT_PARTITION_TABLE.logicalD,
      sizeMB: Math.max(0, 1995 - Math.min(1995, Math.max(400, systemRegistry.primaryPartitionSizeMB || 1495))),
      exists: 1995 - (systemRegistry.primaryPartitionSizeMB || 1495) >= 50,
      formatted: true,
      fileSystem: systemRegistry.fileSystemFormat,
    },
  };
  savePartitionTable(partitionTable);
}

// ==================== METHOD 1: .EXE FILE DROPPER, SFX VERIFIER & SHAREWARE DEPOT ====================

export function ensureDownloadFolderExists(targetDir: string): void {
  const bridge = getOsBridge();
  if (!bridge) return;
  const files = bridge.getVfsFiles();

  if (targetDir === 'C:\\Downloads') {
    const hasFolder = files.some((f) => f.type === 'folder' && f.parent === 'C:\\' && f.name === 'Downloads');
    if (!hasFolder) {
      bridge.addVfsFile('Downloads', 'folder', 'C:\\');
    }
  } else if (targetDir === 'D:\\Installers') {
    const hasFolder = files.some((f) => f.type === 'folder' && f.parent === 'D:\\' && f.name === 'Installers');
    if (!hasFolder) {
      bridge.addVfsFile('Installers', 'folder', 'D:\\');
    }
  }
}

export function dropSetupExeToVfs(pkgIdOrOs: string, customFolder?: string): { fileName: string; folder: string } | null {
  const bridge = getOsBridge();
  if (!bridge) return null;

  let folder = customFolder || systemRegistry.defaultExeDownloadDir || 'C:\\Downloads';
  if (folder.startsWith('D:\\') && (!partitionTable.logicalD.exists || !partitionTable.logicalD.formatted || !systemRegistry.enableSecondaryDriveD)) {
    folder = 'C:\\Downloads';
  }
  ensureDownloadFolderExists(folder);

  let fileName = 'ANGELOS_OS_SETUP.EXE';
  let pkgRef: SoftwarePackage | undefined;
  let sizeMB = 68.4;

  if (pkgIdOrOs !== 'os_setup') {
    pkgRef = packageCatalog.find((p) => p.pkgId === pkgIdOrOs);
    if (!pkgRef) return null;
    fileName = pkgRef.setupExeFileName || `${pkgRef.exeName.replace(/\.EXE$/i, '')}_SETUP.EXE`;
    sizeMB = pkgRef.sizeMB;
  }

  const existing = bridge.getVfsFiles().find((f) => f.parent === folder && f.name.toUpperCase() === fileName.toUpperCase());
  if (!existing) {
    bridge.addVfsFile(
      fileName,
      'installer_exe',
      folder,
      `MZ\x90\x00PE\x00\x00 Win32 Self-Extracting Setup Archive (${sizeMB.toFixed(1)} MB) — ${pkgRef ? pkgRef.name : 'Angel OS Full Operating System Setup'}`,
      undefined,
      pkgIdOrOs,
      sizeMB,
    );
  }

  bridge.sfx.playFloppySeek();
  bridge.refreshExplorerIfOpen();
  renderAbilityToInstallUI();

  return { fileName, folder };
}

let sfxExtractTimer: number | null = null;

export function executeVfsSetupExe(fileName: string, pkgId?: string, parentFolder?: string): void {
  const bridge = getOsBridge();
  if (!bridge) return;

  const upper = fileName.toUpperCase();
  const isOsSetup =
    pkgId === 'os_setup' || upper === 'ANGELOS_OS_SETUP.EXE' || upper === 'GEMINI95_OS_SETUP.EXE' || upper === 'SETUP.EXE';

  let matchedPkg = pkgId && pkgId !== 'os_setup' ? packageCatalog.find((p) => p.pkgId === pkgId) : undefined;
  if (!matchedPkg && !isOsSetup) {
    matchedPkg = packageCatalog.find(
      (p) =>
        p.setupExeFileName.toUpperCase() === upper ||
        p.exeName.toUpperCase() === upper,
    );
  }

  const cleanupExeIfPolicyEnabled = () => {
    if (systemRegistry.autoDeleteExeAfterInstall && parentFolder) {
      bridge.removeVfsFile(fileName, parentFolder);
      bridge.refreshExplorerIfOpen();
      renderAbilityToInstallUI();
    }
  };

  const launchTargetInstaller = () => {
    cleanupExeIfPolicyEnabled();
    if (isOsSetup) {
      openOsReinstallScreen();
      return;
    }
    if (matchedPkg) {
      openInstallShieldWizard(matchedPkg, matchedPkg.installed ? 'reinstall' : 'install');
      return;
    }
    bridge.showOsDialog(`Win32 PE Loader: Could not locate embedded cabinet manifest inside ${fileName}.`, 'MZ Loader Error');
  };

  // If SFX prompt is disabled in Master Settings / Registry, launch immediately
  if (!systemRegistry.sfxVerifyPrompt) {
    launchTargetInstaller();
    return;
  }

  const modal = document.getElementById('sfx-exe-modal');
  const titleEl = document.getElementById('sfx-modal-title');
  const fileEl = document.getElementById('sfx-exe-filename');
  const pubEl = document.getElementById('sfx-exe-publisher');
  const sizeEl = document.getElementById('sfx-exe-size');
  const pathEl = document.getElementById('sfx-exe-path');
  const barWrap = document.getElementById('sfx-extract-progress-wrap');
  const barFill = document.getElementById('sfx-extract-bar') as HTMLDivElement | null;
  const statusTxt = document.getElementById('sfx-extract-status');
  const runBtn = document.getElementById('sfx-run-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('sfx-cancel-btn') as HTMLButtonElement | null;
  const closeBtn = document.getElementById('sfx-close-btn') as HTMLButtonElement | null;

  if (!modal || !runBtn || !cancelBtn) {
    launchTargetInstaller();
    return;
  }

  if (sfxExtractTimer) {
    clearInterval(sfxExtractTimer);
    sfxExtractTimer = null;
  }

  bridge.sfx.playWindowOpen();

  const displaySizeMB = isOsSetup ? 68.4 : matchedPkg ? matchedPkg.sizeMB : 4.2;
  const displayBytes = Math.round(displaySizeMB * 1048576).toLocaleString();
  const displayPublisher = isOsSetup
    ? 'Angel OS Systems, Inc. (Signed OS Media)'
    : matchedPkg
      ? matchedPkg.publisher
      : 'Shareware Win32 Self-Extractor';

  if (titleEl) titleEl.textContent = `Win32 Self-Extracting Executable — ${fileName}`;
  if (fileEl) fileEl.textContent = `${parentFolder ? parentFolder + (parentFolder.endsWith('\\') ? '' : '\\') : 'C:\\Downloads\\'}${fileName}`;
  if (pubEl) pubEl.textContent = displayPublisher;
  if (sizeEl) sizeEl.textContent = `${displaySizeMB.toFixed(1)} MB (${displayBytes} bytes) · MZ 0x5A4D / PE32`;
  if (pathEl) pathEl.textContent = `C:\\WINDOWS\\TEMP\\_ISTMP0.DIR\\`;
  if (barWrap) barWrap.style.display = 'none';
  if (barFill) barFill.style.width = '0%';
  runBtn.disabled = false;
  cancelBtn.disabled = false;

  modal.style.display = 'flex';

  const closeModal = () => {
    if (sfxExtractTimer) {
      clearInterval(sfxExtractTimer);
      sfxExtractTimer = null;
    }
    modal.style.display = 'none';
  };

  runBtn.onclick = () => {
    bridge.sfx.playClick();
    runBtn.disabled = true;
    cancelBtn.disabled = true;
    if (barWrap) barWrap.style.display = 'block';
    let pct = 0;
    sfxExtractTimer = window.setInterval(() => {
      pct = Math.min(100, pct + 25);
      if (barFill) barFill.style.width = `${pct}%`;
      if (statusTxt) statusTxt.textContent = `Unpacking LZX Cabinet Stream (${pct}%)...`;
      bridge.sfx.playFloppySeek();
      if (pct >= 100) {
        closeModal();
        launchTargetInstaller();
      }
    }, 110);
  };

  cancelBtn.onclick = () => {
    bridge.sfx.playClick();
    closeModal();
  };
  if (closeBtn) closeBtn.onclick = closeModal;
}

export function buildSharewareDepotHtml(): string {
  const rowsHtml = packageCatalog
    .map(
      (pkg) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #999;">
          <b style="color:#000080;font-size:13px;">${pkg.iconHtml} ${pkg.name}</b><br/>
          <span style="font-size:11px;color:#333;">${pkg.description}</span>
        </td>
        <td style="padding:6px;border-bottom:1px solid #999;font-family:monospace;font-size:11px;white-space:nowrap;">
          <b>${pkg.setupExeFileName}</b><br/>
          v${pkg.version} · ${pkg.sizeMB.toFixed(1)} MB
        </td>
        <td style="padding:6px;border-bottom:1px solid #999;text-align:center;">
          🐄🐄🐄🐄🐄<br/><span style="font-size:10px;color:#006600;font-weight:bold;">5 Cows!</span>
        </td>
        <td style="padding:6px;border-bottom:1px solid #999;text-align:right;white-space:nowrap;">
          <button onclick="dlExe('${pkg.pkgId}', false)" style="background:#c0c0c0;border:2px outset #fff;padding:3px 7px;font-weight:bold;font-size:11px;cursor:pointer;">📥 Save .EXE</button>
          <button onclick="dlExe('${pkg.pkgId}', true)" style="background:#ffff99;border:2px outset #fff;padding:3px 7px;font-weight:bold;font-size:11px;cursor:pointer;">▶ Run .EXE</button>
        </td>
      </tr>
    `,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>TUCOWS 95 — Win32 .EXE Shareware & Browser Mirror</title>
<style>
  body { background:#ffffff; color:#000000; font-family:'MS Sans Serif', Tahoma, sans-serif; margin:0; padding:0; }
  .hdr { background:#000080; color:#ffff55; padding:10px 14px; border-bottom:4px solid #ffcc00; display:flex; justify-content:space-between; align-items:center; }
  .sub { background:#e8eef7; padding:6px 14px; font-size:12px; border-bottom:1px solid #99b; display:flex; justify-content:space-between; align-items:center; }
  .wrap { padding:12px 14px; }
  .os-box { background:#ffffdd; border:2px outset #ccc; padding:10px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
  table { width:100%; border-collapse:collapse; background:#f8f8f8; border:2px inset #ccc; }
  th { background:#000080; color:#fff; font-size:11px; text-align:left; padding:5px 6px; }
  #dl-banner { display:none; background:#004400; color:#86efac; font-family:monospace; font-size:12px; padding:7px 12px; margin-bottom:10px; border:2px inset #808080; }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <div style="font-size:18px;font-weight:bold;">🐄 TUCOWS '95 — THE ULTIMATE .EXE SHAREWARE DEPOT</div>
      <div style="font-size:11px;color:#ffffff;">Direct Win32 Self-Extracting (.EXE) Mirror · Saves straight to C:\\Downloads!</div>
    </div>
    <div style="font-family:monospace;font-size:11px;text-align:right;color:#00ffff;">
      FTP MIRROR #01<br/>REDMOND, WA
    </div>
  </div>
  <div class="sub">
    <span><b>Tip:</b> Click <b>📥 Save .EXE</b> to drop the setup file into <code>C:\\Downloads</code> (openable in My AngelTop or MS-DOS), or <b>▶ Run .EXE</b> to extract immediately!</span>
  </div>
  <div class="wrap">
    <div id="dl-banner"></div>
    <div class="os-box" style="background:#e8f4ff;border-color:#0b57d0;">
      <div>
        <b style="font-size:13px;color:#0b57d0;">🌐 Google Chrome (v131.0.6778) — Downloaded &amp; Installed Default Browser</b><br/>
        <span style="font-size:11px;color:#1e293b;">Installer cached at <code>C:\\Downloads\\CHROME_SETUP.EXE</code> (24.5 MB) · Pinned to left Taskbar &amp; Windows 11 Start Menu.</span>
      </div>
      <div style="white-space:nowrap;">
        <span style="background:#dcfce7;color:#166534;border:1px solid #16a34a;padding:3px 8px;font-size:11px;font-weight:bold;border-radius:4px;">✓ Downloaded &amp; Installed</span>
      </div>
    </div>
    <div class="os-box">
      <div>
        <b style="font-size:13px;color:#800000;">💿 ANGELOS_OS_SETUP.EXE — Full Standalone OS Recovery &amp; Upgrade Package (68.4 MB)</b><br/>
        <span style="font-size:11px;">Complete self-extracting Win95 Operating System installer executable. Can repair C:\\ or clean-reinstall the OS.</span>
      </div>
      <div style="white-space:nowrap;">
        <button onclick="dlExe('os_setup', false)" style="background:#c0c0c0;border:2px outset #fff;padding:4px 8px;font-weight:bold;font-size:11px;cursor:pointer;">📥 Save OS .EXE</button>
        <button onclick="dlExe('os_setup', true)" style="background:#ffcc66;border:2px outset #fff;padding:4px 8px;font-weight:bold;font-size:11px;cursor:pointer;">▶ Run OS .EXE</button>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Software Package</th>
          <th>Executable (.EXE)</th>
          <th style="text-align:center;">Rating</th>
          <th style="text-align:right;">Download to C:\\</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  </div>
  <script>
    function dlExe(pkgId, runImmediately) {
      var b = document.getElementById('dl-banner');
      if (b) {
        b.style.display = 'block';
        b.textContent = '>> Transferring binary stream for ' + pkgId.toUpperCase() + ' to C:\\\\Downloads... Done!';
      }
      window.parent.postMessage({ __gemini95DownloadExe: true, pkgId: pkgId, runNow: !!runImmediately }, '*');
    }
  </script>
</body>
</html>`;
}

// --- Download Portable Desktop App onto Real Host Computer (.HTML or .BAT) ---
function triggerBrowserBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function downloadPortableHostApp(format: 'html' | 'bat'): void {
  const bridge = getOsBridge();
  bridge?.sfx.playFloppySeek();
  const appOrigin = window.location.origin;

  if (format === 'bat') {
    const batLines = [
      '@ECHO OFF',
      'TITLE AngelOS-web Portable Desktop OS Launcher',
      'ECHO ========================================================',
      'ECHO   LAUNCHING ANGELOS-WEB IN NATIVE CHROMELESS DESKTOP MODE',
      'ECHO ========================================================',
      `SET TARGET_URL=${appOrigin}`,
      'IF EXIST "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (',
      '  START "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%TARGET_URL%" --start-maximized',
      '  EXIT /B 0',
      ')',
      'IF EXIST "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (',
      '  START "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%TARGET_URL%" --start-maximized',
      '  EXIT /B 0',
      ')',
      'START "" "%TARGET_URL%"',
    ].join('\r\n');
    const blob = new Blob([batLines], { type: 'application/x-bat;charset=utf-8' });
    triggerBrowserBlobDownload(blob, 'AngelOS-web_Portable_Launcher.bat');
    bridge?.showOsDialog(
      'Downloaded "AngelOS-web_Portable_Launcher.bat" to your real computer! Double-clicking it on Windows launches AngelOS-web in a chromeless native Win32 desktop window.',
      'Portable .BAT Launcher Saved',
    );
    return;
  }

  // Self-contained Portable .HTML Desktop App carrying the user's live Registry & Partition Snapshot
  const snapshotJson = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      systemRegistry,
      partitionTable,
      installedPackages: packageCatalog.filter((p) => p.installed).map((p) => p.pkgId),
    },
    null,
    2,
  );

  const safeJson = snapshotJson.replace(/<\//g, '<\\/');
  const portableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AngelOS-web — Portable Desktop Edition</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#008080; font-family:'Segoe UI', Tahoma, sans-serif; overflow:hidden; display:flex; flex-direction:column; }
    .portable-bar { background:#c0c0c0; border-bottom:2px solid #000; padding:4px 10px; display:flex; align-items:center; justify-content:space-between; font-size:12px; }
    .btn95 { background:#c0c0c0; border-top:2px solid #fff; border-left:2px solid #fff; border-right:2px solid #000; border-bottom:2px solid #000; padding:3px 10px; font-weight:bold; font-size:11px; cursor:pointer; }
    iframe { flex:1; width:100%; border:0; background:#000; }
    .modal { display:none; position:fixed; inset:40px auto auto 50%; transform:translateX(-50%); width:520px; max-width:92vw; background:#c0c0c0; border:2px outset #fff; box-shadow:5px 5px 0 #000; padding:12px; z-index:99; }
    textarea { width:100%; height:150px; font-family:monospace; font-size:11px; box-sizing:border-box; }
  </style>
</head>
<body>
  <div class="portable-bar">
    <div><b>💾 AngelOS-web Portable Desktop Container</b> · Bound Host: <code>${appOrigin}</code></div>
    <div style="display:flex;gap:6px;">
      <button class="btn95" onclick="document.documentElement.requestFullscreen && document.documentElement.requestFullscreen()">⛶ Fullscreen Hardware Lock</button>
      <button class="btn95" onclick="toggleSnap()">📋 Embedded Registry Snapshot</button>
    </div>
  </div>
  <iframe src="${appOrigin}" allow="autoplay; fullscreen; clipboard-write"></iframe>
  <div class="modal" id="snap-modal">
    <div style="background:#000080;color:#fff;font-weight:bold;padding:4px 8px;margin-bottom:8px;">Exported AngelOS-web Registry &amp; Disk Snapshot</div>
    <p style="font-size:12px;margin:4px 0;">Copy this JSON into <b>Master Settings → Tab 7 (Install &amp; OS Setup)</b> anytime to restore this exact hardware/theme profile:</p>
    <textarea readonly>${safeJson}</textarea>
    <div style="text-align:right;margin-top:8px;"><button class="btn95" onclick="toggleSnap()">Close</button></div>
  </div>
  <script>
    function toggleSnap() {
      var m = document.getElementById('snap-modal');
      m.style.display = m.style.display === 'block' ? 'none' : 'block';
    }
  </script>
</body>
</html>`;

  const blob = new Blob([portableHtml], { type: 'text/html;charset=utf-8' });
  triggerBrowserBlobDownload(blob, 'AngelOS-web_Portable_App.html');
  bridge?.showOsDialog(
    'Downloaded "AngelOS-web_Portable_App.html" to your computer! Open it from your Desktop anytime for an instant portable AngelOS-web container with your embedded Registry snapshot.',
    'Portable App Downloaded',
  );
}

// ==================== METHOD 2A: MS-DOS FDISK.EXE FIXED DISK PARTITIONER & INTERACTIVE GUIDE ====================

let fdiskFormatInterval: number | null = null;

interface FdiskGuideStepSpec {
  stepNumber: number;
  shortTabLabel: string;
  kicker: string;
  title: string;
  description: string;
  calloutInstruction: string;
  targetIds: string[];
  boxId: string;
  isComplete: () => boolean;
  buildAsciiDiagram: () => string;
}

const fdiskGuideState = {
  isOpen: false,
  currentStepIndex: 0,
  autoAdvance: true,
};

const FDISK_GUIDE_STEPS: FdiskGuideStepSpec[] = [
  {
    stepNumber: 1,
    shortTabLabel: '1.Pri C:',
    kicker: 'STEP 1 OF 5 · PRIMARY DOS PARTITION (C:\\)',
    title: '1. Allocate Primary DOS Partition (Drive C:\\)',
    description:
      'Every MS-DOS / Windows 95 hard drive starts as raw unallocated cylinders (968 Cyl, 1,995 MB total). To install an operating system, you must first carve out a Primary DOS Partition (Drive C:\\). Leaving ~500 MB unallocated (by setting C: to 1,495 MB) lets you create a secondary D:\\ archive drive in Step 3.',
    calloutInstruction:
      '► ACTION: Set Size (MB) to 1495 (or any size 400–1995 MB) and click the highlighted "[1] Create / Resize C:" button below (or press "⚡ Auto-Run This Step").',
    targetIds: ['fdisk-c-size-input', 'fdisk-create-c-btn'],
    boxId: 'fdisk-box-primary',
    isComplete: () => partitionTable.primaryC.exists,
    buildAsciiDiagram: () => {
      const cMB = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : 0;
      const freeMB = Math.max(0, 1995 - cMB - (partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB : 0));
      return [
        '┌────────────── IDE FIXED DISK 0 (968 CYL) ──────────────┐',
        cMB > 0
          ? `│ [C: PRI DOS ${String(cMB).padStart(4)} MB]  [UNALLOCATED: ${String(freeMB).padStart(4)} MB] │`
          : '│ [░░░░░░░░░░ 1,995 MB UNALLOCATED CYLINDERS ░░░░░░░░░░] │',
        '└────────────────────────────────────────────────────────┘',
        `Cyl 0..${cMB > 0 ? Math.round((cMB / 1995) * 968) : 0}: ${cMB > 0 ? 'Allocated to Primary C:\\' : 'Waiting for Partition 1'}`,
      ].join('\n');
    },
  },
  {
    stepNumber: 2,
    shortTabLabel: '2.Active',
    kicker: 'STEP 2 OF 5 · BIOS BOOTABLE FLAG (0x80)',
    title: '2. Mark Primary Partition C:\\ as Active (A)',
    description:
      'When your PC powers on, the Award BIOS reads the 64-byte partition table in Sector 1 and searches for the single partition marked with boot flag 0x80 ("A" = Active). If no partition is marked Active, the BIOS halts with "Missing operating system".',
    calloutInstruction:
      '► ACTION: Ensure Partition 1 (C:) displays "A (Active)" in the table below. Click "[2] Toggle Active (A)" or press "⚡ Auto-Run This Step" to set C:\\ Active.',
    targetIds: ['fdisk-toggle-active-btn'],
    boxId: 'fdisk-box-primary',
    isComplete: () => partitionTable.primaryC.exists && partitionTable.primaryC.active,
    buildAsciiDiagram: () => {
      const isAct = partitionTable.primaryC.exists && partitionTable.primaryC.active;
      return [
        '┌─────────── MBR PARTITION TABLE (OFFSET 0x1BE) ─────────┐',
        `│ Entry 1 (C:) │ Boot Flag: ${isAct ? '0x80 [A = ACTIVE]  ' : '0x00 [— = INACTIVE]'} │`,
        '│ Entry 2 (D:) │ Boot Flag: 0x00 [EXTENDED DOS]          │',
        '└────────────────────────────────────────────────────────┘',
        isAct ? '✓ INT 19h BIOS Loader will jump to C:\\ boot sector' : '⚠ WARNING: Flag 0x00 will halt BIOS boot!',
      ].join('\n');
    },
  },
  {
    stepNumber: 3,
    shortTabLabel: '3.Log D:',
    kicker: 'STEP 3 OF 5 · EXTENDED DOS LOGICAL DRIVE (D:\\)',
    title: '3. Create Extended Logical Drive D:\\ (Optional Archive)',
    description:
      'In 1995, PC builders often split a 2 GB IDE drive into C:\\ for Windows 95 system files and D:\\ (DATA_ARCHIVE) for games and `.EXE` installers so reinstalling Windows on C:\\ never wiped personal archives.',
    calloutInstruction:
      '► ACTION: Click the highlighted "[4] Create Logical D:" button below to allocate remaining free cylinders to D:\\ (or press "⚡ Auto-Run This Step").',
    targetIds: ['fdisk-create-d-btn'],
    boxId: 'fdisk-box-secondary',
    isComplete: () =>
      partitionTable.logicalD.exists ||
      (partitionTable.primaryC.exists && partitionTable.primaryC.sizeMB >= 1975),
    buildAsciiDiagram: () => {
      const cMB = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : 0;
      const dMB = partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB : 0;
      const freeMB = Math.max(0, 1995 - cMB - dMB);
      return [
        '┌────────────── EXTENDED PARTITION CONTAINER ────────────┐',
        `│ Pri C: ${String(cMB).padStart(4)}M │ Ext Logical D: ${String(dMB).padStart(4)}M │ Free: ${String(freeMB).padStart(4)}M │`,
        '└────────────────────────────────────────────────────────┘',
        dMB > 0
          ? `✓ Drive D:\\ (${dMB} MB) mounted in My AngelTop Explorer`
          : freeMB >= 25
            ? `► ${freeMB} MB unallocated cylinders ready for Drive D:\\`
            : '✓ 100% cylinders assigned to C:\\ (Single-Drive Mode)',
      ].join('\n');
    },
  },
  {
    stepNumber: 4,
    shortTabLabel: '4.MBR',
    kicker: 'STEP 4 OF 5 · MASTER BOOT RECORD (SECTOR 1)',
    title: '4. Write & Verify Master Boot Record (FDISK /MBR)',
    description:
      'Cylinder 0, Head 0, Sector 1 holds the 446-byte x86 Master Boot Record (MBR) bootstrap routine plus the 2-byte magic signature 0x55AA at offset 510. Running "FDISK /MBR" writes a clean bootstrap header so the BIOS recognizes Fixed Disk 1 as bootable.',
    calloutInstruction:
      '► ACTION: Click the highlighted "[M] Write FDISK /MBR" button below to write the 0x55AA bootstrap signature (or click "[X] Zero MBR" anytime to test a hardware boot halt).',
    targetIds: ['fdisk-mbr-btn'],
    boxId: 'fdisk-box-secondary',
    isComplete: () => partitionTable.mbrSignatureValid,
    buildAsciiDiagram: () => {
      const valid = partitionTable.mbrSignatureValid;
      return [
        '┌─────────── CYL 0 · HEAD 0 · SECTOR 1 (512B) ───────────┐',
        '│ [0x000..0x1BD] 446B x86 Real-Mode Bootstrap Code       │',
        '│ [0x1BE..0x1FD]  64B 4-Entry Partition Table            │',
        `│ [0x1FE..0x1FF]   2B Magic Signature: ${valid ? '0x55AA (VALID)  ' : '0x0000 (WIPED!) '} │`,
        '└────────────────────────────────────────────────────────┘',
      ].join('\n');
    },
  },
  {
    stepNumber: 5,
    shortTabLabel: '5.Format',
    kicker: 'STEP 5 OF 5 · HIGH-LEVEL FORMAT & SYSTEM TRACKS',
    title: '5. Format Partition C:\\ & Transfer System (FORMAT C: /S)',
    description:
      'Creating a partition only updates the partition table—the disk sectors inside C:\\ are still raw unformatted magnetic media! Running "FORMAT C: /S" writes the FAT16/FAT32 File Allocation Table and transfers IO.SYS, MSDOS.SYS, and COMMAND.COM so C:\\ can boot.',
    calloutInstruction:
      '► ACTION: Click the green "[F] FORMAT C: /S" button below to format C:\\ and transfer MS-DOS system tracks, then click "💿 Save & Launch OS Setup (SETUP.EXE)"!',
    targetIds: ['fdisk-format-c-btn', 'fdisk-launch-setup-btn'],
    boxId: 'fdisk-box-primary',
    isComplete: () =>
      partitionTable.primaryC.exists &&
      partitionTable.primaryC.formatted &&
      partitionTable.primaryC.active &&
      partitionTable.mbrSignatureValid,
    buildAsciiDiagram: () => {
      const fmt = partitionTable.primaryC.exists && partitionTable.primaryC.formatted;
      return [
        `┌─────────── DRIVE C:\\ (${systemRegistry.fileSystemFormat}) SYSTEM TRACKS ──────────┐`,
        `│ Boot Record : ${fmt ? '✓ Written (FAT Volume Boot Sector)' : '⏳ Unformatted RAW Sectors        '} │`,
        `│ System Files: ${fmt ? '✓ IO.SYS · MSDOS.SYS · COMMAND.COM' : '⏳ Waiting for FORMAT C: /S       '} │`,
        '└────────────────────────────────────────────────────────┘',
        fmt ? '★ ALL 5 STEPS COMPLETE! Disk 1 is 100% bootable.' : '► Run [F] FORMAT C: /S to complete disk setup.',
      ].join('\n');
    },
  },
];

function clearFdiskGuideSpotlights(): void {
  document.querySelectorAll('.fdisk-guide-spotlight').forEach((el) => {
    el.classList.remove('fdisk-guide-spotlight');
  });
  document.querySelectorAll('.fdisk-guide-box-active').forEach((el) => {
    el.classList.remove('fdisk-guide-box-active');
  });
}

function applyFdiskGuideSpotlights(): void {
  clearFdiskGuideSpotlights();
  if (!fdiskGuideState.isOpen) return;

  const step = FDISK_GUIDE_STEPS[fdiskGuideState.currentStepIndex] || FDISK_GUIDE_STEPS[0];
  step.targetIds.forEach((id) => {
    document.getElementById(id)?.classList.add('fdisk-guide-spotlight');
  });
  if (step.boxId) {
    document.getElementById(step.boxId)?.classList.add('fdisk-guide-box-active');
  }
}

export function renderFdiskGuide(): void {
  const panel = document.getElementById('fdisk-guide-panel');
  const toggleBtn = document.getElementById('fdisk-guide-toggle-btn');
  const stepperEl = document.getElementById('fdisk-guide-stepper');
  const kickerEl = document.getElementById('fdisk-guide-step-kicker');
  const statusEl = document.getElementById('fdisk-guide-step-status');
  const titleEl = document.getElementById('fdisk-guide-step-title');
  const descEl = document.getElementById('fdisk-guide-step-desc');
  const calloutEl = document.getElementById('fdisk-guide-callout-instruction');
  const asciiEl = document.getElementById('fdisk-guide-ascii');
  const prevBtn = document.getElementById('fdisk-guide-prev-btn') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('fdisk-guide-next-btn') as HTMLButtonElement | null;
  const autoRunBtn = document.getElementById('fdisk-guide-autorun-btn') as HTMLButtonElement | null;
  const autoAdvBtn = document.getElementById('fdisk-guide-autoadv-btn');

  if (!panel) return;

  panel.style.display = fdiskGuideState.isOpen ? 'flex' : 'none';
  toggleBtn?.classList.toggle('active', fdiskGuideState.isOpen);

  if (autoAdvBtn) {
    autoAdvBtn.textContent = fdiskGuideState.autoAdvance ? '[✓] Auto-Advance: ON' : '[ ] Auto-Advance: OFF';
  }

  if (!fdiskGuideState.isOpen) {
    clearFdiskGuideSpotlights();
    return;
  }

  const step = FDISK_GUIDE_STEPS[fdiskGuideState.currentStepIndex] || FDISK_GUIDE_STEPS[0];
  const completed = step.isComplete();

  if (stepperEl) {
    stepperEl.innerHTML = FDISK_GUIDE_STEPS.map((s, idx) => {
      const done = s.isComplete();
      const isCur = idx === fdiskGuideState.currentStepIndex;
      return `
        <button class="fdisk-guide-step-tab ${isCur ? 'active' : ''} ${done ? 'done' : ''}" data-step-idx="${idx}">
          <span>${s.shortTabLabel}</span>
          <span>${done ? '✓' : '○'}</span>
        </button>
      `;
    }).join('');

    stepperEl.querySelectorAll('.fdisk-guide-step-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        getOsBridge()?.sfx.playClick();
        const idx = Number((btn as HTMLElement).dataset.stepIdx) || 0;
        fdiskGuideState.currentStepIndex = Math.max(0, Math.min(FDISK_GUIDE_STEPS.length - 1, idx));
        renderFdiskGuide();
      });
    });
  }

  if (kickerEl) kickerEl.textContent = step.kicker;
  if (statusEl) {
    statusEl.textContent = completed ? '[✓ STEP COMPLETED]' : '[► ACTION NEEDED]';
    statusEl.className = `fdisk-guide-step-status tabular-nums ${completed ? 'done' : 'pending'}`;
  }
  if (titleEl) titleEl.textContent = step.title;
  if (descEl) descEl.textContent = step.description;
  if (calloutEl) calloutEl.textContent = step.calloutInstruction;
  if (asciiEl) asciiEl.textContent = step.buildAsciiDiagram();

  if (prevBtn) prevBtn.disabled = fdiskGuideState.currentStepIndex <= 0;
  if (nextBtn) nextBtn.disabled = fdiskGuideState.currentStepIndex >= FDISK_GUIDE_STEPS.length - 1;
  if (autoRunBtn) {
    autoRunBtn.textContent = completed
      ? `⚡ Re-Run Step ${step.stepNumber}`
      : `⚡ Auto-Run Step ${step.stepNumber}`;
  }

  applyFdiskGuideSpotlights();
}

function notifyFdiskGuideAfterAction(stepIdxTriggered: number): void {
  if (!fdiskGuideState.isOpen) return;
  if (
    fdiskGuideState.autoAdvance &&
    fdiskGuideState.currentStepIndex === stepIdxTriggered &&
    FDISK_GUIDE_STEPS[stepIdxTriggered]?.isComplete() &&
    fdiskGuideState.currentStepIndex < FDISK_GUIDE_STEPS.length - 1
  ) {
    fdiskGuideState.currentStepIndex++;
  }
  renderFdiskGuide();
}

export function toggleFdiskGuide(forceOpen?: boolean): void {
  fdiskGuideState.isOpen = typeof forceOpen === 'boolean' ? forceOpen : !fdiskGuideState.isOpen;
  if (fdiskGuideState.isOpen) {
    // Jump to the first incomplete step if any, otherwise Step 1
    const firstIncomplete = FDISK_GUIDE_STEPS.findIndex((s) => !s.isComplete());
    if (firstIncomplete !== -1) {
      fdiskGuideState.currentStepIndex = firstIncomplete;
    }
  }
  renderFdiskGuide();
}

export function openFdiskScreen(openGuide = false): void {
  const screen = document.getElementById('fdisk-screen');
  if (!screen) return;
  const bridge = getOsBridge();
  bridge?.sfx.playPostBeep();
  screen.style.display = 'flex';
  if (openGuide || !isPrimaryBootable()) {
    fdiskGuideState.isOpen = true;
    const firstIncomplete = FDISK_GUIDE_STEPS.findIndex((s) => !s.isComplete());
    fdiskGuideState.currentStepIndex = firstIncomplete !== -1 ? firstIncomplete : 0;
  }
  renderFdiskScreen();
}

export function closeFdiskScreen(): void {
  const screen = document.getElementById('fdisk-screen');
  if (fdiskFormatInterval) {
    clearInterval(fdiskFormatInterval);
    fdiskFormatInterval = null;
  }
  clearFdiskGuideSpotlights();
  if (screen) screen.style.display = 'none';
  savePartitionTable(partitionTable);
  getOsBridge()?.refreshExplorerIfOpen();
  renderAbilityToInstallUI();
  renderMasterSettingsCurrentTab();
}

export function renderFdiskScreen(): void {
  const barEl = document.getElementById('fdisk-disk-bar');
  const tbodyEl = document.getElementById('fdisk-partition-tbody');
  const mbrBadgeEl = document.getElementById('fdisk-mbr-status');
  const sizeInputEl = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;

  if (!barEl || !tbodyEl) return;

  const total = partitionTable.totalDiskMB || 1995;
  const cMB = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : 0;
  const dMB = partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB : 0;
  const freeMB = Math.max(0, total - cMB - dMB);

  const cPct = Math.round((cMB / total) * 100);
  const dPct = Math.round((dMB / total) * 100);
  const freePct = Math.max(0, 100 - cPct - dPct);

  if (sizeInputEl && document.activeElement !== sizeInputEl) {
    sizeInputEl.value = String(partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : systemRegistry.primaryPartitionSizeMB);
  }

  if (mbrBadgeEl) {
    const bootOk = isPrimaryBootable();
    mbrBadgeEl.textContent = bootOk
      ? '✓ MBR 0x55AA VALID · ACTIVE BOOT PARTITION C: READY'
      : '⚠ WARNING: SYSTEM NOT BOOTABLE (Requires MBR + Active Formatted Primary C:)';
    mbrBadgeEl.style.color = bootOk ? '#55ff55' : '#ff5555';
  }

  barEl.innerHTML = `
    ${
      cMB > 0
        ? `<div class="fdisk-seg fdisk-seg-c" style="width:${Math.max(12, cPct)}%">
             <b>C: ${partitionTable.primaryC.label}</b>
             <span>${cMB} MB · ${partitionTable.primaryC.formatted ? partitionTable.primaryC.fileSystem : 'RAW UNFORMATTED'}${partitionTable.primaryC.active ? ' [ACTIVE]' : ''}</span>
           </div>`
        : ''
    }
    ${
      dMB > 0
        ? `<div class="fdisk-seg fdisk-seg-d" style="width:${Math.max(12, dPct)}%">
             <b>D: ${partitionTable.logicalD.label}</b>
             <span>${dMB} MB · ${partitionTable.logicalD.formatted ? partitionTable.logicalD.fileSystem : 'RAW'}</span>
           </div>`
        : ''
    }
    ${
      freeMB > 0
        ? `<div class="fdisk-seg fdisk-seg-free" style="width:${Math.max(10, freePct)}%">
             <b>UNALLOCATED</b>
             <span>${freeMB} MB Free</span>
           </div>`
        : ''
    }
  `;

  const rows: string[] = [];
  if (partitionTable.primaryC.exists) {
    rows.push(`
      <tr>
        <td><b>C: 1</b></td>
        <td style="color:#ffff55;font-weight:700;">${partitionTable.primaryC.active ? 'A (Active)' : '— (Inactive)'}</td>
        <td>PRI DOS</td>
        <td>${partitionTable.primaryC.label}</td>
        <td class="tabular-nums">${cMB} MB</td>
        <td>${partitionTable.primaryC.formatted ? partitionTable.primaryC.fileSystem : 'UNKNOWN (RAW)'}</td>
        <td class="tabular-nums">${cPct}%</td>
      </tr>
    `);
  }
  if (partitionTable.logicalD.exists) {
    rows.push(`
      <tr>
        <td><b>D: 2</b></td>
        <td>—</td>
        <td>EXT / LOG DOS</td>
        <td>${partitionTable.logicalD.label}</td>
        <td class="tabular-nums">${dMB} MB</td>
        <td>${partitionTable.logicalD.formatted ? partitionTable.logicalD.fileSystem : 'UNKNOWN (RAW)'}</td>
        <td class="tabular-nums">${dPct}%</td>
      </tr>
    `);
  }
  if (rows.length === 0) {
    rows.push(`<tr><td colspan="7" style="color:#ff8888;text-align:center;padding:10px;">No partitions defined on Fixed Disk 1 (1,995 MB Unallocated). Click "[F1 / ?] Interactive FDISK Guide" above for a step-by-step walkthrough!</td></tr>`);
  }
  tbodyEl.innerHTML = rows.join('');

  renderFdiskGuide();
}

function setFdiskConsoleLog(msg: string): void {
  const logEl = document.getElementById('fdisk-console-log');
  if (logEl) logEl.textContent = msg;
}

export function initFdiskController(): void {
  const bind = (id: string, fn: () => void) => {
    document.getElementById(id)?.addEventListener('click', () => {
      getOsBridge()?.sfx.playClick();
      fn();
    });
  };

  bind('boot-fdisk-btn', () => openFdiskScreen());
  bind('os-setup-fdisk-btn', () => openFdiskScreen());
  bind('start-fdisk', () => {
    document.getElementById('start-menu')?.classList.remove('active');
    openFdiskScreen();
  });

  bind('fdisk-guide-toggle-btn', () => toggleFdiskGuide());
  bind('fdisk-footer-guide-btn', () => toggleFdiskGuide());
  bind('fdisk-guide-close-btn', () => toggleFdiskGuide(false));

  bind('fdisk-guide-autoadv-btn', () => {
    fdiskGuideState.autoAdvance = !fdiskGuideState.autoAdvance;
    renderFdiskGuide();
  });

  bind('fdisk-guide-prev-btn', () => {
    if (fdiskGuideState.currentStepIndex > 0) {
      fdiskGuideState.currentStepIndex--;
      renderFdiskGuide();
    }
  });

  bind('fdisk-guide-next-btn', () => {
    if (fdiskGuideState.currentStepIndex < FDISK_GUIDE_STEPS.length - 1) {
      fdiskGuideState.currentStepIndex++;
      renderFdiskGuide();
    }
  });

  const runCreatePrimaryC = () => {
    const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
    const requested = Math.min(1995, Math.max(400, Number(sizeIn?.value) || systemRegistry.primaryPartitionSizeMB || 1495));
    if (partitionTable.logicalD.exists && requested + partitionTable.logicalD.sizeMB > 1995) {
      partitionTable.logicalD.sizeMB = Math.max(0, 1995 - requested);
      if (partitionTable.logicalD.sizeMB < 20) partitionTable.logicalD.exists = false;
    }
    partitionTable.primaryC = {
      exists: true,
      active: true,
      formatted: false, // Authentic DOS FDISK: newly created partition starts unformatted until FORMAT C: /S or OS Setup!
      fileSystem: systemRegistry.fileSystemFormat,
      sizeMB: requested,
      label: 'ANGEL_OS',
    };
    systemRegistry.primaryPartitionSizeMB = requested;
    applySystemRegistryToOS();
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', `Created Primary DOS Partition C:\\ (${requested} MB, ${systemRegistry.fileSystemFormat}, Active)`, 'OK', '0x2030');
    renderFdiskScreen();
    setFdiskConsoleLog(`Created Primary DOS Partition C: (${requested} MB, Active). Run "FORMAT C: /S" or "Launch OS Setup" to write system tracks!`);
    notifyFdiskGuideAfterAction(0);
  };

  bind('fdisk-create-c-btn', runCreatePrimaryC);

  bind('fdisk-delete-c-btn', () => {
    getOsBridge()?.sfx.playChordError();
    partitionTable.primaryC.exists = false;
    partitionTable.primaryC.active = false;
    partitionTable.primaryC.formatted = false;
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', 'Deleted Primary DOS Partition C:\\ — drive unbootable until recreated', 'WARN', '0x2031');
    renderFdiskScreen();
    setFdiskConsoleLog('WARNING: Primary DOS Partition C: deleted! System will halt on next BIOS boot until C: is recreated and formatted.');
  });

  const runToggleActiveC = (forceActive?: boolean) => {
    if (!partitionTable.primaryC.exists) {
      setFdiskConsoleLog('Cannot set Active flag: Primary DOS Partition C: does not exist. Complete Step 1 first!');
      return;
    }
    partitionTable.primaryC.active = typeof forceActive === 'boolean' ? forceActive : !partitionTable.primaryC.active;
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', `Partition C:\\ active boot flag set to ${partitionTable.primaryC.active ? '0x80 ACTIVE' : '0x00 INACTIVE'}`, partitionTable.primaryC.active ? 'OK' : 'WARN', '0x2032');
    renderFdiskScreen();
    setFdiskConsoleLog(
      partitionTable.primaryC.active
        ? 'Partition 1 (C:) marked ACTIVE (0x80 Bootable).'
        : 'Active flag cleared on C:. BIOS MBR will report "Missing operating system" if Strict MBR Check is enabled.',
    );
    if (partitionTable.primaryC.active) {
      notifyFdiskGuideAfterAction(1);
    }
  };

  bind('fdisk-toggle-active-btn', () => runToggleActiveC());

  const runCreateLogicalD = () => {
    const usedByC = partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : 0;
    const rem = 1995 - usedByC;
    if (rem < 25) {
      setFdiskConsoleLog('No unallocated cylinders remaining! Reduce C: size (e.g. 1495 MB) and recreate C: to leave room for D:.');
      return;
    }
    partitionTable.logicalD = {
      exists: true,
      formatted: true,
      fileSystem: systemRegistry.fileSystemFormat,
      sizeMB: rem,
      label: 'DATA_ARCHIVE',
    };
    systemRegistry.enableSecondaryDriveD = true;
    applySystemRegistryToOS();
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', `Created & mounted Logical DOS Drive D:\\ (${rem} MB ${systemRegistry.fileSystemFormat})`, 'OK', '0x2033');
    renderFdiskScreen();
    setFdiskConsoleLog(`Created & formatted Extended Logical DOS Drive D: (${rem} MB · ${systemRegistry.fileSystemFormat}). Mounted in My AngelTop!`);
    notifyFdiskGuideAfterAction(2);
  };

  bind('fdisk-create-d-btn', runCreateLogicalD);

  bind('fdisk-delete-d-btn', () => {
    partitionTable.logicalD.exists = false;
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', 'Removed Logical DOS Drive D:\\ — space returned to unallocated cylinders', 'WARN', '0x2034');
    renderFdiskScreen();
    setFdiskConsoleLog('Logical DOS Drive D: removed. Freed space returned to Unallocated pool.');
  });

  const runWriteMbr = () => {
    const bridge = getOsBridge();
    bridge?.sfx.playFloppySeek();
    partitionTable.mbrSignatureValid = true;
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', 'Wrote x86 Master Boot Record (446-byte loader + 0x55AA signature) to Cylinder 0 Head 0 Sector 1', 'OK', '0x2035');
    renderFdiskScreen();
    setFdiskConsoleLog('FDISK /MBR: Wrote clean 446-byte x86 bootstrap code + 0x55AA signature to Cylinder 0, Head 0, Sector 1.');
    notifyFdiskGuideAfterAction(3);
  };

  bind('fdisk-mbr-btn', runWriteMbr);

  bind('fdisk-wipe-mbr-btn', () => {
    getOsBridge()?.sfx.playChordError();
    partitionTable.mbrSignatureValid = false;
    savePartitionTable(partitionTable);
    logHardwareEvent('FDISK.EXE', 'Zeroed MBR boot signature (0x0000) — BIOS boot check will halt', 'ERR', '0x2036');
    renderFdiskScreen();
    setFdiskConsoleLog('Zeroed MBR boot signature (0x0000). Rebooting now will trigger BIOS "Missing operating system" hardware halt!');
  });

  const runFormatPrimaryC = () => {
    if (!partitionTable.primaryC.exists) {
      setFdiskConsoleLog('FORMAT error: Invalid drive specification (Create Primary Partition C: first).');
      return;
    }
    if (fdiskFormatInterval) clearInterval(fdiskFormatInterval);
    let cyl = 0;
    const maxCyl = 968;
    fdiskFormatInterval = window.setInterval(() => {
      cyl = Math.min(maxCyl, cyl + 194);
      const pct = Math.min(100, Math.round((cyl / maxCyl) * 100));
      getOsBridge()?.sfx.playFloppySeek();
      setFdiskConsoleLog(
        `FORMAT C: /S /V:ANGEL_OS — Formatting ${partitionTable.primaryC.sizeMB}M (${systemRegistry.fileSystemFormat})... Cylinder ${cyl}/${maxCyl} (${pct}%)`,
      );
      if (cyl >= maxCyl) {
        if (fdiskFormatInterval) clearInterval(fdiskFormatInterval);
        fdiskFormatInterval = null;
        partitionTable.primaryC.formatted = true;
        partitionTable.primaryC.active = true;
        partitionTable.primaryC.fileSystem = systemRegistry.fileSystemFormat;
        partitionTable.mbrSignatureValid = true;
        savePartitionTable(partitionTable);
        logVfsEvent('WRITE', 'C:\\', `FORMAT C: /S completed (${partitionTable.primaryC.sizeMB}MB ${systemRegistry.fileSystemFormat}, IO.SYS + MSDOS.SYS + COMMAND.COM transferred)`, 'OK');
        renderFdiskScreen();
        setFdiskConsoleLog('Format complete! System transferred (IO.SYS, MSDOS.SYS, COMMAND.COM). Partition C: is bootable.');
        notifyFdiskGuideAfterAction(4);
      }
    }, 140);
  };

  bind('fdisk-format-c-btn', runFormatPrimaryC);

  // Auto-Run Current Guide Step Handler
  bind('fdisk-guide-autorun-btn', () => {
    const idx = fdiskGuideState.currentStepIndex;
    if (idx === 0) {
      const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
      if (sizeIn && (!Number(sizeIn.value) || Number(sizeIn.value) > 1900)) {
        sizeIn.value = '1495';
      }
      runCreatePrimaryC();
    } else if (idx === 1) {
      if (!partitionTable.primaryC.exists) runCreatePrimaryC();
      runToggleActiveC(true);
    } else if (idx === 2) {
      if (!partitionTable.primaryC.exists || partitionTable.primaryC.sizeMB > 1950) {
        const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
        if (sizeIn) sizeIn.value = '1495';
        partitionTable.primaryC.exists = true;
        partitionTable.primaryC.sizeMB = 1495;
        partitionTable.primaryC.active = true;
      }
      runCreateLogicalD();
    } else if (idx === 3) {
      runWriteMbr();
    } else if (idx === 4) {
      if (!partitionTable.primaryC.exists) runCreatePrimaryC();
      runFormatPrimaryC();
    }
  });

  // 1-Click Partition Presets inside FDISK Guide
  bind('fdisk-preset-dual-btn', () => {
    getOsBridge()?.sfx.playFloppySeek();
    const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
    if (sizeIn) sizeIn.value = '1495';
    partitionTable.mbrSignatureValid = true;
    partitionTable.primaryC = {
      exists: true,
      active: true,
      formatted: true,
      fileSystem: systemRegistry.fileSystemFormat,
      sizeMB: 1495,
      label: 'ANGEL_OS',
    };
    partitionTable.logicalD = {
      exists: true,
      formatted: true,
      fileSystem: systemRegistry.fileSystemFormat,
      sizeMB: 500,
      label: 'DATA_ARCHIVE',
    };
    systemRegistry.primaryPartitionSizeMB = 1495;
    systemRegistry.enableSecondaryDriveD = true;
    applySystemRegistryToOS();
    savePartitionTable(partitionTable);
    fdiskGuideState.currentStepIndex = 4;
    renderFdiskScreen();
    setFdiskConsoleLog('PRESET APPLIED [P1]: Dual-Drive Layout (C: 1,495 MB Active/Formatted + D: 500 MB Formatted + Valid 0x55AA MBR).');
  });

  bind('fdisk-preset-single-btn', () => {
    getOsBridge()?.sfx.playFloppySeek();
    const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
    if (sizeIn) sizeIn.value = '1995';
    partitionTable.mbrSignatureValid = true;
    partitionTable.primaryC = {
      exists: true,
      active: true,
      formatted: true,
      fileSystem: systemRegistry.fileSystemFormat,
      sizeMB: 1995,
      label: 'ANGEL_OS',
    };
    partitionTable.logicalD.exists = false;
    systemRegistry.primaryPartitionSizeMB = 1995;
    applySystemRegistryToOS();
    savePartitionTable(partitionTable);
    fdiskGuideState.currentStepIndex = 4;
    renderFdiskScreen();
    setFdiskConsoleLog('PRESET APPLIED [P2]: Single Maximal Primary C: (1,995 MB Active/Formatted · 100% Fixed Disk 1 + Valid 0x55AA MBR).');
  });

  bind('fdisk-preset-wipe-btn', () => {
    getOsBridge()?.sfx.playChordError();
    const sizeIn = document.getElementById('fdisk-c-size-input') as HTMLInputElement | null;
    if (sizeIn) sizeIn.value = '1495';
    partitionTable.primaryC.exists = false;
    partitionTable.primaryC.active = false;
    partitionTable.primaryC.formatted = false;
    partitionTable.logicalD.exists = false;
    partitionTable.logicalD.formatted = false;
    partitionTable.mbrSignatureValid = false;
    savePartitionTable(partitionTable);
    fdiskGuideState.currentStepIndex = 0;
    renderFdiskScreen();
    setFdiskConsoleLog('PRESET APPLIED [P3]: Wiped Fixed Disk 1 to 1,995 MB Unallocated + 0x0000 MBR. Follow Step 1 in the FDISK Guide above!');
  });

  bind('fdisk-launch-setup-btn', () => {
    // Auto-prepare partition if user jumps straight into OS Setup
    if (!partitionTable.primaryC.exists) {
      repairBootablePrimaryPartition();
    } else {
      partitionTable.primaryC.formatted = true;
      partitionTable.primaryC.active = true;
      partitionTable.mbrSignatureValid = true;
      savePartitionTable(partitionTable);
    }
    closeFdiskScreen();
    openOsReinstallScreen();
  });

  bind('fdisk-exit-btn', () => {
    closeFdiskScreen();
  });

  // F1 keyboard shortcut inside FDISK screen
  window.addEventListener('keydown', (e) => {
    const screen = document.getElementById('fdisk-screen');
    if (!screen || screen.style.display === 'none') return;
    if (e.key === 'F1') {
      e.preventDefault();
      getOsBridge()?.sfx.playClick();
      toggleFdiskGuide();
    }
  });
}

// ==================== METHOD 2B: REAL BINARY EL TORITO X86 BOOTABLE .ISO & MBR USB DISK BUILDERS ====================

function writeAsciiFixed(buf: Uint8Array, offset: number, str: string, len: number, padByte = 0x20): void {
  for (let i = 0; i < len; i++) {
    buf[offset + i] = i < str.length ? str.charCodeAt(i) & 0x7f : padByte;
  }
}

function writeBothEndian16(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >> 8) & 0xff;
  buf[offset + 2] = (val >> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function writeBothEndian32(buf: Uint8Array, offset: number, val: number): void {
  buf[offset] = val & 0xff;
  buf[offset + 1] = (val >> 8) & 0xff;
  buf[offset + 2] = (val >> 16) & 0xff;
  buf[offset + 3] = (val >> 24) & 0xff;
  buf[offset + 4] = (val >> 24) & 0xff;
  buf[offset + 5] = (val >> 16) & 0xff;
  buf[offset + 6] = (val >> 8) & 0xff;
  buf[offset + 7] = val & 0xff;
}

function writeDirRecord(
  buf: Uint8Array,
  offset: number,
  extentLba: number,
  dataLen: number,
  isDir: boolean,
  identifier: string | number,
): number {
  const idBytes =
    typeof identifier === 'number'
      ? [identifier]
      : Array.from(identifier).map((c) => c.charCodeAt(0) & 0x7f);
  const nameLen = idBytes.length;
  const recLen = 33 + nameLen + (nameLen % 2 === 0 ? 1 : 0);

  buf[offset + 0] = recLen;
  buf[offset + 1] = 0;
  writeBothEndian32(buf, offset + 2, extentLba);
  writeBothEndian32(buf, offset + 10, dataLen);
  buf[offset + 18] = 95;
  buf[offset + 19] = 8;
  buf[offset + 20] = 24;
  buf[offset + 21] = 12;
  buf[offset + 22] = 0;
  buf[offset + 23] = 0;
  buf[offset + 24] = 0;
  buf[offset + 25] = isDir ? 0x02 : 0x00;
  buf[offset + 26] = 0;
  buf[offset + 27] = 0;
  writeBothEndian16(buf, offset + 28, 1);
  buf[offset + 32] = nameLen;
  for (let i = 0; i < nameLen; i++) {
    buf[offset + 33 + i] = idBytes[i];
  }
  return recLen;
}

// Verified 446-byte 16-bit x86 real-mode interactive bootloader assembled via GNU as/ld from physical-booter/angel_booter.S
export const VERIFIED_X86_BOOTER_446 = new Uint8Array([
  250,49,192,142,216,142,192,142,208,188,0,124,251,184,3,0,205,16,184,0,6,183,31,49,201,186,79,24,205,16,180,2,
  48,255,49,210,205,16,190,110,124,232,52,0,49,192,205,22,60,49,116,18,60,13,116,14,60,50,116,19,60,114,116,25,
  60,82,116,21,235,230,190,7,125,232,20,0,244,235,253,205,18,190,76,125,232,9,0,235,211,205,25,234,0,0,255,255,
  172,132,192,116,8,180,14,48,255,205,16,235,243,195,65,78,71,69,76,45,79,83,32,80,72,89,83,73,67,65,76,32,66,
  79,79,84,69,82,32,118,49,46,52,13,10,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,61,
  61,61,61,61,61,13,10,91,49,47,69,110,116,101,114,93,32,66,111,111,116,32,76,111,99,97,108,32,65,99,99,111,117,
  110,116,32,79,83,13,10,91,50,93,32,80,114,111,98,101,32,66,73,79,83,32,38,32,80,97,114,116,105,116,105,111,
  110,32,84,97,98,108,101,13,10,91,82,93,32,82,101,98,111,111,116,32,72,97,114,100,119,97,114,101,13,10,62,32,
  0,13,10,91,79,75,93,32,65,110,103,101,108,45,79,83,32,76,111,99,97,108,32,65,99,99,111,117,110,116,32,75,
  101,114,110,101,108,32,65,99,116,105,118,101,32,40,120,56,54,32,77,66,82,47,73,83,79,32,86,101,114,105,102,
  105,101,100,41,13,10,0,13,10,91,79,75,93,32,120,56,54,32,82,101,97,108,45,77,111,100,101,32,77,101,109,111,
  114,121,32,38,32,77,66,82,32,48,120,53,53,65,65,32,80,114,111,98,101,32,82,101,97,100,121,13,10,62,32,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
]);

export function downloadBootableIsoImage(): void {
  const bridge = getOsBridge();
  bridge?.sfx.playFloppySeek();

  const SECTOR = 2048;
  const TOTAL_SECTORS = 32; // 64 KB bootable ISO-9660 + El Torito CD-ROM
  const iso = new Uint8Array(TOTAL_SECTORS * SECTOR);

  const volLabel = (systemRegistry.isoVolumeLabel || 'ANGELOS_BOOT')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 28) || 'ANGELOS_BOOT';

  // --- Sector 16: ISO-9660 Primary Volume Descriptor ---
  const pvd = 16 * SECTOR;
  iso[pvd + 0] = 0x01;
  writeAsciiFixed(iso, pvd + 1, 'CD001', 5);
  iso[pvd + 6] = 0x01;
  writeAsciiFixed(iso, pvd + 8, 'ANGEL-OS X86 PHYSICAL BOOTER', 32, 0x20);
  writeAsciiFixed(iso, pvd + 40, volLabel, 32, 0x20);
  writeBothEndian32(iso, pvd + 80, TOTAL_SECTORS);
  writeBothEndian16(iso, pvd + 120, 1);
  writeBothEndian16(iso, pvd + 124, 1);
  writeBothEndian16(iso, pvd + 128, SECTOR);
  writeBothEndian32(iso, pvd + 132, 10);
  iso[pvd + 140] = 21;
  iso[pvd + 151] = 22;
  writeDirRecord(iso, pvd + 156, 23, SECTOR, true, 0x00);
  writeAsciiFixed(iso, pvd + 318, 'ANGEL-OS PHYSICAL BOOT LAB', 128, 0x20);
  writeAsciiFixed(iso, pvd + 446, 'ANGEL-OS EL TORITO X86 BOOTER (LOCAL ACCOUNT ALWAYS)', 128, 0x20);
  iso[pvd + 881] = 0x01;

  // --- Sector 17: El Torito Boot Record Volume Descriptor ---
  const brvd = 17 * SECTOR;
  iso[brvd + 0] = 0x00;
  writeAsciiFixed(iso, brvd + 1, 'CD001', 5);
  iso[brvd + 6] = 0x01;
  writeAsciiFixed(iso, brvd + 7, 'EL TORITO SPECIFICATION', 32, 0x00);
  iso[brvd + 71] = 19;

  // --- Sector 18: Volume Descriptor Set Terminator ---
  const term = 18 * SECTOR;
  iso[term + 0] = 0xff;
  writeAsciiFixed(iso, term + 1, 'CD001', 5);
  iso[term + 6] = 0x01;

  // --- Sector 19: El Torito Boot Catalog ---
  const cat = 19 * SECTOR;
  iso[cat + 0] = 0x01;
  iso[cat + 1] = 0x00;
  writeAsciiFixed(iso, cat + 4, 'Angel-OS Booter', 24, 0x00);
  iso[cat + 30] = 0x55;
  iso[cat + 31] = 0xaa;
  let wordSum = 0;
  for (let i = 0; i < 32; i += 2) {
    if (i === 28) continue;
    wordSum = (wordSum + (iso[cat + i] | (iso[cat + i + 1] << 8))) & 0xffff;
  }
  const checksum = (0x10000 - wordSum) & 0xffff;
  iso[cat + 28] = checksum & 0xff;
  iso[cat + 29] = (checksum >> 8) & 0xff;

  iso[cat + 32] = 0x88; // Bootable
  iso[cat + 33] = 0x00; // No Emulation
  iso[cat + 38] = 0x04; // Load 4 virtual 512B sectors
  iso[cat + 40] = 20;   // Boot image LBA

  // --- Sector 20: Assembled 16-bit x86 Interactive Bootloader ---
  const boot = 20 * SECTOR;
  iso.set(VERIFIED_X86_BOOTER_446, boot);
  iso[boot + 510] = 0x55;
  iso[boot + 511] = 0xaa;

  // --- Sectors 21 & 22: Path Tables ---
  iso[21 * SECTOR + 0] = 1;
  iso[21 * SECTOR + 2] = 23;
  iso[21 * SECTOR + 6] = 1;
  iso[22 * SECTOR + 0] = 1;
  iso[22 * SECTOR + 5] = 23;
  iso[22 * SECTOR + 7] = 1;

  // --- Embedded Disc Files ---
  const encoder = new TextEncoder();
  const activeUser = systemRegistry.activeLocalAccount || 'Michael';
  const autorunBytes = encoder.encode(
    `[autorun]\r\nopen=SETUP.EXE\r\nicon=ANGELOS.ICO\r\nlabel=${volLabel}\r\n`,
  );
  const readmeBytes = encoder.encode(
    `ANGEL-OS PHYSICAL BOOTER ISO (${volLabel})\r\n` +
      `===================================================\r\n` +
      `Generated       : ${new Date().toISOString()}\r\n` +
      `Target Partition: ${systemRegistry.selectedInstallTargetPartition || 'C:'} (${systemRegistry.fileSystemFormat})\r\n` +
      `Local Account   : ${activeUser} (LOCAL ACCOUNT ALWAYS — Offline Profile)\r\n\r\n` +
      `1. Interactive 16-bit x86 bootloader verified at Sector 20 (0x55AA):\r\n` +
      `     qemu-system-x86_64 -cdrom ${volLabel}_BOOTCD.ISO\r\n` +
      `2. Inspect REGISTRY.JSON and LOCAL_ACCOUNTS.JSON inside this disc.\r\n`,
  );
  const safeAccounts = (systemRegistry.localAccounts || []).map((a) => ({
    username: a.username,
    displayName: a.displayName,
    role: a.role,
    localAccountAlways: true,
    homeDir: a.homeDir,
  }));
  const regBytes = encoder.encode(
    JSON.stringify({ accountPolicy: 'LOCAL_ACCOUNT_ALWAYS', activeLocalAccount: activeUser, localAccounts: safeAccounts, partitionTable }, null, 2),
  );

  iso.set(autorunBytes.slice(0, SECTOR), 24 * SECTOR);
  iso.set(readmeBytes.slice(0, SECTOR), 25 * SECTOR);
  iso.set(regBytes.slice(0, 4 * SECTOR), 26 * SECTOR);

  const root = 23 * SECTOR;
  let cursor = 0;
  cursor += writeDirRecord(iso, root + cursor, 23, SECTOR, true, 0x00);
  cursor += writeDirRecord(iso, root + cursor, 23, SECTOR, true, 0x01);
  cursor += writeDirRecord(iso, root + cursor, 24, autorunBytes.length, false, 'AUTORUN.INF;1');
  cursor += writeDirRecord(iso, root + cursor, 25, readmeBytes.length, false, 'README.TXT;1');
  cursor += writeDirRecord(iso, root + cursor, 26, Math.min(regBytes.length, 4 * SECTOR), false, 'LOCAL_ACCOUNTS.JSON;1');

  const fileName = `${volLabel}_BOOTCD.ISO`;
  triggerBrowserBlobDownload(new Blob([iso], { type: 'application/octet-stream' }), fileName);

  bridge?.showOsDialog(
    `Built "${fileName}" with verified x86 interactive bootloader ([1] Boot Local Account "${activeUser}", [2] Probe BIOS, [R] Reboot)! Test directly in QEMU, VirtualBox, or burn to optical/USB media.`,
    'Physical Bootable .ISO Exported',
  );
}

function writeMbrPartitionSlot(
  buf: Uint8Array,
  slot: number,
  active: boolean,
  partType: number,
  lbaStart: number,
  sectors: number,
): void {
  const off = 0x1be + slot * 16;
  buf[off + 0] = active ? 0x80 : 0x00;
  buf[off + 1] = slot === 0 ? 0x01 : 0xfe;
  buf[off + 2] = slot === 0 ? 0x02 : 0xff;
  buf[off + 3] = slot === 0 ? 0x00 : 0xff;
  buf[off + 4] = partType;
  buf[off + 5] = 0xfe;
  buf[off + 6] = 0xff;
  buf[off + 7] = 0xff;
  const view = new DataView(buf.buffer, buf.byteOffset + off, 16);
  view.setUint32(8, lbaStart, true);
  view.setUint32(12, sectors, true);
}

export function downloadBootableUsbDiskImage(): void {
  const bridge = getOsBridge();
  bridge?.sfx.playFloppySeek();

  const SECTORS = 8192; // 4 MB dense raw USB / Fixed Disk MBR Image
  const disk = new Uint8Array(SECTORS * 512);
  disk.set(VERIFIED_X86_BOOTER_446, 0);

  const p1Start = 63;
  const p1Sectors = partitionTable.logicalD.exists ? 5600 : SECTORS - p1Start - 1;
  const fsType = systemRegistry.fileSystemFormat === 'FAT32' ? 0x0c : 0x06;
  if (partitionTable.primaryC.exists) {
    writeMbrPartitionSlot(disk, 0, partitionTable.primaryC.active, fsType, p1Start, p1Sectors);
  }
  if (partitionTable.logicalD.exists) {
    const p2Start = p1Start + p1Sectors;
    writeMbrPartitionSlot(disk, 1, false, 0x0b, p2Start, SECTORS - p2Start - 1);
  }
  if (partitionTable.mbrSignatureValid) {
    disk[510] = 0x55;
    disk[511] = 0xaa;
  }

  // FAT VBR at LBA 63
  const vbr = p1Start * 512;
  disk[vbr + 0] = 0xeb;
  disk[vbr + 1] = 0x58;
  disk[vbr + 2] = 0x90;
  writeAsciiFixed(disk, vbr + 3, 'ANGELOS ', 8, 0x20);
  disk[vbr + 510] = 0x55;
  disk[vbr + 511] = 0xaa;

  // Embedded local account & partition table JSON at LBA 67
  const encoder = new TextEncoder();
  const meta = encoder.encode(
    JSON.stringify(
      {
        os: 'Angel-OS Physical Disk Image',
        accountPolicy: 'LOCAL_ACCOUNT_ALWAYS',
        activeLocalAccount: systemRegistry.activeLocalAccount || 'Michael',
        selectedPartition: systemRegistry.selectedInstallTargetPartition || 'C:',
        partitionTable,
      },
      null,
      2,
    ),
  );
  disk.set(meta.slice(0, 4096), (p1Start + 4) * 512);

  triggerBrowserBlobDownload(new Blob([disk], { type: 'application/octet-stream' }), 'ANGELOS_USB_DISK.img');
  bridge?.showOsDialog(
    'Exported "ANGELOS_USB_DISK.img" with genuine MBR Partition Table (C:/D:), x86 Interactive Physical Bootloader at Sector 0, and your Local Account config! Flash via Rufus, Etcher, dd, or run in QEMU.',
    'Raw Bootable USB Disk (.IMG) Exported',
  );
}

export function downloadPhysicalHostBooterFile(kind: 'linux_sh' | 'windows_ps1' | 'python_builder'): void {
  const bridge = getOsBridge();
  bridge?.sfx.playFloppySeek();
  const activeUser = (systemRegistry.activeLocalAccount || 'Michael').replace(/[^A-Za-z0-9_-]/g, '') || 'Michael';
  const targetPart = systemRegistry.selectedInstallTargetPartition || 'C:';

  if (kind === 'linux_sh') {
    const script = `#!/usr/bin/env bash
set -euo pipefail
# Angel-OS Bare-Metal Linux & GRUB2 Installer (Preconfigured for Local User: ${activeUser})
ANGELOS_USER="${activeUser}"
ANGELOS_URL="${window.location.origin}${window.location.pathname}"
echo "=== Installing Angel-OS Physical Kiosk Shell for Local Account: $ANGELOS_USER ==="
sudo mkdir -p /opt/angel-os /var/lib/angel-os
cat <<'EOF' | sudo tee /var/lib/angel-os/local_accounts.json >/dev/null
{
  "accountPolicy": "LOCAL_ACCOUNT_ALWAYS",
  "activeLocalAccount": "${activeUser}",
  "targetPartition": "${targetPart}"
}
EOF
cat <<EOF | sudo tee /usr/local/bin/angel-os-boot >/dev/null
#!/usr/bin/env bash
for b in google-chrome chromium chromium-browser microsoft-edge; do
  command -v "\$b" >/dev/null && exec "\$b" --kiosk --app="$ANGELOS_URL"
done
echo "Open $ANGELOS_URL in your browser."
EOF
sudo chmod +x /usr/local/bin/angel-os-boot
echo "[OK] Installed! Run 'angel-os-boot' or download offline ZIP from GitHub Releases for 100% air-gapped hosting."
`;
    triggerBrowserBlobDownload(new Blob([script], { type: 'text/x-shellscript;charset=utf-8' }), 'install_angelos_linux.sh');
  } else if (kind === 'windows_ps1') {
    const targetDir = targetPart === 'D:' ? 'D:\\Angel-OS' : 'C:\\Angel-OS';
    const ps = `# Angel-OS Windows Native Partition & Local-Account Installer (User: ${activeUser})
param(
  [string]$InstallRoot = "${targetDir}",
  [string]$LocalUsername = "${activeUser}"
)
New-Item -ItemType Directory -Force -Path "$InstallRoot\\Users\\$LocalUsername" | Out-Null
@{
  accountPolicy = "LOCAL_ACCOUNT_ALWAYS"
  activeLocalAccount = $LocalUsername
  targetPartition = "${targetPart}"
  shellUrl = "${window.location.origin}${window.location.pathname}"
} | ConvertTo-Json | Set-Content "$InstallRoot\\local_account.json" -Encoding UTF8
$Bat = "@ECHO OFF\`r\`nSTART \\"\\" msedge --kiosk --app=\\"${window.location.origin}${window.location.pathname}\\""
$Bat | Set-Content "$InstallRoot\\Boot-AngelOS.bat" -Encoding ASCII
$Wsh = New-Object -ComObject WScript.Shell
$Sc = $Wsh.CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\\Angel-OS ($LocalUsername).lnk")
$Sc.TargetPath = "$InstallRoot\\Boot-AngelOS.bat"
$Sc.Save()
Write-Host "[OK] Angel-OS Local Shell installed to $InstallRoot for $LocalUsername!" -ForegroundColor Green
`;
    triggerBrowserBlobDownload(new Blob([ps], { type: 'text/plain;charset=utf-8' }), 'Install-AngelOS-Windows.ps1');
  } else {
    const py = `#!/usr/bin/env python3
"""Quick standalone Angel-OS Physical USB & ISO generator (Local Account: ${activeUser})"""
import json, os, struct
BOOT_446 = bytes(${JSON.stringify(Array.from(VERIFIED_X86_BOOTER_446))})
os.makedirs("angelos_boot_out", exist_ok=True)
disk = bytearray(4096 * 512)
disk[0:446] = BOOT_446
struct.pack_into("<BBBBBBBBII", disk, 0x1BE, 0x80, 1, 2, 0, ${systemRegistry.fileSystemFormat === 'FAT32' ? 0x0c : 0x06}, 0xFE, 0xFF, 0xFF, 63, 4000)
disk[510:512] = b"\\x55\\xAA"
meta = json.dumps({"accountPolicy": "LOCAL_ACCOUNT_ALWAYS", "localAccount": "${activeUser}", "partition": "${targetPart}"}).encode()
disk[67*512:67*512+len(meta)] = meta
open("angelos_boot_out/ANGELOS_USB_DISK.img", "wb").write(disk)
print("Generated angelos_boot_out/ANGELOS_USB_DISK.img for Local Account ${activeUser}!")
`;
    triggerBrowserBlobDownload(new Blob([py], { type: 'text/x-python;charset=utf-8' }), 'build_angelos_usb.py');
  }
}

// ==================== METHOD 2C: NATIVE PWA STANDALONE OS INSTALLER & HARDWARE FULLSCREEN ====================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPwaPrompt: BeforeInstallPromptEvent | null = null;
let isStandaloneOsMode = false;
let isOfflineMode =
  typeof navigator !== 'undefined' &&
  typeof window !== 'undefined' &&
  window.location.protocol === 'file:' &&
  !navigator.onLine;

export function getPwaHostState() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const inIframe = window.self !== window.top;
  return {
    canPromptInstall: Boolean(deferredPwaPrompt),
    isInstalledStandalone: isStandaloneOsMode,
    isIOS,
    inIframe,
    isOffline: isOfflineMode,
    isFullscreen: Boolean(document.fullscreenElement),
  };
}

function syncPwaTaskbarAndBadges(): void {
  const taskbarBtn = document.getElementById('pwa-taskbar-install-btn');
  const startItem = document.getElementById('start-pwa-install');
  const offlineBadge = document.getElementById('tray-offline-badge');

  // Hide the persistent taskbar install button when already installed/running as standalone or no install prompt is queued
  if (taskbarBtn) {
    taskbarBtn.style.display = Boolean(deferredPwaPrompt) && !isStandaloneOsMode ? 'inline-flex' : 'none';
  }
  if (startItem) {
    startItem.innerHTML = isStandaloneOsMode
      ? '✓ <b>Installed as Native OS (Standalone)</b>'
      : '📲 <b>Install as Physical OS (PWA)...</b>';
  }
  if (offlineBadge) {
    offlineBadge.style.display = isOfflineMode ? 'inline-flex' : 'none';
  }
}

export async function triggerNativePwaInstall(): Promise<void> {
  const bridge = getOsBridge();
  bridge?.sfx.playWindowOpen();
  const state = getPwaHostState();

  if (state.isInstalledStandalone) {
    bridge?.showOsDialog(
      'AngelOS-web is currently running as a Standalone Installed OS App on your device! Use "Fullscreen Hardware Lock" for 100% edge-to-edge CRT immersion.',
      'Standalone OS Active',
    );
    return;
  }

  if (deferredPwaPrompt) {
    await deferredPwaPrompt.prompt();
    const { outcome } = await deferredPwaPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPwaPrompt = null;
      syncPwaTaskbarAndBadges();
      renderAbilityToInstallUI();
    }
    return;
  }

  if (state.isIOS) {
    const iosModal = document.getElementById('pwa-ios-modal');
    if (iosModal) iosModal.style.display = 'flex';
    return;
  }

  // Helpful guidance when inside preview iframe or browser where prompt hasn't fired yet
  const iosModal = document.getElementById('pwa-ios-modal');
  const bodyEl = document.getElementById('pwa-guide-body');
  if (iosModal && bodyEl) {
    bodyEl.innerHTML = `
      <p style="margin:0 0 8px 0;">To install <b>AngelOS-web</b> directly onto your computer's Desktop / Start Menu / Dock as a native standalone OS app:</p>
      <ol style="margin:0 0 10px 18px;padding:0;line-height:1.5;">
        <li>Open this app's URL in its own top-level browser tab (click the <b>Open in New Tab ↗</b> icon in the top-right preview header if viewing inside an iframe).</li>
        <li>Click the <b>Install AngelOS-web (🖥️ / ⊕)</b> icon in Chrome or Edge's address bar — or click <b>📲 Install OS</b> on the AngelOS-web taskbar!</li>
        <li>Alternatively, click <b>Download Portable App (.HTML / .BAT)</b> below for an instant desktop launcher file right now.</li>
      </ol>
    `;
    iosModal.style.display = 'flex';
  }
}

export function toggleHardwareFullscreen(): void {
  const bridge = getOsBridge();
  bridge?.sfx.playClick();
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {
      bridge?.showOsDialog('Fullscreen request was blocked by the host browser frame. Try opening in a full tab or downloading the Portable App.', 'Hardware Fullscreen');
    });
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

export function initPwaAndHostOsController(): void {
  // Register Workbox Service Worker for offline OS caching
  try {
    registerSW({ immediate: true });
  } catch {
    // Ignore SW registration errors in restricted sandboxes
  }

  const mq = window.matchMedia('(display-mode: standalone)');
  isStandaloneOsMode = mq.matches || Boolean((navigator as any).standalone);

  mq.addEventListener?.('change', (e) => {
    isStandaloneOsMode = e.matches;
    syncPwaTaskbarAndBadges();
    renderAbilityToInstallUI();
  });

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPwaPrompt = e as BeforeInstallPromptEvent;
    syncPwaTaskbarAndBadges();
    renderAbilityToInstallUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    isStandaloneOsMode = true;
    syncPwaTaskbarAndBadges();
    renderAbilityToInstallUI();
    getOsBridge()?.sfx.playStartupChime();
  });

  window.addEventListener('online', () => {
    isOfflineMode = false;
    syncPwaTaskbarAndBadges();
  });

  window.addEventListener('offline', () => {
    isOfflineMode = true;
    syncPwaTaskbarAndBadges();
  });

  // Verify real connectivity if navigator.onLine reports false (prevents spurious OFFLINE badge in headless/sandbox environments)
  if (!navigator.onLine && window.location.protocol.startsWith('http')) {
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => {
        isOfflineMode = !r.ok;
        syncPwaTaskbarAndBadges();
      })
      .catch(() => {
        isOfflineMode = true;
        syncPwaTaskbarAndBadges();
      });
  }

  document.addEventListener('fullscreenchange', () => {
    renderAbilityToInstallUI();
    renderMasterSettingsCurrentTab();
  });

  // Optional auto-fullscreen on first click when launched as installed standalone PWA
  if (isStandaloneOsMode && systemRegistry.autoFullscreenStandalone) {
    document.addEventListener(
      'click',
      () => {
        if (!document.fullscreenElement && systemRegistry.autoFullscreenStandalone) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      },
      { once: true },
    );
  }

  document.getElementById('pwa-taskbar-install-btn')?.addEventListener('click', () => triggerNativePwaInstall());
  document.getElementById('start-pwa-install')?.addEventListener('click', () => {
    document.getElementById('start-menu')?.classList.remove('active');
    triggerNativePwaInstall();
  });
  document.getElementById('pwa-ios-close-btn')?.addEventListener('click', () => {
    const m = document.getElementById('pwa-ios-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('pwa-ios-ok-btn')?.addEventListener('click', () => {
    const m = document.getElementById('pwa-ios-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('pwa-modal-portable-btn')?.addEventListener('click', () => {
    const m = document.getElementById('pwa-ios-modal');
    if (m) m.style.display = 'none';
    downloadPortableHostApp('html');
  });

  syncPwaTaskbarAndBadges();
}
