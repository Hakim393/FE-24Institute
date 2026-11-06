import test from 'node:test';
import assert from 'node:assert/strict';
import { readDashboardPagination } from './dashboard-data-guards';

test('single complete page permits precise role dashboard counts', () => {
  assert.deepEqual(readDashboardPagination([1,2], {page:1,limit:100,totalItems:2,totalPages:1,hasNextPage:false,hasPreviousPage:false}), {total:2,isComplete:true});
});
test('partial page gives total but forbids status totals', () => {
  assert.deepEqual(readDashboardPagination([1,2], {page:1,limit:2,totalItems:10,totalPages:5,hasNextPage:true,hasPreviousPage:false}), {total:10,isComplete:false});
});
test('an empty complete page can report zero safely', () => {
  assert.deepEqual(readDashboardPagination([], {page:1,limit:100,totalItems:0,totalPages:0,hasNextPage:false,hasPreviousPage:false}), {total:0,isComplete:true});
});
test('missing, invalid, contradictory pagination never claims complete data', () => {
  assert.deepEqual(readDashboardPagination([1,2]), {total:null,isComplete:false});
  assert.deepEqual(readDashboardPagination([1,2], {page:1,limit:4,totalItems:1,totalPages:1,hasNextPage:false,hasPreviousPage:false}), {total:null,isComplete:false});
  assert.deepEqual(readDashboardPagination([1,2], {page:2,limit:2,totalItems:2,totalPages:2,hasNextPage:false,hasPreviousPage:true}), {total:null,isComplete:false});
});
