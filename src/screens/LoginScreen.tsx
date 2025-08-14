// screens/LoginScreen.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Pressable,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
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

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius } = useTheme();

  // animações
  const intro = useRef(new Animated.Value(0)).current;          // 0..1 (entrada da tela)
  const shake = useRef(new Animated.Value(0)).current;          // -1..1 (erro)
  const cardScale = intro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const cardOpacity = intro;

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

  const translateX = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-6, 0, 6],
  });

  // largura máxima elegante e centrada
  const contentMax = 520;
  const contentWidth = Math.min(width - spacing.md * 2, contentMax);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screenPad: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          flex: 1,
        },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        wrap: { width: contentWidth, alignSelf: 'center' },
        header: { alignItems: 'center', gap: 6, marginBottom: spacing.md },
        brandBadge: {
          width: 56,
          height: 56,
          borderRadius: 56,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.line,
        },
        brandInitial: { fontWeight: '900', fontSize: 20, color: colors.text },
        brand: { color: colors.muted, fontWeight: '700' },
        title: { ...(typography.h1 as any), textAlign: 'center' },
        card: { gap: spacing.md, alignSelf: 'stretch' },
        linksWrap: { gap: spacing.xs, alignItems: 'center', marginTop: spacing.sm },
        link: { color: colors.accent, fontWeight: '700' },
        hint: { color: colors.muted, fontSize: 12, textAlign: 'center' as const },
        inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        inlineLink: { color: colors.accent, fontWeight: '700' },
        errorText: { color: '#DC2626', fontSize: 12, marginTop: -4 },
        helper: { color: colors.muted, fontSize: 12 },
        divider: { height: 1, backgroundColor: colors.line, opacity: 0.6, marginVertical: spacing.sm },
        tips: {
          padding: spacing.md,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
        },
      }),
    [colors, spacing, typography.h1, radius, contentWidth]
  );

  // ===== validação suave =====
  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const emailOk = isValidEmail(email);
  const passOk = pass.length >= 4;
  const formOk = emailOk && passOk && !busy;

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // limpa erro ao digitar
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, pass]);

  async function handleLogin() {
    if (!email || !pass) {
      h.warning();
      setError('Preencha e-mail e senha.');
      doShake();
      return;
    }
    if (!emailOk) {
      h.warning();
      setError('E-mail inválido.');
      doShake();
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (err) throw err;
      h.success();
      // sucesso — opcional: micro feedback
    } catch (e: any) {
      h.error();
      const msg: string = e?.message || 'Falha na autenticação';
      const friendly = /invalid login credentials/i.test(msg)
        ? 'E-mail ou senha incorretos.'
        : msg;
      setError(friendly);
      doShake();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.screenPad}>
            <View style={styles.center}>
              <View style={styles.wrap}>
                {/* Cabeçalho/brand com micro-delight */}
                <View style={styles.header}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandInitial}>CP</Text>
                  </View>
                  <Text style={styles.brand}>Bem-vindo</Text>
                  <Text style={styles.title}>Entrar</Text>
                </View>

                <Animated.View style={{ transform: [{ translateX }], opacity: cardOpacity, }}>
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
                        placeholder="Sua senha"
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
                        returnKeyType="go"
                        onSubmitEditing={handleLogin}
                        editable={!busy}
                      />
                      {pass.length > 0 && !passOk && (
                        <Text style={styles.helper}>Use ao menos 4 caracteres.</Text>
                      )}

                      {!!error && <Text style={styles.errorText}>{error}</Text>}

                      <View style={styles.inlineRow}>
                        <Pressable disabled={busy} onPress={() => nav.navigate('PasswordReset')}>
                          <Text style={styles.inlineLink}>Esqueci a senha</Text>
                        </Pressable>
                        <Pressable disabled={busy} onPress={() => nav.navigate('Signup')}>
                          <Text style={styles.inlineLink}>Criar conta</Text>
                        </Pressable>
                      </View>

                      <Button
                        title={busy ? 'Entrando…' : 'Entrar'}
                        onPress={handleLogin}
                        loading={busy}
                        disabled={!formOk}
                        full
                      />

                      <View style={styles.divider} />

                      {/* Dicas sutis (acessibilidade/UX) */}
                      <View style={styles.tips}>
                        <Text style={styles.hint}>
                          Dica: toque no ícone de olho para visualizar a senha. Você pode colar suas credenciais
                          normalmente — nós não armazenamos nada localmente.
                        </Text>
                      </View>
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
