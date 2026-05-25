# 메인 메뉴 아이콘 생성 — GPT 프롬프트 가이드

## 권장 모델

| 모델 | 투명배경 지원 | 추천도 |
|------|-------------|------|
| **ChatGPT (DALL-E 3)** | △ (생성 후 백그라운드 제거 필요) | 입문용 |
| **GPT Image 1** (2025) | ⭕ 네이티브 투명 지원 | **★ 베스트** |
| Adobe Firefly | ⭕ | 유료 |
| Recraft.ai | ⭕ | 무료 한도 있음 |

**GPT Image 1**을 사용할 수 있다면 그게 최선. 안되면 DALL-E 3 후 누끼 처리.

---

## 🎨 공통 스타일 가이드 (모든 프롬프트에 포함)

```
Style: 3D rendered cute kawaii icon, soft pastel colors,
glossy plastic-like surface, rounded shapes, soft lighting,
clay/Pixar-style 3D art, kid-friendly mobile game UI

Format: square 1024×1024, transparent background (no background color),
NO drop shadow, NO ground shadow, NO floor reflection,
isolated subject centered in frame, full subject visible with small padding

NOT INCLUDE: any text, letters, Korean characters, English words,
watermark, signature, frame border
```

⚠️ **그림자 제거**가 핵심 — 이전 PNG 잔여물의 주범이었음. 드롭 섀도우가 회색이라 누끼 처리 시 잔여물로 남음.

---

## 📋 6장 메뉴 프롬프트 (영어로 — 결과 안정성 높음)

### 1️⃣ 메모리 게임 (menu_memory_game.png)

```
A cute 3D rendered icon: a pastel pink rounded square card platform
(color #FFB6C8, soft glossy 3D look) with two playful illustrated
flashcards on top. Each flashcard shows a cute white bunny face with
sparkles. The flashcards have rounded corners and a soft purple-pink
border. The bunny faces are 3D kawaii style with pink cheeks and
big eyes. Arranged with the two cards slightly overlapping.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection.

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

### 2️⃣ 가위바위보 (menu_rps.png)

```
A cute 3D rendered icon: a pastel purple rounded square card platform
(color #B19CFF, soft glossy 3D look) with three kawaii 3D hand emojis
on top arranged in a triangle: open palm (paper), closed fist (rock),
and peace sign / scissors. Small motion lines around hands.
3D rendered hands with peach skin, smooth and rounded.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection.

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

### 3️⃣ 스타 캐치 (menu_star_catch.png)

```
A cute 3D rendered icon: a pastel mint green rounded square card
platform (color #7FD8C0, soft glossy 3D look) with a cute butterfly
net or catch net (pink handle) catching a bright yellow shooting star.
The star has a glossy 3D look with sparkles around. Motion lines
trailing behind the star.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection.

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

### 4️⃣ 토슴이 방 (menu_tosumi_room.png)

```
A cute 3D rendered icon: a pastel yellow rounded square card platform
(color #FFE08A, soft glossy 3D look) with a tiny adorable bunny-themed
cottage house on top. The house has a pink roof with bunny ears,
wooden door with a heart sign, small round windows, and tiny garden
elements (toys, balls). A small white bunny visible at the doorway.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection.

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

### 5️⃣ 크레파스 (menu_crayon.png)

```
A cute 3D rendered icon: a pastel pink rounded square card platform
(color #FFB6C8, soft glossy 3D look) with a colorful bundle of cute
crayons on top — pink, yellow, blue, mint, purple — with smiling
faces on a few. A small rainbow arc behind the crayons. Sparkles
and tiny stars around. One crayon has a cute kawaii face with
blush cheeks.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection.

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

### 6️⃣ 스케치북 (menu_sketchbook.png)

```
A cute 3D rendered icon: an open spiral-bound sketchbook (cream/beige
paper color #FFFAF5, gray metal spiral binding at the top) with a
cute white kawaii bunny holding a pencil and drawing on the page.
On the page: simple line drawing of a carrot. Hearts and stars
scattered around the bunny. The sketchbook is angled slightly
in 3D perspective.

Style: 3D rendered cute kawaii icon, soft pastel colors, glossy
plastic surface, soft lighting, clay/Pixar 3D art style.

Background: PURE TRANSPARENT, no background, no drop shadow,
no ground shadow, no floor reflection. The cream paper color of the
sketchbook should be visible (do NOT make the sketchbook itself transparent).

NOT INCLUDE: any text, letters, Korean characters, watermark.

Format: square 1024×1024 PNG with alpha channel.
```

---

## 🚨 GPT한테 추가로 부탁할 핵심 문구

DALL-E 3가 자꾸 그림자나 배경 넣으면 다음 명시:

```
CRITICAL REQUIREMENTS — must follow exactly:
1. NO background of any kind — pure alpha transparency
2. NO drop shadow under the subject
3. NO ground shadow or floor reflection
4. NO gradient background, NO solid color background
5. Save as PNG with alpha channel (RGBA, not RGB)
6. Subject should "float" against transparent background
```

---

## 💡 만약 GPT가 자꾸 흰 배경 넣으면

1. **"Render this as a sticker"** 추가 — 스티커는 보통 투명 배경으로 인식됨
2. **"Like a Telegram sticker / iMessage sticker"** — 비교 대상 명시
3. **"Output: RGBA PNG with full alpha channel"** — 기술적 명시
4. 다 안 되면 흰 배경으로 받고 → `node scripts/process-menu-icons.js`로 후처리

---

## 📁 받은 후 어디에 저장

```
game/public/main_menu/
├─ menu_memory_game.png    ← 1번 결과
├─ menu_rps.png            ← 2번 결과
├─ menu_star_catch.png     ← 3번 결과
├─ menu_tosumi_room.png    ← 4번 결과
├─ menu_crayon.png         ← 5번 결과
└─ menu_sketchbook.png     ← 6번 결과
```

투명 PNG로 잘 받았으면 그대로 게임 새로고침 → 끝.
흰 배경 PNG로 받았으면 `node scripts/process-menu-icons.js` 한 번 돌리고 끝.

---

## 🎨 일관성 유지 팁

- **순서대로 한 채팅 세션에서 모두 생성** — 스타일이 자동으로 일관됨
- 첫 번째 결과가 마음에 들면 "Use the same style for the next icon..." 추가
- 색이 안 맞으면 HEX 코드 명시 (#FFB6C8 같이)
- 한 번에 안 되면 "Try again with NO shadow at all" 같이 재요청

---

## 🆘 그래도 안 되면

다른 도구도 고려:
- **Recraft.ai** — 무료, 투명 배경 옵션 명시적
- **Adobe Express** — 무료, AI 이미지 + 자동 배경 제거
- **Photoshop Generative Fill** — 유료지만 가장 정확
- **rembg** (Python 라이브러리) — 어떤 이미지든 자동 배경 제거 (CLI로 batch 처리 가능)
