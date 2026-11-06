import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api';
import { setDevPreviewActive } from './mode';

test('API connected requires exact B25 backend identity', async () => {
  const originalFetch = globalThis.fetch;
  setDevPreviewActive(false);
  try {
    for (const [payload, expected] of [
      [{ success: true, data: { name: 'Another API', version: 'v1', status: 'available' } }, false],
      [{ success: true, data: { name: '24 Institute Backend', version: 'v0', status: 'available' } }, false],
      [{ success: false, data: { name: '24 Institute Backend', version: 'v1', status: 'available' } }, false],
      [{ success: true, data: { name: '24 Institute Backend', version: 'v1', status: 'available' } }, true],
    ] as const) {
      globalThis.fetch = async () => new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
      assert.equal(await api.checkBackendHealth(), expected);
    }
  } finally {
    globalThis.fetch = originalFetch;
    setDevPreviewActive(false);
  }
});