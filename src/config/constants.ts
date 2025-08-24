// Configurações centralizadas da aplicação
export const APP_CONFIG = {
  // Versão e build
  VERSION: '2.0.0',
  BUILD_NUMBER: 1,
  
  // URLs e endpoints
  API: {
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
  },
  
  // Cache e storage
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutos
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hora
  },
  
  // Paginação
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    INFINITE_SCROLL_THRESHOLD: 0.8,
  },
  
  // Validação
  VALIDATION: {
    MAX_EMAIL_LENGTH: 254,
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 128,
    MAX_QUANTITY: 999999,
    MAX_ABATE: 10000,
    MAX_STRING_LENGTH: 255,
  },
  
  // Segurança
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas
    AUTO_LOGOUT_WARNING: 5 * 60 * 1000, // 5 minutos antes
  },
  
  // Performance
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    ANIMATION_DURATION: 200,
    BATCH_UPDATE_DELAY: 16,
    MAX_CONCURRENT_REQUESTS: 5,
  },
  
  // UI/UX
  UI: {
    SPLASH_MIN_DURATION: 1500,
    TOAST_DURATION: 3000,
    LOADING_DELAY: 200,
    HAPTIC_FEEDBACK: true,
    REDUCED_MOTION: false,
  },
  
  // Monitoramento e logs
  MONITORING: {
    LOG_LEVEL: __DEV__ ? 'debug' : 'error',
    MAX_LOG_ENTRIES: 1000,
    ANALYTICS_ENABLED: !__DEV__,
    CRASH_REPORTING_ENABLED: !__DEV__,
  },
} as const;

// Constantes de status e tipos
export const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle',
} as const;

export const TRANSACTION_TYPES = {
  ENTRADA: 'entrada',
  SAIDA: 'saida',
  AJUSTE: 'ajuste',
  TRANSFERENCIA: 'transferencia',
  VENDA: 'venda',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export const UNITS = {
  UN: 'UN',
  KG: 'KG',
  L: 'L',
  CX: 'CX',
  PC: 'PC',
  MT: 'MT',
  G: 'G',
  ML: 'ML',
  CM: 'CM',
} as const;

// Mensagens padronizadas
export const MESSAGES = {
  ERROR: {
    GENERIC: 'Ocorreu um erro inesperado. Tente novamente.',
    NETWORK: 'Problema de conexão. Verifique sua internet.',
    UNAUTHORIZED: 'Acesso negado. Faça login novamente.',
    NOT_FOUND: 'Recurso não encontrado.',
    VALIDATION: 'Por favor, verifique os dados informados.',
    SERVER: 'Erro interno do servidor. Tente novamente mais tarde.',
  },
  SUCCESS: {
    SAVE: 'Dados salvos com sucesso!',
    DELETE: 'Item removido com sucesso!',
    LOGIN: 'Login realizado com sucesso!',
    LOGOUT: 'Logout realizado com sucesso!',
    UPDATE: 'Dados atualizados com sucesso!',
  },
  VALIDATION: {
    REQUIRED: 'Este campo é obrigatório',
    EMAIL_INVALID: 'Digite um e-mail válido',
    PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 6 caracteres',
    PASSWORD_TOO_LONG: 'A senha não pode ter mais de 128 caracteres',
    QUANTITY_INVALID: 'Quantidade deve ser um número válido',
    QUANTITY_TOO_HIGH: 'Quantidade muito alta',
    DATE_INVALID: 'Data inválida',
    FUTURE_DATE: 'Data não pode ser futura',
  },
} as const;

// Configurações por ambiente
export const ENV_CONFIG = {
  development: {
    API_URL: 'http://localhost:3000',
    DEBUG_MODE: true,
    LOG_LEVEL: 'debug',
  },
  staging: {
    API_URL: 'https://api-staging.exemplo.com',
    DEBUG_MODE: false,
    LOG_LEVEL: 'info',
  },
  production: {
    API_URL: 'https://api.exemplo.com',
    DEBUG_MODE: false,
    LOG_LEVEL: 'error',
  },
} as const;

// Feature flags para controle de funcionalidades
export const FEATURES = {
  BIOMETRIC_LOGIN: true,
  OFFLINE_MODE: false,
  ANALYTICS: !__DEV__,
  CRASH_REPORTING: !__DEV__,
  PUSH_NOTIFICATIONS: true,
  DARK_MODE: true,
  ADVANCED_FILTERING: true,
  EXPORT_DATA: true,
  BULK_OPERATIONS: false, // Para implementação futura
} as const;

// Regex patterns para validação
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ONLY_NUMBERS: /^\d+$/,
  ONLY_LETTERS: /^[a-zA-ZÀ-ÿ\s]+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9À-ÿ\s\-\.\_]+$/,
  NO_SPECIAL_CHARS: /^[a-zA-Z0-9À-ÿ\s]+$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
} as const;

// Configurações de tema
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#FF6A3D',
    SUCCESS: '#16A34A',
    DANGER: '#DC2626',
    WARNING: '#D97706',
    INFO: '#2563EB',
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  RADIUS: {
    XS: 4,
    SM: 8,
    MD: 12,
    LG: 16,
    XL: 24,
    FULL: 999,
  },
  TYPOGRAPHY: {
    SIZES: {
      XS: 10,
      SM: 12,
      MD: 14,
      LG: 16,
      XL: 18,
      XXL: 20,
      H3: 24,
      H2: 28,
      H1: 32,
    },
    WEIGHTS: {
      LIGHT: '300',
      NORMAL: '400',
      MEDIUM: '500',
      SEMIBOLD: '600',
      BOLD: '700',
      HEAVY: '800',
      BLACK: '900',
    },
  },
} as const;

export default APP_CONFIG;