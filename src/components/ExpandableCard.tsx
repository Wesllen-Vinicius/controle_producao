// components/ExpandableCard.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import Card from './ui/Card';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  defaultOpen?: boolean;
  variant?: 'filled' | 'tonal' | 'outlined' | 'plain';
  elevationLevel?: 0 | 1 | 2 | 3 | 4;
};

export default function ExpandableCard({
  title,
  subtitle,
  children,
  style,
  defaultOpen,
  variant = 'filled',
  elevationLevel = 1,
}: Props) {
  const startOpen = !!defaultOpen;
  const [open, setOpen] = useState(startOpen);
  const [measuredH, setMeasuredH] = useState(0);

  const { colors, spacing, typography } = useTheme();
  const h = useHaptics();

  const progress = useRef(new Animated.Value(startOpen ? 1 : 0)).current;
  const rot = useRef(new Animated.Value(startOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rot, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [open, progress, rot]);

  useEffect(() => {
    if (measuredH > 0 && open) progress.setValue(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredH]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, measuredH] });
  const opacity = progress;

  const onToggle = () => {
    h.light();
    setOpen((v) => !v);
  };

  const onContentLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== measuredH) setMeasuredH(h);
  };

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
        contentWrap: { overflow: 'hidden' },
        contentInner: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
        chevronWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
      }),
    [colors.muted, spacing, typography.h2]
  );

  return (
    <Card padding="none" variant={variant} elevationLevel={elevationLevel} style={style}>
      <Pressable
        onPress={onToggle}
        android_ripple={Platform.OS === 'android' ? { color: '#ffffff22' } : undefined}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.header}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <Animated.View style={[styles.chevronWrap, { transform: [{ rotate }] }]}>
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
        </Animated.View>
      </Pressable>

      <Animated.View
        style={[styles.contentWrap, { height, opacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <View onLayout={onContentLayout} style={styles.contentInner}>
          {children}
        </View>
      </Animated.View>
    </Card>
  );
}
