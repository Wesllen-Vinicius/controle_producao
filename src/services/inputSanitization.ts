export class InputSanitizationService {
  private static instance: InputSanitizationService;

  static getInstance(): InputSanitizationService {
    if (!InputSanitizationService.instance) {
      InputSanitizationService.instance = new InputSanitizationService();
    }
    return InputSanitizationService.instance;
  }

  /**
   * Sanitiza strings removendo caracteres perigosos
   */
  sanitizeString(
    input: string,
    options: {
      allowHtml?: boolean;
      allowSpecialChars?: boolean;
      maxLength?: number;
      trim?: boolean;
    } = {}
  ): string {
    const { allowHtml = false, allowSpecialChars = true, maxLength = 1000, trim = true } = options;

    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    if (trim) {
      sanitized = sanitized.trim();
    }

    if (!allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&]/g, '');
    }

    if (maxLength > 0) {
      sanitized = sanitized.substring(0, maxLength);
    }

    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Sanitiza e valida email
   */
  sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email.toLowerCase(), {
      allowSpecialChars: true,
      maxLength: 254, // RFC 5321 limit
    });

    const parts = sanitized.split('@');
    if (parts.length > 2) {
      return parts[0] + '@' + parts.slice(1).join('');
    }

    return sanitized;
  }

  /**
   * Sanitiza números
   */
  sanitizeNumber(
    input: string | number,
    options: {
      allowDecimals?: boolean;
      allowNegative?: boolean;
      min?: number;
      max?: number;
    } = {}
  ): number | null {
    const { allowDecimals = true, allowNegative = true, min, max } = options;

    let sanitized = String(input).trim();

    let regex = allowDecimals ? /[^0-9.,]/g : /[^0-9]/g;
    if (allowNegative) {
      regex = allowDecimals ? /[^0-9.,-]/g : /[^0-9-]/g;
    }

    sanitized = sanitized.replace(regex, '');
    sanitized = sanitized.replace(',', '.');

    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }

    if (allowNegative && sanitized.includes('-')) {
      const isNegative = sanitized.indexOf('-') === 0;
      sanitized = sanitized.replace(/-/g, '');
      if (isNegative) {
        sanitized = '-' + sanitized;
      }
    }

    const parsed = parseFloat(sanitized);

    if (isNaN(parsed)) {
      return null;
    }

    if (min !== undefined && parsed < min) {
      return min;
    }
    if (max !== undefined && parsed > max) {
      return max;
    }

    return parsed;
  }

  /**
   * Sanitiza dados de formulário
   */
  // CORRIGIDO: O tipo genérico foi alterado de Record<string, any> para Record<string, unknown>
  sanitizeFormData<T extends Record<string, unknown>>(
    data: T,
    schema: {
      [K in keyof T]?: {
        type: 'string' | 'email' | 'number' | 'boolean';
        sanitize?: boolean;
        maxLength?: number;
        allowHtml?: boolean;
        allowSpecialChars?: boolean;
        allowDecimals?: boolean;
        allowNegative?: boolean;
        min?: number;
        max?: number;
      };
    }
  ): T {
    const sanitized = { ...data };

    for (const [key, config] of Object.entries(schema)) {
      if (!(key in sanitized) || config?.sanitize === false) {
        continue;
      }

      const value = sanitized[key as keyof T];

      switch (config?.type) {
        case 'string':
          if (typeof value === 'string') {
            sanitized[key as keyof T] = this.sanitizeString(value, {
              maxLength: config.maxLength,
              allowHtml: config.allowHtml,
              allowSpecialChars: config.allowSpecialChars,
            }) as T[keyof T];
          }
          break;

        case 'email':
          if (typeof value === 'string') {
            sanitized[key as keyof T] = this.sanitizeEmail(value) as T[keyof T];
          }
          break;

        case 'number':
          // Adicionada verificação de tipo para garantir que o valor é compatível com sanitizeNumber
          if (typeof value === 'string' || typeof value === 'number') {
            const numberValue = this.sanitizeNumber(value, {
              allowDecimals: config.allowDecimals,
              allowNegative: config.allowNegative,
              min: config.min,
              max: config.max,
            });
            sanitized[key as keyof T] = (numberValue ?? 0) as T[keyof T];
          }
          break;

        case 'boolean':
          sanitized[key as keyof T] = Boolean(value) as T[keyof T];
          break;
      }
    }

    return sanitized;
  }

  /**
   * Valida se uma string contém apenas caracteres seguros
   */
  isSafeString(input: string): boolean {
    const sqlPatterns = [
      /(\s|^)(select|insert|update|delete|drop|create|alter|exec|union|script)\s/i,
      /(\s|^)(or|and)\s+\d+\s*=\s*\d+/i,
      /['"]\s*;\s*--/i,
      /\/\*[\s\S]*\*\//i,
    ];

    const xssPatterns = [
      /<script[^>]*>[\s\S]*<\/script>/i,
      /javascript\s*:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
    ];

    const pathTraversalPatterns = [/\.\.\//, /\.\.\\/, /\.\.%2f/i, /\.\.%5c/i];

    const allPatterns = [...sqlPatterns, ...xssPatterns, ...pathTraversalPatterns];

    return !allPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Rate limiting simple - para prevenir spam
   */
  private rateLimitMap = new Map<string, number[]>();

  isRateLimited(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    // CORRIGIDO: || -> ??
    let requests = this.rateLimitMap.get(identifier) ?? [];

    requests = requests.filter(timestamp => timestamp > windowStart);

    if (requests.length >= maxRequests) {
      return true;
    }

    requests.push(now);
    this.rateLimitMap.set(identifier, requests);

    return false;
  }

  /**
   * Limpar dados de rate limiting antigos
   */
  cleanupRateLimitData(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    const entries = Array.from(this.rateLimitMap.entries());
    for (const [key, timestamps] of entries) {
      const validTimestamps = timestamps.filter(ts => ts > oneHourAgo);

      if (validTimestamps.length === 0) {
        this.rateLimitMap.delete(key);
      } else {
        this.rateLimitMap.set(key, validTimestamps);
      }
    }
  }
}

export const inputSanitization = InputSanitizationService.getInstance();
export default inputSanitization;
