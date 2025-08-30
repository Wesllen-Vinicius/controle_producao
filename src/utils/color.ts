// src/theme/index.ts
import { StyleSheet, TextStyle } from 'react-native';

/* Tipos */
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
  shadow?: string;

  lineStrong?: string;
  primaryOn?: string;
  successOn?: string;
  dangerOn?: string;
  ripple?: string;
};

/* Enhanced Spacing & Radius System */
export const spacing = {
  xxs: 2, // Micro spacing
  xs: 4, // Extra small
  sm: 8, // Small
  md: 12, // Medium (base)
  lg: 16, // Large
  xl: 24, // Extra large
  xxl: 32, // Extra extra large
  xxxl: 48, // Massive
};

export const radius = {
  xs: 4, // Extra small radius
  sm: 8, // Small radius
  md: 12, // Medium radius (base)
  lg: 16, // Large radius
  xl: 20, // Extra large radius
  full: 999, // Fully rounded
};
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;

/* Enhanced Color Palette */
export function makeColors(mode: Scheme): ThemeColors {
  const brand = '#FF6A3D';
  const brandDimLight = 'rgba(255,106,61,0.10)';
  const brandDimDark = 'rgba(255,106,61,0.18)';

  if (mode === 'light') {
    return {
      // Surfaces & Backgrounds
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceAlt: '#F1F5F9',
      line: '#E2E8F0',
      lineStrong: '#CBD5E1',

      // Text & Content
      text: '#0F172A',
      muted: '#64748B',

      // Brand Colors
      primary: brand,
      primaryDim: brandDimLight,
      accent: '#3B82F6', // Blue accent for variety

      // Semantic Colors
      danger: '#DC2626',
      success: '#059669',

      // System
      shadow: 'rgba(15,23,42,0.12)',
      primaryOn: '#FFFFFF',
      successOn: '#FFFFFF',
      dangerOn: '#FFFFFF',
      ripple: 'rgba(15,23,42,0.06)',
    };
  }

  return {
    // Dark Mode Surfaces & Backgrounds
    background: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#334155',
    line: '#475569',
    lineStrong: '#64748B',

    // Dark Mode Text & Content
    text: '#F1F5F9',
    muted: '#94A3B8',

    // Dark Mode Brand Colors
    primary: brand,
    primaryDim: brandDimDark,
    accent: '#60A5FA', // Lighter blue for dark mode

    // Dark Mode Semantic Colors
    danger: '#F87171',
    success: '#34D399',

    // Dark Mode System
    shadow: 'rgba(0,0,0,0.25)',
    primaryOn: '#0F172A',
    successOn: '#0F172A',
    dangerOn: '#0F172A',
    ripple: 'rgba(241,245,249,0.08)',
  };
}

/* Enhanced Typography System */
const fw = (w: TextStyle['fontWeight']) => w;
export function makeTypography(colors: ThemeColors) {
  return {
    // Display Typography
    display: {
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: -0.8,
      fontWeight: fw('900'),
      color: colors.text,
    } as TextStyle,

    // Heading Typography
    h1: {
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.4,
      fontWeight: fw('800'),
      color: colors.text,
    } as TextStyle,
    h2: {
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
      fontWeight: fw('700'),
      color: colors.text,
    } as TextStyle,
    h3: {
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: 0,
      fontWeight: fw('600'),
      color: colors.text,
    } as TextStyle,

    // Body Typography
    body: {
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.1,
      fontWeight: fw('400'),
      color: colors.text,
    } as TextStyle,
    bodyMedium: {
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.1,
      fontWeight: fw('500'),
      color: colors.text,
    } as TextStyle,
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontWeight: fw('400'),
      color: colors.text,
    } as TextStyle,

    // Utility Typography
    caption: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      fontWeight: fw('500'),
      color: colors.muted,
    } as TextStyle,
    label: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      fontWeight: fw('700'),
      color: colors.muted,
    } as TextStyle,
    button: {
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.25,
      fontWeight: fw('600'),
      color: colors.text,
    } as TextStyle,

    // Numeric & Data Typography
    numeric: {
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.2,
      fontWeight: fw('700'),
      color: colors.text,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    } as TextStyle,
    numericLarge: {
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.6,
      fontWeight: fw('900'),
      color: colors.text,
      fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
    } as TextStyle,
  };
}

/* Enhanced Border & Visual System */
export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
};

/* Elevation System */
export const elevation = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  xxl: 20,
};

/* Animation Durations */
export const duration = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 500,
};

/* Common Shadow Styles */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export type ThemeElevation = typeof elevation;
export type ThemeDuration = typeof duration;
export type ThemeShadows = typeof shadows;
