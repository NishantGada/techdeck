import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AudienceMode } from '../content/types';
import type { ThemePreference } from '../theme/theme';
import { defaultSettings, loadSettings, saveSettings, type StoredSettings } from './storage';

interface SettingsValue {
  settings: StoredSettings;
  /** False until AsyncStorage has been read, so the UI never flashes the default theme. */
  ready: boolean;
  setAudienceMode: (mode: AudienceMode) => void;
  setThemePreference: (preference: ThemePreference) => void;
}

const SettingsContext = createContext<SettingsValue>({
  settings: defaultSettings,
  ready: false,
  setAudienceMode: () => {},
  setThemePreference: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoredSettings>(defaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<StoredSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      ready,
      setAudienceMode: (audienceMode) => update({ audienceMode }),
      setThemePreference: (themePreference) => update({ themePreference }),
    }),
    [settings, ready, update]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
