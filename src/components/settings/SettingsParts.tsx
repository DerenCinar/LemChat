import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Lock } from 'lucide-react';
import { useAppLock, MIN_SECRET_LENGTH } from '../../store/useAppLock';
import { LOCK_SHORTCUT_LABEL } from '../AppLockScreen';
import { InfoTooltip } from '../InfoTooltip';

export const SettingLabel: React.FC<{ label: string; info: string }> = ({ label, info }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-200/65">
    <span>{label}</span>
    <InfoTooltip title={label} description={info} />
  </span>
);

export const GlassToggle: React.FC<{
  label: string;
  info: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}> = ({ label, info, checked, onChange }) => (
  <div className="glass-pill flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] font-medium text-emerald-950 dark:text-emerald-50">
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{label}</span>
      <InfoTooltip title={label} description={info} />
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 ${
        checked
          ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm'
          : 'bg-black/20 dark:bg-white/15'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

export const SettingsSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionRef?: React.RefObject<HTMLDivElement>;
}> = ({ title, description, children, defaultOpen = false, sectionRef }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      ref={sectionRef}
      className="glass-section rounded-2xl"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 dark:hover:bg-white/[0.04]"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-emerald-950 dark:text-white">{title}</span>
          <span className="mt-0.5 block text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
            {description}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-emerald-700 transition-transform duration-200 dark:text-emerald-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const AppLockSettings: React.FC = () => {
  const enabled = useAppLock((s) => s.enabled);
  const timeoutMinutes = useAppLock((s) => s.timeoutMinutes);
  const shortcutEnabled = useAppLock((s) => s.shortcutEnabled);
  const enable = useAppLock((s) => s.enable);
  const disable = useAppLock((s) => s.disable);
  const verify = useAppLock((s) => s.verify);
  const changeSecret = useAppLock((s) => s.changeSecret);
  const lock = useAppLock((s) => s.lock);
  const setTimeoutMinutes = useAppLock((s) => s.setTimeoutMinutes);
  const setShortcutEnabled = useAppLock((s) => s.setShortcutEnabled);

  const [mode, setMode] = useState<'idle' | 'enable' | 'change' | 'disable'>('idle');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode('idle');
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'enable' || mode === 'change') {
        if (mode === 'change' && !(await verify(current))) {
          setError('Current PIN or password is incorrect.');
          return;
        }
        if (next.length < MIN_SECRET_LENGTH) {
          setError(`Use at least ${MIN_SECRET_LENGTH} characters (a 4-digit PIN works).`);
          return;
        }
        if (next !== confirm) {
          setError('The two entries do not match.');
          return;
        }
        if (mode === 'enable') await enable(next);
        else await changeSecret(next);
        reset();
      } else if (mode === 'disable') {
        if (!(await verify(current))) {
          setError('Incorrect PIN or password.');
          return;
        }
        disable();
        reset();
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldClass = 'glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none focus:border-[#22C55E]';

  return (
    <SettingsSection
      title="App Lock"
      description="Require a PIN or password to open SkellyTalk. Off by default."
    >
      <div className="glass-pill space-y-3.5 rounded-2xl p-4 text-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 text-[#22C55E]" />
            <div>
              <p className="font-semibold text-emerald-950 dark:text-white">Enable App Lock</p>
              <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                Blurs the whole window until you enter your PIN or password.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Enable App Lock"
            onClick={() => {
              reset();
              setMode(enabled ? 'disable' : 'enable');
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              enabled ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]' : 'bg-black/20 dark:bg-white/15'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {mode !== 'idle' && (
          <form
            onSubmit={(e) => void submit(e)}
            className="space-y-2 border-t border-black/5 pt-3 dark:border-white/10"
          >
            {(mode === 'change' || mode === 'disable') && (
              <input
                type="password"
                autoComplete="off"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Current PIN or password"
                className={fieldClass}
              />
            )}
            {(mode === 'enable' || mode === 'change') && (
              <>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="New 4-digit PIN or password"
                  className={fieldClass}
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm"
                  className={fieldClass}
                />
              </>
            )}
            {error && (
              <p role="alert" className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm hover:brightness-110 disabled:opacity-60"
              >
                {mode === 'enable' ? 'Turn On' : mode === 'change' ? 'Save' : 'Turn Off'}
              </button>
            </div>
          </form>
        )}

        {enabled && mode === 'idle' && (
          <div className="space-y-3 border-t border-black/5 pt-3 dark:border-white/10">
            <div className="space-y-1.5">
              <SettingLabel
                label="Lock after inactivity"
                info="Automatically locks SkellyTalk after this long without mouse or keyboard activity."
              />
              <select
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
              >
                <option value={0}>Never (manual only)</option>
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
            <GlassToggle
              label={`Lock shortcut (${LOCK_SHORTCUT_LABEL})`}
              info="Press this key combination anywhere in the app to lock it instantly."
              checked={shortcutEnabled}
              onChange={setShortcutEnabled}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setMode('change')}
                className="glass-pill rounded-full px-3.5 py-1.5 text-xs font-semibold"
              >
                Change PIN / Password
              </button>
              <button
                type="button"
                onClick={lock}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm hover:brightness-110"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Lock Now</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
};
