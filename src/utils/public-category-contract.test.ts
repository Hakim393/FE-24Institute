import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parsePublicCategory, parsePublicCategoryList, parsePublicCategoryDetail,
} from './public-category-contract.ts';

const publicCategory = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Desain dan Kreativitas',
  slug: 'desain-dan-kreativitas',
  description: null,
  publishedCourseCount: 1,
};

test('accepts backend public category with publishedCourseCount', () => {
  assert.deepEqual(parsePublicCategory(publicCategory), publicCategory);
});

test('rejects the old coursesCount field without backend publishedCourseCount', () => {
  const { publishedCourseCount: _unused, ...without } = publicCategory;
  assert.throws(() => parsePublicCategory({ ...without, coursesCount: 1 }));
});

test('accepts a real zero, but rejects non-integer, negative, and string counts', () => {
  assert.equal(parsePublicCategory({ ...publicCategory, publishedCourseCount: 0 }).publishedCourseCount, 0);
  for (const bad of [-1, 1.5, '1', null, Infinity, Number.NaN]) {
    assert.throws(() => parsePublicCategory({ ...publicCategory, publishedCourseCount: bad }));
  }
});

test('requires a list and rejects duplicate category IDs', () => {
  assert.deepEqual(parsePublicCategoryList([publicCategory]), [publicCategory]);
  assert.throws(() => parsePublicCategoryList({ data: [publicCategory] }));
  assert.throws(() => parsePublicCategoryList([publicCategory, { ...publicCategory, slug: 'other' }]));
});

test('accepts category detail wrapper only, matching backend controller', () => {
  assert.deepEqual(parsePublicCategoryDetail({ category: publicCategory }), publicCategory);
  assert.throws(() => parsePublicCategoryDetail(publicCategory));
});
