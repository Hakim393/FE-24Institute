/** Canvas JSON renderer: React elements only, never innerHTML. */
import React, {useEffect,useMemo,useState} from 'react';
import type {CanvasNode} from '../../utils/lesson-canvas-draft';
import {assertCanvasDraft} from '../../utils/lesson-canvas-draft';
import {studentService} from '../../services/student.service';
import {resolveLessonMediaUrl,youtubeEmbedUrl} from '../../utils/student-learning-guards';

type Props={courseId:string;lessonId:string;doc:CanvasNode};
const fields=(n:CanvasNode)=>n.attrs??{};
function idsIn(doc:CanvasNode):string[]{const result=new Set<string>();const walk=(n:CanvasNode)=>{if(n.type==='lessonMedia'&&typeof n.attrs?.mediaId==='string')result.add(n.attrs.mediaId);n.content?.forEach(walk)};walk(doc);return [...result].slice(0,50);}
function safeHref(value:unknown):string|undefined{if(typeof value!=='string')return;try{const u=new URL(value);return ['https:','mailto:'].includes(u.protocol)&&!u.username&&!u.password?u.toString():undefined;}catch{return;}}
function youtubeId(src:unknown):string|null{if(typeof src!=='string')return null;try{const u=new URL(src);if(!['www.youtube.com','youtube.com','m.youtube.com','www.youtube-nocookie.com','youtu.be'].includes(u.hostname))return null;const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1];return id&&/^[\w-]{11}$/.test(id)?id:null;}catch{return null;}}
function Block({node,urls}:{node:CanvasNode;urls:Record<string,string|null>}):React.ReactNode {
 const a=fields(node);const children=node.content?.map((n,i)=><React.Fragment key={i}><Block node={n} urls={urls}/></React.Fragment>);
 const textAlign=['left','right','center','justify'].includes(String(a.textAlign))?a.textAlign as React.CSSProperties['textAlign']:undefined;
 switch(node.type){
  case 'doc':return <article className="space-y-4 text-slate-800 leading-8">{children}</article>;
  case 'text':{
   let c:React.ReactNode=node.text??'';
   for(const m of node.marks??[])switch(m.type){
    case 'bold':c=<strong>{c}</strong>;break;
    case 'italic':c=<em>{c}</em>;break;
    case 'underline':c=<u>{c}</u>;break;
    case 'strike':c=<s>{c}</s>;break;
    case 'code':c=<code className="px-1 bg-slate-100 rounded">{c}</code>;break;
    case 'link':{const url=safeHref(m.attrs?.href);if(url)c=<a href={url} rel="noopener noreferrer" target="_blank" className="text-blue-700 underline">{c}</a>;break;}
    case 'textStyle':{const x=m.attrs??{};const family=['Arial','Georgia','Verdana','Courier New'].includes(String(x.fontFamily))?String(x.fontFamily):undefined;const fontSize=/^(12|14|16|18|20|24|30|36)px$/.test(String(x.fontSize))?String(x.fontSize):undefined;c=<span style={{fontFamily:family,fontSize}}>{c}</span>;break;}
   }
   return c;
  }
  case 'paragraph':return <p style={{textAlign}}>{children}</p>;
  case 'heading':{const level=[1,2,3].includes(Number(a.level))?Number(a.level):2;return <div role="heading" aria-level={level} style={{textAlign}} className={level===1?'text-3xl font-bold':level===2?'text-2xl font-bold':'text-xl font-bold'}>{children}</div>;}
  case 'blockquote':return <blockquote className="border-l-4 border-teal-500 pl-4 italic text-slate-600">{children}</blockquote>;
  case 'bulletList':return <ul className="list-disc pl-7 space-y-1">{children}</ul>;
  case 'orderedList':return <ol className="list-decimal pl-7 space-y-1">{children}</ol>;
  case 'listItem':return <li>{children}</li>;
  case 'codeBlock':return <pre className="bg-slate-950 text-white rounded-lg p-4 whitespace-pre-wrap break-words"><code>{children}</code></pre>;
  case 'hardBreak':return <br/>;
  case 'horizontalRule':return <hr className="border-slate-300"/>;
  case 'table':return <div className="overflow-x-auto"><table className="w-full border-collapse border border-slate-300 text-sm"><tbody>{children}</tbody></table></div>;
  case 'tableRow':return <tr>{children}</tr>;
  case 'tableHeader':return <th className="border border-slate-300 bg-slate-100 p-2 text-left">{children}</th>;
  case 'tableCell':return <td className="border border-slate-300 p-2 align-top">{children}</td>;
  case 'youtube':{const src=youtubeEmbedUrl(youtubeId(a.src));return src?<div className="aspect-video rounded-xl overflow-hidden bg-slate-950"><iframe title="Video pembelajaran YouTube" src={src} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="w-full h-full border-0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"/></div>:<p role="alert">Video tidak tersedia.</p>;}
  case 'lessonMedia':{const id=typeof a.mediaId==='string'?a.mediaId:'';const url=urls[id]??null;const label=typeof a.label==='string'?a.label.slice(0,100):'Media pembelajaran';if(a.kind==='AUDIO')return url?<audio controls preload="none" className="w-full" src={url}/>:<p role="status" className="text-amber-800 text-sm">Audio privat belum tersedia: {label}</p>;return url?<img src={url} alt={label} loading="lazy" className="max-w-full max-h-[650px] mx-auto rounded-lg"/>:<p role="status" className="text-amber-800 text-sm">Gambar privat belum tersedia: {label}</p>;}
  default:return null;
 }
}
export const CanvasLessonRenderer:React.FC<Props>=({courseId,lessonId,doc})=>{
 const [urls,setUrls]=useState<Record<string,string|null>>({});
 const safe=useMemo(()=>assertCanvasDraft({version:1,title:'Materi',updatedAt:new Date().toISOString(),doc}).doc,[doc]);
 const ids=useMemo(()=>idsIn(safe),[safe]);
 useEffect(()=>{let active=true;setUrls({});if(!ids.length)return;
  void Promise.all(ids.map(async(id)=>{try{const response=await studentService.getCanvasMediaUrl(courseId,lessonId,id);return [id,resolveLessonMediaUrl(response.data?.url,null,false)] as const;}catch{return [id,null] as const;}})).then(pairs=>{if(active)setUrls(Object.fromEntries(pairs));});
  return()=>{active=false};
 },[courseId,lessonId,ids]);
 return <Block node={safe} urls={urls}/>;
};
