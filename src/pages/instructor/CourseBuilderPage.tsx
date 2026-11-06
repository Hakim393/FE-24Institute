import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { instructorService } from '../../services/instructor.service';
import { instructorMediaService, validateInstructorLessonFile, uploadInstructorCourseThumbnail, validateInstructorThumbnail } from '../../services/instructor-media.service';
import { requireMutationSuccess, requireCreatedId } from '../../utils/mutation-guards';
import { requireCreatedQuizQuestionId, requireCreatedQuizOption } from '../../services/adapters/instructor-quiz-contract';
import { buildInstructorLessonUpdatePatch } from '../../services/adapters/instructor-lesson-update';
import { listLocalCanvasDrafts } from '../../utils/lesson-canvas-draft';
import { requirePublishedVersionId, requireDraftVersionId, getInstructorCourseBuilderMode } from '../../utils/course-workflow-guards';
import { useNotification } from '../../context/NotificationContext';
import {
  Course,
  Chapter,
  Lesson,
  Quiz,
  CourseCompleteness,
  CourseLevel,
  LessonType,
} from '../../types/course';
import { formatIDR } from '../../utils/formatters';
import { buildIntroMetadataPatch, listItemsToText, textToListItems } from '../../utils/course-intro-metadata';
import {
  BookOpen,
  Layers,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Video,
  FileText,
  Image as ImageIcon,
  Headphones,
  HelpCircle,
  Send,
  ArrowLeft,
  Loader2,
  Save,
  CheckCheck,
  RefreshCw,
} from 'lucide-react';

export const CourseBuilderPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { showToast } = useNotification();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [completeness, setCompleteness] = useState<CourseCompleteness | null>(null);
  const [activeTab, setActiveTab] = useState<'INTRO' | 'CURRICULUM' | 'METADATA' | 'COMPLETENESS'>('CURRICULUM');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreatingRevision, setIsCreatingRevision] = useState(false);

  // Metadata form
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [level, setLevel] = useState<CourseLevel>('BEGINNER');
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [introObjectives, setIntroObjectives] = useState('');
  const [introRequirements, setIntroRequirements] = useState('');
  const [introAudience, setIntroAudience] = useState('');
  const [isSavingIntro, setIsSavingIntro] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [confirmedThumbnailMediaId, setConfirmedThumbnailMediaId] = useState<string | null>(null);
  const [isSavingThumbnail, setIsSavingThumbnail] = useState(false);
  const [savingPreviewLessonId, setSavingPreviewLessonId] = useState<string | null>(null);

  // Chapter modal
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDesc, setChapterDesc] = useState('');
  const [isSavingChapter, setIsSavingChapter] = useState(false);

  // Lesson modal
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [targetChapterId, setTargetChapterId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('TEXT');
  const [lessonText, setLessonText] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [lessonImageFile, setLessonImageFile] = useState<File | null>(null);
  const [lessonAudioFile, setLessonAudioFile] = useState<File | null>(null);
  // Keep successful uploads while retrying a failed Lesson POST, avoiding duplicate media writes.
  const [lessonImageMediaId, setLessonImageMediaId] = useState<string | null>(null);
  const [lessonAudioMediaId, setLessonAudioMediaId] = useState<string | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);

  // Quiz modal
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizChapterId, setQuizChapterId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizGrade, setQuizGrade] = useState('70');
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Question & Option Modal
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState('');
  const [qChapterId, setQChapterId] = useState('');
  const [qPrompt, setQPrompt] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctOptIdx, setCorrectOptIdx] = useState(0);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Submit for Review
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchBuilderData = async () => {
    if (!courseId) return;
    setIsLoading(true);
    setCourse(null);
    setChapters([]);
    setCompleteness(null);
    setLoadError(null);
    try {
      // Course detail is fetched first. Published courses normally have no draft.
      // Never let a draft-only curriculum endpoint erase a valid published detail.
      const cRes = await instructorService.getCourse(courseId);
      if (!cRes.success || !cRes.data) {
        throw new Error(cRes.message || 'Detail course tidak tersedia.');
      }
      const loadedCourse = cRes.data;
      const builderMode = getInstructorCourseBuilderMode(loadedCourse);
      if (builderMode === 'MISSING_VERSION') {
        throw new Error('Informasi versi course tidak konsisten. Jangan membuat draft sebelum diperiksa.');
      }
      setCourse(loadedCourse);
      setTitle(loadedCourse.title);
      setSubtitle(loadedCourse.subtitle || '');
      setDescription(loadedCourse.description || '');
      setPrice(loadedCourse.price);
      setLevel(loadedCourse.level);
      setIntroObjectives(listItemsToText(loadedCourse.draftVersion?.learningObjectives));
      setIntroRequirements(listItemsToText(loadedCourse.draftVersion?.requirements));
      setIntroAudience(listItemsToText(loadedCourse.draftVersion?.targetAudience));

      // A published-only course is read-only until the Instructor deliberately
      // creates a new revision via the existing guarded backend endpoint.
      if (builderMode === 'PUBLISHED_NO_DRAFT') return;

      const [currRes, compRes] = await Promise.all([
        instructorService.getCurriculum(courseId),
        instructorService.getCompleteness(courseId),
      ]);
      if (!currRes.success || !currRes.data || !Array.isArray(currRes.data.chapters)) {
        throw new Error('Kurikulum draft tidak dapat dimuat.');
      }
      if (!compRes.success || !compRes.data) {
        throw new Error('Validasi kelengkapan draft tidak dapat dimuat.');
      }
      setChapters(currRes.data.chapters);
      setCompleteness(compRes.data);
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Gagal memuat Course Builder.';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilderData();
  }, [courseId]);

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setIsSavingMeta(true);
    try {
      if (!course) throw new Error('Detail course belum tersedia. Muat ulang terlebih dahulu.');
      const patch: { title?: string; shortDescription?: string; description?: string; price?: string; level?: CourseLevel } = {};
      if (title.trim() !== course.title.trim()) patch.title = title.trim();
      if (subtitle.trim() !== (course.subtitle || '').trim()) patch.shortDescription = subtitle.trim();
      if (description.trim() !== (course.description || '').trim()) patch.description = description.trim();
      if (price.trim() !== course.price.trim()) patch.price = price.trim();
      if (level !== course.level) patch.level = level;
      if (Object.keys(patch).length === 0) {
        showToast('Tidak ada perubahan metadata untuk disimpan.', 'info');
        return;
      }
      const res = await instructorService.updateDraftCourse(courseId, patch);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Metadata kursus berhasil disimpan.', 'success');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan metadata.', 'error');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSaveIntroduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !course || isSavingIntro) return;
    try {
      // PATCH only changed fields: backend rejects requests with no actual changes.
      const patch = buildIntroMetadataPatch({
        subtitle,
        learningObjectives: textToListItems(introObjectives),
        requirements: textToListItems(introRequirements),
        targetAudience: textToListItems(introAudience),
      }, {
        subtitle: course.subtitle || '',
        learningObjectives: course.draftVersion?.learningObjectives || [],
        requirements: course.draftVersion?.requirements || [],
        targetAudience: course.draftVersion?.targetAudience || [],
      });
      if (Object.keys(patch).length === 0) {
        showToast('Pengenalan kursus belum memiliki perubahan untuk disimpan.', 'info');
        return;
      }
      setIsSavingIntro(true);
      const response = await instructorService.updateDraftCourse(courseId, patch);
      requireMutationSuccess(response);
      showToast('Pengenalan kursus berhasil disimpan.', 'success');
      await fetchBuilderData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengenalan kursus.', 'error');
    } finally {
      setIsSavingIntro(false);
    }
  };

  const handleSaveThumbnail = async () => {
    if (!courseId || (!thumbnailFile && !confirmedThumbnailMediaId) || isSavingThumbnail) return;
    setIsSavingThumbnail(true);
    try {
      let mediaId = confirmedThumbnailMediaId;
      if (!mediaId && thumbnailFile) {
        const uploaded = await uploadInstructorCourseThumbnail(thumbnailFile);
        mediaId = uploaded.mediaId;
        setConfirmedThumbnailMediaId(mediaId); // keep upload for PATCH retry; prevent duplicate upload
      }
      if (!mediaId) throw new Error('Thumbnail belum tersedia.');
      const response = await instructorService.updateDraftCourse(courseId, { thumbnailMediaId: mediaId });
      requireMutationSuccess(response);
      if (!response.data?.thumbnailUrl) {
        // Do not falsely mark upload+attachment complete without a confirmed draft version.
        throw new Error('Backend belum mengonfirmasi thumbnail course. Periksa detail course sebelum retry.');
      }
      setThumbnailFile(null);
      setConfirmedThumbnailMediaId(null);
      showToast('Thumbnail course berhasil ditautkan.', 'success');
      await fetchBuilderData();
    } catch (err: any) {
      showToast(err.message || 'Gagal menautkan thumbnail.', 'error');
    } finally {
      setIsSavingThumbnail(false);
    }
  };

  const handleToggleFreePreview = async (chapterId: string, lessonId: string, next: boolean) => {
    if (!courseId || savingPreviewLessonId) return;
    setSavingPreviewLessonId(lessonId);
    try {
      await instructorService.setLessonPreview(courseId, chapterId, lessonId, next);
      showToast(next ? 'Lesson berhasil dijadikan preview gratis.' : 'Preview gratis berhasil dicabut.', 'success');
      await fetchBuilderData();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status preview.', 'error');
    } finally {
      setSavingPreviewLessonId(null);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !chapterTitle.trim()) return;
    setIsSavingChapter(true);
    try {
      const res = await instructorService.createChapter(courseId, {
        title: chapterTitle.trim(),
        description: chapterDesc.trim() || undefined,
      });
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Bab baru berhasil ditambahkan.', 'success');
        setChapterModalOpen(false);
        setChapterTitle('');
        setChapterDesc('');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat bab.', 'error');
    } finally {
      setIsSavingChapter(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!courseId || !confirm('Hapus bab ini beserta seluruh materi di dalamnya?')) return;
    try {
      const res = await instructorService.deleteChapter(courseId, chapterId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Bab berhasil dihapus.', 'info');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus bab.', 'error');
    }
  };

  const resetLessonEditor = () => {
    setEditingLesson(null);
    setLessonModalOpen(false);
    setLessonTitle('');
    setLessonText('');
    setYoutubeId('');
    setLessonType('TEXT');
    setLessonImageFile(null);
    setLessonAudioFile(null);
    setLessonImageMediaId(null);
    setLessonAudioMediaId(null);
  };

  const openLessonForEdit = (chapterId: string, lesson: Lesson) => {
    if (!courseId || !course?.currentDraftVersionId ||
        (course.draftVersion?.status && !['DRAFT', 'REJECTED'].includes(course.draftVersion.status))) {
      showToast('Materi hanya boleh direvisi pada draft course aktif.', 'error');
      return;
    }
    navigate(`/instructor/builder/${courseId}/chapters/${chapterId}/lesson-canvas/${lesson.id}`);
  };

  const handleUpdateExistingLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const original = editingLesson;
    if (!courseId || !targetChapterId || !original || isSavingLesson) return;
    if (original.chapterId !== targetChapterId ||
        !chapters.some(ch => ch.id === targetChapterId && ch.lessons.some(l => l.id === original.id))) {
      showToast('Materi tidak lagi berada di bab yang sama. Muat ulang kurikulum.', 'error');
      return;
    }
    setIsSavingLesson(true);
    try {
      // Check local edits first, before uploading any new media.
      const basePatch = buildInstructorLessonUpdatePatch(original, {
        title: lessonTitle,
        type: lessonType,
        textContent: lessonText,
        youtubeUrl: youtubeId,
      });
      if (Object.keys(basePatch).length === 0 && !lessonImageFile && !lessonAudioFile &&
          !lessonImageMediaId && !lessonAudioMediaId) {
        showToast('Belum ada perubahan pada materi.', 'info');
        return;
      }
      let imageMediaId = lessonImageMediaId;
      let audioMediaId = lessonAudioMediaId;
      if (lessonImageFile && !imageMediaId) {
        const uploaded = await instructorMediaService.uploadLessonImage(lessonImageFile);
        imageMediaId = uploaded.mediaId;
        setLessonImageMediaId(imageMediaId);
      }
      if (lessonAudioFile && !audioMediaId) {
        const uploaded = await instructorMediaService.uploadLessonAudio(lessonAudioFile);
        audioMediaId = uploaded.mediaId;
        setLessonAudioMediaId(audioMediaId);
      }
      const patch = buildInstructorLessonUpdatePatch(original, {
        title: lessonTitle,
        type: lessonType,
        textContent: lessonText,
        youtubeUrl: youtubeId,
        imageMediaId,
        audioMediaId,
      });
      if (Object.keys(patch).length === 0) throw new Error('Tidak ada perubahan materi.');
      const res = await instructorService.updateLesson(courseId, targetChapterId, original.id, patch);
      requireMutationSuccess(res);
      showToast('Revisi materi berhasil disimpan tanpa membuat lesson baru.', 'success');
      resetLessonEditor();
      await fetchBuilderData();
    } catch (err: any) {
      // Keep successful upload IDs in state when PATCH fails; avoid uploading twice on retry.
      showToast(err.message || 'Gagal menyimpan revisi materi.', 'error');
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !targetChapterId || !lessonTitle.trim() || isSavingLesson) return;
    setIsSavingLesson(true);
    try {
      const usesImage = lessonType === 'IMAGE' || lessonType === 'MIXED';
      const usesAudio = lessonType === 'AUDIO' || lessonType === 'MIXED';
      const usesYoutube = lessonType === 'YOUTUBE_VIDEO' || lessonType === 'MIXED';

      if (lessonType === 'IMAGE' && !lessonImageFile && !lessonImageMediaId) {
        throw new Error('Pilih gambar dahulu sebelum menyimpan Lesson IMAGE.');
      }
      if (lessonType === 'AUDIO' && !lessonAudioFile && !lessonAudioMediaId) {
        throw new Error('Pilih file audio dahulu sebelum menyimpan Lesson AUDIO.');
      }
      if (lessonType === 'MIXED' && !lessonImageFile && !lessonAudioFile &&
          !lessonImageMediaId && !lessonAudioMediaId && !youtubeId.trim()) {
        throw new Error('MIXED memerlukan gambar, audio, atau video YouTube selain teks.');
      }

      let imageMediaId = usesImage ? lessonImageMediaId : null;
      let audioMediaId = usesAudio ? lessonAudioMediaId : null;
      if (usesImage && lessonImageFile && !imageMediaId) {
        const uploaded = await instructorMediaService.uploadLessonImage(lessonImageFile);
        imageMediaId = uploaded.mediaId;
        setLessonImageMediaId(imageMediaId);
      }
      if (usesAudio && lessonAudioFile && !audioMediaId) {
        const uploaded = await instructorMediaService.uploadLessonAudio(lessonAudioFile);
        audioMediaId = uploaded.mediaId;
        setLessonAudioMediaId(audioMediaId);
      }

      const res = await instructorService.createLesson(courseId, targetChapterId, {
        title: lessonTitle.trim(),
        type: lessonType,
        textContent: lessonText.trim() || undefined,
        youtubeUrl: usesYoutube ? (youtubeId.trim() || undefined) : undefined,
        imageMediaId: usesImage ? (imageMediaId || undefined) : undefined,
        audioMediaId: usesAudio ? (audioMediaId || undefined) : undefined,
      });
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Materi pelajaran berhasil ditambahkan.', 'success');
        resetLessonEditor();
        fetchBuilderData();
      }
    } catch (err: any) {
      // Do not discard a confirmed mediaId; the user can retry Lesson creation without reuploading.
      showToast(err.message || 'Gagal menambahkan materi.', 'error');
    } finally {
      setIsSavingLesson(false);
    }
  };

  const handleLessonFileSelect = (
    type: 'IMAGE' | 'AUDIO',
    file: File | null
  ) => {
    if (!file) return;
    try {
      validateInstructorLessonFile(file, type);
      if (type === 'IMAGE') {
        setLessonImageFile(file);
        setLessonImageMediaId(null);
      } else {
        setLessonAudioFile(file);
        setLessonAudioMediaId(null);
      }
    } catch (error: any) {
      showToast(error.message || 'Berkas media tidak valid.', 'error');
    }
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!courseId || !confirm('Hapus materi pelajaran ini?')) return;
    try {
      const res = await instructorService.deleteLesson(courseId, chapterId, lessonId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Materi berhasil dihapus.', 'info');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus materi.', 'error');
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !quizChapterId || !quizTitle.trim()) return;
    setIsSavingQuiz(true);
    try {
      const res = await instructorService.createQuiz(courseId, quizChapterId, {
        title: quizTitle.trim(),
        passingGrade: parseInt(quizGrade) || 70,
      });
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Kuis evaluasi berhasil ditambahkan.', 'success');
        setQuizModalOpen(false);
        setQuizTitle('');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat kuis.', 'error');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (chapterId: string, quizId: string) => {
    if (!courseId || !confirm('Hapus kuis ini beserta semua pertanyaan dan opsi di dalamnya?')) return;
    try {
      const res = await instructorService.deleteQuiz(courseId, chapterId, quizId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Kuis berhasil dihapus.', 'info');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kuis.', 'error');
    }
  };

  const handleDeleteQuestion = async (chapterId: string, quizId: string, questionId: string) => {
    if (!courseId || !confirm('Hapus butir pertanyaan ini?')) return;
    try {
      const res = await instructorService.deleteQuizQuestion(courseId, chapterId, quizId, questionId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Pertanyaan kuis berhasil dihapus.', 'info');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus pertanyaan.', 'error');
    }
  };

  const handleCreateRevision = async () => {
    if (!courseId || isCreatingRevision) return;
    if (!course || getInstructorCourseBuilderMode(course) !== 'PUBLISHED_NO_DRAFT') {
      showToast('Revisi hanya dapat dibuat saat course terbit tidak memiliki draft aktif.', 'error');
      return;
    }
    let publishedVerId: string;
    try {
      publishedVerId = requirePublishedVersionId(course);
    } catch (err: any) {
      showToast(err.message, 'error');
      return;
    }
    if (!confirm('Buat draf revisi baru dari versi kursus yang sedang tayang (PUBLISHED)? Versi yang sedang dipelajari Student tidak akan diubah.')) return;
    setIsCreatingRevision(true);
    try {
      const res = await instructorService.createRevision(courseId, publishedVerId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Draf revisi kursus baru berhasil dibuat. Anda dapat mulai mengedit materi.', 'success');
        await fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat revisi kursus.', 'error');
    } finally {
      setIsCreatingRevision(false);
    }
  };

  const handleCreateQuestionAndOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !qChapterId || !activeQuizId || !qPrompt.trim() || !opt1.trim() || !opt2.trim()) return;
    setIsSavingQuestion(true);
    let createdQuestionId: string | null = null;
    try {
      const qRes = await instructorService.createQuizQuestion(courseId, qChapterId, activeQuizId, {
        prompt: qPrompt.trim(),
        explanation: qExplanation.trim() || undefined,
      });

      // Never create answer options when the question mutation failed.
      const questionId = requireCreatedQuizQuestionId(qRes, activeQuizId);
      createdQuestionId = questionId;
      const options = [
        { text: opt1.trim(), isCorrect: correctOptIdx === 0 },
        { text: opt2.trim(), isCorrect: correctOptIdx === 1 },
        ...(opt3.trim() ? [{ text: opt3.trim(), isCorrect: correctOptIdx === 2 }] : []),
      ];
      for (const option of options) {
        const result = await instructorService.createQuizOption(
          courseId, qChapterId, activeQuizId, questionId, option,
        );
        requireCreatedQuizOption(result, questionId);
      }
      showToast('Pertanyaan dan pilihan jawaban berhasil ditambahkan ke kuis.', 'success');
      setQuestionModalOpen(false);
      setQPrompt('');
      setQExplanation('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      fetchBuilderData();
    } catch (err: any) {
      if (createdQuestionId) {
        showToast('Soal sudah dibuat, tetapi penyimpanan pilihan jawaban gagal. Periksa isi soal sebelum mencoba lagi agar tidak menduplikasi soal.', 'error');
        fetchBuilderData();
      } else {
        showToast(err.message || 'Gagal menambahkan soal kuis.', 'error');
      }
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!courseId) return;
    if (!completeness || !completeness.canSubmit) {
      showToast('Kurikulum belum lengkap. Periksa tab Validasi Kelengkapan.', 'error');
      return;
    }
    if (!confirm('Ajukan versi kursus ini kepada Admin untuk ditinjau dan dipublikasikan?')) return;

    setIsSubmittingReview(true);
    try {
      // Optimistic concurrency submission token
      const expectedVersionId = requireDraftVersionId(course);
      const res = await instructorService.submitForReview(courseId, expectedVersionId);
      requireMutationSuccess(res);
      if (res.success) {
        showToast('Kursus berhasil diajukan untuk peninjauan (Review) oleh Admin!', 'success');
        fetchBuilderData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal mengajukan review.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 font-medium">Mempersiapkan Course Builder...</p>
        </div>
      </div>
    );
  }

  // A published course has no active draft by design. Offer safe cloning instead
  // of displaying an empty curriculum or writable published controls.
  if (loadError || !course) {
    return (
      <section className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-6 space-y-4 text-white">
        <h2 className="text-lg font-bold">Course Builder tidak dapat dimuat</h2>
        <p className="text-sm text-rose-200">{loadError || 'Detail course tidak tersedia.'}</p>
        <button type="button" onClick={fetchBuilderData} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold">Coba Muat Ulang</button>
      </section>
    );
  }
  if (getInstructorCourseBuilderMode(course) === 'PUBLISHED_NO_DRAFT') {
    return (
      <div className="space-y-6 pb-12">
        <Link to="/instructor/courses" className="inline-flex items-center gap-2 text-sm text-teal-300 hover:text-teal-200">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog Course
        </Link>
        <section className="rounded-3xl border border-teal-600/40 bg-slate-950 p-6 sm:p-8 space-y-4">
          <span className="inline-block rounded-full border border-emerald-600/40 bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-300">COURSE PUBLISHED · Versi {course.publishedVersion?.versionNumber ?? '-'}</span>
          <h1 className="text-2xl font-black text-white">{course.title}</h1>
          <p className="text-sm text-slate-300">{course.subtitle || course.description}</p>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 space-y-2">
            <h2 className="font-bold text-white">Materi course masih tersimpan di versi yang sedang tayang</h2>
            <p className="text-sm text-slate-300">Bab, lesson, dan kuis tidak ditampilkan di editor draft karena course ini sudah dipublikasikan dan belum punya draft revisi. Untuk mengedit, buat salinan revisi dari versi terbit. Student tetap memakai versi belajarnya selama revisi disiapkan dan direview.</p>
          </div>
          <button type="button" onClick={handleCreateRevision} disabled={isCreatingRevision}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">
            {isCreatingRevision ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Buat Draf Revisi dari Versi Terbit
          </button>
          <p className="text-xs text-slate-400">Setelah revisi lengkap, ajukan ke Admin. Versi publik berubah hanya setelah Admin menyetujui dan mempublikasikan revisi.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800 min-w-0">
        <div className="flex items-center gap-3">
          <Link
            to="/instructor/courses"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                Course Authoring Studio
              </span>
              <span className="text-slate-600">&middot;</span>
              <span className="text-[10px] text-slate-400 font-mono">ID: {courseId}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {course?.title || 'Course Builder'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end min-w-0">
          <button
            onClick={fetchBuilderData}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {getInstructorCourseBuilderMode(course) === 'PUBLISHED_NO_DRAFT' && (
            <button
              onClick={handleCreateRevision}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs transition border border-teal-500/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Revisi Draf Baru</span>
            </button>
          )}

          <button
            onClick={handleSubmitForReview}
            disabled={isSubmittingReview}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-md shadow-teal-500/20 disabled:opacity-50"
          >
            {isSubmittingReview ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Ajukan Peninjauan (Submit for Review)</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 min-w-0">
        <button
          type="button"
          onClick={() => setActiveTab('INTRO')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'INTRO' ? 'bg-teal-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <Presentation className="w-4 h-4" />
          <span>Pengenalan Kursus</span>
        </button>
        <button
          onClick={() => setActiveTab('CURRICULUM')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'CURRICULUM'
              ? 'bg-teal-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Editor Kurikulum & Silabus</span>
        </button>

        <button
          onClick={() => setActiveTab('METADATA')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'METADATA'
              ? 'bg-teal-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Pengaturan Metadata & Harga</span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETENESS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'COMPLETENESS'
              ? 'bg-teal-500 text-slate-950 shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span>Validasi Kelengkapan ({completeness?.isComplete ? 'Siap' : 'Belum Siap'})</span>
        </button>
      </div>

      {/* Introduction is course-version metadata, NOT a chapter or an enrollment progress item. */}
      {activeTab === 'INTRO' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={handleSaveIntroduction} className="xl:col-span-2 bg-slate-950/80 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2"><Presentation className="w-5 h-5 text-teal-400" /> Pengenalan Kursus</h2>
              <p className="text-xs text-slate-400 mt-1">Konten ini tampil di halaman detail course sebelum silabus. Tidak membuat Bab, Lesson, atau progres siswa baru.</p>
            </div>
            <div>
              <label htmlFor="intro-short" className="block text-xs font-bold text-slate-200 mb-2">Ringkasan promosi kursus</label>
              <textarea id="intro-short" rows={3} maxLength={500} value={subtitle} onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Jelaskan nilai kursus ini dalam 1–2 kalimat."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
              <p className="text-[11px] text-slate-500">Terhubung ke Deskripsi Singkat pada tab Metadata; maksimal 500 karakter.</p>
            </div>
            {([{
              id: 'intro-objectives', label: 'Apa yang akan dipelajari', value: introObjectives, setter: setIntroObjectives, placeholder: 'Membangun antarmuka React yang responsif\nMembuat REST API dengan Node.js dan Express\nMengintegrasikan PostgreSQL ke aplikasi',
            }, {
              id: 'intro-requirements', label: 'Persyaratan awal', value: introRequirements, setter: setIntroRequirements, placeholder: 'Laptop dengan koneksi internet\nMampu menggunakan komputer dasar',
            }, {
              id: 'intro-audience', label: 'Cocok untuk siapa', value: introAudience, setter: setIntroAudience, placeholder: 'Mahasiswa yang ingin mempelajari Fullstack\nPemula yang ingin membangun portofolio',
            }] as const).map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-xs font-bold text-slate-200 mb-2">{field.label}</label>
                <textarea id={field.id} rows={4} value={field.value} onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500" />
                <p className="text-[11px] text-slate-500">Satu poin per baris. Tersimpan di metadata CourseVersion resmi.</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-[11px] text-slate-400">Thumbnail: {course?.thumbnailUrl ? '✓ Terpasang' : 'Belum tersedia (atur di Metadata)'}</span>
              <button type="submit" disabled={isSavingIntro || isLoading}
                className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs disabled:opacity-50 inline-flex gap-2 items-center">
                {isSavingIntro && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" /> Simpan Pengenalan
              </button>
            </div>
          </form>
          <section className="bg-slate-950/80 rounded-3xl border border-slate-800 p-6 space-y-4 h-fit">
            <h3 className="text-white font-bold">Materi Preview Gratis</h3>
            <p className="text-xs text-slate-400">Pilih bebas berapa pun Lesson sebagai preview gratis (boleh tidak memilih satu pun). Setiap Lesson tetap berada di Bab aslinya. Konten gambar/audio privat tidak otomatis menjadi publik.</p>
            <div className="space-y-2">
              {chapters.flatMap(chap => chap.lessons.map(les => ({ chapterId: chap.id, lesson: les }))).map(({ chapterId, lesson }) => (
                <div key={lesson.id} className="border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">{lesson.title}</div>
                  <div className="text-[10px] uppercase text-slate-500">{lesson.type}</div>
                  <button type="button" disabled={savingPreviewLessonId !== null}
                    onClick={() => handleToggleFreePreview(chapterId, lesson.id, !lesson.isPreview)}
                    className={`text-[11px] font-bold rounded-lg border px-3 py-2 disabled:opacity-50 ${lesson.isPreview ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-teal-500'}`}>
                    {savingPreviewLessonId === lesson.id ? 'Menyimpan...' : lesson.isPreview ? '✓ Preview Gratis — Cabut' : 'Jadikan Preview Gratis'}
                  </button>
                </div>
              ))}
              {chapters.every(chap => chap.lessons.length === 0) && <p className="text-xs text-amber-300">Buat Lesson di tab Kurikulum dahulu.</p>}
            </div>
            <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-2">
              <p><strong className="text-slate-200">Video promosi khusus:</strong> belum ada field resmi pada backend, jadi versi ini tidak mengunggah video publik terpisah.</p>
              <p>Gunakan Lesson YouTube atau teks sebagai preview sementara. Akses konten privat tetap harus mengikuti kebijakan backend.</p>
            </div>
          </section>
        </div>
      )}

      {/* TAB 1: CURRICULUM BUILDER */}
      {activeTab === 'CURRICULUM' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Rancang bab, pelajaran multimedia (teks, gambar, audio, YouTube), dan kuis evaluasi.
            </p>
            <button
              onClick={() => setChapterModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bab Baru</span>
            </button>
          </div>

          {chapters.length === 0 ? (
            <div className="bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-white">Belum ada bab di kurikulum ini</h3>
              <p className="text-xs text-slate-400">
                Tekan tombol di atas untuk membuat bab pertama kursus Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {chapters.map((chap, cIdx) => (
                <div
                  key={chap.id}
                  className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xs space-y-3 p-5"
                >
                  {/* Chapter Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {cIdx + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-white">{chap.title}</h3>
                        {chap.description && (
                          <p className="text-xs text-slate-400">{chap.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (!course?.currentDraftVersionId || !courseId) {
                            showToast('Draft course aktif tidak tersedia.', 'error'); return;
                          }
                          navigate(`/instructor/builder/${courseId}/chapters/${chap.id}/lesson-canvas/new-${crypto.randomUUID()}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pelajaran</span>
                      </button>

                      <button
                        onClick={() => {
                          setQuizChapterId(chap.id);
                          setQuizModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Kuis</span>
                      </button>

                      <button
                        onClick={() => handleDeleteChapter(chap.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400"
                        title="Hapus Bab"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Local-only canvas drafts are NOT backend Lessons. */}
                  {course?.instructorId && course.currentDraftVersionId && (() => {
                    const drafts = listLocalCanvasDrafts(localStorage, course.instructorId, course.currentDraftVersionId, chap.id);
                    if (!drafts.length) return null;
                    return <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-3 space-y-2">
                      <p className="text-xs font-bold text-amber-300">Draft Canvas Lokal · Belum Tersimpan Server</p>
                      {drafts.map(d => <div key={d.key} className="flex justify-between items-center gap-3 text-xs text-amber-100">
                        <button type="button" className="underline text-left" onClick={() => navigate(`/instructor/builder/${courseId}/chapters/${chap.id}/lesson-canvas/${d.lessonId}`)}>{d.title}</button>
                        <button type="button" className="text-rose-300" title="Hapus draft lokal (tidak menghapus lesson server)" onClick={() => {if (confirm('Hapus draft lokal ini? Tidak mempengaruhi database.')) {localStorage.removeItem(d.key); fetchBuilderData();}}}>Hapus Lokal</button>
                      </div>)}
                    </div>;
                  })()}
                  {/* Lessons list */}
                  <div className="space-y-2 pt-1">
                    {chap.lessons?.map((les) => (
                      <div
                        key={les.id}
                        className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {les.type === 'YOUTUBE_VIDEO' && <Video className="w-4 h-4 text-blue-400" />}
                          {les.type === 'IMAGE' && <ImageIcon className="w-4 h-4 text-sky-400" />}
                          {les.type === 'AUDIO' && <Headphones className="w-4 h-4 text-teal-400" />}
                          {les.type === 'TEXT' && <FileText className="w-4 h-4 text-slate-400" />}
                          <span className="font-semibold text-slate-200">{les.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({les.type})</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={savingPreviewLessonId !== null}
                            onClick={() => handleToggleFreePreview(chap.id, les.id, !les.isPreview)}
                            className={`rounded-md border px-2.5 py-1 text-[10px] font-bold disabled:opacity-50 ${les.isPreview ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40' : 'border-slate-700 text-slate-300 hover:border-teal-400'}`}
                            title={les.isPreview ? 'Cabut label preview gratis' : 'Jadikan Lesson ini preview gratis'}
                          >
                            {savingPreviewLessonId === les.id ? 'Menyimpan...' : les.isPreview ? '✓ Preview Gratis' : 'Jadikan Preview Gratis'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openLessonForEdit(chap.id, les)}
                            disabled={isSavingLesson}
                            className="inline-flex items-center gap-1 rounded-md border border-sky-600/50 px-2.5 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-950/50 disabled:opacity-50"
                            title={`Edit materi: ${les.title}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        <button
                          onClick={() => handleDeleteLesson(chap.id, les.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Hapus Pelajaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </div>
                      </div>
                    ))}

                    {/* Quizzes list */}
                    {chap.quizzes?.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-800/40 space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-amber-300">
                            <HelpCircle className="w-4 h-4 text-amber-400" />
                            <span>Kuis: {quiz.title}</span>
                            <span className="text-[10px] text-amber-400 font-normal">
                              (KKM: {quiz.passingGrade}%)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setQChapterId(chap.id);
                                setActiveQuizId(quiz.id);
                                setQuestionModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Soal</span>
                            </button>

                            <button
                              onClick={() => handleDeleteQuiz(chap.id, quiz.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Hapus Kuis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Questions preview */}
                        {quiz.questions && quiz.questions.length > 0 && (
                          <div className="space-y-1.5 pl-4 border-l border-amber-800/40">
                            {quiz.questions.map((q, qIdx) => (
                              <div key={q.id} className="flex items-center justify-between text-slate-300 text-[11px] py-1 bg-amber-950/10 px-2 rounded">
                                <div>
                                  <strong>{qIdx + 1}.</strong> {q.prompt}
                                  <span className="text-slate-500 ml-2">
                                    ({q.options?.length || 0} pilihan opsi)
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteQuestion(chap.id, quiz.id, q.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                  title="Hapus Pertanyaan Ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: METADATA & PRICE */}
      {activeTab === 'METADATA' && (
        <form
          onSubmit={handleSaveMetadata}
          className="bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-sm space-y-6 max-w-2xl text-xs"
        >
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white">Metadata & Konfigurasi Kursus</h2>
            <p className="text-slate-400">
              Perbarui judul resmi, harga kursus dalam IDR desimal, tingkat keahlian, dan deskripsi.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">Judul Kursus</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">Deskripsi Singkat (maks. 500 karakter)</label>
              <input
                type="text"
                required
                maxLength={500}
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Harga IDR (Decimal String)
                </label>
                <input
                  type="text"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Tingkat Kursus</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as CourseLevel)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                >
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                  <option value="ADVANCED">ADVANCED</option>
                  <option value="ALL_LEVELS">ALL_LEVELS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold uppercase mb-1">Deskripsi Lengkap</label>
              <textarea
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 space-y-3">
            <h3 className="font-bold text-slate-100 uppercase">Thumbnail Course (Wajib untuk Review)</h3>
            <p className="text-slate-400">Upload JPEG/PNG/WebP maksimal 5 MiB. Thumbnail dipakai untuk katalog course.</p>
            {course?.thumbnailUrl && <p className="text-emerald-300 font-semibold">✓ Thumbnail draft sudah terpasang</p>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSavingThumbnail}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setThumbnailFile(file);
                setConfirmedThumbnailMediaId(null);
                if (file) {
                  try { validateInstructorThumbnail(file); }
                  catch (err: any) { showToast(err.message || 'Thumbnail tidak valid.', 'error'); }
                }
              }}
              className="block w-full text-xs text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:font-bold file:text-slate-950"
            />
            {thumbnailFile && <p className="text-teal-300">Dipilih: {thumbnailFile.name}{confirmedThumbnailMediaId ? ' — upload berhasil' : ''}</p>}
            <button
              type="button"
              disabled={isSavingThumbnail || (!thumbnailFile && !confirmedThumbnailMediaId)}
              onClick={handleSaveThumbnail}
              className="rounded-lg bg-teal-500 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-50"
            >
              {isSavingThumbnail ? 'Mengunggah/menautkan...' : 'Upload & Simpan Thumbnail'}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingMeta}
              className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSavingMeta ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Simpan Perubahan Metadata</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: COMPLETENESS VALIDATION */}
      {activeTab === 'COMPLETENESS' && (
        <div className="bg-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-sm space-y-6 max-w-2xl text-xs">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-teal-400" />
              <span>Validasi Kelengkapan Kursus (Completeness Check)</span>
            </h2>
            <p className="text-slate-400">
              Sistem backend memeriksa syarat kelengkapan sebelum kursus dapat disubmit untuk review Admin.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Status Validasi Kurikulum:</span>
              <span
                className={`font-black uppercase ${
                  completeness?.isComplete ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {completeness?.isComplete ? 'LENGKAP (SIAP SUBMIT)' : 'BELUM MEMENUHI SYARAT'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Bab</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {completeness?.totalChapters || 0}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Pelajaran</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {completeness?.totalLessons || 0}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Kuis</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {completeness?.totalQuizzes || 0}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 text-[10px] uppercase font-bold">Total Soal</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {completeness?.totalQuestions || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Completeness Issues List */}
          {completeness?.issues && completeness.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-amber-400">Catatan Perbaikan Sebelum Submit:</h3>
              <div className="space-y-2">
                {completeness.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] bg-amber-900/60 px-1.5 py-0.5 rounded mr-1.5">
                        {issue.entityType}
                      </span>
                      <span>{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE CHAPTER MODAL */}
      {chapterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-white rounded-3xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Tambah Bab Kurikulum Baru</h3>
              <button onClick={() => setChapterModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateChapter} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Judul Bab *</label>
                <input
                  type="text"
                  required
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Contoh: Bab 1: Fondasi Arsitektur"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Deskripsi Singkat</label>
                <input
                  type="text"
                  value={chapterDesc}
                  onChange={(e) => setChapterDesc(e.target.value)}
                  placeholder="Ringkasan isi bab ini"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChapterModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingChapter}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Simpan Bab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT LESSON MODAL */}
      {lessonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-white rounded-3xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl space-y-5 animate-scale-in max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">{editingLesson ? 'Edit Materi Pelajaran' : 'Tambah Materi Pelajaran Baru'}</h3>
              <button disabled={isSavingLesson} onClick={resetLessonEditor} className="text-slate-400 disabled:opacity-50">
                ✕
              </button>
            </div>
            <form onSubmit={editingLesson ? handleUpdateExistingLesson : handleCreateLesson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Judul Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="Contoh: Pengenalan Sintaks TypeScript"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Format Materi *</label>
                <select
                  value={lessonType}
                  onChange={(e) => setLessonType(e.target.value as LessonType)}
                  disabled={Boolean(editingLesson)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                >
                  <option value="TEXT">TEXT (Bacaan Teks Lengkap)</option>
                  <option value="YOUTUBE_VIDEO">YOUTUBE_VIDEO (Video Embed)</option>
                  <option value="IMAGE">IMAGE (Diagram / Infografis)</option>
                  <option value="AUDIO">AUDIO (Rekaman Suara / Podcast)</option>
                  <option value="MIXED">MIXED (Kombinasi Multimedia)</option>
                </select>
                {editingLesson && <p className="mt-1 text-[11px] text-slate-400">Format dikunci saat revisi agar konten lama tetap aman.</p>}
              </div>

              {(lessonType === 'YOUTUBE_VIDEO' || lessonType === 'MIXED') && (
                <div>
                  <label className="block text-slate-300 font-bold uppercase mb-1">URL atau ID Video YouTube</label>
                  <input
                    type="text"
                    value={youtubeId}
                    onChange={(e) => setYoutubeId(e.target.value)}
                    required={lessonType === 'YOUTUBE_VIDEO'}
                    placeholder="https://www.youtube.com/watch?v=VcwN0nms30I"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs font-mono"
                  />
                </div>
              )}

              {(lessonType === 'IMAGE' || lessonType === 'MIXED') && (
                <div className="rounded-xl border border-dashed border-teal-800 bg-slate-900/60 p-3 space-y-2">
                  <label className="block text-slate-200 font-bold uppercase">Upload Gambar Lesson {lessonType === 'IMAGE' && !editingLesson ? '*' : '(opsional)'}</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    disabled={isSavingLesson}
                    onChange={(e) => {
                      handleLessonFileSelect('IMAGE', e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                    className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:font-bold file:text-slate-950"
                  />
                  <p className="text-[11px] text-slate-400">JPEG / PNG / WebP, maksimal 10 MiB. File diunggah ke Cloudinary privat saat Simpan Pelajaran.</p>
                  {editingLesson && <p className="text-[11px] text-teal-300">Gambar lama tetap tersimpan jika tidak memilih pengganti.</p>}
                  {lessonImageFile && <p className="text-xs text-teal-300">Terpilih: {lessonImageFile.name}{lessonImageMediaId ? ' — upload berhasil' : ''}</p>}
                </div>
              )}
              {(lessonType === 'AUDIO' || lessonType === 'MIXED') && (
                <div className="rounded-xl border border-dashed border-teal-800 bg-slate-900/60 p-3 space-y-2">
                  <label className="block text-slate-200 font-bold uppercase">Upload Audio Lesson {lessonType === 'AUDIO' && !editingLesson ? '*' : '(opsional)'}</label>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/ogg,audio/webm,audio/flac,audio/x-flac,.mp3,.m4a,.wav,.ogg,.webm,.flac"
                    disabled={isSavingLesson}
                    onChange={(e) => {
                      handleLessonFileSelect('AUDIO', e.target.files?.[0] || null);
                      e.target.value = '';
                    }}
                    className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-500 file:px-3 file:py-2 file:font-bold file:text-slate-950"
                  />
                  <p className="text-[11px] text-slate-400">Audio sesuai kebijakan backend, maksimal 50 MiB; lampiran tetap privat.</p>
                  {editingLesson && <p className="text-[11px] text-teal-300">Audio lama tetap tersimpan jika tidak memilih pengganti.</p>}
                  {lessonAudioFile && <p className="text-xs text-teal-300">Terpilih: {lessonAudioFile.name}{lessonAudioMediaId ? ' — upload berhasil' : ''}</p>}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Isi Konten Teks / Penjelasan</label>
                <textarea
                  rows={4}
                  value={lessonText}
                  onChange={(e) => setLessonText(e.target.value)}
                  placeholder="Tuliskan materi teks atau instruksi pelajaran..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetLessonEditor}
                  disabled={isSavingLesson}
                  className="px-3 py-2 text-slate-400 hover:text-white disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingLesson}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  {isSavingLesson ? 'Menyimpan & mengunggah...' : editingLesson ? 'Simpan Perubahan' : 'Simpan Pelajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUIZ MODAL */}
      {quizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-white rounded-3xl max-w-md w-full p-6 border border-slate-800 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Tambah Kuis Evaluasi Bab</h3>
              <button onClick={() => setQuizModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuiz} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Judul Kuis *</label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="Contoh: Kuis Evaluasi Bab 1"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Passing Grade / KKM (Persen) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={quizGrade}
                  onChange={(e) => setQuizGrade(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuizModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuiz}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Simpan Kuis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE QUESTION & OPTIONS MODAL */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 text-white rounded-3xl max-w-lg w-full p-6 border border-slate-800 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Tambah Soal & Pilihan Jawaban Kuis</h3>
              <button onClick={() => setQuestionModalOpen(false)} className="text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuestionAndOptions} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Pertanyaan / Prompt Soal *
                </label>
                <textarea
                  rows={2}
                  required
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                  placeholder="Tuliskan pertanyaan kuis..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">
                  Penjelasan Kunci Jawaban
                </label>
                <input
                  type="text"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Mengapa jawaban ini benar..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-hidden focus:border-teal-400 text-xs"
                />
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-300 uppercase">
                  Pilihan Jawaban (Tandai Jawaban Benar)
                </span>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptIdx === 0}
                      onChange={() => setCorrectOptIdx(0)}
                      className="text-teal-400"
                    />
                    <input
                      type="text"
                      required
                      value={opt1}
                      onChange={(e) => setOpt1(e.target.value)}
                      placeholder="Pilihan A *"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptIdx === 1}
                      onChange={() => setCorrectOptIdx(1)}
                      className="text-teal-400"
                    />
                    <input
                      type="text"
                      required
                      value={opt2}
                      onChange={(e) => setOpt2(e.target.value)}
                      placeholder="Pilihan B *"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={correctOptIdx === 2}
                      onChange={() => setCorrectOptIdx(2)}
                      className="text-teal-400"
                    />
                    <input
                      type="text"
                      value={opt3}
                      onChange={(e) => setOpt3(e.target.value)}
                      placeholder="Pilihan C (Opsional)"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestion}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
                >
                  Simpan Soal & Opsi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
