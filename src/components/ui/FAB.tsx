// src/components/ui/FAB.tsx
import React, { useEffect, useRef } from 'react';
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

export default function FAB({ onPress, icon = 'plus', visible = true }: Props) {
  const { colors, elevation, z } = useTheme();
  const h = useHaptics();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      stiffness: 150,
      damping: 20,
      mass: 1,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0], // Move 100 pixels para baixo para esconder
  });

  const scale = anim;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 24, // Ajusta a partir da safe area
          right: insets.right + 24,
          transform: [{ translateY }, { scale }],
          zIndex: z.base + 5,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          h.light();
          onPress();
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
          elevation.e3,
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
