import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntroMetadataPatch, textToListItems, listItemsToText } from './course-intro-metadata';
const prev = {subtitle: 'Kursus Fullstack', learningObjectives: ['API'], requirements: [], targetAudience: ['Pemula']};
test('one item per line, remove duplicates without data loss', () => {
 assert.deepEqual(textToListItems(' React  \n React \n PostgreSQL\n'), ['React', 'PostgreSQL']);
});
test('roundtrip list text', () => assert.equal(listItemsToText(['React', 'Node']), 'React\nNode'));
test('unchanged intro produces empty PATCH to avoid 422', () => {
 assert.deepEqual(buildIntroMetadataPatch(prev, prev), {});
});
test('only changed metadata keys included', () => {
 const patch=buildIntroMetadataPatch({...prev, learningObjectives:['API','Auth']}, prev);
 assert.deepEqual(patch, {learningObjectives:['API','Auth']});
});
test('empty array is a deliberate clearing operation', () => {
 const patch=buildIntroMetadataPatch({...prev, targetAudience:[]},prev);
 assert.deepEqual(patch,{targetAudience:[]});
});
test('reject blank promotion', () => {
 assert.throws(()=>buildIntroMetadataPatch({...prev,subtitle:' '},prev));
});
test('reject oversized list item', () => {
 assert.throws(()=>textToListItems('x'.repeat(301)));
});
test('reject oversized total item count', () => {
 assert.throws(()=>textToListItems(Array.from({length:31},(_,i)=>`line${i}`).join('\n')));
});
