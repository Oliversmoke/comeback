import type { CapacitorConfig } from '@capacitor/cli';

// The native app is a WebView shell around the unified server.
// - Dev / LAN:  CAPACITOR_SERVER_URL=http://10.20.181.119:3000 npm run mobile:build
// - Prod:       CAPACITOR_SERVER_URL=https://your-hosted-app.com npm run mobile:build
// When CAPACITOR_SERVER_URL is set, Capacitor loads that live URL (the API +
// pages live on the same origin there). When unset, it bundles the static
// `out/` build instead (set NEXT_PUBLIC_API_URL to your hosted API first).
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'ai.rickchat.app',
  appName: 'comeback.AI',
  webDir: 'out',
  server: serverUrl
    ? { url: serverUrl, cleartext: true, androidScheme: 'https' }
    : { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f1a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f0f1a',
    },
  },
};

export default config;
