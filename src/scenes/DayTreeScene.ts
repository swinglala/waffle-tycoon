import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import { ProgressManager } from "../utils/ProgressManager";
import { HeartManager } from "../utils/HeartManager";
import { getDayTarget } from "../types/game";

// 그리드 레이아웃 상수
const GRID_COLS = 3;
const CELL_WIDTH = 200;
const CELL_HEIGHT = 160;
const CELL_GAP_X = 20;
const CELL_GAP_Y = 20;
const START_Y = 150;

export class DayTreeScene extends Phaser.Scene {
  private progressManager!: ProgressManager;
  private heartManager!: HeartManager;
  private scrollContainer!: Phaser.GameObjects.Container;
  private maxScrollY = 0;

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
      .text(GAME_WIDTH / 2, 35, "Day 트리", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 총 별 표시
    const totalStars = this.progressManager.getTotalStars();
    this.add
      .text(GAME_WIDTH / 2, 65, `⭐ ${totalStars}`, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#FFD700",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private createDayGrid(): void {
    const currentDay = this.progressManager.getCurrentDay();

    // 스크롤 가능한 컨테이너 생성
    this.scrollContainer = this.add.container(0, 0);

    // 표시할 최대 Day 수 (현재 Day + 잠긴 Day 몇 개)
    const maxDisplayDay = Math.min(currentDay + 6, 99);
    const totalRows = Math.ceil(maxDisplayDay / GRID_COLS);

    // 그리드 시작 X 좌표 (중앙 정렬)
    const totalWidth = GRID_COLS * CELL_WIDTH + (GRID_COLS - 1) * CELL_GAP_X;
    const startX = (GAME_WIDTH - totalWidth) / 2 + CELL_WIDTH / 2;

    for (let day = 1; day <= maxDisplayDay; day++) {
      const row = Math.floor((day - 1) / GRID_COLS);
      const col = (day - 1) % GRID_COLS;

      const x = startX + col * (CELL_WIDTH + CELL_GAP_X);
      const y = START_Y + row * (CELL_HEIGHT + CELL_GAP_Y);

      this.createDayCell(day, x, y, currentDay);
    }

    // 스크롤 범위 계산
    const contentHeight = totalRows * (CELL_HEIGHT + CELL_GAP_Y) + START_Y + 100;
    const viewableHeight = GAME_HEIGHT - 180; // 헤더와 버튼 영역 제외
    this.maxScrollY = Math.max(0, contentHeight - viewableHeight);
  }

  private createDayCell(
    day: number,
    x: number,
    y: number,
    currentDay: number
  ): void {
    const state = this.getDayState(day, currentDay);
    const stars = this.progressManager.getDayStars(day);

    // 셀 배경 색상
    let bgColor = 0xffffff;
    let strokeColor = 0x8b6914;
    let isInteractive = false;

    switch (state) {
      case "completed":
        bgColor = stars === 3 ? 0xfff9c4 : 0xffffff; // 3별이면 황금색 배경
        strokeColor = stars === 3 ? 0xffd700 : 0x4caf50; // 3별이면 금색, 아니면 녹색
        isInteractive = true;
        break;
      case "current":
        bgColor = 0xe3f2fd; // 연한 파란색
        strokeColor = 0x2196f3;
        isInteractive = true;
        break;
      case "locked":
        bgColor = 0xe0e0e0; // 회색
        strokeColor = 0x9e9e9e;
        isInteractive = false;
        break;
    }

    // 셀 배경
    const cellBg = this.add
      .rectangle(x, y, CELL_WIDTH - 10, CELL_HEIGHT - 10, bgColor)
      .setStrokeStyle(3, strokeColor);
    this.scrollContainer.add(cellBg);

    // Day 텍스트
    const dayText = this.add
      .text(x, y - 30, `Day ${day}`, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: state === "locked" ? "#9e9e9e" : "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.scrollContainer.add(dayText);

    // 상태별 표시
    if (state === "completed") {
      // 별 표시
      const starDisplay = this.getStarDisplay(stars);
      const starText = this.add
        .text(x, y, starDisplay, {
          fontFamily: "Arial",
          fontSize: "24px",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(starText);

      // 금액 표시
      const money = this.progressManager.getDayMoney(day);
      const target = getDayTarget(day);
      const moneyColor = money >= target ? "#4CAF50" : "#E85A4F";
      const moneyText = this.add
        .text(x, y + 35, `₩${money.toLocaleString()}`, {
          fontFamily: "Arial",
          fontSize: "14px",
          color: moneyColor,
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(moneyText);

      // 목표 금액 표시
      const targetText = this.add
        .text(x, y + 52, `목표: ₩${target.toLocaleString()}`, {
          fontFamily: "Arial",
          fontSize: "11px",
          color: "#7D6E57",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(targetText);
    } else if (state === "current") {
      // 목표 금액 표시
      const target = getDayTarget(day);
      const targetText = this.add
        .text(x, y + 5, `목표: ₩${target.toLocaleString()}`, {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#2196f3",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(targetText);

      // "진행중" 표시
      const currentText = this.add
        .text(x, y + 30, "진행중", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#2196f3",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(currentText);
    } else {
      // 잠금 아이콘
      const lockText = this.add
        .text(x, y + 15, "🔒", {
          fontSize: "32px",
        })
        .setOrigin(0.5);
      this.scrollContainer.add(lockText);
    }

    // 클릭 이벤트
    if (isInteractive) {
      cellBg.setInteractive({ useHandCursor: true });

      cellBg.on("pointerover", () => {
        cellBg.setFillStyle(this.darkenColor(bgColor, 0.1));
      });

      cellBg.on("pointerout", () => {
        cellBg.setFillStyle(bgColor);
      });

      cellBg.on("pointerdown", () => {
        this.onDayClick(day);
      });
    }
  }

  private getDayState(
    day: number,
    currentDay: number
  ): "completed" | "current" | "locked" {
    if (day < currentDay) return "completed";
    if (day === currentDay) return "current";
    return "locked";
  }

  private getStarDisplay(stars: number): string {
    const filled = "⭐";
    const empty = "☆";
    let display = "";
    for (let i = 0; i < 3; i++) {
      display += i < stars ? filled : empty;
    }
    return display;
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

    // GameScene 시작
    this.scene.start("GameScene", { day });
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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
        fontFamily: "Arial",
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

  private setupScrolling(): void {
    if (this.maxScrollY <= 0) return;

    // 터치/드래그 스크롤 설정
    let isDragging = false;
    let dragStartY = 0;
    let containerStartY = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // 헤더와 버튼 영역 제외
      if (pointer.y > 100 && pointer.y < GAME_HEIGHT - 100) {
        isDragging = true;
        dragStartY = pointer.y;
        containerStartY = this.scrollContainer.y;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (isDragging) {
        const deltaY = pointer.y - dragStartY;
        let newY = containerStartY + deltaY;

        // 스크롤 범위 제한
        newY = Math.max(-this.maxScrollY, Math.min(0, newY));
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
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        let newY = this.scrollContainer.y - deltaY * 0.5;
        newY = Math.max(-this.maxScrollY, Math.min(0, newY));
        this.scrollContainer.y = newY;
      }
    );
  }
}
