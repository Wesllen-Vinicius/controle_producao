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

  // altura medida do conteúdo
  const [measuredH, setMeasuredH] = useState(0);

  const { colors, spacing, typography } = useTheme();
  const h = useHaptics();

  // 0 (fechado) .. 1 (aberto)
  const progress = useRef(new Animated.Value(startOpen ? 1 : 0)).current;
  const rot = useRef(new Animated.Value(startOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rot, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [open, progress, rot]);

  // âncoras para animação
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, measuredH] });
  const opacity = progress;

  const onToggle = () => {
    h.light();
    setOpen((v) => !v);
  };

  // mede o conteúdo REAL em um espelho invisível
  const onMeasureLayout = (e: LayoutChangeEvent) => {
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
        // espelho invisível para medir conteúdo
        measurer: { position: 'absolute', opacity: 0, pointerEvents: 'none', left: 0, right: 0 },
      }),
    [colors.muted, spacing, typography.h2]
  );

  // quando ainda não temos measuredH:
  // - mostramos o "measurer" sempre
  // - ao abrir antes da medida, mostramos o conteúdo sem animar
  const visibleContainerStyle =
    measuredH > 0
      ? { height }
      : open
      ? {} // abre sem animar até ter a medida
      : { height: 0 };

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

      {/* Measurer invisível (sempre renderiza) */}
      <View style={styles.measurer} onLayout={onMeasureLayout}>
        <View style={styles.contentInner}>{children}</View>
      </View>

      {/* Contêiner animado/visível */}
      <Animated.View
        style={[styles.contentWrap, visibleContainerStyle, measuredH > 0 && { opacity }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <View style={styles.contentInner}>{children}</View>
      </Animated.View>
    </Card>
  );
}
