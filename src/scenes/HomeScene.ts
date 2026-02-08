import Phaser from "phaser";
import { TEST_ACCOUNTS } from "../config/constants";
import { HeartManager } from "../utils/HeartManager";
import { ProgressManager } from "../utils/ProgressManager";
import { AuthManager } from "../utils/AuthManager";
import { CloudSaveManager, LocalSaveData } from "../utils/CloudSaveManager";
import { SoundManager } from "../utils/SoundManager";
import { HEART_CONFIG, TUTORIAL_CONFIG } from "../types/game";

export class HomeScene extends Phaser.Scene {
  private currentDay = 1;
  private heartManager!: HeartManager;
  private progressManager!: ProgressManager;
  private authManager!: AuthManager;
  private cloudSaveManager!: CloudSaveManager;
  private heartImages: Phaser.GameObjects.Image[] = [];
  private plusButton!: Phaser.GameObjects.Image;
  private timerText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;
  private userText!: Phaser.GameObjects.Text;
  private profileIcon!: Phaser.GameObjects.Image;
  private profileBg!: Phaser.GameObjects.Graphics;
  private dayContainer!: Phaser.GameObjects.Container;
  private loginBtn!: Phaser.GameObjects.Rectangle;
  private loginBtnText!: Phaser.GameObjects.Text;
  private authUnsubscribe?: () => void;
  private isSyncing = false;

  constructor() {
    super({ key: "HomeScene" });
  }

  preload(): void {
    this.load.image("home_background", "assets/images/home_background.png");
  }

  create(): void {
    this.heartManager = HeartManager.getInstance();
    this.progressManager = ProgressManager.getInstance();
    this.authManager = AuthManager.getInstance();
    this.cloudSaveManager = CloudSaveManager.getInstance();

    // BGM 재생
    this.sound.stopAll();
    const soundManager = SoundManager.getInstance();
    soundManager.playBgm(this, "bgm_home", { volume: 0.5 });

    this.loadProgress();
    this.createBackground();
    this.createTopUI();
    this.createLogo();
    this.createSideButtons();
    this.createDayAndStartButton();

    // 인증 상태 변경 리스너 등록
    this.authUnsubscribe = this.authManager.onAuthStateChange(async (user) => {
      this.updateUserUI();
      if (user && !this.isSyncing) {
        await this.syncWithCloud();
      }
    });

    this.setupCloudSyncCallbacks();
    this.checkFirstTimeTutorial();
  }

  update(): void {
    this.updateHeartsUI();
  }

  private loadProgress(): void {
    this.currentDay = this.progressManager.getCurrentDay();
  }

  private createBackground(): void {
    const { width: sw, height: sh } = this.cameras.main;

    const bg = this.add.image(sw / 2, sh / 2, "home_background");
    const scaleX = sw / bg.width;
    const scaleY = sh / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
  }

  private createTopUI(): void {
    const { width: sw } = this.cameras.main;
    const topY = 50;

    // ========== 왼쪽: 프로필 영역 ==========
    const leftX = 45;

    // 프로필 원형 배경 (초록색)
    this.profileBg = this.add.graphics();
    this.profileBg.fillStyle(0x7fbf7f, 1);
    this.profileBg.fillCircle(leftX, topY, 28);
    this.profileBg.lineStyle(3, 0x5a9f5a);
    this.profileBg.strokeCircle(leftX, topY, 28);

    // 프로필 아이콘
    this.profileIcon = this.add.image(leftX, topY, "icon_profile");
    const profileScale = 32 / Math.max(this.profileIcon.width, this.profileIcon.height);
    this.profileIcon.setScale(profileScale);
    this.profileIcon.setTint(0xffffff);

    // 유저 이름 (프로필 아래)
    this.userText = this.add
      .text(leftX, topY + 40, "", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "16px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 로그인/로그아웃 버튼 (유저 이름 아래)
    this.loginBtn = this.add
      .rectangle(leftX, topY + 70, 70, 24, 0x4285f4)
      .setStrokeStyle(2, 0x3367d6)
      .setInteractive({ useHandCursor: true });

    this.loginBtnText = this.add
      .text(leftX, topY + 70, "로그인", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "12px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.loginBtn.on("pointerdown", () => this.handleLoginLogout());
    this.loginBtn.on("pointerover", () => this.loginBtn.setFillStyle(0x3367d6));
    this.loginBtn.on("pointerout", () => {
      const isLoggedIn = this.authManager.isLoggedIn();
      this.loginBtn.setFillStyle(isLoggedIn ? 0xe74c3c : 0x4285f4);
    });

    // 별 표시 (로그인 버튼 아래)
    this.add.image(leftX - 15, topY + 100, "icon_star").setDisplaySize(20, 20);
    this.starsText = this.add
      .text(leftX + 5, topY + 100, "", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "16px",
        color: "#D4A017",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // ========== 중앙: 하트 UI ==========
    const centerX = sw / 2;
    const heartSize = 38;
    const heartGap = 8;
    const plusSize = 32;
    const plusGap = 10;
    const totalHeartsWidth =
      HEART_CONFIG.MAX_HEARTS * heartSize + (HEART_CONFIG.MAX_HEARTS - 1) * heartGap;
    const totalWidth = totalHeartsWidth + plusGap + plusSize;
    const heartsStartX = centerX - totalWidth / 2 + heartSize / 2;

    // 하트 배경 (베이지 라운드)
    const heartsBgPadding = 12;
    const heartsBgWidth = totalWidth + heartsBgPadding * 2;
    const heartsBgHeight = 58;
    const heartsBg = this.add.graphics();
    heartsBg.fillStyle(0xf5e6d3, 0.95);
    heartsBg.fillRoundedRect(
      centerX - heartsBgWidth / 2,
      topY - 22,
      heartsBgWidth,
      heartsBgHeight,
      18
    );

    // 하트 아이콘들
    this.heartImages = [];
    for (let i = 0; i < HEART_CONFIG.MAX_HEARTS; i++) {
      const heartImg = this.add
        .image(heartsStartX + i * (heartSize + heartGap), topY, "icon_heart")
        .setDisplaySize(heartSize, heartSize);
      this.heartImages.push(heartImg);
    }

    // 플러스 버튼
    const plusX = heartsStartX + totalHeartsWidth + plusGap;
    this.plusButton = this.add
      .image(plusX, topY, "icon_plus")
      .setInteractive({ useHandCursor: true });
    const plusScale = plusSize / Math.max(this.plusButton.width, this.plusButton.height);
    this.plusButton.setScale(plusScale);

    this.plusButton.on("pointerdown", () => {
      const userEmail = this.authManager.getUser()?.email ?? "";
      const isTestAccount = TEST_ACCOUNTS.includes(userEmail);
      if (isTestAccount) {
        this.showTestPopup();
      } else {
        this.showHeartPurchasePopup();
      }
    });
    this.plusButton.on("pointerover", () => this.plusButton.setTint(0xcccccc));
    this.plusButton.on("pointerout", () => this.plusButton.clearTint());

    // 충전 타이머
    this.timerText = this.add
      .text(centerX, topY + 24, "", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "14px",
        color: "#8B7355",
      })
      .setOrigin(0.5);

    // ========== 오른쪽: 설정 버튼 ==========
    const settingsBtnX = sw - 45;
    const settingsIcon = this.add
      .image(settingsBtnX, topY, "icon_setting")
      .setDisplaySize(50, 50)
      .setInteractive({ useHandCursor: true });

    settingsIcon.on("pointerdown", () => this.scene.start("SettingsScene"));
    settingsIcon.on("pointerover", () => settingsIcon.setTint(0xcccccc));
    settingsIcon.on("pointerout", () => settingsIcon.clearTint());

    this.updateHeartsUI();
    this.updateUserUI();
  }

  private createLogo(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const logoY = sh * 0.18;

    const logo = this.add.image(sw / 2, logoY, "logo");
    logo.setOrigin(0.5);
    const maxWidth = 350;
    if (logo.width > maxWidth) {
      const scale = maxWidth / logo.width;
      logo.setScale(scale);
    }
  }

  private createSideButtons(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const sideButtonX = sw - 50;
    const targetSize = 70;
    const buttonGap = 90;
    const startY = sh * 0.22;

    const scaleToFit = (img: Phaser.GameObjects.Image, maxSize: number) => {
      const scale = maxSize / Math.max(img.width, img.height);
      img.setScale(scale);
    };

    // 1. 랭킹 버튼
    const rankingY = startY;
    const rankingIcon = this.add
      .image(sideButtonX, rankingY, "icon_rank")
      .setInteractive({ useHandCursor: true });
    scaleToFit(rankingIcon, targetSize);

    rankingIcon.on("pointerdown", () => this.showPlaceholderPopup("랭킹"));
    rankingIcon.on("pointerover", () => rankingIcon.setTint(0xdddddd));
    rankingIcon.on("pointerout", () => rankingIcon.clearTint());

    // 2. 샵 버튼
    const shopY = rankingY + buttonGap;
    const shopIcon = this.add
      .image(sideButtonX, shopY, "icon_shop")
      .setInteractive({ useHandCursor: true });
    scaleToFit(shopIcon, targetSize);

    shopIcon.on("pointerdown", () => this.scene.start("ShopScene"));
    shopIcon.on("pointerover", () => shopIcon.setTint(0xdddddd));
    shopIcon.on("pointerout", () => shopIcon.clearTint());

    // 3. Day 트리 버튼
    const dayTreeY = shopY + buttonGap;
    const dayTreeIcon = this.add
      .image(sideButtonX, dayTreeY, "icon_calendar")
      .setInteractive({ useHandCursor: true });
    scaleToFit(dayTreeIcon, targetSize);

    dayTreeIcon.on("pointerdown", () => this.scene.start("DayTreeScene"));
    dayTreeIcon.on("pointerover", () => dayTreeIcon.setTint(0xdddddd));
    dayTreeIcon.on("pointerout", () => dayTreeIcon.clearTint());
  }

  private createDayAndStartButton(): void {
    const { width: sw, height: sh } = this.cameras.main;

    // 일차 표시 (화면 하단 65% 위치)
    const dayY = sh * 0.65;
    this.dayContainer = this.add.container(sw / 2, dayY);
    this.updateDayDisplay();

    // START 버튼 (화면 하단 78% 위치)
    const buttonY = sh * 0.78;
    const buttonImg = this.add.image(sw / 2, buttonY, "btn_start");
    buttonImg.setInteractive({ useHandCursor: true });

    buttonImg.on("pointerdown", () => {
      if (this.heartManager.hasHeart()) {
        this.scene.start("GameScene", { day: this.currentDay });
      } else {
        this.showNoHeartsPopup();
      }
    });
    buttonImg.on("pointerover", () => buttonImg.setTint(0xdddddd));
    buttonImg.on("pointerout", () => buttonImg.clearTint());
  }

  private createNumberImages(num: number, height: number): Phaser.GameObjects.Image[] {
    const digits = num.toString().split("");
    const images: Phaser.GameObjects.Image[] = [];

    for (const digit of digits) {
      const img = this.add.image(0, 0, `number_${digit}`);
      const scale = height / img.height;
      img.setScale(scale);
      images.push(img);
    }

    return images;
  }

  private updateDayDisplay(): void {
    this.dayContainer.removeAll(true);

    const digitHeight = 100;
    const dayTextHeight = 120;
    const gap = -30;
    const digitGap = -45;

    const numberImages = this.createNumberImages(this.currentDay, digitHeight);
    const dayTextImg = this.add.image(0, 0, "day_text");
    const dayTextScale = dayTextHeight / dayTextImg.height;
    dayTextImg.setScale(dayTextScale);

    let totalWidth = 0;
    for (let i = 0; i < numberImages.length; i++) {
      totalWidth += numberImages[i].displayWidth;
      if (i < numberImages.length - 1) {
        totalWidth += digitGap;
      }
    }
    totalWidth += gap + dayTextImg.displayWidth;

    let currentX = -totalWidth / 2;

    for (let i = 0; i < numberImages.length; i++) {
      const img = numberImages[i];
      img.setX(currentX + img.displayWidth / 2);
      img.setY(0);
      this.dayContainer.add(img);
      currentX += img.displayWidth;
      if (i < numberImages.length - 1) {
        currentX += digitGap;
      }
    }

    currentX += gap;
    dayTextImg.setX(currentX + dayTextImg.displayWidth / 2);
    dayTextImg.setY(0);
    this.dayContainer.add(dayTextImg);
  }

  private updateHeartsUI(): void {
    const hearts = this.heartManager.getHearts();
    const maxHearts = HEART_CONFIG.MAX_HEARTS;

    const totalStars = this.progressManager.getTotalStars();
    this.starsText.setText(`${totalStars}`);

    for (let i = 0; i < this.heartImages.length; i++) {
      if (i < hearts) {
        this.heartImages[i].clearTint();
        this.heartImages[i].setAlpha(1);
      } else {
        this.heartImages[i].setTint(0x555555);
        this.heartImages[i].setAlpha(0.4);
      }
    }

    const userEmail = this.authManager.getUser()?.email ?? "";
    const isTestAccount = TEST_ACCOUNTS.includes(userEmail);
    const shouldShowPlus = isTestAccount || hearts < maxHearts;

    this.plusButton.setVisible(shouldShowPlus);
    if (shouldShowPlus) {
      this.plusButton.clearTint();
      this.plusButton.setAlpha(1);
      this.plusButton.setInteractive({ useHandCursor: true });
    } else {
      this.plusButton.disableInteractive();
    }

    if (hearts < maxHearts) {
      const timeStr = this.heartManager.formatTimeToNextHeart();
      this.timerText.setText(`다음 하트: ${timeStr}`);
    } else {
      this.timerText.setText("하트 충전 완료!");
    }
  }

  private updateUserUI(): void {
    const isLoggedIn = this.authManager.isLoggedIn();
    const displayName = this.authManager.getDisplayName();

    this.userText.setText(displayName);

    if (isLoggedIn) {
      this.loginBtnText.setText("로그아웃");
      this.loginBtn.setFillStyle(0xe74c3c);
      (this.loginBtn as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0xc0392b);
    } else {
      this.loginBtnText.setText("로그인");
      this.loginBtn.setFillStyle(0x4285f4);
      (this.loginBtn as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0x3367d6);
    }
  }

  private updateStartButton(): void {
    this.updateDayDisplay();
  }

  // ========================================
  // 팝업들
  // ========================================

  private showNoHeartsPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();

    const popup = this.add.rectangle(sw / 2, sh / 2, 400, 220, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);

    const popupTitle = this.add.text(sw / 2, sh / 2 - 60, "하트 부족", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "32px",
      color: "#E85A4F",
      fontStyle: "bold",
    });
    popupTitle.setOrigin(0.5);

    const timeStr = this.heartManager.formatTimeToNextHeart();
    const message = this.add.text(
      sw / 2,
      sh / 2,
      `하트가 없어요!\n다음 하트까지: ${timeStr}`,
      {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "22px",
        color: "#5D4E37",
        align: "center",
      }
    );
    message.setOrigin(0.5);

    const closeBtn = this.add.rectangle(sw / 2, sh / 2 + 70, 120, 45, 0xd4a574);
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(sw / 2, sh / 2 + 70, "확인", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "20px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    closeBtnText.setOrigin(0.5);

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

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  private showPlaceholderPopup(title: string): void {
    const { width: sw, height: sh } = this.cameras.main;

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();

    const popupWidth = 400;
    const popupHeight = 200;
    const popup = this.add.rectangle(sw / 2, sh / 2, popupWidth, popupHeight, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);

    const popupTitle = this.add.text(sw / 2, sh / 2 - 50, title, {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "32px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    popupTitle.setOrigin(0.5);

    const message = this.add.text(sw / 2, sh / 2, "준비 중입니다!", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "24px",
      color: "#5D4E37",
    });
    message.setOrigin(0.5);

    const closeBtn = this.add.rectangle(sw / 2, sh / 2 + 60, 120, 45, 0xd4a574);
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(sw / 2, sh / 2 + 60, "닫기", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "20px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    closeBtnText.setOrigin(0.5);

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

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  private showHeartPurchasePopup(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.6);
    overlay.setInteractive();
    popupObjects.push(overlay);

    const popup = this.add.rectangle(sw / 2, sh / 2, 320, 180, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    const title = this.add.text(sw / 2, sh / 2 - 60, "하트 구매", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "28px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);
    popupObjects.push(title);

    const currentStars = this.progressManager.getTotalStars();
    const currentHearts = this.heartManager.getHearts();
    const maxHearts = HEART_CONFIG.MAX_HEARTS;
    const canBuy = currentStars >= 1 && currentHearts < maxHearts;
    const buyBtnColor = canBuy ? 0x4caf50 : 0x9e9e9e;

    const btnY = sh / 2;
    const buyBtn = this.add.rectangle(sw / 2, btnY, 260, 50, buyBtnColor);
    buyBtn.setStrokeStyle(3, canBuy ? 0x388e3c : 0x757575);
    if (canBuy) {
      buyBtn.setInteractive({ useHandCursor: true });
    }
    popupObjects.push(buyBtn);

    const iconSize = 26;
    const btnLeft = sw / 2 - 100;
    const btnRight = sw / 2 + 110;

    const heartIcon = this.add.image(btnLeft, btnY, "icon_heart").setDisplaySize(iconSize, iconSize);
    popupObjects.push(heartIcon);

    const buyText = this.add
      .text(btnLeft + 18, btnY, "1 구매하기", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "20px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    popupObjects.push(buyText);

    const costText = this.add
      .text(btnRight, btnY, "1", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "20px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);
    popupObjects.push(costText);

    const starIcon = this.add.image(btnRight - 25, btnY, "icon_star").setDisplaySize(iconSize, iconSize);
    popupObjects.push(starIcon);

    const closeBtn = this.add.rectangle(sw / 2, sh / 2 + 55, 120, 45, 0xd4a574);
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(closeBtn);

    const closeBtnText = this.add.text(sw / 2, sh / 2 + 55, "닫기", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "20px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    closeBtnText.setOrigin(0.5);
    popupObjects.push(closeBtnText);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    if (canBuy) {
      buyBtn.on("pointerdown", () => {
        this.progressManager.useStars(1);
        this.heartManager.addHeart();
        this.updateHeartsUI();
        closePopup();
        this.showHeartPurchasePopup();
      });

      buyBtn.on("pointerover", () => buyBtn.setFillStyle(0x388e3c));
      buyBtn.on("pointerout", () => buyBtn.setFillStyle(0x4caf50));
    }

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  private showTestPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();
    popupObjects.push(overlay);

    const popup = this.add.rectangle(sw / 2, sh / 2, 400, 420, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    const popupTitle = this.add.text(sw / 2, sh / 2 - 130, "테스트 메뉴", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "28px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    popupTitle.setOrigin(0.5);
    popupObjects.push(popupTitle);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
      this.updateHeartsUI();
      this.updateStartButton();
    };

    const createTestBtn = (
      x: number,
      y: number,
      label: string,
      color: number,
      onClick: () => void
    ) => {
      const btn = this.add.rectangle(x, y, 160, 50, color);
      btn.setStrokeStyle(2, 0x5d4e37);
      btn.setInteractive({ useHandCursor: true });
      popupObjects.push(btn);

      const btnText = this.add.text(x, y, label, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "18px",
        color: "#FFFFFF",
        fontStyle: "bold",
      });
      btnText.setOrigin(0.5);
      popupObjects.push(btnText);

      btn.on("pointerdown", onClick);
      btn.on("pointerover", () => btn.setAlpha(0.8));
      btn.on("pointerout", () => btn.setAlpha(1));
    };

    const btnY1 = sh / 2 - 60;
    const btnY2 = sh / 2 + 10;
    const leftX = sw / 2 - 90;
    const rightX = sw / 2 + 90;

    createTestBtn(leftX, btnY1, "하트 +1", 0xe85a4f, () => {
      this.heartManager.addHeart();
      this.updateHeartsUI();
    });

    createTestBtn(rightX, btnY1, "별 +10", 0xffd700, () => {
      this.progressManager.addStars(10);
      this.updateHeartsUI();
    });

    createTestBtn(leftX, btnY2, "Day +1", 0x4caf50, () => {
      this.progressManager.advanceToNextDay();
      this.currentDay = this.progressManager.getCurrentDay();
      this.updateStartButton();
    });

    createTestBtn(rightX, btnY2, "초기화", 0x9e9e9e, () => {
      this.progressManager.resetProgress();
      this.heartManager.resetHearts();
      this.currentDay = 1;
      this.updateHeartsUI();
      this.updateStartButton();
    });

    const btnY3 = sh / 2 + 80;
    createTestBtn(sw / 2, btnY3, "UI 테스트", 0x9c27b0, () => {
      closePopup();
      this.scene.start("TestScene");
    });

    const closeBtn = this.add.rectangle(sw / 2, sh / 2 + 150, 120, 45, 0xd4a574);
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(closeBtn);

    const closeBtnText = this.add.text(sw / 2, sh / 2 + 150, "닫기", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "20px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    closeBtnText.setOrigin(0.5);
    popupObjects.push(closeBtnText);

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  // ========================================
  // 인증 및 클라우드 동기화
  // ========================================

  private async handleLoginLogout(): Promise<void> {
    const isLoggedIn = this.authManager.isLoggedIn();

    if (isLoggedIn) {
      this.showLogoutConfirmPopup();
    } else {
      const { error } = await this.authManager.signInWithGoogle();
      if (error) {
        this.showErrorPopup("로그인 실패", error.message);
      }
    }
  }

  private showLogoutConfirmPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();

    const popup = this.add.rectangle(sw / 2, sh / 2, 400, 200, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);

    const popupTitle = this.add.text(sw / 2, sh / 2 - 50, "로그아웃", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "28px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    popupTitle.setOrigin(0.5);

    const message = this.add.text(sw / 2, sh / 2, "정말 로그아웃 하시겠습니까?", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "20px",
      color: "#5D4E37",
    });
    message.setOrigin(0.5);

    const confirmBtn = this.add.rectangle(sw / 2 - 70, sh / 2 + 60, 100, 40, 0xe74c3c);
    confirmBtn.setStrokeStyle(2, 0xc0392b);
    confirmBtn.setInteractive({ useHandCursor: true });

    const confirmBtnText = this.add.text(sw / 2 - 70, sh / 2 + 60, "로그아웃", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "16px",
      color: "#FFFFFF",
      fontStyle: "bold",
    });
    confirmBtnText.setOrigin(0.5);

    const cancelBtn = this.add.rectangle(sw / 2 + 70, sh / 2 + 60, 100, 40, 0xd4a574);
    cancelBtn.setStrokeStyle(2, 0x8b6914);
    cancelBtn.setInteractive({ useHandCursor: true });

    const cancelBtnText = this.add.text(sw / 2 + 70, sh / 2 + 60, "취소", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "16px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    cancelBtnText.setOrigin(0.5);

    const closePopup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      message.destroy();
      confirmBtn.destroy();
      confirmBtnText.destroy();
      cancelBtn.destroy();
      cancelBtnText.destroy();
    };

    confirmBtn.on("pointerdown", async () => {
      closePopup();
      await this.authManager.signOut();
      this.progressManager.resetProgress();
      this.heartManager.resetHearts();
      localStorage.removeItem("waffle_hasLoggedIn");
      localStorage.removeItem("waffle_isGuest");
      this.scene.start("LoginScene");
    });

    cancelBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    confirmBtn.on("pointerover", () => confirmBtn.setFillStyle(0xc0392b));
    confirmBtn.on("pointerout", () => confirmBtn.setFillStyle(0xe74c3c));
    cancelBtn.on("pointerover", () => cancelBtn.setFillStyle(0xc49a6c));
    cancelBtn.on("pointerout", () => cancelBtn.setFillStyle(0xd4a574));
  }

  private showErrorPopup(title: string, message: string): void {
    const { width: sw, height: sh } = this.cameras.main;

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.5);
    overlay.setInteractive();

    const popup = this.add.rectangle(sw / 2, sh / 2, 400, 200, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);

    const popupTitle = this.add.text(sw / 2, sh / 2 - 50, `${title}`, {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "24px",
      color: "#E85A4F",
      fontStyle: "bold",
    });
    popupTitle.setOrigin(0.5);

    const messageText = this.add.text(sw / 2, sh / 2, message, {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "16px",
      color: "#5D4E37",
      align: "center",
      wordWrap: { width: 350 },
    });
    messageText.setOrigin(0.5);

    const closeBtn = this.add.rectangle(sw / 2, sh / 2 + 60, 100, 40, 0xd4a574);
    closeBtn.setStrokeStyle(2, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(sw / 2, sh / 2 + 60, "확인", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "16px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    closeBtnText.setOrigin(0.5);

    const closePopup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      messageText.destroy();
      closeBtn.destroy();
      closeBtnText.destroy();
    };

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  private async syncWithCloud(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;

    try {
      const localData: LocalSaveData = {
        progress: this.progressManager.getState(),
        hearts: this.heartManager.getState(),
      };

      const { mergedData, source, error } =
        await this.cloudSaveManager.syncWithLocal(localData);

      if (error) {
        console.error("[HomeScene] 클라우드 동기화 실패:", error.message);
        return;
      }

      if (source === "cloud" || source === "merged") {
        this.progressManager.loadFromExternalData(mergedData.progress);
        this.heartManager.loadFromExternalData(mergedData.hearts);
        this.currentDay = mergedData.progress.currentDay;
        this.updateHeartsUI();
        this.updateStartButton();
        console.log("[HomeScene] 클라우드 데이터로 업데이트됨");
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private setupCloudSyncCallbacks(): void {
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    const debouncedSync = () => {
      if (!this.cloudSaveManager.canSaveToCloud()) return;

      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }

      syncTimeout = setTimeout(async () => {
        const localData: LocalSaveData = {
          progress: this.progressManager.getState(),
          hearts: this.heartManager.getState(),
        };
        await this.cloudSaveManager.saveToCloud(localData);
      }, 2000);
    };

    this.progressManager.setCloudSyncCallback(debouncedSync);
    this.heartManager.setCloudSyncCallback(debouncedSync);
  }

  shutdown(): void {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    this.progressManager.setCloudSyncCallback(null);
    this.heartManager.setCloudSyncCallback(null);
  }

  private checkFirstTimeTutorial(): void {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_CONFIG.STORAGE_KEY);

    if (!tutorialCompleted) {
      this.showTutorialPromptPopup();
    }
  }

  private showTutorialPromptPopup(): void {
    const { width: sw, height: sh } = this.cameras.main;
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.6);
    overlay.setInteractive();
    popupObjects.push(overlay);

    const popup = this.add.rectangle(sw / 2, sh / 2, 450, 320, 0xfff8e7);
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    const title = this.add.text(sw / 2, sh / 2 - 110, "환영합니다!", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "32px",
      color: "#5D4E37",
      fontStyle: "bold",
    });
    title.setOrigin(0.5);
    popupObjects.push(title);

    const message = this.add.text(
      sw / 2,
      sh / 2 - 30,
      "처음이시네요!\n튜토리얼을 통해\n와플 굽는 법을 배워볼까요?",
      {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "22px",
        color: "#5D4E37",
        align: "center",
      }
    );
    message.setOrigin(0.5);
    popupObjects.push(message);

    const tutorialBtn = this.add.rectangle(sw / 2, sh / 2 + 60, 280, 55, 0x4caf50);
    tutorialBtn.setStrokeStyle(3, 0x388e3c);
    tutorialBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(tutorialBtn);

    const tutorialBtnText = this.add.text(sw / 2, sh / 2 + 60, "튜토리얼 시작", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "22px",
      color: "#FFFFFF",
      fontStyle: "bold",
    });
    tutorialBtnText.setOrigin(0.5);
    popupObjects.push(tutorialBtnText);

    const skipBtn = this.add.rectangle(sw / 2, sh / 2 + 125, 280, 45, 0xcccccc);
    skipBtn.setStrokeStyle(2, 0x999999);
    skipBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(skipBtn);

    const skipBtnText = this.add.text(sw / 2, sh / 2 + 125, "건너뛰고 바로 시작", {
      fontFamily: "UhBeePuding",
      padding: { y: 5 },
      fontSize: "18px",
      color: "#5D4E37",
    });
    skipBtnText.setOrigin(0.5);
    popupObjects.push(skipBtnText);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    tutorialBtn.on("pointerdown", () => {
      closePopup();
      this.scene.start("TutorialScene");
    });

    skipBtn.on("pointerdown", () => {
      closePopup();
      localStorage.setItem(TUTORIAL_CONFIG.STORAGE_KEY, "true");
    });

    tutorialBtn.on("pointerover", () => tutorialBtn.setFillStyle(0x388e3c));
    tutorialBtn.on("pointerout", () => tutorialBtn.setFillStyle(0x4caf50));
    skipBtn.on("pointerover", () => skipBtn.setFillStyle(0xbbbbbb));
    skipBtn.on("pointerout", () => skipBtn.setFillStyle(0xcccccc));
  }
}
