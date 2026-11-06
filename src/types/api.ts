// 24Institute API Common Types & Envelopes

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DELETED';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  requestId: string;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
}

export interface ApiErrorDetail {
  code: string;
  details?: any;
  field?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: {
    code: string;
    details?: any;
  };
  requestId?: string;
}

export interface ApiIdentity {
  name: string;
  version: string;
  environment: string;
  timestamp: string;
  documentationUrl?: string;
}
