import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuthDisplayName, readDetailedStudentProfile } from './student-profile-contract';

const liveProfile = {
  id: 'u1', fullName: 'Fikhi Hakim', email: 'student@example.test',
  profile: { avatarUrl: null, phone: '08123456789', address: 'Tangerang', dateOfBirth: '2003-09-03' },
};

test('backend top-level User.fullName is displayed by legacy layouts', () => {
  const result = normalizeAuthDisplayName({
    id: 'u1', email: 'student@example.test', role: 'STUDENT', status: 'ACTIVE',
    fullName: 'Fikhi Hakim', emailVerified: true, isLocked: false,
    createdAt: '', updatedAt: '', profile: null,
  });
  assert.equal(result.profile?.fullName, 'Fikhi Hakim');
});

test('full private backend profile maps name, phone, DOB and address', () => {
  assert.deepEqual(readDetailedStudentProfile(liveProfile, 'u1'), {
    id: 'u1', fullName: 'Fikhi Hakim', phone: '08123456789',
    address: 'Tangerang', dateOfBirth: '2003-09-03', avatarUrl: null,
  });
});

test('rejects a different user to avoid cross-account profile mixup', () => {
  assert.equal(readDetailedStudentProfile(liveProfile, 'u2'), null);
});

test('rejects partial auth/me profile from silently wiping private fields', () => {
  assert.equal(readDetailedStudentProfile({ ...liveProfile, profile: { avatarUrl: null } }, 'u1'), null);
});

test('rejects malformed dates and avatar fields', () => {
  assert.equal(readDetailedStudentProfile({ ...liveProfile, profile: { ...liveProfile.profile, dateOfBirth: {} } }, 'u1'), null);
  assert.equal(readDetailedStudentProfile({ ...liveProfile, profile: { ...liveProfile.profile, avatarUrl: 123 } }, 'u1'), null);
});

test('retains no-data profile without inventing phone/address', () => {
  const result = readDetailedStudentProfile({ ...liveProfile, profile: null }, 'u1');
  assert.equal(result?.fullName, 'Fikhi Hakim');
  assert.equal(result?.phone, '');
});
