/** F34-R7Z-B — Live-only Canvas API. Never report a browser cache as server persistence. */
import { api } from './api';
import { isDevPreviewActive } from './mode';
import type { CanvasNode } from '../utils/lesson-canvas-draft';

type CanvasSave = {title:string;doc:CanvasNode;expectedDraftVersionId:string;clientLessonId?:string;expectedUpdatedAt?:string};
type ServerCanvasLesson = {id:string;chapterId:string;title:string;updatedAt:string;canvasDocument?:CanvasNode|null;textContent?:string|null;youtubeVideoId?:string|null};
const uuid=/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const base=(courseId:string,chapterId:string)=>`/instructor/courses/${courseId}/chapters/${chapterId}/canvas-lessons`;
const requireLive=()=>{if(isDevPreviewActive())throw new Error('Simpan Canvas memerlukan koneksi backend asli, bukan mode mock.');};
function confirmed(value:unknown,expectedId:string,chapterId:string):ServerCanvasLesson {
 const envelope=value as {lesson?:ServerCanvasLesson}|null;
 const lesson=envelope?.lesson;
 if(!lesson||!uuid.test(lesson.id)||lesson.id.toLowerCase()!==expectedId.toLowerCase()||lesson.chapterId?.toLowerCase()!==chapterId.toLowerCase()||typeof lesson.title!=='string'||!lesson.title.trim())throw new Error('Backend belum mengonfirmasi materi dengan identitas yang benar.');
 return lesson;
}
export const instructorCanvasService={
 async get(courseId:string,chapterId:string,lessonId:string):Promise<ServerCanvasLesson>{
  requireLive();const response=await api.request<{lesson:ServerCanvasLesson}>(`${base(courseId,chapterId)}/${lessonId}`);
  return confirmed(response.data,lessonId,chapterId);
 },
 async create(courseId:string,chapterId:string,input:CanvasSave):Promise<ServerCanvasLesson>{
  requireLive();const id=input.clientLessonId;
  if(!id||!uuid.test(id))throw new Error('ID lesson Canvas baru tidak valid.');
  const response=await api.request<{lesson:ServerCanvasLesson}>(base(courseId,chapterId),{method:'POST',body:input});
  return confirmed(response.data,id,chapterId);
 },
 async update(courseId:string,chapterId:string,lessonId:string,input:CanvasSave):Promise<ServerCanvasLesson>{
  requireLive();const response=await api.request<{lesson:ServerCanvasLesson}>(`${base(courseId,chapterId)}/${lessonId}`,{method:'PUT',body:input});
  return confirmed(response.data,lessonId,chapterId);
 },
};
