import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../state/ThemeProvider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';

export default function DevModeNotice() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Só mostrar se estiver no Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    setVisible(isExpoGo);

    // Auto-dismiss após 5 segundos
    if (isExpoGo) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 6 }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.accent + '12',
            borderColor: colors.accent + '25',
          },
        ]}
      >
        <MaterialCommunityIcons
          name="flask"
          size={13}
          color={colors.accent}
          style={{ marginRight: spacing.xs }}
        />
        <Text
          style={[
            typography.caption,
            {
              color: colors.accent,
              fontWeight: '500',
              flex: 1,
              fontSize: 11,
            },
          ]}
        >
          Modo Dev · Notificações limitadas
        </Text>
        <Pressable onPress={() => setVisible(false)} hitSlop={4} style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={11} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButton: {
    marginLeft: 6,
    opacity: 0.6,
    padding: 1,
  },
});
