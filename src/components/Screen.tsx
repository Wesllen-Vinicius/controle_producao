import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../state/ThemeProvider';

type Props = { children: React.ReactNode; padded?: boolean };

export default function Screen({ children, padded = true }: Props) {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 760);
  const horizontal = width >= 480 ? spacing.lg : spacing.md;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={[styles.center, { paddingHorizontal: horizontal }]}>
          <View style={[styles.body, { width: maxWidth, paddingTop: spacing.lg, paddingBottom: padded ? spacing.xl : 0 }]}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, safe: { flex: 1 }, center: { flex: 1, alignItems: 'center' }, body: { flex: 1 } });
