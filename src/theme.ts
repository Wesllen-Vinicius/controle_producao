import { TextStyle } from 'react-native';

export type Scheme = 'dark' | 'light';
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  text: string;
  muted: string;
  primary: string;
  primaryDim: string;
  accent: string;
  danger: string;
  success: string;
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  xxl: 34,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
};

export function makeColors(mode: Scheme): ThemeColors {
  if (mode === 'light') {
    return {
      background: '#F6F8FB',
      surface:    '#FFFFFF',
      surfaceAlt: '#F0F4F8',
      line:       '#E2E8F0',
      text:       '#0B1220',
      muted:      '#64748B',
      primary:    '#EA6A44',
      primaryDim: '#EA6A4433',
      accent:     '#F47C57',
      danger:     '#DC2626',
      success:    '#16A34A',
    };
  }
  // dark
  return {
    background: '#0D1115',
    surface:    '#121821',
    surfaceAlt: '#151E27',
    line:       '#1F2A35',
    text:       '#E7EEF6',
    muted:      '#99A6B3',
    primary:    '#EA6A44',
    primaryDim: '#EA6A4433',
    accent:     '#F47C57',
    danger:     '#FF4D4F',
    success:    '#22C55E',
  };
}

const fw = (w: TextStyle['fontWeight']) => w;

export function makeTypography(colors: ThemeColors) {
  return {
    h1:   { fontSize: 22, fontWeight: fw('800'), color: colors.text } as TextStyle,
    h2:   { fontSize: 18, fontWeight: fw('800'), color: colors.text } as TextStyle,
    body: { fontSize: 16, fontWeight: fw('400'), color: colors.text } as TextStyle,
    label:{ fontSize: 12, fontWeight: fw('700'), color: colors.muted } as TextStyle,
  };
}
