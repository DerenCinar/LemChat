import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, AppWindow, X, Check } from 'lucide-react';
import { LiquidGlassLayer } from './LiquidGlassLayer';
import { useT } from '../lib/i18n';
import type { ShareSourceInfo } from '../types/chat';

/**
 * In-app replacement for the OS-style screen share dialog. The Electron main process
 * pushes the available sources here (with thumbnails) and waits for the choice.
 */
export const ScreenSharePicker: React.FC = () => {
  const t = useT();
  const [sources, setSources] = useState<ShareSourceInfo[] | null>(null);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [tab, setTab] = useState<'screen' | 'window'>('screen');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [withAudio, setWithAudio] = useState(false);

  const open = sources !== null;

  useEffect(() => {
    const api = window.lemchat;
    if (!api?.onScreenShareRequest) return;
    const offRequest = api.onScreenShareRequest((payload) => {
      setSources(payload.sources);
      setAudioAvailable(payload.audioAvailable);
      setWithAudio(false);
      const firstScreen = payload.sources.find((s) => s.kind === 'screen');
      setTab(firstScreen || payload.sources.length === 0 ? 'screen' : 'window');
      setSelectedId((firstScreen ?? payload.sources[0])?.id ?? null);
    });
    const offClose = api.onScreenShareClose?.(() => setSources(null));
    return () => {
      offRequest();
      offClose?.();
    };
  }, []);

  // Keep previews live while the picker is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void window.lemchat?.refreshScreenShareSources?.().then((fresh) => {
        if (!cancelled && fresh.length > 0) setSources(fresh);
      });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open]);

  const cancel = useCallback(() => {
    window.lemchat?.pickScreenShare?.(null);
    setSources(null);
  }, []);

  const confirm = useCallback(() => {
    if (!selectedId) return;
    window.lemchat?.pickScreenShare?.({ id: selectedId, audio: audioAvailable && withAudio });
    setSources(null);
  }, [selectedId, audioAvailable, withAudio]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
      if (e.key === 'Enter') confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, cancel, confirm]);

  const visible = (sources ?? []).filter((s) => s.kind === tab);
  const selected = (sources ?? []).find((s) => s.id === selectedId) ?? null;

  const tabButton = (id: 'screen' | 'window', label: string, Icon: typeof Monitor) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        tab === id
          ? 'bg-[#22C55E]/20 text-emerald-700 ring-1 ring-[#22C55E]/50 dark:text-emerald-300'
          : 'text-emerald-800/70 hover:bg-black/5 dark:text-emerald-200/70 dark:hover:bg-white/10'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('share.title')}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="glass-panel glass-surface relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl"
          >
            <LiquidGlassLayer variant="modal" />

            <div className="relative flex items-start justify-between gap-4 px-5 pb-3 pt-5">
              <div>
                <h2 className="text-base font-bold text-emerald-950 dark:text-white">
                  {t('share.title')}
                </h2>
                <p className="mt-0.5 text-xs text-emerald-800/70 dark:text-emerald-200/60">
                  {t('share.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={cancel}
                aria-label={t('share.cancel')}
                className="rounded-full p-1.5 text-emerald-800/70 transition hover:bg-black/5 dark:text-emerald-200/70 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 pb-4 md:flex-row">
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div role="tablist" className="flex gap-2">
                  {tabButton('screen', t('share.screens'), Monitor)}
                  {tabButton('window', t('share.windows'), AppWindow)}
                </div>

                <div className="lem-scrollbar grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 lg:grid-cols-3">
                  {visible.length === 0 && (
                    <p className="col-span-full py-10 text-center text-xs text-emerald-800/60 dark:text-emerald-200/50">
                      {t('share.empty')}
                    </p>
                  )}
                  {visible.map((src) => {
                    const active = src.id === selectedId;
                    return (
                      <button
                        key={src.id}
                        type="button"
                        onClick={() => setSelectedId(src.id)}
                        onDoubleClick={confirm}
                        aria-pressed={active}
                        className={`group relative overflow-hidden rounded-2xl border text-left transition ${
                          active
                            ? 'border-[#22C55E] ring-2 ring-[#22C55E]/50'
                            : 'border-black/10 hover:border-[#22C55E]/50 dark:border-white/15'
                        }`}
                      >
                        <img
                          src={src.thumbnail}
                          alt=""
                          draggable={false}
                          className="aspect-video w-full bg-black/40 object-cover"
                        />
                        <div className="flex items-center gap-1.5 bg-black/5 px-2 py-1.5 dark:bg-white/5">
                          {src.appIcon && (
                            <img src={src.appIcon} alt="" className="h-4 w-4 shrink-0" draggable={false} />
                          )}
                          <span className="truncate text-[11px] font-medium text-emerald-950 dark:text-emerald-50">
                            {src.name}
                          </span>
                        </div>
                        {active && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-white shadow">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 md:w-72">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/60 dark:text-emerald-200/50">
                  {t('share.preview')}
                </p>
                <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-black/50 dark:border-white/15">
                  {selected ? (
                    <img
                      src={selected.thumbnail}
                      alt={selected.name}
                      draggable={false}
                      className="aspect-video w-full object-contain"
                    />
                  ) : (
                    <div className="aspect-video w-full" />
                  )}
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    Live
                  </span>
                </div>
                {selected && (
                  <p className="truncate text-xs font-semibold text-emerald-950 dark:text-white">
                    {selected.name}
                  </p>
                )}

                {audioAvailable && (
                  <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs text-emerald-900 dark:text-emerald-100">
                    <input
                      type="checkbox"
                      checked={withAudio}
                      onChange={(e) => setWithAudio(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#22C55E]"
                    />
                    {t('share.audio')}
                  </label>
                )}
              </div>
            </div>

            <div className="relative flex justify-end gap-2 border-t border-black/5 px-5 py-3.5 dark:border-white/10">
              <button
                type="button"
                onClick={cancel}
                className="glass-pill rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-900 transition hover:brightness-110 dark:text-emerald-100"
              >
                {t('share.cancel')}
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!selectedId}
                className="rounded-full bg-gradient-to-br from-[#22C55E] to-[#10B981] px-5 py-1.5 text-xs font-bold text-white shadow-lem-glow-sm transition hover:brightness-110 disabled:opacity-50"
              >
                {t('share.start')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
