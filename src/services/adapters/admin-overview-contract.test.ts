import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptAdminDashboardOverview } from './index';
const fixture = () => ({
  users: { students: 10, instructors: 2 },
  courses: { total: 5, publishedVersions: 7 },
  enrollments: { total: 6, active: 4 },
  payments: {
    paidOrders: 3, pendingOrders: 2, unknownCheckoutsRequiringReview: 1,
    currency: 'IDR', grossCapturedIdr: '1234.00', recordedRefundsIdr: '12.00',
    netAfterRecordedRefundsIdr: '1222.00', note: 'Angka dari database',
  },
});
test('M7 valid nested overview keeps backend money and refuses invented drafts', () => {
  const value = adaptAdminDashboardOverview(fixture());
  assert.equal(value.totalUsers, 12); // students + instructors, NOT all roles
  assert.equal(value.draftCourses, undefined); // version count != course count
  assert.equal(value.totalOrders, 5); // PAID + PENDING only, NOT all orders
  assert.equal(value.payments?.unknownCheckoutsRequiringReview, 1);
  assert.equal(value.payments?.netAfterRecordedRefundsIdr, '1222.00');
});
test('M7 rejects missing sections and missing numeric counters', () => {
  for (const section of ['users', 'courses', 'enrollments', 'payments'] as const) {
    const input: any = fixture(); delete input[section];
    assert.throws(() => adaptAdminDashboardOverview(input));
  }
  for (const val of [undefined, -1, 1.5, '2', null, Number.POSITIVE_INFINITY]) {
    const input: any = fixture(); input.users.students = val;
    assert.throws(() => adaptAdminDashboardOverview(input));
  }
});
test('M7 rejects invalid IDR and missing mandatory payment metadata', () => {
  for (const value of [undefined, '', '100', '100.0', 'not-money']) {
    const input: any = fixture(); input.payments.netAfterRecordedRefundsIdr = value;
    assert.throws(() => adaptAdminDashboardOverview(input));
  }
  const currency: any = fixture(); currency.payments.currency = 'USD';
  assert.throws(() => adaptAdminDashboardOverview(currency));
});