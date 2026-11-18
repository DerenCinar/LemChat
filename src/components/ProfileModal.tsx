import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Phone, Video, Settings } from 'lucide-react';
import { useChatStore } from '../store/useChatStore';
import { UserAvatar } from './UserAvatar';
import type { UserPresence } from '../types/chat';

const STATUS_META: Record<UserPresence, { label: string; dot: string }> = {
  online: { label: 'Online', dot: 'bg-[#22C55E]' },
  away: { label: 'Away', dot: 'bg-amber-400' },
  busy: { label: 'Busy', dot: 'bg-rose-500' },
  offline: { label: 'Offline', dot: 'bg-slate-400' },
};

const formatLastSeen = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Last seen unavailable';
  return `Last seen ${date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })}`;
};

export const ProfileModal: React.FC = () => {
  const selectedProfileId = useChatStore((s) => s.selectedProfileId);
  const setSelectedProfileId = useChatStore((s) => s.setSelectedProfileId);
  const profiles = useChatStore((s) => s.profiles);
  const self = useChatStore((s) => s.self);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const startDirectMessage = useChatStore((s) => s.startDirectMessage);
  const startCall = useChatStore((s) => s.startCall);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const getContactName = useChatStore((s) => s.getContactName);
  const setContactName = useChatStore((s) => s.setContactName);
  const [contactName, setContactNameInput] = useState('');

  const profile = selectedProfileId ? profiles[selectedProfileId] : null;
  const isSelf = Boolean(self && selectedProfileId === self.id);
  let identity: { pronouns?: string; bio?: string; activity?: string; statusText?: string } = {};
  if (profile) {
    try {
      identity = JSON.parse(localStorage.getItem(`skellytalk_identity_${profile.id}`) || '{}');
    } catch {
      identity = {};
    }
  }

  const presence: UserPresence = profile
    ? isSelf
      ? self?.status ?? 'online'
      : onlineUserIds.has(profile.id)
        ? profile.status
        : 'offline'
    : 'offline';

  const statusMeta = STATUS_META[presence];
  const visibleName = profile
    ? getContactName(profile.id, profile.displayName)
    : '';

  useEffect(() => {
    if (profile && !isSelf) {
      setContactNameInput(getContactName(profile.id, profile.displayName));
    } else {
      setContactNameInput('');
    }
  }, [profile, isSelf, getContactName]);

  const handleMessage = async () => {
    if (!profile) return;
    setSelectedProfileId(null);
    await startDirectMessage(profile.id);
  };

  const handleCall = async (mode: 'audio' | 'video') => {
    if (!profile) return;
    setSelectedProfileId(null);
    const convId = await startDirectMessage(profile.id);
    if (convId) {
      await startCall(convId, mode);
    }
  };

  return (
    <AnimatePresence>
      {profile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedProfileId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel glass-surface relative w-full max-w-sm overflow-hidden rounded-3xl p-6 ring-1 ring-white/20"
          >
            <button
              onClick={() => setSelectedProfileId(null)}
              className="glass-pill absolute right-4 top-4 rounded-full p-1.5 text-emerald-900/60 hover:text-emerald-950 dark:text-white/60 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <UserAvatar
                  avatar={profile.avatarText}
                  name={visibleName}
                  className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow"
                  textClassName="text-xl font-bold"
                />
                <span
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-[#090F0C] ${statusMeta.dot}`}
                />
              </div>

              <h2 className="mt-4 text-lg font-bold text-emerald-950 dark:text-white">
                {visibleName}
              </h2>
              <p className="text-xs font-medium text-emerald-800/70 dark:text-emerald-200/65">
                {profile.handle}
              </p>
              {(identity.pronouns || identity.statusText || identity.bio || identity.activity) && (
                <div className="mt-2 space-y-1 text-[11px] text-emerald-800/70 dark:text-emerald-200/65">
                  {identity.pronouns && <p>{identity.pronouns}</p>}
                  {identity.statusText && <p className="font-semibold text-emerald-900 dark:text-emerald-100">{identity.statusText}</p>}
                  {identity.bio && <p>{identity.bio}</p>}
                  {identity.activity && <p className="text-[#22C55E]">{identity.activity}</p>}
                </div>
              )}
              <span className="glass-pill mt-2 rounded-full px-3 py-1 text-[11px] font-medium text-emerald-900 dark:text-emerald-100">
                {profile.role ? `${profile.role} · ` : ''}{statusMeta.label}
              </span>
              {!isSelf && presence === 'offline' && (
                <p className="mt-2 text-[11px] text-emerald-800/65 dark:text-emerald-200/60">
                  {profile.lastSeenAt ? formatLastSeen(profile.lastSeenAt) : 'Last seen unavailable'}
                </p>
              )}
              {!isSelf && (
                <>
                  <p className="mt-2 text-[11px] text-emerald-800/65 dark:text-emerald-200/60">
                    Account name: <span className="font-semibold">{profile.accountName}</span>
                  </p>
                  <div className="mt-3 w-full">
                    <label className="mb-1 block text-left text-[10px] font-semibold uppercase tracking-wider text-emerald-800/65 dark:text-emerald-200/60">
                      Name only you see
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={contactName}
                        onChange={(e) => setContactNameInput(e.target.value)}
                        placeholder={profile.accountName}
                        className="glass-pill min-w-0 flex-1 rounded-xl px-3 py-2 text-xs text-emerald-950 outline-none focus:border-[#22C55E] dark:text-white"
                      />
                      <button
                        onClick={() => setContactName(profile.id, contactName)}
                        className="rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] px-3 text-xs font-bold text-white"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              {isSelf ? (
                <button
                  onClick={() => {
                    setSelectedProfileId(null);
                    setActiveTab('settings');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow-sm transition hover:brightness-110"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Edit Profile &amp; Photo</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => void handleMessage()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#10B981] py-2.5 text-xs font-bold text-white shadow-lem-glow-sm transition hover:brightness-110"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Message</span>
                  </button>
                  <button
                    onClick={() => void handleCall('audio')}
                    title="Voice Call"
                    className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-900 transition hover:scale-105 dark:text-white"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleCall('video')}
                    title="Video Call"
                    className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-900 transition hover:scale-105 dark:text-white"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
