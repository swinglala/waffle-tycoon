import Phaser from "phaser";
import {
  CookingStage,
  GrillSlot,
  TrayWaffle,
  Customer,
  JamType,
  COOKING_TIMES,
  TutorialStep,
  TUTORIAL_MESSAGES,
  TUTORIAL_CONFIG,
} from "../types/game";
import { ScreenManager } from "../ui/ScreenManager";

const GRID_SIZE = 3;
const CELL_SIZE = 180; // 고정 그리드 셀 크기
const CELL_GAP = 6;

// 화구별 불 세기 배율
const GRILL_HEAT_MULTIPLIER: number[][] = [
  [1.0, 1.2, 1.0],
  [1.2, 1.5, 1.2],
  [1.0, 1.2, 1.0],
];

// 익힘 단계별 이미지 키
const STAGE_IMAGE_KEYS: Record<CookingStage, string> = {
  [CookingStage.EMPTY]: "",
  [CookingStage.BATTER]: "waffle_batter",
  [CookingStage.UNDERCOOKED]: "waffle_undercooked",
  [CookingStage.COOKED]: "waffle_cooked",
  [CookingStage.PERFECT]: "waffle_perfect",
  [CookingStage.BURNT]: "waffle_burnt",
};

// 완성품 이미지 키
const JAM_WAFFLE_IMAGE_KEYS: Record<JamType, Record<CookingStage, string>> = {
  [JamType.NONE]: {
    [CookingStage.EMPTY]: "",
    [CookingStage.BATTER]: "",
    [CookingStage.UNDERCOOKED]: "",
    [CookingStage.COOKED]: "",
    [CookingStage.PERFECT]: "",
    [CookingStage.BURNT]: "",
  },
  [JamType.APPLE]: {
    [CookingStage.EMPTY]: "",
    [CookingStage.BATTER]: "",
    [CookingStage.UNDERCOOKED]: "waffle_apple_jam_undercooked",
    [CookingStage.COOKED]: "waffle_apple_jam_cooked",
    [CookingStage.PERFECT]: "waffle_apple_jam_perfect",
    [CookingStage.BURNT]: "",
  },
  [JamType.BERRY]: {
    [CookingStage.EMPTY]: "",
    [CookingStage.BATTER]: "",
    [CookingStage.UNDERCOOKED]: "waffle_berry_jam_undercooked",
    [CookingStage.COOKED]: "waffle_berry_jam_cooked",
    [CookingStage.PERFECT]: "waffle_berry_jam_perfect",
    [CookingStage.BURNT]: "",
  },
  [JamType.PISTACHIO]: {
    [CookingStage.EMPTY]: "",
    [CookingStage.BATTER]: "",
    [CookingStage.UNDERCOOKED]: "waffle_pistachio_jam_undercooked",
    [CookingStage.COOKED]: "waffle_pistachio_jam_cooked",
    [CookingStage.PERFECT]: "waffle_pistachio_jam_perfect",
    [CookingStage.BURNT]: "",
  },
};

export class TutorialScene extends Phaser.Scene {
  // 튜토리얼 상태
  private currentStep: TutorialStep = TutorialStep.GRILL_TOUCH;
  private isCookingPaused = true;
  private isWaitingForAction = false;

  // 하이라이트 시스템 (4개의 직사각형으로 프레임 효과)
  private highlightRects: Phaser.GameObjects.Rectangle[] = [];
  private instructionContainer!: Phaser.GameObjects.Container;
  private instructionBg!: Phaser.GameObjects.Rectangle;
  private instructionText!: Phaser.GameObjects.Text;
  private instructionImage: Phaser.GameObjects.Image | null = null;
  private instructionExtraObjects: Phaser.GameObjects.GameObject[] = []; // 추가 이미지/텍스트
  private confirmButton!: Phaser.GameObjects.Rectangle;
  private confirmButtonText!: Phaser.GameObjects.Text;

  // BURN_WARNING 단계 상태
  private hasBurnt = false;

  // 3x3 굽는판
  private grillSlots: GrillSlot[][] = [];
  private grillGraphics: Phaser.GameObjects.Image[][] = [];
  private grillWaffleImages: (Phaser.GameObjects.Image | null)[][] = [];

  // 작업 트레이
  private workTray: TrayWaffle[] = [];
  private workTraySlotImages: Phaser.GameObjects.Image[] = [];
  private workTrayWaffleImages: (Phaser.GameObjects.Image | null)[] = [];

  // 완성품 트레이
  private finishedTray: TrayWaffle[] = [];
  private finishedTraySlotImages: Phaser.GameObjects.Image[] = [];
  private finishedTrayWaffleImages: (Phaser.GameObjects.Image | null)[] = [];

  // 손님
  private tutorialCustomer: Customer | null = null;
  private customerUIObjects: Phaser.GameObjects.GameObject[] = [];

  // UI 요소
  private fireImage!: Phaser.GameObjects.Image;
  private workTrayCountText!: Phaser.GameObjects.Text;
  private finishedTrayCountText!: Phaser.GameObjects.Text;
  private isStrongFire = false;
  private strongFireRemaining = 0;

  // 레이아웃 Y 좌표
  private readonly HEADER_Y = 45;
  private readonly CUSTOMER_Y = 190;
  private readonly FINISHED_TRAY_Y = 355;
  private readonly TOPPING_BTN_Y = 455;
  private readonly WORK_TRAY_Y = 535;
  private readonly GRILL_START_Y = 680;
  private readonly CUSTOMER_SLOT_X = [150, 330, 510];

  // 트레이 용량
  private readonly workTrayCapacity = 5;
  private readonly finishedTrayCapacity = 5;

  // 잼 버튼 참조
  private jamButton!: Phaser.GameObjects.Image;
  private trashButton!: Phaser.GameObjects.Image;

  // 건너뛰기 버튼
  private skipButton!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "TutorialScene" });
  }

  create(): void {
    this.initializeGrill();
    this.createBackground();
    this.createHeader();
    this.createCustomerZone();
    this.createFinishedTrayUI();
    this.createToppingButtons();
    this.createWorkTrayUI();
    this.createGrillUI();
    this.createFireButton();
    this.createHighlightSystem();
    this.createSkipButton();

    // 첫 단계 시작
    this.startStep(TutorialStep.GRILL_TOUCH);
  }

  private initializeGrill(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grillSlots[row] = [];
      this.grillGraphics[row] = [];
      this.grillWaffleImages[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grillSlots[row][col] = {
          stage: CookingStage.EMPTY,
          cookTime: 0,
        };
        this.grillWaffleImages[row][col] = null;
      }
    }
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor("#FFF8E7");
  }

  private createHeader(): void {
    // 상단 바 배경
    this.add
      .rectangle(this.cameras.main.width / 2, this.HEADER_Y, this.cameras.main.width - 20, 50, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setDepth(10);

    // 튜토리얼 표시
    this.add
      .text(this.cameras.main.width / 2, this.HEADER_Y, "튜토리얼", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(11);
  }

  private createCustomerZone(): void {
    const bgHeight = this.FINISHED_TRAY_Y - 20;
    this.add
      .image(this.cameras.main.width / 2, bgHeight / 2, "customer_background")
      .setDisplaySize(this.cameras.main.width, bgHeight)
      .setDepth(0);
  }

  private createFinishedTrayUI(): void {
    this.finishedTraySlotImages = [];
    this.finishedTrayWaffleImages = [];

    const usableWidth = this.cameras.main.width - 40;
    const slotWidth = usableWidth / this.finishedTrayCapacity;
    const slotSize = 100;
    const startX = 20 + slotWidth / 2;

    for (let i = 0; i < this.finishedTrayCapacity; i++) {
      const x = startX + i * slotWidth;
      const slotImg = this.add
        .image(x, this.FINISHED_TRAY_Y, "finished_tray")
        .setDisplaySize(slotSize, slotSize)
        .setDepth(5);
      this.finishedTraySlotImages.push(slotImg);
      this.finishedTrayWaffleImages.push(null);
    }

    this.finishedTrayCountText = this.add
      .text(
        this.cameras.main.width - 30,
        this.FINISHED_TRAY_Y - 25,
        "0/" + this.finishedTrayCapacity,
        {
          fontFamily: "Pretendard",
          padding: { y: 5 },
          fontSize: "16px",
          color: "#FFFFFF",
          fontStyle: "bold",
        },
      )
      .setOrigin(1, 0)
      .setDepth(6);
  }

  private createToppingButtons(): void {
    const jamImageWidth = 350;
    const jamImageHeight = 115;
    const trashBtnSize = 130;

    // 사과잼 버튼 (GameScene과 동일한 크기)
    const jamX = 260;
    this.jamButton = this.add
      .image(jamX, this.TOPPING_BTN_Y, "btn_apple_jam")
      .setDisplaySize(jamImageWidth, jamImageHeight)
      .setInteractive({ useHandCursor: true })
      .setDepth(5); // 기본 depth는 낮게

    this.jamButton.on("pointerdown", () => this.onJamButtonClick());

    // 쓰레기통 버튼
    const trashX = this.cameras.main.width - 85;
    this.trashButton = this.add
      .image(trashX, this.TOPPING_BTN_Y, "btn_trash")
      .setDisplaySize(trashBtnSize, trashBtnSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(5); // 기본 depth는 낮게

    this.trashButton.on("pointerdown", () => this.onTrashButtonClick());
  }

  private createWorkTrayUI(): void {
    this.workTraySlotImages = [];
    this.workTrayWaffleImages = [];

    const usableWidth = this.cameras.main.width - 40;
    const slotWidth = usableWidth / this.workTrayCapacity;
    const slotSize = 85;
    const startX = 20 + slotWidth / 2;

    for (let i = 0; i < this.workTrayCapacity; i++) {
      const x = startX + i * slotWidth;
      const slotImg = this.add
        .image(x, this.WORK_TRAY_Y, "ready_tray")
        .setDisplaySize(slotSize, slotSize);
      this.workTraySlotImages.push(slotImg);
      this.workTrayWaffleImages.push(null);
    }

    this.workTrayCountText = this.add
      .text(
        this.cameras.main.width - 30,
        this.WORK_TRAY_Y - 20,
        "0/" + this.workTrayCapacity,
        {
          fontFamily: "Pretendard",
          padding: { y: 5 },
          fontSize: "14px",
          color: "#FFFFFF",
          fontStyle: "bold",
        },
      )
      .setOrigin(1, 0);
  }

  private createGrillUI(): void {
    const grillCenterX = this.cameras.main.width / 2;
    const grillTotalWidth = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const grillCenterY = this.GRILL_START_Y + (CELL_SIZE + CELL_GAP);

    this.add
      .rectangle(
        grillCenterX,
        grillCenterY,
        grillTotalWidth + 30,
        grillTotalHeight + 30,
        0x5d4e37,
      )
      .setStrokeStyle(4, 0x3d2e17);

    const startX = grillCenterX - grillTotalWidth / 2 + CELL_SIZE / 2;
    const startY = this.GRILL_START_Y;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = startX + col * (CELL_SIZE + CELL_GAP);
        const y = startY + row * (CELL_SIZE + CELL_GAP);

        const cell = this.add
          .image(x, y, "grill_slot_empty")
          .setDisplaySize(CELL_SIZE, CELL_SIZE)
          .setDepth(5) // 기본 depth는 낮게
          .setInteractive({ useHandCursor: true });

        this.grillGraphics[row][col] = cell;
        cell.on("pointerdown", () => this.onGrillCellClick(row, col));
      }
    }
  }

  private createFireButton(): void {
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const fireY = this.GRILL_START_Y + grillTotalHeight - 30;
    const fireSize = 300;

    this.fireImage = this.add
      .image(this.cameras.main.width / 2, fireY, "small_fire")
      .setDisplaySize(fireSize, fireSize)
      .setDepth(5) // 기본 depth는 낮게
      .setInteractive({ useHandCursor: true });

    this.fireImage.on("pointerdown", () => this.onFireButtonClick());
  }

  private createHighlightSystem(): void {
    // 4개의 직사각형으로 프레임 효과 (상, 하, 좌, 우)
    // 처음에는 빈 배열, 필요할 때 생성
    this.highlightRects = [];

    // 안내 팝업 컨테이너
    this.instructionContainer = this.add.container(this.cameras.main.width / 2, 300);
    this.instructionContainer.setDepth(TUTORIAL_CONFIG.INSTRUCTION_DEPTH);

    // 팝업 배경
    this.instructionBg = this.add
      .rectangle(0, 0, 500, 180, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914);

    // 안내 텍스트
    this.instructionText = this.add
      .text(0, -30, "", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "32px",
        color: "#5D4E37",
        align: "center",
      })
      .setOrigin(0.5);

    // 확인 버튼
    this.confirmButton = this.add
      .rectangle(0, 50, 140, 50, 0x4caf50)
      .setStrokeStyle(3, 0x388e3c)
      .setInteractive({ useHandCursor: true });

    this.confirmButtonText = this.add
      .text(0, 50, "확인", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "22px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.confirmButton.on("pointerdown", () => this.onConfirmClick());

    this.instructionContainer.add([
      this.instructionBg,
      this.instructionText,
      this.confirmButton,
      this.confirmButtonText,
    ]);

    // 초기에는 숨김
    this.instructionContainer.setVisible(false);
  }

  private createSkipButton(): void {
    this.skipButton = this.add
      .text(this.cameras.main.width - 20, 90, "건너뛰기 >", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "18px",
        color: "#999999",
      })
      .setOrigin(1, 0)
      .setDepth(TUTORIAL_CONFIG.INSTRUCTION_DEPTH + 10)
      .setInteractive({ useHandCursor: true });

    this.skipButton.on("pointerdown", () => this.showSkipConfirmPopup());
    this.skipButton.on("pointerover", () =>
      this.skipButton.setColor("#666666"),
    );
    this.skipButton.on("pointerout", () => this.skipButton.setColor("#999999"));
  }

  private showSkipConfirmPopup(): void {
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.5,
      )
      .setInteractive()
      .setDepth(500);
    popupObjects.push(overlay);

    const popup = this.add
      .rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 400, 200, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(501);
    popupObjects.push(popup);

    const titleText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, "튜토리얼 건너뛰기", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(502);
    popupObjects.push(titleText);

    const messageText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, "튜토리얼을 건너뛰시겠습니까?", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
      })
      .setOrigin(0.5)
      .setDepth(502);
    popupObjects.push(messageText);

    const cancelBtn = this.add
      .rectangle(this.cameras.main.width / 2 - 80, this.cameras.main.height / 2 + 60, 120, 45, 0xcccccc)
      .setStrokeStyle(2, 0x999999)
      .setInteractive({ useHandCursor: true })
      .setDepth(502);
    popupObjects.push(cancelBtn);

    const cancelText = this.add
      .text(this.cameras.main.width / 2 - 80, this.cameras.main.height / 2 + 60, "취소", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "18px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(503);
    popupObjects.push(cancelText);

    const confirmBtn = this.add
      .rectangle(this.cameras.main.width / 2 + 80, this.cameras.main.height / 2 + 60, 120, 45, 0xe85a4f)
      .setStrokeStyle(2, 0xb8453c)
      .setInteractive({ useHandCursor: true })
      .setDepth(502);
    popupObjects.push(confirmBtn);

    const confirmText = this.add
      .text(this.cameras.main.width / 2 + 80, this.cameras.main.height / 2 + 60, "건너뛰기", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "18px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(503);
    popupObjects.push(confirmText);

    const closePopup = () => {
      popupObjects.forEach((obj) => obj.destroy());
    };

    cancelBtn.on("pointerdown", closePopup);
    overlay.on("pointerdown", closePopup);
    confirmBtn.on("pointerdown", () => {
      closePopup();
      this.completeTutorial();
    });
  }

  private startStep(step: TutorialStep): void {
    this.currentStep = step;
    this.isWaitingForAction = true;

    switch (step) {
      case TutorialStep.GRILL_TOUCH:
        this.showInstruction(TUTORIAL_MESSAGES[step], false);
        this.highlightGrillCenter();
        this.isCookingPaused = true;
        break;

      case TutorialStep.HEAT_EXPLANATION:
        this.showInstruction(TUTORIAL_MESSAGES[step], true);
        this.highlightGrillAll();
        this.isCookingPaused = true;
        break;

      case TutorialStep.STRONG_FIRE:
        this.showInstruction(TUTORIAL_MESSAGES[step], false);
        this.highlightFireButton();
        this.isCookingPaused = false;
        break;

      case TutorialStep.PICK_PERFECT:
        // 와플 단계 설명 (반죽 → 덜익음 → 익음 → 퍼펙트 → 탐)
        this.showWaffleStagesInstruction();
        this.highlightGrillCenter();
        this.isCookingPaused = false;
        break;

      case TutorialStep.BURN_WARNING:
        // 와플이 타면 확인 버튼 활성화 (초기에는 비활성화)
        this.hasBurnt = false;
        this.showInstruction(
          "퍼펙트를 놓치면\n와플이 타버려요!",
          true,
          undefined,
          false, // 확인 버튼 비활성화
        );
        // 자동으로 새 반죽 배치하고 타게 만들기
        this.placeBatterForBurnDemo();
        // 굽고 있는 와플에 하이라이트
        this.highlightGrillCenter();
        this.isCookingPaused = false;
        break;

      case TutorialStep.APPLY_JAM:
        this.showInstruction(TUTORIAL_MESSAGES[step], false);
        this.highlightJamButton();
        this.isCookingPaused = true;
        break;

      case TutorialStep.TRASH_BURNT:
        // 탄 와플 이미지와 함께 표시
        this.showInstruction(
          "탄 와플은 쓰레기통에\n버려야 해요!",
          false,
          "waffle_burnt",
        );
        this.highlightTrashButton();
        this.isCookingPaused = true;
        break;

      case TutorialStep.SERVE_CUSTOMER:
        // 손님 판매 설명 (팝업을 아래쪽에 배치)
        this.showServeCustomerInstruction();
        this.spawnTutorialCustomer();
        this.highlightCustomer();
        this.isCookingPaused = true;
        break;

      case TutorialStep.STAR_EXPLANATION:
        // 별/목표금액 설명
        this.showStarExplanation();
        this.clearHighlight();
        this.isCookingPaused = true;
        break;

      case TutorialStep.COMPLETE:
        this.completeTutorial();
        break;
    }
  }

  private clearInstructionExtras(): void {
    // 기존 이미지 제거
    if (this.instructionImage) {
      this.instructionImage.destroy();
      this.instructionImage = null;
    }
    // 추가 오브젝트 제거
    for (const obj of this.instructionExtraObjects) {
      obj.destroy();
    }
    this.instructionExtraObjects = [];
  }

  private showInstruction(
    message: string,
    showConfirmButton: boolean,
    imageKey?: string,
    confirmEnabled = true,
  ): void {
    this.clearInstructionExtras();

    // 이미지가 있으면 팝업 크기 조정
    if (imageKey) {
      this.instructionBg.setSize(500, 260);
      this.instructionText.setPosition(0, -70);

      // 이미지 추가
      this.instructionImage = this.add
        .image(0, 10, imageKey)
        .setDisplaySize(100, 100);
      this.instructionContainer.add(this.instructionImage);

      this.confirmButton.setPosition(0, 90);
      this.confirmButtonText.setPosition(0, 90);
    } else {
      this.instructionBg.setSize(500, 180);
      this.instructionText.setPosition(0, -30);
      this.confirmButton.setPosition(0, 50);
      this.confirmButtonText.setPosition(0, 50);
    }

    this.instructionText.setText(message);
    this.confirmButton.setVisible(showConfirmButton);
    this.confirmButtonText.setVisible(showConfirmButton);
    this.instructionContainer.setVisible(true);

    // 확인 버튼 인터랙티브 상태 조정
    if (showConfirmButton && confirmEnabled) {
      this.confirmButton.setInteractive({ useHandCursor: true });
      this.confirmButton.setFillStyle(0x4caf50, 1);
      this.confirmButton.setStrokeStyle(3, 0x388e3c);
      this.confirmButtonText.setAlpha(1);
    } else {
      this.confirmButton.disableInteractive();
      if (showConfirmButton && !confirmEnabled) {
        this.confirmButton.setFillStyle(0xcccccc, 0.5); // 비활성화: 더 투명하게
        this.confirmButton.setStrokeStyle(0); // 테두리 제거
        this.confirmButtonText.setAlpha(0.5); // 텍스트도 투명하게
      }
    }

    // 팝업 위치 조정 (단계에 따라)
    if (this.currentStep <= TutorialStep.STRONG_FIRE) {
      this.instructionContainer.setPosition(this.cameras.main.width / 2, 300);
    } else {
      this.instructionContainer.setPosition(this.cameras.main.width / 2, 250);
    }
  }

  // 와플 단계 설명 팝업 (PICK_PERFECT용)
  private showWaffleStagesInstruction(): void {
    this.clearInstructionExtras();

    // 큰 팝업 배경
    this.instructionBg.setSize(600, 320);
    this.instructionContainer.setPosition(this.cameras.main.width / 2, 280);

    // 상단 텍스트
    this.instructionText.setText("와플은 이렇게 변해요!");
    this.instructionText.setPosition(0, -120);

    // 와플 단계 이미지들
    const stages = [
      { key: "waffle_batter", label: "반죽" },
      { key: "waffle_undercooked", label: "덜익음" },
      { key: "waffle_cooked", label: "익음" },
      { key: "waffle_perfect", label: "퍼펙트" },
      { key: "waffle_burnt", label: "탐" },
    ];

    const imageSize = 70;
    const spacing = 100;
    const startX = -((stages.length - 1) * spacing) / 2;

    for (let i = 0; i < stages.length; i++) {
      const x = startX + i * spacing;
      const y = -30;

      // 와플 이미지
      const img = this.add
        .image(x, y, stages[i].key)
        .setDisplaySize(imageSize, imageSize);
      this.instructionContainer.add(img);
      this.instructionExtraObjects.push(img);

      // 라벨
      const isPerfect = stages[i].key === "waffle_perfect";
      const label = this.add
        .text(x, y + 50, stages[i].label, {
          fontFamily: "Pretendard",
          fontSize: isPerfect ? "18px" : "14px",
          color: isPerfect ? "#4CAF50" : "#5D4E37",
          fontStyle: isPerfect ? "bold" : "normal",
        })
        .setOrigin(0.5);
      this.instructionContainer.add(label);
      this.instructionExtraObjects.push(label);

      // 화살표 (마지막 제외)
      if (i < stages.length - 1) {
        const arrow = this.add
          .text(x + spacing / 2, y, "→", {
            fontFamily: "Pretendard",
            fontSize: "24px",
            color: "#999999",
          })
          .setOrigin(0.5);
        this.instructionContainer.add(arrow);
        this.instructionExtraObjects.push(arrow);
      }
    }

    // 설명 텍스트
    const descText = this.add
      .text(
        0,
        100,
        "퍼펙트 와플이 가격이 가장 높아요!\n퍼펙트일 때 터치해서 꺼내세요!",
        {
          fontFamily: "Pretendard",
          fontSize: "20px",
          color: "#5D4E37",
          align: "center",
        },
      )
      .setOrigin(0.5);
    this.instructionContainer.add(descText);
    this.instructionExtraObjects.push(descText);

    // 확인 버튼 숨김
    this.confirmButton.setVisible(false);
    this.confirmButtonText.setVisible(false);
    this.confirmButton.disableInteractive();

    this.instructionContainer.setVisible(true);
  }

  // 손님 판매 설명 팝업 (SERVE_CUSTOMER용)
  private showServeCustomerInstruction(): void {
    this.clearInstructionExtras();

    // 팝업 배경 (일반 크기)
    this.instructionBg.setSize(550, 180);

    // 손님 아래쪽에 배치 (손님이 가려지지 않도록)
    this.instructionContainer.setPosition(this.cameras.main.width / 2, 480);

    // 안내 텍스트
    this.instructionText.setText(
      "완성트레이에 주문만큼 와플이 있으면\n손님을 터치해서 판매하세요!",
    );
    this.instructionText.setPosition(0, 0);

    // 확인 버튼 숨김
    this.confirmButton.setVisible(false);
    this.confirmButtonText.setVisible(false);
    this.confirmButton.disableInteractive();

    this.instructionContainer.setVisible(true);
  }

  // 별/목표금액 설명 팝업 (STAR_EXPLANATION용)
  private showStarExplanation(): void {
    this.clearInstructionExtras();

    // 큰 팝업 배경
    this.instructionBg.setSize(660, 420);
    this.instructionContainer.setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);

    // 제목 (별 이미지 + 텍스트 + 별 이미지)
    const titleStarSize = 44;
    const titleStarLeft = this.add
      .image(-130, -160, "icon_star")
      .setDisplaySize(titleStarSize, titleStarSize);
    this.instructionContainer.add(titleStarLeft);
    this.instructionExtraObjects.push(titleStarLeft);

    this.instructionText.setText("별과 목표금액");
    this.instructionText.setPosition(0, -160);
    this.instructionText.setFontSize(32);

    const titleStarRight = this.add
      .image(130, -160, "icon_star")
      .setDisplaySize(titleStarSize, titleStarSize);
    this.instructionContainer.add(titleStarRight);
    this.instructionExtraObjects.push(titleStarRight);

    // 설명 텍스트들
    const line1 = this.add
      .text(0, -95, "매일 목표금액이 있어요!", {
        fontFamily: "Pretendard",
        fontSize: "26px",
        color: "#5D4E37",
        align: "center",
      })
      .setOrigin(0.5);
    this.instructionContainer.add(line1);
    this.instructionExtraObjects.push(line1);

    // 목표 달성 → 별 1개
    const starIconSize = 36;
    const line2Text = this.add
      .text(-40, -50, "목표 달성 →", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#5D4E37",
      })
      .setOrigin(0.5);
    this.instructionContainer.add(line2Text);
    this.instructionExtraObjects.push(line2Text);

    const line2Star = this.add
      .image(55, -50, "icon_star")
      .setDisplaySize(starIconSize, starIconSize);
    this.instructionContainer.add(line2Star);
    this.instructionExtraObjects.push(line2Star);

    const line2Count = this.add
      .text(90, -50, "1개", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#5D4E37",
      })
      .setOrigin(0, 0.5);
    this.instructionContainer.add(line2Count);
    this.instructionExtraObjects.push(line2Count);

    // 목표 초과 달성 → 별 최대 3개!
    const line3Text = this.add
      .text(-55, 0, "목표 초과 달성 →", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#4CAF50",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.instructionContainer.add(line3Text);
    this.instructionExtraObjects.push(line3Text);

    const line3Star = this.add
      .image(60, 0, "icon_star")
      .setDisplaySize(starIconSize, starIconSize);
    this.instructionContainer.add(line3Star);
    this.instructionExtraObjects.push(line3Star);

    const line3Count = this.add
      .text(95, 0, "최대 3개!", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#4CAF50",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.instructionContainer.add(line3Count);
    this.instructionExtraObjects.push(line3Count);

    // 별은 홈화면 상점에서 (상점 이미지 포함)
    const shopIconSize = 50;
    const line4Text1 = this.add
      .text(-70, 60, "별은 홈화면 상점", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#5D4E37",
      })
      .setOrigin(0.5);
    this.instructionContainer.add(line4Text1);
    this.instructionExtraObjects.push(line4Text1);

    const shopIcon = this.add
      .image(55, 60, "icon_shop")
      .setDisplaySize(shopIconSize, shopIconSize);
    this.instructionContainer.add(shopIcon);
    this.instructionExtraObjects.push(shopIcon);

    const line4Text2 = this.add
      .text(100, 60, "에서", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#5D4E37",
      })
      .setOrigin(0, 0.5);
    this.instructionContainer.add(line4Text2);
    this.instructionExtraObjects.push(line4Text2);

    const line5 = this.add
      .text(0, 115, "업그레이드에 사용할 수 있어요!", {
        fontFamily: "Pretendard",
        fontSize: "24px",
        color: "#5D4E37",
        align: "center",
      })
      .setOrigin(0.5);
    this.instructionContainer.add(line5);
    this.instructionExtraObjects.push(line5);

    // 확인 버튼 표시
    this.confirmButton.setPosition(0, 170);
    this.confirmButtonText.setPosition(0, 170);
    this.confirmButton.setVisible(true);
    this.confirmButtonText.setVisible(true);
    this.confirmButton.setInteractive({ useHandCursor: true });
    this.confirmButton.setFillStyle(0x4caf50);

    this.instructionContainer.setVisible(true);
  }

  private enableConfirmButton(): void {
    this.confirmButton.setInteractive({ useHandCursor: true });
    this.confirmButton.setFillStyle(0x4caf50, 1);
    this.confirmButton.setStrokeStyle(3, 0x388e3c);
    this.confirmButtonText.setAlpha(1);
  }

  private hideInstruction(): void {
    this.instructionContainer.setVisible(false);
  }

  // 4개의 직사각형으로 하이라이트 영역 주변을 어둡게 처리
  private createHighlightFrame(
    highlightX: number,
    highlightY: number,
    highlightW: number,
    highlightH: number,
  ): void {
    // 기존 하이라이트 제거
    this.clearHighlight();

    const alpha = TUTORIAL_CONFIG.HIGHLIGHT_ALPHA;
    const depth = TUTORIAL_CONFIG.HIGHLIGHT_DEPTH;
    const color = 0x000000;

    // 하이라이트 영역의 경계
    const left = highlightX - highlightW / 2;
    const right = highlightX + highlightW / 2;
    const top = highlightY - highlightH / 2;
    const bottom = highlightY + highlightH / 2;

    // 상단 영역 (화면 상단 ~ 하이라이트 상단)
    if (top > 0) {
      const topRect = this.add
        .rectangle(this.cameras.main.width / 2, top / 2, this.cameras.main.width, top, color, alpha)
        .setDepth(depth);
      this.highlightRects.push(topRect);
    }

    // 하단 영역 (하이라이트 하단 ~ 화면 하단)
    if (bottom < this.cameras.main.height) {
      const bottomHeight = this.cameras.main.height - bottom;
      const bottomRect = this.add
        .rectangle(
          this.cameras.main.width / 2,
          bottom + bottomHeight / 2,
          this.cameras.main.width,
          bottomHeight,
          color,
          alpha,
        )
        .setDepth(depth);
      this.highlightRects.push(bottomRect);
    }

    // 좌측 영역 (하이라이트 높이만큼)
    if (left > 0) {
      const leftRect = this.add
        .rectangle(left / 2, highlightY, left, highlightH, color, alpha)
        .setDepth(depth);
      this.highlightRects.push(leftRect);
    }

    // 우측 영역 (하이라이트 높이만큼)
    if (right < this.cameras.main.width) {
      const rightWidth = this.cameras.main.width - right;
      const rightRect = this.add
        .rectangle(
          right + rightWidth / 2,
          highlightY,
          rightWidth,
          highlightH,
          color,
          alpha,
        )
        .setDepth(depth);
      this.highlightRects.push(rightRect);
    }
  }

  private highlightGrillCenter(): void {
    // 중앙 그릴 셀 좌표
    const grillCenterX = this.cameras.main.width / 2;
    const grillTotalWidth = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const startX = grillCenterX - grillTotalWidth / 2 + CELL_SIZE / 2;
    const startY = this.GRILL_START_Y;
    const centerX = startX + 1 * (CELL_SIZE + CELL_GAP);
    const centerY = startY + 1 * (CELL_SIZE + CELL_GAP);

    // 중앙 셀 주변을 하이라이트
    this.createHighlightFrame(centerX, centerY, CELL_SIZE + 40, CELL_SIZE + 40);

    // 중앙 그릴 셀과 와플 이미지의 depth를 높임
    const highlightDepth = TUTORIAL_CONFIG.HIGHLIGHT_DEPTH + 10;
    this.grillGraphics[1][1].setDepth(highlightDepth);
    if (this.grillWaffleImages[1][1]) {
      this.grillWaffleImages[1][1].setDepth(highlightDepth + 1);
    }
  }

  private highlightGrillAll(): void {
    // 전체 그릴 영역
    const grillCenterX = this.cameras.main.width / 2;
    const grillTotalWidth = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const grillCenterY = this.GRILL_START_Y + (CELL_SIZE + CELL_GAP);

    this.createHighlightFrame(
      grillCenterX,
      grillCenterY,
      grillTotalWidth + 40,
      grillTotalHeight + 40,
    );

    // 모든 그릴 셀의 depth를 높임
    const highlightDepth = TUTORIAL_CONFIG.HIGHLIGHT_DEPTH + 10;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grillGraphics[row][col].setDepth(highlightDepth);
        if (this.grillWaffleImages[row][col]) {
          this.grillWaffleImages[row][col]!.setDepth(highlightDepth + 1);
        }
      }
    }
  }

  private highlightFireButton(): void {
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const fireY = this.GRILL_START_Y + grillTotalHeight - 30;

    this.createHighlightFrame(this.cameras.main.width / 2, fireY, 200, 200);

    // 강불 버튼의 depth를 높임
    this.fireImage.setDepth(TUTORIAL_CONFIG.HIGHLIGHT_DEPTH + 10);
  }

  private highlightJamButton(): void {
    // 잼 버튼 크기 350x115에 맞춰 하이라이트 (여백 포함)
    this.createHighlightFrame(260, this.TOPPING_BTN_Y, 370, 135);

    // 잼 버튼의 depth를 높임
    this.jamButton.setDepth(TUTORIAL_CONFIG.HIGHLIGHT_DEPTH + 10);
  }

  private highlightTrashButton(): void {
    // 쓰레기통 버튼 크기 130x130에 맞춰 하이라이트 (여백 포함)
    this.createHighlightFrame(this.cameras.main.width - 85, this.TOPPING_BTN_Y, 150, 150);

    // 쓰레기통 버튼의 depth를 높임
    this.trashButton.setDepth(TUTORIAL_CONFIG.HIGHLIGHT_DEPTH + 10);
  }

  private highlightCustomer(): void {
    this.createHighlightFrame(
      this.CUSTOMER_SLOT_X[1],
      this.CUSTOMER_Y + 20,
      260,
      260,
    );
    // 손님 UI는 createCustomerUI에서 이미 높은 depth로 설정됨
  }

  private clearHighlight(): void {
    // 모든 하이라이트 직사각형 제거
    for (const rect of this.highlightRects) {
      rect.destroy();
    }
    this.highlightRects = [];

    // 모든 요소의 depth를 기본값으로 리셋
    this.resetAllDepths();
  }

  private resetAllDepths(): void {
    const defaultDepth = 5;

    // 그릴 셀
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grillGraphics[row][col].setDepth(defaultDepth);
        if (this.grillWaffleImages[row][col]) {
          this.grillWaffleImages[row][col]!.setDepth(defaultDepth + 1);
        }
      }
    }

    // 버튼들
    this.fireImage.setDepth(defaultDepth);
    this.jamButton.setDepth(defaultDepth);
    this.trashButton.setDepth(defaultDepth);
  }

  private onConfirmClick(): void {
    if (!this.isWaitingForAction) return;

    switch (this.currentStep) {
      case TutorialStep.HEAT_EXPLANATION:
        this.hideInstruction();
        this.clearHighlight();
        this.advanceStep();
        break;

      case TutorialStep.BURN_WARNING:
        this.hideInstruction();
        // 타는 것 관찰 후 다음 단계
        this.advanceStep();
        break;

      case TutorialStep.STAR_EXPLANATION:
        this.hideInstruction();
        this.advanceStep();
        break;
    }
  }

  private advanceStep(): void {
    this.isWaitingForAction = false;
    const nextStep = this.currentStep + 1;
    if (nextStep <= TutorialStep.COMPLETE) {
      this.startStep(nextStep as TutorialStep);
    }
  }

  private onGrillCellClick(row: number, col: number): void {
    const slot = this.grillSlots[row][col];

    // 단계별 동작 제어
    if (this.currentStep === TutorialStep.GRILL_TOUCH) {
      // 첫 단계: 중앙 칸만 클릭 가능
      if (row === 1 && col === 1 && slot.stage === CookingStage.EMPTY) {
        slot.stage = CookingStage.BATTER;
        slot.cookTime = 0;
        this.updateGrillCell(row, col);
        this.hideInstruction();
        this.clearHighlight();
        this.advanceStep();
      }
      return;
    }

    if (this.currentStep === TutorialStep.PICK_PERFECT) {
      // 퍼펙트일 때만 꺼내기 가능
      if (row === 1 && col === 1 && slot.stage === CookingStage.PERFECT) {
        this.moveToWorkTray(row, col);
        this.hideInstruction();
        this.clearHighlight();
        this.advanceStep();
      }
      return;
    }

    // 기본 동작 (다른 단계에서는 비활성화)
  }

  private moveToWorkTray(row: number, col: number): void {
    if (this.workTray.length >= this.workTrayCapacity) return;

    const slot = this.grillSlots[row][col];
    this.workTray.push({
      stage: slot.stage,
      jamType: JamType.NONE,
    });

    slot.stage = CookingStage.EMPTY;
    slot.cookTime = 0;
    this.updateGrillCell(row, col);
    this.updateWorkTrayDisplay();
  }

  private onFireButtonClick(): void {
    if (this.currentStep === TutorialStep.STRONG_FIRE) {
      if (!this.isStrongFire) {
        this.isStrongFire = true;
        this.strongFireRemaining = 3;
        this.fireImage.setTexture("big_fire");
        this.hideInstruction();
        this.clearHighlight();
        this.advanceStep();
      }
    }
  }

  private onJamButtonClick(): void {
    if (this.currentStep === TutorialStep.APPLY_JAM) {
      if (this.workTray.length > 0) {
        const waffle = this.workTray[0];
        if (waffle.stage !== CookingStage.BURNT) {
          waffle.jamType = JamType.APPLE;
          this.finishedTray.push(waffle);
          this.workTray.shift();
          this.updateWorkTrayDisplay();
          this.updateFinishedTrayDisplay();
          this.hideInstruction();
          this.clearHighlight();
          this.advanceStep();
        }
      }
    }
  }

  private onTrashButtonClick(): void {
    if (this.currentStep === TutorialStep.TRASH_BURNT) {
      if (this.workTray.length > 0) {
        this.workTray.shift();
        this.updateWorkTrayDisplay();
        this.hideInstruction();
        this.clearHighlight();
        this.advanceStep();
      }
    }
  }

  private placeBatterForBurnDemo(): void {
    // 중앙에 새 반죽 배치
    this.grillSlots[1][1] = {
      stage: CookingStage.BATTER,
      cookTime: 0,
    };
    this.updateGrillCell(1, 1);
  }

  private spawnTutorialCustomer(): void {
    this.tutorialCustomer = {
      id: 1,
      type: "dog",
      waffleCount: 1,
      waitTime: 999,
      maxWaitTime: 999,
      preferredJam: JamType.APPLE,
    };

    // 완성품 트레이에 와플 추가 (이미 있으면 생략)
    if (this.finishedTray.length === 0) {
      this.finishedTray.push({
        stage: CookingStage.PERFECT,
        jamType: JamType.APPLE,
      });
      this.updateFinishedTrayDisplay();
    }

    this.createCustomerUI();
  }

  private createCustomerUI(): void {
    if (!this.tutorialCustomer) return;

    // 기존 UI 제거
    this.customerUIObjects.forEach((obj) => obj.destroy());
    this.customerUIObjects = [];

    const x = this.CUSTOMER_SLOT_X[1];
    const y = this.CUSTOMER_Y + 20;
    const customer = this.tutorialCustomer;
    const highlightDepth = TUTORIAL_CONFIG.HIGHLIGHT_DEPTH;

    const imageSize = 250;
    const icon = this.add
      .image(x, y + 15, `customer_${customer.type}`)
      .setDisplaySize(imageSize, imageSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(highlightDepth + 10); // 오버레이보다 위에

    icon.on("pointerdown", () => this.onCustomerClick());

    const orderBg = this.add
      .rectangle(x, y + 50, 130, 50, 0xffffff)
      .setStrokeStyle(2, 0x8b6914)
      .setDepth(highlightDepth + 11);

    const orderImageKey = `order_${customer.preferredJam}_jam`;
    const orderImage = this.add
      .image(x - 30, y + 50, orderImageKey)
      .setDisplaySize(40, 40)
      .setDepth(highlightDepth + 12);

    const orderText = this.add
      .text(x + 20, y + 50, `x ${customer.waffleCount}`, {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(highlightDepth + 12);

    this.customerUIObjects.push(icon, orderBg, orderImage, orderText);
  }

  private onCustomerClick(): void {
    if (this.currentStep !== TutorialStep.SERVE_CUSTOMER) return;
    if (!this.tutorialCustomer) return;

    // 완성품 확인
    const matchingWaffles = this.finishedTray.filter(
      (w) => w.jamType === this.tutorialCustomer!.preferredJam,
    );

    if (matchingWaffles.length >= this.tutorialCustomer.waffleCount) {
      // 판매 처리
      this.finishedTray.shift();
      this.updateFinishedTrayDisplay();

      // 손님 UI 제거
      this.customerUIObjects.forEach((obj) => obj.destroy());
      this.customerUIObjects = [];
      this.tutorialCustomer = null;

      this.hideInstruction();
      this.clearHighlight();
      this.advanceStep();
    }
  }

  private updateGrillCell(row: number, col: number): void {
    const slot = this.grillSlots[row][col];
    const cellImage = this.grillGraphics[row][col];

    if (this.grillWaffleImages[row][col]) {
      this.grillWaffleImages[row][col]!.destroy();
      this.grillWaffleImages[row][col] = null;
    }

    if (slot.stage !== CookingStage.EMPTY) {
      const imageKey = STAGE_IMAGE_KEYS[slot.stage];
      if (imageKey) {
        // 그릴 셀의 현재 depth를 기준으로 와플 이미지 depth 설정
        const cellDepth = cellImage.depth;
        const waffleImage = this.add
          .image(cellImage.x, cellImage.y, imageKey)
          .setDisplaySize(CELL_SIZE - 20, CELL_SIZE - 20)
          .setDepth(cellDepth + 1); // 셀보다 1 높게
        this.grillWaffleImages[row][col] = waffleImage;
      }
    }
  }

  private updateWorkTrayDisplay(): void {
    const usableWidth = this.cameras.main.width - 40;
    const slotWidth = usableWidth / this.workTrayCapacity;
    const waffleSize = 100;
    const startX = 20 + slotWidth / 2;

    for (const img of this.workTrayWaffleImages) {
      if (img) img.destroy();
    }
    this.workTrayWaffleImages = [];

    for (let i = 0; i < this.workTrayCapacity; i++) {
      const x = startX + i * slotWidth;
      const waffle = this.workTray[i];

      if (waffle) {
        const imageKey = STAGE_IMAGE_KEYS[waffle.stage];
        if (imageKey) {
          const waffleImg = this.add
            .image(x, this.WORK_TRAY_Y, imageKey)
            .setDisplaySize(waffleSize, waffleSize)
            .setDepth(1);
          this.workTrayWaffleImages.push(waffleImg);
        } else {
          this.workTrayWaffleImages.push(null);
        }
      } else {
        this.workTrayWaffleImages.push(null);
      }
    }

    this.workTrayCountText.setText(
      `${this.workTray.length}/${this.workTrayCapacity}`,
    );
  }

  private updateFinishedTrayDisplay(): void {
    const usableWidth = this.cameras.main.width - 40;
    const slotWidth = usableWidth / this.finishedTrayCapacity;
    const waffleSize = 100;
    const startX = 20 + slotWidth / 2;

    for (const img of this.finishedTrayWaffleImages) {
      if (img) img.destroy();
    }
    this.finishedTrayWaffleImages = [];

    for (let i = 0; i < this.finishedTrayCapacity; i++) {
      const x = startX + i * slotWidth;
      const waffle = this.finishedTray[i];

      if (waffle) {
        const imageKey =
          JAM_WAFFLE_IMAGE_KEYS[waffle.jamType]?.[waffle.stage] || "";
        if (imageKey) {
          const waffleImg = this.add
            .image(x, this.FINISHED_TRAY_Y, imageKey)
            .setDisplaySize(waffleSize, waffleSize)
            .setDepth(6);
          this.finishedTrayWaffleImages.push(waffleImg);
        } else {
          this.finishedTrayWaffleImages.push(null);
        }
      } else {
        this.finishedTrayWaffleImages.push(null);
      }
    }

    this.finishedTrayCountText.setText(
      `${this.finishedTray.length}/${this.finishedTrayCapacity}`,
    );
  }

  private getNextStage(current: CookingStage): CookingStage {
    switch (current) {
      case CookingStage.BATTER:
        return CookingStage.UNDERCOOKED;
      case CookingStage.UNDERCOOKED:
        return CookingStage.COOKED;
      case CookingStage.COOKED:
        return CookingStage.PERFECT;
      case CookingStage.PERFECT:
        return CookingStage.BURNT;
      default:
        return current;
    }
  }

  update(_time: number, delta: number): void {
    if (this.isCookingPaused) return;

    const deltaSeconds = delta / 1000;
    const strongFireMultiplier = this.isStrongFire ? 2 : 1;

    // 굽는판 업데이트
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.grillSlots[row][col];

        if (
          slot.stage !== CookingStage.EMPTY &&
          slot.stage !== CookingStage.BURNT
        ) {
          const heatMultiplier = GRILL_HEAT_MULTIPLIER[row][col];
          slot.cookTime += deltaSeconds * strongFireMultiplier * heatMultiplier;

          const requiredTime = COOKING_TIMES[slot.stage];
          if (slot.cookTime >= requiredTime) {
            // PICK_PERFECT 단계에서는 퍼펙트 상태에서 멈춤 (타지 않음)
            if (
              this.currentStep === TutorialStep.PICK_PERFECT &&
              slot.stage === CookingStage.PERFECT
            ) {
              slot.cookTime = 0; // 시간만 리셋하고 상태는 유지
              continue;
            }

            const prevStage = slot.stage;
            slot.stage = this.getNextStage(slot.stage);
            slot.cookTime = 0;
            this.updateGrillCell(row, col);

            // BURN_WARNING 단계에서 타면 작업 트레이로 이동하고 확인 버튼 활성화
            if (
              this.currentStep === TutorialStep.BURN_WARNING &&
              slot.stage === CookingStage.BURNT &&
              !this.hasBurnt
            ) {
              this.hasBurnt = true;
              // 잠시 타는 와플 보여준 후 작업 트레이로 이동
              this.time.delayedCall(1000, () => {
                this.moveToWorkTray(row, col);
                // 메시지 변경 및 확인 버튼 활성화
                this.instructionText.setText(
                  "와플이 타버렸어요!\n확인을 눌러주세요.",
                );
                this.enableConfirmButton();
              });
            }

            // PICK_PERFECT 단계에서 퍼펙트가 되면 하이라이트
            if (
              this.currentStep === TutorialStep.PICK_PERFECT &&
              slot.stage === CookingStage.PERFECT &&
              prevStage !== CookingStage.PERFECT
            ) {
              this.highlightGrillCenter();
            }
          }
        }
      }
    }

    // 강불 타이머
    if (this.isStrongFire) {
      this.strongFireRemaining -= deltaSeconds;
      if (this.strongFireRemaining <= 0) {
        this.isStrongFire = false;
        this.fireImage.setTexture("small_fire");
      }
    }
  }

  private completeTutorial(): void {
    // 튜토리얼 완료 상태 저장
    localStorage.setItem(TUTORIAL_CONFIG.STORAGE_KEY, "true");

    this.showCompletionPopup();
  }

  private showCompletionPopup(): void {
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    const overlay = this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7,
      )
      .setDepth(600);
    popupObjects.push(overlay);

    const popup = this.add
      .rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 450, 300, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(601);
    popupObjects.push(popup);

    const titleText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 90, "튜토리얼 완료!", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "36px",
        color: "#4CAF50",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(602);
    popupObjects.push(titleText);

    const messageText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 20,
        "이제 와플을 만들 준비가 되었어요!\n1일차부터 시작해볼까요?",
        {
          fontFamily: "Pretendard",
          padding: { y: 5 },
          fontSize: "22px",
          color: "#5D4E37",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(602);
    popupObjects.push(messageText);

    const startBtn = this.add
      .rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2 + 80, 200, 60, 0x4caf50)
      .setStrokeStyle(3, 0x388e3c)
      .setInteractive({ useHandCursor: true })
      .setDepth(602);
    popupObjects.push(startBtn);

    const startBtnText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 80, "시작하기", {
        fontFamily: "Pretendard",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(603);
    popupObjects.push(startBtnText);

    startBtn.on("pointerdown", () => {
      ScreenManager.getInstance().showScreen('home');
    });

    startBtn.on("pointerover", () => startBtn.setFillStyle(0x388e3c));
    startBtn.on("pointerout", () => startBtn.setFillStyle(0x4caf50));
  }
}
