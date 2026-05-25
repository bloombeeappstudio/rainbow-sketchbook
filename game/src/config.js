// 🎮 게임 전역 설정
import Phaser from 'phaser';

// 기준 해상도 (가로 16:9)
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

// 한글 무료 상업용 폰트 (Google Fonts에서 index.html이 로드)
// Jua=둥글둥글 메인 / Do Hyeon=굵고 또렷 / Gaegu=손글씨 장식
export const FONTS = {
  game: '"Jua", "Do Hyeon", "Pretendard", sans-serif',
  bold: '"Do Hyeon", "Jua", "Pretendard", sans-serif',
  hand: '"Gaegu", "Jua", "Pretendard", sans-serif',
};

// 색상 팔레트
export const COLORS = {
  bgDark:    0x0F0820,
  bgPurple:  0x2C1B47,
  bgViolet:  0x4A2D6E,

  pink:      0xFFB6C8,
  pinkDeep:  0xFF8FAB,
  pinkLight: 0xFFE4EC,

  rainbow1:  0xFF6B9D,
  rainbow2:  0xFFB347,
  rainbow3:  0xFFE066,
  rainbow4:  0x95E1D3,
  rainbow5:  0xB19CFF,

  white:     0xFFFFFF,
  cream:     0xFFF4F7,
  star:      0xFFD93D,
  text:      0x5A2A40,
};

// Phaser 게임 설정
export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  backgroundColor: '#0F0820',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  // scene은 main.js에서 추가
};
