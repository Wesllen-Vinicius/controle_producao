// state/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { Easing, Platform, ViewStyle } from 'react-native';
import { usePersistentScheme } from '../hooks/usePersistentScheme'; // Importando nosso novo hook
import {
  makeColors,
  makeTypography,
  radius,
  Scheme,
  spacing,
  ThemeColors,
  ThemeRadius,
  ThemeSpacing,
} from '../theme';

// --- Tipos (sem alterações, exceto a correção em `setScheme`) ---
type Motion = {
  duration: { micro: number; small: number; medium: number; large: number };
  easing: {
    standard: (t: number) => number;
    decel: (t: number) => number;
    accel: (t: number) => number;
  };
  pressScale: number;
};

type Elevation = { e0: ViewStyle; e1: ViewStyle; e2: ViewStyle; e3: ViewStyle; e4: ViewStyle };
type Opacity = { disabled: number; pressed: number; backdrop: number; outline: number };
type ZIndex = {
  base: number;
  dropdown: number;
  sheet: number;
  toast: number;
  modal: number;
  overlay: number;
};

type ThemeCtx = {
  scheme: Scheme;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  typography: ReturnType<typeof makeTypography>;
  motion: Motion;
  elevation: Elevation;
  opacity: Opacity;
  z: ZIndex;
  toggleTheme: () => void;
  // CORREÇÃO: O tipo agora reflete que `setScheme` pode receber 'system'.
  setScheme: (newScheme: Scheme | 'system') => void;
  isSystemTheme: boolean;
};

const Ctx = createContext<ThemeCtx | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // MELHORIA: Toda a lógica complexa agora está dentro do hook.
  const { scheme, setScheme, toggleTheme, isSystemTheme } = usePersistentScheme();

  // O ThemeProvider agora só se preocupa em CALCULAR os valores do tema.
  const colors = useMemo(() => makeColors(scheme), [scheme]);
  const typography = useMemo(() => makeTypography(colors), [colors]);

  const motion: Motion = useMemo(
    () => ({
      duration: { micro: 90, small: 140, medium: 220, large: 320 },
      easing: {
        standard: Easing.bezier(0.2, 0, 0, 1),
        decel: Easing.bezier(0, 0, 0, 1),
        accel: Easing.bezier(0.3, 0, 1, 1),
      },
      pressScale: 0.98,
    }),
    []
  );

  const elevation: Elevation = useMemo(() => {
    const shadowColor = colors.shadow ?? '#000';
    const opacity = scheme === 'dark' ? 0.3 : 0.15;
    const makeShadow = (height: number, radius: number, elevationLevel: number): ViewStyle => ({
      shadowColor,
      shadowOpacity: Platform.OS === 'ios' ? opacity * (1 + (elevationLevel - 2) * 0.2) : 0,
      shadowRadius: radius,
      shadowOffset: { width: 0, height },
      elevation: elevationLevel,
    });
    return {
      e0: { elevation: 0 },
      e1: makeShadow(1, 2, 1),
      e2: makeShadow(2, 4, 2),
      e3: makeShadow(4, 8, 4),
      e4: makeShadow(6, 12, 6),
    };
  }, [colors.shadow, scheme]);

  const opacity: Opacity = useMemo(
    () => ({
      disabled: 0.38,
      pressed: scheme === 'dark' ? 0.16 : 0.1,
      backdrop: scheme === 'dark' ? 0.5 : 0.4,
      outline: scheme === 'dark' ? 0.2 : 0.12,
    }),
    [scheme]
  );

  const z: ZIndex = useMemo(
    () => ({ base: 0, dropdown: 10, sheet: 20, toast: 30, modal: 40, overlay: 50 }),
    []
  );

  const value: ThemeCtx = useMemo(
    () => ({
      scheme,
      colors,
      spacing,
      radius,
      typography,
      motion,
      elevation,
      opacity,
      z,
      toggleTheme,
      setScheme,
      isSystemTheme,
    }),
    [
      scheme,
      colors,
      typography,
      motion,
      elevation,
      opacity,
      z,
      toggleTheme,
      setScheme,
      isSystemTheme,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export type { Scheme, ThemeColors, ThemeRadius, ThemeSpacing } from '../theme';
export type { ThemeCtx };
