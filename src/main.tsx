import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { gameConfig } from './config/gameConfig';
import App from './ui/App';

// Phaser game instance
const game = new Phaser.Game(gameConfig);

// Mount React UI
const uiRoot = document.getElementById('ui-root')!;
const root = createRoot(uiRoot);
root.render(<App />);

// Capacitor: app resume - refresh Phaser scale
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      setTimeout(() => {
        game.scale.refresh();
      }, 100);
    }
  });
}

// iOS WKWebView: force resume AudioContext on touch
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
