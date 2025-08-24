import { validationService } from '../services/validationService';

describe('ValidationService', () => {
  describe('Email validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validationService.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        '',
        null,
        undefined,
      ];

      invalidEmails.forEach(email => {
        expect(validationService.isValidEmail(email as string)).toBe(false);
      });
    });

    it('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validationService.isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('Password validation', () => {
    it('should validate passwords with correct length', () => {
      const validPasswords = [
        'password123',
        'mySecureP@ss',
        'short6',
        'a'.repeat(128), // Maximum length
      ];

      validPasswords.forEach(password => {
        expect(validationService.isValidPassword(password)).toBe(true);
      });
    });

    it('should reject passwords that are too short or too long', () => {
      const invalidPasswords = [
        'short', // Too short
        'a'.repeat(129), // Too long
        '',
        null,
        undefined,
      ];

      invalidPasswords.forEach(password => {
        expect(validationService.isValidPassword(password as string)).toBe(false);
      });
    });
  });

  describe('Quantity validation', () => {
    it('should validate positive numbers', () => {
      const result1 = validationService.validateQuantity('100');
      expect(result1.isValid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validationService.validateQuantity(50.5);
      expect(result2.isValid).toBe(true);
      expect(result2.errors).toHaveLength(0);
    });

    it('should reject zero and negative numbers by default', () => {
      const result1 = validationService.validateQuantity('0');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Quantidade deve ser maior que zero');

      const result2 = validationService.validateQuantity(-10);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Quantidade deve ser maior que zero');
    });

    it('should allow negative numbers when allowNegative is true', () => {
      const result = validationService.validateQuantity(-10, true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject quantities that are too high', () => {
      const result = validationService.validateQuantity(1000000);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantidade muito alta (máximo: 999.999)');
    });

    it('should reject invalid number formats', () => {
      const result1 = validationService.validateQuantity('not-a-number');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Quantidade deve ser um número válido');

      const result2 = validationService.validateQuantity(NaN);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Quantidade deve ser um número válido');
    });
  });

  describe('Product name validation', () => {
    it('should validate correct product names', () => {
      const validNames = [
        'Produto A',
        'Carne Bovina',
        'Produto-123',
        'Item_especial.v2',
      ];

      validNames.forEach(name => {
        const result = validationService.validateProductName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or too short names', () => {
      const result1 = validationService.validateProductName('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Nome do produto é obrigatório');

      const result2 = validationService.validateProductName('A');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Nome deve ter pelo menos 2 caracteres');
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(101);
      const result = validationService.validateProductName(longName);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nome não pode ter mais de 100 caracteres');
    });

    it('should reject names with invalid characters', () => {
      const result = validationService.validateProductName('Produto<script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nome contém caracteres inválidos');
    });
  });

  describe('Date range validation', () => {
    it('should validate correct date ranges', () => {
      const result = validationService.validateDateRange('2023-01-01', '2023-01-31');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid dates', () => {
      const result = validationService.validateDateRange('invalid-date', '2023-01-31');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data inicial inválida');
    });

    it('should reject ranges where start date is after end date', () => {
      const result = validationService.validateDateRange('2023-01-31', '2023-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data inicial deve ser anterior à data final');
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = validationService.validateDateRange(
        '2023-01-01',
        futureDate.toISOString().slice(0, 10)
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data final não pode ser futura');
    });

    it('should reject date ranges that are too long', () => {
      const result = validationService.validateDateRange('2020-01-01', '2023-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Período muito longo (máximo: 1 ano)');
    });
  });

  describe('Input sanitization', () => {
    it('should sanitize malicious scripts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = validationService.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello');
    });

    it('should remove dangerous patterns', () => {
      const inputs = [
        'javascript:alert(1)',
        'onclick=alert(1)',
        '<iframe>',
        'eval(',
        'document.cookie',
        'window.location',
      ];

      inputs.forEach(input => {
        const sanitized = validationService.sanitizeInput(input);
        expect(sanitized).not.toContain(input.toLowerCase());
      });
    });

    it('should preserve safe content', () => {
      const safeInput = 'Produto seguro 123';
      const sanitized = validationService.sanitizeInput(safeInput);
      expect(sanitized).toBe(safeInput);
    });

    it('should respect maximum length', () => {
      const longInput = 'A'.repeat(300);
      const sanitized = validationService.sanitizeInput(longInput, 100);
      expect(sanitized.length).toBe(100);
    });
  });

  describe('Number sanitization', () => {
    it('should sanitize numbers with correct decimal places', () => {
      expect(validationService.sanitizeNumber('123.456789', 2)).toBe(123.46);
      expect(validationService.sanitizeNumber(123.456789, 3)).toBe(123.457);
    });

    it('should handle invalid numbers', () => {
      expect(validationService.sanitizeNumber('invalid')).toBe(0);
      expect(validationService.sanitizeNumber(NaN)).toBe(0);
      expect(validationService.sanitizeNumber(Infinity)).toBe(0);
    });
  });

  describe('Security validation', () => {
    it('should detect dangerous content', () => {
      const result = validationService.validateUserInput('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Conteúdo não permitido detectado');
    });

    it('should allow safe content', () => {
      const result = validationService.validateUserInput('Conteúdo seguro 123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate against custom patterns', () => {
      const onlyLettersPattern = /^[a-zA-Z\s]+$/;
      
      const result1 = validationService.validateUserInput('Only Letters', onlyLettersPattern);
      expect(result1.isValid).toBe(true);

      const result2 = validationService.validateUserInput('With Numbers 123', onlyLettersPattern);
      expect(result2.isValid).toBe(false);
    });
  });
});