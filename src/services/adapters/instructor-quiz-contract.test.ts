import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildInstructorQuizQuestionBody, buildInstructorQuizOptionBody,
  requireCreatedQuizQuestionId, requireCreatedQuizOption,
} from './instructor-quiz-contract';

test('create question uses questionText not prompt, excluding UI-only fields', () => {
  assert.deepEqual(buildInstructorQuizQuestionBody({prompt:' 1 + 1 = ? ',explanation:' Dua ',order:3}),
    {questionText:'1 + 1 = ?',explanation:'Dua'});
});
test('question requires nonblank prompt', () => {
  assert.throws(() => buildInstructorQuizQuestionBody({prompt:' '}));
});
test('option sends optionText and isCorrect without order', () => {
  assert.deepEqual(buildInstructorQuizOptionBody({text:' 2 ',isCorrect:true,order:1}),
    {optionText:'2',isCorrect:true});
});
test('option rejects blank text and invalid correctness', () => {
  assert.throws(() => buildInstructorQuizOptionBody({text:' ',isCorrect:false}));
  assert.throws(() => buildInstructorQuizOptionBody({text:'2',isCorrect:undefined as unknown as boolean}));
});
test('nested backend question ID is unwrapped for matching Quiz', () => {
  const res = {success:true,message:'ok',requestId:'test',data:{question:{id:'q-1',quizId:'quiz-1',questionText:'test'}}};
  assert.equal(requireCreatedQuizQuestionId(res,'quiz-1'), 'q-1');
});
test('incorrect Quiz or missing data.question never counts as success', () => {
  const res = {success:true,message:'ok',requestId:'test',data:{question:{id:'q-1',quizId:'other'}}};
  assert.throws(() => requireCreatedQuizQuestionId(res,'quiz-1'));
  assert.throws(() => requireCreatedQuizQuestionId({success:true,message:'ok',requestId:'test',data:{}},'quiz-1'));
});
test('mock preview shallow question remains supported', () => {
  assert.equal(requireCreatedQuizQuestionId({success:true,message:'ok',requestId:'test',data:{id:'q-mock',quizId:'quiz-1'}},'quiz-1'),'q-mock');
});
test('nested backend option passes only when question matches', () => {
  const res = {success:true,message:'ok',requestId:'test',data:{option:{id:'o-1',questionId:'q-1',optionText:'2',isCorrect:true}}};
  assert.doesNotThrow(() => requireCreatedQuizOption(res,'q-1'));
  assert.throws(() => requireCreatedQuizOption(res,'q-2'));
});
test('option malformed success and rejected mutation fail closed', () => {
  assert.throws(() => requireCreatedQuizOption({success:true,message:'ok',requestId:'test',data:{option:{id:'o-1'}}},'q-1'));
  assert.throws(() => requireCreatedQuizOption({success:false,message:'backend rejected',requestId:'test',data:{}},'q-1'));
});
test('shallow mock option remains supported', () => {
  assert.doesNotThrow(() => requireCreatedQuizOption({success:true,message:'ok',requestId:'test',data:{id:'o-mock',questionId:'q-1',text:'3',isCorrect:false}},'q-1'));
});
