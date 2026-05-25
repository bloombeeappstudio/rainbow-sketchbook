// 🎨 ColorButton — 크레파스 컬러 버튼 (Phaser Graphics)
//   PNG 이미지 의존 X — 아이들이 직관적으로 색만 보고 선택
//   두 가지 모드:
//     - makeColorButton:        동그라미 (기존, SketchScene 호환)
//     - makeSquareColorButton:  라운드 정사각형 3D (ColoringScene 신규)
//   공통: 선택 시 골드 ring + lift up + 살짝 scale

import Phaser from 'phaser';
import { rainbowAt } from '../data/colors.js';

/**
 * 컬러 버튼 컨테이너 생성
 * @param {Phaser.Scene} scene
 * @param {number} cx 중심 x
 * @param {number} cy 중심 y
 * @param {number} radius 반지름
 * @param {object} color { hex, name, id, isEraser?, isBlack?, rainbowGradient? }
 * @param {Function} onSelect (color) => void  — 클릭 시 호출
 * @returns {Phaser.GameObjects.Container} container with:
 *   - container.setSelected(true|false) — 선택 상태 표시
 *   - container._color — 원본 컬러 객체
 *   - container._defaultY — 원래 y (lift 복귀용)
 */
export function makeColorButton(scene, cx, cy, radius, color, onSelect) {
  const container = scene.add.container(cx, cy);
  container._defaultY = cy;
  container._color = color;
  container._radius = radius;

  // ===== 그림자 =====
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.35);
  shadow.fillCircle(3, 6, radius);
  container.add(shadow);

  // ===== 본체 =====
  if (color.isEraser) {
    drawEraser(scene, container, radius);
  } else if (color.rainbowGradient) {
    drawRainbow(scene, container, radius, color.rainbowGradient);
  } else {
    drawColor(scene, container, radius, color.hex);
  }

  // ===== 선택 ring (초기엔 숨김) =====
  const ring = scene.add.graphics();
  ring.setVisible(false);
  container.add(ring);
  container._ring = ring;

  // ===== 인터랙션 =====
  const hit = scene.add.zone(0, 0, radius * 2 + 16, radius * 2 + 16).setInteractive({ useHandCursor: true });
  container.add(hit);

  hit.on('pointerdown', () => { container.y = cy + 4; });
  hit.on('pointerup', () => {
    container.y = container._isSelected ? cy - 16 : cy;
    if (onSelect) onSelect(color);
  });
  hit.on('pointerout', () => {
    container.y = container._isSelected ? cy - 16 : cy;
  });

  // ===== setSelected 메서드 =====
  container.setSelected = (selected) => {
    container._isSelected = selected;
    if (selected) {
      // 골드 ring
      ring.clear();
      ring.lineStyle(6, 0xFFE066, 1);
      ring.strokeCircle(0, 0, radius + 9);
      ring.lineStyle(3, 0xFFFFFF, 0.9);
      ring.strokeCircle(0, 0, radius + 9);
      ring.setVisible(true);
      container.y = cy - 16;
      container.setScale(1.1);
    } else {
      ring.setVisible(false);
      container.y = cy;
      container.setScale(1);
    }
  };

  return container;
}

// ===== 단색 동그라미 (그라데이션 느낌) =====
function drawColor(scene, container, r, hex) {
  const c = Phaser.Display.Color.HexStringToColor(hex);
  const cInt = c.color;
  // 진하게 (아래쪽 그라데이션용)
  const darker = Phaser.Display.Color.IntegerToColor(cInt).darken(15).color;
  // 밝게 (위쪽 하이라이트용)
  const lighter = Phaser.Display.Color.IntegerToColor(cInt).lighten(20).color;

  const body = scene.add.graphics();
  // 아래 그림자 영역 (살짝 진한 색)
  body.fillStyle(darker, 1);
  body.fillCircle(0, 2, r);
  // 메인 색
  body.fillStyle(cInt, 1);
  body.fillCircle(0, 0, r * 0.97);
  // 위쪽 하이라이트 영역
  body.fillStyle(lighter, 0.6);
  body.fillEllipse(-r * 0.2, -r * 0.35, r * 1.2, r * 0.6);
  // 흰 테두리
  body.lineStyle(4, 0xFFFFFF, 1);
  body.strokeCircle(0, 0, r);
  container.add(body);

  // 위쪽 작은 광택 점
  const hi = scene.add.graphics();
  hi.fillStyle(0xFFFFFF, 0.85);
  hi.fillEllipse(-r * 0.35, -r * 0.4, r * 0.45, r * 0.25);
  container.add(hi);
}

// ===== 지우개 (흰 동그라미 + ✕ 표시) =====
function drawEraser(scene, container, r) {
  const body = scene.add.graphics();
  body.fillStyle(0xFFFFFF, 1);
  body.fillCircle(0, 0, r);
  body.lineStyle(4, 0xC66888, 1);
  body.strokeCircle(0, 0, r);
  container.add(body);

  const x = scene.add.text(0, 0, '✕', {
    fontFamily: 'sans-serif',
    fontSize: `${Math.round(r * 1.1)}px`,
    fontStyle: 'bold',
    color: '#C66888',
  }).setOrigin(0.5);
  container.add(x);
}

// ===========================================================================
// 🟦 라운드 정사각형 3D 컬러 버튼 (ColoringScene 신규)
//    - size 정사각형, 모서리 라운드, 깊은 그림자 + 상단 하이라이트
//    - 시그니처: makeSquareColorButton(scene, cx, cy, size, color, onSelect)
// ===========================================================================
export function makeSquareColorButton(scene, cx, cy, size, color, onSelect) {
  const container = scene.add.container(cx, cy);
  container._defaultY = cy;
  container._color = color;
  container._size = size;

  const half = size / 2;
  const cornerR = Math.round(size * 0.22);   // 라운드 정도

  // ===== 깊은 그림자 (3D 느낌) =====
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.4);
  shadow.fillRoundedRect(-half + 2, -half + 10, size, size, cornerR);
  container.add(shadow);

  // ===== 본체 (사각형 색) =====
  if (color.isEraser) {
    drawSquareEraser(scene, container, size, cornerR);
  } else if (color.rainbowGradient) {
    drawSquareRainbow(scene, container, size, cornerR, color.rainbowGradient);
  } else {
    drawSquareColor(scene, container, size, cornerR, color.hex);
  }

  // ===== 선택 ring (초기엔 숨김) =====
  const ring = scene.add.graphics();
  ring.setVisible(false);
  container.add(ring);
  container._ring = ring;

  // ===== 인터랙션 =====
  const hit = scene.add.zone(0, 0, size + 8, size + 8).setInteractive({ useHandCursor: true });
  container.add(hit);

  hit.on('pointerdown', () => { container.y = cy + 4; });
  hit.on('pointerup', () => {
    container.y = container._isSelected ? cy - 14 : cy;
    if (onSelect) onSelect(color);
  });
  hit.on('pointerout', () => {
    container.y = container._isSelected ? cy - 14 : cy;
  });

  container.setSelected = (selected) => {
    container._isSelected = selected;
    if (selected) {
      ring.clear();
      // 골드 외곽 ring (둥근 사각형)
      ring.lineStyle(6, 0xFFE066, 1);
      ring.strokeRoundedRect(-half - 8, -half - 8, size + 16, size + 16, cornerR + 6);
      ring.lineStyle(3, 0xFFFFFF, 0.9);
      ring.strokeRoundedRect(-half - 8, -half - 8, size + 16, size + 16, cornerR + 6);
      ring.setVisible(true);
      container.y = cy - 14;
      container.setScale(1.08);
    } else {
      ring.setVisible(false);
      container.y = cy;
      container.setScale(1);
    }
  };

  return container;
}

// ----- 단색 정사각형 (3D 그라데이션 느낌) -----
function drawSquareColor(scene, container, size, cornerR, hex) {
  const half = size / 2;
  const c = Phaser.Display.Color.HexStringToColor(hex);
  const cInt = c.color;
  const darker = Phaser.Display.Color.IntegerToColor(cInt).darken(18).color;
  const lighter = Phaser.Display.Color.IntegerToColor(cInt).lighten(28).color;

  const body = scene.add.graphics();
  // 본체 (베이스)
  body.fillStyle(darker, 1);
  body.fillRoundedRect(-half, -half + 3, size, size, cornerR);
  // 메인 색 (위에 살짝 작게)
  body.fillStyle(cInt, 1);
  body.fillRoundedRect(-half + 2, -half + 2, size - 4, size - 4, cornerR - 2);
  // 상단 하이라이트 (3D)
  body.fillStyle(lighter, 0.55);
  body.fillRoundedRect(-half + 6, -half + 6, size - 12, (size - 12) * 0.42, cornerR - 4);
  // 흰 외곽선
  body.lineStyle(4, 0xFFFFFF, 1);
  body.strokeRoundedRect(-half, -half, size, size, cornerR);
  container.add(body);

  // 좌상단 작은 광택 점
  const hi = scene.add.graphics();
  hi.fillStyle(0xFFFFFF, 0.85);
  hi.fillEllipse(-size * 0.22, -size * 0.26, size * 0.32, size * 0.16);
  container.add(hi);
}

// ----- 지우개 정사각형 -----
function drawSquareEraser(scene, container, size, cornerR) {
  const half = size / 2;
  const body = scene.add.graphics();
  body.fillStyle(0xE8C8B8, 1);                  // 살짝 살구색 베이스
  body.fillRoundedRect(-half, -half + 3, size, size, cornerR);
  body.fillStyle(0xFFFFFF, 1);
  body.fillRoundedRect(-half + 2, -half + 2, size - 4, size - 4, cornerR - 2);
  body.fillStyle(0xFFEAEA, 0.7);
  body.fillRoundedRect(-half + 6, -half + 6, size - 12, (size - 12) * 0.42, cornerR - 4);
  body.lineStyle(4, 0xC66888, 1);
  body.strokeRoundedRect(-half, -half, size, size, cornerR);
  container.add(body);

  const x = scene.add.text(0, 0, '✕', {
    fontFamily: 'sans-serif',
    fontSize: `${Math.round(size * 0.55)}px`,
    fontStyle: 'bold',
    color: '#C66888',
  }).setOrigin(0.5);
  container.add(x);
}

// ----- 무지개 정사각형 -----
function drawSquareRainbow(scene, container, size, cornerR, stops) {
  const half = size / 2;
  const body = scene.add.graphics();
  body.fillStyle(0x222222, 1);
  body.fillRoundedRect(-half, -half + 3, size, size, cornerR);

  // 6색 가로 슬라이스로 그라데이션 느낌
  const segH = (size - 4) / stops.length;
  for (let i = 0; i < stops.length; i++) {
    const c = Phaser.Display.Color.HexStringToColor(stops[i]).color;
    body.fillStyle(c, 1);
    body.fillRect(-half + 2, -half + 2 + i * segH, size - 4, segH + 1);
  }
  // 상단 하이라이트
  body.fillStyle(0xFFFFFF, 0.3);
  body.fillRoundedRect(-half + 6, -half + 6, size - 12, (size - 12) * 0.42, cornerR - 4);
  // 흰 외곽선
  body.lineStyle(4, 0xFFFFFF, 1);
  body.strokeRoundedRect(-half, -half, size, size, cornerR);
  container.add(body);

  const star = scene.add.text(0, 0, '✨', {
    fontSize: `${Math.round(size * 0.42)}px`,
  }).setOrigin(0.5);
  container.add(star);
}

// ===========================================================================
// 동그라미 무지개 (기존 — SketchScene 호환)
// ===========================================================================
function drawRainbow(scene, container, r, stops) {
  const body = scene.add.graphics();
  // 6색 stops 호 그리기
  const segments = stops.length;
  for (let i = 0; i < segments; i++) {
    const c = Phaser.Display.Color.HexStringToColor(stops[i]).color;
    const startAngle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const endAngle   = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
    body.fillStyle(c, 1);
    body.slice(0, 0, r, startAngle, endAngle, false);
    body.fillPath();
  }
  // 흰 테두리
  body.lineStyle(4, 0xFFFFFF, 1);
  body.strokeCircle(0, 0, r);
  container.add(body);

  // 가운데 작은 흰 동그라미 + ✨
  const center = scene.add.graphics();
  center.fillStyle(0xFFFFFF, 0.9);
  center.fillCircle(0, 0, r * 0.4);
  container.add(center);

  const star = scene.add.text(0, 0, '✨', {
    fontSize: `${Math.round(r * 0.55)}px`,
  }).setOrigin(0.5);
  container.add(star);
}
