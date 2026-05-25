# 🃏 카드 맞추기 (CardMatchScene) — 개발 이력 아카이브

> **분리 이유**: 레인보우 스케치북 v1.0 리디자인으로 스케치북 콘텐츠 집중 → 미니게임 별도 앱 예정  
> **완성도**: 100% 완성  
> **최종 작업일**: 2026-05

---

## 🎮 게임 개요

- **장르**: 메모리 카드 뒤집기 (Concentration)
- **대상**: 5~8세
- **규칙**: 41장 풀에서 6쌍(12장) 랜덤 뽑기 → 짝 맞추기 → 90초 제한
- **보상**: 성공 시 RewardSystem (별/캔디/당근 등 랜덤 일러스트)

---

## 📁 핵심 파일

| 파일 | 역할 |
|------|------|
| `game/src/scenes/CardMatchScene.js` | 씬 전체 (짝 맞추기 로직, 타이머, 뒤집기 애니) |
| `game/public/cards/memory_card_XX_*.png` | 카드 앞면 41종 (음식/우주/동물) |
| `game/public/cards/card_back.png` | 카드 뒷면 공통 |

---

## 🔧 복원 방법 (별도 앱 또는 레인보우에 재통합 시)

### main.js에 추가
```javascript
import CardMatchScene from './scenes/CardMatchScene.js';

const config = {
  scene: [
    BootScene, StoryScene, MainScene,
    CardMatchScene,   // ← 추가
    // ...
  ],
};
```

### MainScene.js에 메뉴 항목 추가
```javascript
{ label: '카드 맞추기', scene: 'CardMatchScene', ... }
```

---

## 🎨 카드 풀 (41종)

```
음식/디저트: memory_card_01 ~ 18 (아이스크림/케이크/쿠키 등)
우주:       memory_card_19 ~ 30 (로켓/UFO/우주비행사/행성 등)
동물 얼굴:  memory_card_31 ~ 36, 41
기타:       memory_card_37 ~ 40 (왕관/음표/팔레트/별스케치북)
```

---

## ⚙️ 주요 로직

- **카드 배치**: `Phaser.Utils.Array.Shuffle` 6쌍 × 2 = 12장, 4×3 그리드
- **뒤집기 애니**: `scaleX` 0→1 tween (카드 플립 효과)
- **매치 판정**: `firstCard.id === secondCard.id`
- **타이머**: `this.time.addEvent` 90초 카운트다운
- **보상**: `RewardSystem.grantReward()` → 팝업 표시

---

## 🖼️ 자산 위치

```
game/public/cards/
├── card_back.png              (뒷면 공통)
├── memory_card_01_*.png
├── memory_card_02_*.png
│   ... (41종)
└── memory_card_41_blackchi_cat.png
```

> **주의**: 모든 카드 PNG는 RGBA 투명배경 처리됨. 새 카드 추가 시 sharp 누끼 파이프라인 필수.

---

## 📊 i18n 키

```javascript
'menu.memory'  → ko: '카드 맞추기' / ja: 'カードゲーム' / en: 'Card Match' / zh-TW: '配對遊戲'
```

---

## 💡 별도 앱 출시 시 고려사항

- 카드 풀 확장 (현재 41장 → 추가 가능)
- 난이도 선택 UI (쌍 개수: 3/6/9쌍)
- 시간 기록 + 최고 기록 저장
- BGM: `bgm-lobby-1` 사용 중 → 미니게임 전용 BGM 교체 권장
