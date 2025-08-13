import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Keyboard, TouchableWithoutFeedback, Alert, TextInput } from 'react-native';
import Screen from '../components/Screen';

// UI kit
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export default function SignupScreen() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const pass2Ref = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: { alignSelf: 'stretch', paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl },
        header: { alignItems: 'center', gap: 4, marginBottom: spacing.sm },
        brand: { color: colors.muted, fontWeight: '700' },
        title: { ...typography.h1, textAlign: 'center' as const },
        card: { gap: spacing.md, alignSelf: 'stretch' },
        link: { color: colors.accent, fontWeight: '700', textAlign: 'center' as const },
        hint: { color: colors.muted, fontSize: 12, textAlign: 'center' as const },
      }),
    [colors, spacing, typography.h1]
  );

  function isValidEmail(v: string) { return /\S+@\S+\.\S+/.test(v); }

  async function handleSignup() {
    if (!email || !pass || !pass2) { h.warning(); return Alert.alert('Atenção', 'Preencha todos os campos.'); }
    if (!isValidEmail(email)) { h.warning(); return Alert.alert('Atenção', 'E-mail inválido.'); }
    if (pass.length < 6) { h.warning(); return Alert.alert('Atenção', 'A senha deve ter ao menos 6 caracteres.'); }
    if (pass !== pass2) { h.warning(); return Alert.alert('Atenção', 'As senhas não conferem.'); }

    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: undefined } });
      if (error) throw error;
      h.success();
      Alert.alert('Conta criada', 'Verifique seu e-mail para confirmar a conta.');
      nav.navigate('Login');
    } catch (e: any) {
      h.error();
      const msg: string = e?.message || 'Falha ao cadastrar';
      Alert.alert('Erro', /already|registered|exists/i.test(msg) ? 'Este e-mail já está cadastrado. Tente entrar.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>Bem-vindo</Text>
            <Text style={styles.title}>Criar conta</Text>
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
              placeholder="Crie uma senha"
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoComplete="password"
              rightIcon={<Text style={{ color: colors.muted, fontWeight: '800' }}>{showPass ? '🙈' : '👁️'}</Text>}
              onPressRightIcon={() => setShowPass(s => !s)}
              returnKeyType="next"
              onSubmitEditing={() => pass2Ref.current?.focus()}
              editable={!busy}
            />

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
            />

            <Button title="Cadastrar" onPress={handleSignup} loading={busy} full />
            <Text style={styles.hint}>Ao criar a conta, você concorda com os termos de uso e a política de privacidade.</Text>
            <Text style={styles.link} onPress={() => nav.navigate('Login')}>Já tem conta? Entrar</Text>
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
