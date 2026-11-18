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
} from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import {
  UserAvatar,
  AVATAR_BG_PRESETS,
  parseAvatarSpec,
  serializeAvatarSpec,
  type AvatarMode,
} from './UserAvatar';

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

  const [displayName, setDisplayName] = useState(self?.name ?? '');
  const [role, setRole] = useState(self?.role ?? '');
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSelfProfile(displayName, role);
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

        {/* Profile Card + Inline Editor */}
        {self && (
          <form
            onSubmit={handleSaveProfile}
            className="glass-pill space-y-4 rounded-2xl p-4"
          >
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
        )}

        {/* Theme Selection */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Liquid Glass Theme
          </h2>
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
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="glass-pill space-y-2.5 rounded-2xl p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
              Chat Font
            </h2>
            <select
              value={chatFont}
              onChange={(e) => setChatFont(e.target.value as typeof chatFont)}
              className="glass-pill w-full rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none dark:text-white"
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

        {/* Desktop Notifications & Sound */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Notifications &amp; Sound
          </h2>
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
        </div>

        {/* Auto-Updates */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Software Updates
          </h2>
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
        </div>

        {/* Supabase Connection Info */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/55">
            Supabase Backend
          </h2>
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
    </motion.section>
  );
};
