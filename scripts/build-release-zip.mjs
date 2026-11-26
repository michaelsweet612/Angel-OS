import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '2.1.0';
const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(rootDir, 'releases');
const zipFileName = `Angel-OS-v${version}-portable-web.zip`;
const outPath = path.join(releasesDir, zipFileName);

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const zip = new JSZip();
let addedFiles = 0;

function addDirectoryRecursive(srcDir, zipPrefix = '', excludeRelPrefixes = []) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);
    const relPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    const normalizedRel = relPath.replace(/\\/g, '/');

    if (excludeRelPrefixes.some((prefix) => normalizedRel === prefix || normalizedRel.startsWith(`${prefix}/`))) {
      continue;
    }

    if (entry.isDirectory()) {
      addDirectoryRecursive(fullPath, normalizedRel, excludeRelPrefixes);
    } else if (entry.isFile()) {
      zip.file(normalizedRel, fs.readFileSync(fullPath));
      addedFiles += 1;
    }
  }
}

function addSingleFileIfPresent(srcRelPath, targetZipPath = srcRelPath) {
  const fullPath = path.join(rootDir, srcRelPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    zip.file(targetZipPath, fs.readFileSync(fullPath));
    addedFiles += 1;
  }
}

// 1. Prebuilt offline web app (dist/), excluding temporary AI Studio preview attachments
addDirectoryRecursive(distDir, '', ['assets/aistudio']);

// 2. Physical Hardware Booter bare-metal toolchain
addDirectoryRecursive(path.join(rootDir, 'physical-booter'), 'physical-booter');

// 3. Java sample sources (compiled JARs already bundled inside dist/java/)
addDirectoryRecursive(path.join(rootDir, 'java-src'), 'java-src');

// 4. Repository release docs and personal-use license
addSingleFileIfPresent('LICENSE');
addSingleFileIfPresent('CHANGELOG.md');
addSingleFileIfPresent('README.md');

// 5. Offline quick-start instructions
const quickstart = [
  `Angel OS v${version} — Portable Offline Bundle`,
  '============================================================',
  '',
  'How to Run Locally (Personal Use Only — see LICENSE):',
  '1. Extract this ZIP archive to any folder on your computer.',
  '2. Open a terminal inside the extracted folder and run ONE of:',
  '     npx serve .',
  '     python3 -m http.server 3000',
  '3. Open http://localhost:3000 in Chrome, Edge, or Firefox.',
  '',
  'Included in This Bundle:',
  '- Prebuilt AngelOS-web offline PWA & static web application',
  '- Bundled Java programs (java/*.jar) and sample sources (java-src/)',
  '- Physical Hardware Booter toolkit (physical-booter/)',
  '- Full changelog (CHANGELOG.md) and license (LICENSE)',
  '',
  `Release Version: v${version}`,
  'Copyright 2026 Angel OS',
  '',
].join('\r\n');

zip.file('OFFLINE_QUICKSTART.txt', quickstart);
addedFiles += 1;

fs.mkdirSync(releasesDir, { recursive: true });

// Remove stale version zips in releases/ so only the latest built release artifact stays clean
for (const existing of fs.readdirSync(releasesDir)) {
  if (existing.endsWith('.zip') && existing !== zipFileName) {
    try {
      fs.unlinkSync(path.join(releasesDir, existing));
    } catch {
      // ignore
    }
  }
}

const buffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});

fs.writeFileSync(outPath, buffer);
const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
console.log(`Built ${zipFileName} (${addedFiles} files, ${sizeMb} MB) -> releases/${zipFileName}`);
