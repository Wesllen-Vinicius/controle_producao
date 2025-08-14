// screens/SignupScreen.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
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
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

/* ===== extra do app.json (links/redirect) ===== */
function getExtra<T = any>(key: string, fallback?: T): T | undefined {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return (extra?.[key] as T) ?? fallback;
}
const TERMS_URL    = getExtra<string>('termsUrl');
const PRIVACY_URL  = getExtra<string>('privacyUrl');
const SIGNUP_REDIRECT_URL = getExtra<string>('signupRedirectUrl');

export default function SignupScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passRef  = useRef<TextInput>(null);
  const pass2Ref = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius } = useTheme();

  // animações (entrada + shake em erro)
  const intro  = useRef(new Animated.Value(0)).current;
  const shake  = useRef(new Animated.Value(0)).current;
  const cardScale   = intro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const cardOpacity = intro;
  const translateX  = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-6, 0, 6] });

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

  // largura máxima elegante e centrada (coeso com Login)
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
        hint: { color: colors.muted, fontSize: 12, textAlign: 'center' as const },
        link: { color: colors.accent, fontWeight: '700', textAlign: 'center' as const },
        inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        errorText: { color: '#DC2626', fontSize: 12, marginTop: -4 },
        strengthWrap: {
          gap: 6,
          padding: spacing.sm,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
        barBG: {
          height: 8,
          borderRadius: 999,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          overflow: 'hidden',
        },
      }),
    [colors, spacing, typography.h1, radius, contentWidth]
  );

  // ===== validação
  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);

  // força da senha (0..3)
  const passScore = useMemo(() => {
    let s = 0;
    if (pass.length >= 6) s++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s++;
    if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) s++;
    return s;
  }, [pass]);

  const scoreLabel = ['Muito fraca', 'Fraca', 'Boa', 'Forte'][passScore];
  const scorePct   = [0.25, 0.45, 0.7, 1][passScore];
  const scoreColor = ['#DC2626', '#F59E0B', '#3B82F6', '#22C55E'][passScore];

  const emailOk = isValidEmail(email);
  const passOk  = pass.length >= 6;
  const matchOk = pass.length > 0 && pass === pass2;

  const formOk  = emailOk && passOk && matchOk && !busy;

  useEffect(() => { if (error) setError(null); }, [email, pass, pass2, error]);

  async function handleSignup() {
    if (!formOk) {
      h.warning();
      setError(!emailOk ? 'E-mail inválido.' : !passOk ? 'A senha precisa ter ao menos 6 caracteres.' : !matchOk ? 'As senhas não conferem.' : 'Preencha os campos.');
      doShake();
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: SIGNUP_REDIRECT_URL ? { emailRedirectTo: SIGNUP_REDIRECT_URL } : undefined,
      });
      if (error) throw error;
      h.success();
      Alert.alert('Conta criada', 'Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.');
      nav.navigate('Login');
    } catch (e: any) {
      h.error();
      const msg: string = e?.message || 'Falha ao cadastrar';
      const friendly = /already|registered|exists/i.test(msg)
        ? 'Este e-mail já está cadastrado. Tente entrar.'
        : msg;
      setError(friendly);
      doShake();
    } finally {
      setBusy(false);
    }
  }

  const openLink = useCallback(async (url?: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (!can) return Alert.alert('Abrir link', 'Não foi possível abrir o link.');
    Linking.openURL(url).catch(() => Alert.alert('Abrir link', 'Não foi possível abrir o link.'));
  }, []);

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
                  <Text style={styles.brand}>Bem-vindo</Text>
                  <Text style={styles.title}>Criar conta</Text>
                </View>

                <Animated.View style={{ transform: [{ translateX }], opacity: cardOpacity }}>
                  <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <Card padding="md" variant="filled" elevationLevel={2} style={styles.card}>
                      <Input
                        ref={emailRef}
                        label="E-mail"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="voce@exemplo.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        returnKeyType="next"
                        onSubmitEditing={() => passRef.current?.focus()}
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
                      {!emailOk && email.length > 0 && (
                        <Text style={styles.errorText}>Informe um e-mail válido.</Text>
                      )}

                      <Input
                        ref={passRef}
                        label="Senha"
                        value={pass}
                        onChangeText={setPass}
                        placeholder="Crie uma senha"
                        secureTextEntry={!showPass}
                        autoCapitalize="none"
                        autoComplete="password"
                        rightIcon={
                          <MaterialCommunityIcons
                            name={showPass ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.muted}
                          />
                        }
                        onPressRightIcon={() => setShowPass((s) => !s)}
                        returnKeyType="next"
                        onSubmitEditing={() => pass2Ref.current?.focus()}
                        editable={!busy}
                      />

                      {/* Medidor de força da senha */}
                      {pass.length > 0 && (
                        <View style={styles.strengthWrap}>
                          <View style={styles.barBG}>
                            <View style={{ width: `${Math.round(scorePct * 100)}%`, height: '100%', backgroundColor: scoreColor }} />
                          </View>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>
                            Força da senha: <Text style={{ color: colors.text, fontWeight: '800' }}>{scoreLabel}</Text>
                          </Text>
                        </View>
                      )}

                      <Input
                        ref={pass2Ref}
                        label="Confirmar senha"
                        value={pass2}
                        onChangeText={setPass2}
                        placeholder="Repita a senha"
                        secureTextEntry={!showPass}
                        autoCapitalize="none"
                        autoComplete="password"
                        returnKeyType="go"
                        onSubmitEditing={handleSignup}
                        editable={!busy}
                        rightIcon={
                          pass2.length > 0 ? (
                            <MaterialCommunityIcons
                              name={matchOk ? 'check-circle' : 'alert-circle'}
                              size={18}
                              color={matchOk ? '#22C55E' : '#DC2626'}
                            />
                          ) : undefined
                        }
                      />
                      {pass2.length > 0 && !matchOk && (
                        <Text style={styles.errorText}>As senhas não conferem.</Text>
                      )}

                      {!!error && <Text style={styles.errorText}>{error}</Text>}

                      <View style={{ gap: 8 }}>
                        <Text style={styles.hint}>
                          Ao criar a conta, você concorda com os{' '}
                          <Text style={styles.link} onPress={() => openLink(TERMS_URL)}>Termos de Uso</Text>
                          {' '}e com a{' '}
                          <Text style={styles.link} onPress={() => openLink(PRIVACY_URL)}>Política de Privacidade</Text>.
                        </Text>
                      </View>

                      <Button
                        title={busy ? 'Criando…' : 'Cadastrar'}
                        onPress={handleSignup}
                        loading={busy}
                        disabled={!formOk}
                        full
                      />

                      <Pressable onPress={() => nav.navigate('Login')}>
                        <Text style={styles.link}>Já tem conta? Entrar</Text>
                      </Pressable>
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
