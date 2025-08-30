import React, { ReactNode, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

type Props = {
  label: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onRemove?: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

export default function Chip({
  label,
  onPress,
  onLongPress,
  onRemove,
  leftIcon,
  rightIcon,
  active,
  disabled,
  small,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: Props) {
  const { colors, radius, spacing, opacity } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const dims = useMemo(
    () => ({
      height: small ? 32 : 40,
      padH: small ? spacing.md : spacing.lg,
      gap: small ? spacing.xs : spacing.sm,
      textSize: small ? 12 : 14,
      iconSize: small ? 16 : 18,
      radius: radius.md,
    }),
    [small, spacing, radius]
  );

  const palette = useMemo(() => {
    if (active) {
      return {
        bg: colors.primaryDim, // tonal do tema
        border: colors.primary,
        text: colors.primary,
      };
    }
    return {
      bg: colors.surfaceAlt,
      border: colors.line,
      text: colors.muted,
    };
  }, [active, colors]);

  const pressedIn = () => {
    Animated.timing(scale, {
      toValue: onPress ? 0.98 : 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };
  const pressedOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start();
  };

  const Remove = () =>
    onRemove ? (
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={{ marginLeft: dims.gap / 2 }}
        android_ripple={{ color: `${colors.text}14`, borderless: true }}
        accessibilityRole="button"
        accessibilityLabel="Remover"
      >
        <Text style={{ color: palette.text, fontSize: dims.textSize, fontWeight: '700' }}>×</Text>
      </Pressable>
    ) : null;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={pressedIn}
      onPressOut={pressedOut}
      disabled={disabled}
      android_ripple={{ color: `${colors.text}14`, borderless: false }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      hitSlop={6}
      testID={testID}
      style={({ pressed }) => [
        {
          opacity: disabled ? opacity.disabled : 1,
          borderRadius: dims.radius,
          backgroundColor: pressed ? palette.bg : palette.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          height: dims.height,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.row,
          {
            paddingHorizontal: dims.padH,
            gap: dims.gap,
            transform: [{ scale }],
          },
        ]}
      >
        {leftIcon ? (
          <View style={{ width: dims.iconSize, alignItems: 'center' }}>{leftIcon}</View>
        ) : null}

        <Text
          style={[styles.text, { color: palette.text, fontSize: dims.textSize }, textStyle]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {rightIcon ? (
          <View style={{ width: dims.iconSize, alignItems: 'center' }}>{rightIcon}</View>
        ) : null}
        <Remove />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minWidth: 40,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
