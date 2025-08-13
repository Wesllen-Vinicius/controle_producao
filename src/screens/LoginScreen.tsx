import React, { useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import Screen from '../components/Screen';

// UI kit
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
  const { colors, spacing, typography } = useTheme();

  // largura máx. do conteúdo (fica centralizado e com respiro lateral)
  const contentMax = 520; // confortável para telas pequenas e médias
  const contentWidth = Math.min(width - spacing.md * 2, contentMax);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screenPad: {
          // fallback: garante respiro lateral mesmo se Screen mudar no futuro
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
          flex: 1,
        },
        center: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        wrap: {
          width: contentWidth,
          alignSelf: 'center',
        },
        header: { alignItems: 'center', gap: 4, marginBottom: spacing.md },
        brand: { color: colors.muted, fontWeight: '700' },
        title: { ...typography.h1, textAlign: 'center' as const },
        card: { gap: spacing.md, alignSelf: 'stretch' },
        linksWrap: { gap: spacing.xs, alignItems: 'center', marginTop: spacing.sm },
        link: { color: colors.accent, fontWeight: '700' },
        hint: { color: colors.muted, fontSize: 12, textAlign: 'center' as const },
      }),
    [colors, spacing, typography.h1, contentWidth]
  );

  function isValidEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
    }

  async function handleLogin() {
    if (!email || !pass) { h.warning(); return Alert.alert('Atenção', 'Preencha e-mail e senha.'); }
    if (!isValidEmail(email)) { h.warning(); return Alert.alert('Atenção', 'E-mail inválido.'); }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      h.success();
    } catch (e: any) {
      h.error();
      const msg: string = e?.message || 'Falha na autenticação';
      Alert.alert('Erro', /invalid login credentials/i.test(msg) ? 'E-mail ou senha incorretos.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.screenPad}>
          <View style={styles.center}>
            <View style={styles.wrap}>
              <View style={styles.header}>
                <Text style={styles.brand}>Bem-vindo</Text>
                <Text style={styles.title}>Entrar</Text>
              </View>

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
                />

                <Input
                  ref={passRef}
                  label="Senha"
                  value={pass}
                  onChangeText={setPass}
                  placeholder="Sua senha"
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoComplete="password"
                  rightIcon={<Text style={{ color: colors.muted, fontWeight: '800' }}>{showPass ? '🙈' : '👁️'}</Text>}
                  onPressRightIcon={() => setShowPass(s => !s)}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  editable={!busy}
                />

                <Button title="Entrar" onPress={handleLogin} loading={busy} full />

                <View style={styles.linksWrap}>
                  <Pressable disabled={busy} onPress={() => nav.navigate('PasswordReset')}>
                    <Text style={styles.link}>Esqueci a senha</Text>
                  </Pressable>
                  <Text style={styles.hint}>— ou —</Text>
                  <Pressable disabled={busy} onPress={() => nav.navigate('Signup')}>
                    <Text style={styles.link}>Criar uma conta</Text>
                  </Pressable>
                </View>
              </Card>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
