// Angel-OS Physical Booter Modal, Windows Boot Manager Helper, Partition Setup & Always-Local-Account Sign-In
import { DEFAULT_SYSTEM_REGISTRY, LocalUserAccount } from './osSystemCore';
import {
  downloadBootableIsoImage,
  downloadBootableUsbDiskImage,
  downloadPhysicalHostBooterFile,
  downloadPortableHostApp,
  isPrimaryBootable,
  partitionTable,
  repairBootablePrimaryPartition,
  triggerNativePwaInstall,
} from './osDualInstall';
import {
  applySystemRegistryToOS,
  getOsBridge,
  renderMasterSettingsCurrentTab,
  systemRegistry,
} from './osExtendedApps';

export interface PhysicalBooterCallbacks {
  onEnterBootManager: () => void;
  onOpenSetup: () => void;
  onOpenFdisk: (withGuide?: boolean) => void;
  onOpenCmos: () => void;
  onReboot: () => void;
  onDesktopUnlocked: () => void;
}

let booterCbs: PhysicalBooterCallbacks | null = null;
let signInClockTimerId: number | null = null;
let selectedSignInUsername: string | null = null;

export function getActiveLocalUser(): LocalUserAccount {
  const list = systemRegistry.localAccounts?.length
    ? systemRegistry.localAccounts
    : DEFAULT_SYSTEM_REGISTRY.localAccounts;
  return list.find((a) => a.username === systemRegistry.activeLocalAccount) || list[0];
}

export function upsertLocalAccount(
  username: string,
  secret = '',
  role: 'Administrator' | 'Standard' = 'Administrator',
): LocalUserAccount {
  const cleanName = username.trim().replace(/[\\/:*?"<>|]/g, '') || 'Michael';
  if (!Array.isArray(systemRegistry.localAccounts) || systemRegistry.localAccounts.length === 0) {
    systemRegistry.localAccounts = DEFAULT_SYSTEM_REGISTRY.localAccounts.map((a) => ({ ...a }));
  }
  let existing = systemRegistry.localAccounts.find(
    (a) => a.username.toLowerCase() === cleanName.toLowerCase(),
  );
  if (existing) {
    existing.displayName = cleanName;
    if (secret !== '') {
      existing.pin = secret;
      existing.password = secret;
    }
  } else {
    existing = {
      username: cleanName,
      displayName: cleanName,
      avatar: role === 'Administrator' ? '🧑‍💻' : '👤',
      role,
      password: secret,
      pin: secret,
      homeDir: `C:\\Users\\${cleanName}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    systemRegistry.localAccounts.push(existing);
  }
  systemRegistry.activeLocalAccount = existing.username;
  ensureLocalAccountFolders(existing.username);
  applySystemRegistryToOS();
  syncLocalAccountStartPill();
  return existing;
}

export function ensureLocalAccountFolders(username: string): void {
  const bridge = getOsBridge();
  if (!bridge) return;
  const files = bridge.getVfsFiles();
  if (!files.some((f) => f.type === 'folder' && f.parent === 'C:\\' && f.name === 'Users')) {
    bridge.addVfsFile('Users', 'folder', 'C:\\');
  }
  if (!files.some((f) => f.type === 'folder' && f.parent === 'C:\\Users' && f.name.toLowerCase() === username.toLowerCase())) {
    bridge.addVfsFile(username, 'folder', 'C:\\Users');
  }
  bridge.refreshExplorerIfOpen();
}

export function syncLocalAccountStartPill(): void {
  const acct = getActiveLocalUser();
  const lbl = document.getElementById('start-user-label');
  if (lbl) {
    lbl.textContent = `${acct.avatar} ${acct.displayName} · Local Account`;
  }
}

export function renderBootManagerOptions(): void {
  const desc = document.getElementById('bootmgr-normal-desc');
  const acct = getActiveLocalUser();
  const target = systemRegistry.selectedInstallTargetPartition || 'C:';
  const size = target === 'D:' && partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB : partitionTable.primaryC.sizeMB;
  if (desc) {
    desc.textContent = `Volume ${target}\\ (${size} MB · ${systemRegistry.fileSystemFormat}) · Sign-in: ${acct.displayName} (Local Account Always)`;
  }
}

function updateSignInLockClock(): void {
  const clockEl = document.getElementById('signin-lock-clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${now.toLocaleDateString()}`;
}

function renderSignInSelectedAccount(): void {
  const list = systemRegistry.localAccounts?.length
    ? systemRegistry.localAccounts
    : DEFAULT_SYSTEM_REGISTRY.localAccounts;
  const currentName = selectedSignInUsername || systemRegistry.activeLocalAccount || list[0].username;
  const acct = list.find((a) => a.username === currentName) || list[0];
  selectedSignInUsername = acct.username;

  const av = document.getElementById('signin-avatar');
  const nameEl = document.getElementById('signin-displayname');
  const metaEl = document.getElementById('signin-user-meta');
  const hintEl = document.getElementById('signin-auth-hint');
  const secretInp = document.getElementById('signin-secret-input') as HTMLInputElement | null;
  const errEl = document.getElementById('signin-error-msg');
  const listEl = document.getElementById('signin-accounts-list');

  const hasSecret = Boolean(acct.password || acct.pin);
  if (av) av.textContent = acct.avatar || '🧑‍💻';
  if (nameEl) nameEl.textContent = acct.displayName;
  if (metaEl) metaEl.textContent = `Local Account Always · ${acct.role} · ${acct.homeDir}`;
  if (hintEl) {
    hintEl.textContent = hasSecret
      ? 'Enter local Password / PIN set for this offline account, then click ➔'
      : 'No local password required — click ➔ or press Enter for instant local sign-in';
  }
  if (secretInp) {
    secretInp.value = '';
    secretInp.placeholder = hasSecret
      ? `Password / PIN for ${acct.displayName}`
      : 'Optional Password / PIN (leave blank for instant sign in)';
  }
  if (errEl) errEl.style.display = 'none';

  if (listEl) {
    listEl.innerHTML = '';
    list.forEach((u) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `signin-acct-chip${u.username === acct.username ? ' active' : ''}`;
      chip.dataset.localUser = u.username;
      chip.innerHTML = `
        <span style="font-size:1.3rem;">${u.avatar || '👤'}</span>
        <span>
          <span class="signin-acct-chip-name">${u.displayName}</span>
          <span class="signin-acct-chip-sub">${u.role} · Local Account Always</span>
        </span>
      `;
      chip.addEventListener('click', () => {
        getOsBridge()?.sfx.playClick();
        selectedSignInUsername = u.username;
        renderSignInSelectedAccount();
      });
      listEl.appendChild(chip);
    });
  }
}

export function openLocalSignInScreen(): void {
  const screen = document.getElementById('os-signin-screen');
  if (!screen) return;
  selectedSignInUsername = systemRegistry.activeLocalAccount || 'Michael';
  renderSignInSelectedAccount();
  updateSignInLockClock();
  screen.style.display = 'flex';
  if (signInClockTimerId !== null) clearInterval(signInClockTimerId);
  signInClockTimerId = window.setInterval(updateSignInLockClock, 1000);
}

export function closeLocalSignInScreen(): void {
  const screen = document.getElementById('os-signin-screen');
  if (screen) screen.style.display = 'none';
  if (signInClockTimerId !== null) {
    clearInterval(signInClockTimerId);
    signInClockTimerId = null;
  }
}

function attemptLocalSignIn(allowBypassEmpty = false): void {
  const list = systemRegistry.localAccounts?.length
    ? systemRegistry.localAccounts
    : DEFAULT_SYSTEM_REGISTRY.localAccounts;
  const acct = list.find((a) => a.username === (selectedSignInUsername || systemRegistry.activeLocalAccount)) || list[0];
  const secretInp = document.getElementById('signin-secret-input') as HTMLInputElement | null;
  const errEl = document.getElementById('signin-error-msg');
  const typed = secretInp?.value ?? '';

  const requiredSecret = acct.password || acct.pin;
  if (requiredSecret && !allowBypassEmpty && typed !== requiredSecret) {
    getOsBridge()?.sfx.playChordError();
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = `Incorrect password/PIN for Local Account "${acct.displayName}".`;
    }
    return;
  }
  if (requiredSecret && allowBypassEmpty && typed !== requiredSecret) {
    // When a password/PIN was explicitly configured by the user, require it rather than bypassing
    getOsBridge()?.sfx.playChordError();
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = `Local Account "${acct.displayName}" requires its Password/PIN.`;
    }
    secretInp?.focus();
    return;
  }

  systemRegistry.activeLocalAccount = acct.username;
  ensureLocalAccountFolders(acct.username);
  applySystemRegistryToOS();
  syncLocalAccountStartPill();
  renderMasterSettingsCurrentTab();
  closeLocalSignInScreen();
  getOsBridge()?.sfx.playStartupChime();
  booterCbs?.onDesktopUnlocked();
}

export function openPhysicalBooterModal(): void {
  const modal = document.getElementById('physical-booter-modal');
  if (!modal) return;
  getOsBridge()?.sfx.playWindowOpen();
  const metaEl = document.getElementById('phys-booter-live-summary');
  if (metaEl) {
    const acct = getActiveLocalUser();
    metaEl.textContent =
      `Target Partition: ${systemRegistry.selectedInstallTargetPartition || 'C:'} (${partitionTable.primaryC.sizeMB} MB ${systemRegistry.fileSystemFormat}) · ` +
      `MBR 0x55AA: ${isPrimaryBootable() ? 'READY' : 'REPAIR NEEDED'} · ` +
      `Account: ${acct.displayName} (Local Account Always)`;
  }
  modal.style.display = 'flex';
}

export function renderOsSetupPartitionOptionsUI(): void {
  const tbody = document.getElementById('os-setup-partitions-tbody');
  const label = document.getElementById('os-setup-selected-part-label');
  const fsSel = document.getElementById('os-setup-fs-select') as HTMLSelectElement | null;
  const bootSel = document.getElementById('os-setup-bootloader-select') as HTMLSelectElement | null;
  const userInp = document.getElementById('os-setup-username') as HTMLInputElement | null;

  if (fsSel) fsSel.value = systemRegistry.fileSystemFormat;
  if (bootSel) bootSel.value = systemRegistry.selectedBootloaderMode || 'win_hybrid_mbr';
  if (userInp && document.activeElement !== userInp) {
    userInp.value = systemRegistry.activeLocalAccount || 'Michael';
  }

  if (!tbody) return;
  const target = systemRegistry.selectedInstallTargetPartition || 'C:';
  if (label) {
    label.textContent = `Install Target: Drive ${target}\\ (${systemRegistry.fileSystemFormat} · ${systemRegistry.selectedBootloaderMode === 'win_hybrid_mbr' ? 'Win Boot Manager + Local Sign-In' : 'Classic 95 MBR'})`;
  }

  const rows: Array<{ drive: 'C:' | 'D:' | 'UNALLOC'; name: string; status: string; sizeFs: string; actionNote: string }> = [];
  if (partitionTable.primaryC.exists) {
    rows.push({
      drive: 'C:',
      name: `Disk 0 Partition 1: C:\\ (${partitionTable.primaryC.label})`,
      status: `${partitionTable.primaryC.active ? 'Primary · Active (0x80)' : 'Primary · Inactive'}${partitionTable.primaryC.formatted ? '' : ' · RAW'}`,
      sizeFs: `${partitionTable.primaryC.sizeMB} MB · ${partitionTable.primaryC.formatted ? partitionTable.primaryC.fileSystem : 'Unformatted'}`,
      actionNote: 'Boot & System OS Partition',
    });
  }
  if (partitionTable.logicalD.exists) {
    rows.push({
      drive: 'D:',
      name: `Disk 0 Partition 2: D:\\ (${partitionTable.logicalD.label})`,
      status: `Logical Extended${partitionTable.logicalD.formatted ? ' · Formatted' : ' · RAW'}`,
      sizeFs: `${partitionTable.logicalD.sizeMB} MB · ${partitionTable.logicalD.fileSystem}`,
      actionNote: 'Secondary / Clean Data Install',
    });
  }
  const freeMB = Math.max(
    0,
    partitionTable.totalDiskMB -
      (partitionTable.primaryC.exists ? partitionTable.primaryC.sizeMB : 0) -
      (partitionTable.logicalD.exists ? partitionTable.logicalD.sizeMB : 0),
  );
  if (freeMB > 0 || rows.length === 0) {
    rows.push({
      drive: 'UNALLOC',
      name: 'Disk 0 Unallocated Space',
      status: 'Unpartitioned',
      sizeFs: `${freeMB || partitionTable.totalDiskMB} MB · Raw`,
      actionNote: 'Click "+ Ensure Dual Partitions"',
    });
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr class="os-setup-part-row${r.drive === target ? ' selected' : ''}" data-part-drive="${r.drive}">
        <td><b>${r.name}</b></td>
        <td>${r.status}</td>
        <td>${r.sizeFs}</td>
        <td>${r.drive === target ? '✓ TARGET SELECTED' : r.actionNote}</td>
      </tr>
    `,
    )
    .join('');

  tbody.querySelectorAll<HTMLTableRowElement>('.os-setup-part-row').forEach((tr) => {
    tr.addEventListener('click', () => {
      const drv = tr.dataset.partDrive;
      if (drv === 'C:' || drv === 'D:') {
        getOsBridge()?.sfx.playClick();
        systemRegistry.selectedInstallTargetPartition = drv;
        renderOsSetupPartitionOptionsUI();
      }
    });
  });
}

export function initPhysicalBooterAndSignIn(callbacks: PhysicalBooterCallbacks): void {
  booterCbs = callbacks;

  // Local Sign-In Screen Listeners
  document.getElementById('signin-submit-btn')?.addEventListener('click', () => attemptLocalSignIn(false));
  document.getElementById('signin-quick-desk-btn')?.addEventListener('click', () => attemptLocalSignIn(true));
  document.getElementById('signin-secret-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      attemptLocalSignIn(false);
    }
  });

  document.getElementById('signin-new-acct-btn')?.addEventListener('click', () => {
    const p = document.getElementById('signin-create-panel');
    if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('signin-create-save-btn')?.addEventListener('click', () => {
    const nameEl = document.getElementById('signin-create-name') as HTMLInputElement | null;
    const pinEl = document.getElementById('signin-create-pin') as HTMLInputElement | null;
    const username = nameEl?.value.trim() || '';
    if (!username) {
      getOsBridge()?.sfx.playChordError();
      return;
    }
    const acct = upsertLocalAccount(username, pinEl?.value || '', 'Standard');
    selectedSignInUsername = acct.username;
    const panel = document.getElementById('signin-create-panel');
    if (panel) panel.style.display = 'none';
    if (nameEl) nameEl.value = '';
    if (pinEl) pinEl.value = '';
    renderSignInSelectedAccount();
    closeLocalSignInScreen();
    booterCbs?.onDesktopUnlocked();
  });

  document.getElementById('signin-open-booter-btn')?.addEventListener('click', () => openPhysicalBooterModal());
  document.getElementById('signin-open-setup-btn')?.addEventListener('click', () => {
    closeLocalSignInScreen();
    booterCbs?.onOpenSetup();
  });
  document.getElementById('signin-open-bootmgr-btn')?.addEventListener('click', () => {
    closeLocalSignInScreen();
    booterCbs?.onEnterBootManager();
  });
  document.getElementById('signin-reboot-bios-btn')?.addEventListener('click', () => {
    closeLocalSignInScreen();
    booterCbs?.onReboot();
  });

  // Start Menu Account Pill & Lock / Physical Booter Listeners
  document.getElementById('start-user-pill-btn')?.addEventListener('click', () => {
    document.getElementById('start-menu')?.classList.remove('active');
    openLocalSignInScreen();
  });
  document.getElementById('start-lock-signin')?.addEventListener('click', () => {
    document.getElementById('start-menu')?.classList.remove('active');
    const pm = document.getElementById('start-power-menu');
    if (pm) pm.style.display = 'none';
    openLocalSignInScreen();
  });
  document.getElementById('start-physical-booter')?.addEventListener('click', () => {
    document.getElementById('start-menu')?.classList.remove('active');
    openPhysicalBooterModal();
  });

  // OS Setup Partition Options Controls
  document.getElementById('os-setup-fs-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value as 'FAT16' | 'FAT32';
    systemRegistry.fileSystemFormat = val;
    partitionTable.primaryC.fileSystem = val;
    partitionTable.logicalD.fileSystem = val;
    applySystemRegistryToOS();
    renderOsSetupPartitionOptionsUI();
  });
  document.getElementById('os-setup-bootloader-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value as 'win_hybrid_mbr' | 'legacy_95_mbr';
    systemRegistry.selectedBootloaderMode = val;
    systemRegistry.enableBootManagerOnBoot = val === 'win_hybrid_mbr';
    systemRegistry.requireSignInOnBoot = val === 'win_hybrid_mbr';
    applySystemRegistryToOS();
    renderOsSetupPartitionOptionsUI();
  });
  document.getElementById('os-setup-part-new-btn')?.addEventListener('click', () => {
    repairBootablePrimaryPartition();
    renderOsSetupPartitionOptionsUI();
  });
  document.getElementById('os-setup-part-fmt-btn')?.addEventListener('click', () => {
    getOsBridge()?.sfx.playFloppySeek();
    const target = systemRegistry.selectedInstallTargetPartition || 'C:';
    if (target === 'D:') {
      partitionTable.logicalD.exists = true;
      partitionTable.logicalD.formatted = true;
      partitionTable.logicalD.fileSystem = systemRegistry.fileSystemFormat;
    } else {
      partitionTable.primaryC.exists = true;
      partitionTable.primaryC.formatted = true;
      partitionTable.primaryC.fileSystem = systemRegistry.fileSystemFormat;
    }
    applySystemRegistryToOS();
    renderOsSetupPartitionOptionsUI();
  });
  document.getElementById('os-setup-part-active-btn')?.addEventListener('click', () => {
    partitionTable.primaryC.exists = true;
    partitionTable.primaryC.active = true;
    partitionTable.mbrSignatureValid = true;
    applySystemRegistryToOS();
    renderOsSetupPartitionOptionsUI();
  });
  document.getElementById('os-setup-physical-btn')?.addEventListener('click', () => openPhysicalBooterModal());

  // Physical Booter Modal Listeners
  document.getElementById('phys-booter-close-btn')?.addEventListener('click', () => {
    const m = document.getElementById('physical-booter-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('phys-booter-ok-btn')?.addEventListener('click', () => {
    const m = document.getElementById('physical-booter-modal');
    if (m) m.style.display = 'none';
  });
  document.getElementById('phys-booter-dl-iso')?.addEventListener('click', () => downloadBootableIsoImage());
  document.getElementById('phys-booter-dl-usb')?.addEventListener('click', () => downloadBootableUsbDiskImage());
  document.getElementById('phys-booter-dl-linux')?.addEventListener('click', () => downloadPhysicalHostBooterFile('linux_sh'));
  document.getElementById('phys-booter-dl-win')?.addEventListener('click', () => downloadPhysicalHostBooterFile('windows_ps1'));
  document.getElementById('phys-booter-dl-py')?.addEventListener('click', () => downloadPhysicalHostBooterFile('python_builder'));
  document.getElementById('phys-booter-dl-html')?.addEventListener('click', () => downloadPortableHostApp('html'));
  document.getElementById('phys-booter-dl-pwa')?.addEventListener('click', () => triggerNativePwaInstall());

  syncLocalAccountStartPill();
  renderOsSetupPartitionOptionsUI();
  renderBootManagerOptions();
}
