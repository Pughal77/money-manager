import { getThemeMode, setThemeMode, type ThemeMode } from '@mm/core';
import { useVault } from '../data/VaultContext';

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
  income: string;
  expense: string;
  transfer: string;
  warning: string;
  calendarSelectedBg: string;
  calendarOutBg: string;
  link: string;
}

export const darkColors: ThemePalette = {
  bg: '#141414',
  surface: '#212121',
  surfaceElevated: '#2C2C2E',
  border: '#2E2E2E',
  borderSubtle: '#3A3A3C',
  text: '#F5F5F5',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  primary: '#F3A833',
  primaryDark: '#D98E1E',
  income: '#2ECC71',
  expense: '#E05A5A',
  transfer: '#A78BFA',
  warning: '#FBBF24',
  calendarSelectedBg: '#4A3B22',
  calendarOutBg: '#191919',
  link: '#3B82F6',
};

export const lightColors: ThemePalette = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  border: '#E5E7EB',
  borderSubtle: '#D1D5DB',
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  primary: '#F3A833',
  primaryDark: '#D98E1E',
  income: '#16A34A',
  expense: '#DC2626',
  transfer: '#7C3AED',
  warning: '#D97706',
  calendarSelectedBg: '#FEF3C7',
  calendarOutBg: '#F9FAFB',
  link: '#2563EB',
};

// Default static palette for backward compatibility
export const colors: ThemePalette = darkColors;

export function useTheme() {
  const { store } = useVault();
  const mode: ThemeMode = getThemeMode(store);
  const palette = mode === 'light' ? lightColors : darkColors;

  return {
    mode,
    isDark: mode === 'dark',
    colors: palette,
    setMode: (next: ThemeMode) => setThemeMode(store, next),
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
