import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { HomeScene } from '../scenes/HomeScene';
import { GameScene } from '../scenes/GameScene';
import { ShopScene } from '../scenes/ShopScene';
import { DayTreeScene } from '../scenes/DayTreeScene';
import { TutorialScene } from '../scenes/TutorialScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

export { GAME_WIDTH, GAME_HEIGHT };

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#FFF8E7',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, HomeScene, GameScene, ShopScene, DayTreeScene, TutorialScene, SettingsScene],
};
