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

export default function PasswordResetScreen() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<TextInput>(null);

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
        helper: { color: colors.muted, textAlign: 'center' as const },
        link: { color: colors.accent, fontWeight: '700', textAlign: 'center' as const },
      }),
    [colors, spacing, typography.h1]
  );

  function isValidEmail(v: string) { return /\S+@\S+\.\S+/.test(v); }

  async function handleReset() {
    if (!email || !isValidEmail(email)) { h.warning(); return Alert.alert('Recuperar senha', 'Informe um e-mail válido.'); }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      h.success();
      Alert.alert('Recuperar senha', 'Se o e-mail existir, enviamos instruções para redefinição.');
      nav.navigate('Login');
    } catch (e: any) {
      h.error();
      Alert.alert('Erro', e?.message || 'Não foi possível enviar o e-mail agora.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>Conta</Text>
            <Text style={styles.title}>Recuperar senha</Text>
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
              returnKeyType="send"
              onSubmitEditing={handleReset}
              editable={!busy}
            />

            <Button title="Enviar link de recuperação" onPress={handleReset} loading={busy} full />
            <Text style={styles.helper}>Você receberá um link para definir uma nova senha.</Text>
            <Text style={styles.link} onPress={() => nav.navigate('Login')}>Voltar para o login</Text>
          </Card>
        </View>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
