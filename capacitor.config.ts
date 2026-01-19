import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waffletycoon.app',
  appName: '와플 타이쿤',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#FFF8E7',
  },
};

export default config;
