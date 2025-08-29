// src/screens/Perfil/components/ListItem.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useHaptics } from '../../../hooks/useHaptics';
import { useTheme } from '../../../state/ThemeProvider';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  isDestructive?: boolean;
}

export const ListItem = React.memo(({ title, subtitle, icon, onPress, isDestructive = false }: ListItemProps) => {
  const { colors, spacing, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const h = useHaptics();

  const handlePress = () => {
    if (onPress) {
      h.light();
      onPress();
    }
  };

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  const titleColor = isDestructive ? colors.danger : colors.text;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [styles.container, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
        android_ripple={{ color: colors.line }}
      >
        <View style={[styles.iconContainer, { backgroundColor: (isDestructive ? colors.danger : colors.primary) + '15' }]}>
          <MaterialCommunityIcons name={icon} size={20} color={isDestructive ? colors.danger : colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[typography.body, styles.title, { color: titleColor }]}>{title}</Text>
          {subtitle && <Text style={[typography.label, styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
