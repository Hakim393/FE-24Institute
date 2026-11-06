import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInstructorThumbnailUpload, validateInstructorThumbnail } from './instructor-thumbnail-contract';
const mediaId = '2430b3d1-567a-44ee-9f00-8a65b70c0821';
function response(purpose: string, type='IMAGE') {
  return { success: true, data: { media: { id: mediaId, purpose, resourceType: type, secureUrl: 'https://example.invalid/x.png' } } };
}
test('only genuine COURSE_THUMBNAIL media accepted', () => {
  assert.deepEqual(parseInstructorThumbnailUpload(response('COURSE_THUMBNAIL')), { mediaId });
  assert.throws(() => parseInstructorThumbnailUpload(response('LESSON_IMAGE')));
  assert.throws(() => parseInstructorThumbnailUpload(response('COURSE_THUMBNAIL','AUDIO')));
});
test('malformed uploads are rejected and cannot claim success', () => {
  assert.throws(() => parseInstructorThumbnailUpload({ success:true, data: {media: {id:'fake'}} }));
  assert.throws(() => parseInstructorThumbnailUpload({ success:false, data: response('COURSE_THUMBNAIL').data }));
});
test('thumbnail size/type/extension checks reject invalid files', () => {
  const valid = {size:100,name:'sample.png',type:'image/png'} as File;
  assert.doesNotThrow(() => validateInstructorThumbnail(valid));
  assert.throws(() => validateInstructorThumbnail({...valid,size:6*1024*1024} as File));
  assert.throws(() => validateInstructorThumbnail({...valid,name:'sample.svg',type:'image/svg+xml'} as File));
  assert.throws(() => validateInstructorThumbnail({...valid,size:0} as File));
});
