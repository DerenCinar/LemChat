import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Share2, RotateCcw, Flame, CheckCircle2 } from 'lucide-react';
import {
  BATTLE_ITEMS,
  BOSSES,
  getBossDateKey,
  getDailyBoss,
  loadSoulBattleSave,
  playBattleSfx,
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
    | 'blaster'
    | 'slashwarn'
    | 'slashbeam'
    | 'floorspike'
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
  // Special fields for Undertale attacks
  dirX?: number;
  dirY?: number;
  angle?: number;
  omega?: number;
  yellowFlip?: boolean;
  flipped?: boolean;
  fired?: boolean;
  laneY?: number;
  baseY?: number;
  amp?: number;
  freq?: number;
  targetX?: number;
  targetY?: number;
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
}

const ARENA_W = 320;
const ARENA_H = 170;
const PLAYER_MAX_HP = 20;
const WEB_LANES = [40, 85, 130];

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
  // Classic crisp 12x11 pixel heart
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

  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [bossHp, setBossHp] = useState(boss.maxHp);
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
  const [victoryMethod, setVictoryMethod] = useState<'FIGHT' | 'SPARE'>('FIGHT');

  // FIGHT aim reticle state (0..1)
  const [aimPos, setAimPos] = useState(0);
  const aimRef = useRef({ pos: 0, dir: 1, active: false });

  // Dodge phase state
  const [activeSoulMode, setActiveSoulMode] = useState<SoulMode>(boss.soulModes[0]);
  const [hudHint, setHudHint] = useState<string | null>(null);
  const [dodgeProgress, setDodgeProgress] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const edgeUpRef = useRef(false);
  const edgeDownRef = useRef(false);
  const pointerTargetRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: ARENA_W / 2,
    y: ARENA_H / 2,
  });

  // Live synced battle refs for 60fps canvas loop
  const playerHpRef = useRef(playerHp);
  playerHpRef.current = playerHp;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const speedBoostRef = useRef(speedBoost);
  speedBoostRef.current = speedBoost;
  const turnRef = useRef(turn);
  turnRef.current = turn;

  const isSpareReady = spareProgress >= boss.spareTarget || bossHp <= Math.max(1, Math.floor(boss.maxHp * 0.25));
  const asgoreMercyUnlocked = boss.id !== 'asgore' || isSpareReady;

  const resetBattle = useCallback(
    (nextBossId: BossId = bossId) => {
      const nextBoss = BOSSES.find((b) => b.id === nextBossId) ?? dailyBoss;
      setBossId(nextBoss.id);
      setPhase('menu');
      setMenuIndex(0);
      setSubIndex(0);
      setPlayerHp(PLAYER_MAX_HP);
      playerHpRef.current = PLAYER_MAX_HP;
      setBossHp(nextBoss.maxHp);
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
      setHudHint(null);
      setActiveSoulMode(nextBoss.soulModes[0]);
    },
    [bossId, dailyBoss],
  );

  // Typewriter narration effect
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayedText(narration.slice(0, i));
      if (i >= narration.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [narration]);

  const finishVictory = useCallback(
    (method: 'FIGHT' | 'SPARE') => {
      playBattleSfx(method === 'SPARE' ? 'spare' : 'win', mutedRef.current);
      setVictoryMethod(method);
      setPhase('victory');
      setBossQuip(null);
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
      setHudHint('GREEN SOUL · ARROWS / WASD AIM SHIELD');
    } else if (chosenMode === 'blue') {
      setHudHint('BLUE SOUL · JUMP! CYAN=STOP ORANGE=MOVE');
    } else if (chosenMode === 'purple') {
      setHudHint('PURPLE SOUL · UP/DOWN SWITCHES WEB LINES');
    } else if (chosenMode === 'yellow') {
      setHudHint('YELLOW SOUL · AUTO-FIRE LASERS UPWARD!');
    } else if (boss.id === 'asgore' || boss.id === 'sans' || boss.id === 'mettaton') {
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
    const speed = boss.id === 'sans' ? 1.32 : 1.08;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!aimRef.current.active) return;
      aimRef.current.pos += aimRef.current.dir * speed * dt;
      if (aimRef.current.pos >= 0.98) {
        aimRef.current.pos = 0.98;
        aimRef.current.dir = -1;
      } else if (aimRef.current.pos <= 0.02) {
        // Complete one bounce then auto-resolve as weak hit/miss
        aimRef.current.active = false;
        resolveFightStrike(0.15);
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
      const accuracy = clamp(1 - dist * 2, 0.12, 1);

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
              setBossQuip('huff... alright, that got close.');
            }
            startDodgePhase();
          }, 820);
          return;
        }

        playBattleSfx('hit', mutedRef.current);
        setBossHurt(true);
        const isCrit = accuracy >= 0.86;
        const dmg =
          boss.id === 'sans'
            ? 9999999
            : Math.max(8, Math.round((24 + Math.random() * 8) * (0.45 + accuracy * 1.1)));
        const nextHp = Math.max(0, bossHp - dmg);
        setBossHp(nextHp);
        setFloatingDmg({
          text: isCrit ? `CRIT -${dmg}!` : `-${dmg}`,
          color: isCrit ? '#FACC15' : '#EF4444',
          key: Date.now(),
        });

        setTimeout(() => {
          setBossHurt(false);
          setFloatingDmg(null);
          if (nextHp <= 0) {
            finishVictory('FIGHT');
          } else {
            startDodgePhase();
          }
        }, 850);
      }, 360);
    },
    [boss.id, bossHp, fightAttempts, finishVictory, phase, startDodgePhase],
  );

  // Main 60fps Bullet-Hell Dodge Canvas Engine
  useEffect(() => {
    if (phase !== 'dodge') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = ARENA_W * dpr;
    canvas.height = ARENA_H * dpr;

    const mode = activeSoulMode;
    const currentTurn = turnRef.current;
    const patternIdx = currentTurn % 3;
    const waveDuration = 5.4;

    const soul = {
      x: mode === 'green' ? ARENA_W / 2 : ARENA_W / 2,
      y: mode === 'blue' ? ARENA_H - 14 : mode === 'purple' ? WEB_LANES[1] : mode === 'yellow' ? ARENA_H - 26 : ARENA_H / 2 + 12,
      vx: 0,
      vy: 0,
      prevX: ARENA_W / 2,
      prevY: ARENA_H / 2,
      lane: 1,
      shieldDir: 0, // 0=up, 1=right, 2=down, 3=left
      invuln: 0,
      grounded: mode === 'blue',
    };

    const hazards: Hazard[] = [];
    const lasers: LaserBolt[] = [];
    const particles: Particle[] = [];

    let elapsed = 0;
    let spawnTimer = 0.2;
    let shotTimer = 0.15;
    let secondaryTimer = 0.6;
    let stepCount = 0;
    let raf = 0;
    let lastTs = performance.now();

    const addBurst = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 40 + Math.random() * 85;
        particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0,
          maxLife: 0.32 + Math.random() * 0.2,
          color,
          size: 2.5,
        });
      }
    };

    const hurtSoul = (amount: number) => {
      if (soul.invuln > 0) return;
      soul.invuln = 0.85;
      playBattleSfx('hurt', mutedRef.current);
      addBurst(soul.x, soul.y, '#EF4444', 10);
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
          const fromRight = stepCount % 2 === 0;
          const vx = fromRight ? -135 : 135;
          const x = fromRight ? ARENA_W + 10 : -18;
          if (patternIdx === 2 && stepCount % 3 === 0) {
            const cColor: Hazard['color'] = stepCount % 6 === 0 ? 'cyan' : 'orange';
            hazards.push({
              kind: 'bone',
              x,
              y: 10,
              w: 12,
              h: ARENA_H - 18,
              vx,
              vy: 0,
              color: cColor,
              age: 0,
              maxAge: 3.5,
            });
          } else {
            const h = 24 + (stepCount % 3) * 10;
            hazards.push({
              kind: 'bone',
              x,
              y: ARENA_H - h - 4,
              w: 10,
              h,
              vx,
              vy: 0,
              color: 'white',
              age: 0,
              maxAge: 3.5,
            });
            // Top ceiling decorative/hazard bone leaving jump room
            hazards.push({
              kind: 'bone',
              x,
              y: 4,
              w: 10,
              h: 54,
              vx,
              vy: 0,
              color: 'white',
              age: 0,
              maxAge: 3.5,
            });
          }
        } else {
          // Red mode: Gaster Blasters aiming across SOUL + drifting bones
          const side = stepCount % 4;
          let bx = ARENA_W / 2;
          let by = 22;
          if (side === 0) {
            bx = clamp(soul.x + (Math.random() - 0.5) * 40, 28, ARENA_W - 28);
            by = 20;
          } else if (side === 1) {
            bx = ARENA_W - 20;
            by = clamp(soul.y + (Math.random() - 0.5) * 30, 26, ARENA_H - 26);
          } else if (side === 2) {
            bx = clamp(soul.x + (Math.random() - 0.5) * 40, 28, ARENA_W - 28);
            by = ARENA_H - 20;
          } else {
            bx = 20;
            by = clamp(soul.y + (Math.random() - 0.5) * 30, 26, ARENA_H - 26);
          }
          const ang = Math.atan2(soul.y - by, soul.x - bx);
          hazards.push({
            kind: 'blaster',
            x: bx,
            y: by,
            w: 22,
            h: 22,
            vx: 0,
            vy: 0,
            angle: ang,
            color: 'white',
            age: 0,
            maxAge: 1.05,
            fired: false,
          });
        }
        return;
      }

      // PAPYRUS (Blue SOUL)
      if (boss.id === 'papyrus') {
        const x = ARENA_W + 12;
        const speed = -125;
        if (stepCount % 4 === 0) {
          const isCyan = (stepCount / 4) % 2 === 1;
          hazards.push({
            kind: 'bone',
            x,
            y: 12,
            w: 13,
            h: ARENA_H - 18,
            vx: speed,
            vy: 0,
            color: isCyan ? 'cyan' : 'orange',
            age: 0,
            maxAge: 3.6,
          });
        } else {
          const tall = stepCount % 2 === 0;
          const h = tall ? 38 : 24;
          hazards.push({
            kind: 'bone',
            x,
            y: ARENA_H - h - 4,
            w: 11,
            h,
            vx: speed,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 3.6,
          });
        }
        return;
      }

      // UNDYNE
      if (boss.id === 'undyne') {
        if (mode === 'green') {
          // Cardinal spears aimed at (160, 85), with yellow reverse spears!
          const dir = Math.floor(Math.random() * 4);
          const isYellow = stepCount >= 3 && stepCount % 3 === 0;
          const dist = 165;
          const dx = [0, 1, 0, -1][dir];
          const dy = [-1, 0, 1, 0][dir];
          const speed = isYellow ? 145 : 155;
          hazards.push({
            kind: 'spear',
            x: ARENA_W / 2 + dx * dist,
            y: ARENA_H / 2 + dy * dist,
            w: 14,
            h: 14,
            vx: -dx * speed,
            vy: -dy * speed,
            dirX: -dx,
            dirY: -dy,
            color: isYellow ? 'yellow' : 'cyan',
            yellowFlip: isYellow,
            flipped: false,
            age: 0,
            maxAge: 2.5,
          });
        } else {
          // Red SOUL: closing spear ring around player
          const cx = soul.x;
          const cy = soul.y;
          const count = 6;
          const gapIdx = stepCount % count;
          for (let i = 0; i < count; i++) {
            if (i === gapIdx) continue;
            const a = (Math.PI * 2 * i) / count + stepCount * 0.25;
            const rad = 115;
            const sx = cx + Math.cos(a) * rad;
            const sy = cy + Math.sin(a) * rad;
            const spd = 82;
            hazards.push({
              kind: 'spear',
              x: sx,
              y: sy,
              w: 10,
              h: 10,
              vx: -Math.cos(a) * spd,
              vy: -Math.sin(a) * spd,
              angle: a + Math.PI,
              color: 'white',
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
          // Parabolic arcing fireballs from left & right
          const fromLeft = stepCount % 2 === 0;
          for (let k = 0; k < 2; k++) {
            hazards.push({
              kind: 'fire',
              x: fromLeft ? -6 : ARENA_W + 6,
              y: 26 + k * 28,
              w: 12,
              h: 12,
              r: 6,
              vx: (fromLeft ? 1 : -1) * (88 + k * 18),
              vy: 35 + Math.random() * 25,
              color: 'white',
              age: 0,
              maxAge: 4,
            });
          }
        } else {
          // Sweeping curtain from top with gap wave
          const gapX = ARENA_W / 2 + Math.sin(stepCount * 0.9) * 88;
          for (let x = 18; x < ARENA_W - 10; x += 34) {
            if (Math.abs(x - gapX) < 30) continue;
            hazards.push({
              kind: 'fire',
              x,
              y: -8,
              w: 12,
              h: 12,
              r: 6,
              vx: Math.cos(stepCount + x) * 18,
              vy: 86,
              color: 'white',
              age: 0,
              maxAge: 3,
            });
          }
        }
        return;
      }

      // METTATON EX
      if (boss.id === 'mettaton') {
        if (mode === 'yellow') {
          const colX = 28 + Math.floor(Math.random() * 8) * 34;
          const roll = stepCount % 4;
          if (roll === 0) {
            hazards.push({
              kind: 'bomb',
              x: colX,
              y: -14,
              w: 18,
              h: 18,
              vx: 0,
              vy: 64,
              color: 'red',
              hp: 1,
              age: 0,
              maxAge: 1.55,
            });
          } else if (roll === 3) {
            hazards.push({
              kind: 'pinkheart',
              x: colX,
              y: -14,
              w: 16,
              h: 16,
              vx: (Math.random() - 0.5) * 24,
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
              age: 0,
              maxAge: 3.4,
            });
          }
        } else {
          // Red mode: Rotating disco beams + Metta boots
          const isCyan = stepCount % 2 === 0;
          hazards.push({
            kind: 'discolaser',
            x: ARENA_W / 2,
            y: ARENA_H / 2,
            w: 12,
            h: 12,
            vx: 0,
            vy: 0,
            angle: stepCount * 0.5,
            omega: (stepCount % 2 === 0 ? 1 : -1) * 1.15,
            color: isCyan ? 'cyan' : 'orange',
            age: 0,
            maxAge: 2.2,
          });
        }
        return;
      }

      // ASGORE
      if (boss.id === 'asgore') {
        if (stepCount % 3 === 1) {
          // Glinting cyan/orange trident sweep!
          const horizontal = stepCount % 2 === 1;
          const col: Hazard['color'] = (stepCount / 3) % 2 >= 1 ? 'orange' : 'cyan';
          hazards.push({
            kind: 'slashwarn',
            x: horizontal ? 0 : soul.x - 45,
            y: horizontal ? soul.y - 36 : 0,
            w: horizontal ? ARENA_W : 90,
            h: horizontal ? 72 : ARENA_H,
            vx: 0,
            vy: 0,
            color: col,
            age: 0,
            maxAge: 0.72,
            fired: false,
          });
        } else {
          // Fire rain / rings
          const cx = ARENA_W / 2 + Math.cos(stepCount) * 75;
          const cy = 24;
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 + stepCount * 0.4;
            hazards.push({
              kind: 'fire',
              x: cx,
              y: cy,
              w: 11,
              h: 11,
              r: 5.5,
              vx: Math.cos(a) * 86,
              vy: Math.sin(a) * 86 + 22,
              color: 'white',
              age: 0,
              maxAge: 3.1,
            });
          }
        }
        return;
      }

      // MUFFET (Purple SOUL, 3 web lanes)
      if (boss.id === 'muffet') {
        const laneIdx = Math.floor(Math.random() * 3);
        const fromLeft = stepCount % 2 === 0;
        if (stepCount % 3 === 0) {
          // Bouncing Donut between top and bottom
          hazards.push({
            kind: 'donut',
            x: fromLeft ? -12 : ARENA_W + 12,
            y: WEB_LANES[laneIdx],
            w: 16,
            h: 16,
            r: 8,
            vx: (fromLeft ? 1 : -1) * 112,
            vy: (Math.random() > 0.5 ? 1 : -1) * 95,
            color: 'purple',
            age: 0,
            maxAge: 3.8,
          });
        } else if (stepCount % 4 === 1) {
          // Boomerang Croissant
          hazards.push({
            kind: 'croissant',
            x: fromLeft ? -10 : ARENA_W + 10,
            y: WEB_LANES[laneIdx],
            w: 14,
            h: 14,
            r: 7,
            vx: (fromLeft ? 1 : -1) * 210,
            vy: (laneIdx === 1 ? 18 : laneIdx === 0 ? 22 : -22),
            dirX: fromLeft ? -1 : 1,
            color: 'white',
            age: 0,
            maxAge: 3.4,
          });
        } else {
          // Spider scuttling along a web line
          hazards.push({
            kind: 'spider',
            x: fromLeft ? -12 : ARENA_W + 12,
            y: WEB_LANES[laneIdx],
            w: 14,
            h: 14,
            r: 7,
            vx: (fromLeft ? 1 : -1) * 145,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 3.2,
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
        setHudHint(null);
        const lines = boss.statusLines;
        setNarration(lines[nextTurn % lines.length]);
        setPhase('menu');
        return;
      }

      // Input state
      const k = keysRef.current;
      const left = !!(k.ArrowLeft || k.a || k.A);
      const right = !!(k.ArrowRight || k.d || k.D);
      const up = !!(k.ArrowUp || k.w || k.W);
      const down = !!(k.ArrowDown || k.s || k.S);
      const actionHeld = !!(k[' '] || k.z || k.Z || k.Enter);

      const moveSpeed = speedBoostRef.current ? 175 : 145;
      soul.prevX = soul.x;
      soul.prevY = soul.y;
      if (soul.invuln > 0) soul.invuln = Math.max(0, soul.invuln - dt);

      // Move SOUL according to SoulMode
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
        soul.x = clamp(soul.x, 10, ARENA_W - 10);
        soul.y = clamp(soul.y, 12, ARENA_H - 12);

        if (mode === 'yellow') {
          shotTimer -= dt;
          if ((actionHeld || pointerTargetRef.current.active || elapsed > 0.25) && shotTimer <= 0) {
            shotTimer = 0.24;
            lasers.push({ x: soul.x, y: soul.y - 8, vy: -330 });
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
        soul.x = clamp(soul.x + mx * moveSpeed * dt, 10, ARENA_W - 10);

        if ((up || k[' ']) && soul.grounded) {
          soul.vy = -275;
          soul.grounded = false;
        }
        if (!(up || k[' ']) && soul.vy < -80 && !pointerTargetRef.current.active) {
          soul.vy *= 0.72;
        }
        soul.vy += 680 * dt;
        soul.y += soul.vy * dt;
        if (soul.y >= ARENA_H - 14) {
          soul.y = ARENA_H - 14;
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
          // Closest web lane
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
        soul.x = clamp(soul.x, 12, ARENA_W - 12);
        const targetY = WEB_LANES[soul.lane];
        soul.y += (targetY - soul.y) * Math.min(1, 22 * dt);
      } else if (mode === 'green') {
        soul.x = ARENA_W / 2;
        soul.y = ARENA_H / 2;
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
            ? 0.85
            : 0.56
          : boss.id === 'undyne' && mode === 'green'
            ? 0.52
            : boss.id === 'undyne'
              ? 1.05
              : boss.id === 'papyrus'
                ? 0.62
                : boss.id === 'asgore'
                  ? 0.72
                  : boss.id === 'muffet'
                    ? 0.5
                    : boss.id === 'mettaton'
                      ? 0.65
                      : 0.68;

      if (spawnTimer <= 0 && elapsed < waveDuration - 0.65) {
        spawnTimer = interval;
        spawnPatternStep();
      }

      // Extra Sans bone stream in red mode
      if (boss.id === 'sans' && mode === 'red') {
        secondaryTimer -= dt;
        if (secondaryTimer <= 0 && elapsed < waveDuration - 0.7) {
          secondaryTimer = 0.95;
          hazards.push({
            kind: 'bone',
            x: -10,
            y: 12 + Math.random() * (ARENA_H - 46),
            w: 10,
            h: 28,
            vx: 130,
            vy: 0,
            color: 'white',
            age: 0,
            maxAge: 3.2,
          });
        }
      }

      // Update yellow lasers & check hits against crates/hearts/bombs
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
          if (l.x >= h.x && l.x <= h.x + h.w && l.y >= h.y && l.y <= h.y + h.h) {
            lasers.splice(i, 1);
            if (h.kind === 'pinkheart') {
              addBurst(h.x + h.w / 2, h.y + h.h / 2, '#F472B6', 8);
              playBattleSfx('heal', mutedRef.current);
              const healed = Math.min(PLAYER_MAX_HP, playerHpRef.current + 1);
              playerHpRef.current = healed;
              setPlayerHp(healed);
              hazards.splice(j, 1);
            } else if (h.kind === 'bomb') {
              hazards.splice(j, 1);
              playBattleSfx('blaster', mutedRef.current);
              hazards.push(
                { kind: 'explosion', x: 0, y: h.y + 4, w: ARENA_W, h: 10, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
                { kind: 'explosion', x: h.x + 4, y: 0, w: 10, h: ARENA_H, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
              );
            } else {
              h.hp = (h.hp ?? 1) - 1;
              addBurst(l.x, l.y, '#FACC15', 4);
              if (h.hp <= 0) {
                addBurst(h.x + h.w / 2, h.y + h.h / 2, '#F8FAFC', 8);
                hazards.splice(j, 1);
              }
            }
            break;
          }
        }
      }

      // Track if SOUL moved for Cyan / Orange rules
      const playerMoved = Math.hypot(soul.x - soul.prevX, soul.y - soul.prevY) > 0.38;

      // Update hazards & detect collisions
      for (let i = hazards.length - 1; i >= 0; i--) {
        const h = hazards[i];
        h.age += dt;
        if (h.age >= h.maxAge) {
          // Bomb explodes into cross blast on timeout
          if (h.kind === 'bomb') {
            playBattleSfx('blaster', mutedRef.current);
            hazards.push(
              { kind: 'explosion', x: 0, y: h.y + 4, w: ARENA_W, h: 10, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
              { kind: 'explosion', x: h.x + 4, y: 0, w: 10, h: ARENA_H, vx: 0, vy: 0, color: 'white', age: 0, maxAge: 0.25 },
            );
          }
          hazards.splice(i, 1);
          continue;
        }

        // Toriel mercy safeguard when player HP <= 2
        if (boss.id === 'toriel' && h.kind === 'fire' && playerHpRef.current <= 2) {
          const dx = h.x - soul.x;
          const dy = h.y - soul.y;
          const d = Math.hypot(dx, dy);
          if (d < 36 && d > 0.1) {
            h.vx += (dx / d) * 190 * dt;
            h.vy += (dy / d) * 190 * dt;
          }
        }

        if (h.kind === 'croissant' && h.dirX) {
          h.vx += h.dirX * 320 * dt;
        }

        if (h.kind === 'donut') {
          if (h.y < 14 || h.y > ARENA_H - 14) h.vy *= -1;
        }

        if (h.kind === 'spear' && h.yellowFlip && !h.flipped) {
          const d = Math.hypot(h.x - ARENA_W / 2, h.y - ARENA_H / 2);
          if (d < 66) {
            h.flipped = true;
            // Jump to opposite side at same radius and travel inward
            h.x = ARENA_W - h.x;
            h.y = ARENA_H - h.y;
            h.vx = -h.vx;
            h.vy = -h.vy;
            h.dirX = -(h.dirX ?? 0);
            h.dirY = -(h.dirY ?? 0);
          }
        }

        if (h.kind === 'blaster') {
          if (h.age >= 0.62 && !h.fired) {
            h.fired = true;
            playBattleSfx('blaster', mutedRef.current);
          }
          if (h.fired && h.angle !== undefined) {
            const bx2 = h.x + Math.cos(h.angle) * 440;
            const by2 = h.y + Math.sin(h.angle) * 440;
            if (distToSegment(soul.x, soul.y, h.x, h.y, bx2, by2) < 13) {
              hurtSoul(boss.atkDamage);
            }
          }
          continue;
        }

        if (h.kind === 'slashwarn') {
          if (h.age >= h.maxAge - 0.04 && !h.fired) {
            h.fired = true;
            hazards.push({
              kind: 'slashbeam',
              x: h.x,
              y: h.y,
              w: h.w,
              h: h.h,
              vx: 0,
              vy: 0,
              color: h.color,
              age: 0,
              maxAge: 0.24,
            });
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

        // Green shield blocking logic
        if (mode === 'green' && h.kind === 'spear') {
          const d = Math.hypot(h.x - soul.x, h.y - soul.y);
          if (d <= 24 && d >= 11) {
            // Which side is spear approaching FROM?
            const fx = h.x - soul.x;
            const fy = h.y - soul.y;
            const approachDir =
              Math.abs(fx) > Math.abs(fy) ? (fx > 0 ? 1 : 3) : fy > 0 ? 2 : 0;
            if (approachDir === soul.shieldDir) {
              playBattleSfx('clang', mutedRef.current);
              addBurst(h.x, h.y, '#22C55E', 6);
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

        // Standard hit test
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

      // Particles update
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

      // ---------- DRAW ----------
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);

      // Mode-specific arena decorations
      if (mode === 'purple') {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.75)';
        ctx.lineWidth = 2;
        for (const ly of WEB_LANES) {
          ctx.beginPath();
          ctx.moveTo(0, ly);
          ctx.lineTo(ARENA_W, ly);
          ctx.stroke();
        }
      }

      if (mode === 'green') {
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(soul.x, soul.y, 17, 0, Math.PI * 2);
        ctx.stroke();

        // Active shield arc
        const baseA = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][soul.shieldDir];
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(soul.x, soul.y, 21, baseA - 0.68, baseA + 0.68);
        ctx.stroke();
      }

      // Draw hazards
      for (const h of hazards) {
        const col = getHazardCssColor(h.color);
        if (h.kind === 'blaster') {
          const ang = h.angle ?? 0;
          if (!h.fired) {
            // Telegraph sight line
            ctx.save();
            ctx.strokeStyle = h.age > 0.4 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(248, 250, 252, 0.35)';
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(h.x + Math.cos(ang) * 440, h.y + Math.sin(ang) * 440);
            ctx.stroke();
            ctx.restore();
          } else {
            // Firing beam!
            const beamW = Math.max(4, 24 * (1 - (h.age - 0.62) / (h.maxAge - 0.62)));
            ctx.save();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = beamW + 6;
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(h.x + Math.cos(ang) * 440, h.y + Math.sin(ang) * 440);
            ctx.stroke();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = beamW;
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(h.x + Math.cos(ang) * 440, h.y + Math.sin(ang) * 440);
            ctx.stroke();
            ctx.restore();
          }
          // Blaster skull
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(ang);
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(-10, -9, 20, 18);
          ctx.fillStyle = '#090D16';
          ctx.fillRect(0, -6, 6, 4);
          ctx.fillRect(0, 2, 6, 4);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(2, -5, 3, 2);
          ctx.fillRect(2, 3, 3, 2);
          ctx.restore();
          continue;
        }

        if (h.kind === 'slashwarn') {
          const flash = Math.floor(h.age * 16) % 2 === 0;
          ctx.save();
          ctx.strokeStyle = col;
          ctx.globalAlpha = flash ? 0.85 : 0.35;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4);
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.14;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.restore();
          continue;
        }

        if (h.kind === 'slashbeam' || h.kind === 'explosion') {
          ctx.save();
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.restore();
          continue;
        }

        if (h.kind === 'discolaser' && h.angle !== undefined) {
          ctx.save();
          ctx.strokeStyle = col;
          ctx.lineWidth = h.age < 0.35 ? 2 : 6;
          ctx.globalAlpha = h.age < 0.35 ? 0.35 : 0.9;
          ctx.beginPath();
          ctx.moveTo(h.x - Math.cos(h.angle) * 260, h.y - Math.sin(h.angle) * 260);
          ctx.lineTo(h.x + Math.cos(h.angle) * 260, h.y + Math.sin(h.angle) * 260);
          ctx.stroke();
          ctx.restore();
          continue;
        }

        if (h.kind === 'bone') {
          ctx.fillStyle = col;
          ctx.fillRect(h.x, h.y, h.w, h.h);
          // Bone knobs
          ctx.fillRect(h.x - 2, h.y, h.w + 4, 4);
          ctx.fillRect(h.x - 2, h.y + h.h - 4, h.w + 4, 4);
        } else if (h.kind === 'spear') {
          ctx.save();
          const a = h.angle ?? Math.atan2(h.vy, h.vx);
          ctx.translate(h.x, h.y);
          ctx.rotate(a);
          ctx.fillStyle = h.flipped ? '#FACC15' : col;
          ctx.fillRect(-10, -2, 16, 4);
          ctx.beginPath();
          ctx.moveTo(10, 0);
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
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(h.x, h.y, h.w, h.h);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.strokeRect(h.x + 2, h.y + 2, h.w - 4, h.h - 4);
          ctx.fillStyle = '#EC4899';
          ctx.fillRect(h.x + h.w / 2 - 3, h.y + h.h / 2 - 3, 6, 6);
        } else if (h.kind === 'pinkheart') {
          drawPixelHeart(ctx, h.x + h.w / 2, h.y + h.h / 2, '#F472B6');
        } else if (h.kind === 'bomb') {
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
      }

      // Draw Yellow Lasers
      ctx.fillStyle = '#FACC15';
      for (const l of lasers) {
        ctx.fillRect(l.x - 1.5, l.y - 6, 3, 12);
      }

      // Draw particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }

      // Draw SOUL Heart (blinks during invuln frames)
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
  }, [activeSoulMode, boss.atkDamage, boss.id, boss.soulModes, boss.statusLines, phase]);

  // Menu & global key listeners
  const triggerMenuAction = useCallback(
    (action: MainAction) => {
      playBattleSfx('select', mutedRef.current);
      if (action === 'FIGHT') {
        setPhase('fight_aim');
        return;
      }
      if (action === 'MERCY' && !asgoreMercyUnlocked) {
        setNarration("* Asgore refuses to look at MERCY... Use ACT (Talk/Tea) or weaken him!");
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
          const next = Math.min(PLAYER_MAX_HP, hp + chosen.heal);
          playerHpRef.current = next;
          return next;
        });
        if (chosen.speedBoost) setSpeedBoost(true);
        setItemsLeft((prev) => prev.filter((_, i) => i !== idx));
        setNarration(chosen.flavor);
        setPhase('message');
      } else if (subMenuAction === 'MERCY') {
        if (idx === 0) {
          if (isSpareReady) {
            finishVictory('SPARE');
          } else {
            setNarration('* Their name is not yellow yet! Try ACTing or battling more.');
            setPhase('menu');
          }
        } else {
          setNarration('* You tried to flee... Wait, today’s Daily Boss won’t let you slip away so easily!');
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
        } else if (count > 0 && (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
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
    const x = ((e.clientX - rect.left) / rect.width) * ARENA_W;
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
      `❤️ SOUL Duel (${tag}: ${boss.name}) — ${methodLabel} in ${turn + 1} turns with ${playerHp}/${PLAYER_MAX_HP} HP!${
        isDailyChallenge && save.streak > 1 ? ` 🔥${save.streak}` : ''
      }`,
    );
  };

  const hpPct = Math.max(0, Math.min(100, (bossHp / boss.maxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (playerHp / PLAYER_MAX_HP) * 100));

  return (
    <div className="select-none rounded-2xl border-2 border-white/25 bg-[#050507] p-3 font-mono text-white shadow-2xl">
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

      {/* Enemy Stage */}
      <div className="relative mb-2 flex min-h-[108px] flex-col items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/90 px-2 py-2">
        <div className="mb-1 flex items-center gap-2 text-[11px]">
          <span className={`font-bold tracking-wide ${isSpareReady ? 'text-yellow-300' : 'text-white'}`}>
            {boss.name.toUpperCase()}
          </span>
          <span className="text-[10px] text-zinc-400">— {boss.title}</span>
        </div>

        <div className="relative flex items-center justify-center">
          <BossPixelSprite
            bossId={boss.id}
            hurt={bossHurt}
            dodging={bossDodging}
            activeAttack={phase === 'dodge'}
            spareable={isSpareReady}
          />

          {/* Animated Diagonal Slash */}
          <AnimatePresence>
            {slashAnim && (
              <motion.svg
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 h-24 w-24"
              >
                <motion.line
                  x1="15"
                  y1="15"
                  x2="85"
                  y2="85"
                  stroke="#EF4444"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="110"
                  initial={{ strokeDashoffset: 110 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.line
                  x1="18"
                  y1="15"
                  x2="85"
                  y2="82"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="110"
                  initial={{ strokeDashoffset: 110 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.18 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>

          {/* Boss Speech Bubble */}
          <AnimatePresence>
            {bossQuip && (
              <motion.div
                key={bossQuip}
                initial={{ opacity: 0, scale: 0.85, x: -6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="ml-2 max-w-[175px] rounded-xl border-2 border-white bg-white px-2.5 py-1.5 text-[10px] font-bold leading-tight text-black shadow-lg"
              >
                {bossQuip}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Damage / MISS */}
          <AnimatePresence>
            {floatingDmg && (
              <motion.div
                key={floatingDmg.key}
                initial={{ opacity: 0, y: 6, scale: 0.8 }}
                animate={{ opacity: 1, y: -26, scale: 1.15 }}
                exit={{ opacity: 0, y: -38 }}
                transition={{ duration: 0.45 }}
                className="pointer-events-none absolute -top-2 font-black text-base drop-shadow-[0_2px_0_#000]"
                style={{ color: floatingDmg.color }}
              >
                {floatingDmg.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Enemy HP bar */}
        <div className="mt-1 flex items-center gap-2">
          <div className="h-2 w-28 overflow-hidden border border-white/40 bg-zinc-800">
            <motion.div
              className="h-full bg-[#22C55E]"
              animate={{ width: `${hpPct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {spareProgress > 0 && (
            <span className="text-[10px] text-yellow-300">
              MERCY {Math.min(spareProgress, boss.spareTarget)}/{boss.spareTarget}
            </span>
          )}
        </div>
      </div>

      {/* Mode Hint Banner during bullet hell */}
      <div className="mb-1 flex h-4 items-center justify-between text-[10px]">
        <span className="truncate font-bold text-cyan-300">
          {phase === 'dodge' && hudHint ? hudHint : phase === 'fight_aim' ? 'HIT GREEN CENTER TO CRIT!' : `TURN ${turn + 1}`}
        </span>
        {phase === 'dodge' && (
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-white transition-all duration-75" style={{ width: `${dodgeProgress * 100}%` }} />
          </div>
        )}
      </div>

      {/* Classic Crisp White Battle Box */}
      <div className="relative mx-auto flex h-[170px] w-full max-w-[340px] items-center justify-center overflow-hidden border-[3px] border-white bg-black">
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
            <span className="self-end animate-pulse text-[11px] font-bold text-yellow-300">
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
            {/* Undertale Eye Target Background */}
            <div className="relative h-24 w-full overflow-hidden rounded-full border-2 border-white/40 bg-gradient-to-r from-red-600/45 via-emerald-500/50 to-red-600/45">
              <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 border-x-2 border-yellow-300 bg-emerald-400/40" />
              <div
                className="absolute inset-y-0 w-2 -translate-x-1/2 bg-white shadow-[0_0_10px_#fff]"
                style={{ left: `${aimPos * 100}%` }}
              />
            </div>
            <span className="mt-2 text-[11px] font-bold text-yellow-300">
              {phase === 'fight_aim' ? '[SPACE / TAP NOW TO STRIKE!]' : 'STRIKING...'}
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

      {/* Player HP Strip */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
        <span>YOU</span>
        <span>LV 19</span>
        <span className="text-[10px] text-yellow-300">HP</span>
        <div className="h-3.5 w-24 overflow-hidden border border-white/30 bg-red-600">
          <div className="h-full bg-[#FFE600] transition-all duration-150" style={{ width: `${playerHpPct}%` }} />
        </div>
        <span>
          {playerHp} / {PLAYER_MAX_HP}
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
              className={`flex items-center justify-center gap-1 border-2 py-1.5 text-[11px] font-black tracking-wide transition ${
                lockedMercy
                  ? 'border-zinc-700 text-zinc-600'
                  : active
                    ? 'border-[#FFE600] bg-[#FFE600]/15 text-[#FFE600]'
                    : spareHighlight
                      ? 'border-yellow-400 text-yellow-300'
                      : 'border-[#F97316] text-[#F97316] hover:border-[#FFE600] hover:text-[#FFE600]'
              } disabled:opacity-60`}
            >
              <span>{active ? '♥' : icon}</span>
              <span>{action}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
