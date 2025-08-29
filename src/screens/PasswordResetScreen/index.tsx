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

export default function PasswordResetScreen() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState(false);
  
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

      if (error && error.message.includes('Invalid login credentials')) {
        // Email existe, mas senha está errada - isso é o que queremos
        setUserFound(true);
        setStep('password');
      } else if (error && error.message.includes('Email not confirmed')) {
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
        setUserFound(true);
        setStep('password');
      }
    } catch (error: any) {
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
        'Informe o email: ' + email + ' e solicite uma nova senha.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      
    } catch (error: any) {
      Alert.alert('Erro', 'Não foi possível alterar a senha. Entre em contato com o administrador.');
    } finally {
      setLoading(false);
    }
  }, [email, newPassword, confirmPassword, navigation]);

  const renderEmailStep = () => (
    <View style={styles.content}>
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>Esqueceu sua senha?</Text>
      <Text style={styles.subtitle}>
        Digite seu e-mail para verificarmos se ele está cadastrado no sistema.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (!email.trim() || loading) && styles.buttonDisabled,
        ]}
        onPress={handleEmailCheck}
        disabled={!email.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Verificar E-mail</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Voltar ao Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.content}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Redefinir Senha</Text>
      <Text style={styles.subtitle}>
        E-mail confirmado: <Text style={styles.boldText}>{email}</Text>{'\n'}
        Digite sua nova senha abaixo.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nova Senha</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Digite a nova senha"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirmar Nova Senha</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Digite novamente a nova senha"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!loading}
        />
      </View>

      {newPassword && (
        <View style={styles.passwordHints}>
          <Text style={[styles.hint, newPassword.length >= 6 && styles.hintValid]}>
            ✓ Pelo menos 6 caracteres
          </Text>
          <Text style={[styles.hint, newPassword === confirmPassword && confirmPassword && styles.hintValid]}>
            ✓ Senhas conferem
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          (!newPassword.trim() || !confirmPassword.trim() || loading) && styles.buttonDisabled,
        ]}
        onPress={handlePasswordReset}
        disabled={!newPassword.trim() || !confirmPassword.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Contatar Administrador</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('email')}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'email' ? renderEmailStep() : renderPasswordStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputContainer: {
    width: '100%',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  passwordHints: {
    width: '100%',
    gap: 4,
  },
  hint: {
    fontSize: 14,
    color: '#999999',
  },
  hintValid: {
    color: '#4CAF50',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});