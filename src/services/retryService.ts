// Serviço para retry automático de requisições
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attemptNumber: number, error: any) => void;
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
    retryCondition: (error) => this.isRetryableError(error),
  };

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error.message?.includes('network') || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch')) {
      return true;
    }

    // HTTP status codes that should retry
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.status);
    }

    // Supabase specific errors
    if (error.code === 'PGRST301' || // Connection lost
        error.code === 'PGRST116' || // Connection timeout
        error.message?.includes('connection')) {
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
    let lastError: any;

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

        // Check if error should be retried
        if (!config.retryCondition!(error)) {
          throw error;
        }

        // Call onRetry callback
        config.onRetry?.(attempt, error);

        // Calculate and wait for delay
        const delay = this.calculateDelay(attempt, config);
        await this.wait(delay);

        console.log(`Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay`);
      }
    }

    throw lastError;
  }

  // Wrapper específico para operações Supabase
  async supabaseOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 3,
      baseDelay: 1000,
      backoffFactor: 2,
      onRetry: (attempt, error) => {
        console.log(`Supabase operation "${operationName || 'unknown'}" failed, retrying (${attempt}/3)...`, error.message);
      }
    });
  }

  // Wrapper para operações de rede geral
  async networkOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 5,
      baseDelay: 500,
      backoffFactor: 1.5,
      maxDelay: 5000,
      onRetry: (attempt, error) => {
        console.log(`Network operation "${operationName || 'unknown'}" failed, retrying (${attempt}/5)...`, error.message);
      }
    });
  }

  // Helper para operações críticas
  async criticalOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxRetries: 6,
      baseDelay: 2000,
      backoffFactor: 2,
      maxDelay: 30000,
      onRetry: (attempt, error) => {
        console.log(`Critical operation "${operationName || 'unknown'}" failed, retrying (${attempt}/6)...`, error.message);
      }
    });
  }
}

export const retryService = RetryService.getInstance();
export default retryService;