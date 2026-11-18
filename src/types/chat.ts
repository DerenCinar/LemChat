export type UserPresence = 'online' | 'away' | 'busy' | 'offline';
export type SelfPresence = 'online' | 'away' | 'busy';
export type NavTab = 'chats' | 'channels' | 'mentions' | 'settings';
export type ThemeMode = 'dark' | 'light' | 'mono' | 'mono-dark';

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
}

export interface StagedUpload {
  id: string;
  file: File;
  name: string;
  type: 'image' | 'file';
  size: string;
  previewUrl?: string;
  mimeLabel?: string;
}

export interface GifAttachment {
  url: string;
  name: string;
}

export interface CodeBlock {
  language: string;
  code: string;
}

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
}

export interface SelfProfile {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatar: string;
  status: SelfPresence;
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
