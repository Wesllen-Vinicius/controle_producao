// src/components/ui/BottomSheet.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../state/ThemeProvider';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Altura máxima do sheet; default 80% da tela. */
  maxHeightPct?: number; // 0..1
  /** Se true, permite fechar tocando no backdrop. Default: true */
  dismissOnBackdrop?: boolean;
};

const BottomSheet: React.FC<Props> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxHeightPct = 0.8,
  dismissOnBackdrop = true,
}) => {
  const { colors, spacing, radius, elevation, z, opacity, typography } = useTheme();

  // controladores
  const [visible, setVisible] = useState(open);
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current; // 0 fechado, 1 aberto
  const [contentH, setContentH] = useState(400); // fallback

  // Quando "open" muda: anima e mantém o Modal visível até o fade-out terminar
  useEffect(() => {
    if (open) setVisible(true);
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true, // usamos sempre native driver aqui
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, opacity.backdrop],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [contentH + 24, 0],
  });

  const onLayoutContent = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - contentH) > 2) setContentH(h);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: { flex: 1, zIndex: z.modal },
        fill: { flex: 1 },
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.shadow ?? '#000' },
        sheetWrap: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          maxHeight: `${Math.round(maxHeightPct * 100)}%`,
          ...elevation.e3,
        },
        header: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
        },
        headerTexts: { flex: 1 },
        title: { ...typography.h2 },
        subtitle: { color: colors.muted, marginTop: 4, fontWeight: '600' as const },
        closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
        body: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.sm },
        handle: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 4,
          backgroundColor: colors.line,
          marginBottom: spacing.sm,
        },
      }),
    [colors, elevation, maxHeightPct, radius.lg, spacing, typography.h2, colors.muted, colors.line, colors.shadow, z.modal]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />

        {/* Sheet */}
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <SafeAreaView edges={['bottom']}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <View style={styles.headerTexts}>
                  {!!title && <Animated.Text style={styles.title}>{title}</Animated.Text>}
                  {!!subtitle && <Animated.Text style={styles.subtitle}>{subtitle}</Animated.Text>}
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.body} onLayout={onLayoutContent}>
                {children}
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BottomSheet;
