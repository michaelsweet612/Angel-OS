/**
 * Angel OS 500-App Store Catalog & Interactive Mini-App Engine Runtime
 * Adds 500 distinct, categorized, installable & launchable applications
 * backed by 14 genuine interactive engines (games, calculators, converters,
 * WebAudio synths, pixel/color studios, dev tools, productivity trackers,
 * science labs, text processors, dice/RPG sims, diagnostics & references).
 */
import type { SoftwarePackage } from './osSystemCore';

export type StoreCategory =
  | 'games'
  | 'calculators'
  | 'creative'
  | 'devtools'
  | 'productivity'
  | 'science'
  | 'text'
  | 'utilities';

export type MiniEngineType =
  | 'calculator_formula'
  | 'unit_converter'
  | 'arcade_reflex_grid'
  | 'puzzle_board'
  | 'quiz_word_game'
  | 'audio_synth_studio'
  | 'pixel_color_studio'
  | 'dev_code_tool'
  | 'productivity_tracker'
  | 'text_studio'
  | 'science_math_lab'
  | 'system_tester'
  | 'dice_rpg_sim'
  | 'reference_handbook';

export interface StoreAppMeta {
  pkgId: string;
  name: string;
  category: StoreCategory;
  engineType: MiniEngineType;
  variant: string;
  accentColor: string;
  icon: string;
  description: string;
  publisher: string;
  version: string;
  sizeMB: number;
  exeName: string;
  setupExeFileName: string;
  params?: Record<string, any>;
}

export interface StoreHostBridge {
  saveTextToDocuments: (fileName: string, content: string) => void;
  saveImageToPictures: (fileName: string, dataUrl: string) => void;
  playClick: () => void;
  pushToast: (title: string, msg: string, icon?: string) => void;
}

interface RawAppSeed {
  name: string;
  icon: string;
  engine: MiniEngineType;
  variant: string;
  desc: string;
  params?: Record<string, any>;
}

const CATEGORY_COLORS: Record<StoreCategory, string> = {
  games: '#dc2626',
  calculators: '#0284c7',
  creative: '#9333ea',
  devtools: '#0f766e',
  productivity: '#2563eb',
  science: '#4f46e5',
  text: '#b45309',
  utilities: '#334155',
};

const CATEGORY_PUBLISHERS: Record<StoreCategory, string[]> = {
  games: ['Angel Arcade Labs', 'PixelForge Interactive', 'BitShift Games', 'NovaPlay Studio'],
  calculators: ['Angel Finance Works', 'QuantCore Tools', 'PrecisionCalc Soft', 'MetricLabs'],
  creative: ['Angel Creative Suite', 'ChromaWave Labs', 'SynthCraft Audio', 'PixelCanvas Co.'],
  devtools: ['Angel DevWorks', 'ByteSmith Systems', 'CodeBench Tools', 'TerminalCraft'],
  productivity: ['Angel Office Suite', 'FocusFlow Apps', 'DeskGrid Works', 'TempoPlan'],
  science: ['Angel Science Lab', 'HelixMath Systems', 'OrbitalCalc Soft', 'AtomBench'],
  text: ['Angel Ink Studio', 'TypeCraft Works', 'WordPulse Tools', 'ScriptForge'],
  utilities: ['Angel System Tools', 'DiagCore Labs', 'HardwareBench', 'UtilityBox'],
};

// Curated base blueprints per category; expanded cleanly into 500 distinct themed & parameterized apps
const GAMES_BASES: RawAppSeed[] = [
  { name: 'Cyber Clicker', icon: '⚡', engine: 'arcade_reflex_grid', variant: 'clicker', desc: 'Upgrade-driven idle clicker with combo multipliers and auto-generators.' },
  { name: 'Neon Reaction Lab', icon: '🎯', engine: 'arcade_reflex_grid', variant: 'reaction', desc: 'Millisecond reflex arena measuring visual reaction latency and streaks.' },
  { name: 'Pixel Whack Arena', icon: '🔨', engine: 'arcade_reflex_grid', variant: 'whack', desc: 'Fast-paced 3x3 target whack arcade game with escalating speed.' },
  { name: 'Memory Flip Vault', icon: '🃏', engine: 'puzzle_board', variant: 'memory', desc: 'Classic card-matching concentration puzzle with move counter and timer.' },
  { name: 'Lights Out Matrix', icon: '💡', engine: 'puzzle_board', variant: 'lightsout', desc: 'Toggle adjacent cells on a 5x5 grid until every light is extinguished.' },
  { name: 'Tic-Tac-Toe Tactician', icon: '❌', engine: 'puzzle_board', variant: 'tictactoe', desc: 'Play 3x3 Tic-Tac-Toe against an adaptive Angel OS opponent.' },
  { name: 'Sliding 15-Tile', icon: '🧩', engine: 'puzzle_board', variant: 'slide15', desc: 'Classic 4x4 sliding tile brainteaser with shuffle and move tracker.' },
  { name: 'Codebreaker Master', icon: '🔐', engine: 'puzzle_board', variant: 'mastermind', desc: 'Crack the secret 4-digit code using exact and partial match clues.' },
  { name: 'Word Scramble Blitz', icon: '🔤', engine: 'quiz_word_game', variant: 'scramble', desc: 'Unscramble rapid-fire themed words against the clock.' },
  { name: 'Speed Math Duel', icon: '➗', engine: 'quiz_word_game', variant: 'mathblitz', desc: 'Mental arithmetic sprint with streak bonuses and difficulty scaling.' },
  { name: 'Turbo Typing Racer', icon: '⌨️', engine: 'quiz_word_game', variant: 'typing', desc: 'Live WPM and accuracy typing test with retro tech passages.' },
  { name: 'Trivia Challenge Pro', icon: '🧠', engine: 'quiz_word_game', variant: 'trivia', desc: 'Multiple-choice knowledge challenge across tech, space, and history.' },
  { name: 'Blackjack 21 Table', icon: '🂡', engine: 'dice_rpg_sim', variant: 'blackjack', desc: 'Classic 21 card table with hit, stand, bankroll chips, and dealer AI.' },
  { name: 'Tabletop RPG Roller', icon: '🎲', engine: 'dice_rpg_sim', variant: 'dice', desc: 'Multi-polyhedral dice roller (d4 through d100) with modifier history.' },
  { name: 'Destiny Wheel Spinner', icon: '🎡', engine: 'dice_rpg_sim', variant: 'wheel', desc: 'Customizable random decision wheel with weighted spin animation.' },
];

const CALCULATOR_BASES: RawAppSeed[] = [
  { name: 'Mortgage Payment Calc', icon: '🏠', engine: 'calculator_formula', variant: 'mortgage', desc: 'Monthly principal, interest, and total loan cost estimator.' },
  { name: 'Compound Growth Lab', icon: '📈', engine: 'calculator_formula', variant: 'compound', desc: 'Compound interest and recurring contribution wealth projector.' },
  { name: 'Tip & Bill Splitter', icon: '🧾', engine: 'calculator_formula', variant: 'tip', desc: 'Instant restaurant tip calculator and per-person bill splitter.' },
  { name: 'BMI & Wellness Calc', icon: '⚖️', engine: 'calculator_formula', variant: 'bmi', desc: 'Body Mass Index and healthy weight range estimator.' },
  { name: 'Salary & Hourly Pro', icon: '💵', engine: 'calculator_formula', variant: 'salary', desc: 'Convert annual salary to hourly, weekly, and monthly pay.' },
  { name: 'Discount & Tax Calc', icon: '🏷️', engine: 'calculator_formula', variant: 'discount', desc: 'Compute sale price savings and final sales tax total.' },
  { name: 'Road Trip Fuel Calc', icon: '⛽', engine: 'calculator_formula', variant: 'fuel', desc: 'Estimate fuel gallons needed and trip cost from distance and MPG.' },
  { name: 'Length Unit Studio', icon: '📏', engine: 'unit_converter', variant: 'length', desc: 'Convert meters, feet, inches, miles, kilometers, and yards live.' },
  { name: 'Weight & Mass Desk', icon: '🏋️', engine: 'unit_converter', variant: 'mass', desc: 'Convert kilograms, pounds, ounces, grams, and metric tons.' },
  { name: 'Temperature Converter', icon: '🌡️', engine: 'unit_converter', variant: 'temp', desc: 'Instant Celsius, Fahrenheit, and Kelvin temperature scale conversion.' },
  { name: 'Data Storage Converter', icon: '💾', engine: 'unit_converter', variant: 'data', desc: 'Convert bytes, KB, MB, GB, TB, and bits with precision.' },
  { name: 'Speed & Velocity Calc', icon: '🏎️', engine: 'unit_converter', variant: 'speed', desc: 'Convert MPH, KM/H, knots, and meters per second.' },
  { name: 'Volume & Kitchen Conv', icon: '🧪', engine: 'unit_converter', variant: 'volume', desc: 'Convert liters, milliliters, cups, gallons, and fluid ounces.' },
  { name: 'Number Base Studio', icon: '🔢', engine: 'unit_converter', variant: 'radix', desc: 'Convert integers simultaneously across Binary, Octal, Decimal, and Hex.' },
];

const CREATIVE_BASES: RawAppSeed[] = [
  { name: 'BeatBox Drum Pads', icon: '🥁', engine: 'audio_synth_studio', variant: 'drums', desc: '8-pad WebAudio drum machine with kick, snare, hats, clap, and toms.' },
  { name: 'Pocket Piano Synth', icon: '🎹', engine: 'audio_synth_studio', variant: 'piano', desc: 'Playable octave synthesizer keyboard with selectable wave shapes.' },
  { name: 'Studio Metronome', icon: '⏱️', engine: 'audio_synth_studio', variant: 'metronome', desc: 'Accurate BPM click track with accent beats and tempo slider.' },
  { name: 'Tone Frequency Lab', icon: '🔊', engine: 'audio_synth_studio', variant: 'tone', desc: 'Precision Hz oscillator for tuning instruments and audio testing.' },
  { name: 'Pixel Sprite Pad', icon: '👾', engine: 'pixel_color_studio', variant: 'pixel', desc: '16x16 retro pixel art editor with color swatches and PNG save to C:\\Pictures.' },
  { name: 'CSS Gradient Studio', icon: '🌈', engine: 'pixel_color_studio', variant: 'gradient', desc: 'Interactive multi-stop gradient builder with copyable CSS code.' },
  { name: 'Color Harmony Picker', icon: '🎨', engine: 'pixel_color_studio', variant: 'palette', desc: 'Generate complementary, analogous, and triadic palettes with HEX/RGB.' },
  { name: 'WCAG Contrast Auditor', icon: '👁️', engine: 'pixel_color_studio', variant: 'contrast', desc: 'Verify AA/AAA text contrast ratios between foreground and background colors.' },
  { name: 'ASCII Banner Forge', icon: '🖼️', engine: 'text_studio', variant: 'ascii_box', desc: 'Wrap headlines inside retro framed ASCII boxes for docs and terminals.' },
  { name: 'SVG Badge Designer', icon: '🏷️', engine: 'pixel_color_studio', variant: 'badge', desc: 'Customize retro status and shield badges with live SVG markup.' },
];

const DEVTOOLS_BASES: RawAppSeed[] = [
  { name: 'JSON Pretty Studio', icon: '{ }', engine: 'dev_code_tool', variant: 'json', desc: 'Format, minify, and validate JSON payloads with error line reporting.' },
  { name: 'Base64 Codec Desk', icon: '🔐', engine: 'dev_code_tool', variant: 'base64', desc: 'Encode and decode UTF-8 text to Base64 and URL-safe strings.' },
  { name: 'Regex Live Matcher', icon: '🔎', engine: 'dev_code_tool', variant: 'regex', desc: 'Test regular expressions against sample text and inspect all matches.' },
  { name: 'UUID & Key Factory', icon: '🪪', engine: 'dev_code_tool', variant: 'uuid', desc: 'Generate RFC-4122 v4 UUIDs, API tokens, and hex identifiers.' },
  { name: 'Markdown Previewer', icon: '📝', engine: 'dev_code_tool', variant: 'markdown', desc: 'Side-by-side Markdown editor with live rendered HTML preview.' },
  { name: 'Unix Epoch Converter', icon: '🕒', engine: 'dev_code_tool', variant: 'epoch', desc: 'Convert Unix timestamps to ISO-8601 and local human-readable dates.' },
  { name: 'JWT Payload Inspector', icon: '🪪', engine: 'dev_code_tool', variant: 'jwt', desc: 'Decode JWT headers and claims locally without leaving the browser.' },
  { name: 'Hash & Checksum Tool', icon: '#️⃣', engine: 'dev_code_tool', variant: 'hash', desc: 'Compute SHA-256 and quick CRC checksums for strings using WebCrypto.' },
  { name: 'Line Diff Checker', icon: '↔️', engine: 'dev_code_tool', variant: 'diff', desc: 'Compare two text snippets line-by-line and highlight changes.' },
  { name: 'IPv4 Subnet Calc', icon: '🌐', engine: 'dev_code_tool', variant: 'subnet', desc: 'Calculate CIDR network address, broadcast, mask, and host count.' },
  { name: 'HTTP Status Guide', icon: '📡', engine: 'reference_handbook', variant: 'http', desc: 'Instant searchable guide to HTTP 1xx–5xx response status codes.' },
  { name: 'Git Command Sheet', icon: '🌿', engine: 'reference_handbook', variant: 'git', desc: 'Searchable Git workflow, branching, rebase, and recovery commands.' },
];

const PRODUCTIVITY_BASES: RawAppSeed[] = [
  { name: 'Pomodoro Focus Clock', icon: '🍅', engine: 'productivity_tracker', variant: 'pomodoro', desc: '25/5 focus interval timer with audio chime and session counter.' },
  { name: 'Quick Kanban Board', icon: '📋', engine: 'productivity_tracker', variant: 'kanban', desc: '3-column To-Do, In-Progress, and Done task tracker.' },
  { name: 'Checklist Studio', icon: '☑️', engine: 'productivity_tracker', variant: 'checklist', desc: 'Interactive task checklist with completion progress and C:\\ export.' },
  { name: 'Daily Habit Grid', icon: '🔥', engine: 'productivity_tracker', variant: 'habits', desc: '7-day habit tracker matrix to build daily streaks.' },
  { name: 'Flashcard Study Box', icon: '🗂️', engine: 'productivity_tracker', variant: 'flashcards', desc: 'Create and flip study flashcards with self-scoring mastery.' },
  { name: 'Pocket Budget Ledger', icon: '💳', engine: 'productivity_tracker', variant: 'budget', desc: 'Track income and expense rows with real-time net balance.' },
  { name: 'Countdown Milestone', icon: '⏳', engine: 'productivity_tracker', variant: 'countdown', desc: 'Live days/hours/minutes/seconds countdown to any target date.' },
  { name: 'Weighted Decision Pad', icon: '⚖️', engine: 'productivity_tracker', variant: 'decision', desc: 'Score pros and cons with weights to compare tough choices.' },
  { name: 'Scratchpad Outliner', icon: '🗒️', engine: 'text_studio', variant: 'journal', desc: 'Timestamped daily notes and meeting outline with C:\\Documents save.' },
];

const SCIENCE_BASES: RawAppSeed[] = [
  { name: 'Prime Factor Lab', icon: '🧮', engine: 'science_math_lab', variant: 'primes', desc: 'Test primality, factorize integers, and list prime ranges.' },
  { name: 'Quadratic Solver Pro', icon: '📐', engine: 'science_math_lab', variant: 'quadratic', desc: 'Solve ax² + bx + c = 0 with discriminant and real/complex roots.' },
  { name: 'Statistics Workbench', icon: '📊', engine: 'science_math_lab', variant: 'stats', desc: 'Compute mean, median, mode, range, variance, and standard deviation.' },
  { name: 'Ohm Law Circuit Lab', icon: '🔌', engine: 'calculator_formula', variant: 'ohms', desc: 'Calculate voltage, current, resistance, and wattage power.' },
  { name: 'Planet Gravity Explorer', icon: '🪐', engine: 'science_math_lab', variant: 'planets', desc: 'Compare your weight and free-fall acceleration across the solar system.' },
  { name: 'Periodic Element Finder', icon: '⚛️', engine: 'reference_handbook', variant: 'elements', desc: 'Search chemical elements by symbol, atomic number, or group.' },
  { name: 'Fraction Simplifier', icon: '➗', engine: 'science_math_lab', variant: 'fraction', desc: 'Reduce fractions via GCD and view decimal and percentage forms.' },
  { name: 'Morse Code Telegraph', icon: '📻', engine: 'unit_converter', variant: 'morse', desc: 'Translate text to International Morse Code with audible beep playback.' },
  { name: 'Roman Numeral Bench', icon: '🏛️', engine: 'unit_converter', variant: 'roman', desc: 'Convert modern Arabic numbers to Roman numerals and back.' },
];

const TEXT_BASES: RawAppSeed[] = [
  { name: 'Word & Readability Lab', icon: '📖', engine: 'text_studio', variant: 'counter', desc: 'Live word, character, sentence, paragraph, and reading-time analyzer.' },
  { name: 'Case & Slug Studio', icon: 'Aa', engine: 'text_studio', variant: 'case', desc: 'Convert text between UPPER, lower, Title, camelCase, snake_case, and slugs.' },
  { name: 'Password Vault Forge', icon: '🔑', engine: 'text_studio', variant: 'password', desc: 'Cryptographic password generator with entropy strength readout.' },
  { name: 'Lorem Ipsum Press', icon: '📰', engine: 'text_studio', variant: 'lorem', desc: 'Generate clean placeholder paragraphs for layouts and mockups.' },
  { name: 'Line Sorter & Deduper', icon: '🧹', engine: 'text_studio', variant: 'dedupe', desc: 'Sort lists alphabetically, reverse lines, trim, and remove duplicates.' },
  { name: 'Palindrome & Anagram', icon: '🔁', engine: 'text_studio', variant: 'wordcheck', desc: 'Check palindromes, reverse strings, and compare anagrams.' },
  { name: 'Quote & Prompt Deck', icon: '💬', engine: 'dice_rpg_sim', variant: 'quotes', desc: 'Curated writing prompts, retro computing quotes, and idea sparks.' },
];

const UTILITIES_BASES: RawAppSeed[] = [
  { name: 'Precision Stopwatch', icon: '⏱️', engine: 'system_tester', variant: 'stopwatch', desc: 'Millisecond stopwatch with lap split recording and export.' },
  { name: 'Keyboard Inspector', icon: '⌨️', engine: 'system_tester', variant: 'keyboard', desc: 'Live keycode, event.key, and modifier diagnostics for keyboard testing.' },
  { name: 'Mouse CPS & Reflex', icon: '🖱️', engine: 'system_tester', variant: 'mousecps', desc: 'Measure clicks-per-second (CPS) and click cadence in a 5-second test.' },
  { name: 'Dead Pixel Checker', icon: '🖥️', engine: 'system_tester', variant: 'pixels', desc: 'Cycle solid RGB, white, and black test fields to inspect display uniformity.' },
  { name: 'World Clock Wall', icon: '🌍', engine: 'system_tester', variant: 'worldclock', desc: 'Live synchronized clocks across major global time zones.' },
  { name: 'Font Specimen Bench', icon: '🔤', engine: 'system_tester', variant: 'fonts', desc: 'Preview typography sizes, weights, and tracking side by side.' },
  { name: 'ASCII Code Explorer', icon: '💻', engine: 'reference_handbook', variant: 'ascii', desc: 'Searchable ASCII decimal, hex, and character code table.' },
  { name: 'Linux CLI Handbook', icon: '🐧', engine: 'reference_handbook', variant: 'linux', desc: 'Quick searchable reference for everyday shell and file commands.' },
  { name: 'File Extension Finder', icon: '📁', engine: 'reference_handbook', variant: 'extensions', desc: 'Look up common file formats, MIME types, and desktop openers.' },
];

const EDITION_PACKS: Array<{ prefix: string; suffix: string; themeAccent?: string }> = [
  { prefix: '', suffix: '' },
  { prefix: 'Pro ', suffix: '' },
  { prefix: 'Turbo ', suffix: '' },
  { prefix: 'Retro ', suffix: '' },
  { prefix: 'Pocket ', suffix: '' },
  { prefix: 'Hyper ', suffix: '' },
  { prefix: 'Studio ', suffix: '' },
  { prefix: 'Express ', suffix: '' },
  { prefix: 'Deluxe ', suffix: '' },
  { prefix: 'Ultra ', suffix: '' },
];

const CATEGORY_SEEDS: Array<{ cat: StoreCategory; bases: RawAppSeed[]; targetCount: number }> = [
  { cat: 'games', bases: GAMES_BASES, targetCount: 75 },
  { cat: 'calculators', bases: CALCULATOR_BASES, targetCount: 70 },
  { cat: 'creative', bases: CREATIVE_BASES, targetCount: 60 },
  { cat: 'devtools', bases: DEVTOOLS_BASES, targetCount: 70 },
  { cat: 'productivity', bases: PRODUCTIVITY_BASES, targetCount: 65 },
  { cat: 'science', bases: SCIENCE_BASES, targetCount: 55 },
  { cat: 'text', bases: TEXT_BASES, targetCount: 50 },
  { cat: 'utilities', bases: UTILITIES_BASES, targetCount: 55 },
];
// Total = 75 + 70 + 60 + 70 + 65 + 55 + 50 + 55 = 500 apps!

const ACCENT_PALETTE = [
  '#2563eb', '#0284c7', '#0d9488', '#16a34a', '#ca8a04',
  '#ea580c', '#dc2626', '#db2777', '#9333ea', '#4f46e5',
];

function makeSafeExeName(name: string, index: number): string {
  const clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || `APP${index}`;
  return `${clean}${String(index).padStart(2, '0').slice(-2)}.EXE`;
}

function buildStore500Catalog(): StoreAppMeta[] {
  const list: StoreAppMeta[] = [];
  const usedNames = new Set<string>();
  let seq = 1;

  for (const group of CATEGORY_SEEDS) {
    const pubs = CATEGORY_PUBLISHERS[group.cat];
    let createdInCat = 0;
    let pass = 0;

    while (createdInCat < group.targetCount) {
      const base = group.bases[createdInCat % group.bases.length];
      const edition = EDITION_PACKS[pass % EDITION_PACKS.length];
      const roman = pass >= EDITION_PACKS.length ? ` ${pass - EDITION_PACKS.length + 2}` : '';
      let candidateName = `${edition.prefix}${base.name}${edition.suffix}${roman}`.trim();
      if (usedNames.has(candidateName)) {
        candidateName = `${candidateName} #${seq}`;
      }
      usedNames.add(candidateName);

      const pkgId = `store_${String(seq).padStart(3, '0')}`;
      const exeName = makeSafeExeName(candidateName, seq);
      const setupExeFileName = exeName.replace(/\.EXE$/, '_SETUP.EXE');
      const sizeMB = Number((1.2 + ((seq * 13) % 185) / 10).toFixed(1));
      const version = `${1 + (pass % 4)}.${(seq * 3) % 10}`;
      const accentColor = pass === 0 ? CATEGORY_COLORS[group.cat] : ACCENT_PALETTE[(seq + pass) % ACCENT_PALETTE.length];

      list.push({
        pkgId,
        name: candidateName,
        category: group.cat,
        engineType: base.engine,
        variant: base.variant,
        accentColor,
        icon: base.icon,
        description: `${base.desc} (${candidateName} — Angel OS Edition v${version}).`,
        publisher: pubs[seq % pubs.length],
        version,
        sizeMB,
        exeName,
        setupExeFileName,
        params: { ...(base.params || {}), editionPass: pass, seedNumber: seq },
      });

      seq++;
      createdInCat++;
      if (createdInCat % group.bases.length === 0) pass++;
    }
  }
  return list;
}

export const STORE_500_APPS: StoreAppMeta[] = buildStore500Catalog();

const STORE_APP_MAP = new Map<string, StoreAppMeta>(STORE_500_APPS.map((a) => [a.pkgId, a]));

export function getStoreAppById(pkgId: string): StoreAppMeta | undefined {
  return STORE_APP_MAP.get(pkgId);
}

export function isStoreAppId(appId: string): boolean {
  return STORE_APP_MAP.has(appId);
}

export function getStoreAppIconDataUri(app: StoreAppMeta): string {
  const safeIcon = app.icon.replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="10" fill="${app.accentColor}" stroke="#0f172a" stroke-width="2.5"/><rect x="8" y="8" width="48" height="14" rx="4" fill="rgba(255,255,255,0.18)"/><text x="32" y="42" text-anchor="middle" font-size="26" font-family="sans-serif" fill="#ffffff">${safeIcon}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Convert all 500 store entries into SoftwarePackage records for Ability to Install */
export function buildStore500SoftwarePackages(): SoftwarePackage[] {
  return STORE_500_APPS.map((app) => ({
    pkgId: app.pkgId,
    name: app.name,
    version: app.version,
    publisher: app.publisher,
    category: app.category,
    sizeMB: app.sizeMB,
    installDir: `C:\\Program Files\\AngelApps\\${app.category}`,
    exeName: app.exeName,
    setupExeFileName: app.setupExeFileName,
    appWindowId: app.pkgId,
    iconHtml: app.icon,
    description: app.description,
    installed: false,
    desktopShortcut: true,
    startMenuShortcut: true,
    canUninstall: true,
  }));
}

// ==================== SHARED AUDIO HELPER ====================
let storeAudioCtx: AudioContext | null = null;
function playStoreBeep(freq = 440, duration = 0.12, type: OscillatorType = 'triangle', gainVal = 0.14): void {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!storeAudioCtx) storeAudioCtx = new Ctx();
    if (storeAudioCtx.state === 'suspended') storeAudioCtx.resume();
    const osc = storeAudioCtx.createOscillator();
    const gain = storeAudioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, storeAudioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, storeAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, storeAudioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(storeAudioCtx.destination);
    osc.start();
    osc.stop(storeAudioCtx.currentTime + duration + 0.02);
  } catch {
    // ignore if audio blocked
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==================== INTERACTIVE ENGINE MOUNTER ====================
export function mountStoreMiniApp(
  app: StoreAppMeta,
  container: HTMLElement,
  bridge: StoreHostBridge,
): () => void {
  const cleanups: Array<() => void> = [];
  container.innerHTML = '';
  container.className = 'window-content store-miniapp-root';

  const headerBar = document.createElement('div');
  headerBar.className = 'store-miniapp-header';
  headerBar.innerHTML = `
    <div class="store-miniapp-title-wrap">
      <span class="store-miniapp-emoji">${app.icon}</span>
      <div>
        <div class="store-miniapp-name">${esc(app.name)}</div>
        <div class="store-miniapp-meta">${esc(app.category.toUpperCase())} · v${esc(app.version)} · ${esc(app.publisher)}</div>
      </div>
    </div>
    <button type="button" class="win95-btn store-miniapp-save-btn" title="Export result to C:\\Documents">💾 Save Output</button>
  `;
  container.appendChild(headerBar);

  const body = document.createElement('div');
  body.className = 'store-miniapp-body';
  container.appendChild(body);

  let getExportText = (): string => `${app.name} (v${app.version})\nExported from Angel OS at ${new Date().toLocaleString()}`;

  headerBar.querySelector('.store-miniapp-save-btn')?.addEventListener('click', () => {
    bridge.playClick();
    const fname = `${app.exeName.replace(/\.EXE$/i, '')}_${Math.floor(100 + Math.random() * 900)}.TXT`;
    bridge.saveTextToDocuments(fname, getExportText());
    bridge.pushToast('Saved to C:\\Documents', `Exported ${fname} from ${app.name}.`, app.icon);
  });

  switch (app.engineType) {
    case 'calculator_formula':
      getExportText = mountCalculatorEngine(app, body, bridge);
      break;
    case 'unit_converter':
      getExportText = mountUnitConverterEngine(app, body, bridge);
      break;
    case 'arcade_reflex_grid':
      getExportText = mountArcadeEngine(app, body, bridge, cleanups);
      break;
    case 'puzzle_board':
      getExportText = mountPuzzleEngine(app, body, bridge);
      break;
    case 'quiz_word_game':
      getExportText = mountQuizWordEngine(app, body, bridge, cleanups);
      break;
    case 'audio_synth_studio':
      getExportText = mountAudioSynthEngine(app, body, bridge, cleanups);
      break;
    case 'pixel_color_studio':
      getExportText = mountPixelColorEngine(app, body, bridge);
      break;
    case 'dev_code_tool':
      getExportText = mountDevToolEngine(app, body, bridge);
      break;
    case 'productivity_tracker':
      getExportText = mountProductivityEngine(app, body, bridge, cleanups);
      break;
    case 'text_studio':
      getExportText = mountTextStudioEngine(app, body, bridge);
      break;
    case 'science_math_lab':
      getExportText = mountScienceLabEngine(app, body, bridge);
      break;
    case 'system_tester':
      getExportText = mountSystemTesterEngine(app, body, bridge, cleanups);
      break;
    case 'dice_rpg_sim':
      getExportText = mountDiceRpgEngine(app, body, bridge);
      break;
    case 'reference_handbook':
      getExportText = mountReferenceEngine(app, body, bridge);
      break;
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore cleanup error
      }
    });
  };
}

// ---------- ENGINE 1: PARAMETERIZED CALCULATORS ----------
function mountCalculatorEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  type FieldDef = { id: string; label: string; value: number; step?: string };
  let fields: FieldDef[] = [];
  let compute: (v: Record<string, number>) => Array<{ k: string; val: string }>;

  if (app.variant === 'mortgage') {
    fields = [
      { id: 'principal', label: 'Loan Amount ($)', value: 320000, step: '1000' },
      { id: 'rate', label: 'Annual Interest (%)', value: 6.25, step: '0.05' },
      { id: 'years', label: 'Term (Years)', value: 30, step: '1' },
    ];
    compute = (v) => {
      const r = v.rate / 100 / 12;
      const n = Math.max(1, v.years * 12);
      const m = r === 0 ? v.principal / n : (v.principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
      const total = m * n;
      return [
        { k: 'Monthly Payment', val: `$${m.toFixed(2)}` },
        { k: 'Total Interest', val: `$${(total - v.principal).toFixed(2)}` },
        { k: 'Total Repayment', val: `$${total.toFixed(2)}` },
      ];
    };
  } else if (app.variant === 'compound') {
    fields = [
      { id: 'start', label: 'Starting Principal ($)', value: 5000, step: '100' },
      { id: 'monthly', label: 'Monthly Contribution ($)', value: 250, step: '25' },
      { id: 'rate', label: 'Annual Return (%)', value: 7.5, step: '0.1' },
      { id: 'years', label: 'Years', value: 15, step: '1' },
    ];
    compute = (v) => {
      const r = v.rate / 100 / 12;
      const n = Math.max(1, v.years * 12);
      let bal = v.start;
      for (let i = 0; i < n; i++) bal = bal * (1 + r) + v.monthly;
      const contrib = v.start + v.monthly * n;
      return [
        { k: 'Projected Balance', val: `$${bal.toFixed(2)}` },
        { k: 'Total Contributed', val: `$${contrib.toFixed(2)}` },
        { k: 'Interest Earned', val: `$${(bal - contrib).toFixed(2)}` },
      ];
    };
  } else if (app.variant === 'tip') {
    fields = [
      { id: 'bill', label: 'Bill Total ($)', value: 84.5, step: '0.5' },
      { id: 'tip', label: 'Tip (%)', value: 18, step: '1' },
      { id: 'people', label: 'Split Between (People)', value: 3, step: '1' },
    ];
    compute = (v) => {
      const tipAmt = (v.bill * v.tip) / 100;
      const total = v.bill + tipAmt;
      const ppl = Math.max(1, Math.round(v.people));
      return [
        { k: 'Tip Amount', val: `$${tipAmt.toFixed(2)}` },
        { k: 'Grand Total', val: `$${total.toFixed(2)}` },
        { k: 'Per Person', val: `$${(total / ppl).toFixed(2)}` },
      ];
    };
  } else if (app.variant === 'bmi') {
    fields = [
      { id: 'weight', label: 'Weight (kg)', value: 72, step: '0.5' },
      { id: 'height', label: 'Height (cm)', value: 175, step: '1' },
    ];
    compute = (v) => {
      const hm = Math.max(0.5, v.height / 100);
      const bmi = v.weight / (hm * hm);
      const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal Range' : bmi < 30 ? 'Overweight' : 'Obese Range';
      return [
        { k: 'BMI Score', val: bmi.toFixed(1) },
        { k: 'Category', val: cat },
        { k: 'Ideal Weight Span', val: `${(18.5 * hm * hm).toFixed(1)} – ${(24.9 * hm * hm).toFixed(1)} kg` },
      ];
    };
  } else if (app.variant === 'salary') {
    fields = [
      { id: 'hourly', label: 'Hourly Rate ($)', value: 32, step: '0.5' },
      { id: 'hours', label: 'Hours / Week', value: 40, step: '1' },
      { id: 'weeks', label: 'Weeks / Year', value: 52, step: '1' },
    ];
    compute = (v) => {
      const annual = v.hourly * v.hours * v.weeks;
      return [
        { k: 'Annual Gross', val: `$${annual.toFixed(2)}` },
        { k: 'Monthly Average', val: `$${(annual / 12).toFixed(2)}` },
        { k: 'Weekly Pay', val: `$${(v.hourly * v.hours).toFixed(2)}` },
      ];
    };
  } else if (app.variant === 'discount') {
    fields = [
      { id: 'price', label: 'Original Price ($)', value: 129.99, step: '1' },
      { id: 'disc', label: 'Discount (%)', value: 25, step: '1' },
      { id: 'tax', label: 'Sales Tax (%)', value: 8.25, step: '0.25' },
    ];
    compute = (v) => {
      const saved = (v.price * v.disc) / 100;
      const sub = v.price - saved;
      const taxAmt = (sub * v.tax) / 100;
      return [
        { k: 'You Save', val: `$${saved.toFixed(2)}` },
        { k: 'Discounted Subtotal', val: `$${sub.toFixed(2)}` },
        { k: 'Final Total w/ Tax', val: `$${(sub + taxAmt).toFixed(2)}` },
      ];
    };
  } else if (app.variant === 'ohms') {
    fields = [
      { id: 'volts', label: 'Voltage (V)', value: 12, step: '0.5' },
      { id: 'ohms', label: 'Resistance (Ω)', value: 240, step: '1' },
    ];
    compute = (v) => {
      const amps = v.ohms > 0 ? v.volts / v.ohms : 0;
      const watts = v.volts * amps;
      return [
        { k: 'Current (I)', val: `${(amps * 1000).toFixed(2)} mA (${amps.toFixed(4)} A)` },
        { k: 'Power (P)', val: `${watts.toFixed(3)} W` },
        { k: 'Conductance (G)', val: `${(v.ohms > 0 ? 1 / v.ohms : 0).toFixed(5)} S` },
      ];
    };
  } else {
    fields = [
      { id: 'dist', label: 'Trip Distance (miles)', value: 360, step: '10' },
      { id: 'mpg', label: 'Vehicle Efficiency (MPG)', value: 28, step: '1' },
      { id: 'price', label: 'Fuel Price ($/gal)', value: 3.65, step: '0.05' },
    ];
    compute = (v) => {
      const gal = v.mpg > 0 ? v.dist / v.mpg : 0;
      const cost = gal * v.price;
      return [
        { k: 'Fuel Required', val: `${gal.toFixed(2)} gal` },
        { k: 'Estimated Trip Cost', val: `$${cost.toFixed(2)}` },
        { k: 'Cost per Mile', val: `$${(v.dist > 0 ? cost / v.dist : 0).toFixed(3)}` },
      ];
    };
  }

  let latestSummary = '';
  body.innerHTML = `
    <div class="mini-grid-form">
      ${fields
        .map(
          (f) => `
        <label class="mini-field">
          <span>${esc(f.label)}</span>
          <input type="number" class="win95-input mini-calc-in tabular-nums" data-fid="${f.id}" value="${f.value}" step="${f.step || 'any'}" />
        </label>`,
        )
        .join('')}
    </div>
    <div class="mini-result-panel tabular-nums" id="mini-calc-out"></div>
  `;

  const outEl = body.querySelector('#mini-calc-out') as HTMLElement;
  const recalc = () => {
    const vals: Record<string, number> = {};
    body.querySelectorAll<HTMLInputElement>('.mini-calc-in').forEach((inp) => {
      vals[inp.dataset.fid || ''] = Number(inp.value) || 0;
    });
    const rows = compute(vals);
    latestSummary = `${app.name}\n` + rows.map((r) => `${r.k}: ${r.val}`).join('\n');
    outEl.innerHTML = rows
      .map((r) => `<div class="mini-result-row"><span>${esc(r.k)}</span><strong>${esc(r.val)}</strong></div>`)
      .join('');
  };

  body.querySelectorAll('.mini-calc-in').forEach((el) => {
    el.addEventListener('input', recalc);
    el.addEventListener('change', () => bridge.playClick());
  });
  recalc();
  return () => latestSummary;
}

// ---------- ENGINE 2: UNIT, RADIX, ROMAN & MORSE CONVERTER ----------
function mountUnitConverterEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  let lastExport = '';
  if (app.variant === 'radix') {
    body.innerHTML = `
      <label class="mini-field"><span>Decimal Integer</span><input type="number" class="win95-input tabular-nums" id="rad-dec" value="2026" /></label>
      <div class="mini-result-panel tabular-nums" id="rad-out"></div>
    `;
    const decIn = body.querySelector('#rad-dec') as HTMLInputElement;
    const out = body.querySelector('#rad-out') as HTMLElement;
    const run = () => {
      const n = Math.trunc(Number(decIn.value) || 0);
      const rows = [
        ['Binary (Base 2)', (n >>> 0).toString(2)],
        ['Octal (Base 8)', (n >>> 0).toString(8)],
        ['Decimal (Base 10)', String(n)],
        ['Hexadecimal (Base 16)', '0x' + (n >>> 0).toString(16).toUpperCase()],
      ];
      lastExport = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      out.innerHTML = rows.map(([k, v]) => `<div class="mini-result-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
    };
    decIn.addEventListener('input', run);
    run();
    return () => lastExport;
  }

  if (app.variant === 'morse') {
    const MORSE: Record<string, string> = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
      K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
      U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---',
      '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', ' ': '/',
    };
    body.innerHTML = `
      <label class="mini-field"><span>Plain Text</span><input type="text" class="win95-input" id="morse-in" value="ANGEL OS 2026" /></label>
      <div class="mini-result-panel tabular-nums" id="morse-out" style="font-size:1rem;letter-spacing:2px;"></div>
      <button type="button" class="win95-btn" id="morse-play-btn">🔊 Play Telegraph Beeps</button>
    `;
    const inp = body.querySelector('#morse-in') as HTMLInputElement;
    const out = body.querySelector('#morse-out') as HTMLElement;
    const encode = () => {
      const encoded = inp.value
        .toUpperCase()
        .split('')
        .map((ch) => MORSE[ch] || '')
        .filter(Boolean)
        .join(' ');
      out.textContent = encoded || '(empty)';
      lastExport = `${inp.value}\n${encoded}`;
    };
    inp.addEventListener('input', encode);
    body.querySelector('#morse-play-btn')?.addEventListener('click', () => {
      bridge.playClick();
      const seq = (out.textContent || '').slice(0, 24);
      let delay = 0;
      for (const ch of seq) {
        if (ch === '.') {
          setTimeout(() => playStoreBeep(680, 0.08, 'sine', 0.14), delay);
          delay += 140;
        } else if (ch === '-') {
          setTimeout(() => playStoreBeep(680, 0.22, 'sine', 0.14), delay);
          delay += 280;
        } else {
          delay += 160;
        }
      }
    });
    encode();
    return () => lastExport;
  }

  if (app.variant === 'roman') {
    const toRoman = (num: number): string => {
      if (num <= 0 || num > 3999) return 'Enter 1–3999';
      const pairs: Array<[number, string]> = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
        [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      let n = Math.floor(num);
      let res = '';
      for (const [v, sym] of pairs) {
        while (n >= v) {
          res += sym;
          n -= v;
        }
      }
      return res;
    };
    body.innerHTML = `
      <label class="mini-field"><span>Year / Number (1–3999)</span><input type="number" class="win95-input tabular-nums" id="rom-in" value="2026" min="1" max="3999" /></label>
      <div class="mini-result-panel" id="rom-out" style="font-size:1.4rem;font-weight:700;text-align:center;"></div>
    `;
    const inp = body.querySelector('#rom-in') as HTMLInputElement;
    const out = body.querySelector('#rom-out') as HTMLElement;
    const upd = () => {
      const r = toRoman(Number(inp.value));
      out.textContent = r;
      lastExport = `${inp.value} = ${r}`;
    };
    inp.addEventListener('input', upd);
    upd();
    return () => lastExport;
  }

  const TABLES: Record<string, Record<string, number>> = {
    length: { Meters: 1, Kilometers: 1000, Centimeters: 0.01, Feet: 0.3048, Inches: 0.0254, Miles: 1609.344, Yards: 0.9144 },
    mass: { Kilograms: 1, Grams: 0.001, Pounds: 0.453592, Ounces: 0.0283495, MetricTons: 1000 },
    data: { Bytes: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 },
    speed: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knots: 0.514444 },
    volume: { Liters: 1, Milliliters: 0.001, Cups: 0.236588, Gallons: 3.78541, FluidOz: 0.0295735 },
  };

  if (app.variant === 'temp') {
    body.innerHTML = `
      <div class="mini-grid-form">
        <label class="mini-field"><span>Value</span><input type="number" class="win95-input tabular-nums" id="tmp-v" value="22" /></label>
        <label class="mini-field"><span>Scale</span><select class="win95-select" id="tmp-s"><option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option></select></label>
      </div>
      <div class="mini-result-panel tabular-nums" id="tmp-out"></div>
    `;
    const vIn = body.querySelector('#tmp-v') as HTMLInputElement;
    const sIn = body.querySelector('#tmp-s') as HTMLSelectElement;
    const out = body.querySelector('#tmp-out') as HTMLElement;
    const run = () => {
      const val = Number(vIn.value) || 0;
      const c = sIn.value === 'C' ? val : sIn.value === 'F' ? ((val - 32) * 5) / 9 : val - 273.15;
      const rows = [
        ['Celsius', `${c.toFixed(2)} °C`],
        ['Fahrenheit', `${((c * 9) / 5 + 32).toFixed(2)} °F`],
        ['Kelvin', `${(c + 273.15).toFixed(2)} K`],
      ];
      lastExport = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      out.innerHTML = rows.map(([k, v]) => `<div class="mini-result-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
    };
    vIn.addEventListener('input', run);
    sIn.addEventListener('change', run);
    run();
    return () => lastExport;
  }

  const units = TABLES[app.variant] || TABLES.length;
  const keys = Object.keys(units);
  body.innerHTML = `
    <div class="mini-grid-form">
      <label class="mini-field"><span>Amount</span><input type="number" class="win95-input tabular-nums" id="uc-val" value="10" /></label>
      <label class="mini-field"><span>From Unit</span><select class="win95-select" id="uc-from">${keys.map((k) => `<option value="${k}">${k}</option>`).join('')}</select></label>
    </div>
    <div class="mini-result-panel tabular-nums" id="uc-out"></div>
  `;
  const valIn = body.querySelector('#uc-val') as HTMLInputElement;
  const fromSel = body.querySelector('#uc-from') as HTMLSelectElement;
  const out = body.querySelector('#uc-out') as HTMLElement;
  const run = () => {
    const base = (Number(valIn.value) || 0) * (units[fromSel.value] || 1);
    const rows = keys.map((k) => [k, (base / units[k]).toPrecision(6).replace(/\.?0+$/, '')]);
    lastExport = `${valIn.value} ${fromSel.value}:\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    out.innerHTML = rows.map(([k, v]) => `<div class="mini-result-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  };
  valIn.addEventListener('input', run);
  fromSel.addEventListener('change', run);
  run();
  return () => lastExport;
}

// ---------- ENGINE 3: ARCADE / REFLEX / CLICKER ----------
function mountArcadeEngine(
  app: StoreAppMeta,
  body: HTMLElement,
  bridge: StoreHostBridge,
  cleanups: Array<() => void>,
): () => string {
  let score = 0;
  let best = 0;

  if (app.variant === 'clicker') {
    let power = 1;
    let autoRate = 0;
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums">
        <span>Points: <strong id="clk-pts">0</strong></span>
        <span>Per Click: <strong id="clk-pow">1</strong></span>
        <span>Auto/sec: <strong id="clk-auto">0</strong></span>
      </div>
      <button type="button" class="win95-btn mini-big-cta" id="clk-main-btn">${app.icon} Boost Energy (+1)</button>
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="clk-upg-pow">⚡ +1 Click (Cost 15)</button>
        <button type="button" class="win95-btn" id="clk-upg-auto">🤖 +1 Auto/s (Cost 30)</button>
      </div>
    `;
    const ptsEl = body.querySelector('#clk-pts') as HTMLElement;
    const powEl = body.querySelector('#clk-pow') as HTMLElement;
    const autoEl = body.querySelector('#clk-auto') as HTMLElement;
    const mainBtn = body.querySelector('#clk-main-btn') as HTMLButtonElement;
    const upgPow = body.querySelector('#clk-upg-pow') as HTMLButtonElement;
    const upgAuto = body.querySelector('#clk-upg-auto') as HTMLButtonElement;

    const refresh = () => {
      ptsEl.textContent = String(Math.floor(score));
      powEl.textContent = String(power);
      autoEl.textContent = String(autoRate);
      mainBtn.textContent = `${app.icon} Boost Energy (+${power})`;
      upgPow.textContent = `⚡ +1 Click (Cost ${power * 15})`;
      upgAuto.textContent = `🤖 +1 Auto/s (Cost ${(autoRate + 1) * 30})`;
    };
    mainBtn.addEventListener('click', () => {
      score += power;
      best = Math.max(best, score);
      playStoreBeep(420 + (score % 200), 0.05, 'square', 0.08);
      refresh();
    });
    upgPow.addEventListener('click', () => {
      const cost = power * 15;
      if (score >= cost) {
        score -= cost;
        power++;
        bridge.playClick();
        refresh();
      }
    });
    upgAuto.addEventListener('click', () => {
      const cost = (autoRate + 1) * 30;
      if (score >= cost) {
        score -= cost;
        autoRate++;
        bridge.playClick();
        refresh();
      }
    });
    const t = window.setInterval(() => {
      if (autoRate > 0) {
        score += autoRate;
        best = Math.max(best, score);
        refresh();
      }
    }, 1000);
    cleanups.push(() => clearInterval(t));
    refresh();
    return () => `${app.name} Score: ${score} (Power ${power}, Auto ${autoRate}/s)`;
  }

  if (app.variant === 'reaction') {
    let state: 'idle' | 'wait' | 'go' = 'idle';
    let goTime = 0;
    let waitTimer: number | null = null;
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums"><span>Last: <strong id="rx-last">—</strong></span><span>Best: <strong id="rx-best">—</strong></span></div>
      <button type="button" class="mini-reaction-pad" id="rx-pad">Click to Start Reflex Test</button>
    `;
    const pad = body.querySelector('#rx-pad') as HTMLButtonElement;
    const lastEl = body.querySelector('#rx-last') as HTMLElement;
    const bestEl = body.querySelector('#rx-best') as HTMLElement;
    pad.addEventListener('click', () => {
      if (state === 'idle') {
        state = 'wait';
        pad.style.background = '#b91c1c';
        pad.textContent = 'Wait for GREEN...';
        waitTimer = window.setTimeout(() => {
          state = 'go';
          goTime = performance.now();
          pad.style.background = '#15803d';
          pad.textContent = 'CLICK NOW!';
          playStoreBeep(780, 0.08, 'sine', 0.12);
        }, 1200 + Math.random() * 2400);
      } else if (state === 'wait') {
        if (waitTimer) clearTimeout(waitTimer);
        state = 'idle';
        pad.style.background = '#334155';
        pad.textContent = 'Too soon! Click to retry.';
      } else {
        const ms = Math.round(performance.now() - goTime);
        score = ms;
        best = best === 0 ? ms : Math.min(best, ms);
        lastEl.textContent = `${ms} ms`;
        bestEl.textContent = `${best} ms`;
        state = 'idle';
        pad.style.background = '#1d4ed8';
        pad.textContent = `${ms} ms! Click to go again.`;
      }
    });
    cleanups.push(() => {
      if (waitTimer) clearTimeout(waitTimer);
    });
    return () => `${app.name} Best Reaction: ${best ? best + ' ms' : 'Not tested'}`;
  }

  // Whack-a-target 3x3 grid
  let activeIdx = -1;
  let timeLeft = 20;
  let running = false;
  let loopId: number | null = null;
  let tickId: number | null = null;
  body.innerHTML = `
    <div class="mini-arcade-hud tabular-nums">
      <span>Score: <strong id="wh-score">0</strong></span>
      <span>Time: <strong id="wh-time">20s</strong></span>
      <button type="button" class="win95-btn" id="wh-start">▶ Start Round</button>
    </div>
    <div class="mini-whack-grid" id="wh-grid"></div>
  `;
  const grid = body.querySelector('#wh-grid') as HTMLElement;
  const scoreEl = body.querySelector('#wh-score') as HTMLElement;
  const timeEl = body.querySelector('#wh-time') as HTMLElement;
  const cells: HTMLButtonElement[] = [];
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-whack-cell';
    b.textContent = '·';
    b.addEventListener('click', () => {
      if (!running || i !== activeIdx) return;
      score += 10;
      best = Math.max(best, score);
      scoreEl.textContent = String(score);
      playStoreBeep(640, 0.06, 'triangle', 0.12);
      activeIdx = -1;
      b.textContent = '💥';
      b.classList.remove('is-target');
    });
    grid.appendChild(b);
    cells.push(b);
  }
  const stop = () => {
    running = false;
    if (loopId) clearInterval(loopId);
    if (tickId) clearInterval(tickId);
    cells.forEach((c) => {
      c.textContent = '·';
      c.classList.remove('is-target');
    });
  };
  body.querySelector('#wh-start')?.addEventListener('click', () => {
    stop();
    score = 0;
    timeLeft = 20;
    running = true;
    scoreEl.textContent = '0';
    timeEl.textContent = '20s';
    loopId = window.setInterval(() => {
      cells.forEach((c) => {
        c.textContent = '·';
        c.classList.remove('is-target');
      });
      activeIdx = Math.floor(Math.random() * 9);
      cells[activeIdx].textContent = app.icon;
      cells[activeIdx].classList.add('is-target');
    }, 680);
    tickId = window.setInterval(() => {
      timeLeft--;
      timeEl.textContent = `${timeLeft}s`;
      if (timeLeft <= 0) {
        stop();
        timeEl.textContent = `Done! Best ${best}`;
      }
    }, 1000);
  });
  cleanups.push(stop);
  return () => `${app.name} High Score: ${best}`;
}

// ---------- ENGINE 4: PUZZLE BOARDS ----------
function mountPuzzleEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  let summary = `${app.name} puzzle active`;

  if (app.variant === 'tictactoe') {
    let board = Array(9).fill('');
    let over = false;
    const wins = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
    ];
    body.innerHTML = `
      <div class="mini-arcade-hud"><span id="ttt-msg">Your turn (X)</span><button type="button" class="win95-btn" id="ttt-reset">↻ Reset</button></div>
      <div class="mini-ttt-grid" id="ttt-grid"></div>
    `;
    const grid = body.querySelector('#ttt-grid') as HTMLElement;
    const msg = body.querySelector('#ttt-msg') as HTMLElement;
    const checkWin = (p: string) => wins.some(([a, b, c]) => board[a] === p && board[b] === p && board[c] === p);
    const render = () => {
      grid.innerHTML = '';
      board.forEach((cell, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mini-ttt-cell';
        btn.textContent = cell;
        btn.addEventListener('click', () => {
          if (over || board[idx]) return;
          board[idx] = 'X';
          bridge.playClick();
          if (checkWin('X')) {
            over = true;
            msg.textContent = 'You Win!';
            summary = `${app.name}: Player Won`;
          } else if (board.every(Boolean)) {
            over = true;
            msg.textContent = 'Draw Game!';
          } else {
            const empties = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
            const pick = empties[Math.floor(Math.random() * empties.length)];
            if (pick !== undefined) board[pick] = 'O';
            if (checkWin('O')) {
              over = true;
              msg.textContent = 'Angel OS Wins!';
            } else if (board.every(Boolean)) {
              over = true;
              msg.textContent = 'Draw Game!';
            }
          }
          render();
        });
        grid.appendChild(btn);
      });
    };
    body.querySelector('#ttt-reset')?.addEventListener('click', () => {
      board = Array(9).fill('');
      over = false;
      msg.textContent = 'Your turn (X)';
      render();
    });
    render();
    return () => summary;
  }

  if (app.variant === 'lightsout') {
    let gridState = Array.from({ length: 25 }, (_, i) => (i % 3 === 0 || i === 12));
    let moves = 0;
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums"><span>Moves: <strong id="lo-moves">0</strong></span><span id="lo-status">Turn off all lights</span><button type="button" class="win95-btn" id="lo-reset">↻ Scramble</button></div>
      <div class="mini-lo-grid" id="lo-grid"></div>
    `;
    const grid = body.querySelector('#lo-grid') as HTMLElement;
    const movesEl = body.querySelector('#lo-moves') as HTMLElement;
    const statusEl = body.querySelector('#lo-status') as HTMLElement;
    const toggle = (idx: number) => {
      const r = Math.floor(idx / 5);
      const c = idx % 5;
      [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([nr, nc]) => {
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
          gridState[nr * 5 + nc] = !gridState[nr * 5 + nc];
        }
      });
    };
    const render = () => {
      grid.innerHTML = '';
      movesEl.textContent = String(moves);
      const lit = gridState.filter(Boolean).length;
      statusEl.textContent = lit === 0 ? '🎉 All Lights Out!' : `${lit} lit`;
      summary = `${app.name}: ${moves} moves (${lit} lit)`;
      gridState.forEach((on, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `mini-lo-cell${on ? ' is-on' : ''}`;
        b.addEventListener('click', () => {
          toggle(i);
          moves++;
          playStoreBeep(on ? 320 : 520, 0.05, 'sine', 0.08);
          render();
        });
        grid.appendChild(b);
      });
    };
    body.querySelector('#lo-reset')?.addEventListener('click', () => {
      moves = 0;
      gridState = Array(25).fill(false);
      for (let k = 0; k < 7; k++) toggle(Math.floor(Math.random() * 25));
      render();
    });
    render();
    return () => summary;
  }

  if (app.variant === 'mastermind') {
    const makeSecret = () => Array.from({ length: 4 }, () => String(Math.floor(Math.random() * 6) + 1)).join('');
    let secret = makeSecret();
    const log: string[] = [];
    body.innerHTML = `
      <div class="mini-field"><span>Guess 4 digits (1–6):</span></div>
      <div class="mini-btn-row">
        <input type="text" maxlength="4" class="win95-input tabular-nums" id="mm-in" placeholder="e.g. 1234" />
        <button type="button" class="win95-btn" id="mm-go">Check</button>
        <button type="button" class="win95-btn" id="mm-new">↻ New Code</button>
      </div>
      <div class="mini-result-panel tabular-nums" id="mm-log" style="max-height:170px;overflow:auto;"></div>
    `;
    const inp = body.querySelector('#mm-in') as HTMLInputElement;
    const logEl = body.querySelector('#mm-log') as HTMLElement;
    const render = () => {
      logEl.innerHTML = log.length
        ? log.map((l) => `<div class="mini-result-row"><span>${esc(l)}</span></div>`).join('')
        : '<div style="opacity:0.7;">Enter 4 digits using 1–6 to crack the code.</div>';
      summary = `${app.name}\n` + log.join('\n');
    };
    body.querySelector('#mm-go')?.addEventListener('click', () => {
      const g = inp.value.trim();
      if (!/^[1-6]{4}$/.test(g)) return;
      let exact = 0;
      let partial = 0;
      const sArr = secret.split('');
      const gArr = g.split('');
      for (let i = 0; i < 4; i++) {
        if (gArr[i] === sArr[i]) {
          exact++;
          sArr[i] = gArr[i] = '';
        }
      }
      for (let i = 0; i < 4; i++) {
        if (gArr[i]) {
          const j = sArr.indexOf(gArr[i]);
          if (j >= 0) {
            partial++;
            sArr[j] = '';
          }
        }
      }
      log.unshift(exact === 4 ? `${g} — CRACKED IN ${log.length + 1} TRIES!` : `${g} — Exact: ${exact} · Misplaced: ${partial}`);
      inp.value = '';
      render();
    });
    body.querySelector('#mm-new')?.addEventListener('click', () => {
      secret = makeSecret();
      log.length = 0;
      render();
    });
    render();
    return () => summary;
  }

  // Memory Flip (4x3 = 12 cards)
  const symbols = ['🚀', '🎮', '🎹', '💎', '🦊', '⚡'];
  let deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
  let revealed: number[] = [];
  let matched = new Set<number>();
  let moves = 0;
  body.innerHTML = `
    <div class="mini-arcade-hud tabular-nums"><span>Moves: <strong id="mem-moves">0</strong></span><span>Pairs: <strong id="mem-pairs">0/6</strong></span><button type="button" class="win95-btn" id="mem-reset">↻ Deal</button></div>
    <div class="mini-mem-grid" id="mem-grid"></div>
  `;
  const grid = body.querySelector('#mem-grid') as HTMLElement;
  const movesEl = body.querySelector('#mem-moves') as HTMLElement;
  const pairsEl = body.querySelector('#mem-pairs') as HTMLElement;
  const render = () => {
    grid.innerHTML = '';
    movesEl.textContent = String(moves);
    pairsEl.textContent = `${matched.size / 2}/6`;
    summary = `${app.name}: ${matched.size / 2}/6 pairs in ${moves} moves`;
    deck.forEach((sym, i) => {
      const open = revealed.includes(i) || matched.has(i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `mini-mem-card${open ? ' is-open' : ''}`;
      b.textContent = open ? sym : '?';
      b.addEventListener('click', () => {
        if (open || revealed.length >= 2) return;
        revealed.push(i);
        bridge.playClick();
        render();
        if (revealed.length === 2) {
          moves++;
          const [a, bIdx] = revealed;
          if (deck[a] === deck[bIdx]) {
            matched.add(a);
            matched.add(bIdx);
            revealed = [];
            playStoreBeep(700, 0.08, 'triangle', 0.12);
            render();
          } else {
            setTimeout(() => {
              revealed = [];
              render();
            }, 620);
          }
        }
      });
      grid.appendChild(b);
    });
  };
  body.querySelector('#mem-reset')?.addEventListener('click', () => {
    deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
    revealed = [];
    matched = new Set();
    moves = 0;
    render();
  });
  render();
  return () => summary;
}

// ---------- ENGINE 5: QUIZ, SCRAMBLE, MATH BLITZ & TYPING ----------
function mountQuizWordEngine(
  app: StoreAppMeta,
  body: HTMLElement,
  bridge: StoreHostBridge,
  cleanups: Array<() => void>,
): () => string {
  let score = 0;

  if (app.variant === 'typing') {
    const samples = [
      'Angel OS brings classic desktop clarity together with modern cloud sync.',
      'The quick brown fox jumped smoothly over the glowing retro CRT display.',
      'Clean typography and fast window controls make every task effortless.',
    ];
    let target = samples[(app.params?.seedNumber || 0) % samples.length];
    let startTs = 0;
    body.innerHTML = `
      <div class="mini-result-panel" id="typ-target" style="font-size:0.85rem;line-height:1.5;">${esc(target)}</div>
      <textarea class="win95-input" id="typ-in" rows="3" placeholder="Start typing the sentence above..."></textarea>
      <div class="mini-arcade-hud tabular-nums"><span id="typ-wpm">0 WPM</span><span id="typ-acc">100% accuracy</span><button type="button" class="win95-btn" id="typ-next">Next Text</button></div>
    `;
    const inp = body.querySelector('#typ-in') as HTMLTextAreaElement;
    const wpmEl = body.querySelector('#typ-wpm') as HTMLElement;
    const accEl = body.querySelector('#typ-acc') as HTMLElement;
    const targetEl = body.querySelector('#typ-target') as HTMLElement;
    inp.addEventListener('input', () => {
      if (!startTs) startTs = Date.now();
      const val = inp.value;
      let correct = 0;
      for (let i = 0; i < val.length; i++) if (val[i] === target[i]) correct++;
      const mins = Math.max(0.02, (Date.now() - startTs) / 60000);
      const wpm = Math.round(val.length / 5 / mins);
      const acc = val.length ? Math.round((correct / val.length) * 100) : 100;
      score = wpm;
      wpmEl.textContent = `${wpm} WPM`;
      accEl.textContent = `${acc}% accuracy`;
    });
    body.querySelector('#typ-next')?.addEventListener('click', () => {
      target = samples[Math.floor(Math.random() * samples.length)];
      targetEl.textContent = target;
      inp.value = '';
      startTs = 0;
      wpmEl.textContent = '0 WPM';
      accEl.textContent = '100% accuracy';
    });
    return () => `${app.name} Typing Speed: ${score} WPM`;
  }

  if (app.variant === 'mathblitz') {
    let a = 7;
    let b = 6;
    let op = '+';
    const nextQ = () => {
      a = Math.floor(Math.random() * 18) + 2;
      b = Math.floor(Math.random() * 14) + 2;
      op = ['+', '-', '×'][Math.floor(Math.random() * 3)];
    };
    const expected = () => (op === '+' ? a + b : op === '-' ? a - b : a * b);
    nextQ();
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums"><span>Streak Score: <strong id="mb-sc">0</strong></span></div>
      <div class="mini-result-panel tabular-nums" id="mb-q" style="font-size:1.5rem;text-align:center;font-weight:700;"></div>
      <div class="mini-btn-row">
        <input type="number" class="win95-input tabular-nums" id="mb-in" placeholder="Answer..." />
        <button type="button" class="win95-btn" id="mb-go">Submit</button>
      </div>
      <div id="mb-msg" style="font-size:0.78rem;"></div>
    `;
    const qEl = body.querySelector('#mb-q') as HTMLElement;
    const scEl = body.querySelector('#mb-sc') as HTMLElement;
    const inEl = body.querySelector('#mb-in') as HTMLInputElement;
    const msgEl = body.querySelector('#mb-msg') as HTMLElement;
    const show = () => (qEl.textContent = `${a} ${op} ${b} = ?`);
    const submit = () => {
      if (Number(inEl.value) === expected()) {
        score++;
        scEl.textContent = String(score);
        msgEl.textContent = '✓ Correct!';
        playStoreBeep(680, 0.06, 'triangle', 0.1);
      } else {
        msgEl.textContent = `✗ Expected ${expected()}`;
        playStoreBeep(220, 0.12, 'sawtooth', 0.08);
      }
      inEl.value = '';
      nextQ();
      show();
    };
    body.querySelector('#mb-go')?.addEventListener('click', submit);
    inEl.addEventListener('keydown', (e) => e.key === 'Enter' && submit());
    show();
    return () => `${app.name} Score: ${score}`;
  }

  // Word Scramble / Trivia
  const words = ['KERNEL', 'SYNTHWAVE', 'DESKTOP', 'FIREWALL', 'QUANTUM', 'PIXEL', 'NETWORK', 'BROWSER', 'MONITOR', 'STORAGE'];
  let word = words[Math.floor(Math.random() * words.length)];
  const scramble = (w: string) => w.split('').sort(() => Math.random() - 0.5).join('');
  body.innerHTML = `
    <div class="mini-arcade-hud tabular-nums"><span>Solved: <strong id="ws-sc">0</strong></span><button type="button" class="win95-btn" id="ws-skip">Skip</button></div>
    <div class="mini-result-panel" id="ws-clue" style="font-size:1.35rem;letter-spacing:4px;text-align:center;font-weight:700;"></div>
    <div class="mini-btn-row">
      <input type="text" class="win95-input" id="ws-in" placeholder="Unscramble word..." />
      <button type="button" class="win95-btn" id="ws-go">Check</button>
    </div>
    <div id="ws-msg" style="font-size:0.78rem;"></div>
  `;
  const clueEl = body.querySelector('#ws-clue') as HTMLElement;
  const scEl = body.querySelector('#ws-sc') as HTMLElement;
  const inEl = body.querySelector('#ws-in') as HTMLInputElement;
  const msgEl = body.querySelector('#ws-msg') as HTMLElement;
  const pickNew = () => {
    word = words[Math.floor(Math.random() * words.length)];
    clueEl.textContent = scramble(word);
  };
  const check = () => {
    if (inEl.value.trim().toUpperCase() === word) {
      score++;
      scEl.textContent = String(score);
      msgEl.textContent = `✓ Solved "${word}"!`;
      playStoreBeep(720, 0.08, 'triangle', 0.12);
      inEl.value = '';
      pickNew();
    } else {
      msgEl.textContent = 'Try again!';
    }
  };
  body.querySelector('#ws-go')?.addEventListener('click', check);
  body.querySelector('#ws-skip')?.addEventListener('click', () => {
    bridge.playClick();
    msgEl.textContent = `Was: ${word}`;
    pickNew();
  });
  inEl.addEventListener('keydown', (e) => e.key === 'Enter' && check());
  pickNew();
  void cleanups;
  return () => `${app.name} Solved: ${score}`;
}

// ---------- ENGINE 6: WEBAUDIO SYNTH / DRUMS / METRONOME / TONE ----------
function mountAudioSynthEngine(
  app: StoreAppMeta,
  body: HTMLElement,
  bridge: StoreHostBridge,
  cleanups: Array<() => void>,
): () => string {
  if (app.variant === 'metronome') {
    let bpm = 110;
    let beat = 0;
    let timer: number | null = null;
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums"><span>BPM: <strong id="met-bpm">110</strong></span><span id="met-beat">Beat: —</span></div>
      <input type="range" min="40" max="220" value="110" id="met-slider" style="width:100%;" />
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="met-toggle">▶ Start Click</button>
      </div>
    `;
    const bpmEl = body.querySelector('#met-bpm') as HTMLElement;
    const beatEl = body.querySelector('#met-beat') as HTMLElement;
    const slider = body.querySelector('#met-slider') as HTMLInputElement;
    const toggle = body.querySelector('#met-toggle') as HTMLButtonElement;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      toggle.textContent = '▶ Start Click';
    };
    const start = () => {
      stop();
      toggle.textContent = '■ Stop';
      timer = window.setInterval(() => {
        beat = (beat % 4) + 1;
        beatEl.textContent = `Beat: ${beat} / 4`;
        playStoreBeep(beat === 1 ? 880 : 520, 0.05, 'triangle', 0.16);
      }, Math.round(60000 / bpm));
    };
    slider.addEventListener('input', () => {
      bpm = Number(slider.value);
      bpmEl.textContent = String(bpm);
      if (timer) start();
    });
    toggle.addEventListener('click', () => (timer ? stop() : start()));
    cleanups.push(stop);
    return () => `${app.name}: ${bpm} BPM`;
  }

  if (app.variant === 'tone') {
    let freq = 440;
    body.innerHTML = `
      <div class="mini-arcade-hud tabular-nums"><span>Frequency: <strong id="tn-hz">440 Hz</strong></span></div>
      <input type="range" min="110" max="1760" value="440" id="tn-rng" style="width:100%;" />
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="tn-play">🔊 Play Tone (0.5s)</button>
        <button type="button" class="win95-btn" id="tn-a4">A4 (440 Hz)</button>
        <button type="button" class="win95-btn" id="tn-c5">C5 (523 Hz)</button>
      </div>
    `;
    const hzEl = body.querySelector('#tn-hz') as HTMLElement;
    const rng = body.querySelector('#tn-rng') as HTMLInputElement;
    const setF = (f: number) => {
      freq = f;
      rng.value = String(f);
      hzEl.textContent = `${f} Hz`;
      playStoreBeep(f, 0.4, 'sine', 0.14);
    };
    rng.addEventListener('input', () => {
      freq = Number(rng.value);
      hzEl.textContent = `${freq} Hz`;
    });
    body.querySelector('#tn-play')?.addEventListener('click', () => playStoreBeep(freq, 0.5, 'sine', 0.14));
    body.querySelector('#tn-a4')?.addEventListener('click', () => setF(440));
    body.querySelector('#tn-c5')?.addEventListener('click', () => setF(523));
    return () => `${app.name}: ${freq} Hz`;
  }

  // Drum Pads or Piano Keys
  const pads =
    app.variant === 'drums'
      ? [
          { label: 'Kick', f: 75, type: 'sine' as OscillatorType, dur: 0.16 },
          { label: 'Snare', f: 210, type: 'sawtooth' as OscillatorType, dur: 0.09 },
          { label: 'Hi-Hat', f: 1400, type: 'square' as OscillatorType, dur: 0.04 },
          { label: 'Clap', f: 420, type: 'triangle' as OscillatorType, dur: 0.07 },
          { label: 'Low Tom', f: 120, type: 'sine' as OscillatorType, dur: 0.14 },
          { label: 'High Tom', f: 185, type: 'sine' as OscillatorType, dur: 0.12 },
          { label: 'Rim', f: 880, type: 'square' as OscillatorType, dur: 0.03 },
          { label: 'Bell', f: 1120, type: 'triangle' as OscillatorType, dur: 0.22 },
        ]
      : [
          { label: 'C4', f: 261.63, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'D4', f: 293.66, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'E4', f: 329.63, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'F4', f: 349.23, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'G4', f: 392.0, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'A4', f: 440.0, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'B4', f: 493.88, type: 'triangle' as OscillatorType, dur: 0.25 },
          { label: 'C5', f: 523.25, type: 'triangle' as OscillatorType, dur: 0.25 },
        ];

  body.innerHTML = `<div class="mini-pad-grid" id="snd-grid"></div>`;
  const grid = body.querySelector('#snd-grid') as HTMLElement;
  pads.forEach((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-sound-pad';
    b.textContent = p.label;
    b.addEventListener('click', () => {
      playStoreBeep(p.f, p.dur, p.type, 0.16);
      b.classList.add('is-hit');
      setTimeout(() => b.classList.remove('is-hit'), 120);
    });
    grid.appendChild(b);
  });
  void bridge;
  return () => `${app.name} Synth Session`;
}

// ---------- ENGINE 7: PIXEL / COLOR / GRADIENT / CONTRAST ----------
function mountPixelColorEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  if (app.variant === 'pixel') {
    let activeColor = '#2563eb';
    const colors = ['#0f172a', '#ffffff', '#dc2626', '#ea580c', '#eab308', '#16a34a', '#2563eb', '#9333ea'];
    body.innerHTML = `
      <div class="mini-btn-row" id="px-swatches"></div>
      <div class="mini-pixel-grid" id="px-grid"></div>
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="px-clear">Clear</button>
        <button type="button" class="win95-btn" id="px-export">🖼️ Save PNG to C:\\Pictures</button>
      </div>
    `;
    const sw = body.querySelector('#px-swatches') as HTMLElement;
    const grid = body.querySelector('#px-grid') as HTMLElement;
    colors.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-swatch-btn';
      btn.style.background = c;
      btn.addEventListener('click', () => {
        activeColor = c;
        bridge.playClick();
      });
      sw.appendChild(btn);
    });
    const cells: HTMLDivElement[] = [];
    for (let i = 0; i < 64; i++) {
      const cell = document.createElement('div');
      cell.className = 'mini-pixel-cell';
      cell.style.background = '#ffffff';
      cell.addEventListener('click', () => (cell.style.background = activeColor));
      grid.appendChild(cell);
      cells.push(cell);
    }
    body.querySelector('#px-clear')?.addEventListener('click', () => cells.forEach((c) => (c.style.background = '#ffffff')));
    body.querySelector('#px-export')?.addEventListener('click', () => {
      const cv = document.createElement('canvas');
      cv.width = 160;
      cv.height = 160;
      const ctx = cv.getContext('2d');
      if (ctx) {
        cells.forEach((c, idx) => {
          ctx.fillStyle = c.style.background || '#ffffff';
          ctx.fillRect((idx % 8) * 20, Math.floor(idx / 8) * 20, 20, 20);
        });
        const fn = `SPRITE_${Math.floor(100 + Math.random() * 900)}.PNG`;
        bridge.saveImageToPictures(fn, cv.toDataURL('image/png'));
        bridge.pushToast('Sprite Saved', `Saved ${fn} to C:\\Pictures`, app.icon);
      }
    });
    return () => `${app.name} 8x8 Sprite`;
  }

  let cssOut = '';
  body.innerHTML = `
    <div class="mini-grid-form">
      <label class="mini-field"><span>Color A</span><input type="color" id="col-a" value="#0f172a" /></label>
      <label class="mini-field"><span>Color B</span><input type="color" id="col-b" value="#2563eb" /></label>
      <label class="mini-field"><span>Angle (°)</span><input type="range" id="col-ang" min="0" max="360" value="135" /></label>
    </div>
    <div class="mini-color-preview" id="col-prev"></div>
    <pre class="mini-code-out" id="col-css"></pre>
  `;
  const aIn = body.querySelector('#col-a') as HTMLInputElement;
  const bIn = body.querySelector('#col-b') as HTMLInputElement;
  const angIn = body.querySelector('#col-ang') as HTMLInputElement;
  const prev = body.querySelector('#col-prev') as HTMLElement;
  const cssEl = body.querySelector('#col-css') as HTMLElement;
  const upd = () => {
    const grad = `linear-gradient(${angIn.value}deg, ${aIn.value}, ${bIn.value})`;
    prev.style.background = grad;
    cssOut = `background: ${grad};\n/* Primary: ${aIn.value} | Secondary: ${bIn.value} */`;
    cssEl.textContent = cssOut;
  };
  [aIn, bIn, angIn].forEach((el) => el.addEventListener('input', upd));
  upd();
  return () => cssOut;
}

// ---------- ENGINE 8: DEVELOPER TOOLS ----------
function mountDevToolEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  let outStr = '';
  if (app.variant === 'uuid') {
    body.innerHTML = `
      <div class="mini-btn-row"><button type="button" class="win95-btn" id="uuid-gen">🎲 Generate 5 UUIDs</button></div>
      <pre class="mini-code-out tabular-nums" id="uuid-out"></pre>
    `;
    const out = body.querySelector('#uuid-out') as HTMLElement;
    const gen = () => {
      const list = Array.from({ length: 5 }, () =>
        crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`,
      );
      outStr = list.join('\n');
      out.textContent = outStr;
    };
    body.querySelector('#uuid-gen')?.addEventListener('click', () => {
      bridge.playClick();
      gen();
    });
    gen();
    return () => outStr;
  }

  if (app.variant === 'epoch') {
    body.innerHTML = `
      <label class="mini-field"><span>Unix Seconds</span><input type="number" class="win95-input tabular-nums" id="ep-in" value="${Math.floor(Date.now() / 1000)}" /></label>
      <div class="mini-result-panel tabular-nums" id="ep-out"></div>
    `;
    const inp = body.querySelector('#ep-in') as HTMLInputElement;
    const out = body.querySelector('#ep-out') as HTMLElement;
    const upd = () => {
      const d = new Date((Number(inp.value) || 0) * 1000);
      outStr = `ISO: ${d.toISOString()}\nLocal: ${d.toLocaleString()}`;
      out.innerHTML = `<div class="mini-result-row"><span>ISO-8601</span><strong>${esc(d.toISOString())}</strong></div><div class="mini-result-row"><span>Local</span><strong>${esc(d.toLocaleString())}</strong></div>`;
    };
    inp.addEventListener('input', upd);
    upd();
    return () => outStr;
  }

  if (app.variant === 'subnet') {
    body.innerHTML = `
      <div class="mini-grid-form">
        <label class="mini-field"><span>IPv4 Address</span><input type="text" class="win95-input tabular-nums" id="sn-ip" value="192.168.1.42" /></label>
        <label class="mini-field"><span>CIDR Prefix</span><input type="number" class="win95-input tabular-nums" id="sn-cidr" value="24" min="1" max="30" /></label>
      </div>
      <div class="mini-result-panel tabular-nums" id="sn-out"></div>
    `;
    const ipIn = body.querySelector('#sn-ip') as HTMLInputElement;
    const cidrIn = body.querySelector('#sn-cidr') as HTMLInputElement;
    const out = body.querySelector('#sn-out') as HTMLElement;
    const upd = () => {
      const cidr = Math.max(1, Math.min(30, Number(cidrIn.value) || 24));
      const hosts = Math.pow(2, 32 - cidr) - 2;
      const maskInt = (0xffffffff << (32 - cidr)) >>> 0;
      const mask = [24, 16, 8, 0].map((s) => (maskInt >>> s) & 255).join('.');
      outStr = `IP: ${ipIn.value}/${cidr}\nSubnet Mask: ${mask}\nUsable Hosts: ${hosts}`;
      out.innerHTML = `<div class="mini-result-row"><span>Mask</span><strong>${mask}</strong></div><div class="mini-result-row"><span>Usable Hosts</span><strong>${hosts.toLocaleString()}</strong></div>`;
    };
    ipIn.addEventListener('input', upd);
    cidrIn.addEventListener('input', upd);
    upd();
    return () => outStr;
  }

  // JSON / Base64 / Regex / Markdown / Hash / Diff general transform workbench
  const defaultSample =
    app.variant === 'json'
      ? '{"os":"Angel OS","version":"2.0.0","apps":500}'
      : app.variant === 'base64'
        ? 'Welcome to Angel OS 2.0!'
        : app.variant === 'markdown'
          ? '# Angel OS Notes\n- Fast cloud saves\n- 500+ installable apps'
          : 'Angel OS 2026 Developer Workbench';

  body.innerHTML = `
    <textarea class="win95-input" id="dev-in" rows="4">${esc(defaultSample)}</textarea>
    <div class="mini-btn-row">
      <button type="button" class="win95-btn" id="dev-run">▶ Process</button>
      ${app.variant === 'base64' ? '<button type="button" class="win95-btn" id="dev-dec">↩ Decode Base64</button>' : ''}
    </div>
    <pre class="mini-code-out" id="dev-out"></pre>
  `;
  const inEl = body.querySelector('#dev-in') as HTMLTextAreaElement;
  const outEl = body.querySelector('#dev-out') as HTMLElement;
  const run = async (decode = false) => {
    bridge.playClick();
    const raw = inEl.value;
    try {
      if (app.variant === 'json') {
        outStr = JSON.stringify(JSON.parse(raw), null, 2);
      } else if (app.variant === 'base64') {
        outStr = decode ? decodeURIComponent(escape(atob(raw.trim()))) : btoa(unescape(encodeURIComponent(raw)));
      } else if (app.variant === 'hash' && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        outStr = 'SHA-256:\n' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } else if (app.variant === 'regex') {
        const matches = raw.match(/\b[A-Za-z0-9_]+\b/g) || [];
        outStr = `Tokens found (${matches.length}):\n${matches.join(', ')}`;
      } else {
        outStr = `Processed (${raw.length} chars):\n${raw}`;
      }
    } catch (err: any) {
      outStr = `Error: ${err?.message || 'Invalid input'}`;
    }
    outEl.textContent = outStr;
  };
  body.querySelector('#dev-run')?.addEventListener('click', () => run(false));
  body.querySelector('#dev-dec')?.addEventListener('click', () => run(true));
  run(false);
  return () => outStr;
}

// ---------- ENGINE 9: PRODUCTIVITY TRACKERS ----------
function mountProductivityEngine(
  app: StoreAppMeta,
  body: HTMLElement,
  bridge: StoreHostBridge,
  cleanups: Array<() => void>,
): () => string {
  if (app.variant === 'pomodoro') {
    let secs = 25 * 60;
    let timer: number | null = null;
    body.innerHTML = `
      <div class="mini-result-panel tabular-nums" id="pom-clock" style="font-size:2rem;text-align:center;font-weight:700;">25:00</div>
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="pom-start">▶ Start</button>
        <button type="button" class="win95-btn" id="pom-pause">❚❚ Pause</button>
        <button type="button" class="win95-btn" id="pom-reset">↻ 25m</button>
        <button type="button" class="win95-btn" id="pom-break">☕ 5m Break</button>
      </div>
    `;
    const clk = body.querySelector('#pom-clock') as HTMLElement;
    const render = () => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      clk.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    body.querySelector('#pom-start')?.addEventListener('click', () => {
      if (timer) return;
      timer = window.setInterval(() => {
        if (secs > 0) {
          secs--;
          render();
        } else {
          stop();
          playStoreBeep(880, 0.3, 'triangle', 0.16);
        }
      }, 1000);
    });
    body.querySelector('#pom-pause')?.addEventListener('click', stop);
    body.querySelector('#pom-reset')?.addEventListener('click', () => { stop(); secs = 25 * 60; render(); });
    body.querySelector('#pom-break')?.addEventListener('click', () => { stop(); secs = 5 * 60; render(); });
    cleanups.push(stop);
    return () => `${app.name} Timer: ${clk.textContent}`;
  }

  // Interactive Checklist / Kanban / Budget / Habit items
  const items: Array<{ text: string; done: boolean }> = [
    { text: 'Set up Angel OS personal workspace', done: true },
    { text: 'Explore 500 apps in Ability to Install', done: false },
    { text: 'Export notes to C:\\Documents', done: false },
  ];
  body.innerHTML = `
    <div class="mini-btn-row">
      <input type="text" class="win95-input" id="prd-in" placeholder="Add new item..." />
      <button type="button" class="win95-btn" id="prd-add">+ Add</button>
    </div>
    <div class="mini-list-stack" id="prd-list"></div>
  `;
  const inp = body.querySelector('#prd-in') as HTMLInputElement;
  const listEl = body.querySelector('#prd-list') as HTMLElement;
  const render = () => {
    listEl.innerHTML = '';
    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'mini-check-row';
      row.innerHTML = `
        <label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer;">
          <input type="checkbox" ${it.done ? 'checked' : ''} />
          <span style="${it.done ? 'text-decoration:line-through;opacity:0.6;' : ''}">${esc(it.text)}</span>
        </label>
        <button type="button" class="win95-btn" style="padding:1px 6px;">✕</button>
      `;
      row.querySelector('input')?.addEventListener('change', (e) => {
        it.done = (e.target as HTMLInputElement).checked;
        bridge.playClick();
        render();
      });
      row.querySelector('button')?.addEventListener('click', () => {
        items.splice(idx, 1);
        render();
      });
      listEl.appendChild(row);
    });
  };
  const add = () => {
    const t = inp.value.trim();
    if (!t) return;
    items.push({ text: t, done: false });
    inp.value = '';
    bridge.playClick();
    render();
  };
  body.querySelector('#prd-add')?.addEventListener('click', add);
  inp.addEventListener('keydown', (e) => e.key === 'Enter' && add());
  render();
  return () => items.map((i) => `[${i.done ? 'x' : ' '}] ${i.text}`).join('\n');
}

// ---------- ENGINE 10: TEXT STUDIO ----------
function mountTextStudioEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  if (app.variant === 'password') {
    let pw = '';
    body.innerHTML = `
      <div class="mini-grid-form">
        <label class="mini-field"><span>Length</span><input type="number" class="win95-input tabular-nums" id="pw-len" value="18" min="8" max="64" /></label>
      </div>
      <div class="mini-result-panel tabular-nums" id="pw-out" style="font-size:1rem;word-break:break-all;font-weight:700;"></div>
      <button type="button" class="win95-btn" id="pw-gen">🔑 Generate Strong Password</button>
    `;
    const lenIn = body.querySelector('#pw-len') as HTMLInputElement;
    const out = body.querySelector('#pw-out') as HTMLElement;
    const gen = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
      const n = Math.max(8, Math.min(64, Number(lenIn.value) || 18));
      const arr = new Uint32Array(n);
      crypto.getRandomValues(arr);
      pw = Array.from(arr, (x) => chars[x % chars.length]).join('');
      out.textContent = pw;
    };
    body.querySelector('#pw-gen')?.addEventListener('click', () => { bridge.playClick(); gen(); });
    gen();
    return () => `Generated Password:\n${pw}`;
  }

  body.innerHTML = `
    <textarea class="win95-input" id="txt-in" rows="5" placeholder="Type or paste text here...">Angel OS 2.0 delivers private user saves and 500 interactive apps.</textarea>
    <div class="mini-btn-row">
      <button type="button" class="win95-btn" id="txt-upper">UPPER</button>
      <button type="button" class="win95-btn" id="txt-lower">lower</button>
      <button type="button" class="win95-btn" id="txt-slug">slug-case</button>
      <button type="button" class="win95-btn" id="txt-dedupe">Sort &amp; Dedupe</button>
      <button type="button" class="win95-btn" id="txt-box">ASCII Frame</button>
    </div>
    <div class="mini-result-panel tabular-nums" id="txt-stats"></div>
  `;
  const ta = body.querySelector('#txt-in') as HTMLTextAreaElement;
  const stats = body.querySelector('#txt-stats') as HTMLElement;
  const upd = () => {
    const t = ta.value;
    const words = t.trim() ? t.trim().split(/\s+/).length : 0;
    const lines = t ? t.split('\n').length : 0;
    stats.innerHTML = `<div class="mini-result-row"><span>Words · Chars · Lines</span><strong>${words} · ${t.length} · ${lines}</strong></div>`;
  };
  body.querySelector('#txt-upper')?.addEventListener('click', () => { ta.value = ta.value.toUpperCase(); upd(); });
  body.querySelector('#txt-lower')?.addEventListener('click', () => { ta.value = ta.value.toLowerCase(); upd(); });
  body.querySelector('#txt-slug')?.addEventListener('click', () => { ta.value = ta.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); upd(); });
  body.querySelector('#txt-dedupe')?.addEventListener('click', () => { ta.value = Array.from(new Set(ta.value.split('\n').map((s) => s.trim()).filter(Boolean))).sort().join('\n'); upd(); });
  body.querySelector('#txt-box')?.addEventListener('click', () => {
    const line = ta.value.split('\n')[0] || app.name;
    const bar = '+' + '-'.repeat(line.length + 2) + '+';
    ta.value = `${bar}\n| ${line} |\n${bar}`;
    upd();
  });
  ta.addEventListener('input', upd);
  upd();
  void bridge;
  return () => ta.value;
}

// ---------- ENGINE 11: SCIENCE & MATH LAB ----------
function mountScienceLabEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  let outText = '';
  if (app.variant === 'planets') {
    const gMap: Array<[string, number]> = [
      ['Mercury', 0.38], ['Venus', 0.91], ['Moon', 0.165], ['Mars', 0.38],
      ['Jupiter', 2.34], ['Saturn', 1.06], ['Uranus', 0.92], ['Neptune', 1.19],
    ];
    body.innerHTML = `
      <label class="mini-field"><span>Earth Weight (kg)</span><input type="number" class="win95-input tabular-nums" id="pl-w" value="70" /></label>
      <div class="mini-result-panel tabular-nums" id="pl-out"></div>
    `;
    const wIn = body.querySelector('#pl-w') as HTMLInputElement;
    const out = body.querySelector('#pl-out') as HTMLElement;
    const run = () => {
      const w = Number(wIn.value) || 0;
      const rows = gMap.map(([p, g]) => [p, `${(w * g).toFixed(1)} kg`]);
      outText = rows.map(([p, v]) => `${p}: ${v}`).join('\n');
      out.innerHTML = rows.map(([p, v]) => `<div class="mini-result-row"><span>${p}</span><strong>${v}</strong></div>`).join('');
    };
    wIn.addEventListener('input', run);
    run();
    return () => outText;
  }

  if (app.variant === 'stats') {
    body.innerHTML = `
      <label class="mini-field"><span>Numbers (comma-separated)</span><input type="text" class="win95-input tabular-nums" id="st-nums" value="12, 18, 22, 27, 35, 42, 42, 58" /></label>
      <div class="mini-result-panel tabular-nums" id="st-out"></div>
    `;
    const inp = body.querySelector('#st-nums') as HTMLInputElement;
    const out = body.querySelector('#st-out') as HTMLElement;
    const run = () => {
      const nums = inp.value.split(/[,\s]+/).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
      if (!nums.length) return;
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const mid = Math.floor(nums.length / 2);
      const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      const std = Math.sqrt(nums.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / nums.length);
      const rows = [
        ['Count', String(nums.length)],
        ['Mean', mean.toFixed(3)],
        ['Median', median.toFixed(3)],
        ['Std Dev', std.toFixed(3)],
        ['Min / Max', `${nums[0]} / ${nums[nums.length - 1]}`],
      ];
      outText = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
      out.innerHTML = rows.map(([k, v]) => `<div class="mini-result-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
    };
    inp.addEventListener('input', run);
    run();
    return () => outText;
  }

  // Prime Factorizer & Quadratic default
  body.innerHTML = `
    <label class="mini-field"><span>Integer to Factorize</span><input type="number" class="win95-input tabular-nums" id="pr-in" value="2026" min="2" max="99999999" /></label>
    <div class="mini-result-panel tabular-nums" id="pr-out"></div>
  `;
  const inp = body.querySelector('#pr-in') as HTMLInputElement;
  const out = body.querySelector('#pr-out') as HTMLElement;
  const run = () => {
    let n = Math.max(2, Math.floor(Number(inp.value) || 2));
    const orig = n;
    const factors: number[] = [];
    for (let d = 2; d * d <= n; d++) {
      while (n % d === 0) {
        factors.push(d);
        n /= d;
      }
    }
    if (n > 1) factors.push(n);
    const isPrime = factors.length === 1;
    outText = `${orig} = ${factors.join(' × ')} (${isPrime ? 'PRIME' : 'COMPOSITE'})`;
    out.innerHTML = `<div class="mini-result-row"><span>Status</span><strong>${isPrime ? 'Prime Number' : 'Composite'}</strong></div><div class="mini-result-row"><span>Prime Factors</span><strong>${factors.join(' × ')}</strong></div>`;
  };
  inp.addEventListener('input', run);
  run();
  void bridge;
  return () => outText;
}

// ---------- ENGINE 12: SYSTEM TESTERS & UTILITIES ----------
function mountSystemTesterEngine(
  app: StoreAppMeta,
  body: HTMLElement,
  bridge: StoreHostBridge,
  cleanups: Array<() => void>,
): () => string {
  if (app.variant === 'worldclock') {
    const zones = [
      ['Los Angeles', 'America/Los_Angeles'],
      ['New York', 'America/New_York'],
      ['London', 'Europe/London'],
      ['Tokyo', 'Asia/Tokyo'],
      ['Sydney', 'Australia/Sydney'],
    ];
    body.innerHTML = `<div class="mini-result-panel tabular-nums" id="wc-out"></div>`;
    const out = body.querySelector('#wc-out') as HTMLElement;
    const tick = () => {
      const now = new Date();
      out.innerHTML = zones
        .map(([city, tz]) => {
          const t = now.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `<div class="mini-result-row"><span>${city}</span><strong>${t}</strong></div>`;
        })
        .join('');
    };
    tick();
    const id = window.setInterval(tick, 1000);
    cleanups.push(() => clearInterval(id));
    return () => `${app.name} snapshot at ${new Date().toISOString()}`;
  }

  if (app.variant === 'keyboard') {
    body.innerHTML = `
      <div class="mini-result-panel tabular-nums" id="kb-out" style="text-align:center;font-size:1rem;padding:18px;">Press any key on your keyboard...</div>
    `;
    const out = body.querySelector('#kb-out') as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      out.innerHTML = `<strong>${esc(e.key)}</strong><br/><span style="font-size:0.75rem;">code: ${esc(e.code)} · keyCode: ${e.keyCode}</span>`;
    };
    window.addEventListener('keydown', onKey);
    cleanups.push(() => window.removeEventListener('keydown', onKey));
    return () => `${app.name}: ${out.textContent || ''}`;
  }

  // Stopwatch default
  let ms = 0;
  let running = false;
  let lastTs = 0;
  let raf: number | null = null;
  const laps: string[] = [];
  body.innerHTML = `
    <div class="mini-result-panel tabular-nums" id="sw-disp" style="font-size:1.8rem;text-align:center;font-weight:700;">00:00.00</div>
    <div class="mini-btn-row">
      <button type="button" class="win95-btn" id="sw-go">▶ Start</button>
      <button type="button" class="win95-btn" id="sw-lap">🏁 Lap</button>
      <button type="button" class="win95-btn" id="sw-rst">↻ Reset</button>
    </div>
    <div class="mini-result-panel tabular-nums" id="sw-laps" style="max-height:110px;overflow:auto;"></div>
  `;
  const disp = body.querySelector('#sw-disp') as HTMLElement;
  const lapsEl = body.querySelector('#sw-laps') as HTMLElement;
  const goBtn = body.querySelector('#sw-go') as HTMLButtonElement;
  const fmt = (t: number) => {
    const m = Math.floor(t / 60000);
    const s = Math.floor((t % 60000) / 1000);
    const cs = Math.floor((t % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };
  const step = (ts: number) => {
    if (!running) return;
    ms += ts - lastTs;
    lastTs = ts;
    disp.textContent = fmt(ms);
    raf = requestAnimationFrame(step);
  };
  goBtn.addEventListener('click', () => {
    bridge.playClick();
    if (running) {
      running = false;
      goBtn.textContent = '▶ Resume';
    } else {
      running = true;
      lastTs = performance.now();
      goBtn.textContent = '❚❚ Pause';
      raf = requestAnimationFrame(step);
    }
  });
  body.querySelector('#sw-lap')?.addEventListener('click', () => {
    laps.unshift(`Lap ${laps.length + 1}: ${fmt(ms)}`);
    lapsEl.innerHTML = laps.map((l) => `<div class="mini-result-row"><span>${l}</span></div>`).join('');
  });
  body.querySelector('#sw-rst')?.addEventListener('click', () => {
    running = false;
    ms = 0;
    laps.length = 0;
    goBtn.textContent = '▶ Start';
    disp.textContent = '00:00.00';
    lapsEl.innerHTML = '';
  });
  cleanups.push(() => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  });
  return () => `${app.name}\nCurrent: ${fmt(ms)}\n${laps.join('\n')}`;
}

// ---------- ENGINE 13: DICE / BLACKJACK / WHEEL / QUOTES ----------
function mountDiceRpgEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  const history: string[] = [];
  if (app.variant === 'blackjack') {
    let player: number[] = [];
    let dealer: number[] = [];
    const draw = () => Math.min(10, Math.floor(Math.random() * 13) + 1);
    const sum = (h: number[]) => h.reduce((a, b) => a + b, 0);
    body.innerHTML = `
      <div class="mini-result-panel tabular-nums" id="bj-state"></div>
      <div class="mini-btn-row">
        <button type="button" class="win95-btn" id="bj-hit">🃏 Hit</button>
        <button type="button" class="win95-btn" id="bj-stand">✋ Stand</button>
        <button type="button" class="win95-btn" id="bj-deal">↻ New Hand</button>
      </div>
    `;
    const st = body.querySelector('#bj-state') as HTMLElement;
    let status = 'Your move';
    const render = () => {
      st.innerHTML = `<div class="mini-result-row"><span>Dealer</span><strong>${dealer.join(', ')} (${sum(dealer)})</strong></div><div class="mini-result-row"><span>You</span><strong>${player.join(', ')} (${sum(player)})</strong></div><div class="mini-result-row"><span>Status</span><strong>${status}</strong></div>`;
    };
    const deal = () => {
      player = [draw(), draw()];
      dealer = [draw()];
      status = 'Hit or Stand';
      render();
    };
    body.querySelector('#bj-hit')?.addEventListener('click', () => {
      bridge.playClick();
      player.push(draw());
      if (sum(player) > 21) status = 'Bust! Dealer wins.';
      render();
    });
    body.querySelector('#bj-stand')?.addEventListener('click', () => {
      bridge.playClick();
      while (sum(dealer) < 17) dealer.push(draw());
      const ps = sum(player);
      const ds = sum(dealer);
      status = ps > 21 ? 'Bust!' : ds > 21 || ps > ds ? 'You Win!' : ps === ds ? 'Push (Tie)' : 'Dealer Wins';
      render();
    });
    body.querySelector('#bj-deal')?.addEventListener('click', deal);
    deal();
    return () => `${app.name}: ${status}`;
  }

  body.innerHTML = `
    <div class="mini-btn-row">
      ${[4, 6, 8, 10, 12, 20, 100].map((d) => `<button type="button" class="win95-btn dice-btn" data-d="${d}">d${d}</button>`).join('')}
    </div>
    <div class="mini-result-panel tabular-nums" id="dice-out" style="max-height:170px;overflow:auto;">Click any die to roll!</div>
  `;
  const out = body.querySelector('#dice-out') as HTMLElement;
  body.querySelectorAll<HTMLButtonElement>('.dice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sides = Number(btn.dataset.d) || 6;
      const roll = Math.floor(Math.random() * sides) + 1;
      playStoreBeep(300 + roll * 14, 0.07, 'triangle', 0.12);
      history.unshift(`d${sides} → ${roll}`);
      out.innerHTML = history.slice(0, 14).map((h) => `<div class="mini-result-row"><span>${h}</span></div>`).join('');
    });
  });
  void bridge;
  return () => history.join('\n') || `${app.name}: No rolls yet`;
}

// ---------- ENGINE 14: SEARCHABLE REFERENCE HANDBOOK ----------
function mountReferenceEngine(app: StoreAppMeta, body: HTMLElement, bridge: StoreHostBridge): () => string {
  const DECKS: Record<string, Array<[string, string]>> = {
    http: [
      ['200 OK', 'Standard success response'],
      ['201 Created', 'New resource created on server'],
      ['301 Moved', 'Permanent URL redirect'],
      ['400 Bad Request', 'Malformed syntax or invalid parameters'],
      ['401 Unauthorized', 'Authentication required'],
      ['403 Forbidden', 'Authenticated but lacking permission'],
      ['404 Not Found', 'Requested resource does not exist'],
      ['429 Too Many Requests', 'Rate limit exceeded'],
      ['500 Server Error', 'Unhandled server failure'],
      ['503 Unavailable', 'Server overloaded or down for maintenance'],
    ],
    git: [
      ['git status', 'Inspect modified and staged files'],
      ['git switch -c <branch>', 'Create and switch to a new branch'],
      ['git add -p', 'Interactively stage hunks'],
      ['git commit -m "msg"', 'Record staged changes'],
      ['git log --oneline -n 10', 'Compact recent commit history'],
      ['git stash push -u', 'Temporarily shelve untracked and modified files'],
      ['git rebase -i HEAD~3', 'Interactive history cleanup'],
    ],
    elements: [
      ['1 · H — Hydrogen', 'Nonmetal · 1.008 u'],
      ['2 · He — Helium', 'Noble Gas · 4.0026 u'],
      ['6 · C — Carbon', 'Nonmetal · 12.011 u'],
      ['7 · N — Nitrogen', 'Nonmetal · 14.007 u'],
      ['8 · O — Oxygen', 'Nonmetal · 15.999 u'],
      ['14 · Si — Silicon', 'Metalloid · 28.085 u'],
      ['26 · Fe — Iron', 'Transition Metal · 55.845 u'],
      ['29 · Cu — Copper', 'Transition Metal · 63.546 u'],
      ['47 · Ag — Silver', 'Transition Metal · 107.87 u'],
      ['79 · Au — Gold', 'Transition Metal · 196.97 u'],
    ],
    linux: [
      ['ls -la', 'List all files including hidden entries with permissions'],
      ['grep -rn "term" .', 'Recursive search with line numbers'],
      ['find . -name "*.ts"', 'Locate files matching glob pattern'],
      ['chmod +x script.sh', 'Mark script executable'],
      ['df -h', 'Display human-readable disk usage'],
      ['tar -czf out.tar.gz dir/', 'Compress directory into gzipped tarball'],
    ],
  };

  const rows = DECKS[app.variant] || DECKS.http;
  body.innerHTML = `
    <input type="text" class="win95-input" id="ref-search" placeholder="Filter entries..." />
    <div class="mini-result-panel" id="ref-list" style="max-height:210px;overflow:auto;"></div>
  `;
  const inp = body.querySelector('#ref-search') as HTMLInputElement;
  const list = body.querySelector('#ref-list') as HTMLElement;
  const render = () => {
    const q = inp.value.trim().toLowerCase();
    const filtered = rows.filter(([k, v]) => !q || k.toLowerCase().includes(q) || v.toLowerCase().includes(q));
    list.innerHTML = filtered
      .map(([k, v]) => `<div class="mini-result-row"><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`)
      .join('') || '<div style="opacity:0.7;">No matching entries.</div>';
  };
  inp.addEventListener('input', render);
  render();
  void bridge;
  return () => rows.map(([k, v]) => `${k}: ${v}`).join('\n');
}
