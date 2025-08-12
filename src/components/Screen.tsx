import React from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, StatusBar, useWindowDimensions, Platform } from 'react-native';
import { colors, spacing } from '../theme';

type Props = { children: React.ReactNode; scroll?: boolean };
export default function Screen({ children, scroll = true }: Props) {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 760);
  const horizontal = width >= 480 ? spacing.lg : spacing.md;
  const topPad = Platform.OS === 'android' ? spacing.md : 0;

  const Container: any = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.center, { paddingHorizontal: horizontal, paddingTop: topPad }]}>
        <Container
          style={[styles.container, { width: maxWidth }]}
          contentContainerStyle={scroll ? { paddingBottom: spacing.xl, gap: spacing.md } : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Container>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center' },
  container: { flexGrow: 1, backgroundColor: colors.background },
});
