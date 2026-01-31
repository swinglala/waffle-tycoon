import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 바 생성
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();

    progressBox.fillStyle(0xE8DCC4, 0.8);
    progressBox.fillRect(GAME_WIDTH / 2 - 160, GAME_HEIGHT / 2 - 25, 320, 50);

    // 로딩 텍스트
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '로딩 중...', {
      fontFamily: 'UhBeePuding', padding: { y: 5 },
      fontSize: '24px',
      color: '#5D4E37',
    });
    loadingText.setOrigin(0.5);

    // 로딩 진행률
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xD4A574, 1);
      progressBar.fillRect(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // 와플 이미지 (익힘 단계별)
    this.load.image('waffle_batter', 'assets/images/waffle_batter.png');
    this.load.image('waffle_undercooked', 'assets/images/waffle_undercooked.png');
    this.load.image('waffle_cooked', 'assets/images/waffle_cooked.png');
    this.load.image('waffle_perfect', 'assets/images/waffle_perfect.png');
    this.load.image('waffle_burnt', 'assets/images/waffle_burnt.png');

    // 완성품 (와플 + 잼) - 사과잼
    this.load.image('waffle_apple_jam_undercooked', 'assets/images/waffle_apple_jam_undercooked.png');
    this.load.image('waffle_apple_jam_cooked', 'assets/images/waffle_apple_jam_cooked.png');
    this.load.image('waffle_apple_jam_perfect', 'assets/images/waffle_apple_jam_perfect.png');
    // 완성품 (와플 + 잼) - 베리잼
    this.load.image('waffle_berry_jam_undercooked', 'assets/images/waffle_berry_jam_undercooked.png');
    this.load.image('waffle_berry_jam_cooked', 'assets/images/waffle_berry_jam_cooked.png');
    this.load.image('waffle_berry_jam_perfect', 'assets/images/waffle_berry_jam_perfect.png');
    // 완성품 (와플 + 잼) - 피스타치오잼
    this.load.image('waffle_pistachio_jam_undercooked', 'assets/images/waffle_pistachio_jam_undercooked.png');
    this.load.image('waffle_pistachio_jam_cooked', 'assets/images/waffle_pistachio_jam_cooked.png');
    this.load.image('waffle_pistachio_jam_perfect', 'assets/images/waffle_pistachio_jam_perfect.png');

    // 굽는판
    this.load.image('grill_slot_empty', 'assets/images/grill_slot_empty.png');

    // 버튼
    this.load.image('btn_apple_jam', 'assets/images/btn_apple_jam.png');
    this.load.image('btn_berry_jam', 'assets/images/btn_berry_jam.png');
    this.load.image('btn_pistachio_jam', 'assets/images/btn_pistachio_jam.png');
    this.load.image('btn_trash', 'assets/images/btn_trash.png');

    // 트레이 배경
    this.load.image('ready_tray', 'assets/images/ready_tray.png');
    this.load.image('finished_tray', 'assets/images/finished_tray.png');
    this.load.image('finished_plate', 'assets/images/finished_plate.png');

    // 손님 영역 배경
    this.load.image('customer_background', 'assets/images/customer_background.png');

    // 주문 이미지
    this.load.image('order_apple_jam', 'assets/images/order_apple_jam.png');
    this.load.image('order_berry_jam', 'assets/images/order_berry_jam.png');
    this.load.image('order_pistachio_jam', 'assets/images/order_pistachio_jam.png');

    // UI 아이콘
    this.load.image('icon_shop', 'assets/images/shop.png');
    this.load.image('icon_rank', 'assets/images/rank.png');
    this.load.image('icon_setting', 'assets/images/setting.png');
    this.load.image('icon_heart', 'assets/images/heart.png');
    this.load.image('icon_calendar', 'assets/images/calendar.png');

    // 손님 이미지
    this.load.image('customer_dog', 'assets/images/customer_dog.png');
    this.load.image('customer_dog_angry', 'assets/images/customer_dog_angry.png');
    this.load.image('customer_hamster', 'assets/images/customer_hamster.png');
    this.load.image('customer_hamster_angry', 'assets/images/customer_hamster_angry.png');
    this.load.image('customer_turtle', 'assets/images/customer_turtle.png');
    this.load.image('customer_turtle_angry', 'assets/images/customer_turtle_angry.png');
    this.load.image('customer_horse', 'assets/images/customer_horse.png');
    this.load.image('customer_horse_angry', 'assets/images/customer_horse_angry.png');
    this.load.image('customer_bear', 'assets/images/customer_bear.png');
    this.load.image('customer_bear_angry', 'assets/images/customer_bear_angry.png');
    this.load.image('customer_rabbit', 'assets/images/customer_rabbit.png');
    this.load.image('customer_rabbit_angry', 'assets/images/customer_rabbit_angry.png');
    this.load.image('customer_fox', 'assets/images/customer_fox.png');
    this.load.image('customer_fox_angry', 'assets/images/customer_fox_angry.png');

    // 추가 아이콘
    this.load.image('icon_star', 'assets/images/star.png');
    this.load.image('icon_plus', 'assets/images/plus.png');

    // 로고
    this.load.image('logo', 'assets/images/logo.png');

    // 프로필 아이콘
    this.load.image('icon_profile', 'assets/images/profile.png');

    // 시작 버튼
    this.load.image('btn_start', 'assets/images/start.png');

    // 불 이미지
    this.load.image('small_fire', 'assets/images/small_fire.png');
    this.load.image('big_fire', 'assets/images/big_fire.png');

    // 콤보 이미지
    this.load.image('combo', 'assets/images/combo.png');

    // 효과음
    this.load.audio('sfx_combo', 'assets/audio/combo.mp3');
    this.load.audio('sfx_success', 'assets/audio/stage_success.mp3');
    this.load.audio('sfx_fail', 'assets/audio/stage_fail.mp3');
  }

  create(): void {
    // 홈 씬으로 전환
    this.scene.start('HomeScene');
  }
}
