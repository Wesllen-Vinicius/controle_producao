// screens/PerfilScreen.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
import Screen from '../components/Screen';

// UI kit premium — imports diretos
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

import { useTheme } from '../state/ThemeProvider';
import { useAuth } from '../state/AuthProvider';
import ThemeToggle from '../components/ThemeToggle';

import Constants from 'expo-constants';

export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  // ====== App info (via expo-constants) ======
  const version =
    (Constants.expoConfig as any)?.version ??
    (Constants.manifest as any)?.version ??
    '—';

  const buildNumber =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    (Constants.expoConfig as any)?.android?.versionCode ??
    (Constants.expoConfig as any)?.extra?.build ??
    '—';

  const developer =
    (Constants.expoConfig as any)?.extra?.developer ??
    'Wesllen Lima';

  const supportEmail =
    (Constants.expoConfig as any)?.extra?.supportEmail ??
    'wesllenvinicius09@gmail.com';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
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
        metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        metaLabel: { color: colors.muted, fontWeight: '700' },
        metaValue: { color: colors.text, fontWeight: '800' },
      }),
    [colors, spacing, radius, typography]
  );

  async function reportBug() {
    const subject = encodeURIComponent(`[Bug] App v${version} (${buildNumber})`);
    const body = encodeURIComponent(
      [
        'Descreva o problema aqui (o que aconteceu, o que você esperava que acontecesse, passos para reproduzir):',
        '',
        '---',
        `Versão do app: ${version} (${buildNumber})`,
        `SO: ${Platform.OS} ${Platform.Version}`,
        `Usuário: ${email || session?.user?.id || '—'}`,
      ].join('\n')
    );

    const url = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert(
        'Reportar bug',
        `Não foi possível abrir o e-mail. Envie para ${supportEmail} com o assunto: [Bug] App v${version} (${buildNumber}).`
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Reportar bug', 'Não foi possível abrir o e-mail agora.')
    );
  }

  if (!session) {
    return (
      <Screen padded>
        <View style={{ paddingHorizontal: spacing.md }}>
          <Text style={{ color: colors.text }}>Faça login para ver seu perfil.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded>
      <View style={styles.wrapper}>
        <Text style={typography.h1}>Seu perfil</Text>

        {/* Card Perfil */}
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

        {/* Card Sobre o app */}
        <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: spacing.sm }}>
          <Text style={typography.h2}>Sobre o app</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Versão</Text>
            <Text style={styles.metaValue}>{version} ({String(buildNumber)})</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Desenvolvido por</Text>
            <Text style={styles.metaValue}>{developer}</Text>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Button title="Reportar bug" variant="tonal" onPress={reportBug} full />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
