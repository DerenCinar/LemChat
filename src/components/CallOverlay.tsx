import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

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
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!activeCall) {
      setViewMode('normal');
      setShowCameraMenu(false);
    }
  }, [activeCall]);

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
  }, [activeCall?.localStream, activeCall?.isCameraOff, viewMode]);

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

  const loadCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      setCameras([]);
    }
  };

  const hasRemoteVideo =
    (activeCall?.remoteStream?.getVideoTracks().length ?? 0) > 0;

  const containerClass =
    viewMode === 'minimized'
      ? 'bottom-5 right-5 w-72 rounded-2xl p-3'
      : viewMode === 'maximized'
        ? 'inset-4 top-12 flex flex-col rounded-3xl p-6'
        : 'left-1/2 top-1/2 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5';

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

      {/* Active Call Liquid Glass Overlay */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`glass-panel glass-surface fixed z-50 overflow-hidden ring-1 ring-[#22C55E]/40 ${containerClass}`}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#22C55E] shadow-lem-glow-sm" />
                <div>
                  <p className="text-xs font-bold text-emerald-950 dark:text-white">
                    {activeCall.conversationName}
                  </p>
                  <p className="text-[10px] text-emerald-800/70 dark:text-emerald-200/65">
                    {activeCall.status === 'connected'
                      ? `Connected · ${formatDuration(elapsedMs)}`
                      : 'Ringing via SkellyTalk WebRTC...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
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
                  title={viewMode === 'maximized' ? 'Exit full view' : 'Maximize video call'}
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
              <div
                className={`relative mt-4 flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black/40 ${
                  viewMode === 'maximized' ? 'flex-1 min-h-0' : 'h-72'
                }`}
              >
                {activeCall.remoteStream && hasRemoteVideo ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-xl font-bold text-white shadow-lem-glow">
                      {activeCall.conversationName.replace('#', '').slice(0, 2).toUpperCase()}
                      <motion.span
                        animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-3xl border-2 border-[#22C55E]"
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

                {/* Local Video PiP */}
                {activeCall.localStream && !activeCall.isCameraOff && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`absolute bottom-3 right-3 rounded-xl border border-white/25 object-cover shadow-lg ${
                      viewMode === 'maximized' ? 'h-40 w-60' : 'h-24 w-36'
                    }`}
                  />
                )}
              </div>
            )}

            {/* Controls */}
            <div className="relative mt-4 flex shrink-0 items-center justify-center gap-2.5">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMute}
                title={activeCall.isMuted ? 'Unmute' : 'Mute'}
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

              {/* Camera Toggle + Camera Selector Split Control */}
              <div className="relative flex items-center">
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void toggleCamera()}
                  title={activeCall.isCameraOff ? 'Turn camera on' : 'Turn camera off'}
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
                  onClick={() => {
                    void loadCameras();
                    setShowCameraMenu((v) => !v);
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
                      className="glass-panel glass-surface absolute bottom-12 left-0 z-50 w-60 rounded-2xl p-2"
                    >
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
                                setShowCameraMenu(false);
                              }}
                              className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-emerald-950 transition hover:bg-emerald-500/15 dark:text-white"
                            >
                              <span className="truncate">
                                {cam.label || `Camera ${idx + 1}`}
                              </span>
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
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
                  activeCall.isScreenSharing
                    ? 'bg-[#22C55E] text-white shadow-lem-glow-sm'
                    : 'text-emerald-900 dark:text-white'
                }`}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
