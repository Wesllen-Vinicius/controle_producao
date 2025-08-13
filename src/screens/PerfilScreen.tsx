import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';

// UI kit premium — imports diretos
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

import { useTheme } from '../state/ThemeProvider';
import { useAuth } from '../state/AuthProvider';
import ThemeToggle from '../components/ThemeToggle';

export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: spacing.md,
          paddingHorizontal: spacing.md, // ← espaçamento lateral
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,     // ← respiro no fim da tela
        },
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        avatar: {
          width: 56, height: 56, borderRadius: 56,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt,
        },
        avatarT: { fontWeight: '900', fontSize: 18, color: colors.text },
        name: { fontWeight: '800', fontSize: 18, color: colors.text },
        email: { color: colors.muted, marginTop: 2 },
        rolePill: {
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
        },
        pillText: { color: colors.text, fontWeight: '800' },
        sectionTitle: { ...typography.h2, marginBottom: spacing.sm },
      }),
    [colors, spacing, radius, typography]
  );

  if (!session) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text }}>Faça login para ver seu perfil.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <View style={styles.wrapper}>
        <Text style={typography.h1}>Seu perfil</Text>

        <Card padding="md" variant="filled" elevationLevel={2} style={{ gap: spacing.md }}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarT}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.email}>{email}</Text>
            </View>
            {!!profile?.role && (
              <View style={styles.rolePill}>
                <Text style={styles.pillText}>{profile.role}</Text>
              </View>
            )}
          </View>

          <View>
            <Text style={styles.sectionTitle}>Aparência</Text>
            <ThemeToggle />
          </View>

          <Button title="Sair" onPress={signOut} intent="danger" full />
        </Card>
      </View>
    </Screen>
  );
}
