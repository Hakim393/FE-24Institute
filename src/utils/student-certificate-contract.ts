/** Exact connected B31 certificate contract. Never infer eligibility from UI progress alone. */
export type CertificateStage = 'PROCESSING' | 'ELIGIBLE' | 'ISSUED' | 'REJECTED' | 'REVOKED';

export interface StudentCertificateRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  status: CertificateStage;
  issuerName: '24Institute';
  createdAt: string;
  issuedAt: string | null;
}

export interface CertificateClaimEligibility {
  courseId: string;
  courseVersionId: string;
  eligible: boolean;
  requirements: {
    requiredLessons: number;
    completedRequiredLessons: number;
    requiredQuizzes: number;
    passedRequiredQuizzes: number;
  };
  completedRequirements: number;
  totalRequirements: number;
  requirementsPercentage: number;
  certificate: { id: string; status: CertificateStage; issuerName: '24Institute' } | null;
}

const asRecord = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Respons ${name} dari server tidak valid.`);
  }
  return value as Record<string, unknown>;
};
const asString = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Respons ${name} dari server tidak valid.`);
  }
  return value;
};
const asCount = (value: unknown, name: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`Jumlah ${name} dari server tidak valid.`);
  }
  return value as number;
};
const STAGES: readonly CertificateStage[] = ['PROCESSING', 'ELIGIBLE', 'ISSUED', 'REJECTED', 'REVOKED'];
const stage = (value: unknown): CertificateStage => {
  if (typeof value !== 'string' || !STAGES.includes(value as CertificateStage)) {
    throw new Error('Status sertifikat tidak dikenal. Tidak melanjutkan aksi.');
  }
  return value as CertificateStage;
};
const internalIssuer = (value: unknown): '24Institute' => {
  if (value !== '24Institute') {
    throw new Error('Penerbit sertifikat tidak sesuai kontrak internal 24Institute.');
  }
  return '24Institute';
};

export const adaptStudentCertificateEligibility = (
  input: unknown,
  expectedCourseId: string,
): CertificateClaimEligibility => {
  const d = asRecord(input, 'kelayakan');
  const courseId = asString(d.courseId, 'courseId');
  if (courseId !== expectedCourseId) {
    throw new Error('Respons kelayakan berasal dari course yang berbeda.');
  }
  const courseVersionId = asString(d.courseVersionId, 'courseVersionId');
  if (typeof d.eligible !== 'boolean') {
    throw new Error('Server tidak mengonfirmasi status kelayakan sertifikat.');
  }
  const r = asRecord(d.requirements, 'persyaratan');
  const requiredLessons = asCount(r.requiredLessons, 'materi wajib');
  const completedRequiredLessons = asCount(r.completedRequiredLessons, 'materi selesai');
  const requiredQuizzes = asCount(r.requiredQuizzes, 'kuis wajib');
  const passedRequiredQuizzes = asCount(r.passedRequiredQuizzes, 'kuis lulus');
  if (completedRequiredLessons > requiredLessons || passedRequiredQuizzes > requiredQuizzes) {
    throw new Error('Jumlah persyaratan sertifikat dari server tidak konsisten.');
  }
  const totalRequirements = requiredLessons + requiredQuizzes;
  const completedRequirements = completedRequiredLessons + passedRequiredQuizzes;
  if (!Number.isSafeInteger(totalRequirements) || !Number.isSafeInteger(completedRequirements)) {
    throw new Error('Jumlah persyaratan sertifikat terlalu besar.');
  }
  // An empty curriculum must never be displayed as eligible.
  if (d.eligible && (totalRequirements === 0 || completedRequirements !== totalRequirements)) {
    throw new Error('Kelayakan server tidak konsisten dengan jumlah persyaratan.');
  }
  let certificate: CertificateClaimEligibility['certificate'] = null;
  if (d.certificate !== null) {
    const c = asRecord(d.certificate, 'sertifikat');
    certificate = {
      id: asString(c.id, 'certificate.id'),
      status: stage(c.status),
      issuerName: internalIssuer(c.issuerName),
    };
  }
  return {
    courseId, courseVersionId, eligible: d.eligible,
    requirements: { requiredLessons, completedRequiredLessons, requiredQuizzes, passedRequiredQuizzes },
    totalRequirements, completedRequirements,
    requirementsPercentage: totalRequirements ? Math.round(completedRequirements / totalRequirements * 100) : 0,
    certificate,
  };
};

export const adaptStudentCertificateList = (input: unknown): StudentCertificateRecord[] => {
  if (!Array.isArray(input)) throw new Error('Daftar sertifikat dari server tidak valid.');
  const ids = new Set<string>();
  return input.map((value) => {
    const d = asRecord(value, 'daftar sertifikat');
    const id = asString(d.id, 'certificate.id');
    if (ids.has(id)) throw new Error('Server mengirim sertifikat dengan ID duplikat.');
    ids.add(id);
    const issuedAt = d.issuedAt === null ? null : asString(d.issuedAt, 'issuedAt');
    return {
      id,
      courseId: asString(d.courseId, 'courseId'),
      courseTitle: asString(d.courseTitle, 'courseTitle'),
      status: stage(d.status),
      issuerName: internalIssuer(d.issuerName),
      createdAt: asString(d.createdAt, 'createdAt'),
      issuedAt,
    };
  });
};

export const requireIssuedCertificateDetail = (input: unknown, certificateId: string): string => {
  const d = asRecord(input, 'detail sertifikat');
  if (d.id !== certificateId || d.status !== 'ISSUED') {
    throw new Error('Sertifikat bukan milik permintaan ini atau belum diterbitkan.');
  }
  internalIssuer(d.issuerName);
  const number = asString(d.certificateNumber, 'certificateNumber');
  if (!/^24I-[A-F0-9]{36}$/.test(number)) {
    throw new Error('Nomor sertifikat belum valid untuk diunduh.');
  }
  return number;
};
