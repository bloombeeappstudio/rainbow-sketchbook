// 🌟 텍스트 그림자 프리셋 — 흰색/밝은 텍스트가 어떤 배경 위에서도 잘 보이도록
// Phaser TextStyle.shadow 형식 (offsetX, offsetY, color, blur, fill, stroke)

// 기본 — 일반 흰/밝은 텍스트
export const TEXT_SHADOW = {
  offsetX: 0,
  offsetY: 4,
  color: '#000000',
  blur: 8,
  fill: true,
  stroke: false,
};

// 부드러운 — 작은 텍스트 / 라벨
export const SUBTLE_SHADOW = {
  offsetX: 0,
  offsetY: 2,
  color: '#000000',
  blur: 4,
  fill: true,
  stroke: false,
};

// 강한 — 큰 타이틀 / 카운트다운
export const STRONG_SHADOW = {
  offsetX: 0,
  offsetY: 6,
  color: '#000000',
  blur: 14,
  fill: true,
  stroke: false,
};

// 골드/노랑 빛 — 카운트다운 등 하이라이트
export const GOLD_GLOW = {
  offsetX: 0,
  offsetY: 0,
  color: '#FFB000',
  blur: 24,
  fill: true,
  stroke: false,
};
