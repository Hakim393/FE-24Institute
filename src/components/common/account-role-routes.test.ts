import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountNotificationsRoute, accountProfileRoute } from './account-role-routes';

test('Navbar notification/profile routes obey all four backend roles', () => {
  const cases = [
    ['STUDENT', '/student'],
    ['INSTRUCTOR', '/instructor'],
    ['ADMIN', '/admin'],
    ['SUPER_ADMIN', '/admin'],
  ] as const;
  for (const [role, root] of cases) {
    assert.equal(accountNotificationsRoute(role), `${root}/notifications`);
    assert.equal(accountProfileRoute(role), `${root}/profile`);
  }
});

test('Guest route resolution must never imply admin privileges', () => {
  assert.equal(accountNotificationsRoute(null), '/student/notifications');
  assert.equal(accountProfileRoute(null), '/student/profile');
});