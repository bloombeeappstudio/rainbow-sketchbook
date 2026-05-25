# 📖 캐릭터 도감 (CharacterDexScene) — 개발 이력 아카이브

> **분리 이유**: 레인보우 스케치북 v1.0 리디자인으로 스케치북 콘텐츠 집중 → 별도 앱/섹션 예정  
> **완성도**: 100% 완성  
> **최종 작업일**: 2026-05

---

## 🎮 기능 개요

- **장르**: 캐릭터 수집/감상 (갤러리형)
- **내용**: 토슴이 세계관 캐릭터 7종 얼굴샷 + 이름 + 설명
- **인터랙션**: 카드 탭 → 확대 + 설명 팝업

---

## 📁 핵심 파일

| 파일 | 역할 |
|------|------|
| `game/src/scenes/CharacterDexScene.js` | 씬 전체 (7종 카드 그리드, 팝업) |
| `game/public/characters/dex_*.png` | 캐릭터 얼굴샷 7종 |

---

## 🔧 복원 방법

### main.js에 추가
```javascript
import CharacterDexScene from './scenes/CharacterDexScene.js';

const config = {
  scene: [
    BootScene, StoryScene, MainScene,
    CharacterDexScene,   // ← 추가
    // ...
  ],
};
```

---

## 🐾 캐릭터 7종

| # | 이름 | 텍스처 키 | 특징 |
|---|------|----------|------|
| 1 | 토슴이 | `dex-toseumi` | 주인공 핑크 토끼, 무지개 마법사 |
| 2 | 블랙치 | `dex-blackchi` | 신비한 검은 고양이 |
| 3 | 달토 | `dex-dalto` | 달에 사는 토끼 |
| 4 | 무지개용 | `dex-rainbow-dragon` | 7색 용 |
| 5 | 별이 | `dex-byeoli` | 별 모양 妖精 |
| 6 | 우주양 | `dex-space-sheep` | 우주복 입은 양 |
| 7 | 크레용이 | `dex-crayon` | 크레파스 요정 |

---

## ⚙️ 주요 로직

- **그리드**: 3×3 (7종 + 빈칸 or 잠금 예정)
- **카드**: 얼굴샷 + 이름 텍스트, 탭 시 확대 팝업
- **팝업**: 이름/설명/특징 표시, StandardBackButton으로 닫기
- **잠금 시스템**: 미구현 (SaveSystem 연동 예정)

---

## 📊 i18n 키

```javascript
'menu.dex'    → ko: '캐릭터 도감' / ja: 'キャラ図鑑' / en: 'Characters' / zh-TW: '角色圖鑑'
```

---

## 💡 별도 앱/확장 시 고려사항

- 캐릭터 잠금/해금 시스템 (미니게임 클리어 → 해금)
- 각 캐릭터별 스토리/에피소드 페이지
- 캐릭터 스티커 모으기 연동
- 캐릭터 의상 교체 (IAP 연동 가능)
- 전체 세계관 지도 (캐릭터들이 사는 곳 표시)

---

## 🎨 자산 위치

```
game/public/characters/
├── dex_toseumi.png
├── dex_blackchi.png
├── dex_dalto.png
├── dex_rainbow_dragon.png
├── dex_byeoli.png
├── dex_space_sheep.png
└── dex_crayon.png
```
