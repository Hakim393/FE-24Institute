import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isApprovedSandboxCheckout, isApprovedSandboxRedirect } from './checkout-guards';

const validUrl = 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test-token';

test('Sandbox redirects accept only HTTPS on official sandbox host', () => {
  assert.equal(isApprovedSandboxRedirect(validUrl), true);
  for (const url of [
    'http://app.sandbox.midtrans.com/snap/v2/vtweb/abc',
    'javascript:alert(1)',
    'https://app.sandbox.midtrans.com.evil.invalid/snap/v2/vtweb/x',
    'https://evil.invalid/snap/v2/vtweb/x',
    'https://app.sandbox.midtrans.com@evil.invalid/snap/v2/vtweb/x',
    'https://app.midtrans.com/snap/v2/vtweb/x',
    'https://app.sandbox.midtrans.com/other/path',
    '',
  ]) assert.equal(isApprovedSandboxRedirect(url), false, url);
});

test('Checkout requires matching order, Snap token, and approved sandbox redirect', () => {
  const valid = { orderId: 'order-1', token: 'sandbox-token', redirectUrl: validUrl };
  assert.equal(isApprovedSandboxCheckout(valid, 'order-1'), true);
  assert.equal(isApprovedSandboxCheckout(valid, 'other-order'), false);
  assert.equal(isApprovedSandboxCheckout({ ...valid, token: '' }, 'order-1'), false);
  assert.equal(isApprovedSandboxCheckout({ ...valid, redirectUrl: 'https://evil.invalid' }, 'order-1'), false);
  assert.equal(isApprovedSandboxCheckout(null, 'order-1'), false);
});
