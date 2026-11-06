import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptInstructorMediaUpload, validateInstructorLessonFile } from './instructor-media-contract';

const picture = '11f11111-1111-4111-8111-111111111111';
const audio = '22f22222-2222-4222-8222-222222222222';
const response = (id: string, resourceType: string, purpose: string) => ({
  success: true, message: 'uploaded', requestId: 'test', data: { media: { id, resourceType, purpose, secureUrl: 'https://res.cloudinary.com/test/image/authenticated/a' } },
});

test('IMAGE upload requires backend LESSON_IMAGE, media ID and HTTPS reference', () => {
  assert.deepEqual(adaptInstructorMediaUpload(response(picture, 'IMAGE', 'LESSON_IMAGE'), 'IMAGE'), { mediaId: picture });
});
test('AUDIO upload requires backend LESSON_AUDIO', () => {
  assert.deepEqual(adaptInstructorMediaUpload(response(audio, 'AUDIO', 'LESSON_AUDIO'), 'AUDIO'), { mediaId: audio });
});
test('reject wrong purpose, type, ID and spoofed response', () => {
  for (const res of [response(picture, 'IMAGE', 'COURSE_THUMBNAIL'), response(picture, 'AUDIO', 'LESSON_IMAGE'), response('fake', 'IMAGE', 'LESSON_IMAGE'), { success: true, data: { url: 'https://example.com' } }]) {
    assert.throws(() => adaptInstructorMediaUpload(res as any, 'IMAGE'));
  }
});
test('file metadata whitelist and size protections', () => {
  validateInstructorLessonFile(new File([new Uint8Array([1, 2])], 'diagram.png', { type: 'image/png' }), 'IMAGE');
  validateInstructorLessonFile(new File([new Uint8Array([1, 2])], 'voice.mp3', { type: 'audio/mpeg' }), 'AUDIO');
  assert.throws(() => validateInstructorLessonFile(new File(['x'], 'image.svg', { type: 'image/svg+xml' }), 'IMAGE'));
  assert.throws(() => validateInstructorLessonFile(new File(['x'], 'bad.exe', { type: 'image/png' }), 'IMAGE'));
  assert.throws(() => validateInstructorLessonFile(new File([], 'empty.png', { type: 'image/png' }), 'IMAGE'));
});
