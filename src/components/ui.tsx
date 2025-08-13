import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../state/ThemeProvider';

/* ----------------------------- Utilitários ----------------------------- */

function elevation(i: 0 | 1 | 2 | 3 | 4): ViewStyle {
  if (Platform.OS === 'android') return { elevation: i === 0 ? 0 : i * 2 } as ViewStyle;
  // iOS shadow
  const r = 8 + i * 2;
  const h = 4 + i * 2;
  const op = 0.08 + i * 0.04;
  return { shadowColor: '#000', shadowOpacity: op, shadowRadius: r, shadowOffset: { width: 0, height: h } };
}

const padMap = { none: 0, sm: 10, md: 14, lg: 18 } as const;

/* --------------------------------- Card -------------------------------- */

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof padMap;
  variant?: 'filled' | 'tonal' | 'outlined' | 'plain';
  elevationLevel?: 0 | 1 | 2 | 3 | 4;
};

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  variant = 'filled',
  elevationLevel = 0,
}) => {
  const { colors, radius } = useTheme();

  const bg =
    variant === 'filled' ? colors.surface :
    variant === 'tonal' ? colors.surfaceAlt :
    'transparent';
  const borderW = variant === 'outlined' ? 1 : 1;
  const borderC =
    variant === 'outlined' ? colors.line :
    variant === 'plain' ? 'transparent' :
    colors.line;

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderColor: borderC,
          borderWidth: borderW,
          padding: padMap[padding],
        },
        elevation(elevationLevel),
        style,
      ]}
    >
      {children}
    </View>
  );
};

/* --------------------------------- Input -------------------------------- */

type FancyInputProps = TextInputProps & {
  label?: string;
  rightIcon?: React.ReactNode;
  onPressRightIcon?: () => void;
};

export const Input = React.forwardRef<TextInput, FancyInputProps>(
  ({ style, label, rightIcon, onPressRightIcon, ...props }, ref) => {
    const { colors, radius, spacing, typography } = useTheme();

    return (
      <View>
        {label ? (
          <Text style={[typography.label, { marginBottom: 6, color: colors.muted }]}>{label}</Text>
        ) : null}

        <View
          style={{
            position: 'relative',
            justifyContent: 'center',
          }}
        >
          <TextInput
            ref={ref}
            placeholderTextColor={colors.muted}
            selectionColor={colors.accent}
            {...props}
            style={[
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderRadius: radius.lg,
                paddingHorizontal: spacing.md,
                height: 52,
                borderColor: colors.line,
                borderWidth: 1,
                paddingRight: rightIcon ? spacing.lg * 2 : spacing.md,
              },
              style as any,
            ]}
          />
          {rightIcon ? (
            <Pressable
              onPress={onPressRightIcon}
              style={{
                position: 'absolute',
                right: 10,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
              hitSlop={8}
            >
              {rightIcon}
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
);
Input.displayName = 'Input';

/* -------------------------------- Button -------------------------------- */

type ButtonVariant = 'primary' | 'tonal' | 'text';
type ButtonIntent = 'default' | 'danger' | 'success';

export const Button: React.FC<{
  title: string;
  onPress?: () => void;
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  variant?: ButtonVariant;
  intent?: ButtonIntent;
}> = ({
  title,
  onPress,
  small,
  loading,
  disabled,
  full,
  variant = 'primary',
  intent = 'default',
}) => {
  const { colors, radius } = useTheme();
  const active = !loading && !disabled;

  const intentBg =
    intent === 'danger' ? colors.danger :
    intent === 'success' ? colors.success :
    colors.primary;

  const bg =
    variant === 'primary' ? intentBg :
    variant === 'tonal' ? colors.primaryDim :
    'transparent';

  const textColor =
    variant === 'text' ? colors.accent :
    '#fff';

  const ripple = variant === 'text' ? '#00000022' : colors.primaryDim;

  return (
    <Pressable
      onPress={active ? onPress : undefined}
      style={[
        {
          backgroundColor: bg,
          paddingVertical: small ? 10 : 14,
          borderRadius: small ? radius.md : radius.lg,
          alignItems: 'center',
          alignSelf: full ? 'stretch' : 'auto',
        },
        !active && { opacity: 0.6 },
      ]}
      android_ripple={{ color: ripple }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontWeight: '800' }}>{title}</Text>
      )}
    </Pressable>
  );
};

/* --------------------------------- Chip --------------------------------- */

export const Chip: React.FC<{ label: string; active?: boolean; onPress?: () => void }> = ({
  label,
  active,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          paddingVertical: 8,
          paddingHorizontal: 14,
          backgroundColor: colors.surfaceAlt,
          borderRadius: 22,
          borderColor: colors.line,
          borderWidth: 1,
          marginRight: 8,
          marginBottom: 8,
        },
        active && { backgroundColor: colors.primary, borderColor: 'transparent' },
      ]}
    >
      <Text style={[{ color: '#CFD6DC', fontWeight: '700' }, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
};

/* ---------------------------------- KPI --------------------------------- */

type KPIStatus = 'default' | 'success' | 'warning' | 'danger';

export const KPI: React.FC<{
  label: string;
  value: string | number;
  status?: KPIStatus;
  hint?: string;
  progress?: number; // 0..1
  compact?: boolean;
}> = ({ label, value, status = 'default', hint, progress, compact }) => {
  const { colors, radius, spacing } = useTheme();

  const statusColor =
    status === 'success' ? colors.success :
    status === 'danger' ? colors.danger :
    status === 'warning' ? colors.accent :
    colors.text;

  const bar = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : undefined;

  return (
    <View
      style={{
        minWidth: compact ? 120 : 150,
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.md,
        padding: spacing.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.line,
      }}
    >
      <Text style={{ color: '#9AAABD', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: statusColor, fontWeight: '900', fontSize: compact ? 14 : 16 }}>
        {String(value)}
      </Text>
      {hint ? (
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{hint}</Text>
      ) : null}
      {bar !== undefined ? (
        <View style={{ height: 6, alignSelf: 'stretch', backgroundColor: colors.line, borderRadius: 6, marginTop: 6 }}>
          <View style={{ height: 6, width: `${Math.round(bar * 100)}%`, backgroundColor: statusColor, borderRadius: 6 }} />
        </View>
      ) : null}
    </View>
  );
};

/* ------------------------------- Skeleton ------------------------------- */

// Tipagem correta para width em Animated.View
type RNWidth = number | `${number}%` | 'auto';

export const Skeleton: React.FC<{
  height?: number;
  radius?: number;
  width?: RNWidth;
  style?: StyleProp<ViewStyle>;
}> = ({ height = 16, radius = 14, width = '100%' as RNWidth, style }) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // Ajuda o TS a entender o width corretamente
  const baseStyle: ViewStyle & { width: RNWidth } = {
    height,
    width,
    borderRadius: radius,
    backgroundColor: colors.surfaceAlt,
  };

  return (
    <Animated.View
      style={[baseStyle, { opacity: anim }, style]}
    />
  );
};

/* ------------------------------- EmptyState ----------------------------- */

export const EmptyState: React.FC<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}> = ({ title, subtitle, actionLabel, onAction, compact }) => {
  const { colors, spacing } = useTheme();
  const padV = compact ? spacing.md : spacing.lg;
  const gap = compact ? spacing.sm : spacing.md;

  return (
    <View style={{ alignItems: 'center', paddingVertical: padV }}>
      <Text style={{ color: colors.muted, fontWeight: '800' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>{subtitle}</Text>}
      {actionLabel && onAction ? (
        <View style={{ marginTop: gap, alignSelf: 'stretch' }}>
          <Button title={actionLabel} variant="tonal" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
};
