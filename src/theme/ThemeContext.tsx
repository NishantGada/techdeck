import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type Theme, type ThemePreference } from './theme';
import { useSettings } from '../state/SettingsContext';

const ThemeContext = createContext<Theme>(themes.light);

export function resolveTheme(preference: ThemePreference, system: 'light' | 'dark' | null): Theme {
  if (preference === 'system') return themes[system ?? 'light'];
  return themes[preference];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { settings } = useSettings();
  const normalized = system === 'dark' ? 'dark' : system === 'light' ? 'light' : null;
  const theme = useMemo(
    () => resolveTheme(settings.themePreference, normalized),
    [settings.themePreference, normalized]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
