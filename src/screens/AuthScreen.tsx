import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert, Pressable } from 'react-native';
import Screen from '../components/Screen';
import { Card, Input, Button } from '../components/ui';
import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        center: { flex: 1, justifyContent: 'center', gap: spacing.md },
        switch: { color: colors.accent, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm },
        muted: { color: colors.muted, textAlign: 'center' },
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
        // Assumindo que a verificação por e-mail está DESATIVADA nas policies do seu projeto
        const { error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: undefined } });
        if (error) throw error;
      }
      h.success();
      // A navegação pós-login é cuidada pelo AuthProvider (onAuthStateChange)
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

  return (
    <Screen>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.center}>
          <Text style={typography.h1}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</Text>

          <Card style={{ gap: spacing.sm }}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              value={pass}
              onChangeText={setPass}
              placeholder="Senha"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <Button title={mode === 'login' ? 'Entrar' : 'Cadastrar'} loading={busy} onPress={handleAuth} />

            <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.switch}>
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
              </Text>
            </Pressable>

            {mode === 'signup' && (
              <Text style={styles.muted}>
                Dica: se aparecer “e-mail já cadastrado”, use **Entrar**.
              </Text>
            )}
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
