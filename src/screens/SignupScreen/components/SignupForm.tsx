import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';

interface SignupFormProps {
  email: string;
  setEmail: (email: string) => void;
  pass: string;
  setPass: (pass: string) => void;
  pass2: string;
  setPass2: (pass2: string) => void;
  showPass: boolean;
  setShowPass: (show: boolean) => void;
  busy: boolean;
  error: string | null;
  emailTouched: boolean;
  setEmailTouched: (touched: boolean) => void;
  passwordTouched: boolean;
  setPasswordTouched: (touched: boolean) => void;
  onSubmit: () => void;
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
}

export default function SignupForm({
  email,
  setEmail,
  pass,
  setPass,
  pass2,
  setPass2,
  showPass,
  setShowPass,
  busy,
  error,
  emailTouched,
  setEmailTouched,
  passwordTouched,
  setPasswordTouched,
  onSubmit,
  emailError,
  passwordError,
  confirmPasswordError,
}: SignupFormProps) {
  const { spacing, colors } = useTheme();
  
  // Validações para cores dos ícones
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = pass.length >= 6;
  const isConfirmPasswordValid = pass2 === pass && pass2.length > 0;
  const isFormValid = isEmailValid && isPasswordValid && isConfirmPasswordValid;

  return (
    <View style={{ gap: spacing.lg }}>
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
        disabled={busy}
        leftIcon={
          <MaterialCommunityIcons 
            name="email-outline" 
            size={20} 
            color={!email ? colors.muted : isEmailValid ? colors.success : colors.danger}
          />
        }
      />

      <Input
        label="Senha"
        value={pass}
        onChangeText={setPass}
        onBlur={() => setPasswordTouched(true)}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry={!showPass}
        autoComplete="new-password"
        textContentType="newPassword"
        error={passwordTouched ? passwordError : undefined}
        disabled={busy}
        leftIcon={
          <MaterialCommunityIcons 
            name="lock-outline" 
            size={20} 
            color={!pass ? colors.muted : isPasswordValid ? colors.success : colors.danger}
          />
        }
        rightIcon={
          <MaterialCommunityIcons 
            name={showPass ? 'eye-off-outline' : 'eye-outline'} 
            size={20} 
            color={colors.muted}
          />
        }
        onPressRightIcon={() => setShowPass(!showPass)}
      />

      <Input
        label="Confirmar Senha"
        value={pass2}
        onChangeText={setPass2}
        placeholder="Repita sua senha"
        secureTextEntry={!showPass}
        autoComplete="new-password"
        textContentType="newPassword"
        error={confirmPasswordError}
        disabled={busy}
        leftIcon={
          <MaterialCommunityIcons 
            name="lock-check-outline" 
            size={20} 
            color={!pass2 ? colors.muted : isConfirmPasswordValid ? colors.success : colors.danger}
          />
        }
      />

      <Button
        title={busy ? 'Criando conta...' : 'Criar Conta'}
        onPress={onSubmit}
        loading={busy}
        disabled={!email.trim() || pass.length < 6 || pass !== pass2 || busy}
        variant={isFormValid ? 'primary' : 'tonal'}
        full
        leftIcon={
          busy ? (
            <ActivityIndicator size="small" color={isFormValid ? "white" : "#666"} />
          ) : (
            <MaterialCommunityIcons 
              name="account-plus" 
              size={18} 
              color={isFormValid ? "white" : "#666"} 
            />
          )
        }
      />
      
      {error && (
        <View style={{ 
          padding: spacing.md, 
          backgroundColor: 'rgba(224, 49, 49, 0.1)', 
          borderRadius: 8 
        }}>
          <Text style={{ color: '#E03131', textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}