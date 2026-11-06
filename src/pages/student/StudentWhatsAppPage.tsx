import React, { useEffect, useState } from 'react';
import { studentService } from '../../services/student.service';
import { useNotification } from '../../context/NotificationContext';
import { WhatsAppGroupLink } from '../../types/admin';
import { Enrollment } from '../../types/order';
import {
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Users,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';

export const StudentWhatsAppPage: React.FC = () => {
  const [generalLink, setGeneralLink] = useState<WhatsAppGroupLink | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseLinks, setCourseLinks] = useState<Record<string, WhatsAppGroupLink>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { showToast } = useNotification();

  useEffect(() => {
    const fetchWhatsAppGroups = async () => {
      setIsLoading(true);
      try {
        const [genRes, enrRes] = await Promise.all([
          studentService.getGeneralWhatsAppGroup(),
          studentService.getEnrollments(),
        ]);

        if (genRes.success && genRes.data) setGeneralLink(genRes.data);
        if (enrRes.success && enrRes.data) {
          setEnrollments(enrRes.data);
          // Fetch course specific WhatsApp links for each active enrollment
          for (const enr of enrRes.data) {
            try {
              const cLinkRes = await studentService.getCourseWhatsAppGroup(enr.courseId);
              if (cLinkRes.success && cLinkRes.data) {
                setCourseLinks((prev) => ({ ...prev, [enr.courseId]: cLinkRes.data }));
              }
            } catch {
              // ignore if not configured
            }
          }
        }
      } catch (err: any) {
        showToast(err.message || 'Gagal memuat tautan WhatsApp.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchWhatsAppGroups();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <MessageCircle className="w-7 h-7 text-emerald-600" />
          <span>Komunitas Diskusi WhatsApp</span>
        </h1>
        <p className="text-xs text-slate-500">
          Akses tautan resmi grup WhatsApp untuk berdiskusi dengan sesama siswa dan instruktur pengampu kursus Anda.
        </p>
      </div>

      {/* Manual Invite Link Note */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Kebijakan Komunitas WhatsApp Resmi:</span>
        </div>
        <p>
          Tautan di bawah merupakan tautan undangan manual resmi. Sistem tidak menambahkan atau mengeluarkan anggota secara otomatis via API bisnis WhatsApp. Harap jaga etika komunikasi profesional di dalam grup.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* General Community Group Card */}
          {generalLink && generalLink.isActive && (
            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 sm:p-7 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                  <Users className="w-3.5 h-3.5" />
                  <span>Komunitas Umum 24Institute</span>
                </div>
                <h3 className="text-lg font-black text-white">Grup Diskusi Umum Siswa</h3>
                <p className="text-xs text-emerald-200 max-w-lg leading-relaxed">
                  Forum terbuka bagi seluruh siswa terdaftar untuk berbagi wawasan industri, peluang karir, dan pengumuman webinar.
                </p>
              </div>

              <a
                href={generalLink.inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-md"
              >
                <span>Gabung Grup Umum</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Course Specific Groups */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Grup Diskusi Khusus Kursus Terdaftar</span>
            </h2>

            {enrollments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Anda belum memiliki kursus terdaftar. Beli kursus terlebih dahulu untuk memperoleh hak akses tautan WhatsApp grup kursus.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enr) => {
                  const link = courseLinks[enr.courseId];
                  return (
                    <div
                      key={enr.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">
                          Kursus: {enr.courseTitle}
                        </span>
                        <div className="text-xs font-semibold text-slate-700">
                          Grup Diskusi Kursus {enr.courseTitle}
                        </div>
                      </div>

                      {link && link.isActive ? (
                        <a
                          href={link.inviteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Buka Grup Kursus</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Tautan grup belum dikonfigurasi oleh instruktur.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
