// src/screens/Perfil/components/Section.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../state/ThemeProvider';

interface SectionProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  children: React.ReactNode;
  isDanger?: boolean;
}

export function Section({ title, icon, children, isDanger = false }: SectionProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDanger ? colors.danger + '20' : colors.line,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDanger ? colors.danger + '08' : colors.surfaceAlt,
            borderBottomColor: isDanger ? colors.danger + '20' : colors.line,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isDanger ? colors.danger + '15' : colors.primary + '15' },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={isDanger ? colors.danger : colors.primary}
          />
        </View>
        <Text style={[styles.title, { color: isDanger ? colors.danger : colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={{ padding: spacing.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '600',
    fontSize: 15,
  },
});
