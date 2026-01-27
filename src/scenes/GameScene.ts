import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../config/constants";
import {
  CookingStage,
  GrillSlot,
  TrayWaffle,
  GameState,
  Customer,
  CustomerType,
  JamType,
  COOKING_TIMES,
  WAFFLE_PRICES,
  GAME_CONFIG,
  CUSTOMER_CONFIG,
  JAM_PRICE_MULTIPLIER,
  STAR_CONFIG,
  getDayTarget,
  getSpawnInterval,
} from "../types/game";
import { HeartManager } from "../utils/HeartManager";
import { ProgressManager } from "../utils/ProgressManager";

const GRID_SIZE = 3;
const CELL_SIZE = Math.floor(GAME_WIDTH / 4); // 180px
const CELL_GAP = 6;

// 화구별 불 세기 배율 (중앙이 가장 뜨겁고, 가장자리로 갈수록 약함)
// [row][col] 0-indexed
const GRILL_HEAT_MULTIPLIER: number[][] = [
  [1.0, 1.2, 1.0], // 가장자리, 상단중앙, 가장자리
  [1.2, 1.5, 1.2], // 좌측중앙, 중앙(가장빠름), 우측중앙
  [1.0, 1.2, 1.0], // 가장자리, 하단중앙, 가장자리
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

// 완성품 (잼 바른 와플) 이미지 키 - 잼 종류별
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

// 모든 손님 종류
const ALL_CUSTOMER_TYPES: CustomerType[] = [
  "dog",
  "hamster",
  "turtle",
  "horse",
  "bear",
  "rabbit",
  "fox",
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

  // 작업 트레이 (잼 안바른 와플) - 슬롯 기반
  private workTray: TrayWaffle[] = [];
  private workTraySlotImages: Phaser.GameObjects.Image[] = [];
  private workTrayWaffleImages: (Phaser.GameObjects.Image | null)[] = [];

  // 완성품 트레이 (잼 바른 와플) - 슬롯 기반
  private finishedTray: TrayWaffle[] = [];
  private finishedTraySlotImages: Phaser.GameObjects.Image[] = [];
  private finishedTrayWaffleImages: (Phaser.GameObjects.Image | null)[] = [];

  // UI 요소
  private moneyText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Rectangle;
  private dayText!: Phaser.GameObjects.Text;
  private fireImage!: Phaser.GameObjects.Image;
  private workTrayCountText!: Phaser.GameObjects.Text;
  private finishedTrayCountText!: Phaser.GameObjects.Text;

  // 손님 시스템 (고정 슬롯 방식)
  private customerSlots: (Customer | null)[] = [null, null, null]; // 3개 고정 슬롯
  private customerUIObjects: Phaser.GameObjects.GameObject[][] = [];
  private nextCustomerId = 1;
  private customerSpawnTimer = 0;
  private nextSpawnTime = 0;
  private isGameOver = false;
  private isPaused = false;
  private pausePopupObjects: Phaser.GameObjects.GameObject[] = [];
  private heartManager!: HeartManager;
  private heartUsed = false; // 이번 게임에서 하트 사용 여부
  private progressManager!: ProgressManager;
  private workTrayCapacity = 5; // 준비 트레이 용량
  private finishedTrayCapacity = 5; // 완성 트레이 용량
  private customerCooldowns: Record<CustomerType, number> = {} as Record<
    CustomerType,
    number
  >; // 손님별 쿨다운
  private bearAppearedThisDay = false; // 이번 Day에 곰 등장 여부
  private guaranteedBearTime = 0; // 곰 보장 등장 시간 (남은 시간 기준)

  // 손님 슬롯 X 좌표
  private readonly CUSTOMER_SLOT_X = [150, 330, 510];

  // 레이아웃 Y 좌표
  private readonly HEADER_Y = 45;
  private readonly TIME_BAR_Y = 90; // 시간 바 위치
  private readonly CUSTOMER_Y = 190; // 손님 영역 중심 (위로 이동)
  private readonly FINISHED_TRAY_Y = 355;
  private readonly TOPPING_BTN_Y = 455; // 버튼 영역 (2배 높이 90px)
  private readonly WORK_TRAY_Y = 535;
  private readonly GRILL_START_Y = 680; // 작업트레이와 10px 갭

  constructor() {
    super({ key: "GameScene" });
  }

  init(data?: { day?: number; skipHeart?: boolean }): void {
    // 게임 상태 플래그 초기화 (씬 재시작 시 필수)
    this.isGameOver = false;
    this.isPaused = false;

    // 트레이 초기화
    this.workTray = [];
    this.finishedTray = [];
    this.workTraySlotImages = [];
    this.workTrayWaffleImages = [];
    this.finishedTraySlotImages = [];
    this.finishedTrayWaffleImages = [];

    // 손님 슬롯 초기화
    this.customerSlots = [null, null, null];
    this.customerUIObjects = [];
    this.nextCustomerId = 1;

    // 손님 쿨다운 초기화
    this.customerCooldowns = {} as Record<CustomerType, number>;
    for (const type of ALL_CUSTOMER_TYPES) {
      this.customerCooldowns[type] = 0;
    }

    // 곰 보장 등장 초기화
    this.bearAppearedThisDay = false;
    this.guaranteedBearTime = 0;

    if (data?.day) {
      this.gameState.day = data.day;
      this.gameState.money = 0;
      // 커스텀 목표금액 테이블 사용
      this.gameState.targetMoney = getDayTarget(data.day);
      this.gameState.timeRemaining = GAME_CONFIG.DAY_TIME;
      this.gameState.maxTime = GAME_CONFIG.DAY_TIME;
      this.gameState.isStrongFire = false;
      this.gameState.strongFireRemaining = 0;
      // 다음 날 진행 시 하트 사용 안함 (skipHeart)
      this.heartUsed = data.skipHeart || false;
    } else {
      // 기본값 설정 (첫 시작)
      this.gameState = {
        day: 1,
        money: 0,
        targetMoney: getDayTarget(1),
        timeRemaining: GAME_CONFIG.DAY_TIME,
        maxTime: GAME_CONFIG.DAY_TIME,
        isStrongFire: false,
        strongFireRemaining: 0,
      };
      this.heartUsed = false;
    }
  }

  create(): void {
    this.heartManager = HeartManager.getInstance();
    this.progressManager = ProgressManager.getInstance();

    // 트레이 용량 설정 (업그레이드 반영)
    this.workTrayCapacity = this.progressManager.getWorkTrayCapacity();
    this.finishedTrayCapacity = this.progressManager.getFinishedTrayCapacity();

    // 시간 연장 업그레이드 반영
    const dayTime = this.progressManager.getDayTime();
    this.gameState.timeRemaining = dayTime;
    this.gameState.maxTime = dayTime;

    // 곰 보장 등장 시간 설정 (Day 10+에서만, 남은 시간의 30~70% 지점)
    if (this.gameState.day >= 10) {
      const bearSpawnRatio = 0.3 + Math.random() * 0.4; // 30~70%
      this.guaranteedBearTime = dayTime * bearSpawnRatio;
    }

    // 게임 시작 시 하트 사용
    if (!this.heartUsed) {
      this.heartManager.useHeart();
      this.heartUsed = true;
    }

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
    // Day별 주문 개수 기반 손님 등장 간격 계산
    const { min, max } = getSpawnInterval(
      this.gameState.day,
      this.gameState.maxTime,
    );
    return min + Math.random() * (max - min);
  }

  // 해당 day에 등장 가능한 손님 목록 반환 (쿨다운 고려)
  private getAvailableCustomerTypes(): CustomerType[] {
    return ALL_CUSTOMER_TYPES.filter(
      (type) =>
        CUSTOMER_CONFIG[type].appearDay <= this.gameState.day &&
        this.customerCooldowns[type] <= 0,
    );
  }

  // 가중치 기반 랜덤 손님 선택
  private selectWeightedCustomer(availableTypes: CustomerType[]): CustomerType {
    const weights = availableTypes.map(
      (type) => CUSTOMER_CONFIG[type].spawnWeight,
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return availableTypes[i];
      }
    }
    return availableTypes[availableTypes.length - 1];
  }

  // 손님의 주문 잼 결정 (선호도 + 해금 여부 고려)
  private determineOrderJam(customerType: CustomerType): JamType {
    const config = CUSTOMER_CONFIG[customerType];
    const unlockedJams = this.progressManager.getUnlockedJams();

    // 선호 잼이 있고, 해금되어 있고, 확률 통과 시
    if (
      config.jamPreference &&
      unlockedJams.includes(config.jamPreference) &&
      Math.random() < config.jamPreferenceChance
    ) {
      return config.jamPreference;
    }

    // 그 외에는 해금된 잼 중 랜덤 선택
    return unlockedJams[Math.floor(Math.random() * unlockedJams.length)];
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
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
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
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
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
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "14px",
          color: "#FFFFFF",
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(12);

    // X 버튼 (헤더 오른쪽 끝)
    const closeBtn = this.add
      .circle(GAME_WIDTH - 45, this.HEADER_Y, 20, 0xe85a4f)
      .setStrokeStyle(2, 0xb8453c)
      .setInteractive({ useHandCursor: true })
      .setDepth(11);

    this.add
      .text(GAME_WIDTH - 45, this.HEADER_Y, "✕", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(12);

    closeBtn.on("pointerdown", () => this.showPausePopup());
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

    // 빈 슬롯 찾기 (랜덤하게 선택)
    const emptySlotIndices: number[] = [];
    this.customerSlots.forEach((slot, index) => {
      if (slot === null) emptySlotIndices.push(index);
    });
    if (emptySlotIndices.length === 0) return; // 빈 슬롯 없음

    // 빈 슬롯 중 랜덤 선택
    const emptySlotIndex =
      emptySlotIndices[Math.floor(Math.random() * emptySlotIndices.length)];

    // 현재 day에 등장 가능한 손님 중 가중치 기반 랜덤 선택
    const availableTypes = this.getAvailableCustomerTypes();
    if (availableTypes.length === 0) return;

    const customerType = this.selectWeightedCustomer(availableTypes);
    const config = CUSTOMER_CONFIG[customerType];

    // 손님별 설정 적용
    const waitTime = config.waitTime;

    // 곰 주문 수량은 Day별로 다름
    let orderMin = config.orderMin;
    let orderMax = config.orderMax;
    if (customerType === "bear") {
      const day = this.gameState.day;
      if (day < 20) {
        // Day 10~19: 5개만
        orderMin = 5;
        orderMax = 5;
      } else if (day < 30) {
        // Day 20~29: 5~6개
        orderMin = 5;
        orderMax = 6;
      } else {
        // Day 30+: 5~7개
        orderMin = 5;
        orderMax = 7;
      }
    }

    const orderCount =
      orderMin + Math.floor(Math.random() * (orderMax - orderMin + 1));

    // 주문 잼 결정
    const preferredJam = this.determineOrderJam(customerType);

    const customer: Customer = {
      id: this.nextCustomerId++,
      type: customerType,
      waffleCount: orderCount,
      waitTime: waitTime,
      maxWaitTime: waitTime,
      preferredJam: preferredJam,
    };

    this.customerSlots[emptySlotIndex] = customer;

    // 해당 손님 종류의 쿨다운 설정
    if (config.spawnCooldown > 0) {
      this.customerCooldowns[customerType] = config.spawnCooldown;
    }

    // 곰 등장 추적
    if (customerType === "bear") {
      this.bearAppearedThisDay = true;
    }
    // updateCustomerDisplay는 updateCustomers에서 호출됨
  }

  // 곰 강제 등장 (하루 1회 보장)
  private forceSpawnBear(): void {
    if (this.isGameOver) return;

    // 빈 슬롯 찾기
    const emptySlotIndex = this.customerSlots.findIndex(
      (slot) => slot === null,
    );
    if (emptySlotIndex === -1) return;

    const config = CUSTOMER_CONFIG["bear"];
    const day = this.gameState.day;

    // Day별 주문 수량
    let orderMin = 5;
    let orderMax = 5;
    if (day >= 30) {
      orderMax = 7;
    } else if (day >= 20) {
      orderMax = 6;
    }

    const orderCount =
      orderMin + Math.floor(Math.random() * (orderMax - orderMin + 1));
    const preferredJam = this.determineOrderJam("bear");

    const customer: Customer = {
      id: this.nextCustomerId++,
      type: "bear",
      waffleCount: orderCount,
      waitTime: config.waitTime,
      maxWaitTime: config.waitTime,
      preferredJam: preferredJam,
    };

    this.customerSlots[emptySlotIndex] = customer;
    this.customerCooldowns["bear"] = config.spawnCooldown;
    this.bearAppearedThisDay = true;
    this.guaranteedBearTime = 0; // 보장 시간 리셋 (중복 방지)
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

    // 주문 표시 배경 (손님 이미지 위에)
    const orderBg = this.add
      .rectangle(x, y + 50, 130, 50, 0xffffff)
      .setStrokeStyle(2, 0x8b6914)
      .setDepth(3);

    // 주문 와플 이미지 (손님이 원하는 잼에 따라)
    const orderImageKey = `order_${customer.preferredJam}_jam`;
    const orderImage = this.add
      .image(x - 30, y + 50, orderImageKey)
      .setDisplaySize(40, 40)
      .setDepth(4);

    // 주문 개수 텍스트
    const orderText = this.add
      .text(x + 20, y + 50, `x ${customer.waffleCount}`, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "26px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.customerUIObjects[index].push(icon, orderBg, orderImage, orderText);
  }

  private onCustomerClick(index: number): void {
    const customer = this.customerSlots[index];
    if (!customer) return;
    if (this.isGameOver) return;

    const config = CUSTOMER_CONFIG[customer.type];

    // 완성품 개수 확인
    if (this.finishedTray.length < customer.waffleCount) {
      this.showMessage(
        `완성품이 부족해요! (${this.finishedTray.length}/${customer.waffleCount})`,
      );
      return;
    }

    // 손님이 원하는 잼과 일치하는 와플 확인
    const matchingWaffles = this.finishedTray.filter(
      (w) => w.jamType === customer.preferredJam,
    );
    if (matchingWaffles.length < customer.waffleCount) {
      const jamName =
        customer.preferredJam === JamType.APPLE
          ? "사과잼"
          : customer.preferredJam === JamType.BERRY
            ? "베리잼"
            : "피스타치오잼";
      this.showMessage(
        `${jamName} 와플이 부족해요! (${matchingWaffles.length}/${customer.waffleCount})`,
      );
      return;
    }

    // 여우는 퍼펙트 와플만 가능
    if (config.requiresPerfect) {
      const perfectWaffles = matchingWaffles.filter(
        (w) => w.stage === CookingStage.PERFECT,
      );
      if (perfectWaffles.length < customer.waffleCount) {
        this.showMessage(
          `🦊 여우는 퍼펙트 와플만 원해요! (${perfectWaffles.length}/${customer.waffleCount})`,
        );
        return;
      }
    }

    // 판매 처리 - 잼이 일치하는 와플만 사용
    const batterBonus = this.progressManager.getBatterPriceBonus();
    let totalPrice = 0;
    let soldCount = 0;

    // 여우는 퍼펙트만, 아니면 일치하는 잼 와플 판매
    for (
      let i = this.finishedTray.length - 1;
      i >= 0 && soldCount < customer.waffleCount;
      i--
    ) {
      const waffle = this.finishedTray[i];
      if (waffle.jamType !== customer.preferredJam) continue;
      if (config.requiresPerfect && waffle.stage !== CookingStage.PERFECT)
        continue;

      // 조건 만족 - 판매
      this.finishedTray.splice(i, 1);
      const basePrice = WAFFLE_PRICES[waffle.stage];
      const jamMultiplier = JAM_PRICE_MULTIPLIER[waffle.jamType];
      const wafflePrice = Math.floor((basePrice + batterBonus) * jamMultiplier);
      totalPrice += wafflePrice;
      soldCount++;
    }

    this.gameState.money += totalPrice;
    this.customerSlots[index] = null; // 슬롯 비우기 (위치 유지)

    this.updateCustomerDisplay();
    this.updateFinishedTrayDisplay();

    this.showMessage(`+${totalPrice.toLocaleString()}원!`);
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
      const hasEmptySlot = this.customerSlots.some((slot) => slot === null);
      if (hasEmptySlot) {
        this.spawnCustomer();
        this.customerSpawnTimer = 0;
        this.nextSpawnTime = this.getRandomSpawnTime();
        customerChanged = true;
      }
      // 슬롯이 꽉 찼으면 타이머 리셋하지 않음 - 빈 슬롯 생기면 바로 스폰
    }

    // 곰 보장 등장 체크 (Day 10+, 아직 안 나왔고, 보장 시간 도달)
    if (
      this.gameState.day >= 10 &&
      !this.bearAppearedThisDay &&
      this.gameState.timeRemaining <= this.guaranteedBearTime &&
      this.guaranteedBearTime > 0
    ) {
      const hasEmptySlot = this.customerSlots.some((slot) => slot === null);
      if (hasEmptySlot) {
        this.forceSpawnBear();
        customerChanged = true;
      }
    }

    // 손님 변경 또는 화난 상태 변화 시 UI 업데이트
    if (customerChanged || this.checkAngryStateChanges()) {
      this.updateCustomerDisplay();
    }
  }

  private createFinishedTrayUI(): void {
    // 슬롯 기반 완성품 트레이
    this.finishedTraySlotImages = [];
    this.finishedTrayWaffleImages = [];

    const usableWidth = GAME_WIDTH - 40; // 좌우 여백 20px씩
    const slotWidth = usableWidth / this.finishedTrayCapacity; // 현재 용량으로 등분
    const slotSize = 100; // 슬롯 이미지 고정 크기 (정사각형)
    const startX = 20 + slotWidth / 2; // 첫 슬롯 중심 X

    // 현재 용량만큼 슬롯 생성
    for (let i = 0; i < this.finishedTrayCapacity; i++) {
      const x = startX + i * slotWidth;

      // 슬롯 배경 이미지 (고정 크기, 가운데 정렬)
      const slotImg = this.add
        .image(x, this.FINISHED_TRAY_Y, "finished_tray")
        .setDisplaySize(slotSize, slotSize)
        .setDepth(5);
      this.finishedTraySlotImages.push(slotImg);

      // 와플 이미지 (초기에는 null)
      this.finishedTrayWaffleImages.push(null);
    }

    // 개수 표시
    this.finishedTrayCountText = this.add
      .text(
        GAME_WIDTH - 30,
        this.FINISHED_TRAY_Y - 25,
        "0/" + this.finishedTrayCapacity,
        {
          fontFamily: "UhBeePuding",
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
    const buttonSize = 100; // 잼 버튼 크기
    const trashBtnSize = 100;

    // 해금된 잼 목록
    const unlockedJams = this.progressManager.getUnlockedJams();

    // 잼 버튼 이미지 키 매핑
    const jamImageKeys: Record<JamType, string> = {
      [JamType.NONE]: "",
      [JamType.APPLE]: "btn_apple_jam",
      [JamType.BERRY]: "btn_berry_jam",
      [JamType.PISTACHIO]: "btn_pistachio_jam",
    };

    // 잼 버튼들 (왼쪽에서 시작)
    const startX = 70;
    const gap = 110;

    unlockedJams.forEach((jamType, index) => {
      if (jamType === JamType.NONE) return;

      const x = startX + index * gap;
      const imageKey = jamImageKeys[jamType];

      if (imageKey) {
        const jamBtn = this.add
          .image(x, this.TOPPING_BTN_Y, imageKey)
          .setDisplaySize(buttonSize, buttonSize)
          .setInteractive({ useHandCursor: true });

        // 잼 버튼 클릭 시 바로 바르기
        jamBtn.on("pointerdown", () => this.applyJam(jamType));
      }
    });

    // 쓰레기통 버튼 (오른쪽)
    const trashX = GAME_WIDTH - 70;
    const trashButtonImg = this.add
      .image(trashX, this.TOPPING_BTN_Y, "btn_trash")
      .setDisplaySize(trashBtnSize, trashBtnSize)
      .setInteractive({ useHandCursor: true });

    trashButtonImg.on("pointerdown", () => this.onTrashButtonClick());
  }

  private createWorkTrayUI(): void {
    // 슬롯 기반 작업 트레이
    this.workTraySlotImages = [];
    this.workTrayWaffleImages = [];

    const usableWidth = GAME_WIDTH - 40; // 좌우 여백 20px씩
    const slotWidth = usableWidth / this.workTrayCapacity; // 현재 용량으로 등분
    const slotSize = 85; // 슬롯 이미지 고정 크기 (정사각형)
    const startX = 20 + slotWidth / 2; // 첫 슬롯 중심 X

    // 현재 용량만큼 슬롯 생성
    for (let i = 0; i < this.workTrayCapacity; i++) {
      const x = startX + i * slotWidth;

      // 슬롯 배경 이미지 (고정 크기, 가운데 정렬)
      const slotImg = this.add
        .image(x, this.WORK_TRAY_Y, "ready_tray")
        .setDisplaySize(slotSize, slotSize);
      this.workTraySlotImages.push(slotImg);

      // 와플 이미지 (초기에는 null)
      this.workTrayWaffleImages.push(null);
    }

    // 개수 표시
    this.workTrayCountText = this.add
      .text(
        GAME_WIDTH - 30,
        this.WORK_TRAY_Y - 20,
        "0/" + this.workTrayCapacity,
        {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "14px",
          color: "#FFFFFF",
          fontStyle: "bold",
        },
      )
      .setOrigin(1, 0);
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
    // 굽는판 하단에 불 이미지 배치 (기존 버튼 위치와 유사)
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const fireY = this.GRILL_START_Y + grillTotalHeight - 30;

    // 불 이미지 크기 (500x500을 적절히 스케일링)
    const fireSize = 300;

    this.fireImage = this.add
      .image(GAME_WIDTH / 2, fireY, "small_fire")
      .setDisplaySize(fireSize, fireSize)
      .setDepth(10) // 굽는판 위에 표시
      .setInteractive({ useHandCursor: true });

    this.fireImage.on("pointerdown", () => this.onFireButtonClick());
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
    // 준비 트레이 용량 체크
    if (this.workTray.length >= this.workTrayCapacity) {
      this.showMessage(
        `작업 트레이가 가득 찼어요! (${this.workTray.length}/${this.workTrayCapacity})`,
      );
      return;
    }

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
    if (!this.gameState.isStrongFire) {
      this.gameState.isStrongFire = true;
      this.gameState.strongFireRemaining = 3;

      // 강불 활성화 - 큰 불 이미지로 전환
      this.fireImage.setTexture("big_fire");
    }
  }

  private applyJam(jamType: JamType): void {
    if (this.workTray.length === 0) {
      this.showMessage("작업 트레이가 비어있어요");
      return;
    }

    const waffle = this.workTray[0]; // 항상 첫 번째 와플

    if (waffle.stage === CookingStage.BURNT) {
      this.showMessage("탄 와플은 판매할 수 없어요!");
      return;
    }

    // 완성품 트레이 용량 체크
    if (this.finishedTray.length >= this.finishedTrayCapacity) {
      this.showMessage(
        `완성품 트레이가 가득 찼어요! (${this.finishedTray.length}/${this.finishedTrayCapacity})`,
      );
      return;
    }

    waffle.jamType = jamType;
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
        fontFamily: "UhBeePuding",
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
    const usableWidth = GAME_WIDTH - 40;
    const slotWidth = usableWidth / this.workTrayCapacity; // 현재 용량으로 등분
    const waffleSize = 100; // 변경 전과 동일한 와플 크기
    const startX = 20 + slotWidth / 2;

    // 기존 와플 이미지 제거
    for (const img of this.workTrayWaffleImages) {
      if (img) img.destroy();
    }
    this.workTrayWaffleImages = [];

    // 각 슬롯에 와플 표시
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

    // 용량 표시 (현재/최대)
    this.workTrayCountText.setText(
      `${this.workTray.length}/${this.workTrayCapacity}`,
    );
  }

  private updateFinishedTrayDisplay(): void {
    const usableWidth = GAME_WIDTH - 40;
    const slotWidth = usableWidth / this.finishedTrayCapacity; // 현재 용량으로 등분
    const waffleSize = 100; // 변경 전과 동일한 와플 크기
    const startX = 20 + slotWidth / 2;

    // 기존 와플 이미지 제거
    for (const img of this.finishedTrayWaffleImages) {
      if (img) img.destroy();
    }
    this.finishedTrayWaffleImages = [];

    // 각 슬롯에 와플 표시
    for (let i = 0; i < this.finishedTrayCapacity; i++) {
      const x = startX + i * slotWidth;
      const waffle = this.finishedTray[i];

      if (waffle) {
        // 잼 종류별 이미지 키 사용
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

    // 용량 표시 (현재/최대)
    this.finishedTrayCountText.setText(
      `${this.finishedTray.length}/${this.finishedTrayCapacity}`,
    );
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
    if (this.isGameOver || this.isPaused) return;

    const deltaSeconds = delta / 1000;

    // 손님별 쿨다운 감소
    for (const type of ALL_CUSTOMER_TYPES) {
      if (this.customerCooldowns[type] > 0) {
        this.customerCooldowns[type] -= deltaSeconds;
      }
    }
    // 기본 굽기 속도 (업그레이드 반영) * 강불 배율
    const baseSpeedMultiplier =
      this.progressManager.getCookingSpeedMultiplier();
    const strongFireMultiplier = this.gameState.isStrongFire ? 2 : 1;
    const cookingSpeed = baseSpeedMultiplier * strongFireMultiplier;

    // 굽는판 업데이트
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const slot = this.grillSlots[row][col];

        if (
          slot.stage !== CookingStage.EMPTY &&
          slot.stage !== CookingStage.BURNT
        ) {
          // 화구별 불 세기 적용
          const heatMultiplier = GRILL_HEAT_MULTIPLIER[row][col];
          slot.cookTime += deltaSeconds * cookingSpeed * heatMultiplier;

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
        // 강불 종료 - 작은 불 이미지로 전환
        this.fireImage.setTexture("small_fire");
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

    // 별 계산 및 적립 (성공 시에만)
    let starsEarned = 0;
    if (success) {
      starsEarned = this.progressManager.completeDayWithStars(
        this.gameState.day,
        this.gameState.money,
      );
      this.heartManager.refundHeart();
    }

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
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 400, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(201);

    // 결과 텍스트
    const resultTitle = success ? "목표 달성!" : "목표 미달성";
    const titleColor = success ? "#4CAF50" : "#E85A4F";

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 140, resultTitle, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "36px",
        color: titleColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(202);

    // 별 표시 (항상 표시 - 0개면 빈별 3개)
    const starSize = 40;
    const starGap = 8;
    const totalStarWidth = 3 * starSize + 2 * starGap;
    const starStartX = GAME_WIDTH / 2 - totalStarWidth / 2 + starSize / 2;
    const starY = GAME_HEIGHT / 2 - 90;

    for (let i = 0; i < 3; i++) {
      const starImg = this.add
        .image(starStartX + i * (starSize + starGap), starY, "icon_star")
        .setDisplaySize(starSize, starSize)
        .setDepth(202);

      // 획득하지 못한 별은 회색 처리
      if (i >= starsEarned) {
        starImg.setTint(0x555555);
        starImg.setAlpha(0.4);
      }
    }

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 40,
        `Day ${this.gameState.day} 결과`,
        {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "24px",
          color: "#5D4E37",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 20,
        `벌은 돈: ${this.gameState.money.toLocaleString()}원\n목표 금액: ${this.gameState.targetMoney.toLocaleString()}원`,
        {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "20px",
          color: "#5D4E37",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);

    // 버튼
    const btnY = GAME_HEIGHT / 2 + 130;

    if (success) {
      // 별 3개면 재도전 버튼 숨김 (2개 버튼), 아니면 3개 버튼
      const maxStars = starsEarned >= STAR_CONFIG.MAX_STARS_PER_DAY;

      if (maxStars) {
        // 별 3개: 다음 날 / 홈으로 (2개)
        const leftBtnX = GAME_WIDTH / 2 - 115;
        const rightBtnX = GAME_WIDTH / 2 + 115;

        // 다음 날 버튼 (왼쪽)
        const nextBtn = this.add
          .rectangle(leftBtnX, btnY, 200, 60, 0x4caf50)
          .setStrokeStyle(3, 0x388e3c)
          .setInteractive({ useHandCursor: true })
          .setDepth(202);

        this.add
          .text(leftBtnX, btnY, "▶ 다음 날", {
            fontFamily: "UhBeePuding",
            padding: { y: 5 },
            fontSize: "22px",
            color: "#FFFFFF",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(203);

        nextBtn.on("pointerdown", () => this.startNextDay());

        // 홈 버튼 (오른쪽)
        const homeBtn = this.add
          .rectangle(rightBtnX, btnY, 200, 60, 0x9e9e9e)
          .setStrokeStyle(3, 0x757575)
          .setInteractive({ useHandCursor: true })
          .setDepth(202);

        this.add
          .text(rightBtnX, btnY, "🏠 홈으로", {
            fontFamily: "UhBeePuding",
            padding: { y: 5 },
            fontSize: "22px",
            color: "#FFFFFF",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(203);

        homeBtn.on("pointerdown", () => this.goHomeAfterSuccess());
      } else {
        // 별 0~2개: 다음 날 / 재도전 / 홈으로 (3개)
        const btnWidth = 145;
        const btnGap = 155;
        const leftBtnX = GAME_WIDTH / 2 - btnGap;
        const centerBtnX = GAME_WIDTH / 2;
        const rightBtnX = GAME_WIDTH / 2 + btnGap;

        // 다음 날 버튼 (왼쪽)
        const nextBtn = this.add
          .rectangle(leftBtnX, btnY, btnWidth, 55, 0x4caf50)
          .setStrokeStyle(3, 0x388e3c)
          .setInteractive({ useHandCursor: true })
          .setDepth(202);

        this.add
          .text(leftBtnX, btnY, "▶ 다음 날", {
            fontFamily: "UhBeePuding",
            padding: { y: 5 },
            fontSize: "18px",
            color: "#FFFFFF",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(203);

        nextBtn.on("pointerdown", () => this.startNextDay());

        // 재도전 버튼 (중앙)
        const retryBtn = this.add
          .rectangle(centerBtnX, btnY, btnWidth, 55, 0xffc107)
          .setStrokeStyle(3, 0xffa000)
          .setInteractive({ useHandCursor: true })
          .setDepth(202);

        this.add
          .text(centerBtnX, btnY, "🔄 재도전", {
            fontFamily: "UhBeePuding",
            padding: { y: 5 },
            fontSize: "18px",
            color: "#5D4E37",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(203);

        retryBtn.on("pointerdown", () => this.retryDay());

        // 홈 버튼 (오른쪽)
        const homeBtn = this.add
          .rectangle(rightBtnX, btnY, btnWidth, 55, 0x9e9e9e)
          .setStrokeStyle(3, 0x757575)
          .setInteractive({ useHandCursor: true })
          .setDepth(202);

        this.add
          .text(rightBtnX, btnY, "🏠 홈으로", {
            fontFamily: "UhBeePuding",
            padding: { y: 5 },
            fontSize: "18px",
            color: "#FFFFFF",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(203);

        homeBtn.on("pointerdown", () => this.goHomeAfterSuccess());
      }
    } else {
      // 실패 시: 재도전 / 홈으로 (2개)
      const leftBtnX = GAME_WIDTH / 2 - 115;
      const rightBtnX = GAME_WIDTH / 2 + 115;

      // 재도전 버튼 (왼쪽)
      const retryBtn = this.add
        .rectangle(leftBtnX, btnY, 200, 60, 0xffc107)
        .setStrokeStyle(3, 0xffa000)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add
        .text(leftBtnX, btnY, "🔄 재도전", {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "22px",
          color: "#5D4E37",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(203);

      retryBtn.on("pointerdown", () => this.retryDay());

      // 홈 버튼 (오른쪽)
      const homeBtn = this.add
        .rectangle(rightBtnX, btnY, 200, 60, 0x9e9e9e)
        .setStrokeStyle(3, 0x757575)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add
        .text(rightBtnX, btnY, "🏠 홈으로", {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "22px",
          color: "#FFFFFF",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(203);

      homeBtn.on("pointerdown", () => this.scene.start("HomeScene"));
    }
  }

  private startNextDay(): void {
    // 현재 진행중인 Day인 경우에만 다음 날로 진행 (재도전 시에는 진행 안함)
    if (this.gameState.day === this.progressManager.getCurrentDay()) {
      this.progressManager.advanceToNextDay();
    }

    const nextDay = this.gameState.day + 1;
    // 다음 날: 하트 사용 안함 (성공 시 이미 반환됨)
    this.scene.stop();
    this.scene.start("GameScene", { day: nextDay, skipHeart: true });
  }

  private retryDay(): void {
    // 재도전: 하트 사용함 (skipHeart 없음)
    this.scene.stop();
    this.scene.start("GameScene", { day: this.gameState.day });
  }

  private goHomeAfterSuccess(): void {
    // 현재 진행중인 Day인 경우에만 다음 날로 진행 (재도전 시에는 진행 안함)
    if (this.gameState.day === this.progressManager.getCurrentDay()) {
      this.progressManager.advanceToNextDay();
    }
    this.scene.start("HomeScene");
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

  private showPausePopup(): void {
    if (this.isPaused) return;
    this.isPaused = true;

    // 반투명 오버레이
    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0.5,
      )
      .setInteractive()
      .setDepth(300);

    // 팝업 배경
    const popup = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 400, 280, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(301);

    // 타이틀
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, "일시정지", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(302);

    // 재시도 버튼
    const retryBtn = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 280, 55, 0xffc107)
      .setStrokeStyle(3, 0xffa000)
      .setInteractive({ useHandCursor: true })
      .setDepth(302);

    const retryText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, "🔄 재시도", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(303);

    // 종료 버튼
    const exitBtn = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 280, 55, 0xe85a4f)
      .setStrokeStyle(3, 0xb8453c)
      .setInteractive({ useHandCursor: true })
      .setDepth(302);

    const exitText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, "🚪 종료", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "24px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(303);

    this.pausePopupObjects = [
      overlay,
      popup,
      title,
      retryBtn,
      retryText,
      exitBtn,
      exitText,
    ];

    // 오버레이 클릭으로 닫기
    overlay.on("pointerdown", () => this.closePausePopup());

    // 재시도 버튼 클릭
    retryBtn.on("pointerdown", () => {
      this.closePausePopup();
      this.showConfirmPopup(
        "재시도",
        `${this.gameState.day}일차를 다시 시작할까요?`,
        () => this.retryDay(),
      );
    });

    // 종료 버튼 클릭
    exitBtn.on("pointerdown", () => {
      this.closePausePopup();
      this.showConfirmPopup("종료", "홈 화면으로 돌아갈까요?", () =>
        this.scene.start("HomeScene"),
      );
    });
  }

  private closePausePopup(): void {
    for (const obj of this.pausePopupObjects) {
      obj.destroy();
    }
    this.pausePopupObjects = [];
    this.isPaused = false;
  }

  private showConfirmPopup(
    title: string,
    message: string,
    onConfirm: () => void,
  ): void {
    this.isPaused = true;

    // 반투명 오버레이
    const overlay = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x000000,
        0.5,
      )
      .setInteractive()
      .setDepth(400);

    // 팝업 배경
    const popup = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 250, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(401);

    // 타이틀
    const titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, title, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "28px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(402);

    // 메시지
    const messageText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15, message, {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "22px",
        color: "#5D4E37",
      })
      .setOrigin(0.5)
      .setDepth(402);

    // 취소 버튼
    const cancelBtn = this.add
      .rectangle(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2 + 60, 130, 50, 0xcccccc)
      .setStrokeStyle(3, 0x999999)
      .setInteractive({ useHandCursor: true })
      .setDepth(402);

    const cancelText = this.add
      .text(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2 + 60, "취소", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "20px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(403);

    // 확인 버튼
    const confirmBtn = this.add
      .rectangle(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2 + 60, 130, 50, 0x4caf50)
      .setStrokeStyle(3, 0x388e3c)
      .setInteractive({ useHandCursor: true })
      .setDepth(402);

    const confirmText = this.add
      .text(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2 + 60, "확인", {
        fontFamily: "UhBeePuding",
        padding: { y: 5 },
        fontSize: "20px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(403);

    const confirmPopupObjects = [
      overlay,
      popup,
      titleText,
      messageText,
      cancelBtn,
      cancelText,
      confirmBtn,
      confirmText,
    ];

    const closeConfirmPopup = () => {
      for (const obj of confirmPopupObjects) {
        obj.destroy();
      }
      this.isPaused = false;
    };

    // 취소 버튼 클릭
    cancelBtn.on("pointerdown", closeConfirmPopup);

    // 확인 버튼 클릭
    confirmBtn.on("pointerdown", () => {
      closeConfirmPopup();
      onConfirm();
    });
  }
}
