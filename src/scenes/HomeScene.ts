import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { HeartManager } from "../utils/HeartManager";
import { HEART_CONFIG } from "../types/game";

export class HomeScene extends Phaser.Scene {
  private currentDay = 1;
  private heartManager!: HeartManager;
  private heartsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    // home_background.png 로드
    this.load.image("home_background", "assets/images/home_background.png");
  }

  create(): void {
    this.heartManager = HeartManager.getInstance();
    this.loadProgress();
    this.createBackground();
    this.createTitle();
    this.createHeartsUI();
    this.createStartButton();
    this.createSideButtons();
  }

  update(): void {
    // 하트 UI 업데이트
    this.updateHeartsUI();
  }

  private loadProgress(): void {
    // 추후 LocalStorage 연동 대비
    // const savedDay = localStorage.getItem('waffleTycoon_currentDay');
    // if (savedDay) {
    //   this.currentDay = parseInt(savedDay, 10);
    // }
  }

  private createBackground(): void {
    // 배경 이미지
    const bg = this.add.image(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "home_background",
    );
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }

  private createTitle(): void {
    // 타이틀 텍스트
    const titleText = this.add.text(GAME_WIDTH / 2, 200, "와플 타이쿤", {
      fontFamily: "Arial",
      fontSize: "56px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    titleText.setOrigin(0.5);
  }

  private createHeartsUI(): void {
    const heartsY = 50;

    // 하트 헤더 배경
    this.add
      .rectangle(GAME_WIDTH / 2, heartsY, GAME_WIDTH - 20, 70, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914);

    // 하트 아이콘과 개수
    this.heartsText = this.add
      .text(GAME_WIDTH / 2, heartsY - 8, "", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    // 충전 타이머
    this.timerText = this.add
      .text(GAME_WIDTH / 2, heartsY + 20, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#5D4E37",
      })
      .setOrigin(0.5);

    this.updateHeartsUI();
  }

  private updateHeartsUI(): void {
    const hearts = this.heartManager.getHearts();
    const maxHearts = HEART_CONFIG.MAX_HEARTS;

    // 하트 표시 (채워진 하트 + 빈 하트)
    let heartDisplay = "";
    for (let i = 0; i < maxHearts; i++) {
      heartDisplay += i < hearts ? "❤️" : "🤍";
    }
    this.heartsText.setText(heartDisplay);

    // 타이머 표시
    if (hearts < maxHearts) {
      const timeStr = this.heartManager.formatTimeToNextHeart();
      this.timerText.setText(`다음 하트: ${timeStr}`);
    } else {
      this.timerText.setText("하트 충전 완료!");
    }
  }

  private createStartButton(): void {
    const buttonWidth = 320;
    const buttonHeight = 70;
    const buttonY = 640;

    // 버튼 배경
    const buttonBg = this.add.rectangle(
      GAME_WIDTH / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      0xd4a574,
    );
    buttonBg.setStrokeStyle(4, 0x8b6914);
    buttonBg.setInteractive({ useHandCursor: true });

    // 버튼 텍스트
    const buttonText = this.add.text(
      GAME_WIDTH / 2,
      buttonY,
      `${this.currentDay}일차 시작하기`,
      {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    buttonText.setOrigin(0.5);

    // 클릭 이벤트
    buttonBg.on("pointerdown", () => {
      if (this.heartManager.hasHeart()) {
        this.scene.start("GameScene", { day: this.currentDay });
      } else {
        this.showNoHeartsPopup();
      }
    });

    // 호버 효과
    buttonBg.on("pointerover", () => {
      buttonBg.setFillStyle(0xc49a6c);
    });
    buttonBg.on("pointerout", () => {
      buttonBg.setFillStyle(0xd4a574);
    });
  }

  private showNoHeartsPopup(): void {
    // 반투명 오버레이
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5,
    );
    overlay.setInteractive();

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      400,
      220,
      0xfff8e7,
    );
    popup.setStrokeStyle(4, 0x8b6914);

    // 팝업 타이틀
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 60,
      "💔 하트 부족",
      {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#E85A4F",
        fontStyle: "bold",
      },
    );
    popupTitle.setOrigin(0.5);

    // 메시지
    const timeStr = this.heartManager.formatTimeToNextHeart();
    const message = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `하트가 없어요!\n다음 하트까지: ${timeStr}`,
      {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#5D4E37",
        align: "center",
      },
    );
    message.setOrigin(0.5);

    // 닫기 버튼
    const closeBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 70,
      120,
      45,
      0xd4a574,
    );
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 70,
      "확인",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    closeBtnText.setOrigin(0.5);

    // 닫기 클릭 이벤트
    const closePopup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      message.destroy();
      closeBtn.destroy();
      closeBtnText.destroy();
    };

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    closeBtn.on("pointerover", () => {
      closeBtn.setFillStyle(0xc49a6c);
    });
    closeBtn.on("pointerout", () => {
      closeBtn.setFillStyle(0xd4a574);
    });
  }

  private createSideButtons(): void {
    const sideButtonX = 640;
    const buttonRadius = 35;
    const buttons = [
      { y: 120, emoji: "🏆", label: "랭킹" },
      { y: 210, emoji: "⚙️", label: "설정" },
      { y: 300, emoji: "❓", label: "도움말" },
    ];

    buttons.forEach(({ y, emoji, label }) => {
      // 원형 버튼 배경
      const circle = this.add.circle(sideButtonX, y, buttonRadius, 0xd4a574);
      circle.setStrokeStyle(3, 0x8b6914);
      circle.setInteractive({ useHandCursor: true });

      // 이모지
      const emojiText = this.add.text(sideButtonX, y, emoji, {
        fontSize: "32px",
      });
      emojiText.setOrigin(0.5);

      // 클릭 이벤트 - placeholder 팝업
      circle.on("pointerdown", () => {
        this.showPlaceholderPopup(label);
      });

      // 호버 효과
      circle.on("pointerover", () => {
        circle.setFillStyle(0xc49a6c);
      });
      circle.on("pointerout", () => {
        circle.setFillStyle(0xd4a574);
      });
    });
  }

  private showPlaceholderPopup(title: string): void {
    // 반투명 오버레이
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5,
    );
    overlay.setInteractive();

    // 팝업 배경
    const popupWidth = 400;
    const popupHeight = 200;
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      popupWidth,
      popupHeight,
      0xfff8e7,
    );
    popup.setStrokeStyle(4, 0x8b6914);

    // 팝업 타이틀
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      title,
      {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    popupTitle.setOrigin(0.5);

    // 준비 중 메시지
    const message = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "준비 중입니다!",
      {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#5D4E37",
      },
    );
    message.setOrigin(0.5);

    // 닫기 버튼
    const closeBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      120,
      45,
      0xd4a574,
    );
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      "닫기",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    closeBtnText.setOrigin(0.5);

    // 닫기 클릭 이벤트
    const closePopup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      message.destroy();
      closeBtn.destroy();
      closeBtnText.destroy();
    };

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    // 호버 효과
    closeBtn.on("pointerover", () => {
      closeBtn.setFillStyle(0xc49a6c);
    });
    closeBtn.on("pointerout", () => {
      closeBtn.setFillStyle(0xd4a574);
    });
  }
}
