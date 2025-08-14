// screens/PasswordResetScreen.tsx
import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Constants from 'expo-constants';

import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

/* ===== extras do app.json (redirect, suporte) ===== */
function getExtra<T = any>(key: string, fallback?: T): T | undefined {
  const extra =
    (Constants.expoConfig as any)?.extra ??
    (Constants.manifest as any)?.extra ??
    {};
  return (extra?.[key] as T) ?? fallback;
}
const RESET_REDIRECT_URL = getExtra<string>('resetRedirectUrl');
const SUPPORT_EMAIL = getExtra<string>('supportEmail', 'suporte@exemplo.com');

/* ===== componente ===== */
export default function PasswordResetScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seg. p/ reenviar
  const emailRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius } = useTheme();

  // animações (entrada + shake em erro)
  const intro = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const cardScale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const cardOpacity = intro;
  const translateX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-6, 0, 6] });

  useEffect(() => {
    Animated.spring(intro, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 140,
      damping: 16,
      mass: 0.7,
    }).start();
  }, [intro]);

  const doShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  // responsivo: largura máxima elegante
  const contentMax = 520;
  const contentWidth = Math.min(width - spacing.md * 2, contentMax);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          alignSelf: 'stretch',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          flex: 1,
        },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        wrap: { width: contentWidth, alignSelf: 'center' },
        header: { alignItems: 'center', gap: 6, marginBottom: spacing.md },
        brandBadge: {
          width: 56, height: 56, borderRadius: 56,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line,
        },
        brandInitial: { fontWeight: '900', fontSize: 20, color: colors.text },
        brand: { color: colors.muted, fontWeight: '700' },
        title: { ...(typography.h1 as any), textAlign: 'center' },
        card: { gap: spacing.md, alignSelf: 'stretch' },
        helper: { color: colors.muted, textAlign: 'center' as const, fontSize: 12 },
        link: { color: colors.accent, fontWeight: '700', textAlign: 'center' as const },
        successIconWrap: {
          width: 64, height: 64, borderRadius: 64,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
          marginBottom: spacing.sm,
        },
        pill: {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.line,
          borderWidth: 1,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: 999,
          alignSelf: 'center',
        },
        pillText: { color: colors.text, fontWeight: '800' },
        row: { flexDirection: 'row', gap: spacing.sm },
        btnHalf: { flex: 1 },
        tips: {
          gap: 6,
          padding: spacing.sm,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
      }),
    [colors, spacing, typography.h1, radius, contentWidth]
  );

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const emailOk = isValidEmail(email);

  // cooldown p/ reenviar
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const maskedEmail = useMemo(() => {
    if (!emailOk) return '';
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const mask = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user.slice(-1);
    return `${mask}@${domain}`;
  }, [email, emailOk]);

  const openMailApp = useCallback(async () => {
    // não há URL universal p/ abrir inbox; usamos mailto: como fallback
    const url = 'mailto:';
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Abrir e-mail', 'Não foi possível abrir o app de e-mail.');
    Linking.openURL(url).catch(() => Alert.alert('Abrir e-mail', 'Não foi possível abrir o app de e-mail.'));
  }, []);

  async function handleReset() {
    if (!emailOk) {
      h.warning();
      doShake();
      return Alert.alert('Recuperar senha', 'Informe um e-mail válido.');
    }

    setBusy(true);
    try {
      const opts: any = RESET_REDIRECT_URL ? { redirectTo: RESET_REDIRECT_URL } : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), opts);
      if (error) throw error;

      h.success();
      setSent(true);
      setCooldown(30); // 30s para reenviar
    } catch (e: any) {
      h.error();
      const msg = e?.message || 'Não foi possível enviar o e-mail agora.';
      Alert.alert('Erro', msg);
      doShake();
    } finally {
      setBusy(false);
    }
  }

  const resend = useCallback(() => {
    if (cooldown > 0 || busy) return;
    handleReset();
  }, [cooldown, busy, email]);

  return (
    <Screen padded>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.page}>
            <View style={styles.center}>
              <View style={styles.wrap}>
                <View style={styles.header}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandInitial}>CP</Text>
                  </View>
                  <Text style={styles.brand}>Conta</Text>
                  <Text style={styles.title}>Recuperar senha</Text>
                </View>

                <Animated.View style={{ transform: [{ translateX }], opacity: cardOpacity }}>
                  <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <Card padding="md" variant="filled" elevationLevel={2} style={styles.card}>
                      {!sent ? (
                        <>
                          <Input
                            ref={emailRef}
                            label="E-mail"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="voce@exemplo.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            returnKeyType="send"
                            onSubmitEditing={handleReset}
                            editable={!busy}
                            rightIcon={
                              email.length > 0 ? (
                                <MaterialCommunityIcons
                                  name={emailOk ? 'check-circle' : 'alert-circle'}
                                  size={18}
                                  color={emailOk ? '#22C55E' : '#DC2626'}
                                />
                              ) : undefined
                            }
                          />

                          <View style={styles.tips}>
                            <Text style={{ color: colors.muted, fontSize: 12 }}>
                              Enviaremos um link para você redefinir sua senha. Verifique também a caixa de spam.
                            </Text>
                          </View>

                          <Button
                            title={busy ? 'Enviando…' : 'Enviar link de recuperação'}
                            onPress={handleReset}
                            loading={busy}
                            disabled={!emailOk || busy}
                            full
                          />

                          <Pressable onPress={() => nav.navigate('Login')}>
                            <Text style={styles.link}>Voltar para o login</Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <View style={styles.successIconWrap}>
                            <MaterialCommunityIcons name="email-check-outline" size={28} color={colors.text} />
                          </View>

                          <Text style={{ ...(typography.h2 as any), textAlign: 'center' }}>
                            Verifique seu e-mail
                          </Text>
                          <View style={{ alignItems: 'center' }}>
                            <View style={styles.pill}>
                              <Text style={styles.pillText}>{maskedEmail || email}</Text>
                            </View>
                          </View>
                          <Text style={styles.helper}>
                            Enviamos um link para redefinir sua senha. Abra seu e-mail e siga as instruções.
                          </Text>

                          <View style={styles.row}>
                            <View style={styles.btnHalf}>
                              <Button title="Abrir app de e-mail" variant="tonal" onPress={openMailApp} />
                            </View>
                            <View style={styles.btnHalf}>
                              <Button
                                title={cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar'}
                                onPress={resend}
                                disabled={cooldown > 0 || busy}
                              />
                            </View>
                          </View>

                          <Pressable onPress={() => setSent(false)}>
                            <Text style={styles.link}>Trocar e-mail</Text>
                          </Pressable>

                          <View style={{ height: 1, backgroundColor: colors.line, opacity: 0.6 }} />

                          <Text style={styles.helper}>
                            Precisa de ajuda? Escreva para {SUPPORT_EMAIL}.
                          </Text>
                        </>
                      )}
                    </Card>
                  </Animated.View>
                </Animated.View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Screen>
  );
}
