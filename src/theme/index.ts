// theme/index.ts
import { StyleSheet, TextStyle } from 'react-native';

/* Utils */
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
function hexToRgb(h: string) {
  const s = h.replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const i = parseInt(v, 16);
  return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
}
export function alpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a)})`;
}

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

  // extras que vários componentes já usam
  lineStrong?: string;
  primaryOn?: string;
  successOn?: string;
  dangerOn?: string;
  ripple?: string;
};

/* Spacing & Radius (tokens) */
export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 26,
  xxl: 34,
};
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
};
export type ThemeSpacing = typeof spacing;
export type ThemeRadius  = typeof radius;

/* Paleta */
export function makeColors(mode: Scheme): ThemeColors {
  // Marca: laranja mais equilibrado (não satura no light e “salta” no dark)
  const brand = '#FF6A3D';      // primário
  const brandDimLight = 'rgba(255,106,61,0.10)';
  const brandDimDark  = 'rgba(255,106,61,0.18)';

  if (mode === 'light') {
    // Light com base fria (slate/blue-gray) para não “amarelar”, alto contraste e linhas suaves
    return {
      background: '#F7F9FC',  // page bg (quase branco com toque frio)
      surface:    '#FFFFFF',  // cards/inputs
      surfaceAlt: '#F1F4F9',  // chips/barras/tonal
      line:       '#E6ECF3',  // hairline
      lineStrong: '#D7E0EA',  // divisores visíveis

      text:  '#0F172A',       // slate-900
      muted: '#667085',       // slate-500/600

      primary:    brand,
      primaryDim: brandDimLight,
      accent:     '#FF8657',  // hover/realce
      danger:     '#E03131',
      success:    '#16A34A',
      shadow:     '#000000',

      primaryOn:  '#FFFFFF',
      successOn:  '#FFFFFF',
      dangerOn:   '#FFFFFF',
      ripple:     'rgba(15,23,42,0.06)', // toque sutil no light
    };
  }

  // Dark já estava bom – apenas coerência com a base fria
  return {
    background: '#0D121A',
    surface:    '#101822',
    surfaceAlt: '#131E2A',
    line:       '#1E2A37',
    lineStrong: '#2A3947',

    text:  '#E7EEF6',
    muted: '#99A6B4',

    primary:    brand,
    primaryDim: brandDimDark,
    accent:     '#FF8657',
    danger:     '#FF4D4F',
    success:    '#22C55E',
    shadow:     '#000000',

    primaryOn:  '#0D121A',
    successOn:  '#0D121A',
    dangerOn:   '#0D121A',
    ripple:     'rgba(231,238,246,0.12)', // toque no dark
  };
}

/* Tipografia com legibilidade melhor (linhas e letter-spacing sutis) */
const fw = (w: TextStyle['fontWeight']) => w;
export function makeTypography(colors: ThemeColors) {
  return {
    h1: {
      fontSize: 23, lineHeight: 30, letterSpacing: 0.2,
      fontWeight: fw('800'), color: colors.text,
    } as TextStyle,
    h2: {
      fontSize: 19, lineHeight: 26, letterSpacing: 0.2,
      fontWeight: fw('800'), color: colors.text,
    } as TextStyle,
    body: {
      fontSize: 16, lineHeight: 22, letterSpacing: 0.15,
      fontWeight: fw('400'), color: colors.text,
    } as TextStyle,
    label: {
      fontSize: 12, lineHeight: 16, letterSpacing: 0.3,
      fontWeight: fw('700'), color: colors.muted,
    } as TextStyle,
  };
}

/* Larguras de borda opcionais */
export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  sm: 1,
  md: 2,
};
