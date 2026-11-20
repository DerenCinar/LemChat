import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  PhoneCall,
  Minimize2,
  Maximize2,
  ChevronUp,
  Check,
  Shrink,
  Headphones,
  VolumeX,
  Settings2,
  GripVertical,
  RotateCcw,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import { LiquidGlassLayer } from './LiquidGlassLayer';

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* ---------- Preferences (persisted) ---------- */

type Corner = 'tl' | 'tr' | 'bl' | 'br';
type AccentKey = 'green' | 'blue' | 'violet' | 'rose' | 'amber';

interface CallPrefs {
  accent: AccentKey;
  opacity: number; // 0.2 - 1 (glass background strength)
  blur: number; // px
  volume: number; // 0 - 1
  deafened: boolean;
  mirrorSelf: boolean;
  fit: 'cover' | 'contain';
  showPip: boolean;
  pipCorner: Corner;
  pipSize: number; // 0.15 - 0.5 of video-area width
  showTimer: boolean;
  alwaysShowControls: boolean;
  shortcuts: boolean;
  outputDeviceId: string;
}

const ACCENTS: Record<AccentKey, string> = {
  green: '#22C55E',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  rose: '#F43F5E',
  amber: '#F59E0B',
};

const DEFAULT_PREFS: CallPrefs = {
  accent: 'green',
  opacity: 0.6,
  blur: 24,
  volume: 1,
  deafened: false,
  mirrorSelf: true,
  fit: 'cover',
  showPip: true,
  pipCorner: 'br',
  pipSize: 0.25,
  showTimer: true,
  alwaysShowControls: true,
  shortcuts: true,
  outputDeviceId: '',
};

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PREFS_KEY = 'lemchat.call.prefs';
const RECT_KEY = 'lemchat.call.rect';
const MIN_W = 340;
const MIN_H = 300;
const MINI_W = 288;

function loadPrefs(): CallPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

function clampRect(r: Rect): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(r.w, MIN_W), vw);
  const h = Math.min(Math.max(r.h, MIN_H), vh);
  const x = Math.min(Math.max(r.x, 0), Math.max(0, vw - w));
  const y = Math.min(Math.max(r.y, 0), Math.max(0, vh - h));
  return { x, y, w, h };
}

function defaultRect(): Rect {
  const w = Math.min(560, window.innerWidth - 32);
  const h = Math.min(520, window.innerHeight - 64);
  return clampRect({
    x: (window.innerWidth - w) / 2,
    y: (window.innerHeight - h) / 2,
    w,
    h,
  });
}

function loadRect(): Rect {
  try {
    const raw = localStorage.getItem(RECT_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Rect;
      if ([r.x, r.y, r.w, r.h].every((n) => typeof n === 'number')) return clampRect(r);
    }
  } catch {
    /* ignore */
  }
  return defaultRect();
}

const pipPositionClass: Record<Corner, string> = {
  tl: 'left-3 top-3',
  tr: 'right-3 top-3',
  bl: 'bottom-3 left-3',
  br: 'bottom-3 right-3',
};

/* ---------- Small UI helpers ---------- */

const Toggle: React.FC<{
  accent: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ accent, label, value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-emerald-950 transition hover:bg-emerald-500/10 dark:text-white"
  >
    <span>{label}</span>
    <span
      className="relative h-4 w-7 rounded-full transition"
      style={{ background: value ? accent : 'rgba(128,128,128,.4)' }}
    >
      <span
        className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all"
        style={{ left: value ? 14 : 2 }}
      />
    </span>
  </button>
);

const SliderRow: React.FC<{
  accent: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}> = ({ accent, label, value, min, max, step, display, onChange }) => (
  <div className="px-2.5 py-1.5">
    <div className="flex items-center justify-between text-xs text-emerald-950 dark:text-white">
      <span>{label}</span>
      <span className="text-[10px] opacity-60">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-1 h-1 w-full cursor-pointer"
      style={{ accentColor: accent }}
    />
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/60">
    {children}
  </p>
);


type ResizeDir = 'e' | 's' | 'se' | 'w' | 'n' | 'nw' | 'ne' | 'sw';

export const CallOverlay: React.FC = () => {
  const activeCall = useChatStore((s) => s.activeCall);
  const incomingCall = useChatStore((s) => s.incomingCall);
  const acceptIncomingCall = useChatStore((s) => s.acceptIncomingCall);
  const declineIncomingCall = useChatStore((s) => s.declineIncomingCall);
  const endCall = useChatStore((s) => s.endCall);
  const toggleMute = useChatStore((s) => s.toggleMute);
  const toggleCamera = useChatStore((s) => s.toggleCamera);
  const switchCamera = useChatStore((s) => s.switchCamera);
  const toggleScreenShare = useChatStore((s) => s.toggleScreenShare);

  const [viewMode, setViewMode] = useState<'normal' | 'minimized' | 'maximized'>('normal');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const activePopupId = useChatStore((s) => s.activePopupId);
  const setActivePopupId = useChatStore((s) => s.setActivePopupId);
  const togglePopup = useChatStore((s) => s.togglePopup);
  const showCameraMenu = activePopupId === 'call:camera';
  const showSettings = activePopupId === 'call:settings';
  const [prefs, setPrefs] = useState<CallPrefs>(loadPrefs);
  const [rect, setRect] = useState<Rect>(loadRect);
  const [miniPos, setMiniPos] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(0, window.innerWidth - MINI_W - 20),
    y: Math.max(0, window.innerHeight - 120),
  }));
  const [interacting, setInteracting] = useState(false);

  const rectRef = useRef(rect);
  rectRef.current = rect;
  const miniRef = useRef<HTMLDivElement | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const accent = ACCENTS[prefs.accent];

  const updatePrefs = useCallback((patch: Partial<CallPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const commitRect = useCallback((r: Rect) => {
    setRect(r);
    try {
      localStorage.setItem(RECT_KEY, JSON.stringify(r));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeCall) {
      setViewMode('normal');
      if (activePopupId === 'call:camera' || activePopupId === 'call:settings') {
        setActivePopupId(null);
      }
    }
  }, [activeCall, activePopupId, setActivePopupId]);

  useEffect(() => {
    if (!activeCall?.startedAt) {
      setElapsedMs(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - activeCall.startedAt!);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.startedAt]);

  useEffect(() => {
    if (localVideoRef.current && activeCall?.localStream) {
      localVideoRef.current.srcObject = activeCall.localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [activeCall?.localStream, activeCall?.isCameraOff, viewMode, prefs.showPip]);

  useEffect(() => {
    if (remoteVideoRef.current && activeCall?.remoteStream) {
      remoteVideoRef.current.srcObject = activeCall.remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && activeCall?.remoteStream) {
      remoteAudioRef.current.srcObject = activeCall.remoteStream;
      void remoteAudioRef.current.play().catch(() => {});
    }
  }, [activeCall?.remoteStream, viewMode]);

  // Volume / deafen
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, prefs.volume));
    el.muted = prefs.deafened;
  }, [prefs.volume, prefs.deafened, activeCall?.remoteStream, viewMode]);

  // Output device
  useEffect(() => {
    const el = remoteAudioRef.current as
      | (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> })
      | null;
    if (el?.setSinkId && prefs.outputDeviceId) {
      void el.setSinkId(prefs.outputDeviceId).catch(() => {});
    }
  }, [prefs.outputDeviceId, activeCall?.remoteStream]);

  // Keep window within the viewport if it is resized
  useEffect(() => {
    const onResize = () => {
      setRect((r) => clampRect(r));
      setMiniPos((p) => ({
        x: Math.min(Math.max(p.x, 0), Math.max(0, window.innerWidth - MINI_W)),
        y: Math.min(Math.max(p.y, 0), Math.max(0, window.innerHeight - 80)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!activeCall || !prefs.shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === 'm') toggleMute();
      else if (k === 'v') void toggleCamera();
      else if (k === 'd') updatePrefs({ deafened: !prefs.deafened });
      else if (k === 'f') setViewMode((m) => (m === 'maximized' ? 'normal' : 'maximized'));
      else if (k === 'escape') {
        if (activePopupId === 'call:camera' || activePopupId === 'call:settings') {
          setActivePopupId(null);
        }
        setViewMode((m) => (m === 'maximized' ? 'normal' : m));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCall, activePopupId, prefs.shortcuts, prefs.deafened, toggleMute, toggleCamera, updatePrefs, setActivePopupId]);

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
      setSpeakers(devices.filter((d) => d.kind === 'audiooutput'));
    } catch {
      setCameras([]);
      setSpeakers([]);
    }
  };

  const hasRemoteVideo =
    (activeCall?.remoteStream?.getVideoTracks().length ?? 0) > 0;

  /* ---------- Drag & resize ---------- */

  const startDrag = (e: React.PointerEvent) => {
    if (viewMode === 'maximized') return;
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const mini = viewMode === 'minimized';
    const origin = mini ? { ...miniPos } : { x: rect.x, y: rect.y };
    const size = mini
      ? { w: MINI_W, h: miniRef.current?.offsetHeight ?? 80 }
      : { w: rect.w, h: rect.h };
    setInteracting(true);

    let latest = origin;
    const move = (ev: PointerEvent) => {
      const nx = Math.min(
        Math.max(origin.x + ev.clientX - startX, -size.w + 120),
        window.innerWidth - 120,
      );
      const ny = Math.min(Math.max(origin.y + ev.clientY - startY, 0), window.innerHeight - 48);
      latest = { x: nx, y: ny };
      if (mini) setMiniPos(latest);
      else setRect((r) => ({ ...r, ...latest }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setInteracting(false);
      if (!mini) commitRect({ ...rectRef.current, ...latest });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const o = { ...rect };
    setInteracting(true);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y, w, h } = o;
      if (dir.includes('e')) w = o.w + dx;
      if (dir.includes('s')) h = o.h + dy;
      if (dir.includes('w')) {
        w = o.w - dx;
        x = o.x + dx;
      }
      if (dir.includes('n')) {
        h = o.h - dy;
        y = o.y + dy;
      }
      if (w < MIN_W) {
        if (dir.includes('w')) x -= MIN_W - w;
        w = MIN_W;
      }
      if (h < MIN_H) {
        if (dir.includes('n')) y -= MIN_H - h;
        h = MIN_H;
      }
      x = Math.max(0, x);
      y = Math.max(0, y);
      w = Math.min(w, window.innerWidth - x);
      h = Math.min(h, window.innerHeight - y);
      setRect({ x, y, w, h });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setInteracting(false);
      commitRect(rectRef.current);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const snapTo = (where: 'center' | Corner) => {
    const r = rect;
    const m = 16;
    const top = 48;
    const x = where === 'tl' || where === 'bl' ? m : window.innerWidth - r.w - m;
    const y = where === 'tl' || where === 'tr' ? top : window.innerHeight - r.h - m;
    commitRect(
      clampRect(
        where === 'center'
          ? { ...r, x: (window.innerWidth - r.w) / 2, y: (window.innerHeight - r.h) / 2 }
          : { ...r, x, y },
      ),
    );
  };

  const resetLayout = () => {
    commitRect(defaultRect());
    setMiniPos({
      x: Math.max(0, window.innerWidth - MINI_W - 20),
      y: Math.max(0, window.innerHeight - 120),
    });
    setViewMode('normal');
  };

  const containerStyle: React.CSSProperties = {
    ['--glass-opacity' as string]: String(prefs.opacity),
    ['--glass-blur' as string]: `${prefs.blur}px`,
    boxShadow: `0 0 0 1px ${accent}66, 0 12px 40px -8px rgba(0,0,0,.45)`,
    ...(viewMode === 'normal'
      ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h }
      : viewMode === 'minimized'
        ? { left: miniPos.x, top: miniPos.y, width: MINI_W }
        : { left: 16, right: 16, bottom: 16, top: 48 }),
  };

  const containerClass =
    viewMode === 'minimized'
      ? 'rounded-2xl p-3'
      : viewMode === 'maximized'
        ? 'flex flex-col rounded-3xl p-6'
        : 'flex flex-col rounded-3xl p-5';

  const pipWidthPct = `${Math.round(prefs.pipSize * 100)}%`;

  const resizeHandles: { dir: ResizeDir; cls: string; cursor: string }[] = [
    { dir: 'n', cls: 'left-3 right-3 top-0 h-1.5', cursor: 'ns-resize' },
    { dir: 's', cls: 'bottom-0 left-3 right-3 h-1.5', cursor: 'ns-resize' },
    { dir: 'w', cls: 'bottom-3 left-0 top-3 w-1.5', cursor: 'ew-resize' },
    { dir: 'e', cls: 'bottom-3 right-0 top-3 w-1.5', cursor: 'ew-resize' },
    { dir: 'nw', cls: 'left-0 top-0 h-3 w-3', cursor: 'nwse-resize' },
    { dir: 'ne', cls: 'right-0 top-0 h-3 w-3', cursor: 'nesw-resize' },
    { dir: 'sw', cls: 'bottom-0 left-0 h-3 w-3', cursor: 'nesw-resize' },
    { dir: 'se', cls: 'bottom-0 right-0 h-4 w-4', cursor: 'nwse-resize' },
  ];

  return (
    <>
      {/* Incoming Call Liquid Glass Banner */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="glass-panel glass-surface fixed left-1/2 top-14 z-50 flex w-[360px] -translate-x-1/2 items-center justify-between gap-3 overflow-hidden rounded-3xl p-4 ring-1 ring-[#22C55E]/50"
          >
            <LiquidGlassLayer variant="toast" interactive />
            <motion.span
              aria-hidden
              initial={{ x: '-120%', opacity: 0.8 }}
              animate={{ x: '220%', opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.5 }}
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#22C55E]/25 to-transparent"
            />
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-sm font-bold text-white shadow-lem-glow">
                <UserAvatar
                  avatar={incomingCall.callerAvatar}
                  name={incomingCall.callerName}
                  className="h-11 w-11 rounded-2xl"
                  textClassName="text-sm font-bold text-white"
                />
                <span className="absolute -inset-1 animate-ping rounded-2xl border border-[#22C55E]/50" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  {incomingCall.callerName}
                </p>
                <p className="text-[11px] text-emerald-800/75 dark:text-emerald-200/70">
                  Incoming {incomingCall.mode} call...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={declineIncomingCall}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:brightness-110"
                title="Decline"
              >
                <PhoneOff className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => void acceptIncomingCall()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow transition hover:brightness-110"
                title="Accept"
              >
                <PhoneCall className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Liquid Glass Overlay (draggable + resizable) */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            ref={miniRef}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onPointerDown={() => {
              if (showCameraMenu || showSettings) setActivePopupId(null);
            }}
            style={containerStyle as React.ComponentProps<typeof motion.div>["style"]}
            className={`glass-panel glass-surface fixed z-50 overflow-hidden ${containerClass} ${
              interacting ? 'select-none' : ''
            }`}
          >
            <LiquidGlassLayer variant="modal" />
            {/* Header = drag handle */}
            <div
              onPointerDown={startDrag}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                setViewMode((m) => (m === 'maximized' ? 'normal' : 'maximized'));
              }}
              className={`flex shrink-0 items-center justify-between ${
                viewMode === 'maximized' ? '' : 'cursor-grab active:cursor-grabbing'
              }`}
              title={viewMode === 'maximized' ? undefined : 'Drag to move · double-click to maximize'}
            >
              <div className="flex items-center gap-2.5">
                {viewMode !== 'maximized' && (
                  <GripVertical className="h-4 w-4 text-emerald-800/50 dark:text-emerald-200/50" />
                )}
                <span
                  className="h-2.5 w-2.5 animate-pulse rounded-full"
                  style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
                />
                <div>
                  <p className="text-xs font-bold text-emerald-950 dark:text-white">
                    {activeCall.conversationName}
                  </p>
                  <p className="text-[10px] text-emerald-800/70 dark:text-emerald-200/65">
                    {activeCall.status === 'connected'
                      ? prefs.showTimer
                        ? `Connected · ${formatDuration(elapsedMs)}`
                        : 'Connected'
                      : 'Ringing via SkellyTalk WebRTC...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {viewMode !== 'minimized' && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      void loadDevices();
                      togglePopup('call:settings');
                    }}
                    className="glass-pill flex h-7 w-7 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                    title="Call settings"
                    style={showSettings ? { color: accent } : undefined}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {viewMode === 'minimized' && (
                  <>
                    <button
                      onClick={toggleMute}
                      className="glass-pill flex h-7 w-7 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                      title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {activeCall.isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={endCall}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white"
                      title="End Call"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    setViewMode((m) => (m === 'minimized' ? 'normal' : 'minimized'))
                  }
                  className="glass-pill flex h-7 w-7 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                  title={viewMode === 'minimized' ? 'Restore call' : 'Minimize call'}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() =>
                    setViewMode((m) => (m === 'maximized' ? 'normal' : 'maximized'))
                  }
                  className="glass-pill flex h-7 w-7 items-center justify-center rounded-full text-emerald-800 dark:text-emerald-200"
                  title={viewMode === 'maximized' ? 'Exit full view (Esc)' : 'Maximize (F)'}
                >
                  {viewMode === 'maximized' ? (
                    <Shrink className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Always play remote audio even when minimized or audio-only */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

            {viewMode !== 'minimized' && (
              <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/40">
                {activeCall.remoteStream && hasRemoteVideo ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`h-full w-full ${
                      prefs.fit === 'contain' ? 'object-contain' : 'object-cover'
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-3xl text-xl font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                        boxShadow: `0 0 24px ${accent}66`,
                      }}
                    >
                      {activeCall.conversationName.replace('#', '').slice(0, 2).toUpperCase()}
                      <motion.span
                        animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-3xl border-2"
                        style={{ borderColor: accent }}
                      />
                    </div>
                    <p className="text-xs text-emerald-100/80">
                      {activeCall.mediaWarning ??
                        (activeCall.status === 'ringing'
                          ? 'Waiting for participant to join...'
                          : 'Audio connected')}
                    </p>
                  </div>
                )}

                {prefs.deafened && (
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] text-white">
                    <VolumeX className="h-3 w-3" /> Deafened
                  </div>
                )}

                {/* Local Video PiP */}
                {prefs.showPip && activeCall.localStream && !activeCall.isCameraOff && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: pipWidthPct, aspectRatio: '4 / 3' }}
                    className={`absolute rounded-xl border border-white/25 object-cover shadow-lg ${
                      pipPositionClass[prefs.pipCorner]
                    } ${prefs.mirrorSelf ? '-scale-x-100' : ''}`}
                  />
                )}
              </div>
            )}

            {/* Controls */}
            <div className="relative mt-4 flex shrink-0 flex-wrap items-center justify-center gap-2.5">
              {viewMode !== 'minimized' && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleMute}
                    title={activeCall.isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    className={`glass-pill flex h-10 w-10 items-center justify-center rounded-full transition ${
                      activeCall.isMuted
                        ? 'bg-rose-500/25 text-rose-400 ring-1 ring-rose-500/50'
                        : 'text-emerald-900 dark:text-white'
                    }`}
                  >
                    {activeCall.isMuted ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => updatePrefs({ deafened: !prefs.deafened })}
                    title={prefs.deafened ? 'Undeafen (D)' : 'Deafen (D)'}
                    className={`glass-pill flex h-10 w-10 items-center justify-center rounded-full transition ${
                      prefs.deafened
                        ? 'bg-rose-500/25 text-rose-400 ring-1 ring-rose-500/50'
                        : 'text-emerald-900 dark:text-white'
                    }`}
                  >
                    {prefs.deafened ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Headphones className="h-4 w-4" />
                    )}
                  </motion.button>

                  {/* Camera Toggle + Camera Selector Split Control */}
                  <div className="relative flex items-center">
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => void toggleCamera()}
                      title={activeCall.isCameraOff ? 'Turn camera on (V)' : 'Turn camera off (V)'}
                      className={`glass-pill flex h-10 items-center gap-1.5 rounded-l-full pl-3.5 pr-2.5 transition ${
                        activeCall.isCameraOff
                          ? 'bg-rose-500/25 text-rose-400 ring-1 ring-rose-500/50'
                          : 'text-emerald-900 dark:text-white'
                      }`}
                    >
                      {activeCall.isCameraOff ? (
                        <VideoOff className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                    </motion.button>

                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        void loadDevices();
                        togglePopup('call:camera');
                      }}
                      title="Select camera"
                      className="glass-pill flex h-10 items-center justify-center rounded-r-full border-l-0 px-2 text-emerald-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>

                    <AnimatePresence>
                      {showCameraMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="glass-panel glass-surface absolute bottom-12 left-0 z-50 w-60 rounded-2xl p-2"
                        >
                          <LiquidGlassLayer variant="popover" interactive />
                          <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/60">
                            Select Camera
                          </p>
                          {cameras.length === 0 ? (
                            <p className="px-2.5 py-2 text-xs text-emerald-900/65 dark:text-emerald-200/65">
                              No cameras found
                            </p>
                          ) : (
                            cameras.map((cam, idx) => {
                              const isSelected = activeCall.selectedCameraId === cam.deviceId;
                              return (
                                <button
                                  key={cam.deviceId || idx}
                                  onClick={() => {
                                    void switchCamera(cam.deviceId);
                                    setActivePopupId(null);
                                  }}
                                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-emerald-950 transition hover:bg-emerald-500/15 dark:text-white"
                                >
                                  <span className="truncate">
                                    {cam.label || `Camera ${idx + 1}`}
                                  </span>
                                  {isSelected && (
                                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void toggleScreenShare()}
                    title="Share Screen"
                    className={`glass-pill flex h-10 w-10 items-center justify-center rounded-full transition ${
                      activeCall.isScreenSharing ? 'text-white' : 'text-emerald-900 dark:text-white'
                    }`}
                    style={
                      activeCall.isScreenSharing
                        ? { background: accent, boxShadow: `0 0 12px ${accent}88` }
                        : undefined
                    }
                  >
                    <MonitorUp className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={endCall}
                    title="End Call"
                    className="flex h-10 w-12 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:bg-rose-600"
                  >
                    <PhoneOff className="h-4 w-4" />
                  </motion.button>
                </>
              )}
            </div>

            {/* Settings / personalization panel */}
            <AnimatePresence>
              {showSettings && viewMode !== 'minimized' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="glass-panel glass-surface absolute right-4 top-14 z-50 max-h-[calc(100%-7rem)] w-64 overflow-y-auto rounded-2xl p-2"
                >
                  <LiquidGlassLayer variant="popover" interactive />
                  <SectionLabel>Audio</SectionLabel>
                  <SliderRow
                    accent={accent}
                    label="Call volume"
                    value={prefs.volume}
                    min={0}
                    max={1}
                    step={0.05}
                    display={`${Math.round(prefs.volume * 100)}%`}
                    onChange={(v) => updatePrefs({ volume: v })}
                  />
                  {speakers.length > 0 && (
                    <div className="px-2.5 py-1.5">
                      <p className="text-xs text-emerald-950 dark:text-white">Speaker</p>
                      <select
                        value={prefs.outputDeviceId}
                        onChange={(e) => updatePrefs({ outputDeviceId: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-black/10 px-2 py-1 text-xs text-emerald-950 outline-none dark:bg-white/10 dark:text-white"
                      >
                        <option value="">System default</option>
                        {speakers.map((d, i) => (
                          <option key={d.deviceId || i} value={d.deviceId}>
                            {d.label || `Speaker ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <SectionLabel>Video</SectionLabel>
                  <Toggle accent={accent} label="Show my preview" value={prefs.showPip} onChange={(v) => updatePrefs({ showPip: v })} />
                  <Toggle accent={accent} label="Mirror my preview" value={prefs.mirrorSelf} onChange={(v) => updatePrefs({ mirrorSelf: v })} />
                  <Toggle accent={accent}
                    label="Fit video (no crop)"
                    value={prefs.fit === 'contain'}
                    onChange={(v) => updatePrefs({ fit: v ? 'contain' : 'cover' })}
                  />
                  <SliderRow
                    accent={accent}
                    label="Preview size"
                    value={prefs.pipSize}
                    min={0.15}
                    max={0.5}
                    step={0.01}
                    display={`${Math.round(prefs.pipSize * 100)}%`}
                    onChange={(v) => updatePrefs({ pipSize: v })}
                  />
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-xs text-emerald-950 dark:text-white">Preview corner</span>
                    <div className="grid grid-cols-2 gap-1">
                      {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => updatePrefs({ pipCorner: c })}
                          className="h-4 w-5 rounded-sm border border-white/30"
                          style={{
                            background: prefs.pipCorner === c ? accent : 'rgba(128,128,128,.25)',
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <SectionLabel>Appearance</SectionLabel>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-xs text-emerald-950 dark:text-white">Accent</span>
                    <div className="flex gap-1.5">
                      {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => updatePrefs({ accent: k })}
                          className="h-4 w-4 rounded-full"
                          style={{
                            background: ACCENTS[k],
                            outline: prefs.accent === k ? '2px solid white' : 'none',
                            outlineOffset: 1,
                          }}
                          title={k}
                        />
                      ))}
                    </div>
                  </div>
                  <SliderRow
                    accent={accent}
                    label="Window opacity"
                    value={prefs.opacity}
                    min={0.2}
                    max={1}
                    step={0.05}
                    display={`${Math.round(prefs.opacity * 100)}%`}
                    onChange={(v) => updatePrefs({ opacity: v })}
                  />
                  <SliderRow
                    accent={accent}
                    label="Background blur"
                    value={prefs.blur}
                    min={0}
                    max={40}
                    step={1}
                    display={`${prefs.blur}px`}
                    onChange={(v) => updatePrefs({ blur: v })}
                  />
                  <Toggle accent={accent} label="Show call timer" value={prefs.showTimer} onChange={(v) => updatePrefs({ showTimer: v })} />
                  <Toggle accent={accent} label="Keyboard shortcuts (M V D F)" value={prefs.shortcuts} onChange={(v) => updatePrefs({ shortcuts: v })} />

                  <SectionLabel>Window</SectionLabel>
                  <div className="grid grid-cols-5 gap-1 px-2.5 py-1.5">
                    {(
                      [
                        ['tl', '↖'],
                        ['tr', '↗'],
                        ['center', '◎'],
                        ['bl', '↙'],
                        ['br', '↘'],
                      ] as const
                    ).map(([w, label]) => (
                      <button
                        key={w}
                        onClick={() => {
                          setViewMode('normal');
                          snapTo(w);
                        }}
                        className="glass-pill rounded-lg py-1 text-xs text-emerald-900 dark:text-white"
                        title={`Snap ${w}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={resetLayout}
                    className="mb-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-emerald-950 transition hover:bg-emerald-500/10 dark:text-white"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset position &amp; size
                  </button>
                  <button
                    onClick={() => updatePrefs(DEFAULT_PREFS)}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-emerald-950 transition hover:bg-emerald-500/10 dark:text-white"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset preferences
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resize handles (floating window only) */}
            {viewMode === 'normal' &&
              resizeHandles.map((h) => (
                <div
                  key={h.dir}
                  onPointerDown={startResize(h.dir)}
                  className={`absolute z-40 ${h.cls}`}
                  style={{ cursor: h.cursor, touchAction: 'none' }}
                >
                  {h.dir === 'se' && (
                    <svg viewBox="0 0 16 16" className="h-full w-full text-emerald-800/50 dark:text-white/40">
                      <path d="M14 6L6 14M14 10L10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
