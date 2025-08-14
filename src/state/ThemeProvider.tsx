import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  makeColors,
  makeTypography,
  radius,
  spacing,
  Scheme,
  ThemeColors,
  ThemeSpacing,
  ThemeRadius,
} from '../theme';

const STORAGE_KEY = 'theme.scheme';

type Motion = {
  duration: { micro: number; small: number; medium: number; large: number };
  easing: { standard: (t: number) => number; decel: (t: number) => number; accel: (t: number) => number };
  pressScale: number;
};

type Elevation = {
  e0: any;
  e1: any;
  e2: any;
  e3: any;
  e4: any;
};

type Opacity = {
  disabled: number;
  pressed: number;
  backdrop: number;
  outline: number;
};

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
  spacing: ThemeSpacing; // ⬅️ agora sabe que tem xs..xxl
  radius: ThemeRadius;   // ⬅️ idem
  typography: ReturnType<typeof makeTypography>;
  motion: Motion;
  elevation: Elevation;
  opacity: Opacity;
  z: ZIndex;
  toggleTheme: () => void;
  setScheme: (s: Scheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // Usa o tema do sistema como default; respeita preferência salva
  const system: Scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const [scheme, setSchemeState] = useState<Scheme>(system);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') setSchemeState(saved);
    })();
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  };

  const toggleTheme = () => setScheme(scheme === 'dark' ? 'light' : 'dark');

  const colors = useMemo(() => makeColors(scheme), [scheme]);
  const typography = useMemo(() => makeTypography(colors), [colors]);

  // ===== Design tokens extras =====
  const motion: Motion = useMemo(
    () => ({
      duration: { micro: 90, small: 140, medium: 220, large: 320 },
      easing: {
        standard: (t: number) => t,
        decel: (t: number) => t,
        accel: (t: number) => t,
      },
      pressScale: 0.98,
    }),
    []
  );

  const elevation: Elevation = useMemo(
    () => ({
      e0: { shadowColor: colors.shadow ?? '#000', shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
      e1: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS==='ios'?0.06:0, shadowRadius: 4,  elevation: 1 },
      e2: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS==='ios'?0.08:0, shadowRadius: 8,  elevation: 2 },
      e3: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS==='ios'?0.10:0, shadowRadius: 12, elevation: 3 },
      e4: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS==='ios'?0.12:0, shadowRadius: 16, elevation: 4 },
    }),
    [colors.shadow]
  );

  const opacity: Opacity = useMemo(
    () => ({
      disabled: 0.38,
      pressed: 0.12,
      backdrop: 0.4,
      outline: scheme === 'dark' ? 0.18 : 0.10,
    }),
    [scheme]
  );

  const z: ZIndex = useMemo(
    () => ({
      base: 0,
      dropdown: 10,
      sheet: 20,
      toast: 30,
      modal: 40,
      overlay: 50,
    }),
    []
  );
  // =================================

  const value: ThemeCtx = {
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
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

// (opcional) Re-export de tipos úteis pra evitar imports longos em outros arquivos
export type { ThemeSpacing, ThemeRadius, Scheme, ThemeColors } from '../theme';
