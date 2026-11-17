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

  let fileName = 'GEMINI95_OS_SETUP.EXE';
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
      `MZ\x90\x00PE\x00\x00 Win32 Self-Extracting Setup Archive (${sizeMB.toFixed(1)} MB) — ${pkgRef ? pkgRef.name : 'Gemini 95 Full Operating System Setup'}`,
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
    pkgId === 'os_setup' || upper === 'GEMINI95_OS_SETUP.EXE' || upper === 'SETUP.EXE';

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
    ? 'Gemini Neural Systems, Inc. (Signed OS Media)'
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
    <span><b>Tip:</b> Click <b>📥 Save .EXE</b> to drop the setup file into <code>C:\\Downloads</code> (openable in My Gemtop or MS-DOS), or <b>▶ Run .EXE</b> to extract immediately!</span>
  </div>
  <div class="wrap">
    <div id="dl-banner"></div>
    <div class="os-box">
      <div>
        <b style="font-size:13px;color:#800000;">💿 GEMINI95_OS_SETUP.EXE — Full Standalone OS Recovery &amp; Upgrade Package (68.4 MB)</b><br/>
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
      'TITLE Gemini 95 Portable Desktop OS Launcher',
      'ECHO ========================================================',
      'ECHO   LAUNCHING GEMINI 95 IN NATIVE CHROMELESS DESKTOP MODE',
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
    triggerBrowserBlobDownload(blob, 'Gemini95_Portable_Launcher.bat');
    bridge?.showOsDialog(
      'Downloaded "Gemini95_Portable_Launcher.bat" to your real computer! Double-clicking it on Windows launches Gemini 95 in a chromeless native Win32 desktop window.',
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
  <title>Gemini 95 — Portable Desktop Edition</title>
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
    <div><b>💾 Gemini 95 Portable Desktop Container</b> · Bound Host: <code>${appOrigin}</code></div>
    <div style="display:flex;gap:6px;">
      <button class="btn95" onclick="document.documentElement.requestFullscreen && document.documentElement.requestFullscreen()">⛶ Fullscreen Hardware Lock</button>
      <button class="btn95" onclick="toggleSnap()">📋 Embedded Registry Snapshot</button>
    </div>
  </div>
  <iframe src="${appOrigin}" allow="autoplay; fullscreen; clipboard-write"></iframe>
  <div class="modal" id="snap-modal">
    <div style="background:#000080;color:#fff;font-weight:bold;padding:4px 8px;margin-bottom:8px;">Exported Gemini 95 Registry &amp; Disk Snapshot</div>
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
  triggerBrowserBlobDownload(blob, 'Gemini95_Portable_App.html');
  bridge?.showOsDialog(
    'Downloaded "Gemini95_Portable_App.html" to your computer! Open it from your Desktop anytime for an instant portable Gemini 95 container with your embedded Registry snapshot.',
    'Portable App Downloaded',
  );
}

// ==================== METHOD 2A: MS-DOS FDISK.EXE FIXED DISK PARTITIONER ====================

let fdiskFormatInterval: number | null = null;

export function openFdiskScreen(): void {
  const screen = document.getElementById('fdisk-screen');
  if (!screen) return;
  const bridge = getOsBridge();
  bridge?.sfx.playPostBeep();
  screen.style.display = 'flex';
  renderFdiskScreen();
}

export function closeFdiskScreen(): void {
  const screen = document.getElementById('fdisk-screen');
  if (fdiskFormatInterval) {
    clearInterval(fdiskFormatInterval);
    fdiskFormatInterval = null;
  }
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
    rows.push(`<tr><td colspan="7" style="color:#ff8888;text-align:center;padding:10px;">No partitions defined on Fixed Disk 1 (1,995 MB Unallocated). Create a Primary DOS Partition to install Gemini 95.</td></tr>`);
  }
  tbodyEl.innerHTML = rows.join('');
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

  bind('fdisk-create-c-btn', () => {
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
      label: 'GEMINI_95',
    };
    systemRegistry.primaryPartitionSizeMB = requested;
    applySystemRegistryToOS();
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog(`Created Primary DOS Partition C: (${requested} MB, Active). Run "FORMAT C: /S" or "Launch OS Setup" to write system tracks!`);
  });

  bind('fdisk-delete-c-btn', () => {
    getOsBridge()?.sfx.playChordError();
    partitionTable.primaryC.exists = false;
    partitionTable.primaryC.active = false;
    partitionTable.primaryC.formatted = false;
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog('WARNING: Primary DOS Partition C: deleted! System will halt on next BIOS boot until C: is recreated and formatted.');
  });

  bind('fdisk-toggle-active-btn', () => {
    if (!partitionTable.primaryC.exists) {
      setFdiskConsoleLog('Cannot set Active flag: Primary DOS Partition C: does not exist.');
      return;
    }
    partitionTable.primaryC.active = !partitionTable.primaryC.active;
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog(
      partitionTable.primaryC.active
        ? 'Partition 1 (C:) marked ACTIVE (Bootable).'
        : 'Active flag cleared on C:. BIOS MBR will report "Missing operating system" if Strict MBR Check is enabled.',
    );
  });

  bind('fdisk-create-d-btn', () => {
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
    renderFdiskScreen();
    setFdiskConsoleLog(`Created & formatted Extended Logical DOS Drive D: (${rem} MB · ${systemRegistry.fileSystemFormat}). Mounted in My Gemtop!`);
  });

  bind('fdisk-delete-d-btn', () => {
    partitionTable.logicalD.exists = false;
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog('Logical DOS Drive D: removed. Freed space returned to Unallocated pool.');
  });

  bind('fdisk-mbr-btn', () => {
    const bridge = getOsBridge();
    bridge?.sfx.playFloppySeek();
    partitionTable.mbrSignatureValid = true;
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog('FDISK /MBR: Wrote clean 446-byte x86 bootstrap code + 0x55AA signature to Cylinder 0, Head 0, Sector 1.');
  });

  bind('fdisk-wipe-mbr-btn', () => {
    getOsBridge()?.sfx.playChordError();
    partitionTable.mbrSignatureValid = false;
    savePartitionTable(partitionTable);
    renderFdiskScreen();
    setFdiskConsoleLog('Zeroed MBR boot signature (0x0000). Rebooting now will trigger BIOS "Missing operating system" hardware halt!');
  });

  bind('fdisk-format-c-btn', () => {
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
        `FORMAT C: /S /V:GEMINI_95 — Formatting ${partitionTable.primaryC.sizeMB}M (${systemRegistry.fileSystemFormat})... Cylinder ${cyl}/${maxCyl} (${pct}%)`,
      );
      if (cyl >= maxCyl) {
        if (fdiskFormatInterval) clearInterval(fdiskFormatInterval);
        fdiskFormatInterval = null;
        partitionTable.primaryC.formatted = true;
        partitionTable.primaryC.active = true;
        partitionTable.primaryC.fileSystem = systemRegistry.fileSystemFormat;
        partitionTable.mbrSignatureValid = true;
        savePartitionTable(partitionTable);
        renderFdiskScreen();
        setFdiskConsoleLog('Format complete! System transferred (IO.SYS, MSDOS.SYS, COMMAND.COM). Partition C: is bootable.');
      }
    }, 140);
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
}

// ==================== METHOD 2B: REAL BINARY EL TORITO X86 BOOTABLE .ISO BUILDER ====================

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
  buf[offset + 1] = 0; // Extended Attribute length
  writeBothEndian32(buf, offset + 2, extentLba);
  writeBothEndian32(buf, offset + 10, dataLen);
  // Recording date/time: 1995-08-24 12:00:00 GMT
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

export function downloadBootableIsoImage(): void {
  const bridge = getOsBridge();
  bridge?.sfx.playFloppySeek();

  const SECTOR = 2048;
  const TOTAL_SECTORS = 32; // 64 KB bootable ISO-9660 + El Torito CD-ROM
  const iso = new Uint8Array(TOTAL_SECTORS * SECTOR);

  const volLabel = (systemRegistry.isoVolumeLabel || 'GEMINI95_OS')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .slice(0, 28) || 'GEMINI95_OS';

  // --- Sector 16: ISO-9660 Primary Volume Descriptor ---
  const pvd = 16 * SECTOR;
  iso[pvd + 0] = 0x01;
  writeAsciiFixed(iso, pvd + 1, 'CD001', 5);
  iso[pvd + 6] = 0x01;
  writeAsciiFixed(iso, pvd + 8, 'GEMINI 95 X86 PC', 32, 0x20);
  writeAsciiFixed(iso, pvd + 40, volLabel, 32, 0x20);
  writeBothEndian32(iso, pvd + 80, TOTAL_SECTORS);
  writeBothEndian16(iso, pvd + 120, 1);
  writeBothEndian16(iso, pvd + 124, 1);
  writeBothEndian16(iso, pvd + 128, SECTOR);
  writeBothEndian32(iso, pvd + 132, 10); // Path table size
  // L Path Table at Sector 21 (LE)
  iso[pvd + 140] = 21;
  // M Path Table at Sector 22 (BE)
  iso[pvd + 151] = 22;
  // Root Directory Record pointing to Sector 23
  writeDirRecord(iso, pvd + 156, 23, SECTOR, true, 0x00);
  writeAsciiFixed(iso, pvd + 318, 'GEMINI NEURAL SYSTEMS INC.', 128, 0x20);
  writeAsciiFixed(iso, pvd + 446, 'GEMINI 95 EL TORITO BOOTABLE INSTALLER', 128, 0x20);
  iso[pvd + 881] = 0x01;

  // --- Sector 17: El Torito Boot Record Volume Descriptor ---
  const brvd = 17 * SECTOR;
  iso[brvd + 0] = 0x00;
  writeAsciiFixed(iso, brvd + 1, 'CD001', 5);
  iso[brvd + 6] = 0x01;
  writeAsciiFixed(iso, brvd + 7, 'EL TORITO SPECIFICATION', 32, 0x00);
  // Pointer to Boot Catalog at Sector 19 (little-endian uint32)
  iso[brvd + 71] = 19;
  iso[brvd + 72] = 0;
  iso[brvd + 73] = 0;
  iso[brvd + 74] = 0;

  // --- Sector 18: Volume Descriptor Set Terminator ---
  const term = 18 * SECTOR;
  iso[term + 0] = 0xff;
  writeAsciiFixed(iso, term + 1, 'CD001', 5);
  iso[term + 6] = 0x01;

  // --- Sector 19: El Torito Boot Catalog ---
  const cat = 19 * SECTOR;
  // Validation Entry (bytes 0..31)
  iso[cat + 0] = 0x01; // Header ID
  iso[cat + 1] = 0x00; // Platform: 80x86
  writeAsciiFixed(iso, cat + 4, 'Gemini 95 OS Boot', 24, 0x00);
  iso[cat + 30] = 0x55;
  iso[cat + 31] = 0xaa;
  // Compute exact 16-bit two's-complement checksum over the 16 words so total sum === 0x0000
  let wordSum = 0;
  for (let i = 0; i < 32; i += 2) {
    if (i === 28) continue;
    wordSum = (wordSum + (iso[cat + i] | (iso[cat + i + 1] << 8))) & 0xffff;
  }
  const checksum = (0x10000 - wordSum) & 0xffff;
  iso[cat + 28] = checksum & 0xff;
  iso[cat + 29] = (checksum >> 8) & 0xff;

  // Initial/Default Entry (bytes 32..63)
  iso[cat + 32] = 0x88; // Bootable
  iso[cat + 33] = 0x00; // No Emulation
  iso[cat + 38] = 0x04; // Load 4 virtual 512-byte sectors (2048 bytes)
  iso[cat + 40] = 20;   // Load RBA = Sector 20

  // --- Sector 20: Real 16-Bit x86 BIOS Boot Sector (Executes at 0x7C00 in QEMU/VirtualBox!) ---
  const boot = 20 * SECTOR;
  const bootBanner =
    '\r\n' +
    ' ============================================================\r\n' +
    '   GEMINI 95 PHYSICAL OPERATING SYSTEM — EL TORITO X86 CD   \r\n' +
    ' ============================================================\r\n\r\n' +
    `   Volume Label : ${volLabel}\r\n` +
    `   CPU Profile  : ${systemRegistry.cpuModel}\r\n` +
    `   File System  : ${systemRegistry.fileSystemFormat} (${partitionTable.primaryC.sizeMB} MB Primary C:)\r\n\r\n` +
    '   [OK] x86 Real-Mode Bootloader verified at 0000:7C00h.\r\n' +
    '   Open README.TXT & REGISTRY.JSON on this ISO disc, or boot\r\n' +
    '   the full GUI PWA shell on your desktop/mobile browser!\r\n';

  // 16-bit x86 machine code:
  // cli; xor ax,ax; mov ds,ax; mov es,ax; mov ss,ax; mov sp,0x7c00; sti
  // mov ax,0x0003; int 0x10 (80x25 text mode)
  // mov ax,0x0600; mov bh,0x1f; xor cx,cx; mov dx,0x184f; int 0x10 (Win95 Setup royal blue screen!)
  // mov ah,0x02; xor bh,bh; xor dx,dx; int 0x10 (cursor 0,0)
  // mov si, 0x7c00 + msgOffset; print loop via lodsb + int 0x10 (ah=0x0e); hlt loop
  const code = [
    0xfa,                         // cli
    0x31, 0xc0,                   // xor ax, ax
    0x8e, 0xd8,                   // mov ds, ax
    0x8e, 0xc0,                   // mov es, ax
    0x8e, 0xd0,                   // mov ss, ax
    0xbc, 0x00, 0x7c,             // mov sp, 0x7c00
    0xfb,                         // sti
    0xb8, 0x03, 0x00,             // mov ax, 0x0003
    0xcd, 0x10,                   // int 0x10
    0xb8, 0x00, 0x06,             // mov ax, 0x0600
    0xb7, 0x1f,                   // mov bh, 0x1f (white on blue!)
    0x31, 0xc9,                   // xor cx, cx
    0xba, 0x4f, 0x18,             // mov dx, 0x184f
    0xcd, 0x10,                   // int 0x10
    0xb4, 0x02,                   // mov ah, 0x02
    0x30, 0xff,                   // xor bh, bh
    0x31, 0xd2,                   // xor dx, dx
    0xcd, 0x10,                   // int 0x10
    0xbe, 0x34, 0x7c,             // mov si, 0x7c34 (52 decimal)
    // .loop (offset 39):
    0xac,                         // lodsb
    0x08, 0xc0,                   // or al, al
    0x74, 0x06,                   // jz .halt (+6)
    0xb4, 0x0e,                   // mov ah, 0x0e
    0xb7, 0x00,                   // mov bh, 0x00
    0xcd, 0x10,                   // int 0x10
    0xeb, 0xf3,                   // jmp short .loop
    // .halt:
    0xf4,                         // hlt
    0xeb, 0xfd,                   // jmp short .halt
  ];
  for (let i = 0; i < code.length; i++) iso[boot + i] = code[i];
  const msgStart = 0x34; // 52
  const maxBannerLen = 510 - msgStart - 1;
  for (let i = 0; i < Math.min(bootBanner.length, maxBannerLen); i++) {
    iso[boot + msgStart + i] = bootBanner.charCodeAt(i) & 0x7f;
  }
  iso[boot + 510] = 0x55;
  iso[boot + 511] = 0xaa;

  // --- Sectors 21 & 22: Minimal ISO Path Tables ---
  const lpt = 21 * SECTOR;
  iso[lpt + 0] = 1;
  iso[lpt + 2] = 23; // Root extent LBA LE
  iso[lpt + 6] = 1;

  const mpt = 22 * SECTOR;
  iso[mpt + 0] = 1;
  iso[mpt + 5] = 23; // Root extent LBA BE
  iso[mpt + 7] = 1;

  // --- Embedded Disc Files (Sectors 24, 25, 26..28) ---
  const encoder = new TextEncoder();
  const autorunBytes = encoder.encode(
    `[autorun]\r\nopen=SETUP.EXE\r\nicon=GEMINI95.ICO\r\nlabel=${volLabel}\r\n`,
  );
  const readmeBytes = encoder.encode(
    `GEMINI 95 BOOTABLE CD-ROM IMAGE (${volLabel})\r\n` +
      `===================================================\r\n` +
      `Generated: ${new Date().toISOString()}\r\n` +
      `Web Host : ${window.location.origin}\r\n\r\n` +
      `This ISO-9660 + El Torito x86 CD-ROM image contains:\r\n` +
      `1. A working 16-bit x86 BIOS boot sector (Sector 20, 0x55AA) — test in QEMU:\r\n` +
      `     qemu-system-i386 -cdrom ${volLabel}_BOOTCD.ISO\r\n` +
      `2. AUTORUN.INF & REGISTRY.JSON containing your live Gemini 95 configuration.\r\n`,
  );
  const regBytes = encoder.encode(JSON.stringify({ systemRegistry, partitionTable }, null, 2));

  iso.set(autorunBytes.slice(0, SECTOR), 24 * SECTOR);
  iso.set(readmeBytes.slice(0, SECTOR), 25 * SECTOR);
  iso.set(regBytes.slice(0, 4 * SECTOR), 26 * SECTOR);

  // --- Sector 23: Root Directory Entries ---
  const root = 23 * SECTOR;
  let cursor = 0;
  cursor += writeDirRecord(iso, root + cursor, 23, SECTOR, true, 0x00); // '.'
  cursor += writeDirRecord(iso, root + cursor, 23, SECTOR, true, 0x01); // '..'
  cursor += writeDirRecord(iso, root + cursor, 24, autorunBytes.length, false, 'AUTORUN.INF;1');
  cursor += writeDirRecord(iso, root + cursor, 25, readmeBytes.length, false, 'README.TXT;1');
  cursor += writeDirRecord(iso, root + cursor, 26, Math.min(regBytes.length, 4 * SECTOR), false, 'REGISTRY.JSON;1');

  const fileName = `${volLabel}_BOOTCD.ISO`;
  triggerBrowserBlobDownload(new Blob([iso], { type: 'application/octet-stream' }), fileName);

  bridge?.showOsDialog(
    `Built & downloaded "${fileName}" (64 KB ISO-9660 + El Torito x86 Bootable CD-ROM)! You can mount it on your computer to inspect AUTORUN.INF & REGISTRY.JSON, or boot it in QEMU / VirtualBox!`,
    'Bootable .ISO Image Exported',
  );
}

// ==================== METHOD 2C: NATIVE PWA STANDALONE OS INSTALLER & HARDWARE FULLSCREEN ====================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPwaPrompt: BeforeInstallPromptEvent | null = null;
let isStandaloneOsMode = false;
let isOfflineMode = typeof navigator !== 'undefined' ? !navigator.onLine : false;

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

  // Hide the persistent taskbar install button when already installed/running as a standalone PWA
  if (taskbarBtn) {
    taskbarBtn.style.display = isStandaloneOsMode ? 'none' : 'inline-flex';
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
      'Gemini 95 is currently running as a Standalone Installed OS App on your device! Use "Fullscreen Hardware Lock" for 100% edge-to-edge CRT immersion.',
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

  // Helpful guidance when inside AI Studio preview iframe or browser where prompt hasn't fired yet
  const iosModal = document.getElementById('pwa-ios-modal');
  const bodyEl = document.getElementById('pwa-guide-body');
  if (iosModal && bodyEl) {
    bodyEl.innerHTML = `
      <p style="margin:0 0 8px 0;">To install <b>Gemini 95</b> directly onto your computer's Desktop / Start Menu / Dock as a native standalone OS app:</p>
      <ol style="margin:0 0 10px 18px;padding:0;line-height:1.5;">
        <li>Open this app's URL in its own top-level browser tab (click the <b>Open in New Tab ↗</b> icon in the top-right preview header if viewing inside an iframe).</li>
        <li>Click the <b>Install Gemini 95 (🖥️ / ⊕)</b> icon in Chrome or Edge's address bar — or click <b>📲 Install OS</b> on the Gemini 95 taskbar!</li>
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
