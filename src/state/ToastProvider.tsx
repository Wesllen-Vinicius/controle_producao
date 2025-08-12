import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Toast = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // ms
};

type ToastCtx = {
  showToast: (t: Omit<Toast, 'id'>) => void;
};

const Ctx = createContext<ToastCtx>({ showToast: () => {} });

export const useToast = () => useContext(Ctx);

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [current, setCurrent] = useState<Toast | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setCurrent(null);
    });
  }, [anim]);

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    if (timer.current) clearTimeout(timer.current);
    const toast: Toast = { id: String(Date.now()), duration: 2800, type: 'info', ...t };
    setCurrent(toast);
    Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    timer.current = setTimeout(() => hide(), toast.duration);
  }, [anim, hide]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const bg = current?.type === 'success' ? colors.success : current?.type === 'error' ? colors.error : colors.surface;

  return (
    <Ctx.Provider value={value}>
      {children}
      {current ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
          ]}
        >
          <View style={[styles.toast, { backgroundColor: bg, borderColor: colors.line }]}>
            <Text style={styles.txt}>{current.message}</Text>
            {current.actionLabel ? (
              <Pressable onPress={() => { hide(); current.onAction?.(); }} style={styles.action}>
                <Text style={styles.actionTxt}>{current.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  toast: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  txt: { color: '#fff', flex: 1, fontWeight: '700' },
  action: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#ffffff26' },
  actionTxt: { color: '#fff', fontWeight: '800' },
});
