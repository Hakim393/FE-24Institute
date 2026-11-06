import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptEnrolledLesson, requestedStudentMediaKinds } from './student-learning-contract.ts';
const C='c'; const V='v'; const L='l';
const mixed = (flags={hasImage:true,hasAudio:true,delivery:'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT'}) => ({
  courseId:C, courseVersionId:V,
  lesson: { id:L, chapterId:'chapter', title:'Campuran', type:'MIXED', position:1,
    youtubeVideoId:'dQw4w9WgXcQ', textContent:'Teks siswa',
    imageMediaId:'secret-image', audioMediaId:'secret-audio', imageUrl:'https://unauthorized.example/image',
    audioUrl:'https://unauthorized.example/audio', media:flags },
});
test('MIXED adapter preserves YouTube, body and only safe media availability flags',()=>{
  const adapted=adaptEnrolledLesson(mixed(),C,L);
  assert.equal(adapted.type,'MIXED'); assert.equal(adapted.textContent,'Teks siswa');
  assert.equal(adapted.youtubeVideoId,'dQw4w9WgXcQ');
  assert.deepEqual(adapted.media,{hasImage:true,hasAudio:true,delivery:'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT'});
  assert.deepEqual(requestedStudentMediaKinds(adapted),['image','audio']);
  assert.equal(adapted.imageUrl,null); assert.equal(adapted.audioUrl,null);
  assert.equal((adapted as any).imageMediaId,undefined); assert.equal((adapted as any).audioMediaId,undefined);
});
test('MIXED with one asset requests only that authorized media kind',()=>{
  const one=adaptEnrolledLesson(mixed({hasImage:true,hasAudio:false,delivery:'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT'}),C,L);
  assert.deepEqual(requestedStudentMediaKinds(one),['image']);
});
test('MIXED with text/YouTube and no private assets requests no media URLs',()=>{
  const empty=adaptEnrolledLesson(mixed({hasImage:false,hasAudio:false,delivery:'NONE'}),C,L);
  assert.deepEqual(requestedStudentMediaKinds(empty),[]);
});
test('MIXED missing server media flags fails closed',()=>{
  const bad=mixed() as any;delete bad.lesson.media;
  assert.throws(()=>adaptEnrolledLesson(bad,C,L),/Metadata media MIXED/);
  bad.lesson.media={delivery:'NONE'};
  assert.throws(()=>adaptEnrolledLesson(bad,C,L),/Metadata media MIXED/);
});
test('Exact enrolled IDs remain mandatory',()=>{
  assert.throws(()=>adaptEnrolledLesson(mixed(),'different',L),/tidak cocok/);
  assert.throws(()=>adaptEnrolledLesson(mixed(),C,'different'),/tidak cocok/);
});
test('Standalone IMAGE/AUDIO still request their own media as before',()=>{
  const image={...adaptEnrolledLesson(mixed(),C,L),type:'IMAGE' as const};
  const audio={...adaptEnrolledLesson(mixed(),C,L),type:'AUDIO' as const};
  assert.deepEqual(requestedStudentMediaKinds(image),['image']);
  assert.deepEqual(requestedStudentMediaKinds(audio),['audio']);
});
