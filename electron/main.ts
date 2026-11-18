import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  ipcMain,
  Menu,
  Notification,
  session,
  Tray,
  nativeImage,
  nativeTheme,
  type NativeImage,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { createBadgeOverlayIcon, createLemChatIcon } from './icon';
import { getLocalLanIPs, startRelayServer, stopRelayServer } from './server';
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
let peerWindowCounter = 1;
let serverStatus = { hosting: false, port: 4120 };

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.skellytalk.app');
}
app.setName('SkellyTalk');

function getAppIcon(): NativeImage {
  // Use the higher-contrast logo for the current system theme.
  const filename = nativeTheme.shouldUseDarkColors
    ? 'skellytalk-light-mode.png'
    : 'skellytalk-dark-mode.png';
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

function refreshPlatformIcons() {
  const icon = getAppIcon();
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

function createWindow(profileId = 'default'): BrowserWindow {
  const appIcon = getAppIcon();

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    transparent: true,
    frame: false,
    hasShadow: true,
    icon: appIcon,
    backgroundColor: '#00000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      additionalArguments: [`--lemchat-profile=${profileId}`],
    },
  };

  if (process.platform === 'darwin') {
    windowOptions.vibrancy = 'under-window';
    windowOptions.visualEffectState = 'active';
  } else if (process.platform === 'win32') {
    windowOptions.backgroundMaterial = 'acrylic';
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

  ipcMain.handle('lemchat:clear-state', (_event, profileId: string) => {
    return clearPersistedState(profileId);
  });

  ipcMain.handle('lemchat:server-info', () => {
    return {
      ...serverStatus,
      lanIps: getLocalLanIPs(),
    };
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

  ipcMain.handle('lemchat:check-updates', async () => {
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
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  });
}

function broadcastUpdateStatus(payload: UpdateStatusPayload) {
  for (const win of allWindows) {
    if (!win.isDestroyed()) {
      win.webContents.send('lemchat:update-status', payload);
    }
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcastUpdateStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastUpdateStatus({ status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
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
    void autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
}

app.whenReady().then(async () => {
  nativeTheme.on('updated', refreshPlatformIcons);
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(getAppIcon());
  }
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'notifications', 'display-capture'];
      callback(allowed.includes(permission));
    }
  );

  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
        });
        if (sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({});
        }
      } catch {
        callback({});
      }
    }
  );

  serverStatus = await startRelayServer(4120);
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
  stopRelayServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
