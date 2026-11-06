import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptStudentCertificateEligibility, adaptStudentCertificateList, requireIssuedCertificateDetail } from './student-certificate-contract.ts';

const expected = 'course-1';
const eligiblePayload = () => ({
  courseId: expected, courseVersionId: 'version-1', eligible: true,
  requirements: { requiredLessons: 6, completedRequiredLessons: 6, requiredQuizzes: 1, passedRequiredQuizzes: 1 },
  certificate: null, issuance: 'ADMIN_REVIEW_REQUIRED_NO_AUTOMATIC_OFFICIAL_CERTIFICATE',
});
test('real backend eligibility projection permits claim only when server confirms eligible', () => {
  const result = adaptStudentCertificateEligibility(eligiblePayload(), expected);
  assert.equal(result.eligible, true);
  assert.equal(result.requirementsPercentage, 100);
  assert.equal(result.totalRequirements, 7);
  assert.equal(result.certificate, null);
});
test('missing or old isEligible mock never grants certificate claim', () => {
  const payload = eligiblePayload() as Record<string, unknown>;
  delete payload.eligible;
  payload.isEligible = true;
  assert.throws(() => adaptStudentCertificateEligibility(payload, expected), /tidak mengonfirmasi/);
});
test('course identity mismatch is denied', () => {
  assert.throws(() => adaptStudentCertificateEligibility(eligiblePayload(), 'other'), /berbeda/);
});
test('incomplete required quiz shows real 6/7 progress, not invented eligibility', () => {
  const payload = eligiblePayload();
  payload.eligible = false;
  payload.requirements.passedRequiredQuizzes = 0;
  const result = adaptStudentCertificateEligibility(payload, expected);
  assert.equal(result.eligible, false);
  assert.equal(result.completedRequirements, 6);
  assert.equal(result.requirementsPercentage, 86);
});
test('all requirements complete but server rejects eligibility stays ineligible', () => {
  const payload = eligiblePayload(); payload.eligible = false;
  const result = adaptStudentCertificateEligibility(payload, expected);
  assert.equal(result.eligible, false);
  assert.equal(result.requirementsPercentage, 100);
});
test('server eligible with inconsistent count is refused', () => {
  const payload = eligiblePayload(); payload.requirements.completedRequiredLessons = 5;
  assert.throws(() => adaptStudentCertificateEligibility(payload, expected), /tidak konsisten/);
});
test('previous claim status uses nested certificate record', () => {
  const payload = eligiblePayload();
  payload.certificate = { id: 'cert1', status: 'PROCESSING', issuerName: '24Institute' } as any;
  assert.equal(adaptStudentCertificateEligibility(payload, expected).certificate?.status, 'PROCESSING');
});
test('list matches minimal real backend projection, without guessing certificate number or owner', () => {
  const result = adaptStudentCertificateList([{id:'c1',courseId:expected,courseTitle:'Fullstack',status:'PROCESSING',issuerName:'24Institute',issuedAt:null,createdAt:'2026-11-05T00:00:00Z'}]);
  assert.equal(result[0].status, 'PROCESSING');
  assert.equal((result[0] as any).certificateNumber, undefined);
});
test('invalid issuer or duplicate ID is rejected', () => {
  const row = {id:'c1',courseId:expected,courseTitle:'Fullstack',status:'ISSUED',issuerName:'Untrusted',issuedAt:'2026-11-05',createdAt:'2026-11-05'};
  assert.throws(() => adaptStudentCertificateList([row]), /Penerbit/);
  assert.throws(() => adaptStudentCertificateList([{...row,issuerName:'24Institute'},{...row,issuerName:'24Institute'}]), /duplikat/);
});
test('issued certificate detail must match id and valid number', () => {
  const detail = {id:'c1',status:'ISSUED',issuerName:'24Institute',certificateNumber:'24I-'+'A'.repeat(36)};
  assert.equal(requireIssuedCertificateDetail(detail,'c1'),detail.certificateNumber);
  assert.throws(()=>requireIssuedCertificateDetail(detail,'c2'),/bukan milik/);
  assert.throws(()=>requireIssuedCertificateDetail({...detail,status:'PROCESSING'},'c1'),/belum diterbitkan/);
  assert.throws(()=>requireIssuedCertificateDetail({...detail,certificateNumber:null},'c1'),/tidak valid/);
});
