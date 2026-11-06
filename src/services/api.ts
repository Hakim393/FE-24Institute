// Central API Client for 24Institute LMS
// Conforms 100% to OpenAPI 3.0.3 Contract & RFC4122
import { ApiResponse, ApiErrorResponse } from '../types/api';
import { AuthTokens } from '../types/auth';
import { isDevPreviewActive, setDevPreviewActive } from './mode';

class ApiClient {
  private baseUrl: string = (() => {
    const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      return envUrl.trim().replace(/\/+$/, '');
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      return '';
    }
    return 'http://localhost:5000/api/v1';
  })();
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isConnectedToLiveApi: boolean = false;
  private forceMockMode: boolean = false;
  private connectionChecked: boolean = false;

  // Single-flight refresh mutex Promise
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Read cached tokens from sessionStorage (session-scoped only, per security constraints)
    try {
      if (typeof window !== 'undefined') {
        const storedAccess = sessionStorage.getItem('24i_access_token');
        const storedRefresh = sessionStorage.getItem('24i_refresh_token');
        if (storedAccess) this.accessToken = storedAccess;
        if (storedRefresh) this.refreshToken = storedRefresh;
        this.forceMockMode = isDevPreviewActive();
      }
    } catch {
      // ignore storage access errors in restricted iframe
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    // In production, prevent runtime base URL tampering
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      console.warn('[SECURITY] Runtime API baseUrl modification is disabled in production.');
      return;
    }
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      throw new Error('API Base URL harus diawali dengan http:// atau https://');
    }
    this.baseUrl = clean;
  }

  public setTokens(tokens: AuthTokens | null): void {
    if (tokens) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('24i_access_token', tokens.accessToken);
          sessionStorage.setItem('24i_refresh_token', tokens.refreshToken);
        }
      } catch {}
    } else {
      this.accessToken = null;
      this.refreshToken = null;
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('24i_access_token');
          sessionStorage.removeItem('24i_refresh_token');
        }
      } catch {}
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public isForcedMock(): boolean {
    return isDevPreviewActive();
  }

  public setForceMock(mock: boolean): void {
    // In production, forceMock is disabled
    if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      this.forceMockMode = false;
      return;
    }
    this.forceMockMode = mock;
    setDevPreviewActive(mock);
  }

  public isConnected(): boolean {
    return this.isConnectedToLiveApi && !isDevPreviewActive();
  }

  public async checkBackendHealth(): Promise<boolean> {
    if (isDevPreviewActive()) {
      this.isConnectedToLiveApi = false;
      this.connectionChecked = true;
      return false;
    }

    try {
      if (!this.baseUrl && typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
        this.isConnectedToLiveApi = false;
        this.connectionChecked = true;
        return false;
      }
      // Check root API identity GET /
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json().catch(() => null);
        // Valid 24Institute backend root identity has name "24 Institute Backend" and success true
        const is24Backend = Boolean(
          json?.success === true &&
          json?.data?.name === '24 Institute Backend' &&
          json?.data?.version === 'v1' &&
          json?.data?.status === 'available'
        );
        this.isConnectedToLiveApi = is24Backend;
      } else {
        // Strict fail-closed: 404 or non-200 is NOT a connected 24Institute backend
        this.isConnectedToLiveApi = false;
      }
      this.connectionChecked = true;
      return this.isConnectedToLiveApi;
    } catch {
      this.isConnectedToLiveApi = false;
      this.connectionChecked = true;
      return false;
    }
  }

  public async getApiIdentity(): Promise<ApiResponse<{ name: string; version: string; status: string }>> {
    return this.request('/');
  }

  public generateRequestId(): string {
    // Standard RFC4122 v4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private getDeviceName(): string {
    try {
      if (typeof navigator === 'undefined') return 'Web Client';
      const ua = navigator.userAgent;
      if (ua.includes('Macintosh')) return 'MacBook Browser';
      if (ua.includes('Windows')) return 'Windows Desktop';
      if (ua.includes('Android')) return 'Android Mobile';
      if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
      return 'Web Browser Client';
    } catch {
      return 'Web Browser Client';
    }
  }

  /**
   * Concurrency-safe single-flight token refresh mutex.
   * If multiple requests trigger 401 at the same time, they all await the exact same promise instance.
   */
  public refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      this.setTokens(null);
      return Promise.resolve(null);
    }

    this.refreshPromise = this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async performRefresh(): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Request-ID': this.generateRequestId(),
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!res.ok) {
        this.setTokens(null);
        this.notifySessionExpired();
        return null;
      }

      const json = await res.json();
      if (json.success && json.data?.tokens) {
        this.setTokens(json.data.tokens);
        return json.data.tokens.accessToken;
      }

      this.setTokens(null);
      this.notifySessionExpired();
      return null;
    } catch {
      this.setTokens(null);
      this.notifySessionExpired();
      return null;
    }
  }

  private notifySessionExpired() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('24i_auth_session_expired'));
    }
  }

  public async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      body?: any;
      headers?: Record<string, string>;
      idempotencyKey?: string;
      isFormData?: boolean;
      asBlob?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers = {},
      idempotencyKey,
      isFormData = false,
      asBlob = false,
    } = options;

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!this.baseUrl && typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
      throw {
        success: false,
        message: 'Konfigurasi VITE_API_BASE_URL belum diatur untuk lingkungan produksi.',
        error: { code: 'CONFIG_ERROR', details: 'VITE_API_BASE_URL_REQUIRED' },
      } as ApiErrorResponse;
    }
    const url = `${this.baseUrl}${normalizedPath}`;

    const reqHeaders: Record<string, string> = {
      'X-Request-ID': this.generateRequestId(),
      'X-Device-Name': this.getDeviceName(),
      ...headers,
    };

    if (!isFormData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Accept'] = 'application/json';
    }

    if (idempotencyKey) {
      reqHeaders['Idempotency-Key'] = idempotencyKey;
    }

    if (this.accessToken) {
      reqHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let fetchBody: any = undefined;
    if (body) {
      fetchBody = isFormData ? body : JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: reqHeaders,
        body: fetchBody,
      });
    } catch (networkErr: any) {
      throw {
        success: false,
        message: 'Koneksi ke backend API terputus atau gagal terhubung.',
        error: { code: 'NETWORK_ERROR', details: networkErr?.message },
      } as ApiErrorResponse;
    }

    // Handle 401 Unauthorized single-flight token rotation
    const isAuthRoute =
      normalizedPath.startsWith('/auth/login') ||
      normalizedPath.startsWith('/auth/send-login-otp') ||
      normalizedPath.startsWith('/auth/verify-login-otp') ||
      normalizedPath.startsWith('/auth/refresh') ||
      normalizedPath.startsWith('/auth/register');

    if (response.status === 401 && this.refreshToken && !isAuthRoute) {
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Retry original request with freshly rotated token
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        try {
          response = await fetch(url, {
            method,
            headers: reqHeaders,
            body: fetchBody,
          });
        } catch (networkErr: any) {
          throw {
            success: false,
            message: 'Koneksi ke backend API terputus saat mencoba ulang request.',
            error: { code: 'NETWORK_ERROR', details: networkErr?.message },
          } as ApiErrorResponse;
        }
      } else {
        // Refresh token failed, reject immediately with clean auth error (never hang!)
        throw {
          success: false,
          message: 'Sesi login Anda telah berakhir. Silakan login kembali.',
          error: { code: 'UNAUTHORIZED', details: 'Sesi token tidak valid atau telah kedaluwarsa' },
        } as ApiErrorResponse;
      }
    }

    // Binary blob stream for certificate PDF downloads
    if (asBlob && response.ok) {
      const blob = await response.blob();
      return {
        success: true,
        message: 'Blob file retrieved successfully',
        data: blob as any,
        requestId: response.headers.get('x-request-id') || this.generateRequestId(),
      };
    }

    let jsonResult: any;
    try {
      jsonResult = await response.json();
    } catch {
      if (!response.ok) {
        throw {
          success: false,
          message: `Server mengembalikan status HTTP ${response.status}`,
          error: { code: `HTTP_${response.status}` },
        } as ApiErrorResponse;
      }
      return {
        success: true,
        message: 'Success',
        data: null as any,
        requestId: this.generateRequestId(),
      };
    }

    if (!response.ok || jsonResult.success === false) {
      throw jsonResult as ApiErrorResponse;
    }

    return jsonResult as ApiResponse<T>;
  }
}

export const api = new ApiClient();
