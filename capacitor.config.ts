import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb24c151251e4bf6b5fb576ba91669ef',
  appName: 'Vaultly',
  webDir: 'dist',
  server: {
    url: 'https://bb24c151-251e-4bf6-b5fb-576ba91669ef.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
