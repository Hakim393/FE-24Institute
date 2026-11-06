import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types/course';
import { getInstructorCourseBuilderMode, requireDraftVersionId, requirePublishedVersionId } from './course-workflow-guards';

const asCourse = (data: Partial<Course>): Course => data as Course;

test('revision requires a real published course version', () => {
  assert.equal(requirePublishedVersionId(asCourse({publishedVersionId:' published_1 '})), 'published_1');
  assert.equal(requirePublishedVersionId(asCourse({publishedVersion:{id:'pub_2'} as any})), 'pub_2');
  assert.throws(() => requirePublishedVersionId(asCourse({currentDraftVersionId:'draft_1'})), /versi kursus terbit/);
  assert.throws(() => requirePublishedVersionId(null), /versi kursus terbit/);
});

test('submit review requires a real draft version', () => {
  assert.equal(requireDraftVersionId(asCourse({currentDraftVersionId:' draft_1 '})), 'draft_1');
  assert.throws(() => requireDraftVersionId(asCourse({publishedVersionId:'pub_1'})), /versi draf/);
  assert.throws(() => requireDraftVersionId(null), /versi draf/);
  assert.throws(() => requireDraftVersionId(asCourse({currentDraftVersionId:' '})), /versi draf/);
});


test('published course with no active draft must offer a revision action, not a blank curriculum', () => {
  assert.equal(getInstructorCourseBuilderMode(asCourse({publishedVersionId:'pub_1', publishedVersion:{id:'pub_1',status:'PUBLISHED'} as any, currentDraftVersionId:null})), 'PUBLISHED_NO_DRAFT');
});

test('existing draft, including revisions under admin review, is not cloned again', () => {
  assert.equal(getInstructorCourseBuilderMode(asCourse({publishedVersionId:'pub_1', publishedVersion:{id:'pub_1',status:'PUBLISHED'} as any,currentDraftVersionId:'rev_2',draftVersion:{id:'rev_2',status:'PENDING_REVIEW'} as any})), 'DRAFT_AVAILABLE');
});

test('missing or contradictory version metadata does not manufacture a revision', () => {
  assert.equal(getInstructorCourseBuilderMode(asCourse({publishedVersionId:null,currentDraftVersionId:null})), 'MISSING_VERSION');
  assert.equal(getInstructorCourseBuilderMode(asCourse({publishedVersionId:'pub_1', currentDraftVersionId:null})), 'MISSING_VERSION');
  assert.equal(getInstructorCourseBuilderMode(asCourse({publishedVersionId:'pub_1',publishedVersion:{status:'ARCHIVED'} as any})), 'MISSING_VERSION');
});
