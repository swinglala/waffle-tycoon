/**
 * iOS Safe Area Inset을 읽어서 Phaser 게임 좌표계로 변환하는 유틸리티.
 * viewport-fit=cover 환경에서 env(safe-area-inset-top) CSS 값을 읽고,
 * Phaser EXPAND 모드의 좌표 비율로 변환합니다.
 */
export class SafeAreaManager {
  private static instance: SafeAreaManager;
  private cssInsetTop = 0;

  static getInstance(): SafeAreaManager {
    if (!SafeAreaManager.instance) {
      SafeAreaManager.instance = new SafeAreaManager();
    }
    return SafeAreaManager.instance;
  }

  /**
   * DOM에서 env(safe-area-inset-top) CSS 픽셀값을 읽습니다.
   * 앱 시작 시 1회 호출. 노치 없는 기기/웹에서는 0이 됩니다.
   */
  initialize(): void {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '0';
    div.style.height = 'env(safe-area-inset-top, 0px)';
    div.style.visibility = 'hidden';
    div.style.pointerEvents = 'none';
    document.body.appendChild(div);
    this.cssInsetTop = div.getBoundingClientRect().height;
    document.body.removeChild(div);
  }

  /**
   * CSS safe-area-inset-top을 Phaser 게임 좌표계 Y 오프셋으로 변환합니다.
   * Phaser EXPAND 모드에서는 gameHeight / cssCanvasHeight 비율로 변환합니다.
   */
  getTopOffset(scene: Phaser.Scene): number {
    if (this.cssInsetTop === 0) return 0;

    const canvas = scene.game.canvas;
    const cssCanvasHeight = canvas.clientHeight;
    const gameHeight = scene.cameras.main.height;

    if (cssCanvasHeight === 0) return 0;

    const ratio = gameHeight / cssCanvasHeight;
    return this.cssInsetTop * ratio;
  }
}
