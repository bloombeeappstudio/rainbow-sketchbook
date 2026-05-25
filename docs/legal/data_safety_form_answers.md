# Google Play Data Safety 양식 답변지 — 레인보우 스케치북

> Play Console에서 "Data safety" 섹션 작성 시 그대로 입력할 수 있도록 정리.
> **본 앱 정책**: 개인 식별 정보 수집 X / 익명 사용 통계만 수집 (Firebase Analytics 어린이 모드).
> **마지막 갱신**: 2026-05-23 (Firebase Analytics + 갤러리 공유 반영)

---

## 1. Data collection and security

### Q. Does your app collect or share any of the required user data types?
**답변**: **Yes** (Firebase Analytics 익명 통계 — 어린이 모드)

→ 후속 질문에서 "App activity" + "Device or other IDs" 일부 항목 "수집"으로 표시.
→ 다른 모든 카테고리는 "No" (개인 식별 정보 0).

### Q. Is all of the user data collected by your app encrypted in transit?
**답변**: **Yes** (해당 없음 — 데이터 전송 자체가 없음. Capacitor WebView는 HTTPS scheme 사용)

### Q. Do you provide a way for users to request that their data be deleted?
**답변**: **Yes** — 앱 삭제 시 모든 로컬 데이터가 함께 삭제됨. 이메일 문의 시 대응 가능.

---

## 2. Data types — 모두 "수집 안 함"

다음 카테고리 모두 **"App does not collect this data"**:

### Personal info
- ❌ Name
- ❌ Email address
- ❌ User IDs
- ❌ Address
- ❌ Phone number
- ❌ Race and ethnicity
- ❌ Political or religious beliefs
- ❌ Sexual orientation
- ❌ Other personal info

### Financial info
- ❌ User payment info (Google Play가 처리 — 본 앱 미접근)
- ❌ Purchase history
- ❌ Credit score
- ❌ Other financial info

### Health and fitness
- ❌ Health info
- ❌ Fitness info

### Messages
- ❌ Emails
- ❌ SMS or MMS
- ❌ Other in-app messages

### Photos and videos
- ❌ Photos
- ❌ Videos

### Audio files
- ❌ Voice or sound recordings
- ❌ Music files
- ❌ Other audio files

### Files and docs
- ❌ Files and docs

### Calendar
- ❌ Calendar events

### Contacts
- ❌ Contacts

### App activity (Firebase Analytics — 익명, 어린이 모드)
- ✅ **App interactions** (도안 선택, 색칠/그림 완성, 갤러리 사용 등) — Firebase Analytics 익명 통계
  - 수집 목적: App functionality, Analytics
  - 선택적: **No** (사용자 동의 없이 자동 수집되지만 익명)
  - 공유: **No** (3rd party 광고 네트워크 공유 X)
  - 암호화: Firebase 자체 암호화 (전송 중)
  - 삭제 요청 가능: Yes (이메일 문의 시)
- ❌ In-app search history
- ❌ Installed apps
- ❌ Other user-generated content (작품 PNG는 로컬 저장. 사용자가 명시적으로 공유 버튼 누를 때만 시스템 공유 시트로 전송)
- ❌ Other actions

### 사용자 작품 (User-Generated Content)
- 작품 PNG는 **로컬 저장**만 기본 (외부 전송 X)
- 사용자(부모)가 "공유" 버튼 명시적으로 누르고 부모 게이트(수학 문제) 통과해야 시스템 공유 시트로 전송
- 본 앱은 작품을 자체 서버에 업로드/저장하지 않음
- Data Safety form 답변: "User-generated content (Other)" → **사용자 선택에 의한 명시적 공유만** (자동 X)

### Web browsing
- ❌ Web browsing history

### App info and performance
- ❌ Crash logs
- ❌ Diagnostics
- ❌ Other app performance data

### Device or other IDs
- ✅ **Firebase Installations ID** (익명) — Firebase Analytics에서 자동 발급, 익명 사용자 식별용
  - 수집 목적: Analytics (어린이 모드, 광고 타겟팅 X)
  - 선택적: No (자동)
  - 공유: No
  - 사용자 식별 정보와 연결 X
- ❌ **AAID, IMEI, MAC 등** 광고/기기 식별자 — AndroidManifest 명시 거부
  - **AndroidManifest.xml에서 AD_ID 권한 명시적 거부** (`tools:node="remove"`)
  - Children-only 앱 정책 준수

### 2026 COPPA 신규 카테고리 (2026-04-22 시행)
- ❌ Geolocation (precise/approximate) — 위치 권한 미요청
- ❌ Biometric identifiers (지문/얼굴 인식) — 미수집
- ❌ Persistent identifiers (Device ID, Advertising ID 등) — 미수집
- ❌ Persistent identifiers + targeted advertising — 광고 자체 0

---

## 3. Children's policy section

### Q. Does your app target children?
**답변**: **Yes** — 5~12세 어린이 대상 (Designed for Families 프로그램 신청 권장)

### Q. Age group targeted
**답변**: **Ages 5-8** (5~8세 어린이)

### Q. Does your app contain ads?
**답변**: **No** — 광고 없음

### Q. Does your app use any analytics SDKs?
**답변**: **No** — Google Analytics, Firebase Analytics, AppsFlyer 등 미탑재

### Q. Does your app collect data from children?
**답변**: **No** — 어린이 사용자로부터 어떠한 데이터도 수집하지 않음

### Q. Does your app comply with Google Play Families Policy?
**답변**: **Yes**

### Q. Does your app comply with COPPA?
**답변**: **Yes** (해당 시) — 13세 미만 개인정보 수집 안 함

### Q. Does your app comply with GDPR-K?
**답변**: **Yes** (해당 시) — EU 거주 어린이 데이터 처리 안 함

---

## 4. App content & ratings

### Content rating
**답변**: **Everyone** (IARC 기준 "All Ages")

### Q. Does your app contain user-generated content?
**답변**: **Yes** (사용자가 그린 작품) — 다만 **로컬 저장만, 외부 공유 X, 다른 사용자에게 노출 X**

### Q. User-generated content moderation?
**답변**: **Not applicable** — 로컬 저장이라 모더레이션 대상 없음

---

## 5. App access

### Q. Is access to your app restricted by login?
**답변**: **No** — 로그인 없음, 모든 기능 즉시 사용 가능

---

## 6. 권한 (App permissions)

본 앱이 요청하는 안드로이드 권한:
- `android.permission.INTERNET` — Capacitor WebView 작동 + Google Play Billing API 호출

요청하지 **않는** 권한:
- ❌ Camera
- ❌ Location
- ❌ Microphone
- ❌ Storage (외부 저장소)
- ❌ Contacts
- ❌ Phone
- ❌ Calendar

---

## 7. Privacy Policy URL

**필수 입력**: Privacy Policy 호스팅 URL
- 현재 상태: `docs/legal/privacy_policy_ko.md`, `privacy_policy_en.md` 작성 완료
- **호스팅 필요**: GitHub Pages, Notion 공개 페이지, 또는 회사 도메인
- 권장: `https://rainbow-sketchbook.github.io/privacy-policy/` 또는 유사

---

## 메모

- Data safety 양식 작성 후 **승인까지 몇 일 소요** 가능. 출시 일정에 여유 두기.
- 모든 답변이 "No"여도 Privacy Policy URL은 **필수**.
- 향후 광고 SDK 추가 시 Data Safety 재제출 필수.
- 변경 시 모든 응답 다시 검토.
