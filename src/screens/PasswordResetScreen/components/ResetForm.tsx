import React from 'react';
import { View, Text } from 'react-native';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';

interface ResetFormProps {
  email: string;
  setEmail: (email: string) => void;
  busy: boolean;
  error: string | null;
  emailTouched: boolean;
  setEmailTouched: (touched: boolean) => void;
  onSubmit: () => void;
  emailError?: string;
  resetSent: boolean;
}

export default function ResetForm({
  email,
  setEmail,
  busy,
  error,
  emailTouched,
  setEmailTouched,
  onSubmit,
  emailError,
  resetSent,
}: ResetFormProps) {
  const { colors, spacing, typography } = useTheme();

  if (resetSent) {
    return (
      <View style={{ gap: spacing.lg, alignItems: 'center' }}>
        <View
          style={{
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.xl,
            backgroundColor: colors.successBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.success,
          }}
        >
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={[typography.h2, { color: colors.success, textAlign: 'center' }]}>
            E-mail Enviado!
          </Text>
          <Text style={[typography.body, { color: colors.text, textAlign: 'center' }]}>
            Verifique sua caixa de entrada em{'\n'}
            <Text style={{ fontWeight: '600' }}>{email}</Text>
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.muted,
                textAlign: 'center',
                fontSize: 14,
                marginTop: spacing.sm,
              },
            ]}
          >
            Se não receber o e-mail em alguns minutos, verifique sua pasta de spam ou tente
            novamente.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.md, alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>🔐</Text>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.h2, { color: colors.text, textAlign: 'center' }]}>
            Esqueceu sua senha?
          </Text>
          <Text style={[typography.body, { color: colors.muted, textAlign: 'center' }]}>
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </Text>
        </View>
      </View>

      <Input
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
        placeholder="seu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={emailTouched ? emailError : undefined}
        editable={!busy}
      />

      <Button
        title="Enviar Link de Recuperação"
        onPress={onSubmit}
        loading={busy}
        disabled={busy || !email.trim()}
        full
      />

      {error && (
        <View
          style={{
            padding: spacing.md,
            backgroundColor: colors.dangerBackground,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.danger,
          }}
        >
          <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
