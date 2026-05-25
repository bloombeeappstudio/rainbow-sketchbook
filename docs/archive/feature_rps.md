# ✂️ 가위바위보 (RPSScene) — 개발 이력 아카이브

> **분리 이유**: 레인보우 스케치북 v1.0 리디자인으로 스케치북 콘텐츠 집중 → 미니게임 별도 앱 예정  
> **완성도**: 100% 완성  
> **최종 작업일**: 2026-05

---

## 🎮 게임 개요

- **장르**: 가위바위보 배틀
- **대상**: 5~8세
- **규칙**: 우주 악당 3명 순서대로 배틀 → 연속 3승 시 무지개 폭발 클리어
- **특징**: 3연승 달성 시 `toseumi-magic2` + 무지개 폭발 파티클 연출

---

## 📁 핵심 파일

| 파일 | 역할 |
|------|------|
| `game/src/scenes/RPSScene.js` | 씬 전체 (선택 UI, 승패 판정, 악당 3종 배틀 흐름) |
| `game/public/backgrounds/rps_bg.png` | 배경 이미지 |
| `game/public/enemies/villain_*.png` | 우주 악당 3종 × 2상태 (idle/defeat) |

---

## 🔧 복원 방법

### main.js에 추가
```javascript
import RPSScene from './scenes/RPSScene.js';

const config = {
  scene: [
    BootScene, StoryScene, MainScene,
    RPSScene,   // ← 추가
    // ...
  ],
};
```

---

## 🦹 악당 3종

| 악당 | 텍스처 키 | 특징 |
|------|----------|------|
| 1호 | `villain_1_idle` / `villain_1_defeat` | 분홍 외계인 |
| 2호 | `villain_2_idle` / `villain_2_defeat` | 초록 로봇 |
| 3호 | `villain_3_idle` / `villain_3_defeat` | 파랑 우주인 |

---

## ⚙️ 주요 로직

- **선택 UI**: 가위(✂️) / 바위(✊) / 보(🖐️) 3버튼 → 터치 인식
- **판정**: `(player - enemy + 3) % 3 === 1` → 승리
- **연승 카운터**: `this.winStreak` — 3 도달 시 클리어 연출
- **무지개 폭발**: `Phaser.GameObjects.Particles` 7색 파티클
- **악당 교체**: 1승 → 2승 → 3승 순서로 `villain_1 → 2 → 3`
- **패배 시**: 연승 초기화 + 악당 idle 상태로 복귀

---

## 🎵 사운드

- BGM: `bgm-lobby-2` (배틀 분위기)
- SFX: `pop` (선택 시), 무지개 폭발 시 별도 연출

---

## 📊 i18n 키

```javascript
'menu.rps'    → ko: '가위바위보' / ja: 'じゃんけん' / en: 'Rock Paper Scissors' / zh-TW: '猜拳'
```

---

## 💡 별도 앱 출시 시 고려사항

- 악당 추가 (3 → 5 → 7종으로 확장)
- 2인 대전 모드 (로컬 멀티)
- 속도 모드 (5초 안에 선택 필수)
- 선택 버튼 디자인 업그레이드 (현재 이모지 → 일러스트)
- 히스토리 (내가 이긴 악당 도감)
