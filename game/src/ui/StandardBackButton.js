// 🔙 StandardBackButton — 모든 씬의 우상단 나가기 버튼 통일 디자인
//   원본: CharacterDexScene (사용자 피드백: 마음에 듦)
//   변경: 사이즈 200×88 → 220×100 (살짝 키움), 폰트 36 → 40
//
// 사용:
//   import { createStandardBackButton } from '../ui/StandardBackButton.js';
//   createStandardBackButton(this, () => this.exitToMain());

import { GAME_WIDTH, FONTS } from '../config.js';

const DEFAULT_X_OFFSET = 140;   // GAME_WIDTH - 140 = 우상단 중심 x
const DEFAULT_Y = 80;
const DEFAULT_W = 220;
const DEFAULT_H = 100;

/**
 * 표준 우상단 나가기 버튼
 * @param {Phaser.Scene} scene
 * @param {() => void} onClick
 * @param {object} opts - { label, x, y, w, h }
 * @returns {Phaser.GameObjects.Container}
 */
export function createStandardBackButton(scene, onClick, opts = {}) {
  const label = opts.label || '‹  나가기';
  const x = opts.x ?? (GAME_WIDTH - DEFAULT_X_OFFSET);
  const y = opts.y ?? DEFAULT_Y;
  const w = opts.w ?? DEFAULT_W;
  const h = opts.h ?? DEFAULT_H;

  const container = scene.add.container(x, y);
  container.setDepth(100);

  // 그림자
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.45);
  shadow.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
  container.add(shadow);

  // 본체 (흰 반투명 + 흰 테두리)
  const bg = scene.add.graphics();
  bg.fillStyle(0xFFFFFF, 0.18);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  bg.lineStyle(3, 0xFFFFFF, 0.6);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  container.add(bg);

  // 텍스트
  const text = scene.add.text(0, 0, label, {
    fontFamily: FONTS.bold,
    fontSize: '40px',
    color: '#FFFFFF',
  }).setOrigin(0.5);
  container.add(text);

  // 인터랙션
  const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  container.add(hit);
  hit.on('pointerdown', () => { container.y = y + 4; });
  hit.on('pointerup', () => {
    container.y = y;
    if (onClick) onClick();
  });
  hit.on('pointerout', () => { container.y = y; });

  return container;
}
