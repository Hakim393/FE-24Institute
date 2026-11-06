import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInstructorYouTubeUrl, buildInstructorLessonBody, adaptCreatedLessonEnvelope } from './instructor-lesson-contract';
const videoId = 'VcwN0nms30I';
const canonical = `https://www.youtube.com/watch?v=${videoId}`;
test('bare YouTube ID becomes valid youtubeUrl', () => {
  assert.equal(normalizeInstructorYouTubeUrl(videoId), canonical);
});
test('full YouTube watch URL is accepted', () => {
  assert.equal(normalizeInstructorYouTubeUrl(canonical), canonical);
});
test('official short URL and embed URL are normalized', () => {
  assert.equal(normalizeInstructorYouTubeUrl(`https://youtu.be/${videoId}`), canonical);
  assert.equal(normalizeInstructorYouTubeUrl(`https://www.youtube.com/embed/${videoId}`), canonical);
});
test('disallow spoofing, non-HTTPS, invalid URL, malformed video ID', () => {
  for (const input of [`https://youtube.com.evil.test/watch?v=${videoId}`, `http://youtube.com/watch?v=${videoId}`, `https://www.youtube.com/watch?v=bad`, 'not-a-url', `https://www.youtube.com/shorts/${videoId}`]) {
    assert.throws(() => normalizeInstructorYouTubeUrl(input));
  }
});
test('create body sends youtubeUrl only (strict backend contract)', () => {
  assert.deepEqual(buildInstructorLessonBody({ title: ' Coba belajar 2 ', type: 'YOUTUBE_VIDEO', textContent: 'Isi', youtubeUrl: videoId }), {
    title: 'Coba belajar 2', type: 'YOUTUBE_VIDEO', textContent: 'Isi', youtubeUrl: canonical,
  });
});
test('TEXT create body never sends stale YouTube value', () => {
  assert.deepEqual(buildInstructorLessonBody({ title: 'Materi Teks', type: 'TEXT', textContent: ' Halo ', youtubeUrl: videoId }), {
    title: 'Materi Teks', type: 'TEXT', textContent: 'Halo',
  });
});
test('missing YouTube input is rejected before POST', () => {
  assert.throws(() => buildInstructorLessonBody({title:'Video', type:'YOUTUBE_VIDEO', youtubeUrl:'  '}));
});
test('valid backend data.lesson yields a real Lesson', () => {
  const result = adaptCreatedLessonEnvelope({ success:true, message:'Lesson berhasil dibuat', requestId:'req', data:{ lesson:{id:'lesson-id',chapterId:'chapter-id',position:1,title:'Video',type:'YOUTUBE_VIDEO',isRequired:true,estimatedDurationMinutes:0,youtubeVideoId:videoId}}}, 'chapter-id');
  assert.equal(result.data.id,'lesson-id');
  assert.equal(result.data.youtubeVideoId,videoId);
});
test('malformed response and wrong chapter cannot claim success', () => {
  assert.throws(() => adaptCreatedLessonEnvelope({success:true,message:'ok',requestId:'x',data:{}},'chapter-id'));
  assert.throws(() => adaptCreatedLessonEnvelope({success:true,message:'ok',requestId:'x',data:{lesson:{id:'x', chapterId:'other',title:'x',position:1,type:'TEXT'}}},'chapter-id'));
});

const picture = '11f11111-1111-4111-8111-111111111111';
const audio = '22f22222-2222-4222-8222-222222222222';
test('IMAGE lesson sends imageMediaId and never sends stale YouTube or audio', () => {
  const body = buildInstructorLessonBody({ title: ' Diagram ', type: 'IMAGE', imageMediaId: picture, audioMediaId: audio, youtubeUrl: videoId });
  assert.deepEqual(body, { title: 'Diagram', type: 'IMAGE', imageMediaId: picture });
});
test('AUDIO lesson sends audioMediaId without imageMediaId', () => {
  const body = buildInstructorLessonBody({ title: 'Podcast', type: 'AUDIO', audioMediaId: audio, imageMediaId: picture });
  assert.deepEqual(body, { title: 'Podcast', type: 'AUDIO', audioMediaId: audio });
});
test('MIXED lesson sends image/audio IDs, optional YouTube and text in strict backend format', () => {
  const body = buildInstructorLessonBody({ title: 'Mixed', type: 'MIXED', imageMediaId: picture, audioMediaId: audio, youtubeUrl: videoId, textContent: 'Hello' });
  assert.deepEqual(body, { title: 'Mixed', type: 'MIXED', textContent: 'Hello', youtubeUrl: canonical, imageMediaId: picture, audioMediaId: audio });
});
test('TEXT lesson ignores stale image/audio IDs', () => {
  assert.deepEqual(buildInstructorLessonBody({ title: 'Teks', type: 'TEXT', imageMediaId: picture, audioMediaId: audio }), { title: 'Teks', type: 'TEXT' });
});
test('invalid Media UUID fails closed', () => {
  assert.throws(() => buildInstructorLessonBody({ title: 'X', type: 'IMAGE', imageMediaId: 'not-a-uuid' }));
});
