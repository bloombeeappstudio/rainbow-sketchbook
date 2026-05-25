// 🐰 캐릭터 도안 v2 재세팅 (대표님 요청)
//   - 새 8장 ChatGPT 도안 (이미 16:9 1672×941)
//   - 1~4: 토슴이 4종 (별/리본/풍선/무지개)
//   - 5~8: 외계인/스컹크/박쥐/블랙치
//   - 16:9 캔버스 1672×941에 contain fit + 흰 여백 (비율 유지, 이미 그 사이즈라 일관성)
//   - 누끼 처리 (가장자리 흰 픽셀 알파 0)
//   - 무료 3장 (toseumi_star/ribbon/balloon)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../assets/스케치북/도안/캐릭터');
const DST_DIR = path.resolve(__dirname, '../public/templates/character');

// 16:9 표준 캔버스 (기존 도안과 동일 사이즈)
const CANVAS_W = 1672;
const CANVAS_H = 941;
const WHITE_THRESHOLD = 235;

// ===== 새 8장 매핑 =====
const CHARACTER_V2_MAP = [
  ['ChatGPT Image 2026년 5월 23일 오전 01_20_21 (1).png', 'character_toseumi_star_free.png'],
  ['ChatGPT Image 2026년 5월 23일 오전 01_20_23 (2).png', 'character_toseumi_ribbon_free.png'],
  ['ChatGPT Image 2026년 5월 23일 오전 01_20_24 (3).png', 'character_toseumi_balloon_free.png'],
  ['ChatGPT Image 2026년 5월 23일 오전 01_20_24 (4).png', 'character_toseumi_rainbow.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_57_04.png',     'character_alien.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_57_14.png',     'character_skunk.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_57_20.png',     'character_bat.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_57_25.png',     'character_blackchi.png'],
];

// 가장자리 flood-fill로 외곽 흰 픽셀만 알파 0
async function makeTransparent(buffer, width, height) {
  const { data, info } = await sharp(buffer, { raw: { width, height, channels: 4 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { channels } = info;
  const visited = new Uint8Array(width * height);
  const stack = [0, 0, width - 1, 0, 0, height - 1, width - 1, height - 1];
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    const di = idx * channels;
    if (data[di] < WHITE_THRESHOLD || data[di + 1] < WHITE_THRESHOLD || data[di + 2] < WHITE_THRESHOLD) continue;
    visited[idx] = 1;
    data[di + 3] = 0;
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }
  return data;
}

async function processOne(srcPath, dstName) {
  // 1) 16:9 캔버스에 contain fit + 흰 여백 (비율 유지)
  const fitBuffer = await sharp(srcPath)
    .resize(CANVAS_W, CANVAS_H, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2) 누끼 처리 (가장자리 흰 영역 알파 0)
  const transparentData = await makeTransparent(fitBuffer, CANVAS_W, CANVAS_H);

  // 3) PNG로 저장 (game/public/templates/character/)
  const dstPath = path.join(DST_DIR, dstName);
  await sharp(transparentData, { raw: { width: CANVAS_W, height: CANVAS_H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dstPath);

  // 4) 원본 폴더에 영문 사본 (누끼 X, 단순 16:9 변환만)
  const assetsPath = path.join(SRC_DIR, dstName);
  await sharp(srcPath)
    .resize(CANVAS_W, CANVAS_H, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(assetsPath);
}

(async () => {
  if (!fs.existsSync(DST_DIR)) fs.mkdirSync(DST_DIR, { recursive: true });
  console.log(`\n=== 캐릭터 v2 — ${CHARACTER_V2_MAP.length}장 처리 (16:9 1672×941 contain fit) ===`);
  let ok = 0, fail = 0;
  for (const [src, dst] of CHARACTER_V2_MAP) {
    const srcPath = path.join(SRC_DIR, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  [SKIP] ${src} (없음)`);
      fail++;
      continue;
    }
    try {
      await processOne(srcPath, dst);
      console.log(`  [OK] ${src.substring(0, 45)}... → ${dst}`);
      ok++;
    } catch (e) {
      console.error(`  [ERROR] ${src}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n총 ${ok}장 성공 / ${fail}장 실패`);
})();
