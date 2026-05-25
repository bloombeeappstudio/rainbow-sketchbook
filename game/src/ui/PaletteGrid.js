// 🎨 PaletteGrid — 8×8 색상 그리드 팝업 (사이드바 옆 인라인)
//   - Row 1 (무료) + Row 2~8 (잠금 — 반투명 막 + 가운데 자물쇠 1개)
//   - 사이드바 paint 버튼 좌측에 펼침 (ToolPopup과 동일 스타일)
//   - 사용법: showPaletteGrid(scene, anchorX, topY, { onColorSelect, onLockedClick })
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';
import { GRID_PALETTE_IDS, getGridColor, isGridCellFree } from '../data/colors.js';
import { IAPSystem } from '../systems/IAPSystem.js';

const ROWS = 8;
const COLS = 8;
const CELL_SIZE = 75;           // paint→complete 버튼 라인까지 (총 약 670px)
const CELL_GAP  = 6;
const PANEL_PAD = 14;           // 패널 안쪽 여백
const ANCHOR_OFFSET_X = 120;    // 사이드바 paint 버튼에서 좌측으로 떨어진 거리 (ToolPopup과 동일)

/**
 * 8x8 팔레트 그리드 팝업 (사이드바 인라인)
 * @param {Phaser.Scene} scene
 * @param {number} anchorX - 기준점 x (보통 사이드바 paint 버튼 x)
 * @param {number} topY - 그리드 top이 정렬될 y (paint 버튼 y에 맞춤)
 * @param {Object} opts - onColorSelect, onLockedClick, onClose (가드 해제용)
 */
export function showPaletteGrid(scene, anchorX, topY, opts = {}) {
  const { onColorSelect, onLockedClick, onClose } = opts;

  // 패널 크기 계산
  const gridW = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP;
  const gridH = ROWS * CELL_SIZE + (ROWS - 1) * CELL_GAP;
  const pw = gridW + PANEL_PAD * 2;
  const ph = gridH + PANEL_PAD * 2;

  // 위치 — 사이드바 좌측, 그리드 top = topY - CELL_SIZE/2 (paint 버튼 y 라인에 첫 행 정렬)
  const panelRight = anchorX - ANCHOR_OFFSET_X + CELL_SIZE / 2;   // 패널 우측 끝
  const px = panelRight - pw;
  const py = topY - CELL_SIZE / 2 - PANEL_PAD;

  const root = scene.add.container(0, 0).setDepth(4500);

  // 투명 오버레이 (외부 클릭 시 닫기)
  const overlay = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001).setInteractive();
  root.add(overlay);
  overlay.on('pointerup', () => closeGrid());

  // 패널 그림자 + 배경
  const psh = scene.add.graphics();
  psh.fillStyle(0x000000, 0.35);
  psh.fillRoundedRect(px + 4, py + 8, pw, ph, 22);
  root.add(psh);

  const pbg = scene.add.graphics();
  pbg.fillStyle(0xFFF4F7, 1);
  pbg.fillRoundedRect(px, py, pw, ph, 22);
  pbg.lineStyle(4, 0xFFD8E2, 1);
  pbg.strokeRoundedRect(px, py, pw, ph, 22);
  root.add(pbg);

  const premiumUnlocked = IAPSystem.isPremiumUnlocked();

  // 그리드 셀
  const gridStartX = px + PANEL_PAD;
  const gridStartY = py + PANEL_PAD;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = getGridColor(r, c);
      if (!color) continue;

      const x = gridStartX + c * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;
      const y = gridStartY + r * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2;

      const isFree = isGridCellFree(r);
      const accessible = isFree || premiumUnlocked;

      makeCell(scene, root, x, y, color, () => {
        if (accessible) {
          soundManager.play('click');
          if (onColorSelect) onColorSelect(color);
          closeGrid();
        } else {
          soundManager.play('click');
          if (onLockedClick) onLockedClick();
        }
      });
    }
  }

  // Row 2~8 잠금 영역에 반투명 막 + 가운데 큰 자물쇠 1개
  if (!premiumUnlocked) {
    const lockedRowYStart = gridStartY + 1 * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2;
    const lockedRowYEnd   = gridStartY + ROWS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const lockedAreaW = gridW;
    const lockedAreaH = lockedRowYEnd - lockedRowYStart;

    const lockDim = scene.add.graphics();
    lockDim.fillStyle(0xFFFFFF, 0.62);
    lockDim.fillRoundedRect(gridStartX - 4, lockedRowYStart - 3, lockedAreaW + 8, lockedAreaH + 6, 14);
    root.add(lockDim);

    const lockX = gridStartX + lockedAreaW / 2;
    const lockY = lockedRowYStart + lockedAreaH / 2;
    drawBigStarLock(scene, root, lockX, lockY, 90);

    const lockZone = scene.add.zone(lockX, lockY, lockedAreaW, lockedAreaH).setInteractive({ useHandCursor: true });
    root.add(lockZone);
    lockZone.on('pointerup', () => {
      soundManager.play('click');
      if (onLockedClick) onLockedClick();
    });
  }

  // 우상단 ✕ (작게)
  const closeX = px + pw - 22;
  const closeY = py + 22;
  const closeBg = scene.add.graphics();
  closeBg.fillStyle(0xFFCCDD, 1);
  closeBg.fillCircle(closeX, closeY, 18);
  root.add(closeBg);
  root.add(scene.add.text(closeX, closeY - 2, '✕', {
    fontFamily: FONTS.bold, fontSize: '22px', color: '#C84070',
  }).setOrigin(0.5));
  const closeZone = scene.add.zone(closeX, closeY, 50, 50).setInteractive({ useHandCursor: true });
  root.add(closeZone);
  closeZone.on('pointerup', () => {
    soundManager.play('click');
    closeGrid();
  });

  // 좌측에서 슬라이드 인 (ToolPopup과 동일)
  root.x = 24;
  root.alpha = 0;
  scene.tweens.add({
    targets: root, x: 0, alpha: 1,
    duration: 180, ease: 'Cubic.easeOut',
  });

  function closeGrid() {
    scene.tweens.add({
      targets: root, x: 24, alpha: 0,
      duration: 140, ease: 'Cubic.easeIn',
      onComplete: () => {
        root.destroy();
        if (onClose) onClose();
      },
    });
  }

  return root;
}

// 한 셀 그리기
function makeCell(scene, root, cx, cy, color, onClick) {
  const size = CELL_SIZE;
  const half = size / 2;
  const cornerR = 14;

  // 그림자
  const sh = scene.add.graphics();
  sh.fillStyle(0x000000, 0.20);
  sh.fillRoundedRect(cx - half, cy - half + 4, size, size, cornerR);
  root.add(sh);

  // 색 (무지개 특수 처리)
  const bg = scene.add.graphics();
  if (color.id === 100 && color.rainbowGradient) {
    const stops = color.rainbowGradient;
    const stripeW = size / stops.length;
    stops.forEach((hex, i) => {
      const stripeColor = parseInt(hex.replace('#', ''), 16);
      bg.fillStyle(stripeColor, 1);
      bg.fillRect(cx - half + i * stripeW, cy - half, stripeW + 0.5, size);
    });
    const mask = scene.make.graphics({ add: false });
    mask.fillStyle(0xFFFFFF, 1);
    mask.fillRoundedRect(cx - half, cy - half, size, size, cornerR);
    bg.setMask(mask.createGeometryMask());
  } else {
    const c = parseInt(color.hex.replace('#', ''), 16);
    bg.fillStyle(c, 1);
    bg.fillRoundedRect(cx - half, cy - half, size, size, cornerR);
  }
  root.add(bg);

  // 광택
  const gloss = scene.add.graphics();
  gloss.fillStyle(0xFFFFFF, 0.32);
  gloss.fillRoundedRect(cx - half + 5, cy - half + 4, size - 10, 16, 8);
  root.add(gloss);

  // 외곽선
  const border = scene.add.graphics();
  border.lineStyle(3, 0xFFFFFF, 0.85);
  border.strokeRoundedRect(cx - half, cy - half, size, size, cornerR);
  root.add(border);

  // 클릭
  const zone = scene.add.zone(cx, cy, size + 4, size + 4).setInteractive({ useHandCursor: true });
  root.add(zone);
  zone.on('pointerdown', () => { bg.y = 2; gloss.y = 2; });
  zone.on('pointerout', () => { bg.y = 0; gloss.y = 0; });
  zone.on('pointerup', () => {
    bg.y = 0; gloss.y = 0;
    onClick();
  });
}

// 큰 별 자물쇠 (잠금 영역 가운데에 하나만)
function drawBigStarLock(scene, root, cx, cy, size) {
  const g = scene.add.graphics();
  const r1 = size;
  const r2 = size * 0.45;
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (-Math.PI / 2) + (i * Math.PI / 5);
    const r = i % 2 === 0 ? r1 : r2;
    points.push(cx + Math.cos(angle) * r);
    points.push(cy + Math.sin(angle) * r);
  }
  // 그림자
  g.fillStyle(0xC8A030, 1);
  const shadowPts = [...points];
  for (let i = 1; i < shadowPts.length; i += 2) shadowPts[i] += 5;
  g.fillPoints(shadowPts, true);
  // 별
  g.fillStyle(0xFFD24A, 1);
  g.fillPoints(points, true);
  g.lineStyle(3, 0xC8A030, 1);
  g.strokePoints(points, true, true);
  // 키 구멍
  g.fillStyle(0x2A1A00, 1);
  g.fillCircle(cx, cy - 3, size * 0.18);
  g.fillRect(cx - size * 0.07, cy - 3, size * 0.14, size * 0.32);
  root.add(g);
}
