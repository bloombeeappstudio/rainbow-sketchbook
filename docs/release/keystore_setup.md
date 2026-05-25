# 🔐 Android Keystore 생성 + 백업 가이드

> **⚠️ 이 키스토어는 앱의 평생 신원**입니다.
> 한 번 출시하면 같은 키로만 업데이트 가능. **분실 시 앱 영구 업데이트 불가** → 새 앱으로 다시 출시해야 함.

---

## 🎯 작업 흐름

```
1. keytool 명령으로 keystore 생성 (대표님이 PowerShell에서 실행)
   ↓
2. keystore.properties 작성 (비밀번호 저장)
   ↓
3. 즉시 백업 (여러 곳에)
   ↓
4. ./gradlew assembleRelease 또는 bundleRelease 빌드 가능
```

---

## 1️⃣ Keystore 생성 (대표님 PowerShell 실행)

PowerShell 또는 cmd 열고 게임 폴더로 이동:

```powershell
cd "C:\Users\sinae\rainbow-sketchbook\game\android"
```

다음 명령 실행 (한 줄로):

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 25000 -alias upload
```

**입력 요청 사항** (대표님이 직접 입력):

| 질문 | 권장 답변 |
|---|---|
| Enter keystore password | **강력한 비밀번호 (16자 이상 권장)** ⚠️ 절대 잊지 말기 |
| Re-enter new password | 위와 동일 |
| What is your first and last name? | `Bloombee App Studio` |
| What is the name of your organizational unit? | `Mobile Apps` (또는 비워두기) |
| What is the name of your organization? | `Bloombee App Studio` |
| What is the name of your City or Locality? | `Seoul` |
| What is the name of your State or Province? | `Seoul` |
| What is the two-letter country code for this unit? | `KR` |
| Is CN=..., correct? | **`yes`** |
| Enter key password for upload | **Enter만 누름** (storeFile password와 동일하게 사용) |

→ `upload-keystore.jks` 파일이 `game/android/` 폴더에 생성됨.

### 비밀번호 보안 팁

- 최소 16자 이상
- 대소문자 + 숫자 + 기호 조합
- 다른 곳에 쓰던 비밀번호 재사용 X
- 예: `Bloombee#Rainbow2026!StarLight` 같은 패스프레이즈

---

## 2️⃣ keystore.properties 작성

`game/android/` 폴더에 **`keystore.properties`** 파일 생성 (템플릿 `keystore.properties.example` 참고):

```properties
storeFile=upload-keystore.jks
storePassword=여기에_방금_입력한_비밀번호
keyAlias=upload
keyPassword=여기에_방금_입력한_비밀번호
```

> ⚠️ 이 파일은 `.gitignore`로 보호되어 Git에 올라가지 않음.

---

## 3️⃣ 즉시 백업 (가장 중요) ⚠️⚠️⚠️

**3개 이상 위치에 백업:**

| 위치 | 내용 | 비고 |
|---|---|---|
| 1️⃣ 로컬 외장 SSD/USB | `upload-keystore.jks` + 비밀번호 메모 | 오프라인 백업 |
| 2️⃣ 클라우드 (개인 계정) | 1Password / Bitwarden / 구글 드라이브 암호화 | 비밀번호도 함께 |
| 3️⃣ 비밀번호 매니저 | 비밀번호만 별도 항목으로 | 1Password / Bitwarden / Apple Keychain |

**백업 항목 체크리스트:**
- [ ] `upload-keystore.jks` 파일 (원본 그대로)
- [ ] storePassword 비밀번호
- [ ] keyAlias = `upload`
- [ ] keyPassword (storePassword와 같이 설정한 경우 동일)
- [ ] SHA-1 fingerprint (아래 명령으로 추출)

### SHA-1 fingerprint 확인 (Play Console에서 사용)

```powershell
keytool -list -v -keystore upload-keystore.jks -alias upload
```

비밀번호 입력 후 출력에서 다음 줄 메모:

```
Certificate fingerprints:
   SHA1: XX:XX:XX:XX:...
   SHA256: XX:XX:XX:XX:...
```

→ Play Console "앱 서명" 섹션에 SHA-1 등록.

---

## 4️⃣ 릴리스 빌드 (출시 직전)

```powershell
cd "C:\Users\sinae\rainbow-sketchbook\game"
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

→ `game/android/app/build/outputs/bundle/release/app-release.aab` 생성됨.
→ 이 AAB 파일을 Play Console에 업로드.

---

## 🚨 분실/유출 시 대응

### Keystore 파일 분실
- **앱 영구 업데이트 불가** — Google Play 정책상 변경 불가
- 대안: 새 패키지명(`com.rainbow.sketchbook2`)으로 다시 출시 → 기존 사용자는 새 앱 다운로드 필요
- 예방: 백업 3중화 + 정기 점검

### Keystore 비밀번호 분실
- 동일하게 영구 업데이트 불가
- 예방: 비밀번호 매니저 필수

### Keystore 유출
- 즉시 Play Console "앱 서명 키 업그레이드" 신청 가능 (Google Play App Signing 사용 시)
- 기본은 Google이 서명 키를 자체 관리(Play App Signing 자동) → 업로드 키 유출은 복구 가능
- 새 upload key 생성 → Play Console에 등록 → 향후 빌드는 새 키로

---

## 📚 추가 자료

- [Android Developers: Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Play Console: App signing by Google Play](https://support.google.com/googleplay/android-developer/answer/9842756)

---

## 📋 작업 완료 체크리스트

- [ ] `upload-keystore.jks` 생성 완료
- [ ] `keystore.properties` 파일 작성 (Git push 금지)
- [ ] SHA-1 fingerprint 메모
- [ ] 3개 이상 위치에 백업 완료
- [ ] 비밀번호 매니저에 저장
- [ ] `./gradlew bundleRelease` 빌드 테스트 성공

---

## 메타

- 작성일: 2026-05-23
- 적용 앱: 레인보우 스케치북 (`com.rainbow.sketchbook`)
- 개발자: Bloombee App Studio / bloombee.appstudio@gmail.com
