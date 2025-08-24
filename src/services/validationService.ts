import { ValidationResult, TransactionFormData, ProductFormData, Unit, TransactionType } from '../types';

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  // Validações básicas
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email?.trim()) && email.trim().length <= 254;
  }

  isValidPassword(password: string): boolean {
    return password && password.length >= 6 && password.length <= 128;
  }

  isValidString(value: string, minLength = 1, maxLength = 255): boolean {
    const trimmed = value?.trim();
    return !!(trimmed && trimmed.length >= minLength && trimmed.length <= maxLength);
  }

  isValidNumber(value: number | string, min = 0, max = Number.MAX_SAFE_INTEGER): boolean {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return !isNaN(num) && isFinite(num) && num >= min && num <= max;
  }

  isValidDate(dateString: string): boolean {
    if (!dateString?.trim()) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  isValidUnit(unit: string): boolean {
    if (!unit?.trim()) return false;
    const validUnits = ['UN', 'KG', 'L', 'CX', 'PC', 'MT', 'G', 'ML', 'CM'];
    const trimmed = unit.trim().toUpperCase();
    return validUnits.includes(trimmed) || /^[A-Z]{1,10}$/.test(trimmed);
  }

  isValidTransactionType(type: string): type is TransactionType {
    const validTypes: TransactionType[] = ['entrada', 'saida', 'ajuste', 'transferencia', 'venda'];
    return validTypes.includes(type as TransactionType);
  }

  // Sanitização
  sanitizeString(value: string, maxLength = 255): string {
    return value?.trim().substring(0, maxLength) || '';
  }

  sanitizeNumber(value: string | number, decimals = 3): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  sanitizeUnit(unit: string): Unit {
    return this.sanitizeString(unit, 10).toUpperCase() as Unit;
  }

  // Validações de negócio
  validateProductName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name?.trim()) {
      errors.push('Nome do produto é obrigatório');
    } else {
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
      }
      if (trimmed.length > 100) {
        errors.push('Nome não pode ter mais de 100 caracteres');
      }
      if (!/^[a-zA-ZÀ-ÿ0-9\s\-\.\_]+$/.test(trimmed)) {
        errors.push('Nome contém caracteres inválidos');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateQuantity(quantity: string | number, allowNegative = false): ValidationResult {
    const errors: string[] = [];
    const num = typeof quantity === 'string' ? parseFloat(quantity) : quantity;

    if (isNaN(num) || !isFinite(num)) {
      errors.push('Quantidade deve ser um número válido');
    } else {
      if (!allowNegative && num <= 0) {
        errors.push('Quantidade deve ser maior que zero');
      }
      if (num > 999999) {
        errors.push('Quantidade muito alta (máximo: 999.999)');
      }
      if (num < -999999) {
        errors.push('Quantidade muito baixa (mínimo: -999.999)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateAbate(abate: string | number): ValidationResult {
    const errors: string[] = [];
    const num = typeof abate === 'string' ? parseInt(abate, 10) : abate;

    if (isNaN(num) || !isFinite(num)) {
      errors.push('Número de abates deve ser um número inteiro válido');
    } else {
      if (num <= 0) {
        errors.push('Número de abates deve ser maior que zero');
      }
      if (num > 10000) {
        errors.push('Número de abates muito alto (máximo: 10.000)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateCustomerName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (name && name.trim()) {
      const trimmed = name.trim();
      if (trimmed.length > 100) {
        errors.push('Nome do cliente não pode ter mais de 100 caracteres');
      }
      if (!/^[a-zA-ZÀ-ÿ0-9\s\-\.\_\@]+$/.test(trimmed)) {
        errors.push('Nome do cliente contém caracteres inválidos');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateDateRange(dateFrom: string, dateTo: string): ValidationResult {
    const errors: string[] = [];
    
    if (!this.isValidDate(dateFrom)) {
      errors.push('Data inicial inválida');
    }
    
    if (!this.isValidDate(dateTo)) {
      errors.push('Data final inválida');
    }

    if (errors.length === 0) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      
      if (from > to) {
        errors.push('Data inicial deve ser anterior à data final');
      }
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (to > today) {
        errors.push('Data final não pode ser futura');
      }

      // Verificar se o período não é muito longo (> 1 ano)
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (to.getTime() - from.getTime() > oneYear) {
        errors.push('Período muito longo (máximo: 1 ano)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validações de formulário
  validateTransactionForm(data: TransactionFormData): ValidationResult {
    const errors: string[] = [];

    if (!data.productId?.trim()) {
      errors.push('Selecione um produto');
    }

    if (!this.isValidTransactionType(data.transactionType)) {
      errors.push('Tipo de transação inválido');
    }

    const quantityValidation = this.validateQuantity(data.quantity);
    if (!quantityValidation.isValid) {
      errors.push(...quantityValidation.errors);
    }

    if (data.customer) {
      const customerValidation = this.validateCustomerName(data.customer);
      if (!customerValidation.isValid) {
        errors.push(...customerValidation.errors);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateProductForm(data: ProductFormData): ValidationResult {
    const errors: string[] = [];

    const nameValidation = this.validateProductName(data.name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    }

    if (!this.isValidUnit(data.unit)) {
      errors.push('Unidade de medida inválida');
    }

    const metaValidation = this.validateQuantity(data.metaPerAnimal);
    if (!metaValidation.isValid) {
      errors.push('Meta por animal inválida');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validação de saldo negativo
  validateNegativeStock(currentStock: number, requestedQuantity: number, allowNegative = false): ValidationResult {
    const errors: string[] = [];
    const resultingStock = currentStock - requestedQuantity;

    if (!allowNegative && resultingStock < 0) {
      errors.push(`Saldo insuficiente. Saldo atual: ${currentStock.toFixed(3)}, Solicitado: ${requestedQuantity.toFixed(3)}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validações de segurança
  validateUserInput(input: string, allowedChars?: RegExp): ValidationResult {
    const errors: string[] = [];
    
    if (!input) return { isValid: true, errors };

    // Verificar caracteres maliciosos
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /eval\(/i,
      /document\./i,
      /window\./i
    ];

    const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(input));
    if (hasDangerousContent) {
      errors.push('Conteúdo não permitido detectado');
    }

    if (allowedChars && !allowedChars.test(input)) {
      errors.push('Caracteres não permitidos');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Utilitário para validar múltiplos campos
  validateFields(validations: Array<() => ValidationResult>): ValidationResult {
    const allErrors: string[] = [];
    
    for (const validation of validations) {
      const result = validation();
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    }

    return { isValid: allErrors.length === 0, errors: allErrors };
  }
}

export const validationService = ValidationService.getInstance();
export default validationService;