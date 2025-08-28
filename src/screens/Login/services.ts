// src/screens/Login/services.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { securityService } from "../../services/securityService";
import { supabase } from "../../services/supabase";
import { SavedCredentials } from "./types";

/**
 * Verifica o suporte a biometria no dispositivo.
 */
export const checkBiometricSupport = async (): Promise<boolean> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error("Biometric check failed:", error);
    return false;
  }
};

/**
 * Carrega credenciais salvas (email e, se houver biometria, senha).
 */
export const loadSavedCredentials = async (
  biometricAvailable: boolean
): Promise<{
  email: string | null;
  credentials: SavedCredentials | null;
  rememberMe: boolean;
}> => {
  try {
    const remember = await AsyncStorage.getItem("rememberLogin");
    if (remember !== "true") {
      return { email: null, credentials: null, rememberMe: false };
    }

    const savedEmail = await AsyncStorage.getItem("savedEmail");
    if (!savedEmail) {
      return { email: null, credentials: null, rememberMe: true };
    }

    if (biometricAvailable) {
      const savedPassword = await AsyncStorage.getItem("savedPassword");
      if (savedPassword) {
        return {
          email: savedEmail,
          credentials: { email: savedEmail, password: savedPassword },
          rememberMe: true,
        };
      }
    }
    return { email: savedEmail, credentials: null, rememberMe: true };
  } catch (error) {
    console.error("Failed to load saved credentials:", error);
    return { email: null, credentials: null, rememberMe: false };
  }
};

/**
 * Salva ou remove as credenciais do usuário com base na opção "Lembrar de mim".
 */
export const saveOrClearCredentials = async (
  rememberMe: boolean,
  biometricSupported: boolean,
  email: string,
  pass: string
): Promise<SavedCredentials | null> => {
  await AsyncStorage.setItem("rememberLogin", rememberMe.toString());
  if (rememberMe) {
    const cleanEmail = email.trim().toLowerCase();
    await AsyncStorage.setItem("savedEmail", cleanEmail);
    if (biometricSupported) {
      await AsyncStorage.setItem("savedPassword", pass);
      return { email: cleanEmail, password: pass };
    } else {
      await AsyncStorage.removeItem("savedPassword");
      return null;
    }
  } else {
    await AsyncStorage.removeItem("savedEmail");
    await AsyncStorage.removeItem("savedPassword");
    return null;
  }
};

/**
 * Tenta autenticar o usuário usando a biometria.
 */
export const authenticateWithBiometrics = async (
  credentials: SavedCredentials
): Promise<void> => {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Faça login com sua digital ou Face ID",
    cancelLabel: "Cancelar",
    fallbackLabel: "Usar senha",
  });

  if (result.success) {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    if (error) throw error;
  } else {
    throw new Error("Autenticação biométrica cancelada ou falhou.");
  }
};

/**
 * Lida com o processo de login com e-mail e senha, incluindo rate limiting.
 */
export const handleEmailLogin = async (
  email: string,
  pass: string
): Promise<void> => {
  const cleanEmail = securityService.sanitizeInput(email.trim().toLowerCase());

  const { allowed, remainingAttempts, lockoutEndsAt } =
    await securityService.checkLoginAttempts(cleanEmail);
  if (!allowed) {
    const lockoutTime = lockoutEndsAt
      ? new Date(lockoutEndsAt).toLocaleTimeString()
      : "";
    throw new Error(
      `Muitas tentativas falharam. Tente novamente às ${lockoutTime}.`
    );
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) throw error;

    await securityService.recordLoginAttempt(cleanEmail, true);
    await securityService.logSecurityEvent("login_success", {
      email: cleanEmail,
    });
  } catch (e: any) {
    await securityService.recordLoginAttempt(cleanEmail, false);
    await securityService.logSecurityEvent("login_failed", {
      email: cleanEmail,
      error: e.message,
    });

    if (/invalid login credentials/i.test(e.message)) {
      throw new Error(
        `E-mail ou senha incorretos. ${
          remainingAttempts - 1
        } tentativas restantes.`
      );
    }
    throw e; // Re-throw para ser tratado na UI
  }
};
