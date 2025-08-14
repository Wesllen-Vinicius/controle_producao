// state/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Easing, Platform } from 'react-native';
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

type Elevation = { e0: any; e1: any; e2: any; e3: any; e4: any; };

type Opacity = { disabled: number; pressed: number; backdrop: number; outline: number; };

type ZIndex = { base: number; dropdown: number; sheet: number; toast: number; modal: number; overlay: number; };

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
  setScheme: (s: Scheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  // respeita preferências do usuário; se não houver, segue o sistema
  const system: Scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const [scheme, setSchemeState] = useState<Scheme>(system);
  const [userPref, setUserPref] = useState<null | Scheme>(null);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setSchemeState(saved);
        setUserPref(saved);
      } else {
        setSchemeState(system);
        setUserPref(null);
      }
    })();

    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (userPref === null) {
        setSchemeState(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    setUserPref(s);
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {});
  };

  const toggleTheme = () => setScheme(scheme === 'dark' ? 'light' : 'dark');

  const colors = useMemo(() => makeColors(scheme), [scheme]);
  const typography = useMemo(() => makeTypography(colors), [colors]);

  /* motion (Material-like) */
  const motion: Motion = useMemo(
    () => ({
      duration: { micro: 90, small: 140, medium: 220, large: 320 },
      easing: {
        standard: Easing.bezier(0.2, 0, 0, 1),
        decel:    Easing.bezier(0, 0, 0, 1),
        accel:    Easing.bezier(0.3, 0, 1, 1),
      },
      pressScale: 0.98,
    }),
    []
  );

  /* sombras elegantes (iOS) + elevation (Android) — calibradas para o light novo */
  const elevation: Elevation = useMemo(() => {
    const iosBase = scheme === 'dark' ? 0.22 : 0.16; // levemente mais forte no dark
    return {
      e0: { shadowColor: colors.shadow ?? '#000', shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
      e1: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS === 'ios' ? iosBase * 0.45 : 0, shadowRadius: 3,  shadowOffset:{width:0,height:1}, elevation: 1 },
      e2: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS === 'ios' ? iosBase * 0.60 : 0, shadowRadius: 6,  shadowOffset:{width:0,height:3}, elevation: 2 },
      e3: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS === 'ios' ? iosBase * 0.75 : 0, shadowRadius: 10, shadowOffset:{width:0,height:6}, elevation: 3 },
      e4: { shadowColor: colors.shadow ?? '#000', shadowOpacity: Platform.OS === 'ios' ? iosBase * 0.90 : 0, shadowRadius: 16, shadowOffset:{width:0,height:10}, elevation: 4 },
    };
  }, [colors.shadow, scheme]);

  const opacity: Opacity = useMemo(
    () => ({
      disabled: 0.38,
      pressed:  scheme === 'dark' ? 0.16 : 0.10,
      backdrop: scheme === 'dark' ? 0.50 : 0.40,
      outline:  scheme === 'dark' ? 0.20 : 0.12,
    }),
    [scheme]
  );

  const z: ZIndex = useMemo(
    () => ({ base: 0, dropdown: 10, sheet: 20, toast: 30, modal: 40, overlay: 50 }),
    []
  );

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

export type { ThemeSpacing, ThemeRadius, Scheme, ThemeColors } from '../theme';
