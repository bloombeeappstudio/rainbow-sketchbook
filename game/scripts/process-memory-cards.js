/**
 * 메모리 카드 PNG 41장 일괄 누끼 처리
 *
 * 입력 : public/cards/memory_card_*.png (이미 복사된 RGB 원본)
 * 출력 : 같은 파일에 덮어쓰기 (RGBA 변환)
 *
 * 처리: HSV flood fill + erosion 2px + feather + binarize + trim
 *      → 흰 배경 완전 제거, 카드 디자인만 남김
 *
 * 사용: node scripts/process-memory-cards.js
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');

// HSV 누끼 임계값 (얇은 핑크 귀, 크림 등 보존)
const BG_SATURATION_MAX = 0.05;
const BG_VALUE_MIN      = 0.82;
const FEATHER_S_RANGE   = 0.08;
const FEATHER_V_RANGE   = 0.10;
const ALPHA_FLOOR       = 60;
const EROSION_ITER      = 2;
const SQUARE_PAD        = 30;

function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  return { s: max === 0 ? 0 : (max - min) / max, v: max };
}

async function processFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // 1단계: 가장자리 flood fill
  const visited = new Uint8Array(w * h);
  const isBg = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0); stack.push(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { stack.push(0, y); stack.push(w - 1, y); }

  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const vi = y * w + x;
    if (visited[vi]) continue;
    visited[vi] = 1;
    const idx = vi * 4;
    const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
    if (s >= BG_SATURATION_MAX || v <= BG_VALUE_MIN) continue;
    isBg[vi] = 1;
    stack.push(x + 1, y); stack.push(x - 1, y);
    stack.push(x, y + 1); stack.push(x, y - 1);
  }

  // 1.5단계: Erosion (anti-alias halo 제거)
  for (let it = 0; it < EROSION_ITER; it++) {
    const next = new Uint8Array(isBg);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const vi = y * w + x;
        if (isBg[vi]) continue;
        if (isBg[(y - 1) * w + x] || isBg[(y + 1) * w + x] ||
            isBg[y * w + (x - 1)] || isBg[y * w + (x + 1)]) {
          next[vi] = 1;
        }
      }
    }
    for (let i = 0; i < isBg.length; i++) isBg[i] = next[i];
  }

  // 2단계: 알파 + feather + binarize
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vi = y * w + x;
      const idx = vi * 4;
      if (isBg[vi]) { data[idx + 3] = 0; continue; }
      let bgN = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (isBg[ny * w + nx]) bgN++;
        }
      }
      if (bgN === 0) { data[idx + 3] = 255; continue; }
      const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
      const sDist = Math.max(0, Math.min(1, (BG_SATURATION_MAX + FEATHER_S_RANGE - s) / FEATHER_S_RANGE));
      const vDist = Math.max(0, Math.min(1, (v - (BG_VALUE_MIN - FEATHER_V_RANGE)) / FEATHER_V_RANGE));
      const fade = sDist * vDist;
      const alpha = Math.round(255 * (1 - fade));
      data[idx + 3] = alpha < ALPHA_FLOOR ? 0 : alpha;
    }
  }

  // 3단계: 트림 + 정사각 패딩
  const trimmedBuffer = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .toBuffer();
  const tMeta = await sharp(trimmedBuffer).metadata();
  const maxSide = Math.max(tMeta.width, tMeta.height) + SQUARE_PAD * 2;
  const padX = Math.floor((maxSide - tMeta.width) / 2);
  const padY = Math.floor((maxSide - tMeta.height) / 2);
  const squared = await sharp(trimmedBuffer)
    .extend({
      top: padY,
      bottom: maxSide - tMeta.height - padY,
      left: padX,
      right: maxSide - tMeta.width - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 4단계: 원본 위에 덮어쓰기 (sharp read/write 동일 파일 불가 → .tmp 거쳐서)
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, squared);
  await fs.rename(tmpPath, filePath);

  return { orig: `${w}x${h}`, trimmed: `${tMeta.width}x${tMeta.height}`, squared: `${maxSide}x${maxSide}` };
}

(async () => {
  console.log('=== 메모리 카드 41장 누끼 처리 ===\n');

  const files = (await fs.readdir(CARDS_DIR))
    .filter(f => f.startsWith('memory_card_') && f.endsWith('.png'))
    .sort();

  for (const f of files) {
    try {
      const r = await processFile(path.join(CARDS_DIR, f));
      console.log(`  ✓ ${f}  (${r.orig} → ${r.squared} 정사각 RGBA)`);
    } catch (e) {
      console.error(`  ✗ ${f}: ${e.message}`);
    }
  }
  console.log(`\n=== 완료: ${files.length}장 처리됨 ===`);
})();
