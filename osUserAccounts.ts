/**
 * Angel OS v2.0.0 — Private User Accounts, Firebase Cloud Sync & Windows-Style OOBE
 *
 * Guarantees strict per-user isolation:
 *  - Cloud Accounts (Firebase Google Auth + Firestore): Each user's workspace is
 *    stored exclusively at /users/{uid}/saves/primary (owner-only rules).
 *  - Local Offline Accounts: Each local user's workspace is stored in an isolated
 *    localStorage bucket (angelos_v2_save_<profileId>). No pre-seeded default accounts!
 *  - Temporary Guest: Strictly ephemeral in-memory session; prompts OOBE again next visit.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { DEFAULT_SYSTEM_REGISTRY, type BrowserBookmark, type SystemRegistry } from './osSystemCore';

// ==================== FIREBASE INIT & STRUCTURED ERROR HANDLING ====================
const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(firebaseApp);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

function esc(str: string): string {
  return String(str || '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c),
  );
}

// ==================== TYPES & LOCAL PROFILE ISOLATION ====================
export interface SavedVfsUserFile {
  name: string;
  parent: string;
  type: 'text' | 'image';
  content: string;
}

export interface SavedStickyNote {
  id: string;
  text: string;
  color: 'yellow' | 'cyan' | 'pink' | 'lime';
  x: number;
  y: number;
}

export interface AngelOsWorkspaceSnapshot {
  schemaVersion: number;
  registry: Partial<SystemRegistry>;
  installedPkgIds: string[];
  vfsUserFiles: SavedVfsUserFile[];
  bookmarks: BrowserBookmark[];
  stickies: SavedStickyNote[];
  taskbarOrder: string[];
  unlockedTrophies: string[];
}

export interface LocalOfflineProfile {
  profileId: string;
  username: string;
  displayName: string;
  avatar: string;
  pin: string;
  createdAt: string;
}

export interface ActiveSessionIdentity {
  mode: 'firebase' | 'local' | 'guest';
  id: string;
  displayName: string;
  email?: string;
  avatar: string;
  photoURL?: string;
}

export interface UserSessionHooks {
  captureWorkspaceSnapshot: () => AngelOsWorkspaceSnapshot;
  hydrateWorkspaceSnapshot: (snapshot: AngelOsWorkspaceSnapshot | null, identity: ActiveSessionIdentity) => void;
  resetWorkspaceToCleanDefaults: () => void;
  onSessionReady: (identity: ActiveSessionIdentity, isReturning: boolean) => void;
  onSignOutComplete: () => void;
  playClick: () => void;
  playStartupChime: () => void;
  pushToast: (title: string, msg: string, icon?: string) => void;
}

const LOCAL_PROFILES_INDEX_KEY = 'angelos_v2_local_profiles';
const LOCAL_REMEMBERED_ID_KEY = 'angelos_v2_remembered_local_id';
const LOCAL_SAVE_PREFIX = 'angelos_v2_save_';

let hooks: UserSessionHooks | null = null;
let currentSession: ActiveSessionIdentity | null = null;
let saveDebounceTimer: number | null = null;
let firebaseInitialized = false;
let currentFirebaseUser: User | null = null;

// ==================== LOCAL PROFILE STORAGE HELPERS ====================
export function loadLocalOfflineProfiles(): LocalOfflineProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.profileId === 'string' &&
        typeof p.username === 'string' &&
        p.username.toLowerCase() !== 'michael' &&
        p.username.toLowerCase() !== 'guest95',
    );
  } catch {
    return [];
  }
}

function saveLocalOfflineProfiles(list: LocalOfflineProfile[]): void {
  try {
    localStorage.setItem(LOCAL_PROFILES_INDEX_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota
  }
}

function loadLocalProfileSnapshot(profileId: string): AngelOsWorkspaceSnapshot | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_SAVE_PREFIX}${profileId}`);
    if (!raw) return null;
    return JSON.parse(raw) as AngelOsWorkspaceSnapshot;
  } catch {
    return null;
  }
}

function saveLocalProfileSnapshot(profileId: string, snapshot: AngelOsWorkspaceSnapshot): void {
  try {
    localStorage.setItem(`${LOCAL_SAVE_PREFIX}${profileId}`, JSON.stringify(snapshot));
  } catch {
    // ignore storage quota
  }
}

export function deleteLocalOfflineProfile(profileId: string): void {
  const list = loadLocalOfflineProfiles().filter((p) => p.profileId !== profileId);
  saveLocalOfflineProfiles(list);
  try {
    localStorage.removeItem(`${LOCAL_SAVE_PREFIX}${profileId}`);
    if (localStorage.getItem(LOCAL_REMEMBERED_ID_KEY) === profileId) {
      localStorage.removeItem(LOCAL_REMEMBERED_ID_KEY);
    }
  } catch {
    // ignore
  }
}

// ==================== PAYLOAD SANITIZATION (BLUEPRINT LIMITS) ====================
function sanitizeSnapshotForFirestore(snapshot: AngelOsWorkspaceSnapshot): AngelOsWorkspaceSnapshot {
  // Strip localAccounts/activeLocalAccount from cloud registry so cloud saves stay clean & bounded
  const cleanReg: Record<string, any> = {};
  const srcReg = snapshot.registry || {};
  const allowedRegKeys = Object.keys(DEFAULT_SYSTEM_REGISTRY).filter(
    (k) => k !== 'localAccounts' && k !== 'activeLocalAccount',
  );
  for (const key of allowedRegKeys) {
    const val = (srcReg as any)[key];
    if (typeof val === 'string') {
      cleanReg[key] = val.slice(0, 128);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      cleanReg[key] = val;
    }
  }

  const installedPkgIds = Array.from(new Set(snapshot.installedPkgIds || []))
    .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 128)
    .slice(0, 600);

  // Keep user-created text documents bounded (skip huge data-URI images to stay well under 1MB Firestore limit)
  const vfsUserFiles = (snapshot.vfsUserFiles || [])
    .filter((f) => f && f.type === 'text' && typeof f.name === 'string' && typeof f.content === 'string')
    .slice(0, 80)
    .map((f) => ({
      name: f.name.slice(0, 96),
      parent: (f.parent || 'C:\\Documents').slice(0, 96),
      type: 'text' as const,
      content: f.content.slice(0, 4000),
    }));

  const bookmarks: BrowserBookmark[] = (snapshot.bookmarks || []).slice(0, 60).map((b) => ({
    title: String(b.title || 'Link').slice(0, 64),
    url: String(b.url || '').slice(0, 256),
    mode: b.mode === 'ai' ? 'ai' : 'live',
  }));

  const stickies = (snapshot.stickies || []).slice(0, 30).map((s) => ({
    id: String(s.id || '').slice(0, 64),
    text: String(s.text || '').slice(0, 600),
    color: (['yellow', 'cyan', 'pink', 'lime'].includes(s.color) ? s.color : 'yellow') as SavedStickyNote['color'],
    x: Number(s.x) || 260,
    y: Number(s.y) || 80,
  }));

  const taskbarOrder = (snapshot.taskbarOrder || [])
    .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 128)
    .slice(0, 60);

  const unlockedTrophies = (snapshot.unlockedTrophies || [])
    .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 128)
    .slice(0, 100);

  return {
    schemaVersion: 2,
    registry: cleanReg,
    installedPkgIds,
    vfsUserFiles,
    bookmarks,
    stickies,
    taskbarOrder,
    unlockedTrophies,
  };
}

// ==================== FIRESTORE CLOUD READ / WRITE ====================
async function fetchCloudProfileAndSave(
  user: User,
): Promise<{ exists: boolean; displayName: string; snapshot: AngelOsWorkspaceSnapshot | null }> {
  const userPath = `users/${user.uid}`;
  const savePath = `users/${user.uid}/saves/primary`;

  let profileSnap;
  try {
    profileSnap = await getDoc(doc(db, 'users', user.uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (!profileSnap.exists()) {
    return {
      exists: false,
      displayName: (user.displayName || user.email?.split('@')[0] || 'Angel User').slice(0, 64),
      snapshot: null,
    };
  }

  let saveSnap;
  try {
    saveSnap = await getDoc(doc(db, 'users', user.uid, 'saves', 'primary'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, savePath);
  }

  const profileData = profileSnap.data();
  const displayName = String(profileData?.displayName || user.displayName || 'Angel User').slice(0, 64);
  if (!saveSnap.exists()) {
    return { exists: true, displayName, snapshot: null };
  }
  const sd = saveSnap.data();
  const snapshot: AngelOsWorkspaceSnapshot = {
    schemaVersion: Number(sd.schemaVersion) || 2,
    registry: (sd.registry && typeof sd.registry === 'object' ? sd.registry : {}) as Partial<SystemRegistry>,
    installedPkgIds: Array.isArray(sd.installedPkgIds) ? sd.installedPkgIds : [],
    vfsUserFiles: Array.isArray(sd.vfsUserFiles) ? sd.vfsUserFiles : [],
    bookmarks: Array.isArray(sd.bookmarks) ? sd.bookmarks : [],
    stickies: Array.isArray(sd.stickies) ? sd.stickies : [],
    taskbarOrder: Array.isArray(sd.taskbarOrder) ? sd.taskbarOrder : [],
    unlockedTrophies: Array.isArray(sd.unlockedTrophies) ? sd.unlockedTrophies : [],
  };
  return { exists: true, displayName, snapshot };
}

async function createInitialCloudAccountAtomic(
  user: User,
  displayName: string,
  themePreset: string,
  snapshot: AngelOsWorkspaceSnapshot,
): Promise<void> {
  const cleanSnap = sanitizeSnapshotForFirestore(snapshot);
  const safeName = (displayName.trim() || user.displayName || 'Angel User').slice(0, 64);
  const safeEmail = (user.email || '').slice(0, 160);
  const safePhoto = (user.photoURL || '👼').slice(0, 512);
  const safeTheme = (themePreset || 'standard').slice(0, 32);

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', user.uid);
  const saveRef = doc(db, 'users', user.uid, 'saves', 'primary');

  batch.set(userRef, {
    uid: user.uid,
    displayName: safeName,
    email: safeEmail,
    photoURL: safePhoto,
    themePreset: safeTheme,
    oobeCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(saveRef, {
    uid: user.uid,
    schemaVersion: cleanSnap.schemaVersion,
    registry: cleanSnap.registry,
    installedPkgIds: cleanSnap.installedPkgIds,
    vfsUserFiles: cleanSnap.vfsUserFiles,
    bookmarks: cleanSnap.bookmarks,
    stickies: cleanSnap.stickies,
    taskbarOrder: cleanSnap.taskbarOrder,
    unlockedTrophies: cleanSnap.unlockedTrophies,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/saves/primary`);
  }
}

async function persistCloudWorkspaceUpdate(user: User, snapshot: AngelOsWorkspaceSnapshot): Promise<void> {
  const cleanSnap = sanitizeSnapshotForFirestore(snapshot);
  const saveRef = doc(db, 'users', user.uid, 'saves', 'primary');
  const savePath = `users/${user.uid}/saves/primary`;

  let existingSave;
  try {
    existingSave = await getDoc(saveRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, savePath);
  }

  try {
    if (existingSave.exists()) {
      await setDoc(
        saveRef,
        {
          schemaVersion: cleanSnap.schemaVersion,
          registry: cleanSnap.registry,
          installedPkgIds: cleanSnap.installedPkgIds,
          vfsUserFiles: cleanSnap.vfsUserFiles,
          bookmarks: cleanSnap.bookmarks,
          stickies: cleanSnap.stickies,
          taskbarOrder: cleanSnap.taskbarOrder,
          unlockedTrophies: cleanSnap.unlockedTrophies,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await setDoc(saveRef, {
        uid: user.uid,
        schemaVersion: cleanSnap.schemaVersion,
        registry: cleanSnap.registry,
        installedPkgIds: cleanSnap.installedPkgIds,
        vfsUserFiles: cleanSnap.vfsUserFiles,
        bookmarks: cleanSnap.bookmarks,
        stickies: cleanSnap.stickies,
        taskbarOrder: cleanSnap.taskbarOrder,
        unlockedTrophies: cleanSnap.unlockedTrophies,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, savePath);
  }
}

// ==================== PUBLIC SESSION & SAVE API ====================
export function getActiveSessionIdentity(): ActiveSessionIdentity | null {
  return currentSession;
}

export function syncAccountStatusUI(): void {
  const lbl = document.getElementById('start-user-label');
  const syncBadge = document.getElementById('start-sync-badge');
  const id = currentSession;
  if (!id) {
    if (lbl) lbl.textContent = 'Not signed in';
    if (syncBadge) syncBadge.textContent = '';
    return;
  }
  const modeTag =
    id.mode === 'firebase' ? 'Google Cloud Save' : id.mode === 'local' ? 'Local Profile' : 'Guest Session';
  if (lbl) lbl.textContent = `${id.avatar} ${id.displayName} · ${modeTag}`;
  if (syncBadge) {
    syncBadge.textContent = id.mode === 'firebase' ? 'Cloud Synced' : id.mode === 'local' ? 'Local Only' : 'Unsaved';
  }
}

export function scheduleActiveUserSave(immediate = false): void {
  if (!hooks || !currentSession || currentSession.mode === 'guest') return;
  if (saveDebounceTimer !== null) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  const runSave = async () => {
    if (!hooks || !currentSession || currentSession.mode === 'guest') return;
    const snap = hooks.captureWorkspaceSnapshot();
    if (currentSession.mode === 'local') {
      saveLocalProfileSnapshot(currentSession.id, snap);
      return;
    }
    if (currentSession.mode === 'firebase' && auth.currentUser) {
      try {
        await persistCloudWorkspaceUpdate(auth.currentUser, snap);
      } catch (err) {
        console.warn('[Angel OS Cloud Save] Failed to sync save:', err);
      }
    }
  };

  if (immediate || currentSession.mode === 'local') {
    void runSave();
  } else {
    saveDebounceTimer = window.setTimeout(() => {
      saveDebounceTimer = null;
      void runSave();
    }, 1200);
  }
}

export async function forceActiveUserSaveNow(): Promise<void> {
  if (!hooks || !currentSession) return;
  if (currentSession.mode === 'guest') {
    hooks.pushToast('Guest Session', 'Sign in with Google or create a local profile to save your workspace.', '👤');
    return;
  }
  const snap = hooks.captureWorkspaceSnapshot();
  if (currentSession.mode === 'local') {
    saveLocalProfileSnapshot(currentSession.id, snap);
    hooks.pushToast('Local Save Updated', `Saved workspace for ${currentSession.displayName}.`, '💾');
    return;
  }
  if (currentSession.mode === 'firebase' && auth.currentUser) {
    try {
      await persistCloudWorkspaceUpdate(auth.currentUser, snap);
      hooks.pushToast('Cloud Save Synced', `Private workspace synced for ${currentSession.displayName}.`, '☁️');
    } catch (err) {
      console.warn('[Angel OS Cloud Save] Manual sync failed:', err);
      hooks.pushToast('Cloud Sync Issue', 'Could not reach Firestore right now. Will retry automatically.', '⚠️');
    }
  }
}

export async function signOutActiveAccount(openOobeIfEmpty = true): Promise<void> {
  if (saveDebounceTimer !== null) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  // Flush final save before signing out
  if (hooks && currentSession && currentSession.mode !== 'guest') {
    const snap = hooks.captureWorkspaceSnapshot();
    if (currentSession.mode === 'local') {
      saveLocalProfileSnapshot(currentSession.id, snap);
    } else if (currentSession.mode === 'firebase' && auth.currentUser) {
      try {
        await persistCloudWorkspaceUpdate(auth.currentUser, snap);
      } catch {
        // continue sign out cleanly
      }
    }
  }

  if (auth.currentUser) {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }

  try {
    localStorage.removeItem(LOCAL_REMEMBERED_ID_KEY);
  } catch {
    // ignore
  }

  currentSession = null;
  hooks?.resetWorkspaceToCleanDefaults();
  syncAccountStatusUI();
  hooks?.onSignOutComplete();

  const localProfiles = loadLocalOfflineProfiles();
  if (openOobeIfEmpty || localProfiles.length === 0) {
    openOobeSetupWizard(false);
  } else {
    openAccountSignInChooser();
  }
}

// ==================== WINDOWS-STYLE FIRST-RUN OOBE WIZARD ====================
let oobeStep: 1 | 2 | 3 | 4 = 1;
let pendingOobeMode: 'firebase' | 'local' | 'guest' | null = null;
let pendingFirebaseUser: User | null = null;
let pendingLocalDraft: { username: string; avatar: string; pin: string } | null = null;
let selectedOobeTheme: SystemRegistry['themePreset'] = 'standard';
let selectedOobeBrowserMode: 'live' | 'ai' = 'live';

function hideAllAuthScreens(): void {
  const oobe = document.getElementById('oobe-setup-screen');
  const chooser = document.getElementById('angel-signin-chooser');
  const legacy = document.getElementById('os-signin-screen');
  if (oobe) oobe.style.display = 'none';
  if (chooser) chooser.style.display = 'none';
  if (legacy) legacy.style.display = 'none';
}

export function openOobeSetupWizard(allowBackToChooser = false): void {
  hideAllAuthScreens();
  const screen = document.getElementById('oobe-setup-screen');
  if (!screen) return;
  oobeStep = 1;
  pendingOobeMode = null;
  pendingFirebaseUser = null;
  pendingLocalDraft = null;
  screen.dataset.allowChooser = allowBackToChooser ? '1' : '0';
  screen.style.display = 'flex';
  renderOobeStep();
}

function renderOobeStep(): void {
  const stepContent = document.getElementById('oobe-step-content');
  const stepIndicator = document.getElementById('oobe-step-indicator');
  if (!stepContent) return;

  if (stepIndicator) {
    stepIndicator.textContent = oobeStep <= 3 ? `Step ${oobeStep} of 3` : 'Finalizing';
  }

  if (oobeStep === 1) {
    const existingLocals = loadLocalOfflineProfiles();
    stepContent.innerHTML = `
      <div class="oobe-eyebrow">Angel OS v2.0.0 · First-Time Setup</div>
      <h1 class="oobe-heading">Welcome to Angel OS</h1>
      <p class="oobe-copy">
        Let's set up your personal desktop workspace. Your apps, files, and settings stay strictly private to your own account and are remembered automatically whenever you return.
      </p>
      <div class="oobe-actions-row">
        <button type="button" class="oobe-btn-primary" id="oobe-next-1">Get Started</button>
        ${
          existingLocals.length > 0
            ? `<button type="button" class="oobe-btn-ghost" id="oobe-to-chooser">Sign in to existing local profile (${existingLocals.length})</button>`
            : ''
        }
      </div>
    `;
    stepContent.querySelector('#oobe-next-1')?.addEventListener('click', () => {
      hooks?.playClick();
      oobeStep = 2;
      renderOobeStep();
    });
    stepContent.querySelector('#oobe-to-chooser')?.addEventListener('click', () => {
      hooks?.playClick();
      openAccountSignInChooser();
    });
    return;
  }

  if (oobeStep === 2) {
    stepContent.innerHTML = `
      <div class="oobe-eyebrow">Account Setup</div>
      <h1 class="oobe-heading">Would you like to create an account?</h1>
      <p class="oobe-copy">
        Choose how Angel OS should recognize you on future visits. Other visitors will never see your files, installed apps, or preferences.
      </p>

      <div id="oobe-error-banner" class="oobe-error-banner" style="display:none;"></div>

      <div class="oobe-option-grid">
        <button type="button" class="oobe-choice-card is-recommended" id="oobe-google-btn">
          <div class="oobe-choice-top">
            <span class="oobe-choice-title">Sign in with Google</span>
            <span class="oobe-choice-meta">Recommended · Private Cloud Save</span>
          </div>
          <p class="oobe-choice-desc">
            Automatically recognizes you on every visit and syncs your Angel OS settings, 500-app installs, and documents privately in the cloud.
          </p>
        </button>

        <div class="oobe-choice-card" id="oobe-local-card">
          <div class="oobe-choice-top">
            <span class="oobe-choice-title">Create a Local Offline Account</span>
            <span class="oobe-choice-meta">This Browser Only · Isolated Profile</span>
          </div>
          <p class="oobe-choice-desc">
            Pick your own username and optional PIN. Stored privately inside an isolated profile on this device.
          </p>
          <div id="oobe-local-form" class="oobe-local-form" style="display:none;">
            <div class="oobe-form-row">
              <label for="oobe-local-user">Username</label>
              <input type="text" id="oobe-local-user" class="oobe-input" maxlength="28" placeholder="Enter your name..." autocomplete="off" />
            </div>
            <div class="oobe-form-row">
              <label for="oobe-local-pin">Optional Password / PIN (leave blank for instant login)</label>
              <input type="password" id="oobe-local-pin" class="oobe-input" maxlength="24" placeholder="Optional PIN or password" autocomplete="new-password" />
            </div>
            <div class="oobe-form-row">
              <label>Choose Avatar</label>
              <div class="oobe-avatar-row" id="oobe-avatar-row">
                ${['👼', '🧑‍💻', '🚀', '🎮', '🎨', '🦊', '⚡', '🌟']
                  .map((av, idx) => `<button type="button" class="oobe-avatar-btn${idx === 0 ? ' active' : ''}" data-av="${av}">${av}</button>`)
                  .join('')}
              </div>
            </div>
            <button type="button" class="oobe-btn-primary" id="oobe-local-continue">Continue with Local Account</button>
          </div>
          <button type="button" class="oobe-btn-secondary" id="oobe-local-expand">Set Up Local Account</button>
        </div>
      </div>

      <div class="oobe-footer-links">
        <button type="button" class="oobe-btn-ghost" id="oobe-back-1">Back</button>
        <button type="button" class="oobe-btn-ghost" id="oobe-guest-btn">Skip for now (Temporary Guest)</button>
      </div>
    `;

    const errBanner = stepContent.querySelector('#oobe-error-banner') as HTMLElement;
    const showErr = (msg: string) => {
      errBanner.textContent = msg;
      errBanner.style.display = 'block';
    };

    stepContent.querySelector('#oobe-back-1')?.addEventListener('click', () => {
      hooks?.playClick();
      oobeStep = 1;
      renderOobeStep();
    });

    const googleBtn = stepContent.querySelector('#oobe-google-btn') as HTMLButtonElement;
    googleBtn?.addEventListener('click', async () => {
      hooks?.playClick();
      errBanner.style.display = 'none';
      googleBtn.disabled = true;
      googleBtn.querySelector('.oobe-choice-meta')!.textContent = 'Opening Google Sign-In...';
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        const user = cred.user;
        currentFirebaseUser = user;

        // Check if this Google user ALREADY has a private Angel OS save!
        const cloud = await fetchCloudProfileAndSave(user);
        if (cloud.exists) {
          const identity: ActiveSessionIdentity = {
            mode: 'firebase',
            id: user.uid,
            displayName: cloud.displayName,
            email: user.email || '',
            avatar: '👼',
            photoURL: user.photoURL || undefined,
          };
          await enterDesktopWithSession(identity, cloud.snapshot, true);
          return;
        }

        // New Google user -> proceed to Step 3 Personalization
        pendingOobeMode = 'firebase';
        pendingFirebaseUser = user;
        oobeStep = 3;
        renderOobeStep();
      } catch (err: any) {
        googleBtn.disabled = false;
        googleBtn.querySelector('.oobe-choice-meta')!.textContent = 'Recommended · Private Cloud Save';
        const code = String(err?.code || '');
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          showErr('Google sign-in popup was closed. You can try again or create a local offline account below.');
        } else {
          showErr(`Could not complete Google sign-in (${err?.message || 'unknown error'}). You can retry or create a local offline account.`);
        }
      }
    });

    let pickedAvatar = '👼';
    const localExpand = stepContent.querySelector('#oobe-local-expand') as HTMLButtonElement;
    const localForm = stepContent.querySelector('#oobe-local-form') as HTMLElement;
    localExpand?.addEventListener('click', () => {
      hooks?.playClick();
      localExpand.style.display = 'none';
      localForm.style.display = 'flex';
      (stepContent.querySelector('#oobe-local-user') as HTMLInputElement | null)?.focus();
    });

    stepContent.querySelectorAll<HTMLButtonElement>('.oobe-avatar-btn').forEach((b) => {
      b.addEventListener('click', () => {
        pickedAvatar = b.dataset.av || '👼';
        stepContent.querySelectorAll('.oobe-avatar-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    stepContent.querySelector('#oobe-local-continue')?.addEventListener('click', () => {
      hooks?.playClick();
      const rawName = (stepContent.querySelector('#oobe-local-user') as HTMLInputElement)?.value.trim() || '';
      const cleanName = rawName.replace(/[\\/:*?"<>|]/g, '').trim();
      const pin = (stepContent.querySelector('#oobe-local-pin') as HTMLInputElement)?.value || '';
      if (!cleanName) {
        showErr('Please enter a username for your local account.');
        return;
      }
      pendingOobeMode = 'local';
      pendingLocalDraft = { username: cleanName, avatar: pickedAvatar, pin };
      oobeStep = 3;
      renderOobeStep();
    });

    stepContent.querySelector('#oobe-guest-btn')?.addEventListener('click', () => {
      hooks?.playClick();
      pendingOobeMode = 'guest';
      oobeStep = 3;
      renderOobeStep();
    });
    return;
  }

  if (oobeStep === 3) {
    const greetName =
      pendingOobeMode === 'firebase'
        ? pendingFirebaseUser?.displayName || pendingFirebaseUser?.email?.split('@')[0] || 'there'
        : pendingOobeMode === 'local'
          ? pendingLocalDraft?.username || 'there'
          : 'Guest';

    stepContent.innerHTML = `
      <div class="oobe-eyebrow">Personalize Your Desktop</div>
      <h1 class="oobe-heading">Make Angel OS yours, ${esc(greetName)}</h1>
      <p class="oobe-copy">
        Pick your starting desktop look and default browser mode. You can change any of these later in Settings &amp; Control.
      </p>

      <div class="oobe-pref-group">
        <div class="oobe-pref-label">Desktop Theme</div>
        <div class="oobe-seg-row" id="oobe-theme-row">
          ${[
            ['standard', 'Classic Teal'],
            ['cyberpunk', 'Dark Slate'],
            ['vaporwave', 'Vaporwave'],
            ['matrix', 'Matrix CRT'],
          ]
            .map(
              ([id, lbl]) =>
                `<button type="button" class="oobe-seg-btn${selectedOobeTheme === id ? ' active' : ''}" data-theme="${id}">${lbl}</button>`,
            )
            .join('')}
        </div>
      </div>

      <div class="oobe-pref-group">
        <div class="oobe-pref-label">Default Browser Engine Mode</div>
        <div class="oobe-seg-row" id="oobe-browser-row">
          <button type="button" class="oobe-seg-btn${selectedOobeBrowserMode === 'live' ? ' active' : ''}" data-bmode="live">Live Web Proxy</button>
          <button type="button" class="oobe-seg-btn${selectedOobeBrowserMode === 'ai' ? ' active' : ''}" data-bmode="ai">AI Time-Machine</button>
        </div>
      </div>

      <div class="oobe-footer-links">
        <button type="button" class="oobe-btn-ghost" id="oobe-back-2">Back</button>
        <button type="button" class="oobe-btn-primary" id="oobe-finish-btn">Finish Setup &amp; Open Desktop</button>
      </div>
    `;

    stepContent.querySelectorAll<HTMLButtonElement>('#oobe-theme-row .oobe-seg-btn').forEach((b) => {
      b.addEventListener('click', () => {
        selectedOobeTheme = (b.dataset.theme as SystemRegistry['themePreset']) || 'standard';
        stepContent.querySelectorAll('#oobe-theme-row .oobe-seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    stepContent.querySelectorAll<HTMLButtonElement>('#oobe-browser-row .oobe-seg-btn').forEach((b) => {
      b.addEventListener('click', () => {
        selectedOobeBrowserMode = b.dataset.bmode === 'ai' ? 'ai' : 'live';
        stepContent.querySelectorAll('#oobe-browser-row .oobe-seg-btn').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    stepContent.querySelector('#oobe-back-2')?.addEventListener('click', () => {
      hooks?.playClick();
      oobeStep = 2;
      renderOobeStep();
    });

    stepContent.querySelector('#oobe-finish-btn')?.addEventListener('click', async () => {
      hooks?.playClick();
      oobeStep = 4;
      renderOobeStep();
      await finalizeOobeAccount();
    });
    return;
  }

  // Step 4: Windows-style "Hi, getting things ready for you..." transition
  const finalName =
    pendingOobeMode === 'firebase'
      ? pendingFirebaseUser?.displayName || 'User'
      : pendingOobeMode === 'local'
        ? pendingLocalDraft?.username || 'User'
        : 'Guest';
  stepContent.innerHTML = `
    <div class="oobe-preparing">
      <div class="oobe-spinner"></div>
      <h1 class="oobe-heading">Hi, ${esc(finalName)}</h1>
      <p class="oobe-copy">We're setting up your private Angel OS workspace...</p>
    </div>
  `;
}

async function finalizeOobeAccount(): Promise<void> {
  hooks?.resetWorkspaceToCleanDefaults();
  const baseSnap = hooks?.captureWorkspaceSnapshot() || {
    schemaVersion: 2,
    registry: {},
    installedPkgIds: [],
    vfsUserFiles: [],
    bookmarks: [],
    stickies: [],
    taskbarOrder: [],
    unlockedTrophies: [],
  };
  baseSnap.registry = {
    ...baseSnap.registry,
    themePreset: selectedOobeTheme,
    defaultBrowserMode: selectedOobeBrowserMode,
  };

  if (pendingOobeMode === 'firebase' && pendingFirebaseUser) {
    const u = pendingFirebaseUser;
    const displayName = (u.displayName || u.email?.split('@')[0] || 'Angel User').slice(0, 64);
    try {
      await createInitialCloudAccountAtomic(u, displayName, selectedOobeTheme, baseSnap);
    } catch (err) {
      console.error('[Angel OS OOBE] Could not write initial cloud save:', err);
    }
    const identity: ActiveSessionIdentity = {
      mode: 'firebase',
      id: u.uid,
      displayName,
      email: u.email || '',
      avatar: '👼',
      photoURL: u.photoURL || undefined,
    };
    await enterDesktopWithSession(identity, baseSnap, false);
    return;
  }

  if (pendingOobeMode === 'local' && pendingLocalDraft) {
    const list = loadLocalOfflineProfiles();
    const existing = list.find((p) => p.username.toLowerCase() === pendingLocalDraft!.username.toLowerCase());
    const profile: LocalOfflineProfile = existing
      ? { ...existing, avatar: pendingLocalDraft.avatar, pin: pendingLocalDraft.pin }
      : {
          profileId: `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          username: pendingLocalDraft.username,
          displayName: pendingLocalDraft.username,
          avatar: pendingLocalDraft.avatar,
          pin: pendingLocalDraft.pin,
          createdAt: new Date().toISOString().slice(0, 10),
        };
    if (!existing) list.push(profile);
    saveLocalOfflineProfiles(list);
    saveLocalProfileSnapshot(profile.profileId, baseSnap);
    try {
      localStorage.setItem(LOCAL_REMEMBERED_ID_KEY, profile.profileId);
    } catch {
      // ignore
    }
    const identity: ActiveSessionIdentity = {
      mode: 'local',
      id: profile.profileId,
      displayName: profile.displayName,
      avatar: profile.avatar,
    };
    await enterDesktopWithSession(identity, baseSnap, false);
    return;
  }

  // Temporary Guest
  const guestIdentity: ActiveSessionIdentity = {
    mode: 'guest',
    id: `guest_${Date.now()}`,
    displayName: 'Guest',
    avatar: '👤',
  };
  await enterDesktopWithSession(guestIdentity, baseSnap, false);
}

async function enterDesktopWithSession(
  identity: ActiveSessionIdentity,
  snapshot: AngelOsWorkspaceSnapshot | null,
  isReturning: boolean,
): Promise<void> {
  currentSession = identity;
  hooks?.hydrateWorkspaceSnapshot(snapshot, identity);
  syncAccountStatusUI();

  await new Promise((r) => setTimeout(r, 320));
  hideAllAuthScreens();
  hooks?.playStartupChime();
  hooks?.onSessionReady(identity, isReturning);

  if (identity.mode === 'firebase') {
    hooks?.pushToast(
      isReturning ? `Welcome back, ${identity.displayName}` : `Cloud Account Ready`,
      isReturning
        ? 'Loaded your private Angel OS cloud save.'
        : 'Your Angel OS workspace now syncs privately to your Google account.',
      '☁️',
    );
  } else if (identity.mode === 'local') {
    hooks?.pushToast(
      isReturning ? `Welcome back, ${identity.displayName}` : `Local Profile Created`,
      'Your files, apps, and settings are isolated to your local profile.',
      identity.avatar,
    );
  } else {
    hooks?.pushToast(
      'Temporary Guest Session',
      'Changes are not saved to an account. Sign out anytime to create your own account.',
      '👤',
    );
  }
}

// ==================== RETURNING USER SIGN-IN CHOOSER ====================
export function openAccountSignInChooser(): void {
  hideAllAuthScreens();
  const screen = document.getElementById('angel-signin-chooser');
  if (!screen) {
    openOobeSetupWizard(false);
    return;
  }
  const profiles = loadLocalOfflineProfiles();
  if (profiles.length === 0) {
    openOobeSetupWizard(false);
    return;
  }

  let selectedId = profiles[0].profileId;
  const body = screen.querySelector('#angel-chooser-body') as HTMLElement | null;
  if (!body) return;

  const renderChooser = () => {
    const active = profiles.find((p) => p.profileId === selectedId) || profiles[0];
    const needsPin = Boolean(active.pin);
    body.innerHTML = `
      <div class="oobe-eyebrow">Angel OS v2.0.0 · Sign In</div>
      <div class="chooser-selected-hero">
        <div class="chooser-avatar">${active.avatar}</div>
        <h2 class="oobe-heading" style="margin:6px 0 2px 0;">${esc(active.displayName)}</h2>
        <div class="oobe-choice-meta">Local Private Profile · Created ${esc(active.createdAt)}</div>
      </div>

      <div id="chooser-err" class="oobe-error-banner" style="display:none;"></div>

      ${
        needsPin
          ? `<input type="password" id="chooser-pin-in" class="oobe-input" placeholder="Enter PIN / Password for ${esc(active.displayName)}" />`
          : ''
      }
      <div class="oobe-actions-row" style="justify-content:center;margin-top:10px;">
        <button type="button" class="oobe-btn-primary" id="chooser-signin-btn">Sign In</button>
        <button type="button" class="oobe-btn-secondary" id="chooser-google-btn">Sign in with Google</button>
      </div>

      <div class="chooser-profiles-strip">
        ${profiles
          .map(
            (p) => `
          <button type="button" class="chooser-profile-chip${p.profileId === active.profileId ? ' active' : ''}" data-pid="${p.profileId}">
            <span>${p.avatar}</span>
            <span>${esc(p.displayName)}</span>
          </button>`,
          )
          .join('')}
      </div>

      <div class="oobe-footer-links">
        <button type="button" class="oobe-btn-ghost" id="chooser-new-acct">+ Create New Account (Setup)</button>
        <button type="button" class="oobe-btn-ghost" id="chooser-del-acct" style="color:#fca5a5;">Delete "${esc(active.displayName)}"</button>
      </div>
    `;

    const errEl = body.querySelector('#chooser-err') as HTMLElement;
    const pinIn = body.querySelector('#chooser-pin-in') as HTMLInputElement | null;

    const doSignIn = async () => {
      if (needsPin && (pinIn?.value || '') !== active.pin) {
        errEl.textContent = `Incorrect PIN or password for ${active.displayName}.`;
        errEl.style.display = 'block';
        return;
      }
      hooks?.playClick();
      try {
        localStorage.setItem(LOCAL_REMEMBERED_ID_KEY, active.profileId);
      } catch {
        // ignore
      }
      const snap = loadLocalProfileSnapshot(active.profileId);
      await enterDesktopWithSession(
        { mode: 'local', id: active.profileId, displayName: active.displayName, avatar: active.avatar },
        snap,
        true,
      );
    };

    body.querySelector('#chooser-signin-btn')?.addEventListener('click', doSignIn);
    pinIn?.addEventListener('keydown', (e) => e.key === 'Enter' && doSignIn());

    body.querySelector('#chooser-google-btn')?.addEventListener('click', async () => {
      hooks?.playClick();
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        const cloud = await fetchCloudProfileAndSave(cred.user);
        if (cloud.exists) {
          await enterDesktopWithSession(
            {
              mode: 'firebase',
              id: cred.user.uid,
              displayName: cloud.displayName,
              email: cred.user.email || '',
              avatar: '👼',
              photoURL: cred.user.photoURL || undefined,
            },
            cloud.snapshot,
            true,
          );
        } else {
          pendingOobeMode = 'firebase';
          pendingFirebaseUser = cred.user;
          openOobeSetupWizard(true);
          oobeStep = 3;
          renderOobeStep();
        }
      } catch (err: any) {
        errEl.textContent = `Google sign-in failed: ${err?.message || 'cancelled'}`;
        errEl.style.display = 'block';
      }
    });

    body.querySelectorAll<HTMLButtonElement>('.chooser-profile-chip').forEach((c) => {
      c.addEventListener('click', () => {
        selectedId = c.dataset.pid || profiles[0].profileId;
        renderChooser();
      });
    });

    body.querySelector('#chooser-new-acct')?.addEventListener('click', () => {
      hooks?.playClick();
      openOobeSetupWizard(true);
    });

    body.querySelector('#chooser-del-acct')?.addEventListener('click', () => {
      hooks?.playClick();
      deleteLocalOfflineProfile(active.profileId);
      const rem = loadLocalOfflineProfiles();
      if (rem.length === 0) {
        openOobeSetupWizard(false);
      } else {
        openAccountSignInChooser();
      }
    });
  };

  screen.style.display = 'flex';
  renderChooser();
}

// ==================== INITIAL SESSION RESOLUTION ON BOOT ====================
export function initUserAccountSystem(sessionHooks: UserSessionHooks): void {
  hooks = sessionHooks;

  onAuthStateChanged(auth, (user) => {
    currentFirebaseUser = user;
    firebaseInitialized = true;
  });
}

function waitForFirebaseAuthReady(timeoutMs = 2200): Promise<User | null> {
  if (firebaseInitialized) return Promise.resolve(currentFirebaseUser);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timer);
      firebaseInitialized = true;
      currentFirebaseUser = u;
      unsub();
      resolve(u);
    });
  });
}

export async function resolveUserSessionAfterBoot(): Promise<void> {
  const fbUser = await waitForFirebaseAuthReady();
  if (fbUser) {
    try {
      const cloud = await fetchCloudProfileAndSave(fbUser);
      if (cloud.exists) {
        await enterDesktopWithSession(
          {
            mode: 'firebase',
            id: fbUser.uid,
            displayName: cloud.displayName,
            email: fbUser.email || '',
            avatar: '👼',
            photoURL: fbUser.photoURL || undefined,
          },
          cloud.snapshot,
          true,
        );
        return;
      }
      // Signed into Firebase but hasn't finished Angel OS OOBE personalization yet
      pendingOobeMode = 'firebase';
      pendingFirebaseUser = fbUser;
      openOobeSetupWizard(false);
      oobeStep = 3;
      renderOobeStep();
      return;
    } catch (err) {
      console.warn('[Angel OS Auth] Cloud profile lookup failed, falling back to setup:', err);
    }
  }

  // Check for remembered local offline profile
  const localProfiles = loadLocalOfflineProfiles();
  if (localProfiles.length > 0) {
    let rememberedId: string | null = null;
    try {
      rememberedId = localStorage.getItem(LOCAL_REMEMBERED_ID_KEY);
    } catch {
      rememberedId = null;
    }
    const remembered = localProfiles.find((p) => p.profileId === rememberedId);
    if (remembered && !remembered.pin) {
      const snap = loadLocalProfileSnapshot(remembered.profileId);
      await enterDesktopWithSession(
        {
          mode: 'local',
          id: remembered.profileId,
          displayName: remembered.displayName,
          avatar: remembered.avatar,
        },
        snap,
        true,
      );
      return;
    }
    openAccountSignInChooser();
    return;
  }

  // Brand-new visitor: launch Windows-style OOBE ("Would you like to create an account?")
  openOobeSetupWizard(false);
}
