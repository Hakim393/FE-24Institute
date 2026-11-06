import type { CertificateVerificationResult } from '../types/certificate';

const CREDENTIAL_TYPE = '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY' as const;

/** Verify the public B31 contract without inventing data absent from its privacy-safe projection. */
export function parsePublicCertificateVerification(value: unknown): CertificateVerificationResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid public certificate verification response');
  }
  const record = value as Record<string, unknown>;
  if (record.credentialType !== CREDENTIAL_TYPE) {
    throw new Error('Unknown public certificate credential type');
  }
  if (record.valid === false) {
    return { valid: false, credentialType: CREDENTIAL_TYPE };
  }
  if (record.valid !== true || record.issuerName !== '24Institute' ||
      typeof record.courseTitle !== 'string' || !record.courseTitle.trim() ||
      typeof record.issuedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(record.issuedAt) ||
      !Number.isFinite(Date.parse(record.issuedAt)) ||
      typeof record.disclaimer !== 'string' || !record.disclaimer.trim()) {
    throw new Error('Incomplete or invalid public certificate verification response');
  }
  return {
    valid: true,
    credentialType: CREDENTIAL_TYPE,
    issuerName: '24Institute',
    courseTitle: record.courseTitle,
    issuedAt: record.issuedAt,
    disclaimer: record.disclaimer,
  };
}
