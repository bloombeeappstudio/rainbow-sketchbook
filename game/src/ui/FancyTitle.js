// 🎀 미니게임 타이틀 — 깔끔한 텍스트 (그림자 X)
import { FONTS } from '../config.js';

/**
 * 미니게임 공용 타이틀
 * @param {Phaser.Scene} scene
 * @param {number} x - 가운데 x
 * @param {number} y - 가운데 y
 * @param {string} label - 타이틀 텍스트
 * @param {object} opts - 색/사이즈 옵션
 * @returns {Phaser.GameObjects.Text} 타이틀 텍스트
 */
export function makeFancyTitle(scene, x, y, label, opts = {}) {
  const {
    titleColor = '#FFD8E2',
    titleSize  = 64,
  } = opts;

  return scene.add.text(x, y, label, {
    fontFamily: FONTS.game,
    fontSize: `${titleSize}px`,
    color: titleColor,
  }).setOrigin(0.5);
}
