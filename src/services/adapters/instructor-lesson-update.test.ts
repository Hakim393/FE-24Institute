import test from 'node:test';
import assert from 'node:assert/strict';
import type { Lesson } from '../../types/course';
import { buildInstructorLessonUpdatePatch, requireConfirmedUpdatedLesson } from './instructor-lesson-update';
const base = (type: Lesson['type'] = 'TEXT'): Lesson => ({
  id: '11111111-1111-4111-8111-111111111111',
  chapterId: '22222222-2222-4222-8222-222222222222',
  type, title: 'Materi Lama', order: 1, isRequired: true,
  textContent: 'Teks lama', youtubeVideoId: null,
});
const draft = (lesson: Lesson) => ({
  title: lesson.title, type: lesson.type, textContent: lesson.textContent ?? '',
  youtubeUrl: lesson.youtubeVideoId ? `https://www.youtube.com/watch?v=${lesson.youtubeVideoId}` : '',
});
test('unchanged edits do not submit a PATCH', () => {
  assert.deepEqual(buildInstructorLessonUpdatePatch(base(), draft(base())), {});
});
test('title/text edits preserve lesson id and flags', () => {
  assert.deepEqual(buildInstructorLessonUpdatePatch(base(), {...draft(base()),title:' Materi Baru ',textContent:'Konten baru'}),
    {title:'Materi Baru',textContent:'Konten baru'});
});
test('clearing text uses null, preserving other fields', () => {
  assert.deepEqual(buildInstructorLessonUpdatePatch(base(), {...draft(base()),textContent:'  '}),{textContent:null});
});
test('existing Youtube ID is stable and can be revised', () => {
  const b={...base('YOUTUBE_VIDEO'),youtubeVideoId:'VcwN0nms30I'};
  assert.deepEqual(buildInstructorLessonUpdatePatch(b,draft(b)),{});
  assert.deepEqual(buildInstructorLessonUpdatePatch(b,{...draft(b),youtubeUrl:'https://youtu.be/dQw4w9WgXcQ'}),
    {youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});
});
test('media unchanged remains bound and upload replacement is explicit', () => {
  const b=base('IMAGE');
  assert.deepEqual(buildInstructorLessonUpdatePatch(b,draft(b)),{});
  assert.deepEqual(buildInstructorLessonUpdatePatch(b,{...draft(b),imageMediaId:'33333333-3333-4333-8333-333333333333'}),
    {imageMediaId:'33333333-3333-4333-8333-333333333333'});
});
test('type swap is denied so no silent media wipe', () => {
  assert.throws(()=>buildInstructorLessonUpdatePatch(base(), {...draft(base()),type:'AUDIO'}),/Format materi/);
});
test('missing title or invalid media refs fail closed', () => {
  assert.throws(()=>buildInstructorLessonUpdatePatch(base(), {...draft(base()),title:' '}),/Judul/);
  assert.throws(()=>buildInstructorLessonUpdatePatch(base('AUDIO'), {...draft(base('AUDIO')),audioMediaId:'nope'}),/ID upload/);
});
test('PATCH success must prove same lesson identity', () => {
  const b=base();
  const response={success:true,message:'ok',requestId:'x',data:{lesson:{id:b.id,chapterId:b.chapterId,title:'Baru'}}};
  assert.doesNotThrow(()=>requireConfirmedUpdatedLesson(response,b.id,b.chapterId));
  assert.throws(()=>requireConfirmedUpdatedLesson({...response,data:{lesson:{id:'other',chapterId:b.chapterId,title:'Baru'}}},b.id,b.chapterId),/Identitas/);
  assert.throws(()=>requireConfirmedUpdatedLesson({...response,data:{}},b.id,b.chapterId),/tidak memiliki/);
});
