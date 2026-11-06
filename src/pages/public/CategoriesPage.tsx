import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicService } from '../../services/public.service';
import { PublicCategory } from '../../types/course';
import { FolderTree, BookOpen, ArrowRight, Loader2 } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await publicService.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchCats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-600 uppercase tracking-wider">
          <FolderTree className="w-4 h-4" />
          <span>Direktori Pembelajaran</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kategori Kursus</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Eksplorasi berbagai kategori studi yang dirancang khusus untuk meningkatkan keahlian teknis dan kepemimpinan bisnis Anda.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/courses?categoryId=${cat.id}`}
              className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {cat.description || 'Pilihan kurikulum terstruktur dalam kategori ini.'}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-600">
                <span>{cat.publishedCourseCount} Kursus Tersedia</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
