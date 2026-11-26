// ==================== HOCKEY CARDS 95 — MCGEE & OBLITERATE EDITION (osHockeyCards.ts) ====================
// Retro 1995 collectible hockey card pack ripper, binder, and card obliterator featuring
// Thomas Mamas McGee, Thomas, Thomas Robins, infinite random McGee & Obliterate characters,
// and deliberately non-realistic, non-4K goofy procedural hockey player portraits!

export interface HockeyCardsBridge {
  addVfsFile: (
    name: string,
    type: 'folder' | 'text' | 'image' | 'app' | 'installer_exe',
    parent: string,
    content?: string,
  ) => void;
  refreshExplorerIfOpen: () => void;
  unlockAchievement: (id: string) => void;
  pushToast: (title: string, msg: string, icon?: string) => void;
  sfx: {
    playClick: () => void;
    playChordError: () => void;
    playStartupChime: () => void;
    playAimReceive: () => void;
  };
}

export type HockeyRarity = 'COMMON' | 'FOIL' | 'MCGEE SPECIAL' | 'OBLITERATE ULTRA' | 'MYTHIC THOMAS';

export interface HockeyCard {
  id: string;
  seed: number;
  name: string;
  nickname: string;
  team: string;
  position: string;
  jerseyNum: string;
  rarity: HockeyRarity;
  category: 'featured' | 'mcgee' | 'obliterate' | 'random';
  slapshot: number;
  missingTeeth: number;
  obliteration: number;
  mcgeeEnergy: number;
  realism4k: number; // Always 0% — proudly non-realistic!
  scoutingNote: string;
  obliterated: boolean;
}

const HOCKEY_STORAGE_KEY = '__angelos_hockey_cards_v1';

let hockeyBridge: HockeyCardsBridge | null = null;

export function registerHockeyCardsBridge(bridge: HockeyCardsBridge): void {
  hockeyBridge = bridge;
}

// Seeded PRNG (Mulberry32)
function makeRng(seed: number): () => number {
  let a = (seed ^ 0x6d2b79f5) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ==================== CHARACTER & NAME POOLS ====================
const FEATURED_ROSTER: Array<{
  name: string;
  nickname: string;
  team: string;
  position: string;
  jerseyNum: string;
  rarity: HockeyRarity;
  category: HockeyCard['category'];
  seed: number;
  slapshot: number;
  missingTeeth: number;
  obliteration: number;
  mcgeeEnergy: number;
  scoutingNote: string;
}> = [
  {
    name: 'Thomas Mamas McGee',
    nickname: '"The Rink Legend"',
    team: 'McGee Ice Marauders',
    position: 'C · CAPTAIN',
    jerseyNum: '99',
    rarity: 'MYTHIC THOMAS',
    category: 'featured',
    seed: 199501,
    slapshot: 99,
    missingTeeth: 7,
    obliteration: 98,
    mcgeeEnergy: 100,
    scoutingNote: 'Skates backwards faster than the Zamboni. Once slapped a puck so hard the scoreboard switched to 1995.',
  },
  {
    name: 'Thomas',
    nickname: '"Just Thomas"',
    team: 'Mystery Rink 95',
    position: 'LW · ENIGMA',
    jerseyNum: '01',
    rarity: 'MYTHIC THOMAS',
    category: 'featured',
    seed: 199502,
    slapshot: 94,
    missingTeeth: 4,
    obliteration: 91,
    mcgeeEnergy: 88,
    scoutingNote: 'No last name needed. Shows up with a cardboard helmet, scores 6 goals, refuses to elaborate.',
  },
  {
    name: 'Thomas Robins',
    nickname: '"Top-Shelf Sniper"',
    team: 'Redmond Robins',
    position: 'RW · SNIPER',
    jerseyNum: '77',
    rarity: 'MYTHIC THOMAS',
    category: 'featured',
    seed: 199503,
    slapshot: 97,
    missingTeeth: 5,
    obliteration: 93,
    mcgeeEnergy: 86,
    scoutingNote: 'Has never seen a 4K pixel in his life. Curves slapshots around three defenders and a hotdog vendor.',
  },
  {
    name: 'Obliterate McGee',
    nickname: '"The Rink Demolisher"',
    team: 'Obliterate Crushers',
    position: 'D · ENFORCER',
    jerseyNum: '404',
    rarity: 'OBLITERATE ULTRA',
    category: 'obliterate',
    seed: 199504,
    slapshot: 100,
    missingTeeth: 11,
    obliteration: 100,
    mcgeeEnergy: 97,
    scoutingNote: 'Banned from 14 arenas for vaporizing the plexiglass, the goalposts, and the penalty box simultaneously.',
  },
  {
    name: 'Mamas McGee Jr.',
    nickname: '"Soup-Pot Goalie"',
    team: 'McGee Ice Marauders',
    position: 'G · WALL',
    jerseyNum: '00',
    rarity: 'MCGEE SPECIAL',
    category: 'mcgee',
    seed: 199505,
    slapshot: 82,
    missingTeeth: 6,
    obliteration: 89,
    mcgeeEnergy: 99,
    scoutingNote: 'Blocks every puck using an oversized frying pan and two completely mismatched googly eyes.',
  },
];

const MCGEE_FIRST_NAMES = [
  'Thomas', 'Mamas', 'Turbo', 'Big-Tooth', 'Slapshot', 'Zamboni', 'Cheddar', 'Wobbly',
  'Noodle-Arm', 'Biscuit', 'Moose', 'Mega-Mullet', 'Squeaky', 'Puck-Chomp', 'Sir Thomas',
  'Gummy', 'Crooked-Nose', 'Floppy', 'Rink-Rat', 'Potato-Face', 'Grandpa', 'Laser-Beard',
  'Buck-Tooth', 'Captain', 'Bouncy', 'Spaghetti', 'Thunder', 'Chunky',
];

const MCGEE_MIDDLE_WORDS = [
  'Mamas', 'Robins', 'Obliterate', 'Slap', 'Puck', 'Ice', 'Goon', 'Zamboni', 'Chomp', 'Wobble', '', '', '',
];

const OBLITERATE_PREFIXES = [
  'Obliterate', 'Mega Obliterate', 'Thomas Obliterate', 'Captain Obliterate', 'Dr. Obliterate',
  'Baron Von Obliterate', 'Turbo Obliterate', 'Pixel Obliterate', 'Sir Obliterate', 'Ultra Obliterate',
];

const OBLITERATE_SUFFIXES = [
  'McGee', 'Robins', 'Jones', '95', 'Jr.', 'The Third', 'McSmash', 'Puck-Eater', 'Von Rink', 'Supreme',
];

const RANDOM_FIRSTS = [
  'Thomas', 'Robins', 'Billy', 'Gordie', 'Wayne-ish', 'Barnaby', 'Chuckles', 'Sven',
  'Blorp', 'Rocco', 'Biff', 'Gumbo', 'Tater', 'Nugget', 'Zeke', 'Mervin',
];

const RANDOM_LASTS = [
  'McGee', 'Robins', 'McRobins', 'Obliterate', 'Mamas-McGee', 'Slapstick', 'Puckface',
  'Toothless', 'Zamboni', 'Rinkstein', 'McObliterate', 'Biscuit',
];

const TEAMS = [
  'McGee Ice Marauders',
  'Obliterate Crushers',
  'Redmond Robins',
  '144p Slapshot Kings',
  'Potato-Face Bruins',
  'Zamboni Bandits',
  'No-Teeth Titans',
  'Retro CRT Blizzards',
  'Thomas All-Stars',
  'VHS Glitched Leafs',
];

const POSITIONS = ['C · CENTER', 'LW · LEFT WING', 'RW · RIGHT WING', 'D · ENFORCER', 'G · GOALIE', 'BENCH · CHAOS'];

const NICKNAMES = [
  '"Zero 4K Pixels"',
  '"144p Menace"',
  '"Tooth Fairy VIP"',
  '"Puck Vaporizer"',
  '"Crooked Visor"',
  '"Broom-Mustache"',
  '"The Wobbler"',
  '"Rink Obliterator"',
  '"McGee Dynasty"',
  '"Wonky Face MVP"',
  '"Potato Helmet"',
  '"Certified Goofball"',
];

const SCOUTING_NOTES = [
  'Facial features rendered in certified 1995 potato-vision. Goalies laugh so hard they drop their sticks.',
  'Forgot skates twice this season and still led the league in total rink obliterations.',
  'Refuses to upgrade to 4K graphics; insists crooked polygons improve aerodynamics on breakaways.',
  'Once checked a referee into a vending machine and apologized by handing him a lukewarm puck.',
  'Has 2.5 remaining teeth and 100% pure McGee family hockey energy.',
  'Shoots slapshots shaped like trapezoids. Scouts describe his face as "impressively non-realistic."',
  'Wears mismatched shoulder pads made from 1995 CRT monitors. Completely unstoppable in overtime.',
  'Can obliterate a wooden hockey stick simply by glaring at it with one giant googly eye.',
];

function createRandomHockeyCard(mode: 'any' | 'featured' | 'mcgee' | 'obliterate' = 'any', explicitSeed?: number): HockeyCard {
  const seed = explicitSeed ?? Math.floor(100000 + Math.random() * 8999999);
  const rng = makeRng(seed);

  if (mode === 'featured' || (mode === 'any' && rng() < 0.24)) {
    const f = pick(rng, FEATURED_ROSTER);
    return {
      id: `card_${seed}_${Math.floor(rng() * 9999)}`,
      seed: f.seed + Math.floor(rng() * 5) * 1000, // slight goofy variation per pull!
      name: f.name,
      nickname: f.nickname,
      team: f.team,
      position: f.position,
      jerseyNum: f.jerseyNum,
      rarity: f.rarity,
      category: f.category,
      slapshot: f.slapshot,
      missingTeeth: f.missingTeeth,
      obliteration: f.obliteration,
      mcgeeEnergy: f.mcgeeEnergy,
      realism4k: 0,
      scoutingNote: f.scoutingNote,
      obliterated: false,
    };
  }

  let name = '';
  let category: HockeyCard['category'] = 'random';
  let rarity: HockeyRarity = 'COMMON';

  const branch = mode === 'mcgee' ? 0.1 : mode === 'obliterate' ? 0.65 : rng();
  if (branch < 0.5) {
    // McGee Clan name!
    const first = pick(rng, MCGEE_FIRST_NAMES);
    const mid = pick(rng, MCGEE_MIDDLE_WORDS);
    name = mid ? `${first} ${mid} McGee` : `${first} McGee`;
    category = 'mcgee';
    rarity = rng() < 0.35 ? 'MCGEE SPECIAL' : rng() < 0.65 ? 'FOIL' : 'COMMON';
  } else if (branch < 0.8) {
    // Obliterate Squad!
    name = `${pick(rng, OBLITERATE_PREFIXES)} ${pick(rng, OBLITERATE_SUFFIXES)}`;
    category = 'obliterate';
    rarity = rng() < 0.55 ? 'OBLITERATE ULTRA' : 'FOIL';
  } else {
    // Wild random Thomas / Robins / McGee mashup
    name = `${pick(rng, RANDOM_FIRSTS)} ${pick(rng, RANDOM_LASTS)}`;
    category = name.includes('McGee') ? 'mcgee' : name.includes('Obliterate') ? 'obliterate' : 'random';
    rarity = rng() < 0.2 ? 'MYTHIC THOMAS' : rng() < 0.55 ? 'FOIL' : 'COMMON';
  }

  const jerseyChoices = ['00', '01', '07', '13', '24', '42', '66', '77', '88', '95', '99', '404', '999'];
  return {
    id: `card_${seed}_${Math.floor(rng() * 9999)}`,
    seed,
    name,
    nickname: pick(rng, NICKNAMES),
    team: pick(rng, TEAMS),
    position: pick(rng, POSITIONS),
    jerseyNum: pick(rng, jerseyChoices),
    rarity,
    category,
    slapshot: Math.floor(55 + rng() * 45),
    missingTeeth: Math.floor(2 + rng() * 14),
    obliteration: category === 'obliterate' ? Math.floor(88 + rng() * 13) : Math.floor(45 + rng() * 55),
    mcgeeEnergy: name.includes('McGee') ? Math.floor(85 + rng() * 16) : Math.floor(30 + rng() * 65),
    realism4k: 0,
    scoutingNote: pick(rng, SCOUTING_NOTES),
    obliterated: false,
  };
}

// ==================== DELIBERATELY NON-4K, GOOFY PROCEDURAL HOCKEY PORTRAIT RENDERER ====================
// Renders a full collectible hockey trading card onto a canvas with absurd, cartoon/low-res/wonky
// asymmetrical facial features (0% realistic 4K!).
export function renderGoofyHockeyCardCanvas(
  canvas: HTMLCanvasElement,
  card: HockeyCard,
  shatterAmount = 0, // 0..1 explosion animation progress
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const rng = makeRng(card.seed);

  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Rarity color themes
  const rarityBorder: Record<HockeyRarity, [string, string, string]> = {
    COMMON: ['#cbd5e1', '#64748b', '#0f172a'],
    FOIL: ['#38bdf8', '#a855f7', '#ec4899'],
    'MCGEE SPECIAL': ['#facc15', '#f97316', '#b91c1c'],
    'OBLITERATE ULTRA': ['#ef4444', '#facc15', '#111827'],
    'MYTHIC THOMAS': ['#fde047', '#22d3ee', '#9333ea'],
  };
  const [b0, b1, b2] = rarityBorder[card.rarity];

  // Outer Trading Card Foil Frame
  const frameGrad = ctx.createLinearGradient(0, 0, W, H);
  frameGrad.addColorStop(0, b0);
  frameGrad.addColorStop(0.5, b1);
  frameGrad.addColorStop(1, b2);
  ctx.fillStyle = frameGrad;
  ctx.fillRect(0, 0, W, H);

  // Inner dark retro border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, W - 6, H - 6);

  // Portrait Viewport Box
  const px = 14;
  const py = 34;
  const pw = W - 28;
  const ph = Math.floor(H * 0.56);

  // Goofy retro arena backdrop (pixelated icy stripes + sunburst)
  const bgPalettes: Array<[string, string, string]> = [
    ['#0ea5e9', '#1e3a8a', '#bae6fd'],
    ['#f97316', '#7c2d12', '#fef08a'],
    ['#10b981', '#064e3b', '#bbf7d0'],
    ['#a855f7', '#3b0764', '#f5d0fe'],
    ['#ef4444', '#450a0a', '#fecaca'],
    ['#0284c7', '#0f172a', '#67e8f9'],
  ];
  const [bgA, bgB, bgC] = pick(rng, bgPalettes);
  const skyGrad = ctx.createLinearGradient(px, py, px, py + ph);
  skyGrad.addColorStop(0, bgB);
  skyGrad.addColorStop(0.62, bgA);
  skyGrad.addColorStop(0.63, '#e0f2fe'); // bright hockey ice
  skyGrad.addColorStop(1, '#bae6fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(px, py, pw, ph);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();

  // Retro comic starburst rays behind player
  ctx.save();
  ctx.translate(px + pw / 2, py + ph * 0.45);
  for (let r = 0; r < 12; r++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(250,204,21,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, -pw);
    ctx.lineTo(16, -pw);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Red & blue rink lines on the ice
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(px, py + Math.floor(ph * 0.72), pw, 5);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(px, py + Math.floor(ph * 0.85), pw, 4);

  // Jersey & Huge Boxy 1995 Shoulder Pads
  const jerseyColors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#eab308', '#db2777', '#0d9488'];
  const jerseyMain = pick(rng, jerseyColors);
  const jerseyTrim = pick(rng, ['#ffffff', '#facc15', '#000000', '#38bdf8']);
  const cx = px + pw / 2;
  const shoulderY = py + ph * 0.67;

  // Hockey stick angled awkwardly behind/beside player
  ctx.save();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 8;
  ctx.beginPath();
  const stickFlip = rng() > 0.5 ? 1 : -1;
  ctx.moveTo(cx + stickFlip * 90, py + 24);
  ctx.lineTo(cx - stickFlip * 65, py + ph + 10);
  ctx.stroke();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Tape on stick blade
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx + stickFlip * 78, py + 16, 26, 11);
  ctx.strokeRect(cx + stickFlip * 78, py + 16, 26, 11);
  ctx.restore();

  // Giant trapezoidal non-realistic shoulders
  ctx.fillStyle = jerseyMain;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - 102, py + ph + 12);
  ctx.lineTo(cx - 86, shoulderY);
  ctx.lineTo(cx - 28, shoulderY - 14);
  ctx.lineTo(cx + 28, shoulderY - 14);
  ctx.lineTo(cx + 88, shoulderY + 4);
  ctx.lineTo(cx + 106, py + ph + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jersey horizontal racing stripe + crooked number
  ctx.fillStyle = jerseyTrim;
  ctx.fillRect(cx - 90, shoulderY + 28, 180, 14);
  ctx.strokeRect(cx - 90, shoulderY + 28, 180, 14);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 26px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.strokeText(`#${card.jerseyNum}`, cx, shoulderY + 54);
  ctx.fillText(`#${card.jerseyNum}`, cx, shoulderY + 54);

  // Scrawny or chunky wonky neck
  const skinTones = ['#fed7aa', '#fca5a5', '#fdba74', '#d97706', '#fde68a', '#c084fc', '#86efac', '#fbcfe8'];
  const skin = pick(rng, skinTones);
  const neckW = 24 + Math.floor(rng() * 24);
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.fillRect(cx - neckW / 2, shoulderY - 34, neckW, 28);
  ctx.strokeRect(cx - neckW / 2, shoulderY - 34, neckW, 28);

  // GLORIOUS 1995 FLOWING MULLET HAIR BEHIND HEAD
  const hairColors = ['#78350f', '#facc15', '#dc2626', '#1e293b', '#f97316', '#ec4899', '#22d3ee', '#a3e635'];
  const hairCol = pick(rng, hairColors);
  const hasMullet = rng() > 0.15;
  if (hasMullet) {
    ctx.fillStyle = hairCol;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cx - 58, py + 72);
    ctx.lineTo(cx - 72, shoulderY + 4);
    ctx.lineTo(cx - 46, shoulderY - 4);
    ctx.lineTo(cx - 32, shoulderY + 8);
    ctx.lineTo(cx + 34, shoulderY + 6);
    ctx.lineTo(cx + 52, shoulderY - 6);
    ctx.lineTo(cx + 74, shoulderY + 5);
    ctx.lineTo(cx + 56, py + 72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ==================== ABSURD NON-4K HEAD SHAPE ====================
  const headY = py + ph * 0.41;
  const headKind = Math.floor(rng() * 5); // 0=Lumpy Potato, 1=Blocky TV Cube, 2=Giant Peanut, 3=Upside-Down Pear, 4=Crooked Diamond
  const headTilt = (rng() - 0.5) * 0.24;

  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTilt);

  // Oversized goofy ears (mismatched sizes!)
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3.5;
  const leftEarR = 11 + rng() * 9;
  const rightEarR = 11 + rng() * 9;
  ctx.beginPath();
  ctx.arc(-50, (rng() - 0.5) * 14, leftEarR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(50, (rng() - 0.5) * 14, rightEarR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw chosen absurd head silhouette
  ctx.fillStyle = skin;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (headKind === 0) {
    // Lumpy Potato Head
    ctx.moveTo(-46, -42);
    ctx.bezierCurveTo(-56, -12, -58, 35, -30, 52);
    ctx.bezierCurveTo(-4, 62, 34, 56, 48, 36);
    ctx.bezierCurveTo(60, 8, 52, -38, 34, -48);
    ctx.bezierCurveTo(10, -58, -26, -54, -46, -42);
  } else if (headKind === 1) {
    // Chunky Pixel-Cube Monitor Head
    ctx.rect(-48, -50, 96, 102);
  } else if (headKind === 2) {
    // Giant Wobbly Peanut Head
    ctx.moveTo(-38, -52);
    ctx.bezierCurveTo(-52, -26, -34, -6, -48, 18);
    ctx.bezierCurveTo(-56, 48, -22, 56, 0, 54);
    ctx.bezierCurveTo(28, 56, 56, 46, 48, 16);
    ctx.bezierCurveTo(34, -6, 54, -26, 38, -52);
    ctx.closePath();
  } else if (headKind === 3) {
    // Giant Chin Trapezoid
    ctx.moveTo(-36, -50);
    ctx.lineTo(38, -48);
    ctx.lineTo(54, 42);
    ctx.lineTo(14, 56);
    ctx.lineTo(-18, 54);
    ctx.lineTo(-54, 38);
    ctx.closePath();
  } else {
    // Crooked Wide-Cheek Cartoon Head
    ctx.ellipse(0, 2, 54, 48, (rng() - 0.5) * 0.25, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Comic rosy blotches / cheek scar / band-aid
  if (rng() > 0.35) {
    ctx.fillStyle = '#f87171';
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(-30, 12, 10, 0, Math.PI * 2);
    ctx.arc(32, 14, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (rng() > 0.4) {
    // Giant goofy X Band-Aid on cheek
    ctx.save();
    ctx.translate(24, 14);
    ctx.rotate(0.4);
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.fillRect(-14, -5, 28, 10);
    ctx.strokeRect(-14, -5, 28, 10);
    ctx.restore();
  }

  // ==================== GOOFY NON-4K EYES (ASYMMETRICAL!) ====================
  const eyeStyle = Math.floor(rng() * 5);
  const leftEyeR = 12 + rng() * 8;
  const rightEyeR = 7 + rng() * 12; // Deliberately mismatched!
  const leftEyeY = -12 + (rng() - 0.5) * 10;
  const rightEyeY = -12 + (rng() - 0.5) * 14;

  const drawGooglyEye = (ex: number, ey: number, er: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (eyeStyle === 1) {
      // Dizzy spiral eye!
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < 14; a++) {
        const rad = (a / 14) * (er - 2);
        const sx = ex + Math.cos(a * 0.9) * rad;
        const sy = ey + Math.sin(a * 0.9) * rad;
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else if (eyeStyle === 2) {
      // Star / Laser pupil
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex + (rng() - 0.5) * er * 0.5, ey + (rng() - 0.5) * er * 0.5, Math.max(3, er * 0.42), 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Crossed / derpy floating pupil
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex + (rng() - 0.5) * er * 0.7, ey + (rng() - 0.5) * er * 0.7, Math.max(3, er * 0.36), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  drawGooglyEye(-21, leftEyeY, leftEyeR);
  drawGooglyEye(21, rightEyeY, rightEyeR);

  // Bonus 3rd forehead eye on ultra chaotic pulls!
  if (eyeStyle === 4 || card.rarity === 'OBLITERATE ULTRA') {
    drawGooglyEye(0, -28, 7.5);
  }

  // Thick crooked unibrow or floating zigzag eyebrows
  ctx.strokeStyle = hairCol === '#facc15' ? '#78350f' : hairCol;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (rng() > 0.5) {
    // Angry V-unibrow!
    ctx.moveTo(-36, leftEyeY - leftEyeR - 5);
    ctx.lineTo(0, Math.min(leftEyeY, rightEyeY) - 6);
    ctx.lineTo(36, rightEyeY - rightEyeR - 8);
  } else {
    // One super high, one super low!
    ctx.moveTo(-36, leftEyeY - leftEyeR - 10);
    ctx.lineTo(-8, leftEyeY - leftEyeR - 2);
    ctx.moveTo(8, rightEyeY - rightEyeR - 12);
    ctx.lineTo(38, rightEyeY - rightEyeR - 15);
  }
  ctx.stroke();

  // ==================== ABSURD NON-REALISTIC NOSE ====================
  const noseKind = Math.floor(rng() * 4);
  ctx.fillStyle = noseKind === 2 ? '#ef4444' : '#f59e0b';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (noseKind === 0) {
    // Giant crooked triangle/hockey-stick nose
    ctx.moveTo(-2, -6);
    ctx.lineTo(22, 12);
    ctx.lineTo(-8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (noseKind === 1) {
    // Huge lumpy potato snout
    ctx.ellipse(2, 6, 15, 10, (rng() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (noseKind === 2) {
    // Giant bright red clown-puck nose!
    ctx.arc(0, 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Long L-shaped blocky nose
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.lineTo(14, 16);
    ctx.lineTo(-10, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ==================== CLASSIC GAP-TOOTH HOCKEY MOUTH & MUSTACHE ====================
  const mouthY = 30;
  ctx.fillStyle = '#450a0a';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, mouthY, 27 + rng() * 8, 13 + rng() * 6, (rng() - 0.5) * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw goofy missing hockey teeth (black gaps + 1 giant gold tooth!)
  const toothCount = 7;
  for (let t = 0; t < toothCount; t++) {
    if (rng() < 0.45) continue; // Missing hockey tooth!
    const tx = -22 + t * 7;
    const isGold = t === 3 && rng() > 0.35;
    ctx.fillStyle = isGold ? '#facc15' : '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.fillRect(tx, mouthY - 10, 6, 8 + (t % 2) * 3);
    ctx.strokeRect(tx, mouthY - 10, 6, 8 + (t % 2) * 3);
  }

  // Goofy pink tongue sticking out sideways
  if (rng() > 0.45) {
    ctx.fillStyle = '#fb7185';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(14, mouthY + 11, 10, 7, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Giant Broom-Bristle 90s Hockey Mustache
  if (rng() > 0.3) {
    ctx.fillStyle = hairCol;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-34, mouthY - 6);
    ctx.quadraticCurveTo(0, mouthY - 18, 34, mouthY - 5);
    ctx.lineTo(28, mouthY + 2);
    ctx.lineTo(0, mouthY - 6);
    ctx.lineTo(-28, mouthY + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ==================== LOPSIDED RETRO HOCKEY HELMET ====================
  const helmCol = pick(rng, [jerseyMain, '#0f172a', '#ffffff', '#eab308', '#dc2626', '#2563eb']);
  ctx.save();
  ctx.rotate((rng() - 0.5) * 0.25);
  ctx.fillStyle = helmCol;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -34, 52, Math.PI * 1.05, Math.PI * 1.95);
  ctx.lineTo(54, -26);
  ctx.lineTo(-54, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Helmet racing stripe & goofy tilted visor or metal cage bars
  ctx.fillStyle = jerseyTrim;
  ctx.fillRect(-10, -84, 20, 56);
  ctx.strokeRect(-10, -84, 20, 56);

  if (rng() > 0.55) {
    // Transparent crooked green/cyan plastic visor
    ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.fillRect(-46, -26, 92, 20);
    ctx.strokeRect(-46, -26, 92, 20);
  }
  ctx.restore();

  ctx.restore(); // End head transform

  // Flying hockey puck in foreground!
  ctx.save();
  const puckX = px + pw - 36;
  const puckY = py + ph - 26;
  ctx.fillStyle = '#09090b';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(puckX, puckY, 18, 10, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(puckX - 24, puckY - 4);
  ctx.lineTo(puckX - 44, puckY - 12);
  ctx.moveTo(puckX - 22, puckY + 4);
  ctx.lineTo(puckX - 40, puckY + 2);
  ctx.stroke();
  ctx.restore();

  // Intentional chunky low-res CRT scanline overlay (anti-4K authentic 1995 card look!)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let sy = py; sy < py + ph; sy += 4) {
    ctx.fillRect(px, sy, pw, 1.5);
  }

  // Foil sparkle stars on rare cards
  if (card.rarity !== 'COMMON') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    for (let s = 0; s < 14; s++) {
      const sx = px + 10 + rng() * (pw - 20);
      const sy = py + 10 + rng() * (ph - 20);
      ctx.fillRect(sx - 4, sy - 1, 8, 2);
      ctx.fillRect(sx - 1, sy - 4, 2, 8);
    }
  }

  // "NOT 4K · 144p" anti-realism badge stamp inside portrait corner
  ctx.fillStyle = '#000000';
  ctx.fillRect(px + 6, py + 6, 98, 18);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 6, py + 6, 98, 18);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 10px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('🚫 NOT 4K · 144p', px + 11, py + 18);

  // If obliterated, draw dramatic comic shatter cracks + OBLITERATED stamp!
  if (card.obliterated || shatterAmount > 0) {
    ctx.fillStyle = `rgba(185, 28, 28, ${card.obliterated ? 0.36 : 0.45 * shatterAmount})`;
    ctx.fillRect(px, py, pw, ph);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    for (let c = 0; c < 10; c++) {
      const ang = (c / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, py + ph / 2);
      ctx.lineTo(cx + Math.cos(ang) * 70, py + ph / 2 + Math.sin(ang) * 55);
      ctx.lineTo(cx + Math.cos(ang + 0.25) * 145, py + ph / 2 + Math.sin(ang + 0.25) * 120);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, py + ph / 2);
    ctx.rotate(-0.22);
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.fillRect(-108, -24, 216, 48);
    ctx.strokeRect(-108, -24, 216, 48);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('💥 OBLITERATED!', 0, 8);
    ctx.restore();
  }

  ctx.restore(); // End portrait clip

  // Portrait inner border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);

  // Top Header Strip (Series + Rarity)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(14, 10, W - 28, 20);
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 11px "IBM Plex Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('🏒 MCGEE HOCKEY \'95', 20, 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = card.rarity === 'COMMON' ? '#cbd5e1' : '#38bdf8';
  ctx.fillText(card.rarity, W - 20, 24);

  // Bottom Nameplate & Stats Box
  const boxY = py + ph + 8;
  const boxH = H - boxY - 12;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(14, boxY, W - 28, boxH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, boxY, W - 28, boxH);

  // Player Name + Nickname
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 16px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  const displayName = card.name.length > 24 ? `${card.name.slice(0, 23)}…` : card.name;
  ctx.fillText(displayName, W / 2, boxY + 22);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px "IBM Plex Mono", monospace';
  ctx.fillText(`${card.nickname} · ${card.position}`, W / 2, boxY + 38);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '10px "IBM Plex Mono", monospace';
  ctx.fillText(card.team, W / 2, boxY + 53);

  // 4-Stat Retro Box Strip
  const stats = [
    ['SLAP', String(card.slapshot)],
    ['TEETH-', String(card.missingTeeth)],
    ['OBLIT', String(card.obliteration)],
    ['4K REAL', '0%'],
  ];
  const statW = (W - 44) / 4;
  stats.forEach(([lbl, val], idx) => {
    const sx = 22 + idx * statW;
    const sy = boxY + 62;
    ctx.fillStyle = idx === 2 ? '#7f1d1d' : '#1e293b';
    ctx.fillRect(sx + 2, sy, statW - 4, 34);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 2, sy, statW - 4, 34);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px "IBM Plex Mono", monospace';
    ctx.fillText(lbl, sx + statW / 2, sy + 12);
    ctx.fillStyle = idx === 3 ? '#f87171' : '#fef08a';
    ctx.font = 'bold 13px "IBM Plex Mono", monospace';
    ctx.fillText(val, sx + statW / 2, sy + 28);
  });

  ctx.restore();
}

// ==================== PERSISTENT COLLECTION STATE ====================
interface HockeyCollectionState {
  cards: HockeyCard[];
  packsRipped: number;
  obliteratedCount: number;
}

function loadInitialCollection(): HockeyCollectionState {
  try {
    const raw = window.localStorage.getItem(HOCKEY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
        return {
          cards: parsed.cards,
          packsRipped: Number(parsed.packsRipped) || 1,
          obliteratedCount: Number(parsed.obliteratedCount) || 0,
        };
      }
    }
  } catch {
    // ignore storage fallback
  }
  // Starter pack includes the iconic Thomas Mamas McGee, Thomas, Thomas Robins, Obliterate McGee + 2 random McGees!
  const starters: HockeyCard[] = [
    ...FEATURED_ROSTER.map((f) => ({
      id: `starter_${f.seed}`,
      seed: f.seed,
      name: f.name,
      nickname: f.nickname,
      team: f.team,
      position: f.position,
      jerseyNum: f.jerseyNum,
      rarity: f.rarity,
      category: f.category,
      slapshot: f.slapshot,
      missingTeeth: f.missingTeeth,
      obliteration: f.obliteration,
      mcgeeEnergy: f.mcgeeEnergy,
      realism4k: 0,
      scoutingNote: f.scoutingNote,
      obliterated: false,
    })),
    createRandomHockeyCard('mcgee', 770195),
    createRandomHockeyCard('obliterate', 880195),
  ];
  return {
    cards: starters,
    packsRipped: 1,
    obliteratedCount: 0,
  };
}

let collectionState: HockeyCollectionState = loadInitialCollection();

function saveCollectionState(): void {
  try {
    window.localStorage.setItem(HOCKEY_STORAGE_KEY, JSON.stringify(collectionState));
  } catch {
    // ignore
  }
}

// ==================== WINDOW CONTROLLER ====================
export function initHockeyCardsApp(windowElement: HTMLDivElement): void {
  const mainCanvas = windowElement.querySelector('#hockey-card-canvas') as HTMLCanvasElement | null;
  const binderGrid = windowElement.querySelector('#hockey-binder-grid') as HTMLDivElement | null;
  const filterSelect = windowElement.querySelector('#hockey-filter-select') as HTMLSelectElement | null;
  const searchInput = windowElement.querySelector('#hockey-search-input') as HTMLInputElement | null;
  const statsSummary = windowElement.querySelector('#hockey-stats-summary');
  const scoutingBox = windowElement.querySelector('#hockey-scouting-box');
  const statusEl = windowElement.querySelector('#hockey-status-text');
  const stageWrap = windowElement.querySelector('#hockey-card-stage') as HTMLDivElement | null;

  if (!mainCanvas || !binderGrid) return;

  let activeCard: HockeyCard = collectionState.cards[0];

  const renderActiveCard = (shatter = 0) => {
    renderGoofyHockeyCardCanvas(mainCanvas, activeCard, shatter);
    if (scoutingBox) {
      scoutingBox.innerHTML = `
        <div class="hockey-scout-title">${activeCard.obliterated ? '💥 [OBLITERATED] ' : '🏒 '}${activeCard.name} <span class="hockey-rarity-pill">${activeCard.rarity}</span></div>
        <div class="hockey-scout-meta">${activeCard.team} · #${activeCard.jerseyNum} · ${activeCard.position} · <b>4K Realism: 0%</b></div>
        <div class="hockey-scout-note">"${activeCard.scoutingNote}"</div>
      `;
    }
  };

  const renderBinder = () => {
    if (statsSummary) {
      statsSummary.textContent = `Cards: ${collectionState.cards.length} · Packs Ripped: ${collectionState.packsRipped} · 💥 Obliterated: ${collectionState.obliteratedCount}`;
    }

    const filter = filterSelect?.value || 'all';
    const q = (searchInput?.value || '').trim().toLowerCase();

    const filtered = collectionState.cards.filter((c) => {
      if (filter === 'featured' && c.category !== 'featured') return false;
      if (filter === 'mcgee' && !c.name.toLowerCase().includes('mcgee')) return false;
      if (filter === 'obliterate' && !c.name.toLowerCase().includes('obliterate') && !c.obliterated) return false;
      if (filter === 'thomas' && !c.name.toLowerCase().includes('thomas')) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.team.toLowerCase().includes(q) && !c.rarity.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      binderGrid.innerHTML = `<div class="hockey-empty-binder">No cards match that filter — rip a booster pack or generate a new McGee!</div>`;
      return;
    }

    binderGrid.innerHTML = filtered
      .map(
        (c) => `
        <button type="button" class="hockey-mini-card${c.id === activeCard.id ? ' active' : ''}${c.obliterated ? ' is-obliterated' : ''}" data-card-id="${c.id}">
          <div class="hockey-mini-top">
            <span class="hockey-mini-num">#${c.jerseyNum}</span>
            <span class="hockey-mini-rar">${c.obliterated ? '💥' : c.rarity === 'MYTHIC THOMAS' ? '👑' : c.rarity === 'OBLITERATE ULTRA' ? '🔥' : c.rarity === 'MCGEE SPECIAL' ? '⭐' : '🏒'}</span>
          </div>
          <div class="hockey-mini-name">${c.name}</div>
          <div class="hockey-mini-sub">SLAP ${c.slapshot} · OBLIT ${c.obliteration}</div>
        </button>
      `,
      )
      .join('');

    binderGrid.querySelectorAll<HTMLButtonElement>('.hockey-mini-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        hockeyBridge?.sfx.playClick();
        const found = collectionState.cards.find((c) => c.id === btn.dataset.cardId);
        if (found) {
          activeCard = found;
          renderActiveCard();
          renderBinder();
          if (statusEl) statusEl.textContent = `Inspecting ${activeCard.name} (${activeCard.rarity} · 0% 4K Realism)`;
        }
      });
    });
  };

  const addCardsAndSelect = (newCards: HockeyCard[], statusMsg: string) => {
    collectionState.cards = [...newCards, ...collectionState.cards].slice(0, 120);
    activeCard = newCards[0];
    saveCollectionState();
    renderActiveCard();
    renderBinder();
    if (statusEl) statusEl.textContent = statusMsg;
  };

  // Button: Rip 5-Card Booster Pack!
  windowElement.querySelector('#hockey-rip-pack-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playStartupChime();
    collectionState.packsRipped++;
    const pack: HockeyCard[] = [
      createRandomHockeyCard('mcgee'),
      createRandomHockeyCard('obliterate'),
      createRandomHockeyCard('any'),
      createRandomHockeyCard('mcgee'),
      createRandomHockeyCard('any'),
    ];
    addCardsAndSelect(
      pack,
      `📦 Ripped Pack #${collectionState.packsRipped}! Pulled ${pack[0].name} + 4 more non-4K hockey cards!`,
    );
    hockeyBridge?.pushToast('📦 Hockey Pack Ripped!', `Pulled ${pack[0].name} (${pack[0].rarity}) & 4 more goofy cards!`, '🏒');
  });

  // Button: Random McGee Card
  windowElement.querySelector('#hockey-gen-mcgee-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playAimReceive();
    const card = createRandomHockeyCard('mcgee');
    addCardsAndSelect([card], `🎲 Generated new McGee Clan card: ${card.name}!`);
  });

  // Button: Random Obliterate Character
  windowElement.querySelector('#hockey-gen-oblit-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playAimReceive();
    const card = createRandomHockeyCard('obliterate');
    addCardsAndSelect([card], `🔥 Generated new Obliterate Squad card: ${card.name}!`);
  });

  // Button: Randomize Face Only (keeps character name, mutates wonky non-4K face!)
  windowElement.querySelector('#hockey-mutate-face-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playClick();
    activeCard.seed = Math.floor(100000 + Math.random() * 8999999);
    activeCard.obliterated = false;
    saveCollectionState();
    renderActiveCard();
    renderBinder();
    if (statusEl) statusEl.textContent = `🤪 Regenerated non-4K goofy facial features for ${activeCard.name}!`;
  });

  // Button: 💥 OBLITERATE THIS CARD!
  windowElement.querySelector('#hockey-obliterate-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playChordError();
    activeCard.obliterated = true;
    collectionState.obliteratedCount++;
    saveCollectionState();

    // Comic shake + shatter animation!
    if (stageWrap) {
      stageWrap.classList.remove('obliterate-shake');
      void stageWrap.offsetWidth;
      stageWrap.classList.add('obliterate-shake');
    }
    renderActiveCard(1);
    renderBinder();
    if (statusEl) statusEl.textContent = `💥 OBLITERATED ${activeCard.name}! (${collectionState.obliteratedCount} cards obliterated total)`;
    hockeyBridge?.unlockAchievement('hockey_cards_obliterate');
    hockeyBridge?.pushToast('💥 CARD OBLITERATED!', `${activeCard.name} was smashed into 144p hockey confetti!`, '💥');
  });

  // Button: Save PNG to C:\Pictures
  windowElement.querySelector('#hockey-save-vfs-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playClick();
    const safeName = activeCard.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const fname = `${safeName}_HockeyCard95.png`;
    const dataUrl = mainCanvas.toDataURL('image/png');
    hockeyBridge?.addVfsFile(fname, 'image', 'C:\\Pictures', dataUrl);
    hockeyBridge?.refreshExplorerIfOpen();
    if (statusEl) statusEl.textContent = `💾 Saved ${fname} to C:\\Pictures!`;
    hockeyBridge?.pushToast('Saved Hockey Card!', `Saved "${fname}" to My AngelTop → C:\\Pictures!`, '🏒');
  });

  // Button: Download PNG to Real Computer
  windowElement.querySelector('#hockey-download-btn')?.addEventListener('click', () => {
    hockeyBridge?.sfx.playClick();
    const safeName = activeCard.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const a = document.createElement('a');
    a.href = mainCanvas.toDataURL('image/png');
    a.download = `${safeName}_HockeyCard95.png`;
    a.click();
    if (statusEl) statusEl.textContent = `⬇ Downloaded ${safeName}_HockeyCard95.png!`;
  });

  filterSelect?.addEventListener('change', () => renderBinder());
  searchInput?.addEventListener('input', () => renderBinder());

  renderActiveCard();
  renderBinder();
}
