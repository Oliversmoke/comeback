'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { api } from '@/lib/api';

interface BrandingData {
  logo: { url: string; publicId: string };
  background: { url: string; publicId: string };
}

interface BrandingState {
  branding: BrandingData | null;
  loading: boolean;
  loaded: boolean;
  fetch: (force?: boolean) => Promise<void>;
}

/**
 * Shared branding store so the Navbar, Sidebar and Settings page all read the
 * same data and update together. Calling `fetch(true)` (exposed as `refresh`)
 * re-pulls branding and updates every consumer WITHOUT a full page reload.
 */
export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: null,
  loading: true,
  loaded: false,
  fetch: async (force = false) => {
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      const { data } = await api.get('/branding');
      if (data?.success) {
        set({ branding: data.data });
      }
    } catch {
      // ignore – fall back to defaults
    } finally {
      set({ loading: false, loaded: true });
    }
  },
}));

export function useBranding() {
  const branding = useBrandingStore((s) => s.branding);
  const loading = useBrandingStore((s) => s.loading);
  const loaded = useBrandingStore((s) => s.loaded);
  const fetch = useBrandingStore((s) => s.fetch);

  useEffect(() => {
    if (!loaded) fetch();
  }, [loaded, fetch]);

  return {
    logoUrl: branding?.logo?.url || '',
    backgroundUrl: branding?.background?.url || '',
    hasCustomLogo: !!branding?.logo?.url,
    hasCustomBackground: !!branding?.background?.url,
    loading,
    branding,
    /** Re-fetch branding and update all consumers without reloading the page. */
    refresh: () => fetch(true),
  };
}
