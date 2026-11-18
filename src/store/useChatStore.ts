import { create } from 'zustand';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { parseAvatarSpec, serializeAvatarSpec } from '../components/UserAvatar';
import {
  playNotificationChime,
  startIncomingRingtone,
  startOutgoingRingtone,
  stopRingtone,
} from '../lib/sound';
import type {
  ActiveCallState,
  Attachment,
  CallMode,
  CodeBlock,
  Conversation,
  IncomingCallState,
  Message,
  NavTab,
  Profile,
  Reaction,
  SelfPresence,
  SelfProfile,
  StagedUpload,
  ThemeMode,
  UpdateStatusPayload,
} from '../types/chat';

export interface ToastNotification {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatar: string;
  body: string;
}

interface TypingState {
  senderId: string;
  senderName: string;
}

interface DbProfileRow {
  id: string;
  display_name: string;
  handle: string;
  avatar_text: string;
  role: string;
  status: SelfPresence;
}

interface DbConversationRow {
  id: string;
  name: string;
  type: 'channel' | 'dm';
  topic: string;
  created_by: string | null;
  created_at: string;
}

interface DbMemberRow {
  conversation_id: string;
  user_id: string;
  pinned: boolean;
  last_read_at: string;
}

interface DbMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  ciphertext: { ciphertext?: string; encryption_version?: string; distribution_id?: string } | null;
  encryption_version: string | null;
  ciphertext_type: number | null;
  code_block: CodeBlock | null;
  attachments: Attachment[] | null;
  created_at: string;
}

interface DbReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface ChatStore {
  theme: ThemeMode;
  activeTab: NavTab;
  configured: boolean;
  session: Session | null;
  authLoading: boolean;
  authError: string | null;
  workspaceLoading: boolean;
  realtimeConnected: boolean;

  self: SelfProfile | null;
  profiles: Record<string, Profile>;
  onlineUserIds: Set<string>;
  conversations: Conversation[];
  activeConversationId: string | null;

  searchQuery: string;
  inChatSearchQuery: string;
  isInChatSearchOpen: boolean;
  isInfoPanelOpen: boolean;
  isNewConvModalOpen: boolean;
  isWindowFocused: boolean;
  selectedProfileId: string | null;

  typingConversations: Record<string, TypingState | null>;
  latestToast: ToastNotification | null;
  replyingTo: Message | null;
  activeCall: ActiveCallState | null;
  incomingCall: IncomingCallState | null;

  notificationsEnabled: boolean;
  notifyWhenFocused: boolean;
  soundEnabled: boolean;
  updateStatus: UpdateStatusPayload;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActiveTab: (tab: NavTab) => void;
  setSearchQuery: (query: string) => void;
  setInChatSearchQuery: (query: string) => void;
  toggleInChatSearch: () => void;
  toggleInfoPanel: () => void;
  setNewConvModalOpen: (open: boolean) => void;
  setWindowFocused: (focused: boolean) => void;
  dismissToast: () => void;
  setReplyingTo: (msg: Message | null) => void;
  setSelectedProfileId: (userId: string | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotifyWhenFocused: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  sendTestNotification: () => Promise<void>;
  setUpdateStatus: (payload: UpdateStatusPayload) => void;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => void;

  initializeApp: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, handle: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  fetchWorkspaceData: () => Promise<void>;
  subscribeRealtime: () => void;
  cleanupRealtime: () => void;

  setSelfStatus: (status: SelfPresence, syncToTray?: boolean) => Promise<void>;
  updateSelfProfile: (displayName: string, role: string, avatarUrl?: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string | null>;
  selectConversation: (conversationId: string) => Promise<void>;
  togglePinConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string, uploads?: StagedUpload[], codeBlock?: CodeBlock) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  createChannel: (name: string, topic: string, invitedUserIds?: string[]) => Promise<string | null>;
  inviteToGroup: (conversationId: string, userIds: string[]) => Promise<void>;
  leaveConversation: (conversationId: string) => Promise<void>;
  startDirectMessage: (targetUserId: string) => Promise<string | null>;
  broadcastTyping: (conversationId: string, isTyping: boolean) => void;
  syncBadgeCount: () => void;

  startCall: (conversationId: string, mode: CallMode) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

let dbChannel: RealtimeChannel | null = null;
let presenceChannel: RealtimeChannel | null = null;
let callsChannel: RealtimeChannel | null = null;
let peerConnection: RTCPeerConnection | null = null;
let fetchInFlight = false;
let fetchQueued = false;
let initializedSignalUserId: string | null = null;
const pendingIceByCall = new Map<string, RTCIceCandidateInit[]>();
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface DecryptedMessagePayload {
  content: string;
  codeBlock?: CodeBlock;
  attachments?: Attachment[];
}

function getSentCacheKey(userId: string): string {
  return `skellytalk_sent_cache_${userId}`;
}

function readSentCache(userId: string): Record<string, DecryptedMessagePayload> {
  try {
    const raw = localStorage.getItem(getSentCacheKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, DecryptedMessagePayload>) : {};
  } catch {
    return {};
  }
}

function saveSentCacheEntry(
  userId: string,
  messageId: string,
  payload: DecryptedMessagePayload
): void {
  try {
    const cache = readSentCache(userId);
    cache[messageId] = payload;
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      for (const k of keys.slice(0, keys.length - 500)) {
        delete cache[k];
      }
    }
    localStorage.setItem(getSentCacheKey(userId), JSON.stringify(cache));
  } catch {
    // Ignore storage quota errors
  }
}

async function decryptMessageRow(
  row: DbMessageRow,
  senderId: string,
  selfId?: string
): Promise<DecryptedMessagePayload> {
  if (selfId && senderId === selfId) {
    const cached = readSentCache(selfId)[row.id];
    if (cached) return cached;
  }
  const ciphertext = row.ciphertext?.ciphertext;
  if (!row.encryption_version || !ciphertext || row.ciphertext_type == null) {
    return {
      content: row.content,
      codeBlock: row.code_block ?? undefined,
      attachments: row.attachments ?? undefined,
    };
  }
  if (!window.lemchat) {
    if (row.content) {
      return {
        content: row.content,
        codeBlock: row.code_block ?? undefined,
        attachments: row.attachments ?? undefined,
      };
    }
    return { content: '[Encrypted message — open in the desktop app]' };
  }
  try {
    const encryptedEnvelope = row.ciphertext;
    if (row.ciphertext_type === 7 && encryptedEnvelope?.distribution_id) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from('signal_sender_key_distributions')
          .select('sender_id,distribution_message')
          .eq('conversation_id', row.conversation_id)
          .eq('distribution_id', encryptedEnvelope.distribution_id)
          .maybeSingle();
        if (data) {
          await window.lemchat.signalProcessSenderKeyDistribution(
            data.sender_id,
            encryptedEnvelope.distribution_id,
            data.distribution_message
          );
        }
      }
      const decrypted = await window.lemchat.signalDecryptGroup(
        senderId,
        encryptedEnvelope.distribution_id,
        ciphertext
      );
      try {
        const payload = JSON.parse(decrypted) as DecryptedMessagePayload;
        return { ...payload, content: payload.content ?? decrypted };
      } catch {
        return { content: decrypted };
      }
    }
    const decrypted = await window.lemchat.signalDecryptDirect(
      senderId,
      ciphertext,
      row.ciphertext_type
    );
    try {
      const payload = JSON.parse(decrypted) as DecryptedMessagePayload;
      return { ...payload, content: payload.content ?? decrypted };
    } catch {
      return { content: decrypted };
    }
  } catch (error) {
    console.error('[SkellyTalk] Failed to decrypt message:', error);
    if (row.content) {
      return {
        content: row.content,
        codeBlock: row.code_block ?? undefined,
        attachments: row.attachments ?? undefined,
      };
    }
    return { content: '[Encrypted message]' };
  }
}

function computeTotalUnread(conversations: Conversation[]): number {
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

function buildReactionsList(
  rows: DbReactionRow[],
  selfId: string
): Reaction[] {
  const map = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of rows) {
    const entry = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
    entry.count += 1;
    if (r.user_id === selfId) entry.reactedByMe = true;
    map.set(r.emoji, entry);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    reactedByMe: data.reactedByMe,
  }));
}

const savedTheme = (localStorage.getItem('skellytalk_theme') as ThemeMode | null) ?? 'dark';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
if (savedTheme === 'mono') {
  document.documentElement.classList.add('mono');
} else {
  document.documentElement.classList.remove('mono');
}

export const useChatStore = create<ChatStore>((set, get) => ({
  theme: savedTheme,
  activeTab: 'chats',
  configured: isSupabaseConfigured(),
  session: null,
  authLoading: true,
  authError: null,
  workspaceLoading: false,
  realtimeConnected: false,

  self: null,
  profiles: {},
  onlineUserIds: new Set<string>(),
  conversations: [],
  activeConversationId: null,

  searchQuery: '',
  inChatSearchQuery: '',
  isInChatSearchOpen: false,
  isInfoPanelOpen: false,
  isNewConvModalOpen: false,
  isWindowFocused: true,
  selectedProfileId: null,

  typingConversations: {},
  latestToast: null,
  replyingTo: null,
  activeCall: null,
  incomingCall: null,

  notificationsEnabled: localStorage.getItem('lemchat_notif_enabled') !== 'false',
  notifyWhenFocused: localStorage.getItem('lemchat_notif_focused') !== 'false',
  soundEnabled: localStorage.getItem('lemchat_sound_enabled') !== 'false',
  updateStatus: { status: 'idle' },

  setTheme: (theme) => {
    localStorage.setItem('skellytalk_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (theme === 'mono') {
      document.documentElement.classList.add('mono');
    } else {
      document.documentElement.classList.remove('mono');
    }
    set({ theme });
  },

  toggleTheme: () => {
    const cur = get().theme;
    const next: ThemeMode =
      cur === 'dark' ? 'light' : cur === 'light' ? 'mono' : 'dark';
    get().setTheme(next);
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setInChatSearchQuery: (inChatSearchQuery) => set({ inChatSearchQuery }),
  toggleInChatSearch: () =>
    set((state) => ({
      isInChatSearchOpen: !state.isInChatSearchOpen,
      inChatSearchQuery: state.isInChatSearchOpen ? '' : state.inChatSearchQuery,
    })),
  toggleInfoPanel: () =>
    set((state) => ({ isInfoPanelOpen: !state.isInfoPanelOpen })),
  setNewConvModalOpen: (isNewConvModalOpen) => set({ isNewConvModalOpen }),
  dismissToast: () => set({ latestToast: null }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setSelectedProfileId: (selectedProfileId) => set({ selectedProfileId }),

  setNotificationsEnabled: (notificationsEnabled) => {
    localStorage.setItem('lemchat_notif_enabled', String(notificationsEnabled));
    set({ notificationsEnabled });
  },

  setNotifyWhenFocused: (notifyWhenFocused) => {
    localStorage.setItem('lemchat_notif_focused', String(notifyWhenFocused));
    set({ notifyWhenFocused });
  },

  setSoundEnabled: (soundEnabled) => {
    localStorage.setItem('lemchat_sound_enabled', String(soundEnabled));
    set({ soundEnabled });
  },

  setUpdateStatus: (updateStatus) => set({ updateStatus }),

  checkForUpdates: async () => {
    await window.lemchat?.checkForUpdates?.();
  },

  installUpdate: () => {
    window.lemchat?.installUpdate?.();
  },

  sendTestNotification: async () => {
    const state = get();
    const conv =
      state.conversations.find((c) => c.id === state.activeConversationId) ??
      state.conversations[0];
    const convId = conv?.id ?? '';
    const title = 'SkellyTalk · Test Notification';
    const body = 'Native desktop notifications, sound chime, and Liquid Glass toasts are active!';

    if (state.soundEnabled) {
      playNotificationChime();
    }

    if (window.lemchat) {
      await window.lemchat.sendNotification({
        id: `test-${Date.now()}`,
        conversationId: convId,
        senderName: title,
        body,
        forceShow: true,
      });
    } else if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }

    set({
      latestToast: {
        id: `test-${Date.now()}`,
        conversationId: convId,
        senderName: title,
        senderAvatar: state.self?.avatar ?? 'LC',
        body,
      },
    });
  },

  setWindowFocused: (isWindowFocused) => {
    set({ isWindowFocused });
    if (isWindowFocused) {
      const activeId = get().activeConversationId;
      if (activeId) {
        const activeConv = get().conversations.find((c) => c.id === activeId);
        if (activeConv && activeConv.unreadCount > 0) {
          void get().selectConversation(activeId);
        }
      }
    }
  },

  initializeApp: async () => {
    const configured = isSupabaseConfigured();
    set({ configured });

    if (!configured) {
      set({ authLoading: false, session: null });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      set({ authLoading: false, session: null });
      return;
    }

    set({ authLoading: true, authError: null });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ authLoading: false, authError: error.message });
      return;
    }

    set({ session: data.session, authLoading: false });

    if (data.session) {
      await get().fetchWorkspaceData();
      get().subscribeRealtime();
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const prevUserId = get().session?.user?.id;
      set({ session: nextSession });

      if (nextSession && nextSession.user.id !== prevUserId) {
        await get().fetchWorkspaceData();
        get().subscribeRealtime();
      } else if (!nextSession) {
        get().cleanupRealtime();
        set({
          self: null,
          conversations: [],
          activeConversationId: null,
          profiles: {},
          realtimeConnected: false,
        });
        window.lemchat?.updateBadgeCount(0);
      }
    });
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    set({ authLoading: true, authError: null });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      set({ authLoading: false, authError: error.message });
      return;
    }

    set({ session: data.session, authLoading: false });
    if (data.session) {
      await get().fetchWorkspaceData();
      get().subscribeRealtime();
    }
  },

  signUp: async (email, password, displayName, handle) => {
    const supabase = getSupabaseClient();
    if (!supabase) return 'Supabase is not configured.';
    set({ authLoading: true, authError: null });

    const normalizedHandle = handle.trim().startsWith('@')
      ? handle.trim().toLowerCase()
      : `@${handle.trim().toLowerCase()}`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          handle: normalizedHandle,
        },
      },
    });

    if (error) {
      set({ authLoading: false, authError: error.message });
      return error.message;
    }

    set({ session: data.session, authLoading: false });
    if (data.session) {
      await get().fetchWorkspaceData();
      get().subscribeRealtime();
      return null;
    }

    // Email confirmation enabled in Supabase project
    return 'Account created! Please check your email to confirm your address, then sign in.';
  },

  signOut: async () => {
    const supabase = getSupabaseClient();
    get().cleanupRealtime();
    initializedSignalUserId = null;
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({
      session: null,
      self: null,
      conversations: [],
      activeConversationId: null,
      profiles: {},
      realtimeConnected: false,
    });
    window.lemchat?.updateBadgeCount(0);
  },

  fetchWorkspaceData: async () => {
    const supabase = getSupabaseClient();
    const user = get().session?.user;
    if (!supabase || !user) return;

    if (fetchInFlight) {
      fetchQueued = true;
      return;
    }
    fetchInFlight = true;

    try {
      const isInitialLoad = get().self === null && get().conversations.length === 0;
      if (isInitialLoad) {
        set({ workspaceLoading: true });
      }

      const [profilesRes, convsRes, membersRes, messagesRes, reactionsRes] =
        await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('conversations').select('*').order('created_at', { ascending: true }),
          supabase.from('conversation_members').select('*'),
          supabase.from('messages').select('*').order('created_at', { ascending: true }),
          supabase.from('message_reactions').select('*'),
        ]);

      const profileMap: Record<string, Profile> = {};
      for (const row of (profilesRes.data ?? []) as DbProfileRow[]) {
        profileMap[row.id] = {
          id: row.id,
          displayName: row.display_name,
          handle: row.handle,
          avatarText: row.avatar_text,
          role: row.role,
          status: row.status,
        };
      }

      // Ensure self profile exists even if trigger was delayed
      let selfProfile = profileMap[user.id];
      if (!selfProfile) {
        const fallbackName =
          (user.user_metadata?.display_name as string | undefined) ||
          user.email?.split('@')[0] ||
          'SkellyTalk User';
        const fallbackHandle =
          (user.user_metadata?.handle as string | undefined) ||
          `@${fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${user.id.slice(0, 4)}`;

        const { data: inserted } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            display_name: fallbackName,
            handle: fallbackHandle,
            avatar_text: fallbackName.trim().charAt(0).toUpperCase() || 'U',
            role: 'Member',
            status: 'online',
          })
          .select()
          .single();

        if (inserted) {
          const r = inserted as DbProfileRow;
          selfProfile = {
            id: r.id,
            displayName: r.display_name,
            handle: r.handle,
            avatarText: r.avatar_text,
            role: r.role,
            status: r.status,
          };
          profileMap[r.id] = selfProfile;
        }
      }

      const reactionsByMsg = new Map<string, DbReactionRow[]>();
      for (const rx of (reactionsRes.data ?? []) as DbReactionRow[]) {
        const arr = reactionsByMsg.get(rx.message_id) ?? [];
        arr.push(rx);
        reactionsByMsg.set(rx.message_id, arr);
      }

      const membersByConv = new Map<string, DbMemberRow[]>();
      for (const mem of (membersRes.data ?? []) as DbMemberRow[]) {
        const arr = membersByConv.get(mem.conversation_id) ?? [];
        arr.push(mem);
        membersByConv.set(mem.conversation_id, arr);
      }

      const messagesByConv = new Map<string, Message[]>();
      for (const msg of (messagesRes.data ?? []) as DbMessageRow[]) {
        const sender = profileMap[msg.sender_id];
        const msgReactions = buildReactionsList(
          reactionsByMsg.get(msg.id) ?? [],
          user.id
        );
        const decrypted = await decryptMessageRow(msg, msg.sender_id, user.id);

        const formatted: Message = {
          id: msg.id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          senderName: sender?.displayName ?? 'Member',
          senderAvatar: sender?.avatarText ?? 'ST',
          senderRole: sender?.role,
          content: decrypted.content,
          timestamp: formatTimestamp(msg.created_at),
          createdAt: msg.created_at,
          isMe: msg.sender_id === user.id,
          status: 'read',
          reactions: msgReactions,
          codeBlock: decrypted.codeBlock,
          attachments: decrypted.attachments,
          isMention: selfProfile
            ? decrypted.content.toLowerCase().includes(selfProfile.displayName.toLowerCase()) ||
              decrypted.content.toLowerCase().includes(selfProfile.handle.toLowerCase())
            : false,
        };

        const arr = messagesByConv.get(msg.conversation_id) ?? [];
        arr.push(formatted);
        messagesByConv.set(msg.conversation_id, arr);
      }

      const convRows = (convsRes.data ?? []) as DbConversationRow[];
      const legacyGeneralIds: string[] = [];

      const conversations: Conversation[] = convRows
        .filter((c) => {
          const members = membersByConv.get(c.id) ?? [];
          const myMem = members.find((m) => m.user_id === user.id);
          if (!myMem) return false;
          // Remove legacy auto-joined #general channel
          if (
            c.type === 'channel' &&
            c.name === 'general' &&
            c.topic.toLowerCase().includes('lemhand')
          ) {
            legacyGeneralIds.push(c.id);
            return false;
          }
          return true;
        })
        .map((c) => {
          const memberRows = membersByConv.get(c.id) ?? [];
          const myMem = memberRows.find((m) => m.user_id === user.id);
          const msgs = messagesByConv.get(c.id) ?? [];
          const lastReadMs = myMem ? new Date(myMem.last_read_at).getTime() : 0;

          const unreadCount = myMem
            ? msgs.filter(
                (m) => !m.isMe && new Date(m.createdAt).getTime() > lastReadMs
              ).length
            : 0;

          const memberProfiles: Profile[] = memberRows
            .map((m) => profileMap[m.user_id])
            .filter((p): p is Profile => Boolean(p));

          let displayName = c.name;
          let avatar = '#';
          let peerUserId: string | undefined;
          let status: Conversation['status'];
          let roleOrTopic = c.topic;

          if (c.type === 'dm') {
            const peerMem = memberRows.find((m) => m.user_id !== user.id);
            const peer = peerMem ? profileMap[peerMem.user_id] : undefined;
            displayName = peer?.displayName ?? c.name;
            avatar = peer?.avatarText ?? displayName.slice(0, 2).toUpperCase();
            peerUserId = peer?.id;
            status = peer?.status ?? 'offline';
            roleOrTopic = peer?.role ?? 'Direct Message';
          }

          return {
            id: c.id,
            name: displayName,
            type: c.type,
            avatar,
            status,
            peerUserId,
            roleOrTopic,
            pinned: myMem?.pinned ?? false,
            unreadCount,
            membersCount: c.type === 'channel' ? Math.max(memberRows.length, 1) : undefined,
            members: memberProfiles,
            lastReadAt: myMem?.last_read_at,
            messages: msgs,
          };
        });

      if (legacyGeneralIds.length > 0) {
        void supabase
          .from('conversation_members')
          .delete()
          .in('conversation_id', legacyGeneralIds)
          .eq('user_id', user.id);
      }

      const currentActive = get().activeConversationId;
      const nextActiveId =
        currentActive && conversations.some((c) => c.id === currentActive)
          ? currentActive
          : conversations[0]?.id ?? null;

      set({
        workspaceLoading: false,
        profiles: profileMap,
        conversations,
        activeConversationId: nextActiveId,
        self: selfProfile
          ? {
              id: selfProfile.id,
              name: selfProfile.displayName,
              handle: selfProfile.handle,
              role: selfProfile.role,
              avatar: selfProfile.avatarText,
              status: selfProfile.status,
            }
          : null,
      });

      if (selfProfile) {
        window.lemchat?.updateUserStatus(selfProfile.status);
        if (window.lemchat?.signalInitialize && initializedSignalUserId !== user.id) {
          initializedSignalUserId = user.id;
          void window.lemchat
            .signalInitialize()
            .then(async (result) => {
              const initialized = result as {
                publicBundle: {
                  identityKey: string;
                  registrationId: number;
                  signedPreKeyId: number;
                  signedPreKey: string;
                  signedPreKeySignature: string;
                  kyberPreKeyId: number;
                  kyberPreKey: string;
                  kyberPreKeySignature: string;
                  oneTimePreKeys: Array<{ id: number; publicKey: string }>;
                };
              };
              await supabase.from('signal_key_bundles').upsert({
                user_id: user.id,
                identity_key: initialized.publicBundle.identityKey,
                registration_id: initialized.publicBundle.registrationId,
                signed_pre_key_id: initialized.publicBundle.signedPreKeyId,
                signed_pre_key: initialized.publicBundle.signedPreKey,
                signed_pre_key_signature: initialized.publicBundle.signedPreKeySignature,
                kyber_pre_key_id: initialized.publicBundle.kyberPreKeyId,
                kyber_pre_key: initialized.publicBundle.kyberPreKey,
                kyber_pre_key_signature: initialized.publicBundle.kyberPreKeySignature,
                one_time_pre_keys: initialized.publicBundle.oneTimePreKeys,
                updated_at: new Date().toISOString(),
              });
            })
            .catch((err) => {
              console.warn('[SkellyTalk] Signal key bundle sync skipped:', err);
            });
        }
      }
      window.lemchat?.updateBadgeCount(computeTotalUnread(conversations));
    } catch (err) {
      console.error('[SkellyTalk] fetchWorkspaceData error:', err);
      set({ workspaceLoading: false });
    } finally {
      fetchInFlight = false;
      if (fetchQueued) {
        fetchQueued = false;
        void get().fetchWorkspaceData();
      }
    }
  },

  subscribeRealtime: () => {
    const supabase = getSupabaseClient();
    const user = get().session?.user;
    if (!supabase || !user) return;

    get().cleanupRealtime();

    // 1. Postgres changes for messages, reactions, profiles, conversations
    dbChannel = supabase
      .channel('lemchat:db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new as DbMessageRow;
          const state = get();
          const sender = state.profiles[row.sender_id];
          const isMe = row.sender_id === user.id;
          const decrypted = await decryptMessageRow(row, row.sender_id, user.id);

          const existingConv = state.conversations.find(
            (c) => c.id === row.conversation_id
          );
          if (!existingConv) {
            void get().fetchWorkspaceData();
            return;
          }

          // Deduplicate if already added
          if (existingConv.messages.some((m) => m.id === row.id)) return;

          const newMsg: Message = {
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            senderName: sender?.displayName ?? 'Member',
            senderAvatar: sender?.avatarText ?? 'ST',
            senderRole: sender?.role,
            content: decrypted.content,
            timestamp: formatTimestamp(row.created_at),
            createdAt: row.created_at,
            isMe,
            status: 'read',
            reactions: [],
            codeBlock: decrypted.codeBlock,
            attachments: decrypted.attachments,
            isMention: state.self
              ? decrypted.content.toLowerCase().includes(state.self.name.toLowerCase()) ||
                decrypted.content.toLowerCase().includes(state.self.handle.toLowerCase())
              : false,
          };

          const isViewing =
            state.activeConversationId === row.conversation_id &&
            state.isWindowFocused &&
            state.activeTab !== 'settings';

          const updatedConvs = state.conversations.map((conv) => {
            if (conv.id !== row.conversation_id) return conv;
            return {
              ...conv,
              unreadCount: isMe || isViewing ? conv.unreadCount : conv.unreadCount + 1,
              messages: [...conv.messages, newMsg],
            };
          });

          set({
            conversations: updatedConvs,
            typingConversations: {
              ...state.typingConversations,
              [row.conversation_id]: null,
            },
          });

          window.lemchat?.updateBadgeCount(computeTotalUnread(updatedConvs));

          if (!isMe) {
            if (isViewing) {
              // Mark read immediately in DB
              void supabase
                .from('conversation_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', row.conversation_id)
                .eq('user_id', user.id);
            } else {
              const title =
                existingConv.type === 'channel'
                  ? `${newMsg.senderName} in #${existingConv.name}`
                  : newMsg.senderName;
              const bodyText =
                newMsg.content ||
                (newMsg.attachments?.length ? `Sent ${newMsg.attachments[0].name}` : 'New message');

              if (state.notificationsEnabled && state.self?.status !== 'busy') {
                if (state.soundEnabled) {
                  playNotificationChime();
                }

                if (window.lemchat) {
                  void window.lemchat.sendNotification({
                    id: newMsg.id,
                    conversationId: row.conversation_id,
                    senderName: title,
                    body: bodyText,
                    forceShow: state.notifyWhenFocused,
                  });
                } else if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(title, { body: bodyText });
                }

                set({
                  latestToast: {
                    id: newMsg.id,
                    conversationId: row.conversation_id,
                    senderName: title,
                    senderAvatar: newMsg.senderAvatar,
                    body: bodyText,
                  },
                });
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        async (payload) => {
          const row = payload.new as DbMessageRow;
          const decrypted = await decryptMessageRow(row, row.sender_id, user.id);
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id !== row.conversation_id
                ? conv
                : {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === row.id
                        ? {
                            ...m,
                            content: decrypted.content,
                            codeBlock: decrypted.codeBlock,
                            attachments: decrypted.attachments,
                          }
                        : m
                    ),
                  }
            ),
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const oldRow = payload.old as { id?: string; conversation_id?: string };
          if (!oldRow.id) return;
          set((state) => ({
            conversations: state.conversations.map((conv) => ({
              ...conv,
              messages: conv.messages.filter((m) => m.id !== oldRow.id),
            })),
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => {
          // Refresh reactions cleanly so counts stay exact across clients
          void get().fetchWorkspaceData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          const row = payload.new as DbProfileRow | undefined;
          if (!row?.id) return;
          set((state) => {
            const updatedProfiles = {
              ...state.profiles,
              [row.id]: {
                id: row.id,
                displayName: row.display_name,
                handle: row.handle,
                avatarText: row.avatar_text,
                role: row.role,
                status: row.status,
              },
            };
            const updatedConvs = state.conversations.map((c) => {
              if (c.type === 'dm' && c.peerUserId === row.id) {
                return {
                  ...c,
                  status: row.status,
                  name: row.display_name,
                  avatar: row.avatar_text,
                  roleOrTopic: row.role,
                };
              }
              return {
                ...c,
                members: c.members.map((m) =>
                  m.id === row.id ? updatedProfiles[row.id] : m
                ),
              };
            });
            return { profiles: updatedProfiles, conversations: updatedConvs };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => {
          void get().fetchWorkspaceData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversation_members' },
        () => {
          void get().fetchWorkspaceData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'conversation_members' },
        () => {
          void get().fetchWorkspaceData();
        }
      )
      .subscribe((status) => {
        set({ realtimeConnected: status === 'SUBSCRIBED' });
      });

    // 2. Realtime Presence + Typing Broadcast + Group Invite channel
    presenceChannel = supabase.channel('lemchat:live', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState();
        const online = new Set<string>(Object.keys(state));
        set({ onlineUserIds: online });
      })
      .on('broadcast', { event: 'conv:invited' }, ({ payload }) => {
        const data = payload as { userIds?: string[] };
        if (data.userIds?.includes(user.id)) {
          void get().fetchWorkspaceData();
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const data = payload as {
          conversationId: string;
          senderId: string;
          senderName: string;
          isTyping: boolean;
        };
        if (data.senderId === user.id) return;

        const key = `${data.conversationId}:${data.senderId}`;
        const existingTimer = typingTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);

        if (data.isTyping) {
          set((state) => ({
            typingConversations: {
              ...state.typingConversations,
              [data.conversationId]: {
                senderId: data.senderId,
                senderName: data.senderName,
              },
            },
          }));
          typingTimers.set(
            key,
            setTimeout(() => {
              set((state) => ({
                typingConversations: {
                  ...state.typingConversations,
                  [data.conversationId]: null,
                },
              }));
            }, 3000)
          );
        } else {
          set((state) => ({
            typingConversations: {
              ...state.typingConversations,
              [data.conversationId]: null,
            },
          }));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && presenceChannel) {
          await presenceChannel.track({
            userId: user.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    // 3. WebRTC Call Signaling Channel
    callsChannel = supabase.channel('skellytalk:calls', {
      config: { broadcast: { self: false } },
    });
    callsChannel
      .on('broadcast', { event: 'call:offer' }, async ({ payload }) => {
        const data = payload as {
          callId: string;
          conversationId: string;
          callerId: string;
          callerName: string;
          callerAvatar: string;
          mode: CallMode;
          offer: RTCSessionDescriptionInit;
        };
        if (data.callerId === user.id) return;

        // Handle mid-call renegotiation (e.g. camera switched on or screen share started)
        const currentActive = get().activeCall;
        if (currentActive && currentActive.callId === data.callId && peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await callsChannel?.send({
            type: 'broadcast',
            event: 'call:answer',
            payload: { callId: data.callId, senderId: user.id, answer },
          });
          return;
        }

        const conv = get().conversations.find((c) => c.id === data.conversationId);
        if (!conv) return;

        if (get().soundEnabled && get().self?.status !== 'busy') {
          startIncomingRingtone();
        }

        set({
          incomingCall: {
            callId: data.callId,
            conversationId: data.conversationId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar,
            mode: data.mode,
            offer: data.offer,
          },
        });

        void window.lemchat?.sendNotification({
          id: `call-${data.callId}`,
          conversationId: data.conversationId,
          senderName: `Incoming ${data.mode} call from ${data.callerName}`,
          body: 'Click to answer in SkellyTalk',
        });
      })
      .on('broadcast', { event: 'call:answer' }, async ({ payload }) => {
        const data = payload as {
          callId: string;
          senderId: string;
          answer: RTCSessionDescriptionInit;
        };
        if (data.senderId === user.id) return;
        const active = get().activeCall;
        if (!active || active.callId !== data.callId || !peerConnection) return;

        stopRingtone();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        const queued = pendingIceByCall.get(data.callId) ?? [];
        pendingIceByCall.delete(data.callId);
        for (const cand of queued) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        set((state) =>
          state.activeCall && state.activeCall.callId === data.callId
            ? {
                activeCall: {
                  ...state.activeCall,
                  status: 'connected',
                  startedAt: state.activeCall.startedAt ?? Date.now(),
                },
              }
            : {}
        );
      })
      .on('broadcast', { event: 'call:ice' }, async ({ payload }) => {
        const data = payload as {
          callId: string;
          senderId: string;
          candidate: RTCIceCandidateInit;
        };
        if (data.senderId === user.id) return;
        const active = get().activeCall;

        if (
          active &&
          active.callId === data.callId &&
          peerConnection &&
          peerConnection.remoteDescription
        ) {
          await peerConnection
            .addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(() => {});
        } else {
          // Queue candidates arriving before callee accepts or before remoteDescription is set
          const arr = pendingIceByCall.get(data.callId) ?? [];
          arr.push(data.candidate);
          pendingIceByCall.set(data.callId, arr);
        }
      })
      .on('broadcast', { event: 'call:hangup' }, ({ payload }) => {
        const data = payload as { callId: string; senderId: string };
        if (data.senderId === user.id) return;
        if (get().incomingCall?.callId === data.callId) {
          stopRingtone();
          set({ incomingCall: null });
        }
        if (get().activeCall?.callId === data.callId) {
          stopRingtone();
          get().endCall();
        }
      })
      .subscribe();
  },

  cleanupRealtime: () => {
    const supabase = getSupabaseClient();
    if (supabase && dbChannel) {
      void supabase.removeChannel(dbChannel);
    }
    if (supabase && presenceChannel) {
      void supabase.removeChannel(presenceChannel);
    }
    if (supabase && callsChannel) {
      void supabase.removeChannel(callsChannel);
    }
    dbChannel = null;
    presenceChannel = null;
    callsChannel = null;
    for (const t of typingTimers.values()) clearTimeout(t);
    typingTimers.clear();
  },

  setSelfStatus: async (status, syncToTray = true) => {
    const supabase = getSupabaseClient();
    const self = get().self;
    if (self) {
      set({ self: { ...self, status } });
      if (supabase) {
        await supabase.from('profiles').update({ status }).eq('id', self.id);
      }
    }
    if (syncToTray) {
      window.lemchat?.updateUserStatus(status);
    }
  },

  updateSelfProfile: async (displayName, role, avatarSpecOrUrl) => {
    const supabase = getSupabaseClient();
    const self = get().self;
    if (!supabase || !self) return;

    const cleanName = displayName.trim() || self.name;
    const cleanRole = role.trim() || self.role;
    const currentSpec = parseAvatarSpec(self.avatar, cleanName);

    let nextAvatar: string;
    if (avatarSpecOrUrl) {
      if (avatarSpecOrUrl.trim().startsWith('{')) {
        const parsed = parseAvatarSpec(avatarSpecOrUrl, cleanName);
        nextAvatar = serializeAvatarSpec({
          ...parsed,
          letter: cleanName.charAt(0).toUpperCase(),
        });
      } else {
        nextAvatar = serializeAvatarSpec({
          mode: 'image',
          bg: currentSpec.bg,
          url: avatarSpecOrUrl,
          letter: cleanName.charAt(0).toUpperCase(),
        });
      }
    } else {
      nextAvatar = serializeAvatarSpec({
        ...currentSpec,
        letter: cleanName.charAt(0).toUpperCase(),
      });
    }

    set((state) => ({
      self: {
        ...self,
        name: cleanName,
        role: cleanRole,
        avatar: nextAvatar,
      },
      profiles: {
        ...state.profiles,
        [self.id]: {
          id: self.id,
          displayName: cleanName,
          handle: self.handle,
          avatarText: nextAvatar,
          role: cleanRole,
          status: self.status,
        },
      },
    }));

    await supabase
      .from('profiles')
      .update({
        display_name: cleanName,
        role: cleanRole,
        avatar_text: nextAvatar,
      })
      .eq('id', self.id);
  },

  uploadAvatar: async (file) => {
    const supabase = getSupabaseClient();
    const self = get().self;
    if (!supabase || !self) return null;

    try {
      const ext = file.name.split('.').pop() || 'png';
      const storagePath = `avatars/${self.id}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('lemchat-attachments')
        .upload(storagePath, file, { upsert: true });

      if (uploadErr) {
        console.error('[SkellyTalk] Avatar upload failed:', uploadErr.message);
        return null;
      }

      const { data: pub } = supabase.storage
        .from('lemchat-attachments')
        .getPublicUrl(storagePath);

      const currentSpec = parseAvatarSpec(self.avatar, self.name);
      const nextSerialized = serializeAvatarSpec({
        mode: 'image',
        bg: currentSpec.bg,
        url: pub.publicUrl,
        letter: self.name.trim().charAt(0).toUpperCase() || 'U',
      });

      await get().updateSelfProfile(self.name, self.role, nextSerialized);
      return pub.publicUrl;
    } catch (err) {
      console.error('[SkellyTalk] Avatar upload error:', err);
      return null;
    }
  },

  selectConversation: async (conversationId) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;

    set((state) => {
      const updated = state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );
      window.lemchat?.updateBadgeCount(computeTotalUnread(updated));
      return {
        conversations: updated,
        activeConversationId: conversationId,
        activeTab: state.activeTab === 'settings' ? 'chats' : state.activeTab,
        inChatSearchQuery: '',
        isInChatSearchOpen: false,
      };
    });

    if (supabase && userId) {
      await supabase
        .from('conversation_members')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: userId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'conversation_id,user_id' }
        );
    }
  },

  togglePinConversation: async (conversationId) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;
    const target = get().conversations.find((c) => c.id === conversationId);
    if (!target) return;
    const nextPinned = !target.pinned;

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, pinned: nextPinned } : c
      ),
    }));

    if (supabase && userId) {
      await supabase
        .from('conversation_members')
        .upsert(
          {
            conversation_id: conversationId,
            user_id: userId,
            pinned: nextPinned,
          },
          { onConflict: 'conversation_id,user_id' }
        );
    }
  },

  sendMessage: async (content, uploads, codeBlock) => {
    const supabase = getSupabaseClient();
    const user = get().session?.user;
    const convId = get().activeConversationId;
    const trimmed = content.trim();

    if (!supabase || !user || !convId) return;
    if (!trimmed && (!uploads || uploads.length === 0) && !codeBlock) return;

    // Upload any staged files to Supabase Storage bucket 'lemchat-attachments'
    const attachments: Attachment[] = [];
    if (uploads && uploads.length > 0) {
      for (const item of uploads) {
        const ext = item.name.split('.').pop() || 'bin';
        const storagePath = `${convId}/${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from('lemchat-attachments')
          .upload(storagePath, item.file, { upsert: false });

        if (uploadErr) {
          throw new Error(`Attachment upload failed for ${item.name}: ${uploadErr.message}`);
        }

        const { data: pub } = supabase.storage
          .from('lemchat-attachments')
          .getPublicUrl(storagePath);

        attachments.push({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          previewUrl: pub.publicUrl,
          mimeLabel: item.mimeLabel,
        });
      }
    }

    get().broadcastTyping(convId, false);

    // Ensure user is a member of the channel before posting
    await supabase
      .from('conversation_members')
      .upsert(
        {
          conversation_id: convId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'conversation_id,user_id' }
      );

    const { replyingTo } = get();
    const finalContent = replyingTo
      ? `> ${replyingTo.senderName}: ${replyingTo.content.slice(0, 120)}\n\n${trimmed}`
      : trimmed;
    const conv = get().conversations.find((conversation) => conversation.id === convId);

    const plaintextPayload = JSON.stringify({
      content: finalContent,
      codeBlock: codeBlock ?? null,
      attachments: attachments.length > 0 ? attachments : null,
    });

    let insertedId: string | undefined;

    if (window.lemchat?.signalEncryptDirect && conv) {
      try {
        if (conv.type === 'dm' && conv.peerUserId) {
          const { data: bundleRow } = await supabase
            .from('signal_key_bundles')
            .select('*')
            .eq('user_id', conv.peerUserId)
            .maybeSingle();

          if (bundleRow) {
            const recipientBundle = {
              identityKey: bundleRow.identity_key,
              registrationId: bundleRow.registration_id,
              signedPreKeyId: bundleRow.signed_pre_key_id,
              signedPreKey: bundleRow.signed_pre_key,
              signedPreKeySignature: bundleRow.signed_pre_key_signature,
              kyberPreKeyId: bundleRow.kyber_pre_key_id,
              kyberPreKey: bundleRow.kyber_pre_key,
              kyberPreKeySignature: bundleRow.kyber_pre_key_signature,
              oneTimePreKeys: bundleRow.one_time_pre_keys as Array<{ id: number; publicKey: string }>,
            };
            const encrypted = (await window.lemchat.signalEncryptDirect(
              conv.peerUserId,
              recipientBundle,
              plaintextPayload
            )) as { ciphertext: string; ciphertextType: number; encryptionVersion: string };

            const { data: insertedRow, error: insertErr } = await supabase
              .from('messages')
              .insert({
                conversation_id: convId,
                sender_id: user.id,
                content: '',
                ciphertext: { ciphertext: encrypted.ciphertext },
                encryption_version: encrypted.encryptionVersion,
                ciphertext_type: encrypted.ciphertextType,
                code_block: null,
                attachments: null,
              })
              .select('id')
              .maybeSingle();

            if (!insertErr && insertedRow?.id) {
              insertedId = insertedRow.id as string;
            }
          }
        } else if (conv.type === 'channel') {
          const distributionId = convId;
          const existingDistribution = await supabase
            .from('signal_sender_key_distributions')
            .select('distribution_id')
            .eq('conversation_id', convId)
            .eq('sender_id', user.id)
            .eq('distribution_id', distributionId)
            .maybeSingle();

          if (!existingDistribution.data) {
            const distribution = (await window.lemchat.signalCreateSenderKeyDistribution(
              distributionId
            )) as { ciphertext: string };
            await supabase.from('signal_sender_key_distributions').insert({
              conversation_id: convId,
              sender_id: user.id,
              distribution_id: distributionId,
              distribution_message: distribution.ciphertext,
            });
          }

          const encrypted = (await window.lemchat.signalEncryptGroup(
            distributionId,
            plaintextPayload
          )) as { ciphertext: string; ciphertextType: number };

          const { data: insertedRow, error: insertErr } = await supabase
            .from('messages')
            .insert({
              conversation_id: convId,
              sender_id: user.id,
              content: '',
              ciphertext: {
                ciphertext: encrypted.ciphertext,
                distribution_id: distributionId,
              },
              encryption_version: 'libsignal-sender-key-v1',
              ciphertext_type: encrypted.ciphertextType,
              code_block: null,
              attachments: null,
            })
            .select('id')
            .maybeSingle();

          if (!insertErr && insertedRow?.id) {
            insertedId = insertedRow.id as string;
          }
        }
      } catch (err) {
        console.warn('[SkellyTalk] Signal encryption unavailable, using standard transport:', err);
      }
    }

    if (insertedId) {
      saveSentCacheEntry(user.id, insertedId, {
        content: finalContent,
        codeBlock: codeBlock ?? undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    } else {
      await supabase.from('messages').insert({
        conversation_id: convId,
        sender_id: user.id,
        content: finalContent,
        code_block: codeBlock ?? null,
        attachments: attachments.length > 0 ? attachments : null,
      });
    }

    set({ replyingTo: null });
  },

  editMessage: async (messageId, content) => {
    const supabase = getSupabaseClient();
    const user = get().session?.user;
    const trimmed = content.trim();
    if (!supabase || !user || !trimmed) return;

    const conv = get().conversations.find((conversation) =>
      conversation.messages.some((message) => message.id === messageId)
    );
    if (!conv) return;
    const existing = conv.messages.find((message) => message.id === messageId);
    if (!existing) return;

    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId ? { ...m, content: trimmed } : m
        ),
      })),
    }));

    let encryptedPayload: {
      ciphertext: { ciphertext: string; distribution_id?: string };
      encryption_version: string;
      ciphertext_type: number;
    } | null = null;

    if (window.lemchat?.signalEncryptDirect) {
      try {
        const serialized = JSON.stringify({
          content: trimmed,
          codeBlock: existing.codeBlock ?? null,
          attachments: existing.attachments ?? null,
        });
        if (conv.type === 'dm' && conv.peerUserId) {
          const { data: bundleRow } = await supabase
            .from('signal_key_bundles')
            .select('*')
            .eq('user_id', conv.peerUserId)
            .maybeSingle();
          if (bundleRow) {
            const recipientBundle = {
              identityKey: bundleRow.identity_key,
              registrationId: bundleRow.registration_id,
              signedPreKeyId: bundleRow.signed_pre_key_id,
              signedPreKey: bundleRow.signed_pre_key,
              signedPreKeySignature: bundleRow.signed_pre_key_signature,
              kyberPreKeyId: bundleRow.kyber_pre_key_id,
              kyberPreKey: bundleRow.kyber_pre_key,
              kyberPreKeySignature: bundleRow.kyber_pre_key_signature,
              oneTimePreKeys: bundleRow.one_time_pre_keys as Array<{ id: number; publicKey: string }>,
            };
            const encrypted = (await window.lemchat.signalEncryptDirect(
              conv.peerUserId,
              recipientBundle,
              serialized
            )) as { ciphertext: string; ciphertextType: number; encryptionVersion: string };
            encryptedPayload = {
              ciphertext: { ciphertext: encrypted.ciphertext },
              encryption_version: encrypted.encryptionVersion,
              ciphertext_type: encrypted.ciphertextType,
            };
          }
        } else if (conv.type === 'channel') {
          const distributionId = conv.id;
          const encrypted = (await window.lemchat.signalEncryptGroup(
            distributionId,
            serialized
          )) as { ciphertext: string; ciphertextType: number };
          encryptedPayload = {
            ciphertext: { ciphertext: encrypted.ciphertext, distribution_id: distributionId },
            encryption_version: 'libsignal-sender-key-v1',
            ciphertext_type: encrypted.ciphertextType,
          };
        }
      } catch (err) {
        console.warn('[SkellyTalk] Edit encryption fallback:', err);
      }
    }

    if (encryptedPayload) {
      saveSentCacheEntry(user.id, messageId, {
        content: trimmed,
        codeBlock: existing.codeBlock,
        attachments: existing.attachments,
      });
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: '',
          ...encryptedPayload,
          code_block: null,
          attachments: null,
        })
        .eq('id', messageId);
      if (updateError) {
        await get().fetchWorkspaceData();
      }
    } else {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ content: trimmed })
        .eq('id', messageId);
      if (updateError) {
        await get().fetchWorkspaceData();
      }
    }
  },

  deleteMessage: async (messageId) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    set((state) => ({
      conversations: state.conversations.map((conv) => ({
        ...conv,
        messages: conv.messages.filter((m) => m.id !== messageId),
      })),
    }));

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    if (deleteError) {
      await get().fetchWorkspaceData();
      throw new Error(`Message deletion failed: ${deleteError.message}`);
    }
  },

  toggleReaction: async (conversationId, messageId, emoji) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;
    if (!supabase || !userId) return;

    const conv = get().conversations.find((c) => c.id === conversationId);
    const msg = conv?.messages.find((m) => m.id === messageId);
    const existing = msg?.reactions.find((r) => r.emoji === emoji);

    if (existing?.reactedByMe) {
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      });
    }
  },

  createChannel: async (name, topic, invitedUserIds = []) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;
    if (!supabase || !userId) return null;

    const cleanName = name
      .trim()
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/\s+/g, '-');

    if (!cleanName) return null;

    const convId = crypto.randomUUID();
    const uniqueInvites = Array.from(
      new Set(invitedUserIds.filter((id) => id && id !== userId))
    );
    const profilesMap = get().profiles;
    const memberProfiles: Profile[] = [userId, ...uniqueInvites]
      .map((id) => profilesMap[id])
      .filter((p): p is Profile => Boolean(p));

    // Optimistically close modal and open the new group immediately
    set((state) => ({
      isNewConvModalOpen: false,
      activeTab: state.activeTab === 'settings' ? 'chats' : state.activeTab,
      activeConversationId: convId,
      conversations: [
        ...state.conversations,
        {
          id: convId,
          name: cleanName,
          type: 'channel',
          avatar: '#',
          roleOrTopic: topic.trim() || 'Group chat',
          pinned: false,
          unreadCount: 0,
          membersCount: Math.max(memberProfiles.length, 1),
          members: memberProfiles,
          messages: [],
        },
      ],
    }));

    try {
      const { error } = await supabase.from('conversations').insert({
        id: convId,
        name: cleanName,
        type: 'channel',
        topic: topic.trim() || 'Group chat',
        created_by: userId,
      });

      if (error) {
        console.error('[SkellyTalk] Failed to create group:', error.message);
        return null;
      }

      const { error: selfMemErr } = await supabase
        .from('conversation_members')
        .upsert(
          {
            conversation_id: convId,
            user_id: userId,
            pinned: false,
          },
          { onConflict: 'conversation_id,user_id' }
        );

      if (selfMemErr) {
        console.error('[SkellyTalk] Failed to add creator to group:', selfMemErr.message);
        return null;
      }

      if (uniqueInvites.length > 0) {
        await supabase.from('conversation_members').upsert(
          uniqueInvites.map((uid) => ({
            conversation_id: convId,
            user_id: uid,
            pinned: false,
          })),
          { onConflict: 'conversation_id,user_id' }
        );

        void presenceChannel?.send({
          type: 'broadcast',
          event: 'conv:invited',
          payload: { conversationId: convId, userIds: uniqueInvites },
        });
      }

      return convId;
    } catch (err) {
      console.error('[SkellyTalk] createChannel error:', err);
      return null;
    }
  },

  inviteToGroup: async (conversationId, userIds) => {
    const supabase = getSupabaseClient();
    const selfId = get().session?.user?.id;
    if (!supabase || !selfId) return;

    const uniqueIds = Array.from(new Set(userIds.filter((id) => id && id !== selfId)));
    if (uniqueIds.length === 0) return;

    try {
      await supabase.from('conversation_members').upsert(
        uniqueIds.map((uid) => ({
          conversation_id: conversationId,
          user_id: uid,
          pinned: false,
        })),
        { onConflict: 'conversation_id,user_id' }
      );

      void presenceChannel?.send({
        type: 'broadcast',
        event: 'conv:invited',
        payload: { conversationId, userIds: uniqueIds },
      });

      await get().fetchWorkspaceData();
    } catch (err) {
      console.error('[SkellyTalk] inviteToGroup error:', err);
    }
  },

  leaveConversation: async (conversationId) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;
    if (!supabase || !userId) return;

    try {
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      set((state) => {
        const remaining = state.conversations.filter((c) => c.id !== conversationId);
        const nextActive =
          state.activeConversationId === conversationId
            ? remaining[0]?.id ?? null
            : state.activeConversationId;
        window.lemchat?.updateBadgeCount(computeTotalUnread(remaining));
        return {
          conversations: remaining,
          activeConversationId: nextActive,
        };
      });
    } catch (err) {
      console.error('[SkellyTalk] leaveConversation error:', err);
    }
  },

  startDirectMessage: async (targetUserId) => {
    const supabase = getSupabaseClient();
    const userId = get().session?.user?.id;
    if (!supabase || !userId || targetUserId === userId) return null;

    // Check if a 1:1 DM already exists
    const existing = get().conversations.find(
      (c) => c.type === 'dm' && c.peerUserId === targetUserId
    );
    if (existing) {
      await get().selectConversation(existing.id);
      return existing.id;
    }

    const peer = get().profiles[targetUserId];
    const selfProfile = get().profiles[userId];
    const convId = crypto.randomUUID();
    const memberProfiles: Profile[] = [selfProfile, peer].filter(
      (p): p is Profile => Boolean(p)
    );

    // Optimistically close modal and select the new DM immediately
    set((state) => ({
      isNewConvModalOpen: false,
      activeTab: state.activeTab === 'settings' ? 'chats' : state.activeTab,
      activeConversationId: convId,
      conversations: [
        ...state.conversations,
        {
          id: convId,
          name: peer?.displayName ?? 'Direct Message',
          type: 'dm',
          avatar: peer?.avatarText ?? (peer?.displayName?.trim().charAt(0).toUpperCase() || 'U'),
          status: peer?.status ?? 'offline',
          peerUserId: targetUserId,
          roleOrTopic: peer?.role ?? 'Direct Message',
          pinned: false,
          unreadCount: 0,
          members: memberProfiles,
          messages: [],
        },
      ],
    }));

    try {
      // Insert conversation without chaining .select().single() so RLS doesn't reject before membership exists
      const { error: convErr } = await supabase.from('conversations').insert({
        id: convId,
        name: peer?.displayName ?? 'Direct Message',
        type: 'dm',
        topic: peer?.role ?? 'Direct Message',
        created_by: userId,
      });

      if (convErr) {
        console.error('[SkellyTalk] Failed to create DM conversation:', convErr.message);
        return null;
      }

      const { error: selfMemErr } = await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: convId, user_id: userId, pinned: false },
          { onConflict: 'conversation_id,user_id' }
        );

      if (selfMemErr) {
        console.error('[SkellyTalk] Failed to add self to DM:', selfMemErr.message);
        return null;
      }

      const { error: peerMemErr } = await supabase
        .from('conversation_members')
        .upsert(
          { conversation_id: convId, user_id: targetUserId, pinned: false },
          { onConflict: 'conversation_id,user_id' }
        );

      if (peerMemErr) {
        console.error('[SkellyTalk] Failed to add recipient to DM:', peerMemErr.message);
      }

      void presenceChannel?.send({
        type: 'broadcast',
        event: 'conv:invited',
        payload: { conversationId: convId, userIds: [targetUserId] },
      });

      return convId;
    } catch (err) {
      console.error('[SkellyTalk] startDirectMessage error:', err);
      return null;
    }
  },

  broadcastTyping: (conversationId, isTyping) => {
    const self = get().self;
    if (!presenceChannel || !self) return;
    void presenceChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        conversationId,
        senderId: self.id,
        senderName: self.name,
        isTyping,
      },
    });
  },

  syncBadgeCount: () => {
    const total = computeTotalUnread(get().conversations);
    window.lemchat?.updateBadgeCount(total);
  },

  startCall: async (conversationId, mode) => {
    const self = get().self;
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!self || !conv) return;

    const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let localStream: MediaStream | null = null;
    let mediaWarning: string | undefined;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
    } catch {
      if (mode === 'video') {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          mediaWarning = 'No camera detected — using audio only.';
        } catch {
          mediaWarning = 'No microphone/camera detected — listen-only mode.';
        }
      } else {
        mediaWarning = 'No microphone detected — listen-only mode.';
      }
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnection = pc;
    const remoteMediaStream = new MediaStream();

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!));
    }
    if (!localStream || localStream.getAudioTracks().length === 0) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    if (mode === 'video' && (!localStream || localStream.getVideoTracks().length === 0)) {
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    pc.ontrack = (event) => {
      remoteMediaStream.addTrack(event.track);
      const active = get().activeCall;
      if (active && active.callId === callId) {
        set({
          activeCall: {
            ...active,
            remoteStream: new MediaStream(remoteMediaStream.getTracks()),
            status: 'connected',
            startedAt: active.startedAt ?? Date.now(),
          },
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callsChannel) {
        void callsChannel.send({
          type: 'broadcast',
          event: 'call:ice',
          payload: {
            callId,
            senderId: self.id,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    const activeVideoTrack = localStream?.getVideoTracks()[0];
    const selectedCameraId = activeVideoTrack?.getSettings().deviceId;

    set({
      activeCall: {
        callId,
        conversationId,
        conversationName: conv.type === 'channel' ? `#${conv.name}` : conv.name,
        mode,
        status: 'ringing',
        isMuted: false,
        isCameraOff: !activeVideoTrack,
        isScreenSharing: false,
        selectedCameraId,
        startedAt: null,
        localStream,
        remoteStream: null,
        mediaWarning,
      },
    });

    if (get().soundEnabled) {
      startOutgoingRingtone();
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (callsChannel) {
      await callsChannel.send({
        type: 'broadcast',
        event: 'call:offer',
        payload: {
          callId,
          conversationId,
          callerId: self.id,
          callerName: self.name,
          callerAvatar: self.avatar,
          mode,
          offer,
        },
      });
    }
  },

  acceptIncomingCall: async () => {
    const incoming = get().incomingCall;
    const self = get().self;
    if (!incoming || !self) return;

    stopRingtone();

    const conv = get().conversations.find((c) => c.id === incoming.conversationId);
    let localStream: MediaStream | null = null;
    let mediaWarning: string | undefined;

    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incoming.mode === 'video',
      });
    } catch {
      if (incoming.mode === 'video') {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          mediaWarning = 'No camera detected — using audio only.';
        } catch {
          mediaWarning = 'No microphone/camera detected — listen-only mode.';
        }
      } else {
        mediaWarning = 'No microphone detected — listen-only mode.';
      }
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnection = pc;
    const remoteMediaStream = new MediaStream();

    const activeVideoTrack = localStream?.getVideoTracks()[0];
    const selectedCameraId = activeVideoTrack?.getSettings().deviceId;

    // Set activeCall BEFORE setRemoteDescription so pc.ontrack updates activeCall.remoteStream immediately!
    set({
      incomingCall: null,
      activeCall: {
        callId: incoming.callId,
        conversationId: incoming.conversationId,
        conversationName: conv
          ? conv.type === 'channel'
            ? `#${conv.name}`
            : conv.name
          : incoming.callerName,
        mode: incoming.mode,
        status: 'connected',
        isMuted: false,
        isCameraOff: !activeVideoTrack,
        isScreenSharing: false,
        selectedCameraId,
        startedAt: Date.now(),
        localStream,
        remoteStream: null,
        mediaWarning,
      },
    });

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!));
    }

    pc.ontrack = (event) => {
      remoteMediaStream.addTrack(event.track);
      const active = get().activeCall;
      if (active && active.callId === incoming.callId) {
        set({
          activeCall: {
            ...active,
            remoteStream: new MediaStream(remoteMediaStream.getTracks()),
            status: 'connected',
            startedAt: active.startedAt ?? Date.now(),
          },
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callsChannel) {
        void callsChannel.send({
          type: 'broadcast',
          event: 'call:ice',
          payload: {
            callId: incoming.callId,
            senderId: self.id,
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));

    const queued = pendingIceByCall.get(incoming.callId) ?? [];
    pendingIceByCall.delete(incoming.callId);
    for (const cand of queued) {
      await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (callsChannel) {
      await callsChannel.send({
        type: 'broadcast',
        event: 'call:answer',
        payload: {
          callId: incoming.callId,
          senderId: self.id,
          answer,
        },
      });
    }
  },

  declineIncomingCall: () => {
    stopRingtone();
    const incoming = get().incomingCall;
    const self = get().self;
    if (incoming && self && callsChannel) {
      void callsChannel.send({
        type: 'broadcast',
        event: 'call:hangup',
        payload: { callId: incoming.callId, senderId: self.id },
      });
    }
    if (incoming) pendingIceByCall.delete(incoming.callId);
    set({ incomingCall: null });
  },

  endCall: () => {
    stopRingtone();
    const active = get().activeCall;
    const self = get().self;
    if (active && self && callsChannel) {
      void callsChannel.send({
        type: 'broadcast',
        event: 'call:hangup',
        payload: { callId: active.callId, senderId: self.id },
      });
    }
    if (active?.localStream) {
      active.localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (active) pendingIceByCall.delete(active.callId);
    set({ activeCall: null });
  },

  toggleMute: () => {
    const active = get().activeCall;
    if (!active) return;
    const nextMuted = !active.isMuted;
    active.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    set({ activeCall: { ...active, isMuted: nextMuted } });
  },

  toggleCamera: async () => {
    const active = get().activeCall;
    const self = get().self;
    if (!active) return;

    const existingVideoTracks = active.localStream?.getVideoTracks() ?? [];
    if (existingVideoTracks.length > 0) {
      const nextOff = !active.isCameraOff;
      existingVideoTracks.forEach((t) => {
        t.enabled = !nextOff;
      });
      set({ activeCall: { ...active, isCameraOff: nextOff } });
      return;
    }

    // No video track yet (e.g. started as audio-only) — acquire camera and renegotiate
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: active.selectedCameraId
          ? { deviceId: { exact: active.selectedCameraId } }
          : true,
      });
      const newTrack = camStream.getVideoTracks()[0];
      if (!newTrack) return;

      const updatedLocal = new MediaStream([
        ...(active.localStream?.getTracks() ?? []),
        newTrack,
      ]);

      if (peerConnection) {
        const videoSender = peerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        } else {
          peerConnection.addTrack(newTrack, updatedLocal);
          if (callsChannel && self) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await callsChannel.send({
              type: 'broadcast',
              event: 'call:offer',
              payload: {
                callId: active.callId,
                conversationId: active.conversationId,
                callerId: self.id,
                callerName: self.name,
                callerAvatar: self.avatar,
                mode: 'video',
                offer,
              },
            });
          }
        }
      }

      set({
        activeCall: {
          ...active,
          mode: 'video',
          isCameraOff: false,
          selectedCameraId: newTrack.getSettings().deviceId,
          localStream: updatedLocal,
          mediaWarning: undefined,
        },
      });
    } catch {
      set({
        activeCall: {
          ...active,
          mediaWarning: 'Could not access camera.',
        },
      });
    }
  },

  switchCamera: async (deviceId) => {
    const active = get().activeCall;
    const self = get().self;
    if (!active) return;

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const newTrack = camStream.getVideoTracks()[0];
      if (!newTrack) return;

      // Stop old video tracks
      active.localStream?.getVideoTracks().forEach((t) => t.stop());
      const audioTracks = active.localStream?.getAudioTracks() ?? [];
      const updatedLocal = new MediaStream([...audioTracks, newTrack]);

      if (peerConnection) {
        const videoSender = peerConnection
          .getSenders()
          .find((s) => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newTrack);
        } else {
          peerConnection.addTrack(newTrack, updatedLocal);
          if (callsChannel && self) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await callsChannel.send({
              type: 'broadcast',
              event: 'call:offer',
              payload: {
                callId: active.callId,
                conversationId: active.conversationId,
                callerId: self.id,
                callerName: self.name,
                callerAvatar: self.avatar,
                mode: 'video',
                offer,
              },
            });
          }
        }
      }

      set({
        activeCall: {
          ...active,
          mode: 'video',
          isCameraOff: false,
          selectedCameraId: deviceId,
          localStream: updatedLocal,
          mediaWarning: undefined,
        },
      });
    } catch {
      set({
        activeCall: {
          ...active,
          mediaWarning: 'Failed to switch camera.',
        },
      });
    }
  },

  toggleScreenShare: async () => {
    const active = get().activeCall;
    const self = get().self;
    if (!active || !peerConnection) return;

    if (active.isScreenSharing) {
      set({ activeCall: { ...active, isScreenSharing: false } });
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;

      const sender = peerConnection
        .getSenders()
        .find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
      } else {
        const updatedLocal = new MediaStream([
          ...(active.localStream?.getTracks() ?? []),
          screenTrack,
        ]);
        peerConnection.addTrack(screenTrack, updatedLocal);
        if (callsChannel && self) {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          await callsChannel.send({
            type: 'broadcast',
            event: 'call:offer',
            payload: {
              callId: active.callId,
              conversationId: active.conversationId,
              callerId: self.id,
              callerName: self.name,
              callerAvatar: self.avatar,
              mode: 'video',
              offer,
            },
          });
        }
      }

      screenTrack.onended = () => {
        const current = get().activeCall;
        if (current) {
          set({ activeCall: { ...current, isScreenSharing: false } });
        }
      };

      set({
        activeCall: {
          ...active,
          mode: 'video',
          isScreenSharing: true,
          isCameraOff: false,
        },
      });
    } catch {
      // User cancelled screen share picker
    }
  },
}));
