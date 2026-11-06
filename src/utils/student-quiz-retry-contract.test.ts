import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { adaptEnrolledCurriculum } from './student-learning-contract';
const courseId='11111111-1111-4111-8111-111111111111';
const quizId='22222222-2222-4222-8222-222222222222';
function fixture(status:'FAILED'|'PASSED'|null,remainingSeconds:number,canRetry:boolean) {
  return {courseId,courseVersionId:'version',chapters:[{id:'chapter',title:'Bab',position:1,isRequired:true,lessons:[],quiz:{id:quizId,title:'Pretest',isRequired:true,passingGrade:70,latestResult:status?{score:40,status,attemptNumber:status==='FAILED'?2:1}:null,retry:{canRetry,failedAttemptCount:status===null?0:status==='FAILED'?2:0,remainingSeconds,nextAllowedAt:remainingSeconds>0?'2026-11-06T10:30:00.000Z':null},access:{canAttempt:true,totalRequiredLessons:0,completedRequiredLessons:0,remainingRequiredLessons:0,totalPriorQuizzes:0,passedPriorQuizzes:0,remainingPriorQuizzes:0,blockedByQuizId:null}}}]};
}
test('failed latest attempt in cooldown remains graded, but retry locked',()=>{
 const q=adaptEnrolledCurriculum(fixture('FAILED',1800,false),courseId).chapters[0].quizzes[0];
 assert.equal(q.latestResult?.status,'FAILED');assert.equal(q.retry?.canRetry,false);assert.equal(q.retry?.remainingSeconds,1800);
});
test('failed attempt after cooldown can retry',()=>{
 const q=adaptEnrolledCurriculum(fixture('FAILED',0,true),courseId).chapters[0].quizzes[0];assert.equal(q.retry?.canRetry,true);
});
test('missing cooldown metadata is fail closed',()=>{
 const f=fixture('FAILED',1800,false);delete (f.chapters[0].quiz as {retry?:unknown}).retry;
 assert.throws(()=>adaptEnrolledCurriculum(f,courseId),/remedial kuis|kontrak/i);
});
test('inconsistent server status rejected',()=>assert.throws(()=>adaptEnrolledCurriculum(fixture('FAILED',1800,true),courseId),/konsisten/i));
test('passed attempts cannot retry',()=>{
 const q=adaptEnrolledCurriculum(fixture('PASSED',0,false),courseId).chapters[0].quizzes[0];assert.equal(q.retry?.canRetry,false);
});
