import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { UpgradeType, UPGRADE_CONFIGS } from "../types/game";
import { ProgressManager } from "../utils/ProgressManager";

// 3열 그리드 레이아웃 정의
const SHOP_LAYOUT: UpgradeType[][] = [
  [UpgradeType.BERRY_JAM, UpgradeType.PISTACHIO_JAM], // 1행: 잼 해금
  [UpgradeType.BATTER, UpgradeType.FIRE_STRENGTH, UpgradeType.TIME_EXTENSION], // 2행: 능력 강화
  [UpgradeType.WORK_TRAY_CAPACITY, UpgradeType.FINISHED_TRAY_CAPACITY], // 3행: 트레이 확장
];

export class ShopScene extends Phaser.Scene {
  private progressManager!: ProgressManager;

  constructor() {
    super({ key: "ShopScene" });
  }

  create(): void {
    this.progressManager = ProgressManager.getInstance();
    this.createBackground();
    this.createHeader();
    this.createUpgradeGrid();
    this.createBackButton();
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor("#FFF8E7");
  }

  private createHeader(): void {
    // 헤더 배경
    this.add
      .rectangle(GAME_WIDTH / 2, 50, GAME_WIDTH - 20, 70, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914);

    // 타이틀
    this.add
      .text(GAME_WIDTH / 2, 35, "상점", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 별 잔액 표시 (아이콘 + 텍스트)
    const starIconX = GAME_WIDTH / 2 - 30;
    this.add
      .image(starIconX, 65, "icon_star")
      .setDisplaySize(24, 24);
    this.add
      .text(starIconX + 20, 65, `${this.progressManager.getTotalStars()}`, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "22px",
        color: "#FFD700",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private createUpgradeGrid(): void {
    const startY = 190; // 헤더 아래 여유 공간
    const rowHeight = 200;
    const colWidth = (GAME_WIDTH - 40) / 3;
    const cardWidth = colWidth - 20;
    const cardHeight = 180;
    const leftPadding = 30; // 왼쪽 여백

    SHOP_LAYOUT.forEach((row, rowIndex) => {
      const y = startY + rowIndex * rowHeight;

      // 왼쪽 정렬
      row.forEach((type, colIndex) => {
        const x = leftPadding + colWidth / 2 + colIndex * colWidth;
        this.createUpgradeCard(type, x, y, cardWidth, cardHeight);
      });
    });
  }

  private createUpgradeCard(
    type: UpgradeType,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const config = UPGRADE_CONFIGS[type];
    const currentLevel = this.progressManager.getUpgradeLevel(type);
    const isMaxed = currentLevel >= config.maxLevel;
    const canBuy = this.progressManager.canPurchaseUpgrade(type);
    const nextCost = this.progressManager.getUpgradeCost(type);

    // 카드 배경
    this.add
      .rectangle(x, y, width, height, 0xffffff)
      .setStrokeStyle(3, isMaxed ? 0x4caf50 : 0x8b6914);

    // 업그레이드 이름
    this.add
      .text(x, y - 55, config.name, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    // 설명
    this.add
      .text(x, y - 20, config.description, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "14px",
        color: "#7D6E57",
        align: "center",
        wordWrap: { width: width - 20 },
      })
      .setOrigin(0.5);

    // 레벨 표시
    this.add
      .text(x, y + 20, `Lv. ${currentLevel} / ${config.maxLevel}`, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "18px",
        color: isMaxed ? "#4CAF50" : "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 구매 버튼
    const btnY = y + 60;
    const btnWidth = width - 30;
    const btnHeight = 40;

    let btnColor = 0xd4a574;
    let btnTextColor = "#5D4E37";
    const showStarIcon = !isMaxed;

    if (isMaxed) {
      btnColor = 0x4caf50;
      btnTextColor = "#FFFFFF";
    } else if (!canBuy) {
      btnColor = 0xcccccc;
      btnTextColor = "#999999";
    }

    const buyBtn = this.add
      .rectangle(x, btnY, btnWidth, btnHeight, btnColor)
      .setStrokeStyle(2, isMaxed ? 0x388e3c : canBuy ? 0x8b6914 : 0x999999);

    if (showStarIcon) {
      // 별 아이콘 + 비용 표시
      const starIconSize = 20;
      this.add
        .image(x - 18, btnY, "icon_star")
        .setDisplaySize(starIconSize, starIconSize);
      this.add
        .text(x + 5, btnY, `${nextCost}`, {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "18px",
          color: btnTextColor,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5);
    } else {
      // MAX 텍스트
      this.add
        .text(x, btnY, "MAX", {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "18px",
          color: btnTextColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    if (!isMaxed) {
      buyBtn.setInteractive({ useHandCursor: canBuy });

      buyBtn.on("pointerdown", () => {
        if (this.progressManager.canPurchaseUpgrade(type)) {
          this.progressManager.purchaseUpgrade(type);
          this.refreshScene();
        } else {
          this.showMessage("별이 부족해요!");
        }
      });

      if (canBuy) {
        buyBtn.on("pointerover", () => {
          buyBtn.setFillStyle(0xc49a6c);
        });
        buyBtn.on("pointerout", () => {
          buyBtn.setFillStyle(0xd4a574);
        });
      }
    }
  }

  private refreshScene(): void {
    // 모든 자식 오브젝트 제거 후 다시 생성
    this.children.removeAll(true);
    this.createBackground();
    this.createHeader();
    this.createUpgradeGrid();
    this.createBackButton();
  }

  private createBackButton(): void {
    const btnY = GAME_HEIGHT - 80;

    const backBtn = this.add
      .rectangle(GAME_WIDTH / 2, btnY, 200, 60, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, btnY, "← 돌아가기", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    backBtn.on("pointerdown", () => {
      this.scene.start("HomeScene");
    });

    backBtn.on("pointerover", () => {
      backBtn.setFillStyle(0xc49a6c);
    });
    backBtn.on("pointerout", () => {
      backBtn.setFillStyle(0xd4a574);
    });
  }

  private showMessage(text: string): void {
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
        fontFamily: "UhBeePuding",
        fontSize: "24px",
        color: "#E85A4F",
        backgroundColor: "#FFFFFF",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: msg,
      y: msg.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => msg.destroy(),
    });
  }
}
