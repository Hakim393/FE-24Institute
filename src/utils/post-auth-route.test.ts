import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postAuthRoute } from './post-auth-route';

test('post-auth navigation stays inside the authenticated role namespace', () => {
  assert.equal(postAuthRoute('STUDENT'), '/student');
  assert.equal(postAuthRoute('STUDENT', '/student/my-courses'), '/student/my-courses');
  assert.equal(postAuthRoute('INSTRUCTOR', '/instructor/builder/c1'), '/instructor/builder/c1');
  assert.equal(postAuthRoute('ADMIN', '/admin/users'), '/admin/users');
  assert.equal(postAuthRoute('SUPER_ADMIN', '/admin/users'), '/admin/users');
  assert.equal(postAuthRoute('STUDENT', '/admin'), '/student');
  assert.equal(postAuthRoute('ADMIN', '/student'), '/admin');
  assert.equal(postAuthRoute('INSTRUCTOR', '/instructorial'), '/instructor');
});

test('post-auth navigation rejects external and ambiguous destinations', () => {
  for (const url of [
    'https://evil.example', '//evil.example', '/\\evil.example',
    '/%2F%2Fevil.example', '/student?redirect=//evil.example',
    '/student#fragment', '/student/%0A', '/student/../admin', '/student/%2e%2e/admin',
  ]) {
    assert.equal(postAuthRoute('STUDENT', url), '/student', url);
  }
});
