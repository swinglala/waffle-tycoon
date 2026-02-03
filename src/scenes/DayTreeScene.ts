import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { ProgressManager } from "../utils/ProgressManager";
import { HeartManager } from "../utils/HeartManager";
import { getDayTarget, TUTORIAL_CONFIG } from "../types/game";

// 그리드 레이아웃 상수
const GRID_COLS = 3;
const CELL_WIDTH = 200;
const CELL_HEIGHT = 160;
const CELL_GAP_X = 20;
const CELL_GAP_Y = 20;
const START_Y = 100; // 컨테이너 내부 시작 Y (상대 좌표)

// 스크롤 영역 상수
const SCROLL_AREA_TOP = 170; // 헤더 + 안내문구 아래
const SCROLL_AREA_BOTTOM = GAME_HEIGHT - 140; // 뒤로가기 버튼 위

// 드래그 vs 클릭 구분 임계값 (픽셀)
const DRAG_THRESHOLD = 10;

export class DayTreeScene extends Phaser.Scene {
  private progressManager!: ProgressManager;
  private heartManager!: HeartManager;
  private scrollContainer!: Phaser.GameObjects.Container;
  private maxScrollY = 0;
  private dragDistance = 0; // 드래그 거리 추적

  constructor() {
    super({ key: "DayTreeScene" });
  }

  create(): void {
    this.progressManager = ProgressManager.getInstance();
    this.heartManager = HeartManager.getInstance();

    this.createBackground();
    this.createHeader();
    this.createDayGrid();
    this.createBackButton();
    this.setupScrolling();
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
      .text(GAME_WIDTH / 2, 35, "데이트리", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 총 별 표시 (아이콘 + 텍스트)
    const totalStars = this.progressManager.getTotalStars();
    const starIconX = GAME_WIDTH / 2 - 30;
    this.add
      .image(starIconX, 65, "icon_star")
      .setDisplaySize(24, 24);
    this.add
      .text(starIconX + 20, 65, `${totalStars}`, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "22px",
        color: "#FFD700",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    // 안내 문구
    this.add
      .text(
        GAME_WIDTH / 2,
        130,
        "재도전으로 더 많은 별을 모아보세요!\n재도전 시, 하트 1개 소모",
        {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "16px",
          color: "#7D6E57",
          align: "center",
        }
      )
      .setOrigin(0.5);
  }

  private createDayGrid(): void {
    const currentDay = this.progressManager.getCurrentDay();

    // 스크롤 가능한 컨테이너 생성 (스크롤 영역 상단에 위치)
    this.scrollContainer = this.add.container(0, SCROLL_AREA_TOP);

    // 마스크 생성 (스크롤 영역만 보이게)
    const scrollAreaHeight = SCROLL_AREA_BOTTOM - SCROLL_AREA_TOP;
    const maskGraphics = this.make.graphics({ x: 0, y: 0 });
    maskGraphics.fillStyle(0xffffff);
    maskGraphics.fillRect(0, SCROLL_AREA_TOP, GAME_WIDTH, scrollAreaHeight);
    const mask = maskGraphics.createGeometryMask();
    this.scrollContainer.setMask(mask);

    // 그리드 시작 X 좌표 (중앙 정렬)
    const totalWidth = GRID_COLS * CELL_WIDTH + (GRID_COLS - 1) * CELL_GAP_X;
    const startX = (GAME_WIDTH - totalWidth) / 2 + CELL_WIDTH / 2;

    // Day 0 (튜토리얼) - 첫 번째 행에 단독 표시
    const tutorialX = GAME_WIDTH / 2;
    const tutorialY = START_Y;
    this.createTutorialCell(tutorialX, tutorialY);

    // Day 1부터 표시 (튜토리얼 아래에)
    const dayStartY = START_Y + CELL_HEIGHT + CELL_GAP_Y;
    const maxDisplayDay = currentDay;
    const totalRows = Math.ceil(maxDisplayDay / GRID_COLS) + 1; // +1 for tutorial row

    for (let day = 1; day <= maxDisplayDay; day++) {
      const row = Math.floor((day - 1) / GRID_COLS);
      const col = (day - 1) % GRID_COLS;

      const x = startX + col * (CELL_WIDTH + CELL_GAP_X);
      const y = dayStartY + row * (CELL_HEIGHT + CELL_GAP_Y);

      this.createDayCell(day, x, y, currentDay);
    }

    // 스크롤 범위 계산
    const contentHeight = totalRows * (CELL_HEIGHT + CELL_GAP_Y) + START_Y;
    this.maxScrollY = Math.max(0, contentHeight - scrollAreaHeight);
  }

  private createTutorialCell(x: number, y: number): void {
    const tutorialCompleted = localStorage.getItem(TUTORIAL_CONFIG.STORAGE_KEY) === "true";

    // 셀 배경 색상
    const bgColor = tutorialCompleted ? 0xe8f5e9 : 0xfff3e0; // 완료: 연한 녹색, 미완료: 연한 주황
    const strokeColor = tutorialCompleted ? 0x4caf50 : 0xff9800;

    // 셀 배경
    const cellBg = this.add
      .rectangle(x, y, CELL_WIDTH - 10, CELL_HEIGHT - 10, bgColor)
      .setStrokeStyle(3, strokeColor);
    this.scrollContainer.add(cellBg);

    // Day 0 텍스트
    const dayText = this.add
      .text(x, y - 30, "튜토리얼", {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.scrollContainer.add(dayText);

    // 상태 표시
    if (tutorialCompleted) {
      const statusText = this.add
        .text(x, y + 10, "완료", {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "20px",
          color: "#4CAF50",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(statusText);

      const replayText = this.add
        .text(x, y + 40, "다시 보기", {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "16px",
          color: "#7D6E57",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(replayText);
    } else {
      const statusText = this.add
        .text(x, y + 10, "시작하기", {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "20px",
          color: "#FF9800",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(statusText);
    }

    // 클릭 이벤트
    cellBg.setInteractive({ useHandCursor: true });

    cellBg.on("pointerover", () => {
      cellBg.setFillStyle(this.darkenColor(bgColor, 0.1));
    });

    cellBg.on("pointerout", () => {
      cellBg.setFillStyle(bgColor);
    });

    cellBg.on("pointerup", () => {
      if (this.dragDistance < DRAG_THRESHOLD) {
        this.scene.start("TutorialScene");
      }
    });
  }

  private createDayCell(
    day: number,
    x: number,
    y: number,
    currentDay: number
  ): void {
    const state = this.getDayState(day, currentDay);
    const stars = this.progressManager.getDayStars(day);

    // 셀 배경 색상 (완료 또는 진행중만 표시)
    let bgColor = 0xffffff;
    let strokeColor = 0x8b6914;

    if (state === "completed") {
      bgColor = stars === 3 ? 0xfff9c4 : 0xffffff; // 3별이면 황금색 배경
      strokeColor = stars === 3 ? 0xffd700 : 0x4caf50; // 3별이면 금색, 아니면 녹색
    } else {
      // current
      bgColor = 0xe3f2fd; // 연한 파란색
      strokeColor = 0x2196f3;
    }

    // 셀 배경
    const cellBg = this.add
      .rectangle(x, y, CELL_WIDTH - 10, CELL_HEIGHT - 10, bgColor)
      .setStrokeStyle(3, strokeColor);
    this.scrollContainer.add(cellBg);

    // Day 텍스트 (위쪽)
    const dayText = this.add
      .text(x, y - 50, `- ${day}일차 -`, {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.scrollContainer.add(dayText);

    // 상태별 표시
    if (state === "completed") {
      // 별 표시 (중앙)
      const starSize = 45;
      const starGap = 5;
      const totalStarWidth = 3 * starSize + 2 * starGap;
      const starStartX = x - totalStarWidth / 2 + starSize / 2;
      const starY = y - 10;

      for (let i = 0; i < 3; i++) {
        const starImg = this.add
          .image(starStartX + i * (starSize + starGap), starY, "icon_star")
          .setDisplaySize(starSize, starSize);

        if (i >= stars) {
          starImg.setTint(0x555555);
          starImg.setAlpha(0.4);
        }

        this.scrollContainer.add(starImg);
      }

      // 금액 표시 (아래쪽)
      const money = this.progressManager.getDayMoney(day);
      const target = getDayTarget(day);
      const moneyColor = money >= target ? "#4CAF50" : "#E85A4F";

      // 벌은 돈
      const moneyText = this.add
        .text(x, y + 25, `${money.toLocaleString()}원`, {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "22px",
          color: moneyColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(moneyText);

      // 목표 금액
      const targetText = this.add
        .text(x, y + 50, `/ ${target.toLocaleString()}원`, {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "14px",
          color: "#7D6E57",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(targetText);
    } else if (state === "current") {
      // 목표 금액 표시
      const target = getDayTarget(day);
      const targetText = this.add
        .text(x, y - 5, `목표금액: ${target.toLocaleString()}원`, {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "25px",
          color: "#2196f3",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(targetText);

      // "진행중" 표시
      const currentText = this.add
        .text(x, y + 25, "진행중", {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "22px",
          color: "#2196f3",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(currentText);
    }

    // 클릭 이벤트 (완료/진행중 모두 클릭 가능)
    cellBg.setInteractive({ useHandCursor: true });

    cellBg.on("pointerover", () => {
      cellBg.setFillStyle(this.darkenColor(bgColor, 0.1));
    });

    cellBg.on("pointerout", () => {
      cellBg.setFillStyle(bgColor);
    });

    // pointerup에서 드래그 거리 체크 후 클릭 처리
    cellBg.on("pointerup", () => {
      if (this.dragDistance < DRAG_THRESHOLD) {
        this.onDayClick(day);
      }
    });
  }

  private getDayState(
    day: number,
    currentDay: number
  ): "completed" | "current" {
    if (day < currentDay) return "completed";
    return "current";
  }

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private onDayClick(day: number): void {
    if (!this.heartManager.hasHeart()) {
      this.showNoHeartsPopup();
      return;
    }

    // 확인 팝업 표시
    this.showConfirmPopup(day);
  }

  private showConfirmPopup(day: number): void {
    const currentDay = this.progressManager.getCurrentDay();
    const isRetry = day < currentDay;
    const stars = this.progressManager.getDayStars(day);
    const target = getDayTarget(day);

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
    overlay.setDepth(100);

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      420,
      280,
      0xfff8e7
    );
    popup.setStrokeStyle(4, 0x8b6914);
    popup.setDepth(101);

    // 팝업 타이틀
    const title = isRetry ? `${day}일차 재도전` : `${day}일차 시작`;
    const popupTitle = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 90,
      title,
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    popupTitle.setOrigin(0.5);
    popupTitle.setDepth(102);

    // 정보 표시
    const info = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 40,
      `목표: ₩${target.toLocaleString()}`,
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        align: "center",
      }
    );
    info.setOrigin(0.5);
    info.setDepth(102);

    // 재도전인 경우 현재 기록 별 표시
    const popupStarImages: Phaser.GameObjects.Image[] = [];
    if (isRetry) {
      const recordLabel = this.add.text(
        GAME_WIDTH / 2 - 60,
        GAME_HEIGHT / 2 - 5,
        "현재 기록:",
        {
          fontFamily: "UhBeePuding", padding: { y: 5 },
          fontSize: "18px",
          color: "#5D4E37",
        }
      );
      recordLabel.setOrigin(0, 0.5);
      recordLabel.setDepth(102);
      popupStarImages.push(recordLabel as unknown as Phaser.GameObjects.Image);

      const starSize = 22;
      const starGap = 3;
      const starStartX = GAME_WIDTH / 2 + 15;
      for (let i = 0; i < 3; i++) {
        const starImg = this.add
          .image(starStartX + i * (starSize + starGap), GAME_HEIGHT / 2 - 5, "icon_star")
          .setDisplaySize(starSize, starSize)
          .setDepth(102);
        if (i >= stars) {
          starImg.setTint(0x555555);
          starImg.setAlpha(0.4);
        }
        popupStarImages.push(starImg);
      }
    }

    // 하트 비용 안내
    const heartInfo = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 20,
      "❤️ 하트 1개 소모",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "16px",
        color: "#E85A4F",
      }
    );
    heartInfo.setOrigin(0.5);
    heartInfo.setDepth(102);

    // 시작 버튼
    const startBtn = this.add.rectangle(
      GAME_WIDTH / 2 - 80,
      GAME_HEIGHT / 2 + 80,
      130,
      50,
      0x4caf50
    );
    startBtn.setStrokeStyle(3, 0x388e3c);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.setDepth(102);

    const startBtnText = this.add.text(
      GAME_WIDTH / 2 - 80,
      GAME_HEIGHT / 2 + 80,
      isRetry ? "재도전" : "시작",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#FFFFFF",
        fontStyle: "bold",
      }
    );
    startBtnText.setOrigin(0.5);
    startBtnText.setDepth(102);

    // 취소 버튼
    const cancelBtn = this.add.rectangle(
      GAME_WIDTH / 2 + 80,
      GAME_HEIGHT / 2 + 80,
      130,
      50,
      0xd4a574
    );
    cancelBtn.setStrokeStyle(3, 0x8b6914);
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.setDepth(102);

    const cancelBtnText = this.add.text(
      GAME_WIDTH / 2 + 80,
      GAME_HEIGHT / 2 + 80,
      "취소",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    cancelBtnText.setOrigin(0.5);
    cancelBtnText.setDepth(102);

    // 팝업 닫기
    const closePopup = () => {
      overlay.destroy();
      popup.destroy();
      popupTitle.destroy();
      info.destroy();
      heartInfo.destroy();
      startBtn.destroy();
      startBtnText.destroy();
      cancelBtn.destroy();
      cancelBtnText.destroy();
      // 별 이미지들 제거
      popupStarImages.forEach((img) => img.destroy());
    };

    // 이벤트
    startBtn.on("pointerdown", () => {
      closePopup();
      // DayTreeScene에서 시작할 때 항상 하트 차감
      this.heartManager.useHeart();
      this.scene.start("GameScene", { day, skipHeart: true });
    });

    cancelBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);

    // 호버 효과
    startBtn.on("pointerover", () => startBtn.setFillStyle(0x388e3c));
    startBtn.on("pointerout", () => startBtn.setFillStyle(0x4caf50));
    cancelBtn.on("pointerover", () => cancelBtn.setFillStyle(0xc49a6c));
    cancelBtn.on("pointerout", () => cancelBtn.setFillStyle(0xd4a574));
  }

  private showNoHeartsPopup(): void {
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
    overlay.setDepth(100);

    // 팝업 배경
    const popup = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      400,
      220,
      0xfff8e7
    );
    popup.setStrokeStyle(4, 0x8b6914);
    popup.setDepth(101);

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
      }
    );
    popupTitle.setOrigin(0.5);
    popupTitle.setDepth(102);

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
      }
    );
    message.setOrigin(0.5);
    message.setDepth(102);

    // 닫기 버튼
    const closeBtn = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 70,
      120,
      45,
      0xd4a574
    );
    closeBtn.setStrokeStyle(3, 0x8b6914);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.setDepth(102);

    const closeBtnText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 70,
      "확인",
      {
        fontFamily: "UhBeePuding", padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      }
    );
    closeBtnText.setOrigin(0.5);
    closeBtnText.setDepth(102);

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

  private createBackButton(): void {
    const btnY = GAME_HEIGHT - 80;

    const backBtn = this.add
      .image(GAME_WIDTH / 2, btnY, "button")
      .setDisplaySize(300, 100)
      .setInteractive({ useHandCursor: true });

    // 홈 아이콘
    const homeIcon = this.add
      .image(GAME_WIDTH / 2 - 50, btnY, "home_100")
      .setDisplaySize(60, 60);

    // 텍스트
    this.add
      .text(GAME_WIDTH / 2 + 10, btnY, "홈으로", {
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

  private setupScrolling(): void {
    // 터치/드래그 스크롤 설정
    let isDragging = false;
    let dragStartY = 0;
    let dragStartX = 0;
    let containerStartY = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 드래그 거리 초기화
      this.dragDistance = 0;
      dragStartX = pointer.x;
      dragStartY = pointer.y;

      // 스크롤 영역 내에서만 드래그 시작
      if (pointer.y > SCROLL_AREA_TOP && pointer.y < SCROLL_AREA_BOTTOM) {
        isDragging = true;
        containerStartY = this.scrollContainer.y;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // 드래그 거리 계산 (X, Y 모두 고려)
      const dx = pointer.x - dragStartX;
      const dy = pointer.y - dragStartY;
      this.dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (isDragging && this.maxScrollY > 0) {
        const deltaY = pointer.y - dragStartY;
        let newY = containerStartY + deltaY;

        // 스크롤 범위 제한 (SCROLL_AREA_TOP 기준)
        newY = Math.max(SCROLL_AREA_TOP - this.maxScrollY, Math.min(SCROLL_AREA_TOP, newY));
        this.scrollContainer.y = newY;
      }
    });

    this.input.on("pointerup", () => {
      isDragging = false;
    });

    // 마우스 휠 스크롤
    this.input.on(
      "wheel",
      (
        pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        // 스크롤 영역 내에서만 휠 스크롤
        if (pointer.y > SCROLL_AREA_TOP && pointer.y < SCROLL_AREA_BOTTOM) {
          let newY = this.scrollContainer.y - deltaY * 0.5;
          newY = Math.max(SCROLL_AREA_TOP - this.maxScrollY, Math.min(SCROLL_AREA_TOP, newY));
          this.scrollContainer.y = newY;
        }
      }
    );
  }
}
