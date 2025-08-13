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
} from 'react-native';
import Screen from '../components/Screen';

// Imports DIRETOS do UI kit premium
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
        switch: { color: colors.accent, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
        muted: { color: colors.muted, textAlign: 'center' },
        brand: { color: colors.muted, fontWeight: '700', marginBottom: 4 },
      }),
    [colors, spacing]
  );

  function isValidEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function handleAuth() {
    if (!email || !pass) {
      h.warning();
      return Alert.alert('Atenção', 'Preencha e-mail e senha.');
    }
    if (!isValidEmail(email)) {
      h.warning();
      return Alert.alert('Atenção', 'E-mail inválido.');
    }
    if (pass.length < 6) {
      h.warning();
      return Alert.alert('Atenção', 'A senha deve ter ao menos 6 caracteres.');
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: undefined } });
        if (error) throw error;
      }
      h.success();
      // Navegação pós-login é feita pelo AuthProvider (onAuthStateChange)
    } catch (e: any) {
      h.error();
      const msg: string = e?.message || 'Falha na autenticação';
      const friendly =
        /already|registered|exists/i.test(msg)
          ? 'Este e-mail já está cadastrado.'
          : /invalid login credentials/i.test(msg)
          ? 'E-mail ou senha incorretos.'
          : msg;
      Alert.alert('Erro', friendly);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (!email || !isValidEmail(email)) {
      h.warning();
      return Alert.alert('Recuperar senha', 'Informe um e-mail válido no campo acima.');
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Recuperar senha', 'Se o e-mail existir, enviamos instruções para redefinição.');
    } catch (e: any) {
      Alert.alert('Recuperar senha', e?.message || 'Não foi possível enviar o e-mail agora.');
    }
  }

  return (
    <Screen padded>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.wrapper}>
          <Text style={styles.brand}>Bem-vindo</Text>
          <Text style={typography.h1}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>

          <Card padding="md" variant="filled" elevationLevel={2} style={{ gap: spacing.sm }}>
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
              onSubmitEditing={handleAuth}
              editable={!busy}
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title={mode === 'login' ? 'Entrar' : 'Cadastrar'}
                onPress={handleAuth}
                loading={busy}
                full
              />
            </View>

            <Pressable disabled={busy} onPress={handleReset}>
              <Text style={styles.switch}>Esqueci a senha</Text>
            </Pressable>

            <Pressable disabled={busy} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.switch}>
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
              </Text>
            </Pressable>

            {mode === 'signup' && (
              <Text style={styles.muted}>
                Dica: se aparecer “e-mail já cadastrado”, toque em **Entrar**.
              </Text>
            )}
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
