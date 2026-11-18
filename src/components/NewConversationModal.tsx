import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageSquarePlus, X, Sparkles, Check, XCircle } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import type { Profile } from '../types/chat';

export const NewConversationModal: React.FC = () => {
  const isOpen = useChatStore((s) => s.isNewConvModalOpen);
  const setOpen = useChatStore((s) => s.setNewConvModalOpen);
  const profiles = useChatStore((s) => s.profiles);
  const self = useChatStore((s) => s.self);
  const createChannel = useChatStore((s) => s.createChannel);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);

  const [tab, setTab] = useState<'channel' | 'dm'>('channel');
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [dmUsername, setDmUsername] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focusedUsernameField, setFocusedUsernameField] = useState<'group' | 'dm' | null>(null);

  if (!isOpen) return null;

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || submitting) return;
    const name = channelName;
    const topic = channelTopic;
    const usernameSet = new Set(
      usernameInput.split(/[\s,]+/).map((value) => value.trim().replace(/^@/, '').toLowerCase()).filter(Boolean)
    );
    const invites = Array.from(new Set([
      ...Object.values(profiles).filter((profile) =>
        usernameSet.has(profile.handle.replace(/^@/, '').toLowerCase())
      ).map((profile) => profile.id),
    ]));
    setChannelName('');
    setChannelTopic('');
    setUsernameInput('');
    setLogoUrl('');
    setOpen(false);
    void createChannel(name, topic, invites, logoUrl || undefined);
  };

  const handleStartDm = () => {
    const handle = dmUsername.trim().replace(/^@/, '').toLowerCase();
    const profile = Object.values(profiles).find((p) =>
      p.handle.replace(/^@/, '').toLowerCase() === handle
    );
    if (!profile || profile.id === self?.id) return;
    if (submitting) return;
    setSubmitting(true);
    setDmUsername('');
    setOpen(false);
    void startDirectMessage(profile.id).finally(() => setSubmitting(false));
  };

  const slugPreview = channelName
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\s+/g, '-');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const normalizeHandle = (handle: string) => handle.trim().replace(/^@/, '').toLowerCase();
  const groupUsernameToken = usernameInput.split(/[\s,]+/).pop()?.replace(/^@/, '') ?? '';
  const dmUsernameToken = dmUsername.replace(/^@/, '');
  const getSuggestions = (value: string) => {
    const query = normalizeHandle(value);
    if (!query) return [];
    return Object.values(profiles)
      .filter((profile) => normalizeHandle(profile.handle).includes(query))
      .sort((a, b) => {
        const aExact = normalizeHandle(a.handle) === query;
        const bExact = normalizeHandle(b.handle) === query;
        return Number(bExact) - Number(aExact);
      })
      .slice(0, 5);
  };
  const groupSuggestions = getSuggestions(groupUsernameToken);
  const dmSuggestions = getSuggestions(dmUsernameToken);

  const selectGroupUsername = (profile: Profile) => {
    const parts = usernameInput.split(/([\s,]+)/);
    const tokenIndex = parts.length - 1;
    parts[tokenIndex] = `@${profile.handle.replace(/^@/, '')}`;
    setUsernameInput(parts.join(''));
    setFocusedUsernameField('group');
  };

  const renderUsernameSuggestions = (
    field: 'group' | 'dm',
    value: string,
    suggestions: Profile[],
    onSelect: (profile: Profile) => void
  ) => {
    if (focusedUsernameField !== field || !value.trim()) return null;
    const exactMatch = suggestions.find((profile) => normalizeHandle(profile.handle) === normalizeHandle(value));

    return (
      <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-emerald-500/20 bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:bg-slate-950/95">
        {suggestions.length > 0 ? (
          suggestions.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(profile)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[#22C55E]/10"
            >
              <UserAvatar
                avatar={profile.avatarText}
                name={profile.displayName}
                className="h-7 w-7 rounded-full bg-emerald-500/20"
                textClassName="text-[10px] font-bold"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-emerald-950 dark:text-white">
                  {profile.displayName}
                </span>
                <span className="block truncate text-[10px] text-emerald-800/60 dark:text-emerald-200/60">
                  @{profile.handle.replace(/^@/, '')}
                </span>
              </span>
              {normalizeHandle(profile.handle) === normalizeHandle(value) && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                  Account found
                </span>
              )}
            </button>
          ))
        ) : (
          <div className="flex items-center gap-2 px-2.5 py-2 text-[10px] text-rose-600 dark:text-rose-300">
            <XCircle className="h-3.5 w-3.5" />
            No account found for @{value.replace(/^@/, '')}
          </div>
        )}
        {exactMatch && (
          <div className="flex items-center gap-1.5 border-t border-emerald-500/10 px-2.5 py-1.5 text-[10px] text-emerald-700/70 dark:text-emerald-200/70">
            <Check className="h-3 w-3" />
            This username is ready to use.
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel glass-surface relative w-full max-w-md overflow-hidden rounded-3xl p-6 ring-1 ring-white/20"
      >
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-emerald-950 dark:text-white">
              New Conversation
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="glass-pill rounded-full p-1.5 text-emerald-900/60 transition hover:text-emerald-950 dark:text-white/60 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="glass-pill relative z-10 mb-5 grid grid-cols-2 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setTab('channel')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              tab === 'channel'
                ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm'
                : 'text-emerald-900/70 hover:text-emerald-950 dark:text-emerald-200/70 dark:hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Create Group</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('dm')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              tab === 'dm'
                ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981] text-white shadow-lem-glow-sm'
                : 'text-emerald-900/70 hover:text-emerald-950 dark:text-emerald-200/70 dark:hover:text-white'
            }`}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>Direct Message</span>
          </button>
        </div>

        {tab === 'channel' ? (
          <form onSubmit={handleCreateGroup} className="relative z-10 space-y-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
                  Group Name
                </label>
                {slugPreview && (
                  <span className="rounded-full bg-[#22C55E]/15 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                    #{slugPreview}
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. weekend-hangout"
                className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/35"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
                Topic (optional)
              </label>
              <input
                type="text"
                value={channelTopic}
                onChange={(e) => setChannelTopic(e.target.value)}
                placeholder="What is this group about?"
                className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/35"
              />
            </div>

            <div className="relative">
              <label className="mb-1 block text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
                Invite by Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onFocus={() => setFocusedUsernameField('group')}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setFocusedUsernameField('group');
                }}
                onBlur={() => setFocusedUsernameField(null)}
                placeholder="@alice, @bob"
                className="glass-pill w-full rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 placeholder-emerald-800/45 outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 dark:text-white dark:placeholder-emerald-100/35"
              />
              {renderUsernameSuggestions('group', groupUsernameToken, groupSuggestions, selectGroupUsername)}
              <p className="mt-1 text-[10px] text-emerald-800/55 dark:text-emerald-200/50">
                Type exact usernames separated by commas or spaces.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Group logo" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/20" />
              )}
              <label className="glass-pill cursor-pointer rounded-xl px-3 py-2 text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-100/75">
                {logoUrl ? 'Change Group Logo' : 'Add Group Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow transition hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </form>
        ) : (
          <div className="relative z-10 space-y-3">
            <label className="mb-1 block text-[11px] font-semibold text-emerald-900/75 dark:text-emerald-200/75">
              Username
            </label>
            <div className="relative">
              <div className="glass-pill flex items-center gap-2 rounded-xl px-3 py-2.5">
                <span className="text-sm font-bold text-[#22C55E]">@</span>
                <input
                  type="text"
                  value={dmUsername.replace(/^@/, '')}
                  onFocus={() => setFocusedUsernameField('dm')}
                  onChange={(e) => {
                    setDmUsername(e.target.value);
                    setFocusedUsernameField('dm');
                  }}
                  onBlur={() => setFocusedUsernameField(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartDm();
                  }}
                  placeholder="exact.username"
                  className="w-full bg-transparent text-xs text-emerald-950 placeholder-emerald-800/45 outline-none dark:text-white dark:placeholder-emerald-100/35"
                />
              </div>
              {renderUsernameSuggestions('dm', dmUsernameToken, dmSuggestions, (profile) => {
                setDmUsername(profile.handle.replace(/^@/, ''));
                setFocusedUsernameField('dm');
              })}
            </div>
            <button
              type="button"
              onClick={handleStartDm}
              disabled={submitting || !dmUsername.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow transition hover:brightness-110 disabled:opacity-60"
            >
              Open Direct Message
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
