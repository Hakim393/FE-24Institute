import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDestination, requireNotificationPage } from './notification-center-contract';
import type { AppNotification } from '../types/notification';
import type { ApiResponse } from '../types/api';

const UUID_A = '451c96e4-d4ee-41ce-b0a3-cf519bc034c6';
const UUID_B = '13305877-618c-45a1-abae-af4d8b9f1d6a';
const one: AppNotification = {
  id: UUID_A, type: 'PAYMENT_SUCCESS', title: 'Pembayaran berhasil',
  message: 'Pembayaran sudah diverifikasi', data: { orderId: UUID_A, courseId: UUID_B },
  isRead: false, readAt: null, createdAt: '2026-11-05T16:51:51.753Z',
};
const page = (items: AppNotification[] = [one]): ApiResponse<AppNotification[]> => ({
  success: true, message: 'Notifikasi berhasil diambil', data: items, requestId: 'request-test',
  meta: { pagination: { page: 1, limit: 20, totalItems: items.length, totalPages: 1, hasNextPage: false, hasPreviousPage: false } },
});

test('accepts actual backend response with data and readAt', () => {
  assert.deepEqual(requireNotificationPage(page(), 1, 20).items, [one]);
});
test('rejects missing pagination or unexpected page', () => {
  const missing = page(); delete missing.meta;
  assert.throws(() => requireNotificationPage(missing, 1, 20));
  assert.throws(() => requireNotificationPage(page(), 2, 20));
});
test('rejects legacy frontend notification shape', () => {
  const legacy = { ...one, type: 'ORDER', userId: 'someone', link: '/external', data: undefined };
  assert.throws(() => requireNotificationPage(page([legacy as unknown as AppNotification]), 1, 20));
});
test('rejects duplicate IDs and forged read state', () => {
  assert.throws(() => requireNotificationPage(page([one, one]), 1, 20));
  assert.throws(() => requireNotificationPage(page([{ ...one, isRead: 'yes' as unknown as boolean }]), 1, 20));
});
test('Student payment notification navigates only to Student purchase history', () => {
  assert.equal(notificationDestination(one, 'STUDENT'), '/student/orders');
});
test('Student Enrollment takes validated courseId to classroom', () => {
  assert.equal(notificationDestination({ type: 'ENROLLMENT_CREATED', data: { courseId: UUID_B } }, 'STUDENT'),
    `/student/classroom/${UUID_B}`);
});
test('unsafe URL and malicious courseId never become a navigation target', () => {
  const malicious = { type: 'ENROLLMENT_CREATED' as const, data: { courseId: '../admin/users', link: 'https://attacker.example' } };
  assert.equal(notificationDestination(malicious, 'STUDENT'), '/student/my-courses');
  assert.equal(notificationDestination({ type: 'SYSTEM', data: { url: 'javascript:alert(1)' } }, 'STUDENT'), null);
});
test('Instructor/Admin navigation stays within their available routes', () => {
  assert.equal(notificationDestination({ type: 'COURSE_APPROVED', data: null }, 'INSTRUCTOR'), '/instructor/courses');
  assert.equal(notificationDestination({ type: 'CERTIFICATE_ISSUED', data: null }, 'ADMIN'), '/admin/certificates');
  assert.equal(notificationDestination({ type: 'PAYMENT_SUCCESS', data: null }, 'INSTRUCTOR'), null);
  assert.equal(notificationDestination({ type: 'PAYMENT_SUCCESS', data: null }, 'SUPER_ADMIN'), '/admin/orders');
});
test('Quiz detail route requires two valid UUIDs', () => {
  assert.equal(notificationDestination({ type: 'QUIZ_FAILED', data: { courseId: UUID_B, quizId: UUID_A } }, 'STUDENT'),
    `/student/classroom/${UUID_B}/quiz/${UUID_A}`);
  assert.equal(notificationDestination({ type: 'QUIZ_FAILED', data: { courseId: UUID_B } }, 'STUDENT'), '/student/my-courses');
});
