import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

type ToastType = 'success' | 'error' | 'info';
type ToastMsg = { id: number; type: ToastType; title?: string; message: string; duration?: number };

type Ctx = {
  show: (t: Omit<ToastMsg, 'id'>) => void;
};

const ToastCtx = createContext<Ctx | null>(null);
let _id = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, spacing, radius, elevation, z } = useTheme();
  const [queue, setQueue] = useState<ToastMsg[]>([]);
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const msg = { ...t, id: _id++, duration: t.duration ?? 2500 };
    setQueue((q) => [...q, msg]);

    Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
          setQueue((q) => q.slice(1));
        });
      }, msg.duration);
    });
  }, [anim]);

  const value = useMemo<Ctx>(() => ({ show }), [show]);

  const tint = (type: ToastType) =>
    type === 'success' ? colors.success : type === 'error' ? colors.danger : colors.accent;

  const top = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const op = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {queue.length > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            { transform: [{ translateY: top }], opacity: op, zIndex: z.toast },
          ]}
        >
          {queue.map((t) => (
            <View
              key={t.id}
              style={[
                styles.toast,
                elevation.e2,
                { borderLeftColor: tint(t.type), backgroundColor: colors.surface, borderLeftWidth: 4, borderRadius: radius.lg },
              ]}
            >
              {t.title ? <Text style={{ fontWeight: '800', color: tint(t.type) }}>{t.title}</Text> : null}
              <Text style={{ color: colors.text, fontWeight: '600', marginTop: t.title ? 4 : 0 }}>{t.message}</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16, right: 16, bottom: 24,
    gap: 10,
  },
  toast: {
    padding: 14,
  },
});
