import { contextBridge, ipcRenderer } from 'electron';

export type UserPresence = 'online' | 'away' | 'busy';

export interface NotificationPayload {
  id: string;
  conversationId: string;
  senderName: string;
  body: string;
  forceShow?: boolean;
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

export interface ShareSourceInfo {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnail: string;
  appIcon: string | null;
}

export interface ShareRequestPayload {
  sources: ShareSourceInfo[];
  audioAvailable: boolean;
}

export interface LemChatAPI {
  platform: NodeJS.Platform;
  profileId: string;
  getAppVersion: () => Promise<string>;
  signalInitialize: () => Promise<unknown>;
  signalEncryptDirect: (recipientId: string, recipientBundle: unknown, plaintext: string) => Promise<unknown>;
  signalDecryptDirect: (senderId: string, ciphertext: string, ciphertextType: number) => Promise<string>;
  signalCreateSenderKeyDistribution: (distributionId: string) => Promise<unknown>;
  signalProcessSenderKeyDistribution: (senderId: string, distributionId: string, ciphertext: string) => Promise<void>;
  signalEncryptGroup: (distributionId: string, plaintext: string) => Promise<unknown>;
  signalDecryptGroup: (senderId: string, distributionId: string, ciphertext: string) => Promise<string>;
  sendNotification: (payload: NotificationPayload) => Promise<boolean>;
  updateBadgeCount: (count: number) => void;
  updateUserStatus: (status: UserPresence) => void;
  setAppLogo: (id: string) => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  isWindowMaximized: () => Promise<boolean>;
  loadState: (profileId: string) => Promise<unknown | null>;
  saveState: (profileId: string, state: unknown) => Promise<boolean>;
  clearState: (profileId: string) => Promise<boolean>;
  saveAttachment: (filename: string, dataUrl: string) => Promise<boolean>;
  openNewPeerWindow: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  onNotificationClicked: (callback: (conversationId: string) => void) => () => void;
  onStatusChangedFromTray: (callback: (status: UserPresence) => void) => () => void;
  onWindowFocusChange: (callback: (isFocused: boolean) => void) => () => void;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  onScreenShareRequest: (callback: (payload: ShareRequestPayload) => void) => () => void;
  onScreenShareClose: (callback: () => void) => () => void;
  refreshScreenShareSources: () => Promise<ShareSourceInfo[]>;
  pickScreenShare: (choice: { id: string; audio: boolean } | null) => void;
}

const profileArg = process.argv.find((a) => a.startsWith('--lemchat-profile='));
const profileId = profileArg ? profileArg.split('=')[1] : 'default';

const api: LemChatAPI = {
  onScreenShareRequest: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: ShareRequestPayload) => callback(payload);
    ipcRenderer.on('lemchat:screen-share-request', handler);
    return () => ipcRenderer.removeListener('lemchat:screen-share-request', handler);
  },
  onScreenShareClose: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('lemchat:screen-share-close', handler);
    return () => ipcRenderer.removeListener('lemchat:screen-share-close', handler);
  },
  refreshScreenShareSources: () => ipcRenderer.invoke('lemchat:screen-share-sources'),
  pickScreenShare: (choice) => ipcRenderer.send('lemchat:screen-share-pick', choice),
  platform: process.platform,
  profileId,
  getAppVersion: () => ipcRenderer.invoke('lemchat:get-app-version'),
  signalInitialize: () => ipcRenderer.invoke('lemchat:signal-init', profileId),
  signalEncryptDirect: (recipientId, recipientBundle, plaintext) =>
    ipcRenderer.invoke('lemchat:signal-encrypt-direct', profileId, recipientId, recipientBundle, plaintext),
  signalDecryptDirect: (senderId, ciphertext, ciphertextType) =>
    ipcRenderer.invoke('lemchat:signal-decrypt-direct', profileId, senderId, ciphertext, ciphertextType),
  signalCreateSenderKeyDistribution: (distributionId) =>
    ipcRenderer.invoke('lemchat:signal-create-sender-key', profileId, distributionId),
  signalProcessSenderKeyDistribution: (senderId, distributionId, ciphertext) =>
    ipcRenderer.invoke('lemchat:signal-process-sender-key', profileId, senderId, distributionId, ciphertext),
  signalEncryptGroup: (distributionId, plaintext) =>
    ipcRenderer.invoke('lemchat:signal-encrypt-group', profileId, distributionId, plaintext),
  signalDecryptGroup: (senderId, distributionId, ciphertext) =>
    ipcRenderer.invoke('lemchat:signal-decrypt-group', profileId, senderId, distributionId, ciphertext),
  sendNotification: (payload) => ipcRenderer.invoke('lemchat:notify', payload),
  updateBadgeCount: (count) => ipcRenderer.send('lemchat:badge-count', count),
  updateUserStatus: (status) => ipcRenderer.send('lemchat:user-status', status),
  setAppLogo: (id) => ipcRenderer.send('lemchat:set-app-logo', id),
  windowMinimize: () => ipcRenderer.send('lemchat:window-minimize'),
  windowMaximize: () => ipcRenderer.send('lemchat:window-maximize'),
  windowClose: () => ipcRenderer.send('lemchat:window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('lemchat:window-is-maximized'),
  loadState: (pid) => ipcRenderer.invoke('lemchat:load-state', pid),
  saveState: (pid, state) => ipcRenderer.invoke('lemchat:save-state', pid, state),
  clearState: (pid) => ipcRenderer.invoke('lemchat:clear-state', pid),
  saveAttachment: (filename, dataUrl) =>
    ipcRenderer.invoke('lemchat:save-attachment', filename, dataUrl),
  openNewPeerWindow: () => ipcRenderer.invoke('lemchat:open-peer-window'),
  checkForUpdates: () => ipcRenderer.invoke('lemchat:check-updates'),
  downloadUpdate: () => ipcRenderer.send('lemchat:download-update'),
  installUpdate: () => ipcRenderer.send('lemchat:install-update'),
  onUpdateStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: UpdateStatusPayload) => {
      callback(payload);
    };
    ipcRenderer.on('lemchat:update-status', handler);
    void ipcRenderer.invoke('lemchat:get-update-status').then((payload: UpdateStatusPayload) => {
      callback(payload);
    });
    return () => ipcRenderer.removeListener('lemchat:update-status', handler);
  },
  onNotificationClicked: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, conversationId: string) => {
      callback(conversationId);
    };
    ipcRenderer.on('lemchat:notification-clicked', handler);
    return () => ipcRenderer.removeListener('lemchat:notification-clicked', handler);
  },
  onStatusChangedFromTray: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, status: UserPresence) => {
      callback(status);
    };
    ipcRenderer.on('lemchat:tray-status-changed', handler);
    return () => ipcRenderer.removeListener('lemchat:tray-status-changed', handler);
  },
  onWindowFocusChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, isFocused: boolean) => {
      callback(isFocused);
    };
    ipcRenderer.on('lemchat:window-focus', handler);
    return () => ipcRenderer.removeListener('lemchat:window-focus', handler);
  },
  onMaximizeChange: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => {
      callback(isMaximized);
    };
    ipcRenderer.on('lemchat:window-maximized', handler);
    return () => ipcRenderer.removeListener('lemchat:window-maximized', handler);
  },
};

contextBridge.exposeInMainWorld('lemchat', api);
