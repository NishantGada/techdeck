export type ThemeName = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeColors {
  background: string;
  text: string;
  /** Labels, ordinals, tooltips — present but quiet. */
  textMuted: string;
  /** Senior-note and quiz-option fill. No borders, no shadows anywhere. */
  surface: string;
  /** The senior-note left rule. */
  rule: string;
  progressTrack: string;
  progressFill: string;
  success: string;
  successSurface: string;
  error: string;
  errorSurface: string;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
}

const light: ThemeColors = {
  background: '#FFFFFF',
  text: '#111113',
  textMuted: '#6E6E76',
  surface: '#F4F4F5',
  rule: '#D4D4D8',
  progressTrack: '#E8E8EA',
  progressFill: '#111113',
  success: '#1B6E3C',
  successSurface: '#E7F2EB',
  error: '#A32020',
  errorSurface: '#F8E9E9',
};

const dark: ThemeColors = {
  background: '#0B0B0D',
  text: '#F2F2F3',
  textMuted: '#9A9AA2',
  surface: '#18181B',
  rule: '#3A3A40',
  progressTrack: '#26262A',
  progressFill: '#F2F2F3',
  success: '#5FB37F',
  successSurface: '#152219',
  error: '#E28080',
  errorSurface: '#2A1717',
};

export const themes: Record<ThemeName, Theme> = {
  light: { name: 'light', colors: light },
  dark: { name: 'dark', colors: dark },
};

/** One typeface throughout; hierarchy comes from size and weight only. */
export const typography = {
  label: { size: 12, weight: '600' as const, letterSpacing: 1.1 },
  title: { size: 27, weight: '700' as const, lineHeight: 33 },
  bodyMax: 18,
  bodyMin: 14,
  bodyLineHeightRatio: 1.55,
  seniorNote: { size: 14.5, lineHeight: 21 },
  pill: { size: 11, weight: '600' as const, letterSpacing: 0.6 },
  option: { size: 16, lineHeight: 22 },
};

export const space = {
  screenX: 24,
  screenY: 20,
  gap: 14,
};
