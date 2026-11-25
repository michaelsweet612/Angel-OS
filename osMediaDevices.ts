// ==================== ANGELOS-WEB CAMERA & MICROPHONE HARDWARE MODULE (osMediaDevices.ts) ====================
// Manages real browser Camera & Microphone permission prompts (getUserMedia),
// Camera App (CAMERA.EXE) live viewfinder / filters / photo & video capture,
// and Sound Studio live microphone recording + oscilloscope waveform feed.

export type HardwarePermState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export interface MediaBridge {
  addVfsFile: (
    name: string,
    type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe',
    parent: string,
    content?: string,
  ) => void;
  refreshExplorerIfOpen: () => void;
  showOsDialog: (msg: string, title?: string) => void;
  openApp: (appName: string, bypassPkgCheck?: boolean) => Promise<void>;
  pushToast: (title: string, msg: string, icon?: string) => void;
  sfx: {
    playClick: () => void;
    playWindowOpen: () => void;
    playChordError: () => void;
    playStartupChime: () => void;
  };
}

let mediaBridge: MediaBridge | null = null;

export function registerMediaBridge(bridge: MediaBridge): void {
  mediaBridge = bridge;
}

let cameraPermState: HardwarePermState = 'prompt';
let micPermState: HardwarePermState = 'prompt';

// Active media streams
let cameraStream: MediaStream | null = null;
let micOnlyStream: MediaStream | null = null;

// Live mic analyser (shared with Sound Studio oscilloscope & Camera VU meter)
let micAudioCtx: AudioContext | null = null;
let micAnalyser: AnalyserNode | null = null;
let micTimeDomainBuf: Uint8Array<ArrayBuffer> | null = null;

// Camera App state
let cameraTestPatternActive = false;
let cameraTestAnimId: number | null = null;
let cameraVuAnimId: number | null = null;
let cameraRecorder: MediaRecorder | null = null;
let cameraRecordChunks: Blob[] = [];
let cameraRecTimerId: number | null = null;
let cameraRecSeconds = 0;
let cameraFilterKey = 'none';
let cameraMirrored = true;
let cameraPhotoCount = 0;

// Sound Studio Mic Recorder state
let sndMicRecorder: MediaRecorder | null = null;
let sndMicChunks: Blob[] = [];
let sndMicTimerId: number | null = null;
let sndMicSeconds = 0;
let sndLastMicBlobUrl: string | null = null;

export function getMediaPermissionsState(): {
  camera: HardwarePermState;
  microphone: HardwarePermState;
  cameraActive: boolean;
  micActive: boolean;
} {
  return {
    camera: cameraPermState,
    microphone: micPermState,
    cameraActive: Boolean(cameraStream && cameraStream.getVideoTracks().some((t) => t.readyState === 'live')),
    micActive: Boolean(
      (micOnlyStream && micOnlyStream.getAudioTracks().some((t) => t.readyState === 'live')) ||
        (cameraStream && cameraStream.getAudioTracks().some((t) => t.readyState === 'live')),
    ),
  };
}

function attachMicAnalyser(stream: MediaStream): void {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!micAudioCtx || micAudioCtx.state === 'closed') {
      micAudioCtx = new AudioCtx();
    }
    if (micAudioCtx.state === 'suspended') {
      micAudioCtx.resume().catch(() => {});
    }
    const source = micAudioCtx.createMediaStreamSource(new MediaStream([audioTracks[0]]));
    micAnalyser = micAudioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    source.connect(micAnalyser);
    micTimeDomainBuf = new Uint8Array(new ArrayBuffer(micAnalyser.frequencyBinCount));
  } catch {
    // Ignore analyser init failures on restricted environments
  }
}

export function getLiveMicWaveform(): Uint8Array | null {
  const st = getMediaPermissionsState();
  if (!st.micActive || !micAnalyser || !micTimeDomainBuf) return null;
  micAnalyser.getByteTimeDomainData(micTimeDomainBuf);
  return micTimeDomainBuf;
}

function getMicLevelPct(): number {
  const buf = getLiveMicWaveform();
  if (!buf) return 0;
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) {
    const norm = (buf[i] - 128) / 128;
    sumSq += norm * norm;
  }
  const rms = Math.sqrt(sumSq / buf.length);
  return Math.min(100, Math.round(rms * 280));
}

function formatPermBadge(state: HardwarePermState, isLive: boolean): { text: string; cls: string } {
  if (isLive) return { text: 'ACTIVE (LIVE)', cls: 'perm-live' };
  if (state === 'granted') return { text: 'ALLOWED', cls: 'perm-granted' };
  if (state === 'denied') return { text: 'BLOCKED / DENIED', cls: 'perm-denied' };
  if (state === 'unavailable') return { text: 'NO HARDWARE', cls: 'perm-denied' };
  return { text: 'ASK / PROMPT', cls: 'perm-prompt' };
}

export function syncAllMediaPermissionBadges(): void {
  const st = getMediaPermissionsState();
  const camBadge = formatPermBadge(st.camera, st.cameraActive);
  const micBadge = formatPermBadge(st.microphone, st.micActive);

  const setBadge = (id: string, b: { text: string; cls: string }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = b.text;
    el.className = `media-perm-pill ${b.cls}`;
  };

  setBadge('perm-modal-cam-state', camBadge);
  setBadge('perm-modal-mic-state', micBadge);
  setBadge('camera-perm-cam-badge', camBadge);
  setBadge('camera-perm-mic-badge', micBadge);
  setBadge('sndrec-mic-perm-badge', micBadge);

  document.getElementById('qs-tile-camera')?.classList.toggle('active', st.cameraActive || st.camera === 'granted');
  document.getElementById('qs-tile-mic')?.classList.toggle('active', st.micActive || st.microphone === 'granted');
}

async function queryBrowserPermissionsSilently(): Promise<void> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraPermState = 'unavailable';
    micPermState = 'unavailable';
    syncAllMediaPermissionBadges();
    return;
  }
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const camQ = await navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null);
      if (camQ) {
        cameraPermState = camQ.state as HardwarePermState;
        camQ.onchange = () => {
          cameraPermState = camQ.state as HardwarePermState;
          syncAllMediaPermissionBadges();
        };
      }
      const micQ = await navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null);
      if (micQ) {
        micPermState = micQ.state as HardwarePermState;
        micQ.onchange = () => {
          micPermState = micQ.state as HardwarePermState;
          syncAllMediaPermissionBadges();
        };
      }
    }
  } catch {
    // Permissions API optional across browsers
  }
  syncAllMediaPermissionBadges();
}

async function refreshHardwareDeviceLists(): Promise<void> {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const camSel = document.getElementById('camera-device-select') as HTMLSelectElement | null;
    const micSel = document.getElementById('camera-mic-select') as HTMLSelectElement | null;
    if (camSel) {
      const cur = camSel.value;
      const cams = devices.filter((d) => d.kind === 'videoinput');
      camSel.innerHTML =
        cams.length === 0
          ? '<option value="">Default System Camera</option>'
          : cams
              .map(
                (d, idx) =>
                  `<option value="${d.deviceId}">${d.label || `Camera Device #${idx + 1}`}</option>`,
              )
              .join('');
      if (cur && cams.some((d) => d.deviceId === cur)) camSel.value = cur;
    }
    if (micSel) {
      const cur = micSel.value;
      const mics = devices.filter((d) => d.kind === 'audioinput');
      micSel.innerHTML =
        mics.length === 0
          ? '<option value="">Default System Microphone</option>'
          : mics
              .map(
                (d, idx) =>
                  `<option value="${d.deviceId}">${d.label || `Microphone #${idx + 1}`}</option>`,
              )
              .join('');
      if (cur && mics.some((d) => d.deviceId === cur)) micSel.value = cur;
    }
  } catch {
    // Ignore enumeration restrictions before grant
  }
}

function classifyMediaError(err: unknown): { state: HardwarePermState; msg: string } {
  const e = err as { name?: string; message?: string } | null;
  const name = e?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      state: 'denied',
      msg: 'Browser permission was denied. Click the lock/camera icon in your browser address bar to allow access, then retry.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      state: 'unavailable',
      msg: 'No physical hardware device was detected on this machine. You can still test Camera App using "Test Pattern Mode".',
    };
  }
  return {
    state: 'prompt',
    msg: e?.message || 'Unable to access media hardware in this browser context.',
  };
}

export async function requestMicrophonePermission(deviceId?: string): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    micPermState = 'unavailable';
    syncAllMediaPermissionBadges();
    mediaBridge?.showOsDialog(
      'Your browser does not expose navigator.mediaDevices.getUserMedia (HTTPS or localhost required).',
      'Microphone Unavailable',
    );
    return null;
  }
  try {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (micOnlyStream) {
      micOnlyStream.getTracks().forEach((t) => t.stop());
    }
    micOnlyStream = stream;
    micPermState = 'granted';
    attachMicAnalyser(stream);
    await refreshHardwareDeviceLists();
    syncAllMediaPermissionBadges();
    mediaBridge?.pushToast(
      'Microphone Access Granted',
      'Live microphone input is now active for Sound Studio and Camera video recording.',
      '🎤',
    );
    return stream;
  } catch (err) {
    const info = classifyMediaError(err);
    micPermState = info.state;
    syncAllMediaPermissionBadges();
    mediaBridge?.sfx.playChordError();
    mediaBridge?.pushToast('Microphone Access Notice', info.msg, '🎤');
    return null;
  }
}

export async function requestCameraPermission(
  withMic = false,
  videoDeviceId?: string,
  audioDeviceId?: string,
): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraPermState = 'unavailable';
    syncAllMediaPermissionBadges();
    mediaBridge?.showOsDialog(
      'Your browser does not expose navigator.mediaDevices.getUserMedia (HTTPS or localhost required).',
      'Camera Unavailable',
    );
    return null;
  }
  try {
    const constraints: MediaStreamConstraints = {
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: withMic ? (audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true) : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stopCameraStreamOnly();
    cameraStream = stream;
    cameraPermState = 'granted';
    if (withMic && stream.getAudioTracks().length > 0) {
      micPermState = 'granted';
      attachMicAnalyser(stream);
    }
    stopCameraTestPattern();
    attachStreamToCameraVideo(stream);
    await refreshHardwareDeviceLists();
    syncAllMediaPermissionBadges();
    mediaBridge?.pushToast(
      withMic ? 'Camera & Microphone Active' : 'Camera Access Granted',
      withMic
        ? 'Live camera viewfinder and microphone audio are ready in Camera App.'
        : 'Live camera viewfinder is active in Camera App.',
      '📷',
    );
    return stream;
  } catch (err) {
    const info = classifyMediaError(err);
    cameraPermState = info.state;
    if (withMic && info.state === 'denied') micPermState = 'denied';
    syncAllMediaPermissionBadges();
    mediaBridge?.sfx.playChordError();
    setCameraStatusText(`⚠ ${info.msg}`);
    mediaBridge?.pushToast('Camera Access Notice', info.msg, '📷');
    return null;
  }
}

function stopCameraStreamOnly(): void {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  const vid = document.getElementById('camera-video') as HTMLVideoElement | null;
  if (vid) {
    vid.srcObject = null;
    vid.style.display = 'none';
  }
}

export function stopAllMediaHardware(): void {
  if (cameraRecorder && cameraRecorder.state !== 'inactive') {
    try {
      cameraRecorder.stop();
    } catch {
      // ignore
    }
  }
  if (sndMicRecorder && sndMicRecorder.state !== 'inactive') {
    try {
      sndMicRecorder.stop();
    } catch {
      // ignore
    }
  }
  stopCameraStreamOnly();
  stopCameraTestPattern();
  if (micOnlyStream) {
    micOnlyStream.getTracks().forEach((t) => t.stop());
    micOnlyStream = null;
  }
  const overlay = document.getElementById('camera-idle-overlay');
  if (overlay) overlay.style.display = 'flex';
  setCameraStatusText('Camera & Microphone hardware released.');
  syncAllMediaPermissionBadges();
}

export function stopCameraAppStreams(): void {
  if (cameraRecorder && cameraRecorder.state !== 'inactive') {
    try {
      cameraRecorder.stop();
    } catch {
      // ignore
    }
  }
  stopCameraStreamOnly();
  stopCameraTestPattern();
  const overlay = document.getElementById('camera-idle-overlay');
  if (overlay) overlay.style.display = 'flex';
  syncAllMediaPermissionBadges();
}

// ==================== HARDWARE PERMISSIONS MODAL ====================
export function openMediaPermissionsModal(): void {
  const modal = document.getElementById('media-perm-modal');
  if (!modal) return;
  mediaBridge?.sfx.playWindowOpen();
  syncAllMediaPermissionBadges();
  modal.style.display = 'flex';
}

export function initMediaPermissionsController(): void {
  queryBrowserPermissionsSilently();

  const closeModal = () => {
    const m = document.getElementById('media-perm-modal');
    if (m) m.style.display = 'none';
  };

  document.getElementById('media-perm-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('media-perm-ok-btn')?.addEventListener('click', closeModal);

  document.getElementById('perm-ask-cam-btn')?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    await requestCameraPermission(false);
  });
  document.getElementById('perm-ask-mic-btn')?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    await requestMicrophonePermission();
  });
  document.getElementById('perm-ask-both-btn')?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    await requestCameraPermission(true);
  });
  document.getElementById('perm-stop-all-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    stopAllMediaHardware();
  });
  document.getElementById('perm-launch-camera-btn')?.addEventListener('click', () => {
    closeModal();
    mediaBridge?.openApp('cameraApp');
  });
  document.getElementById('perm-launch-sound-btn')?.addEventListener('click', () => {
    closeModal();
    mediaBridge?.openApp('soundRecorder');
  });

  // Quick Settings Flyout tiles for Camera & Mic permissions
  document.getElementById('qs-tile-camera')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    const qs = document.getElementById('win11-quick-settings');
    if (qs) qs.style.display = 'none';
    mediaBridge?.openApp('cameraApp');
  });
  document.getElementById('qs-tile-mic')?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    const st = getMediaPermissionsState();
    if (st.micActive) {
      openMediaPermissionsModal();
    } else {
      await requestMicrophonePermission();
    }
  });
}

// ==================== CAMERA APP (CAMERA.EXE) ====================
const CAMERA_FILTERS: Record<string, { label: string; css: string }> = {
  none: { label: 'Normal', css: 'none' },
  crt95: { label: 'CRT 95', css: 'contrast(1.18) saturate(1.22) brightness(1.04)' },
  noir: { label: 'B&W Noir', css: 'grayscale(1) contrast(1.3)' },
  sepia: { label: '1995 Sepia', css: 'sepia(0.85) contrast(1.08)' },
  matrix: { label: 'Matrix Green', css: 'hue-rotate(85deg) saturate(1.9) contrast(1.2)' },
  vapor: { label: 'Vaporwave', css: 'hue-rotate(270deg) saturate(1.85) contrast(1.12)' },
  thermal: { label: 'Thermal Vision', css: 'invert(0.85) hue-rotate(180deg) saturate(2.5)' },
};

function setCameraStatusText(msg: string): void {
  const el = document.getElementById('camera-status-text');
  if (el) el.textContent = msg;
}

function applyCameraFilterCss(): void {
  const vid = document.getElementById('camera-video') as HTMLVideoElement | null;
  const cvs = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
  const cssFilter = CAMERA_FILTERS[cameraFilterKey]?.css || 'none';
  const transform = cameraMirrored ? 'scaleX(-1)' : 'none';
  if (vid) {
    vid.style.filter = cssFilter;
    vid.style.transform = transform;
  }
  if (cvs) {
    cvs.style.filter = cssFilter;
    cvs.style.transform = transform;
  }
}

function attachStreamToCameraVideo(stream: MediaStream): void {
  const vid = document.getElementById('camera-video') as HTMLVideoElement | null;
  const overlay = document.getElementById('camera-idle-overlay');
  const testCanvas = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
  if (testCanvas) testCanvas.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (vid) {
    vid.srcObject = stream;
    vid.style.display = 'block';
    vid.play().catch(() => {});
  }
  applyCameraFilterCss();
  const track = stream.getVideoTracks()[0];
  const settings = track?.getSettings?.();
  const res = settings?.width && settings?.height ? `${settings.width}x${settings.height}` : 'Live Feed';
  setCameraStatusText(`LIVE CAMERA · ${track?.label || 'Default Webcam'} (${res})`);
}

function stopCameraTestPattern(): void {
  cameraTestPatternActive = false;
  if (cameraTestAnimId !== null) {
    cancelAnimationFrame(cameraTestAnimId);
    cameraTestAnimId = null;
  }
  const cvs = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
  if (cvs) cvs.style.display = 'none';
}

function startCameraTestPattern(): void {
  stopCameraStreamOnly();
  cameraTestPatternActive = true;
  const cvs = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
  const overlay = document.getElementById('camera-idle-overlay');
  if (overlay) overlay.style.display = 'none';
  if (!cvs) return;
  cvs.style.display = 'block';
  applyCameraFilterCss();

  const ctx = cvs.getContext('2d');
  if (!ctx) return;
  let tick = 0;

  const bars = ['#e2e8f0', '#facc15', '#22d3ee', '#4ade80', '#e879f9', '#ef4444', '#2563eb'];
  const draw = () => {
    if (!cameraTestPatternActive) return;
    tick++;
    const w = cvs.width;
    const h = cvs.height;
    const barW = w / bars.length;
    bars.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(idx * barW, 0, barW + 1, h * 0.72);
    });
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Animated scan bar & timestamp
    const scanY = (tick * 2) % h;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, scanY, w, 6);

    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(w / 2 - 175, h / 2 - 42, 350, 84);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 175, h / 2 - 42, 350, 84);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ANGELOS-WEB CAMERA TEST', w / 2, h / 2 - 8);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText(`CH-01 SMPTE · ${new Date().toLocaleTimeString()} · FILTER: ${cameraFilterKey.toUpperCase()}`, w / 2, h / 2 + 20);
    ctx.textAlign = 'start';

    cameraTestAnimId = requestAnimationFrame(draw);
  };
  draw();
  setCameraStatusText('TEST PATTERN MODE · Click "Allow Camera Access" anytime for live hardware webcam');
}

function captureCameraPhoto(): void {
  const vid = document.getElementById('camera-video') as HTMLVideoElement | null;
  const testCanvas = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
  const liveReady = Boolean(cameraStream && vid && vid.readyState >= 2);
  if (!liveReady && !cameraTestPatternActive) {
    mediaBridge?.sfx.playChordError();
    setCameraStatusText('Enable Camera Access or Test Pattern first before capturing a photo.');
    return;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = liveReady && vid ? vid.videoWidth || 640 : testCanvas?.width || 640;
  outCanvas.height = liveReady && vid ? vid.videoHeight || 480 : testCanvas?.height || 480;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return;

  ctx.filter = CAMERA_FILTERS[cameraFilterKey]?.css || 'none';
  if (cameraMirrored) {
    ctx.translate(outCanvas.width, 0);
    ctx.scale(-1, 1);
  }
  if (liveReady && vid) {
    ctx.drawImage(vid, 0, 0, outCanvas.width, outCanvas.height);
  } else if (testCanvas) {
    ctx.drawImage(testCanvas, 0, 0, outCanvas.width, outCanvas.height);
  }

  const dataUrl = outCanvas.toDataURL('image/png');
  cameraPhotoCount++;
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const fileName = `CAM_${stamp}_${cameraPhotoCount}.png`;

  // Save directly to Virtual File System C:\Pictures!
  mediaBridge?.addVfsFile(fileName, 'image', 'C:\\Pictures', dataUrl);
  mediaBridge?.refreshExplorerIfOpen();

  // Shutter visual flash
  const flash = document.getElementById('camera-shutter-flash');
  if (flash) {
    flash.classList.add('flash');
    window.setTimeout(() => flash.classList.remove('flash'), 180);
  }
  mediaBridge?.sfx.playClick();

  const gallery = document.getElementById('camera-gallery-strip');
  if (gallery) {
    const emptyHint = gallery.querySelector('.camera-gallery-empty');
    if (emptyHint) emptyHint.remove();
    const card = document.createElement('div');
    card.className = 'camera-shot-card';
    card.innerHTML = `
      <img src="${dataUrl}" alt="${fileName}" />
      <div class="camera-shot-meta">
        <span title="${fileName}">${fileName}</span>
        <a href="${dataUrl}" download="${fileName}" class="win95-btn camera-dl-link">⬇ PNG</a>
      </div>
    `;
    gallery.prepend(card);
  }

  setCameraStatusText(`📸 Captured ${fileName} → saved to C:\\Pictures!`);
  mediaBridge?.pushToast('Photo Saved to C:\\Pictures', `${fileName} saved in My Gemtop → C:\\Pictures.`, '📸');
}

function toggleCameraVideoRecording(): void {
  const recBtn = document.getElementById('camera-record-btn') as HTMLButtonElement | null;
  const recBadge = document.getElementById('camera-rec-badge');

  if (cameraRecorder && cameraRecorder.state !== 'inactive') {
    cameraRecorder.stop();
    if (cameraRecTimerId !== null) {
      clearInterval(cameraRecTimerId);
      cameraRecTimerId = null;
    }
    if (recBtn) recBtn.textContent = '⏺ Record Video';
    if (recBadge) recBadge.style.display = 'none';
    return;
  }

  let streamToRecord: MediaStream | null = null;
  if (cameraStream) {
    const tracks = [...cameraStream.getVideoTracks(), ...cameraStream.getAudioTracks()];
    if (tracks.filter((t) => t.kind === 'audio').length === 0 && micOnlyStream) {
      tracks.push(...micOnlyStream.getAudioTracks());
    }
    streamToRecord = new MediaStream(tracks);
  } else if (cameraTestPatternActive) {
    const cvs = document.getElementById('camera-test-canvas') as HTMLCanvasElement | null;
    const captured = cvs?.captureStream?.(24) || null;
    if (captured && micOnlyStream) {
      micOnlyStream.getAudioTracks().forEach((t) => captured.addTrack(t));
    }
    streamToRecord = captured;
  }

  if (!streamToRecord || typeof MediaRecorder === 'undefined') {
    mediaBridge?.sfx.playChordError();
    setCameraStatusText('Enable Camera Access (or Test Pattern) before recording video.');
    return;
  }

  try {
    cameraRecordChunks = [];
    cameraRecorder = new MediaRecorder(streamToRecord);
    cameraRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) cameraRecordChunks.push(ev.data);
    };
    cameraRecorder.onstop = () => {
      const blob = new Blob(cameraRecordChunks, { type: cameraRecorder?.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const vidName = `CLIP_${stamp}.webm`;
      const gallery = document.getElementById('camera-gallery-strip');
      if (gallery) {
        const emptyHint = gallery.querySelector('.camera-gallery-empty');
        if (emptyHint) emptyHint.remove();
        const card = document.createElement('div');
        card.className = 'camera-shot-card';
        card.innerHTML = `
          <video src="${url}" controls muted style="width:100%;height:74px;object-fit:cover;background:#000;"></video>
          <div class="camera-shot-meta">
            <span title="${vidName}">${vidName}</span>
            <a href="${url}" download="${vidName}" class="win95-btn camera-dl-link">⬇ WEBM</a>
          </div>
        `;
        gallery.prepend(card);
      }
      setCameraStatusText(`🎥 Recorded ${vidName} (${Math.max(1, Math.round(blob.size / 1024))} KB) — ready to play or download!`);
      mediaBridge?.pushToast('Video Recorded', `Clip "${vidName}" added to Camera Roll.`, '🎥');
    };
    cameraRecorder.start();
    cameraRecSeconds = 0;
    if (recBtn) recBtn.textContent = '⏹ Stop Recording';
    if (recBadge) {
      recBadge.style.display = 'inline-flex';
      recBadge.textContent = '● REC 00:00';
    }
    cameraRecTimerId = window.setInterval(() => {
      cameraRecSeconds++;
      const mm = String(Math.floor(cameraRecSeconds / 60)).padStart(2, '0');
      const ss = String(cameraRecSeconds % 60).padStart(2, '0');
      if (recBadge) recBadge.textContent = `● REC ${mm}:${ss}`;
    }, 1000);
    setCameraStatusText('🎥 Recording video stream...');
  } catch (err) {
    mediaBridge?.sfx.playChordError();
    setCameraStatusText(`Recording failed: ${(err as Error)?.message || 'Unsupported codec'}`);
  }
}

export function initCameraApp(windowElement: HTMLDivElement): void {
  syncAllMediaPermissionBadges();
  refreshHardwareDeviceLists();

  const camSel = windowElement.querySelector('#camera-device-select') as HTMLSelectElement | null;
  const micSel = windowElement.querySelector('#camera-mic-select') as HTMLSelectElement | null;
  const filterSel = windowElement.querySelector('#camera-filter-select') as HTMLSelectElement | null;
  const mirrorChk = windowElement.querySelector('#camera-mirror-chk') as HTMLInputElement | null;
  const vuFill = windowElement.querySelector('#camera-mic-vu-fill') as HTMLDivElement | null;

  windowElement.querySelector('#camera-allow-cam-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    requestCameraPermission(false, camSel?.value || undefined);
  });
  windowElement.querySelector('#camera-allow-mic-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    requestMicrophonePermission(micSel?.value || undefined);
  });
  windowElement.querySelector('#camera-allow-both-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    requestCameraPermission(true, camSel?.value || undefined, micSel?.value || undefined);
  });
  windowElement.querySelector('#camera-stop-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    stopCameraAppStreams();
  });
  windowElement.querySelector('#camera-test-btn')?.addEventListener('click', () => {
    mediaBridge?.sfx.playClick();
    if (cameraTestPatternActive) {
      stopCameraTestPattern();
      const overlay = document.getElementById('camera-idle-overlay');
      if (overlay) overlay.style.display = 'flex';
      setCameraStatusText('Test Pattern stopped.');
    } else {
      startCameraTestPattern();
    }
  });

  windowElement.querySelector('#camera-snap-btn')?.addEventListener('click', () => captureCameraPhoto());
  windowElement.querySelector('#camera-record-btn')?.addEventListener('click', () => toggleCameraVideoRecording());

  filterSel?.addEventListener('change', () => {
    cameraFilterKey = filterSel.value;
    applyCameraFilterCss();
  });
  mirrorChk?.addEventListener('change', () => {
    cameraMirrored = mirrorChk.checked;
    applyCameraFilterCss();
  });

  camSel?.addEventListener('change', () => {
    if (cameraStream) {
      const hasAudio = cameraStream.getAudioTracks().length > 0;
      requestCameraPermission(hasAudio, camSel.value, micSel?.value);
    }
  });
  micSel?.addEventListener('change', () => {
    if (micOnlyStream) {
      requestMicrophonePermission(micSel.value);
    }
  });

  // Live Mic VU Meter animation loop while Camera App window is open
  const tickVu = () => {
    if (vuFill && windowElement.style.display !== 'none') {
      const pct = getMicLevelPct();
      vuFill.style.width = `${pct}%`;
    }
    cameraVuAnimId = requestAnimationFrame(tickVu);
  };
  if (cameraVuAnimId !== null) cancelAnimationFrame(cameraVuAnimId);
  tickVu();
}

// ==================== SOUND STUDIO LIVE MICROPHONE RECORDING ====================
export function initSoundStudioMicControls(windowElement: HTMLDivElement): void {
  const askMicBtn = windowElement.querySelector('#sndrec-ask-mic-btn') as HTMLButtonElement | null;
  const recMicBtn = windowElement.querySelector('#sndrec-rec-mic-btn') as HTMLButtonElement | null;
  const playMicBtn = windowElement.querySelector('#sndrec-play-mic-btn') as HTMLButtonElement | null;
  const dlMicBtn = windowElement.querySelector('#sndrec-dl-mic-btn') as HTMLButtonElement | null;
  const statusEl = windowElement.querySelector('#sndrec-status');
  const micAudioEl = windowElement.querySelector('#sndrec-mic-playback') as HTMLAudioElement | null;

  syncAllMediaPermissionBadges();

  askMicBtn?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    const stream = await requestMicrophonePermission();
    if (stream && statusEl) {
      statusEl.textContent = '🎤 MICROPHONE LIVE — Speak to view live oscilloscope or click Rec Mic!';
    }
  });

  recMicBtn?.addEventListener('click', async () => {
    mediaBridge?.sfx.playClick();
    if (sndMicRecorder && sndMicRecorder.state !== 'inactive') {
      sndMicRecorder.stop();
      if (sndMicTimerId !== null) {
        clearInterval(sndMicTimerId);
        sndMicTimerId = null;
      }
      if (recMicBtn) recMicBtn.textContent = '⏺ Rec Mic';
      return;
    }

    let stream = micOnlyStream;
    if (!stream || !stream.getAudioTracks().some((t) => t.readyState === 'live')) {
      stream = await requestMicrophonePermission();
    }
    if (!stream || typeof MediaRecorder === 'undefined') return;

    try {
      sndMicChunks = [];
      sndMicRecorder = new MediaRecorder(stream);
      sndMicRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) sndMicChunks.push(ev.data);
      };
      sndMicRecorder.onstop = () => {
        const blob = new Blob(sndMicChunks, { type: sndMicRecorder?.mimeType || 'audio/webm' });
        if (sndLastMicBlobUrl) URL.revokeObjectURL(sndLastMicBlobUrl);
        sndLastMicBlobUrl = URL.createObjectURL(blob);
        if (micAudioEl) {
          micAudioEl.src = sndLastMicBlobUrl;
          micAudioEl.style.display = 'block';
        }
        if (playMicBtn) playMicBtn.disabled = false;
        if (dlMicBtn) dlMicBtn.disabled = false;
        if (statusEl) {
          statusEl.textContent = `🎤 Mic Clip Recorded (${Math.max(1, Math.round(blob.size / 1024))} KB) — Click Play or Save!`;
        }
      };
      sndMicRecorder.start();
      sndMicSeconds = 0;
      if (recMicBtn) recMicBtn.textContent = '⏹ Stop Mic';
      if (statusEl) statusEl.textContent = '● RECORDING MICROPHONE 00:00...';
      sndMicTimerId = window.setInterval(() => {
        sndMicSeconds++;
        const mm = String(Math.floor(sndMicSeconds / 60)).padStart(2, '0');
        const ss = String(sndMicSeconds % 60).padStart(2, '0');
        if (statusEl) statusEl.textContent = `● RECORDING MICROPHONE ${mm}:${ss}...`;
      }, 1000);
    } catch (err) {
      mediaBridge?.sfx.playChordError();
      if (statusEl) statusEl.textContent = `Mic recording error: ${(err as Error)?.message || 'Unsupported'}`;
    }
  });

  playMicBtn?.addEventListener('click', () => {
    if (micAudioEl && sndLastMicBlobUrl) {
      micAudioEl.currentTime = 0;
      micAudioEl.play().catch(() => {});
    }
  });

  dlMicBtn?.addEventListener('click', () => {
    if (!sndLastMicBlobUrl) return;
    const a = document.createElement('a');
    a.href = sndLastMicBlobUrl;
    a.download = `ANGELOS_MIC_${Date.now()}.webm`;
    a.click();
    mediaBridge?.pushToast('Saved Mic Recording', 'Downloaded live microphone clip to your computer.', '🎤');
  });
}
