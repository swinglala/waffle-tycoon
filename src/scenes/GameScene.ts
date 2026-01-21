import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import {
  CookingStage,
  GrillSlot,
  TrayWaffle,
  GameState,
  Customer,
  CustomerType,
  COOKING_TIMES,
  WAFFLE_PRICES,
  GAME_CONFIG,
  CUSTOMER_WAIT_MULTIPLIER,
} from "../types/game";

const GRID_SIZE = 3;
const CELL_SIZE = Math.floor(GAME_WIDTH / 4); // 180px
const CELL_GAP = 6;

// 익힘 단계별 이미지 키
const STAGE_IMAGE_KEYS: Record<CookingStage, string> = {
  [CookingStage.EMPTY]: "",
  [CookingStage.BATTER]: "waffle_batter",
  [CookingStage.UNDERCOOKED]: "waffle_undercooked",
  [CookingStage.COOKED]: "waffle_cooked",
  [CookingStage.PERFECT]: "waffle_perfect",
  [CookingStage.BURNT]: "waffle_burnt",
};

// 완성품 (잼 바른 와플) 이미지 키
const JAM_WAFFLE_IMAGE_KEYS: Record<CookingStage, string> = {
  [CookingStage.EMPTY]: "",
  [CookingStage.BATTER]: "",
  [CookingStage.UNDERCOOKED]: "waffle_jam_undercooked",
  [CookingStage.COOKED]: "waffle_jam_cooked",
  [CookingStage.PERFECT]: "waffle_jam_perfect",
  [CookingStage.BURNT]: "",
};

// 초반 라운드 손님 종류 (Day 1~3)
const EARLY_CUSTOMER_TYPES: CustomerType[] = [
  "dog",
  "hamster",
  "turtle",
  "horse",
];
// 후반 라운드 손님 종류 (Day 4+)
const ALL_CUSTOMER_TYPES: CustomerType[] = [
  "dog",
  "hamster",
  "turtle",
  "horse",
  "bear",
  "rabbit",
];

export class GameScene extends Phaser.Scene {
  // 게임 상태
  private gameState: GameState = {
    day: 1,
    money: 0,
    targetMoney: 20000,
    timeRemaining: 60,
    maxTime: 60,
    isStrongFire: false,
    strongFireRemaining: 0,
  };

  // 3x3 굽는판
  private grillSlots: GrillSlot[][] = [];
  private grillGraphics: Phaser.GameObjects.Image[][] = [];
  private grillWaffleImages: (Phaser.GameObjects.Image | null)[][] = [];

  // 작업 트레이 (잼 안바른 와플)
  private workTray: TrayWaffle[] = [];
  private workTrayContainer!: Phaser.GameObjects.Container;

  // 완성품 트레이 (잼 바른 와플)
  private finishedTray: TrayWaffle[] = [];
  private finishedTrayContainer!: Phaser.GameObjects.Container;

  // UI 요소
  private moneyText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Rectangle;
  private dayText!: Phaser.GameObjects.Text;
  private fireButton!: Phaser.GameObjects.Rectangle;
  private fireButtonText!: Phaser.GameObjects.Text;
  private workTrayCountText!: Phaser.GameObjects.Text;
  private finishedTrayCountText!: Phaser.GameObjects.Text;

  // 손님 시스템 (고정 슬롯 방식)
  private customerSlots: (Customer | null)[] = [null, null, null]; // 3개 고정 슬롯
  private customerUIObjects: Phaser.GameObjects.GameObject[][] = [];
  private nextCustomerId = 1;
  private customerSpawnTimer = 0;
  private nextSpawnTime = 0;
  private isGameOver = false;

  // 손님 슬롯 X 좌표
  private readonly CUSTOMER_SLOT_X = [150, 330, 510];

  // 레이아웃 Y 좌표
  private readonly HEADER_Y = 45;
  private readonly TIME_BAR_Y = 90; // 시간 바 위치
  private readonly CUSTOMER_Y = 190; // 손님 영역 중심 (위로 이동)
  private readonly CUSTOMER_HEIGHT = 180; // 손님 영역 높이
  private readonly FINISHED_TRAY_Y = 355;
  private readonly TOPPING_BTN_Y = 455; // 버튼 영역 (2배 높이 90px)
  private readonly WORK_TRAY_Y = 535;
  private readonly GRILL_START_Y = 680; // 작업트레이와 10px 갭

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.initializeGrill();
    this.createBackground();
    this.createUI();
    this.createCustomerZone();
    this.createFinishedTrayUI();
    this.createToppingButtons();
    this.createWorkTrayUI();
    this.createGrillUI();
    this.createFireButton();
    this.initializeCustomerSystem();
  }

  private initializeCustomerSystem(): void {
    this.nextSpawnTime = this.getRandomSpawnTime();
    this.customerSpawnTimer = 0;
  }

  private getRandomSpawnTime(): number {
    return (
      GAME_CONFIG.CUSTOMER_SPAWN_MIN +
      Math.random() *
        (GAME_CONFIG.CUSTOMER_SPAWN_MAX - GAME_CONFIG.CUSTOMER_SPAWN_MIN)
    );
  }

  private getRandomWaitTime(): number {
    return (
      GAME_CONFIG.CUSTOMER_WAIT_MIN +
      Math.random() *
        (GAME_CONFIG.CUSTOMER_WAIT_MAX - GAME_CONFIG.CUSTOMER_WAIT_MIN)
    );
  }

  private getRandomOrderCount(): number {
    return (
      GAME_CONFIG.CUSTOMER_ORDER_MIN +
      Math.floor(
        Math.random() *
          (GAME_CONFIG.CUSTOMER_ORDER_MAX - GAME_CONFIG.CUSTOMER_ORDER_MIN + 1),
      )
    );
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

  private createUI(): void {
    // 상단 바 배경
    this.add
      .rectangle(GAME_WIDTH / 2, this.HEADER_Y, GAME_WIDTH - 20, 50, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setDepth(10);

    // Day 표시
    this.dayText = this.add
      .text(30, this.HEADER_Y - 10, `Day ${this.gameState.day}`, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setDepth(11);

    // 돈 표시
    this.moneyText = this.add
      .text(
        GAME_WIDTH / 2,
        this.HEADER_Y - 10,
        `💰 ${this.gameState.money.toLocaleString()} / ${this.gameState.targetMoney.toLocaleString()}원`,
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#5D4E37",
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(11);

    // 시간 바 (헤더 바로 아래)
    const barWidth = GAME_WIDTH - 80;
    const barHeight = 24;

    // 바 배경 (회색)
    this.add
      .rectangle(GAME_WIDTH / 2, this.TIME_BAR_Y, barWidth, barHeight, 0xcccccc)
      .setStrokeStyle(2, 0x999999)
      .setDepth(10);

    // 시간 바 (빨간색, 왼쪽 정렬)
    this.timeBar = this.add
      .rectangle(40, this.TIME_BAR_Y, barWidth, barHeight - 4, 0xe85a4f)
      .setOrigin(0, 0.5)
      .setDepth(11);

    // 시간 텍스트 (바 위에 표시)
    this.timeText = this.add
      .text(
        GAME_WIDTH / 2,
        this.TIME_BAR_Y,
        this.formatTime(this.gameState.timeRemaining),
        {
          fontFamily: "Arial",
          fontSize: "14px",
          color: "#FFFFFF",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(12);
  }

  private createCustomerZone(): void {
    // 손님 영역 배경 이미지 (헤더부터 손님 영역까지)
    const bgHeight = this.FINISHED_TRAY_Y - 20; // 헤더부터 완성품 트레이 전까지
    this.add
      .image(GAME_WIDTH / 2, bgHeight / 2, "customer_background")
      .setDisplaySize(GAME_WIDTH, bgHeight)
      .setDepth(0); // 배경은 가장 뒤

    // 손님 UI 배열 초기화
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      this.customerUIObjects.push([]);
    }

    this.updateCustomerDisplay();
  }

  private spawnCustomer(): void {
    if (this.isGameOver) return;

    // 빈 슬롯 찾기
    const emptySlotIndex = this.customerSlots.findIndex(
      (slot) => slot === null,
    );
    if (emptySlotIndex === -1) return; // 빈 슬롯 없음

    // 라운드에 따른 손님 종류 선택
    const availableTypes =
      this.gameState.day <= 3 ? EARLY_CUSTOMER_TYPES : ALL_CUSTOMER_TYPES;
    const customerType =
      availableTypes[Math.floor(Math.random() * availableTypes.length)];

    // 손님 종류에 따른 대기 시간 적용
    const baseWaitTime = this.getRandomWaitTime();
    const waitTime = baseWaitTime * CUSTOMER_WAIT_MULTIPLIER[customerType];

    const customer: Customer = {
      id: this.nextCustomerId++,
      type: customerType,
      waffleCount: this.getRandomOrderCount(),
      waitTime: waitTime,
      maxWaitTime: waitTime,
    };

    this.customerSlots[emptySlotIndex] = customer;
    // updateCustomerDisplay는 updateCustomers에서 호출됨
  }

  private updateCustomerDisplay(): void {
    // 기존 UI 오브젝트 제거
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      for (const obj of this.customerUIObjects[i]) {
        obj.destroy();
      }
      this.customerUIObjects[i] = [];
    }

    // 손님 표시 (고정 슬롯)
    const slotY = this.CUSTOMER_Y + 20;

    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      const slotX = this.CUSTOMER_SLOT_X[i];
      const customer = this.customerSlots[i];

      if (customer) {
        this.createCustomerUI(slotX, slotY, customer, i);
      }
      // 빈 슬롯은 표시하지 않음
    }
  }

  private createCustomerUI(
    x: number,
    y: number,
    customer: Customer,
    index: number,
  ): void {
    // 손님 이미지 (게이지가 25% 이하면 화난 버전) - 정사각형 비율 유지
    const gaugeRatio = customer.waitTime / customer.maxWaitTime;
    const isAngry = gaugeRatio <= 0.25;
    const imageKey = isAngry
      ? `customer_${customer.type}_angry`
      : `customer_${customer.type}`;
    const imageSize = 250; // 정사각형으로 표시
    const icon = this.add
      .image(x, y + 15, imageKey)
      .setDisplaySize(imageSize, imageSize)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    icon.on("pointerdown", () => this.onCustomerClick(index));

    // 주문 표시 (손님 이미지 위에)
    const orderText = this.add
      .text(x, y + 50, `🧇 x ${customer.waffleCount}`, {
        fontFamily: "Arial",
        fontSize: "30px",
        color: "#5D4E37",
        fontStyle: "bold",
        backgroundColor: "#FFFFFF",
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.customerUIObjects[index].push(icon, orderText);
  }

  private onCustomerClick(index: number): void {
    const customer = this.customerSlots[index];
    if (!customer) return;
    if (this.isGameOver) return;

    // 완성품 개수 확인
    if (this.finishedTray.length < customer.waffleCount) {
      this.showMessage(
        `⚠️ 완성품이 부족해요! (${this.finishedTray.length}/${customer.waffleCount})`,
      );
      return;
    }

    // 판매 처리
    let totalPrice = 0;
    for (let i = 0; i < customer.waffleCount; i++) {
      const waffle = this.finishedTray.shift()!;
      totalPrice += WAFFLE_PRICES[waffle.stage];
    }

    this.gameState.money += totalPrice;
    this.customerSlots[index] = null; // 슬롯 비우기 (위치 유지)

    this.updateCustomerDisplay();
    this.updateFinishedTrayDisplay();

    this.showMessage(`💰 +${totalPrice.toLocaleString()}원!`);
  }

  private checkAngryStateChanges(): boolean {
    // 화난 상태 변화 체크 (25% 이하가 되면 업데이트 필요)
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      const customer = this.customerSlots[i];
      if (!customer) continue;

      const gaugeRatio = customer.waitTime / customer.maxWaitTime;
      const isAngry = gaugeRatio <= 0.25;

      // 막 화난 상태로 변했으면 업데이트 필요
      if (isAngry && gaugeRatio > 0.24) {
        return true;
      }
    }
    return false;
  }

  private updateCustomers(deltaSeconds: number): void {
    if (this.isGameOver) return;

    let customerChanged = false;

    // 손님 대기 시간 감소 (고정 슬롯)
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      const customer = this.customerSlots[i];
      if (!customer) continue;

      customer.waitTime -= deltaSeconds;

      if (customer.waitTime <= 0) {
        // 손님이 화나서 떠남
        this.customerSlots[i] = null;
        this.showMessage("😠 손님이 화나서 떠났어요!");
        customerChanged = true;
      }
    }

    // 손님 스폰 타이머
    this.customerSpawnTimer += deltaSeconds;
    if (this.customerSpawnTimer >= this.nextSpawnTime) {
      const hadEmptySlot = this.customerSlots.some((slot) => slot === null);
      this.spawnCustomer();
      this.customerSpawnTimer = 0;
      this.nextSpawnTime = this.getRandomSpawnTime();
      if (hadEmptySlot) {
        customerChanged = true;
      }
    }

    // 손님 변경 또는 화난 상태 변화 시 UI 업데이트
    if (customerChanged || this.checkAngryStateChanges()) {
      this.updateCustomerDisplay();
    }
  }

  private createFinishedTrayUI(): void {
    // 완성품 트레이 배경 이미지
    this.add
      .image(GAME_WIDTH / 2, this.FINISHED_TRAY_Y, "finished_plate")
      .setDisplaySize(GAME_WIDTH - 40, 70)
      .setDepth(5);

    // 개수 표시
    this.finishedTrayCountText = this.add
      .text(GAME_WIDTH - 30, this.FINISHED_TRAY_Y - 25, "0개", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(6);

    // 트레이 컨테이너
    this.finishedTrayContainer = this.add
      .container(60, this.FINISHED_TRAY_Y + 5)
      .setDepth(6);
  }

  private createToppingButtons(): void {
    const buttonSize = 120; // 정사각형 버튼
    const leftX = 40 + buttonSize / 2; // 왼쪽 끝
    const rightX = GAME_WIDTH - 40 - buttonSize / 2; // 오른쪽 끝

    // 잼 버튼 (왼쪽) - 이미지 버튼
    const jamButtonImg = this.add
      .image(leftX, this.TOPPING_BTN_Y, "btn_apple_jam")
      .setDisplaySize(buttonSize, buttonSize)
      .setInteractive({ useHandCursor: true });

    jamButtonImg.on("pointerdown", () => this.onJamButtonClick());

    // 쓰레기통 버튼 (오른쪽) - 이미지 버튼
    const trashButtonImg = this.add
      .image(rightX, this.TOPPING_BTN_Y, "btn_trash")
      .setDisplaySize(buttonSize, buttonSize)
      .setInteractive({ useHandCursor: true });

    trashButtonImg.on("pointerdown", () => this.onTrashButtonClick());
  }

  private createWorkTrayUI(): void {
    // 작업 트레이 배경 이미지
    this.add
      .image(GAME_WIDTH / 2, this.WORK_TRAY_Y, "ready_tray")
      .setDisplaySize(GAME_WIDTH - 40, 60);

    // 개수 표시
    this.workTrayCountText = this.add
      .text(GAME_WIDTH - 30, this.WORK_TRAY_Y - 20, "0개", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);

    // 트레이 컨테이너
    this.workTrayContainer = this.add.container(60, this.WORK_TRAY_Y + 5);
  }

  private createGrillUI(): void {
    const grillCenterX = GAME_WIDTH / 2;
    const grillTotalWidth = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;

    // 셀들의 실제 중심 Y (중간 행 기준)
    const grillCenterY = this.GRILL_START_Y + (CELL_SIZE + CELL_GAP);

    // 굽는판 배경 (셀들을 감싸도록)
    this.add
      .rectangle(
        grillCenterX,
        grillCenterY,
        grillTotalWidth + 30,
        grillTotalHeight + 30,
        0x5d4e37,
      )
      .setStrokeStyle(4, 0x3d2e17);

    // 3x3 그리드 시작점
    const startX = grillCenterX - grillTotalWidth / 2 + CELL_SIZE / 2;
    const startY = this.GRILL_START_Y;

    // 3x3 그리드
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = startX + col * (CELL_SIZE + CELL_GAP);
        const y = startY + row * (CELL_SIZE + CELL_GAP);

        // 빈 슬롯 이미지
        const cell = this.add
          .image(x, y, "grill_slot_empty")
          .setDisplaySize(CELL_SIZE, CELL_SIZE)
          .setInteractive({ useHandCursor: true });

        this.grillGraphics[row][col] = cell;

        cell.on("pointerdown", () => this.onGrillCellClick(row, col));
      }
    }
  }

  private createFireButton(): void {
    // 굽는판 아래 중앙에 배치
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const buttonY = this.GRILL_START_Y + grillTotalHeight - 35;

    this.fireButton = this.add
      .rectangle(GAME_WIDTH / 2, buttonY, 200, 60, 0xe85a4f)
      .setStrokeStyle(3, 0xb8453c)
      .setInteractive({ useHandCursor: true });

    this.fireButtonText = this.add
      .text(GAME_WIDTH / 2, buttonY, "🔥 강불 (3초)", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.fireButton.on("pointerdown", () => this.onFireButtonClick());
  }

  private onGrillCellClick(row: number, col: number): void {
    const slot = this.grillSlots[row][col];

    if (slot.stage === CookingStage.EMPTY) {
      slot.stage = CookingStage.BATTER;
      slot.cookTime = 0;
      this.updateGrillCell(row, col);
    } else if (slot.stage !== CookingStage.BATTER) {
      this.moveToWorkTray(row, col);
    }
  }

  private moveToWorkTray(row: number, col: number): void {
    const slot = this.grillSlots[row][col];

    this.workTray.push({
      stage: slot.stage,
      hasJam: false,
    });

    slot.stage = CookingStage.EMPTY;
    slot.cookTime = 0;
    this.updateGrillCell(row, col);
    this.updateWorkTrayDisplay();
  }

  private onFireButtonClick(): void {
    if (!this.gameState.isStrongFire) {
      this.gameState.isStrongFire = true;
      this.gameState.strongFireRemaining = 3;

      this.fireButton.setFillStyle(0xff6b5b);
      this.fireButtonText.setText("🔥🔥 강불 작동중!");
    }
  }

  private onJamButtonClick(): void {
    if (this.workTray.length === 0) {
      this.showMessage("⚠️ 작업 트레이가 비어있어요");
      return;
    }

    const waffle = this.workTray[0]; // 항상 첫 번째 와플

    if (waffle.stage === CookingStage.BURNT) {
      this.showMessage("💀 탄 와플은 판매할 수 없어요!");
      return;
    }

    waffle.hasJam = true;
    this.finishedTray.push(waffle);
    this.workTray.shift(); // 첫 번째 제거

    this.updateWorkTrayDisplay();
    this.updateFinishedTrayDisplay();
  }

  private onTrashButtonClick(): void {
    if (this.workTray.length === 0) {
      this.showMessage("⚠️ 작업 트레이가 비어있어요");
      return;
    }

    this.workTray.shift(); // 첫 번째 제거
    this.updateWorkTrayDisplay();

    this.showMessage("🗑️ 버렸어요");
  }

  private showMessage(text: string): void {
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#5D4E37",
        backgroundColor: "#FFFFFF",
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: msg,
      y: msg.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => msg.destroy(),
    });
  }

  private updateGrillCell(row: number, col: number): void {
    const slot = this.grillSlots[row][col];
    const cellImage = this.grillGraphics[row][col];

    // 기존 와플 이미지 제거
    if (this.grillWaffleImages[row][col]) {
      this.grillWaffleImages[row][col]!.destroy();
      this.grillWaffleImages[row][col] = null;
    }

    // 와플이 있으면 이미지 추가
    if (slot.stage !== CookingStage.EMPTY) {
      const imageKey = STAGE_IMAGE_KEYS[slot.stage];
      if (imageKey) {
        const waffleImage = this.add
          .image(cellImage.x, cellImage.y, imageKey)
          .setDisplaySize(CELL_SIZE - 20, CELL_SIZE - 20);
        this.grillWaffleImages[row][col] = waffleImage;
      }
    }
  }

  private updateWorkTrayDisplay(): void {
    this.workTrayContainer.removeAll(true);

    const displayCount = Math.min(this.workTray.length, 12);
    for (let i = 0; i < displayCount; i++) {
      const waffle = this.workTray[i];
      const imageKey = STAGE_IMAGE_KEYS[waffle.stage];

      if (imageKey) {
        const waffleImg = this.add
          .image(i * 30, 0, imageKey)
          .setDisplaySize(100, 100);
        this.workTrayContainer.add(waffleImg);
      }
    }

    this.workTrayCountText.setText(`${this.workTray.length}개`);
  }

  private updateFinishedTrayDisplay(): void {
    this.finishedTrayContainer.removeAll(true);

    const displayCount = Math.min(this.finishedTray.length, 12);
    for (let i = 0; i < displayCount; i++) {
      const waffle = this.finishedTray[i];
      const imageKey = JAM_WAFFLE_IMAGE_KEYS[waffle.stage];

      if (imageKey) {
        const waffleImg = this.add
          .image(i * 30, 0, imageKey)
          .setDisplaySize(100, 100);
        this.finishedTrayContainer.add(waffleImg);
      }
    }

    this.finishedTrayCountText.setText(`${this.finishedTray.length}개`);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `⏱️ ${mins}:${secs.toString().padStart(2, "0")}`;
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
    if (this.isGameOver) return;

    const deltaSeconds = delta / 1000;
    const cookingSpeed = this.gameState.isStrongFire ? 2 : 1;

    // 굽는판 업데이트
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.grillSlots[row][col];

        if (
          slot.stage !== CookingStage.EMPTY &&
          slot.stage !== CookingStage.BURNT
        ) {
          slot.cookTime += deltaSeconds * cookingSpeed;

          const requiredTime = COOKING_TIMES[slot.stage];
          if (slot.cookTime >= requiredTime) {
            slot.stage = this.getNextStage(slot.stage);
            slot.cookTime = 0;
            this.updateGrillCell(row, col);
          }
        }
      }
    }

    // 강불 타이머
    if (this.gameState.isStrongFire) {
      this.gameState.strongFireRemaining -= deltaSeconds;
      if (this.gameState.strongFireRemaining <= 0) {
        this.gameState.isStrongFire = false;
        this.fireButton.setFillStyle(0xe85a4f);
        this.fireButtonText.setText("🔥 강불 (3초)");
      }
    }

    // 손님 업데이트
    this.updateCustomers(deltaSeconds);

    // 게임 시간 업데이트
    this.gameState.timeRemaining -= deltaSeconds;
    if (this.gameState.timeRemaining <= 0) {
      this.gameState.timeRemaining = 0;
      this.onDayEnd();
    }
    this.updateUI();
  }

  private onDayEnd(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    const success = this.gameState.money >= this.gameState.targetMoney;

    // 결과 오버레이 배경
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0.7,
      )
      .setDepth(200);

    // 결과 패널
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 350, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(201);

    // 결과 텍스트
    const resultTitle = success ? "🎉 목표 달성!" : "😢 목표 미달성";
    const titleColor = success ? "#4CAF50" : "#E85A4F";

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, resultTitle, {
        fontFamily: "Arial",
        fontSize: "36px",
        color: titleColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(202);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 50,
        `Day ${this.gameState.day} 결과`,
        {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#5D4E37",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        `벌은 돈: ${this.gameState.money.toLocaleString()}원\n목표 금액: ${this.gameState.targetMoney.toLocaleString()}원`,
        {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#5D4E37",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);

    // 버튼
    if (success) {
      // 다음 날 버튼
      const nextBtn = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 200, 60, 0x4caf50)
        .setStrokeStyle(3, 0x388e3c)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, "▶ 다음 날", {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#FFFFFF",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(203);

      nextBtn.on("pointerdown", () => this.startNextDay());
    } else {
      // 재도전 버튼
      const retryBtn = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 200, 60, 0xe85a4f)
        .setStrokeStyle(3, 0xb8453c)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, "🔄 재도전", {
          fontFamily: "Arial",
          fontSize: "22px",
          color: "#FFFFFF",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(203);

      retryBtn.on("pointerdown", () => this.retryDay());
    }
  }

  private startNextDay(): void {
    this.gameState.day += 1;
    this.gameState.money = 0;
    this.gameState.targetMoney += GAME_CONFIG.TARGET_INCREASE;
    this.gameState.timeRemaining = GAME_CONFIG.DAY_TIME;
    this.resetDayState();
  }

  private retryDay(): void {
    this.gameState.money = 0;
    this.gameState.timeRemaining = GAME_CONFIG.DAY_TIME;
    this.resetDayState();
  }

  private resetDayState(): void {
    // 게임 상태 리셋
    this.isGameOver = false;
    this.customerSlots = [null, null, null];
    this.workTray = [];
    this.finishedTray = [];
    this.customerSpawnTimer = 0;
    this.nextSpawnTime = this.getRandomSpawnTime();

    // 굽는판 초기화
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grillSlots[row][col] = {
          stage: CookingStage.EMPTY,
          cookTime: 0,
        };
        this.updateGrillCell(row, col);
      }
    }

    // UI 업데이트
    this.updateCustomerDisplay();
    this.updateWorkTrayDisplay();
    this.updateFinishedTrayDisplay();

    // 씬 재시작
    this.scene.restart();
  }

  private updateUI(): void {
    this.dayText.setText(`Day ${this.gameState.day}`);
    this.moneyText.setText(
      `💰 ${this.gameState.money.toLocaleString()} / ${this.gameState.targetMoney.toLocaleString()}원`,
    );
    this.timeText.setText(
      this.formatTime(Math.ceil(this.gameState.timeRemaining)),
    );

    // 시간 바 업데이트
    const barWidth = GAME_WIDTH - 80;
    const timeRatio = this.gameState.timeRemaining / this.gameState.maxTime;
    this.timeBar.width = barWidth * timeRatio;

    // 시간에 따라 바 색상 변경
    if (timeRatio > 0.5) {
      this.timeBar.setFillStyle(0x4caf50); // 초록
    } else if (timeRatio > 0.25) {
      this.timeBar.setFillStyle(0xffc107); // 노랑
    } else {
      this.timeBar.setFillStyle(0xe85a4f); // 빨강
    }
  }
}
