import { useMemo } from 'react';

interface ValidationResult {
  emailError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  isValid: boolean;
}

export function useSignupValidation(
  email: string,
  password: string,
  confirmPassword: string,
  emailTouched: boolean,
  passwordTouched: boolean
): ValidationResult {
  return useMemo(() => {
    const result: ValidationResult = { isValid: true };

    // Email validation
    if (emailTouched && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        result.emailError = 'E-mail inválido';
        result.isValid = false;
      }
    } else if (emailTouched && !email.trim()) {
      result.emailError = 'E-mail é obrigatório';
      result.isValid = false;
    }

    // Password validation
    if (passwordTouched && password) {
      if (password.length < 6) {
        result.passwordError = 'Senha deve ter pelo menos 6 caracteres';
        result.isValid = false;
      } else if (!/(?=.*[a-z])/.test(password)) {
        result.passwordError = 'Senha deve conter pelo menos uma letra minúscula';
        result.isValid = false;
      } else if (!/(?=.*\d)/.test(password)) {
        result.passwordError = 'Senha deve conter pelo menos um número';
        result.isValid = false;
      }
    } else if (passwordTouched && !password) {
      result.passwordError = 'Senha é obrigatória';
      result.isValid = false;
    }

    // Confirm password validation
    if (confirmPassword && password !== confirmPassword) {
      result.confirmPasswordError = 'Senhas não coincidem';
      result.isValid = false;
    } else if (passwordTouched && !confirmPassword) {
      result.confirmPasswordError = 'Confirmação de senha é obrigatória';
      result.isValid = false;
    }

    return result;
  }, [email, password, confirmPassword, emailTouched, passwordTouched]);
}