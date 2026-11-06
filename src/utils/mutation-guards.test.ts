import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireMutationSuccess, requireCreatedId } from './mutation-guards';
test('failed Instructor/Admin mutations fail closed', () => {
  assert.doesNotThrow(()=>requireMutationSuccess({success:true}));
  assert.throws(()=>requireMutationSuccess({success:false,message:'backend denied'}),/backend denied/);
  assert.throws(()=>requireMutationSuccess(null),/tidak berhasil/);
});
test('created course requires a nonempty server ID', () => {
  assert.equal(requireCreatedId({success:true,data:{id:'course-id'}}),'course-id');
  for(const bad of [{success:true,data:null},{success:true,data:{id:''}},{success:false,data:{id:'course-id'}}]) {
    assert.throws(()=>requireCreatedId(bad));
  }
});
