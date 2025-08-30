import React, { useEffect, useMemo } from 'react';
import { DeviceEventEmitter, BackHandler, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHaptics } from '../../hooks/useHaptics';

interface Shortcut {
  keys: string[];
  action: () => void;
  description: string;
  enabled?: boolean;
}

interface GlobalShortcutsProps {
  shortcuts?: Shortcut[];
  children: React.ReactNode;
}

export default function GlobalShortcuts({ shortcuts = [], children }: GlobalShortcutsProps) {
  const navigation = useNavigation();
  const { tap: selectionHaptic } = useHaptics();

  // Memoize default shortcuts to prevent re-creation on every render
  const defaultShortcuts: Shortcut[] = useMemo(
    () => [
      {
        keys: ['cmd+k', 'ctrl+k'],
        action: () => {
          selectionHaptic();
          // Open global search (would need to implement)
          // TODO: Implement global search functionality
        },
        description: 'Abrir busca global',
      },
      {
        keys: ['cmd+n', 'ctrl+n'],
        action: () => {
          selectionHaptic();
          // Navigate to new production/transaction based on current screen
          const state = navigation.getState();
          const currentRoute = state?.routes?.[state.index];

          if (currentRoute?.name === 'Produção') {
            // Open production form
            DeviceEventEmitter.emit('openProductionForm');
          } else if (currentRoute?.name === 'Estoque') {
            // Open inventory form
            DeviceEventEmitter.emit('openInventoryForm');
          }
        },
        description: 'Nova entrada',
      },
      {
        keys: ['cmd+r', 'ctrl+r', 'f5'],
        action: () => {
          selectionHaptic();
          // Refresh current screen
          DeviceEventEmitter.emit('refreshCurrentScreen');
        },
        description: 'Atualizar',
      },
    ],
    [selectionHaptic, navigation]
  );

  const allShortcuts = useMemo(
    () => [...defaultShortcuts, ...shortcuts],
    [defaultShortcuts, shortcuts]
  );

  useEffect(() => {
    // Handle hardware back button on Android
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Custom back button logic could go here
        return false; // Let default behavior handle it
      });

      return () => backHandler.remove();
    }

    return () => {};
  }, []);

  useEffect(() => {
    // For web platform, we could add keyboard listeners
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        const pressedKeys = [];

        if (event.ctrlKey) pressedKeys.push('ctrl');
        if (event.metaKey) pressedKeys.push('cmd');
        if (event.shiftKey) pressedKeys.push('shift');
        if (event.altKey) pressedKeys.push('alt');

        pressedKeys.push(event.key.toLowerCase());

        const keyCombo = pressedKeys.join('+');

        const matchingShortcut = allShortcuts.find(
          shortcut => shortcut.keys.includes(keyCombo) && shortcut.enabled !== false
        );

        if (matchingShortcut) {
          event.preventDefault();
          matchingShortcut.action();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {};
  }, [allShortcuts]);

  return <>{children}</>;
}
