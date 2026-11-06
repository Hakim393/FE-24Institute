import type { Lesson } from '../types/course';
export type EngagementPart = 'text' | 'youtube' | 'image' | 'audio';
export type EngagementResume = { kind: 'youtube' | 'audio'; seconds: number };
export type EngagementRecord = {
  lessonId: string;
  percentage: number;
  components: Partial<Record<EngagementPart, number>>;
  resume?: EngagementResume;
};
export type EngagementReport = { components: Partial<Record<EngagementPart, number>>; resume?: EngagementResume };

export const clampPct = (value: number) => Math.max(0, Math.min(100, Math.floor(Number.isFinite(value) ? value : 0)));

/** Only called after confirmed server-side COMPLETE; do not forge per-part watch/read values. */
export function markEngagementCompleted(lessonId: string, previous?: EngagementRecord): EngagementRecord {
  return {
    lessonId, percentage: 100,
    components: { ...(previous?.components ?? {}) },
    ...(previous?.resume ? { resume: { ...previous.resume } } : {}),
  };
}

export function engagementParts(lesson: Lesson): EngagementPart[] {
  const result: EngagementPart[] = [];
  if (typeof lesson.textContent === 'string' && lesson.textContent.trim()) result.push('text');
  if ((lesson.type === 'YOUTUBE_VIDEO' || lesson.type === 'MIXED') && lesson.youtubeVideoId) result.push('youtube');
  if ((lesson.type === 'IMAGE' || lesson.type === 'MIXED') && (lesson.media?.hasImage || lesson.imageUrl)) result.push('image');
  if ((lesson.type === 'AUDIO' || lesson.type === 'MIXED') && (lesson.media?.hasAudio || lesson.audioUrl)) result.push('audio');
  return result;
}

export function mergeEngagement(lesson: Lesson, previous: EngagementRecord | undefined, report: EngagementReport): EngagementRecord {
  const parts = engagementParts(lesson);
  const components: EngagementRecord['components'] = {};
  for (const part of parts) components[part] = Math.max(previous?.components[part] ?? 0, clampPct(report.components[part] ?? 0));
  return {
    lessonId: lesson.id,
    // Preserve a confirmed 100% completion even if a player emits a late partial signal.
    percentage: Math.max(previous?.percentage ?? 0,
      parts.length ? Math.round(parts.reduce((sum, part) => sum + (components[part] ?? 0), 0) / parts.length) : 0),
    components,
    ...(report.resume ? { resume: report.resume } : previous?.resume ? { resume: previous.resume } : {}),
  };
}

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function number(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100) throw new Error('Persentase engagement dari server tidak valid.');
  return value as number;
}
export function adaptEngagementList(value: unknown, courseId: string): { records: Record<string, EngagementRecord>; lastAccessedLessonId: string | null } {
  if (!object(value) || value.courseId !== courseId || !Array.isArray(value.lessons)) throw new Error('Kontrak progress konsumsi tidak sesuai.');
  const records: Record<string, EngagementRecord> = {};
  for (const entry of value.lessons) {
    if (!object(entry) || typeof entry.lessonId !== 'string' || !entry.lessonId) throw new Error('Identitas lesson consumption tidak valid.');
    const state = object(entry.state) ? entry.state : {};
    const raw = object(state.components) ? state.components : {};
    const components: EngagementRecord['components'] = {};
    for (const part of ['text', 'youtube', 'image', 'audio'] as EngagementPart[]) {
      if (raw[part] != null) components[part] = number(raw[part]);
    }
    const resumeRaw = state.resume;
    const resume = object(resumeRaw) && (resumeRaw.kind === 'audio' || resumeRaw.kind === 'youtube') &&
      typeof resumeRaw.seconds === 'number' && Number.isInteger(resumeRaw.seconds) && resumeRaw.seconds >= 0 && resumeRaw.seconds <= 86400
        ? { kind: resumeRaw.kind, seconds: resumeRaw.seconds } as EngagementResume : undefined;
    records[entry.lessonId] = { lessonId: entry.lessonId, percentage: number(entry.percentage), components, ...(resume ? { resume } : {}) };
  }
  return {
    records,
    lastAccessedLessonId: typeof value.lastAccessedLessonId === 'string' ? value.lastAccessedLessonId : null,
  };
}
