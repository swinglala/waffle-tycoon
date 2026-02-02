import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
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
  private dayContainer!: Phaser.GameObjects.Container;
  private loginBtn!: Phaser.GameObjects.Rectangle;
  private loginBtnText!: Phaser.GameObjects.Text;
  private authUnsubscribe?: () => void;
  private isSyncing = false;

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
    this.authManager = AuthManager.getInstance();
    this.cloudSaveManager = CloudSaveManager.getInstance();

    // BGM 재생 (기존 BGM 정지 후)
    this.sound.stopAll();
    const soundManager = SoundManager.getInstance();
    soundManager.playBgm(this, 'bgm_home', { volume: 0.5 });

    this.loadProgress();
    this.createBackground();
    this.createTitle();
    this.createHeartsUI();
    this.createStartButton();
    this.createSideButtons();

    // 인증 상태 변경 리스너 등록
    this.authUnsubscribe = this.authManager.onAuthStateChange(async (user) => {
      this.updateUserUI();
      if (user && !this.isSyncing) {
        await this.syncWithCloud();
      }
    });

    // 클라우드 동기화 콜백 설정
    this.setupCloudSyncCallbacks();

    // 첫 실행 시 튜토리얼 안내 팝업
    this.checkFirstTimeTutorial();
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
    // 배경 이미지 (비율 유지, 가운데 맞춤, crop)
    const bg = this.add.image(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "home_background",
    );

    // cover 방식: 비율 유지하면서 화면을 꽉 채움 (넘치는 부분은 잘림)
    const scaleX = GAME_WIDTH / bg.width;
    const scaleY = GAME_HEIGHT / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
  }

  private createTitle(): void {
    // 로고 이미지
    const logo = this.add.image(GAME_WIDTH / 2, 230, "logo");
    logo.setOrigin(0.5);
    // 필요시 크기 조절 (원본 비율 유지)
    const maxWidth = 400;
    if (logo.width > maxWidth) {
      const scale = maxWidth / logo.width;
      logo.setScale(scale);
    }

    // 로고 아래 N일차 표시 (이미지로)
    this.dayContainer = this.add.container(GAME_WIDTH / 2, 400);
    this.updateDayDisplay();
  }

  // 숫자를 이미지로 표시하는 헬퍼 메서드
  private createNumberImages(num: number, height: number): Phaser.GameObjects.Image[] {
    const digits = num.toString().split('');
    const images: Phaser.GameObjects.Image[] = [];
    
    for (const digit of digits) {
      const img = this.add.image(0, 0, `number_${digit}`);
      // 높이 기준으로 비율 유지하며 크기 조절
      const scale = height / img.height;
      img.setScale(scale);
      images.push(img);
    }
    
    return images;
  }

  // 일차 표시 업데이트
  private updateDayDisplay(): void {
    // 기존 컨테이너 내용 삭제
    this.dayContainer.removeAll(true);
    
    const digitHeight = 100; // 숫자 이미지 높이
    const dayTextHeight = 80; // "일차" 이미지 높이
    const gap = 10; // 숫자와 "일차" 사이 간격
    
    // 숫자 이미지들 생성
    const numberImages = this.createNumberImages(this.currentDay, digitHeight);
    
    // "일차" 이미지 생성
    const dayTextImg = this.add.image(0, 0, 'day_text');
    const dayTextScale = dayTextHeight / dayTextImg.height;
    dayTextImg.setScale(dayTextScale);
    
    // 전체 너비 계산
    let totalWidth = 0;
    for (const img of numberImages) {
      totalWidth += img.displayWidth;
    }
    totalWidth += gap + dayTextImg.displayWidth;
    
    // 이미지들 배치 (가운데 정렬)
    let currentX = -totalWidth / 2;
    
    for (const img of numberImages) {
      img.setX(currentX + img.displayWidth / 2);
      img.setY(0);
      this.dayContainer.add(img);
      currentX += img.displayWidth;
    }
    
    // "일차" 이미지 배치
    currentX += gap;
    dayTextImg.setX(currentX + dayTextImg.displayWidth / 2);
    dayTextImg.setY(0);
    this.dayContainer.add(dayTextImg);
  }

  private createHeartsUI(): void {
    const heartsY = 50;
    const leftX = 20;
    const lineGap = 28;

    // 왼쪽: 유저 정보 영역 (세로 배치: 유저정보 → 로그인버튼 → 별)
    // 1. 유저 정보 (1번째 줄) - 프로필 아이콘 + 텍스트
    const profileSize = 24;
    this.profileIcon = this.add.image(leftX + 12, heartsY - 15, "icon_profile");
    const profileScale = profileSize / Math.max(this.profileIcon.width, this.profileIcon.height);
    this.profileIcon.setScale(profileScale);

    this.userText = this.add
      .text(leftX + 28, heartsY - 15, "", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "22px",
        color: "#2C2C2C",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 2. 로그인/로그아웃 버튼 (2번째 줄)
    this.loginBtn = this.add
      .rectangle(leftX + 45, heartsY - 15 + lineGap, 80, 28, 0x4285f4)
      .setStrokeStyle(2, 0x3367d6)
      .setInteractive({ useHandCursor: true });

    this.loginBtnText = this.add
      .text(leftX + 45, heartsY - 15 + lineGap, "로그인", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "14px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.loginBtn.on("pointerdown", () => {
      this.handleLoginLogout();
    });

    this.loginBtn.on("pointerover", () => {
      this.loginBtn.setFillStyle(0x3367d6);
    });
    this.loginBtn.on("pointerout", () => {
      const isLoggedIn = this.authManager.isLoggedIn();
      this.loginBtn.setFillStyle(isLoggedIn ? 0xe74c3c : 0x4285f4);
    });

    // 3. 별 표시 (3번째 줄)
    this.add
      .image(leftX + 10, heartsY - 15 + lineGap * 2, "icon_star")
      .setDisplaySize(22, 22);

    this.starsText = this.add
      .text(leftX + 25, heartsY - 15 + lineGap * 2, "", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "18px",
        color: "#D4A017",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 하트 아이콘 5개 + 플러스 버튼 (중앙)
    const heartSize = 42;
    const heartGap = 10;
    const plusSize = 36;
    const plusGap = 12;
    const totalHeartsWidth = HEART_CONFIG.MAX_HEARTS * heartSize + (HEART_CONFIG.MAX_HEARTS - 1) * heartGap;
    const totalWidth = totalHeartsWidth + plusGap + plusSize;
    const heartsStartX = GAME_WIDTH / 2 - totalWidth / 2 + heartSize / 2;

    // 하트 + 플러스 + 타이머 배경 (베이지색, 라운드)
    const heartsBgPadding = 15;
    const heartsBgWidth = totalWidth + heartsBgPadding * 2;
    const heartsBgHeight = 62; // 하트 + 타이머 텍스트 포함 + y패딩
    const heartsBg = this.add.graphics();
    heartsBg.fillStyle(0xF5E6D3, 1);
    heartsBg.fillRoundedRect(
      GAME_WIDTH / 2 - heartsBgWidth / 2,
      heartsY - 24,
      heartsBgWidth,
      heartsBgHeight,
      20
    );

    this.heartImages = [];
    for (let i = 0; i < HEART_CONFIG.MAX_HEARTS; i++) {
      const heartImg = this.add
        .image(heartsStartX + i * (heartSize + heartGap), heartsY - 5, "icon_heart")
        .setDisplaySize(heartSize, heartSize);
      this.heartImages.push(heartImg);
    }

    // 플러스 버튼 (하트 5개 오른쪽) - 비율 유지
    const plusX = heartsStartX + totalHeartsWidth + plusGap;
    this.plusButton = this.add
      .image(plusX, heartsY - 5, "icon_plus")
      .setInteractive({ useHandCursor: true });
    // 비율 유지하면서 크기 조절
    const plusScale = plusSize / Math.max(this.plusButton.width, this.plusButton.height);
    this.plusButton.setScale(plusScale);

    this.plusButton.on("pointerdown", () => {
      this.showTestPopup();
    });

    this.plusButton.on("pointerover", () => {
      if (this.heartManager.getHearts() < HEART_CONFIG.MAX_HEARTS) {
        this.plusButton.setTint(0xcccccc);
      }
    });
    this.plusButton.on("pointerout", () => {
      if (this.heartManager.getHearts() < HEART_CONFIG.MAX_HEARTS) {
        this.plusButton.clearTint();
      }
    });

    // 충전 타이머
    this.timerText = this.add
      .text(GAME_WIDTH / 2, heartsY + 28, "", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "18px",
        color: "#8B7355",
      })
      .setOrigin(0.5);

    // 오른쪽: 설정 버튼
    const settingsBtnX = GAME_WIDTH - 45;
    const settingsIcon = this.add
      .image(settingsBtnX, heartsY, "icon_setting")
      .setDisplaySize(60, 60)
      .setInteractive({ useHandCursor: true });

    settingsIcon.on("pointerdown", () => {
      this.scene.start("SettingsScene");
    });

    settingsIcon.on("pointerover", () => {
      settingsIcon.setTint(0xcccccc);
    });
    settingsIcon.on("pointerout", () => {
      settingsIcon.clearTint();
    });

    this.updateHeartsUI();
    this.updateUserUI();
  }

  private updateHeartsUI(): void {
    const hearts = this.heartManager.getHearts();
    const maxHearts = HEART_CONFIG.MAX_HEARTS;

    // 별 표시 (아이콘은 createHeartsUI에서 생성됨)
    const totalStars = this.progressManager.getTotalStars();
    this.starsText.setText(`${totalStars}`);

    // 하트 표시 (채워진 하트는 원본, 빈 하트는 회색)
    for (let i = 0; i < this.heartImages.length; i++) {
      if (i < hearts) {
        this.heartImages[i].clearTint();
        this.heartImages[i].setAlpha(1);
      } else {
        this.heartImages[i].setTint(0x555555);
        this.heartImages[i].setAlpha(0.4);
      }
    }

    // 플러스 버튼 항상 활성화 (테스트 팝업 접근용)
    this.plusButton.clearTint();
    this.plusButton.setAlpha(1);
    this.plusButton.setInteractive({ useHandCursor: true });

    // 타이머 표시
    if (hearts < maxHearts) {
      const timeStr = this.heartManager.formatTimeToNextHeart();
      this.timerText.setText(`다음 하트: ${timeStr}`);
    } else {
      this.timerText.setText("하트 충전 완료!");
    }
  }

  private createStartButton(): void {
    const buttonY = GAME_HEIGHT * 0.78; // bottom 25% 영역

    // 버튼 이미지
    const buttonImg = this.add.image(GAME_WIDTH / 2, buttonY, "btn_start");
    buttonImg.setInteractive({ useHandCursor: true });

    // 클릭 이벤트
    buttonImg.on("pointerdown", () => {
      if (this.heartManager.hasHeart()) {
        this.scene.start("GameScene", { day: this.currentDay });
      } else {
        this.showNoHeartsPopup();
      }
    });

    // 호버 효과
    buttonImg.on("pointerover", () => {
      buttonImg.setTint(0xdddddd);
    });
    buttonImg.on("pointerout", () => {
      buttonImg.clearTint();
    });
  }

  private updateStartButton(): void {
    this.updateDayDisplay();
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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
    const sideButtonX = 665;
    const targetSize = 90; // 원하는 최대 크기
    const buttonGap = 110;

    // 비율 유지하면서 크기 조절하는 헬퍼
    const scaleToFit = (img: Phaser.GameObjects.Image, maxSize: number) => {
      const scale = maxSize / Math.max(img.width, img.height);
      img.setScale(scale);
    };

    // 1. 랭킹 버튼 (가장 위)
    const rankingY = 150;
    const rankingIcon = this.add
      .image(sideButtonX, rankingY, "icon_rank")
      .setInteractive({ useHandCursor: true });
    scaleToFit(rankingIcon, targetSize);

    rankingIcon.on("pointerdown", () => {
      this.showPlaceholderPopup("랭킹");
    });

    rankingIcon.on("pointerover", () => {
      rankingIcon.setTint(0xdddddd);
    });
    rankingIcon.on("pointerout", () => {
      rankingIcon.clearTint();
    });

    // 2. 샵 버튼 (두번째)
    const shopY = rankingY + buttonGap;
    const shopIcon = this.add
      .image(sideButtonX, shopY, "icon_shop")
      .setInteractive({ useHandCursor: true });
    scaleToFit(shopIcon, targetSize);

    shopIcon.on("pointerdown", () => {
      this.scene.start("ShopScene");
    });

    shopIcon.on("pointerover", () => {
      shopIcon.setTint(0xdddddd);
    });
    shopIcon.on("pointerout", () => {
      shopIcon.clearTint();
    });

    // 3. Day 트리 버튼 (세번째)
    const dayTreeY = shopY + buttonGap;
    const dayTreeIcon = this.add
      .image(sideButtonX, dayTreeY, "icon_calendar")
      .setInteractive({ useHandCursor: true });
    scaleToFit(dayTreeIcon, targetSize);

    dayTreeIcon.on("pointerdown", () => {
      this.scene.start("DayTreeScene");
    });

    dayTreeIcon.on("pointerover", () => {
      dayTreeIcon.setTint(0xdddddd);
    });
    dayTreeIcon.on("pointerout", () => {
      dayTreeIcon.clearTint();
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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
        fontFamily: "UhBeePuding", padding: { y: 5 },
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

  private showTestPopup(): void {
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

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
    popupObjects.push(overlay);

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      400,
      350,
      0xfff8e7,
    );
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    // 팝업 타이틀
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 130,
      "🛠️ 테스트 메뉴",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    popupTitle.setOrigin(0.5);
    popupObjects.push(popupTitle);

    // 닫기 함수
    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
      this.updateHeartsUI();
      this.updateStartButton();
    };

    // 버튼 생성 헬퍼
    const createTestBtn = (
      x: number,
      y: number,
      label: string,
      color: number,
      onClick: () => void
    ) => {
      const btn = this.add.rectangle(x, y, 160, 50, color);
      btn.setStrokeStyle(2, 0x5D4E37);
      btn.setInteractive({ useHandCursor: true });
      popupObjects.push(btn);

      const btnText = this.add.text(x, y, label, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
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

    const btnY1 = GAME_HEIGHT / 2 - 60;
    const btnY2 = GAME_HEIGHT / 2 + 10;
    const leftX = GAME_WIDTH / 2 - 90;
    const rightX = GAME_WIDTH / 2 + 90;

    // 1. 하트 +1 버튼
    createTestBtn(leftX, btnY1, "❤️ 하트 +1", 0xE85A4F, () => {
      this.heartManager.addHeart();
      this.updateHeartsUI();
    });

    // 2. 별 +10 버튼
    createTestBtn(rightX, btnY1, "⭐ 별 +10", 0xFFD700, () => {
      this.progressManager.addStars(10);
      this.updateHeartsUI();
    });

    // 3. Day +1 버튼
    createTestBtn(leftX, btnY2, "📅 Day +1", 0x4CAF50, () => {
      this.progressManager.advanceToNextDay();
      this.currentDay = this.progressManager.getCurrentDay();
      this.updateStartButton();
    });

    // 4. 초기화 버튼
    createTestBtn(rightX, btnY2, "🔄 초기화", 0x9E9E9E, () => {
      this.progressManager.resetProgress();
      this.heartManager.resetHearts();
      this.currentDay = 1;
      this.updateHeartsUI();
      this.updateStartButton();
    });

    // 닫기 버튼
    const closeBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 120,
      120,
      45,
      0xd4a574,
    );
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(closeBtn);

    const closeBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 120,
      "닫기",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      },
    );
    closeBtnText.setOrigin(0.5);
    popupObjects.push(closeBtnText);

    closeBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    closeBtn.on("pointerover", () => closeBtn.setFillStyle(0xc49a6c));
    closeBtn.on("pointerout", () => closeBtn.setFillStyle(0xd4a574));
  }

  // ========================================
  // 인증 및 클라우드 동기화 관련 메서드
  // ========================================

  private updateUserUI(): void {
    const isLoggedIn = this.authManager.isLoggedIn();
    const displayName = this.authManager.getDisplayName();

    // 유저 이름 표시 (아이콘은 별도 이미지로 표시)
    this.userText.setText(displayName);

    // 로그인/로그아웃 버튼 업데이트
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

  private async handleLoginLogout(): Promise<void> {
    const isLoggedIn = this.authManager.isLoggedIn();

    if (isLoggedIn) {
      // 로그아웃 확인 팝업
      this.showLogoutConfirmPopup();
    } else {
      // Google 로그인
      const { error } = await this.authManager.signInWithGoogle();
      if (error) {
        this.showErrorPopup("로그인 실패", error.message);
      }
    }
  }

  private showLogoutConfirmPopup(): void {
    // 반투명 오버레이
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5
    );
    overlay.setInteractive();

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      400,
      200,
      0xfff8e7
    );
    popup.setStrokeStyle(4, 0x8b6914);

    // 팝업 타이틀
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      "로그아웃",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    popupTitle.setOrigin(0.5);

    // 메시지
    const message = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      "정말 로그아웃 하시겠습니까?",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
      }
    );
    message.setOrigin(0.5);

    // 확인 버튼
    const confirmBtn = this.add.rectangle(
      GAME_WIDTH / 2 - 70,
      GAME_HEIGHT / 2 + 60,
      100,
      40,
      0xe74c3c
    );
    confirmBtn.setStrokeStyle(2, 0xc0392b);
    confirmBtn.setInteractive({ useHandCursor: true });

    const confirmBtnText = this.add.text(
      GAME_WIDTH / 2 - 70,
      GAME_HEIGHT / 2 + 60,
      "로그아웃",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "16px",
        color: "#FFFFFF",
        fontStyle: "bold",
      }
    );
    confirmBtnText.setOrigin(0.5);

    // 취소 버튼
    const cancelBtn = this.add.rectangle(
      GAME_WIDTH / 2 + 70,
      GAME_HEIGHT / 2 + 60,
      100,
      40,
      0xd4a574
    );
    cancelBtn.setStrokeStyle(2, 0x8b6914);
    cancelBtn.setInteractive({ useHandCursor: true });

    const cancelBtnText = this.add.text(
      GAME_WIDTH / 2 + 70,
      GAME_HEIGHT / 2 + 60,
      "취소",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "16px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    cancelBtnText.setOrigin(0.5);

    // 닫기 함수
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

    // 로그아웃 실행
    confirmBtn.on("pointerdown", async () => {
      closePopup();
      await this.authManager.signOut();
      this.updateUserUI();
    });

    cancelBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    // 호버 효과
    confirmBtn.on("pointerover", () => confirmBtn.setFillStyle(0xc0392b));
    confirmBtn.on("pointerout", () => confirmBtn.setFillStyle(0xe74c3c));
    cancelBtn.on("pointerover", () => cancelBtn.setFillStyle(0xc49a6c));
    cancelBtn.on("pointerout", () => cancelBtn.setFillStyle(0xd4a574));
  }

  private showErrorPopup(title: string, message: string): void {
    // 반투명 오버레이
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.5
    );
    overlay.setInteractive();

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      400,
      200,
      0xfff8e7
    );
    popup.setStrokeStyle(4, 0x8b6914);

    // 팝업 타이틀
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      `❌ ${title}`,
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "24px",
        color: "#E85A4F",
        fontStyle: "bold",
      }
    );
    popupTitle.setOrigin(0.5);

    // 메시지
    const messageText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      message,
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "16px",
        color: "#5D4E37",
        align: "center",
        wordWrap: { width: 350 },
      }
    );
    messageText.setOrigin(0.5);

    // 닫기 버튼
    const closeBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      100,
      40,
      0xd4a574
    );
    closeBtn.setStrokeStyle(2, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      "확인",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "16px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
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
      // 현재 로컬 데이터 수집
      const localData: LocalSaveData = {
        progress: this.progressManager.getState(),
        hearts: this.heartManager.getState(),
      };

      // 클라우드와 동기화
      const { mergedData, source, error } =
        await this.cloudSaveManager.syncWithLocal(localData);

      if (error) {
        console.error("[HomeScene] 클라우드 동기화 실패:", error.message);
        return;
      }

      // 클라우드 데이터가 더 최신인 경우 로컬 업데이트
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
    // 클라우드 동기화 콜백 (디바운스)
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
      }, 2000); // 2초 디바운스
    };

    this.progressManager.setCloudSyncCallback(debouncedSync);
    this.heartManager.setCloudSyncCallback(debouncedSync);
  }

  shutdown(): void {
    // 씬 종료 시 리스너 해제
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
    this.progressManager.setCloudSyncCallback(null);
    this.heartManager.setCloudSyncCallback(null);
  }

  private checkFirstTimeTutorial(): void {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_CONFIG.STORAGE_KEY);

    // 튜토리얼을 한 번도 안 했으면 안내 팝업 표시
    if (!tutorialCompleted) {
      this.showTutorialPromptPopup();
    }
  }

  private showTutorialPromptPopup(): void {
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    // 반투명 오버레이
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.6
    );
    overlay.setInteractive();
    popupObjects.push(overlay);

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      450,
      320,
      0xfff8e7
    );
    popup.setStrokeStyle(4, 0x8b6914);
    popupObjects.push(popup);

    // 타이틀
    const title = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 110,
      "환영합니다!",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    title.setOrigin(0.5);
    popupObjects.push(title);

    // 메시지
    const message = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 30,
      "처음이시네요!\n튜토리얼을 통해\n와플 굽는 법을 배워볼까요?",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "22px",
        color: "#5D4E37",
        align: "center",
      }
    );
    message.setOrigin(0.5);
    popupObjects.push(message);

    // 튜토리얼 시작 버튼
    const tutorialBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      280,
      55,
      0x4caf50
    );
    tutorialBtn.setStrokeStyle(3, 0x388e3c);
    tutorialBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(tutorialBtn);

    const tutorialBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 60,
      "튜토리얼 시작",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "22px",
        color: "#FFFFFF",
        fontStyle: "bold",
      }
    );
    tutorialBtnText.setOrigin(0.5);
    popupObjects.push(tutorialBtnText);

    // 건너뛰기 버튼
    const skipBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 125,
      280,
      45,
      0xcccccc
    );
    skipBtn.setStrokeStyle(2, 0x999999);
    skipBtn.setInteractive({ useHandCursor: true });
    popupObjects.push(skipBtn);

    const skipBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 125,
      "건너뛰고 바로 시작",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "18px",
        color: "#5D4E37",
      }
    );
    skipBtnText.setOrigin(0.5);
    popupObjects.push(skipBtnText);

    // 팝업 닫기 함수
    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    // 튜토리얼 시작 클릭
    tutorialBtn.on("pointerdown", () => {
      closePopup();
      this.scene.start("TutorialScene");
    });

    // 건너뛰기 클릭
    skipBtn.on("pointerdown", () => {
      closePopup();
      // 튜토리얼 완료로 표시
      localStorage.setItem(TUTORIAL_CONFIG.STORAGE_KEY, "true");
    });

    // 호버 효과
    tutorialBtn.on("pointerover", () => tutorialBtn.setFillStyle(0x388e3c));
    tutorialBtn.on("pointerout", () => tutorialBtn.setFillStyle(0x4caf50));
    skipBtn.on("pointerover", () => skipBtn.setFillStyle(0xbbbbbb));
    skipBtn.on("pointerout", () => skipBtn.setFillStyle(0xcccccc));
  }
}
