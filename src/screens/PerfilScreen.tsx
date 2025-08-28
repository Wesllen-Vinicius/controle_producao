// screens/PerfilScreen.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import Screen from '../components/Screen';
import ThemeToggle from '../components/ThemeToggle';
import BottomSheet from '../components/ui/BottomSheet';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useHaptics } from '../hooks/useHaptics';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';

import { supabase } from '../services/supabase';
import { useAuth } from '../state/AuthProvider';
import { useTheme } from '../state/ThemeProvider';
import { useToast } from '../state/ToastProvider';
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

/* ===== Componente ListRow ===== */
const ListRow = React.memo(function ListRow({
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
  const opacity = useRef(new Animated.Value(1)).current;
  const h = useHaptics();

  const onPressIn = useCallback(() => {
    if (!disabled) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, stiffness: 300, damping: 20, mass: 0.7 }),
        Animated.timing(opacity, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [disabled, scale, opacity]);

  const onPressOut = useCallback(() => {
    if (!disabled) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, stiffness: 300, damping: 20, mass: 0.7 }),
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [disabled, scale, opacity]);

  const handlePress = useCallback(() => {
    if (!disabled && onPress) {
      h.light();
      onPress();
    }
  }, [disabled, onPress, h]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity, marginBottom: spacing.xs }}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        android_ripple={{ color: colors.ripple || colors.line }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: spacing.sm,
          opacity: disabled ? 0.5 : 1,
          gap: spacing.md,
          ...Platform.select({
            ios: { shadowColor: colors.shadow || '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
            android: { elevation: 1 },
          }),
        }}
      >
        {!!icon && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: destructive ? colors.danger + '10' : colors.primary + '10',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={icon} size={18} color={destructive ? colors.danger : colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text
            style={[
              typography.body,
              { fontSize: 15, color: destructive ? colors.danger : colors.text, fontWeight: '600' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={{ color: colors.muted, fontSize: 12, fontWeight: '400', marginTop: 2, lineHeight: 16 }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {right === 'chevron' && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.muted} />}
        {right === 'switch' && <Switch value={false} onValueChange={() => {}} disabled />}
      </Pressable>
    </Animated.View>
  );
});

/* ===== Tela ===== */
export default function PerfilScreen() {
  const { session, profile, signOut } = useAuth();
  const { colors, spacing, radius, typography, theme } = useTheme();
  const { showToast } = useToast();
  const h = useHaptics();
  const { isAppActive } = usePerformanceOptimization();

  const name = profile?.username || session?.user?.email?.split('@')[0] || 'Usuário';
  const email = session?.user?.email || '';
  const initial = (name?.[0] || 'U').toUpperCase();

  const version = (Constants.expoConfig as any)?.version ?? '—';
  const buildNumber =
    (Constants.expoConfig as any)?.ios?.buildNumber ??
    (Constants.expoConfig as any)?.android?.versionCode ??
    '—';

  const [refreshing, setRefreshing] = useState(false);
  
  // Estados do modal de troca de senha
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const avatarScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, stiffness: 150, damping: 16 }),
      Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true, stiffness: 180, damping: 12 }),
    ]).start();
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        gradient: { flex: 1 },
        scrollContainer: { paddingTop: spacing.sm, paddingBottom: spacing.md },
        section: { paddingHorizontal: spacing.sm, marginBottom: spacing.md },

        // Cards (padrão compacto)
        modernSectionCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: { elevation: 1 },
          }),
        },
        modernSectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
        sectionIconContainer: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.primary + '12',
          alignItems: 'center',
          justifyContent: 'center',
        },
        modernSectionTitle: {
          fontWeight: '600',
          fontSize: 15,
          color: colors.text,
          flex: 1,
          letterSpacing: -0.2,
        },
        modernSectionContent: { padding: spacing.md },

        // Conteúdo do card de perfil
        profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        modernAvatar: {
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.surface,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
          }),
        },
        avatarBadge: {
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.success,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.surface,
        },
        avatarText: { fontWeight: '800', fontSize: 26, color: colors.primary, letterSpacing: -0.5 },
        userInfo: { flex: 1 },
        modernUserName: { fontWeight: '700', fontSize: 18, color: colors.text, marginBottom: 1 },
        modernUserEmail: { color: colors.muted, fontSize: 13, fontWeight: '500', marginBottom: 2 },
        modernRolePill: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary + '12',
          paddingHorizontal: spacing.xs,
          paddingVertical: 3,
          borderRadius: radius.md,
          alignSelf: 'flex-start',
          gap: 3,
        },
        roleIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
        modernPillText: { color: colors.primary, fontWeight: '600', fontSize: 10, letterSpacing: 0.5 },

        // Ações rápidas
        actionGrid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
        actionCard: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.line,
          ...Platform.select({
            ios: {
              shadowColor: colors.shadow || '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: { elevation: 1 },
          }),
        },
        actionIcon: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        },
        actionTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 1,
          textAlign: 'center',
        },
        actionSubtitle: { fontSize: 11, color: colors.muted, textAlign: 'center', fontWeight: '500' },

        // Metas/Informações
        modernMetaRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.xs,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.line + '40',
        },
        modernMetaLabel: { color: colors.muted, fontWeight: '500', fontSize: 13 },
        modernMetaValue: { color: colors.text, fontWeight: '600', fontSize: 13 },

        // Danger
        modernDangerCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.danger + '15',
          ...Platform.select({
            ios: {
              shadowColor: colors.danger + '30',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: { elevation: 1 },
          }),
        },
        modernDangerHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.danger + '08',
          borderBottomWidth: 1,
          borderBottomColor: colors.danger + '15',
        },
      }),
    [colors, spacing, radius, typography]
  );

  const onRefresh = useCallback(async () => {
    if (!isAppActive()) return;
    setRefreshing(true);
    h.light();
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
    h.success();
  }, [h, isAppActive]);

  const copyHandler = useCallback(
    async (text: string, label: string) => {
      const ok = await tryCopy(text);
      if (ok) {
        h.success();
        showToast({ type: 'success', message: `${label} copiado!` });
      } else {
        h.error();
        Alert.alert(label, 'Não foi possível copiar agora.');
      }
    },
    [showToast, h]
  );

  const reportBug = useCallback(async () => {
    const subject = encodeURIComponent(`[Bug Report] App v${version} (${buildNumber})`);
    const userInfo = email || session?.user?.id?.slice(0, 8) + '...' || 'Anônimo';
    const deviceInfo = `${Platform.OS} ${Platform.Version}`;
    const body = encodeURIComponent(
      [
        'Descreva o problema encontrado:',
        '',
        '',
        '---',
        'Informações técnicas:',
        `Versão do app: ${version} (${buildNumber})`,
        `Sistema: ${deviceInfo}`,
        `Usuário: ${userInfo}`,
        `Data: ${new Date().toLocaleString()}`,
      ].join('\n')
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          'Reportar bug',
          `Para reportar um bug, envie um e-mail para:\n\n${SUPPORT_EMAIL}\n\nAssunto: [Bug Report] App v${version}`,
          [{ text: 'OK' }, { text: 'Copiar e-mail', onPress: () => copyHandler(SUPPORT_EMAIL, 'E-mail de suporte') }]
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

  const changePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      h.warning();
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      h.warning();
      Alert.alert('Atenção', 'As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      h.warning();
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangingPassword(true);
    try {
      // Primeiro, tentar fazer login com a senha atual para verificar se está correta
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: currentPassword
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          h.error();
          Alert.alert('Erro', 'Senha atual incorreta.');
          return;
        }
        throw signInError;
      }

      // Se chegou aqui, a senha atual está correta, então podemos alterar
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      h.success();
      showToast({ type: 'success', message: 'Senha alterada com sucesso!' });
      
      // Limpar campos e fechar modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalOpen(false);

    } catch (e: any) {
      h.error();
      const msg = e?.message?.includes('rate_limit')
        ? 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
        : e?.message ?? 'Falha ao alterar a senha.';
      Alert.alert('Erro', msg);
    } finally {
      setChangingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword, email, h, showToast]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair? Você precisará fazer login novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          h.success();
          signOut();
        },
      },
    ]);
  }, [signOut, h]);

  if (!session) {
    return (
      <Screen padded edges={['top', 'left', 'right', 'bottom']}>
        <LinearGradient
          colors={[colors.background, colors.surface + '80', colors.background]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Faça login para ver seu perfil.
            </Text>
          </View>
        </LinearGradient>
      </Screen>
    );
  }

  return (
    <Screen padded={false} scroll={false} edges={['top', 'left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.background, colors.surface + '80', colors.background]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

        <ScrollView
          bounces
          overScrollMode="always"
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        >
          {/* Card de Perfil */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modernSectionCard}>
              <View style={styles.modernSectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialCommunityIcons name="account" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modernSectionTitle}>Perfil</Text>
              </View>

              <View style={styles.modernSectionContent}>
                <View style={styles.profileRow}>
                  <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                    <Pressable onLongPress={() => copyHandler(name, 'Nome')} style={styles.modernAvatar}>
                      <Text style={styles.avatarText}>{initial}</Text>
                      <View style={styles.avatarBadge}>
                        <MaterialCommunityIcons name="check" size={12} color={colors.surface} />
                      </View>
                    </Pressable>
                  </Animated.View>

                  <View style={styles.userInfo}>
                    <Text style={styles.modernUserName} numberOfLines={1} ellipsizeMode="tail">
                      {name}
                    </Text>
                    <Pressable onLongPress={() => email && copyHandler(email, 'E-mail')}>
                      <Text style={styles.modernUserEmail} numberOfLines={1} ellipsizeMode="middle">
                        {email}
                      </Text>
                    </Pressable>

                    {!!profile?.role && (
                      <View style={styles.modernRolePill}>
                        <View style={styles.roleIcon}>
                          <MaterialCommunityIcons
                            name={profile.role === 'admin' ? 'shield-crown' : 'account-circle'}
                            size={12}
                            color={colors.primary}
                          />
                        </View>
                        <Text style={styles.modernPillText}>{profile.role.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.actionGrid}>
              <Pressable style={styles.actionCard} onPress={() => setPasswordModalOpen(true)}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialCommunityIcons name="lock-reset" size={20} color={colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Alterar Senha</Text>
                <Text style={styles.actionSubtitle}>Trocar credenciais</Text>
              </Pressable>

              <Pressable style={styles.actionCard} onPress={handleSignOut}>
                <View style={[styles.actionIcon, { backgroundColor: colors.danger + '15' }]}>
                  <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
                </View>
                <Text style={styles.actionTitle}>Sair da Conta</Text>
                <Text style={styles.actionSubtitle}>Fazer logout</Text>
              </Pressable>
            </View>
          </Animated.View>

          {/* Aparência */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modernSectionCard}>
              <View style={styles.modernSectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialCommunityIcons name="palette" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modernSectionTitle}>Aparência</Text>
              </View>
              <View style={styles.modernSectionContent}>
                <ThemeToggle />
              </View>
            </View>
          </Animated.View>

          {/* Suporte & Ajuda */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modernSectionCard}>
              <View style={styles.modernSectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialCommunityIcons name="help-circle" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modernSectionTitle}>Suporte & Ajuda</Text>
              </View>
              <View style={styles.modernSectionContent}>
                <ListRow icon="bug-outline" title="Reportar Bug" subtitle="Relate problemas encontrados" onPress={reportBug} />
                {!!WHATSAPP_URL && (
                  <ListRow icon="whatsapp" title="Suporte via WhatsApp" subtitle="Fale conosco diretamente" onPress={() => openLink(WHATSAPP_URL)} />
                )}
                {!!PRIVACY_URL && (
                  <ListRow icon="shield-check" title="Política de Privacidade" subtitle="Como protegemos seus dados" onPress={() => openLink(PRIVACY_URL)} />
                )}
                {!!TERMS_URL && (
                  <ListRow icon="file-document-outline" title="Termos de Uso" subtitle="Condições de utilização" onPress={() => openLink(TERMS_URL)} />
                )}
                {!!RATE_URL && (
                  <ListRow icon="star-outline" title="Avaliar o App" subtitle="Deixe sua avaliação na loja" onPress={() => openLink(RATE_URL)} />
                )}
              </View>
            </View>
          </Animated.View>

          {/* Informações */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modernSectionCard}>
              <View style={styles.modernSectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <MaterialCommunityIcons name="information" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modernSectionTitle}>Informações</Text>
              </View>
              <View style={styles.modernSectionContent}>
                <View style={styles.modernMetaRow}>
                  <Text style={styles.modernMetaLabel}>Versão</Text>
                  <Text style={styles.modernMetaValue}>{version}</Text>
                </View>
                <View style={styles.modernMetaRow}>
                  <Text style={styles.modernMetaLabel}>Build</Text>
                  <Text style={styles.modernMetaValue}>{String(buildNumber)}</Text>
                </View>
                <View style={styles.modernMetaRow}>
                  <Text style={styles.modernMetaLabel}>Desenvolvido por</Text>
                  <Text style={styles.modernMetaValue}>{DEVELOPER}</Text>
                </View>
                <View style={styles.modernMetaRow}>
                  <Text style={styles.modernMetaLabel}>Plataforma</Text>
                  <Text style={styles.modernMetaValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
                </View>
                <View style={[styles.modernMetaRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modernMetaLabel}>Atualização</Text>
                  <Text style={styles.modernMetaValue}>{new Date().toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Zona de Perigo */}
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.modernDangerCard}>
              <View style={styles.modernDangerHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.danger + '15' }]}>
                  <MaterialCommunityIcons name="alert" size={18} color={colors.danger} />
                </View>
                <Text style={[styles.modernSectionTitle, { color: colors.danger }]}>Zona de Perigo</Text>
              </View>
              <View style={styles.modernSectionContent}>
                <ListRow
                  icon="account-cancel-outline"
                  title="Solicitar Exclusão de Conta"
                  subtitle="Esta ação é irreversível e removerá todos os dados"
                  destructive
                  onPress={() =>
                    Alert.alert(
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
                            const body = encodeURIComponent(
                              [
                                'Solicito a exclusão permanente da minha conta.',
                                '',
                                'Entendo que esta ação é irreversível e que todos os meus dados serão removidos.',
                                '',
                                `Conta: ${userInfo}`,
                                `Data da solicitação: ${new Date().toLocaleString()}`,
                              ].join('\n')
                            );
                            const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

                            try {
                              const canOpen = await Linking.canOpenURL(url);
                              if (canOpen) await Linking.openURL(url);
                              else copyHandler(SUPPORT_EMAIL, 'E-mail de suporte');
                            } catch {
                              Alert.alert('Erro', 'Não foi possível abrir o e-mail.');
                            }
                          },
                        },
                      ]
                    )
                  }
                />
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Modal de Troca de Senha */}
      <BottomSheet 
        open={passwordModalOpen} 
        onClose={() => {
          setPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }} 
        title="Alterar Senha"
      >
        <View style={{ gap: spacing.md, padding: spacing.md }}>
          <Input
            label="Senha atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Digite sua senha atual"
            secureTextEntry
            autoComplete="current-password"
            leftIcon={
              <MaterialCommunityIcons 
                name="lock-outline" 
                size={18} 
                color={colors.muted} 
              />
            }
          />
          
          <Input
            label="Nova senha"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Digite a nova senha (mín. 6 caracteres)"
            secureTextEntry
            autoComplete="new-password"
            leftIcon={
              <MaterialCommunityIcons 
                name="lock" 
                size={18} 
                color={colors.muted} 
              />
            }
          />
          
          <Input
            label="Confirmar nova senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Digite novamente a nova senha"
            secureTextEntry
            autoComplete="new-password"
            leftIcon={
              <MaterialCommunityIcons 
                name="lock-check" 
                size={18} 
                color={colors.muted} 
              />
            }
          />

          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              title="Alterar Senha"
              onPress={changePassword}
              loading={changingPassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              leftIcon={
                <MaterialCommunityIcons 
                  name="content-save" 
                  size={18} 
                  color={colors.surface} 
                />
              }
            />
            
            <Button
              title="Cancelar"
              variant="text"
              onPress={() => {
                setPasswordModalOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              disabled={changingPassword}
            />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}
