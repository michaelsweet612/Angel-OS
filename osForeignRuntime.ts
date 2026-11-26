/**
 * @license
 * SPDX-License-Identifier: LicenseRef-AngelOS-Personal-Use
 *
 * Angel Runtime Host (v1.9.0)
 * ---------------------------
 * Installs real programs from the host computer into Angel-OS and runs each one
 * on the best engine available inside a browser:
 *
 *   • Java (.jar / .class / .java)  → CheerpJ WebAssembly JVM (real OpenJDK).
 *                                     .java sources compile in-browser with the
 *                                     bundled Eclipse ECJ compiler.
 *   • DOS (.exe / .com / .bat, ZIPs) → js-dos (DOSBox in WebAssembly).
 *   • Windows .exe with embedded JAR → CheerpJ (Launch4j / JSmooth wrappers).
 *   • Other Win32/Win64 .exe        → PE inspector + DOSBox attempt + Wine link.
 *   • Android .apk                  → Cordova/Capacitor web assets run in a
 *                                     sandbox; native-code APKs show an
 *                                     inspector page.
 *   • .html / web .zip              → sandboxed iframe with inlined assets.
 *
 * Installed programs persist in IndexedDB and appear as desktop icons.
 */
import JSZip from 'jszip';

export interface ForeignRuntimeBridge {
  openApp: (appName: string, bypassPkgCheck?: boolean) => Promise<void>;
  pushToast: (title: string, body: string, icon?: string) => void;
  sfx: { playClick: () => void };
  unlockAchievement?: (id: string) => void;
}

type ProgramKind =
  | 'java-jar'
  | 'java-class'
  | 'java-source'
  | 'dos'
  | 'zip-dos'
  | 'win32-java'
  | 'win32'
  | 'apk-web'
  | 'apk-native'
  | 'web'
  | 'unknown';

interface ProgramMeta {
  mainClass?: string;
  classVersion?: number;
  entry?: string;
  entries?: string[];
  pe?: PeInfo;
  apk?: ApkInfo;
  webRoot?: string;
  note?: string;
}

export interface ForeignProgram {
  id: string;
  name: string;
  size: number;
  kind: ProgramKind;
  addedAt: number;
  blob: Blob;
  meta: ProgramMeta;
  iconDataUrl?: string;
  builtin?: boolean;
}

interface PeInfo {
  machine: string;
  bits: 16 | 32 | 64;
  subsystem: string;
  isDotNet: boolean;
  isDll: boolean;
  imports: string[];
  sections: string[];
  embeddedJar: boolean;
}

interface ApkInfo {
  packageName?: string;
  dexCount: number;
  nativeAbis: string[];
  webEngine?: 'Cordova' | 'Capacitor' | 'Generic WebView';
  fileCount: number;
}

let bridge: ForeignRuntimeBridge | null = null;
export function registerForeignRuntimeBridge(b: ForeignRuntimeBridge): void {
  bridge = b;
}

const BASE_URL: string = (import.meta as any).env?.BASE_URL || './';
const CHEERPJ_LOADER = 'https://cjrtnc.leaningtech.com/4.2/loader.js';
const JSDOS_JS = 'https://v8.js-dos.com/latest/js-dos.js';
const JSDOS_CSS = 'https://v8.js-dos.com/latest/js-dos.css';
const EXEBROWSER_URL = 'https://exebrowser.com/load-exe/';
const CJ_VERSION_KEY = '__angelos_cheerpj_version';
const PENDING_RUN_KEY = '__angelos_foreign_pending_run';

// ============================================================================
// Bundled Java programs (compiled from java-src/ to public/java/*.jar)
// ============================================================================
const BUNDLED_JAVA: Array<{ id: string; name: string; file: string; emoji: string; desc: string }> = [
  { id: 'builtin-calc95', name: 'Calc95 (Java)', file: 'Calc95.jar', emoji: '🧮', desc: 'Swing calculator with BigDecimal math, ±, %, √.' },
  { id: 'builtin-snake95', name: 'Snake95 (Java)', file: 'Snake95.jar', emoji: '🐍', desc: 'Swing arcade snake. Arrow keys / WASD, SPACE to restart.' },
  { id: 'builtin-angelpad', name: 'AngelPad (Java)', file: 'AngelPad.jar', emoji: '📝', desc: 'Swing text editor that saves to persistent JVM storage.' },
];

const JAVA_TEMPLATES: Record<string, string> = {
  'Hello World': `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from real Java inside Angel-OS!");
        System.out.println("java.version = " + System.getProperty("java.version"));
        for (int i = 1; i <= 5; i++) {
            System.out.println("Count " + i + " squared = " + (i * i));
        }
    }
}
`,
  'Swing Window': `import javax.swing.*;
import java.awt.*;

public class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame f = new JFrame("My Angel-OS Java App");
            f.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            JLabel label = new JLabel("Clicks: 0", SwingConstants.CENTER);
            label.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 24));
            JButton b = new JButton("Click me");
            final int[] n = {0};
            b.addActionListener(e -> label.setText("Clicks: " + (++n[0])));
            f.getContentPane().add(label, BorderLayout.CENTER);
            f.getContentPane().add(b, BorderLayout.SOUTH);
            f.setSize(320, 200);
            f.setLocationRelativeTo(null);
            f.setVisible(true);
        });
    }
}
`,
  FizzBuzz: `import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        String out = IntStream.rangeClosed(1, 30)
            .mapToObj(i -> i % 15 == 0 ? "FizzBuzz" : i % 3 == 0 ? "Fizz" : i % 5 == 0 ? "Buzz" : String.valueOf(i))
            .collect(Collectors.joining(", "));
        System.out.println(out);
        List<String> words = Arrays.asList("angel", "os", "java", "runs", "here");
        Collections.sort(words);
        System.out.println("Sorted: " + words);
    }
}
`,
};

// ============================================================================
// IndexedDB persistence
// ============================================================================
const DB_NAME = 'angelos_foreign_programs_v1';
const STORE = 'programs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAll(): Promise<ForeignProgram[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as ForeignProgram[]).sort((a, b) => a.addedAt - b.addedAt));
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(p: ForeignProgram): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let programs: ForeignProgram[] = [];

// ============================================================================
// Helpers
// ============================================================================
function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function dosName(name: string): string {
  // DOSBox handles long names, but keep them simple and upper-case for autoexec.
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src} (internet connection required the first time)`));
    document.head.appendChild(s);
  });
}

function loadCss(href: string): void {
  if (document.querySelector(`link[data-href="${href}"]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = href;
  l.dataset.href = href;
  document.head.appendChild(l);
}

const KIND_LABEL: Record<ProgramKind, { label: string; emoji: string; engine: string }> = {
  'java-jar': { label: 'Java Application (.jar)', emoji: '☕', engine: 'CheerpJ JVM' },
  'java-class': { label: 'Java Class (.class)', emoji: '☕', engine: 'CheerpJ JVM' },
  'java-source': { label: 'Java Source (.java)', emoji: '📜', engine: 'ECJ compiler + CheerpJ JVM' },
  dos: { label: 'DOS Program', emoji: '💾', engine: 'DOSBox (js-dos)' },
  'zip-dos': { label: 'DOS Program Archive (.zip)', emoji: '🗜️', engine: 'DOSBox (js-dos)' },
  'win32-java': { label: 'Windows .exe wrapping a Java app', emoji: '☕', engine: 'CheerpJ JVM (embedded JAR)' },
  win32: { label: 'Windows Program (PE .exe)', emoji: '🪟', engine: 'PE Inspector / DOSBox / Wine link' },
  'apk-web': { label: 'Android App (web-based .apk)', emoji: '🤖', engine: 'Sandboxed WebView' },
  'apk-native': { label: 'Android App (native .apk)', emoji: '🤖', engine: 'APK Inspector' },
  web: { label: 'Web App (.html / .zip)', emoji: '🌐', engine: 'Sandboxed WebView' },
  unknown: { label: 'Unknown file', emoji: '📄', engine: 'File Viewer' },
};

function kindIconDataUrl(kind: ProgramKind, name: string): string {
  const k = KIND_LABEL[kind];
  const color =
    kind.startsWith('java') || kind === 'win32-java' ? '#b45309' : kind.startsWith('apk') ? '#16a34a' : kind === 'win32' ? '#2563eb' : kind.includes('dos') ? '#334155' : kind === 'web' ? '#0891b2' : '#6b7280';
  const ext = (extOf(name) || '?').toUpperCase().slice(0, 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="8" y="4" width="48" height="56" rx="6" fill="${color}" stroke="#000" stroke-width="2.4"/><rect x="13" y="9" width="38" height="30" rx="3" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="32" y="31" text-anchor="middle" font-size="20">${k.emoji}</text><rect x="13" y="44" width="38" height="11" rx="2" fill="#0f172a"/><text x="32" y="53" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="9" fill="#fde047">${ext}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ============================================================================
// File type detection
// ============================================================================
function readU16(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}
function readU32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function classMajorVersion(bytes: Uint8Array): number | undefined {
  if (bytes.length > 8 && bytes[0] === 0xca && bytes[1] === 0xfe && bytes[2] === 0xba && bytes[3] === 0xbe) {
    return (bytes[6] << 8) | bytes[7];
  }
  return undefined;
}

function parsePe(b: Uint8Array): PeInfo | null {
  if (b.length < 0x40 || b[0] !== 0x4d || b[1] !== 0x5a) return null;
  const peOff = readU32(b, 0x3c);
  if (peOff + 24 > b.length) return null;
  const sig = String.fromCharCode(b[peOff], b[peOff + 1]);
  if (sig === 'NE') {
    return { machine: 'Intel 8086 (Win16)', bits: 16, subsystem: 'Windows 3.x', isDotNet: false, isDll: false, imports: [], sections: [], embeddedJar: false };
  }
  if (sig !== 'PE' || b[peOff + 2] !== 0 || b[peOff + 3] !== 0) return null;
  const coff = peOff + 4;
  const machineCode = readU16(b, coff);
  const numSections = readU16(b, coff + 2);
  const optSize = readU16(b, coff + 16);
  const characteristics = readU16(b, coff + 18);
  const opt = coff + 20;
  const magic = readU16(b, opt);
  const is64 = magic === 0x20b;
  const subsystemCode = readU16(b, opt + 68);
  const dataDirOff = opt + (is64 ? 112 : 96);
  const machine =
    machineCode === 0x14c ? 'Intel 386 (x86)' : machineCode === 0x8664 ? 'AMD64 (x64)' : machineCode === 0xaa64 ? 'ARM64' : machineCode === 0x1c4 ? 'ARMv7' : `0x${machineCode.toString(16)}`;
  const subsystem =
    subsystemCode === 2 ? 'Windows GUI' : subsystemCode === 3 ? 'Windows Console' : subsystemCode === 1 ? 'Native / Driver' : subsystemCode === 10 ? 'EFI Application' : `Subsystem ${subsystemCode}`;

  const sectionsOff = opt + optSize;
  const sections: Array<{ name: string; va: number; vsize: number; raw: number }> = [];
  for (let i = 0; i < numSections && sectionsOff + (i + 1) * 40 <= b.length; i++) {
    const so = sectionsOff + i * 40;
    let name = '';
    for (let j = 0; j < 8 && b[so + j]; j++) name += String.fromCharCode(b[so + j]);
    sections.push({ name, vsize: readU32(b, so + 8), va: readU32(b, so + 12), raw: readU32(b, so + 20) });
  }
  const rvaToOff = (rva: number): number => {
    for (const s of sections) if (rva >= s.va && rva < s.va + Math.max(s.vsize, 1)) return rva - s.va + s.raw;
    return -1;
  };

  const imports: string[] = [];
  try {
    const impRva = readU32(b, dataDirOff + 8);
    let off = impRva ? rvaToOff(impRva) : -1;
    for (let guard = 0; off > 0 && off + 20 <= b.length && guard < 128; guard++, off += 20) {
      const nameRva = readU32(b, off + 12);
      if (!nameRva) break;
      const no = rvaToOff(nameRva);
      if (no < 0) break;
      let n = '';
      for (let k = no; k < b.length && b[k] && n.length < 64; k++) n += String.fromCharCode(b[k]);
      imports.push(n);
    }
  } catch {
    /* malformed import table */
  }
  const clrRva = dataDirOff + 14 * 8 + 8 <= b.length ? readU32(b, dataDirOff + 14 * 8) : 0;
  return {
    machine,
    bits: is64 ? 64 : 32,
    subsystem,
    isDotNet: clrRva !== 0,
    isDll: (characteristics & 0x2000) !== 0,
    imports,
    sections: sections.map((s) => s.name),
    embeddedJar: false,
  };
}

/** Reads the package name out of a binary AndroidManifest.xml string pool. */
function parseAxmlPackage(b: Uint8Array): string | undefined {
  try {
    if (readU16(b, 0) !== 0x0003) return undefined;
    const sp = 8;
    if (readU16(b, sp) !== 0x0001) return undefined;
    const count = readU32(b, sp + 8);
    const flags = readU32(b, sp + 16);
    const stringsStart = readU32(b, sp + 20);
    const utf8 = (flags & 0x100) !== 0;
    const strings: string[] = [];
    for (let i = 0; i < Math.min(count, 4000); i++) {
      let o = sp + stringsStart + readU32(b, sp + 28 + i * 4);
      if (utf8) {
        let u16len = b[o++];
        if (u16len & 0x80) o++;
        let u8len = b[o++];
        if (u8len & 0x80) u8len = ((u8len & 0x7f) << 8) | b[o++];
        strings.push(new TextDecoder('utf-8').decode(b.subarray(o, o + u8len)));
        void u16len;
      } else {
        let len = readU16(b, o);
        o += 2;
        if (len & 0x8000) {
          len = ((len & 0x7fff) << 16) | readU16(b, o);
          o += 2;
        }
        let s = '';
        for (let k = 0; k < len; k++) s += String.fromCharCode(readU16(b, o + k * 2));
        strings.push(s);
      }
    }
    return strings.find((s) => /^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,}$/i.test(s) && !/^(android|androidx|com\.google\.android)\./.test(s) && !s.endsWith('.permission'));
  } catch {
    return undefined;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

async function detectProgram(name: string, bytes: Uint8Array): Promise<{ kind: ProgramKind; meta: ProgramMeta; iconDataUrl?: string }> {
  const ext = extOf(name);
  const meta: ProgramMeta = {};

  if (ext === 'java') {
    const src = new TextDecoder().decode(bytes);
    const pkg = src.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const cls = src.match(/public\s+(?:final\s+|abstract\s+)*class\s+(\w+)/)?.[1] || src.match(/class\s+(\w+)/)?.[1] || 'Main';
    meta.mainClass = pkg ? `${pkg}.${cls}` : cls;
    return { kind: 'java-source', meta };
  }
  if (ext === 'class') {
    meta.mainClass = name.replace(/\.class$/i, '');
    meta.classVersion = classMajorVersion(bytes);
    return { kind: 'java-class', meta };
  }
  if (ext === 'html' || ext === 'htm') {
    meta.entry = name;
    return { kind: 'web', meta };
  }
  if (ext === 'com' || ext === 'bat') {
    meta.entry = dosName(name);
    return { kind: 'dos', meta };
  }

  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (ext === 'exe' || ext === 'scr' || ext === 'msi' || (bytes[0] === 0x4d && bytes[1] === 0x5a)) {
    const pe = parsePe(bytes);
    if (!pe) {
      meta.entry = dosName(name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`);
      return { kind: 'dos', meta };
    }
    // Launch4j / JSmooth style wrappers append a JAR after the PE image.
    const pkIdx = findLastZipSignature(bytes);
    if (pkIdx >= 0) {
      try {
        const zip = await JSZip.loadAsync(bytes);
        const manifest = zip.file('META-INF/MANIFEST.MF');
        const hasClass = Object.keys(zip.files).some((f) => f.endsWith('.class'));
        if (manifest || hasClass) {
          pe.embeddedJar = true;
          meta.pe = pe;
          if (manifest) meta.mainClass = (await manifest.async('string')).match(/^Main-Class:\s*(\S+)/m)?.[1];
          meta.classVersion = await firstClassVersion(zip);
          return { kind: 'win32-java', meta };
        }
      } catch {
        /* not a readable embedded archive */
      }
    }
    meta.pe = pe;
    meta.entry = dosName(name);
    return { kind: pe.bits === 16 ? 'dos' : 'win32', meta };
  }

  if (ext === 'apk' || ext === 'xapk' || ext === 'aab') {
    try {
      const zip = await JSZip.loadAsync(bytes);
      const files = Object.keys(zip.files);
      const apk: ApkInfo = {
        dexCount: files.filter((f) => /^classes\d*\.dex$/.test(f)).length,
        nativeAbis: Array.from(new Set(files.filter((f) => f.startsWith('lib/')).map((f) => f.split('/')[1]))).filter(Boolean),
        fileCount: files.length,
      };
      const manifest = zip.file('AndroidManifest.xml');
      if (manifest) apk.packageName = parseAxmlPackage(await manifest.async('uint8array'));
      let iconDataUrl: string | undefined;
      const iconCandidates = files
        .filter((f) => /^res\/(mipmap|drawable)[^/]*\/(ic_launcher|icon|app_icon)[^/]*\.png$/i.test(f))
        .sort((a, b) => (zip.files[b] as any)._data?.uncompressedSize - (zip.files[a] as any)._data?.uncompressedSize);
      if (iconCandidates[0]) iconDataUrl = await blobToDataUrl(new Blob([await zip.file(iconCandidates[0])!.async('uint8array')], { type: 'image/png' }));
      const webRoot = ['assets/www/', 'assets/public/', 'assets/web/', 'assets/'].find((r) => zip.file(`${r}index.html`));
      meta.apk = apk;
      if (webRoot) {
        apk.webEngine = webRoot === 'assets/www/' ? 'Cordova' : webRoot === 'assets/public/' ? 'Capacitor' : 'Generic WebView';
        meta.webRoot = webRoot;
        return { kind: 'apk-web', meta, iconDataUrl };
      }
      return { kind: 'apk-native', meta, iconDataUrl };
    } catch {
      meta.note = 'The APK archive could not be opened.';
      return { kind: 'apk-native', meta };
    }
  }

  if (isZip || ext === 'jar' || ext === 'zip') {
    try {
      const zip = await JSZip.loadAsync(bytes);
      const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
      const manifest = zip.file('META-INF/MANIFEST.MF');
      const hasClass = files.some((f) => f.endsWith('.class'));
      const exes = files.filter((f) => /\.(exe|com|bat)$/i.test(f));
      if ((manifest || hasClass) && (ext === 'jar' || exes.length === 0)) {
        if (manifest) meta.mainClass = (await manifest.async('string')).match(/^Main-Class:\s*(\S+)/m)?.[1];
        meta.classVersion = await firstClassVersion(zip);
        return { kind: 'java-jar', meta };
      }
      if (exes.length) {
        meta.entries = exes;
        const preferred =
          exes.find((f) => !/(setup|install|uninst|config|setsound|readme)/i.test(f) && /\.exe$/i.test(f)) || exes.find((f) => /\.(exe|com)$/i.test(f)) || exes[0];
        meta.entry = preferred;
        return { kind: 'zip-dos', meta };
      }
      const html = files.find((f) => /(^|\/)index\.html?$/i.test(f)) || files.find((f) => /\.html?$/i.test(f));
      if (html) {
        meta.entry = html;
        return { kind: 'web', meta };
      }
    } catch {
      /* fall through */
    }
  }
  return { kind: 'unknown', meta };
}

function findLastZipSignature(b: Uint8Array): number {
  // End-of-central-directory record "PK\x05\x06" near the end of the file.
  for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) {
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) return i;
  }
  return -1;
}

async function firstClassVersion(zip: JSZip): Promise<number | undefined> {
  const cls = Object.keys(zip.files).find((f) => f.endsWith('.class') && !f.startsWith('META-INF/'));
  if (!cls) return undefined;
  return classMajorVersion(await zip.file(cls)!.async('uint8array'));
}

function javaVersionForClass(major?: number): number {
  if (!major || major <= 52) return 8;
  if (major <= 55) return 11;
  if (major <= 61) return 17;
  return 21;
}

// ============================================================================
// Install / uninstall
// ============================================================================
export async function installForeignFiles(files: FileList | File[]): Promise<ForeignProgram[]> {
  const installed: ForeignProgram[] = [];
  for (const file of Array.from(files)) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { kind, meta, iconDataUrl } = await detectProgram(file.name, bytes);
      const prog: ForeignProgram = {
        id: `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        kind,
        addedAt: Date.now(),
        blob: new Blob([bytes]),
        meta,
        iconDataUrl: iconDataUrl || kindIconDataUrl(kind, file.name),
      };
      await dbPut(prog);
      programs.push(prog);
      installed.push(prog);
      bridge?.pushToast('Program Installed', `${file.name} → ${KIND_LABEL[kind].label} · runs on ${KIND_LABEL[kind].engine}`, KIND_LABEL[kind].emoji);
    } catch (e: any) {
      bridge?.pushToast('Install Failed', `${file.name}: ${e?.message || e}`, '⚠️');
    }
  }
  renderDesktopIcons();
  renderLibrary();
  if (installed.length) bridge?.unlockAchievement?.('foreign_program_installed');
  return installed;
}

async function uninstallProgram(id: string): Promise<void> {
  await dbDelete(id);
  programs = programs.filter((p) => p.id !== id);
  renderDesktopIcons();
  renderLibrary();
}

// ============================================================================
// Desktop icons + drag & drop + file picker
// ============================================================================
function renderDesktopIcons(): void {
  const container = document.getElementById('desktop-icons');
  if (!container) return;
  container.querySelectorAll('.icon.foreign-icon').forEach((el) => el.remove());
  const add = (appKey: string, label: string, icon: string, onOpen: () => void, title: string) => {
    const el = document.createElement('div');
    el.className = 'icon foreign-icon';
    el.dataset.app = appKey;
    el.title = title;
    el.innerHTML = `<img src="${esc(icon)}" alt="${esc(label)}" /><span>${esc(label)}</span>`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.icon').forEach((i) => i.classList.remove('selected'));
      el.classList.add('selected');
    });
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      onOpen();
    });
    container.appendChild(el);
  };
  add('foreign-runtime-host', 'Angel Runtime Host', RUNTIME_ICON, () => openRunner('library'), 'Install & run programs from your PC (Java, DOS .exe, Android .apk, web apps)');
  add('foreign-java-workbench', 'Java Workbench', JAVA_WB_ICON, () => openRunner('workbench'), 'Write, compile & run real Java');
  programs.forEach((p) => add(`foreign-${p.id}`, p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name, p.iconDataUrl || kindIconDataUrl(p.kind, p.name), () => void runProgram(p.id), `${p.name} — ${KIND_LABEL[p.kind].label}`));
  window.dispatchEvent(new CustomEvent('angelos:icons-changed'));
}

const RUNTIME_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="5" y="9" width="54" height="40" rx="4" fill="#1e293b" stroke="#000" stroke-width="2.4"/><rect x="10" y="14" width="44" height="30" fill="#0ea5e9"/><text x="20" y="35" font-size="15">☕</text><text x="34" y="35" font-size="14">🤖</text><rect x="22" y="49" width="20" height="5" fill="#94a3b8" stroke="#000" stroke-width="1.5"/><rect x="14" y="54" width="36" height="5" rx="2" fill="#cbd5e1" stroke="#000" stroke-width="1.5"/></svg>',
)}`;
const JAVA_WB_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="6" fill="#fff7ed" stroke="#000" stroke-width="2.4"/><rect x="6" y="6" width="52" height="11" rx="5" fill="#c2410c"/><text x="12" y="34" font-family="monospace" font-size="10" fill="#9a3412">class</text><text x="12" y="46" font-family="monospace" font-size="10" fill="#1d4ed8">main()</text><text x="40" y="54" font-size="16">☕</text></svg>',
)}`;

let filePicker: HTMLInputElement | null = null;
export function openForeignFilePicker(): void {
  if (!filePicker) {
    filePicker = document.createElement('input');
    filePicker.type = 'file';
    filePicker.multiple = true;
    filePicker.style.display = 'none';
    filePicker.addEventListener('change', async () => {
      if (filePicker?.files?.length) {
        const installed = await installForeignFiles(filePicker.files);
        filePicker.value = '';
        if (installed.length === 1) await openRunner('library');
      }
    });
    document.body.appendChild(filePicker);
  }
  filePicker.click();
}

function initDragAndDrop(): void {
  const overlay = document.createElement('div');
  overlay.id = 'foreign-drop-overlay';
  overlay.innerHTML = '<div><b>📥 Drop to install into Angel-OS</b><br><small>.jar · .java · .class · .exe · .com · .zip · .apk · .html — anything goes</small></div>';
  document.body.appendChild(overlay);
  let depth = 0;
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    overlay.classList.add('show');
  });
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.classList.remove('show');
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay.classList.remove('show');
    const files = e.dataTransfer?.files;
    if (files?.length) {
      const installed = await installForeignFiles(files);
      if (installed.length === 1) void runProgram(installed[0].id);
    }
  });
}

/** Adds the "Install from My PC" bar to the Ability to Install window. */
export function mountForeignInstallerBar(windowEl: HTMLElement): void {
  if (windowEl.querySelector('#ability-foreign-bar')) return;
  const host = windowEl.querySelector('#ability-pane-exe');
  if (!host) return;
  const bar = document.createElement('div');
  bar.id = 'ability-foreign-bar';
  bar.className = 'ability-exe-portable-bar';
  bar.innerHTML = `<div><b>📂 Install from My PC:</b> real programs from your computer — Java (.jar/.java), DOS .exe/.com/.zip, Android .apk, web apps. Or drag files onto the desktop.</div>
    <div style="display:flex;gap:5px;flex-wrap:wrap">
      <button class="win95-btn" id="ability-foreign-pick-btn" style="background:#dcfce7;font-weight:700">📂 Install from My PC…</button>
      <button class="win95-btn" id="ability-foreign-lib-btn">🧩 Runtime Host Library</button>
    </div>`;
  host.insertBefore(bar, host.firstChild);
  bar.querySelector('#ability-foreign-pick-btn')?.addEventListener('click', () => {
    bridge?.sfx.playClick();
    openForeignFilePicker();
  });
  bar.querySelector('#ability-foreign-lib-btn')?.addEventListener('click', () => {
    bridge?.sfx.playClick();
    void openRunner('library');
  });
}

// ============================================================================
// Runner window
// ============================================================================
type View = 'library' | 'workbench' | 'java' | 'dos' | 'web' | 'info';
let runnerEl: HTMLElement | null = null;
let currentDos: any = null;

function q<T extends HTMLElement>(sel: string): T | null {
  return (runnerEl?.querySelector(sel) as T) || null;
}

function setView(view: View, title: string, badge: string): void {
  if (!runnerEl) return;
  const stage = q<HTMLDivElement>('#frh-stage');
  if (!stage) return;
  stage.dataset.view = view;
  const t = q<HTMLSpanElement>('#frh-title');
  const k = q<HTMLSpanElement>('#frh-kind');
  if (t) t.textContent = title;
  if (k) {
    k.textContent = badge;
    k.style.display = badge ? 'inline-block' : 'none';
  }
}

function stopDos(): void {
  try {
    currentDos?.stop?.();
  } catch {
    /* ignore */
  }
  currentDos = null;
  const host = q<HTMLDivElement>('#frh-dos-host');
  if (host) host.innerHTML = '';
}

export async function openRunner(view: 'library' | 'workbench' = 'library'): Promise<void> {
  await bridge?.openApp('foreignRunnerApp', true);
  if (view === 'library') {
    stopDos();
    setView('library', 'Angel Runtime Host — Library', '');
    renderLibrary();
  } else {
    setView('workbench', 'Java Workbench — write, compile & run real Java', '☕ ECJ + CheerpJ');
  }
}

export function initForeignRunnerApp(windowEl: HTMLDivElement): void {
  runnerEl = windowEl;
  q('#frh-stop')?.addEventListener('click', () => {
    bridge?.sfx.playClick();
    stopDos();
    void openRunner('library');
  });
  q('#frh-install')?.addEventListener('click', () => openForeignFilePicker());
  q('#frh-console-toggle')?.addEventListener('click', () => windowEl.classList.toggle('frh-console-open'));
  q('#frh-open-wb')?.addEventListener('click', () => void openRunner('workbench'));

  const tplSel = q<HTMLSelectElement>('#frh-wb-template');
  const editor = q<HTMLTextAreaElement>('#frh-wb-editor');
  if (tplSel && editor) {
    tplSel.innerHTML = Object.keys(JAVA_TEMPLATES).map((k) => `<option>${esc(k)}</option>`).join('');
    editor.value = window.localStorage.getItem('__angelos_java_wb_src') || JAVA_TEMPLATES['Hello World'];
    tplSel.addEventListener('change', () => {
      editor.value = JAVA_TEMPLATES[tplSel.value] || editor.value;
    });
    editor.addEventListener('input', () => window.localStorage.setItem('__angelos_java_wb_src', editor.value));
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = editor.selectionStart;
        editor.setRangeText('    ', s, editor.selectionEnd, 'end');
      }
    });
  }
  q('#frh-wb-run')?.addEventListener('click', () => {
    if (editor) void compileAndRunJava(editor.value, 'Main.java', true);
  });
  q('#frh-wb-save')?.addEventListener('click', async () => {
    if (!editor) return;
    const cls = editor.value.match(/public\s+(?:final\s+)?class\s+(\w+)/)?.[1] || 'Main';
    await installForeignFiles([new File([editor.value], `${cls}.java`, { type: 'text/x-java' })]);
  });
  renderLibrary();
}

function renderLibrary(): void {
  const lib = q<HTMLDivElement>('#frh-library');
  if (!lib) return;
  const bundled = BUNDLED_JAVA.map(
    (b) => `<div class="frh-card"><div class="frh-card-ico">${b.emoji}</div><div class="frh-card-body"><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>
      <button class="win95-btn" data-run-bundled="${esc(b.id)}">▶ Run</button></div>`,
  ).join('');
  const mine = programs.length
    ? programs
        .map(
          (p) => `<div class="frh-card"><img class="frh-card-img" src="${esc(p.iconDataUrl || kindIconDataUrl(p.kind, p.name))}" alt=""><div class="frh-card-body"><b>${esc(p.name)}</b>
        <small>${esc(KIND_LABEL[p.kind].label)} · ${fmtSize(p.size)} · ${esc(KIND_LABEL[p.kind].engine)}</small></div>
        <button class="win95-btn" data-run="${esc(p.id)}">▶ Run</button><button class="win95-btn" data-del="${esc(p.id)}" title="Uninstall">🗑</button></div>`,
        )
        .join('')
    : `<div class="frh-empty">Nothing installed from your PC yet. Click <b>📂 Install from My PC…</b> or drag files anywhere onto Angel-OS.</div>`;
  lib.innerHTML = `
    <div class="frh-section"><h3>📂 Installed from My PC</h3>${mine}</div>
    <div class="frh-section"><h3>☕ Bundled Java Programs <small>(real Java bytecode on the CheerpJ JVM)</small></h3>${bundled}
      <div class="frh-card"><div class="frh-card-ico">🛠️</div><div class="frh-card-body"><b>Java Workbench</b><small>Write .java source, compile it with the Eclipse compiler and run it — all inside the browser.</small></div><button class="win95-btn" id="frh-lib-wb">Open</button></div>
    </div>
    <div class="frh-section frh-support"><h3>🧭 What runs where</h3>
      <table>
        <tr><td>☕ Java .jar / .class / .java</td><td><b>Runs</b> on a real JVM (Java 8, 11, 17 &amp; 21 bytecode). Swing/AWT windows appear here.</td></tr>
        <tr><td>💾 DOS .exe / .com / .bat / .zip</td><td><b>Runs</b> in DOSBox. Keyboard, mouse &amp; sound work.</td></tr>
        <tr><td>🪟 Windows .exe wrapping Java</td><td><b>Runs</b> — the embedded JAR is extracted and started on the JVM.</td></tr>
        <tr><td>🪟 Other Windows .exe</td><td>Inspected (CPU, subsystem, DLLs). 32-bit apps can be opened in the Wine-based ExeBrowser; modern 64-bit / .NET apps can't run in a browser.</td></tr>
        <tr><td>🤖 Android .apk</td><td>Web-based APKs (Cordova / Capacitor) <b>run</b>. Native APKs are inspected (package, icon, ABIs) but can't execute.</td></tr>
        <tr><td>🌐 .html / web .zip</td><td><b>Runs</b> in a sandbox.</td></tr>
      </table>
    </div>`;
  lib.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) => b.addEventListener('click', () => void runProgram(b.dataset.run!)));
  lib.querySelectorAll<HTMLButtonElement>('[data-run-bundled]').forEach((b) => b.addEventListener('click', () => void runBundledJava(b.dataset.runBundled!)));
  lib.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) =>
    b.addEventListener('click', () => {
      const p = programs.find((x) => x.id === b.dataset.del);
      if (p && window.confirm(`Uninstall ${p.name} from Angel-OS?`)) void uninstallProgram(p.id);
    }),
  );
  lib.querySelector('#frh-lib-wb')?.addEventListener('click', () => void openRunner('workbench'));
}

// ============================================================================
// Java engine (CheerpJ)
// ============================================================================
let cheerpjReady: Promise<number> | null = null;
let ecjLoaded = false;
const g = window as any;

function consoleEl(): HTMLPreElement | null {
  return document.getElementById('console') as HTMLPreElement | null;
}

function consoleLine(text: string): void {
  const c = consoleEl();
  if (!c) return;
  c.textContent += `${text}\n`;
  c.scrollTop = c.scrollHeight;
}

function ensureCheerpJ(wantVersion: number): Promise<number> {
  if (cheerpjReady) return cheerpjReady;
  if (location.protocol === 'file:') {
    return Promise.reject(new Error('The Java engine needs Angel-OS to be served over http(s) — open the live site or run `npx serve .` in the portable folder.'));
  }
  const stored = Number(window.localStorage.getItem(CJ_VERSION_KEY) || 0);
  const version = Math.max(stored || 8, wantVersion);
  cheerpjReady = (async () => {
    consoleLine(`[Angel Runtime] Starting CheerpJ JVM (Java ${version})… first start downloads the runtime, later starts are cached.`);
    await loadScript(CHEERPJ_LOADER);
    await g.cheerpjInit({ version, status: 'none', clipboardMode: 'system' });
    const host = q<HTMLDivElement>('#frh-java-host');
    if (host) g.cheerpjCreateDisplay(-1, -1, host);
    window.localStorage.setItem(CJ_VERSION_KEY, String(version));
    consoleLine(`[Angel Runtime] JVM ready (Java ${version}).`);
    return version;
  })();
  cheerpjReady.catch(() => {
    cheerpjReady = null;
  });
  return cheerpjReady;
}

/** CheerpJ can only boot one Java version per page; reload once if a newer one is needed. */
async function requireJava(version: number, pendingId?: string): Promise<boolean> {
  const running = cheerpjReady ? await cheerpjReady.catch(() => 0) : 0;
  if (running && running < version) {
    const ok = window.confirm(`This program needs Java ${version}, but the JVM already started with Java ${running}. Restart Angel-OS now to switch to Java ${version}? (Your desktop is kept.)`);
    if (ok) {
      window.localStorage.setItem(CJ_VERSION_KEY, String(version));
      if (pendingId) window.sessionStorage.setItem(PENDING_RUN_KEY, pendingId);
      window.location.reload();
    }
    return false;
  }
  await ensureCheerpJ(version);
  return true;
}

async function runJarBytes(title: string, bytes: Uint8Array, mainClass: string | undefined, classVersion: number | undefined, pendingId?: string): Promise<void> {
  setView('java', title, '☕ CheerpJ JVM');
  runnerEl?.classList.add('frh-console-open');
  try {
    if (!(await requireJava(javaVersionForClass(classVersion), pendingId))) return;
    const path = `/str/fp/${Date.now()}_${title.replace(/[^\w.-]/g, '_')}${title.endsWith('.jar') ? '' : '.jar'}`;
    g.cheerpOSAddStringFile(path, bytes);
    consoleLine(`[Angel Runtime] java -jar ${title}${mainClass ? `  (Main-Class: ${mainClass})` : ''}`);
    const code = mainClass ? await g.cheerpjRunMain(mainClass, path) : await g.cheerpjRunJar(path);
    consoleLine(`[Angel Runtime] ${title} exited with code ${code}.`);
  } catch (e: any) {
    consoleLine(`[Angel Runtime] Java error: ${e?.message || e}`);
  }
}

async function runBundledJava(id: string): Promise<void> {
  const b = BUNDLED_JAVA.find((x) => x.id === id);
  if (!b) return;
  await bridge?.openApp('foreignRunnerApp', true);
  setView('java', b.name, '☕ CheerpJ JVM');
  try {
    const resp = await fetch(`${BASE_URL}java/${b.file}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${b.file}`);
    await runJarBytes(b.file, new Uint8Array(await resp.arrayBuffer()), undefined, 52);
  } catch (e: any) {
    consoleLine(`[Angel Runtime] ${e?.message || e}`);
  }
}

async function compileAndRunJava(source: string, fileName: string, fromWorkbench = false, pendingId?: string): Promise<void> {
  await bridge?.openApp('foreignRunnerApp', true);
  if (!fromWorkbench) setView('java', fileName, '☕ ECJ + CheerpJ');
  runnerEl?.classList.add('frh-console-open');
  try {
    if (!(await requireJava(8, pendingId))) return;
    if (!ecjLoaded) {
      consoleLine('[Angel Runtime] Loading Eclipse ECJ compiler (1.9 MB, cached after first use)…');
      const resp = await fetch(`${BASE_URL}java/ecj.jar`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ecj.jar`);
      g.cheerpOSAddStringFile('/str/ecj.jar', new Uint8Array(await resp.arrayBuffer()));
      ecjLoaded = true;
    }
    const pkg = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    const cls = source.match(/public\s+(?:final\s+|abstract\s+)*class\s+(\w+)/)?.[1] || fileName.replace(/\.java$/i, '');
    const stamp = Date.now();
    const srcPath = `/str/src${stamp}/${cls}.java`;
    const outDir = `/files/javawb/${stamp}/`;
    g.cheerpOSAddStringFile(srcPath, new TextEncoder().encode(source));
    consoleLine(`[Angel Runtime] javac ${cls}.java  (ECJ, -source 1.8)`);
    const rc = await g.cheerpjRunMain('org.eclipse.jdt.internal.compiler.batch.Main', '/str/ecj.jar', '-8', '-nowarn', '-proceedOnError:false', '-d', outDir, srcPath);
    if (rc !== 0) {
      consoleLine(`[Angel Runtime] Compilation failed (exit ${rc}). Fix the errors above and run again.`);
      return;
    }
    const main = pkg ? `${pkg}.${cls}` : cls;
    consoleLine(`[Angel Runtime] Compiled OK → running ${main}`);
    const code = await g.cheerpjRunMain(main, outDir);
    consoleLine(`[Angel Runtime] ${main} exited with code ${code}.`);
  } catch (e: any) {
    consoleLine(`[Angel Runtime] Java error: ${e?.message || e}`);
  }
}

// ============================================================================
// DOS engine (js-dos)
// ============================================================================
async function runDos(title: string, files: Array<{ path: string; contents: Uint8Array }>, entry: string): Promise<void> {
  setView('dos', title, '💾 DOSBox (js-dos)');
  stopDos();
  const host = q<HTMLDivElement>('#frh-dos-host');
  if (!host) return;
  host.innerHTML = '<div class="frh-loading">Booting DOSBox…</div>';
  try {
    loadCss(JSDOS_CSS);
    await loadScript(JSDOS_JS);
    host.innerHTML = '';
    const mount = document.createElement('div');
    mount.style.cssText = 'width:100%;height:100%;';
    host.appendChild(mount);
    const parts = entry.split('/');
    const exe = parts.pop() || entry;
    const dir = parts.join('\\');
    const conf = `[cpu]\ncycles=auto\n[autoexec]\nmount c .\nc:\n${dir ? `cd ${dir}\n` : ''}${exe}\n`;
    currentDos = g.Dos(mount, { dosboxConf: conf, initFs: files, autoStart: true, kiosk: true, noCloud: true, theme: 'dark' });
  } catch (e: any) {
    host.innerHTML = `<div class="frh-loading">⚠️ ${esc(e?.message || String(e))}</div>`;
  }
}

// ============================================================================
// Web engine (sandboxed iframe with inlined assets)
// ============================================================================
const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', mp4: 'video/mp4', json: 'application/json',
};

function resolvePath(baseDir: string, ref: string): string {
  const parts = (baseDir + ref.split(/[?#]/)[0]).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}

async function buildInlinedHtml(zip: JSZip, entryPath: string): Promise<string> {
  const baseDir = entryPath.includes('/') ? entryPath.slice(0, entryPath.lastIndexOf('/') + 1) : '';
  let html = await zip.file(entryPath)!.async('string');
  const isLocal = (r: string) => r && !/^(https?:|data:|blob:|\/\/|#|mailto:|javascript:)/i.test(r);
  const dataUrl = async (path: string): Promise<string | null> => {
    const f = zip.file(path);
    if (!f) return null;
    const b64 = await f.async('base64');
    return `data:${MIME[extOf(path)] || 'application/octet-stream'};base64,${b64}`;
  };
  const inlineCss = async (css: string, cssDir: string): Promise<string> => {
    const refs = Array.from(css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)).map((m) => m[1]).filter(isLocal);
    for (const r of Array.from(new Set(refs))) {
      const d = await dataUrl(resolvePath(cssDir, r));
      if (d) css = css.split(r).join(d);
    }
    return css;
  };
  // Scripts
  const scripts = Array.from(html.matchAll(/<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi));
  for (const m of scripts) {
    if (!isLocal(m[2])) continue;
    const p = resolvePath(baseDir, m[2]);
    if (/(^|\/)(cordova|capacitor)\.js$/i.test(p) && !zip.file(p)) {
      html = html.replace(m[0], '');
      continue;
    }
    const f = zip.file(p);
    const code = f ? (await f.async('string')).replace(/<\/script/gi, '<\\/script') : `console.warn('missing ${p}')`;
    const typeAttr = /type\s*=\s*["']module["']/i.test(m[1] + m[3]) ? ' type="module"' : '';
    html = html.replace(m[0], () => `<script${typeAttr}>${code}</script>`);
  }
  // Stylesheets
  const links = Array.from(html.matchAll(/<link\b[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi));
  for (const m of links) {
    const href = m[0].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href || !isLocal(href)) continue;
    const p = resolvePath(baseDir, href);
    const f = zip.file(p);
    if (!f) continue;
    const css = await inlineCss(await f.async('string'), p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
    html = html.replace(m[0], () => `<style>${css}</style>`);
  }
  // Images / media / inline styles
  const srcRefs = Array.from(html.matchAll(/\b(?:src|poster)\s*=\s*["']([^"']+)["']/gi)).map((m) => m[1]).filter(isLocal);
  for (const r of Array.from(new Set(srcRefs))) {
    const d = await dataUrl(resolvePath(baseDir, r));
    if (d) html = html.split(`"${r}"`).join(`"${d}"`).split(`'${r}'`).join(`'${d}'`);
  }
  html = await inlineCss(html, baseDir);
  const shim = `<script>window.cordova=window.cordova||{platformId:'browser',version:'angelos'};window.Capacitor=window.Capacitor||{isNativePlatform:function(){return false},getPlatform:function(){return 'web'}};document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){document.dispatchEvent(new Event('deviceready'))},50)});</script>`;
  return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, (h) => h + shim) : shim + html;
}

async function runWeb(title: string, html: string): Promise<void> {
  setView('web', title, '🌐 Sandboxed WebView');
  const frame = q<HTMLIFrameElement>('#frh-web-host');
  if (frame) frame.srcdoc = html;
}

// ============================================================================
// Info pages (Win32 PE, native APK, unknown)
// ============================================================================
function showInfo(p: ForeignProgram, html: string): void {
  setView('info', p.name, `${KIND_LABEL[p.kind].emoji} ${KIND_LABEL[p.kind].engine}`);
  const host = q<HTMLDivElement>('#frh-info-host');
  if (!host) return;
  host.innerHTML = html;
  host.querySelector('[data-act="dos"]')?.addEventListener('click', async () => {
    const bytes = new Uint8Array(await p.blob.arrayBuffer());
    void runDos(p.name, [{ path: dosName(p.name), contents: bytes }], dosName(p.name));
  });
  host.querySelector('[data-act="download"]')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(p.blob);
    a.download = p.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
  host.querySelector('[data-act="wine"]')?.addEventListener('click', () => window.open(EXEBROWSER_URL, '_blank', 'noopener'));
  host.querySelector('[data-act="lib"]')?.addEventListener('click', () => void openRunner('library'));
}

function winInfoHtml(p: ForeignProgram): string {
  const pe = p.meta.pe!;
  const can32 = pe.bits === 32 && !pe.isDotNet && pe.machine.includes('386');
  const verdict = pe.isDotNet
    ? 'This is a .NET program. It needs the .NET runtime on real Windows, which doesn\'t exist in a browser.'
    : pe.bits === 64
      ? 'This is a 64-bit Windows program. Browser emulators currently only handle 16/32-bit x86 code, so it can\'t execute here.'
      : can32
        ? 'This is a 32-bit Windows program. It can\'t run inside DOSBox, but the Wine-based ExeBrowser (WebAssembly) can run many 32-bit apps: click "Open in ExeBrowser", then drop this same file there.'
        : 'This executable targets a CPU the browser emulators don\'t support.';
  return `<div class="frh-info-card">
    <div class="frh-info-head"><img src="${esc(p.iconDataUrl || '')}" alt=""><div><h2>${esc(p.name)}</h2><div>${esc(KIND_LABEL[p.kind].label)} · ${fmtSize(p.size)}</div></div></div>
    <table class="frh-kv">
      <tr><td>CPU</td><td>${esc(pe.machine)} · ${pe.bits}-bit</td></tr>
      <tr><td>Subsystem</td><td>${esc(pe.subsystem)}${pe.isDll ? ' (DLL)' : ''}</td></tr>
      <tr><td>.NET assembly</td><td>${pe.isDotNet ? 'Yes' : 'No'}</td></tr>
      <tr><td>Sections</td><td>${esc(pe.sections.join(', ') || '—')}</td></tr>
      <tr><td>Needs DLLs</td><td>${esc(pe.imports.slice(0, 24).join(', ') || '—')}${pe.imports.length > 24 ? ' …' : ''}</td></tr>
    </table>
    <p class="frh-verdict">${esc(verdict)}</p>
    <div class="frh-actions">
      ${can32 ? '<button class="win95-btn" data-act="wine" style="font-weight:700;background:#dbeafe">🍷 Open in ExeBrowser (Wine)</button>' : ''}
      <button class="win95-btn" data-act="dos">💾 Try in DOSBox anyway</button>
      <button class="win95-btn" data-act="download">⬇ Save copy</button>
      <button class="win95-btn" data-act="lib">← Library</button>
    </div></div>`;
}

function apkInfoHtml(p: ForeignProgram): string {
  const a = p.meta.apk || { dexCount: 0, nativeAbis: [], fileCount: 0 };
  return `<div class="frh-info-card">
    <div class="frh-info-head"><img src="${esc(p.iconDataUrl || '')}" alt=""><div><h2>${esc(p.name)}</h2><div>${esc(a.packageName || 'unknown package')} · ${fmtSize(p.size)}</div></div></div>
    <table class="frh-kv">
      <tr><td>Package</td><td>${esc(a.packageName || '—')}</td></tr>
      <tr><td>Dalvik code</td><td>${a.dexCount} classes*.dex file(s)</td></tr>
      <tr><td>Native libraries</td><td>${esc(a.nativeAbis.join(', ') || 'none')}</td></tr>
      <tr><td>Files in APK</td><td>${a.fileCount}</td></tr>
    </table>
    <p class="frh-verdict">${esc(p.meta.note || 'This is a native Android app (Dalvik/ART bytecode). There is no Android runtime that runs in a browser, so it can be installed and inspected here but not executed. Web-based APKs (Cordova, Capacitor, Ionic) do run.')}</p>
    <div class="frh-actions"><button class="win95-btn" data-act="download">⬇ Save copy</button><button class="win95-btn" data-act="lib">← Library</button></div></div>`;
}

async function unknownInfoHtml(p: ForeignProgram): Promise<string> {
  const bytes = new Uint8Array(await p.blob.slice(0, 4096).arrayBuffer());
  const printable = bytes.filter((c) => c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)).length / Math.max(1, bytes.length);
  const body =
    printable > 0.9
      ? `<pre class="frh-hex">${esc(new TextDecoder().decode(bytes))}</pre>`
      : `<pre class="frh-hex">${esc(
          Array.from({ length: Math.ceil(Math.min(bytes.length, 512) / 16) }, (_, r) => {
            const row = bytes.subarray(r * 16, r * 16 + 16);
            return `${(r * 16).toString(16).padStart(6, '0')}  ${Array.from(row).map((x) => x.toString(16).padStart(2, '0')).join(' ').padEnd(48)}  ${Array.from(row).map((x) => (x >= 32 && x < 127 ? String.fromCharCode(x) : '.')).join('')}`;
          }).join('\n'),
        )}</pre>`;
  return `<div class="frh-info-card"><div class="frh-info-head"><img src="${esc(p.iconDataUrl || '')}" alt=""><div><h2>${esc(p.name)}</h2><div>${fmtSize(p.size)} · no runnable format detected</div></div></div>
    ${body}<div class="frh-actions"><button class="win95-btn" data-act="dos">💾 Try in DOSBox</button><button class="win95-btn" data-act="download">⬇ Save copy</button><button class="win95-btn" data-act="lib">← Library</button></div></div>`;
}

// ============================================================================
// Dispatcher
// ============================================================================
export async function runProgram(id: string): Promise<void> {
  const p = programs.find((x) => x.id === id);
  if (!p) return;
  await bridge?.openApp('foreignRunnerApp', true);
  stopDos();
  const bytes = new Uint8Array(await p.blob.arrayBuffer());
  switch (p.kind) {
    case 'java-jar':
    case 'win32-java':
      await runJarBytes(p.name, bytes, p.meta.mainClass, p.meta.classVersion, p.id);
      break;
    case 'java-class': {
      setView('java', p.name, '☕ CheerpJ JVM');
      runnerEl?.classList.add('frh-console-open');
      try {
        if (!(await requireJava(javaVersionForClass(p.meta.classVersion), p.id))) break;
        const dir = `/str/cls${Date.now()}/`;
        g.cheerpOSAddStringFile(`${dir}${p.name}`, bytes);
        consoleLine(`[Angel Runtime] java ${p.meta.mainClass}`);
        const code = await g.cheerpjRunMain(p.meta.mainClass, dir);
        consoleLine(`[Angel Runtime] exited with code ${code}.`);
      } catch (e: any) {
        consoleLine(`[Angel Runtime] Java error: ${e?.message || e}`);
      }
      break;
    }
    case 'java-source':
      await compileAndRunJava(new TextDecoder().decode(bytes), p.name, false, p.id);
      break;
    case 'dos':
      await runDos(p.name, [{ path: p.meta.entry || dosName(p.name), contents: bytes }], p.meta.entry || dosName(p.name));
      break;
    case 'zip-dos': {
      const zip = await JSZip.loadAsync(bytes);
      const files: Array<{ path: string; contents: Uint8Array }> = [];
      for (const [path, entry] of Object.entries(zip.files)) if (!entry.dir) files.push({ path, contents: await entry.async('uint8array') });
      await runDos(p.name, files, p.meta.entry || files[0]?.path || '');
      break;
    }
    case 'apk-web': {
      const zip = await JSZip.loadAsync(bytes);
      await runWeb(p.name, await buildInlinedHtml(zip, `${p.meta.webRoot}index.html`));
      break;
    }
    case 'web': {
      if (extOf(p.name) === 'html' || extOf(p.name) === 'htm') await runWeb(p.name, new TextDecoder().decode(bytes));
      else await runWeb(p.name, await buildInlinedHtml(await JSZip.loadAsync(bytes), p.meta.entry || 'index.html'));
      break;
    }
    case 'win32':
      showInfo(p, winInfoHtml(p));
      break;
    case 'apk-native':
      showInfo(p, apkInfoHtml(p));
      break;
    default:
      showInfo(p, await unknownInfoHtml(p));
  }
}

// ============================================================================
// Boot
// ============================================================================
export async function initForeignRuntime(): Promise<void> {
  initDragAndDrop();
  try {
    programs = await dbAll();
  } catch {
    programs = [];
  }
  renderDesktopIcons();
  const pending = window.sessionStorage.getItem(PENDING_RUN_KEY);
  if (pending) {
    window.sessionStorage.removeItem(PENDING_RUN_KEY);
    setTimeout(() => void runProgram(pending), 1500);
  }
}

/** Test/automation hook: installs raw bytes as if dropped from the host PC. */
(window as any).__angelosInstallForeign = async (name: string, bytes: Uint8Array | number[]) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const [p] = await installForeignFiles([new File([arr], name)]);
  return p?.id;
};
(window as any).__angelosRunForeign = (id: string) => runProgram(id);
(window as any).__angelosRunBundledJava = (id: string) => runBundledJava(id);
