import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidPassword,
  isValidFullName,
  isValidOtpCode,
  isValidWhatsAppInviteUrl,
  isValidCertificateNumber,
  isValidDecimalPrice,
} from './validation';

test('isValidEmail handles standard and invalid formats', () => {
  assert.equal(isValidEmail('student@example.com'), true);
  assert.equal(isValidEmail('admin.lms@24institute.id'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);
});

test('isValidPassword enforces 8-128 characters constraint strictly', () => {
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('validPass123!'), true);
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword('a'.repeat(129)), false);
});

test('isValidFullName enforces 3-150 characters', () => {
  assert.equal(isValidFullName('Al'), false);
  assert.equal(isValidFullName('Fikhi Hakim'), true);
  assert.equal(isValidFullName('John Doe'), true);
});

test('isValidOtpCode validates exactly 6 digits with leading zeros allowed', () => {
  assert.equal(isValidOtpCode('012345'), true);
  assert.equal(isValidOtpCode('123456'), true);
  assert.equal(isValidOtpCode('12345'), false);
  assert.equal(isValidOtpCode('1234567'), false);
  assert.equal(isValidOtpCode('12345a'), false);
});

test('isValidWhatsAppInviteUrl enforces valid chat.whatsapp.com invite links', () => {
  assert.equal(isValidWhatsAppInviteUrl('https://chat.whatsapp.com/ABCdef123456789'), true);
  assert.equal(isValidWhatsAppInviteUrl('https://chat.whatsapp.com/join_123'), true);
  assert.equal(isValidWhatsAppInviteUrl('http://chat.whatsapp.com/ABC'), false);
  assert.equal(isValidWhatsAppInviteUrl('https://evil.com/phish'), false);
});

test('isValidCertificateNumber enforces 24I- prefix with 36 uppercase hex characters', () => {
  assert.equal(isValidCertificateNumber('24I-A1B2C3D4E5F60123456789ABCDEF01234567'), true);
  assert.equal(isValidCertificateNumber('24I-invalid'), false);
  assert.equal(isValidCertificateNumber('CERT-12345'), false);
});

test('isValidDecimalPrice validates price strings', () => {
  assert.equal(isValidDecimalPrice('150000.00'), true);
  assert.equal(isValidDecimalPrice('0'), true);
  assert.equal(isValidDecimalPrice('-100'), false);
  assert.equal(isValidDecimalPrice('abc'), false);
});
