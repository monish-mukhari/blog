import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme';
const THEME_EVENT = 'inkwell-theme-change';

export const getThemePreference = (): ThemePreference => {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
};

export const applyTheme = (preference: ThemePreference) => {
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = preference === 'dark' || (preference === 'system' && systemIsDark);

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

export const setThemePreference = (preference: ThemePreference) => {
  localStorage.setItem(THEME_KEY, preference);
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent<ThemePreference>(THEME_EVENT, { detail: preference }));
};

export const initializeTheme = () => applyTheme(getThemePreference());

export const useTheme = () => {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getThemePreference() === 'system') applyTheme('system');
    };
    const handleThemeChange = (event: Event) => {
      setPreference((event as CustomEvent<ThemePreference>).detail);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        const next = getThemePreference();
        setPreference(next);
        applyTheme(next);
      }
    };

    media.addEventListener('change', handleSystemChange);
    window.addEventListener(THEME_EVENT, handleThemeChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      media.removeEventListener('change', handleSystemChange);
      window.removeEventListener(THEME_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { preference, setPreference: setThemePreference };
};
