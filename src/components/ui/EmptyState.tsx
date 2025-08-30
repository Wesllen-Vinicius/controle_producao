import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/state/ThemeProvider';
import Button from './Button';

type Props = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export default function EmptyState({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  compact,
  children,
  style,
  testID,
}: Props) {
  const { colors, spacing, typography } = useTheme();

  const padV = compact ? spacing.md : spacing.lg;
  const gap = compact ? spacing.sm : spacing.md;

  return (
    <View
      // nada de ScrollView aqui, só container “inerte”
      style={[styles.container, { paddingVertical: padV, paddingHorizontal: spacing.md }, style]}
      // 'summary' não é um role válido no RN — removido
      testID={testID}
      pointerEvents="box-none"
    >
      {icon ? <View style={{ marginBottom: gap }}>{icon}</View> : null}

      <Text style={[typography.h2, { textAlign: 'center', color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={{
            marginTop: 6,
            textAlign: 'center',
            color: colors.muted,
            fontSize: 14,
            fontWeight: '600',
          }}
          numberOfLines={3}
        >
          {subtitle}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={{ marginTop: gap, alignSelf: 'stretch' }}>
          <Button title={actionLabel} variant="tonal" onPress={onAction} full />
        </View>
      ) : null}

      {children ? <View style={{ marginTop: gap }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
