// src/hooks/usePersistentScheme.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { Scheme } from '../theme';
import { getLoggingService } from '../services/loggingService';

const STORAGE_KEY = 'theme.scheme';

/**
 * Um hook customizado que gerencia o esquema de cores (light/dark) da aplicação.
 * - Persiste a escolha do usuário no AsyncStorage.
 * - Ouve as mudanças de tema do sistema operacional.
 * - Permite reverter para o tema do sistema.
 */
export function usePersistentScheme() {
  const systemScheme: Scheme = Appearance.getColorScheme() ?? 'light';
  const [scheme, setScheme] = useState<Scheme>(systemScheme);
  const [userPreference, setUserPreference] = useState<Scheme | null>(null);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedScheme = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedScheme === 'light' || savedScheme === 'dark') {
          setUserPreference(savedScheme);
          setScheme(savedScheme);
        } else {
          setUserPreference(null);
          setScheme(systemScheme);
        }
      } catch (error) {
        getLoggingService().warn('Failed to load theme from storage', 'usePersistentScheme', error);
        setScheme(systemScheme);
      }
    };
    loadPreference();
  }, [systemScheme]);

  useEffect(() => {
    if (userPreference === null) {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setScheme(colorScheme ?? 'light');
      });
      return () => subscription.remove();
    }
    return undefined;
  }, [userPreference]);

  const handleSetScheme = useCallback(
    async (newScheme: Scheme | 'system') => {
      if (newScheme === 'system') {
        setUserPreference(null);
        setScheme(systemScheme);
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          getLoggingService().warn(
            'Failed to remove theme from storage',
            'usePersistentScheme',
            error
          );
        }
      } else {
        setUserPreference(newScheme);
        setScheme(newScheme);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, newScheme);
        } catch (error) {
          getLoggingService().warn('Failed to save theme to storage', 'usePersistentScheme', error);
        }
      }
    },
    [systemScheme]
  );

  // CORREÇÃO: Renomeado de toggleScheme para toggleTheme
  const toggleTheme = useCallback(() => {
    handleSetScheme(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, handleSetScheme]);

  return {
    scheme,
    setScheme: handleSetScheme,
    toggleTheme, // CORREÇÃO: Exportando o nome correto
    isSystemTheme: userPreference === null,
  };
}
