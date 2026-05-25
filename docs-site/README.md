# Rainbow Sketchbook — Policy Site

이 폴더는 **GitHub Pages**로 호스팅되는 정책 문서 사이트입니다.

## 🌐 공개 URL (호스팅 후 예상)

- **랜딩**: `https://bloombeeappstudio.github.io/rainbow-sketchbook/`
- **개인정보 처리방침 (한)**: `https://bloombeeappstudio.github.io/rainbow-sketchbook/privacy-policy-ko/`
- **Privacy Policy (en)**: `https://bloombeeappstudio.github.io/rainbow-sketchbook/privacy-policy-en/`
- **이용약관 (한)**: `https://bloombeeappstudio.github.io/rainbow-sketchbook/terms-of-service-ko/`
- **Terms of Service (en)**: `https://bloombeeappstudio.github.io/rainbow-sketchbook/terms-of-service-en/`

> 위 URL을 Google Play Console "Privacy Policy URL" 필드에 그대로 입력.

---

## 🚀 GitHub Pages 배포 절차 (대표님 직접 진행)

### 1. GitHub 저장소 생성
1. <https://github.com/new> 접속 (계정: `bloombeeapps`)
2. Repository name: **`rainbow-sketchbook`**
3. Public 선택 (GitHub Pages는 무료 계정에서 public만)
4. README 등 추가 옵션은 모두 체크 해제 → **Create repository**

### 2. 로컬 → GitHub 푸시
PowerShell 또는 Git Bash로 프로젝트 폴더에서:
```bash
cd "C:/Users/sinae/rainbow-sketchbook"
git init
git add docs-site/
git commit -m "Initial: legal docs for Rainbow Sketchbook"
git branch -M main
git remote add origin https://github.com/bloombeeappstudio/rainbow-sketchbook.git
git push -u origin main
```

> 🔒 게임 코드 전체를 push할지는 별도 결정. 일단 `docs-site/`만 push해도 정책 사이트는 동작합니다.

### 3. GitHub Pages 활성화
1. 저장소 페이지 → **Settings** → 좌측 **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / Folder: **`/docs-site`** 선택
4. **Save**
5. 1~2분 후 상단에 "✓ Your site is live at ..." 표시되면 완료

### 4. 동작 확인
- 위 "공개 URL" 4개를 브라우저에서 직접 접속 → 모두 정상 표시되는지 확인

### 5. Play Console에 URL 입력
- Play Console → 앱 콘텐츠 → 개인정보 처리방침 → URL: `https://bloombeeappstudio.github.io/rainbow-sketchbook/privacy-policy-ko/`

---

## 📂 폴더 구조

```
docs-site/
├── _config.yml              ← Jekyll 설정
├── index.html               ← 랜딩 페이지 (4언어 링크)
├── privacy-policy-ko.md     ← 개인정보 처리방침 (한)
├── privacy-policy-en.md     ← Privacy Policy (en)
├── terms-of-service-ko.md   ← 이용약관 (한)
├── terms-of-service-en.md   ← Terms of Service (en)
└── README.md                ← 이 파일 (배포 가이드)
```

## 📝 정책 문서 업데이트

법적 문서는 두 곳에 동시에 있습니다:
- `docs/legal/` — 마스터(편집용)
- `docs-site/` — 호스팅 사본 (push 대상)

업데이트 시 두 폴더 모두 수정 또는 마스터에서 복사:
```bash
cp docs/legal/privacy_policy_ko.md docs-site/privacy-policy-ko.md
# front matter는 docs-site 버전에만 있음 — 복사 후 다시 추가
```

향후 자동 동기화가 필요하면 별도 스크립트 작성 가능.

## 메타

- 최초 작성: 2026-05-22
- 계정: bloombeeappstudio / bloombee.appstudio@gmail.com
