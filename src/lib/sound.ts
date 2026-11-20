import type { NotificationSoundId, RingtoneId } from '../types/chat';

export const NOTIFICATION_SOUNDS: ReadonlyArray<{
  id: NotificationSoundId;
  label: string;
  description: string;
}> = [
  { id: 'emerald-chime', label: 'Emerald Glass', description: 'Crisp two-tone glass chime' },
  { id: 'liquid-drop', label: 'Liquid Droplet', description: 'Water droplet upward pluck' },
  { id: 'crystal-triad', label: 'Crystal Triad', description: 'Bright shimmering major triad' },
  { id: 'aurora-bell', label: 'Aurora Bell', description: 'Warm harmonic bell shimmer' },
  { id: 'soft-pop', label: 'Bubble Pop', description: 'Gentle playful pop tone' },
  { id: 'zen-gong', label: 'Zen Bowl', description: 'Resonant singing bowl overtone' },
  { id: 'sonar-ping', label: 'Ocean Sonar', description: 'Deep ambient glass ping' },
  { id: 'pixel-spark', label: 'Retro Spark', description: 'Clean dual-step synth blip' },
  { id: 'velvet-chord', label: 'Velvet Chord', description: 'Soft warm chord bloom' },
  { id: 'frost-tinkle', label: 'Frost Shimmer', description: 'High crystalline sparkle notes' },
];

export const RINGTONES: ReadonlyArray<{
  id: RingtoneId;
  label: string;
  description: string;
}> = [
  { id: 'skelly-arpeggio', label: 'SkellyTalk Classic', description: 'Signature ascending glass arpeggio' },
  { id: 'liquid-marimba', label: 'Liquid Marimba', description: 'Bouncy wooden-glass marimba groove' },
  { id: 'glass-harp', label: 'Glass Harp', description: 'Ethereal cascading crystal harp' },
  { id: 'cosmic-pulse', label: 'Cosmic Pulse', description: 'Futuristic warm synth shimmer' },
  { id: 'classic-ring', label: 'Modern Telephone', description: 'Crisp dual-tone harmonic ring' },
  { id: 'ocean-waves', label: 'Tidal Chimes', description: 'Flowing major-ninth swell' },
  { id: 'neon-synth', label: 'Neon Pulse', description: 'Upbeat electronic call pattern' },
  { id: 'minimal-beacon', label: 'Minimal Beacon', description: 'Subtle calm double pulse' },
];

let audioCtx: AudioContext | null = null;
let ringtoneTimer: ReturnType<typeof setInterval> | null = null;
let previewTimer: ReturnType<typeof setTimeout> | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0.8;
  return Math.min(1, Math.max(0.05, volume));
}

interface ToneSpec {
  freq: number;
  endFreq?: number;
  delay: number;
  duration: number;
  peak: number;
  type?: OscillatorType;
  attack?: number;
  filterFreq?: number;
}

function scheduleTone(ctx: AudioContext, baseTime: number, vol: number, spec: ToneSpec): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = baseTime + spec.delay;
  const attack = spec.attack ?? 0.015;
  const peakGain = Math.max(0.0005, spec.peak * vol);

  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.freq, start);
  if (spec.endFreq && spec.endFreq !== spec.freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, spec.endFreq), start + spec.duration * 0.78);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);

  if (spec.filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.filterFreq, start);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + spec.duration + 0.03);
}

/**
 * Plays a synthesized notification chime selected by `soundId` at `volume` (0.05..1).
 */
export function playNotificationChime(
  soundId: NotificationSoundId = 'emerald-chime',
  volume = 0.8
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = clampVolume(volume);

    switch (soundId) {
      case 'liquid-drop':
        scheduleTone(ctx, now, vol, {
          freq: 420,
          endFreq: 1180,
          delay: 0,
          duration: 0.22,
          peak: 0.14,
          type: 'sine',
          attack: 0.008,
        });
        scheduleTone(ctx, now, vol, {
          freq: 1480,
          endFreq: 1760,
          delay: 0.09,
          duration: 0.18,
          peak: 0.06,
          type: 'sine',
          attack: 0.008,
        });
        break;

      case 'crystal-triad':
        [783.99, 987.77, 1174.66, 1567.98].forEach((freq, i) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: i * 0.06,
            duration: 0.42,
            peak: 0.075,
            type: 'triangle',
            filterFreq: 3600,
          });
        });
        break;

      case 'aurora-bell':
        scheduleTone(ctx, now, vol, {
          freq: 659.25,
          delay: 0,
          duration: 0.65,
          peak: 0.1,
          type: 'sine',
        });
        scheduleTone(ctx, now, vol, {
          freq: 1318.51,
          delay: 0,
          duration: 0.48,
          peak: 0.045,
          type: 'sine',
        });
        scheduleTone(ctx, now, vol, {
          freq: 987.77,
          delay: 0.1,
          duration: 0.6,
          peak: 0.08,
          type: 'sine',
        });
        break;

      case 'soft-pop':
        scheduleTone(ctx, now, vol, {
          freq: 310,
          endFreq: 780,
          delay: 0,
          duration: 0.11,
          peak: 0.15,
          type: 'sine',
          attack: 0.006,
        });
        scheduleTone(ctx, now, vol, {
          freq: 540,
          endFreq: 960,
          delay: 0.065,
          duration: 0.11,
          peak: 0.1,
          type: 'sine',
          attack: 0.006,
        });
        break;

      case 'zen-gong':
        [293.66, 440, 587.33, 880].forEach((freq, idx) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: 0,
            duration: 1.05 - idx * 0.15,
            peak: 0.08 / (idx + 1),
            type: 'sine',
            attack: 0.025,
          });
        });
        break;

      case 'sonar-ping':
        scheduleTone(ctx, now, vol, {
          freq: 1046.5,
          delay: 0,
          duration: 0.52,
          peak: 0.1,
          type: 'sine',
          attack: 0.008,
        });
        scheduleTone(ctx, now, vol, {
          freq: 1046.5,
          delay: 0.18,
          duration: 0.48,
          peak: 0.038,
          type: 'sine',
          attack: 0.01,
        });
        break;

      case 'pixel-spark':
        [523.25, 659.25, 1046.5].forEach((freq, i) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: i * 0.055,
            duration: 0.12,
            peak: 0.065,
            type: 'square',
            attack: 0.006,
            filterFreq: 2400,
          });
        });
        break;

      case 'velvet-chord':
        [440, 554.37, 659.25, 830.61].forEach((freq, i) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: i * 0.025,
            duration: 0.65,
            peak: 0.055,
            type: 'triangle',
            attack: 0.035,
            filterFreq: 2200,
          });
        });
        break;

      case 'frost-tinkle':
        [1567.98, 1975.53, 2349.32, 2637.02].forEach((freq, i) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: i * 0.05,
            duration: 0.34,
            peak: 0.05,
            type: 'sine',
            attack: 0.008,
          });
        });
        break;

      case 'emerald-chime':
      default:
        [880, 1174.66].forEach((freq, i) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: i * 0.09,
            duration: 0.34,
            peak: 0.09,
            type: 'sine',
            attack: 0.02,
          });
        });
        break;
    }
  } catch {
    // Ignore autoplay/audio context errors
  }
}

/**
 * Plays one musical phrase of the chosen incoming call ringtone.
 */
export function playRingtoneBurst(ringtoneId: RingtoneId = 'skelly-arpeggio', volume = 0.8): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = clampVolume(volume);

    switch (ringtoneId) {
      case 'liquid-marimba':
        [
          { freq: 523.25, delay: 0 },
          { freq: 659.25, delay: 0.13 },
          { freq: 783.99, delay: 0.26 },
          { freq: 1046.5, delay: 0.39 },
          { freq: 783.99, delay: 0.56 },
          { freq: 880, delay: 0.7 },
        ].forEach(({ freq, delay }) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay,
            duration: 0.24,
            peak: 0.11,
            type: 'triangle',
            attack: 0.008,
            filterFreq: 2400,
          });
        });
        break;

      case 'glass-harp':
        [587.33, 739.99, 880, 1174.66, 1479.98, 1760].forEach((freq, idx) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: idx * 0.085,
            duration: 0.65,
            peak: 0.07,
            type: 'sine',
            attack: 0.025,
          });
        });
        break;

      case 'cosmic-pulse':
        [
          { freq: 392, delay: 0 },
          { freq: 587.33, delay: 0.14 },
          { freq: 783.99, delay: 0.28 },
          { freq: 987.77, delay: 0.44 },
        ].forEach(({ freq, delay }) => {
          scheduleTone(ctx, now, vol, {
            freq,
            endFreq: freq * 1.02,
            delay,
            duration: 0.48,
            peak: 0.08,
            type: 'sawtooth',
            attack: 0.03,
            filterFreq: 1650,
          });
        });
        break;

      case 'classic-ring':
        [0, 0.38].forEach((offset) => {
          scheduleTone(ctx, now, vol, {
            freq: 440,
            delay: offset,
            duration: 0.28,
            peak: 0.075,
            type: 'sine',
            attack: 0.015,
          });
          scheduleTone(ctx, now, vol, {
            freq: 480,
            delay: offset,
            duration: 0.28,
            peak: 0.075,
            type: 'sine',
            attack: 0.015,
          });
        });
        break;

      case 'ocean-waves':
        [261.63, 329.63, 392.0, 493.88, 587.33].forEach((freq, idx) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay: idx * 0.11,
            duration: 0.85,
            peak: 0.065,
            type: 'sine',
            attack: 0.05,
          });
        });
        break;

      case 'neon-synth':
        [
          { freq: 440, delay: 0 },
          { freq: 659.25, delay: 0.1 },
          { freq: 880, delay: 0.2 },
          { freq: 659.25, delay: 0.32 },
          { freq: 987.77, delay: 0.44 },
          { freq: 1318.51, delay: 0.56 },
        ].forEach(({ freq, delay }) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay,
            duration: 0.18,
            peak: 0.06,
            type: 'square',
            attack: 0.008,
            filterFreq: 2100,
          });
        });
        break;

      case 'minimal-beacon':
        [
          { freq: 698.46, delay: 0 },
          { freq: 1046.5, delay: 0.24 },
        ].forEach(({ freq, delay }) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay,
            duration: 0.42,
            peak: 0.085,
            type: 'sine',
            attack: 0.02,
          });
        });
        break;

      case 'skelly-arpeggio':
      default:
        [
          { freq: 659.25, delay: 0 },
          { freq: 880.0, delay: 0.12 },
          { freq: 1046.5, delay: 0.24 },
          { freq: 1318.51, delay: 0.36 },
        ].forEach(({ freq, delay }) => {
          scheduleTone(ctx, now, vol, {
            freq,
            delay,
            duration: 0.38,
            peak: 0.095,
            type: 'triangle',
            attack: 0.025,
          });
        });
        break;
    }
  } catch {
    // Ignore audio context errors
  }
}

/**
 * Plays a single clean ringtone phrase for settings preview (auto-clears active timers).
 */
export function previewRingtone(
  ringtoneId: RingtoneId = 'skelly-arpeggio',
  volume = 0.8,
  onDone?: () => void
): void {
  stopRingtone();
  playRingtoneBurst(ringtoneId, volume);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    onDone?.();
  }, 1450);
}

function playRingbackTone(volume = 0.8): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const vol = clampVolume(volume);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05 * vol, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.05 * vol, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.82);
  } catch {
    // Ignore audio context errors
  }
}

export function startIncomingRingtone(
  ringtoneId: RingtoneId = 'skelly-arpeggio',
  volume = 0.8
): void {
  stopRingtone();
  playRingtoneBurst(ringtoneId, volume);
  ringtoneTimer = setInterval(() => playRingtoneBurst(ringtoneId, volume), 2200);
}

export function startOutgoingRingtone(volume = 0.8): void {
  stopRingtone();
  playRingbackTone(volume);
  ringtoneTimer = setInterval(() => playRingbackTone(volume), 2400);
}

export function stopRingtone(): void {
  if (ringtoneTimer) {
    clearInterval(ringtoneTimer);
    ringtoneTimer = null;
  }
  if (previewTimer) {
    clearTimeout(previewTimer);
    previewTimer = null;
  }
}
