/** F34-R7Z-A: local-only editor document. NOT a publishable backend lesson payload. */
export type CanvasNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: CanvasNode[];
};
export type CanvasDraft = {
  version: 1;
  title: string;
  doc: CanvasNode;
  updatedAt: string;
};
const ALLOWED_NODES = new Set([
  'doc','paragraph','heading','text','blockquote','bulletList','orderedList','listItem',
  'codeBlock','hardBreak','horizontalRule','table','tableRow','tableCell','tableHeader',
  'youtube','lessonMedia'
]);
const ALLOWED_MARKS = new Set(['bold','italic','underline','strike','code','link','textStyle']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YOU_TUBE_ID = /^[a-zA-Z0-9_-]{11}$/;

export function parseYouTubeLink(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Gunakan URL HTTPS YouTube resmi.');
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com') {
    id = url.pathname === '/watch' ? url.searchParams.get('v') :
      /^\/(?:embed|shorts)\/[\w-]{11}$/.test(url.pathname) ? url.pathname.split('/')[2] : null;
  } else if (host === 'youtu.be') {
    id = /^\/[\w-]{11}$/.test(url.pathname) ? url.pathname.slice(1) : null;
  }
  if (!id || !YOU_TUBE_ID.test(id)) throw new Error('URL/ID YouTube tidak valid.');
  return `https://www.youtube.com/watch?v=${id}`;
}

function validNode(node: unknown, depth: number, counter: {count:number}): node is CanvasNode {
  if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 24 || ++counter.count > 2000) return false;
  const n = node as CanvasNode;
  if (typeof n.type !== 'string' || !ALLOWED_NODES.has(n.type)) return false;
  if (n.text !== undefined && (typeof n.text !== 'string' || n.text.length > 10000 || n.type !== 'text')) return false;
  if (n.attrs !== undefined && (typeof n.attrs !== 'object' || !n.attrs || Array.isArray(n.attrs))) return false;
  if (n.type === 'lessonMedia') {
    if (!n.attrs || !UUID.test(String(n.attrs.mediaId ?? '')) ||
        !['IMAGE','AUDIO'].includes(String(n.attrs.kind ?? ''))) return false;
  }
  if (n.type === 'youtube') {
    if (!n.attrs || typeof n.attrs.src !== 'string') return false;
    try { parseYouTubeLink(n.attrs.src); } catch { return false; }
  }
  if (n.type === 'heading' && n.attrs?.level !== undefined && ![1,2,3].includes(Number(n.attrs.level))) return false;
  if (n.marks !== undefined && (!Array.isArray(n.marks) || n.marks.length > 30 || n.marks.some(mark => {
    if (!mark || !ALLOWED_MARKS.has(mark.type)) return true;
    if (mark.type === 'link') {
      if (typeof mark.attrs?.href !== 'string') return true;
      try { const u=new URL(mark.attrs.href); if (!['https:','mailto:'].includes(u.protocol)) return true; } catch { return true; }
    }
    return false;
  }))) return false;
  if (n.content !== undefined && (!Array.isArray(n.content) || n.content.some(child => !validNode(child,depth+1,counter)))) return false;
  return true;
}
export function assertCanvasDraft(value: unknown): CanvasDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Draft canvas tidak valid');
  const d=value as CanvasDraft;
  if (d.version !== 1 || typeof d.title !== 'string' || d.title.length > 255 ||
    typeof d.updatedAt !== 'string' || !validNode(d.doc,0,{count:0}) || d.doc.type !== 'doc') {
    throw new Error('Draft canvas ditolak: format atau node tidak sesuai.');
  }
  return d;
}
export function canvasStorageKey(userId:string, courseVersionId:string, chapterId:string, lessonId:string) {
  for (const v of [userId,courseVersionId,chapterId]) {
    if (!UUID.test(v)) throw new Error('Identitas draft canvas tidak valid.');
  }
  if (lessonId !== 'new' && !/^new-[0-9a-f-]{36}$/i.test(lessonId) && !UUID.test(lessonId)) throw new Error('Lesson ID canvas tidak valid.');
  return `24i:local-canvas:v1:${userId}:${courseVersionId}:${chapterId}:${lessonId}`;
}
export function serializeCanvasDraft(draft: CanvasDraft): string {
  assertCanvasDraft(draft);
  const json=JSON.stringify(draft);
  if (json.length>300000) throw new Error('Draft terlalu besar untuk penyimpanan lokal.');
  return json;
}
export function legacyLessonToCanvas(textContent?: string|null, youtubeVideoId?: string|null):CanvasNode {
  const blocks:CanvasNode[]=[];
  if (textContent) {
    for (const text of textContent.split(/\n\n+/).slice(0,200)) {
      blocks.push({type:'paragraph',content:[{type:'text',text:text.slice(0,10000)}]});
    }
  }
  if (youtubeVideoId && YOU_TUBE_ID.test(youtubeVideoId)) blocks.push({type:'youtube',attrs:{src:`https://www.youtube.com/watch?v=${youtubeVideoId}`}});
  if (!blocks.length) blocks.push({type:'paragraph'});
  return {type:'doc',content:blocks};
}

/** Enumerate only local drafts scoped to one Instructor/version/chapter; never treat as server lessons. */
export function listLocalCanvasDrafts(storage: Pick<Storage,'length'|'key'|'getItem'>, userId:string, courseVersionId:string, chapterId:string): {key:string;lessonId:string;title:string;updatedAt:string}[] {
  const prefix=canvasStorageKey(userId,courseVersionId,chapterId,'new-00000000-0000-4000-8000-000000000000').replace(/new-[^:]+$/,'new-');
  const result:{key:string;lessonId:string;title:string;updatedAt:string}[]=[];
  for(let i=0;i<Math.min(storage.length,300);i++) {
    const key=storage.key(i);
    if(!key?.startsWith(prefix))continue;
    const lessonId=key.slice(prefix.length-4);
    if(!/^new-[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(lessonId))continue;
    try{
      const raw=storage.getItem(key);if(!raw)continue;
      const d=assertCanvasDraft(JSON.parse(raw));
      result.push({key,lessonId,title:d.title||'Materi tanpa judul',updatedAt:d.updatedAt});
    }catch {/* Ignore locally corrupt drafts; never trust storage as backend. */}
  }
  return result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
