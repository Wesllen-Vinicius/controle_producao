// hooks/useHaptics.ts
import { useCallback, useMemo, useRef } from 'react';
import * as Haptics from 'expo-haptics';

type Impact = Haptics.ImpactFeedbackStyle;

export type HapticsAPI = {
  tap: () => void;
  success: () => void;
  warning: () => void;
  error: () => void;
  light: () => void;
  medium: () => void;
  heavy: () => void;
  rigid: () => void;
  soft: () => void;
  custom: (style: Impact) => void;
};

/**
 * Hook de haptics com:
 * - throttle (default 120ms) para evitar spam
 * - try/catch para não quebrar em devices sem suporte
 */
export function useHaptics(enabled = true, throttleMs = 120): HapticsAPI {
  const lastAtRef = useRef(0);

  const run = useCallback(
    async (fn: () => Promise<void> | void) => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastAtRef.current < throttleMs) return; // throttle
      lastAtRef.current = now;
      try {
        await fn();
      } catch {
        // silencioso: em web/simulador alguns estilos podem falhar
      }
    },
    [enabled, throttleMs]
  );

  return useMemo(
    () => ({
      tap: () => run(() => Haptics.selectionAsync()),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

      light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
      rigid: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
      soft: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),

      custom: (style: Impact) => run(() => Haptics.impactAsync(style)),
    }),
    [run]
  );
}

export default useHaptics;
