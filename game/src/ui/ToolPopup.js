// 🛠️ ToolPopup — 5종 도구 선택 (사이드바 옆 인라인 버튼 4개)
//   - 페인트 붓 / 연필 / 크레파스 / 마커 (선 그리기 도구 4종)
//   - 사이드바 line 버튼 좌측에 세로로 펼쳐짐
//   - 텍스트 없음, 아이콘만 (어린이 친화)
//   - 사용법: showToolPopup(scene, anchorX, anchorY, currentTool, onSelect)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';

// 도구 4종 (대표님 결정: 펜/붓/크레파스/물감)
//   pencil: 가는 선 / brush: 두꺼운 선 / crayon: 크레파스 질감 / paint: flood fill
export const TOOLS = [
  { id: 'pencil', icon: '✏️',  color: 0xFFE066 },   // 펜 (가늘게)
  { id: 'brush',  icon: '🖌',  color: 0xFFD8E2 },   // 붓 (두껍게)
  { id: 'crayon', icon: '🖍',  color: 0xFFAB80 },   // 크레파스 (질감)
  { id: 'paint',  icon: '🪣',  color: 0xB8F0DD },   // 물감 (flood fill)
];

const BTN_SIZE = 95;          // 사이드바 버튼(105)보다 살짝 작게
const BTN_GAP  = 12;
const ANCHOR_OFFSET_X = 120;  // line 버튼에서 왼쪽으로 떨어진 거리

/**
 * 도구 선택 팝업 (사이드바 인라인)
 * @param {Phaser.Scene} scene
 * @param {number} anchorX - 기준점 x (보통 사이드바 버튼 x)
 * @param {number} topY - 첫 도구가 정렬될 y (paint 버튼 y에 맞춤)
 * @param {string} currentTool - 현재 선택된 도구 id
 * @param {(toolId: string) => void} onSelect
 * @param {() => void} [onClose] - 팝업이 완전히 닫힌 후 호출 (캔버스 입력 가드 해제용)
 */
export function showToolPopup(scene, anchorX, topY, currentTool, onSelect, onClose) {
  const root = scene.add.container(0, 0).setDepth(4500);

  // 외부 클릭 시 닫기 (투명 오버레이)
  const overlay = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.001).setInteractive();
  root.add(overlay);
  overlay.on('pointerup', () => closePopup());

  // 도구 4개 세로 배치 — 첫 도구가 topY와 정렬 (위로 안 올라감)
  const startY = topY;
  const btnX = anchorX - ANCHOR_OFFSET_X;

  TOOLS.forEach((tool, i) => {
    const y = startY + i * (BTN_SIZE + BTN_GAP);
    const active = (tool.id === currentTool);
    makeToolBtn(scene, root, btnX, y, BTN_SIZE, tool, active, () => {
      soundManager.play('click');
      onSelect(tool.id);
      closePopup();
    });
  });

  // 페이드 인 (좌측에서 살짝 슬라이드)
  root.x = 24;
  root.alpha = 0;
  scene.tweens.add({
    targets: root, x: 0, alpha: 1,
    duration: 180, ease: 'Cubic.easeOut',
  });

  function closePopup() {
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

// 인라인 도구 버튼 (사이드바 버튼과 비슷한 스타일, 텍스트 없음)
function makeToolBtn(scene, root, cx, cy, size, tool, isActive, onClick) {
  const half = size / 2;
  const cornerR = Math.round(size * 0.24);

  // 그림자
  const sh = scene.add.graphics();
  sh.fillStyle(0x000000, 0.22);
  sh.fillRoundedRect(cx - half, cy - half + 5, size, size, cornerR);
  root.add(sh);

  // 배경
  const bg = scene.add.graphics();
  bg.fillStyle(tool.color, 1);
  bg.fillRoundedRect(cx - half, cy - half, size, size, cornerR);
  root.add(bg);

  // 광택
  const gloss = scene.add.graphics();
  gloss.fillStyle(0xFFFFFF, 0.35);
  gloss.fillRoundedRect(cx - half + 6, cy - half + 4, size - 12, 18, 10);
  root.add(gloss);

  // 아이콘 (이모지, 중앙)
  root.add(scene.add.text(cx, cy, tool.icon, {
    fontFamily: FONTS.game, fontSize: '52px',
  }).setOrigin(0.5));

  // 외곽선 (활성/비활성)
  const border = scene.add.graphics();
  if (isActive) {
    // 활성: 진한 핑크 두꺼운 + 우상단 별
    border.lineStyle(5, 0xFF4D88, 1);
    border.strokeRoundedRect(cx - half, cy - half, size, size, cornerR);
    const star = scene.add.text(cx + half - 14, cy - half + 14, '⭐', {
      fontFamily: FONTS.game, fontSize: '24px',
    }).setOrigin(0.5);
    root.add(star);
  } else {
    border.lineStyle(3, 0xFFFFFF, 0.85);
    border.strokeRoundedRect(cx - half, cy - half, size, size, cornerR);
  }
  root.add(border);

  // 클릭 영역
  const zone = scene.add.zone(cx, cy, size + 6, size + 6).setInteractive({ useHandCursor: true });
  root.add(zone);
  zone.on('pointerdown', () => { bg.y = 4; gloss.y = 4; });
  zone.on('pointerout',  () => { bg.y = 0; gloss.y = 0; });
  zone.on('pointerup',   () => { bg.y = 0; gloss.y = 0; onClick(); });
}
