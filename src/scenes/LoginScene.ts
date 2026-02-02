import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { AuthManager } from '../utils/AuthManager';

export class LoginScene extends Phaser.Scene {
  private authManager: AuthManager;

  constructor() {
    super({ key: 'LoginScene' });
    this.authManager = AuthManager.getInstance();
  }

  create(): void {
    // 배경색
    this.cameras.main.setBackgroundColor('#FFF8E7');

    // 로고 (상단)
    const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'logo');
    logo.setScale(0.8);

    // 버튼 영역 (하단)
    const buttonY = GAME_HEIGHT * 0.65;
    const buttonSpacing = 80;

    // Google Login 버튼
    this.createButton(
      GAME_WIDTH / 2,
      buttonY,
      '🔑  Google 로그인',
      0x4285F4,
      () => this.handleGoogleLogin()
    );

    // Guest Login 버튼
    this.createButton(
      GAME_WIDTH / 2,
      buttonY + buttonSpacing,
      '👤  게스트로 시작',
      0x9E9E9E,
      () => this.handleGuestLogin()
    );

    // 하단 안내 텍스트
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.88, '게스트는 기기에만 데이터가 저장됩니다', {
      fontFamily: 'UhBeePuding',
      fontSize: '18px',
      color: '#999999',
    }).setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add.graphics();
    const width = 300;
    const height = 60;
    const radius = 30;

    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    // 버튼 텍스트
    const label = this.add.text(0, 0, text, {
      fontFamily: 'UhBeePuding',
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    container.add([bg, label]);

    // 인터랙티브 영역
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // 클릭 이벤트
    hitArea.on('pointerdown', () => {
      container.setScale(0.95);
    });

    hitArea.on('pointerup', () => {
      container.setScale(1);
      onClick();
    });

    hitArea.on('pointerout', () => {
      container.setScale(1);
    });

    // 호버 효과
    hitArea.on('pointerover', () => {
      container.setScale(1.02);
    });

    return container;
  }

  private async handleGoogleLogin(): Promise<void> {
    const { error } = await this.authManager.signInWithGoogle();

    if (error) {
      console.error('Google 로그인 실패:', error.message);
      // 에러 시에도 게스트로 진행 가능하도록
      return;
    }

    // 로그인 성공 시 localStorage에 표시하고 홈으로
    localStorage.setItem('waffle_hasLoggedIn', 'true');
    this.scene.start('HomeScene');
  }

  private handleGuestLogin(): void {
    // 게스트 로그인 표시
    localStorage.setItem('waffle_hasLoggedIn', 'true');
    localStorage.setItem('waffle_isGuest', 'true');
    this.scene.start('HomeScene');
  }
}
