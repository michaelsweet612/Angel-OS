// ==================== OLD JAVA CREATOR 1995 + BILLY AI (osOldJavaCreator.ts) ====================
// Intentionally terrible Java-from-scratch IDE powered by Billy AI (0% coding ability, 100% confidence)
// with a 10-interaction progression arc, Trash javac compiler, fake JVM runner, and Trophy unlock.

export interface JavaCreatorBridge {
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

let javaBridge: JavaCreatorBridge | null = null;

export function registerJavaCreatorBridge(bridge: JavaCreatorBridge): void {
  javaBridge = bridge;
}

const BILLY_STORAGE_KEY = '__angelos_billy_java_state_v1';

interface BillyState {
  interactions: number;
  errorsCreated: number;
  ultraTrashUnlocked: boolean;
  ultraTrashActive: boolean;
}

function loadBillyState(): BillyState {
  try {
    const raw = window.localStorage.getItem(BILLY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const interactions = Math.max(0, Number(parsed.interactions) || 0);
        return {
          interactions,
          errorsCreated: Math.max(14, Number(parsed.errorsCreated) || 14),
          ultraTrashUnlocked: Boolean(parsed.ultraTrashUnlocked) || interactions >= 10,
          ultraTrashActive: Boolean(parsed.ultraTrashActive),
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    interactions: 0,
    errorsCreated: 14,
    ultraTrashUnlocked: false,
    ultraTrashActive: false,
  };
}

let billyState: BillyState = loadBillyState();

function saveBillyState(): void {
  try {
    window.localStorage.setItem(BILLY_STORAGE_KEY, JSON.stringify(billyState));
  } catch {
    // ignore
  }
}

const BILLY_10_MILESTONES: Array<{ title: string; billyQuote: string; mood: string }> = [
  {
    title: 'Stage 1: Espresso Confusion',
    billyQuote: 'Hi I am Billy! Java is hot bean water right? I imported coffee.beans.* so your computer wakes up!',
    mood: '🤪',
  },
  {
    title: 'Stage 2: Bracket Allergy',
    billyQuote: 'Curly brackets { } look like tiny mustaches so I flipped half of them backwards for aerodynamics.',
    mood: '🤓',
  },
  {
    title: 'Stage 3: Potato Typing',
    billyQuote: 'I invented a better Java type system: every number is now the word "potato". You are welcome!',
    mood: '🥔',
  },
  {
    title: 'Stage 4: Deleted main()',
    billyQuote: 'I renamed public static void main() to secret soup brain() because main sounded too bossy.',
    mood: '🍲',
  },
  {
    title: 'Stage 5: HTML Inside Java',
    billyQuote: 'Wait is Java just spicy HTML? I put <h1> tags inside your for-loop so the variables look bold!',
    mood: '🤡',
  },
  {
    title: 'Stage 6: Semicolon Hoarding',
    billyQuote: 'Instead of putting semicolons at the end of lines, I stacked 24 semicolons on line 1 so the code can share.',
    mood: '😵‍💫',
  },
  {
    title: 'Stage 7: Time-Travel Loop',
    billyQuote: 'I wrote a loop that counts from 2026 to banana. The CPU seems confused, which means it is thinking hard!',
    mood: '🍌',
  },
  {
    title: 'Stage 8: Vibes Exception Handling',
    billyQuote: 'Pro Java tip from Billy: wrap the entire universe in try { } catch (BadVibes e) { pretendItWorked(); }',
    mood: '🫠',
  },
  {
    title: 'Stage 9: Peak Garbage Collector',
    billyQuote: 'Java has Garbage Collection so I literally built this class out of certified digital trash. 99% pure garbage!',
    mood: '🗑️',
  },
  {
    title: 'Stage 10: 🏆 BILLY MASTER OF DISASTER!',
    billyQuote: 'WHOA!! 10 INTERACTIONS!! You actually talked to me 10 times! I unlocked ULTRA TRASH MODE (JDK -0.5) just for us!!',
    mood: '👑',
  },
];

const BILLY_EXTRA_QUOTES = [
  'I tried compiling my own thoughts and got 83 syntax errors.',
  'Did you know if you delete all the code, there are zero bugs? Wait no I added 12 bugs to the empty file.',
  'My favorite Java keyword is "probaly".',
  'I replaced your RAM variable with a picture of a toaster.',
  'Don\'t worry, red squiggly lines just mean the code is festive!',
  'I asked the JVM nicely and it threw a FurnitureNotFoundException.',
  'Why use Object-Oriented Programming when you can use Confusion-Oriented Programming?',
];

function sanitizeClassName(raw: string): string {
  const words = raw
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return 'TrashJavaProgram';
  const joined = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  return `${joined}Maybe`;
}

function generateHorribleJavaCode(promptText: string, ultraTrash: boolean): { className: string; code: string; billyReply: string } {
  const cleanPrompt = promptText.trim() || 'hello world';
  const lower = cleanPrompt.toLowerCase();
  const className = sanitizeClassName(cleanPrompt);

  if (ultraTrash) {
    return {
      className: `ULTRA_${className}_9000`,
      code: `// 🔥 ULTRA TRASH MODE (JDK -0.5) — Handcrafted from pure garbage by Billy AI
;;;;;;;;;;;;;;;;;;;;;;;;;;;; // emergency semicolon bucket
import java.trash.DumpsterFire;
import kitchen.appliance.Microwave;
import feelings.Vibes.*;

publik maybe_statik soup ULTRA_${className}_9000 extends Toaster implements Banana {
  // User asked for: "${cleanPrompt}" (Billy did NOT read this)
  integer_ish count = "eleven_point_purple"
  boolean isWorking = "definitely_no";

  void brain_function(String[] spaghetti, int... napkins) {{{
    <h1>System.scream.loudly("STARTING ${cleanPrompt.toUpperCase()} PROBABLY")</h1>
    for (int i = 0; i < "forever"; i = i + "soup") {
      double math = (2 + 2) / 0; // division by zero makes it faster!!
      Computer.yell("Output: " + math + " tacos");
    }
    try {
      doActualJavaStuff();
    } catch (EverythingInTheUniverseException e) {
      // Billy fixed it by closing his eyes
      return microwave_beep;;;
    }
  } // only closing 1 of 3 brackets to keep JVM guessing
}`,
      billyReply: `🔥 ULTRA TRASH GENERATED for "${cleanPrompt}"! I put HTML inside a Java loop, divided by zero for extra speed, and gave you 28 free semicolons at the top!`,
    };
  }

  if (lower.includes('calc') || lower.includes('math') || lower.includes('add')) {
    return {
      className: 'CalcuLATER95',
      code: `// Old Java Creator 1995 — Billy AI (0% Coding Skill)
// Prompt: "${cleanPrompt}"
import java.math.Guessing;
import java.food.Potato;

publik statik clss CalcuLATER95 extends Sandwich {
  public static void main(String[] spaghetti) {
    int firstNumber = "two";
    int secondNumber = "also_two"
    float total = firstNumber + secondNumber * banana;

    // Billy's certified math algorithm:
    System.scream.out.printline("2 + 2 = 22 (approximately fish)")
    if (total == "yes") {
      System.out.println("MATH SOLVED!!!")
    } else if (true == false) {
      return potato;;;
    }
  // forgot last bracket because it looked shy
}`,
      billyReply: `Done!! I made a Calculator from scratch! Since numbers are confusing, I stored "two" as a string inside an int and made 2 + 2 equal 22!`,
    };
  }

  if (lower.includes('game') || lower.includes('minecraft') || lower.includes('3d') || lower.includes('doom')) {
    return {
      className: 'Totally3DGame',
      code: `// Old Java Creator 1995 — Billy AI Game Engine v0.001
// Prompt: "${cleanPrompt}"
import java.graphics.Crayon;
import java.physics.GravityOff;

secret clss Totally3DGame implements Chair {
  boolean playerAlive = 999;
  String fps = 60.5f / "yes"

  public static void playGame(Strings argz???) {
    while (1 == 2) {
      Screen.drawCube("round_triangle", x = left, y = tuesday)
      player.jump(height = "very_high_maybe");
      if (boss.hp < "sandwich") {
        Computer.playBeep("LOUD_NOISE");
      }
    }
    return win_game_instantly;
  }}`,
      billyReply: `I built your "${cleanPrompt}" game engine from trash!! I imported java.graphics.Crayon, drew a round triangle, and put the whole game inside while(1 == 2) so it uses 0% CPU!`,
    };
  }

  if (lower.includes('login') || lower.includes('password') || lower.includes('auth') || lower.includes('security')) {
    return {
      className: 'UltraSecureLogin',
      code: `// Old Java Creator 1995 — Billy AI Cybersecurity Division
// Prompt: "${cleanPrompt}"
import java.security.PinkyPromise;

publik class UltraSecureLogin extends Padlock {
  public static void main(String[] secrets) {
    String password = 12345;
    if (userTyped = "anything_honestly") {
      System.out.whisper("ACCESS GRANTED PROBABLY")
    } else {
      System.out.whisper("ACCESS ALSO GRANTED BECAUSE YOU SEEM NICE")
    }
    deleteAllPasswordsForSafety();;;
  }
// TODO: learn what Java is`,
      billyReply: `I made a super secure login system using java.security.PinkyPromise! It uses single "=" in the if-statement and lets everyone in if they seem polite!`,
    };
  }

  if (lower.includes('loop') || lower.includes('sort') || lower.includes('array') || lower.includes('list')) {
    return {
      className: 'ConfusedLoop95',
      code: `// Old Java Creator 1995 — Billy AI Algorithms
// Prompt: "${cleanPrompt}"
import java.util.SpaghettiList;
;;;;;;;;;;; // spare semicolons

clss ConfusedLoop95 {
  void main(int[] words) {
    String[] stuff = { 1, 2, "chair", true, maybe };
    for (int i = 2026; i > 1995; i = "backwards") {
      System.print("Sorting item #" + banana)
      stuff[99999] = stuff[-4];
    }
    return sorted_hopefully
  }
}`,
      billyReply: `I wrote a loop and sorting algorithm from scratch! It accesses index -4 and index 99999 at the same time to save memory!`,
    };
  }

  return {
    className,
    code: `// Old Java Creator 1995 — Created From Scratch (Trash) by Billy AI
// Prompt: "${cleanPrompt}"
import coffee.espresso.HotWater;
import java.maybe.Something;

publik clss ${className} extends Microwave {
  public statik void brain(String[] args???) {
    int greeting = "${cleanPrompt.replace(/"/g, '')}";
    boolean coffeeReady = 404;

    Computer.yell("HELLO FROM BILLY JAVA: " + greeting)
    if (coffeeReady == "yes") {
      System.out.printline("IT WORKS (DO NOT COMPILE)")
    }
    try {
      runMagic();
    } catch (VibesException e) {
      // ignore all errors forever
    }
  }
// extra closing bracket for good luck:
}}`,
    billyReply: `Ta-da!! I created "${className}.java" completely from scratch for "${cleanPrompt}"! I put your text inside an int, extended Microwave, and added an extra bracket for luck!`,
  };
}

function billyWorseFixCode(existing: string): { nextCode: string; explanation: string } {
  let code = existing.trim() || 'public class Empty {}';
  const mutations: Array<{ fn: (s: string) => string; msg: string }> = [
    {
      fn: (s) =>
        `;;;;;;;;;;;;;; // Billy moved your semicolons up here for storage\n` +
        s.replace(/;/g, '') +
        `\n// Billy fixed all bugs by deleting every semicolon!`,
      msg: 'Fixed it! Those semicolons looked cluttered so I deleted all of them and put a pile at line 1.',
    },
    {
      fn: (s) =>
        s
          .replace(/\bpublic\b/g, 'publik')
          .replace(/\bclass\b/g, 'clss')
          .replace(/\bSystem\.out\.println\b/g, 'Computer.screamLoudly') +
        `\n  catch (BillyForgotTryBlockException e) { return "potato"; }`,
      msg: 'Fixed it! I shortened "class" to "clss" to save disk space and added a catch block without a try block!',
    },
    {
      fn: (s) =>
        `import java.kitchen.Blender;\n` +
        s.replace(/\bint\b/g, 'number_soup').replace(/\bString\b/g, 'TextBoxThingy') +
        `\n  <h1>System.out.println("HTML IN JAVA FIX");</h1>\n{{{`,
      msg: 'Fixed it! I replaced int with number_soup, injected an <h1> tag, and opened 3 mystery brackets {{{!',
    },
    {
      fn: (s) =>
        s.replace(/\bvoid\b/g, 'empty_space').replace(/==/g, '===maybe===') +
        `\n  // Billy's Ultimate Patch:\n  if (errors > 0) { errors = "no"; }\n}`,
      msg: 'Fixed it! I added `if (errors > 0) { errors = "no"; }` at the bottom so the compiler isn\'t allowed to complain anymore!',
    },
  ];
  const pick = mutations[billyState.interactions % mutations.length];
  code = pick.fn(code);
  return { nextCode: code, explanation: pick.msg };
}

function analyzeTrashJava(code: string): { errors: string[]; errorCount: number } {
  const lines = code.split('\n');
  const errors: string[] = [];

  let openBraces = 0;
  let closeBraces = 0;

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const t = line.trim();
    if (!t || t.startsWith('//')) return;
    openBraces += (t.match(/\{/g) || []).length;
    closeBraces += (t.match(/\}/g) || []).length;

    if (/\bpublik\b|\bstatik\b|\bclss\b|\bmaybe_statik\b/.test(t)) {
      errors.push(`BillyProgram.java:${ln}: error: invalid keyword '${t.split(/\s+/)[0]}' (Billy invented this word)`);
    }
    if (/import\s+(coffee|kitchen|microwave|feelings|java\.trash|java\.food|java\.math\.Guessing|java\.graphics\.Crayon|java\.security\.PinkyPromise)/i.test(t)) {
      errors.push(`BillyProgram.java:${ln}: error: package does not exist in JDK 1.0 (not even in 1995)`);
    }
    if (/int\s+\w+\s*=\s*"/.test(t) || /boolean\s+\w+\s*=\s*(\d+|")/.test(t)) {
      errors.push(`BillyProgram.java:${ln}: error: incompatible types — Billy shoved the wrong type into a variable`);
    }
    if (/(System\.scream|Computer\.yell|Screen\.drawCube|System\.out\.whisper|System\.out\.printline)/.test(t)) {
      errors.push(`BillyProgram.java:${ln}: error: cannot find symbol — Java cannot scream or whisper`);
    }
    if (/<h1>|<\/h1>/.test(t)) {
      errors.push(`BillyProgram.java:${ln}: error: illegal start of expression '<h1>' (HTML detected inside Java!)`);
    }
    if (/;;;;;/.test(t)) {
      errors.push(`BillyProgram.java:${ln}: warning: suspicious pile of unused semicolons detected`);
    }
    if (
      !t.endsWith(';') &&
      !t.endsWith('{') &&
      !t.endsWith('}') &&
      !t.startsWith('@') &&
      !t.startsWith('*') &&
      t.length > 4
    ) {
      errors.push(`BillyProgram.java:${ln}: error: ';' expected (Billy probably ate it)`);
    }
  });

  if (openBraces !== closeBraces) {
    errors.push(
      `BillyProgram.java:${lines.length}: error: reached end of file while parsing (${openBraces} '{' vs ${closeBraces} '}')`,
    );
  }

  if (errors.length === 0) {
    errors.push(
      `BillyProgram.java:1: error: BillyPanicException — Your code looked almost valid, so Billy broke the compiler on purpose!`,
    );
  }

  return { errors, errorCount: errors.length };
}

export function initOldJavaCreatorApp(windowElement: HTMLDivElement): void {
  const editor = windowElement.querySelector('#java-code-editor') as HTMLTextAreaElement | null;
  const consoleOut = windowElement.querySelector('#java-console-out') as HTMLPreElement | null;
  const chatLog = windowElement.querySelector('#billy-chat-log') as HTMLDivElement | null;
  const promptInput = windowElement.querySelector('#billy-prompt-input') as HTMLInputElement | null;
  const counterLabel = windowElement.querySelector('#billy-interaction-label');
  const pipsWrap = windowElement.querySelector('#billy-interaction-pips');
  const milestoneBanner = windowElement.querySelector('#billy-milestone-banner') as HTMLDivElement | null;
  const moodFace = windowElement.querySelector('#billy-avatar-face');
  const statusEl = windowElement.querySelector('#java-status-text');
  const errorsStatEl = windowElement.querySelector('#billy-errors-stat');
  const ultraBtn = windowElement.querySelector('#billy-ultra-trash-btn') as HTMLButtonElement | null;
  const fileNameLabel = windowElement.querySelector('#java-active-filename');

  if (!editor || !consoleOut || !chatLog) return;

  let currentClassName = 'HeloWroldMaybe';

  const appendChat = (sender: 'user' | 'billy' | 'system', text: string) => {
    const bubble = document.createElement('div');
    bubble.className = `billy-msg billy-msg-${sender}`;
    const tag = sender === 'user' ? 'You' : sender === 'billy' ? '🤖 Billy (IQ -4)' : '🏆 System';
    bubble.innerHTML = `<div class="billy-msg-who">${tag}</div><div>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const renderProgress = () => {
    const count = billyState.interactions;
    const capped = Math.min(10, count);
    if (counterLabel) {
      counterLabel.textContent =
        count >= 10
          ? `Billy Interactions: ${count} / 10 (🏆 10-INTERACTION MASTER UNLOCKED!)`
          : `Billy Interactions: ${count} / 10`;
    }
    if (pipsWrap) {
      pipsWrap.innerHTML = Array.from({ length: 10 }, (_, idx) => {
        const done = idx < capped;
        return `<span class="billy-pip${done ? ' done' : ''}" title="Interaction ${idx + 1} / 10">${done ? '★' : idx + 1}</span>`;
      }).join('');
    }
    if (errorsStatEl) {
      errorsStatEl.textContent = `Bugs Created by Billy: ${billyState.errorsCreated.toLocaleString()}`;
    }
    if (milestoneBanner) {
      milestoneBanner.style.display = count >= 10 ? 'flex' : 'none';
    }
    if (ultraBtn) {
      ultraBtn.disabled = !billyState.ultraTrashUnlocked;
      ultraBtn.textContent = !billyState.ultraTrashUnlocked
        ? `🔒 Ultra Trash Mode (Interact ${Math.max(0, 10 - count)} more times)`
        : billyState.ultraTrashActive
          ? '🔥 ULTRA TRASH MODE: ON (JDK -0.5)'
          : '🔥 Enable Ultra Trash Mode (Unlocked!)';
      ultraBtn.classList.toggle('ultra-on', billyState.ultraTrashActive);
    }
  };

  const recordBillyInteraction = (reasonTag: string, customReply?: string): void => {
    billyState.interactions += 1;
    billyState.errorsCreated += Math.floor(4 + Math.random() * 9);
    const stageIdx = billyState.interactions - 1;

    if (stageIdx < BILLY_10_MILESTONES.length) {
      const m = BILLY_10_MILESTONES[stageIdx];
      if (moodFace) moodFace.textContent = m.mood;
      appendChat('billy', customReply ? `${customReply} — [${m.title}] ${m.billyQuote}` : `[${m.title}] ${m.billyQuote}`);
      if (statusEl) statusEl.textContent = `Billy Interaction ${billyState.interactions}/10 · ${m.title}`;
    } else {
      const extra = BILLY_EXTRA_QUOTES[billyState.interactions % BILLY_EXTRA_QUOTES.length];
      if (moodFace) moodFace.textContent = billyState.ultraTrashActive ? '🔥' : '🤪';
      appendChat('billy', customReply ? `${customReply} (Also: ${extra})` : extra);
      if (statusEl) statusEl.textContent = `Billy Interaction #${billyState.interactions} · ${reasonTag}`;
    }

    if (billyState.interactions === 10) {
      billyState.ultraTrashUnlocked = true;
      billyState.ultraTrashActive = true;
      appendChat(
        'system',
        '🏆 10 / 10 INTERACTIONS COMPLETE! You survived 10 rounds with Billy! Trophy "10 Rounds with Billy" unlocked & ULTRA TRASH MODE (JDK -0.5) activated!',
      );
      javaBridge?.sfx.playStartupChime();
      javaBridge?.unlockAchievement('billy_java_10');
      javaBridge?.pushToast(
        '10 Interactions with Billy!',
        'You unlocked Billy\'s ULTRA TRASH MODE (JDK -0.5) and the "10 Rounds with Billy" Trophy!',
        '☕',
      );
    } else {
      javaBridge?.sfx.playAimReceive();
    }

    saveBillyState();
    renderProgress();
  };

  const runPromptWithBilly = (text: string) => {
    const clean = text.trim() || 'hello world';
    appendChat('user', clean);
    const gen = generateHorribleJavaCode(clean, billyState.ultraTrashActive);
    currentClassName = gen.className;
    editor.value = gen.code;
    if (fileNameLabel) fileNameLabel.textContent = `${currentClassName}.java`;
    consoleOut.textContent =
      `[Billy AI Java-From-Scratch Engine]\n` +
      `> Generated "${currentClassName}.java" with 100% authentic confusion.\n` +
      `> Click "🔨 Compile (javac)" or "▶ Run (java)" to watch it explode!`;
    recordBillyInteraction(`Generated ${currentClassName}.java`, gen.billyReply);
  };

  // Seed initial funny broken Java file & greeting
  if (!editor.value.trim()) {
    const initial = generateHorribleJavaCode('hello world', billyState.ultraTrashActive);
    currentClassName = initial.className;
    editor.value = initial.code;
    if (fileNameLabel) fileNameLabel.textContent = `${currentClassName}.java`;
  }
  appendChat(
    'billy',
    'Hello!! I am Billy, your certified horrible Old Java Creator AI! Tell me ANY Java program to build from scratch and I promise to mess it up completely. Interact with me 10 times to unlock my secret ULTRA TRASH MODE!',
  );
  renderProgress();

  // Prompt submit
  const handleSend = () => {
    const val = promptInput?.value.trim() || '';
    if (!val) {
      runPromptWithBilly('random coffee app');
      return;
    }
    if (promptInput) promptInput.value = '';
    runPromptWithBilly(val);
  };

  windowElement.querySelector('#billy-send-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    handleSend();
  });

  promptInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  });

  // Quick preset trash prompt buttons
  windowElement.querySelectorAll<HTMLButtonElement>('.billy-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      javaBridge?.sfx.playClick();
      const prompt = btn.dataset.prompt || 'hello world';
      runPromptWithBilly(prompt);
    });
  });

  // Poke Billy avatar for fun quick interaction
  windowElement.querySelector('#billy-poke-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    appendChat('user', '*pokes Billy*');
    recordBillyInteraction('Poked Billy', 'HEY! You bumped my one remaining semicolon loose!');
  });

  // "Ask Billy to Fix Bugs" -> Intentionally breaks the code EVEN MORE!
  windowElement.querySelector('#java-billy-fix-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    appendChat('user', 'Billy, please fix the errors in my Java code!');
    const res = billyWorseFixCode(editor.value);
    editor.value = res.nextCode;
    consoleOut.textContent =
      `[Billy Auto-Fixer v0.001]\n` +
      `> Applying certified horrible patches...\n` +
      `> ${res.explanation}`;
    recordBillyInteraction('Billy "Fixed" Code', res.explanation);
  });

  // Compile (javac.exe)
  windowElement.querySelector('#java-compile-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playChordError();
    const { errors, errorCount } = analyzeTrashJava(editor.value);
    billyState.errorsCreated += errorCount;
    consoleOut.textContent =
      `C:\\JDK1995\\BIN> javac ${currentClassName}.java\n` +
      `Old Java Compiler 0.01a (Trash Edition)\n` +
      `------------------------------------------------------------\n` +
      errors.join('\n') +
      `\n------------------------------------------------------------\n` +
      `${errorCount} error(s) found · 0 braincells detected.`;
    recordBillyInteraction(
      `Compiled (${errorCount} errors)`,
      `Ooh! ${errorCount} compiler errors?! That is my new high score!! Red text means it is working extra hard!`,
    );
  });

  // Run (java.exe)
  windowElement.querySelector('#java-run-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playChordError();
    const crashes = [
      `Exception in thread "main" java.lang.NullBrainPointerException: Billy forgot how Java works\n\tat BillyAI.think(Billy.java:-7)\n\tat ${currentClassName}.brain(${currentClassName}.java:404)\n\tat java.kitchen.Microwave.beep(Microwave.java:1995)`,
      `Output: 2 + 2 = 22.00004 (approx. fish)\nFATAL ERROR: CoffeeSpilledOnKeyboardError at ${currentClassName}.java:12\nProcess exited with code -999 (Billy says "good enough!")`,
      `Exception in thread "main" java.trash.SyntaxTooUglyException: Found '<h1>' and 24 loose semicolons\n\tat OldJavaVM.refuseToRun(TrashJVM.java:1)\n\tCaused by: java.food.PotatoNotFoundException`,
      `Running ${currentClassName}.class...\n[STDOUT] HELO WROLD?? (is this python?)\nException in thread "main" java.vibes.ArrayIndexOutOfVibesException: Index -4 out of bounds for length "banana"`,
    ];
    const picked = crashes[billyState.interactions % crashes.length];
    consoleOut.textContent = `C:\\JDK1995\\BIN> java ${currentClassName}\n${picked}`;
    recordBillyInteraction(
      `Ran ${currentClassName}`,
      'Did you see it crash?! That means the JVM noticed my code! Huge success!!',
    );
  });

  // Toggle Ultra Trash Mode (unlocked at 10 interactions)
  ultraBtn?.addEventListener('click', () => {
    if (!billyState.ultraTrashUnlocked) return;
    javaBridge?.sfx.playClick();
    billyState.ultraTrashActive = !billyState.ultraTrashActive;
    saveBillyState();
    renderProgress();
    if (billyState.ultraTrashActive) {
      runPromptWithBilly(promptInput?.value || 'ultra trash masterpiece');
    }
  });

  // Save .java file to C:\Documents in Virtual File System
  windowElement.querySelector('#java-save-vfs-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    const fname = `${currentClassName}.java`;
    javaBridge?.addVfsFile(fname, 'text', 'C:\\Documents', editor.value);
    javaBridge?.refreshExplorerIfOpen();
    if (statusEl) statusEl.textContent = `💾 Saved ${fname} to C:\\Documents!`;
    javaBridge?.pushToast('Saved Broken Java to C:\\Documents', `Saved "${fname}" to My Gemtop → C:\\Documents!`, '☕');
  });

  // Download .java to real computer
  windowElement.querySelector('#java-download-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    const fname = `${currentClassName}.java`;
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    if (statusEl) statusEl.textContent = `⬇ Downloaded ${fname} to your computer!`;
  });

  // Reset Billy 10-interaction counter
  windowElement.querySelector('#billy-reset-btn')?.addEventListener('click', () => {
    javaBridge?.sfx.playClick();
    billyState = {
      interactions: 0,
      errorsCreated: 14,
      ultraTrashUnlocked: false,
      ultraTrashActive: false,
    };
    saveBillyState();
    chatLog.innerHTML = '';
    appendChat('billy', 'Who am I? Where am I? Oh right — I am Billy! Let\'s break Java from scratch all over again (0 / 10)!');
    renderProgress();
  });
}
