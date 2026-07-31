import Link from 'next/link';
import { Target, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-dots-pattern opacity-30" />
      <div className="absolute top-1/3 -left-40 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-40 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
      <div className="text-center max-w-md relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-800/50 border border-dark-700/50 mb-6">
          <Target className="w-10 h-10 text-primary-400/60" />
        </div>
        <div className="text-8xl font-bold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-dark-400 mb-8">This page doesn&apos;t exist or has been moved.</p>
        <Link
          href="/dashboard"
          className="btn-primary inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
