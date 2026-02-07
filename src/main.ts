import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { gameConfig } from './config/gameConfig';
// Pretendard는 index.html에서 CDN subset으로 로드

// 게임 인스턴스 생성
const game = new Phaser.Game(gameConfig);

// Capacitor: 앱 나갈 때 오버레이 → 복귀 시 스케일 재계산 → 오버레이 제거
if (Capacitor.isNativePlatform()) {
  const overlay = document.createElement('div');
  overlay.id = 'resume-overlay';
  overlay.style.cssText =
    'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
    'background:#FFF8E7;z-index:9999;justify-content:center;align-items:center;';
  overlay.innerHTML = '<span style="font-family:UhBeePuding;font-size:24px;color:#5D4E37">로딩 중...</span>';
  document.body.appendChild(overlay);

  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      // 앱 나갈 때 즉시 오버레이로 가림
      overlay.style.display = 'flex';
    } else {
      // 앱 복귀 시 스케일 재계산 후 오버레이 제거
      setTimeout(() => {
        game.scale.refresh();
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 200);
      }, 100);
    }
  });
}

// iOS WKWebView: 터치 시 AudioContext 강제 resume
const resumeAudio = () => {
  try {
    const ctx = (game.sound as Phaser.Sound.WebAudioSoundManager)?.context;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    if (ctx?.state === 'running') {
      document.removeEventListener('touchstart', resumeAudio, true);
      document.removeEventListener('touchend', resumeAudio, true);
      document.removeEventListener('click', resumeAudio, true);
    }
  } catch {
    // ignore
  }
};

document.addEventListener('touchstart', resumeAudio, true);
document.addEventListener('touchend', resumeAudio, true);
document.addEventListener('click', resumeAudio, true);

export default game;
