import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';

export default function ThemeToggle() {
  const { scheme, toggleTheme, colors } = useTheme();
  const x = useRef(new Animated.Value(scheme === 'dark' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(x, { toValue: scheme === 'dark' ? 0 : 1, duration: 220, useNativeDriver: false }).start();
  }, [scheme]);

  const trackBg = x.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceAlt, colors.surfaceAlt],
  });
  const knobLeft = x.interpolate({ inputRange: [0, 1], outputRange: [4, 40] });

  return (
    <Pressable
      onPress={async () => {
        await Haptics.selectionAsync();
        toggleTheme();
      }}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.9 : 1 }]}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackBg, borderColor: colors.line }]}>
        <Animated.View style={[styles.knob, { left: knobLeft, backgroundColor: colors.surface, borderColor: colors.line }]}>
          <MaterialCommunityIcons
            name={scheme === 'dark' ? 'weather-night' : 'white-balance-sunny'}
            size={18}
            color={scheme === 'dark' ? '#FFDD55' : '#F59E0B'}
          />
        </Animated.View>
        <View style={styles.iconLeft}>
          <MaterialCommunityIcons name="weather-night" size={16} color="#8DA2B6" />
        </View>
        <View style={styles.iconRight}>
          <MaterialCommunityIcons name="white-balance-sunny" size={16} color="#F59E0B" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start' },
  track: {
    width: 72, height: 34, borderRadius: 34, borderWidth: 1,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute', width: 26, height: 26, borderRadius: 26,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  iconLeft:  { position: 'absolute', left: 10 },
  iconRight: { position: 'absolute', right: 10 },
});
