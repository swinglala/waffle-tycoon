import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
// Pretendard는 index.html에서 CDN subset으로 로드

// 게임 인스턴스 생성
const game = new Phaser.Game(gameConfig);

// 개발용 - 윈도우 객체에 게임 인스턴스 노출
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}

export default game;
