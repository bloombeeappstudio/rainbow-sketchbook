# 🌈 레인보우 스케치북: 어린이 그림 색칠 게임

5~8세 어린이를 위한 그림 그리기 + 미니게임 수집 모바일 앱

📂 **위치**: `C:\Users\sinae\rainbow-sketchbook\`

---

## 📋 프로젝트 정보

| 항목 | 내용 |
|---|---|
| **타겟** | 5~8세 어린이 (모바일 + 태블릿) |
| **플랫폼** | Android 우선 → iOS 추후 |
| **화면 방향** | 가로 모드 (스케치북 컨셉) |
| **세계관** | 레인보우 별나라 — 색을 잃어버린 우주에 무지개를 되찾아주는 여행 |
| **가이드 캐릭터** | 토슴이 (분홍색 토끼) |
| **수익 모델** | 무료 출시 → 6개월 후 단일 IAP ₩2,900 (별빛 아티스트 팩) |

## 🛠 기술 스택 (확정)

| 영역 | 기술 | 라이센스 |
|---|---|---|
| **게임 엔진** | Phaser.js 3 | MIT (무료) |
| **빌드 도구** | Vite | MIT (무료) |
| **그래픽** | HTML5 Canvas + PNG | — |
| **모바일 패키징** | Capacitor | MIT (무료) |
| **에디터** | VS Code | 무료 |
| **사운드** | OpenGameArt.org CC0 | CC0 (무료) |
| **폰트** | 카페24 동동 / 배민 도현 | 상업 사용 OK |

## 📂 폴더 구조

```
rainbow-sketchbook/
├── README.md                          ← 이 파일
├── docs/                              ← 기획 문서
│   ├── asset_master_list.md           ⭐ ChatGPT 자산 생성 마스터 가이드
│   ├── storybook_image_prompts.md     ← 그림책 5컷 프롬프트
│   └── toseumi_character_guide.md     ← 토슴이 디자인 가이드
├── assets/                            ← 게임 자산
│   ├── characters/                    ← 토슴이 PNG/SVG (11개)
│   └── story/                         ← 그림책 5컷 (ChatGPT 생성 후 저장)
├── prototypes/                        ← HTML 디자인 시안
│   ├── 00-onboarding-story-v3.html    ⭐ 그림책 (최신)
│   ├── 03-main-real-toseumi.html      ⭐ 메인 화면 (최신)
│   └── ... (이전 버전들)
└── game/ (예정)                       ← Phaser.js 실제 게임 코드
```

## 🎯 분업

### 🎨 사용자님이 하실 일
- **ChatGPT로 자산 생성** (`docs/asset_master_list.md` 참고)
- **자산 폴더에 저장** (정확한 파일명으로)
- **환경 셋업** (Node.js 설치, 추후 Android Studio)
- **디바이스 테스트** (실제 폰/태블릿)
- **Google Play 계정 등록** ($25 일회성)

### ⚙️ Claude가 하실 일
- **게임 코드 작성** (Phaser.js + JavaScript)
- **게임 로직** (미니게임 3종, 수집 시스템, 그림판)
- **자산 통합** (사용자님 자산 → 게임에 자동 적용)
- **디버깅 & 폴리싱**
- **문서 작성**

## 📅 진행 현황

### ✅ 완료
- 기획 / 컨셉 / 세계관 / 캐릭터 / 카피 / 수익 모델
- 토슴이 캐릭터 자산 11개 (PNG 9 + SVG 2)
- HTML 디자인 시안 (그림책 + 메인 화면)
- 자산 마스터 리스트 (ChatGPT 작업 가이드)
- 기술 스택 결정 (Phaser.js + Capacitor)
- 프로젝트 폴더 정리 (현재 위치로 이동)

### 🔄 진행 중 (병렬)
- 🎨 사용자님: ChatGPT 자산 생성 (P0 우선)
- ⚙️ Claude: Phaser 프로젝트 구조 + 게임 코어 로직 설계

### ⏳ 대기
- Node.js 설치 (사용자님)
- Phaser 프로젝트 셋업
- 미니게임 3종 구현
- 그림판 구현
- Capacitor 안드로이드 빌드
- Google Play 출시

## 🚀 다음 액션

1. **사용자님**: `docs/asset_master_list.md` 열어서 ChatGPT 자산 생성 시작
2. **Claude**: 게임 코어 시스템 설계 문서 작성

## 📝 라이센스

미정 — 출시 시 결정 (예정: 자체 권리 보유, IAP ₩2,900 상업 판매)
