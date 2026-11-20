export type UserPresence = 'online' | 'away' | 'busy' | 'offline';
export type SelfPresence = 'online' | 'away' | 'busy';
export type NavTab = 'chats' | 'channels' | 'mentions' | 'settings';
export type ThemeMode =
  | 'dark'
  | 'light'
  | 'mono'
  | 'mono-dark'
  | 'ocean'
  | 'sunset'
  | 'rose'
  | 'aurora'
  | 'ice'
  | 'amethyst';
export type ChatFont = 'system' | 'inter' | 'rounded' | 'mono';
export type ChatFontSize = 'small' | 'medium' | 'large';
export type ProfanityFilter = 'off' | 'mild' | 'strict';
export type MemberRole = 'owner' | 'admin' | 'moderator' | 'member';
export type BubbleDensity = 'cozy' | 'compact' | 'minimal';
export type BubbleStyle = 'imessage' | 'imessage-classic' | 'cyber' | 'glass';
export type TimestampFormat = '12h' | '24h' | 'relative' | 'seconds';
export type EntranceEffect = 'spring' | 'slide' | 'liquid' | 'instant';
export type SidebarLayout = 'rail' | 'standard' | 'preview';
export type EnterBehavior = 'enter-send' | 'ctrl-send';
export type UnreadDividerStyle = 'laser' | 'pill' | 'dotted' | 'rainbow';
export type RealGlassMode = 'standard' | 'polar' | 'prominent' | 'shader';
export type GlassDepth = 'flat' | 'elevated' | 'floating';
export type NotificationRevealMode = 'classic' | 'liquid-reveal' | 'liquid-privacy';
export type NotificationSoundId =
  | 'emerald-chime'
  | 'liquid-drop'
  | 'crystal-triad'
  | 'aurora-bell'
  | 'soft-pop'
  | 'zen-gong'
  | 'sonar-ping'
  | 'pixel-spark'
  | 'velvet-chord'
  | 'frost-tinkle';
export type RingtoneId =
  | 'skelly-arpeggio'
  | 'liquid-marimba'
  | 'glass-harp'
  | 'cosmic-pulse'
  | 'classic-ring'
  | 'ocean-waves'
  | 'neon-synth'
  | 'minimal-beacon';

export interface LiquidGlassTheme {
  blur: number;
  opacity: number;
  borderGlow: number;
  roundness: number;
  accent: string;
  bubbleColor: string;
  density: BubbleDensity;
  ambientMotion: boolean;
  wallpaper: string;
  quickReactions: string[];
  bubbleStyle: BubbleStyle;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  timestampFormat: TimestampFormat;
  entranceEffect: EntranceEffect;
  cursorGlow: boolean;
  sidebarLayout: SidebarLayout;
  enterBehavior: EnterBehavior;
  unreadDividerStyle: UnreadDividerStyle;
  emojiSkinTone: 'default' | 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';
  emojiStyle: 'native' | 'twemoji';
  awayReply: string;
  awayReplyCooldown: number;
  keywordAlerts: string;
  fairPlayPrivacy: boolean;
  typingPrivacy: boolean;
  readReceipts: boolean;
  lastSeenPrivacy: boolean;
  autoLoadMedia: boolean;
  snippets: Record<string, string>;
  savedReplies: string[];
  // Real Liquid Glass (rdev/liquid-glass-react) & surface settings
  useRealLiquidGlass: boolean;
  realGlassMode: RealGlassMode;
  refractionScale: number;
  aberrationIntensity: number;
  glassElasticity: number;
  glassSaturation: number;
  specularSheen: number;
  glassTintStrength: number;
  glassDepth: GlassDepth;
  // Notification reveal & sound preferences
  notificationReveal: NotificationRevealMode;
  notificationSound: NotificationSoundId;
  ringtone: RingtoneId;
  soundVolume: number;
  // Accessibility settings
  reduceMotion: boolean;
  reduceTransparency: boolean;
  highContrast: boolean;
  dyslexiaFont: boolean;
  textScale: number;
  focusOutlines: boolean;
  underlineLinks: boolean;
  largeClickTargets: boolean;
  screenFlashAlerts: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  size: string;
  previewUrl?: string;
  mimeLabel?: string;
  /** Custom sticker: rendered bare (no card) in the bubble. */
  sticker?: boolean;
}

export interface StagedUpload {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'file';
  size: string;
  previewUrl?: string;
  mimeLabel?: string;
  sticker?: boolean;
}

export interface GifAttachment {
  url: string;
  name: string;
}

export interface CodeBlock {
  language: string;
  code: string;
}

export interface PollMetadata {
  kind: 'poll';
  question: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  votes: Record<string, string>;
}

export interface GameMetadata {
  kind: 'game';
  game: 'tic-tac-toe';
  board: Array<'X' | 'O' | null>;
  xPlayerId: string;
  oPlayerId?: string;
  currentTurn: 'X' | 'O';
  winner?: 'X' | 'O' | 'draw';
}

/** Sealed message; `data` is AES-GCM ciphertext, the key is released by the server at `unlockAt`. */
export interface CapsuleMetadata {
  kind: 'capsule';
  unlockAt: string;
  iv: string;
  data: string;
}

export type InteractiveMetadata = PollMetadata | GameMetadata | CapsuleMetadata;

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  createdAt: string;
  isMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
  reactions: Reaction[];
  codeBlock?: CodeBlock;
  attachments?: Attachment[];
  editedAt?: string;
  deletedAt?: string;
  isMention?: boolean;
  isEdited?: boolean;
  isPinned?: boolean;
  interactive?: InteractiveMetadata;
}

export interface Conversation {
  id: string;
  name: string;
  type: 'dm' | 'channel';
  avatar: string;
  status?: UserPresence;
  peerUserId?: string;
  roleOrTopic: string;
  pinned: boolean;
  unreadCount: number;
  membersCount?: number;
  members: Profile[];
  memberRoles?: Record<string, MemberRole>;
  logoUrl?: string;
  lastReadAt?: string;
  messages: Message[];
}

export interface Profile {
  id: string;
  displayName: string;
  accountName: string;
  handle: string;
  avatarText: string;
  role: string;
  status: SelfPresence;
  lastSeenAt?: string;
  pronouns?: string;
  bio?: string;
  activity?: string;
  statusText?: string;
  banner?: string;
  nameplate?: string;
}

export interface SelfProfile {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatar: string;
  status: SelfPresence;
  lastSeenAt?: string;
  pronouns?: string;
  bio?: string;
  activity?: string;
  statusText?: string;
  statusExpiresAt?: number;
  banner?: string;
  nameplate?: string;
}

export type CallMode = 'audio' | 'video';
export type CallStatus = 'ringing' | 'connecting' | 'connected';

export interface ActiveCallState {
  callId: string;
  conversationId: string;
  conversationName: string;
  mode: CallMode;
  status: CallStatus;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  selectedCameraId?: string;
  startedAt: number | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaWarning?: string;
}

export interface UpdateStatusPayload {
  status:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'installing'
    | 'error';
  version?: string;
  progress?: number;
  message?: string;
}

export interface IncomingCallState {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  mode: CallMode;
  offer: RTCSessionDescriptionInit;
}

export interface NotificationPayload {
  id: string;
  conversationId: string;
  senderName: string;
  body: string;
  forceShow?: boolean;
}

export interface LemChatAPI {
  platform: NodeJS.Platform;
  getAppVersion?: () => Promise<string>;
  signalInitialize: () => Promise<unknown>;
  signalEncryptDirect: (recipientId: string, recipientBundle: unknown, plaintext: string) => Promise<unknown>;
  signalDecryptDirect: (senderId: string, ciphertext: string, ciphertextType: number) => Promise<string>;
  signalCreateSenderKeyDistribution: (distributionId: string) => Promise<unknown>;
  signalProcessSenderKeyDistribution: (senderId: string, distributionId: string, ciphertext: string) => Promise<void>;
  signalEncryptGroup: (distributionId: string, plaintext: string) => Promise<unknown>;
  signalDecryptGroup: (senderId: string, distributionId: string, ciphertext: string) => Promise<string>;
  sendNotification: (payload: NotificationPayload) => Promise<boolean>;
  updateBadgeCount: (count: number) => void;
  updateUserStatus: (status: SelfPresence) => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  isWindowMaximized: () => Promise<boolean>;
  checkForUpdates?: () => Promise<void>;
  downloadUpdate?: () => void;
  installUpdate?: () => void;
  onUpdateStatus?: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  onNotificationClicked: (callback: (conversationId: string) => void) => () => void;
  onStatusChangedFromTray: (callback: (status: SelfPresence) => void) => () => void;
  onWindowFocusChange: (callback: (isFocused: boolean) => void) => () => void;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
}

declare global {
  interface Window {
    lemchat?: LemChatAPI;
  }
}
