export type AppLogoId = 'default' | 'gradient' | 'red' | 'teal';

export const APP_LOGOS: { id: AppLogoId; label: string; description: string; preview: string }[] = [
  { id: 'default', label: 'Classic', description: 'Adapts to light / dark system theme', preview: 'assets/skellytalk-dark-mode.png' },
  { id: 'gradient', label: 'Skull Bubbles', description: 'Gradient chat bubbles with skull', preview: 'assets/logo-gradient.png' },
  { id: 'red', label: 'Stamp · Light', description: 'Light speckled badge, red bubbles', preview: 'assets/logo-red.png' },
  { id: 'teal', label: 'Stamp · Dark', description: 'Dark speckled badge, teal bubbles', preview: 'assets/logo-teal.png' },
];

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
  link.href = `${import.meta.env.BASE_URL}${APP_LOGOS.find((l) => l.id === id)!.preview}`;
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
  setFavicons(id);
  window.lemchat?.setAppLogo?.(id);
};
