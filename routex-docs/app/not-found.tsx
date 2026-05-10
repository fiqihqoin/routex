import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { defaultLang } from '@/lib/i18n';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center px-6">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <h1 className="text-[120px] font-extrabold leading-none gradient-text mb-4">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          Halaman tidak ditemukan / Page not found
        </h2>
        <p className="text-text-muted max-w-md mx-auto mb-10 leading-relaxed">
          Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          Sorry, the page you are looking for is not available or has been moved.
        </p>
        <Link 
          href={`/${defaultLang}/docs`}
          className="inline-flex items-center gap-2 px-8 py-3 bg-teal text-background rounded-full font-bold hover:bg-teal-glow transition-all shadow-glow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Docs</span>
        </Link>
      </div>
    </div>
  );
}
