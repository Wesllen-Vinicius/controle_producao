import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';
import { useHaptics } from '../../../hooks/useHaptics';
import { useSignupValidation } from './useSignupValidation';

export function useSignupForm() {
  const navigation = useNavigation<any>();
  const { error: errorHaptic, success: successHaptic } = useHaptics();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validation = useSignupValidation(email, pass, pass2, emailTouched, passwordTouched);

  const handleSignup = useCallback(async () => {
    if (!validation.isValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            created_at: new Date().toISOString(),
          },
        },
      });

      if (signupError) {
        throw signupError;
      }

      await successHaptic();
      
      Alert.alert(
        'Conta Criada!',
        'Verifique seu e-mail para confirmar sua conta antes de fazer login.',
        [
          {
            text: 'Ok',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      await errorHaptic();
      
      let errorMessage = 'Erro inesperado. Tente novamente.';
      
      if (err.message?.includes('already registered')) {
        errorMessage = 'Este e-mail já está cadastrado.';
      } else if (err.message?.includes('invalid email')) {
        errorMessage = 'E-mail inválido.';
      } else if (err.message?.includes('weak password')) {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Problema de conexão. Verifique sua internet.';
      }
      
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }, [email, pass, validation.isValid, navigation, successHaptic, errorHaptic]);

  return {
    // State
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
    
    // Validation
    ...validation,
    
    // Actions
    handleSignup,
  };
}