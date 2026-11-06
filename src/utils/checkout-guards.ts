/** Only official Sandbox redirect URLs can be opened from the frontend demo. */
export function isApprovedSandboxRedirect(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' &&
      u.hostname === 'app.sandbox.midtrans.com' &&
      !u.username && !u.password &&
      (u.port === '' || u.port === '443') &&
      u.pathname.startsWith('/snap/');
  } catch {
    return false;
  }
}

export function isApprovedSandboxCheckout(
  data: unknown,
  expectedOrderId: string,
): data is { orderId: string; token: string; redirectUrl: string } {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  return typeof record.orderId === 'string' &&
    record.orderId === expectedOrderId &&
    typeof record.token === 'string' && record.token.trim().length > 0 &&
    isApprovedSandboxRedirect(record.redirectUrl);
}
