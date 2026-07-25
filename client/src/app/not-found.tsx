import Link from 'next/link';
import { Target, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nexus-grid opacity-50" />
      <div className="pointer-events-none absolute inset-0">
        <div className="nexus-aurora nexus-aurora-1" />
        <div className="nexus-streak nexus-streak-2" />
      </div>
      <div className="text-center max-w-md relative z-10">
        <div className="nexus-panel inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6">
          <Target className="w-10 h-10 text-primary-300/70" />
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
