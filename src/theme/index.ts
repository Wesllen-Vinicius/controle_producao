// theme/index.ts
import { StyleSheet, TextStyle } from "react-native";

/* Utils (sem alterações) */
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
function hexToRgb(h: string) {
  const s = h.replace("#", "");
  const v =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const i = parseInt(v, 16);
  return { r: (i >> 16) & 255, g: (i >> 8) & 255, b: i & 255 };
}
export function alpha(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a)})`;
}

/* Tipos */
export type Scheme = "dark" | "light";

// --- MELHORIA: Adicionadas novas propriedades de cor para maior flexibilidade ---
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
  warning: string; // Cor para alertas e vendas
  shadow?: string;

  // Cores de texto sobre fundos coloridos
  primaryOn: string;
  successOn?: string;
  dangerOn?: string;

  // Cores de fundo "tonais" para cards e itens ativos
  primaryBackground: string;
  successBackground: string;
  dangerBackground: string;
  warningBackground: string;
  accentBackground: string;

  // Cores para estados desabilitados
  disabled: string;
  disabledOn: string;

  ripple?: string;
};

/* Spacing & Radius (sem alterações) */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  "2xl": 64,
  "3xl": 80,
};
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  full: 999,
};
export type ThemeSpacing = typeof spacing;
export type ThemeRadius = typeof radius;

/* Paleta */
export function makeColors(mode: Scheme): ThemeColors {
  const brand = "#FF6A3D"; // primário

  if (mode === "light") {
    return {
      background: "#F7F9FC",
      surface: "#FFFFFF",
      surfaceAlt: "#F1F4F9",
      line: "#E6ECF3",

      text: "#0F172A",
      muted: "#667085",

      primary: brand,
      primaryDim: alpha(brand, 0.1),
      accent: "#FF8657",
      danger: "#E03131",
      success: "#16A34A",
      // --- NOVAS CORES ADICIONADAS (Light) ---
      warning: "#F59E0B", // Amarelo/Laranja para alertas

      primaryOn: "#FFFFFF",
      successOn: "#FFFFFF",
      dangerOn: "#FFFFFF",

      primaryBackground: alpha(brand, 0.1),
      successBackground: "#F0FDF4", // Verde bem claro
      dangerBackground: "#FEF2F2", // Vermelho bem claro
      warningBackground: "#FFFBEB", // Amarelo bem claro
      accentBackground: alpha("#FF8657", 0.1),

      disabled: "#E6ECF3", // Mesma cor de 'line' ou 'surfaceAlt'
      disabledOn: "#99A6B4", // Cor de texto com baixo contraste

      shadow: "#000000",
      ripple: "rgba(15,23,42,0.06)",
    };
  }

  // Dark
  return {
    background: "#0D121A",
    surface: "#101822",
    surfaceAlt: "#131E2A",
    line: "#1E2A37",

    text: "#E7EEF6",
    muted: "#99A6B4",

    primary: brand,
    primaryDim: alpha(brand, 0.18),
    accent: "#FF8657",
    danger: "#FF4D4F",
    success: "#22C55E",
    // --- NOVAS CORES ADICIONADAS (Dark) ---
    warning: "#FBBF24", // Amarelo/Laranja mais brilhante para o escuro

    primaryOn: "#FFFFFF", // Texto branco para melhor contraste no escuro
    successOn: "#FFFFFF",
    dangerOn: "#FFFFFF",

    // Usando a função `alpha` para criar fundos consistentes
    primaryBackground: alpha(brand, 0.15),
    successBackground: alpha("#22C55E", 0.15),
    dangerBackground: alpha("#FF4D4F", 0.15),
    warningBackground: alpha("#FBBF24", 0.15),
    accentBackground: alpha("#FF8657", 0.15),

    disabled: "rgba(255, 255, 255, 0.12)",
    disabledOn: "rgba(255, 255, 255, 0.38)",

    shadow: "#000000",
    ripple: "rgba(231,238,246,0.12)",
  };
}

/* Tipografia (com pequena simplificação) */
export function makeTypography(colors: ThemeColors) {
  return {
    h1: {
      fontSize: 23,
      lineHeight: 30,
      letterSpacing: 0.2,
      fontWeight: "800",
      color: colors.text,
    } as TextStyle,
    h2: {
      fontSize: 19,
      lineHeight: 26,
      letterSpacing: 0.2,
      fontWeight: "800",
      color: colors.text,
    } as TextStyle,
    body: {
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: 0.15,
      fontWeight: "400",
      color: colors.text,
    } as TextStyle,
    label: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: colors.muted,
    } as TextStyle,
  };
}

/* Larguras de borda (sem alterações) */
export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  sm: 1,
  md: 2,
};
