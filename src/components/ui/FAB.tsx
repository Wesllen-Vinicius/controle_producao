// src/components/ui/FAB.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../state/ThemeProvider';
import { useHaptics } from '../../hooks/useHaptics';

type Props = {
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  visible?: boolean;
};

const FAB = React.memo(function FAB({ onPress, icon = 'plus', visible = true }: Props) {
  const { colors, elevation, z, spacing } = useTheme();
  const h = useHaptics();
  const insets = useSafeAreaInsets();
  
  const translateY = useRef(new Animated.Value(visible ? 0 : 100)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : 100,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [visible]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 400,
      friction: 10,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    h.light();
    onPress();
  }, [h, onPress]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + spacing.lg,
          right: spacing.lg,
          transform: [{ translateY }],
          zIndex: z.base + 5,
        },
      ]}
    >
      <Animated.View 
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale }],
            ...elevation.e3,
          }
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
          android_ripple={{ 
            color: 'rgba(255,255,255,0.2)', 
            radius: 28,
            borderless: true 
          }}
        >
          <MaterialCommunityIcons 
            name={icon} 
            size={24} 
            color="#FFFFFF" 
          />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

export default FAB;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  pressable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
