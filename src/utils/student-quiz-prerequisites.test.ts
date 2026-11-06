import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptEnrolledCurriculum } from './student-learning-contract.ts';
const courseId = 'course-1';
function payload(access: unknown) {
  return {courseId,courseVersionId:'version-1',chapters:[{id:'ch',title:'Bab',position:1,isRequired:true,
    lessons:[],quiz:{id:'quiz',title:'Kuis',passingGrade:70,isRequired:true,latestResult:null,
      retry:{canRetry:true,failedAttemptCount:0,remainingSeconds:0,nextAllowedAt:null},
      access:access===null?null:{totalPriorQuizzes:0,passedPriorQuizzes:0,remainingPriorQuizzes:0,blockedByQuizId:null,...(access as object)}}}]};
}
test('locked server projection is kept, not invented from watched percentage',()=>{
 const q=adaptEnrolledCurriculum(payload({canAttempt:false,totalRequiredLessons:3,completedRequiredLessons:2,remainingRequiredLessons:1}),courseId).chapters[0].quizzes[0];
 assert.equal(q.access?.canAttempt,false);assert.equal(q.access?.remainingRequiredLessons,1);
});
test('all officially completed requirements unlock quiz',()=>{
 const q=adaptEnrolledCurriculum(payload({canAttempt:true,totalRequiredLessons:3,completedRequiredLessons:3,remainingRequiredLessons:0}),courseId).chapters[0].quizzes[0];
 assert.equal(q.access?.canAttempt,true);
});
test('missing access in old backend is treated as locked',()=>{
 const q=adaptEnrolledCurriculum(payload(null),courseId).chapters[0].quizzes[0];assert.equal(q.access,null);
});
test('inconsistent or forged counts fail closed',()=>{
 assert.throws(()=>adaptEnrolledCurriculum(payload({canAttempt:true,totalRequiredLessons:3,completedRequiredLessons:2,remainingRequiredLessons:1}),courseId),/tidak konsisten/);
 assert.throws(()=>adaptEnrolledCurriculum(payload({canAttempt:false,totalRequiredLessons:3,completedRequiredLessons:3,remainingRequiredLessons:0}),courseId),/tidak konsisten/);
});

test('previous quiz not passed locks next quiz even after all lessons are completed',()=>{
 const q=adaptEnrolledCurriculum(payload({canAttempt:false,totalRequiredLessons:3,completedRequiredLessons:3,remainingRequiredLessons:0,
   totalPriorQuizzes:1,passedPriorQuizzes:0,remainingPriorQuizzes:1,blockedByQuizId:'pretest'}),courseId).chapters[0].quizzes[0];
 assert.equal(q.access?.canAttempt,false);
 assert.equal(q.access?.blockedByQuizId,'pretest');
});
test('server says prior quiz PASSED: next quiz can open with completed lessons',()=>{
 const q=adaptEnrolledCurriculum(payload({canAttempt:true,totalRequiredLessons:3,completedRequiredLessons:3,remainingRequiredLessons:0,
   totalPriorQuizzes:1,passedPriorQuizzes:1,remainingPriorQuizzes:0,blockedByQuizId:null}),courseId).chapters[0].quizzes[0];
 assert.equal(q.access?.canAttempt,true);
});
test('prior quiz metadata missing or forged must fail closed',()=>{
 assert.throws(()=>adaptEnrolledCurriculum(payload({canAttempt:true,totalRequiredLessons:0,completedRequiredLessons:0,remainingRequiredLessons:0,
   totalPriorQuizzes:1,passedPriorQuizzes:0,remainingPriorQuizzes:1,blockedByQuizId:null}),courseId),/konsisten/);
 assert.throws(()=>adaptEnrolledCurriculum(payload({canAttempt:true,totalRequiredLessons:0,completedRequiredLessons:0,remainingRequiredLessons:0,
   totalPriorQuizzes:1,passedPriorQuizzes:0,remainingPriorQuizzes:1,blockedByQuizId:'pretest'}),courseId),/konsisten/);
});
