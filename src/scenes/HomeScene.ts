import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { HeartManager } from "../utils/HeartManager";
import { ProgressManager } from "../utils/ProgressManager";
import { AuthManager } from "../utils/AuthManager";
import { CloudSaveManager, LocalSaveData } from "../utils/CloudSaveManager";
import { HEART_CONFIG } from "../types/game";

export class HomeScene extends Phaser.Scene {
  private currentDay = 1;
  private heartManager!: HeartManager;
  private progressManager!: ProgressManager;
  private authManager!: AuthManager;
  private cloudSaveManager!: CloudSaveManager;
  private heartsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private starsText!: Phaser.GameObjects.Text;
  private userText!: Phaser.GameObjects.Text;
  private loginBtn!: Phaser.GameObjects.Rectangle;
  private loginBtnText!: Phaser.GameObjects.Text;
  private startBtnText!: Phaser.GameObjects.Text;
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

    // 왼쪽: 유저 정보 영역 (로그인 버튼 또는 유저 이름)
    this.userText = this.add
      .text(30, heartsY - 15, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 로그인/로그아웃 버튼 (유저 정보 옆)
    this.loginBtn = this.add
      .rectangle(125, heartsY - 15, 70, 24, 0x4285f4)
      .setStrokeStyle(2, 0x3367d6)
      .setInteractive({ useHandCursor: true });

    this.loginBtnText = this.add
      .text(125, heartsY - 15, "로그인", {
        fontFamily: "Arial",
        fontSize: "12px",
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
    this.updateUserUI();
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
    this.startBtnText = this.add.text(
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
    this.startBtnText.setOrigin(0.5);

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

  private updateStartButton(): void {
    this.startBtnText.setText(`${this.currentDay}일차 시작하기`);
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

  // ========================================
  // 인증 및 클라우드 동기화 관련 메서드
  // ========================================

  private updateUserUI(): void {
    const isLoggedIn = this.authManager.isLoggedIn();
    const displayName = this.authManager.getDisplayName();

    // 유저 이름 표시
    this.userText.setText(`👤 ${displayName}`);

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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
}
