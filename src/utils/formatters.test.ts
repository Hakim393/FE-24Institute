import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatIDR,
  formatDateIndo,
  formatDurationSeconds,
  formatBytes,
} from './formatters';

test('formatIDR formats currency correctly in Indonesian Rupiah', () => {
  assert.equal(formatIDR('150000'), 'Rp\u00a0150.000');
  assert.equal(formatIDR(0), 'Rp\u00a00');
  assert.equal(formatIDR(''), 'Rp 0');
  assert.equal(formatIDR(null), 'Rp 0');
});

test('formatDurationSeconds converts seconds to human readable Indo text', () => {
  assert.equal(formatDurationSeconds(0), '0 menit');
  assert.equal(formatDurationSeconds(120), '2 menit');
  assert.equal(formatDurationSeconds(90), '1m 30s');
  assert.equal(formatDurationSeconds(3600), '1 jam');
  assert.equal(formatDurationSeconds(3900), '1j 5m');
});

test('formatBytes converts byte numbers to appropriate unit', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(2097152), '2 MB');
});

test('formatDateIndo returns valid Indonesian date format', () => {
  const formatted = formatDateIndo('2026-11-02T10:00:00Z');
  assert.ok(formatted.includes('2026'));
  assert.equal(formatDateIndo(''), '-');
  assert.equal(formatDateIndo(null), '-');
});
