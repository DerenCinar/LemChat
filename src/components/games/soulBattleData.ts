export type BossId =
  | 'sans'
  | 'papyrus'
  | 'undyne'
  | 'toriel'
  | 'mettaton'
  | 'asgore'
  | 'muffet';

export type SoulMode = 'red' | 'blue' | 'green' | 'purple' | 'yellow';

export interface BossAct {
  name: string;
  narration: string;
  quip: string;
  spareGain: number;
  healPlayer?: number;
}

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  maxHp: number;
  playerMaxHp: number;
  atk: number;
  def: number;
  atkDamage: number;
  hasKarma?: boolean;
  hasRatings?: boolean;
  voiceFreq: number;
  voiceWave: OscillatorType;
  stageTint: string;
  checkText: string;
  introText: string;
  statusLines: string[];
  spareReadyLine: string;
  spareTarget: number;
  accentColor: string;
  soulModes: SoulMode[];
  acts: [BossAct, BossAct];
  quips: string[];
  winFightText: string;
  winSpareText: string;
}

export interface BattleItem {
  id: string;
  name: string;
  shortName: string;
  heal: number;
  speedBoost?: boolean;
  flavor: string;
}

export const BATTLE_ITEMS: BattleItem[] = [
  {
    id: 'pie',
    name: 'ButtsPie',
    shortName: 'B.Scotch Pie',
    heal: 20,
    flavor: '* You ate the Butterscotch Pie. Your HP was maxed out.',
  },
  {
    id: 'snowman',
    name: 'SnowPiece',
    shortName: 'Snowman Piece',
    heal: 15,
    flavor: '* You ate the Snowman Piece. Recovered 15 HP!',
  },
  {
    id: 'nicecream',
    name: 'NiceCream',
    shortName: 'Nice Cream',
    heal: 10,
    flavor: '* You ate the Nice Cream. It has a cheerful note! +10 HP.',
  },
  {
    id: 'seatea',
    name: 'Sea Tea',
    shortName: 'Sea Tea',
    heal: 8,
    speedBoost: true,
    flavor: '* Glowing marsh-water! +8 HP and your SPEED increased!',
  },
];

export const BOSSES: BossDef[] = [
  {
    id: 'sans',
    name: 'Sans',
    title: 'The Comedian Skeleton',
    maxHp: 1,
    playerMaxHp: 40,
    atk: 1,
    def: 1,
    atkDamage: 2,
    hasKarma: true,
    voiceFreq: 135,
    voiceWave: 'square',
    stageTint: 'rgba(56, 189, 248, 0.14)',
    checkText: '* SANS 1 ATK 1 DEF — The easiest enemy. Can only deal 1 damage... supposedly.',
    introText: "* It's a beautiful day outside. Birds are singing, flowers are blooming...",
    statusLines: [
      '* Sans keeps both hands tucked inside his hoodie pockets.',
      '* You feel your sins crawling on your back.',
      '* Sans is dodging effortlessly. Stay focused.',
      '* Sweat drops down Sans’s brow. He looks tired...',
    ],
    spareReadyLine: '* Sans yawns deeply. "alright, truce? i\'m going to grillby\'s."',
    spareTarget: 3,
    accentColor: '#38BDF8',
    soulModes: ['blue', 'red'],
    acts: [
      {
        name: 'Ketchup',
        narration: '* You toss over a spare bottle of ketchup. Sans catches it.',
        quip: 'heya. thanks, pal.',
        spareGain: 1,
      },
      {
        name: 'Pun',
        narration: '* You tell a terrible bone pun. Sans chuckles despite himself.',
        quip: 'heh. that one rattled my ribs.',
        spareGain: 1,
      },
    ],
    quips: [
      'on days like these...',
      "you're gonna have a bad time.",
      'why not just take a nap?',
      'here comes a bone barrage.',
      'watch the skull cannons, kid.',
    ],
    winFightText: "* Sans catches his breath, winks once, and slips off-screen. YOU WON!",
    winSpareText: "* Sans waves lazily. 'see ya 'round, kiddo.' YOU WON!",
  },
  {
    id: 'papyrus',
    name: 'Papyrus',
    title: 'Future Royal Guardsman',
    maxHp: 110,
    playerMaxHp: 24,
    atk: 20,
    def: 20,
    atkDamage: 3,
    voiceFreq: 420,
    voiceWave: 'square',
    stageTint: 'rgba(249, 115, 22, 0.13)',
    checkText: '* PAPYRUS 20 ATK 20 DEF — He likes to say: "NYEH HEH HEH!"',
    introText: '* Papyrus blocks the way! His cape billows heroically!',
    statusLines: [
      '* Papyrus is considering his next bone-tastic puzzle.',
      '* Smells like freshly boiled spaghetti.',
      '* Papyrus strikes an extremely dramatic battle pose!',
      '* "YOU\'RE BLUE NOW! THAT\'S MY ATTACK!"',
    ],
    spareReadyLine: '* Papyrus looks utterly impressed! His name turns YELLOW.',
    spareTarget: 3,
    accentColor: '#F97316',
    soulModes: ['blue'],
    acts: [
      {
        name: 'Flirt',
        narration: '* You compliment his Battle Body armor. Papyrus blushes wildly!',
        quip: 'W-WHAT?! MY STANDARDS HAVE BEEN MET?!',
        spareGain: 2,
      },
      {
        name: 'Encourage',
        narration: '* You cheer for the Great Papyrus. His confidence skyrockets!',
        quip: 'NYEH HEH HEH! YOU ARE AN EXCELLENT OPPONENT!',
        spareGain: 1,
      },
    ],
    quips: [
      'NYEH HEH HEH!',
      'BLUE MEANS STOP! ORANGE MEANS MOVE!',
      'JUMP, HUMAN! MY BONES ARE COOLS!',
      'BEHOLD MY SPECIAL... REGULAR ATTACK!',
    ],
    winFightText: '* Papyrus still believes in you! YOU WON!',
    winSpareText: '* "CONGRATULATIONS! WE ARE NOW BEST FRIENDS!" YOU WON!',
  },
  {
    id: 'undyne',
    name: 'Undyne',
    title: 'Captain of the Royal Guard',
    maxHp: 140,
    playerMaxHp: 24,
    atk: 50,
    def: 20,
    atkDamage: 4,
    voiceFreq: 270,
    voiceWave: 'sawtooth',
    stageTint: 'rgba(34, 197, 94, 0.14)',
    checkText: '* UNDYNE 50 ATK 20 DEF — Heroine that NEVER gives up.',
    introText: '* Undyne slams a glowing spear down! Spear of Justice begins!',
    statusLines: [
      '* Undyne’s armor gleams fiercely. She grins with determination.',
      '* Energy spears crackle all around the arena!',
      '* "Fuhuhu! Show me everything you\'ve got!"',
      '* Your SOUL hums inside a protective green barrier.',
    ],
    spareReadyLine: '* Undyne lowers her spear slightly, respecting your grit!',
    spareTarget: 3,
    accentColor: '#22C55E',
    soulModes: ['green', 'red'],
    acts: [
      {
        name: 'Challenge',
        narration: '* You point forward boldly! Undyne respects a warrior\'s spirit!',
        quip: 'NGAHHH! NOW WE\'RE TALKING!',
        spareGain: 1,
      },
      {
        name: 'Plead',
        narration: '* You refuse to draw first blood. Undyne hesitates, surprised.',
        quip: 'Tch... why won\'t you fight dirty?!',
        spareGain: 2,
      },
    ],
    quips: [
      'NGAHHH!!',
      'EN GARDE, PUNK!',
      'WATCH THE YELLOW SPEARS!',
      'YOU CAN\'T DODGE FOREVER!',
    ],
    winFightText: '* Undyne salutes one last time in battle exhaustion. YOU WON!',
    winSpareText: '* "Alright, punk... maybe you ARE cool after all!" YOU WON!',
  },
  {
    id: 'toriel',
    name: 'Toriel',
    title: 'Caretaker of the Ruins',
    maxHp: 100,
    playerMaxHp: 24,
    atk: 80,
    def: 80,
    atkDamage: 3,
    voiceFreq: 220,
    voiceWave: 'triangle',
    stageTint: 'rgba(168, 85, 247, 0.14)',
    checkText: '* TORIEL 80 ATK 80 DEF — Knows best for you.',
    introText: '* Toriel blocks the exit with a heavy sigh and warm embers.',
    statusLines: [
      '* Toriel prepares a sweeping wave of magical fire.',
      '* She refuses to meet your gaze.',
      '* "...Prove to me you are strong enough to survive."',
      '* Warm sparks drift gently across the black floor.',
    ],
    spareReadyLine: '* Toriel lowers her paws and gives a trembling, relieved smile.',
    spareTarget: 3,
    accentColor: '#A855F7',
    soulModes: ['red'],
    acts: [
      {
        name: 'Talk',
        narration: '* You ask politely to leave. Toriel listens silently.',
        quip: '...Do not make this harder, my child.',
        spareGain: 1,
      },
      {
        name: 'Promise',
        narration: '* You promise to stay safe out there. Her flames soften.',
        quip: '...You truly are determined.',
        spareGain: 2,
      },
    ],
    quips: [
      'Show me you can protect yourself.',
      '...',
      'Be careful of the fireballs.',
      'Do not hold back.',
    ],
    winFightText: '* Toriel steps aside in silence. YOU WON!',
    winSpareText: '* "My child... be safe on your journey." YOU WON!',
  },
  {
    id: 'mettaton',
    name: 'Mettaton EX',
    title: 'Underground Superstar',
    maxHp: 150,
    playerMaxHp: 24,
    atk: 47,
    def: 47,
    atkDamage: 3,
    hasRatings: true,
    voiceFreq: 330,
    voiceWave: 'sawtooth',
    stageTint: 'rgba(236, 72, 153, 0.16)',
    checkText: '* METTATON EX 47 ATK 47 DEF — Weak point is his heart-shaped core!',
    introText: '* Lights! Camera! Action! Mettaton EX bursts onto stage!',
    statusLines: [
      '* Ratings are climbing off the charts!!',
      '* Mettaton strikes a fabulous disco pose!',
      '* "OOOOH YESSS! Blast those crates, darling!"',
      '* The crowd goes wild as lasers flash!',
    ],
    spareReadyLine: '* Ratings hit 12,000! Mettaton bows to thunderous applause!',
    spareTarget: 3,
    accentColor: '#EC4899',
    soulModes: ['yellow', 'red'],
    acts: [
      {
        name: 'Pose',
        narration: '* You strike a glamorous pose! The ratings meter surges!',
        quip: 'FABULOUS, DARLING! +500 RATINGS!',
        spareGain: 1,
      },
      {
        name: 'Boast',
        narration: '* You hype up the live audience. Stage lights sparkle!',
        quip: 'OOOOH YES! KEEP THAT ENERGY UP!',
        spareGain: 2,
      },
    ],
    quips: [
      'OOOOH YESSS!',
      'LIGHTS! CAMERA! LASERS!',
      'SHOOT THE CRATES, DARLING!',
      'DRAMA! ROMANCE! EXPLOSIONS!',
    ],
    winFightText: '* Mettaton takes a dramatic final bow! YOU WON!',
    winSpareText: '* "That was our highest-rated show EVER, darling!" YOU WON!',
  },
  {
    id: 'asgore',
    name: 'Asgore',
    title: 'King of Monsters',
    maxHp: 180,
    playerMaxHp: 28,
    atk: 80,
    def: 80,
    atkDamage: 4,
    voiceFreq: 112,
    voiceWave: 'sawtooth',
    stageTint: 'rgba(239, 68, 68, 0.15)',
    checkText: '* ASGORE 80 ATK 80 DEF — A solemn king wielding a crimson trident.',
    introText: '* Asgore draws his glowing trident. Twilight fills the barrier room.',
    statusLines: [
      '* A heavy aura washes over the room. Remember: BLUE = STOP, ORANGE = MOVE.',
      '* Golden petals drift across the barrier.',
      '* Asgore grips his trident tightly, eyes shadowed beneath his crown.',
      '* His breath slows as fire rings gather around you.',
    ],
    spareReadyLine: '* Asgore lowers his trident. Hope breaks through the twilight!',
    spareTarget: 3,
    accentColor: '#EF4444',
    soulModes: ['red'],
    acts: [
      {
        name: 'Talk',
        narration: '* You remind Asgore there doesn\'t have to be another war.',
        quip: '...Perhaps I wished to hear those words.',
        spareGain: 1,
      },
      {
        name: 'Tea',
        narration: '* You mention his favorite golden flower tea. He sighs wistfully.',
        quip: 'Ah... a quiet cup would have been nice.',
        spareGain: 2,
      },
    ],
    quips: [
      'Prepare yourself, human.',
      'Watch the glint of my trident.',
      'Cyan stills. Orange marches on.',
      'May your SOUL shine steady.',
    ],
    winFightText: '* Asgore nods with quiet dignity. YOU WON!',
    winSpareText: '* "Thank you, young one... for showing mercy." YOU WON!',
  },
  {
    id: 'muffet',
    name: 'Muffet',
    title: 'Spider Bake Sale Boss',
    maxHp: 125,
    playerMaxHp: 24,
    atk: 38,
    def: 18,
    atkDamage: 3,
    voiceFreq: 520,
    voiceWave: 'triangle',
    stageTint: 'rgba(192, 132, 252, 0.15)',
    checkText: '* MUFFET 38 ATK 18 DEF — If she catches you, it\'s tea time~',
    introText: '* Muffet pours purple spider cider! You\'re trapped in her parlor web!',
    statusLines: [
      '* All the spiders are clapping along to Muffet\'s rhythm~',
      '* Your SOUL snaps neatly between the three purple web strings!',
      '* "Ahuhuhu~ Don\'t slip off the threads, dearie~"',
      '* Muffet checks the spider telegram...',
    ],
    spareReadyLine: '* A spider brings a receipt—you were a valued customer! Name is YELLOW!',
    spareTarget: 3,
    accentColor: '#C084FC',
    soulModes: ['purple'],
    acts: [
      {
        name: 'Struggle',
        narration: '* You pull neatly against the purple threads, timing her rhythm.',
        quip: 'Ahuhuhu~ Why rush when tea is almost ready~?',
        spareGain: 1,
      },
      {
        name: 'Buy Donut',
        narration: '* You praise the Spider Bake Sale pastries! Muffet beams!',
        quip: 'Oh my~! A connoisseur! Spiders, ease up a bit~!',
        spareGain: 2,
      },
    ],
    quips: [
      'Ahuhuhu~',
      'Time for spiders, donuts, and tea~',
      'Watch those croissants curve back~!',
      'Don\'t drop a crumb~!',
    ],
    winFightText: '* The web tears open as spiders scatter! YOU WON!',
    winSpareText: '* "Come visit our bake sale anytime, dearie~!" YOU WON!',
  },
];

export const getBossDateKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getDailyBossIndex = (dateKey: string): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcCurrent = Date.UTC(y, m - 1, d);
  const utcEpoch = Date.UTC(2026, 0, 1);
  const days = Math.max(0, Math.floor((utcCurrent - utcEpoch) / 86400000));
  return days % BOSSES.length;
};

export const getDailyBoss = (dateKey = getBossDateKey()): BossDef => BOSSES[getDailyBossIndex(dateKey)];

export interface SoulBattleSave {
  clearedDate: string | null;
  clearedBossId: BossId | null;
  clearedMethod: 'FIGHT' | 'SPARE' | null;
  streak: number;
  bestStreak: number;
  totalWins: number;
  lastWinDate: string | null;
}

const BATTLE_STORAGE_KEY = 'skellytalk_soulbattle_v1';

const getYesterdayDateKey = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getBossDateKey(d);
};

export const loadSoulBattleSave = (): SoulBattleSave => {
  const today = getBossDateKey();
  const yesterday = getYesterdayDateKey();
  try {
    const raw = localStorage.getItem(BATTLE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SoulBattleSave;
      const keepStreak = parsed.lastWinDate === today || parsed.lastWinDate === yesterday;
      return {
        clearedDate: parsed.clearedDate === today ? today : null,
        clearedBossId: parsed.clearedDate === today ? parsed.clearedBossId : null,
        clearedMethod: parsed.clearedDate === today ? parsed.clearedMethod : null,
        streak: keepStreak ? parsed.streak ?? 0 : 0,
        bestStreak: parsed.bestStreak ?? 0,
        totalWins: parsed.totalWins ?? 0,
        lastWinDate: parsed.lastWinDate ?? null,
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    clearedDate: null,
    clearedBossId: null,
    clearedMethod: null,
    streak: 0,
    bestStreak: 0,
    totalWins: 0,
    lastWinDate: null,
  };
};

export const recordDailyBossWin = (bossId: BossId, method: 'FIGHT' | 'SPARE'): SoulBattleSave => {
  const today = getBossDateKey();
  const prev = loadSoulBattleSave();
  const alreadyToday = prev.lastWinDate === today;
  const nextStreak = alreadyToday ? prev.streak : prev.streak + 1;
  const next: SoulBattleSave = {
    clearedDate: today,
    clearedBossId: bossId,
    clearedMethod: method,
    streak: nextStreak,
    bestStreak: Math.max(prev.bestStreak, nextStreak),
    totalWins: alreadyToday ? prev.totalWins : prev.totalWins + 1,
    lastWinDate: today,
  };
  try {
    localStorage.setItem(BATTLE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
};

export const hasClearedDailyBossToday = (): boolean => {
  return loadSoulBattleSave().clearedDate === getBossDateKey();
};

/* ---------- Retro 8-bit Web Audio SFX ---------- */
type SfxType =
  | 'move'
  | 'select'
  | 'slash'
  | 'hit'
  | 'miss'
  | 'hurt'
  | 'clang'
  | 'blaster'
  | 'charge'
  | 'slam'
  | 'glint_cyan'
  | 'glint_orange'
  | 'ratings'
  | 'laser'
  | 'heal'
  | 'spare'
  | 'win'
  | 'shatter'
  | 'gameover';

let sharedAudioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

export const playVoiceBlip = (freq: number, wave: OscillatorType, muted: boolean): void => {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 18, now);
    g.gain.setValueAtTime(0.028, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.036);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.042);
  } catch {
    // ignore audio errors
  }
};

export const playBattleSfx = (type: SfxType, muted: boolean): void => {
  if (muted) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const tone = (
      freqStart: number,
      freqEnd: number,
      dur: number,
      wave: OscillatorType = 'square',
      gainVal = 0.08,
      delay = 0,
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freqStart, now + delay);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + delay + dur);
      g.gain.setValueAtTime(gainVal, now + delay);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.02);
    };

    switch (type) {
      case 'move':
        tone(520, 620, 0.04, 'square', 0.045);
        break;
      case 'select':
        tone(680, 920, 0.07, 'square', 0.055);
        break;
      case 'slash':
        tone(950, 220, 0.14, 'sawtooth', 0.09);
        break;
      case 'hit':
        tone(220, 70, 0.16, 'sawtooth', 0.11);
        tone(140, 48, 0.18, 'square', 0.07, 0.04);
        break;
      case 'miss':
        tone(420, 650, 0.08, 'triangle', 0.06);
        break;
      case 'hurt':
        tone(180, 75, 0.12, 'sawtooth', 0.11);
        break;
      case 'clang':
        tone(980, 1420, 0.06, 'triangle', 0.07);
        break;
      case 'blaster':
        tone(160, 58, 0.34, 'sawtooth', 0.11);
        tone(310, 90, 0.28, 'square', 0.06, 0.02);
        break;
      case 'charge':
        tone(220, 740, 0.32, 'triangle', 0.055);
        break;
      case 'slam':
        tone(140, 42, 0.16, 'sawtooth', 0.12);
        break;
      case 'glint_cyan':
        tone(760, 1180, 0.08, 'triangle', 0.07);
        break;
      case 'glint_orange':
        tone(520, 860, 0.08, 'sawtooth', 0.06);
        break;
      case 'ratings':
        tone(660, 990, 0.07, 'square', 0.05);
        break;
      case 'shatter':
        tone(320, 95, 0.22, 'sawtooth', 0.1);
        break;
      case 'laser':
        tone(920, 480, 0.06, 'square', 0.04);
        break;
      case 'heal':
        tone(440, 587, 0.08, 'triangle', 0.07, 0);
        tone(587, 880, 0.12, 'triangle', 0.07, 0.08);
        break;
      case 'spare':
        tone(523, 659, 0.09, 'triangle', 0.07, 0);
        tone(659, 784, 0.12, 'triangle', 0.07, 0.09);
        tone(784, 1046, 0.18, 'triangle', 0.08, 0.18);
        break;
      case 'win':
        tone(523, 523, 0.08, 'square', 0.06, 0);
        tone(659, 659, 0.08, 'square', 0.06, 0.09);
        tone(784, 784, 0.08, 'square', 0.06, 0.18);
        tone(1046, 1046, 0.24, 'square', 0.07, 0.27);
        break;
      case 'gameover':
        tone(330, 290, 0.14, 'triangle', 0.08, 0);
        tone(260, 180, 0.22, 'triangle', 0.08, 0.16);
        tone(160, 80, 0.35, 'sawtooth', 0.07, 0.38);
        break;
    }
  } catch {
    // ignore audio errors
  }
};
