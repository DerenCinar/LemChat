import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAppLock } from '../store/useAppLock';
import { useChatStore } from '../store/useChatStore';
import { LiquidGlassLayer } from './LiquidGlassLayer';

export const LOCK_SHORTCUT_LABEL = 'Ctrl+Shift+L';

/**
 * Handles inactivity auto-lock, the lock keyboard shortcut, and renders the
 * full-window blur overlay while locked.
 */
export const AppLockScreen: React.FC = () => {
  const enabled = useAppLock((s) => s.enabled);
  const locked = useAppLock((s) => s.locked);
  const timeoutMinutes = useAppLock((s) => s.timeoutMinutes);
  const shortcutEnabled = useAppLock((s) => s.shortcutEnabled);
  const lockoutUntil = useAppLock((s) => s.lockoutUntil);
  const lock = useAppLock((s) => s.lock);
  const unlock = useAppLock((s) => s.unlock);
  const signOut = useChatStore((s) => s.signOut);
  const disable = useAppLock((s) => s.disable);

  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastActivity = useRef(Date.now());

  // Inactivity timer (timestamp based so it survives sleep / throttled timers).
  useEffect(() => {
    if (!enabled || locked || timeoutMinutes <= 0) return undefined;
    lastActivity.current = Date.now();
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity.current >= timeoutMinutes * 60_000) lock();
    }, 5_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(interval);
    };
  }, [enabled, locked, timeoutMinutes, lock]);

  // Lock shortcut.
  useEffect(() => {
    if (!enabled || !shortcutEnabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        lock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, shortcutEnabled, lock]);

  // Make everything behind the overlay unreachable (clicks and Tab focus).
  useEffect(() => {
    if (!locked) return undefined;
    const host = document.getElementById('applock-overlay')?.parentElement;
    const others = host
      ? Array.from(host.children).filter((el) => el.id !== 'applock-overlay')
      : [];
    others.forEach((el) => el.setAttribute('inert', ''));
    return () => others.forEach((el) => el.removeAttribute('inert'));
  }, [locked]);

  useEffect(() => {
    if (locked) {
      setSecret('');
      setError('');
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [locked]);

  // Tick for lockout countdown.
  useEffect(() => {
    if (!locked || lockoutUntil <= Date.now()) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [locked, lockoutUntil]);

  const remaining = Math.max(0, Math.ceil((lockoutUntil - now) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !secret || remaining > 0) return;
    setBusy(true);
    const ok = await unlock(secret);
    setBusy(false);
    if (!ok) {
      setSecret('');
      setNow(Date.now());
      setError('Incorrect PIN or password.');
      inputRef.current?.focus();
    }
  };

  const forgot = async () => {
    if (
      !window.confirm(
        'Sign out and remove the app lock? You will need to sign in again with your account.'
      )
    ) {
      return;
    }
    disable();
    await signOut();
  };

  return (
    <AnimatePresence>
      {locked && (
        <motion.div
          id="applock-overlay"
          key="applock"
          role="dialog"
          aria-modal="true"
          aria-label="SkellyTalk is locked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-[#090F0C]/55 backdrop-blur-[40px] backdrop-saturate-150"
        >
          <motion.form
            onSubmit={(e) => void submit(e)}
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-panel glass-surface relative mx-4 flex w-full max-w-xs flex-col items-center overflow-hidden rounded-3xl px-7 py-8 text-center"
          >
            <LiquidGlassLayer variant="modal" />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-emerald-950 dark:text-white">SkellyTalk Locked</h2>
            <p className="mt-1 text-xs text-emerald-900/75 dark:text-emerald-100/70">
              Enter your PIN or password to continue.
            </p>
            <input
              ref={inputRef}
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => {
                setSecret(e.target.value);
                setError('');
              }}
              disabled={remaining > 0}
              aria-label="PIN or password"
              placeholder="PIN or password"
              className="glass-pill mt-5 w-full rounded-xl px-3 py-2.5 text-center text-sm tracking-widest text-emerald-950 outline-none focus:border-[#22C55E] disabled:opacity-50 dark:text-white"
            />
            <div className="mt-2 min-h-[16px] text-[11px] font-semibold text-rose-600 dark:text-rose-300" role="alert">
              {remaining > 0 ? `Too many attempts. Try again in ${remaining}s.` : error}
            </div>
            <button
              type="submit"
              disabled={busy || !secret || remaining > 0}
              className="mt-3 w-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-2 text-sm font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Checking...' : 'Unlock'}
            </button>
            <button
              type="button"
              onClick={() => void forgot()}
              className="mt-4 text-[11px] font-semibold text-emerald-800/70 hover:underline dark:text-emerald-200/60"
            >
              Forgot PIN? Sign out
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
