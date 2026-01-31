const STORAGE_KEY = 'waffleTycoon_sound';

interface SoundSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}

export class SoundManager {
  private static instance: SoundManager;
  private settings: SoundSettings;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private getDefaultSettings(): SoundSettings {
    return {
      bgmEnabled: true,
      sfxEnabled: true,
    };
  }

  private loadSettings(): SoundSettings {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...this.getDefaultSettings(),
          ...parsed,
        };
      } catch {
        // 파싱 실패시 기본값
      }
    }
    return this.getDefaultSettings();
  }

  private saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  // BGM 설정
  isBgmEnabled(): boolean {
    return this.settings.bgmEnabled;
  }

  setBgmEnabled(enabled: boolean): void {
    this.settings.bgmEnabled = enabled;
    this.saveSettings();
  }

  toggleBgm(): boolean {
    this.settings.bgmEnabled = !this.settings.bgmEnabled;
    this.saveSettings();
    return this.settings.bgmEnabled;
  }

  // 효과음 설정
  isSfxEnabled(): boolean {
    return this.settings.sfxEnabled;
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
    this.saveSettings();
  }

  toggleSfx(): boolean {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;
    this.saveSettings();
    return this.settings.sfxEnabled;
  }

  // Phaser 사운드 헬퍼
  playBgm(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.settings.bgmEnabled) {
      scene.sound.play(key, { loop: true, ...config });
    }
  }

  playSfx(scene: Phaser.Scene, key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.settings.sfxEnabled) {
      scene.sound.play(key, config);
    }
  }

  // BGM 상태 동기화 (설정 변경 시 호출)
  syncBgm(scene: Phaser.Scene, bgmKey: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.settings.bgmEnabled) {
      // BGM이 재생 중이 아니면 재생
      const isPlaying = scene.sound.get(bgmKey)?.isPlaying;
      if (!isPlaying) {
        scene.sound.play(bgmKey, { loop: true, ...config });
      }
    } else {
      // BGM 정지
      scene.sound.stopByKey(bgmKey);
    }
  }
}
