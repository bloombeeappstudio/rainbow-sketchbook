// 💬 말풍선 — 제미나이 SVG 디자인 그대로 (assets/ui/speech-bubble-*.svg)
// 흰 0.9 알파 / 둥근 모서리 / 가운데 꼬리 / 테두리 X
//
// SVG 비율 참고:
//   main 1200×360: body 1200×320, rx=60 (18.75% of body height),
//                  tail 80×40 (6.7%/12.5% of body)
//   small 800×240: body 800×210, rx=40 (19% of body height),
//                  tail 60×30 (7.5%/14% of body)

/**
 * 말풍선 그리기 (Phaser graphics)
 * @param {Phaser.Scene} scene
 * @param {number} x - 본체 중심 x
 * @param {number} y - 본체 중심 y
 * @param {number} w - 본체 너비
 * @param {number} h - 본체 높이
 * @param {object} opts
 * @param {'up'|'down'} opts.tailDirection - 꼬리 방향 (캐릭터가 위에 있으면 'up', 아래면 'down')
 * @param {number} opts.alpha - 본체 알파 (기본 0.9, SVG와 동일)
 * @param {number} opts.radius - 모서리 라운드 반지름 (생략 시 SVG 비율로 자동)
 * @param {number} opts.tailWidth - 꼬리 폭 (생략 시 SVG 비율)
 * @param {number} opts.tailHeight - 꼬리 높이 (생략 시 SVG 비율)
 * @param {number} opts.shadowAlpha - 그림자 알파 (기본 0.22)
 * @returns {Phaser.GameObjects.Graphics}
 */
export function makeSpeechBubble(scene, x, y, w, h, opts = {}) {
  const {
    tailDirection = 'up',
    alpha         = 0.9,
    radius        = Math.min(60, h * 0.2),         // SVG: 60 on h=320 ≈ 19%
    tailWidth     = Math.max(40, w * 0.067),       // SVG: 80 on w=1200 = 6.7%
    tailHeight    = Math.max(22, h * 0.125),       // SVG: 40 on h=320 = 12.5%
    shadowAlpha   = 0.22,
    shadowOffsetX = 4,
    shadowOffsetY = 8,
  } = opts;

  const g = scene.add.graphics();

  // 그림자 (옅게)
  g.fillStyle(0x000000, shadowAlpha);
  g.fillRoundedRect(
    x - w / 2 + shadowOffsetX,
    y - h / 2 + shadowOffsetY,
    w, h, radius
  );

  // 본체 (흰색 반투명, 테두리 X)
  g.fillStyle(0xFFFFFF, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);

  // 꼬리 (본체 외부로 — 알파 겹침 방지)
  const tailHalfW = tailWidth / 2;
  g.fillStyle(0xFFFFFF, alpha);
  if (tailDirection === 'up') {
    g.fillTriangle(
      x - tailHalfW, y - h / 2,
      x + tailHalfW, y - h / 2,
      x,             y - h / 2 - tailHeight
    );
  } else {
    g.fillTriangle(
      x - tailHalfW, y + h / 2,
      x + tailHalfW, y + h / 2,
      x,             y + h / 2 + tailHeight
    );
  }

  return g;
}
