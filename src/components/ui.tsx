import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { colors } from '../theme';

const elev = Platform.select({
  ios:   { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 2 },
  default: {},
});

/** CARD */
export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) =>
  <View style={[styles.card, elev, style]}>{children}</View>;

export const Input = React.forwardRef<TextInput, React.ComponentProps<typeof TextInput>>((props, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor={colors.muted}
    {...props}
    style={[styles.input, props.style]}
  />
));
Input.displayName = 'Input';

export const Button: React.FC<{ title: string; onPress?: () => void; small?: boolean }> = ({ title, onPress, small }) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        onPress={onPress}
        style={[styles.btn, small && styles.btnSmall]}
        android_ripple={{ color: '#ffffff22' }}
      >
        <Text style={styles.btnTxt}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
};

export const Chip: React.FC<{ label: string; active?: boolean; onPress?: () => void }> = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[styles.chip, active && styles.chipA]}>
    <Text style={[styles.chipTxt, active && styles.chipTxtA]}>{label}</Text>
  </Pressable>
);

export const KPI: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiLabel}>{label}</Text>
    <Text style={styles.kpiValue}>{value}</Text>
  </View>
);

export const Skeleton: React.FC<{ height?: number; radius?: number; width?: number | `${number}%` | 'auto'; style?: StyleProp<ViewStyle>; }>
= ({ height = 16, radius = 12, width = '100%' as `${number}%`, style }) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 650, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.surfaceAlt, opacity: anim }, style]} />;
};

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
    <Text style={{ color: colors.muted, fontWeight: '800' }}>{title}</Text>
    {subtitle ? <Text style={{ color: colors.muted, marginTop: 6 }}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 14, borderColor: colors.line, borderWidth: 1, padding: 12 },
  input:{ backgroundColor: colors.surfaceAlt, color: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 48, borderColor: colors.line, borderWidth: 1 },
  btn:  { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSmall:{ paddingVertical: 10, borderRadius: 10 },
  btnTxt:{ color: '#fff', fontWeight: '800' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surfaceAlt, borderRadius: 18, borderColor: colors.line, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipA: { backgroundColor: colors.primary, borderColor: 'transparent' },
  chipTxt: { color: '#CFD6DC', fontWeight: '700' },
  chipTxtA:{ color: '#fff' },
  kpi: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.line, marginRight: 8 },
  kpiLabel: { color: '#9AAABD', fontSize: 12, fontWeight: '600' },
  kpiValue: { color: '#fff', fontWeight: '800' },
});
