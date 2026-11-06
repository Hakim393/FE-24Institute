import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptReviewQueue, adaptReviewDetail } from './admin-review-contract';

const courseId = '68415d96-38ae-46ce-a0b2-8a28deb6a84c';
const versionId = '9fda9938-c2e7-4e14-a2c8-8584015375c9';
const queue = [{courseId,courseVersionId:versionId,versionNumber:1,title:'Fullstack Developer Learning',status:'PENDING_REVIEW',submittedAt:'2026-11-04T04:54:00.000Z',updatedAt:'2026-11-04T04:54:00.000Z',instructor:{id:courseId,fullName:'Instructor'},isCurrentDraft:true,reviewable:true,category:{id:courseId,name:'IT'}}];
const detail = {review: {course:{id:courseId,draftVersionId:versionId},version:{id:versionId,courseId,versionNumber:1,title:queue[0].title,status:'PENDING_REVIEW',submittedAt:queue[0].submittedAt,price:'300000.00',currency:'IDR',level:'INTERMEDIATE',chapters:[{id:courseId,title:'Bab 1',lessons:[{id:versionId}],quiz:null},{id:versionId,title:'Bab 2',lessons:[{id:versionId}],quiz:{id:courseId}}]},submissionToken:{submittedAt:queue[0].submittedAt,reviewCount:0},instructor:{id:courseId,fullName:'Instructor'},isCurrentDraft:true,reviewable:true}};

test('queue consumes exact backend courseVersionId, not missing id',()=>{
 const item=adaptReviewQueue(queue)[0]; assert.equal(item.id,versionId); assert.equal(item.status,'PENDING_REVIEW');
});
test('queue fails closed when version id is missing',()=>{
 assert.throws(()=>adaptReviewQueue([{...queue[0],courseVersionId:undefined}]), /courseVersionId/);
});
test('queue refuses legacy SUBMITTED status, backend requires PENDING_REVIEW',()=>{
 assert.throws(()=>adaptReviewQueue([{...queue[0],status:'SUBMITTED'}]),/Status/);
});
test('detail unwraps data.review.version and keeps real price + level',()=>{
 const result=adaptReviewDetail(detail,versionId); assert.equal(result.price,'300000.00'); assert.equal(result.level,'INTERMEDIATE'); assert.equal(result.chapters[1].quizCount,1);
});
test('detail has exact backend submission token for decision',()=>{
 const result=adaptReviewDetail(detail,versionId); assert.equal(result.reviewCount,0); assert.equal(result.submittedAt,queue[0].submittedAt);
});
test('detail rejects mismatched ID',()=>{
 assert.throws(()=>adaptReviewDetail(detail,courseId),/tidak sesuai/);
});
test('detail rejects missing wrapper instead of indefinite loading',()=>{
 assert.throws(()=>adaptReviewDetail({version:(detail as any).review.version},versionId),/data.review/);
});
test('detail rejects malformed price instead of displaying Rp0',()=>{
 const broken=structuredClone(detail); (broken.review.version as any).price=undefined;
 assert.throws(()=>adaptReviewDetail(broken,versionId),/version.price/);
});
test('detail rejects missing submission count (no unsafe zero fallback)',()=>{
 const broken=structuredClone(detail); (broken.review.submissionToken as any).reviewCount=undefined;
 assert.throws(()=>adaptReviewDetail(broken,versionId),/reviewCount/);
});
