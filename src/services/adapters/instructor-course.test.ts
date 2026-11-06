import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptInstructorCourse, adaptInstructorCourseEnvelope } from './instructor-course';

const version = {
  id: 'version-1', courseId: 'course-1', status: 'DRAFT', versionNumber: 1,
  title: 'Fullstack Developer Learning', shortDescription: 'Belajar web',
  description: 'Kursus fullstack', price: '300000.00', currency: 'IDR',
  level: 'INTERMEDIATE', language: 'id', categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Teknologi Informasi', slug: 'teknologi-informasi', isActive: true },
  createdAt: '2026-11-04T00:00:00.000Z', updatedAt: '2026-11-04T00:00:00.000Z',
};
const raw = {
  id: 'course-1', slug: 'fullstack-developer-learning', instructorId: 'user-1',
  draftVersionId: 'version-1', publishedVersionId: null,
  draftVersion: version, publishedVersion: null,
  createdAt: version.createdAt, updatedAt: version.updatedAt,
};

test('adapts real backend versioned course into UI Course', () => {
  const c = adaptInstructorCourse(raw);
  assert.equal(c.id, 'course-1');
  assert.equal(c.title, version.title);
  assert.equal(c.subtitle, version.shortDescription);
  assert.equal(c.price, '300000.00');
  assert.equal(c.category?.name, 'Teknologi Informasi');
  assert.equal(c.currentDraftVersionId, 'version-1');
});

test('unwraps backend data.course and retains id for navigation', () => {
  const r = adaptInstructorCourseEnvelope({success:true,message:'ok',requestId:'test',data:{course:raw}});
  assert.equal(r.data.id, 'course-1');
});

test('rejects success response missing data.course (no false success)', () => {
  assert.throws(() => adaptInstructorCourseEnvelope({success:true,message:'ok',requestId:'test',data:{}}),/data.course/);
});

test('rejects malformed course rather than constructing fake IDs', () => {
  assert.throws(() => adaptInstructorCourse({...raw,id:null}),/id/);
  assert.throws(() => adaptInstructorCourse({...raw,draftVersion:null,publishedVersion:null}),/versi metadata/);
});
