# 🎮 레인보우 스케치북 — 게임 설계 문서 v1.0

> **이 문서는 Phaser.js 코드의 청사진**입니다.
> Node.js 설치 후 이 문서를 그대로 코드로 변환합니다.

---

## 📂 1. Phaser 프로젝트 구조 (확정)

```
rainbow-sketchbook/
├── game/                          ← Phaser 실제 코드 (Node.js 설치 후 생성)
│   ├── package.json               ← npm 의존성
│   ├── vite.config.js             ← Vite 빌드 설정
│   ├── index.html                 ← 게임 진입점
│   ├── public/                    ← 정적 자산 (assets에서 복사)
│   │   ├── characters/
│   │   ├── story/
│   │   ├── cards/
│   │   ├── friends/
│   │   ├── coloring/
│   │   ├── rewards/
│   │   ├── ui/
│   │   └── audio/
│   └── src/
│       ├── main.js                ← Phaser Game 인스턴스 생성
│       ├── config.js              ← 게임 설정 (해상도, scale 등)
│       ├── scenes/                ← Phaser Scene들
│       │   ├── BootScene.js       ← 자산 미리 로드
│       │   ├── StoryScene.js      ← 그림책 5컷 + 스플래시
│       │   ├── MainScene.js       ← 메인 화면 (허브)
│       │   ├── CardMatchScene.js  ← 카드 맞추기
│       │   ├── RPSScene.js        ← 가위바위보
│       │   ├── CatchScene.js      ← 스타 캐치 ⭐
│       │   ├── DrawScene.js       ← 그림판
│       │   ├── PlanetScene.js     ← 내 행성 (아트룸)
│       │   └── DexScene.js        ← 컬러도감
│       ├── data/                  ← 게임 데이터
│       │   ├── colors.js          ← 64색 정의
│       │   ├── stickers.js        ← 스티커 정의
│       │   ├── gems.js            ← 보석 정의
│       │   └── greetings.js       ← 토슴이 멘트 풀
│       ├── systems/               ← 게임 시스템
│       │   ├── SaveSystem.js      ← localStorage 관리
│       │   ├── RewardSystem.js    ← 보상 지급 로직
│       │   ├── ToseumiGuide.js    ← 토슴이 멘트 매니저
│       │   └── AudioManager.js    ← BGM/SFX 관리
│       └── ui/                    ← 재사용 UI 컴포넌트
│           ├── BigButton.js       ← 큰 둥근 버튼
│           ├── SpeechBubble.js    ← 말풍선
│           └── CollectionBar.js   ← 상단 수집 띠
└── android/ (예정)                ← Capacitor 안드로이드 빌드
```

---

## 🎬 2. Scene 흐름도

```
[앱 실행]
    ↓
┌────────────┐
│ BootScene  │ ← 모든 자산 로드 (로딩 화면)
└──────┬─────┘
       ↓
       ├─── (첫 진입 / 또는 "다시 보기" 메뉴) ───┐
       │                                          │
       ↓                                          ↓
┌────────────┐                          ┌────────────┐
│StoryScene  │                          │ MainScene  │
│ (그림책)   │                          │  (메인)    │
└──────┬─────┘                          └──┬─────┬───┘
       │                                   │     │
       └────[시작하기]──→──────────────────┘     │
                                                  │
        ┌─────────────────────────────────────────┤
        ↓                                         ↓
   [미니게임 3종]                           [공간 2종]
   ┌────────────┐                          ┌────────────┐
   │CardMatch   │  ←→  보상 → MainScene    │PlanetScene │
   │  RPS       │                          │ (내 행성)  │
   │StarCatch ⭐│                          ├────────────┤
   └────────────┘                          │  DexScene  │
                                           │  (도감)    │
                                           └────────────┘

[그림판 흐름]
   MainScene → DrawScene → 완성 → PlanetScene (작품 전시)
```

---

## 📊 3. 게임 데이터 모델

### 3-1. 색깔 64종 (`data/colors.js`)

```javascript
// 64색을 7개 그룹(무지개)으로 분류
export const COLORS = [
  // 빨강 계열 (10색)
  { id: 1,  name: "딸기우유 핑크", hex: "#FFB6C1", group: "red" },
  { id: 2,  name: "체리 레드",     hex: "#FF4757", group: "red" },
  { id: 3,  name: "사과 빨강",     hex: "#E84545", group: "red" },
  // ... 64개 총
];

// 그룹별 진행도 표시:
//  빨강 ████░░░░░░ 4/10
//  주황 ██████░░░░ 6/10
//  ...
```

> 💡 **중요**: 크레파스 일러스트는 **1장만** 받아오고, 코드에서 색만 64종 입혀서 자동 생성합니다.

### 3-2. 보상 등급 (`systems/RewardSystem.js`)

```javascript
const REWARD_TIERS = {
  COMMON:    { rate: 0.70, items: ['crayon'] },          // 70% 크레파스
  UNCOMMON:  { rate: 0.20, items: ['crayon', 'sticker'] }, // 20% 크레파스+스티커
  RARE:      { rate: 0.08, items: ['gem'] },             // 8% 보석
  LEGENDARY: { rate: 0.02, items: ['lucky_box'] },       // 2% 럭키박스
};

// 미니게임별 보상 보장:
// 카드 맞추기:  무조건 COMMON (시간 절반 이내 → UNCOMMON)
// 가위바위보:  2승 1무 → COMMON / 3연승 → RARE
// 친구 인사:   점수에 따라 COMMON ~ LEGENDARY
```

### 3-3. 사용자 진행도 (`systems/SaveSystem.js`)

```javascript
// localStorage 키: 'rainbow-sketchbook-save'
const SAVE_SCHEMA = {
  version: "1.0",
  firstPlay: true,                     // 첫 진입 여부
  totalPlayTime: 0,                    // 총 플레이 시간 (분)
  lastPlayDate: "2026-05-07",          // 마지막 플레이 날짜

  collection: {
    colors:   [1, 5, 12, ...],         // 획득한 색 ID 배열
    stickers: [3, 7, 11],              // 스티커 ID
    gems:     [{ shape: 'star', color: 'pink' }, ...],
    luckyBoxes: 2,
  },

  drawings: [                          // 그린 작품 (최대 50개)
    { id: 'uuid', date: '2026-05-07', dataUrl: 'data:image/...', frame: 'classic' }
  ],

  planet: {
    theme: 'default',                  // 행성 테마 (IAP 시 추가됨)
    arrangement: [                     // 작품 배치
      { drawingId: 'uuid', x: 0.3, y: 0.5, type: 'frame' }
    ],
  },

  stats: {
    cardMatchPlays: 12,
    rpsPlays: 8,
    rps3WinStreaks: 1,
    friendsPlays: 5,
    drawingsCompleted: 7,
  },

  daily: {
    lastBonusDate: "2026-05-06",       // 일일 보너스 받은 날
    streak: 3,                          // 연속 출석
  },

  settings: {
    bgmVolume: 0.5,
    sfxVolume: 0.7,
    parentPin: null,                    // 부모 게이트 (IAP 시 활성)
  },

  iap: {
    starlightArtistPack: false,        // 6개월 후 출시 예정
  }
};
```

---

## 🃏 4. 미니게임 1: 카드 맞추기 (`CardMatchScene.js`)

### 룰 (의사코드)
```
난이도 자동 조정:
  - Day 1~3:    카드 6장 (3쌍, 60초)
  - Day 4~7:    카드 8장 (4쌍, 60초)
  - Day 8+:     카드 12장 (6쌍, 90초)

플레이어 동작:
  1. 카드 1개 탭 → 뒤집기 (앞면 표시)
  2. 카드 2개 탭 → 일치 여부 판정
     - 일치: 카드 빛나며 사라짐 + 별가루
     - 불일치: 0.8초 후 자동으로 다시 뒤집힘

종료:
  - 모든 쌍 맞추기: 보상 등장 (COMMON)
  - 시간 절반 이내 완료: UNCOMMON 보너스
  - 시간 초과: 토슴이 "괜찮아요, 다시 해볼까요?" + 그래도 COMMON 지급
```

### 핵심 클래스
```javascript
class CardMatchScene extends Phaser.Scene {
  // 상태
  flippedCards = [];      // 현재 뒤집힌 카드
  matchedPairs = 0;       // 맞춘 쌍 수
  totalPairs = 0;         // 전체 쌍 수
  timeLeft = 60;          // 남은 시간

  // 메서드
  shuffleCards() { /* 카드 섞기 */ }
  flipCard(card) { /* 카드 뒤집기 */ }
  checkMatch() { /* 일치 판정 */ }
  onComplete() { /* 종료 → 보상 → MainScene */ }
}
```

---

## ✊ 5. 미니게임 2: 가위바위보 (`RPSScene.js`)

### 룰
```
3판 2선승제:
  - 플레이어가 ✊ ✌️ ✋ 중 선택 → 컴퓨터 랜덤 선택 → 결과 판정
  - 결과 연출: 토슴이 표정 변화 (이김/짐/비김)

3판 결과별 보상:
  - 1승 2패:    "다시 해볼까요?" → COMMON (참가 보상)
  - 2승 1무:    COMMON
  - 2승 1패:    COMMON + UNCOMMON 스티커
  - 3연승!:     RARE 보석 + 화면 전체 무지개 폭발 ⭐ (게임의 하이라이트 모먼트)

연출 디테일:
  - 컴퓨터 손은 "두구두구" 진동 → 펑! (서스펜스)
  - 3연승 직전(2승 후)엔 토슴이가 "두근두근" 표정
  - 3연승 시: 무지개 호 + 별가루 + 토슴이 magic 포즈 + "와아!" 음성
```

---

## ⭐ 6. 미니게임 3: 스타 캐치 (`CatchScene.js`)

### 룰
```
하늘에서 별/하트/캔디 등이 떨어짐 → 토슴이가 바구니로 받기 (30초)

조작:
  - 모바일/태블릿: 화면 위에서 좌우로 손가락 끌기 → 토슴이 바구니 따라 이동
  - 또는: 화면 좌/우 절반 탭 → 그 방향으로 부드럽게 이동
  - 토슴이는 화면 하단 고정 (Y축 X)

떨어지는 아이템 (모두 좋은 것만 — 피하기 X):
  - ⭐ 별:        +1점 (자주, 노란 트레일)
  - 💗 하트:      +1점 (자주, 분홍 트레일)
  - 🍬 캔디:      +1점 (자주, 알록달록 트레일)
  - 🎈 풍선:      +1점 (자주, 둥실 떠오름)
  - 🌈 무지개 조각: +3점 (가끔, 등장 1초 전 빛남 예고)
  - ✨ 별가루:    +5점 (매우 가끔, 황금 폭발)

종료 (30초 후):
  - 0~10점:   COMMON (참가 보상)
  - 11~20점:  COMMON + UNCOMMON 스티커
  - 21~30점:  COMMON + UNCOMMON + RARE 보석
  - 31점+:    LEGENDARY 럭키박스 ⭐ + 토슴이 박수 환호
```

### 핵심 클래스
```javascript
class CatchScene extends Phaser.Scene {
  // 상태
  toseumi;           // 토슴이 (바구니 들고)
  fallingItems = []; // 현재 떨어지는 아이템 배열
  score = 0;
  timeLeft = 30;
  spawnTimer;        // 아이템 등장 타이머

  // 메서드
  spawnItem() {
    // 0.6~1.2초마다 랜덤 위치에서 아이템 1개 생성
    // 확률: 별/하트/캔디/풍선 70%, 무지개 25%, 별가루 5%
  }

  movePlayer(targetX) {
    // 손가락 위치로 토슴이 부드럽게 이동 (lerp)
  }

  checkCollision(item) {
    // 바구니 영역과 아이템 충돌 판정 → 점수 + 별가루 + 효과음
  }

  onComplete() {
    // 30초 종료 → 보상 등장 → MainScene
  }
}
```

### 연출 디테일
```
✨ 평상시:
  - 토슴이가 바구니 들고 살짝 흔들흔들 (idle 애니)
  - 머리 위로 떨어지는 별빛 트레일

✨ 받았을 때:
  - "톡!" 효과음 + 작은 별가루 폭발 (아이템 색깔로)
  - 점수 +1 표시 (떠오르며 사라짐)
  - 토슴이 1프레임 살짝 점프 (반응)

✨ 놓쳤을 때:
  - 화면 아래로 사라지며 페이드 아웃 (페널티 X, 토슴이 표정 변화 X)

✨ 희귀 아이템 (무지개/별가루):
  - 등장 1초 전: 화면 위쪽에서 빛이 모이는 예고 (잡기 쉽게!)
  - 받으면: 무지개 폭발 + 토슴이 magic 포즈로 잠깐 변신 + "와!" 토슴이 음성

✨ 30초 종료:
  - 떨어지던 아이템 멈춤 → 모두 페이드 아웃
  - 바구니가 환하게 빛남
  - 토슴이 박수 (celebrating 포즈) + 보상 등장
```

> 💡 **톤**: "받기 / 모으기" — 별나라에서 사라진 색깔과 보물들이 토슴이에게 돌아오는 느낌. 압박/페널티 X, 따뜻한 보상의 게임.

---

## 🎨 7. 그림판 (`DrawScene.js`)

### 시스템 구성
```
HTML5 Canvas 위에 페인팅:
  ┌──────────────────────────────────┐
  │ ←  도구 패널 (왼쪽)              │
  │ 🖍 크레파스 (획득한 색만)        │
  │ ✏ 굵기 (3단계)                   │
  │ 🧽 지우개                        │
  │ 🎨 채우기 (페인트버킷)           │
  │ ↩ 되돌리기 (10단계)              │
  ├──────────────────────────────────┤
  │                                  │
  │   도화지 (Canvas)                │
  │   - 빈 도화지 OR                 │
  │   - 색칠 도안 (라인아트)         │
  │                                  │
  ├──────────────────────────────────┤
  │ [완성!] 버튼 (오른쪽 하단)       │
  └──────────────────────────────────┘
```

### 핵심 로직
```javascript
class DrawScene extends Phaser.Scene {
  canvas;          // HTML5 Canvas
  ctx;             // 2D context
  isDrawing = false;
  currentColor;
  currentSize = 5;
  history = [];    // 되돌리기용 (max 10 단계)

  onPointerDown(e) {
    this.isDrawing = true;
    this.saveSnapshot();   // 되돌리기 스냅샷
    this.startStroke(e.x, e.y);
  }

  onPointerMove(e) {
    if (!this.isDrawing) return;
    this.ctx.lineTo(e.x, e.y);
    this.ctx.stroke();
  }

  onPointerUp() {
    this.isDrawing = false;
  }

  onComplete() {
    const dataUrl = this.canvas.toDataURL('image/png');
    SaveSystem.addDrawing(dataUrl);

    // ✨ 하이라이트 모먼트: 그림이 행성으로 날아감
    this.playFlyToPlanet(dataUrl, () => {
      this.scene.start('PlanetScene');
    });
  }
}
```

### "행성으로 날아감" 연출 (5~7초, 게임의 핵심 모먼트)
```
1. 도화지 둥실 떠오름 (1초)
2. 종이가 별빛으로 반짝이며 분해 (1.5초)
3. 별가루가 우주를 가로지름 (2초)
4. 토슴이의 행성 도착 → 액자/풍선/별자리 중 랜덤으로 자리잡음 (1.5초)
5. 토슴이: "와! 우리 별이 또 예뻐졌어요!" (1초)
```

---

## 🌌 8. 내 행성 (PlanetScene)

```
구성:
  - 배경: 작은 행성 위에 올라선 시점 (별나라)
  - 작품 표시 방식 3가지 (랜덤):
    a) 액자: 정적, 벽에 걸린 듯
    b) 풍선: 둥둥 떠다님 (3초 주기 floating)
    c) 별자리: 작품이 별과 연결되어 반짝임

  인터랙션:
    - 작품 탭 → 확대 보기 + 그린 날짜 표시
    - 길게 누르기 → 위치 이동 (드래그)
    - 토슴이가 가끔 작품 옆을 둥둥 (인사)

  최대 작품: 50개 (이후엔 가장 오래된 거 자동 보관)
```

---

## 📚 9. 컬러도감 (DexScene)

```
무지개 7색 그룹별 페이지:
  ┌──────────────────────────────┐
  │ 🌈 무지개 도감  [12 / 64]    │
  ├──────────────────────────────┤
  │ ❤️ 빨강 ████░░░░░░ 4/10      │
  │ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐        │
  │ │●│●│●│●│?│?│?│?│?│?│        │ ← 획득(컬러) / 미획득(?)
  │ └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘        │
  │   딸기우유 핑크              │ ← 탭하면 이름 표시
  │                              │
  │ 🧡 주황 ██████░░░░ 6/10      │
  │ ...                          │
  └──────────────────────────────┘

  탭 인터랙션:
    - 획득한 색: 이름 + 획득 날짜 표시
    - 미획득 색(?): "어떻게 얻을까?" 힌트 ("미니게임에서 만나요!")

  완성 시:
    - 그룹 완성 (10/10): 무지개 폭발 + 토슴이 축하
    - 전체 완성 (64/64): 한정판 "토슴이 인증서" 등장 ⭐
```

---

## 💾 10. 저장 시스템 (SaveSystem)

```javascript
class SaveSystem {
  static KEY = 'rainbow-sketchbook-save';

  static load() {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) return this.getDefaultSave();
    try {
      return JSON.parse(raw);
    } catch {
      return this.getDefaultSave();
    }
  }

  static save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  }

  // 모든 변경마다 자동 저장 (어린이는 강제종료 자주!)
  static addColor(colorId) {
    const save = this.load();
    if (!save.collection.colors.includes(colorId)) {
      save.collection.colors.push(colorId);
      this.save(save);
    }
  }

  // 그림 작품 저장 (Base64 PNG)
  static addDrawing(dataUrl) {
    const save = this.load();
    save.drawings.push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      dataUrl: dataUrl,
      frame: 'classic',
    });
    if (save.drawings.length > 50) save.drawings.shift(); // 50개 초과 시 가장 오래된 거 삭제
    this.save(save);
  }
}
```

---

## 🎤 11. 토슴이 가이드 시스템 (`ToseumiGuide`)

```javascript
const GREETINGS = {
  // 메인 화면 진입
  main_first:    ["또 만났어요! 🌈", "토슴이가 기다렸어요!"],
  main_returning:["오늘은 무지개 그릴까요?", "어떤 색을 모을까요?"],
  main_longtime: ["오랜만이에요! 보고 싶었어요", "기다렸어요 🥺"],

  // 게임 시작
  before_card:   ["카드 뒤집어볼까요?", "같은 그림 찾기 시작!"],
  before_rps:    ["이길 수 있을까요?", "두근두근 한 판!"],
  before_catch:  ["별빛이 떨어져요! ⭐", "바구니 준비됐어요!", "다 받아볼까요?"],

  // 보상 등장
  reward_common:    ["와! 새 색이에요!", "예쁜 색 찾았어요!"],
  reward_uncommon:  ["우와! 스티커도 있어요!", "보너스 반짝!"],
  reward_rare:      ["꺄! 보석이에요! ✨", "정말 특별한 색!"],
  reward_legendary: ["대박! 럭키박스!", "오늘 운이 좋아요 🎁"],

  // 그림 완성
  drawing_done: ["와! 우리 별이 또 예뻐졌어요!", "정말 멋진 그림이에요!"],

  // 격려 (실패 X)
  cheer:        ["다시 해볼까요?", "괜찮아요, 또 도전!"],
};

class ToseumiGuide {
  static getGreeting(situation) {
    const pool = GREETINGS[situation] || ["토슴이가 응원해요 🐰"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
```

---

## 🔊 12. 오디오 시스템

### 사운드 자산 (CC0)
```
audio/
├── bgm/
│   ├── main.ogg          ← 메인 화면 (잔잔)
│   └── drawing.ogg       ← 그림판 (집중)
├── sfx/
│   ├── button.ogg
│   ├── card-flip.ogg
│   ├── reward-common.ogg
│   ├── reward-rare.ogg
│   ├── rainbow-burst.ogg
│   ├── toseumi-greet.ogg ← "토슴~"
│   └── celebration.ogg
```

> Kenney UI Audio + OpenGameArt CC0 Calm Music에서 받아옴 (무료)

---

## 📱 13. 화면 설정 (config.js)

```javascript
export const config = {
  type: Phaser.AUTO,
  parent: 'game',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,         // 기준 해상도 (가로)
    height: 1080,        // 16:9
    orientation: 'landscape',
  },
  backgroundColor: '#0F0820',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 } },
  },
  scene: [BootScene, StoryScene, MainScene, /* ... */],
};
```

화면이 1920x1080 기준으로 설계되고, **모든 디바이스에서 자동 스케일** (FIT 모드).

---

## 🚀 14. 개발 순서 (Node.js 설치 후)

```
[Phase 1] 프로젝트 셋업 (Day 1~2)
  □ npm init + Phaser 3 + Vite 설치
  □ BootScene + 자산 로딩
  □ MainScene 기본 레이아웃 (HTML 프로토타입을 Phaser로 변환)

[Phase 2] 그림책 (Day 3~5)
  □ StoryScene 구현 (5컷 + 스플래시)
  □ ChatGPT 일러스트 5장 통합
  □ 첫 진입 → 그림책 → 메인 흐름

[Phase 3] 첫 미니게임 (Day 6~10)
  □ CardMatchScene
  □ 보상 시스템 + 컬렉션 저장
  □ 토슴이 가이드 시스템

[Phase 4] 그림판 (Day 11~14)
  □ DrawScene (HTML5 Canvas)
  □ 색상 팔레트 (획득한 색만)
  □ 완성 → 행성으로 날아감 연출

[Phase 5] 나머지 미니게임 + 메타 (Day 15~21)
  □ RPSScene + FriendScene
  □ PlanetScene + DexScene

[Phase 6] 폴리싱 + 빌드 (Day 22~30)
  □ 사운드 통합
  □ Capacitor 안드로이드 빌드
  □ 디바이스 테스트
```

**예상 총 4~6주** (제가 코드 작성 / 사용자님은 자산 + 테스트)

---

## ✅ 다음 액션

이 설계대로 가면 됩니다. 사용자님 환경 준비되시면 즉시 코드로 변환:

1. **사용자님**: `docs/asset_master_list.md` 따라 ChatGPT 자산 생성
2. **사용자님**: Node.js LTS 설치 ([nodejs.org](https://nodejs.org))
3. **Claude**: 위 설계 그대로 Phaser 코드 작성

준비되시면 알려주세요! 🚀
