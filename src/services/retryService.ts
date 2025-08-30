// Serviço para retry automático de requisições
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  // Corrigido: error agora é do tipo 'unknown'
  retryCondition?: (error: unknown) => boolean;
  // Corrigido: error agora é do tipo 'unknown'
  onRetry?: (attemptNumber: number, error: unknown) => void;
}

export class RetryService {
  private static instance: RetryService;

  static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: error => this.isRetryableError(error),
  };

  // Corrigido: error agora é do tipo 'unknown' com verificação de tipo interna
  private isRetryableError(error: unknown): boolean {
    // Para acessar propriedades de 'error' com segurança, primeiro verificamos se é um objeto
    if (typeof error !== 'object' || !error) {
      return false;
    }

    // Criamos um objeto 'err' para acessar as propriedades com segurança
    const err = error as { message?: string; status?: number; code?: string };

    // Network errors
    if (
      err.message?.includes('network') ||
      err.message?.includes('timeout') ||
      err.message?.includes('fetch')
    ) {
      return true;
    }

    // HTTP status codes that should retry
    if (err.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(err.status);
    }

    // Supabase specific errors
    if (
      err.code === 'PGRST301' || // Connection lost
      err.code === 'PGRST116' || // Connection timeout
      err.message?.includes('connection')
    ) {
      return true;
    }

    return false;
  }

  private calculateDelay(attemptNumber: number, config: RetryConfig): number {
    const delay = config.baseDelay * Math.pow(config.backoffFactor, attemptNumber - 1);
    return Math.min(delay, config.maxDelay);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultConfig, ...customConfig };
    // Corrigido: lastError agora é do tipo 'unknown'
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        // Don't retry on last attempt
        if (attempt > config.maxRetries) {
          break;
        }

        // Corrigido: Removida a asserção '!' e adicionada uma verificação segura
        if (config.retryCondition && !config.retryCondition(error)) {
          throw error;
        }

        // Call onRetry callback
        config.onRetry?.(attempt, error);

        // Calculate and wait for delay
        const delay = this.calculateDelay(attempt, config);
        await this.wait(delay);

        // eslint-disable-next-line no-console
        console.log(`Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay`);
      }
    }

    throw lastError;
  }

  // Wrapper específico para operações Supabase
  async supabaseOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      onRetry: (attempt, error) => {
        // eslint-disable-next-line no-console
        console.log(
          // Corrigido: || -> ??
          `Supabase operation "${operationName ?? 'unknown'}" failed, retrying (${attempt}/3)...`,
          // Extrai a mensagem de erro de forma segura
          error instanceof Error ? error.message : String(error)
        );
      },
    });
  }

  // Wrapper para operações de rede geral
  async networkOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 5,
      baseDelay: 500,
      backoffFactor: 1.5,
      maxDelay: 5000,
      onRetry: (attempt, error) => {
        // eslint-disable-next-line no-console
        console.log(
          // Corrigido: || -> ??
          `Network operation "${operationName ?? 'unknown'}" failed, retrying (${attempt}/5)...`,
          error instanceof Error ? error.message : String(error)
        );
      },
    });
  }

  // Helper para operações críticas
  async criticalOperation<T>(operation: () => Promise<T>, operationName?: string): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 6,
      baseDelay: 2000,
      backoffFactor: 2,
      maxDelay: 30000,
      onRetry: (attempt, error) => {
        // eslint-disable-next-line no-console
        console.log(
          // Corrigido: || -> ??
          `Critical operation "${operationName ?? 'unknown'}" failed, retrying (${attempt}/6)...`,
          error instanceof Error ? error.message : String(error)
        );
      },
    });
  }
}

export const retryService = RetryService.getInstance();
export default retryService;
