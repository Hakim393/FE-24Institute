import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCompletedLesson, requireQuizScore, resolveLessonMediaUrl, youtubeEmbedUrl } from './student-learning-guards';

test('lesson completion requires matching server confirmation', () => {
  assert.doesNotThrow(() => requireCompletedLesson({courseId:'c',lessonId:'l',status:'COMPLETED'},'c','l'));
  for(const bad of [null,{completed:true},{courseId:'c',lessonId:'other',status:'COMPLETED'}, {courseId:'c',lessonId:'l',status:'IN_PROGRESS'}]) {
    assert.throws(()=>requireCompletedLesson(bad,'c','l'));
  }
});
test('quiz uses backend status even if optional passed flag contradicts', () => {
  const base={quizId:'q',attemptNumber:1,status:'PASSED',score:90,passingGrade:70,correctAnswers:9,totalQuestions:10,nextAllowedAt:null};
  assert.equal(requireQuizScore({...base,passed:false}).passed,true);
  assert.equal(requireQuizScore({...base,status:'FAILED',passed:true}).passed,false);
  for(const bad of [null,{...base,status:'UNKNOWN'},{...base,score:101},{...base,totalQuestions:0},{...base,correctAnswers:12}]) {
    assert.throws(()=>requireQuizScore(bad));
  }
});
test('private media never falls back to public URL in live sessions', () => {
  const publicUrl='https://example.com/public.jpg';
  const signed='https://res.cloudinary.com/example/private-signed.jpg?token=test';
  assert.equal(resolveLessonMediaUrl(null,publicUrl,false),null);
  assert.equal(resolveLessonMediaUrl(signed,publicUrl,false),signed);
  assert.equal(resolveLessonMediaUrl(null,publicUrl,true),publicUrl);
  assert.equal(resolveLessonMediaUrl('javascript:alert(1)',publicUrl,false),null);
  assert.equal(resolveLessonMediaUrl('http://example.com/x',publicUrl,false),null);
});
test('YouTube embed accepts only a valid ID, never a surprise demo video', () => {
  assert.equal(youtubeEmbedUrl('dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  for(const bad of [undefined,'','../not-safe','https://youtube.com/watch?v=bad','a'.repeat(200)]) {
    assert.equal(youtubeEmbedUrl(bad),null);
  }
});
