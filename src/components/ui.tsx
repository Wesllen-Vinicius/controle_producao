import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View, ViewStyle, StyleProp, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../state/ThemeProvider';

export const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const { colors, radius, spacing } = useTheme();
  return <View style={[{
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderColor: colors.line,
    borderWidth: 1,
    padding: spacing.md,
    ...(Platform.OS === 'android' ? { elevation: 2 } : { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } })
  }, style]}>{children}</View>;
};

export const Input = React.forwardRef<TextInput, React.ComponentProps<typeof TextInput>>((props, ref) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      selectionColor={colors.accent}
      {...props}
      style={[{ backgroundColor: colors.surfaceAlt, color: colors.text, borderRadius: radius.lg, paddingHorizontal: spacing.md, height: 52, borderColor: colors.line, borderWidth: 1 }, props.style]}
    />
  );
});
Input.displayName = 'Input';

export const Button: React.FC<{ title: string; onPress?: () => void; small?: boolean; loading?: boolean; disabled?: boolean; }>
= ({ title, onPress, small, loading, disabled }) => {
  const { colors, radius } = useTheme();
  const active = !loading && !disabled;
  return (
    <Pressable onPress={active ? onPress : undefined} style={[{ backgroundColor: colors.primary, paddingVertical: small ? 10 : 14, borderRadius: small ? radius.md : radius.lg, alignItems: 'center' }, !active && { opacity: 0.6 }]} android_ripple={{ color: colors.primaryDim }}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>{title}</Text>}
    </Pressable>
  );
};

export const Chip: React.FC<{ label: string; active?: boolean; onPress?: () => void }> = ({ label, active, onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: colors.surfaceAlt, borderRadius: 22, borderColor: colors.line, borderWidth: 1, marginRight: 8, marginBottom: 8 }, active && { backgroundColor: colors.primary, borderColor: 'transparent' }]}>
      <Text style={[{ color: '#CFD6DC', fontWeight: '700' }, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
};

export const KPI: React.FC<{ label: string; value: string | number }> = ({ label, value }) => {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={{ minWidth: 150, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ color: '#9AAABD', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{String(value)}</Text>
    </View>
  );
};

export const Skeleton: React.FC<{ height?: number; radius?: number; width?: number | `${number}%` | 'auto'; style?: StyleProp<ViewStyle> }>
= ({ height = 16, radius = 14, width = '100%' as `${number}%`, style }) => {
  const { colors } = useTheme();
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

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
      <Text style={{ color: colors.muted, fontWeight: '800' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.muted, marginTop: 6 }}>{subtitle}</Text>}
    </View>
  );
};
