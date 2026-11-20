import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface AndroidUpdaterProgressEvent {
  progress: number;
  bytesDownloaded?: number;
  totalBytes?: number;
}

export interface AndroidUpdaterPlugin {
  downloadAndInstall(options: { url: string; version?: string }): Promise<{
    downloaded?: boolean;
    installLaunched?: boolean;
    needsPermission?: boolean;
  }>;
  installDownloadedApk(): Promise<{
    installLaunched?: boolean;
    needsPermission?: boolean;
  }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (data: AndroidUpdaterProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

interface GitHubReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

interface GitHubReleaseResponse {
  tag_name?: string;
  html_url?: string;
  assets?: GitHubReleaseAsset[];
}

export interface GitHubReleaseCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  apkDownloadUrl?: string;
}

const GITHUB_LATEST_RELEASE_API =
  'https://api.github.com/repos/DerenCinar/LemChat/releases/latest';
const GITHUB_RELEASES_FALLBACK_URL =
  'https://github.com/DerenCinar/LemChat/releases/latest';

export const AndroidUpdater = registerPlugin<AndroidUpdaterPlugin>('AndroidUpdater');

export const isAndroidNative = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const hasNativeAndroidUpdater = (): boolean =>
  isAndroidNative() && Capacitor.isPluginAvailable('AndroidUpdater');

const normalizeVersionParts = (version: string): number[] =>
  version
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => {
      const parsed = Number.parseInt(part, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });

export const compareSemver = (a: string, b: string): number => {
  const partsA = normalizeVersionParts(a);
  const partsB = normalizeVersionParts(b);
  const maxLen = Math.max(partsA.length, partsB.length, 3);
  for (let i = 0; i < maxLen; i += 1) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
};

export const checkGitHubLatestRelease = async (
  currentVersion: string
): Promise<GitHubReleaseCheckResult> => {
  const response = await fetch(GITHUB_LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Release check failed (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as GitHubReleaseResponse;
  const rawTag = data.tag_name?.trim() || currentVersion;
  const latestVersion = rawTag.replace(/^v/i, '');
  const releaseUrl = data.html_url || GITHUB_RELEASES_FALLBACK_URL;

  const apkAsset = data.assets?.find(
    (asset) =>
      typeof asset.name === 'string' &&
      asset.name.toLowerCase().endsWith('.apk') &&
      typeof asset.browser_download_url === 'string' &&
      asset.browser_download_url.startsWith('https://')
  );

  return {
    currentVersion: currentVersion.replace(/^v/i, ''),
    latestVersion,
    updateAvailable: compareSemver(latestVersion, currentVersion) > 0,
    releaseUrl,
    apkDownloadUrl: apkAsset?.browser_download_url,
  };
};

export const downloadAndInstallAndroidApk = async (
  url: string,
  version: string | undefined,
  onProgress: (progress: number) => void
): Promise<{
  downloaded?: boolean;
  installLaunched?: boolean;
  needsPermission?: boolean;
}> => {
  if (!hasNativeAndroidUpdater()) {
    throw new Error('Native Android updater plugin is not available.');
  }

  let listener: PluginListenerHandle | undefined;
  try {
    listener = await AndroidUpdater.addListener('downloadProgress', (event) => {
      if (typeof event?.progress === 'number') {
        onProgress(Math.max(0, Math.min(100, Math.round(event.progress))));
      }
    });

    return await AndroidUpdater.downloadAndInstall({ url, version });
  } finally {
    await listener?.remove().catch(() => undefined);
  }
};

export const installDownloadedAndroidApk = async (): Promise<{
  installLaunched?: boolean;
  needsPermission?: boolean;
}> => {
  if (!hasNativeAndroidUpdater()) {
    throw new Error('Native Android updater plugin is not available.');
  }
  return AndroidUpdater.installDownloadedApk();
};
