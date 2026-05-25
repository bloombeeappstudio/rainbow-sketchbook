// ✨ StarField — 밤하늘 반짝이는 별 효과 (재사용 모듈)
//   BootScene 로딩화면에서 처음 만든 효과 → ColoringScene/SketchScene/MainScene 공용으로 추출
//   사용법: addStarField(scene, { count: 80, depth: 0 })
import Phaser from 'phaser';

/**
 * 밤하늘 별 효과 추가
 * @param {Phaser.Scene} scene - 대상 씬
 * @param {Object} opts
 * @param {number} [opts.count=80] - 별 개수
 * @param {number} [opts.depth=0] - 별 depth (배경 위/캔버스 아래 등)
 * @param {number} [opts.x=0] - 영역 시작 x
 * @param {number} [opts.y=0] - 영역 시작 y
 * @param {number} [opts.w] - 영역 폭 (default GAME_WIDTH)
 * @param {number} [opts.h] - 영역 높이 (default GAME_HEIGHT)
 * @param {number} [opts.minR=1] - 별 최소 반경
 * @param {number} [opts.maxR=3] - 별 최대 반경
 * @returns {Phaser.GameObjects.Container} 모든 별을 담은 container (destroy 시 일괄 정리)
 */
export function addStarField(scene, opts = {}) {
  const {
    count = 80,
    depth = 0,
    x = 0,
    y = 0,
    w = scene.sys.game.config.width,
    h = scene.sys.game.config.height,
    minR = 1,
    maxR = 3,
  } = opts;

  const container = scene.add.container(0, 0).setDepth(depth);

  for (let i = 0; i < count; i++) {
    const sx = x + Phaser.Math.Between(0, w);
    const sy = y + Phaser.Math.Between(0, h);
    const size = Phaser.Math.Between(minR, maxR);
    const alpha0 = Phaser.Math.FloatBetween(0.3, 1);
    const star = scene.add.circle(sx, sy, size, 0xFFFFFF, alpha0);
    container.add(star);
    scene.tweens.add({
      targets: star,
      alpha: { from: 0.3, to: 1 },
      duration: Phaser.Math.Between(1500, 3500),
      yoyo: true,
      repeat: -1,
    });
  }

  return container;
}
