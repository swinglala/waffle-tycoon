import Phaser from "phaser";

/**
 * 테스트용 씬 - 게임 결과 팝업 등을 바로 확인할 수 있음
 */
export class TestScene extends Phaser.Scene {
  constructor() {
    super({ key: "TestScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#FFF8E7");

    // 타이틀
    this.add
      .text(this.cameras.main.width / 2, 50, "테스트 페이지", {
        fontFamily: "UhBeePuding",
        fontSize: "32px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // 버튼들
    let btnY = 150;
    const btnGap = 80;

    // 성공 팝업 (3별)
    this.createTestButton(
      this.cameras.main.width / 2,
      btnY,
      "성공 팝업 (3별)",
      0x4caf50,
      () => {
        this.showResultPopup(true, 3, 30000, 20000);
      },
    );

    btnY += btnGap;

    // 성공 팝업 (1별)
    this.createTestButton(
      this.cameras.main.width / 2,
      btnY,
      "성공 팝업 (1별)",
      0x8bc34a,
      () => {
        this.showResultPopup(true, 1, 21000, 20000);
      },
    );

    btnY += btnGap;

    // 실패 팝업 (0별)
    this.createTestButton(
      this.cameras.main.width / 2,
      btnY,
      "실패 팝업 (0별)",
      0xe85a4f,
      () => {
        this.showResultPopup(false, 0, 15000, 20000);
      },
    );

    btnY += btnGap;

    // 홈으로 버튼
    this.createTestButton(
      this.cameras.main.width / 2,
      this.cameras.main.height - 80,
      "홈으로",
      0xd4a574,
      () => {
        this.scene.start("HomeScene");
      },
    );
  }

  private createTestButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void,
  ): void {
    const btn = this.add
      .rectangle(x, y, 300, 60, color)
      .setStrokeStyle(3, 0x5d4e37)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, text, {
        fontFamily: "UhBeePuding",
        fontSize: "24px",
        color: "#FFFFFF",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    btn.on("pointerdown", onClick);
    btn.on("pointerover", () => btn.setAlpha(0.8));
    btn.on("pointerout", () => btn.setAlpha(1));
  }

  private showResultPopup(
    success: boolean,
    starsEarned: number,
    money: number,
    targetMoney: number,
  ): void {
    const popupObjects: Phaser.GameObjects.GameObject[] = [];

    // 오버레이
    const overlay = this.add
      .rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7,
      )
      .setDepth(200)
      .setInteractive();
    popupObjects.push(overlay);

    // 결과 패널
    const panel = this.add
      .rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2, 500, 400, 0xfff8e7)
      .setStrokeStyle(4, 0x8b6914)
      .setDepth(201);
    popupObjects.push(panel);

    // 결과 이미지
    const resultImage = success ? "mission_complete" : "mission_fail";
    const resultImg = this.add
      .image(this.cameras.main.width / 2, this.cameras.main.height / 2 - 155, resultImage)
      .setScale(0.8)
      .setOrigin(0.5)
      .setDepth(202);
    popupObjects.push(resultImg);

    // 별 표시
    const starSize = 85;
    const starGap = 15;
    const totalStarWidth = 3 * starSize + 2 * starGap;
    const starStartX = this.cameras.main.width / 2 - totalStarWidth / 2 + starSize / 2;
    const starY = this.cameras.main.height / 2 - 50;

    for (let i = 0; i < 3; i++) {
      const starImg = this.add
        .image(starStartX + i * (starSize + starGap), starY, "icon_star")
        .setDisplaySize(starSize, starSize)
        .setDepth(202);

      if (i >= starsEarned) {
        starImg.setTint(0x555555);
        starImg.setAlpha(0.4);
      }
      popupObjects.push(starImg);
    }

    // 금액 표시
    const moneyColor = success ? "#4CAF50" : "#E85A4F";

    // 벌은 돈 (강조)
    const earnedText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 + 25,
        `${money.toLocaleString()}원`,
        {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "60px",
          color: moneyColor,
          fontStyle: "bold",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);
    popupObjects.push(earnedText);

    // 목표 금액 (아래줄)
    const targetText = this.add
      .text(
        this.cameras.main.width / 2 + 50,
        this.cameras.main.height / 2 + 70,
        `/ ${targetMoney.toLocaleString()}원`,
        {
          fontFamily: "UhBeePuding",
          padding: { y: 5 },
          fontSize: "24px",
          color: "#5D4E37",
        },
      )
      .setOrigin(0.5)
      .setDepth(202);
    popupObjects.push(targetText);

    // 닫기 버튼
    const closeBtn = this.add
      .rectangle(this.cameras.main.width / 2, this.cameras.main.height / 2 + 130, 200, 60, 0xd4a574)
      .setStrokeStyle(3, 0x8b6914)
      .setInteractive({ useHandCursor: true })
      .setDepth(202);
    popupObjects.push(closeBtn);

    const closeBtnText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 130, "닫기", {
        fontFamily: "UhBeePuding",
        fontSize: "24px",
        color: "#5D4E37",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(202);
    popupObjects.push(closeBtnText);

    closeBtn.on("pointerdown", () => {
      popupObjects.forEach((obj) => obj.destroy());
    });

    overlay.on("pointerdown", () => {
      popupObjects.forEach((obj) => obj.destroy());
    });
  }
}
