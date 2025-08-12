import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeColors, makeTypography, radius, spacing, Scheme, ThemeColors } from '../theme';

type ThemeCtx = {
  scheme: Scheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: ReturnType<typeof makeTypography>;
  toggleTheme: () => void;
  setScheme: (s: Scheme) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [scheme, setSchemeState] = useState<Scheme>('dark');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('theme.scheme');
      if (saved === 'light' || saved === 'dark') setSchemeState(saved);
    })();
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem('theme.scheme', s).catch(() => {});
  };
  const toggleTheme = () => setScheme(scheme === 'dark' ? 'light' : 'dark');

  const colors = useMemo(() => makeColors(scheme), [scheme]);
  const typography = useMemo(() => makeTypography(colors), [colors]);

  const value: ThemeCtx = { scheme, colors, spacing, radius, typography, toggleTheme, setScheme };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
