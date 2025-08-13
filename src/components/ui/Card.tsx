import React, { ReactNode, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../state/ThemeProvider';

type Variant = 'filled' | 'tonal' | 'outlined' | 'plain';
type Padding = 'none' | 'sm' | 'md' | 'lg';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;

  /** Visual style do card */
  variant?: Variant;
  /** Nível de elevação (0–4) */
  elevationLevel?: 0 | 1 | 2 | 3 | 4;
  /** Espaçamento interno */
  padding?: Padding;

  /** Interação */
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;

  /** Header / Footer */
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
};

export default function Card({
  children,
  style,
  contentStyle,
  variant = 'filled',
  elevationLevel = 1,
  padding = 'md',
  onPress,
  disabled,
  selected,
  testID,
  title,
  subtitle,
  leading,
  trailing,
  footer,
}: Props) {
  const { colors, radius, spacing, elevation, opacity, typography } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pad = useMemo(() => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return spacing.sm;
      case 'lg': return spacing.lg;
      case 'md':
      default: return spacing.md;
    }
  }, [padding, spacing]);

  const containerBase: ViewStyle = useMemo(() => {
    const bg =
      variant === 'filled' ? colors.surface :
      variant === 'tonal'  ? colors.surfaceAlt :
      variant === 'plain'  ? 'transparent' : colors.surface;

    const border: ViewStyle =
      variant === 'outlined'
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }
        : {};

    const elev =
      elevationLevel === 0 ? elevation.e0
      : elevationLevel === 1 ? elevation.e1
      : elevationLevel === 2 ? elevation.e2
      : elevationLevel === 3 ? elevation.e3
      : elevation.e4;

    return {
      backgroundColor: bg,
      borderRadius: radius.lg,
      ...elev,
      ...border,
    };
  }, [variant, colors, radius, elevation, elevationLevel]);

  const pressedIn = () => {
    Animated.timing(scale, {
      toValue: onPress ? 0.99 : 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const pressedOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };

  const Content = (
    <>
      {(title || subtitle || leading || trailing) && (
        <View style={[styles.header, { padding: pad, paddingBottom: children ? spacing.sm : pad }]}>
          <View style={[styles.headerLeft]}>
            {leading ? <View style={[styles.leading]}>{leading}</View> : null}
            <View style={{ flex: 1 }}>
              {title ? <Text style={typography.h2} numberOfLines={1}>{title}</Text> : null}
              {subtitle ? (
                <Text style={[typography.label, { marginTop: 2 }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
      )}

      {children ? (
        <View
          style={[
            { padding: pad, paddingTop: (title || subtitle) ? 0 : pad },
            contentStyle,
          ]}
        >
          {children}
        </View>
      ) : null}

      {footer ? (
        <View style={{ padding: pad, paddingTop: children ? spacing.sm : pad }}>
          {footer}
        </View>
      ) : null}
    </>
  );

  const body = (
    <Animated.View
      style={[
        containerBase,
        // borda de seleção sutil
        selected && { borderWidth: 2, borderColor: colors.primary },
        { transform: [{ scale }], opacity: disabled ? opacity.disabled : 1 },
        style,
      ]}
    >
      {Content}
    </Animated.View>
  );

  if (!onPress) {
    return <View testID={testID} accessible style={style}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      onPressIn={pressedIn}
      onPressOut={pressedOut}
      android_ripple={{ color: `${colors.text}14` }}
      style={({ pressed }) => [
        { opacity: pressed ? 1 : 1 }, // opacidade controlada pela escala
      ]}
      hitSlop={8}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  leading: {
    width: 28,
    alignItems: 'center',
  },
  trailing: {
    marginLeft: 8,
  },
});
