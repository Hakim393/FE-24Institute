/**
 * Google Identity Services (GIS) Integration for 24Institute
 * Official client-side OAuth flow using Google ID Token.
 * NEVER stores or requests Google Client Secret.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
          prompt?: (momentListener?: (moment: any) => void) => void;
        };
      };
    };
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

export function getGoogleClientId(): string {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  // Security guard: Ensure nobody accidentally put client secret here
  if (clientId.startsWith('GOCSPX-')) {
    console.error('[SECURITY WARNING] GOCSPX- secret detected in VITE_GOOGLE_CLIENT_ID. Client secret must NEVER be exposed to frontend!');
    return '';
  }
  return clientId;
}

export function isGoogleAuthAvailable(): boolean {
  const clientId = getGoogleClientId();
  return Boolean(clientId && clientId.includes('.apps.googleusercontent.com'));
}

export async function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (window.google?.accounts?.id) {
    return true;
  }

  if (scriptLoadingPromise) {
    try {
      await scriptLoadingPromise;
      return Boolean(window.google?.accounts?.id);
    } catch {
      return false;
    }
  }

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    // Check if already in DOM
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Gagal memuat skrip Google Identity Services')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error('Gagal memuat skrip Google Identity Services')); };
    document.head.appendChild(script);
  });

  try {
    await scriptLoadingPromise;
    return Boolean(window.google?.accounts?.id);
  } catch (err) {
    scriptLoadingPromise = null;
    console.warn('[GIS] Error loading Google script:', err);
    return false;
  }
}

export async function renderGoogleButton(
  container: HTMLElement,
  onCredentialReceived: (credential: string) => void,
  options?: {
    text?: 'signin_with' | 'signup_with' | 'continue_with';
    theme?: 'outline' | 'filled_blue';
    width?: number;
  }
): Promise<boolean> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    return false;
  }

  const loaded = await loadGoogleIdentityScript();
  if (!loaded || !window.google?.accounts?.id) {
    return false;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response && response.credential) {
        onCredentialReceived(response.credential);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  window.google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: options?.theme || 'outline',
    size: 'large',
    text: options?.text || 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    width: options?.width || 280,
  });

  return true;
}
