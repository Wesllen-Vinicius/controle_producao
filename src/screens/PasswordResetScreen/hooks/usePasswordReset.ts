import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';
import { useHaptics } from '../../../hooks/useHaptics';
import { retryService } from '../../../services/retryService';
import { inputSanitization } from '../../../services/inputSanitization';

export function usePasswordReset() {
  const navigation = useNavigation();
  const { error: errorHaptic, success: successHaptic } = useHaptics();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Email validation
  const emailError =
    emailTouched && email.trim()
      ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? 'E-mail inválido'
        : undefined
      : emailTouched && !email.trim()
        ? 'E-mail é obrigatório'
        : undefined;

  const handlePasswordReset = useCallback(async () => {
    if (emailError) {
      setEmailTouched(true);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      // Sanitize email
      const sanitizedEmail = inputSanitization.sanitizeEmail(email);

      // Check rate limiting
      if (inputSanitization.isRateLimited(sanitizedEmail, 3, 300000)) {
        // 3 attempts per 5 minutes
        throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
      }

      await retryService.supabaseOperation(async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
          redirectTo: 'your-app-scheme://reset-password', // Configure this
        });

        if (error) {
          throw error;
        }

        return { success: true };
      }, 'passwordReset');

      await successHaptic();
      setResetSent(true);

      // Auto close after showing success
      setTimeout(() => {
        navigation.goBack();
      }, 5000);
    } catch (err: unknown) {
      await errorHaptic();

      let errorMessage = 'Erro inesperado. Tente novamente.';

      if (err instanceof Error) {
        if (err.message?.includes('rate limit')) {
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else if (err.message?.includes('invalid email')) {
          errorMessage = 'E-mail inválido.';
        } else if (err.message?.includes('not found')) {
          errorMessage = 'E-mail não encontrado em nossa base de dados.';
        } else if (err.message?.includes('network')) {
          errorMessage = 'Problema de conexão. Verifique sua internet.';
        } else if (err.message.includes('tentativas')) {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }, [email, emailError, navigation, successHaptic, errorHaptic]);

  const handleResend = useCallback(async () => {
    setResetSent(false);
    setError(null);
    await handlePasswordReset();
  }, [handlePasswordReset]);

  const setEmailSafe = useCallback((newEmail: string) => {
    // Sanitize input as user types
    const sanitized = inputSanitization.sanitizeString(newEmail, {
      maxLength: 254,
      allowSpecialChars: true,
    });
    setEmail(sanitized);
  }, []);

  return {
    // State
    email,
    setEmail: setEmailSafe,
    busy,
    error,
    emailTouched,
    setEmailTouched,
    resetSent,

    // Validation
    emailError,

    // Actions
    handlePasswordReset,
    handleResend,
  };
}
