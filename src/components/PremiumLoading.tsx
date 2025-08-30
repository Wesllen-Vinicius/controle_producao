import { useEffect, useRef } from 'react';
// CORREÇÃO: Importados os tipos de estilo do React Native
import { Animated, Dimensions, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../state/ThemeProvider';

interface PremiumLoadingProps {
  message?: string;
  submessage?: string;
  size?: 'small' | 'medium' | 'large';
  // CORREÇÃO: 'any' substituído por um tipo de estilo específico.
  style?: StyleProp<ViewStyle>;
}

const { width: screenWidth } = Dimensions.get('window');

export default function PremiumLoading({
  message = 'Carregando...',
  submessage,
  size = 'medium',
  style,
}: PremiumLoadingProps) {
  const { colors, spacing, typography } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  const getSize = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 56;
      default:
        return 40;
    }
  };

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue, scaleValue, fadeValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dotSize = getSize();
  const containerSize = dotSize * 3;

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }, style]}>
      {/* Loading Spinner */}
      <View
        style={[
          styles.spinnerContainer,
          {
            width: containerSize,
            height: containerSize,
            marginBottom: spacing.md,
          },
        ]}
      >
        {/* Outer Ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: containerSize,
              height: containerSize,
              borderColor: colors.primary + '30',
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Inner Dots */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotSize / 3,
                  height: dotSize / 3,
                  backgroundColor: colors.primary,
                  transform: [{ scale: scaleValue }],
                },
                index === 1 && { marginHorizontal: spacing.xs },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Messages */}
      <Text
        style={[
          // CORREÇÃO: O tema não possui 'caption', substituído por 'label'.
          size === 'small' ? typography.label : typography.body,
          {
            color: colors.text,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: submessage ? spacing.xs : 0,
          },
        ]}
      >
        {message}
      </Text>

      {submessage && (
        <Text
          style={[
            // CORREÇÃO: O tema não possui 'caption', substituído por 'label'.
            typography.label,
            {
              color: colors.muted,
              textAlign: 'center',
              maxWidth: screenWidth * 0.8,
            },
          ]}
        >
          {submessage}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinnerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 1000,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 1000,
  },
});
