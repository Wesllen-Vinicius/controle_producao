// src/screens/Login/components/LoginForm.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useTheme } from '../../../state/ThemeProvider';
import { LoginRefs, ValidationState } from '../types';

type Props = {
  state: {
    email: string;
    pass: string;
    showPass: boolean;
    busy: boolean;
    error: string | null;
    rememberMe: boolean;
    biometricSupported: boolean;
    savedCredentials: { email: string; pass: string } | null;
  };
  setState: {
    setShowPass: (value: boolean) => void;
    setRememberMe: (value: boolean) => void;
  };
  refs: LoginRefs; // Corrigido para usar o tipo importado
  validation: ValidationState;
  handlers: {
    handleEmailChange: (text: string) => void;
    handlePasswordChange: (text: string) => void;
    handleLogin: () => void;
    handleBiometricAuth: () => void;
    navigateTo: (screen: string) => void;
  };
};

const LoginForm = forwardRef<View, Props>(
  ({ state, setState, refs, validation, handlers }, _ref) => {
    const { colors, radius } = useTheme();

    const styles = StyleSheet.create({
      inputContainer: { gap: 16 },
      errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderWidth: 1,
        borderRadius: radius.md,
        padding: 12,
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      errorText: {
        color: colors.danger,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
      },
      rememberContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
      },
      rememberText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: colors.text },
      buttonContainer: { marginTop: 8 },
      biometricButton: { alignItems: 'center', marginTop: 16 },
      biometricIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30',
      },
      footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        paddingTop: 16,
      },
      link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    });

    return (
      <View>
        <View style={styles.inputContainer}>
          <Input
            ref={refs.emailRef}
            label="E-mail"
            value={state.email}
            onChangeText={handlers.handleEmailChange}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => refs.passRef.current?.focus()}
            editable={!state.busy}
            error={!validation.emailValid ? 'E-mail inválido' : undefined}
            leftIcon={
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color={
                  !state.email
                    ? colors.muted
                    : validation.emailValid
                      ? colors.success
                      : colors.danger
                }
              />
            }
          />
          <Input
            ref={refs.passRef}
            label="Senha"
            value={state.pass}
            onChangeText={handlers.handlePasswordChange}
            placeholder="Sua senha"
            secureTextEntry={!state.showPass}
            autoComplete="current-password"
            maxLength={128}
            error={
              !validation.passwordValid ? 'A senha deve ter pelo menos 6 caracteres' : undefined
            }
            leftIcon={
              <MaterialCommunityIcons
                name="lock-outline"
                size={20}
                color={
                  !state.pass
                    ? colors.muted
                    : validation.passwordValid
                      ? colors.success
                      : colors.danger
                }
              />
            }
            rightIcon={
              <MaterialCommunityIcons
                name={state.showPass ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.muted}
              />
            }
            onPressRightIcon={() => setState.setShowPass(!state.showPass)}
            returnKeyType="go"
            onSubmitEditing={handlers.handleLogin}
            editable={!state.busy}
          />
        </View>
        <View style={styles.rememberContainer}>
          <Switch
            value={state.rememberMe}
            onValueChange={setState.setRememberMe}
            trackColor={{ false: colors.line, true: colors.primary + '80' }}
            thumbColor={state.rememberMe ? colors.primary : '#ffffff'}
            disabled={state.busy}
          />
          <Pressable
            onPress={() => setState.setRememberMe(!state.rememberMe)}
            disabled={state.busy}
          >
            <Text style={styles.rememberText}>Lembrar de mim</Text>
          </Pressable>
        </View>
        {state.error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color={colors.danger}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <Button
            title={state.busy ? 'Entrando...' : 'Entrar'}
            onPress={handlers.handleLogin}
            loading={state.busy}
            disabled={!state.email || !state.pass || state.busy}
            variant={validation.formOk ? 'primary' : 'tonal'}
            full
            leftIcon={
              state.busy ? (
                <ActivityIndicator size="small" color={validation.formOk ? 'white' : '#666'} />
              ) : (
                <MaterialCommunityIcons
                  name="login"
                  size={18}
                  color={validation.formOk ? 'white' : '#666'}
                />
              )
            }
          />
        </View>
        {state.biometricSupported && state.savedCredentials && (
          <View style={styles.biometricButton}>
            <Pressable
              onPress={handlers.handleBiometricAuth}
              disabled={state.busy}
              style={({ pressed }) => [
                styles.biometricIcon,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <MaterialCommunityIcons name="fingerprint" size={24} color={colors.primary} />
            </Pressable>
            <Text style={{ fontSize: 12, color: colors.muted }}>Entrar com biometria</Text>
          </View>
        )}
        <View style={styles.footer}>
          <Pressable disabled={state.busy} onPress={() => handlers.navigateTo('PasswordReset')}>
            <Text style={styles.link}>Esqueci a senha</Text>
          </Pressable>
          <Pressable disabled={state.busy} onPress={() => handlers.navigateTo('Signup')}>
            <Text style={styles.link}>Criar conta</Text>
          </Pressable>
        </View>
      </View>
    );
  }
);

LoginForm.displayName = 'LoginForm';

export default LoginForm;
