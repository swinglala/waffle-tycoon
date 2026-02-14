import Phaser from 'phaser';

// Legacy interface for backward compatibility during migration
export interface HTMLScreen {
  show(): void;
  hide(): void;
  destroy(): void;
}

export class ScreenManager {
  private static instance: ScreenManager;
  private currentScreen: string | null = null;
  private game: Phaser.Game | null = null;
  private renderCallback: ((screen: string | null) => void) | null = null;

  private constructor() {}

  static getInstance(): ScreenManager {
    if (!ScreenManager.instance) {
      ScreenManager.instance = new ScreenManager();
    }
    return ScreenManager.instance;
  }

  setGame(game: Phaser.Game): void {
    this.game = game;
  }

  getGame(): Phaser.Game | null {
    return this.game;
  }

  setRenderCallback(cb: ((screen: string | null) => void) | null): void {
    this.renderCallback = cb;
  }

  showScreen(name: string): void {
    // Stop all Phaser scenes except BootScene
    if (this.game) {
      const activeScenes = this.game.scene.getScenes(true);
      for (const scene of activeScenes) {
        if (scene.scene.key !== 'BootScene') {
          this.game.scene.stop(scene.scene.key);
        }
      }
    }

    // Show UI root
    document.getElementById('ui-root')?.classList.add('visible');

    this.currentScreen = name;
    this.renderCallback?.(name);
  }

  startPhaserScene(sceneKey: string, data?: object): void {
    this.currentScreen = null;
    this.renderCallback?.(null);

    // Hide UI root
    document.getElementById('ui-root')?.classList.remove('visible');

    if (this.game) {
      this.game.scene.start(sceneKey, data);
    }
  }

  getCurrentScreen(): string | null {
    return this.currentScreen;
  }

  hideAll(): void {
    this.currentScreen = null;
    this.renderCallback?.(null);
    document.getElementById('ui-root')?.classList.remove('visible');
  }
}
