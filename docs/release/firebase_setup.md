# 🔥 Firebase Console 설정 가이드 (대표님 작업)

> Firebase Analytics 어린이 모드 — Children-only 앱 정책 준수 + 마케팅 이벤트 추적.

---

## 🎯 작업 흐름

```
1. Firebase 프로젝트 생성 (대표님, 5분)
   ↓
2. Android 앱 등록 → google-services.json 다운로드
   ↓
3. google-services.json → game/android/app/ 에 배치
   ↓
4. npx cap sync android
   ↓
5. 앱 빌드 → 이벤트 자동 발사 시작
```

---

## 1️⃣ Firebase 프로젝트 생성 (대표님)

1. https://console.firebase.google.com 접속 (계정: `bloombee.appstudio@gmail.com`)
2. **프로젝트 만들기** 클릭
3. 프로젝트 이름: **`rainbow-sketchbook`**
4. Google Analytics: **사용 ON**
5. Analytics 계정: 기본 또는 새로 생성
6. **만들기**

---

## 2️⃣ Android 앱 등록

1. Firebase 프로젝트 대시보드 → **Android 아이콘** 클릭
2. **Android 패키지 이름**: `com.rainbow.sketchbook` ⚠️ 정확히 일치 필수
3. **앱 닉네임**: `Rainbow Sketchbook` (선택)
4. **디버그 서명 인증서 SHA-1**: 일단 비워두고 등록 가능 (출시 키스토어 생성 후 추가)
5. **앱 등록**

---

## 3️⃣ google-services.json 다운로드 + 배치

1. Firebase에서 `google-services.json` 다운로드
2. 배치 경로:
   ```
   C:\Users\sinae\rainbow-sketchbook\game\android\app\google-services.json
   ```
3. ⚠️ 이 파일은 `.gitignore`에 포함 → Git에 push 안 됨

---

## 4️⃣ Capacitor 동기화

PowerShell:
```powershell
cd "C:\Users\sinae\rainbow-sketchbook\game"
npx cap sync android
```

---

## 5️⃣ 어린이 모드 (Children-only) 설정 ⚠️ 매우 중요

### Firebase Console 작업
1. 프로젝트 설정 (좌상단 톱니바퀴) → **프로젝트 설정**
2. **개인정보 보호** 탭 또는 **데이터 보관** 탭
3. **사용자 데이터 보관 기간**: **14개월** (최대 — 대표님 결정 2026-05-25, 장기 사용 통계 활용)
4. **Google 신호 데이터** : **사용 안 함** ⚠️ (광고 타겟팅 X)

### 광고 ID 수집 비활성화 (코드 + Manifest)
- ✅ AndroidManifest.xml: `AD_ID` 권한 `tools:node="remove"` (이미 적용)
- ✅ AnalyticsSystem.js: 어린이 모드 자동 설정 (이미 적용)

### Personalized Ads 비활성화
- Firebase Console → Analytics → 통합
- **Google Ads / Display & Video 360 / Campaign Manager**: 연결 안 함

---

## 📊 추적되는 이벤트 (자동 + 수동)

### 자동 (Firebase 기본)
| 이벤트 | 의미 |
|---|---|
| `first_open` | 첫 실행 (= 신규 인스톨) |
| `app_open` | 앱 오픈 |
| `session_start` | 세션 시작 (DAU 분석) |
| `screen_view` | 화면 전환 |
| `app_remove` | 앱 제거 (Play Console 자동) |
| `user_engagement` | 활동 시간 |

### 수동 (8종)
| 이벤트 | 발사 시점 | 파라미터 |
|---|---|---|
| `purchase` | IAP 결제 완료 | `value`, `currency`, `transaction_id`, `items` |
| `iap_dialog_view` | 잠금 해제 팝업 노출 | `category` |
| `template_open` | 도안 선택 | `template_id`, `category`, `is_free` |
| `coloring_complete` | 색칠 완성 | `template_id`, `category`, `duration_sec` |
| `drawing_complete` | 자유 그림 완성 | `duration_sec` |
| `gallery_view` | 갤러리 진입 | `artwork_count` |
| `gallery_save_to_device` | 핸드폰 갤러리 저장 | `artwork_type` |
| `gallery_share` | 공유 시트 호출 | `artwork_type` |

---

## 📈 대시보드에서 볼 수 있는 데이터

### 마케팅 표준
- ✅ 인스톨 / 첫 실행
- ✅ 일/주/월간 활성 사용자 (DAU/WAU/MAU)
- ✅ 리텐션 (Day 1, 7, 14, 30)
- ✅ 평균 세션 시간
- ✅ 이탈률
- ✅ 신규 vs 기존 사용자 비율

### 매출
- ✅ 결제 건수 / 결제 금액 (`purchase` 이벤트)
- ✅ ARPU / ARPPU
- ✅ 매출 전환율 (잠금 해제 팝업 노출 → 결제)

### 행동 분석
- ✅ 가장 인기 있는 도안 (template_open)
- ✅ 색칠 vs 자유 그림 비율
- ✅ 작품 완성률
- ✅ 갤러리 활용도 (저장/공유)

### 앱 삭제
- ✅ Play Console "통계" → 제거 곡선
- ✅ Firebase Analytics: 신규 인스톨 - 활성 사용자 차이로 추정

---

## ⚠️ 어린이 정책 준수 체크리스트

- [ ] AAID(광고 ID) 수집 비활성화 (코드 + Manifest 적용)
- [ ] Personalized advertising 차단 (Firebase Console)
- [ ] Google 신호 데이터 사용 안 함
- [ ] 데이터 보관 14개월 (Firebase Console 최대 설정)
- [ ] 광고 네트워크 통합 안 함
- [ ] User Property `audience = children_only` 설정 (코드 자동)
- [ ] Data Safety 양식에 "익명 분석" 명시 (Phase 3 작업)
- [ ] Privacy Policy 갱신 (Phase 3 작업)

---

## 🚨 문제 해결

### 이벤트가 Firebase Console에 안 보일 때
- 첫 이벤트 표시까지 **최대 24시간 소요**
- 디버그 모드: `adb shell setprop debug.firebase.analytics.app com.rainbow.sketchbook`
- DebugView에서 실시간 확인 가능

### google-services.json 오류
- 패키지명 불일치 확인 (`com.rainbow.sketchbook`)
- 파일 위치 정확히 `game/android/app/`
- `npx cap sync android` 재실행

---

## 메타

- 작성일: 2026-05-23
- Firebase 프로젝트명: `rainbow-sketchbook`
- 패키지명: `com.rainbow.sketchbook`
- 개발자: Bloombee App Studio / bloombee.appstudio@gmail.com
