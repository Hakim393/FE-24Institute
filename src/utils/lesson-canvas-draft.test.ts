import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCanvasDraft,canvasStorageKey,parseYouTubeLink,serializeCanvasDraft,legacyLessonToCanvas,listLocalCanvasDrafts} from './lesson-canvas-draft.ts';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const draft=()=>({version:1,title:'Apa itu UI/UX?',updatedAt:'2026-11-05T00:00:00.000Z',doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Halo'}]}]}});
test('saves a safe structured JSON document without HTML injection',()=>assert.equal(assertCanvasDraft(JSON.parse(serializeCanvasDraft(draft() as any))).title,'Apa itu UI/UX?'));
test('rejects scripts or unknown content types',()=>assert.throws(()=>assertCanvasDraft({...draft(),doc:{type:'doc',content:[{type:'script',attrs:{src:'https://evil.test'}}]}})));
test('rejects a forged media id',()=>assert.throws(()=>assertCanvasDraft({...draft(),doc:{type:'doc',content:[{type:'lessonMedia',attrs:{kind:'IMAGE',mediaId:'bad'}}]}})));
test('allows valid media ID',()=>assert.doesNotThrow(()=>assertCanvasDraft({...draft(),doc:{type:'doc',content:[{type:'lessonMedia',attrs:{kind:'AUDIO',mediaId:ids[0]}}]}})));
test('refuses javascript: in links',()=>assert.throws(()=>assertCanvasDraft({...draft(),doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'test',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]}]}})));
test('normalizes official YouTube URL and blocks spoofed domain',()=>{
 assert.equal(parseYouTubeLink('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
 assert.throws(()=>parseYouTubeLink('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'));
});
test('namespaces draft by owner/course version/chapter/lesson',()=>{
 assert.ok(canvasStorageKey(ids[0],ids[1],ids[2],'new').includes(':new'));
 assert.throws(()=>canvasStorageKey('guest',ids[1],ids[2],'new'));
});
test('imports legacy plain text as safe paragraphs, not HTML',()=>{
 const doc=legacyLessonToCanvas('<script>alert(1)</script>');
 assert.equal(doc.content?.[0].content?.[0].text,'<script>alert(1)</script>');
});

test('lists separate new local drafts by instructor/version/chapter, never server lessons',()=>{
 const key1=canvasStorageKey(ids[0],ids[1],ids[2],'new-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 const key2=canvasStorageKey(ids[0],ids[1],ids[2],'new-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 const items=[key1,key2];
 const storage={length:items.length,key:(i:number)=>items[i]??null,getItem:(k:string)=>JSON.stringify({...draft(),title:k===key1?'One':'Two'})};
 const list=listLocalCanvasDrafts(storage,ids[0],ids[1],ids[2]);
 assert.equal(list.length,2);
 assert.ok(list.some(x=>x.title==='One'));
 assert.ok(list.some(x=>x.title==='Two'));
});
