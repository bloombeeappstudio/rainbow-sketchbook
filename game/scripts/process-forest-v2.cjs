// 🌲 숲속 도안 v2 재세팅 (대표님 요청)
//   - 새 14장 ChatGPT 도안 (3:2 1536×1024 또는 1:1 1254×1254)
//   - 16:9 캔버스 1672×941에 contain fit + 흰 여백 (비율 유지)
//   - 누끼 처리 (가장자리 흰 픽셀 알파 0)
//   - 원본 폴더에 영문 사본 + game/public/templates/forest/에 누끼 처리 PNG
//
//   기존 영문 5장 (beaver/brontosaurus/dino_footprint/mouse/owl)는 유지
//   기존 trex/rabbit 등 도안 없는 것은 제거 대상 (코드 업데이트 별도)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../assets/스케치북/도안/숲속');
const DST_DIR = path.resolve(__dirname, '../public/templates/forest');

// 16:9 표준 캔버스 (기존 영문 5장과 동일 사이즈)
const CANVAS_W = 1672;
const CANVAS_H = 941;
const WHITE_THRESHOLD = 235;

// ===== 새 14장 매핑 =====
const FOREST_V2_MAP = [
  ['ChatGPT Image 2026년 5월 24일 오후 10_50_10 (1).png',  'forest_bear_free.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_50_11 (4).png',  'forest_campfire_tent.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_50_14 (5).png',  'forest_hedgehog.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_46 (1).png',  'forest_squirrel_free.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_46 (2).png',  'forest_fox_free.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_47 (3).png',  'forest_deer.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_48 (5).png',  'forest_turtle.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_48 (6).png',  'forest_duck.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_49 (8).png',  'forest_stegosaurus.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_49 (9).png',  'forest_raccoon.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 10_53_50 (10).png', 'forest_butterfly.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 11_10_32.png',      'forest_snail.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 11_14_06.png',      'forest_sheep.png'],
  ['ChatGPT Image 2026년 5월 24일 오후 11_14_13.png',      'forest_cat.png'],
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
  //    sharp resize fit=contain + 흰 배경 → 결과는 1672×941 PNG
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

  // 3) PNG로 저장 (game/public/templates/forest/)
  const dstPath = path.join(DST_DIR, dstName);
  await sharp(transparentData, { raw: { width: CANVAS_W, height: CANVAS_H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(dstPath);

  // 4) 원본 폴더에 영문 사본 (16:9 contain fit 결과 — 누끼 X, 단순 16:9 변환만)
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
  console.log(`\n=== 숲속 v2 — ${FOREST_V2_MAP.length}장 처리 (16:9 1672×941 contain fit) ===`);
  let ok = 0, fail = 0;
  for (const [src, dst] of FOREST_V2_MAP) {
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
