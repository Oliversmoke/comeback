'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 nexus-grid opacity-50" />
      <div className="pointer-events-none absolute inset-0">
        <div className="nexus-aurora nexus-aurora-2" />
        <div className="nexus-streak nexus-streak-1" />
      </div>
      <div className="text-center max-w-md relative z-10">
        <div className="nexus-panel inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6">
          <AlertTriangle className="w-10 h-10 text-accent-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-dark-400 mb-8">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
