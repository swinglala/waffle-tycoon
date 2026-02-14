import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager';
import { AuthManager } from '../utils/AuthManager';
import { ProgressManager } from '../utils/ProgressManager';
import { HeartManager } from '../utils/HeartManager';

export class SettingsScene extends Phaser.Scene {
  private soundManager!: SoundManager;
  private authManager!: AuthManager;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.soundManager = SoundManager.getInstance();
    this.authManager = AuthManager.getInstance();

    this.createBackground();
    this.createHeader();
    this.createSettingsUI();
    this.createAccountSection();
    this.createBackButton();
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor('#FFF8E7');
  }

  private createHeader(): void {
    const { width: sw } = this.cameras.main;

    // 헤더 배경
    this.add
      .rectangle(sw / 2, 60, sw - 40, 80, 0xD4A574)
      .setStrokeStyle(3, 0x8B6914);

    // 타이틀
    this.add
      .text(sw / 2, 60, '⚙️ 설정', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '36px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  private createSettingsUI(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const startY = 200;
    const rowHeight = 120;

    // 사운드 설정 섹션
    this.add
      .text(sw / 2, startY, '🔊 사운드 설정', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '28px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // BGM 토글
    this.createToggleRow(
      startY + rowHeight,
      '🎵 배경음악 (BGM)',
      this.soundManager.isBgmEnabled(),
      (enabled) => {
        this.soundManager.setBgmEnabled(enabled);
        this.soundManager.syncBgm(this, 'bgm_home', { volume: 0.5 });
      }
    );

    // 효과음 토글
    this.createToggleRow(
      startY + rowHeight * 2,
      '🔔 효과음 (SFX)',
      this.soundManager.isSfxEnabled(),
      (enabled) => {
        this.soundManager.setSfxEnabled(enabled);
        // 효과음 토글 시 테스트 사운드
        if (enabled) {
          this.sound.play('sfx_coin', { volume: 0.5 });
        }
      }
    );

    // 구분선
    this.add
      .rectangle(sw / 2, startY + rowHeight * 3, sw - 80, 2, 0xD4A574);

    // 버전 정보
    this.add
      .text(sw / 2, sh - 100, 'Waffle Tycoon v1.0.0', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '18px',
        color: '#999999',
      })
      .setOrigin(0.5);
  }

  private createToggleRow(
    y: number,
    label: string,
    initialValue: boolean,
    onChange: (enabled: boolean) => void
  ): void {
    const { width: sw } = this.cameras.main;
    const rowWidth = sw - 80;
    const rowX = sw / 2;

    // 행 배경
    this.add
      .rectangle(rowX, y, rowWidth, 80, 0xF5E6D3)
      .setStrokeStyle(2, 0xD4A574);

    // 라벨
    this.add
      .text(80, y, label, {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '24px',
        color: '#5D4E37',
      })
      .setOrigin(0, 0.5);

    // 토글 스위치 생성
    const toggleX = sw - 100;
    const toggleWidth = 70;
    const toggleHeight = 36;
    const knobRadius = 14;

    // 토글 배경
    const toggle = this.add
      .rectangle(
        toggleX,
        y,
        toggleWidth,
        toggleHeight,
        initialValue ? 0x4CAF50 : 0xCCCCCC
      )
      .setStrokeStyle(2, initialValue ? 0x388E3C : 0x999999)
      .setInteractive({ useHandCursor: true });

    // 둥근 모서리 효과를 위한 양쪽 원
    const leftCircle = this.add
      .circle(toggleX - toggleWidth / 2 + toggleHeight / 2, y, toggleHeight / 2, initialValue ? 0x4CAF50 : 0xCCCCCC);
    const rightCircle = this.add
      .circle(toggleX + toggleWidth / 2 - toggleHeight / 2, y, toggleHeight / 2, initialValue ? 0x4CAF50 : 0xCCCCCC);

    // 토글 노브 (손잡이)
    const knobX = initialValue
      ? toggleX + toggleWidth / 2 - knobRadius - 4
      : toggleX - toggleWidth / 2 + knobRadius + 4;

    const knob = this.add
      .circle(knobX, y, knobRadius, 0xFFFFFF)
      .setStrokeStyle(2, 0xDDDDDD);

    // 상태 저장
    let isEnabled = initialValue;

    // 클릭 이벤트
    toggle.on('pointerdown', () => {
      isEnabled = !isEnabled;

      // 색상 변경
      const bgColor = isEnabled ? 0x4CAF50 : 0xCCCCCC;
      const strokeColor = isEnabled ? 0x388E3C : 0x999999;
      toggle.setFillStyle(bgColor);
      toggle.setStrokeStyle(2, strokeColor);
      leftCircle.setFillStyle(bgColor);
      rightCircle.setFillStyle(bgColor);

      // 노브 위치 애니메이션
      const newKnobX = isEnabled
        ? toggleX + toggleWidth / 2 - knobRadius - 4
        : toggleX - toggleWidth / 2 + knobRadius + 4;

      this.tweens.add({
        targets: knob,
        x: newKnobX,
        duration: 150,
        ease: 'Power2',
      });

      // 콜백 호출
      onChange(isEnabled);
    });
  }

  private createAccountSection(): void {
    const { width: sw } = this.cameras.main;
    const isLoggedIn = this.authManager.isLoggedIn();
    const sectionY = 600;

    // 계정 섹션 타이틀
    this.add
      .text(sw / 2, sectionY, '👤 계정 관리', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '28px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // 로그인/로그아웃 버튼
    const authBtnY = sectionY + 80;
    const authBtnColor = isLoggedIn ? 0xe74c3c : 0x4285f4;
    const authBtnStroke = isLoggedIn ? 0xc0392b : 0x3367d6;
    const authBtnLabel = isLoggedIn ? '로그아웃' : '로그인';

    const authBtn = this.add
      .rectangle(sw / 2, authBtnY, 280, 55, authBtnColor)
      .setStrokeStyle(3, authBtnStroke)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(sw / 2, authBtnY, authBtnLabel, {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '24px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    authBtn.on('pointerdown', () => {
      if (this.authManager.isLoggedIn()) {
        this.showLogoutConfirmPopup();
      } else {
        this.scene.start('LoginScene');
      }
    });
    authBtn.on('pointerover', () => authBtn.setFillStyle(authBtnStroke));
    authBtn.on('pointerout', () => authBtn.setFillStyle(authBtnColor));

    // 계정 삭제 버튼 (로그인 상태에서만)
    if (isLoggedIn) {
      const deleteBtnY = authBtnY + 75;
      const deleteBtn = this.add
        .rectangle(sw / 2, deleteBtnY, 280, 55, 0x999999)
        .setStrokeStyle(3, 0x777777)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(sw / 2, deleteBtnY, '계정 삭제', {
          fontFamily: 'UhBeePuding',
          padding: { y: 5 },
          fontSize: '24px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      deleteBtn.on('pointerdown', () => this.showDeleteAccountPopup());
      deleteBtn.on('pointerover', () => deleteBtn.setFillStyle(0x777777));
      deleteBtn.on('pointerout', () => deleteBtn.setFillStyle(0x999999));
    }
  }

  private showLogoutConfirmPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();
    popupObjects.push(overlay);

    const popup = this.add.rectangle(sw / 2, sh / 2, 400, 200, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    const title = this.add
      .text(sw / 2, sh / 2 - 50, '로그아웃', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '28px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(title);

    const message = this.add
      .text(sw / 2, sh / 2, '정말 로그아웃 하시겠습니까?', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '20px',
        color: '#5D4E37',
      })
      .setOrigin(0.5);
    popupObjects.push(message);

    const confirmBtn = this.add
      .rectangle(sw / 2 - 70, sh / 2 + 60, 100, 40, 0xe74c3c)
      .setStrokeStyle(2, 0xc0392b)
      .setInteractive({ useHandCursor: true });
    popupObjects.push(confirmBtn);

    const confirmText = this.add
      .text(sw / 2 - 70, sh / 2 + 60, '로그아웃', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '16px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(confirmText);

    const cancelBtn = this.add
      .rectangle(sw / 2 + 70, sh / 2 + 60, 100, 40, 0xd4a574)
      .setStrokeStyle(2, 0x8b6914)
      .setInteractive({ useHandCursor: true });
    popupObjects.push(cancelBtn);

    const cancelText = this.add
      .text(sw / 2 + 70, sh / 2 + 60, '취소', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '16px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(cancelText);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    confirmBtn.on('pointerdown', async () => {
      closePopup();
      await this.authManager.signOut();
      ProgressManager.getInstance().resetProgress();
      HeartManager.getInstance().resetHearts();
      localStorage.removeItem('waffle_hasLoggedIn');
      localStorage.removeItem('waffle_isGuest');
      this.scene.start('LoginScene');
    });

    cancelBtn.on('pointerdown', closePopup);
    overlay.on('pointerdown', closePopup);

    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0xc0392b));
    confirmBtn.on('pointerout', () => confirmBtn.setFillStyle(0xe74c3c));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0xc49a6c));
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0xd4a574));
  }

  private showDeleteAccountPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.6);
    overlay.setInteractive();
    popupObjects.push(overlay);

    const popup = this.add.rectangle(sw / 2, sh / 2, 560, 440, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    const title = this.add
      .text(sw / 2, sh / 2 - 150, '계정 삭제', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '48px',
        color: '#E85A4F',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(title);

    const message = this.add
      .text(
        sw / 2,
        sh / 2 - 30,
        '정말 계정을 삭제하시겠습니까?\n\n모든 게임 데이터가 영구적으로\n삭제되며 복구할 수 없습니다.',
        {
          fontFamily: 'UhBeePuding',
          padding: { y: 5 },
          fontSize: '32px',
          color: '#5D4E37',
          align: 'center',
        }
      )
      .setOrigin(0.5);
    popupObjects.push(message);

    // 삭제 확인 버튼
    const confirmBtn = this.add
      .rectangle(sw / 2 - 100, sh / 2 + 140, 170, 70, 0xe74c3c)
      .setStrokeStyle(3, 0xc0392b)
      .setInteractive({ useHandCursor: true });
    popupObjects.push(confirmBtn);

    const confirmText = this.add
      .text(sw / 2 - 100, sh / 2 + 140, '삭제', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '34px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(confirmText);

    // 취소 버튼
    const cancelBtn = this.add
      .rectangle(sw / 2 + 100, sh / 2 + 140, 170, 70, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });
    popupObjects.push(cancelBtn);

    const cancelText = this.add
      .text(sw / 2 + 100, sh / 2 + 140, '취소', {
        fontFamily: 'UhBeePuding',
        padding: { y: 5 },
        fontSize: '34px',
        color: '#5D4E37',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    popupObjects.push(cancelText);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    confirmBtn.on('pointerdown', async () => {
      closePopup();
      await this.executeDeleteAccount();
    });

    cancelBtn.on('pointerdown', closePopup);
    overlay.on('pointerdown', closePopup);

    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0xc0392b));
    confirmBtn.on('pointerout', () => confirmBtn.setFillStyle(0xe74c3c));
    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0xc49a6c));
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0xd4a574));
  }

  private async executeDeleteAccount(): Promise<void> {
    const { width: sw, height: sh } = this.cameras.main;

    // 로딩 표시
    const loadingOverlay = this.add
      .rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.7)
      .setDepth(100)
      .setInteractive();
    const loadingText = this.add
      .text(sw / 2, sh / 2, '계정 삭제 중...', {
        fontFamily: 'UhBeePuding',
        fontSize: '28px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5)
      .setDepth(101);

    const { error } = await this.authManager.deleteAccount();

    loadingOverlay.destroy();
    loadingText.destroy();

    if (error) {
      // 에러 메시지 표시
      const errorText = this.add
        .text(sw / 2, sh / 2, '계정 삭제에 실패했습니다.\n다시 시도해주세요.', {
          fontFamily: 'UhBeePuding',
          fontSize: '22px',
          color: '#E85A4F',
          align: 'center',
        })
        .setOrigin(0.5);

      this.time.delayedCall(2000, () => errorText.destroy());
      return;
    }

    // 삭제 성공 → 로컬 데이터도 초기화 후 로그인 화면으로
    ProgressManager.getInstance().resetProgress();
    HeartManager.getInstance().resetHearts();
    this.scene.start('LoginScene');
  }

  private createBackButton(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const btnY = sh - 80;

    const backBtn = this.add
      .image(sw / 2, btnY, "button")
      .setDisplaySize(300, 100)
      .setInteractive({ useHandCursor: true });

    // 홈 아이콘
    const homeIcon = this.add
      .image(sw / 2 - 50, btnY, "home_100")
      .setDisplaySize(60, 60);

    // 텍스트
    this.add
      .text(sw / 2 + 10, btnY, "홈으로", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    backBtn.on("pointerdown", () => {
      this.scene.start("HomeScene");
    });

    backBtn.on("pointerover", () => {
      backBtn.setTint(0xdddddd);
      homeIcon.setTint(0xdddddd);
    });
    backBtn.on("pointerout", () => {
      backBtn.clearTint();
      homeIcon.clearTint();
    });
  }
}
