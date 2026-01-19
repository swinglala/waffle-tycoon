import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import {
  CookingStage,
  GrillSlot,
  TrayWaffle,
  GameState,
  Customer,
  COOKING_TIMES,
  STAGE_COLORS,
  STAGE_EMOJI,
  WAFFLE_PRICES,
  GAME_CONFIG,
} from '../types/game';

const GRID_SIZE = 3;
const CELL_SIZE = Math.floor(GAME_WIDTH / 4);  // 180px
const CELL_GAP = 6;

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
  private grillGraphics: Phaser.GameObjects.Rectangle[][] = [];
  private grillTexts: Phaser.GameObjects.Text[][] = [];

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
  private timeBarBg!: Phaser.GameObjects.Rectangle;
  private dayText!: Phaser.GameObjects.Text;
  private fireButton!: Phaser.GameObjects.Rectangle;
  private fireButtonText!: Phaser.GameObjects.Text;
  private workTrayCountText!: Phaser.GameObjects.Text;
  private finishedTrayCountText!: Phaser.GameObjects.Text;

  // 잼/쓰레기통 버튼
  private jamButton!: Phaser.GameObjects.Rectangle;
  private trashButton!: Phaser.GameObjects.Rectangle;

  // 손님 시스템 (고정 슬롯 방식)
  private customerSlots: (Customer | null)[] = [null, null, null];  // 3개 고정 슬롯
  private customerUIObjects: Phaser.GameObjects.GameObject[][] = [];
  private customerGauges: (Phaser.GameObjects.Rectangle | null)[] = [null, null, null];
  private nextCustomerId = 1;
  private customerSpawnTimer = 0;
  private nextSpawnTime = 0;
  private isGameOver = false;

  // 손님 슬롯 X 좌표
  private readonly CUSTOMER_SLOT_X = [150, 330, 510];

  // 레이아웃 Y 좌표
  private readonly HEADER_Y = 45;
  private readonly TIME_BAR_Y = 90;       // 시간 바 위치
  private readonly CUSTOMER_Y = 230;      // 손님 영역 중심
  private readonly CUSTOMER_HEIGHT = 180; // 손님 영역 높이
  private readonly FINISHED_TRAY_Y = 355;
  private readonly TOPPING_BTN_Y = 455;   // 버튼 영역 (2배 높이 90px)
  private readonly WORK_TRAY_Y = 535;
  private readonly GRILL_START_Y = 680;   // 작업트레이와 10px 갭

  constructor() {
    super({ key: 'GameScene' });
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
    return GAME_CONFIG.CUSTOMER_SPAWN_MIN +
      Math.random() * (GAME_CONFIG.CUSTOMER_SPAWN_MAX - GAME_CONFIG.CUSTOMER_SPAWN_MIN);
  }

  private getRandomWaitTime(): number {
    return GAME_CONFIG.CUSTOMER_WAIT_MIN +
      Math.random() * (GAME_CONFIG.CUSTOMER_WAIT_MAX - GAME_CONFIG.CUSTOMER_WAIT_MIN);
  }

  private getRandomOrderCount(): number {
    return GAME_CONFIG.CUSTOMER_ORDER_MIN +
      Math.floor(Math.random() * (GAME_CONFIG.CUSTOMER_ORDER_MAX - GAME_CONFIG.CUSTOMER_ORDER_MIN + 1));
  }

  private initializeGrill(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      this.grillSlots[row] = [];
      this.grillGraphics[row] = [];
      this.grillTexts[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        this.grillSlots[row][col] = {
          stage: CookingStage.EMPTY,
          cookTime: 0,
        };
      }
    }
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor('#FFF8E7');
  }

  private createUI(): void {
    // 상단 바 배경
    this.add.rectangle(GAME_WIDTH / 2, this.HEADER_Y, GAME_WIDTH - 20, 50, 0xD4A574)
      .setStrokeStyle(3, 0x8B6914);

    // Day 표시
    this.dayText = this.add.text(30, this.HEADER_Y - 10, `Day ${this.gameState.day}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#5D4E37',
      fontStyle: 'bold',
    });

    // 돈 표시
    this.moneyText = this.add.text(GAME_WIDTH / 2, this.HEADER_Y - 10,
      `💰 ${this.gameState.money.toLocaleString()} / ${this.gameState.targetMoney.toLocaleString()}원`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#5D4E37',
    }).setOrigin(0.5, 0);

    // 시간 바 (헤더 바로 아래)
    const barWidth = GAME_WIDTH - 80;
    const barHeight = 24;

    // 바 배경 (회색)
    this.timeBarBg = this.add.rectangle(GAME_WIDTH / 2, this.TIME_BAR_Y, barWidth, barHeight, 0xCCCCCC)
      .setStrokeStyle(2, 0x999999);

    // 시간 바 (빨간색, 왼쪽 정렬)
    this.timeBar = this.add.rectangle(40, this.TIME_BAR_Y, barWidth, barHeight - 4, 0xE85A4F)
      .setOrigin(0, 0.5);

    // 시간 텍스트 (바 위에 표시)
    this.timeText = this.add.text(GAME_WIDTH / 2, this.TIME_BAR_Y, this.formatTime(this.gameState.timeRemaining), {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private createCustomerZone(): void {
    // 손님 존 배경
    this.add.rectangle(GAME_WIDTH / 2, this.CUSTOMER_Y, GAME_WIDTH - 40, this.CUSTOMER_HEIGHT, 0xE8DCC4)
      .setStrokeStyle(2, 0xC4B8A4);

    // 라벨
    this.add.text(GAME_WIDTH / 2, this.CUSTOMER_Y - this.CUSTOMER_HEIGHT / 2 + 20, '👥 손님 대기', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#8B7355',
    }).setOrigin(0.5);

    // 손님 UI 배열 초기화
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      this.customerUIObjects.push([]);
    }

    this.updateCustomerDisplay();
  }

  private spawnCustomer(): void {
    if (this.isGameOver) return;

    // 빈 슬롯 찾기
    const emptySlotIndex = this.customerSlots.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) return;  // 빈 슬롯 없음

    const waitTime = this.getRandomWaitTime();
    const customer: Customer = {
      id: this.nextCustomerId++,
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
      this.customerGauges[i] = null;
    }

    // 손님 표시 (고정 슬롯)
    const slotY = this.CUSTOMER_Y + 20;

    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      const slotX = this.CUSTOMER_SLOT_X[i];
      const customer = this.customerSlots[i];

      if (customer) {
        this.createCustomerUI(slotX, slotY, customer, i);
      } else {
        // 빈 슬롯 표시
        const emptyBg = this.add.rectangle(slotX, slotY, 150, 100, 0xFFFFFF, 0.3)
          .setStrokeStyle(1, 0xCCCCCC);
        const emptyText = this.add.text(slotX, slotY, '[ 빈자리 ]', {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#AAAAAA',
        }).setOrigin(0.5);
        this.customerUIObjects[i].push(emptyBg, emptyText);
      }
    }
  }

  private createCustomerUI(x: number, y: number, customer: Customer, index: number): void {
    // 손님 배경
    const bg = this.add.rectangle(x, y, 150, 100, 0xFFE4B5)
      .setStrokeStyle(2, 0xD4A574)
      .setInteractive({ useHandCursor: true });

    bg.on('pointerdown', () => this.onCustomerClick(index));

    // 손님 아이콘
    const icon = this.add.text(x, y - 25, '🧑', {
      fontSize: '32px',
    }).setOrigin(0.5);

    // 주문 표시 (잼 와플)
    const orderText = this.add.text(x, y + 10, `🧇🍎 x ${customer.waffleCount}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#5D4E37',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 대기 게이지 배경
    const gaugeBg = this.add.rectangle(x, y + 40, 120, 12, 0xCCCCCC);

    // 대기 게이지 (시간에 따라 줄어듦)
    const gaugeRatio = customer.waitTime / customer.maxWaitTime;
    const gaugeColor = gaugeRatio > 0.5 ? 0x4CAF50 : gaugeRatio > 0.25 ? 0xFFC107 : 0xE85A4F;
    const gaugeWidth = 120 * gaugeRatio;
    const gauge = this.add.rectangle(x - 60 + gaugeWidth / 2, y + 40, gaugeWidth, 8, gaugeColor);

    // 게이지 참조 저장 (업데이트용)
    this.customerGauges[index] = gauge;

    this.customerUIObjects[index].push(bg, icon, orderText, gaugeBg, gauge);
  }

  private onCustomerClick(index: number): void {
    const customer = this.customerSlots[index];
    if (!customer) return;
    if (this.isGameOver) return;

    // 완성품 개수 확인
    if (this.finishedTray.length < customer.waffleCount) {
      this.showMessage(`⚠️ 완성품이 부족해요! (${this.finishedTray.length}/${customer.waffleCount})`);
      return;
    }

    // 판매 처리
    let totalPrice = 0;
    for (let i = 0; i < customer.waffleCount; i++) {
      const waffle = this.finishedTray.shift()!;
      totalPrice += WAFFLE_PRICES[waffle.stage];
    }

    this.gameState.money += totalPrice;
    this.customerSlots[index] = null;  // 슬롯 비우기 (위치 유지)

    this.updateCustomerDisplay();
    this.updateFinishedTrayDisplay();

    this.showMessage(`💰 +${totalPrice.toLocaleString()}원!`);
  }

  private updateCustomerGauges(): void {
    // 게이지만 업데이트 (매 프레임 호출용)
    for (let i = 0; i < GAME_CONFIG.MAX_CUSTOMERS; i++) {
      const customer = this.customerSlots[i];
      const gauge = this.customerGauges[i];
      if (!customer || !gauge || !gauge.active) continue;

      const x = this.CUSTOMER_SLOT_X[i];
      const gaugeRatio = customer.waitTime / customer.maxWaitTime;
      const gaugeColor = gaugeRatio > 0.5 ? 0x4CAF50 : gaugeRatio > 0.25 ? 0xFFC107 : 0xE85A4F;
      const gaugeWidth = Math.max(1, 120 * gaugeRatio);

      gauge.setFillStyle(gaugeColor);
      gauge.width = gaugeWidth;
      gauge.x = x - 60 + gaugeWidth / 2;
    }
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
        this.showMessage('😠 손님이 화나서 떠났어요!');
        customerChanged = true;
      }
    }

    // 손님 스폰 타이머
    this.customerSpawnTimer += deltaSeconds;
    if (this.customerSpawnTimer >= this.nextSpawnTime) {
      const hadEmptySlot = this.customerSlots.some(slot => slot === null);
      this.spawnCustomer();
      this.customerSpawnTimer = 0;
      this.nextSpawnTime = this.getRandomSpawnTime();
      if (hadEmptySlot) {
        customerChanged = true;
      }
    }

    // 손님 변경 시에만 전체 UI 업데이트, 아니면 게이지만 업데이트
    if (customerChanged) {
      this.updateCustomerDisplay();
    } else {
      this.updateCustomerGauges();
    }
  }

  private createFinishedTrayUI(): void {
    // 완성품 트레이 배경
    this.add.rectangle(GAME_WIDTH / 2, this.FINISHED_TRAY_Y, GAME_WIDTH - 40, 60, 0x98D982)
      .setStrokeStyle(3, 0x6BBF59);

    // 라벨
    this.add.text(30, this.FINISHED_TRAY_Y - 20, '✅ 완성품', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#2D5A1D',
      fontStyle: 'bold',
    });

    // 개수 표시
    this.finishedTrayCountText = this.add.text(GAME_WIDTH - 30, this.FINISHED_TRAY_Y - 20, '0개', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#2D5A1D',
    }).setOrigin(1, 0);

    // 트레이 컨테이너
    this.finishedTrayContainer = this.add.container(60, this.FINISHED_TRAY_Y + 5);
  }

  private createToppingButtons(): void {
    const buttonHeight = 90;  // 2배 높이
    const buttonWidth = 140;
    const leftX = 40 + buttonWidth / 2;  // 왼쪽 끝
    const rightX = GAME_WIDTH - 40 - buttonWidth / 2;  // 오른쪽 끝

    // 잼 버튼 (왼쪽)
    this.jamButton = this.add.rectangle(leftX, this.TOPPING_BTN_Y, buttonWidth, buttonHeight, 0xE85A4F)
      .setStrokeStyle(3, 0xB8453C)
      .setInteractive({ useHandCursor: true });

    this.add.text(leftX, this.TOPPING_BTN_Y, '🍎\n사과잼', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.jamButton.on('pointerdown', () => this.onJamButtonClick());

    // 쓰레기통 버튼 (오른쪽)
    this.trashButton = this.add.rectangle(rightX, this.TOPPING_BTN_Y, buttonWidth, buttonHeight, 0x888888)
      .setStrokeStyle(3, 0x555555)
      .setInteractive({ useHandCursor: true });

    this.add.text(rightX, this.TOPPING_BTN_Y, '🗑️\n버리기', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    this.trashButton.on('pointerdown', () => this.onTrashButtonClick());
  }

  private createWorkTrayUI(): void {
    // 작업 트레이 배경
    this.add.rectangle(GAME_WIDTH / 2, this.WORK_TRAY_Y, GAME_WIDTH - 40, 55, 0xFFE4B5)
      .setStrokeStyle(3, 0xD4A574);

    // 라벨
    this.add.text(30, this.WORK_TRAY_Y - 18, '📥 작업 트레이', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#5D4E37',
    });

    // 개수 표시
    this.workTrayCountText = this.add.text(GAME_WIDTH - 30, this.WORK_TRAY_Y - 18, '0개', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8B7355',
    }).setOrigin(1, 0);

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
    this.add.rectangle(
      grillCenterX,
      grillCenterY,
      grillTotalWidth + 30,
      grillTotalHeight + 30,
      0x5D4E37
    ).setStrokeStyle(4, 0x3D2E17);

    // 3x3 그리드 시작점
    const startX = grillCenterX - grillTotalWidth / 2 + CELL_SIZE / 2;
    const startY = this.GRILL_START_Y;

    // 3x3 그리드
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = startX + col * (CELL_SIZE + CELL_GAP);
        const y = startY + row * (CELL_SIZE + CELL_GAP);

        const cell = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, STAGE_COLORS[CookingStage.EMPTY])
          .setStrokeStyle(3, 0x3D2E17)
          .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y, '', {
          fontSize: '64px',
        }).setOrigin(0.5);

        this.grillGraphics[row][col] = cell;
        this.grillTexts[row][col] = text;

        cell.on('pointerdown', () => this.onGrillCellClick(row, col));
      }
    }
  }

  private createFireButton(): void {
    // 굽는판 아래 중앙에 배치
    const grillTotalHeight = GRID_SIZE * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const buttonY = this.GRILL_START_Y + grillTotalHeight - 35;

    this.fireButton = this.add.rectangle(GAME_WIDTH / 2, buttonY, 200, 60, 0xE85A4F)
      .setStrokeStyle(3, 0xB8453C)
      .setInteractive({ useHandCursor: true });

    this.fireButtonText = this.add.text(GAME_WIDTH / 2, buttonY, '🔥 강불 (3초)', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.fireButton.on('pointerdown', () => this.onFireButtonClick());
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

    this.cameras.main.shake(30, 0.002);
  }

  private onFireButtonClick(): void {
    if (!this.gameState.isStrongFire) {
      this.gameState.isStrongFire = true;
      this.gameState.strongFireRemaining = 3;

      this.fireButton.setFillStyle(0xFF6B5B);
      this.fireButtonText.setText('🔥🔥 강불 작동중!');
    }
  }

  private onJamButtonClick(): void {
    if (this.workTray.length === 0) {
      this.showMessage('⚠️ 작업 트레이가 비어있어요');
      return;
    }

    const waffle = this.workTray[0];  // 항상 첫 번째 와플

    if (waffle.stage === CookingStage.BURNT) {
      this.showMessage('💀 탄 와플은 판매할 수 없어요!');
      return;
    }

    waffle.hasJam = true;
    this.finishedTray.push(waffle);
    this.workTray.shift();  // 첫 번째 제거

    this.updateWorkTrayDisplay();
    this.updateFinishedTrayDisplay();

    this.showMessage('🍎 잼 완료!');
  }

  private onTrashButtonClick(): void {
    if (this.workTray.length === 0) {
      this.showMessage('⚠️ 작업 트레이가 비어있어요');
      return;
    }

    this.workTray.shift();  // 첫 번째 제거
    this.updateWorkTrayDisplay();

    this.showMessage('🗑️ 버렸어요');
  }

  private showMessage(text: string): void {
    const msg = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#5D4E37',
      backgroundColor: '#FFFFFF',
      padding: { x: 15, y: 8 },
    }).setOrigin(0.5).setDepth(100);

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
    this.grillGraphics[row][col].setFillStyle(STAGE_COLORS[slot.stage]);
    this.grillTexts[row][col].setText(STAGE_EMOJI[slot.stage]);
  }

  private updateWorkTrayDisplay(): void {
    this.workTrayContainer.removeAll(true);

    const displayCount = Math.min(this.workTray.length, 12);
    for (let i = 0; i < displayCount; i++) {
      const waffle = this.workTray[i];
      const emoji = STAGE_EMOJI[waffle.stage];

      // 첫 번째 와플은 자동 선택 (강조 표시)
      const isFirst = i === 0;
      const bg = this.add.rectangle(i * 50, 0, 45, 40, isFirst ? 0xFFD700 : 0xFFFFFF)
        .setStrokeStyle(isFirst ? 3 : 1, isFirst ? 0xFFA500 : 0xCCCCCC);

      const text = this.add.text(i * 50, 0, emoji, {
        fontSize: '24px',
      }).setOrigin(0.5);

      this.workTrayContainer.add(bg);
      this.workTrayContainer.add(text);
    }

    this.workTrayCountText.setText(`${this.workTray.length}개`);
  }

  private updateFinishedTrayDisplay(): void {
    this.finishedTrayContainer.removeAll(true);

    const displayCount = Math.min(this.finishedTray.length, 12);
    for (let i = 0; i < displayCount; i++) {
      const text = this.add.text(i * 50, 0, '🧇🍎', {
        fontSize: '22px',
      }).setOrigin(0.5);
      this.finishedTrayContainer.add(text);
    }

    this.finishedTrayCountText.setText(`${this.finishedTray.length}개`);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `⏱️ ${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private getNextStage(current: CookingStage): CookingStage {
    switch (current) {
      case CookingStage.BATTER: return CookingStage.UNDERCOOKED;
      case CookingStage.UNDERCOOKED: return CookingStage.COOKED;
      case CookingStage.COOKED: return CookingStage.PERFECT;
      case CookingStage.PERFECT: return CookingStage.BURNT;
      default: return current;
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

        if (slot.stage !== CookingStage.EMPTY && slot.stage !== CookingStage.BURNT) {
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
        this.fireButton.setFillStyle(0xE85A4F);
        this.fireButtonText.setText('🔥 강불 (3초)');
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
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setDepth(200);

    // 결과 패널
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500, 350, 0xFFF8E7)
      .setStrokeStyle(4, 0x8B6914)
      .setDepth(201);

    // 결과 텍스트
    const resultTitle = success ? '🎉 목표 달성!' : '😢 목표 미달성';
    const titleColor = success ? '#4CAF50' : '#E85A4F';

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, resultTitle, {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: titleColor,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(202);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, `Day ${this.gameState.day} 결과`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#5D4E37',
    }).setOrigin(0.5).setDepth(202);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      `벌은 돈: ${this.gameState.money.toLocaleString()}원\n목표 금액: ${this.gameState.targetMoney.toLocaleString()}원`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#5D4E37',
      align: 'center',
    }).setOrigin(0.5).setDepth(202);

    // 버튼
    if (success) {
      // 다음 날 버튼
      const nextBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 200, 60, 0x4CAF50)
        .setStrokeStyle(3, 0x388E3C)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '▶ 다음 날', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(203);

      nextBtn.on('pointerdown', () => this.startNextDay());
    } else {
      // 재도전 버튼
      const retryBtn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, 200, 60, 0xE85A4F)
        .setStrokeStyle(3, 0xB8453C)
        .setInteractive({ useHandCursor: true })
        .setDepth(202);

      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, '🔄 재도전', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(203);

      retryBtn.on('pointerdown', () => this.retryDay());
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
      `💰 ${this.gameState.money.toLocaleString()} / ${this.gameState.targetMoney.toLocaleString()}원`
    );
    this.timeText.setText(this.formatTime(Math.ceil(this.gameState.timeRemaining)));

    // 시간 바 업데이트
    const barWidth = GAME_WIDTH - 80;
    const timeRatio = this.gameState.timeRemaining / this.gameState.maxTime;
    this.timeBar.width = barWidth * timeRatio;

    // 시간에 따라 바 색상 변경
    if (timeRatio > 0.5) {
      this.timeBar.setFillStyle(0x4CAF50);  // 초록
    } else if (timeRatio > 0.25) {
      this.timeBar.setFillStyle(0xFFC107);  // 노랑
    } else {
      this.timeBar.setFillStyle(0xE85A4F);  // 빨강
    }
  }
}
