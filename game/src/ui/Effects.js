// 🎉 게임 이펙트 모음 — 무료 자체 구현 (Phaser 기반)
// 상업 이용 가능, 외부 라이브러리 의존 X

import Phaser from 'phaser';

const PARTY_COLORS = [
  0xFF6B9D, 0xFFB347, 0xFFE066, 0x95E1D3,
  0x7FDBFF, 0xB19CFF, 0xFF8FAB, 0xFFD93D,
];

/**
 * 컨페티(꽃가루) 폭죽 — 화면 위에서 떨어지는 색종이
 * 완성/큰 보상 등에 사용
 *
 * @param {Phaser.Scene} scene
 * @param {object} opts
 * @param {number} opts.count - 컨페티 개수 (기본 80)
 * @param {number} opts.duration - 떨어지는 시간 (기본 2500)
 * @param {number} opts.originY - 시작 y (기본 -50, 화면 위)
 * @param {number[]} opts.colors - 색 hex 배열 (기본 PARTY_COLORS)
 */
export function fireConfetti(scene, opts = {}) {
  const {
    count = 80,
    duration = 2500,
    originY = -50,
    colors = PARTY_COLORS,
  } = opts;

  const W = scene.scale.width;
  const H = scene.scale.height;

  for (let i = 0; i < count; i++) {
    const startX = Phaser.Math.Between(0, W);
    const color = Phaser.Utils.Array.GetRandom(colors);
    const size = Phaser.Math.Between(8, 16);
    const isCircle = Math.random() < 0.5;

    let piece;
    if (isCircle) {
      piece = scene.add.circle(startX, originY, size / 2, color, 1);
    } else {
      piece = scene.add.rectangle(startX, originY, size, size * 1.4, color);
      piece.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    }
    piece.setDepth(2000);

    // 좌우로 흔들리며 떨어짐
    const swayAmplitude = Phaser.Math.Between(40, 120);
    const driftX = startX + Phaser.Math.Between(-swayAmplitude, swayAmplitude);
    const targetY = H + 80;
    const dur = duration + Phaser.Math.Between(-400, 600);
    const delay = Phaser.Math.Between(0, 800);

    scene.tweens.add({
      targets: piece,
      x: driftX,
      y: targetY,
      rotation: piece.rotation + Phaser.Math.FloatBetween(2, 8) * (Math.random() < 0.5 ? -1 : 1),
      duration: dur,
      delay,
      ease: 'Cubic.easeIn',
      onComplete: () => piece.destroy(),
    });
  }
}

/**
 * 별가루 폭발 (특정 위치에서 360도 발산)
 * 매칭 성공/아이템 캐치 등에 사용
 *
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {object} opts
 * @param {number} opts.count - 별 개수 (기본 12)
 * @param {number} opts.distance - 발산 거리 (기본 100)
 * @param {string[]} opts.colors - hex 색 (기본 골드 톤)
 * @param {number} opts.duration - 지속시간 (기본 700)
 */
export function starBurst(scene, x, y, opts = {}) {
  const {
    count = 12,
    distance = 100,
    colors = ['#FFD93D', '#FFE066', '#FFB347'],
    duration = 700,
    sizeRange = [22, 38],
  } = opts;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const dist = distance * (0.6 + Math.random() * 0.6);
    const sparkle = scene.add.text(x, y, '✦', {
      fontFamily: 'Arial',
      fontSize: `${Phaser.Math.Between(sizeRange[0], sizeRange[1])}px`,
      color: Phaser.Utils.Array.GetRandom(colors),
    }).setOrigin(0.5).setDepth(1500);

    scene.tweens.add({
      targets: sparkle,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      alpha: 0,
      scale: 0.3,
      duration: duration + Phaser.Math.Between(-100, 200),
      ease: 'Cubic.easeOut',
      onComplete: () => sparkle.destroy(),
    });
  }
}

/**
 * 화면 펄스 플래시 (특정 색으로 화면 깜빡)
 * 큰 보상/이벤트 알림에 사용 (camera.flash 보완)
 */
export function screenFlash(scene, opts = {}) {
  const {
    color = 0xFFFFFF,
    alpha = 0.4,
    duration = 200,
  } = opts;

  const W = scene.scale.width;
  const H = scene.scale.height;
  const flash = scene.add.rectangle(W / 2, H / 2, W, H, color, alpha);
  flash.setDepth(2500);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

/**
 * 카메라 약하게 흔들기 (좋은 일 — 매칭 성공, 큰 점수)
 */
export function gentleShake(scene, intensity = 0.005, duration = 200) {
  scene.cameras.main.shake(duration, intensity, false);
}

/**
 * 점수 폼업 — 큰 흰 텍스트가 톡 튀어오르며 위로 (스타 캐치 스타일)
 */
export function scorePopup(scene, x, y, text, opts = {}) {
  const {
    fontSize = 100,
    color = '#FFFFFF',
    rise = 120,
    duration = 1100,
    fontFamily = 'Arial',
  } = opts;

  const popup = scene.add.text(x, y, text, {
    fontFamily, fontSize: `${fontSize}px`, color,
  }).setOrigin(0.5).setDepth(1800);
  popup.setScale(0);

  scene.tweens.add({
    targets: popup, scale: 1.1, duration: 200, ease: 'Back.out',
  });
  scene.tweens.add({
    targets: popup, y: y - rise, alpha: 0, duration, delay: 200, ease: 'Cubic.easeOut',
    onComplete: () => popup.destroy(),
  });
  return popup;
}
