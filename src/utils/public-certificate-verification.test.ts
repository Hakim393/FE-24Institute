import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicCertificateVerification } from './public-certificate-verification.ts';

const issued = {
  valid: true,
  credentialType: '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY',
  issuerName: '24Institute',
  courseTitle: 'Fullstack Developer Learning',
  issuedAt: '2026-11-04T22:07:30.881Z',
  disclaimer: 'Internal 24Institute credential, not an official BNSP certification',
};
test('real backend valid response is accepted without fictional status or certificateNumber', () => {
  const parsed = parsePublicCertificateVerification(issued);
  assert.deepEqual(parsed, issued);
});
test('invalid registry entry is not treated as issued', () => {
  assert.deepEqual(parsePublicCertificateVerification({ valid: false, credentialType: issued.credentialType }),
    { valid: false, credentialType: issued.credentialType });
});
test('malformed response is refused rather than displayed as valid', () => {
  for (const value of [null, [], {}, { valid: true }, { valid: 'true', credentialType: issued.credentialType }]) {
    assert.throws(() => parsePublicCertificateVerification(value));
  }
});
test('unknown issuer or credential type is refused', () => {
  assert.throws(() => parsePublicCertificateVerification({ ...issued, issuerName: 'Another Org' }));
  assert.throws(() => parsePublicCertificateVerification({ ...issued, credentialType: 'UNKNOWN' }));
});
test('missing or non-ISO issue date is refused', () => {
  assert.throws(() => parsePublicCertificateVerification({ ...issued, issuedAt: undefined }));
  assert.throws(() => parsePublicCertificateVerification({ ...issued, issuedAt: 'yesterday' }));
});
test('missing course/disclaimer is refused', () => {
  assert.throws(() => parsePublicCertificateVerification({ ...issued, courseTitle: '' }));
  assert.throws(() => parsePublicCertificateVerification({ ...issued, disclaimer: '' }));
});
test('private and untrusted backend extra fields are not forwarded', () => {
  const parsed = parsePublicCertificateVerification({ ...issued, studentName: 'PRIVATE', studentId: 'PRIVATE', certificateNumber: 'FAKE' });
  assert.equal('studentName' in parsed, false);
  assert.equal('studentId' in parsed, false);
  assert.equal('certificateNumber' in parsed, false);
});
