// Re-export all types for easy importing
export * from './api';
export * from './inventory';
export * from './production';

// Common utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Partial<Pick<T, K>>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

// Status types used across the app
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type AsyncState<T = any> = {
  state: LoadingState;
  data?: T;
  error?: string;
};

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceAlt: string;
  background: string;
  text: string;
  muted: string;
  line: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export interface ThemeTypography {
  h1: any;
  h2: any;
  h3: any;
  body: any;
  label: any;
  caption: any;
}

export interface Theme {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  typography: ThemeTypography;
  isDark: boolean;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  PasswordReset: undefined;
  Main: undefined;
  Estoque: undefined;
  Producao: undefined;
  Relatorio: undefined;
  Perfil: undefined;
  ProductsAdmin: undefined;
};

// Component prop types
export interface BaseComponentProps {
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

// Form types
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Event handler types
export type EventHandler<T = void> = (data: T) => void | Promise<void>;
export type AsyncEventHandler<T = void> = (data: T) => Promise<void>;

// Validation types
export interface ValidationRule<T = any> {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
}

export interface FormValidation<T = Record<string, any>> {
  [K in keyof T]?: ValidationRule<T[K]>[];
}