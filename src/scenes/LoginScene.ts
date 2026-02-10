import Phaser from 'phaser';
import { AuthManager } from '../utils/AuthManager';

export class LoginScene extends Phaser.Scene {
  private authManager: AuthManager;
  private authUnsubscribe?: () => void;

  constructor() {
    super({ key: 'LoginScene' });
    this.authManager = AuthManager.getInstance();
  }

  create(): void {
    const { width: sw, height: sh } = this.cameras.main;

    // 배경색
    this.cameras.main.setBackgroundColor('#FFF8E7');

    // OAuth 복귀 시 로그인 감지 → HomeScene 이동
    this.authUnsubscribe = this.authManager.onAuthStateChange((user) => {
      if (user) {
        localStorage.setItem('waffle_hasLoggedIn', 'true');
        localStorage.removeItem('waffle_isGuest');
        this.authUnsubscribe?.();
        this.scene.start('HomeScene');
      }
    });

    // 로고 (상단)
    const logo = this.add.image(sw / 2, sh * 0.35, 'logo');
    logo.setScale(0.8);

    // 버튼 영역 (하단)
    const buttonY = sh * 0.58;
    const buttonSpacing = 60;

    // Kakao Login 버튼 (이미지 사용)
    this.createImageButton(
      sw / 2,
      buttonY,
      'btn_kakao_login',
      () => this.handleKakaoLogin()
    );

    // Google Login 버튼 (이미지 사용)
    this.createImageButton(
      sw / 2,
      buttonY + buttonSpacing,
      'btn_google_login',
      () => this.handleGoogleLogin()
    );

    // Guest Login 버튼
    this.createButton(
      sw / 2,
      buttonY + buttonSpacing * 2,
      '👤  게스트로 시작',
      0x9E9E9E,
      () => this.handleGuestLogin()
    );

    // 하단 안내 텍스트
    this.add.text(sw / 2, sh * 0.88, '게스트는 기기에만 데이터가 저장됩니다', {
      fontFamily: 'UhBeePuding',
      fontSize: '18px',
      color: '#999999',
    }).setOrigin(0.5);
  }

  private createImageButton(
    x: number,
    y: number,
    imageKey: string,
    onClick: () => void
  ): Phaser.GameObjects.Image {
    const button = this.add.image(x, y, imageKey);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      button.setScale(0.95);
    });

    button.on('pointerup', () => {
      button.setScale(1);
      onClick();
    });

    button.on('pointerout', () => {
      button.setScale(1);
    });

    button.on('pointerover', () => {
      button.setScale(1.02);
    });

    return button;
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void,
    textColor: string = '#FFFFFF'
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 버튼 배경
    const bg = this.add.graphics();
    const width = 183;
    const height = 45;
    const radius = 4;

    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);

    // 버튼 텍스트
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Pretendard, sans-serif',
      fontSize: '14px',
      color: textColor,
    }).setOrigin(0.5);

    container.add([bg, label]);

    // 인터랙티브 영역
    const hitArea = this.add.rectangle(0, 0, width, height, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

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

    hitArea.on('pointerover', () => {
      container.setScale(1.02);
    });

    return container;
  }

  private async handleGoogleLogin(): Promise<void> {
    this.showLoadingOverlay();

    const { error } = await this.authManager.signInWithGoogle();

    if (error) {
      console.error('Google 로그인 실패:', error.message);
      this.hideLoadingOverlay();
      this.showErrorMessage('로그인에 실패했습니다.');
      return;
    }
  }

  private async handleKakaoLogin(): Promise<void> {
    this.showLoadingOverlay();

    const { error } = await this.authManager.signInWithKakao();

    if (error) {
      console.error('Kakao 로그인 실패:', error.message);
      this.hideLoadingOverlay();
      this.showErrorMessage('로그인에 실패했습니다.');
      return;
    }
  }

  private loadingOverlay?: Phaser.GameObjects.Rectangle;
  private loadingText?: Phaser.GameObjects.Text;

  private showLoadingOverlay(): void {
    const { width: sw, height: sh } = this.cameras.main;

    this.loadingOverlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.7)
      .setDepth(100).setInteractive();

    this.loadingText = this.add.text(sw / 2, sh / 2, '로그인 중...', {
      fontFamily: 'UhBeePuding',
      fontSize: '28px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(101);
  }

  private hideLoadingOverlay(): void {
    this.loadingOverlay?.destroy();
    this.loadingText?.destroy();
  }

  private showErrorMessage(message: string): void {
    const { width: sw, height: sh } = this.cameras.main;

    const errorText = this.add.text(sw / 2, sh * 0.5, message, {
      fontFamily: 'UhBeePuding',
      fontSize: '20px',
      color: '#E85A4F',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      errorText.destroy();
    });
  }

  private handleGuestLogin(): void {
    localStorage.setItem('waffle_hasLoggedIn', 'true');
    localStorage.setItem('waffle_isGuest', 'true');
    this.scene.start('HomeScene');
  }
}
