import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 바 생성
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();

    progressBox.fillStyle(0xE8DCC4, 0.8);
    progressBox.fillRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 25, 320, 50);

    // 로딩 텍스트
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '로딩 중...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#5D4E37',
    });
    loadingText.setOrigin(0.5);

    // 로딩 진행률
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xD4A574, 1);
      progressBar.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // 여기에 에셋 로드
    // this.load.image('waffle', 'assets/images/waffle.png');
    // this.load.image('waffle-iron', 'assets/images/waffle-iron.png');
    // this.load.audio('sizzle', 'assets/audio/sizzle.mp3');
  }

  create(): void {
    // 게임 씬으로 전환
    this.scene.start('GameScene');
  }
}
