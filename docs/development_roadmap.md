# 🗓 레인보우 스케치북 — 출시 체크리스트

> **최종 업데이트**: 2026-05-20
> **현재 버전**: v0.3
> **목표 출시일**: 2026-06 초 (Play Store)
> **남은 단계**: Week 5 (Android 빌드) → Week 6 (스토어 출시)

---

## ✅ 완료된 것 (Week 1~4 전부 완료)

### 게임 씬 (13개 전부 구현)
- [x] `BootScene` — 자산 로딩, 별똥별 로딩 화면
- [x] `StoryScene` — 5컷 시네마틱 동화책 (Ken Burns 효과)
- [x] `MainScene` — 로비 허브 (6칸 그리드, 토슴이 말풍선 34대사×4언어)
- [x] `CardMatchScene` — 카드 맞추기 (41장 풀, 6쌍, 90초)
- [x] `RPSScene` — 가위바위보 (3명 악당, 3연승 무지개 폭발)
- [x] `CatchScene` — 스타 캐치 (바구니로 받기, 30초)
- [x] `SketchHubScene` — 스케치북 허브 (색칠/그림/갤러리 3카드)
- [x] `SketchScene` — 자유 그림그리기 (크레파스/페인트/지우개/Undo)
- [x] `ColoringScene` — 색칠놀이 (도안+flood fill, adaptive tolerance)
- [x] `TemplateSelectScene` — 도안 선택 (4카테고리 UI)
- [x] `GalleryScene` — 내 작품 갤러리
- [x] `CharacterDexScene` — 캐릭터 도감 7종
- [x] `MyRoomScene` — 스토리 다시보기

### 시스템
- [x] `SaveSystem` — localStorage 자동 저장
- [x] `RewardSystem` — 보상 등급 지급
- [x] `SoundManager` — BGM 롤링 + SFX (mp3 + 합성 fallback)
- [x] `ToseumiGuide` — 토슴이 멘트 풀
- [x] i18n 4개 언어 (ko / ja / en / zh-TW)
- [x] 로비 대사 34개 × 4언어 완성

### 자산
- [x] 토슴이 PNG 22종 (RGBA 투명 처리)
- [x] 메모리 카드 앞면 41장 + 뒷면
- [x] 배경 3종 (메모리/가위바위보/스타캐치)
- [x] 우주 악당 3종 × 2상태
- [x] 리워드 일러스트 6종
- [x] 오프닝 스토리 5컷
- [x] 메인 메뉴 PNG 6종 × 4언어
- [x] 서브메뉴 PNG 3종 × 4언어 (색칠/그림/갤러리)
- [x] 색칠 도안 11장 (바닷속 10 + 토슴이 1)
- [x] 캐릭터 도감 얼굴샷 7종
- [x] 타이틀 로고 × 4언어
- [x] BGM 15트랙 + SFX 2종

---

## 🔲 남은 작업

---

### 🅐 콘텐츠 (선택 — 출시 전 있으면 좋음)

| # | 항목 | 담당 | 메모 |
|---|------|------|------|
| A1 | 도구 아이콘 PNG (`public/tools/`) | 사용자 | paint/crayon/eraser.png — 없어도 이모지 fallback 동작 |
| A2 | 색칠 도안 추가 (우주/음식 카테고리) | 사용자 | 현재 "곧 만나요!" UI 처리됨 — 추가분 생기면 Claude가 통합 |
| A3 | 메인 버전 문자열 변경 `v0.1 → v1.0` | Claude | MainScene.js 한 줄 수정 |

---

### 🅑 Android 빌드 (Week 5 — 핵심)

#### B1. 사용자님 사전 준비
- [ ] **Android Studio 설치** ([developer.android.com/studio](https://developer.android.com/studio), 약 1GB)
  - 설치 후 첫 실행 → Android SDK 자동 설치 (30~60분)
  - SDK 버전: API 33 이상 선택
- [ ] **Java JDK 확인** — Android Studio 설치 시 함께 옴 (별도 설치 불필요)

#### B2. Claude 작업 (Android Studio 설치 완료 후 진행)
- [ ] Capacitor 설치
  ```
  npm install @capacitor/core @capacitor/cli @capacitor/android
  npx cap init "Rainbow Sketchbook" "com.rainbowsketchbook.app"
  ```
- [ ] `vite build` → `dist/` 생성 확인
- [ ] `capacitor.config.json` 설정 (webDir: "dist")
- [ ] `npx cap add android` — android/ 프로젝트 생성
- [ ] `npx cap sync` — 빌드 결과물 android/ 에 복사
- [ ] APK 디버그 빌드 → 사용자님께 전달 (설치 테스트용)

#### B3. 사용자님 디바이스 테스트
- [ ] APK 폰/태블릿에 설치 ("출처를 알 수 없는 앱" 허용)
- [ ] 가로 모드 고정 확인
- [ ] 게임 전 화면 플레이 (미니게임 3종 + 색칠/그림)
- [ ] 버그/이상 발견 시 → Claude에게 피드백

---

### 🅒 Play Store 출시 (Week 6)

#### C1. 사용자님 준비
- [ ] **Google Play Console 가입** ([play.google.com/console](https://play.google.com/console))
- [ ] **개발자 등록비 $25 결제** (일회성, 카드 결제)
- [ ] 신원 확인 서류 제출 (1~3일 소요 가능)

#### C2. 스토어 자료 준비 (Claude가 도움)
- [ ] **앱 아이콘** 512×512 PNG (토슴이 얼굴 클로즈업 — ChatGPT 생성)
- [ ] **스크린샷** 최소 2장 이상, 권장 8장 (게임 화면 캡처)
  - 권장: 로비 / 카드게임 / 가위바위보 / 스타캐치 / 색칠 / 그림 / 갤러리 / 캐릭터도감
- [ ] **짧은 설명** (80자 이하, 4언어) — Claude 작성
- [ ] **앱 설명** (4,000자 이하, 4언어) — Claude 작성
- [ ] **개인정보처리방침 URL** — Claude가 무료 템플릿 + 호스팅 안내
- [ ] **콘텐츠 등급 설문** (IARC — 어린이 앱, 광고 X, 인앱결제 X)

#### C3. Claude 최종 빌드
- [ ] `vite build` 최종 프로덕션 빌드 (minify)
- [ ] `npx cap sync`
- [ ] **서명된 AAB 빌드** (Android App Bundle) — release 키스토어 생성
- [ ] Play Console에 AAB 업로드

#### C4. 출시 대기
- [ ] 심사 제출 (보통 1~7일 소요)
- [ ] 심사 통과 → 🎉 출시!
- [ ] 거부 시: 사유 확인 후 수정 → 재제출

---

## 📋 현재 막히는 것 없음 — 지금 당장 할 수 있는 것

| 우선순위 | 항목 | 담당 |
|----------|------|------|
| ⭐ **1순위** | Android Studio 설치 시작 (1GB 다운로드) | 사용자님 |
| ⭐ **2순위** | 앱 아이콘 512×512 생성 (ChatGPT) | 사용자님 |
| 3순위 | 도구 아이콘 PNG 3장 생성 (선택) | 사용자님 |
| 4순위 | v1.0 버전 문자열 + 코드 정리 | Claude |

Android Studio 설치 완료되면 바로 Capacitor 빌드 진행할 수 있어.

---

## 🎁 출시 후 (v1.1+)

- [ ] 사용자 리뷰 수집 + 버그 수정
- [ ] 색칠 도안 추가 (우주/음식 카테고리 오픈)
- [ ] **출시 6개월 후 — IAP "별빛 아티스트 팩" ₩2,900**
  - 시즌 색깔 30종 추가
  - 새 행성 테마 5종
  - 프리미엄 도구 4~6종
  - 부모 게이트 활성화

---

## ⚡ 빠른 현황 요약

```
Week 1~4  ████████████████  완료 ✅
Week 5    ░░░░░░░░░░░░░░░░  Android 빌드 대기 중
Week 6    ░░░░░░░░░░░░░░░░  Play Store 출시

게임 씬:    13 / 13  ✅
i18n:      4언어    ✅
BGM:       15트랙   ✅
Android:   미시작   ⬜
스토어:    미시작   ⬜

출시까지 남은 작업: Android Studio 설치 → 빌드 → 스토어 등록
예상 기간: 2~3주 (Android Studio 설치 후 즉시 진행 가능)
```
