// Setup para testes automatizados
import 'react-native-gesture-handler/jestSetup';

// Mock do React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock do React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock do Expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock do Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock dos serviços customizados
jest.mock('../services/validationService', () => ({
  validationService: {
    validateEmail: jest.fn(() => true),
    validatePassword: jest.fn(() => true),
    sanitizeInput: jest.fn((input) => input),
    validateQuantity: jest.fn(() => ({ isValid: true, errors: [] })),
  },
}));

jest.mock('../services/securityService', () => ({
  securityService: {
    checkLoginAttempts: jest.fn(() => Promise.resolve({ allowed: true, remainingAttempts: 5 })),
    recordLoginAttempt: jest.fn(() => Promise.resolve()),
    logSecurityEvent: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../services/analyticsService', () => ({
  analyticsService: {
    track: jest.fn(() => Promise.resolve()),
    trackScreenView: jest.fn(() => Promise.resolve()),
    trackUserAction: jest.fn(() => Promise.resolve()),
  },
}));

// Mock do FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: 'FlashList',
}));

// Configuração global para testes
global.console = {
  ...console,
  // Suprimir logs durante testes, exceto erros
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};

// Helper para aguardar animações
export const waitForAnimations = () => new Promise(resolve => setTimeout(resolve, 100));

// Helper para simular gestos
export const simulateGesture = (component: any, gesture: 'press' | 'longPress' | 'swipe') => {
  switch (gesture) {
    case 'press':
      component.props.onPress?.();
      break;
    case 'longPress':
      component.props.onLongPress?.();
      break;
    default:
      break;
  }
};

// Mock de dados para testes
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2023-01-01T00:00:00Z',
};

export const mockProduct = {
  id: 'test-product-id',
  name: 'Produto Teste',
  unit: 'KG',
  meta_por_animal: 2.5,
  created_at: '2023-01-01T00:00:00Z',
};

export const mockProduction = {
  id: 'test-production-id',
  prod_date: '2023-01-01',
  abate: 100,
  author_id: 'test-user-id',
  created_at: '2023-01-01T00:00:00Z',
};

export const mockTransaction = {
  id: 'test-transaction-id',
  product_id: 'test-product-id',
  quantity: 50,
  unit: 'KG',
  tx_type: 'entrada' as const,
  created_at: '2023-01-01T00:00:00Z',
  created_by: 'test-user-id',
};