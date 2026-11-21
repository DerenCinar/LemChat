import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  Menu,
  Notification,
  session,
  shell,
  Tray,
  nativeImage,
  nativeTheme,
  type NativeImage,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { autoUpdater } from 'electron-updater';
import { createBadgeOverlayIcon, createLemChatIcon } from './icon';
import {
  clearPersistedState,
  loadPersistedState,
  savePersistedState,
} from './storage';
import {
  createSenderKeyDistribution,
  decryptDirectMessage,
  decryptGroupMessage,
  encryptGroupMessage,
  encryptDirectMessage,
  initializeIdentity,
  processSenderKeyDistribution,
  type PublicKeyBundle,
} from './libsignal';
import type { NotificationPayload, UpdateStatusPayload, UserPresence } from './preload';

let mainWindow: BrowserWindow | null = null;
const allWindows = new Set<BrowserWindow>();
let tray: Tray | null = null;
let currentStatus: UserPresence = 'online';
let isQuitting = false;
let isApplyingUpdate = false;
let peerWindowCounter = 1;
let latestUpdateStatus: UpdateStatusPayload = { status: 'idle' };
let startupUpdateCheckPending = true;
let startupUpdateDownloadPending = false;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.skellytalk.app');
}
app.setName('SkellyTalk');

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

const APP_LOGO_FILES: Record<string, string> = {
  gradient: 'logo-gradient.png',
  red: 'logo-red.png',
  teal: 'logo-teal.png',
};
let appLogoChoice = 'gradient';
const appLogoPrefPath = () => path.join(app.getPath('userData'), 'app-logo.txt');
function loadAppLogoChoice() {
  try {
    const v = fs.readFileSync(appLogoPrefPath(), 'utf-8').trim();
    if (v === 'default' || APP_LOGO_FILES[v]) appLogoChoice = v;
  } catch {
    /* no saved preference */
  }
}

function getAppIcon(): NativeImage {
  // Use the chosen logo, or (default) the higher-contrast logo for the current system theme.
  const filename =
    APP_LOGO_FILES[appLogoChoice] ??
    (nativeTheme.shouldUseDarkColors ? 'skellytalk-light-mode.png' : 'skellytalk-dark-mode.png');
  const assetPaths = [
    path.join(app.getAppPath(), 'dist', 'assets', filename),
    path.join(app.getAppPath(), 'public', 'assets', filename),
    path.join(process.resourcesPath, 'assets', filename),
    path.join(__dirname, '..', 'dist', 'assets', filename),
    path.join(__dirname, '..', 'public', 'assets', filename),
  ];
  const assetPath = assetPaths.find((candidate) => fs.existsSync(candidate));
  if (assetPath) {
    const image = nativeImage.createFromPath(assetPath);
    if (!image.isEmpty()) {
      return image;
    }
  }
  return createLemChatIcon(64);
}

function focusWindow(win: BrowserWindow | null) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) {
    win.restore();
  }
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
  if (process.platform === 'win32') {
    win.moveTop();
  }
}

function rebuildTrayMenu() {
  if (!tray) return;
  const statusLabels: Record<UserPresence, string> = {
    online: 'Online',
    away: 'Away',
    busy: 'Busy (Do Not Disturb)',
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open SkellyTalk',
      click: () => focusWindow(mainWindow),
    },
    {
      label: 'Open New Peer Window',
      click: () => {
        peerWindowCounter += 1;
        createWindow(`peer-${peerWindowCounter}`);
      },
    },
    { type: 'separator' },
    {
      label: 'Status',
      submenu: (['online', 'away', 'busy'] as UserPresence[]).map((status) => ({
        label: statusLabels[status],
        type: 'radio' as const,
        checked: currentStatus === status,
        click: () => {
          currentStatus = status;
          rebuildTrayMenu();
          mainWindow?.webContents.send('lemchat:tray-status-changed', status);
        },
      })),
    },
    { type: 'separator' },
    {
      label: 'Quit SkellyTalk',
      click: () => {
        if (isApplyingUpdate) return;
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const trayIcon = getAppIcon().resize({ width: 32, height: 32 });
  tray = new Tray(trayIcon);
  tray.setToolTip('SkellyTalk — Liquid Glass Messaging');
  tray.on('click', () => focusWindow(mainWindow));
  tray.on('double-click', () => focusWindow(mainWindow));
  rebuildTrayMenu();
}

/** Wraps a single PNG-encoded image in an .ico container (Vista+ supports PNG entries). */
function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header[6] = size >= 256 ? 0 : size; // width
  header[7] = size >= 256 ? 0 : size; // height
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // data offset
  return Buffer.concat([header, png]);
}

/**
 * Rewrites this app's pinned taskbar shortcut so the pinned icon follows the chosen logo.
 * Only touches .lnk files whose target is this app's own executable. Windows-only, packaged builds only.
 */
function syncPinnedTaskbarIcon(icon: NativeImage) {
  if (process.platform !== 'win32' || !app.isPackaged || !process.env.APPDATA) return;
  try {
    const icoPath = path.join(app.getPath('userData'), `taskbar-icon-${appLogoChoice}${appLogoChoice === 'default' ? (nativeTheme.shouldUseDarkColors ? '-dark' : '-light') : ''}.ico`);
    const resized = icon.resize({ width: 256, height: 256, quality: 'best' });
    fs.writeFileSync(icoPath, pngToIco(resized.toPNG(), 256));

    const pinDir = path.join(process.env.APPDATA, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar');
    if (!fs.existsSync(pinDir)) return;
    const exe = path.resolve(process.execPath).toLowerCase();
    let changed = false;
    for (const name of fs.readdirSync(pinDir)) {
      if (!name.toLowerCase().endsWith('.lnk')) continue;
      const lnk = path.join(pinDir, name);
      try {
        const details = shell.readShortcutLink(lnk);
        if (path.resolve(details.target).toLowerCase() !== exe) continue;
        if (details.icon?.toLowerCase() === icoPath.toLowerCase()) continue;
        if (shell.writeShortcutLink(lnk, 'update', { ...details, icon: icoPath, iconIndex: 0 })) changed = true;
      } catch {
        /* unreadable or locked shortcut: skip */
      }
    }
    if (changed) {
      // Ask Explorer to drop its cached icons so the new pin icon shows up.
      execFile('ie4uinit.exe', ['-show'], { windowsHide: true }, () => undefined);
    }
  } catch {
    /* best effort */
  }
}

function refreshPlatformIcons() {
  const icon = getAppIcon();
  syncPinnedTaskbarIcon(icon);
  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      win.setIcon(icon);
    }
  }
  tray?.setImage(icon.resize({ width: 32, height: 32 }));
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon);
  }
}

interface ShareSourceInfo {
  id: string;
  name: string;
  kind: 'screen' | 'window';
  thumbnail: string;
  appIcon: string | null;
}

async function listShareSources(): Promise<ShareSourceInfo[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 480, height: 270 },
    fetchWindowIcons: true,
  });
  return sources
    .filter((src) => !src.thumbnail.isEmpty())
    .map((src) => ({
      id: src.id,
      name: src.name,
      kind: src.id.startsWith('screen:') ? ('screen' as const) : ('window' as const),
      thumbnail: `data:image/jpeg;base64,${src.thumbnail.toJPEG(65).toString('base64')}`,
      appIcon: src.appIcon && !src.appIcon.isEmpty() ? src.appIcon.toDataURL() : null,
    }));
}

let pendingShare: {
  webContentsId: number;
  resolve: (choice: { id: string; audio: boolean } | null) => void;
} | null = null;

/** Asks the renderer to show the custom screen-share picker and waits for the choice. */
function requestShareChoice(win: BrowserWindow): Promise<{ id: string; audio: boolean } | null> {
  return new Promise((resolve) => {
    pendingShare?.resolve(null);
    const timer = setTimeout(() => finish(null), 120_000);
    const finish = (choice: { id: string; audio: boolean } | null) => {
      clearTimeout(timer);
      if (pendingShare?.resolve === finish) pendingShare = null;
      if (!win.isDestroyed()) win.webContents.send('lemchat:screen-share-close');
      resolve(choice);
    };
    pendingShare = { webContentsId: win.webContents.id, resolve: finish };
    void listShareSources()
      .then((sources) => {
        if (win.isDestroyed()) return finish(null);
        win.webContents.send('lemchat:screen-share-request', {
          sources,
          audioAvailable: process.platform === 'win32',
        });
      })
      .catch(() => finish(null));
  });
}

function createWindow(profileId = 'default'): BrowserWindow {
  const appIcon = getAppIcon();
  const isWin = process.platform === 'win32';

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    transparent: !isWin,
    frame: false,
    hasShadow: true,
    icon: appIcon,
    backgroundColor: isWin ? '#090F0C' : '#00000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: 'persist:skellytalk',
      additionalArguments: [`--lemchat-profile=${profileId}`],
    },
  };

  if (process.platform === 'darwin') {
    windowOptions.vibrancy = 'under-window';
    windowOptions.visualEffectState = 'active';
  }

  const win = new BrowserWindow(windowOptions);
  allWindows.add(win);
  if (!mainWindow) {
    mainWindow = win;
  }

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.on('focus', () => {
    win.webContents.send('lemchat:window-focus', true);
  });

  win.on('blur', () => {
    win.webContents.send('lemchat:window-focus', false);
  });

  win.on('maximize', () => {
    win.webContents.send('lemchat:window-maximized', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('lemchat:window-maximized', false);
  });

  win.on('close', (event) => {
    if (isApplyingUpdate) {
      event.preventDefault();
      win.show();
      win.focus();
      return;
    }
    if (!isQuitting && win === mainWindow) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on('closed', () => {
    allWindows.delete(win);
    if (mainWindow === win) {
      mainWindow = Array.from(allWindows)[0] ?? null;
    }
  });

  return win;
}

function registerIpcHandlers() {
  ipcMain.handle('lemchat:signal-init', (_event, profileId: string) =>
    initializeIdentity(profileId)
  );
  ipcMain.handle(
    'lemchat:signal-encrypt-direct',
    (_event, profileId: string, recipientId: string, bundle: PublicKeyBundle, plaintext: string) =>
      encryptDirectMessage(profileId, recipientId, bundle, plaintext)
  );
  ipcMain.handle(
    'lemchat:signal-decrypt-direct',
    (_event, profileId: string, senderId: string, ciphertext: string, ciphertextType: number) =>
      decryptDirectMessage(profileId, senderId, ciphertext, ciphertextType)
  );
  ipcMain.handle(
    'lemchat:signal-create-sender-key',
    (_event, profileId: string, distributionId: string) =>
      createSenderKeyDistribution(profileId, distributionId)
  );
  ipcMain.handle(
    'lemchat:signal-process-sender-key',
    (_event, profileId: string, senderId: string, distributionId: string, ciphertext: string) =>
      processSenderKeyDistribution(profileId, senderId, distributionId, ciphertext)
  );
  ipcMain.handle(
    'lemchat:signal-encrypt-group',
    (_event, profileId: string, distributionId: string, plaintext: string) =>
      encryptGroupMessage(profileId, distributionId, plaintext)
  );
  ipcMain.handle(
    'lemchat:signal-decrypt-group',
    (_event, profileId: string, senderId: string, distributionId: string, ciphertext: string) =>
      decryptGroupMessage(profileId, senderId, distributionId, ciphertext)
  );
  ipcMain.handle('lemchat:notify', (event, payload: NotificationPayload) => {
    if (!Notification.isSupported()) {
      return false;
    }

    const targetWin = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    const isFocused = targetWin?.isFocused() ?? false;
    const isMinimized = targetWin?.isMinimized() ?? false;
    const isVisible = targetWin?.isVisible() ?? false;

    if (!isFocused || isMinimized || !isVisible || payload.forceShow) {
      const notification = new Notification({
        title: payload.senderName,
        body: payload.body,
        icon: getAppIcon(),
        silent: currentStatus === 'busy',
      });

      notification.on('click', () => {
        focusWindow(targetWin);
        targetWin?.webContents.send(
          'lemchat:notification-clicked',
          payload.conversationId
        );
      });

      notification.show();
      return true;
    }

    return false;
  });

  ipcMain.on('lemchat:badge-count', (event, count: number) => {
    const safeCount = Math.max(0, Math.floor(count));
    if (process.platform === 'darwin' || process.platform === 'linux') {
      app.setBadgeCount(safeCount);
    }

    const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
    if (win && !win.isDestroyed()) {
      win.setTitle(safeCount > 0 ? `SkellyTalk (${safeCount})` : 'SkellyTalk');
      if (process.platform === 'win32') {
        if (safeCount > 0) {
          win.setOverlayIcon(
            createBadgeOverlayIcon(safeCount),
            `${safeCount} unread messages`
          );
        } else {
          win.setOverlayIcon(nativeImage.createEmpty(), '');
        }
      }
    }
  });

  ipcMain.on('lemchat:set-app-logo', (_event, id: string) => {
    if (id !== 'default' && !APP_LOGO_FILES[id]) return;
    if (id === appLogoChoice) return;
    appLogoChoice = id;
    try {
      fs.writeFileSync(appLogoPrefPath(), id, 'utf-8');
    } catch {
      /* ignore */
    }
    refreshPlatformIcons();
  });

  ipcMain.on('lemchat:user-status', (_event, status: UserPresence) => {
    currentStatus = status;
    rebuildTrayMenu();
  });

  ipcMain.on('lemchat:window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on('lemchat:window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('lemchat:window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (isApplyingUpdate) {
      win.show();
      win.focus();
      return;
    }
    if (!isQuitting && win === mainWindow) {
      win.hide();
    } else {
      win.close();
    }
  });

  ipcMain.handle('lemchat:window-is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  ipcMain.handle('lemchat:load-state', (_event, profileId: string) => {
    return loadPersistedState(profileId);
  });

  ipcMain.handle(
    'lemchat:save-state',
    (_event, profileId: string, state: unknown) => {
      return savePersistedState(profileId, state);
    }
  );

  ipcMain.handle('lemchat:screen-share-sources', async (event) => {
    if (!pendingShare || pendingShare.webContentsId !== event.sender.id) return [];
    return listShareSources();
  });

  ipcMain.on('lemchat:screen-share-pick', (event, choice: { id: string; audio: boolean } | null) => {
    if (!pendingShare || pendingShare.webContentsId !== event.sender.id) return;
    if (choice && (typeof choice.id !== 'string' || typeof choice.audio !== 'boolean')) return;
    pendingShare.resolve(choice);
  });

  ipcMain.handle('lemchat:clear-state', (_event, profileId: string) => {
    return clearPersistedState(profileId);
  });

  ipcMain.handle(
    'lemchat:save-attachment',
    async (event, filename: string, dataUrl: string) => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
      const result = await dialog.showSaveDialog(win!, {
        defaultPath: filename,
      });
      if (result.canceled || !result.filePath) return false;

      const base64Match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (base64Match) {
        const buf = Buffer.from(base64Match[1], 'base64');
        fs.writeFileSync(result.filePath, buf);
        return true;
      }
      fs.writeFileSync(result.filePath, dataUrl, 'utf-8');
      return true;
    }
  );

  ipcMain.handle('lemchat:open-peer-window', () => {
    peerWindowCounter += 1;
    createWindow(`peer-${peerWindowCounter}`);
  });

  ipcMain.handle('lemchat:get-app-version', () => app.getVersion());

  ipcMain.handle('lemchat:check-updates', async () => {
    startupUpdateCheckPending = false;
    startupUpdateDownloadPending = false;
    if (!app.isPackaged) {
      broadcastUpdateStatus({
        status: 'not-available',
        message: 'Auto-update checks run in packaged SkellyTalk builds.',
      });
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      broadcastUpdateStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Update check failed',
      });
    }
  });

  ipcMain.on('lemchat:install-update', () => {
    beginUpdateInstallation();
  });

  ipcMain.on('lemchat:download-update', () => {
    if (isApplyingUpdate) return;
    startupUpdateCheckPending = false;
    startupUpdateDownloadPending = false;
    void autoUpdater.downloadUpdate().catch((err) => {
      broadcastUpdateStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'Update download failed',
      });
    });
  });

  ipcMain.handle('lemchat:get-update-status', () => latestUpdateStatus);
}

function broadcastUpdateStatus(payload: UpdateStatusPayload) {
  const updateInProgress =
    latestUpdateStatus.status === 'available' ||
    latestUpdateStatus.status === 'downloading' ||
    latestUpdateStatus.status === 'downloaded';

  let effectivePayload = payload;
  if (
    updateInProgress &&
    (payload.status === 'checking' || payload.status === 'not-available')
  ) {
    latestUpdateStatus = {
      ...latestUpdateStatus,
      message: payload.message,
    };
    effectivePayload = latestUpdateStatus;
  } else {
    latestUpdateStatus = payload;
  }

  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('lemchat:update-status', effectivePayload);
    }
  }
}

function beginUpdateInstallation(version?: string) {
  if (isApplyingUpdate) return;
  isApplyingUpdate = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
  broadcastUpdateStatus({ status: 'installing', version });

  setTimeout(() => {
    isQuitting = true;
    autoUpdater.quitAndInstall(true, true);
  }, 1800);
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({ status: 'available', version: info.version });
    if (startupUpdateCheckPending) {
      startupUpdateCheckPending = false;
      startupUpdateDownloadPending = true;
      void autoUpdater.downloadUpdate().catch(() => {});
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    startupUpdateCheckPending = false;
    startupUpdateDownloadPending = false;
    broadcastUpdateStatus({ status: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcastUpdateStatus({
      status: 'downloading',
      progress: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastUpdateStatus({ status: 'downloaded', version: info.version });
    if (startupUpdateDownloadPending) {
      startupUpdateDownloadPending = false;
      setTimeout(() => beginUpdateInstallation(info.version), 2400);
    }
  });

  autoUpdater.on('error', (err) => {
    const raw = err?.message ?? 'Auto-update error';
    const friendly = raw.includes('404')
      ? 'Update feed returned 404 — ensure the GitHub repo is Public and has a published release.'
      : raw.split('\n')[0].slice(0, 140);
    broadcastUpdateStatus({
      status: 'error',
      message: friendly,
    });
  });

  if (app.isPackaged) {
    void autoUpdater.checkForUpdates().catch(() => {});

    setInterval(() => {
      if (!isApplyingUpdate) {
        void autoUpdater.checkForUpdates().catch(() => {});
      }
    }, 30 * 60 * 1000);
  }
}

if (gotSingleInstanceLock) {
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');

  app.on('second-instance', () => {
    const target =
      mainWindow && !mainWindow.isDestroyed()
        ? mainWindow
        : Array.from(allWindows).find((w) => !w.isDestroyed()) ?? null;
    if (target) {
      focusWindow(target);
    } else if (app.isReady()) {
      createWindow('default');
    }
  });

  app.whenReady().then(async () => {
    loadAppLogoChoice();
    syncPinnedTaskbarIcon(getAppIcon());
    nativeTheme.on('updated', refreshPlatformIcons);
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(getAppIcon());
    }
    // Windows load in the persistent partition, so the handlers must be
    // installed there (defaultSession handlers never applied to them).
    const appSessions = [
      session.fromPartition('persist:skellytalk'),
      session.defaultSession,
    ];
    const allowedPermissions = new Set([
      'media',
      'mediaKeySystem',
      'notifications',
      'display-capture',
      'clipboard-sanitized-write',
    ]);
    const isTrustedOrigin = (url: string) => {
      try {
        const u = new URL(url);
        if (u.protocol === 'file:') return true;
        if (isDev && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
        return false;
      } catch {
        return false;
      }
    };

    for (const ses of appSessions) {
      ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
        const origin = details?.requestingUrl || webContents.getURL();
        callback(allowedPermissions.has(permission) && isTrustedOrigin(origin));
      });
      ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
        const origin = requestingOrigin || webContents?.getURL() || '';
        return allowedPermissions.has(permission) && isTrustedOrigin(origin);
      });

      ses.setDisplayMediaRequestHandler(async (request, callback) => {
        try {
          if (!isTrustedOrigin(request.securityOrigin)) {
            callback({});
            return;
          }
          const parent = BrowserWindow.getFocusedWindow() ?? mainWindow;
          if (!parent || parent.isDestroyed()) {
            callback({});
            return;
          }
          const choice = await requestShareChoice(parent);
          if (!choice) {
            callback({});
            return;
          }
          const sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 0, height: 0 },
          });
          const picked = sources.find((src) => src.id === choice.id);
          if (!picked) {
            callback({});
            return;
          }
          callback({
            video: picked,
            ...(choice.audio && process.platform === 'win32' ? { audio: 'loopback' as const } : {}),
          });
        } catch {
          callback({});
        }
      });
    }

    registerIpcHandlers();
    setupAutoUpdater();
    createTray();
    createWindow('default');

    app.on('activate', () => {
      if (allWindows.size === 0) {
        createWindow('default');
      } else {
        focusWindow(mainWindow);
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
