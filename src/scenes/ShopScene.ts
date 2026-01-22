import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { UpgradeType, UPGRADE_CONFIGS } from "../types/game";
import { ProgressManager } from "../utils/ProgressManager";

export class ShopScene extends Phaser.Scene {
  private progressManager!: ProgressManager;
  private starsText!: Phaser.GameObjects.Text;
  private upgradeCards: Map<UpgradeType, {
    card: Phaser.GameObjects.Rectangle;
    levelText: Phaser.GameObjects.Text;
    buyBtn: Phaser.GameObjects.Rectangle;
    buyBtnText: Phaser.GameObjects.Text;
  }> = new Map();

  constructor() {
    super({ key: "ShopScene" });
  }

  create(): void {
    this.progressManager = ProgressManager.getInstance();
    this.createBackground();
    this.createHeader();
    this.createUpgradeCards();
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
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 별 잔액 표시
    this.starsText = this.add
      .text(GAME_WIDTH / 2, 65, this.getStarsDisplayText(), {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#FFD700",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private getStarsDisplayText(): string {
    return `⭐ ${this.progressManager.getTotalStars()}`;
  }

  private createUpgradeCards(): void {
    const upgradeTypes = Object.values(UpgradeType);
    const cardWidth = GAME_WIDTH - 60;
    const cardHeight = 140;
    const startY = 140;
    const gap = 15;

    upgradeTypes.forEach((type, index) => {
      const config = UPGRADE_CONFIGS[type];
      const y = startY + index * (cardHeight + gap);
      this.createUpgradeCard(type, config, cardWidth, cardHeight, y);
    });
  }

  private createUpgradeCard(
    type: UpgradeType,
    config: { name: string; description: string; cost: number; maxLevel: number },
    width: number,
    height: number,
    y: number
  ): void {
    const x = GAME_WIDTH / 2;
    const currentLevel = this.progressManager.getUpgradeLevel(type);
    const isMaxed = currentLevel >= config.maxLevel;
    const canBuy = this.progressManager.canPurchaseUpgrade(type);

    // 카드 배경
    const card = this.add
      .rectangle(x, y, width, height, 0xffffff)
      .setStrokeStyle(3, isMaxed ? 0x4CAF50 : 0x8b6914);

    // 업그레이드 이름
    this.add
      .text(40, y - 40, config.name, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 설명
    this.add
      .text(40, y - 5, config.description, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#7D6E57",
      })
      .setOrigin(0, 0.5);

    // 레벨 표시
    const levelText = this.add
      .text(40, y + 35, `Lv. ${currentLevel} / ${config.maxLevel}`, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: isMaxed ? "#4CAF50" : "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 구매 버튼
    const btnX = GAME_WIDTH - 100;
    const btnWidth = 120;
    const btnHeight = 50;

    let btnColor = 0xd4a574;
    let btnTextColor = "#5D4E37";
    let btnLabel = `⭐${config.cost}`;

    if (isMaxed) {
      btnColor = 0x4CAF50;
      btnTextColor = "#FFFFFF";
      btnLabel = "MAX";
    } else if (!canBuy) {
      btnColor = 0xcccccc;
      btnTextColor = "#999999";
    }

    const buyBtn = this.add
      .rectangle(btnX, y, btnWidth, btnHeight, btnColor)
      .setStrokeStyle(2, isMaxed ? 0x388e3c : canBuy ? 0x8b6914 : 0x999999);

    const buyBtnText = this.add
      .text(btnX, y, btnLabel, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: btnTextColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (!isMaxed) {
      buyBtn.setInteractive({ useHandCursor: canBuy });

      buyBtn.on("pointerdown", () => {
        if (this.progressManager.canPurchaseUpgrade(type)) {
          this.progressManager.purchaseUpgrade(type);
          this.refreshUpgradeCards();
          this.updateStarsDisplay();
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

    this.upgradeCards.set(type, { card, levelText, buyBtn, buyBtnText });
  }

  private refreshUpgradeCards(): void {
    // 기존 카드 제거
    this.upgradeCards.forEach(({ card, levelText, buyBtn, buyBtnText }) => {
      card.destroy();
      levelText.destroy();
      buyBtn.destroy();
      buyBtnText.destroy();
    });
    this.upgradeCards.clear();

    // 모든 자식 오브젝트 제거 후 다시 생성
    this.children.removeAll(true);
    this.createBackground();
    this.createHeader();
    this.createUpgradeCards();
    this.createBackButton();
  }

  private updateStarsDisplay(): void {
    this.starsText.setText(this.getStarsDisplayText());
  }

  private createBackButton(): void {
    const btnY = GAME_HEIGHT - 80;

    const backBtn = this.add
      .rectangle(GAME_WIDTH / 2, btnY, 200, 60, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(GAME_WIDTH / 2, btnY, "← 돌아가기", {
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
