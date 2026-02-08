import Phaser from 'phaser';
import { supabase, isSupabaseConnected } from '../config/supabase';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width: sw, height: sh } = this.cameras.main;

    // 배경색 설정
    this.cameras.main.setBackgroundColor('#FFF8E7');

    // 로고를 먼저 로드
    this.load.image('logo', 'assets/images/logo.png');

    // 로고 로드 후 표시
    let logoImage: Phaser.GameObjects.Image | null = null;
    this.load.once('filecomplete-image-logo', () => {
      const scale = Math.min(sw, 1024) / 1661;
      const logoDisplaySize = 1200 * scale;
      logoImage = this.add.image(sw / 2, sh * 0.35, 'logo');
      logoImage.setDisplaySize(logoDisplaySize, logoDisplaySize);
    });

    // 로딩 바 생성
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();

    progressBox.fillStyle(0xE8DCC4, 0.8);
    progressBox.fillRect(sw / 2 - 160, sh * 0.6 - 25, 320, 50);

    // 로딩 텍스트
    const loadingText = this.add.text(sw / 2, sh * 0.6 - 60, '로딩 중...', {
      fontFamily: 'UhBeePuding', padding: { y: 5 },
      fontSize: '24px',
      color: '#5D4E37',
    });
    loadingText.setOrigin(0.5);

    // 로딩 진행률
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xD4A574, 1);
      progressBar.fillRect(sw / 2 - 150, sh * 0.6 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      if (logoImage) logoImage.destroy();
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
    this.load.image('button', 'assets/images/button.png');
    this.load.image('home', 'assets/images/home.png');
    this.load.image('home_100', 'assets/images/home_100.png');

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
    this.load.image('icon_x', 'assets/images/x.png');

    // 프로필 아이콘
    this.load.image('icon_profile', 'assets/images/profile.png');

    // 시작 버튼
    this.load.image('btn_start', 'assets/images/start.png');

    // 불 이미지
    this.load.image('small_fire', 'assets/images/small_fire.png');
    this.load.image('big_fire', 'assets/images/big_fire.png');

    // 콤보 이미지
    this.load.image('combo', 'assets/images/combo.png');

    // 상점 업그레이드 이미지
    this.load.image('upgrade_bowl', 'assets/images/bowl.png');
    this.load.image('upgrade_fire', 'assets/images/big_fire.png');
    this.load.image('upgrade_time', 'assets/images/time.png');
    this.load.image('upgrade_ready_tray', 'assets/images/ready_tray.png');
    this.load.image('upgrade_finished_tray', 'assets/images/finished_tray.png');
    this.load.image('upgrade_perfect', 'assets/images/waffle_perfect.png');
    this.load.image('upgrade_burnt', 'assets/images/waffle_burnt.png');
    this.load.image('upgrade_combo', 'assets/images/combo.png');
    this.load.image('upgrade_smile', 'assets/images/smile.png');
    this.load.image('upgrade_bonus', 'assets/images/bonus.png');
    this.load.image('upgrade_luck', 'assets/images/luck.png');

    // 숫자 이미지 (0-9)
    for (let i = 0; i <= 9; i++) {
      this.load.image(`number_${i}`, `assets/images/number_${i}.png`);
    }

    // 일차 텍스트 이미지
    this.load.image('day_text', 'assets/images/day.png');

    // 미션 결과 이미지
    this.load.image('mission_complete', 'assets/images/mission_complete.png');
    this.load.image('mission_fail', 'assets/images/mission_fail.png');

    // 효과음
    this.load.audio('sfx_combo', 'assets/audio/combo.mp3');
    this.load.audio('sfx_success', 'assets/audio/stage_success.mp3');
    this.load.audio('sfx_fail', 'assets/audio/stage_fail.mp3');
    this.load.audio('sfx_dough', 'assets/audio/dough.mp3');
    this.load.audio('sfx_coin', 'assets/audio/coin.wav');
    this.load.audio('sfx_trash', 'assets/audio/trash.mp3');
    this.load.audio('sfx_waffle', 'assets/audio/waffle.mp3');
    this.load.audio('sfx_fire', 'assets/audio/fire.mp3');

    // BGM
    this.load.audio('bgm_home', 'assets/audio/home_bgm.mp3');
    this.load.audio('bgm_play', 'assets/audio/play_bgm.mp3');
  }

  async create(): Promise<void> {
    // Supabase 세션 확인 (OAuth 리다이렉트 후 복귀 시)
    if (isSupabaseConnected() && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 로그인된 세션이 있으면 바로 홈으로
        localStorage.setItem('waffle_hasLoggedIn', 'true');
        localStorage.removeItem('waffle_isGuest');
        this.scene.start('HomeScene');
        return;
      }
    }

    // 이미 로그인한 적 있으면 홈으로, 아니면 로그인 화면으로
    const hasLoggedIn = localStorage.getItem('waffle_hasLoggedIn');
    
    if (hasLoggedIn) {
      this.scene.start('HomeScene');
    } else {
      this.scene.start('LoginScene');
    }
  }
}
