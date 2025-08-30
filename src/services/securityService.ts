import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Adicionada uma interface para tipar os dados de tentativa de login
interface LoginAttemptData {
  attempts: number;
  lockoutEndsAt?: number;
}

export class SecurityService {
  private static instance: SecurityService;
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {}

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Rate limiting para login
  async checkLoginAttempts(
    email: string
  ): Promise<{ allowed: boolean; remainingAttempts: number; lockoutEndsAt?: number }> {
    const key = `login_attempts_${email}`;
    const data = await AsyncStorage.getItem(key);

    if (!data) {
      return { allowed: true, remainingAttempts: this.MAX_LOGIN_ATTEMPTS };
    }

    // Corrigido: 'lastAttempt' não era usada e foi removida.
    // Tipagem explícita com a interface LoginAttemptData.
    const { attempts, lockoutEndsAt }: LoginAttemptData = JSON.parse(data);
    const now = Date.now();

    // Se ainda está em lockout
    if (lockoutEndsAt && now < lockoutEndsAt) {
      return { allowed: false, remainingAttempts: 0, lockoutEndsAt };
    }

    // Reset se passou do período de lockout
    if (lockoutEndsAt && now >= lockoutEndsAt) {
      await AsyncStorage.removeItem(key);
      return { allowed: true, remainingAttempts: this.MAX_LOGIN_ATTEMPTS };
    }

    const remainingAttempts = this.MAX_LOGIN_ATTEMPTS - attempts;
    return { allowed: remainingAttempts > 0, remainingAttempts };
  }

  async recordLoginAttempt(email: string, success: boolean): Promise<void> {
    const key = `login_attempts_${email}`;

    if (success) {
      // Remove tentativas em caso de sucesso
      await AsyncStorage.removeItem(key);
      return;
    }

    const data = await AsyncStorage.getItem(key);
    const now = Date.now();

    if (!data) {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          attempts: 1,
          lastAttempt: now,
        })
      );
      return;
    }

    const { attempts }: LoginAttemptData = JSON.parse(data);
    const newAttempts = attempts + 1;

    if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      // Implementar lockout
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          attempts: newAttempts,
          lastAttempt: now,
          lockoutEndsAt: now + this.LOCKOUT_DURATION,
        })
      );
    } else {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          attempts: newAttempts,
          lastAttempt: now,
        })
      );
    }
  }

  // Validação avançada de entrada
  sanitizeInput(input: string, allowedChars?: RegExp): string {
    if (!input) return '';

    // Remove caracteres de controle
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove scripts maliciosos
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+=/gi, '');

    // Aplica filtro personalizado se fornecido
    if (allowedChars && !allowedChars.test(sanitized)) {
      sanitized = sanitized.replace(new RegExp(`[^${allowedChars.source}]`, 'g'), '');
    }

    return sanitized.trim();
  }

  // Validação de força de senha
  validatePasswordStrength(password: string): { score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 20;
    else feedback.push('Use pelo menos 8 caracteres');

    if (/[a-z]/.test(password)) score += 20;
    else feedback.push('Adicione letras minúsculas');

    if (/[A-Z]/.test(password)) score += 20;
    else feedback.push('Adicione letras maiúsculas');

    if (/\d/.test(password)) score += 20;
    else feedback.push('Adicione números');

    if (/[^a-zA-Z\d]/.test(password)) score += 20;
    else feedback.push('Adicione símbolos especiais');

    // Penalidade por padrões comuns
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Evite repetir caracteres');
    }

    if (/123|abc|qwerty/i.test(password)) {
      score -= 15;
      feedback.push('Evite sequências comuns');
    }

    return { score: Math.max(0, Math.min(100, score)), feedback };
  }

  // Criptografia local para dados sensíveis
  async encryptSensitiveData(data: string): Promise<string> {
    try {
      // Implementação usando Web Crypto API nativa
      const encoder = new TextEncoder();
      const dataArray = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Encryption error:', error);
      throw new Error('Falha na criptografia dos dados');
    }
  }

  // Validação de sessão
  async validateSession(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return false;

      const now = Date.now();
      // Melhoria: Usar ?? para garantir que não haja erro com 'null' ou 'undefined'
      const sessionStart = new Date(session.user.created_at ?? '').getTime();

      // Verifica se a sessão não expirou
      if (now - sessionStart > this.SESSION_TIMEOUT) {
        await supabase.auth.signOut();
        return false;
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Session validation error:', error);
      return false;
    }
  }

  // Log de atividades de segurança
  // Corrigido: details?: any -> details?: unknown
  async logSecurityEvent(event: string, details?: unknown): Promise<void> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const logEntry = {
        event,
        details,
        // Corrigido: || -> ??
        user_id: session?.user?.id ?? 'anonymous',
        timestamp: new Date().toISOString(),
        user_agent: 'React Native App',
        ip_address: 'mobile_app',
      };

      // Em produção, enviar para serviço de log seguro
      // eslint-disable-next-line no-console
      console.log('[SECURITY LOG]', logEntry);

      // Armazenar localmente para auditoria
      // Corrigido: || -> ??
      const existingLogs = (await AsyncStorage.getItem('security_logs')) ?? '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(logEntry);

      // Manter apenas os últimos 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await AsyncStorage.setItem('security_logs', JSON.stringify(logs));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to log security event:', error);
    }
  }

  // Detecção de comportamento suspeito
  // Corrigido: metadata?: any -> metadata?: unknown
  async detectSuspiciousActivity(action: string, metadata?: unknown): Promise<boolean> {
    const suspiciousPatterns = [
      'rapid_requests',
      'unusual_hours',
      'multiple_failed_attempts',
      'data_exfiltration_attempt',
    ];

    // Implementar lógica de detecção baseada em padrões
    const isSuspicious = suspiciousPatterns.some(
      // Corrigido: || -> ??
      pattern => action.includes(pattern) || JSON.stringify(metadata ?? {}).includes(pattern)
    );

    if (isSuspicious) {
      await this.logSecurityEvent('suspicious_activity_detected', {
        action,
        metadata,
        timestamp: Date.now(),
      });
    }

    return isSuspicious;
  }

  // Limpeza de dados sensíveis
  async clearSensitiveData(): Promise<void> {
    const keysToRemove = ['savedPassword', 'security_logs', 'biometric_data'];

    await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
  }
}

export const securityService = SecurityService.getInstance();
export default securityService;
