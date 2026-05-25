// 🎁 RewardPopup — 보상 등장 (쿠키런 톤, 큰 사이즈, 어긋남 X, 튕김 X)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { ToseumiGuide } from '../systems/ToseumiGuide.js';
import { soundManager } from '../systems/SoundManager.js';

// ✅ 모든 등급 통일 — "최고야!" 단일 텍스트 (사용자 피드백)
//    등급별로 bg/glow 색만 다르게 유지
const UNIFIED_BANNER = '최고야!';
const UNIFIED_BANNER_COLOR = '#FFFFFF';

const TIER_STYLE = {
  common:    { bg: 0xFFB6C8, glow: 0xFF8FAB, banner: UNIFIED_BANNER, bannerColor: UNIFIED_BANNER_COLOR },
  uncommon:  { bg: 0xB19CFF, glow: 0x9B7DDB, banner: UNIFIED_BANNER, bannerColor: UNIFIED_BANNER_COLOR },
  rare:      { bg: 0xFFD93D, glow: 0xFFA500, banner: UNIFIED_BANNER, bannerColor: UNIFIED_BANNER_COLOR },
  legendary: { bg: 0xFF6B9D, glow: 0xFFB347, banner: UNIFIED_BANNER, bannerColor: UNIFIED_BANNER_COLOR },
};

const STICKER_EMOJI = {
  '노란 별': '⭐', '분홍 하트': '💗', '무지개': '🌈', '벚꽃': '🌸',
  '솜사탕 구름': '☁️', '음표': '🎵', '풍선': '🎈', '컵케이크': '🧁',
  '도넛': '🍩', '리본': '🎀', '작은 달': '🌙', '반짝이 다이아': '💎',
};
const GEM_SHAPE_EMOJI = { heart: '💗', star: '⭐', diamond: '💎', drop: '💧' };

/**
 * 잔잔한 반짝임 — 로고 주변 빛가루가 부드럽게 떠오르며 페이드
 * (사용자 피드백: 도장 쾅 X, 부드럽게)
 */
function playGentleSparkle(scene, root, cx, cy) {
  const colors = ['#FFD93D', '#FFFFFF', '#FFB6C8', '#B19CFF', '#FFE066'];
  const symbols = ['✦', '✧', '✨'];
  const total = 14;

  for (let i = 0; i < total; i++) {
    // 로고 주변에 흩뿌리기 (가로넓게, 세로 좁게)
    const ox = Phaser.Math.Between(-300, 300);
    const oy = Phaser.Math.Between(-220, 200);
    const sx = cx + ox;
    const sy = cy + oy;
    const ey = sy - Phaser.Math.Between(60, 140);   // 위로 살짝 떠오름

    const star = scene.add.text(sx, sy,
      symbols[Math.floor(Math.random() * symbols.length)], {
        fontSize: `${Phaser.Math.Between(22, 40)}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
      }).setOrigin(0.5);
    star.setAlpha(0);
    root.add(star);

    // 페이드 인 → 잠시 머무름 → 페이드 아웃 (한 사이클)
    scene.tweens.add({
      targets: star,
      alpha: { from: 0, to: 0.9 },
      scale: { from: 0.4, to: 1 },
      duration: 500,
      delay: i * 70,
      yoyo: true,
      hold: 400,
      ease: 'Sine.easeInOut',
      onComplete: () => star.destroy(),
    });

    // 위로 부드럽게 떠오름
    scene.tweens.add({
      targets: star,
      y: ey,
      duration: 1800,
      delay: i * 70,
      ease: 'Sine.easeOut',
    });
  }
}

/**
 * 더 귀여운 크레파스 그리기 (둥글둥글, 작은 별 장식)
 */
function drawCrayon(scene, x, y, hexColor) {
  const container = scene.add.container(x, y);

  const c = Phaser.Display.Color.HexStringToColor(hexColor).color;
  const dark = Phaser.Display.Color.IntegerToColor(c).darken(30).color;
  const light = Phaser.Display.Color.IntegerToColor(c).lighten(20).color;

  const w = 100;   // 가로 (조금 키움)
  const h = 220;   // 세로 (조금 키움)

  // 그림자
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.18);
  shadow.fillEllipse(8, h / 2 + 18, w + 12, 22);
  container.add(shadow);

  // 본체 (둥근 사각형 — 모서리 매우 부드럽게)
  const body = scene.add.graphics();
  body.fillStyle(c, 1);
  body.fillRoundedRect(-w / 2, -h / 2 + 30, w, h - 30, 24);
  body.lineStyle(4, dark, 0.8);
  body.strokeRoundedRect(-w / 2, -h / 2 + 30, w, h - 30, 24);
  container.add(body);

  // 끝부분 (둥근 원뿔 — 둥글둥글하게)
  const tip = scene.add.graphics();
  tip.fillStyle(dark, 1);
  // 둥근 끝 (위쪽 살짝 둥근)
  tip.beginPath();
  tip.moveTo(-w / 2 + 6, -h / 2 + 30);
  tip.lineTo(w / 2 - 6, -h / 2 + 30);
  tip.lineTo(w / 4, -h / 2 - 6);
  tip.arc(0, -h / 2 - 8, w / 4 + 2, 0, Math.PI, true);
  tip.lineTo(-w / 4, -h / 2 - 6);
  tip.closePath();
  tip.fillPath();
  container.add(tip);

  // 끝부분 밝은 톤 하이라이트 (귀여움 강화)
  const tipHighlight = scene.add.graphics();
  tipHighlight.fillStyle(light, 0.6);
  tipHighlight.fillCircle(-w / 4 + 4, -h / 2 + 14, 8);
  container.add(tipHighlight);

  // 라벨 종이 (가운데 흰 띠 — 둥글게)
  const label = scene.add.graphics();
  label.fillStyle(0xFFFFFF, 0.96);
  label.fillRoundedRect(-w / 2 + 5, -20, w - 10, 80, 12);
  label.lineStyle(2, dark, 0.5);
  label.strokeRoundedRect(-w / 2 + 5, -20, w - 10, 80, 12);
  container.add(label);

  // 라벨 줄무늬
  const stripeTop = scene.add.graphics();
  stripeTop.fillStyle(dark, 0.4);
  stripeTop.fillRect(-w / 2 + 5, -16, w - 10, 4);
  container.add(stripeTop);
  const stripeBottom = scene.add.graphics();
  stripeBottom.fillStyle(dark, 0.4);
  stripeBottom.fillRect(-w / 2 + 5, 52, w - 10, 4);
  container.add(stripeBottom);

  // 라벨 안 작은 별 ⭐ (귀여움 ↑)
  const star = scene.add.text(0, 20, '⭐', {
    fontFamily: FONTS.game,
    fontSize: '34px',
  }).setOrigin(0.5);
  container.add(star);

  // 본체 하단 광택 (둥근 느낌)
  const bottomShine = scene.add.graphics();
  bottomShine.fillStyle(light, 0.4);
  bottomShine.fillEllipse(0, h / 2 - 6, w - 30, 14);
  container.add(bottomShine);

  return container;
}

export function showRewardPopup(scene, reward, onClose) {
  const { tier, items } = reward;
  const style = TIER_STYLE[tier];

  // 보상 사운드 — 트럼펫 fanfare + 박수 (어린이 동기부여)
  soundManager.attachScene(scene);
  soundManager.play('reward');

  const root = scene.add.container(0, 0);
  root.setDepth(1000);

  // ===== 어두운 배경 오버레이 =====
  const overlay = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
  overlay.setInteractive();
  root.add(overlay);

  // ===== 팝업 프레임 — 사이즈 줄임 (사용자 피드백) =====
  const frameW = 1300;       // 1700 → 1300
  const frameH = 820;        // 940 → 820
  const frameX = GAME_WIDTH / 2;
  const frameY = GAME_HEIGHT / 2;

  // 프레임 그림자
  const frameShadow = scene.add.graphics();
  frameShadow.fillStyle(0x000000, 0.4);
  frameShadow.fillRoundedRect(frameX - frameW / 2 + 8, frameY - frameH / 2 + 14, frameW, frameH, 60);
  root.add(frameShadow);

  // 프레임 본체 (밝은 미색)
  const frame = scene.add.graphics();
  frame.fillStyle(0xFFFAF5, 1);
  frame.fillRoundedRect(frameX - frameW / 2, frameY - frameH / 2, frameW, frameH, 60);
  // 프레임 테두리 (등급별 색)
  frame.lineStyle(10, style.bg, 1);
  frame.strokeRoundedRect(frameX - frameW / 2, frameY - frameH / 2, frameW, frameH, 60);
  // 안쪽 살짝 그라데이션 빛
  frame.fillGradientStyle(0xFFFFFF, 0xFFFFFF, 0xFFE4EC, 0xFFE4EC, 0.6);
  frame.fillRoundedRect(frameX - frameW / 2 + 14, frameY - frameH / 2 + 14, frameW - 28, frameH - 28, 50);
  root.add(frame);

  // ===== 글로우 (프레임 안쪽) =====
  const glow = scene.add.graphics();
  glow.fillStyle(style.glow, 0.35);
  glow.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 480);
  root.add(glow);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.15, to: 0.4 },
    duration: 1500,
    yoyo: true,
    repeat: -1,
  });

  // ===== 별가루 (대량, 더 길게, 색 다양) =====
  const sparkleColors = ['#FFD93D', '#FF6B9D', '#B19CFF', '#7FD8C0', '#FFFFFF', '#FFB347'];
  const sparkleSymbols = ['✦', '✧', '⭐', '✨'];

  // 첫 폭발 — 가운데에서 사방으로
  for (let i = 0; i < 80; i++) {
    const angle = (i / 80) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
    const distance = Phaser.Math.Between(220, 600);
    const sx = GAME_WIDTH / 2;
    const sy = GAME_HEIGHT / 2;
    const ex = sx + Math.cos(angle) * distance;
    const ey = sy + Math.sin(angle) * distance;

    const star = scene.add.text(sx, sy,
      sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)], {
      fontFamily: FONTS.bold,
      fontSize: `${Phaser.Math.Between(28, 52)}px`,
      color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
    }).setOrigin(0.5);
    root.add(star);

    scene.tweens.add({
      targets: star,
      x: ex, y: ey,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.4, to: 0.2 },
      angle: { from: 0, to: Phaser.Math.Between(-180, 180) },
      duration: 2800,
      delay: i * 20,
      ease: 'Cubic.out',
    });
  }

  // 두 번째 폭발 (1.2초 후) — 보상 등장 타이밍에 맞춰
  scene.time.delayedCall(1200, () => {
    for (let i = 0; i < 50; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(180, 500);
      const sx = GAME_WIDTH / 2;
      const sy = GAME_HEIGHT / 2;
      const ex = sx + Math.cos(angle) * distance;
      const ey = sy + Math.sin(angle) * distance;

      const star = scene.add.text(sx, sy, sparkleSymbols[Math.floor(Math.random() * sparkleSymbols.length)], {
        fontFamily: FONTS.bold,
        fontSize: `${Phaser.Math.Between(24, 48)}px`,
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
      }).setOrigin(0.5);
      root.add(star);

      scene.tweens.add({
        targets: star,
        x: ex, y: ey,
        alpha: { from: 1, to: 0 },
        scale: { from: 1.2, to: 0.3 },
        duration: 2500,
        ease: 'Cubic.out',
      });
    }
  });

  // 색종이 (위에서 떨어짐 — 지속적으로 1초간)
  const confettiColors = [0xFF6B9D, 0xFFB347, 0xFFE066, 0x95E1D3, 0xB19CFF, 0xFF8FAB];
  for (let i = 0; i < 40; i++) {
    const cx = Phaser.Math.Between(frameX - frameW / 2 + 50, frameX + frameW / 2 - 50);
    const startY = frameY - frameH / 2 - 50;
    const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    const piece = scene.add.rectangle(cx, startY, 14, 22, color);
    piece.setRotation(Phaser.Math.FloatBetween(0, Math.PI));
    root.add(piece);

    scene.tweens.add({
      targets: piece,
      y: frameY + frameH / 2 + 50,
      angle: Phaser.Math.Between(180, 720),
      alpha: { from: 1, to: 0.2 },
      duration: Phaser.Math.Between(2200, 3500),
      delay: 300 + i * 40,
      ease: 'Cubic.in',
    });
  }

  // ===== 큰 배너 (팝업 안 상단) — 균등 여백 55px =====
  //   frame y130~950(820): 배너(h110)+보상(h380)+버튼(h110)+여백4×55=820
  const bannerY = 240;          // frame 상단(130)에서 55px 여유 (배너 top=185)

  const bannerBg = scene.add.graphics();
  bannerBg.fillStyle(style.bg, 1);
  bannerBg.fillRoundedRect(GAME_WIDTH / 2 - 290, bannerY - 55, 580, 110, 55);  // 760×140 → 580×110
  bannerBg.lineStyle(6, 0xFFFFFF, 0.9);
  bannerBg.strokeRoundedRect(GAME_WIDTH / 2 - 290, bannerY - 55, 580, 110, 55);
  root.add(bannerBg);

  const bannerText = scene.add.text(GAME_WIDTH / 2, bannerY, style.banner, {
    fontFamily: FONTS.bold,
    fontSize: '78px',           // 96 → 78
    color: style.bannerColor,
    stroke: '#5A2A40',
    strokeThickness: 5,
  }).setOrigin(0.5);
  root.add(bannerText);

  // 부드러운 등장 (튕김 X)
  bannerBg.setAlpha(0);
  bannerText.setAlpha(0);
  scene.tweens.add({
    targets: [bannerBg, bannerText],
    alpha: 1,
    duration: 600,
    ease: 'Cubic.easeOut',
  });

  // 양 옆 별 — 사이즈 비례 줄임
  [-360, 360].forEach(offsetX => {
    const star = scene.add.text(GAME_WIDTH / 2 + offsetX, bannerY, '⭐', {
      fontFamily: FONTS.game,
      fontSize: '72px',         // 92 → 72
    }).setOrigin(0.5);
    root.add(star);

    star.setAlpha(0);
    scene.tweens.add({
      targets: star,
      alpha: 1,
      duration: 600,
      delay: 400,
      ease: 'Cubic.easeOut',
    });
    scene.tweens.add({
      targets: star,
      angle: { from: -10, to: 10 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1000,
    });
  });

  // ===== 토슴이 "참 잘했어요" 로고 (오른쪽 영역) — 균등 여백 =====
  //   가로: frame 1300, 카드(380)+로고(380), 양옆+사이 = 180px 균등
  //   세로: frame 중앙 540, 배너↔보상 / 보상↔버튼 = 55px 균등
  const logoX = GAME_WIDTH / 2 + 280;     // 카드와 균등 간격 (180px)
  const logoY = 540;                       // 세로 중앙 (균등 여백)
  const logoTargetSize = 380;              // 카드와 동일 사이즈
  const logoKey = scene.textures.exists('tosumi-logo-good') ? 'tosumi-logo-good'
                : scene.textures.exists('tosumi-logo-16')   ? 'tosumi-logo-16'
                : null;
  if (logoKey) {
    const logo = scene.add.image(logoX, logoY, logoKey);
    const tex = scene.textures.get(logoKey).getSourceImage();
    const baseScale = logoTargetSize / Math.max(tex.width, tex.height);

    // 시작: 살짝 작게 + 투명
    logo.setScale(baseScale * 0.85);
    logo.setAlpha(0);
    root.add(logo);

    const revealDelay = 1000;

    // 부드러운 페이드 인 + 살짝 확대 (충격 X)
    scene.tweens.add({
      targets: logo,
      alpha: 1,
      scale: baseScale,
      duration: 900,
      delay: revealDelay,
      ease: 'Sine.easeOut',
    });

    // 빛가루 잔잔하게 (등장 타이밍 맞춤)
    scene.time.delayedCall(revealDelay + 100, () => {
      playGentleSparkle(scene, root, logoX, logoY);
    });
  }

  // ===== 보상 아이템 (왼쪽 영역) — 균등 여백 =====
  //   카드 380×380, 로고와 균등 간격 180px, 세로 중앙
  const REWARD_AREA_CX = GAME_WIDTH / 2 - 280;   // 로고와 균등 간격 (180px)
  const REWARD_AREA_CY = 540;                     // 세로 중앙 (균등 여백)
  const cardW = 380;
  const cardH = 380;

  // 스티커 우선 → 없으면 첫 아이템
  const sticker = items.find(it => it.type === 'sticker');
  const displayItems = sticker ? [sticker] : items.slice(0, 1);

  displayItems.forEach((item, i) => {
    const x = REWARD_AREA_CX;
    const y = REWARD_AREA_CY;

    const cardShadow = scene.add.graphics();
    cardShadow.fillStyle(0x000000, 0.2);
    cardShadow.fillRoundedRect(x - cardW / 2 + 5, y - cardH / 2 + 8, cardW, cardH, 28);
    root.add(cardShadow);

    const cardBg = scene.add.graphics();
    cardBg.fillStyle(0xFFFFFF, 1);
    cardBg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 28);
    cardBg.lineStyle(5, style.bg, 1);
    cardBg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 28);
    root.add(cardBg);

    // 이미지 영역 + 네임태그 (카드 380으로 줄어든 비례)
    const visualY = y - 45;
    const tagW = cardW - 50;
    const tagH = 78;
    const tagY = y + cardH / 2 - 56;

    // 네임 태그 (공통 — 색깔 따라 라벨 텍스트 다르게)
    let labelText = '';

    if (item.type === 'color') {
      // 크레파스 (1.3배 — 카드 줄인 비례)
      const crayon = drawCrayon(scene, x, visualY, item.hex);
      crayon.setScale(1.3);
      crayon.setAlpha(0);
      root.add(crayon);
      scene.tweens.add({
        targets: crayon, alpha: 1,
        duration: 500, delay: 1200 + i * 200, ease: 'Cubic.easeOut',
      });
      labelText = item.name;

    } else if (item.type === 'sticker') {
      // 스티커 PNG 폴더 들어오면 PNG 우선, 없으면 emoji 폴백
      const stickerKey = item.textureKey || `sticker-${item.id}`;
      if (scene.textures.exists(stickerKey)) {
        const img = scene.add.image(x, visualY, stickerKey);
        const tex = scene.textures.get(stickerKey).getSourceImage();
        const scale = 240 / Math.max(tex.width, tex.height);    // 320 → 240
        img.setScale(scale);
        img.setAlpha(0);
        root.add(img);
        scene.tweens.add({
          targets: img, alpha: 1,
          duration: 500, delay: 1200 + i * 200, ease: 'Cubic.easeOut',
        });
      } else {
        const emoji = STICKER_EMOJI[item.name] || '✨';
        const stickerEmoji = scene.add.text(x, visualY, emoji, {
          fontFamily: FONTS.game,
          fontSize: '190px',     // 260 → 190 (카드 줄인 비례)
        }).setOrigin(0.5);
        stickerEmoji.setAlpha(0);
        root.add(stickerEmoji);
        scene.tweens.add({
          targets: stickerEmoji, alpha: 1,
          duration: 500, delay: 1200 + i * 200, ease: 'Cubic.easeOut',
        });
      }
      labelText = item.name;

    } else if (item.type === 'gem') {
      const emoji = GEM_SHAPE_EMOJI[item.shape] || '💎';
      const gemEmoji = scene.add.text(x, visualY, emoji, {
        fontFamily: FONTS.game,
        fontSize: '190px',
      }).setOrigin(0.5);
      gemEmoji.setAlpha(0);
      root.add(gemEmoji);
      scene.tweens.add({
        targets: gemEmoji, alpha: 1,
        duration: 500, delay: 1200 + i * 200, ease: 'Cubic.easeOut',
      });
      labelText = '보석';
    }

    // ===== 네임 태그 (공통, 큰 사이즈) =====
    const tagBg = scene.add.graphics();
    tagBg.fillStyle(0xFFF4F7, 1);
    tagBg.fillRoundedRect(x - tagW / 2, tagY - tagH / 2, tagW, tagH, tagH / 2);
    tagBg.lineStyle(6, style.bg, 1);
    tagBg.strokeRoundedRect(x - tagW / 2, tagY - tagH / 2, tagW, tagH, tagH / 2);
    root.add(tagBg);

    const tagText = scene.add.text(x, tagY, labelText, {
      fontFamily: FONTS.bold,
      fontSize: '40px',  // 52 → 40 (카드 줄인 비례)
      color: '#5A2A40',
    }).setOrigin(0.5);
    root.add(tagText);

    [tagBg, tagText].forEach(o => o.setAlpha(0));
    scene.tweens.add({
      targets: [tagBg, tagText], alpha: 1,
      duration: 500, delay: 1400 + i * 200, ease: 'Cubic.easeOut',
    });

    // NEW! 배지 (훨씬 크게)
    if (item.isNew) {
      const badgeW = 140;
      const badgeH = 80;
      const badgeX = x + cardW / 2 - 30;
      const badgeY = y - cardH / 2 - 10;

      // 그림자
      const newBadgeShadow = scene.add.graphics();
      newBadgeShadow.fillStyle(0x000000, 0.3);
      newBadgeShadow.fillRoundedRect(badgeX - badgeW / 2 + 4, badgeY - badgeH / 2 + 6, badgeW, badgeH, 28);
      root.add(newBadgeShadow);

      const newBadge = scene.add.graphics();
      newBadge.fillStyle(0xFF6B9D, 1);
      newBadge.fillRoundedRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 28);
      newBadge.lineStyle(4, 0xFFFFFF, 0.9);
      newBadge.strokeRoundedRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 28);
      root.add(newBadge);

      const newText = scene.add.text(badgeX, badgeY, 'NEW', {
        fontFamily: FONTS.bold,
        fontSize: '44px',
        color: '#FFFFFF',
      }).setOrigin(0.5);
      root.add(newText);

      [newBadgeShadow, newBadge, newText].forEach(o => o.setAlpha(0));
      scene.tweens.add({
        targets: [newBadgeShadow, newBadge, newText],
        alpha: 1,
        duration: 400,
        delay: 1600 + i * 200,
        ease: 'Cubic.easeOut',
      });
    }

    cardShadow.setAlpha(0);
    cardBg.setAlpha(0);
    scene.tweens.add({
      targets: [cardShadow, cardBg],
      alpha: 1,
      duration: 500,
      delay: 1100 + i * 200,
      ease: 'Cubic.easeOut',
    });
  });

  // ===== [확인] 버튼 (균등 여백 — frame 하단에서 55px) =====
  //   배너(y240, h110) → 보상(y540, h380) → 버튼(y840, h110)
  //   모든 인접 간격 55px 균등: 130→185(top55)→295(banner)→350(mid55)→730(reward)→785(mid55)→895(btn)→950(bot55)
  const btnX = GAME_WIDTH / 2;
  const btnY = 840;          // frame 하단(950)에서 55px 여유
  const btnW = 360;          // 440 → 360
  const btnH = 110;          // 140 → 110

  const btnContainer = scene.add.container(btnX, btnY);

  // 그림자
  const btnShadow = scene.add.graphics();
  btnShadow.fillStyle(0x4FA088, 1);
  btnShadow.fillRoundedRect(-btnW / 2, -btnH / 2 + 10, btnW, btnH, btnH / 2);
  btnContainer.add(btnShadow);

  // 본체
  const btn = scene.add.graphics();
  btn.fillStyle(0x7FD8C0, 1);
  btn.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
  // 살짝 광택 (위쪽)
  btn.fillStyle(0xFFFFFF, 0.25);
  btn.fillRoundedRect(-btnW / 2 + 8, -btnH / 2 + 8, btnW - 16, btnH / 2 - 4, btnH / 2);
  btnContainer.add(btn);

  // ✅ 텍스트 정중앙 정렬 + 폰트 통일 + 데코 이모지 제거 + 사이즈 업
  const btnText = scene.add.text(0, 0, '확인', {
    fontFamily: FONTS.bold,
    fontSize: '54px',          // 64 → 54
    color: '#FFFFFF',
    stroke: '#4FA088',
    strokeThickness: 4,
  }).setOrigin(0.5);
  btnContainer.add(btnText);

  // 인터랙션 (Container 단위)
  const hit = scene.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
  btnContainer.add(hit);

  root.add(btnContainer);

  // 부드러운 등장 (펄스 X, 튕김 X)
  btnContainer.setAlpha(0);
  scene.tweens.add({
    targets: btnContainer,
    alpha: 1,
    duration: 500,
    delay: 1800,
    ease: 'Cubic.easeOut',
  });

  // 닫기 함수
  const closePopup = () => {
    scene.tweens.add({
      targets: root,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        root.destroy();
        if (onClose) onClose();
      },
    });
  };

  // 누름 효과 (Container 단위 — 어긋남 원천 차단)
  hit.on('pointerdown', () => { btnContainer.y = btnY + 6; });
  hit.on('pointerup', () => {
    btnContainer.y = btnY;
    closePopup();
  });
  hit.on('pointerout', () => { btnContainer.y = btnY; });

  return root;
}
