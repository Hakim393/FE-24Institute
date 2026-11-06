/** F34-R7Z-B — Canvas server authoring (create/update in current editable draft). */
import React, {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {EditorContent,useEditor} from '@tiptap/react';
import {Node} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextAlign} from '@tiptap/extension-text-align';
import {TextStyleKit} from '@tiptap/extension-text-style';
import {TableKit} from '@tiptap/extension-table';
import Youtube from '@tiptap/extension-youtube';
import {ArrowLeft,Save,Eye,Edit3,Image,Headphones,Video,Table2,Undo2,Redo2,AlertTriangle,Link as LinkIcon,Loader2} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {instructorService} from '../../services/instructor.service';
import {instructorCanvasService} from '../../services/instructor-canvas.service';
import {instructorMediaService} from '../../services/instructor-media.service';
import type {Lesson} from '../../types/course';
import {assertCanvasDraft,canvasStorageKey,legacyLessonToCanvas,parseYouTubeLink,serializeCanvasDraft,type CanvasDraft,type CanvasNode} from '../../utils/lesson-canvas-draft';
import './LessonCanvasPage.css';

const LessonMedia=Node.create({
  name:'lessonMedia', group:'block', atom:true, draggable:true,
  addAttributes(){return {
    kind:{default:'IMAGE'}, mediaId:{default:null}, label:{default:'Lampiran pembelajaran'},
  };},
  parseHTML(){return [{tag:'div[data-24i-lesson-media]'}];},
  renderHTML({HTMLAttributes}){
    const kind=HTMLAttributes.kind==='AUDIO'?'AUDIO':'IMAGE';
    const label=String(HTMLAttributes.label??'Lampiran').slice(0,100);
    return ['div',{
      'data-24i-lesson-media':'1', 'data-kind':kind,
      'data-media-id':HTMLAttributes.mediaId,'data-media-label':label,
      'class':'lesson-canvas-media'
    },`${kind==='AUDIO'?'🔊 AUDIO':'🖼️ GAMBAR'} · ${label} (akses melalui backend)`];
  }
});

type Seed={title:string;doc:CanvasNode;key:string;courseTitle:string;chapterTitle:string;lessonId:string;courseId:string;chapterId:string;versionId:string;updatedAt?:string;isNew:boolean};
const editorExtensions=[
  StarterKit.configure({heading:{levels:[1,2,3]},link:{openOnClick:false}}),
  TextAlign.configure({types:['heading','paragraph']}),TextStyleKit,TableKit,
  Youtube.configure({nocookie:true,controls:true,allowFullscreen:true,width:660,height:372}),LessonMedia
];
const btn='px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-teal-50 hover:border-teal-400 disabled:opacity-40 text-xs font-semibold';

function CanvasSurface({seed,onLeave}:{seed:Seed;onLeave:()=>void}){
  const [title,setTitle]=useState(seed.title);
  const [preview,setPreview]=useState(false);
  const [saveStatus,setSaveStatus]=useState('Materi belum disimpan di server');
  const [isSaving,setIsSaving]=useState(false);
  const [busy,setBusy]=useState<'IMAGE'|'AUDIO'|null>(null);
  const [error,setError]=useState('');
  const dirty=useRef(false);
  const editor=useEditor({extensions:editorExtensions,content:seed.doc,immediatelyRender:false,
    onUpdate(){dirty.current=true;setSaveStatus('Perubahan belum disimpan');},
  });
  const doSave=useCallback((silent=false)=>{
    if(!editor)return false;
    try{
      const draft:CanvasDraft={version:1,title:title.trim(),doc:editor.getJSON() as CanvasNode,updatedAt:new Date().toISOString()};
      if(draft.title.length>255)throw new Error('Judul materi maksimal 255 karakter.');
      const payload=serializeCanvasDraft(draft);
      localStorage.setItem(seed.key,payload);
      dirty.current=false;
      setSaveStatus('Draft lokal disimpan · belum ke backend');setError('');
      return true;
    }catch(e){if(!silent)setError(e instanceof Error?e.message:'Tidak dapat menyimpan draft.');setSaveStatus('Gagal menyimpan draft lokal');return false;}
  },[editor,seed.key,title]);
  const saveToServer=useCallback(async()=>{
    if(!editor||isSaving)return;
    setIsSaving(true);setError('');setSaveStatus('Menyimpan ke backend...');
    try{
      if(!seed.versionId)throw new Error('Versi draft belum tersedia.');
      const draft:CanvasDraft={version:1,title:title.trim(),doc:editor.getJSON() as CanvasNode,updatedAt:new Date().toISOString()};
      serializeCanvasDraft(draft);
      if(!draft.title)throw new Error('Judul materi wajib diisi.');
      const payload={title:draft.title,doc:draft.doc,expectedDraftVersionId:seed.versionId};
      if(seed.isNew){
        const clientLessonId=seed.lessonId.replace(/^new-/,'');
        await instructorCanvasService.create(seed.courseId,seed.chapterId,{...payload,clientLessonId});
      }else{
        await instructorCanvasService.update(seed.courseId,seed.chapterId,seed.lessonId,{...payload,expectedUpdatedAt:seed.updatedAt});
      }
      localStorage.removeItem(seed.key);
      dirty.current=false;
      setSaveStatus('Materi berhasil tersimpan di backend');
      onLeave();
    }catch(e){
      const message=e instanceof Error?e.message:'Server gagal menyimpan materi.';
      doSave(true); // optional offline recovery only; never claim server success
      setSaveStatus('Gagal menyimpan ke server');setError(message);
    }finally{setIsSaving(false);}
  },[editor,isSaving,seed,title,onLeave,doSave]);
  useEffect(()=>{
    if(!editor)return;
    const timer=window.setInterval(()=>{if(dirty.current)doSave(true);},1500);
    return ()=>window.clearInterval(timer);
  },[editor,doSave]);
  useEffect(()=>{if(!editor)return;editor.setEditable(!preview);},[editor,preview]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn);},[]);

  const inputFile=async(kind:'IMAGE'|'AUDIO',file?:File)=>{
    if(!file || !editor || busy)return;
    if(!window.confirm(`Upload ${kind==='IMAGE'?'gambar':'audio'} ke Media Library perusahaan? Dokumen canvas masih lokal dan belum terbit.`))return;
    setBusy(kind);setError('');
    try{
      const r=kind==='IMAGE'?await instructorMediaService.uploadLessonImage(file):await instructorMediaService.uploadLessonAudio(file);
      const mediaId=r.mediaId;
      if(!/^[0-9a-f-]{36}$/i.test(mediaId))throw new Error('Media ID backend tidak valid.');
      editor.chain().focus().insertContent({type:'lessonMedia',attrs:{kind,mediaId,label:file.name.slice(0,100)}}).run();
      dirty.current=true;setSaveStatus('Media diupload · simpan draft lokal sekarang');
    }catch(e){setError(e instanceof Error?e.message:'Upload media gagal.');}
    finally{setBusy(null);}
  };
  const insertVideo=()=>{
    const v=window.prompt('Masukkan tautan YouTube resmi (HTTPS):');
    if(!v||!editor)return;
    try{editor.chain().focus().setYoutubeVideo({src:parseYouTubeLink(v)}).run();setError('');}
    catch(e){setError(e instanceof Error?e.message:'Video tidak valid');}
  };
  const insertLink=()=>{
    if(!editor)return;
    const v=window.prompt('Tautan HTTPS atau mailto:');
    if(v===null)return;
    if(v.trim()===''){editor.chain().focus().unsetLink().run();return;}
    try{const u=new URL(v);if(!['https:','mailto:'].includes(u.protocol))throw new Error();editor.chain().focus().setLink({href:u.toString(),target:'_blank',rel:'noopener noreferrer'}).run();}
    catch{setError('Tautan harus memakai HTTPS atau mailto:.');}
  };
  const back=()=>{
    if(dirty.current&&!doSave()&&!window.confirm('Draft gagal disimpan. Tetap keluar?'))return;
    onLeave();
  };
  if(!editor)return <div className="p-10 text-white">Menyiapkan canvas editor...</div>;
  const cmd=(label:string,action:()=>unknown,disabled=false)=><button type="button" title={label} className={btn} disabled={disabled||preview} onClick={action}>{label}</button>;
  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <div className="sticky top-0 z-20 bg-slate-950 text-white shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <button className="inline-flex items-center gap-2 text-sm hover:text-teal-300" onClick={back}><ArrowLeft size={17}/> Kembali ke Kurikulum</button>
      <div className="text-center min-w-0"><p className="text-[10px] uppercase tracking-widest text-teal-300">24Institute · Canvas Lesson Editor</p><p className="text-xs text-slate-300 truncate">{seed.courseTitle} / {seed.chapterTitle}</p></div>
      <div className="flex gap-2"><button className="rounded-lg bg-slate-800 px-3 py-2 text-xs" onClick={()=>setPreview(v=>!v)}>{preview?<><Edit3 size={13} className="inline"/> Tulis</>:<><Eye size={13} className="inline"/> Preview</>}</button><button disabled={isSaving||busy!==null} className="rounded-lg bg-teal-500 hover:bg-teal-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50" onClick={()=>void saveToServer()}><Save size={13} className="inline"/> {isSaving?"Menyimpan...":"Simpan Materi"}</button></div>
    </div>
    <div className="border-b border-teal-300 bg-teal-50 text-teal-950 px-5 py-3 text-xs flex gap-2 items-start"><Save className="shrink-0" size={17}/><span><strong>Canvas Server Draft.</strong> Klik Simpan Materi untuk membuat/memperbarui lesson di draft course. Setelah berhasil, kembali ke kurikulum dan Ajukan Peninjauan. Student baru dapat belajar setelah disetujui serta dipublikasikan Admin. Autosave browser hanya cadangan dan bukan bukti penyimpanan server.</span></div>
    <div className="mx-auto max-w-6xl p-4 md:p-7">
      <div className="rounded-xl bg-white border border-slate-300 shadow-sm p-3 flex items-center justify-between gap-2 flex-wrap mb-3"><span className="text-xs text-slate-600">{saveStatus}</span><span className="text-xs font-semibold text-teal-700">Publish melalui review Admin</span></div>
      {!preview&&<div className="sticky top-[62px] z-10 bg-white border border-slate-200 shadow-sm rounded-xl p-3 flex flex-wrap gap-1.5 mb-5 items-center">
        <select aria-label="Jenis judul" className={btn} onChange={e=>{const v=e.target.value;if(v==='p')editor.chain().focus().setParagraph().run();else editor.chain().focus().toggleHeading({level:Number(v) as 1|2|3}).run();}} defaultValue="p"><option value="p">Paragraf</option><option value="1">H1</option><option value="2">H2</option><option value="3">H3</option></select>
        <select aria-label="Jenis font" className={btn} onChange={e=>editor.chain().focus().setFontFamily(e.target.value).run()} defaultValue="Arial"><option>Arial</option><option>Georgia</option><option>Verdana</option><option>Courier New</option></select>
        <select aria-label="Ukuran font" className={btn} onChange={e=>editor.chain().focus().setFontSize(`${e.target.value}px`).run()} defaultValue="16"><option>12</option><option>14</option><option>16</option><option>18</option><option>20</option><option>24</option><option>30</option><option>36</option></select>
        {cmd('B',()=>editor.chain().focus().toggleBold().run())}{cmd('I',()=>editor.chain().focus().toggleItalic().run())}{cmd('U',()=>editor.chain().focus().toggleUnderline().run())}{cmd('S̶',()=>editor.chain().focus().toggleStrike().run())}
        {cmd('Kiri',()=>editor.chain().focus().setTextAlign('left').run())}{cmd('Tengah',()=>editor.chain().focus().setTextAlign('center').run())}{cmd('Kanan',()=>editor.chain().focus().setTextAlign('right').run())}
        {cmd('• List',()=>editor.chain().focus().toggleBulletList().run())}{cmd('1. List',()=>editor.chain().focus().toggleOrderedList().run())}{cmd('Kutipan',()=>editor.chain().focus().toggleBlockquote().run())}{cmd('Kode',()=>editor.chain().focus().toggleCodeBlock().run())}
        {cmd('Tautan',insertLink)}{cmd('Tabel',()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run())}{cmd('+ Baris',()=>editor.chain().focus().addRowAfter().run())}{cmd('+ Kolom',()=>editor.chain().focus().addColumnAfter().run())}{cmd('Hapus Tabel',()=>editor.chain().focus().deleteTable().run())}
        <label className={`${btn} cursor-pointer flex items-center gap-1`}><Image size={13}/> {busy==='IMAGE'?'Mengunggah...':'Gambar'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy!==null} onChange={e=>{void inputFile('IMAGE',e.target.files?.[0]);e.target.value='';}}/></label>
        <label className={`${btn} cursor-pointer flex items-center gap-1`}><Headphones size={13}/> {busy==='AUDIO'?'Mengunggah...':'Audio'}<input type="file" accept="audio/*" hidden disabled={busy!==null} onChange={e=>{void inputFile('AUDIO',e.target.files?.[0]);e.target.value='';}}/></label>
        {cmd('YouTube',insertVideo)}{cmd('Undo',()=>editor.chain().focus().undo().run())}{cmd('Redo',()=>editor.chain().focus().redo().run())}
      </div>}
      <div className="lesson-canvas-paper bg-white shadow-xl mx-auto px-8 md:px-16 py-12 min-h-[760px] max-w-4xl">
        <input aria-label="Judul materi" value={title} maxLength={255} disabled={preview} onChange={e=>{setTitle(e.target.value);dirty.current=true;setSaveStatus('Perubahan belum disimpan');}} placeholder="Judul materi pembelajaran..." className="w-full text-3xl md:text-4xl font-extrabold outline-none border-0 border-b border-slate-100 pb-5 mb-6 placeholder:text-slate-300 bg-transparent"/>
        <EditorContent editor={editor} className="lesson-canvas-editor" />
      </div>
      {error&&<div role="alert" className="mt-4 text-rose-800 bg-rose-100 border border-rose-300 rounded-lg px-4 py-3 text-sm">{error}</div>}
      <div className="max-w-4xl mx-auto mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600"><span>Materi akan terhubung ke bab dan versi draft yang aktif.</span><button disabled={isSaving||busy!==null} className="bg-slate-900 text-white font-bold px-4 py-3 rounded-lg disabled:opacity-50" onClick={()=>void saveToServer()}>{isSaving?"Menyimpan...":"Simpan Materi ke Server"}</button></div>
    </div>
  </div>;
}

export const LessonCanvasPage:React.FC=()=>{
  const {courseId,chapterId,lessonId}=useParams<{courseId:string;chapterId:string;lessonId:string}>();
  const nav=useNavigate();const {user}=useAuth();
  const [seed,setSeed]=useState<Seed|null>(null);const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      if(!courseId||!chapterId||!lessonId||!user?.id){setError('Parameter canvas tidak lengkap.');return;}
      try{
        const [c,cur]=await Promise.all([instructorService.getCourse(courseId),instructorService.getCurriculum(courseId)]);
        if(!c.success||!c.data||!cur.success||!cur.data)throw new Error('Course / kurikulum tidak dapat diverifikasi.');
        const course=c.data;
        const versionId=course.currentDraftVersionId;
        if(!versionId||!course.draftVersion||!['DRAFT','REJECTED'].includes(course.draftVersion.status)) throw new Error('Editor hanya untuk draft course yang dapat diubah.');
        if(course.instructorId!==user?.id)throw new Error('Course tidak terdaftar sebagai milik Instructor ini.');
        const chap=cur.data.chapters.find(ch=>ch.id===chapterId&&ch.courseVersionId===versionId);
        if(!chap)throw new Error('Bab tidak berada di draft yang aktif.');
        const isNew=lessonId==='new'||/^new-[0-9a-f-]{36}$/i.test(lessonId);
        const lesson:Lesson|undefined=isNew?undefined:chap.lessons.find(l=>l.id===lessonId);
        if(!isNew&&!lesson)throw new Error('Lesson tidak tersedia pada bab ini.');
        const key=canvasStorageKey(user.id,versionId,chapterId,lessonId);
        let doc=legacyLessonToCanvas(lesson?.textContent,lesson?.youtubeVideoId);
        let title=lesson?.title||'';
        let updatedAt:string|undefined;
        if(!isNew){
          const stored=await instructorCanvasService.get(courseId,chapterId,lessonId);
          title=stored.title;
          updatedAt=stored.updatedAt;
          if(stored.canvasDocument){
            const parsed=assertCanvasDraft({version:1,title,doc:stored.canvasDocument,updatedAt:new Date().toISOString()});
            doc=parsed.doc;
          }else{
            doc=legacyLessonToCanvas(stored.textContent,stored.youtubeVideoId);
          }
        }
        if(!cancelled)setSeed({key,doc,title,courseTitle:course.title,chapterTitle:chap.title,lessonId,courseId,chapterId,versionId,updatedAt,isNew});
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Canvas gagal dibuka.');}
    }
    void load();return()=>{cancelled=true;};
  },[courseId,chapterId,lessonId,user?.id]);
  const back=useCallback(()=>nav(`/instructor/builder/${courseId}`),[nav,courseId]);
  return seed?<CanvasSurface key={seed.key} seed={seed} onLeave={back}/>:<div className="mx-auto max-w-3xl p-8 text-slate-100">{error?<div className="bg-rose-950 border border-rose-700 rounded-xl p-5"><AlertTriangle size={18} className="inline mr-2"/>{error}<button onClick={back} className="block mt-5 underline">Kembali ke Builder</button></div>:<div className="flex gap-2"><Loader2 className="animate-spin"/> Memverifikasi izin draft dan memuat Canvas...</div>}</div>;
};
