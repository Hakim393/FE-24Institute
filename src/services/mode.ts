/**
 * 24Institute LMS Environment & Execution Mode Manager
 *
 * Implements strict separation required by Security Audit (F34-P0):
 *
 * 1. Production Mode (import.meta.env.PROD === true):
 *    - MUST FAIL-CLOSED.
 *    - Absolutely NO mock authentication.
 *    - Absolutely NO fake API mutation successes (register, OTP, order, checkout, admin, etc.).
 *    - Absolutely NO role spoofing.
 *    - All network failures must throw genuine network/disconnected errors.
 *    - `isDevPreviewActive()` ALWAYS returns false in production.
 *
 * 2. Connected Mode (Development with backend or default dev):
 *    - When dev preview is NOT explicitly activated, all services communicate with real backend.
 *    - If backend is unreachable, throw NETWORK_ERROR, do NOT fallback to mock!
 *
 * 3. Explicit Development Preview Mode:
 *    - ONLY available when !import.meta.env.PROD AND explicitly enabled via setting (`24i_dev_preview_active` === 'true').
 *    - Used strictly for isolated UI styling/prototyping.
 */

let memoryDevPreviewActive = false;

export function isDevPreviewActive(): boolean {
  // Hard gate: Never allow dev preview in production builds
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return false;
  }
  if (typeof window === 'undefined') {
    return memoryDevPreviewActive;
  }
  try {
    return (
      localStorage.getItem('24i_dev_preview_active') === 'true' ||
      localStorage.getItem('24i_force_mock_mode') === 'true'
    );
  } catch {
    return memoryDevPreviewActive;
  }
}

export function setDevPreviewActive(active: boolean): void {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    console.warn('[SECURITY] Cannot activate preview mode in production build.');
    return;
  }
  memoryDevPreviewActive = active;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('24i_dev_preview_active', active ? 'true' : 'false');
      localStorage.setItem('24i_force_mock_mode', active ? 'true' : 'false');
    }
  } catch {}
}
