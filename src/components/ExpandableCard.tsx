import React, { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { Card } from './ui';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  defaultOpen?: boolean;
};

export default function ExpandableCard({ title, subtitle, children, style, defaultOpen }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { colors, spacing, typography } = useTheme();
  const h = useHaptics();

  // Chevron animation
  const rot = useRef(new Animated.Value(open ? 1 : 0)).current;
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  function toggle() {
    h.light();
    setOpen(v => {
      const next = !v;
      Animated.timing(rot, { toValue: next ? 1 : 0, duration: 180, useNativeDriver: true }).start();
      return next;
    });
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        title: { ...(typography.h2 as any), fontSize: 16 },
        subtitle: { color: colors.muted, marginTop: 2, fontSize: 12, fontWeight: '600' as const },
        content: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
        chevronWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
      }),
    [colors.muted, spacing, typography.h2]
  );

  return (
    <Card style={[{ padding: 0 }, style]}>
      <Pressable
        onPress={toggle}
        style={styles.header}
        android_ripple={Platform.OS === 'android' ? { color: '#ffffff22' } : undefined}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Animated.View style={[styles.chevronWrap, { transform: [{ rotate }] }]}>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
        </Animated.View>
      </Pressable>

      {open && <View style={styles.content}>{children}</View>}
    </Card>
  );
}
