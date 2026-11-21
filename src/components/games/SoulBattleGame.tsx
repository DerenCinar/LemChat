import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Share2, RotateCcw, Flame, CheckCircle2, Tv } from 'lucide-react';
import {
  BATTLE_ITEMS,
  BOSSES,
  getBossDateKey,
  getDailyBoss,
  loadSoulBattleSave,
  playBattleSfx,
  playVoiceBlip,
  recordDailyBossWin,
  type BattleItem,
  type BossDef,
  type BossId,
  type SoulBattleSave,
  type SoulMode,
} from './soulBattleData';
import { BossPixelSprite } from './SoulBattleSprites';

type Share = (text: string) => void;
type MainAction = 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY';
type BattlePhase =
  | 'menu'
  | 'submenu'
  | 'message'
  | 'fight_aim'
  | 'fight_slash'
  | 'dodge'
  | 'victory'
  | 'gameover';

interface Hazard {
  kind:
    | 'bone'
    | 'fire'
    | 'spear'
    | 'crate'
    | 'pinkheart'
    | 'bomb'
    | 'donut'
    | 'croissant'
    | 'spider'
    | 'spiderwarn'
    | 'dog'
    | 'boot'
    | 'bootwarn'
    | 'slamwarn'
    | 'slamspikes'
    | 'blaster'
    | 'tridentwarn'
    | 'tridentslash'
    | 'discolaser'
    | 'explosion';
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  r?: number;
  color: 'white' | 'cyan' | 'orange' | 'pink' | 'yellow' | 'purple' | 'red';
  age: number;
  maxAge: number;
  hp?: number;
  maxHp?: number;
  dirX?: number;
  dirY?: number;
  angle?: number;
  omega?: number;
  yellowFlip?: boolean;
  flipped?: boolean;
  flipProgress?: number;
  startX?: number;
  startY?: number;
  fired?: boolean;
  entryDist?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface LaserBolt {
  x: number;
  y: number;
  vy: number;
  power?: boolean;
}

const WIDE_W = 350;
const SHIELD_W = 216;
const ARENA_H = 175;
const WEB_LANES = [42, 87.5, 133];

const drawPixelHeart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  inverted = false,
) => {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (inverted) ctx.scale(1, -1);
  ctx.fillStyle = color;
  const pts: [number, number, number, number][] = [
    [-4, -4, 3, 2],
    [1, -4, 3, 2],
    [-5, -3, 10, 3],
    [-4, 0, 8, 2],
    [-3, 2, 6, 1],
    [-2, 3, 4, 1],
    [-1, 4, 2, 1],
  ];
  for (const [rx, ry, rw, rh] of pts) {
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.restore();
};

const drawGasterBlaster = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  jawOpen: number,
  charging: boolean,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Sculpted Skull Crown & Horns
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.moveTo(-14, -10);
  ctx.lineTo(-22, -16);
  ctx.lineTo(-10, -13);
  ctx.lineTo(10, -11);
  ctx.lineTo(15, -4);
  ctx.lineTo(15, 4);
  ctx.lineTo(10, 11);
  ctx.lineTo(-10, 13);
  ctx.lineTo(-22, 16);
  ctx.lineTo(-14, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Snapping Jaw
  const sep = jawOpen * 5;
  ctx.fillStyle = '#090D16';
  ctx.fillRect(4, -3 - sep * 0.5, 11, 6 + sep);

  // Eye Sockets + Glowing Pupil
  ctx.fillStyle = '#090D16';
  ctx.fillRect(-3, -8, 7, 5);
  ctx.fillRect(-3, 3, 7, 5);
  ctx.fillStyle = charging ? '#38BDF8' : '#FFFFFF';
  ctx.fillRect(0, -7, 3, 3);
  ctx.fillRect(0, 4, 3, 3);
  ctx.restore();
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const circleRectHit = (cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) => {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
};

const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2, 0, 1);
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
};

const getHazardCssColor = (c: Hazard['color']): string => {
  switch (c) {
    case 'cyan':
      return '#22D3EE';
    case 'orange':
      return '#FB923C';
    case 'pink':
      return '#F472B6';
    case 'yellow':
      return '#FACC15';
    case 'purple':
      return '#C084FC';
    case 'red':
      return '#EF4444';
    default:
      return '#F8FAFC';
  }
};

export const SoulBattleGame: React.FC<{ share: Share }> = ({ share }) => {
  const todayKey = getBossDateKey();
  const dailyBoss = getDailyBoss(todayKey);

  const [save, setSave] = useState<SoulBattleSave>(() => loadSoulBattleSave());
  const [bossId, setBossId] = useState<BossId>(dailyBoss.id);
  const isDailyChallenge = bossId === dailyBoss.id;
  const boss: BossDef = BOSSES.find((b) => b.id === bossId) ?? dailyBoss;

  const [muted, setMuted] = useState(false);
  const [phase, setPhase] = useState<BattlePhase>('menu');
  const [menuIndex, setMenuIndex] = useState(0);
  const [subMenuAction, setSubMenuAction] = useState<'ACT' | 'ITEM' | 'MERCY'>('ACT');
  const [subIndex, setSubIndex] = useState(0);

  const [playerHp, setPlayerHp] = useState(boss.playerMaxHp);
  const [karma, setKarma] = useState(0);
  const [ratings, setRatings] = useState(5400);
  const [bossHp, setBossHp] = useState(boss.maxHp);
  const [showEnemyHpBar, setShowEnemyHpBar] = useState(false);
  const [spareProgress, setSpareProgress] = useState(0);
  const [turn, setTurn] = useState(0);
  const [fightAttempts, setFightAttempts] = useState(0);
  const [speedBoost, setSpeedBoost] = useState(false);
  const [itemsLeft, setItemsLeft] = useState<BattleItem[]>(() => [...BATTLE_ITEMS]);

  const [narration, setNarration] = useState(boss.introText);
  const [displayedText, setDisplayedText] = useState('');
  const [bossQuip, setBossQuip] = useState<string | null>(null);
  const [floatingDmg, setFloatingDmg] = useState<{ text: string; color: string; key: number } | null>(null);
  const [bossHurt, setBossHurt] = useState(false);
  const [bossDodging, setBossDodging] = useState(false);
  const [slashAnim, setSlashAnim] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [glintColor, setGlintColor] = useState<'cyan' | 'orange' | null>(null);
  const [glintQueue, setGlintQueue] = useState<('cyan' | 'orange')[]>([]);
  const [victoryMethod, setVictoryMethod] = useState<'FIGHT' | 'SPARE'>('FIGHT');

  const [aimPos, setAimPos] = useState(0);
  const aimRef = useRef({ pos: 0, dir: 1, active: false });

  const [activeSoulMode, setActiveSoulMode] = useState<SoulMode>(boss.soulModes[0]);
  const [hudHint, setHudHint] = useState<string | null>(null);
  const [dodgeProgress, setDodgeProgress] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const edgeUpRef = useRef(false);
  const edgeDownRef = useRef(false);
  const pointerTargetRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: WIDE_W / 2,
    y: ARENA_H / 2,
  });

  const playerHpRef = useRef(playerHp);
  playerHpRef.current = playerHp;
  const karmaRef = useRef(karma);
  karmaRef.current = karma;
  const ratingsRef = useRef(ratings);
  ratingsRef.current = ratings;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const speedBoostRef = useRef(speedBoost);
  speedBoostRef.current = speedBoost;
  const turnRef = useRef(turn);
  turnRef.current = turn;

  const isShieldArena = phase === 'dodge' && activeSoulMode === 'green';
  const arenaW = isShieldArena ? SHIELD_W : WIDE_W;

  const isSpareReady =
    spareProgress >= boss.spareTarget ||
    bossHp <= Math.max(1, Math.floor(boss.maxHp * 0.25)) ||
    (boss.hasRatings && ratings >= 12000);
  const asgoreMercyUnlocked = boss.id !== 'asgore' || isSpareReady;

  const triggerShake = useCallback(() => {
    setScreenShake((n) => n + 1);
  }, []);

  const resetBattle = useCallback(
    (nextBossId: BossId = bossId) => {
      const nextBoss = BOSSES.find((b) => b.id === nextBossId) ?? dailyBoss;
      setBossId(nextBoss.id);
      setPhase('menu');
      setMenuIndex(0);
      setSubIndex(0);
      setPlayerHp(nextBoss.playerMaxHp);
      playerHpRef.current = nextBoss.playerMaxHp;
      setKarma(0);
      karmaRef.current = 0;
      setRatings(5400);
      ratingsRef.current = 5400;
      setBossHp(nextBoss.maxHp);
      setShowEnemyHpBar(false);
      setSpareProgress(0);
      setTurn(0);
      setFightAttempts(0);
      setSpeedBoost(false);
      setItemsLeft([...BATTLE_ITEMS]);
      setNarration(nextBoss.introText);
      setBossQuip(null);
      setFloatingDmg(null);
      setBossHurt(false);
      setBossDodging(false);
      setSlashAnim(false);
      setGlintColor(null);
      setGlintQueue([]);
      setHudHint(null);
      setActiveSoulMode(nextBoss.soulModes[0]);
    },
    [bossId, dailyBoss],
  );

  // Typewriter narration effect with throttled per-boss voice blips
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      const ch = narration[i - 1];
      setDisplayedText(narration.slice(0, i));
      if (ch && ch !== ' ' && ch !== '*' && i % 2 === 1 && (phase === 'menu' || phase === 'message')) {
        playVoiceBlip(boss.voiceFreq, boss.voiceWave, mutedRef.current);
      }
      if (i >= narration.length) clearInterval(id);
    }, 17);
    return () => clearInterval(id);
  }, [narration, boss.voiceFreq, boss.voiceWave, phase]);

  // Karma poison drain tick (down to min 1 HP)
  useEffect(() => {
    if (!boss.hasKarma || phase === 'gameover' || phase === 'victory') return;
    const id = setInterval(() => {
      if (karmaRef.current > 0 && playerHpRef.current > 1) {
        karmaRef.current -= 1;
        setKarma(karmaRef.current);
        playerHpRef.current -= 1;
        setPlayerHp(playerHpRef.current);
      } else if (karmaRef.current > 0 && playerHpRef.current <= 1) {
        karmaRef.current = 0;
        setKarma(0);
      }
    }, 620);
    return () => clearInterval(id);
  }, [boss.hasKarma, phase]);

  const finishVictory = useCallback(
    (method: 'FIGHT' | 'SPARE') => {
      playBattleSfx(method === 'SPARE' ? 'spare' : 'win', mutedRef.current);
      setVictoryMethod(method);
      setPhase('victory');
      setBossQuip(null);
      setGlintColor(null);
      setGlintQueue([]);
      setNarration(method === 'SPARE' ? boss.winSpareText : boss.winFightText);
      if (boss.id === dailyBoss.id) {
        setSave(recordDailyBossWin(boss.id, method));
      }
    },
    [boss, dailyBoss.id],
  );

  const startDodgePhase = useCallback(() => {
    const modeIdx = turnRef.current % boss.soulModes.length;
    const chosenMode = boss.soulModes[modeIdx];
    setActiveSoulMode(chosenMode);
    const q = boss.quips[turnRef.current % boss.quips.length];
    setBossQuip(q);

    if (chosenMode === 'green') {
      setHudHint('GREEN SOUL · BLOCK WITH SHIELD (RED SPEAR = NEXT)');
    } else if (chosenMode === 'blue') {
      setHudHint('BLUE SOUL · JUMP! CYAN=STOP ORANGE=MOVE');
    } else if (chosenMode === 'purple') {
      setHudHint('PURPLE SOUL · UP/DOWN WEB THREADS');
    } else if (chosenMode === 'yellow') {
      setHudHint('YELLOW SOUL · SHOOT CRATES & HEARTS');
    } else if (boss.id === 'asgore') {
      setHudHint('WATCH ASGORE’S GLINT · CYAN=STOP ORANGE=MOVE');
    } else if (boss.id === 'sans' || boss.id === 'mettaton') {
      setHudHint('CYAN = STOP · ORANGE = KEEP MOVING');
    } else {
      setHudHint(null);
    }

    setDodgeProgress(1);
    setPhase('dodge');
  }, [boss]);

  // Execute FIGHT bar animation
  useEffect(() => {
    if (phase !== 'fight_aim') return;
    aimRef.current = { pos: 0.04, dir: 1, active: true };
    setAimPos(0.04);
    let last = performance.now();
    let raf = 0;
    const speed = boss.id === 'sans' ? 1.38 : 1.12;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!aimRef.current.active) return;
      aimRef.current.pos += aimRef.current.dir * speed * dt;
      if (aimRef.current.pos >= 0.98) {
        aimRef.current.pos = 0.98;
        aimRef.current.dir = -1;
      } else if (aimRef.current.pos <= 0.02) {
        aimRef.current.active = false;
        resolveFightStrike(0.14);
        return;
      }
      setAimPos(aimRef.current.pos);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveFightStrike = useCallback(
    (overrideAcc?: number) => {
      if (phase !== 'fight_aim') return;
      aimRef.current.active = false;
      const dist = Math.abs((overrideAcc !== undefined ? 0.5 - overrideAcc * 0.5 : aimRef.current.pos) - 0.5);
      const accuracy = clamp(1 - dist * 2, 0.14, 1);

      playBattleSfx('slash', mutedRef.current);
      setSlashAnim(true);
      setPhase('fight_slash');

      const nextAttempts = fightAttempts + 1;
      setFightAttempts(nextAttempts);

      setTimeout(() => {
        setSlashAnim(false);
        const sansCanDodge = boss.id === 'sans' && fightAttempts < 4;

        if (sansCanDodge) {
          playBattleSfx('miss', mutedRef.current);
          setBossDodging(true);
          setFloatingDmg({ text: 'MISS', color: '#CBD5E1', key: Date.now() });
          setTimeout(() => {
            setBossDodging(false);
            setFloatingDmg(null);
            if (nextAttempts >= 4) {
              setBossQuip('huff... alright, that almost clipped me.');
            }
            startDodgePhase();
          }, 840);
          return;
        }

        playBattleSfx('hit', mutedRef.current);
        triggerShake();
        setBossHurt(true);
        setShowEnemyHpBar(true);
        const isCrit = accuracy >= 0.85;
        const dmg =
          boss.id === 'sans'
            ? 9999999
            : Math.max(10, Math.round((25 + Math.random() * 9) * (0.45 + accuracy * 1.15)));
        const nextHp = Math.max(0, bossHp - dmg);
        setBossHp(nextHp);
        setFloatingDmg({
          text: isCrit ? `${dmg}!!` : `${dmg}`,
          color: isCrit ? '#FFE600' : '#EF4444',
          key: Date.now(),
        });

        setTimeout(() => {
          setBossHurt(false);
          setShowEnemyHpBar(false);
          setFloatingDmg(null);
          if (nextHp <= 0) {
            finishVictory('FIGHT');
          } else {
            startDodgePhase();
          }
        }, 900);
      }, 360);
    },
    [boss.id, bossHp, fightAttempts, finishVictory, phase, startDodgePhase, triggerShake],
  );

  // Main 60fps Choreographed Bullet-Hell Dodge Engine
  useEffect(() => {
    if (phase !== 'dodge') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mode = activeSoulMode;
    const W = mode === 'green' ? SHIELD_W : WIDE_W;
    const H = ARENA_H;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const currentTurn = turnRef.current;
    const patternIdx = currentTurn % 3;
    const waveDuration = 5.8;

    const soul = {
      x: W / 2,
      y:
        mode === 'blue'
          ? H - 14
          : mode === 'purple'
            ? WEB_LANES[1]
            : mode === 'yellow'
              ? H - 24
              : mode === 'green'
                ? H / 2
                : H / 2 + 12,
      vx: 0,
      vy: 0,
      prevX: W / 2,
      prevY: H / 2,
      lane: 1,
      shieldDir: 0,
      invuln: 0,
      grounded: mode === 'blue',
    };

    const hazards: Hazard[] = [];
    const lasers: LaserBolt[] = [];
    const particles: Particle[] = [];

    let elapsed = 0;
    let spawnTimer = 0.22;
    let secondaryTimer = 0.65;
    let shotTimer = 0.12;
    let shotCount = 0;
    let stepCount = 0;
    let pawX1 = 70;
    let pawX2 = W - 70;
    let asgoreSeqStep = 0;
    let asgoreSequence: ('cyan' | 'orange')[] = [];
    let asgoreTimer = 0.25;
    let asgorePhase: 'glint' | 'slash' = 'glint';
    let raf = 0;
    let lastTs = performance.now();

    if (boss.id === 'asgore' && patternIdx === 0) {
      asgoreSequence = currentTurn % 2 === 0 ? ['cyan', 'orange', 'cyan'] : ['orange', 'cyan', 'orange'];
      setGlintQueue([]);
    } else {
      setGlintQueue([]);
      setGlintColor(null);
    }

    const addBurst = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 45 + Math.random() * 85;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0,
          maxLife: 0.34 + Math.random() * 0.2,
          color,
          size: 2.6,
        });
      }
    };

    const hurtSoul = (amount: number) => {
      if (soul.invuln > 0) return;
      soul.invuln = boss.hasKarma ? 0.52 : 0.85;
      playBattleSfx('hurt', mutedRef.current);
      triggerShake();
      addBurst(soul.x, soul.y, '#EF4444', 10);

      if (boss.hasKarma) {
        const direct = 1;
        const nextHp = Math.max(0, playerHpRef.current - direct);
        playerHpRef.current = nextHp;
        setPlayerHp(nextHp);
        const nextKr = Math.min(Math.max(0, nextHp - 1), karmaRef.current + 4);
        karmaRef.current = nextKr;
        setKarma(nextKr);
        if (nextHp <= 0) {
          cancelAnimationFrame(raf);
          playBattleSfx('gameover', mutedRef.current);
          setBossQuip(null);
          setPhase('gameover');
        }
        return;
      }

      const next = Math.max(0, playerHpRef.current - amount);
      playerHpRef.current = next;
      setPlayerHp(next);
      if (next <= 0) {
        cancelAnimationFrame(raf);
        playBattleSfx('gameover', mutedRef.current);
        setBossQuip(null);
        setPhase('gameover');
      }
    };

    const spawnPatternStep = () => {
      stepCount++;

      // SANS
      if (boss.id === 'sans') {
        if (mode === 'blue') {
          if (patternIdx === 0 && stepCount % 4 === 1) {
            // Directional Gravity Slam warning on floor -> shakes & erupts spikes!
            hazards.push({
              kind: 'slamwarn',
              x: 4,
              y: H - 42,
              w: W - 8,
              h: 38,
              vx: 0,
              vy: 0,
              color: 'red',
              age: 0,
              maxAge: 0.56,
              fired: false,
            });
          } else {
            const fromRight = stepCount % 2 === 0;
            const vx = fromRight ? -145 : 145;
            const x = fromRight ? W + 12 : -20;
            if (patternIdx === 2 && stepCount % 3 === 0) {
              hazards.push({
                kind: 'bone',
                x,
                y: 8,
                w: 12,
                h: H - 14,
                vx,
                vy: 0,
                color: 'cyan',
                age: 0,
                maxAge: 3.4,
              });
            } else {
              // Sinusoidal bone corridor!
              const floorH = 24 + Math.round((Math.sin(stepCount * 0.9) + 1) * 14);
              hazards.push(
                {
                  kind: 'bone',
                  x,
                  y: H - floorH - 4,
                  w: 10,
                  h: floorH,
                  vx,
                  vy: 0,
                  color: 'white',
                  age: 0,
                  maxAge: 3.4,
                },
                {
                  kind: 'bone',
                  x,
                  y: 4,
                  w: 10,
                  h: 52,
                  vx,
                  vy: 0,
                  color: 'white',
                  age: 0,
                  maxAge: 3.4,
                },
              );
            }
          }
        } else {
          // Choreographed Gaster Blaster Pairs (X-Cross / Flank / Aimed)
          const pairType = stepCount % 3;
          const makeBlaster = (bx: number, by: number, tx: number, ty: number) => {
            const ang = Math.atan2(ty - by, tx - bx);
            hazards.push({
              kind: 'blaster',
              x: bx,
              y: by,
              w: 24,
              h: 24,
              vx: 0,
              vy: 0,
              angle: ang,
              color: 'white',
              age: 0,
              maxAge: 1.08,
              fired: false,
            });
          };
          if (pairType === 1) {
            makeBlaster(24, 24, soul.x, soul.y);
            makeBlaster(W - 24, 24, soul.x, soul.y);
          } else if (pairType === 2) {
            makeBlaster(22, clamp(soul.y, 26, H - 26), W, soul.y);
            makeBlaster(clamp(soul.x, 30, W - 30), H - 22, soul.x, 0);
          } else {
            const bx = clamp(soul.x + (Math.random() - 0.5) * 44, 30, W - 30);
            makeBlaster(bx, 22, soul.x, soul.y);
          }
          playBattleSfx('charge', mutedRef.current);
        }
        return;
      }

      // PAPYRUS (Blue SOUL + Annoying Dog Cameo on Wave 2!)
      if (boss.id === 'papyrus') {
        const x = W + 14;
        const speed = -132;
        if (patternIdx === 2 && stepCount === 3) {
          hazards.push({
            kind: 'dog',
            x: W + 10,
            y: H - 28,
            w: 24,
            h: 20,
            vx: -105,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 4.2,
          });
        }
        if (stepCount % 4 === 0) {
          const isCyan = (stepCount / 4) % 2 === 1;
          hazards.push({
            kind: 'bone',
            x,
            y: 12,
            w: 13,
            h: H - 18,
            vx: speed,
            vy: 0,
            color: isCyan ? 'cyan' : 'orange',
            age: 0,
            maxAge: 3.6,
          });
        } else {
          // Stair-step hurdles (18 -> 30 -> 42)
          const stair = [18, 28, 38][stepCount % 3];
          hazards.push({
            kind: 'bone',
            x,
            y: H - stair - 4,
            w: 11,
            h: stair,
            vx: speed,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 3.6,
          });
          if (patternIdx === 2) {
            hazards.push({
              kind: 'bone',
              x,
              y: 4,
              w: 11,
              h: 46,
              vx: speed,
              vy: 0,
              color: 'white',
              age: 0,
              maxAge: 3.6,
            });
          }
        }
        return;
      }

      // UNDYNE
      if (boss.id === 'undyne') {
        if (mode === 'green') {
          const patternSeq = [0, 1, 2, 3, 1, 3, 0, 2];
          const dir = patternSeq[stepCount % patternSeq.length];
          const isYellow = stepCount >= 3 && stepCount % 3 === 0;
          const dist = 124;
          const dx = [0, 1, 0, -1][dir];
          const dy = [-1, 0, 1, 0][dir];
          const speed = isYellow ? 128 : 138;
          const sx = W / 2 + dx * dist;
          const sy = H / 2 + dy * dist;
          hazards.push({
            kind: 'spear',
            x: sx,
            y: sy,
            startX: sx,
            startY: sy,
            w: 14,
            h: 14,
            vx: -dx * speed,
            vy: -dy * speed,
            dirX: -dx,
            dirY: -dy,
            color: isYellow ? 'yellow' : 'cyan',
            yellowFlip: isYellow,
            flipped: false,
            flipProgress: 0,
            age: 0,
            maxAge: 2.5,
          });
        } else {
          const cx = soul.x;
          const cy = soul.y;
          const count = 6;
          const gapIdx = stepCount % count;
          for (let i = 0; i < count; i++) {
            if (i === gapIdx) continue;
            const a = (Math.PI * 2 * i) / count + stepCount * 0.25;
            const rad = 112;
            const sx = cx + Math.cos(a) * rad;
            const sy = cy + Math.sin(a) * rad;
            hazards.push({
              kind: 'spear',
              x: sx,
              y: sy,
              w: 10,
              h: 10,
              vx: -Math.cos(a) * 80,
              vy: -Math.sin(a) * 80,
              angle: a + Math.PI,
              color: 'cyan',
              age: 0,
              maxAge: 2.1,
            });
          }
        }
        return;
      }

      // TORIEL
      if (boss.id === 'toriel') {
        if (patternIdx === 0) {
          pawX1 = W * 0.25 + Math.sin(elapsed * 2.4) * 55;
          pawX2 = W * 0.75 - Math.sin(elapsed * 2.4) * 55;
          hazards.push(
            {
              kind: 'fire',
              x: pawX1,
              y: 16,
              w: 12,
              h: 12,
              r: 6,
              vx: Math.cos(elapsed * 3) * 28,
              vy: 96,
              color: 'white',
              age: 0,
              maxAge: 2.6,
            },
            {
              kind: 'fire',
              x: pawX2,
              y: 16,
              w: 12,
              h: 12,
              r: 6,
              vx: -Math.cos(elapsed * 3) * 28,
              vy: 96,
              color: 'white',
              age: 0,
              maxAge: 2.6,
            },
          );
        } else {
          const fromLeft = stepCount % 2 === 0;
          for (let k = 0; k < 2; k++) {
            hazards.push({
              kind: 'fire',
              x: fromLeft ? -6 : W + 6,
              y: 26 + k * 28,
              w: 12,
              h: 12,
              r: 6,
              vx: (fromLeft ? 1 : -1) * (92 + k * 18),
              vy: 34 + Math.random() * 24,
              color: 'white',
              age: 0,
              maxAge: 4,
            });
          }
        }
        return;
      }

      // METTATON EX
      if (boss.id === 'mettaton') {
        if (mode === 'yellow') {
          const colX = 28 + Math.floor(Math.random() * 9) * 32;
          const roll = stepCount % 4;
          if (roll === 0) {
            hazards.push({
              kind: 'bomb',
              x: colX,
              y: -14,
              w: 18,
              h: 18,
              vx: 0,
              vy: 66,
              color: 'red',
              hp: 1,
              age: 0,
              maxAge: 1.5,
            });
          } else if (roll === 3) {
            hazards.push({
              kind: 'pinkheart',
              x: colX,
              y: -14,
              w: 16,
              h: 16,
              vx: (Math.random() - 0.5) * 22,
              vy: 74,
              color: 'pink',
              hp: 1,
              age: 0,
              maxAge: 3.2,
            });
          } else {
            hazards.push({
              kind: 'crate',
              x: colX,
              y: -16,
              w: 22,
              h: 22,
              vx: 0,
              vy: 68,
              color: 'white',
              hp: 2,
              maxHp: 2,
              age: 0,
              maxAge: 3.4,
            });
          }
        } else {
          const isCyan = stepCount % 2 === 0;
          hazards.push({
            kind: 'discolaser',
            x: W / 2,
            y: H / 2,
            w: 12,
            h: 12,
            vx: 0,
            vy: 0,
            angle: stepCount * 0.55,
            omega: (stepCount % 2 === 0 ? 1 : -1) * 1.15,
            color: isCyan ? 'cyan' : 'orange',
            age: 0,
            maxAge: 2.2,
          });
          if (stepCount % 3 === 1) {
            hazards.push({
              kind: 'bootwarn',
              x: 4,
              y: H - 30,
              w: W - 8,
              h: 26,
              vx: 0,
              vy: 0,
              color: 'pink',
              age: 0,
              maxAge: 0.52,
              fired: false,
            });
          }
        }
        return;
      }

      // ASGORE (Fire Curtains / Spirals when patternIdx !== 0)
      if (boss.id === 'asgore') {
        if (patternIdx !== 0) {
          const cx = W / 2 + Math.cos(stepCount * 0.9) * 80;
          const cy = 22;
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 + stepCount * 0.45;
            hazards.push({
              kind: 'fire',
              x: cx,
              y: cy,
              w: 11,
              h: 11,
              r: 5.5,
              vx: Math.cos(a) * 88,
              vy: Math.sin(a) * 88 + 20,
              color: 'white',
              age: 0,
              maxAge: 3.1,
            });
          }
        }
        return;
      }

      // MUFFET (Purple SOUL, 3 web lanes with clear telegraph warnings)
      if (boss.id === 'muffet') {
        const laneIdx = Math.floor(Math.random() * 3);
        const fromLeft = stepCount % 2 === 0;
        if (stepCount % 3 === 0) {
          hazards.push({
            kind: 'donut',
            x: fromLeft ? -12 : W + 12,
            y: WEB_LANES[laneIdx],
            w: 16,
            h: 16,
            r: 8,
            vx: (fromLeft ? 1 : -1) * 114,
            vy: (Math.random() > 0.5 ? 1 : -1) * 96,
            color: 'purple',
            age: 0,
            maxAge: 3.8,
          });
        } else if (stepCount % 4 === 1) {
          hazards.push({
            kind: 'croissant',
            x: fromLeft ? -10 : W + 10,
            y: WEB_LANES[laneIdx],
            w: 14,
            h: 14,
            r: 7,
            vx: (fromLeft ? 1 : -1) * 215,
            vy: laneIdx === 1 ? 18 : laneIdx === 0 ? 22 : -22,
            dirX: fromLeft ? -1 : 1,
            color: 'white',
            age: 0,
            maxAge: 3.4,
          });
        } else {
          // Edge warning indicator before spider sprints across!
          hazards.push({
            kind: 'spiderwarn',
            x: fromLeft ? 10 : W - 10,
            y: WEB_LANES[laneIdx],
            w: 14,
            h: 14,
            vx: fromLeft ? 1 : -1,
            vy: 0,
            color: 'purple',
            age: 0,
            maxAge: 0.4,
            fired: false,
          });
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      elapsed += dt;
      setDodgeProgress(Math.max(0, 1 - elapsed / waveDuration));

      if (elapsed >= waveDuration) {
        cancelAnimationFrame(raf);
        const nextTurn = turnRef.current + 1;
        setTurn(nextTurn);
        setBossQuip(null);
        setGlintColor(null);
        setGlintQueue([]);
        setHudHint(null);
        const lines = boss.statusLines;
        setNarration(lines[nextTurn % lines.length]);
        setPhase('menu');
        return;
      }

      // Asgore Eye-Glint Sequence choreography
      if (boss.id === 'asgore' && patternIdx === 0) {
        asgoreTimer -= dt;
        if (asgorePhase === 'glint' && asgoreTimer <= 0) {
          if (asgoreSeqStep < asgoreSequence.length) {
            const c = asgoreSequence[asgoreSeqStep];
            setGlintColor(c);
            setGlintQueue((prev) => [...prev, c]);
            playBattleSfx(c === 'cyan' ? 'glint_cyan' : 'glint_orange', mutedRef.current);
            asgoreSeqStep++;
            asgoreTimer = 0.42;
            if (asgoreSeqStep >= asgoreSequence.length) {
              asgorePhase = 'slash';
              asgoreSeqStep = 0;
              asgoreTimer = 0.55;
            }
          }
        } else if (asgorePhase === 'slash' && asgoreTimer <= 0) {
          setGlintColor(null);
          if (asgoreSeqStep < asgoreSequence.length) {
            const c = asgoreSequence[asgoreSeqStep];
            hazards.push({
              kind: 'tridentslash',
              x: asgoreSeqStep % 2 === 0 ? -40 : W + 40,
              y: 0,
              w: W,
              h: H,
              vx: asgoreSeqStep % 2 === 0 ? 1 : -1,
              vy: 0,
              color: c,
              age: 0,
              maxAge: 0.45,
            });
            playBattleSfx('slash', mutedRef.current);
            asgoreSeqStep++;
            asgoreTimer = 0.72;
          } else {
            asgoreSeqStep = 0;
            asgoreSequence = currentTurn % 2 === 0 ? ['orange', 'cyan', 'orange'] : ['cyan', 'orange', 'cyan'];
            setGlintQueue([]);
            asgorePhase = 'glint';
            asgoreTimer = 0.35;
          }
        }
      }

      // Input state
      const k = keysRef.current;
      const left = !!(k.ArrowLeft || k.a || k.A);
      const right = !!(k.ArrowRight || k.d || k.D);
      const up = !!(k.ArrowUp || k.w || k.W);
      const down = !!(k.ArrowDown || k.s || k.S);
      const actionHeld = !!(k[' '] || k.z || k.Z || k.Enter);

      const moveSpeed = speedBoostRef.current ? 178 : 148;
      soul.prevX = soul.x;
      soul.prevY = soul.y;
      if (soul.invuln > 0) soul.invuln = Math.max(0, soul.invuln - dt);

      if (mode === 'red' || mode === 'yellow') {
        if (pointerTargetRef.current.active) {
          const dx = pointerTargetRef.current.x - soul.x;
          const dy = pointerTargetRef.current.y - soul.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2) {
            const step = Math.min(dist, moveSpeed * 1.15 * dt);
            soul.x += (dx / dist) * step;
            soul.y += (dy / dist) * step;
          }
        } else {
          let mx = (right ? 1 : 0) - (left ? 1 : 0);
          let my = (down ? 1 : 0) - (up ? 1 : 0);
          if (mx !== 0 && my !== 0) {
            mx *= 0.7071;
            my *= 0.7071;
          }
          soul.x += mx * moveSpeed * dt;
          soul.y += my * moveSpeed * dt;
        }
        soul.x = clamp(soul.x, 10, W - 10);
        soul.y = clamp(soul.y, 12, H - 12);

        if (mode === 'yellow') {
          shotTimer -= dt;
          if ((actionHeld || pointerTargetRef.current.active || elapsed > 0.2) && shotTimer <= 0) {
            shotTimer = 0.22;
            shotCount++;
            lasers.push({ x: soul.x, y: soul.y - 8, vy: -340, power: shotCount % 5 === 0 });
            playBattleSfx('laser', mutedRef.current);
          }
        }
      } else if (mode === 'blue') {
        let mx = (right ? 1 : 0) - (left ? 1 : 0);
        if (pointerTargetRef.current.active) {
          const dx = pointerTargetRef.current.x - soul.x;
          if (Math.abs(dx) > 4) mx = Math.sign(dx);
          if (pointerTargetRef.current.y < soul.y - 24 && soul.grounded) {
            soul.vy = -275;
            soul.grounded = false;
          }
        }
        soul.x = clamp(soul.x + mx * moveSpeed * dt, 10, W - 10);

        if ((up || k[' ']) && soul.grounded) {
          soul.vy = -275;
          soul.grounded = false;
        }
        if (!(up || k[' ']) && soul.vy < -80 && !pointerTargetRef.current.active) {
          soul.vy *= 0.72;
        }
        soul.vy += 680 * dt;
        soul.y += soul.vy * dt;
        if (soul.y >= H - 14) {
          soul.y = H - 14;
          soul.vy = 0;
          soul.grounded = true;
        }
      } else if (mode === 'purple') {
        if (edgeUpRef.current) {
          soul.lane = Math.max(0, soul.lane - 1);
          edgeUpRef.current = false;
          playBattleSfx('move', mutedRef.current);
        }
        if (edgeDownRef.current) {
          soul.lane = Math.min(2, soul.lane + 1);
          edgeDownRef.current = false;
          playBattleSfx('move', mutedRef.current);
        }
        if (pointerTargetRef.current.active) {
          const dx = pointerTargetRef.current.x - soul.x;
          if (Math.abs(dx) > 3) {
            soul.x += Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed * dt);
          }
          let best = 0;
          let bestD = Infinity;
          WEB_LANES.forEach((ly, idx) => {
            const d = Math.abs(pointerTargetRef.current.y - ly);
            if (d < bestD) {
              bestD = d;
              best = idx;
            }
          });
          soul.lane = best;
        } else {
          const mx = (right ? 1 : 0) - (left ? 1 : 0);
          soul.x += mx * moveSpeed * dt;
        }
        soul.x = clamp(soul.x, 12, W - 12);
        const targetY = WEB_LANES[soul.lane];
        soul.y += (targetY - soul.y) * Math.min(1, 22 * dt);
      } else if (mode === 'green') {
        soul.x = W / 2;
        soul.y = H / 2;
        if (up) soul.shieldDir = 0;
        else if (right) soul.shieldDir = 1;
        else if (down) soul.shieldDir = 2;
        else if (left) soul.shieldDir = 3;
        else if (pointerTargetRef.current.active) {
          const dx = pointerTargetRef.current.x - soul.x;
          const dy = pointerTargetRef.current.y - soul.y;
          if (Math.abs(dx) > Math.abs(dy)) soul.shieldDir = dx > 0 ? 1 : 3;
          else soul.shieldDir = dy > 0 ? 2 : 0;
        }
      }

      // Spawn waves
      spawnTimer -= dt;
      const interval =
        boss.id === 'sans'
          ? mode === 'red'
            ? 0.92
            : 0.56
          : boss.id === 'undyne' && mode === 'green'
            ? 0.54
            : boss.id === 'undyne'
              ? 1.05
              : boss.id === 'papyrus'
                ? 0.62
                : boss.id === 'asgore'
                  ? 0.72
                  : boss.id === 'muffet'
                    ? 0.48
                    : boss.id === 'mettaton'
                      ? 0.65
                      : boss.id === 'toriel'
                        ? patternIdx === 0
                          ? 0.28
                          : 0.6
                        : 0.58;

      if (spawnTimer <= 0 && elapsed < waveDuration - 0.65) {
        spawnTimer = interval;
        spawnPatternStep();
      }

      if (boss.id === 'sans' && mode === 'red') {
        secondaryTimer -= dt;
        if (secondaryTimer <= 0 && elapsed < waveDuration - 0.7) {
          secondaryTimer = 0.9;
          hazards.push({
            kind: 'bone',
            x: -10,
            y: 12 + Math.random() * (H - 46),
            w: 10,
            h: 28,
            vx: 135,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 3.2,
          });
        }
      }

      // Yellow Laser updates
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.y += l.vy * dt;
        if (l.y < -12) {
          lasers.splice(i, 1);
          continue;
        }
        for (let j = hazards.length - 1; j >= 0; j--) {
          const h = hazards[j];
          if (h.kind !== 'crate' && h.kind !== 'pinkheart' && h.kind !== 'bomb') continue;
          const bw = l.power ? 8 : 3;
          if (l.x + bw >= h.x && l.x - bw <= h.x + h.w && l.y >= h.y && l.y <= h.y + h.h) {
            lasers.splice(i, 1);
            if (h.kind === 'pinkheart') {
              addBurst(h.x + h.w / 2, h.y + h.h / 2, '#F472B6', 8);
              playBattleSfx('heal', mutedRef.current);
              const healed = Math.min(boss.playerMaxHp, playerHpRef.current + 1);
              playerHpRef.current = healed;
              setPlayerHp(healed);
              const nr = ratingsRef.current + 400;
              ratingsRef.current = nr;
              setRatings(nr);
              hazards.splice(j, 1);
            } else if (h.kind === 'bomb') {
              hazards.splice(j, 1);
              playBattleSfx('blaster', mutedRef.current);
              triggerShake();
              hazards.push(
                { kind: 'explosion', x: 0, y: h.y + 4, w: W, h: 10, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
                { kind: 'explosion', x: h.x + 4, y: 0, w: 10, h: H, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
              );
            } else {
              h.hp = (h.hp ?? 1) - (l.power ? 2 : 1);
              addBurst(l.x, l.y, '#FACC15', 5);
              if (h.hp <= 0) {
                addBurst(h.x + h.w / 2, h.y + h.h / 2, '#F8FAFC', 8);
                const nr = ratingsRef.current + 150;
                ratingsRef.current = nr;
                setRatings(nr);
                hazards.splice(j, 1);
              }
            }
            break;
          }
        }
      }

      const playerMoved = Math.hypot(soul.x - soul.prevX, soul.y - soul.prevY) > 0.38;

      // Find nearest incoming spear in Green mode to highlight it red (Undertale cue!)
      let nearestSpearIdx = -1;
      let nearestSpearDist = Infinity;
      if (mode === 'green') {
        hazards.forEach((h, idx) => {
          if (h.kind !== 'spear') return;
          const d = Math.hypot(h.x - soul.x, h.y - soul.y);
          if (d < nearestSpearDist) {
            nearestSpearDist = d;
            nearestSpearIdx = idx;
          }
        });
      }

      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        h.age += dt;

        if (h.kind === 'slamwarn' && h.age >= h.maxAge && !h.fired) {
          h.fired = true;
          playBattleSfx('slam', mutedRef.current);
          triggerShake();
          hazards.push({
            kind: 'slamspikes',
            x: 4,
            y: H - 38,
            w: W - 8,
            h: 34,
            vx: 0,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 0.42,
          });
          hazards.splice(i, 1);
          continue;
        }

        if (h.kind === 'bootwarn' && h.age >= h.maxAge && !h.fired) {
          h.fired = true;
          hazards.push({
            kind: 'boot',
            x: -24,
            y: H - 28,
            w: 24,
            h: 24,
            vx: 290,
            vy: 0,
            color: 'pink',
            age: 0,
            maxAge: 1.4,
          });
          hazards.splice(i, 1);
          continue;
        }

        if (h.kind === 'spiderwarn' && h.age >= h.maxAge && !h.fired) {
          h.fired = true;
          const goRight = h.vx > 0;
          hazards.push({
            kind: 'spider',
            x: goRight ? -10 : W + 10,
            y: h.y,
            w: 14,
            h: 14,
            r: 7,
            vx: (goRight ? 1 : -1) * 168,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 2.8,
          });
          hazards.splice(i, 1);
          continue;
        }

        if (h.age >= h.maxAge) {
          if (h.kind === 'bomb') {
            playBattleSfx('blaster', mutedRef.current);
            triggerShake();
            hazards.push(
              { kind: 'explosion', x: 0, y: h.y + 4, w: W, h: 10, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
              { kind: 'explosion', x: h.x + 4, y: 0, w: 10, h: H, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
            );
          }
          hazards.splice(i, 1);
          continue;
        }

        // Toriel mercy safeguard at low HP
        if (boss.id === 'toriel' && h.kind === 'fire' && playerHpRef.current <= 3) {
          const dx = h.x - soul.x;
          const dy = h.y - soul.y;
          const d = Math.hypot(dx, dy);
          if (d < 42 && d > 0.1) {
            h.vx += (dx / d) * 210 * dt;
            h.vy += (dy / d) * 210 * dt;
          }
        }

        if (h.kind === 'croissant' && h.dirX) {
          h.vx += h.dirX * 320 * dt;
        }

        if (h.kind === 'donut') {
          if (h.y < 14 || h.y > H - 14) h.vy *= -1;
        }

        // Smooth curved flip for Yellow Undyne Spears!
        if (h.kind === 'spear' && h.yellowFlip && !h.flipped) {
          const d = Math.hypot(h.x - W / 2, h.y - H / 2);
          if (d < 56) {
            h.flipped = true;
            h.flipProgress = 0;
          }
        }
        if (h.kind === 'spear' && h.yellowFlip && h.flipped && (h.flipProgress ?? 1) < 1) {
          h.flipProgress = Math.min(1, (h.flipProgress ?? 0) + dt * 4.5);
          const curAng = Math.atan2(h.y - H / 2, h.x - W / 2);
          const rad = Math.hypot(h.x - W / 2, h.y - H / 2);
          const nextAng = curAng + Math.PI * dt * 4.5;
          h.x = W / 2 + Math.cos(nextAng) * rad;
          h.y = H / 2 + Math.sin(nextAng) * rad;
          if (h.flipProgress >= 1) {
            const toCenterA = Math.atan2(H / 2 - h.y, W / 2 - h.x);
            h.vx = Math.cos(toCenterA) * 136;
            h.vy = Math.sin(toCenterA) * 136;
          }
          continue;
        }

        if (h.kind === 'blaster') {
          if (h.age >= 0.62 && !h.fired) {
            h.fired = true;
            playBattleSfx('blaster', mutedRef.current);
            triggerShake();
          }
          if (h.fired && h.angle !== undefined) {
            const bx2 = h.x + Math.cos(h.angle) * 460;
            const by2 = h.y + Math.sin(h.angle) * 460;
            if (distToSegment(soul.x, soul.y, h.x, h.y, bx2, by2) < 13) {
              hurtSoul(boss.atkDamage);
            }
          }
          continue;
        }

        if (h.kind === 'tridentslash') {
          const checkRule = h.color === 'cyan' ? playerMoved : h.color === 'orange' ? !playerMoved : true;
          if (h.age > 0.08 && h.age < 0.34 && checkRule) {
            hurtSoul(boss.atkDamage);
          }
          continue;
        }

        if (h.kind === 'discolaser') {
          h.angle = (h.angle ?? 0) + (h.omega ?? 1) * dt;
          if (h.age > 0.35 && h.angle !== undefined) {
            const x1 = h.x - Math.cos(h.angle) * 260;
            const y1 = h.y - Math.sin(h.angle) * 260;
            const x2 = h.x + Math.cos(h.angle) * 260;
            const y2 = h.y + Math.sin(h.angle) * 260;
            if (distToSegment(soul.x, soul.y, x1, y1, x2, y2) < 7) {
              const shouldHit = h.color === 'cyan' ? playerMoved : h.color === 'orange' ? !playerMoved : true;
              if (shouldHit) hurtSoul(boss.atkDamage);
            }
          }
          continue;
        }

        h.x += h.vx * dt;
        h.y += h.vy * dt;

        if (h.kind === 'slamwarn' || h.kind === 'bootwarn' || h.kind === 'spiderwarn') {
          continue;
        }

        // Green shield blocking
        if (mode === 'green' && h.kind === 'spear') {
          const d = Math.hypot(h.x - soul.x, h.y - soul.y);
          if (d <= 25 && d >= 11) {
            const fx = h.x - soul.x;
            const fy = h.y - soul.y;
            const approachDir = Math.abs(fx) > Math.abs(fy) ? (fx > 0 ? 1 : 3) : fy > 0 ? 2 : 0;
            if (approachDir === soul.shieldDir) {
              playBattleSfx('clang', mutedRef.current);
              addBurst(h.x, h.y, '#22C55E', 7);
              hazards.splice(i, 1);
              continue;
            }
          }
          if (d <= 8) {
            hazards.splice(i, 1);
            hurtSoul(boss.atkDamage);
            continue;
          }
          continue;
        }

        let hit = false;
        if (h.r !== undefined) {
          hit = Math.hypot(soul.x - h.x, soul.y - h.y) <= h.r + 4;
        } else {
          hit = circleRectHit(soul.x, soul.y, 4.5, h.x, h.y, h.w, h.h);
        }

        if (hit) {
          const checkRule =
            h.color === 'cyan' ? playerMoved : h.color === 'orange' ? !playerMoved : true;
          if (checkRule) {
            hurtSoul(boss.atkDamage);
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // ---------- DRAW ARENA ----------
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      if (mode === 'purple') {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.78)';
        ctx.lineWidth = 2;
        for (const ly of WEB_LANES) {
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(W, ly);
          ctx.stroke();
        }
      }

      if (mode === 'green') {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(soul.x, soul.y, 17, 0, Math.PI * 2);
        ctx.stroke();

        const baseA = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][soul.shieldDir];
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(soul.x, soul.y, 21, baseA - 0.72, baseA + 0.72);
        ctx.stroke();
      }

      if (boss.id === 'toriel' && patternIdx === 0) {
        // Draw hovering white paws at top of arena
        for (const px of [pawX1, pawX2]) {
          ctx.fillStyle = '#F8FAFC';
          ctx.beginPath();
          ctx.arc(px, 12, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      hazards.forEach((h, hIdx) => {
        const col = getHazardCssColor(h.color);

        if (h.kind === 'blaster') {
          const ang = h.angle ?? 0;
          const slide = Math.min(1, h.age / 0.25);
          const drawX = h.x - Math.cos(ang) * (1 - slide) * 24;
          const drawY = h.y - Math.sin(ang) * (1 - slide) * 24;

          if (!h.fired) {
            ctx.save();
            ctx.strokeStyle = h.age > 0.4 ? 'rgba(56, 189, 248, 0.75)' : 'rgba(248, 250, 252, 0.35)';
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX + Math.cos(ang) * 460, drawY + Math.sin(ang) * 460);
            ctx.stroke();
            ctx.restore();
          } else {
            const beamW = Math.max(5, 26 * (1 - (h.age - 0.62) / (h.maxAge - 0.62)));
            ctx.save();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = beamW + 7;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX + Math.cos(ang) * 460, drawY + Math.sin(ang) * 460);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = beamW;
            ctx.beginPath();
            ctx.moveTo(drawX, drawY);
            ctx.lineTo(drawX + Math.cos(ang) * 460, drawY + Math.sin(ang) * 460);
            ctx.stroke();
            ctx.restore();
          }
          drawGasterBlaster(ctx, drawX, drawY, ang, h.fired ? 1 : h.age > 0.45 ? 0.5 : 0, !h.fired);
          return;
        }

        if (h.kind === 'tridentslash') {
          const p = h.age / h.maxAge;
          const sx = h.vx > 0 ? W * p : W * (1 - p);
          ctx.save();
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = col;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.arc(sx, H / 2, H * 0.6, -Math.PI * 0.45, Math.PI * 0.45, h.vx < 0);
          ctx.stroke();
          ctx.restore();
          return;
        }

        if (h.kind === 'slamwarn' || h.kind === 'bootwarn') {
          const flash = Math.floor(h.age * 16) % 2 === 0;
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = 2;
          ctx.globalAlpha = flash ? 0.9 : 0.35;
          ctx.strokeRect(h.x, h.y, h.w, h.h);
          ctx.fillStyle = col;
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', h.x + h.w / 2, h.y + h.h / 2 + 5);
          ctx.restore();
          return;
        }

        if (h.kind === 'slamspikes') {
          ctx.fillStyle = '#F8FAFC';
          for (let sx = h.x; sx < h.x + h.w; sx += 12) {
            ctx.fillRect(sx + 2, h.y, 6, h.h);
            ctx.fillRect(sx, h.y, 10, 4);
          }
          return;
        }

        if (h.kind === 'spiderwarn') {
          const flash = Math.floor(h.age * 18) % 2 === 0;
          ctx.save();
          ctx.fillStyle = flash ? '#C084FC' : '#F8FAFC';
          ctx.font = 'bold 13px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('!', h.x, h.y + 4);
          ctx.restore();
          return;
        }

        if (h.kind === 'explosion') {
          ctx.save();
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.restore();
          return;
        }

        if (h.kind === 'discolaser' && h.angle !== undefined) {
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = h.age < 0.35 ? 2 : 6;
          ctx.globalAlpha = h.age < 0.35 ? 0.35 : 0.92;
          ctx.beginPath();
          ctx.moveTo(h.x - Math.cos(h.angle) * 260, h.y - Math.sin(h.angle) * 260);
          ctx.lineTo(h.x + Math.cos(h.angle) * 260, h.y + Math.sin(h.angle) * 260);
          ctx.stroke();
          // Center disco ball
          ctx.fillStyle = '#E2E8F0';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }

        if (h.kind === 'bone') {
          ctx.fillStyle = col;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.fillRect(h.x - 2, h.y, h.w + 4, 4);
          ctx.fillRect(h.x - 2, h.y + h.h - 4, h.w + 4, 4);
        } else if (h.kind === 'dog') {
          // Annoying Dog sprite cameo!
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(h.x + 2, h.y + 6, 18, 10);
          ctx.fillRect(h.x + 2, h.y + 1, 8, 8);
          ctx.fillRect(h.x + 3, h.y + 16, 4, 4);
          ctx.fillRect(h.x + 15, h.y + 16, 4, 4);
          ctx.fillStyle = '#090D16';
          ctx.fillRect(h.x + 4, h.y + 4, 2, 2);
        } else if (h.kind === 'boot') {
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(h.x + 6, h.y, 12, 16);
          ctx.fillRect(h.x + 6, h.y + 16, 18, 8);
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(h.x + 8, h.y + 2, 8, 4);
        } else if (h.kind === 'spear') {
          ctx.save();
          const a =
            h.kind === 'spear' && mode === 'green'
              ? Math.atan2(soul.y - h.y, soul.x - h.x)
              : h.angle ?? Math.atan2(h.vy, h.vx);
          ctx.translate(h.x, h.y);
          ctx.rotate(a);
          const isNearestRed = mode === 'green' && hIdx === nearestSpearIdx;
          ctx.fillStyle = isNearestRed ? '#EF4444' : h.yellowFlip ? '#FACC15' : col;
          ctx.fillRect(-10, -2, 16, 4);
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.lineTo(2, -5);
          ctx.lineTo(2, 5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (h.kind === 'fire') {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.r ?? 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FDBA74';
          ctx.beginPath();
          ctx.arc(h.x, h.y - 1, (h.r ?? 6) * 0.48, 0, Math.PI * 2);
          ctx.fill();
        } else if (h.kind === 'crate') {
          ctx.fillStyle = (h.hp ?? 2) < (h.maxHp ?? 2) ? '#CBD5E1' : '#F8FAFC';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4);
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(h.x + h.w / 2 - 3, h.y + h.h / 2 - 3, 6, 6);
        } else if (h.kind === 'pinkheart') {
          drawPixelHeart(ctx, h.x + h.w / 2, h.y + h.h / 2, '#F472B6');
        } else if (h.kind === 'bomb') {
          // Cross-blast telegraph reticle before bomb explodes
          if (h.age > 1.0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, h.y + h.h / 2);
            ctx.lineTo(W, h.y + h.h / 2);
            ctx.moveTo(h.x + h.w / 2, 0);
            ctx.lineTo(h.x + h.w / 2, H);
            ctx.stroke();
            ctx.restore();
          }
          ctx.fillStyle = Math.floor(h.age * 10) % 2 === 0 ? '#EF4444' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#090D16';
          ctx.fillRect(h.x + h.w / 2 - 1, h.y + 4, 2, h.h - 8);
          ctx.fillRect(h.x + 4, h.y + h.h / 2 - 1, h.w - 8, 2);
        } else if (h.kind === 'spider') {
          ctx.fillStyle = '#E9D5FF';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = 1.5;
          for (let lx = -1; lx <= 1; lx += 2) {
            ctx.beginPath();
            ctx.moveTo(h.x + lx * 4, h.y);
            ctx.lineTo(h.x + lx * 8, h.y - 5);
            ctx.moveTo(h.x + lx * 4, h.y + 1);
            ctx.lineTo(h.x + lx * 8, h.y + 5);
            ctx.stroke();
          }
        } else if (h.kind === 'donut') {
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        } else if (h.kind === 'croissant') {
          ctx.fillStyle = '#FBBF24';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6, 0, Math.PI * 1.4);
          ctx.fill();
        }
      });

      // Lasers
      for (const l of lasers) {
        ctx.fillStyle = l.power ? '#FDE047' : '#FACC15';
        ctx.fillRect(l.x - (l.power ? 3 : 1.5), l.y - 6, l.power ? 6 : 3, 13);
      }

      // Particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // SOUL Heart
      const showSoul = soul.invuln <= 0 || Math.floor(soul.invuln * 20) % 2 === 0;
      if (showSoul) {
        const soulHex =
          mode === 'blue'
            ? '#3B82F6'
            : mode === 'green'
              ? '#22C55E'
              : mode === 'purple'
                ? '#C084FC'
                : mode === 'yellow'
                  ? '#FACC15'
                  : '#EF4444';
        drawPixelHeart(ctx, soul.x, soul.y, soulHex, mode === 'yellow');
      }

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activeSoulMode, boss.atkDamage, boss.hasKarma, boss.id, boss.playerMaxHp, boss.statusLines, phase, triggerShake]);

  // Menu Actions
  const triggerMenuAction = useCallback(
    (action: MainAction) => {
      playBattleSfx('select', mutedRef.current);
      if (action === 'FIGHT') {
        setPhase('fight_aim');
        return;
      }
      if (action === 'MERCY' && !asgoreMercyUnlocked) {
        playBattleSfx('shatter', mutedRef.current);
        setNarration("* Asgore's trident glow blocks MERCY... Talk 3 times or weaken him first!");
        return;
      }
      setSubMenuAction(action);
      setSubIndex(0);
      setPhase('submenu');
    },
    [asgoreMercyUnlocked],
  );

  const confirmSubMenu = useCallback(
    (idx: number) => {
      playBattleSfx('select', mutedRef.current);
      if (subMenuAction === 'ACT') {
        if (idx === 0) {
          setNarration(boss.checkText);
          setPhase('message');
          return;
        }
        const act = boss.acts[idx - 1];
        if (!act) return;
        const nextSpare = spareProgress + act.spareGain;
        setSpareProgress(nextSpare);
        setBossQuip(act.quip);
        if (boss.hasRatings) {
          const boost = idx === 1 ? 1800 : 2800;
          ratingsRef.current += boost;
          setRatings(ratingsRef.current);
          playBattleSfx('ratings', mutedRef.current);
        }
        if (nextSpare >= boss.spareTarget) {
          setNarration(`${act.narration} ${boss.spareReadyLine}`);
        } else {
          setNarration(act.narration);
        }
        setPhase('message');
      } else if (subMenuAction === 'ITEM') {
        const chosen = itemsLeft[idx];
        if (!chosen) return;
        playBattleSfx('heal', mutedRef.current);
        setPlayerHp((hp) => {
          const next = Math.min(boss.playerMaxHp, hp + chosen.heal);
          playerHpRef.current = next;
          return next;
        });
        karmaRef.current = 0;
        setKarma(0);
        if (chosen.speedBoost) setSpeedBoost(true);
        setItemsLeft((prev) => prev.filter((_, i) => i !== idx));
        setNarration(chosen.flavor);
        setPhase('message');
      } else if (subMenuAction === 'MERCY') {
        if (idx === 0) {
          if (isSpareReady) {
            finishVictory('SPARE');
          } else {
            setNarration('* Their name is not yellow yet! Keep acting or weakening them.');
            setPhase('menu');
          }
        } else {
          setNarration('* Escape is cut off by the barrier! Finish the Daily Encounter!');
          setPhase('menu');
        }
      }
    },
    [boss, finishVictory, isSpareReady, itemsLeft, spareProgress, subMenuAction],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;

      if (phase === 'dodge') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          if (!e.repeat) edgeUpRef.current = true;
          e.preventDefault();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          if (!e.repeat) edgeDownRef.current = true;
          e.preventDefault();
        } else if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D', ' '].includes(e.key)) {
          e.preventDefault();
        }
        return;
      }

      const actions: MainAction[] = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
      if (phase === 'menu') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setMenuIndex((i) => (i + 3) % 4);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setMenuIndex((i) => (i + 1) % 4);
        } else if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          triggerMenuAction(actions[menuIndex]);
        }
      } else if (phase === 'submenu') {
        const count =
          subMenuAction === 'ACT' ? 3 : subMenuAction === 'ITEM' ? itemsLeft.length : 2;
        if (e.key === 'Escape' || e.key === 'x' || e.key === 'X' || e.key === 'Shift') {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setPhase('menu');
        } else if (count > 0 && (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setSubIndex((i) => (i + 1) % count);
        } else if (count > 0 && (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setSubIndex((i) => (i - 1 + count) % count);
        } else if (
          count > 0 &&
          (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        ) {
          e.preventDefault();
          playBattleSfx('move', mutedRef.current);
          setSubIndex((i) => (i + 2) % count);
        } else if (count > 0 && (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ')) {
          e.preventDefault();
          confirmSubMenu(subIndex);
        }
      } else if (phase === 'message') {
        if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          playBattleSfx('select', mutedRef.current);
          startDodgePhase();
        }
      } else if (phase === 'fight_aim') {
        if (e.key === 'Enter' || e.key === 'z' || e.key === 'Z' || e.key === ' ') {
          e.preventDefault();
          resolveFightStrike();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    const onBlur = () => {
      keysRef.current = {};
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    confirmSubMenu,
    itemsLeft.length,
    menuIndex,
    phase,
    resolveFightStrike,
    startDodgePhase,
    subIndex,
    subMenuAction,
    triggerMenuAction,
  ]);

  const updatePointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * arenaW;
    const y = ((e.clientY - rect.top) / rect.height) * ARENA_H;
    pointerTargetRef.current = { active: true, x, y };
  };

  const holdVirtualKey = (key: string, pressed: boolean) => {
    keysRef.current[key] = pressed;
    if (pressed && key === 'ArrowUp') edgeUpRef.current = true;
    if (pressed && key === 'ArrowDown') edgeDownRef.current = true;
  };

  const handleShareVictory = () => {
    const methodLabel = victoryMethod === 'SPARE' ? '🕊️ SPARED' : '⚔️ DEFEATED';
    const tag = isDailyChallenge ? 'Daily Boss' : 'Practice Boss';
    share(
      `❤️ SOUL Duel (${tag}: ${boss.name}) — ${methodLabel} in ${turn + 1} turns with ${playerHp}/${boss.playerMaxHp} HP!${
        isDailyChallenge && save.streak > 1 ? ` 🔥${save.streak}` : ''
      }`,
    );
  };

  const hpPct = Math.max(0, Math.min(100, (bossHp / boss.maxHp) * 100));
  const effectiveYellowHp = Math.max(0, playerHp - karma);
  const yellowPct = Math.max(0, Math.min(100, (effectiveYellowHp / boss.playerMaxHp) * 100));
  const krPct = Math.max(0, Math.min(100 - yellowPct, (karma / boss.playerMaxHp) * 100));

  return (
    <motion.div
      key={screenShake}
      animate={
        screenShake > 0
          ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -3, 2, -2, 0] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.28 }}
      className="select-none rounded-2xl border-2 border-white/25 bg-[#040406] p-3 font-mono text-white shadow-2xl"
    >
      {/* Top challenge strip */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className="rounded-md px-2 py-0.5 font-bold uppercase tracking-wider text-black"
            style={{ backgroundColor: isDailyChallenge ? '#FACC15' : boss.accentColor }}
          >
            {isDailyChallenge ? '⭐ Daily Boss' : 'Practice'}
          </span>
          {save.streak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
              <Flame className="h-3 w-3" /> {save.streak}
            </span>
          )}
          {isDailyChallenge && save.clearedDate === todayKey && (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Cleared
            </span>
          )}
          {boss.hasRatings && (
            <span className="inline-flex items-center gap-1 rounded-md border border-pink-400/40 bg-pink-500/15 px-1.5 py-0.5 text-pink-300">
              <Tv className="h-3 w-3" /> {ratings.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <select
            aria-label="Choose boss"
            value={bossId}
            onChange={(e) => {
              resetBattle(e.target.value as BossId);
              e.currentTarget.blur();
            }}
            className="rounded border border-white/25 bg-black px-1.5 py-0.5 text-[11px] font-bold text-white outline-none hover:border-yellow-400"
          >
            {BOSSES.map((b) => (
              <option key={b.id} value={b.id} className="bg-black text-white">
                {b.id === dailyBoss.id ? `★ ${b.name} (Daily)` : b.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute battle SFX' : 'Mute battle SFX'}
            className="rounded border border-white/20 p-1 hover:border-white/50"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-zinc-400" /> : <Volume2 className="h-3.5 w-3.5 text-yellow-300" />}
          </button>
        </div>
      </div>

      {/* Classic Dark-Emerald Undertale Encounter Stage */}
      <div
        className="relative mb-2 flex min-h-[146px] flex-col items-center justify-center overflow-hidden rounded-lg border border-white/15 px-3 py-2"
        style={{
          backgroundColor: '#020504',
          backgroundImage: `
            radial-gradient(circle at 50% 45%, ${boss.stageTint}, transparent 70%),
            linear-gradient(rgba(34, 197, 94, 0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.14) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 26px 26px, 26px 26px',
        }}
      >
        <div className="mb-1 flex items-center gap-2 text-[11px]">
          <span className={`font-black tracking-wider ${isSpareReady ? 'text-yellow-300' : 'text-white'}`}>
            {boss.name.toUpperCase()}
          </span>
          <span className="text-[10px] text-zinc-400">— {boss.title}</span>
        </div>

        <div className="relative flex items-center justify-center gap-2">
          <BossPixelSprite
            bossId={boss.id}
            hurt={bossHurt}
            dodging={bossDodging}
            activeAttack={phase === 'dodge'}
            spareable={isSpareReady}
            tired={boss.id === 'sans' && fightAttempts >= 3}
            glintColor={glintColor}
          />

          {/* Curved Undertale Crescent Slash SVG */}
          <AnimatePresence>
            {slashAnim && (
              <motion.svg
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1.08 }}
                exit={{ opacity: 0 }}
                viewBox="0 0 120 110"
                className="pointer-events-none absolute inset-0 h-32 w-32"
              >
                <motion.line
                  x1="18"
                  y1="14"
                  x2="102"
                  y2="96"
                  stroke="#EF4444"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="130"
                  initial={{ strokeDashoffset: 130 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.18 }}
                />
                <motion.line
                  x1="21"
                  y1="14"
                  x2="100"
                  y2="93"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="130"
                  initial={{ strokeDashoffset: 130 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.16 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>

          {/* White Undertale Speech Bubble with Triangle Pointer */}
          <AnimatePresence>
            {bossQuip && (
              <motion.div
                key={bossQuip}
                initial={{ opacity: 0, scale: 0.85, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="relative ml-2 max-w-[175px] rounded-xl border-2 border-black bg-white px-2.5 py-2 text-[10px] font-bold leading-tight text-black shadow-lg"
              >
                <span className="absolute -left-2 top-3 h-0 w-0 border-y-[6px] border-r-[8px] border-y-transparent border-r-white" />
                {bossQuip}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Damage / MISS */}
          <AnimatePresence>
            {floatingDmg && (
              <motion.div
                key={floatingDmg.key}
                initial={{ opacity: 0, y: 6, scale: 0.85 }}
                animate={{ opacity: 1, y: -28, scale: 1.2 }}
                exit={{ opacity: 0, y: -42 }}
                transition={{ duration: 0.5 }}
                className="pointer-events-none absolute -top-3 text-xl font-black tracking-tight drop-shadow-[0_2px_0_#000]"
                style={{ color: floatingDmg.color }}
              >
                {floatingDmg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enemy HP Bar overlay on hit (or spare progress pill) */}
        <div className="mt-1 flex h-4 items-center gap-2">
          {showEnemyHpBar || bossHurt ? (
            <div className="h-2.5 w-32 overflow-hidden border border-white/60 bg-zinc-900">
              <motion.div
                className="h-full bg-[#22C55E]"
                animate={{ width: `${hpPct}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          ) : spareProgress > 0 ? (
            <span className="text-[10px] font-bold text-yellow-300">
              MERCY {Math.min(spareProgress, boss.spareTarget)}/{boss.spareTarget}
            </span>
          ) : null}
        </div>
      </div>

      {/* Mode Hint Banner + Asgore Glint Star Queue */}
      <div className="mb-1 flex h-5 items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 truncate font-bold text-cyan-300">
          {glintQueue.length > 0 && phase === 'dodge' ? (
            <span className="flex items-center gap-1">
              SEQUENCE:
              {glintQueue.map((c, idx) => (
                <span
                  key={idx}
                  className="inline-block h-2.5 w-2.5 rotate-45 border border-white"
                  style={{ backgroundColor: c === 'cyan' ? '#22D3EE' : '#FB923C' }}
                />
              ))}
            </span>
          ) : (
            <span>
              {phase === 'dodge' && hudHint
                ? hudHint
                : phase === 'fight_aim'
                  ? 'HIT GREEN BULLSEYE FOR MAX CRIT!'
                  : `TURN ${turn + 1}`}
            </span>
          )}
        </div>
        {phase === 'dodge' && (
          <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-white transition-all duration-75" style={{ width: `${dodgeProgress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Dynamic Resizing Crisp White Battle Box */}
      <div
        className="relative mx-auto flex h-[175px] w-full items-center justify-center overflow-hidden border-[4px] border-white bg-black transition-[max-width] duration-200"
        style={{ maxWidth: isShieldArena ? '224px' : '370px' }}
      >
        {phase === 'menu' && (
          <div className="h-full w-full p-3 text-xs leading-relaxed text-white">
            <p>{displayedText}</p>
            {isSpareReady && (
              <p className="mt-2 text-[11px] font-bold text-yellow-300">
                * {boss.name}&apos;s name is YELLOW! You can SPARE now.
              </p>
            )}
          </div>
        )}

        {phase === 'submenu' && (
          <div className="grid h-full w-full grid-cols-2 content-start gap-2 p-3 text-xs">
            {subMenuAction === 'ACT' &&
              ['Check', boss.acts[0].name, boss.acts[1].name].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => confirmSubMenu(idx)}
                  onMouseEnter={() => setSubIndex(idx)}
                  className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-left font-bold ${
                    subIndex === idx ? 'bg-yellow-400/15 text-yellow-300' : 'text-white hover:text-yellow-200'
                  }`}
                >
                  <span className="text-red-500">{subIndex === idx ? '♥' : ' '}</span> * {label}
                </button>
              ))}

            {subMenuAction === 'ITEM' &&
              (itemsLeft.length > 0 ? (
                itemsLeft.map((it, idx) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => confirmSubMenu(idx)}
                    onMouseEnter={() => setSubIndex(idx)}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-[11px] font-bold ${
                      subIndex === idx ? 'bg-yellow-400/15 text-yellow-300' : 'text-white hover:text-yellow-200'
                    }`}
                  >
                    <span>
                      <span className="text-red-500">{subIndex === idx ? '♥' : ' '}</span>* {it.name}
                    </span>
                    <span className="text-emerald-400">+{it.heal}</span>
                  </button>
                ))
              ) : (
                <p className="col-span-2 p-2 text-zinc-400">* Your bag is empty.</p>
              ))}

            {subMenuAction === 'MERCY' &&
              [
                { label: 'Spare', highlight: isSpareReady },
                { label: 'Flee', highlight: false },
              ].map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => confirmSubMenu(idx)}
                  onMouseEnter={() => setSubIndex(idx)}
                  className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-left font-bold ${
                    opt.highlight
                      ? 'text-yellow-300'
                      : subIndex === idx
                        ? 'bg-yellow-400/15 text-yellow-200'
                        : 'text-white'
                  }`}
                >
                  <span className="text-red-500">{subIndex === idx ? '♥' : ' '}</span> * {opt.label}
                </button>
              ))}

            <button
              type="button"
              onClick={() => setPhase('menu')}
              className="col-span-2 mt-auto w-fit rounded border border-white/25 px-2.5 py-1 text-[10px] text-zinc-300 hover:border-white"
            >
              [X / Esc] Back
            </button>
          </div>
        )}

        {phase === 'message' && (
          <button
            type="button"
            onClick={() => {
              playBattleSfx('select', muted);
              startDodgePhase();
            }}
            className="flex h-full w-full flex-col justify-between p-3 text-left text-xs leading-relaxed text-white"
          >
            <span>{displayedText}</span>
            <span className="animate-pulse self-end text-[11px] font-bold text-yellow-300">
              [Enter / Tap to continue ▶]
            </span>
          </button>
        )}

        {(phase === 'fight_aim' || phase === 'fight_slash') && (
          <button
            type="button"
            onClick={() => resolveFightStrike()}
            className="relative flex h-full w-full flex-col items-center justify-center bg-black p-3"
          >
            {/* Undertale Oval Accuracy Target */}
            <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-[999px] border-2 border-white/45 bg-gradient-to-r from-red-600/40 via-emerald-500/45 to-red-600/40">
              <div className="h-full w-20 border-x border-amber-300/40 bg-amber-400/15" />
              <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 border-x-2 border-yellow-300 bg-emerald-400/50" />
              <div
                className="absolute inset-y-0 w-2.5 -translate-x-1/2 border border-black bg-white shadow-[0_0_12px_#fff]"
                style={{ left: `${aimPos * 100}%` }}
              />
            </div>
            <span className="mt-2 text-[11px] font-bold text-yellow-300">
              {phase === 'fight_aim' ? '[SPACE / TAP TO STRIKE!]' : 'STRIKING...'}
            </span>
          </button>
        )}

        {phase === 'dodge' && (
          <canvas
            ref={canvasRef}
            onPointerDown={updatePointerPos}
            onPointerMove={(e) => {
              if (e.buttons > 0 || e.pointerType === 'touch') updatePointerPos(e);
            }}
            onPointerUp={() => {
              pointerTargetRef.current.active = false;
            }}
            onPointerLeave={() => {
              pointerTargetRef.current.active = false;
            }}
            className="h-full w-full touch-none cursor-crosshair"
          />
        )}

        {phase === 'victory' && (
          <div className="flex h-full w-full flex-col items-center justify-between p-3 text-center">
            <div>
              <p className="text-sm font-black tracking-widest text-yellow-300">YOU WON!</p>
              <p className="mt-1 text-[11px] text-zinc-200">{displayedText}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareVictory}
                className="inline-flex items-center gap-1 rounded bg-[#22C55E] px-3 py-1.5 text-xs font-bold text-black hover:brightness-110"
              >
                <Share2 className="h-3.5 w-3.5" /> Share Victory
              </button>
              <button
                type="button"
                onClick={() => resetBattle(boss.id)}
                className="inline-flex items-center gap-1 rounded border border-white/40 px-2.5 py-1.5 text-xs font-bold hover:border-white"
              >
                <RotateCcw className="h-3 w-3" /> Rematch
              </button>
            </div>
          </div>
        )}

        {phase === 'gameover' && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-3 text-center">
            <motion.div
              initial={{ scale: 1.3, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              className="text-xl font-black tracking-widest text-red-500"
            >
              💔 GAME OVER
            </motion.div>
            <p className="text-[11px] text-zinc-300">You cannot give up just yet... Stay determined!</p>
            <button
              type="button"
              onClick={() => resetBattle(boss.id)}
              className="rounded border-2 border-yellow-400 bg-yellow-400/15 px-4 py-1 text-xs font-bold text-yellow-300 hover:bg-yellow-400/25"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Touch / Mouse Arcade Pad for Dodge Phase */}
      {phase === 'dodge' && (
        <div className="mt-2 flex items-center justify-center gap-2">
          {[
            { k: 'ArrowLeft', label: '◀' },
            { k: 'ArrowUp', label: activeSoulMode === 'blue' ? '▲ JUMP' : '▲' },
            { k: 'ArrowDown', label: '▼' },
            { k: 'ArrowRight', label: '▶' },
          ].map((btn) => (
            <button
              key={btn.k}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                holdVirtualKey(btn.k, true);
              }}
              onPointerUp={() => holdVirtualKey(btn.k, false)}
              onPointerLeave={() => holdVirtualKey(btn.k, false)}
              onPointerCancel={() => holdVirtualKey(btn.k, false)}
              className="rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold active:bg-yellow-400 active:text-black"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      {/* Player HP / Karma Bar Strip */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
        <span>YOU</span>
        <span>LV 19</span>
        <span className="text-[10px] text-yellow-300">HP</span>
        <div className="flex h-3.5 w-28 overflow-hidden border border-white/30 bg-red-600">
          <div className="h-full bg-[#FFE600] transition-all duration-100" style={{ width: `${yellowPct}%` }} />
          {boss.hasKarma && karma > 0 && (
            <div className="h-full bg-[#D946EF] transition-all duration-100" style={{ width: `${krPct}%` }} />
          )}
        </div>
        {boss.hasKarma && <span className="text-[11px] font-black text-[#E879F9]">KR</span>}
        <span className={karma > 0 ? 'text-[#E879F9]' : 'text-white'}>
          {playerHp} / {boss.playerMaxHp}
        </span>
      </div>

      {/* Classic 4 Undertale Action Buttons */}
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {(['FIGHT', 'ACT', 'ITEM', 'MERCY'] as MainAction[]).map((action, idx) => {
          const active = (phase === 'menu' || phase === 'submenu') && menuIndex === idx;
          const lockedMercy = action === 'MERCY' && !asgoreMercyUnlocked;
          const spareHighlight = action === 'MERCY' && isSpareReady;
          const icon = action === 'FIGHT' ? '⚔' : action === 'ACT' ? '🔊' : action === 'ITEM' ? '🎒' : '✖';

          return (
            <button
              key={action}
              type="button"
              disabled={phase !== 'menu' && phase !== 'submenu'}
              onClick={() => {
                setMenuIndex(idx);
                triggerMenuAction(action);
              }}
              onMouseEnter={() => setMenuIndex(idx)}
              className={`relative flex items-center justify-center gap-1 overflow-hidden border-2 py-1.5 text-[11px] font-black tracking-wide transition ${
                lockedMercy
                  ? 'border-zinc-700 bg-zinc-950 text-zinc-600'
                  : active
                    ? 'border-[#FFE600] bg-[#FFE600]/15 text-[#FFE600]'
                    : spareHighlight
                      ? 'border-yellow-400 text-yellow-300'
                      : 'border-[#F97316] text-[#F97316] hover:border-[#FFE600] hover:text-[#FFE600]'
              } disabled:opacity-60`}
            >
              <span>{active ? '♥' : icon}</span>
              <span className={lockedMercy ? 'line-through' : ''}>{action}</span>
              {lockedMercy && (
                <svg viewBox="0 0 100 30" className="pointer-events-none absolute inset-0 h-full w-full">
                  <line x1="12" y1="2" x2="88" y2="28" stroke="#EF4444" strokeWidth="2" opacity="0.6" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
