export type CertificateStatus = 'PROCESSING' | 'ELIGIBLE' | 'ISSUED' | 'REJECTED' | 'REVOKED';

export type CertificateReviewDecision = 'APPROVE' | 'REJECT';

export interface Certificate {
  id: string;
  certificateNumber: string; // e.g. 24I-36HEX
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  status: CertificateStatus;
  issuedAt?: string | null;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
  revocationReason?: string | null;
  pdfDownloadAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateEligibility {
  courseId: string;
  isEligible: boolean;
  completionPercentage: number;
  unmetRequirements?: string[];
  existingCertificateId?: string | null;
  existingCertificateStatus?: CertificateStatus | null;
}

/** Public registry does not expose certificate number, DB status, or Student PII.
 * A valid response means the backend verified an ISSUED, currently eligible credential.
 */
export type CertificateVerificationResult =
  | {
      valid: true;
      credentialType: '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY';
      issuerName: '24Institute';
      courseTitle: string;
      issuedAt: string;
      disclaimer: string;
    }
  | {
      valid: false;
      credentialType: '24INSTITUTE_INTERNAL_DIGITAL_REGISTRY';
    };
