'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface BrandingData {
  logo: { url: string; publicId: string };
  background: { url: string; publicId: string };
}

export function useBranding() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/branding').then(({ data }) => {
      if (!cancelled && data.success) {
        setBranding(data.data);
      }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return {
    logoUrl: branding?.logo?.url || '',
    backgroundUrl: branding?.background?.url || '',
    hasCustomLogo: !!branding?.logo?.url,
    hasCustomBackground: !!branding?.background?.url,
    loading,
    branding,
  };
}
