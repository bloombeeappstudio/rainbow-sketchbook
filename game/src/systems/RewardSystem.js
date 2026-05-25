// 🎁 RewardSystem — 보상 등급별 자동 지급 로직
import { SaveSystem } from './SaveSystem.js';
import { COLORS, randomColor } from '../data/colors.js';

// 보상 등급 정의
export const TIER = {
  COMMON:    'common',    // 크레파스 1개
  UNCOMMON:  'uncommon',  // 크레파스 1 + 스티커 1
  RARE:      'rare',      // 크레파스 1 + 보석 1
  LEGENDARY: 'legendary', // 럭키박스 (랜덤 묶음)
};

// 스티커 12종 (data/stickers.js로 분리해도 됨)
const STICKER_NAMES = [
  '노란 별', '분홍 하트', '무지개', '벚꽃',
  '솜사탕 구름', '음표', '풍선', '컵케이크',
  '도넛', '리본', '작은 달', '반짝이 다이아',
];

// 보석 4종
const GEM_SHAPES = ['heart', 'star', 'diamond', 'drop'];
const GEM_COLORS = ['pink', 'purple', 'gold', 'cyan'];

class RewardSystemClass {
  /**
   * 등급에 맞는 보상을 생성하고 SaveSystem에 자동 저장
   * @returns {object} { tier, items: [{type, ...}] }
   */
  grant(tier) {
    const save = SaveSystem.load();
    const items = [];

    switch (tier) {
      case TIER.COMMON:
        items.push(this.grantColor(save));
        break;

      case TIER.UNCOMMON:
        items.push(this.grantColor(save));
        items.push(this.grantSticker(save));
        break;

      case TIER.RARE:
        items.push(this.grantColor(save));
        items.push(this.grantGem());
        break;

      case TIER.LEGENDARY:
        // 럭키박스 = 색 2개 + 스티커 1 + 보석 1
        items.push(this.grantColor(save));
        items.push(this.grantColor(save));
        items.push(this.grantSticker(save));
        items.push(this.grantGem());
        SaveSystem.addLuckyBox();
        break;
    }

    return { tier, items: items.filter(Boolean) };
  }

  // ===== 색깔 지급 =====
  grantColor(save) {
    const owned = save?.collection?.colors || [];
    const color = randomColor(owned);
    if (!color) {
      // 모든 색을 가지고 있음 → 중복 색이라도 표시 (즐거움 유지)
      const fallback = COLORS[Math.floor(Math.random() * COLORS.length)];
      return { type: 'color', ...fallback, isDuplicate: true };
    }
    SaveSystem.addColor(color.id);
    return { type: 'color', ...color, isNew: true };
  }

  // ===== 스티커 지급 =====
  grantSticker(save) {
    const owned = save?.collection?.stickers || [];
    const available = STICKER_NAMES
      .map((name, i) => ({ id: i + 1, name }))
      .filter(s => !owned.includes(s.id));

    if (available.length === 0) {
      // 다 가졌음 → 중복 표시
      const idx = Math.floor(Math.random() * STICKER_NAMES.length);
      return { type: 'sticker', id: idx + 1, name: STICKER_NAMES[idx], isDuplicate: true };
    }
    const picked = available[Math.floor(Math.random() * available.length)];
    SaveSystem.addSticker(picked.id);
    return { type: 'sticker', ...picked, isNew: true };
  }

  // ===== 보석 지급 =====
  grantGem() {
    const shape = GEM_SHAPES[Math.floor(Math.random() * GEM_SHAPES.length)];
    const color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
    const gem = { type: 'gem', shape, color };
    SaveSystem.addGem(gem);
    return gem;
  }

  // ===== 미니게임별 보상 결정 =====

  // 카드 매칭: 무조건 COMMON, 시간 절반 이내 완료 시 UNCOMMON
  decideCardMatchReward(timeUsedSec, totalTimeSec) {
    if (timeUsedSec <= totalTimeSec / 2) return TIER.UNCOMMON;
    return TIER.COMMON;
  }

  // 가위바위보: 결과별
  // wins: 0~3, draws: 0~3, losses: 0~3
  decideRPSReward(wins, draws, losses) {
    if (wins === 3) return TIER.RARE;       // 3연승
    if (wins === 2 && losses === 1) return TIER.UNCOMMON;
    return TIER.COMMON;                      // 그 외 모두 참가 보상
  }

  // 스타 캐치: 점수별
  decideCatchReward(score) {
    if (score >= 31) return TIER.LEGENDARY;
    if (score >= 21) return TIER.RARE;
    if (score >= 11) return TIER.UNCOMMON;
    return TIER.COMMON;
  }
}

export const RewardSystem = new RewardSystemClass();
