import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, KeyRound, Mail, User, AtSign, ArrowRight, RotateCcw } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { LiquidGlassLayer } from './LiquidGlassLayer';
import {
  clearSupabaseConfig,
  getSupabaseConfig,
  saveSupabaseConfig,
} from '../lib/supabase';

export const AuthScreen: React.FC = () => {
  const configured = useChatStore((s) => s.configured);
  const authLoading = useChatStore((s) => s.authLoading);
  const authError = useChatStore((s) => s.authError);
  const initializeApp = useChatStore((s) => s.initializeApp);
  const signIn = useChatStore((s) => s.signIn);
  const signUp = useChatStore((s) => s.signUp);

  const existingCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(existingCfg.url);
  const [sbKey, setSbKey] = useState(existingCfg.anonKey);
  const [setupError, setSetupError] = useState<string | null>(null);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.trim().startsWith('https://') && !sbUrl.trim().startsWith('http://')) {
      setSetupError('Please enter a valid Supabase Project URL (https://...).');
      return;
    }
    if (sbKey.trim().length < 20) {
      setSetupError('Please enter a valid Supabase Anon / Public API key.');
      return;
    }
    setSetupError(null);
    saveSupabaseConfig(sbUrl, sbKey);
    await initializeApp();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg(null);
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      const msg = await signUp(
        email,
        password,
        displayName || email.split('@')[0],
        handle || email.split('@')[0]
      );
      if (msg && !msg.toLowerCase().includes('error')) {
        setInfoMsg(msg);
      }
    }
  };

  if (!configured) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          className="glass-panel glass-surface relative w-full max-w-md overflow-hidden rounded-3xl p-7"
        >
          <LiquidGlassLayer variant="modal" />
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-950 dark:text-white">
                Connect SkellyTalk to Supabase
              </h1>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-200/60">
                Real-time Auth, Postgres, Presence & Storage
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs leading-relaxed text-emerald-900/75 dark:text-emerald-100/70">
            Run <code className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">supabase/schema.sql</code> in your Supabase SQL Editor, then enter your Project URL and Anon Key below (or add them to <code className="rounded bg-black/15 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">.env</code>).
          </p>

          <form onSubmit={handleSaveSupabase} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-200/80">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/40 outline-none focus:border-[#22C55E] dark:text-white dark:placeholder-emerald-100/35"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-emerald-900/80 dark:text-emerald-200/80">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                required
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/40 outline-none focus:border-[#22C55E] dark:text-white dark:placeholder-emerald-100/35"
              />
            </div>

            {setupError && (
              <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-500 dark:text-rose-300">
                {setupError}
              </p>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow transition hover:brightness-110"
            >
              <span>Connect Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-1 items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="glass-panel glass-surface relative w-full max-w-md overflow-hidden rounded-3xl p-7"
      >
        <LiquidGlassLayer variant="modal" />
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-xl leading-none text-white shadow-lem-glow">
              💀
            </div>
            <div>
              <h1 className="text-lg font-bold text-emerald-950 dark:text-white">
                {mode === 'signin' ? 'Sign in to SkellyTalk' : 'Create SkellyTalk Account'}
              </h1>
              <p className="text-xs text-emerald-800/70 dark:text-emerald-200/60">
                Real-Time Liquid Glass Messaging
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              clearSupabaseConfig();
              void initializeApp();
            }}
            title="Change Supabase project"
            className="glass-pill flex h-8 w-8 items-center justify-center rounded-full text-emerald-800/70 hover:text-emerald-950 dark:text-emerald-200/70 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="glass-pill mb-5 grid grid-cols-2 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`relative rounded-xl py-1.5 text-xs font-semibold transition-colors ${
              mode === 'signin'
                ? 'text-white'
                : 'text-emerald-900/70 dark:text-emerald-200/70'
            }`}
          >
            {mode === 'signin' && (
              <motion.div
                layoutId="auth-mode-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm"
              />
            )}
            <span className="relative z-10">Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`relative rounded-xl py-1.5 text-xs font-semibold transition-colors ${
              mode === 'signup'
                ? 'text-white'
                : 'text-emerald-900/70 dark:text-emerald-200/70'
            }`}
          >
            {mode === 'signup' && (
              <motion.div
                layoutId="auth-mode-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm"
              />
            )}
            <span className="relative z-10">Create Account</span>
          </button>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-3.5">
          <AnimatePresence initial={false}>
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="space-y-3.5 overflow-hidden"
              >
                <div
                  data-input-shell
                  className="glass-pill flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#22C55E]/20"
                >
                  <User className="h-4 w-4 text-[#22C55E]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display Name (e.g. Maya Lin)"
                    className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
                  />
                </div>

                <div
                  data-input-shell
                  className="glass-pill flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#22C55E]/20"
                >
                  <AtSign className="h-4 w-4 text-[#22C55E]" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={24}
                    pattern="@?[A-Za-z0-9_]+"
                    title="Use 3-24 letters, numbers, or underscores"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="Handle (e.g. mayalin)"
                    className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            data-input-shell
            className="glass-pill flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#22C55E]/20"
          >
            <Mail className="h-4 w-4 text-[#22C55E]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email address"
              className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
            />
          </div>

          <div
            data-input-shell
            className="glass-pill flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition focus-within:border-[#22C55E] focus-within:ring-2 focus-within:ring-[#22C55E]/20"
          >
            <KeyRound className="h-4 w-4 text-[#22C55E]" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 6 characters)"
              className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/40"
            />
          </div>

          {authError && (
            <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
              {authError}
            </p>
          )}

          {infoMsg && (
            <p className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow transition hover:brightness-110 disabled:opacity-60"
          >
            <span>
              {authLoading
                ? 'Connecting...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
};
