// Tipos para API responses e requests
export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  count?: number;
  status?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Tipos para autenticação
export interface User {
  readonly id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  app_metadata?: UserAppMetadata;
  user_metadata?: UserMetadata;
}

export interface UserProfile {
  readonly id: string;
  username?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'user' | 'viewer';

export interface UserAppMetadata {
  provider?: string;
  providers?: string[];
}

export interface UserMetadata {
  [key: string]: any;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
}

// Tipos para requests da API
export interface CreateProductRequest {
  name: string;
  unit: string;
  meta_por_animal: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface CreateTransactionRequest {
  product_id: string;
  quantity: number;
  unit: string;
  tx_type: string;
  metadata?: Record<string, any>;
}

export interface CreateProductionRequest {
  prod_date: string;
  abate: number;
  items: CreateProductionItemRequest[];
}

export interface CreateProductionItemRequest {
  product_id: string;
  produced: number;
}

// Tipos para filtros de API
export interface ApiFilters {
  [key: string]: any;
  page?: number;
  limit?: number;
  order?: string;
  select?: string;
}

// Tipos para configuração da API
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}