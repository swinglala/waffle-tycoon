import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager';

export class SettingsScene extends Phaser.Scene {
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.soundManager = SoundManager.getInstance();

    this.createBackground();
    this.createHeader();
    this.createSettingsUI();
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
