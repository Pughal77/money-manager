import {
  getThemeMode,
  setThemeMode,
  getThemeAccent,
  setThemeAccent,
  type ThemeMode,
  type ThemeAccent,
} from '@mm/core';
import { useVault } from '../data/VaultContext';

export type { ThemeMode, ThemeAccent };

export interface ThemePalette {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  income: string;
  expense: string;
  transfer: string;
  warning: string;
  calendarSelectedBg: string;
  calendarOutBg: string;
  link: string;
}

export interface ThemeAccentConfig {
  id: ThemeAccent;
  name: string;
  subtitle: string;
  swatch: string;
}

export const THEME_ACCENTS: ThemeAccentConfig[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    subtitle: 'Sovereign Mint',
    swatch: '#10B981',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    subtitle: 'Fintech Sapphire',
    swatch: '#3B82F6',
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    subtitle: 'Royal Violet',
    swatch: '#8B5CF6',
  },
  {
    id: 'slate',
    name: 'Nordic Slate',
    subtitle: 'Minimalist Monochrome',
    swatch: '#94A3B8',
  },
];

const DARK_BASE = {
  bg: '#141414',
  surface: '#212121',
  surfaceElevated: '#2C2C2E',
  border: '#2E2E2E',
  borderSubtle: '#3A3A3C',
  text: '#F5F5F5',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  income: '#2ECC71',
  expense: '#E05A5A',
  transfer: '#A78BFA',
  warning: '#FBBF24',
  calendarOutBg: '#191919',
};

const LIGHT_BASE = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  border: '#E5E7EB',
  borderSubtle: '#D1D5DB',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  income: '#16A34A',
  expense: '#DC2626',
  transfer: '#7C3AED',
  warning: '#D97706',
  calendarOutBg: '#F9FAFB',
};

export const DARK_THEMES: Record<ThemeAccent, ThemePalette> = {
  emerald: {
    ...DARK_BASE,
    primary: '#10B981',
    primaryDark: '#059669',
    primaryText: '#FFFFFF',
    calendarSelectedBg: '#064E3B',
    link: '#34D399',
  },
  cobalt: {
    ...DARK_BASE,
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryText: '#FFFFFF',
    calendarSelectedBg: '#1E3A8A',
    link: '#60A5FA',
  },
  amethyst: {
    ...DARK_BASE,
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryText: '#FFFFFF',
    transfer: '#C084FC',
    calendarSelectedBg: '#4C1D95',
    link: '#A78BFA',
  },
  slate: {
    bg: '#121417',
    surface: '#1E2228',
    surfaceElevated: '#2A303A',
    border: '#2D3542',
    borderSubtle: '#3B4454',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    primary: '#94A3B8',
    primaryDark: '#64748B',
    primaryText: '#0F172A',
    income: '#2ECC71',
    expense: '#E05A5A',
    transfer: '#A78BFA',
    warning: '#FBBF24',
    calendarSelectedBg: '#334155',
    calendarOutBg: '#171B21',
    link: '#94A3B8',
  },
};

export const LIGHT_THEMES: Record<ThemeAccent, ThemePalette> = {
  emerald: {
    ...LIGHT_BASE,
    primary: '#059669',
    primaryDark: '#047857',
    primaryText: '#FFFFFF',
    calendarSelectedBg: '#D1FAE5',
    link: '#059669',
  },
  cobalt: {
    ...LIGHT_BASE,
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    primaryText: '#FFFFFF',
    calendarSelectedBg: '#DBEAFE',
    link: '#2563EB',
  },
  amethyst: {
    ...LIGHT_BASE,
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryText: '#FFFFFF',
    transfer: '#9333EA',
    calendarSelectedBg: '#EDE9FE',
    link: '#7C3AED',
  },
  slate: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    borderSubtle: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    primary: '#334155',
    primaryDark: '#1E293B',
    primaryText: '#FFFFFF',
    income: '#16A34A',
    expense: '#DC2626',
    transfer: '#7C3AED',
    warning: '#D97706',
    calendarSelectedBg: '#E2E8F0',
    calendarOutBg: '#F1F5F9',
    link: '#334155',
  },
};

export function getPalette(mode: ThemeMode, accent: ThemeAccent): ThemePalette {
  const table = mode === 'light' ? LIGHT_THEMES : DARK_THEMES;
  return table[accent] ?? table.emerald;
}

// Backward compatibility static references
export const darkColors: ThemePalette = DARK_THEMES.emerald;
export const lightColors: ThemePalette = LIGHT_THEMES.emerald;
export const colors: ThemePalette = darkColors;

export function useTheme() {
  const { store } = useVault();
  const mode: ThemeMode = getThemeMode(store);
  const accent: ThemeAccent = getThemeAccent(store);
  const palette = getPalette(mode, accent);

  return {
    mode,
    accent,
    isDark: mode === 'dark',
    colors: palette,
    setMode: (next: ThemeMode) => setThemeMode(store, next),
    setAccent: (next: ThemeAccent) => setThemeAccent(store, next),
    toggleTheme: () => setThemeMode(store, mode === 'dark' ? 'light' : 'dark'),
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  pill: 999,
};
