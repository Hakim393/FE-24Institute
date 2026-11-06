import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parsePublicPreviewLesson } from './public-lesson-preview';
const id = '68415d96-38ae-46ce-a0b2-8a28deb6a84c';

test('accepts exact lesson ID and safe TEXT content', () => {
  const result = parsePublicPreviewLesson({lesson:{id,title:'Pengenalan',type:'TEXT',description:null,textContent:'Belajar web',youtubeVideoId:null}},id);
  assert.equal(result.textContent,'Belajar web');
  assert.equal(result.youtubeVideoId,null);
});
test('rejects wrong lesson and malformed response', () => {
  assert.throws(() => parsePublicPreviewLesson({lesson:{id:'wrong',title:'X',type:'TEXT'}},id));
  assert.throws(() => parsePublicPreviewLesson(null,id));
});
test('YouTube video only accepted with 11-character official ID', () => {
  const base={id,title:'YouTube',type:'YOUTUBE_VIDEO',description:null,textContent:null};
  assert.equal(parsePublicPreviewLesson({lesson:{...base,youtubeVideoId:'VcwN0nms30I'}},id).youtubeVideoId,'VcwN0nms30I');
  assert.throws(()=>parsePublicPreviewLesson({lesson:{...base,youtubeVideoId:'https://evil.example'}},id));
});
test('never turns IMAGE/AUDIO data into public media URLs', () => {
  const result=parsePublicPreviewLesson({lesson:{id,title:'Photo',type:'IMAGE',description:null,textContent:'secret',youtubeVideoId:null,privateImageUrl:'https://private.example'}},id);
  assert.equal(result.textContent,null);
  assert.equal(result.privateMediaPreviewAvailable,false);
  assert.equal('privateImageUrl' in result,false);
});
