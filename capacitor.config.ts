import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waffletycoon.app',
  appName: '와플 타이쿤',
  webDir: 'dist',
  server: {
    // 개발 중: 원격 URL (웹 배포만으로 앱 업데이트)
    // 정식 출시 시: 아래 url 주석 처리하면 로컬 모드로 전환
    url: 'https://swinglala.github.io/waffle-tycoon/',
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
