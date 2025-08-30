import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../state/ThemeProvider';

export default function PasswordResetScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const isValidPassword = (password: string) => {
    return password.length >= 6;
  };

  // Primeiro passo: verificar se o email existe
  const handleEmailCheck = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Erro', 'Por favor, digite seu e-mail');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Erro', 'Por favor, digite um e-mail válido');
      return;
    }

    setLoading(true);

    try {
      // Tentativa de login com uma senha temporária para verificar se o email existe
      // Se o email não existir, retornará erro específico
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: 'temp_password_to_check_if_email_exists',
      });

      if (error?.message.includes('Invalid login credentials')) {
        // Email existe, mas senha está errada - isso é o que queremos
        setStep('password');
      } else if (error?.message.includes('Email not confirmed')) {
        // Email existe mas não está confirmado
        Alert.alert(
          'Email não confirmado',
          'Este email existe mas precisa ser confirmado. Entre em contato com o administrador.'
        );
      } else if (error) {
        // Outros erros - assumimos que o email não existe
        Alert.alert(
          'Email não encontrado',
          'Este email não está cadastrado em nossa base de dados. Verifique o email ou entre em contato com o administrador.'
        );
      } else {
        // Login realizado com sucesso (não deveria acontecer com senha temporária)
        await supabase.auth.signOut();
        setStep('password');
      }
    } catch {
      Alert.alert('Erro', 'Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Segundo passo: fazer login e alterar senha
  const handlePasswordReset = useCallback(async () => {
    if (!newPassword.trim()) {
      Alert.alert('Erro', 'Por favor, digite a nova senha');
      return;
    }

    if (!isValidPassword(newPassword)) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não conferem');
      return;
    }

    setLoading(true);

    try {
      // Primeiro, tentar fazer login com as credenciais administrativas ou uma senha padrão
      // Em um ambiente real, você precisaria de um endpoint administrativo para isso

      Alert.alert(
        'Funcionalidade Indisponível',
        'Para redefinir sua senha, entre em contato com o administrador do sistema. ' +
          'Informe o email: ' +
          email +
          ' e solicite uma nova senha.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível alterar a senha. Entre em contato com o administrador.'
      );
    } finally {
      setLoading(false);
    }
  }, [email, newPassword, confirmPassword, navigation]);

  const renderEmailStep = () => (
    <View style={styles(theme).content}>
      <Text style={styles(theme).emoji}>🔐</Text>
      <Text style={styles(theme).title}>Esqueceu sua senha?</Text>
      <Text style={styles(theme).subtitle}>
        Digite seu e-mail para verificarmos se ele está cadastrado no sistema.
      </Text>

      <View style={styles(theme).inputContainer}>
        <Text style={styles(theme).label}>E-mail</Text>
        <TextInput
          style={styles(theme).input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          placeholderTextColor={theme.colors.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles(theme).button, (!email.trim() || loading) && styles(theme).buttonDisabled]}
        onPress={handleEmailCheck}
        disabled={!email.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles(theme).buttonText}>Verificar E-mail</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles(theme).backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles(theme).backButtonText}>Voltar ao Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles(theme).content}>
      <Text style={styles(theme).emoji}>🔒</Text>
      <Text style={styles(theme).title}>Redefinir Senha</Text>
      <Text style={styles(theme).subtitle}>
        E-mail confirmado: <Text style={styles(theme).boldText}>{email}</Text>
        {'\n'}
        Digite sua nova senha abaixo.
      </Text>

      <View style={styles(theme).inputContainer}>
        <Text style={styles(theme).label}>Nova Senha</Text>
        <TextInput
          style={styles(theme).input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Digite a nova senha"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!loading}
        />
      </View>

      <View style={styles(theme).inputContainer}>
        <Text style={styles(theme).label}>Confirmar Nova Senha</Text>
        <TextInput
          style={styles(theme).input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Digite novamente a nova senha"
          placeholderTextColor={theme.colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!loading}
        />
      </View>

      {newPassword && (
        <View style={styles(theme).passwordHints}>
          <Text style={[styles(theme).hint, newPassword.length >= 6 && styles(theme).hintValid]}>
            ✓ Pelo menos 6 caracteres
          </Text>
          <Text
            style={[
              styles(theme).hint,
              newPassword === confirmPassword && confirmPassword && styles(theme).hintValid,
            ]}
          >
            ✓ Senhas conferem
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles(theme).button,
          (!newPassword.trim() || !confirmPassword.trim() || loading) &&
            styles(theme).buttonDisabled,
        ]}
        onPress={handlePasswordReset}
        disabled={!newPassword.trim() || !confirmPassword.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles(theme).buttonText}>Contatar Administrador</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles(theme).backButton}
        onPress={() => setStep('email')}
        disabled={loading}
      >
        <Text style={styles(theme).backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles(theme).container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={styles(theme).scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'email' ? renderEmailStep() : renderPasswordStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
    },
    content: {
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    emoji: {
      fontSize: 48,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
      lineHeight: 22,
    },
    boldText: {
      fontWeight: '600',
      color: theme.colors.text,
    },
    inputContainer: {
      width: '100%',
      gap: theme.spacing.sm,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.line,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 4,
      fontSize: 16,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    passwordHints: {
      width: '100%',
      gap: theme.spacing.xs,
    },
    hint: {
      fontSize: 14,
      color: theme.colors.muted,
    },
    hintValid: {
      color: theme.colors.success,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.radius.sm,
      width: '100%',
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: theme.colors.disabled,
    },
    buttonText: {
      color: theme.colors.primaryOn,
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      paddingVertical: theme.spacing.sm,
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
  });
