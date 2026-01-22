import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { HeartManager } from "../utils/HeartManager";
import { ProgressManager } from "../utils/ProgressManager";
import { HEART_CONFIG } from "../types/game";

export class HomeScene extends Phaser.Scene {
  private currentDay = 1;
  private heartManager!: HeartManager;
  private progressManager!: ProgressManager;
  private heartsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    // home_background.png 로드
    this.load.image("home_background", "assets/images/home_background.png");
  }

  create(): void {
    this.heartManager = HeartManager.getInstance();
    this.progressManager = ProgressManager.getInstance();
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
    // ProgressManager에서 현재 일차 로드
    this.currentDay = this.progressManager.getCurrentDay();
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

    // 왼쪽: 유저 정보 영역 (추후 구현 예정)
    this.add
      .text(30, heartsY - 15, "👤 Guest", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 유저 정보 아래에 별 표시
    this.starsText = this.add
      .text(30, heartsY + 12, "", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#FFD700",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 하트 아이콘과 개수 (중앙)
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

    // 오른쪽: 설정 버튼
    const settingsBtnX = GAME_WIDTH - 55;
    const settingsBtn = this.add
      .circle(settingsBtnX, heartsY, 25, 0xc49a6c)
      .setStrokeStyle(2, 0x8b6914)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(settingsBtnX, heartsY, "⚙️", {
        fontSize: "24px",
      })
      .setOrigin(0.5);

    settingsBtn.on("pointerdown", () => {
      this.showPlaceholderPopup("설정");
    });

    settingsBtn.on("pointerover", () => {
      settingsBtn.setFillStyle(0xb8896c);
    });
    settingsBtn.on("pointerout", () => {
      settingsBtn.setFillStyle(0xc49a6c);
    });

    this.updateHeartsUI();
  }

  private updateHeartsUI(): void {
    const hearts = this.heartManager.getHearts();
    const maxHearts = HEART_CONFIG.MAX_HEARTS;

    // 별 표시
    const totalStars = this.progressManager.getTotalStars();
    this.starsText.setText(`⭐ ${totalStars}`);

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

    // 1. 랭킹 버튼 (가장 위)
    const rankingY = 140;
    const rankingCircle = this.add.circle(sideButtonX, rankingY, buttonRadius, 0xd4a574);
    rankingCircle.setStrokeStyle(3, 0x8b6914);
    rankingCircle.setInteractive({ useHandCursor: true });

    this.add
      .text(sideButtonX, rankingY, "🏆", { fontSize: "32px" })
      .setOrigin(0.5);

    rankingCircle.on("pointerdown", () => {
      this.showPlaceholderPopup("랭킹");
    });

    rankingCircle.on("pointerover", () => {
      rankingCircle.setFillStyle(0xc49a6c);
    });
    rankingCircle.on("pointerout", () => {
      rankingCircle.setFillStyle(0xd4a574);
    });

    // 2. 샵 버튼 (두번째)
    const shopY = 230;
    const shopCircle = this.add.circle(sideButtonX, shopY, buttonRadius, 0xFFD700);
    shopCircle.setStrokeStyle(3, 0xD4A574);
    shopCircle.setInteractive({ useHandCursor: true });

    this.add
      .text(sideButtonX, shopY, "🛒", { fontSize: "32px" })
      .setOrigin(0.5);

    shopCircle.on("pointerdown", () => {
      this.scene.start("ShopScene");
    });

    shopCircle.on("pointerover", () => {
      shopCircle.setFillStyle(0xE5C100);
    });
    shopCircle.on("pointerout", () => {
      shopCircle.setFillStyle(0xFFD700);
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
