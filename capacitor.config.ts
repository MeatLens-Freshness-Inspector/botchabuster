import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.school.botchabuster',
  appName: 'botchabuster',
  webDir: 'frontend/dist',
  server: {
    cleartext: true
  }
};

export default config;
