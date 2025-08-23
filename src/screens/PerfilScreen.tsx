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
import { useToast } from '../state/ToastProvider';

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
  const { showToast } = useToast();

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  const version = (Constants.expoConfig as any)?.version ?? '—';
  const buildNumber = (Constants.expoConfig as any)?.ios?.buildNumber ?? (Constants.expoConfig as any)?.android?.versionCode ?? '—';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.lg,
      elevation: 3,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: colors.line,
    },
    userSection: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: spacing.md 
    },
    avatar: { 
      width: 80, 
      height: 80, 
      borderRadius: 24, 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: colors.primary + '20',
      borderWidth: 3,
      borderColor: colors.primary + '40'
    },
    avatarText: { 
      fontWeight: '900', 
      fontSize: 28, 
      color: colors.primary,
      letterSpacing: 1
    },
    userInfo: { flex: 1, gap: spacing.xs },
    userName: { 
      fontWeight: '800', 
      fontSize: 20, 
      color: colors.text,
      letterSpacing: -0.5
    },
    userEmail: { 
      color: colors.muted, 
      fontSize: 14,
      fontWeight: '500'
    },
    rolePill: { 
      backgroundColor: colors.success + '20',
      paddingHorizontal: spacing.sm, 
      paddingVertical: 6, 
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.success + '30'
    },
    pillText: { 
      color: colors.success, 
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.5
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      overflow: 'hidden',
      elevation: 1,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    sectionTitle: { 
      fontWeight: '700', 
      fontSize: 16, 
      color: colors.text 
    },
    metaRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      paddingVertical: spacing.sm
    },
    metaLabel: { 
      color: colors.muted, 
      fontWeight: '600',
      fontSize: 13
    },
    metaValue: { 
      color: colors.text, 
      fontWeight: '700',
      fontSize: 14
    },
    dangerCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.danger + '30',
      overflow: 'hidden',
      elevation: 1,
      shadowColor: colors.danger,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }), [colors, spacing, radius, typography]);

  const copyHandler = useCallback(async (text: string, label: string) => {
    const ok = await tryCopy(text);
    if (ok) {
      showToast({ type: 'success', message: `${label} copiado!` });
    } else {
      Alert.alert(label, 'Não foi possível copiar agora.');
    }
  }, [showToast]);

  const reportBug = useCallback(async () => {
    const subject = encodeURIComponent(`[Bug Report] App v${version} (${buildNumber})`);
    const userInfo = email || session?.user?.id?.slice(0, 8) + '...' || 'Anônimo';
    const deviceInfo = `${Platform.OS} ${Platform.Version}`;
    
    const body = encodeURIComponent([
      'Descreva o problema encontrado:',
      '',
      '',
      '---',
      'Informações técnicas:',
      `Versão do app: ${version} (${buildNumber})`,
      `Sistema: ${deviceInfo}`,
      `Usuário: ${userInfo}`,
      `Data: ${new Date().toLocaleString()}`
    ].join('\n'));
    
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          'Reportar bug',
          `Para reportar um bug, envie um e-mail para:\n\n${SUPPORT_EMAIL}\n\nAssunto: [Bug Report] App v${version}`,
          [
            { text: 'OK' },
            { text: 'Copiar e-mail', onPress: () => copyHandler(SUPPORT_EMAIL, 'E-mail de suporte') }
          ]
        );
        return;
      }
      
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o aplicativo de e-mail.');
    }
  }, [version, buildNumber, email, session?.user?.id, copyHandler]);

  const openLink = useCallback(async (url?: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Abrir link', 'Não foi possível abrir o link no momento.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Abrir link', 'Não foi possível abrir o link no momento.'));
  }, []);

  const resetPassword = useCallback(async () => {
    if (!email) {
      Alert.alert('Erro', 'E-mail não encontrado.');
      return;
    }
    
    Alert.alert(
      'Redefinir senha',
      'Deseja receber um e-mail com as instruções para redefinir sua senha?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: async () => {
            try {
              const opts: any = RESET_REDIRECT_URL ? { redirectTo: RESET_REDIRECT_URL } : undefined;
              const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), opts);
              if (error) throw error;
              Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada e spam. O link expira em 1 hora.');
            } catch (e: any) {
              const errorMessage = e?.message?.includes('rate_limit') 
                ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
                : e?.message ?? 'Falha ao enviar o e-mail.';
              Alert.alert('Erro', errorMessage);
            }
          }
        }
      ]
    );
  }, [email]);

  if (!session) {
    return (
      <Screen padded>
        <Text style={{ color: colors.text }}>Faça login para ver seu perfil.</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false}>
      <Animated.ScrollView
        bounces
        overScrollMode="always"
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.userSection}>
            <Pressable 
              onLongPress={() => copyHandler(name, 'Nome')} 
              android_ripple={{ color: colors.line }} 
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </Pressable>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{name}</Text>
              <Pressable onLongPress={() => email && copyHandler(email, 'E-mail')}>
                <Text style={styles.userEmail}>{email}</Text>
              </Pressable>
              {!!profile?.role && (
                <View style={styles.rolePill}>
                  <Text style={styles.pillText}>{profile.role.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ gap: spacing.sm }}>
            <Button 
              title="Redefinir Senha" 
              onPress={resetPassword}
              variant="tonal"
              leftIcon={<MaterialCommunityIcons name="lock-reset" size={16} color={colors.primary} />}
              full
            />
            <Button 
              title="Sair da Conta" 
              onPress={() => {
                Alert.alert(
                  'Sair da conta',
                  'Tem certeza que deseja sair? Você precisará fazer login novamente.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair', style: 'destructive', onPress: signOut }
                  ]
                );
              }} 
              intent="danger" 
              leftIcon={<MaterialCommunityIcons name="logout" size={16} color="#FFFFFF" />}
              full 
            />
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="palette" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>Personalização</Text>
          </View>
          <View style={{ padding: spacing.md }}>
            <ThemeToggle />
          </View>
        </View>

        {/* Support & Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="help-circle" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>Suporte & Ajuda</Text>
          </View>
          <View>
            <ListRow icon="bug-outline" title="Reportar Bug" subtitle="Relate problemas encontrados" onPress={reportBug} />
            {!!WHATSAPP_URL && (
              <ListRow 
                icon="whatsapp" 
                title="Suporte via WhatsApp" 
                subtitle="Fale conosco diretamente"
                onPress={() => openLink(WHATSAPP_URL)} 
              />
            )}
            {!!PRIVACY_URL && (
              <ListRow 
                icon="shield-check" 
                title="Política de Privacidade" 
                subtitle="Como protegemos seus dados"
                onPress={() => openLink(PRIVACY_URL)} 
              />
            )}
            {!!TERMS_URL && (
              <ListRow 
                icon="file-document-outline" 
                title="Termos de Uso" 
                subtitle="Condições de utilização"
                onPress={() => openLink(TERMS_URL)} 
              />
            )}
            {!!RATE_URL && (
              <ListRow 
                icon="star-outline" 
                title="Avaliar o App" 
                subtitle="Deixe sua avaliação na loja"
                onPress={() => openLink(RATE_URL)} 
              />
            )}
          </View>
        </View>

        {/* App Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="information" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>Informações do App</Text>
          </View>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Versão do App</Text>
              <Text style={styles.metaValue}>{version}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Build Number</Text>
              <Text style={styles.metaValue}>{String(buildNumber)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Desenvolvido por</Text>
              <Text style={styles.metaValue}>{DEVELOPER}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Platform</Text>
              <Text style={styles.metaValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerCard}>
          <View style={[styles.sectionHeader, { backgroundColor: colors.danger + '10' }]}>
            <MaterialCommunityIcons name="alert" size={20} color={colors.danger} />
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>Zona de Perigo</Text>
          </View>
          <View>
            <ListRow
              icon="account-cancel-outline"
              title="Solicitar Exclusão de Conta"
              subtitle="Esta ação é irreversível e removerá todos os dados"
              destructive
              onPress={() => Alert.alert(
                'Excluir conta',
                `⚠️ ATENÇÃO: Esta ação é irreversível!\n\nTodos os seus dados serão permanentemente removidos.\n\nPara solicitar a exclusão, envie um e-mail para ${SUPPORT_EMAIL}`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Enviar solicitação', 
                    style: 'destructive',
                    onPress: async () => {
                      const subject = encodeURIComponent('Solicitação de exclusão de conta');
                      const userInfo = email || session?.user?.id || 'Usuário não identificado';
                      const body = encodeURIComponent([
                        'Solicito a exclusão permanente da minha conta.',
                        '',
                        'Entendo que esta ação é irreversível e que todos os meus dados serão removidos.',
                        '',
                        `Conta: ${userInfo}`,
                        `Data da solicitação: ${new Date().toLocaleString()}`
                      ].join('\n'));
                      const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
                      
                      try {
                        const canOpen = await Linking.canOpenURL(url);
                        if (canOpen) {
                          await Linking.openURL(url);
                        } else {
                          copyHandler(SUPPORT_EMAIL, 'E-mail de suporte');
                        }
                      } catch {
                        Alert.alert('Erro', 'Não foi possível abrir o e-mail.');
                      }
                    }
                  }
                ]
              )}
            />
          </View>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}
