const STORAGE_KEY = 'waffleTycoon_sound';

interface SoundSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}

export class SoundManager {
  private static instance: SoundManager;
  private settings: SoundSettings;
  private gameSoundManager: Phaser.Sound.BaseSoundManager | null = null;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Phaser game.sound 참조를 저장합니다.
   * HTML 화면에서 scene 없이 오디오를 사용할 수 있게 합니다.
   */
  setGameSoundManager(soundManager: Phaser.Sound.BaseSoundManager): void {
    this.gameSoundManager = soundManager;
  }

  private getSoundManager(scene?: Phaser.Scene): Phaser.Sound.BaseSoundManager | null {
    if (scene) return scene.sound;
    return this.gameSoundManager;
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

  // Phaser 사운드 헬퍼 (scene 파라미터 선택적)
  playBgm(scene: Phaser.Scene | undefined, key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.settings.bgmEnabled) return;

    const sm = this.getSoundManager(scene);
    if (!sm) return;

    const playConfig = { loop: true, ...config };

    // iOS WebView: AudioContext가 잠겨있으면 unlock 후 재생
    if (sm.locked) {
      sm.once('unlocked', () => {
        sm.play(key, playConfig);
      });
    } else {
      sm.play(key, playConfig);
    }
  }

  playSfx(scene: Phaser.Scene | undefined, key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.settings.sfxEnabled) return;

    const sm = this.getSoundManager(scene);
    if (!sm) return;

    if (sm.locked) {
      sm.once('unlocked', () => {
        sm.play(key, config);
      });
    } else {
      sm.play(key, config);
    }
  }

  // BGM 상태 동기화 (설정 변경 시 호출)
  syncBgm(scene: Phaser.Scene | undefined, bgmKey: string, config?: Phaser.Types.Sound.SoundConfig): void {
    const sm = this.getSoundManager(scene);
    if (!sm) return;

    if (this.settings.bgmEnabled) {
      // BGM이 재생 중이 아니면 재생
      const isPlaying = sm.get(bgmKey)?.isPlaying;
      if (!isPlaying) {
        sm.play(bgmKey, { loop: true, ...config });
      }
    } else {
      // BGM 정지
      sm.stopByKey(bgmKey);
    }
  }

  // HTML 화면에서 사용: 모든 사운드 정지
  stopAll(): void {
    this.gameSoundManager?.stopAll();
  }
}
