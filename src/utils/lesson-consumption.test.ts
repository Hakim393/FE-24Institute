import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { markEngagementCompleted, mergeEngagement, adaptEngagementList, engagementParts } from './lesson-consumption.ts';
import type { Lesson } from '../types/course';
const lesson: Lesson = { id:'lesson-1', chapterId:'chap', title:'Mixed', type:'MIXED', order:1, isRequired:true, textContent:'Teks', youtubeVideoId:'a1234567890', media:{hasImage:true,hasAudio:true,delivery:'REQUEST_VIA_STUDENT_MEDIA_ENDPOINT'} };
describe('F34-R7K student lesson consumption', () => {
  it('averages only components actually present',()=> { const v=mergeEngagement(lesson, undefined, {components:{text:50,youtube:100,image:100,audio:0}});assert.equal(v.percentage,63); });
  it('monotonic when another device reports less',()=> { const a=mergeEngagement(lesson, undefined, {components:{text:90}});const b=mergeEngagement(lesson,a,{components:{text:40}});assert.equal(b.components.text,90); });
  it('carries resume independently',()=> {const v=mergeEngagement(lesson, undefined, {components:{audio:20},resume:{kind:'audio',seconds:31}});assert.equal(v.resume?.seconds,31);});
  it('does not infer private URLs from lesson flags',()=> {assert.deepEqual(engagementParts(lesson),['text','youtube','image','audio']);assert.equal('imageUrl' in lesson,false);});
  it('rejects malformed server percentages',()=> {assert.throws(()=>adaptEngagementList({courseId:'course',lessons:[{lessonId:'lesson-1',percentage:101,state:{}}]},'course'));});
  it('handles empty safe initial response',()=> {const x=adaptEngagementList({courseId:'course',lessons:[],lastAccessedLessonId:null},'course');assert.deepEqual(x.records,{});});
  it('shows 100% after confirmed completion without falsifying watched components or resume',()=> {
    const before=mergeEngagement(lesson,undefined,{components:{youtube:50},resume:{kind:'youtube',seconds:38}});
    const complete=markEngagementCompleted(lesson.id,before);
    assert.equal(complete.percentage,100);
    assert.equal(complete.components.youtube,50);
    assert.equal(complete.resume?.seconds,38);
  });
  it('does not regress after later video signals from a completed lesson',()=> {
    const done=markEngagementCompleted(lesson.id,mergeEngagement(lesson,undefined,{components:{youtube:50}}));
    const later=mergeEngagement(lesson,done,{components:{youtube:10}});
    assert.equal(later.percentage,100);
    assert.equal(later.components.youtube,50);
  });
  it('persists server 100% while retaining genuine observation state on reload',()=> {
    const saved=adaptEngagementList({courseId:'course',lessons:[{lessonId:'lesson-1',percentage:100,state:{components:{youtube:50},resume:{kind:'youtube',seconds:38}}}]},'course');
    assert.equal(saved.records['lesson-1']?.percentage,100);
    assert.equal(saved.records['lesson-1']?.components.youtube,50);
    assert.equal(saved.records['lesson-1']?.resume?.seconds,38);
  });
});
