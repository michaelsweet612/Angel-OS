// ==================== GEMPLAYER 95 MEGA SYNTH & 5,000-TRACK LIBRARY (osGemPlayerLibrary.ts) ====================
// Hand-crafted signature chiptune themes (Mario Theme, Legend of Z Intro, Hello Neighbor Chase,
// Big Boy Jim Boss Battle, Harry Potter Theme + 4 classic 1995 tracks) plus 5,000 unique
// deterministically generated random music selections with distinct names, genres, scales & rhythms.

export type SynthWaveType = 'square' | 'sawtooth' | 'triangle' | 'sine';

export type DrumPatternKind = 'none' | 'light' | 'march' | 'chase' | 'boss' | 'waltz' | 'arcade';

export interface SynthTrack {
  id: string;
  numLabel: string;
  title: string;
  shortLabel: string;
  icon: string;
  genre: string;
  bpm: number;
  leadWave: SynthWaveType;
  bassWave: SynthWaveType;
  bellShimmer?: boolean;
  drums: DrumPatternKind;
  palette: [string, string, string];
  notes: number[]; // Hz (0 = rest)
  bass: number[]; // Hz (0 = rest)
  harmony?: number[]; // Optional 3rd polyphonic chord/arpeggio voice (0 = rest)
  featured?: boolean;
}

export interface RandomTrackMeta {
  index: number; // 1..5000
  id: string;
  numLabel: string;
  title: string;
  genre: string;
  icon: string;
  bpm: number;
  keyLabel: string;
}

export const RANDOM_MUSIC_COUNT = 5000;

const R = 0; // Musical rest

// Standard equal-temperament note frequency helper
const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function N(name: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const semi = NOTE_INDEX[m[1]];
  const oct = parseInt(m[2], 10);
  const midi = (oct + 1) * 12 + semi;
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

function midiToHz(midi: number): number {
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

// ==================== 1. FEATURED SIGNATURE TRACKS ====================
export const FEATURED_SYNTH_TRACKS: SynthTrack[] = [
  {
    id: 'feat_mario',
    numLabel: 'F-01',
    title: 'Mario Theme Music (8-Bit Overworld Classic)',
    shortLabel: '🍄 Mario Theme',
    icon: '🍄',
    genre: '8-Bit Adventure',
    bpm: 162,
    leadWave: 'square',
    bassWave: 'triangle',
    drums: 'arcade',
    palette: ['#ef4444', '#facc15', '#3b82f6'],
    featured: true,
    notes: [
      N('E5'), N('E5'), R, N('E5'), R, N('C5'), N('E5'), R,
      N('G5'), R, R, R, N('G4'), R, R, R,
      N('C5'), R, R, N('G4'), R, R, N('E4'), R,
      R, N('A4'), R, N('B4'), R, N('Bb4'), N('A4'), R,
      N('G4'), N('E5'), N('G5'), N('A5'), R, N('F5'), N('G5'), R,
      N('E5'), R, N('C5'), N('D5'), N('B4'), R, R, R,
      N('C5'), R, R, N('G4'), R, R, N('E4'), R,
      R, N('A4'), R, N('B4'), R, N('Bb4'), N('A4'), R,
      N('G4'), N('E5'), N('G5'), N('A5'), R, N('F5'), N('G5'), R,
      N('E5'), R, N('C5'), N('D5'), N('B4'), R, R, R,
    ],
    bass: [
      N('D3'), N('D3'), R, N('D3'), R, N('D3'), N('D3'), R,
      N('G2'), R, R, R, N('G2'), R, R, R,
      N('G2'), R, R, N('E2'), R, R, N('C2'), R,
      R, N('F2'), R, N('G2'), R, N('Gb2'), N('F2'), R,
      N('E2'), N('C3'), N('E3'), N('F3'), R, N('D3'), N('E3'), R,
      N('C3'), R, N('A2'), N('B2'), N('G2'), R, R, R,
      N('G2'), R, R, N('E2'), R, R, N('C2'), R,
      R, N('F2'), R, N('G2'), R, N('Gb2'), N('F2'), R,
      N('E2'), N('C3'), N('E3'), N('F3'), R, N('D3'), N('E3'), R,
      N('C3'), R, N('A2'), N('B2'), N('G2'), R, R, R,
    ],
    harmony: [
      N('F#4'), N('F#4'), R, N('F#4'), R, N('F#4'), N('F#4'), R,
      N('B4'), R, R, R, N('G3'), R, R, R,
      N('E4'), R, R, N('C4'), R, R, N('G3'), R,
      R, N('C4'), R, N('D4'), R, N('Db4'), N('C4'), R,
      N('C4'), N('G4'), N('B4'), N('C5'), R, N('A4'), N('B4'), R,
      N('G4'), R, N('E4'), N('F4'), N('D4'), R, R, R,
    ],
  },
  {
    id: 'feat_legend_z',
    numLabel: 'F-02',
    title: 'Legend of Z Intro (Heroic Overworld Fanfare)',
    shortLabel: '⚔️ Legend of Z',
    icon: '⚔️',
    genre: '8-Bit Adventure',
    bpm: 136,
    leadWave: 'square',
    bassWave: 'triangle',
    drums: 'march',
    palette: ['#facc15', '#22c55e', '#15803d'],
    featured: true,
    notes: [
      N('Bb4'), R, R, N('F4'), R, R, N('Bb4'), N('Bb4'),
      N('C5'), N('D5'), N('Eb5'), N('F5'), R, R, R, R,
      N('F5'), R, N('F5'), N('Gb5'), N('Ab5'), N('Bb5'), R, R,
      R, R, N('Bb5'), R, N('Bb5'), N('Ab5'), N('Gb5'), N('Ab5'),
      N('Gb5'), N('F5'), R, R, N('F5'), R, N('Eb5'), N('Eb5'),
      N('F5'), N('Gb5'), R, R, N('F5'), N('Eb5'), N('Db5'), N('Db5'),
      N('Eb5'), N('F5'), R, R, N('Eb5'), N('Db5'), N('C5'), N('C5'),
      N('D5'), N('E5'), R, R, N('G5'), N('F5'), R, R,
    ],
    bass: [
      N('Bb2'), R, N('F2'), R, N('Bb2'), R, N('F2'), R,
      N('Ab2'), R, N('Eb2'), R, N('Ab2'), R, N('Eb2'), R,
      N('Gb2'), R, N('Db2'), R, N('Gb2'), R, N('Db2'), R,
      N('F2'), R, N('C2'), R, N('F2'), R, N('F2'), N('G2'),
      N('Ab2'), R, N('Eb2'), R, N('Db2'), R, N('Ab2'), R,
      N('Gb2'), R, N('Db2'), R, N('Gb2'), R, N('F2'), R,
      N('Eb2'), R, N('Bb2'), R, N('C2'), R, N('G2'), R,
      N('F2'), N('F2'), N('F2'), N('F2'), N('F2'), R, N('F2'), R,
    ],
    harmony: [
      N('D4'), R, N('D4'), R, N('D4'), R, N('D4'), R,
      N('C4'), R, N('C4'), R, N('C4'), R, N('C4'), R,
      N('Bb3'), R, N('Bb3'), R, N('Db4'), R, N('Db4'), R,
      N('A3'), R, N('A3'), R, N('C4'), R, N('C4'), R,
    ],
  },
  {
    id: 'feat_hello_neighbor',
    numLabel: 'F-03',
    title: 'Hello Neighbor Chase Music (Basement Panic Sprint)',
    shortLabel: '🔦 Neighbor Chase',
    icon: '🔦',
    genre: 'Stealth Chase',
    bpm: 170,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    drums: 'chase',
    palette: ['#dc2626', '#f97316', '#facc15'],
    featured: true,
    notes: [
      N('E4'), R, N('F4'), R, N('E4'), N('G4'), N('Bb4'), R,
      N('E4'), R, N('F4'), R, N('B4'), N('Bb4'), N('G4'), N('F4'),
      N('E5'), R, N('F5'), R, N('E5'), N('C5'), N('B4'), N('G4'),
      N('Bb4'), N('A4'), N('G4'), N('F4'), N('E4'), R, N('B3'), R,
      N('E4'), N('G4'), N('Bb4'), N('E5'), N('F5'), N('E5'), N('Bb4'), N('G4'),
      N('A4'), N('G4'), N('F4'), N('E4'), N('Eb4'), N('E4'), N('B4'), R,
      N('E5'), N('Eb5'), N('E5'), N('G5'), N('F5'), N('E5'), N('C5'), N('B4'),
      N('Bb4'), N('B4'), N('G4'), N('F4'), N('E4'), R, R, R,
    ],
    bass: [
      N('E2'), N('E2'), N('F2'), N('E2'), N('E2'), N('E2'), N('G2'), N('F2'),
      N('E2'), N('E2'), N('F2'), N('E2'), N('Bb2'), N('A2'), N('G2'), N('F2'),
      N('E2'), N('E2'), N('F2'), N('E2'), N('C2'), N('C2'), N('B1'), N('B1'),
      N('Bb1'), N('A1'), N('G1'), N('F1'), N('E2'), R, N('B1'), R,
    ],
    harmony: [
      N('B3'), R, N('C4'), R, N('B3'), R, N('E4'), R,
      N('B3'), R, N('C4'), R, N('F4'), N('E4'), R, R,
    ],
  },
  {
    id: 'feat_big_boy_jim',
    numLabel: 'F-04',
    title: 'Big Boy Jim Music — Boss Battle Music (Heavy 16-Bit Showdown)',
    shortLabel: '💪 Big Boy Jim Boss',
    icon: '💪',
    genre: 'Boss Battle',
    bpm: 158,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    drums: 'boss',
    palette: ['#ff0055', '#ff7b00', '#ffee00'],
    featured: true,
    notes: [
      N('D4'), N('D4'), N('F4'), N('D4'), N('Ab4'), R, N('G4'), N('F4'),
      N('D4'), N('D4'), N('C4'), N('D4'), N('A4'), R, N('G4'), R,
      N('D5'), N('D5'), N('F5'), N('D5'), N('E5'), N('D5'), N('C5'), N('A4'),
      N('Bb4'), N('A4'), N('G4'), N('F4'), N('E4'), N('F4'), N('G4'), N('A4'),
      N('D5'), R, N('D5'), N('F5'), N('G5'), N('F5'), N('E5'), N('D5'),
      N('C5'), R, N('Bb4'), N('A4'), N('G4'), N('F4'), N('E4'), N('D4'),
      N('A4'), N('Bb4'), N('A4'), N('G4'), N('F4'), N('G4'), N('A4'), N('C5'),
      N('D5'), N('D5'), N('D5'), R, N('A4'), R, N('D5'), R,
    ],
    bass: [
      N('D2'), N('D2'), N('D2'), N('D2'), N('F2'), N('F2'), N('G2'), N('Ab2'),
      N('D2'), N('D2'), N('C2'), N('D2'), N('A2'), N('A2'), N('G2'), N('F2'),
      N('Bb1'), N('Bb1'), N('Bb1'), N('Bb1'), N('C2'), N('C2'), N('C2'), N('C2'),
      N('A1'), N('A1'), N('A1'), N('A1'), N('A1'), N('C2'), N('E2'), N('G2'),
    ],
    harmony: [
      N('A3'), N('A3'), N('C4'), N('A3'), N('Eb4'), R, N('D4'), N('C4'),
      N('A3'), N('A3'), N('G3'), N('A3'), N('E4'), R, N('D4'), R,
      N('F4'), N('F4'), N('A4'), N('F4'), N('G4'), N('F4'), N('E4'), N('C4'),
      N('D4'), N('C4'), N('Bb3'), N('A3'), N('G3'), N('A3'), N('Bb3'), N('C4'),
    ],
  },
  {
    id: 'feat_harry_potter',
    numLabel: 'F-05',
    title: 'Harry Potter Theme Music (Celesta Magic Waltz)',
    shortLabel: '🪄 Harry Potter',
    icon: '🪄',
    genre: 'Wizard Magic',
    bpm: 118,
    leadWave: 'triangle',
    bassWave: 'sine',
    bellShimmer: true,
    drums: 'waltz',
    palette: ['#a855f7', '#38bdf8', '#fde047'],
    featured: true,
    notes: [
      R, R, N('B4'),
      N('E5'), R, R, N('G5'), N('F#5'), R,
      N('E5'), R, R, R, N('B5'), R,
      N('A5'), R, R, R, R, R,
      N('F#5'), R, R, R, R, R,
      N('E5'), R, R, N('G5'), N('F#5'), R,
      N('D#5'), R, R, R, N('F5'), R,
      N('B4'), R, R, R, R, R,
      R, R, N('B4'),
      N('E5'), R, R, N('G5'), N('F#5'), R,
      N('E5'), R, R, R, N('B5'), R,
      N('D6'), R, R, R, N('C#6'), R,
      N('C6'), R, R, R, N('Ab5'), R,
      N('C6'), R, R, N('B5'), N('Bb5'), R,
      N('B4'), R, R, R, N('G5'), R,
      N('E5'), R, R, R, R, R,
    ],
    bass: [
      R, R, R,
      N('E3'), R, N('B3'), N('E3'), R, N('B3'),
      N('E3'), R, N('B3'), N('E3'), R, N('B3'),
      N('A2'), R, N('E3'), N('A2'), R, N('E3'),
      N('B2'), R, N('F#3'), N('B2'), R, N('F#3'),
      N('E3'), R, N('B3'), N('E3'), R, N('B3'),
      N('B2'), R, N('F#3'), N('B2'), R, N('F#3'),
      N('E3'), R, N('B3'), N('E3'), R, N('B3'),
    ],
    harmony: [
      R, R, R,
      N('G3'), R, N('E4'), N('G3'), R, N('E4'),
      N('G3'), R, N('E4'), N('G3'), R, N('E4'),
      N('C4'), R, N('E4'), N('C4'), R, N('E4'),
      N('D#4'), R, N('B3'), N('D#4'), R, N('B3'),
    ],
  },
  {
    id: 'feat_canyon',
    numLabel: 'F-06',
    title: 'Canyon.mid (1995 FM Passport Remix)',
    shortLabel: '🎵 Canyon.mid',
    icon: '🎵',
    genre: 'Classic 95',
    bpm: 124,
    leadWave: 'square',
    bassWave: 'triangle',
    drums: 'light',
    palette: ['#00ff66', '#00ffff', '#ff00ff'],
    featured: true,
    notes: [
      N('C4'), N('E4'), N('G4'), N('C5'), N('G4'), N('E4'),
      N('D4'), N('F4'), N('A4'), N('D5'), N('A4'), N('F4'),
      N('E4'), N('G4'), N('B4'), N('E5'), N('D5'), N('B4'),
      N('C5'), N('G4'), N('E4'), N('G4'), N('C5'), R,
    ],
    bass: [
      N('C3'), N('C3'), N('D3'), N('D3'), N('E3'), N('E3'), N('G3'), N('G3'),
    ],
  },
  {
    id: 'feat_cyberwave',
    numLabel: 'F-07',
    title: 'CyberWave 95 (Neon Arpeggio)',
    shortLabel: '🌆 CyberWave 95',
    icon: '🌆',
    genre: 'Cyber Synth',
    bpm: 128,
    leadWave: 'square',
    bassWave: 'sawtooth',
    drums: 'arcade',
    palette: ['#f472b6', '#38bdf8', '#a855f7'],
    featured: true,
    notes: [
      N('A3'), N('C4'), N('E4'), N('A4'), N('E4'), N('C4'),
      N('G3'), N('B3'), N('D4'), N('G4'), N('D4'), N('B3'),
      N('F3'), N('A3'), N('C4'), N('F4'), N('C4'), N('A3'),
      N('E3'), N('G#3'), N('B3'), N('E4'), N('B3'), N('G#3'),
    ],
    bass: [N('A2'), N('A2'), N('G2'), N('G2'), N('F2'), N('F2'), N('E2'), N('E2')],
  },
  {
    id: 'feat_doom_boss',
    numLabel: 'F-08',
    title: 'DOOM Boss Riff (16-Bit Overdrive)',
    shortLabel: '🕹️ DOOM Boss',
    icon: '🕹️',
    genre: 'Boss Battle',
    bpm: 146,
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    drums: 'boss',
    palette: ['#ef4444', '#f97316', '#fbbf24'],
    featured: true,
    notes: [
      N('E3'), N('E3'), N('E4'), N('E3'), N('E3'), N('D4'),
      N('E3'), N('E3'), N('C4'), N('E3'), N('E3'), N('Bb3'),
      N('E3'), N('E3'), N('B3'), N('C4'), N('E3'), N('E3'),
      N('E4'), N('E3'), N('E3'), N('D4'), N('C4'), N('Bb3'),
    ],
    bass: [N('E2'), N('E2'), N('E2'), N('G2'), N('E2'), N('E2'), N('F2'), N('G2')],
  },
  {
    id: 'feat_teal_dreams',
    numLabel: 'F-09',
    title: 'Teal Desktop Dreams (Ambient Pad)',
    shortLabel: '🌙 Teal Dreams',
    icon: '🌙',
    genre: 'Chill / Lo-Fi',
    bpm: 96,
    leadWave: 'sine',
    bassWave: 'triangle',
    bellShimmer: true,
    drums: 'none',
    palette: ['#2dd4bf', '#38bdf8', '#818cf8'],
    featured: true,
    notes: [
      N('E4'), R, N('G4'), R, N('B4'), R, N('E5'), R,
      N('D5'), R, N('B4'), R, N('G4'), R, N('E4'), R,
    ],
    bass: [N('E3'), N('C3'), N('D3'), N('A2')],
  },
];

// ==================== 2. 5,000 UNIQUE PROCEDURAL RANDOM MUSIC SELECTIONS ====================
// Exact bijection: 25 adjectives x 20 subjects x 10 styles = 5,000 guaranteed unique song titles!
const ADJECTIVES_25 = [
  'Turbo', 'Midnight', 'Golden', 'Haunted', 'Hyper',
  'Neon', 'Pixel', 'Cosmic', 'Spooky', 'Atomic',
  'Enchanted', 'Shadow', 'Mega', 'Retro', 'Electric',
  'Crystal', 'Wild', 'Secret', 'Phantom', 'Blazing',
  'Glitchy', 'Royal', 'Frozen', 'Quantum', 'Sneaky',
];

const SUBJECTS_20 = [
  'Plumber', 'Dungeon', 'Neighbor', 'Wizard', 'Boss Arena',
  'Starship', 'Basement', 'Castle', 'Arcade', 'Volcano',
  'Floppy Disk', 'Goblin', 'Dragon', 'Laser Grid', 'Clocktower',
  'Jungle', 'Canyon', 'Broomstick', 'Cyber City', 'Big Jim',
];

const SUFFIXES_10: Array<{
  tag: string;
  genre: string;
  icon: string;
  scale: number[];
  wave: SynthWaveType;
  bassWave: SynthWaveType;
  drums: DrumPatternKind;
  bell?: boolean;
  bpmRange: [number, number];
  palette: [string, string, string];
}> = [
  {
    tag: 'Overworld Run',
    genre: '8-Bit Adventure',
    icon: '🍄',
    scale: [0, 2, 4, 5, 7, 9, 11, 12],
    wave: 'square',
    bassWave: 'triangle',
    drums: 'arcade',
    bpmRange: [132, 168],
    palette: ['#ef4444', '#facc15', '#22c55e'],
  },
  {
    tag: 'Quest Intro',
    genre: '8-Bit Adventure',
    icon: '⚔️',
    scale: [0, 2, 4, 7, 9, 11, 12, 14],
    wave: 'square',
    bassWave: 'triangle',
    drums: 'march',
    bpmRange: [122, 148],
    palette: ['#facc15', '#4ade80', '#38bdf8'],
  },
  {
    tag: 'Chase Panic',
    genre: 'Stealth Chase',
    icon: '🔦',
    scale: [0, 1, 3, 5, 6, 8, 10, 12],
    wave: 'sawtooth',
    bassWave: 'sawtooth',
    drums: 'chase',
    bpmRange: [152, 182],
    palette: ['#dc2626', '#f97316', '#fde047'],
  },
  {
    tag: 'Boss Showdown',
    genre: 'Boss Battle',
    icon: '💪',
    scale: [0, 2, 3, 5, 6, 7, 10, 12],
    wave: 'sawtooth',
    bassWave: 'sawtooth',
    drums: 'boss',
    bpmRange: [145, 176],
    palette: ['#ff0055', '#fb923c', '#facc15'],
  },
  {
    tag: 'Spell Waltz',
    genre: 'Wizard Magic',
    icon: '🪄',
    scale: [0, 2, 3, 6, 7, 8, 11, 12],
    wave: 'triangle',
    bassWave: 'sine',
    drums: 'waltz',
    bell: true,
    bpmRange: [104, 130],
    palette: ['#c084fc', '#38bdf8', '#fde047'],
  },
  {
    tag: 'Synthwave Drive',
    genre: 'Cyber Synth',
    icon: '🌆',
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    wave: 'square',
    bassWave: 'sawtooth',
    drums: 'arcade',
    bpmRange: [118, 142],
    palette: ['#f472b6', '#22d3ee', '#a855f7'],
  },
  {
    tag: 'Catacomb Echo',
    genre: 'Dungeon & Space',
    icon: '🏰',
    scale: [0, 1, 4, 5, 7, 8, 11, 12],
    wave: 'triangle',
    bassWave: 'triangle',
    drums: 'march',
    bpmRange: [110, 138],
    palette: ['#818cf8', '#34d399', '#fbbf24'],
  },
  {
    tag: 'Midnight Drift',
    genre: 'Chill / Lo-Fi',
    icon: '🌙',
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    wave: 'sine',
    bassWave: 'triangle',
    drums: 'light',
    bell: true,
    bpmRange: [86, 114],
    palette: ['#2dd4bf', '#60a5fa', '#c084fc'],
  },
  {
    tag: 'Turbo Remix',
    genre: 'Arcade Turbo',
    icon: '🕹️',
    scale: [0, 3, 5, 6, 7, 10, 12, 15],
    wave: 'square',
    bassWave: 'sawtooth',
    drums: 'arcade',
    bpmRange: [150, 180],
    palette: ['#00ff66', '#00ffff', '#ff00ff'],
  },
  {
    tag: 'Final Anthem',
    genre: 'Boss Battle',
    icon: '🔥',
    scale: [0, 2, 3, 5, 7, 8, 11, 12],
    wave: 'sawtooth',
    bassWave: 'triangle',
    drums: 'boss',
    bpmRange: [138, 168],
    palette: ['#f43f5e', '#f59e0b', '#38bdf8'],
  },
];

const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const RANDOM_MUSIC_GENRES = [
  'All 5,000',
  '8-Bit Adventure',
  'Stealth Chase',
  'Boss Battle',
  'Wizard Magic',
  'Cyber Synth',
  'Dungeon & Space',
  'Chill / Lo-Fi',
  'Arcade Turbo',
];

function seededRand(seed: number): () => number {
  let s = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedRandomMetas: RandomTrackMeta[] | null = null;

export function getAllRandomTrackMetas(): RandomTrackMeta[] {
  if (cachedRandomMetas) return cachedRandomMetas;
  const list: RandomTrackMeta[] = new Array(RANDOM_MUSIC_COUNT);
  for (let i = 0; i < RANDOM_MUSIC_COUNT; i++) {
    // Bijective permutation across 0..4999 (gcd(2971, 5000) = 1) -> guaranteed 5,000 unique names!
    const perm = (i * 2971 + 1013) % RANDOM_MUSIC_COUNT;
    const adjIdx = Math.floor(perm / 200); // 0..24
    const subIdx = Math.floor((perm % 200) / 10); // 0..19
    const sufIdx = perm % 10; // 0..9

    const suf = SUFFIXES_10[sufIdx];
    const rand = seededRand((i + 1) * 7919 + perm * 31);
    const bpm = Math.floor(suf.bpmRange[0] + rand() * (suf.bpmRange[1] - suf.bpmRange[0]));
    const keyIdx = Math.floor(rand() * 12);
    const index1 = i + 1;
    const numLabel = `#${String(index1).padStart(4, '0')}`;

    list[i] = {
      index: index1,
      id: `rand_${index1}`,
      numLabel,
      title: `${ADJECTIVES_25[adjIdx]} ${SUBJECTS_20[subIdx]} ${suf.tag}`,
      genre: suf.genre,
      icon: suf.icon,
      bpm,
      keyLabel: KEY_NAMES[keyIdx],
    };
  }
  cachedRandomMetas = list;
  return list;
}

export function buildRandomSynthTrack(index1Based: number): SynthTrack {
  const clamped = Math.max(1, Math.min(RANDOM_MUSIC_COUNT, Math.floor(index1Based)));
  const i = clamped - 1;
  const meta = getAllRandomTrackMetas()[i];
  const perm = (i * 2971 + 1013) % RANDOM_MUSIC_COUNT;
  const suf = SUFFIXES_10[perm % 10];
  const rand = seededRand(clamped * 7919 + perm * 31);

  // Advance first 2 draws to align deterministically with metadata
  rand();
  const keyOffset = Math.floor(rand() * 12);
  const rootLeadMidi = 60 + keyOffset; // C4..B4
  const rootBassMidi = 36 + keyOffset; // C2..B2

  // Compose a catchy 32-step structured A-A'-B-A'' motif with rests so it sounds musical!
  const scale = suf.scale;
  const motifA: number[] = [];
  let cursor = Math.floor(rand() * 4);
  for (let s = 0; s < 8; s++) {
    const restChance = s === 0 ? 0 : suf.drums === 'waltz' ? 0.32 : 0.22;
    if (rand() < restChance) {
      motifA.push(R);
    } else {
      const stepDelta = Math.floor(rand() * 5) - 2; // -2..+2 scale degrees
      cursor = Math.max(0, Math.min(scale.length - 1, cursor + stepDelta));
      motifA.push(midiToHz(rootLeadMidi + scale[cursor]));
    }
  }

  const motifB: number[] = [];
  let cursorB = Math.min(scale.length - 1, cursor + 2);
  for (let s = 0; s < 8; s++) {
    if (s > 0 && rand() < 0.24) {
      motifB.push(R);
    } else {
      const stepDelta = Math.floor(rand() * 5) - 2;
      cursorB = Math.max(0, Math.min(scale.length - 1, cursorB + stepDelta));
      const octLift = rand() < 0.2 ? 12 : 0;
      motifB.push(midiToHz(rootLeadMidi + scale[cursorB] + octLift));
    }
  }

  // Variation A' shifts last 2 notes for a classic video-game turnaround
  const motifA2 = [...motifA];
  motifA2[6] = midiToHz(rootLeadMidi + scale[Math.min(scale.length - 1, (cursor + 2) % scale.length)]);
  motifA2[7] = R;

  // Resolution A'' lands cleanly on root/fifth
  const motifEnd = [...motifA];
  motifEnd[6] = midiToHz(rootLeadMidi + scale[4 % scale.length]);
  motifEnd[7] = midiToHz(rootLeadMidi + scale[0]);

  const notes = [...motifA, ...motifA2, ...motifB, ...motifEnd];

  // 16-step chord progression bassline (I - VI - IV - V or I - bVII - bVI - V)
  const progDegrees = rand() > 0.5 ? [0, 5, 3, 4] : [0, 6, 5, 4];
  const bass: number[] = [];
  const harmony: number[] = [];
  for (let bar = 0; bar < 4; bar++) {
    const deg = progDegrees[bar] % scale.length;
    const bassMidi = rootBassMidi + scale[deg];
    const fifthMidi = rootBassMidi + scale[(deg + 4) % scale.length];
    const chordThirdMidi = rootLeadMidi - 12 + scale[(deg + 2) % scale.length];
    for (let step = 0; step < 8; step++) {
      if (step % 2 === 0) {
        bass.push(midiToHz(step === 4 ? fifthMidi : bassMidi));
      } else {
        bass.push(suf.drums === 'chase' || suf.drums === 'boss' ? midiToHz(bassMidi) : R);
      }
      harmony.push(step % 4 === 0 ? midiToHz(chordThirdMidi) : R);
    }
  }

  return {
    id: meta.id,
    numLabel: meta.numLabel,
    title: `${meta.numLabel}: ${meta.title} (${meta.genre} · ${meta.keyLabel})`,
    shortLabel: `${meta.icon} ${meta.title}`,
    icon: meta.icon,
    genre: meta.genre,
    bpm: meta.bpm,
    leadWave: suf.wave,
    bassWave: suf.bassWave,
    bellShimmer: suf.bell,
    drums: suf.drums,
    palette: suf.palette,
    notes,
    bass,
    harmony,
    featured: false,
  };
}

export function queryRandomTracks(
  search: string,
  genre: string,
  page: number,
  pageSize = 50,
): { items: RandomTrackMeta[]; total: number; totalPages: number; page: number } {
  const all = getAllRandomTrackMetas();
  const q = search.trim().toLowerCase();
  const filterGenre = genre && genre !== 'All 5,000';

  const matched =
    !q && !filterGenre
      ? all
      : all.filter((item) => {
          if (filterGenre && item.genre !== genre) return false;
          if (!q) return true;
          return (
            item.title.toLowerCase().includes(q) ||
            item.numLabel.includes(q) ||
            String(item.index) === q ||
            item.genre.toLowerCase().includes(q) ||
            item.keyLabel.toLowerCase() === q
          );
        });

  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const start = (safePage - 1) * pageSize;
  return {
    items: matched.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}

export function pickRandomTrackFrom5000(): SynthTrack {
  const idx = 1 + Math.floor(Math.random() * RANDOM_MUSIC_COUNT);
  return buildRandomSynthTrack(idx);
}

// Fun "Random Surprise Mix" that randomly drops into Hello Neighbor Chase or Big Boy Jim Boss ~25% of the time,
// and otherwise pulls any of the 5,000 random tracks or featured classics!
export function pickSurpriseTrackWithRandomChase(): { track: SynthTrack; isAmbush: boolean } {
  const roll = Math.random();
  if (roll < 0.15) {
    return { track: FEATURED_SYNTH_TRACKS[2], isAmbush: true }; // Hello Neighbor Chase Music!
  }
  if (roll < 0.25) {
    return { track: FEATURED_SYNTH_TRACKS[3], isAmbush: true }; // Big Boy Jim Boss Battle!
  }
  if (roll < 0.34) {
    const picks = [FEATURED_SYNTH_TRACKS[0], FEATURED_SYNTH_TRACKS[1], FEATURED_SYNTH_TRACKS[4]];
    return { track: picks[Math.floor(Math.random() * picks.length)], isAmbush: false };
  }
  return { track: pickRandomTrackFrom5000(), isAmbush: false };
}
