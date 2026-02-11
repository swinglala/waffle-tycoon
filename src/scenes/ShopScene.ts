import Phaser from "phaser";
import { UpgradeType, UpgradeCategory, UPGRADE_CONFIGS } from "../types/game";
import { ProgressManager } from "../utils/ProgressManager";

// 카테고리별 업그레이드 그룹
const UPGRADE_BY_CATEGORY: Record<UpgradeCategory, UpgradeType[]> = {
  [UpgradeCategory.BASIC]: [
    UpgradeType.BATTER,
    UpgradeType.FIRE_STRENGTH,
    UpgradeType.TIME_EXTENSION,
    UpgradeType.WORK_TRAY_CAPACITY,
    UpgradeType.FINISHED_TRAY_CAPACITY,
  ],
  [UpgradeCategory.CUSTOMER]: [UpgradeType.KINDNESS, UpgradeType.TIP_BONUS],
  [UpgradeCategory.COOKING]: [
    UpgradeType.KEEP_WARM,
    UpgradeType.BURN_PROTECTION,
  ],
  [UpgradeCategory.SALES]: [
    UpgradeType.COMBO_MASTER,
    UpgradeType.COMBO_BONUS,
    UpgradeType.LUCKY_WAFFLE,
  ],
  [UpgradeCategory.STRONG_FIRE]: [
    UpgradeType.STRONG_FIRE_DURATION,
    UpgradeType.STRONG_FIRE_POWER,
  ],
};

// 카테고리 표시 이름
const CATEGORY_NAMES: Record<UpgradeCategory, string> = {
  [UpgradeCategory.BASIC]: "기본",
  [UpgradeCategory.CUSTOMER]: "손님",
  [UpgradeCategory.COOKING]: "굽기",
  [UpgradeCategory.SALES]: "판매",
  [UpgradeCategory.STRONG_FIRE]: "강불",
};

// 카테고리 순서
const CATEGORY_ORDER: UpgradeCategory[] = [
  UpgradeCategory.BASIC,
  UpgradeCategory.CUSTOMER,
  UpgradeCategory.COOKING,
  UpgradeCategory.SALES,
  UpgradeCategory.STRONG_FIRE,
];

// 드래그 vs 클릭 구분 임계값
const DRAG_THRESHOLD = 10;

export class ShopScene extends Phaser.Scene {
  private progressManager!: ProgressManager;
  private scrollContainer!: Phaser.GameObjects.Container;
  private contentHeight: number = 0;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;
  private dragDistance: number = 0;
  private scrollY: number = 0;
  private minScrollY: number = 0;
  private maxScrollY: number = 0;

  // 레이아웃 상수
  private readonly HEADER_HEIGHT = 100;
  private readonly FOOTER_HEIGHT = 100;
  private readonly SCROLL_AREA_TOP = 110;
  private SCROLL_AREA_HEIGHT = 0; // create()에서 계산
  private readonly COL_COUNT = 3;
  private readonly CARD_WIDTH = 210;
  private readonly CARD_HEIGHT = 360;
  private readonly CARD_GAP = 15;
  private readonly CATEGORY_HEADER_HEIGHT = 50;

  constructor() {
    super({ key: "ShopScene" });
  }

  create(): void {
    this.progressManager = ProgressManager.getInstance();
    this.scrollY = 0;
    this.dragDistance = 0;
    this.SCROLL_AREA_HEIGHT = this.cameras.main.height - 210;

    this.createBackground();
    this.createHeader();
    this.createScrollableContent();
    this.createBackButton();
    this.setupScrolling();
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor("#FFF8E7");
  }

  private createHeader(): void {
    // 헤더 배경
    this.add
      .rectangle(this.cameras.main.width / 2, 50, this.cameras.main.width, this.HEADER_HEIGHT, 0xd4a574)
      .setDepth(100);

    // 타이틀
    this.add
      .text(this.cameras.main.width / 2, 35, "상점", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "36px",
        color: "#5D4E37",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(101);

    // 별 잔액 표시
    const starIconX = this.cameras.main.width / 2 - 35;
    this.add
      .image(starIconX, 70, "icon_star")
      .setDisplaySize(28, 28)
      .setDepth(101);
    this.add
      .text(starIconX + 22, 70, `${this.progressManager.getTotalStars()}`, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#FFD700",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0, 0.5)
      .setDepth(101);
  }

  private createScrollableContent(): void {
    const scrollTop = this.SCROLL_AREA_TOP;
    // 스크롤 영역 마스크
    const maskShape = this.add
      .rectangle(
        this.cameras.main.width / 2,
        scrollTop + this.SCROLL_AREA_HEIGHT / 2,
        this.cameras.main.width,
        this.SCROLL_AREA_HEIGHT,
        0xffffff,
      )
      .setVisible(false);

    const mask = maskShape.createGeometryMask();

    // 스크롤 컨테이너
    this.scrollContainer = this.add.container(0, scrollTop);
    this.scrollContainer.setMask(mask);

    // 콘텐츠 생성
    let currentY = 20;

    for (const category of CATEGORY_ORDER) {
      const upgrades = UPGRADE_BY_CATEGORY[category];

      // 카테고리 헤더
      this.createCategoryHeader(category, currentY);
      currentY += this.CATEGORY_HEADER_HEIGHT;

      // 3열 그리드로 업그레이드 카드 배치
      const rows = Math.ceil(upgrades.length / this.COL_COUNT);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < this.COL_COUNT; col++) {
          const index = row * this.COL_COUNT + col;
          if (index >= upgrades.length) break;

          const type = upgrades[index];
          const x =
            20 + col * (this.CARD_WIDTH + this.CARD_GAP) + this.CARD_WIDTH / 2;
          const y = currentY + this.CARD_HEIGHT / 2;

          this.createUpgradeCard(type, x, y);
        }
        currentY += this.CARD_HEIGHT + this.CARD_GAP;
      }

      currentY += 10;
    }

    this.contentHeight = currentY + 20;
    this.minScrollY = 0;
    this.maxScrollY = Math.max(0, this.contentHeight - this.SCROLL_AREA_HEIGHT);
  }

  private createCategoryHeader(category: UpgradeCategory, y: number): void {
    const headerBg = this.add
      .rectangle(this.cameras.main.width / 2, y + 20, this.cameras.main.width - 40, 44, 0xffd982)
      .setStrokeStyle(2, 0x6b3e26);

    const headerText = this.add
      .text(this.cameras.main.width / 2, y + 20, CATEGORY_NAMES[category], {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#5D4E37",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5);

    this.scrollContainer.add([headerBg, headerText]);
  }

  private createUpgradeCard(type: UpgradeType, x: number, y: number): void {
    const config = UPGRADE_CONFIGS[type];
    const currentLevel = this.progressManager.getUpgradeLevel(type);
    const isMaxed = currentLevel >= config.maxLevel;
    const canBuy = this.progressManager.canPurchaseUpgrade(type);
    const nextCost = this.progressManager.getUpgradeCost(type);

    const cardElements: Phaser.GameObjects.GameObject[] = [];

    // 카드 배경
    const cardBg = this.add
      .rectangle(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 0xffffff)
      .setStrokeStyle(3, isMaxed ? 0x4caf50 : 0x8b6914);
    cardElements.push(cardBg);

    // 이미지 (상단)
    const imageY = y - 85;
    const imageSize = 150;
    if (config.imageKey) {
      const upgradeImage = this.add
        .image(x, imageY, config.imageKey)
        .setDisplaySize(imageSize, imageSize);
      cardElements.push(upgradeImage);
    } else {
      // 이미지가 없는 경우 플레이스홀더
      const placeholder = this.add
        .rectangle(x, imageY, imageSize, imageSize, 0xeeeeee)
        .setStrokeStyle(2, 0xcccccc);
      const questionMark = this.add
        .text(x, imageY, "?", {
          fontFamily: "UhBeePuding",
          fontSize: "60px",
          color: "#999999",
          resolution: 2,
        })
        .setOrigin(0.5);
      cardElements.push(placeholder, questionMark);
    }

    // 카드 이름
    const nameText = this.add
      .text(x, y + 10, config.name, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "30px",
        color: isMaxed ? "#4CAF50" : "#5D4E37",
        fontStyle: "bold",
        align: "center",
        resolution: 2,
      })
      .setOrigin(0.5);
    cardElements.push(nameText);

    // 현재레벨 > 다음레벨
    let levelText: string;
    if (isMaxed) {
      levelText = "MAX";
    } else if (currentLevel === 0) {
      levelText = "LV.0 > LV.1";
    } else {
      levelText = `LV.${currentLevel} > LV.${currentLevel + 1}`;
    }
    const levelDisplay = this.add
      .text(x, y + 50, levelText, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: isMaxed ? "#4CAF50" : "#8B7355",
        resolution: 2,
      })
      .setOrigin(0.5);
    cardElements.push(levelDisplay);

    // 설명
    const descText = this.add
      .text(x, y + 85, config.description, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#7D6E57",
        align: "center",
        wordWrap: { width: this.CARD_WIDTH - 20 },
        resolution: 2,
      })
      .setOrigin(0.5);
    cardElements.push(descText);

    // 구매 버튼
    const btnY = y + 145;
    const btnWidth = this.CARD_WIDTH - 20;
    const btnHeight = 55;

    let btnColor = 0xd4a574;
    let btnTextColor = "#5D4E37";

    if (isMaxed) {
      btnColor = 0x4caf50;
      btnTextColor = "#FFFFFF";
    } else if (!canBuy) {
      btnColor = 0xcccccc;
      btnTextColor = "#999999";
    }

    const buyBtn = this.add
      .rectangle(x, btnY, btnWidth, btnHeight, btnColor)
      .setStrokeStyle(2, isMaxed ? 0x388e3c : canBuy ? 0x6b3e26 : 0x999999);
    cardElements.push(buyBtn);

    if (isMaxed) {
      const maxText = this.add
        .text(x, btnY, "MAX", {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "30px",
          color: btnTextColor,
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0.5);
      cardElements.push(maxText);
    } else {
      const starIcon = this.add
        .image(x - 30, btnY, "icon_star")
        .setDisplaySize(34, 34);
      const costText = this.add
        .text(x + 5, btnY, `${nextCost}`, {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "32px",
          color: btnTextColor,
          fontStyle: "bold",
          resolution: 2,
        })
        .setOrigin(0, 0.5);
      cardElements.push(starIcon, costText);
    }

    // 컨테이너에 추가
    this.scrollContainer.add(cardElements);

    // 인터랙션 (MAX가 아닐 때만)
    if (!isMaxed) {
      buyBtn.setInteractive({ useHandCursor: canBuy });

      buyBtn.on("pointerup", () => {
        // 드래그 중이었으면 무시 (클릭만 처리)
        if (this.dragDistance >= DRAG_THRESHOLD) return;

        if (this.progressManager.canPurchaseUpgrade(type)) {
          this.progressManager.purchaseUpgrade(type);
          this.scene.restart();
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

  private setupScrolling(): void {
    const scrollTop = this.SCROLL_AREA_TOP;
    // 전역 포인터 이벤트로 스크롤 처리
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragStartY = pointer.y;
      this.dragStartScrollY = this.scrollY;
      this.dragDistance = 0;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;

      const dy = pointer.y - this.dragStartY;
      this.dragDistance = Math.abs(dy);

      // 스크롤 영역 내에서만 스크롤
      if (
        pointer.y >= scrollTop &&
        pointer.y <= scrollTop + this.SCROLL_AREA_HEIGHT
      ) {
        this.scrollY = Phaser.Math.Clamp(
          this.dragStartScrollY - dy,
          this.minScrollY,
          this.maxScrollY,
        );
        this.scrollContainer.y = scrollTop - this.scrollY;
      }
    });

    // 마우스 휠 스크롤
    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: any,
        _deltaX: number,
        deltaY: number,
      ) => {
        this.scrollY = Phaser.Math.Clamp(
          this.scrollY + deltaY * 0.5,
          this.minScrollY,
          this.maxScrollY,
        );
        this.scrollContainer.y = scrollTop - this.scrollY;
      },
    );
  }

  private createBackButton(): void {
    const btnY = this.cameras.main.height - 50;

    // 푸터 배경
    this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height - this.FOOTER_HEIGHT / 2,
        this.cameras.main.width,
        this.FOOTER_HEIGHT,
        0xfff8e7,
      )
      .setDepth(100);

    const backBtn = this.add
      .image(this.cameras.main.width / 2, btnY, "button")
      .setDisplaySize(300, 100)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);

    // 홈 아이콘
    const homeIcon = this.add
      .image(this.cameras.main.width / 2 - 50, btnY, "home_100")
      .setDisplaySize(60, 60)
      .setDepth(102);

    // 텍스트
    this.add
      .text(this.cameras.main.width / 2 + 10, btnY, "홈으로", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#5D4E37",
        fontStyle: "bold",
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(102);

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

  private showMessage(text: string): void {
    const msg = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, text, {
        fontFamily: "UhBeePuding",
        fontSize: "28px",
        color: "#E85A4F",
        backgroundColor: "#FFFFFF",
        padding: { x: 20, y: 10 },
        resolution: 2,
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.tweens.add({
      targets: msg,
      y: msg.y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => msg.destroy(),
    });
  }
}
