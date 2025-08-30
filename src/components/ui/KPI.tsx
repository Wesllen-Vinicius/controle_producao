import React, { ReactNode, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

type Status = 'default' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  /** Valor principal. Aceita string/number; pode formatar via `format`. */
  value: string | number | null | undefined;
  /** Formata o valor exibido. */
  format?: (v: Props['value']) => string;
  /** Texto pequeno abaixo (ex.: "Meta 120kg"). */
  hint?: string;

  /** Mostra barra de progresso (0..1). */
  progress?: number;
  /** Variação (ex.: +12, -3). Exibe setas ↑/↓ e cor conforme sinal. */
  delta?: number;
  /** Ícone opcional à esquerda do título. */
  icon?: ReactNode;

  /** Estado visual. */
  status?: Status;
  /** Modo compacto (menor padding/tamanho). */
  compact?: boolean;
  /** Alinhamento do conteúdo. */
  align?: 'left' | 'center' | 'right';

  /** Interação opcional. */
  onPress?: () => void;
  disabled?: boolean;

  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  testID?: string;
};

export default function KPI({
  label,
  value,
  format,
  hint,
  progress,
  delta,
  icon,
  status = 'default',
  compact,
  align = 'left',
  onPress,
  disabled,
  style,
  loading,
  testID,
}: Props) {
  const { colors, spacing, radius, elevation, opacity } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const tone = useMemo(() => {
    const map = {
      default: colors.primary,
      success: colors.success,
      warning: '#E6A700', // amarelo consistente
      danger: colors.danger,
    } as const;
    return map[status];
  }, [status, colors]);

  const dims = useMemo(
    () => ({
      pad: compact ? spacing.sm : spacing.md,
      valueSize: compact ? 18 : 22,
      labelSize: compact ? 11 : 12,
      hintSize: compact ? 11 : 12,
      gap: compact ? spacing.xs : spacing.sm,
      barH: compact ? 4 : 6,
      iconW: compact ? 18 : 22,
    }),
    [compact, spacing]
  );

  const formatted = useMemo(() => {
    if (format) return format(value);
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      // exibe números com até 2 casas se tiver decimal
      const hasDecimal = Math.abs(value % 1) > 0;
      return hasDecimal ? value.toFixed(2) : String(value);
    }
    return String(value);
  }, [value, format]);

  const deltaInfo = useMemo(() => {
    if (delta === undefined || delta === null) return null;
    if (delta > 0) return { text: `↑ ${delta}`, color: colors.success };
    if (delta < 0) return { text: `↓ ${Math.abs(delta)}`, color: colors.danger };
    return { text: '—', color: colors.muted };
  }, [delta, colors]);

  const alignStyle =
    align === 'center'
      ? { alignItems: 'center' as const }
      : align === 'right'
        ? { alignItems: 'flex-end' as const }
        : { alignItems: 'flex-start' as const };

  const pressedIn = () => {
    Animated.timing(scale, {
      toValue: onPress ? 0.99 : 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };
  const pressedOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  };

  const Body = (
    <Animated.View
      style={[
        styles.container,
        elevation.e1,
        {
          padding: dims.pad,
          borderRadius: radius.lg,
          transform: [{ scale }],
          opacity: disabled ? opacity.disabled : 1,
        },
        style,
      ]}
    >
      <View style={[styles.header, { marginBottom: dims.gap }]}>
        {icon ? (
          <View style={{ width: dims.iconW, alignItems: 'center', marginRight: 6 }}>{icon}</View>
        ) : null}
        <Text
          style={{ fontSize: dims.labelSize, fontWeight: '700', color: colors.muted }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* Valor + Delta */}
      <View style={[styles.row, alignStyle, { gap: 8 }]}>
        <Text
          style={{ fontSize: dims.valueSize, fontWeight: '900', color: colors.text }}
          numberOfLines={1}
        >
          {loading ? '···' : formatted}
        </Text>
        {deltaInfo ? (
          <Text
            style={{ fontSize: 12, fontWeight: '800', color: deltaInfo.color }}
            numberOfLines={1}
          >
            {deltaInfo.text}
          </Text>
        ) : null}
      </View>

      {/* Progresso */}
      {typeof progress === 'number' ? (
        <View style={{ marginTop: dims.gap, alignSelf: 'stretch' }}>
          <View
            style={{
              height: dims.barH,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                backgroundColor: tone,
              }}
            />
          </View>
        </View>
      ) : null}

      {/* Hint */}
      {hint ? (
        <Text
          style={{
            marginTop: dims.gap,
            fontSize: dims.hintSize,
            fontWeight: '600',
            color: colors.muted,
          }}
          numberOfLines={2}
        >
          {hint}
        </Text>
      ) : null}
    </Animated.View>
  );

  if (!onPress) {
    return Body;
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={pressedIn}
      onPressOut={pressedOut}
      android_ripple={{ color: `${tone}14`, borderless: false }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [{ opacity: pressed ? 1 : 1 }]}
    >
      {Body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 120,
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
