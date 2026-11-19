import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import {
  UserAvatar,
  AVATAR_BG_PRESETS,
  parseAvatarSpec,
  serializeAvatarSpec,
  type AvatarMode,
} from './UserAvatar';

const SettingsSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sectionRef?: React.RefObject<HTMLDetailsElement>;
}> = ({ title, description, children, defaultOpen = false, sectionRef }) => (
  <details
    ref={sectionRef}
    open={defaultOpen}
    className="group rounded-2xl border border-black/5 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]"
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3.5 outline-none transition hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#22C55E]/60 dark:hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-emerald-950 dark:text-white">{title}</span>
        <span className="mt-0.5 block text-[11px] text-emerald-800/65 dark:text-emerald-200/55">
          {description}
        </span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-emerald-700 transition-transform group-open:rotate-180 dark:text-emerald-300" />
    </summary>
    <div className="space-y-4 border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/10">
      {children}
    </div>
  </details>
);

export const SettingsView: React.FC = () => {
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
  const installUpdate = useChatStore((s) => s.installUpdate);
  const liquidGlass = useChatStore((s) => s.liquidGlass);
  const setLiquidGlass = useChatStore((s) => s.setLiquidGlass);
  const resetLiquidGlass = useChatStore((s) => s.resetLiquidGlass);
  const importLiquidGlass = useChatStore((s) => s.importLiquidGlass);
  const updateSectionRef = useRef<HTMLDetailsElement | null>(null);

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
      className="glass-panel glass-surface lem-scrollbar flex flex-1 flex-col overflow-y-auto rounded-2xl p-4 md:p-6"
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
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#22C55E]/35 bg-[#22C55E]/12 px-4 py-3 ring-1 ring-[#22C55E]/15">
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
                    updateSectionRef.current.open = true;
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
            defaultOpen
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
                <input value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Listening / Playing</span>
                <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Listening to Midnight FM" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Short bio</span>
                <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short profile bio" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Custom status</span>
                <input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="🎮 Grinding ranked" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
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
          defaultOpen
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

          <div className="glass-pill space-y-4 rounded-2xl p-4">
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

          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['blur', 'Blur intensity', 0, 48, 'px'],
              ['opacity', 'Glass opacity', 35, 95, '%'],
              ['borderGlow', 'Border glow', 0, 50, '%'],
              ['roundness', 'Corner roundness', 4, 36, 'px'],
            ] as const).map(([key, label, min, max, unit]) => (
              <label key={key} className="space-y-1.5">
                <span className="flex justify-between text-[11px] font-semibold text-emerald-950 dark:text-white">
                  {label}
                  <span className="text-[#22C55E]">{liquidGlass[key]}{unit}</span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={liquidGlass[key]}
                  onChange={(e) => setLiquidGlass({ [key]: Number(e.target.value) })}
                  className="accent-[#22C55E] w-full"
                />
              </label>
            ))}
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
              className="glass-pill min-w-0 rounded-xl px-3 py-2 text-[11px] outline-none"
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
        <div className="grid gap-3 md:grid-cols-2">
          <div className="glass-pill space-y-3 rounded-2xl p-4 md:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Bubble shape</span>
                <select value={liquidGlass.bubbleStyle} onChange={(e) => setLiquidGlass({ bubbleStyle: e.target.value as typeof liquidGlass.bubbleStyle })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
                  <option value="imessage">iMessage curved tails</option>
                  <option value="pill">Modern pill</option>
                  <option value="cyber">Sharp cyber-cut</option>
                  <option value="glass">Floating glass</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Timestamp</span>
                <select value={liquidGlass.timestampFormat} onChange={(e) => setLiquidGlass({ timestampFormat: e.target.value as typeof liquidGlass.timestampFormat })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
                  <option value="12h">12-hour (4:20 PM)</option>
                  <option value="24h">24-hour (16:20)</option>
                  <option value="relative">Relative (2m ago)</option>
                  <option value="seconds">Always show seconds</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Entrance effect</span>
                <select value={liquidGlass.entranceEffect} onChange={(e) => setLiquidGlass({ entranceEffect: e.target.value as typeof liquidGlass.entranceEffect })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
                  <option value="spring">Spring pop</option>
                  <option value="slide">Smooth slide-up</option>
                  <option value="liquid">Liquid fade</option>
                  <option value="instant">Instant / reduced motion</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">Sidebar layout</span>
                <select value={liquidGlass.sidebarLayout} onChange={(e) => setLiquidGlass({ sidebarLayout: e.target.value as typeof liquidGlass.sidebarLayout })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
                  <option value="rail">Icons-only rail</option>
                  <option value="standard">Standard list</option>
                  <option value="preview">Expanded preview</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">New messages divider</span>
                <select value={liquidGlass.unreadDividerStyle} onChange={(e) => setLiquidGlass({ unreadDividerStyle: e.target.value as typeof liquidGlass.unreadDividerStyle })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
                  <option value="laser">Glowing neon laser</option>
                  <option value="pill">Frosted glass pill</option>
                  <option value="dotted">Minimal dotted line</option>
                  <option value="rainbow">Rainbow pulse</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ['fontWeight', 'Font weight', 300, 800, ''],
                ['letterSpacing', 'Letter spacing', -5, 20, ''],
                ['lineHeight', 'Line height', 110, 220, '%'],
              ] as const).map(([key, label, min, max, unit]) => (
                <label key={key} className="space-y-1">
                  <span className="flex justify-between text-[10px] font-semibold text-emerald-800/70 dark:text-emerald-200/65">
                    {label}<span>{liquidGlass[key]}{unit}</span>
                  </span>
                  <input type="range" min={min} max={max} value={liquidGlass[key]} onChange={(e) => setLiquidGlass({ [key]: Number(e.target.value) })} className="accent-[#22C55E] w-full" />
                </label>
              ))}
            </div>
          </div>

          <div className="glass-pill space-y-2.5 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">Composer & Privacy</h2>
            <select value={liquidGlass.enterBehavior} onChange={(e) => setLiquidGlass({ enterBehavior: e.target.value as typeof liquidGlass.enterBehavior })} className="chat-font-select glass-pill w-full rounded-xl px-3 py-2 text-xs">
              <option value="enter-send">Enter sends · Shift+Enter newline</option>
              <option value="ctrl-send">Enter newline · Ctrl/Cmd+Enter sends</option>
            </select>
            {([
              ['fairPlayPrivacy', 'Fair Play privacy'],
              ['typingPrivacy', 'Hide typing indicators'],
              ['readReceipts', 'Send read receipts'],
              ['lastSeenPrivacy', 'Share last seen'],
              ['cursorGlow', 'Cursor-tracking glow'],
              ['autoLoadMedia', 'Auto-load media'],
            ] as const).map(([key, label]) => (
              <label key={key} className="glass-pill flex items-center justify-between rounded-xl px-3 py-2 text-[11px]">
                {label}
                <input type="checkbox" checked={liquidGlass[key]} onChange={(e) => setLiquidGlass({ [key]: e.target.checked })} className="accent-[#22C55E]" />
              </label>
            ))}
          </div>

          <div className="glass-pill space-y-2.5 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">Emoji & Away</h2>
            <div className="grid grid-cols-2 gap-2">
              <select value={liquidGlass.emojiSkinTone} onChange={(e) => setLiquidGlass({ emojiSkinTone: e.target.value as typeof liquidGlass.emojiSkinTone })} className="chat-font-select glass-pill rounded-xl px-2 py-2 text-xs">
                <option value="default">Default skin</option><option value="light">Light</option><option value="medium-light">Medium-light</option><option value="medium">Medium</option><option value="medium-dark">Medium-dark</option><option value="dark">Dark</option>
              </select>
              <select value={liquidGlass.emojiStyle} onChange={(e) => setLiquidGlass({ emojiStyle: e.target.value as typeof liquidGlass.emojiStyle })} className="chat-font-select glass-pill rounded-xl px-2 py-2 text-xs">
                <option value="native">Native OS</option><option value="twemoji">Twemoji style</option>
              </select>
            </div>
            <input value={liquidGlass.awayReply} onChange={(e) => setLiquidGlass({ awayReply: e.target.value })} placeholder="Away auto-reply" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
            <div className="flex items-center gap-2 text-[11px]">
              <span>Cooldown</span>
              <select value={liquidGlass.awayReplyCooldown} onChange={(e) => setLiquidGlass({ awayReplyCooldown: Number(e.target.value) })} className="chat-font-select glass-pill flex-1 rounded-xl px-2 py-2 text-xs">
                <option value={15}>15 minutes</option><option value={60}>1 hour</option><option value={480}>8 hours</option><option value={0}>Until turned off</option>
              </select>
            </div>
            <input value={liquidGlass.keywordAlerts} onChange={(e) => setLiquidGlass({ keywordAlerts: e.target.value })} placeholder="Keyword alerts: nickname, gaming, urgent" className="glass-pill w-full rounded-xl px-3 py-2 text-xs outline-none" />
          </div>

          <div className="glass-pill space-y-2.5 rounded-2xl p-4 md:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">Text Shortcuts & Saved Replies</h2>
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
              className="glass-pill lem-scrollbar w-full resize-y rounded-xl px-3 py-2 text-xs outline-none"
            />
            <textarea
              value={liquidGlass.savedReplies.join('\n')}
              onChange={(e) => setLiquidGlass({ savedReplies: e.target.value.split('\n').filter(Boolean) })}
              rows={3}
              placeholder="Saved replies (one per line)"
              className="glass-pill lem-scrollbar w-full resize-y rounded-xl px-3 py-2 text-xs outline-none"
            />
          </div>
          <div className="glass-pill space-y-2.5 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Chat Font
            </h2>
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
            <div className="grid grid-cols-3 gap-1.5">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setChatFontSize(size)}
                  className={`glass-pill rounded-xl py-2 text-[11px] font-semibold capitalize ${
                    chatFontSize === size ? 'border-[#22C55E] bg-[#22C55E]/15 text-emerald-950 dark:text-white' : 'text-emerald-900/70 dark:text-emerald-100/70'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-pill space-y-2.5 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Profanity Filter
            </h2>
            {([
              ['off', 'Off', 'Send messages normally'],
              ['mild', 'Mild', 'Mask part of strong words'],
              ['strict', 'Strict', 'Replace strong words'],
            ] as const).map(([mode, title, subtitle]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setProfanityFilter(mode)}
                className={`glass-pill flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
                  profanityFilter === mode ? 'border-[#22C55E] bg-[#22C55E]/15' : ''
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-emerald-950 dark:text-white">{title}</p>
                  <p className="text-[10px] text-emerald-800/60 dark:text-emerald-200/55">{subtitle}</p>
                </div>
                {profanityFilter === mode && <Check className="h-3.5 w-3.5 text-[#22C55E]" />}
              </button>
            ))}
          </div>
        </div>
        </SettingsSection>

        <SettingsSection
          title="Notifications & Sound"
          description="Choose when SkellyTalk alerts you and whether it plays a chime."
        >
          <div className="glass-pill space-y-3.5 rounded-2xl p-4 text-xs">
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
          sectionRef={updateSectionRef}
          title="Software Updates"
          description="Check for the latest version and install downloaded updates."
        >
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
                        ? `Version ${updateStatus.version ?? ''} downloaded and ready.`
                        : updateStatus.status === 'available'
                          ? `Update v${updateStatus.version ?? ''} found, downloading...`
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
                Restart &amp; Install
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void checkForUpdates()}
                className="glass-pill shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold text-emerald-900 transition hover:border-[#22C55E]/50 dark:text-emerald-100"
              >
                Check for Updates
              </button>
            )}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Connection"
          description="View the current realtime messaging connection status."
        >
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
        </SettingsSection>
        </div>
    </motion.section>
  );
};
