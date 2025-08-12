import React from 'react';
import Screen from '../components/Screen';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../state/ThemeProvider';
import { Card, Button } from '../components/ui';
import { useAuth } from '../state/AuthProvider';
import ThemeToggle from '../components/ThemeToggle';

export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();
  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  if (!session) return <Screen><Text style={{ color: colors.text }}>Faça login para ver seu perfil.</Text></Screen>;

  return (
    <Screen>
      <Text style={typography.h1}>Seu perfil</Text>

      <Card style={{ gap: spacing.md }}>
        <View style={[styles.row, { gap: spacing.md }]}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <Text style={[styles.avatarT, { color: colors.text }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{email}</Text>
          </View>
          {!!profile?.role && (
            <View style={{ backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{profile.role}</Text>
            </View>
          )}
        </View>

        <View style={{ alignItems: 'flex-start' }}>
          <ThemeToggle />
        </View>

        <Button title="Sair" onPress={signOut} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 54, height: 54, borderRadius: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarT: { fontWeight: '900', fontSize: 18 },
  name: { fontWeight: '800', fontSize: 18 },
});
