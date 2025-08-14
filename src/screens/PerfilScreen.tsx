// screens/PerfilScreen.tsx
import React, { useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Linking,
  Pressable,
  Animated,
  Switch,
} from 'react-native';
import Constants from 'expo-constants';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ThemeToggle';

import { useTheme } from '../state/ThemeProvider';
import { useAuth } from '../state/AuthProvider';
import { supabase } from '../services/supabase';
import { tryCopy } from '../utils/clipboard';

/* ===== extra do app.json (links/contatos) ===== */
function getExtra<T = any>(key: string, fallback?: T): T | undefined {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return (extra?.[key] as T) ?? fallback;
}
const SUPPORT_EMAIL = getExtra<string>('supportEmail', 'wesllenvinicius09@gmail.com')!;
const DEVELOPER     = getExtra<string>('developer', 'Wesllen Lima')!;
const PRIVACY_URL   = getExtra<string>('privacyUrl');
const TERMS_URL     = getExtra<string>('termsUrl');
const RATE_URL      = getExtra<string>('rateUrl');
const WHATSAPP_URL  = getExtra<string>('whatsappUrl');
const RESET_REDIRECT_URL = getExtra<string>('resetRedirectUrl');

/* ===== Row estilo “tile” ===== */
function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  right = 'chevron',
  disabled,
  destructive,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  right?: 'chevron' | 'switch' | 'none';
  disabled?: boolean;
  destructive?: boolean;
}) {
  const { colors, spacing, typography } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 250, damping: 18, mass: 0.8 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, stiffness: 250, damping: 18, mass: 0.8 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={!disabled ? onPress : undefined}
        onPressIn={!disabled ? onPressIn : undefined}
        onPressOut={!disabled ? onPressOut : undefined}
        android_ripple={{ color: colors.line }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          opacity: disabled ? 0.5 : 1,
          gap: spacing.md,
        }}
      >
        {!!icon && (
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={destructive ? '#DC2626' : colors.text}
            style={{ width: 24 }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.h2 as any,
              { fontSize: 16, color: destructive ? '#DC2626' : colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
        {right === 'chevron' && (
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
        )}
        {right === 'switch' && (
          <Switch value={false} onValueChange={() => {}} disabled />
        )}
      </Pressable>
    </Animated.View>
  );
}

/* ===== Tela ===== */
export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  const version =
    (Constants.expoConfig as any)?.version ??
    (Constants.manifest as any)?.version ??
    '—';

  const buildNumber =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    (Constants.expoConfig as any)?.android?.versionCode ??
    (Constants.expoConfig as any)?.extra?.build ??
    '—';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // removemos paddings daqui; vamos aplicar no contentContainerStyle do ScrollView
        row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        avatar: {
          width: 64, height: 64, borderRadius: 64,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceAlt,
        },
        avatarT: { fontWeight: '900', fontSize: 20, color: colors.text },
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
        sectionTitle: { ...(typography.h2 as any), marginBottom: spacing.sm },
        metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        metaLabel: { color: colors.muted, fontWeight: '700' },
        metaValue: { color: colors.text, fontWeight: '800' },
      }),
    [colors, spacing, radius, typography]
  );

  const copyHandler = useCallback(async (text: string, label: string) => {
    const ok = await tryCopy(text);
    Alert.alert(label, ok ? 'Informação copiada para a área de transferência.' : 'Não foi possível copiar agora.');
  }, []);

  async function reportBug() {
    const subject = encodeURIComponent(`[Bug] App v${version} (${buildNumber})`);
    const body = encodeURIComponent(
      [
        'Descreva o problema (o que aconteceu, o que esperava, passos):',
        '',
        '---',
        `Versão: ${version} (${buildNumber})`,
        `SO: ${Platform.OS} ${Platform.Version}`,
        `Usuário: ${email || session?.user?.id || '—'}`,
      ].join('\n')
    );

    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert(
        'Reportar bug',
        `Não foi possível abrir o e-mail. Envie para ${SUPPORT_EMAIL} com o assunto: [Bug] App v${version} (${buildNumber}).`
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Reportar bug', 'Não foi possível abrir o e-mail agora.')
    );
  }

  const openLink = useCallback(async (url?: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Abrir link', 'Não foi possível abrir o link no momento.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Abrir link', 'Não foi possível abrir o link no momento.');
    });
  }, []);

  const resetPassword = useCallback(async () => {
    if (!email) {
      Alert.alert('Redefinir senha', 'E-mail de usuário não disponível.');
      return;
    }
    try {
      const opts: any = RESET_REDIRECT_URL ? { redirectTo: RESET_REDIRECT_URL } : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, opts);
      if (error) throw error;
      Alert.alert('Redefinir senha', 'Enviamos um e-mail com as instruções para redefinir sua senha.');
    } catch (e: any) {
      Alert.alert('Redefinir senha', e?.message ?? 'Falha ao enviar o e-mail de redefinição.');
    }
  }, [email]);

  if (!session) {
    return (
      <Screen padded>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: colors.text }}>Faça login para ver seu perfil.</Text>
        </View>
      </Screen>
    );
  }

  return (
    // Screen sem scroll interno; vamos controlar o scroll aqui com elasticidade
    <Screen padded={false} scroll={false}>
      <Animated.ScrollView
        // === elasticidade estilo “app grande” ===
        bounces
        overScrollMode="always"
        decelerationRate="fast"
        keyboardShouldPersistTaps="handled"
        // padding/gap do conteúdo aqui (evita wrapper extra)
        contentContainerStyle={{
          paddingHorizontal: spacing?.md ?? 16,
          paddingTop:        spacing?.sm ?? 8,
          paddingBottom:     spacing?.xl ?? 24,
          // gap entre blocos
          rowGap:            spacing?.md ?? 12, // RN novos suportam rowGap/gap; mantém visual consistente
        } as any}
        showsVerticalScrollIndicator={false}
      >

        {/* ===== Card Perfil ===== */}
        <Card padding="md" variant="filled" elevationLevel={2} style={{ gap: spacing.md }}>
          <View style={styles.row}>
            <Pressable
              onLongPress={() => copyHandler(name, 'Nome copiado')}
              android_ripple={{ color: colors.line }}
              style={styles.avatar}
            >
              <Text style={styles.avatarT}>{initial}</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Pressable onLongPress={() => email && copyHandler(email, 'E-mail copiado')}>
                <Text style={styles.email}>{email}</Text>
              </Pressable>
            </View>

            {!!profile?.role && (
              <View style={styles.rolePill}>
                <Text style={styles.pillText}>{profile.role}</Text>
              </View>
            )}
          </View>

          {/* Aparência */}
          <View>
            <Text style={styles.sectionTitle}>Aparência</Text>
            <ThemeToggle />
          </View>

          {/* Segurança */}
          <View>
            <Text style={styles.sectionTitle}>Segurança</Text>
            <ListRow
              icon="lock-reset"
              title="Redefinir senha por e-mail"
              subtitle="Enviaremos um link para o seu e-mail"
              onPress={resetPassword}
            />
          </View>

          {/* Sair */}
          <Button title="Sair" onPress={signOut} intent="danger" full />
        </Card>

        {/* ===== Card Links / Sobre ===== */}
        <Card padding="md" variant="tonal" elevationLevel={0} style={{ gap: 8 }}>
          <Text style={typography.h2}>Suporte & Informações</Text>

          <ListRow
            icon="bug-outline"
            title="Reportar bug"
            subtitle="Abra o e-mail com um rascunho preenchido"
            onPress={reportBug}
          />

          {!!WHATSAPP_URL && (
            <ListRow
              icon="whatsapp"
              title="Falar no WhatsApp"
              subtitle="Abriremos uma conversa com o suporte"
              onPress={() => openLink(WHATSAPP_URL)}
            />
          )}

          {!!PRIVACY_URL && (
            <ListRow
              icon="shield-check"
              title="Política de privacidade"
              onPress={() => openLink(PRIVACY_URL)}
            />
          )}

          {!!TERMS_URL && (
            <ListRow
              icon="file-document-outline"
              title="Termos de uso"
              onPress={() => openLink(TERMS_URL)}
            />
          )}

          {!!RATE_URL && (
            <ListRow
              icon="star-outline"
              title="Avaliar o app"
              subtitle={Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
              onPress={() => openLink(RATE_URL)}
            />
          )}

          <View style={{ height: 1, backgroundColor: colors.line, opacity: 0.6, marginVertical: spacing.sm }} />

          <Text style={[typography.label, { color: colors.muted, marginBottom: 6 }]}>Sobre</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Versão</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {version} ({String(buildNumber)})
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontWeight: '700' }}>Desenvolvido por</Text>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{DEVELOPER}</Text>
          </View>
        </Card>

        {/* Zona de perigo opcional */}
        <Card padding="md" variant="outlined" elevationLevel={0} style={{ gap: 8 }}>
          <Text style={[typography.h2, { color: '#DC2626' }]}>Zona de perigo</Text>
          <ListRow
            icon="account-cancel-outline"
            title="Solicitar exclusão de conta"
            subtitle={`Envie um e-mail para ${SUPPORT_EMAIL}`}
            destructive
            onPress={() =>
              Alert.alert(
                'Excluir conta',
                `Envie um e-mail para ${SUPPORT_EMAIL} solicitando a exclusão da sua conta.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Enviar e-mail',
                    onPress: async () => {
                      const subject = encodeURIComponent('Solicitação de exclusão de conta');
                      const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
                      if (await Linking.canOpenURL(url)) Linking.openURL(url);
                    },
                  },
                ],
              )
            }
          />
        </Card>
      </Animated.ScrollView>
    </Screen>
  );
}
