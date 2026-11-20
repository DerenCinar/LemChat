import { useSyncExternalStore } from 'react';
import classicLogo from '../assets/skellytalk-logo.png';
import gradientLogo from '../assets/logo-gradient.png';
import redLogo from '../assets/logo-red.png';
import tealLogo from '../assets/logo-teal.png';

export type AppLogoId = 'default' | 'gradient' | 'red' | 'teal';

export const APP_LOGOS: { id: AppLogoId; label: string; description: string; src: string; file?: string }[] = [
  { id: 'default', label: 'Classic', description: 'Adapts to light / dark system theme', src: classicLogo },
  { id: 'gradient', label: 'Skull Bubbles', description: 'Gradient chat bubbles with skull', src: gradientLogo, file: 'assets/logo-gradient.png' },
  { id: 'red', label: 'Stamp · Light', description: 'Light version of the original stamp', src: redLogo, file: 'assets/logo-red.png' },
  { id: 'teal', label: 'Stamp · Dark', description: 'The original stamp logo', src: tealLogo, file: 'assets/logo-teal.png' },
];

let current: AppLogoId | null = null;
const listeners = new Set<() => void>();

const STORAGE_KEY = 'skellytalk-app-logo';

export const getSavedAppLogo = (): AppLogoId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (APP_LOGOS.some((l) => l.id === v)) return v as AppLogoId;
  } catch {
    /* ignore */
  }
  return 'default';
};

const setFavicons = (id: AppLogoId) => {
  document.querySelectorAll('link[data-app-logo]').forEach((el) => el.remove());
  document.querySelectorAll('link[rel="icon"]:not([data-app-logo])').forEach((el) => {
    (el as HTMLLinkElement).disabled = id !== 'default';
  });
  if (id === 'default') return;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = `${import.meta.env.BASE_URL}${APP_LOGOS.find((l) => l.id === id)!.file}`;
  link.setAttribute('data-app-logo', id);
  document.head.appendChild(link);
};

export const applyAppLogo = (id: AppLogoId, persist = true) => {
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }
  current = id;
  listeners.forEach((l) => l());
  setFavicons(id);
  window.lemchat?.setAppLogo?.(id);
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => (current ??= getSavedAppLogo());

export const useAppLogoId = (): AppLogoId => useSyncExternalStore(subscribe, getSnapshot);

/** URL of the logo shown inside the app (title bar, sign-in screen). */
export const useAppLogoSrc = (): string => {
  const id = useAppLogoId();
  return APP_LOGOS.find((l) => l.id === id)!.src;
};
