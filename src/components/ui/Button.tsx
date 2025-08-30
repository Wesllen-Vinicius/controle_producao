import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
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

type Variant = 'primary' | 'tonal' | 'text';
type Intent = 'default' | 'danger' | 'success';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  intent?: Intent;
  small?: boolean;
  full?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

export default function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  intent = 'default',
  small,
  full,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  testID,
}: Props) {
  const { colors, spacing, radius, elevation, motion, opacity } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const intentPalette = useMemo(() => {
    const tone =
      intent === 'danger' ? colors.danger : intent === 'success' ? colors.success : colors.primary;
    return {
      tone,
      toneDim: `${tone}33`, // 20% alpha
      onTone: '#FFFFFF', // texto em contraste
    };
  }, [intent, colors]);

  const dims = useMemo(
    () => ({
      height: small ? 36 : 44,
      padH: small ? spacing.md : spacing.lg,
      padGap: small ? spacing.xs : spacing.sm,
      textSize: small ? 14 : 16,
      iconSize: small ? 18 : 20,
    }),
    [small, spacing]
  );

  const palette = useMemo(() => {
    switch (variant) {
      case 'primary':
        return {
          containerStyle: [
            styles.row,
            { backgroundColor: intentPalette.tone, borderRadius: radius.md },
            elevation.e1,
          ] as const,
          textColor: intentPalette.onTone,
        };
      case 'tonal':
        return {
          containerStyle: [
            styles.row,
            { backgroundColor: intentPalette.toneDim, borderRadius: radius.md },
            elevation.e0,
          ] as const,
          textColor: intentPalette.tone,
        };
      case 'text':
      default:
        return {
          containerStyle: [
            styles.row,
            { backgroundColor: 'transparent', borderRadius: radius.md },
            elevation.e0,
          ] as const,
          textColor: intentPalette.tone,
        };
    }
  }, [variant, intentPalette, radius, elevation]);

  const pressedIn = () => {
    Animated.timing(scale, {
      toValue: motion.pressScale,
      duration: motion.duration.micro,
      useNativeDriver: true,
    }).start();
  };
  const pressedOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: motion.duration.small,
      useNativeDriver: true,
    }).start();
  };

  const Container = ({ children }: { children: React.ReactNode }) => (
    <Animated.View
      style={[
        {
          transform: [{ scale }],
          opacity: disabled ? opacity.disabled : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
      ]}
    >
      <View
        style={[
          palette.containerStyle,
          { height: dims.height, paddingHorizontal: dims.padH, gap: dims.padGap },
          full && { alignSelf: 'stretch', justifyContent: 'center' },
          style,
        ]}
      >
        {children}
      </View>
    </Animated.View>
  );

  const content = (
    <>
      {leftIcon ? (
        <View style={{ width: dims.iconSize, alignItems: 'center' }}>{leftIcon}</View>
      ) : null}
      <Text
        style={[styles.text, { color: palette.textColor, fontSize: dims.textSize }, textStyle]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {rightIcon ? (
        <View style={{ width: dims.iconSize, alignItems: 'center' }}>{rightIcon}</View>
      ) : null}
      {loading ? (
        <View style={{ position: 'absolute', right: dims.padH / 1.5 }}>
          <ActivityIndicator size="small" color={palette.textColor} />
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={pressedIn}
      onPressOut={pressedOut}
      android_ripple={
        variant === 'text'
          ? { color: `${intentPalette.tone || '#000'}22`, borderless: false }
          : { color: `${'#000'}14`, borderless: false }
      }
      style={({ pressed }) => [
        { opacity: pressed && variant !== 'text' ? 1 : 1 },
        pressed && variant === 'text'
          ? { backgroundColor: `${intentPalette.tone}12`, borderRadius: radius.md }
          : null,
      ]}
      hitSlop={8}
      testID={testID}
    >
      <Container>{content}</Container>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
  },
});
