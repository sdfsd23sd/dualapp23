import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.bb24c151251e4bf6b5fb576ba91669ef',
  appName: 'Vaultly',
  webDir: 'dist',
  plugins: {
    ClipboardMonitor: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
