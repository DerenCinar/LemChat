import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import packageInfo from '../../package.json';
import {
  Moon,
  Sun,
  Contrast,
  LogOut,
  Wifi,
  Check,
  Bell,
  Volume2,
  Sparkles,
  RefreshCw,
  Camera,
  Download,
  Upload,
  ChevronDown,
  Trash2,
  Lock,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { useAppLock, MIN_SECRET_LENGTH } from '../store/useAppLock';
import { LOCK_SHORTCUT_LABEL } from './AppLockScreen';
import { InfoTooltip } from './InfoTooltip';
import { LiquidGlassSlider } from './LiquidGlassSlider';
import { LiquidGlassLayer } from './LiquidGlassLayer';
import {
  NOTIFICATION_SOUNDS,
  RINGTONES,
  playNotificationChime,
  previewRingtone,
  stopRingtone,
} from '../lib/sound';
import { APP_LOGOS, applyAppLogo, useAppLogoId } from '../lib/appLogo';
import { LANGUAGES, useLanguage, useT, type Language } from '../lib/i18n';
import type {
  GlassDepth,
  NotificationRevealMode,
  NotificationSoundId,
  RealGlassMode,
  RealGlassQuality,
  RingtoneId,
} from '../types/chat';
import {
  UserAvatar,
  AVATAR_BG_PRESETS,
  parseAvatarSpec,
  serializeAvatarSpec,
  type AvatarMode,
} from './UserAvatar';

const SettingLabel: React.FC<{ label: string; info: string }> = ({ label, info }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/70 dark:text-emerald-200/65">
    <span>{label}</span>
    <InfoTooltip title={label} description={info} />
  </span>
);

const GlassToggle: React.FC<{
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

const SettingsSection: React.FC<{
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

const AppLockSettings: React.FC = () => {
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

export const SettingsView: React.FC = () => {
  const appLogo = useAppLogoId();
  const theme = useChatStore((s) => s.theme);
  const self = useChatStore((s) => s.self);
  const realtimeConnected = useChatStore((s) => s.realtimeConnected);
  const setTheme = useChatStore((s) => s.setTheme);
  const chatFont = useChatStore((s) => s.chatFont);
  const chatFontSize = useChatStore((s) => s.chatFontSize);
  const profanityFilter = useChatStore((s) => s.profanityFilter);
  const setChatFont = useChatStore((s) => s.setChatFont);
  const setChatFontSize = useChatStore((s) => s.setChatFontSize);
  const setProfanityFilter = useChatStore((s) => s.setProfanityFilter);
  const signOut = useChatStore((s) => s.signOut);
  const deleteAccount = useChatStore((s) => s.deleteAccount);
  const updateSelfProfile = useChatStore((s) => s.updateSelfProfile);
  const uploadAvatar = useChatStore((s) => s.uploadAvatar);
  const notificationsEnabled = useChatStore((s) => s.notificationsEnabled);
  const notifyWhenFocused = useChatStore((s) => s.notifyWhenFocused);
  const soundEnabled = useChatStore((s) => s.soundEnabled);
  const setNotificationsEnabled = useChatStore((s) => s.setNotificationsEnabled);
  const setNotifyWhenFocused = useChatStore((s) => s.setNotifyWhenFocused);
  const setSoundEnabled = useChatStore((s) => s.setSoundEnabled);
  const sendTestNotification = useChatStore((s) => s.sendTestNotification);
  const updateStatus = useChatStore((s) => s.updateStatus);
  const checkForUpdates = useChatStore((s) => s.checkForUpdates);
  const downloadUpdate = useChatStore((s) => s.downloadUpdate);
  const installUpdate = useChatStore((s) => s.installUpdate);
  const liquidGlass = useChatStore((s) => s.liquidGlass);
  const setLiquidGlass = useChatStore((s) => s.setLiquidGlass);
  const resetLiquidGlass = useChatStore((s) => s.resetLiquidGlass);
  const importLiquidGlass = useChatStore((s) => s.importLiquidGlass);
  const updateSectionRef = useRef<HTMLDivElement | null>(null);
  const [appVersion, setAppVersion] = useState(packageInfo.version);
  const t = useT();
  const language = useLanguage((st) => st.language);
  const setLanguage = useLanguage((st) => st.setLanguage);
  const [previewingRingtone, setPreviewingRingtone] = useState(false);

  useEffect(() => () => stopRingtone(), []);

  useEffect(() => {
    let active = true;
    if (window.lemchat?.getAppVersion) {
      void window.lemchat.getAppVersion()
        .then((version) => {
          if (active && version) setAppVersion(version);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const [displayName, setDisplayName] = useState(self?.name ?? '');
  const [role, setRole] = useState(self?.role ?? '');
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [themeCode, setThemeCode] = useState('');
  const identityKey = self ? `skellytalk_identity_${self.id}` : 'skellytalk_identity';
  const [pronouns, setPronouns] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(identityKey) || '{}') as { pronouns?: string }).pronouns || ''; } catch { return ''; }
  });
  const [bio, setBio] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(identityKey) || '{}') as { bio?: string }).bio || ''; } catch { return ''; }
  });
  const [activity, setActivity] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(identityKey) || '{}') as { activity?: string }).activity || ''; } catch { return ''; }
  });
  const [statusText, setStatusText] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(identityKey) || '{}') as { statusText?: string }).statusText || ''; } catch { return ''; }
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSelfProfile(displayName, role);
    if (self) {
      localStorage.setItem(`skellytalk_identity_${self.id}`, JSON.stringify({
        pronouns,
        bio,
        activity,
        statusText,
      }));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    await uploadAvatar(file);
    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Delete your SkellyTalk account permanently? Your profile, messages, memberships, and encryption keys will be deleted. This cannot be undone.'
      )
    ) {
      return;
    }

    setDeletingAccount(true);
    setAccountDeleteError(null);
    try {
      await deleteAccount();
    } catch (error) {
      setAccountDeleteError(error instanceof Error ? error.message : 'Unable to delete your account.');
      setDeletingAccount(false);
    }
  };

  const currentAvatarSpec = self ? parseAvatarSpec(self.avatar, self.name) : null;

  const updateAvatarStyle = async (mode: AvatarMode) => {
    if (!self || !currentAvatarSpec) return;
    if (mode === 'image' && !currentAvatarSpec.url) {
      avatarInputRef.current?.click();
      return;
    }
    const nextSpec = serializeAvatarSpec({
      ...currentAvatarSpec,
      mode,
    });
    await updateSelfProfile(displayName || self.name, role || self.role, nextSpec);
  };

  const updateAvatarBg = async (bg: string) => {
    if (!self || !currentAvatarSpec) return;
    const nextSpec = serializeAvatarSpec({
      ...currentAvatarSpec,
      bg,
    });
    await updateSelfProfile(displayName || self.name, role || self.role, nextSpec);
  };

  const handleWallpaper = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setThemeCode('Wallpaper must be smaller than 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLiquidGlass({ wallpaper: String(reader.result ?? '') });
    reader.readAsDataURL(file);
  };

  const exportTheme = () => {
    const payload = JSON.stringify({
      theme,
      chatFont,
      chatFontSize,
      liquidGlass,
    });
    const code = btoa(unescape(encodeURIComponent(payload)));
    setThemeCode(code);
  };

  const importTheme = () => {
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(themeCode.trim()))));
      if (!payload.liquidGlass) throw new Error('Invalid theme code');
      setTheme(payload.theme);
      setChatFont(payload.chatFont);
      setChatFontSize(payload.chatFontSize);
      importLiquidGlass(payload.liquidGlass);
      setThemeCode('Theme imported.');
    } catch {
      setThemeCode('Invalid theme code.');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className="glass-panel glass-surface relative flex flex-1 flex-col overflow-hidden rounded-2xl"
    >
      <LiquidGlassLayer variant="panel" />
      <div
        className="lem-scrollbar relative z-10 flex-1 overflow-y-auto p-4 md:p-6"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="mx-auto w-full max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-emerald-950 dark:text-white">
            SkellyTalk Preferences
          </h1>
          <p className="mt-1 text-xs text-emerald-800/70 dark:text-emerald-200/60">
            Manage your profile, Liquid Glass theme, notifications, and live session.
          </p>
        </div>

        {(updateStatus.status === 'available' ||
          updateStatus.status === 'downloading' ||
          updateStatus.status === 'downloaded') && (
          <div className="glass-card flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-[#22C55E]/25">
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950 dark:text-white">
                Update available
              </p>
              <p className="mt-0.5 text-xs font-medium text-emerald-900/75 dark:text-emerald-100/80">
                {updateStatus.version
                  ? `SkellyTalk v${updateStatus.version} is ready or downloading.`
                  : 'A new SkellyTalk update is ready or downloading.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                (() => {
                  if (updateSectionRef.current) {
                    updateSectionRef.current.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                  }
                })()
              }
              className="shrink-0 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-2 text-xs font-bold text-white shadow-lem-glow-sm hover:brightness-110"
            >
              View Update
            </button>
          </div>
        )}

        {self && (
          <SettingsSection
            title="Profile"
            description="Manage your identity, avatar, and profile details."
          >
            <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleAvatarChange(e)}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  title="Upload profile picture"
                  className="group relative shrink-0"
                >
                  <UserAvatar
                    avatar={self.avatar}
                    name={self.name}
                    className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm"
                    textClassName="text-sm font-bold"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>
                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-white">
                    {self.name}
                  </p>
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/65">
                    {self.handle} · {self.role}
                  </p>
                  <button
                    type="button"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-1 text-[11px] font-semibold text-[#22C55E] hover:underline disabled:opacity-60"
                  >
                    {uploadingAvatar ? 'Uploading photo...' : 'Change Profile Picture'}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 dark:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
            <div className="mt-4 border-t border-rose-500/15 pt-4">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => void handleDeleteAccount()}
                className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deletingAccount ? 'Deleting account...' : 'Delete Account'}</span>
              </button>
              <p className="mt-2 text-[11px] text-emerald-800/60 dark:text-emerald-200/55">
                Permanently deletes your profile and account data.
              </p>
              {accountDeleteError && (
                <p role="alert" className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
                  {accountDeleteError}
                </p>
              )}
            </div>

            {/* Profile Picture Style & Independent Background Color */}
            {currentAvatarSpec && (
              <div className="space-y-3 border-t border-black/5 pt-3 dark:border-white/10">
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                    Profile Picture Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => void updateAvatarStyle('letter')}
                      className={`glass-pill flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        currentAvatarSpec.mode === 'letter'
                          ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 ring-1 ring-[#22C55E]/40 dark:text-white'
                          : 'text-emerald-900/75 hover:bg-black/5 dark:text-emerald-100/75 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-black/15 text-[11px] font-bold dark:bg-white/15">
                        {currentAvatarSpec.letter}
                      </span>
                      <span>First Letter</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void updateAvatarStyle('icon')}
                      className={`glass-pill flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        currentAvatarSpec.mode === 'icon'
                          ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 ring-1 ring-[#22C55E]/40 dark:text-white'
                          : 'text-emerald-900/75 hover:bg-black/5 dark:text-emerald-100/75 dark:hover:bg-white/5'
                      }`}
                    >
                      <UserAvatar
                        avatar={serializeAvatarSpec({ mode: 'icon', bg: currentAvatarSpec.bg })}
                        name={self.name}
                        className="h-5 w-5 rounded-md bg-gradient-to-br from-[#22C55E] to-[#10B981]"
                      />
                      <span>Default Icon</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void updateAvatarStyle('image')}
                      className={`glass-pill flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        currentAvatarSpec.mode === 'image'
                          ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 ring-1 ring-[#22C55E]/40 dark:text-white'
                          : 'text-emerald-900/75 hover:bg-black/5 dark:text-emerald-100/75 dark:hover:bg-white/5'
                      }`}
                    >
                      <Camera className="h-3.5 w-3.5 text-[#22C55E]" />
                      <span>Custom Image</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                    Avatar Background Color
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {AVATAR_BG_PRESETS.map((preset) => {
                      const isSelected = currentAvatarSpec.bg === preset.value;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => void updateAvatarBg(preset.value)}
                          title={preset.label}
                          style={
                            preset.value === 'theme'
                              ? undefined
                              : { backgroundColor: preset.value }
                          }
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110 ${
                            preset.value === 'theme'
                              ? 'bg-gradient-to-br from-[#22C55E] to-[#10B981] text-[9px] font-bold text-white'
                              : ''
                          } ${
                            isSelected
                              ? 'border-white ring-2 ring-[#22C55E] ring-offset-2 ring-offset-transparent'
                              : 'border-white/30'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                          ) : preset.value === 'theme' ? (
                            'T'
                          ) : null}
                        </button>
                      );
                    })}

                    <label
                      title="Custom color"
                      className="glass-pill flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold text-emerald-900 dark:text-emerald-100"
                    >
                      <input
                        type="color"
                        value={
                          currentAvatarSpec.bg !== 'theme'
                            ? currentAvatarSpec.bg
                            : '#2563EB'
                        }
                        onChange={(e) => void updateAvatarBg(e.target.value)}
                        className="h-4 w-4 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      />
                      <span>Custom</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border-t border-black/5 pt-3 dark:border-white/10">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="glass-pill w-full rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none focus:border-[#22C55E] dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                  Role / Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="glass-pill w-full rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none focus:border-[#22C55E] dark:text-white"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Pronouns</span>
                <input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Listening / Playing</span>
                <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Listening to Midnight FM" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Short bio</span>
                <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short profile bio" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Custom status</span>
                <input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="🎮 Grinding ranked" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
              </label>
            </div>

            <div className="flex justify-end">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110"
              >
                {saved && <Check className="h-3.5 w-3.5" />}
                <span>{saved ? 'Saved!' : 'Save Profile'}</span>
              </motion.button>
            </div>
            </form>
          </SettingsSection>
        )}

        <SettingsSection
          title="Appearance"
          description="Choose a theme and tune the Liquid Glass look and feel."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('dark')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'dark'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 ring-1 ring-[#22C55E]/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Moon className="h-5 w-5 shrink-0 text-[#22C55E]" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Forest-Slate Dark
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  #090F0C · Emerald mesh
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('light')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'light'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 ring-1 ring-[#22C55E]/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sun className="h-5 w-5 shrink-0 text-[#10B981]" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Frosted Mint Light
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  #F0FDF4 · Mint glass
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('mono')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'mono'
                  ? 'border-zinc-900 bg-zinc-900/10 ring-1 ring-zinc-900/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Contrast className="h-5 w-5 shrink-0 text-zinc-900 dark:text-white" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Black &amp; White
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  Light Mode · Black/Gray accent
                </p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme('mono-dark')}
              className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                theme === 'mono-dark'
                  ? 'border-zinc-300 bg-white/10 ring-1 ring-zinc-300/50'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Contrast className="h-5 w-5 shrink-0 text-zinc-100" />
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-white">
                  Black &amp; White Dark
                </p>
                <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  #09090B · Silver glass
                </p>
              </div>
            </motion.button>

            {([
              ['ocean', 'Ocean Glass', 'Deep blue · Cyan glow', 'from-sky-400 to-cyan-400'],
              ['sunset', 'Sunset Glass', 'Orange · Violet glow', 'from-orange-400 to-violet-500'],
              ['rose', 'Rose Glass', 'Rose · Pink glow', 'from-rose-400 to-fuchsia-500'],
              ['aurora', 'Aurora Glass', 'Green · Indigo shimmer', 'from-emerald-300 to-indigo-500'],
              ['ice', 'Ice Glass', 'Frost · Arctic blue', 'from-cyan-100 to-blue-500'],
              ['amethyst', 'Amethyst Glass', 'Violet · Orchid glow', 'from-violet-400 to-pink-500'],
            ] as const).map(([mode, title, subtitle, gradient]) => (
              <motion.button
                key={mode}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(mode)}
                className={`glass-pill flex items-center gap-3 rounded-2xl p-4 text-left transition ${
                  theme === mode
                    ? 'border-white/60 bg-white/10 ring-1 ring-white/50'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <span className={`h-5 w-5 shrink-0 rounded-full bg-gradient-to-br ${gradient}`} />
                <div>
                  <p className="text-xs font-bold text-emerald-950 dark:text-white">{title}</p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">{subtitle}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="glass-pill space-y-3 rounded-2xl p-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
                App Logo
              </h2>
              <p className="mt-1 text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                Used for the tab icon, window icon and system tray.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {APP_LOGOS.map((logo) => (
                <motion.button
                  key={logo.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    applyAppLogo(logo.id);
                  }}
                  className={`glass-pill flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition ${
                    appLogo === logo.id
                      ? 'border-white/60 bg-white/10 ring-1 ring-white/50'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <img
                    src={logo.src}
                    alt=""
                    className="h-16 w-16 rounded-xl bg-white/70 object-contain p-1"
                  />
                  <span className="text-xs font-bold text-emerald-950 dark:text-white">{logo.label}</span>
                  <span className="text-[10px] leading-tight text-emerald-800/65 dark:text-emerald-200/55">
                    {logo.description}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="glass-pill relative space-y-4 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
                Live Liquid Glass
              </h2>
              <button
                type="button"
                onClick={resetLiquidGlass}
                className="text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
              >
                Reset
              </button>
            </div>

            {/* Real Liquid Glass Engine */}
            <div className="glass-pill relative space-y-3 rounded-2xl border border-[#22C55E]/25 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                    <span className="text-xs font-bold text-emerald-950 dark:text-white">
                      Real Liquid Glass Engine
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-emerald-800/70 dark:text-emerald-200/65">
                    Uses shared GPU SVG backdrop refraction, chromatic edge dispersion, and frosted depth across glass surfaces. Best in Chromium / Desktop app.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={liquidGlass.useRealLiquidGlass}
                  aria-label="Enable Real Liquid Glass Engine"
                  onClick={() =>
                    setLiquidGlass({ useRealLiquidGlass: !liquidGlass.useRealLiquidGlass })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 ${
                    liquidGlass.useRealLiquidGlass
                      ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981] shadow-lem-glow-sm'
                      : 'bg-black/20 dark:bg-white/15'
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${
                      liquidGlass.useRealLiquidGlass ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {liquidGlass.reduceTransparency && (
                <p className="rounded-xl bg-amber-500/15 px-2.5 py-1.5 text-[10.5px] font-medium text-amber-800 dark:text-amber-200">
                  Accessibility &ldquo;Reduce transparency&rdquo; is active and overrides real glass refraction until turned off.
                </p>
              )}

              <AnimatePresence initial={false}>
                {liquidGlass.useRealLiquidGlass && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    className="space-y-3 overflow-hidden border-t border-black/5 pt-3 dark:border-white/10"
                  >
                    <div className="space-y-1.5">
                      <SettingLabel
                        label="Refraction mode"
                        info="Selects the optical displacement map profile used by Real Liquid Glass: standard, polar, prominent, or custom shader."
                      />
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['standard', 'polar', 'prominent', 'shader'] as RealGlassMode[]).map(
                          (mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setLiquidGlass({ realGlassMode: mode })}
                              className={`glass-pill rounded-xl py-1.5 text-[11px] font-semibold capitalize transition ${
                                liquidGlass.realGlassMode === mode
                                  ? 'border-[#22C55E] bg-[#22C55E]/20 text-emerald-950 ring-1 ring-[#22C55E]/40 dark:text-white'
                                  : 'text-emerald-900/70 hover:bg-black/5 dark:text-emerald-100/70 dark:hover:bg-white/5'
                              }`}
                            >
                              {mode}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <SettingLabel
                        label="Performance / Coverage"
                        info="Controls how many surfaces run real SVG backdrop refraction: Minimal (overlays & composer), Balanced (full app panels, rail, composer & overlays — recommended), or All (also adds scrolling message bubbles)."
                      />
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            ['minimal', 'Minimal (Fastest)'],
                            ['balanced', 'Balanced (Full UI)'],
                            ['all', 'All (+ Bubbles)'],
                          ] as [RealGlassQuality, string][]
                        ).map(([quality, label]) => (
                          <button
                            key={quality}
                            type="button"
                            onClick={() => setLiquidGlass({ realGlassQuality: quality })}
                            className={`glass-pill rounded-xl py-1.5 text-[11px] font-semibold transition ${
                              liquidGlass.realGlassQuality === quality
                                ? 'border-[#22C55E] bg-[#22C55E]/20 text-emerald-950 ring-1 ring-[#22C55E]/40 dark:text-white'
                                : 'text-emerald-900/70 hover:bg-black/5 dark:text-emerald-100/70 dark:hover:bg-white/5'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <LiquidGlassSlider
                        label="Refraction"
                        value={liquidGlass.refractionScale}
                        min={0}
                        max={140}
                        step={2}
                        info="Controls optical distortion and backdrop warping intensity along glass edges."
                        onChange={(refractionScale) => setLiquidGlass({ refractionScale })}
                      />
                      <LiquidGlassSlider
                        label="Aberration"
                        value={liquidGlass.aberrationIntensity}
                        min={0}
                        max={6}
                        step={0.5}
                        info="Splits RGB light channels slightly along glass rims for prismatic edge dispersion."
                        onChange={(aberrationIntensity) => setLiquidGlass({ aberrationIntensity })}
                      />
                      <LiquidGlassSlider
                        label="Elasticity"
                        value={liquidGlass.glassElasticity}
                        min={0}
                        max={35}
                        step={1}
                        unit="%"
                        info="Adds subtle spring stretch and specular tilt toward your cursor on hover."
                        onChange={(glassElasticity) => setLiquidGlass({ glassElasticity })}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* One-Click Presets */}
            <div className="space-y-1.5">
              <SettingLabel
                label="Quick presets"
                info="Instantly applies a curated Liquid Glass material profile."
              />
              <div className="flex flex-wrap gap-1.5">
                {([
                  [
                    'Crystal Clear',
                    {
                      useRealLiquidGlass: false,
                      blur: 12,
                      opacity: 48,
                      borderGlow: 26,
                      roundness: 26,
                      glassSaturation: 195,
                      specularSheen: 75,
                      glassTintStrength: 25,
                      glassDepth: 'elevated' as GlassDepth,
                    },
                  ],
                  [
                    'Frosted Ice',
                    {
                      useRealLiquidGlass: false,
                      blur: 36,
                      opacity: 78,
                      borderGlow: 18,
                      roundness: 22,
                      glassSaturation: 165,
                      specularSheen: 60,
                      glassTintStrength: 35,
                      glassDepth: 'elevated' as GlassDepth,
                    },
                  ],
                  [
                    'Apple Liquid (Real)',
                    {
                      useRealLiquidGlass: true,
                      realGlassMode: 'standard' as RealGlassMode,
                      realGlassQuality: 'balanced' as RealGlassQuality,
                      refractionScale: 74,
                      aberrationIntensity: 2.5,
                      glassElasticity: 20,
                      blur: 8,
                      opacity: 56,
                      borderGlow: 24,
                      roundness: 24,
                      glassSaturation: 200,
                      specularSheen: 80,
                      glassTintStrength: 45,
                      glassDepth: 'floating' as GlassDepth,
                    },
                  ],
                  [
                    'Obsidian Glass',
                    {
                      useRealLiquidGlass: false,
                      blur: 28,
                      opacity: 88,
                      borderGlow: 12,
                      roundness: 18,
                      glassSaturation: 145,
                      specularSheen: 35,
                      glassTintStrength: 20,
                      glassDepth: 'floating' as GlassDepth,
                    },
                  ],
                  [
                    'Soft Minimal',
                    {
                      useRealLiquidGlass: false,
                      blur: 16,
                      opacity: 74,
                      borderGlow: 6,
                      roundness: 16,
                      glassSaturation: 130,
                      specularSheen: 25,
                      glassTintStrength: 15,
                      glassDepth: 'flat' as GlassDepth,
                    },
                  ],
                ] as const).map(([presetName, patch]) => (
                  <motion.button
                    key={presetName}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => setLiquidGlass(patch)}
                    className="glass-pill rounded-full px-3 py-1.5 text-[11px] font-semibold text-emerald-950 transition hover:border-[#22C55E]/60 dark:text-emerald-100"
                  >
                    {presetName}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Live Liquid Glass & Bubble Preview */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-500/25 via-cyan-500/20 to-violet-500/25 p-4">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[#22C55E]/40 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-8 right-2 h-32 w-32 rounded-full bg-sky-400/35 blur-2xl"
              />
              <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-950/75 dark:text-white/80">
                  Live Preview
                </span>
                <span className="glass-pill relative rounded-full px-2.5 py-1 text-[10px] font-semibold text-emerald-950 dark:text-white">
                  <LiquidGlassLayer variant="pill" interactive alwaysRender cornerRadius={999} />
                  {liquidGlass.useRealLiquidGlass ? 'Real Refraction Active' : 'CSS Frosted Glass'}
                </span>
              </div>
              <div className="relative z-10 space-y-2.5">
                <div className="flex justify-start">
                  <div
                    data-message-bubble
                    data-is-me="false"
                    data-tail={
                      liquidGlass.bubbleStyle === 'imessage' ||
                      liquidGlass.bubbleStyle === 'imessage-classic'
                        ? 'true'
                        : 'false'
                    }
                    className="glass-panel glass-bubble-received relative max-w-[78%] rounded-[20px] px-3.5 py-2 text-xs text-emerald-950 dark:text-emerald-50"
                  >
                    <LiquidGlassLayer
                      variant="bubble"
                      interactive
                      alwaysRender
                      disabled={liquidGlass.bubbleStyle === 'imessage-classic'}
                    />
                    {(liquidGlass.bubbleStyle === 'imessage' ||
                      liquidGlass.bubbleStyle === 'imessage-classic') && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="bubble-tail-received pointer-events-none absolute -left-[5.8px] bottom-0 h-4 w-4 -scale-x-100"
                      >
                        <path
                          d="M 9.8 2 C 9.8 9.2 12.1 13.5 15.8 15.7 C 11.2 16.1 6.9 14.9 3.8 13.3 A 14 14 0 0 0 9.8 2 Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    Hey! Hover this glass bubble to feel the refraction.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div
                    data-message-bubble
                    data-is-me="true"
                    data-tail={
                      liquidGlass.bubbleStyle === 'imessage' ||
                      liquidGlass.bubbleStyle === 'imessage-classic'
                        ? 'true'
                        : 'false'
                    }
                    className="glass-panel glass-bubble-sent relative max-w-[78%] rounded-[20px] px-3.5 py-2 text-xs text-white"
                  >
                    <LiquidGlassLayer
                      variant="bubble"
                      interactive
                      alwaysRender
                      disabled={liquidGlass.bubbleStyle === 'imessage-classic'}
                    />
                    {(liquidGlass.bubbleStyle === 'imessage' ||
                      liquidGlass.bubbleStyle === 'imessage-classic') && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="bubble-tail-sent pointer-events-none absolute -right-[5.8px] bottom-0 h-4 w-4"
                      >
                        <path
                          d="M 9.8 2 C 9.8 9.2 12.1 13.5 15.8 15.7 C 11.2 16.1 6.9 14.9 3.8 13.3 A 14 14 0 0 0 9.8 2 Z"
                          fill="currentColor"
                        />
                      </svg>
                    )}
                    Smooth curved tails &amp; liquid glass!
                  </div>
                </div>
              </div>
            </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['blur', 'Blur intensity', 0, 48, 'px', 'Controls how strongly backgrounds blur behind frosted Liquid Glass panels.'],
              ['opacity', 'Glass opacity', 35, 95, '%', 'Adjusts how transparent or solid glass surfaces appear across windows.'],
              ['borderGlow', 'Border glow', 0, 50, '%', 'Sets the luminous highlight strength around card and panel edges.'],
              ['roundness', 'Corner roundness', 4, 36, 'px', 'Rounds the corners of panels, cards, and message containers.'],
              ['glassSaturation', 'Color saturation', 100, 240, '%', 'Boosts backdrop color vibrancy passing through glass surfaces.'],
              ['specularSheen', 'Specular sheen', 0, 100, '%', 'Controls the crisp top-edge specular highlight across Liquid Glass cards.'],
              ['glassTintStrength', 'Accent glass tint', 0, 100, '%', 'Blends your accent color subtly into frosted Liquid Glass panels.'],
            ] as const).map(([key, label, min, max, unit, info]) => (
              <LiquidGlassSlider
                key={key}
                label={label}
                value={liquidGlass[key]}
                min={min}
                max={max}
                step={key === 'glassSaturation' || key === 'specularSheen' || key === 'glassTintStrength' ? 5 : 1}
                unit={unit}
                info={info}
                onChange={(nextValue) => setLiquidGlass({ [key]: nextValue })}
              />
            ))}

            <div className="space-y-1.5">
              <SettingLabel
                label="Glass elevation depth"
                info="Controls shadow depth and floating separation of Liquid Glass cards."
              />
              <div className="grid grid-cols-3 gap-1.5">
                {(['flat', 'elevated', 'floating'] as GlassDepth[]).map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    onClick={() => setLiquidGlass({ glassDepth: depth })}
                    className={`glass-pill rounded-xl py-2 text-[11px] font-semibold capitalize transition ${
                      liquidGlass.glassDepth === depth
                        ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 dark:text-white'
                        : 'text-emerald-900/70 dark:text-emerald-100/70'
                    }`}
                  >
                    {depth}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="glass-pill flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-emerald-950 dark:text-white">
              <input
                type="color"
                value={liquidGlass.accent}
                onChange={(e) => setLiquidGlass({ accent: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              Accent
            </label>
            <label className="glass-pill flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-emerald-950 dark:text-white">
              <input
                type="color"
                value={liquidGlass.bubbleColor}
                onChange={(e) => setLiquidGlass({ bubbleColor: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              Bubble
            </label>
            <label className="glass-pill flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] text-emerald-950 dark:text-white">
              Ambient motion
              <input
                type="checkbox"
                checked={liquidGlass.ambientMotion}
                onChange={(e) => setLiquidGlass({ ambientMotion: e.target.checked })}
                className="accent-[#22C55E]"
              />
            </label>
            <label className="glass-pill flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] text-emerald-950 dark:text-white">
              Background effect
              <select
                value={liquidGlass.backgroundEffect}
                onChange={(e) => setLiquidGlass({ backgroundEffect: e.target.value as typeof liquidGlass.backgroundEffect })}
                className="rounded-lg bg-transparent text-[11px] outline-none"
              >
                <option value="none">None</option>
                <option value="leaves">🍂 Falling leaves</option>
                <option value="snow">❄️ Snow</option>
                <option value="rain">🌧️ Rain</option>
              </select>
            </label>
            <label className="glass-pill flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[11px] text-emerald-950 dark:text-white">
              Quick reply chips
              <input
                type="checkbox"
                checked={liquidGlass.showQuickReplies}
                onChange={(e) => setLiquidGlass({ showQuickReplies: e.target.checked })}
                className="accent-[#22C55E]"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['cozy', 'compact', 'minimal'] as const).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => setLiquidGlass({ density })}
                className={`glass-pill rounded-xl py-2 text-[11px] font-semibold capitalize ${
                  liquidGlass.density === density
                    ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 dark:text-white'
                    : 'text-emerald-900/70 dark:text-emerald-100/70'
                }`}
              >
                {density}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="glass-pill flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold text-emerald-900 dark:text-emerald-100">
              <Upload className="h-3.5 w-3.5" />
              Upload wallpaper
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleWallpaper(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={() => setLiquidGlass({ wallpaper: '' })}
              disabled={!liquidGlass.wallpaper}
              className="glass-pill rounded-xl px-3 py-2 text-[11px] font-semibold text-emerald-900 disabled:opacity-50 dark:text-emerald-100"
            >
              Use mesh gradient
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
              Quick reaction bar
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {liquidGlass.quickReactions.map((emoji, index) => (
                <input
                  key={index}
                  value={emoji}
                  maxLength={8}
                  onChange={(e) => {
                    const next = [...liquidGlass.quickReactions];
                    next[index] = e.target.value;
                    setLiquidGlass({ quickReactions: next });
                  }}
                  className="glass-pill w-full rounded-xl py-2 text-center text-sm outline-none"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={themeCode}
              onChange={(e) => setThemeCode(e.target.value)}
              placeholder="Theme code"
              className="glass-pill min-w-0 rounded-xl px-3 py-2 text-[11px] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
            />
            <button
              type="button"
              onClick={exportTheme}
              className="glass-pill flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={importTheme}
              className="glass-pill flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </button>
          </div>
        </div>
        </SettingsSection>

        <SettingsSection
          title="Personalization"
          description="Customize messages, layout, privacy, emoji, and saved replies."
        >
        <div className="space-y-4">
          {/* 1. Chat Look & Text */}
          <div className="glass-pill space-y-4 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Chat Look &amp; Text
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <SettingLabel
                  label="Bubble shape"
                  info="Changes message bubble corners and glass surface style in every conversation."
                />
                <select
                  value={liquidGlass.bubbleStyle}
                  onChange={(e) => setLiquidGlass({ bubbleStyle: e.target.value as typeof liquidGlass.bubbleStyle })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="imessage">iMessage curved tails (Theme)</option>
                  <option value="imessage-classic">Classic iMessage (Blue &amp; Gray tails)</option>
                  <option value="glass">Floating glass</option>
                  <option value="cyber">Sharp cyber-cut</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel label={t('settings.language')} info={t('settings.languageInfo')} />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Timestamp"
                  info="Controls how message send times are formatted next to messages."
                />
                <select
                  value={liquidGlass.timestampFormat}
                  onChange={(e) => setLiquidGlass({ timestampFormat: e.target.value as typeof liquidGlass.timestampFormat })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="12h">12-hour (4:20 PM)</option>
                  <option value="24h">24-hour (16:20)</option>
                  <option value="relative">Relative (2m ago)</option>
                  <option value="seconds">Always show seconds</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Entrance effect"
                  info="Selects the animation played when new messages appear in chat."
                />
                <select
                  value={liquidGlass.entranceEffect}
                  onChange={(e) => setLiquidGlass({ entranceEffect: e.target.value as typeof liquidGlass.entranceEffect })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="spring">Spring pop</option>
                  <option value="slide">Smooth slide-up</option>
                  <option value="liquid">Liquid fade</option>
                  <option value="instant">Instant / reduced motion</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Sidebar layout"
                  info="Switches the desktop conversation sidebar between icons-only rail, standard list, or wide preview."
                />
                <select
                  value={liquidGlass.sidebarLayout}
                  onChange={(e) => setLiquidGlass({ sidebarLayout: e.target.value as typeof liquidGlass.sidebarLayout })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="rail">Icons-only rail</option>
                  <option value="standard">Standard list</option>
                  <option value="preview">Expanded preview</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Unread divider"
                  info="Styles the New Messages separator bar above unread messages in a chat."
                />
                <select
                  value={liquidGlass.unreadDividerStyle}
                  onChange={(e) => setLiquidGlass({ unreadDividerStyle: e.target.value as typeof liquidGlass.unreadDividerStyle })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="laser">Glowing neon laser</option>
                  <option value="pill">Frosted glass pill</option>
                  <option value="dotted">Minimal dotted line</option>
                  <option value="rainbow">Rainbow pulse</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Chat font"
                  info="Changes the global typeface used across the app and message feed."
                />
                <select
                  value={chatFont}
                  onChange={(e) => setChatFont(e.target.value as typeof chatFont)}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none"
                >
                  <option value="system">System</option>
                  <option value="inter">Inter</option>
                  <option value="rounded">Rounded</option>
                  <option value="mono">Monospace</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <SettingLabel
                label="Font size"
                info="Scales global text and chat bubble typography between Small, Medium, and Large."
              />
              <div className="grid grid-cols-3 gap-1.5">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setChatFontSize(size)}
                    className={`glass-pill rounded-xl py-2 text-[11px] font-semibold capitalize transition ${
                      chatFontSize === size
                        ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 ring-1 ring-[#22C55E]/35 dark:text-white'
                        : 'text-emerald-900/70 hover:bg-black/5 dark:text-emerald-100/70 dark:hover:bg-white/5'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 border-t border-black/5 pt-3 sm:grid-cols-3 dark:border-white/10">
              {([
                ['fontWeight', 'Font weight', 300, 800, 10, '', 'Adjusts how bold or light message text looks inside chat bubbles.'],
                ['letterSpacing', 'Letter spacing', -5, 20, 1, '', 'Tightens or widens spacing between characters inside messages.'],
                ['lineHeight', 'Line height', 110, 220, 5, '%', 'Sets vertical breathing room between lines in multi-line messages.'],
              ] as const).map(([key, label, min, max, step, unit, info]) => (
                <LiquidGlassSlider
                  key={key}
                  label={label}
                  value={liquidGlass[key]}
                  min={min}
                  max={max}
                  step={step}
                  unit={unit}
                  info={info}
                  onChange={(nextValue) => setLiquidGlass({ [key]: nextValue })}
                />
              ))}
            </div>
          </div>

          {/* 2. Typing, Privacy & Filter */}
          <div className="glass-pill space-y-4 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Typing, Privacy &amp; Filter
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <SettingLabel
                  label="Enter key behavior"
                  info="Chooses whether pressing Enter sends right away or inserts a newline."
                />
                <select
                  value={liquidGlass.enterBehavior}
                  onChange={(e) => setLiquidGlass({ enterBehavior: e.target.value as typeof liquidGlass.enterBehavior })}
                  className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs"
                >
                  <option value="enter-send">Enter sends · Shift+Enter newline</option>
                  <option value="ctrl-send">Enter newline · Ctrl/Cmd+Enter sends</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Profanity filter"
                  info="Masks or replaces strong language in incoming and displayed messages."
                />
                <div className="grid grid-cols-3 gap-1.5">
                  {(['off', 'mild', 'strict'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setProfanityFilter(mode)}
                      className={`glass-pill rounded-xl py-2 text-[11px] font-semibold capitalize transition ${
                        profanityFilter === mode
                          ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 ring-1 ring-[#22C55E]/35 dark:text-white'
                          : 'text-emerald-900/70 hover:bg-black/5 dark:text-emerald-100/70 dark:hover:bg-white/5'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {([
                ['fairPlayPrivacy', 'Fair Play privacy', 'Hides read receipts and live typing status together for symmetric privacy.'],
                ['typingPrivacy', 'Hide typing indicators', 'Stops broadcasting when you are typing in a chat.'],
                ['readReceipts', 'Send read receipts', 'Lets others see when you have read their messages.'],
                ['lastSeenPrivacy', 'Share last seen', 'Displays your online and last-active status in member lists.'],
                ['cursorGlow', 'Cursor-tracking glow', 'Highlights glass surfaces softly along their border on pointer hover.'],
                ['autoLoadMedia', 'Auto-load media', 'Automatically displays shared images and GIFs inline instead of blurred previews.'],
              ] as const).map(([key, label, info]) => (
                <GlassToggle
                  key={key}
                  label={label}
                  info={info}
                  checked={liquidGlass[key]}
                  onChange={(next) => setLiquidGlass({ [key]: next })}
                />
              ))}
            </div>
          </div>

          {/* 3. Emoji, Away & Alerts */}
          <div className="glass-pill space-y-3 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Emoji, Away &amp; Alerts
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <SettingLabel
                  label="Skin tone"
                  info="Applies your preferred skin tone modifier to supported person/hand emojis in the picker."
                />
                <select
                  value={liquidGlass.emojiSkinTone}
                  onChange={(e) => setLiquidGlass({ emojiSkinTone: e.target.value as typeof liquidGlass.emojiSkinTone })}
                  className="chat-font-select glass-pill w-full rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="default">Default skin</option>
                  <option value="light">Light</option>
                  <option value="medium-light">Medium-light</option>
                  <option value="medium">Medium</option>
                  <option value="medium-dark">Medium-dark</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Emoji style"
                  info="Switches between native OS emojis and crisp Twemoji-styled emoji sizing."
                />
                <select
                  value={liquidGlass.emojiStyle}
                  onChange={(e) => setLiquidGlass({ emojiStyle: e.target.value as typeof liquidGlass.emojiStyle })}
                  className="chat-font-select glass-pill w-full rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="native">Native OS</option>
                  <option value="twemoji">Twemoji style</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Away auto-reply"
                  info="Automatically replies with this message when someone DMs you while your status is Away."
                />
                <input
                  value={liquidGlass.awayReply}
                  onChange={(e) => setLiquidGlass({ awayReply: e.target.value })}
                  placeholder="Away auto-reply message"
                  className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
                />
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Away cooldown"
                  info="Prevents sending repeated away auto-replies to the same person within this window."
                />
                <select
                  value={liquidGlass.awayReplyCooldown}
                  onChange={(e) => setLiquidGlass({ awayReplyCooldown: Number(e.target.value) })}
                  className="chat-font-select glass-pill w-full rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value={15}>15 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={480}>8 hours</option>
                  <option value={0}>Until turned off</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <SettingLabel
                label="Keyword alerts"
                info="Comma-separated trigger words that notify and highlight incoming messages mentioning them."
              />
              <input
                value={liquidGlass.keywordAlerts}
                onChange={(e) => setLiquidGlass({ keywordAlerts: e.target.value })}
                placeholder="nickname, gaming, urgent"
                className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
              />
            </div>
          </div>

          {/* 4. Text Shortcuts & Saved Replies */}
          <div className="glass-pill space-y-3 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Shortcuts &amp; Saved Replies
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <SettingLabel
                  label="Text shortcuts"
                  info="One shortcut=expansion per line (for example /omw=On my way!) that auto-expands in the message box."
                />
                <textarea
                  value={Object.entries(liquidGlass.snippets).map(([key, value]) => `${key}=${value}`).join('\n')}
                  onChange={(e) => {
                    const snippets: Record<string, string> = {};
                    e.target.value.split('\n').forEach((line) => {
                      const separator = line.indexOf('=');
                      if (separator > 0) snippets[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
                    });
                    setLiquidGlass({ snippets });
                  }}
                  rows={3}
                  placeholder="/omw=On my way!&#10;:shrug:=¯_(ツ)_/¯"
                  className="glass-pill lem-scrollbar w-full resize-y rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
                />
              </div>

              <div className="space-y-1.5">
                <SettingLabel
                  label="Saved replies"
                  info="Reusable canned responses (one per line) available from the message composer quick replies."
                />
                <textarea
                  value={liquidGlass.savedReplies.join('\n')}
                  onChange={(e) => setLiquidGlass({ savedReplies: e.target.value.split('\n').filter(Boolean) })}
                  rows={3}
                  placeholder="Saved replies (one per line)"
                  className="glass-pill lem-scrollbar w-full resize-y rounded-xl px-3 py-2 text-xs outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
                />
              </div>
            </div>
          </div>
        </div>
        </SettingsSection>

        <SettingsSection
          title="Notifications & Sound"
          description="Choose reveal effects, notification chimes, ringtones, and alert timing."
        >
          <div className="glass-pill relative space-y-4 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 text-[#22C55E]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Desktop Notifications
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Show native OS alerts for new messages and incoming calls.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notificationsEnabled
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 text-[#10B981]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Notify Even When Focused
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Trigger OS notifications for other channels while SkellyTalk is open.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNotifyWhenFocused(!notifyWhenFocused)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  notifyWhenFocused
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    notifyWhenFocused ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-black/5 pt-3 dark:border-white/10">
              <div className="flex items-start gap-2.5">
                <Volume2 className="mt-0.5 h-4 w-4 text-[#22C55E]" />
                <div>
                  <p className="font-semibold text-emerald-950 dark:text-white">
                    Notification Sound Chime
                  </p>
                  <p className="text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                    Play a soft glass chime when new messages arrive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  soundEnabled
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981]'
                    : 'bg-black/20 dark:bg-white/15'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    soundEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Liquid Glass Notification Reveal Mode */}
            <div className="space-y-2 border-t border-black/5 pt-3 dark:border-white/10">
              <SettingLabel
                label="Toast notification reveal"
                info="Controls how incoming in-app notification toasts materialize: Classic slide, Liquid Glass Lens Reveal, or Hover/Tap Privacy Veil."
              />
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['classic', 'Classic Slide', 'Clean spring drop-in'],
                  ['liquid-reveal', 'Liquid Reveal', 'Refractive glass lens sweep'],
                  ['liquid-privacy', 'Privacy Veil', 'Blurred until hover or tap'],
                ] as const).map(([mode, label, hint]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setLiquidGlass({ notificationReveal: mode as NotificationRevealMode })
                    }
                    className={`glass-pill rounded-xl p-2.5 text-left transition ${
                      liquidGlass.notificationReveal === mode
                        ? 'border-[#22C55E] bg-[#22C55E]/15 ring-1 ring-[#22C55E]/40'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-emerald-950 dark:text-white">
                      {label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-emerald-800/65 dark:text-emerald-200/60">
                      {hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sound Volume + Notification Sounds + Ringtones */}
            <div className="space-y-3 border-t border-black/5 pt-3 dark:border-white/10">
              <LiquidGlassSlider
                label="Sound & ringtone volume"
                value={liquidGlass.soundVolume}
                min={10}
                max={100}
                step={5}
                unit="%"
                info="Scales playback loudness for message notification chimes and call ringtones."
                onChange={(soundVolume) => setLiquidGlass({ soundVolume })}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <SettingLabel
                    label="Notification sound"
                    info="Choose from 10 synthesized chimes for incoming messages."
                  />
                  <div className="flex items-center gap-1.5">
                    <select
                      value={liquidGlass.notificationSound}
                      onChange={(e) => {
                        const sound = e.target.value as NotificationSoundId;
                        setLiquidGlass({ notificationSound: sound });
                        playNotificationChime(sound, liquidGlass.soundVolume / 100);
                      }}
                      className="chat-font-select glass-pill min-w-0 flex-1 rounded-xl px-3 py-2 text-xs"
                    >
                      {NOTIFICATION_SOUNDS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} — {item.description}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        playNotificationChime(
                          liquidGlass.notificationSound,
                          liquidGlass.soundVolume / 100
                        )
                      }
                      title="Preview notification sound"
                      className="glass-pill flex h-8 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold text-emerald-800 transition hover:border-[#22C55E]/60 hover:text-[#22C55E] dark:text-emerald-200"
                    >
                      <Play className="h-3 w-3" />
                      Play
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <SettingLabel
                    label="Incoming call ringtone"
                    info="Choose from 8 musical ringtones played on incoming audio and video calls."
                  />
                  <div className="flex items-center gap-1.5">
                    <select
                      value={liquidGlass.ringtone}
                      onChange={(e) => {
                        const nextRingtone = e.target.value as RingtoneId;
                        setLiquidGlass({ ringtone: nextRingtone });
                        setPreviewingRingtone(true);
                        previewRingtone(nextRingtone, liquidGlass.soundVolume / 100, () =>
                          setPreviewingRingtone(false)
                        );
                      }}
                      className="chat-font-select glass-pill min-w-0 flex-1 rounded-xl px-3 py-2 text-xs"
                    >
                      {RINGTONES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} — {item.description}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (previewingRingtone) {
                          stopRingtone();
                          setPreviewingRingtone(false);
                        } else {
                          setPreviewingRingtone(true);
                          previewRingtone(
                            liquidGlass.ringtone,
                            liquidGlass.soundVolume / 100,
                            () => setPreviewingRingtone(false)
                          );
                        }
                      }}
                      title={previewingRingtone ? 'Stop ringtone preview' : 'Preview ringtone'}
                      className="glass-pill flex h-8 shrink-0 items-center gap-1 rounded-xl px-2.5 text-[11px] font-semibold text-emerald-800 transition hover:border-[#22C55E]/60 hover:text-[#22C55E] dark:text-emerald-200"
                    >
                      {previewingRingtone ? (
                        <>
                          <Square className="h-3 w-3 fill-current" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Play
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-black/5 pt-3 dark:border-white/10">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => void sendTestNotification()}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm transition hover:brightness-110"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Send Test Notification</span>
              </motion.button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Accessibility"
          description="Adjust motion, transparency, contrast, typography, focus rings, and visual alerts."
        >
          <div className="glass-pill relative space-y-4 rounded-2xl p-4">
            <LiquidGlassSlider
              label="Interface & text scale"
              value={liquidGlass.textScale}
              min={85}
              max={140}
              step={5}
              unit="%"
              info="Globally scales text and UI proportions from 85% up to 140%."
              onChange={(textScale) => setLiquidGlass({ textScale })}
            />

            <div className="grid gap-2.5 sm:grid-cols-2">
              {([
                [
                  'reduceMotion',
                  'Reduce motion',
                  'Disables decorative animations, ambient mesh drift, and spring bounce effects.',
                ],
                [
                  'reduceTransparency',
                  'Reduce transparency',
                  'Replaces translucent Liquid Glass backgrounds with crisp, solid surfaces.',
                ],
                [
                  'highContrast',
                  'High contrast',
                  'Strengthens borders, bubble edges, and text contrast across light and dark themes.',
                ],
                [
                  'dyslexiaFont',
                  'Dyslexia-friendly font',
                  'Applies a readable humanist typeface with generous character and line spacing.',
                ],
                [
                  'focusOutlines',
                  'Strong focus outlines',
                  'Draws clear high-visibility keyboard focus rings around interactive controls.',
                ],
                [
                  'underlineLinks',
                  'Underline links',
                  'Adds persistent underlines to links and link-style controls for clarity.',
                ],
                [
                  'largeClickTargets',
                  'Larger click targets',
                  'Enlarges toolbar, header, and switch targets for easier pointer or touch tapping.',
                ],
                [
                  'screenFlashAlerts',
                  'Visual screen-flash alerts',
                  'Pulses a subtle luminous border flash on incoming messages and calls.',
                ],
              ] as const).map(([key, label, info]) => (
                <GlassToggle
                  key={key}
                  label={label}
                  info={info}
                  checked={liquidGlass[key]}
                  onChange={(next) => setLiquidGlass({ [key]: next })}
                />
              ))}
            </div>

            <div className="flex justify-end border-t border-black/5 pt-3 dark:border-white/10">
              <button
                type="button"
                onClick={() =>
                  setLiquidGlass({
                    reduceMotion: false,
                    reduceTransparency: false,
                    highContrast: false,
                    dyslexiaFont: false,
                    textScale: 100,
                    focusOutlines: false,
                    underlineLinks: false,
                    largeClickTargets: false,
                    screenFlashAlerts: false,
                  })
                }
                className="glass-pill flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-emerald-900 transition hover:border-[#22C55E]/50 dark:text-emerald-100"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Accessibility Defaults
              </button>
            </div>
          </div>
        </SettingsSection>

        <AppLockSettings />

        <div
          ref={updateSectionRef}
          className="glass-section rounded-2xl"
        >
          <div className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-sm font-bold text-emerald-950 dark:text-white">
                  Software Updates
                </span>
                <span className="mt-0.5 block text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  Check for the latest version and install downloaded updates.
                </span>
              </div>
              <span className="glass-pill shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold text-emerald-800/80 dark:text-emerald-100/80">
                v{appVersion}
              </span>
            </div>
          </div>
          <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/10">
          <div className="glass-pill flex items-center justify-between gap-4 rounded-2xl p-4 text-xs">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <RefreshCw
                className={`mt-0.5 h-4 w-4 shrink-0 text-[#22C55E] ${
                  updateStatus.status === 'checking' ||
                  updateStatus.status === 'downloading'
                    ? 'animate-spin'
                    : ''
                }`}
              />
              <div className="min-w-0">
                <p className="font-semibold text-emerald-950 dark:text-white">
                  Automatic Updates
                </p>
                <p className="line-clamp-2 break-words text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
                  {updateStatus.status === 'checking'
                    ? 'Checking for updates...'
                    : updateStatus.status === 'downloading'
                      ? `Downloading update (${updateStatus.progress ?? 0}%)...`
                      : updateStatus.status === 'downloaded'
                        ? updateStatus.message ??
                          `Version ${updateStatus.version ?? ''} downloaded and ready.`
                        : updateStatus.status === 'available'
                          ? updateStatus.message ?? `Update v${updateStatus.version ?? ''} is available.`
                          : updateStatus.message ?? 'SkellyTalk checks for updates automatically on launch.'}
                </p>
              </div>
            </div>

            {updateStatus.status === 'downloaded' ? (
              <button
                type="button"
                onClick={installUpdate}
                className="shrink-0 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm hover:brightness-110"
              >
                {window.lemchat ? 'Restart & Install' : 'Install Update'}
              </button>
            ) : updateStatus.status === 'available' ? (
              <button
                type="button"
                onClick={downloadUpdate}
                className="shrink-0 rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-1.5 text-xs font-semibold text-white shadow-lem-glow-sm hover:brightness-110"
              >
                Download Update
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  updateStatus.status === 'checking' || updateStatus.status === 'downloading'
                }
                onClick={() => void checkForUpdates()}
                className="glass-pill shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-[#22C55E]/50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-100"
              >
                {updateStatus.status === 'downloading'
                  ? 'Downloading...'
                  : updateStatus.status === 'checking'
                    ? 'Checking...'
                    : 'Check for Updates'}
              </button>
            )}
          </div>
          </div>
        </div>

        <div className="glass-section rounded-2xl">
          <div className="px-4 py-3.5">
            <span className="block text-sm font-bold text-emerald-950 dark:text-white">
              Connection
            </span>
            <span className="mt-0.5 block text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
              View the current realtime messaging connection status.
            </span>
          </div>
          <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/10">
          <div className="glass-pill space-y-3 rounded-2xl p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-950 dark:text-white">
                <Wifi className="h-4 w-4 text-[#22C55E]" />
                <span className="font-semibold">Realtime WebSocket</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  realtimeConnected
                    ? 'bg-[#22C55E]/20 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                }`}
              >
                {realtimeConnected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </motion.section>
  );
};
