/**
 * 토슴이 "참 잘했어요" 로고 — 알파 처리된 RGBA PNG 마무리 (trim + 정사각 패딩)
 *
 * 입력 PNG가 이미 깔끔한 알파를 가진 RGBA이므로:
 *   1) 모서리 잔여 알파 박멸 (ALPHA_FLOOR 미만 → 0)
 *   2) 콘텐츠 박스 trim
 *   3) 사방 패딩 + 정사각 캔버스로 저장
 *
 * 만약 RGB(검정 배경) PNG가 들어오면 → 자동으로 flood-fill 누끼도 수행
 *
 * 사용법: node scripts/process-tosumi-logo-good.js
 *   input:  game/raw/tosumi-logo-good.png
 *   output: game/public/characters/tosumi-logo-good.png
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT  = path.join(__dirname, '..', 'raw', 'tosumi-logo-good.png');
const OUTPUT = path.join(__dirname, '..', 'public', 'characters', 'tosumi-logo-good.png');

// 검정 배경 누끼 (RGB 입력에만 적용)
const BG_VALUE_MAX  = 0.10;
const FEATHER_VMAX  = 0.22;
const ALPHA_FLOOR   = 30;
const SQUARE_PAD    = 32;     // 사방 패딩

function rgbValue(r, g, b) {
  return Math.max(r, g, b) / 255;
}

// RGB 입력이면 검정 배경 누끼 수행 (in-place alpha 채우기)
function floodFillBlackBg(data, w, h) {
  const visited = new Uint8Array(w * h);
  const isBackground = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0); stack.push(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { stack.push(0, y); stack.push(w - 1, y); }

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const vi = y * w + x;
    if (visited[vi]) continue;
    visited[vi] = 1;
    const idx = vi * 4;
    const v = rgbValue(data[idx], data[idx + 1], data[idx + 2]);
    if (v > BG_VALUE_MAX) continue;
    isBackground[vi] = 1;
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vi = y * w + x;
      const idx = vi * 4;
      if (isBackground[vi]) { data[idx + 3] = 0; continue; }
      const v = rgbValue(data[idx], data[idx + 1], data[idx + 2]);
      if (v < FEATHER_VMAX) {
        let neighborBg = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (isBackground[ny * w + nx]) neighborBg++;
          }
        }
        if (neighborBg > 0) {
          const t = (v - BG_VALUE_MAX) / (FEATHER_VMAX - BG_VALUE_MAX);
          data[idx + 3] = Math.round(255 * Math.max(0, Math.min(1, t)));
          continue;
        }
      }
      data[idx + 3] = 255;
    }
  }
}

async function run() {
  console.log(`처리 중: ${path.basename(INPUT)}`);

  const meta = await sharp(INPUT).metadata();
  console.log(`  입력: ${meta.width} × ${meta.height} ${meta.channels}ch ${meta.hasAlpha ? 'RGBA' : 'RGB'}`);

  // RGBA 강제 보장
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // RGB 입력이었으면 검정 배경 누끼 수행
  if (!meta.hasAlpha) {
    console.log('  RGB 입력 감지 → flood-fill 누끼 수행');
    floodFillBlackBg(data, w, h);
  }

  // ===== 잔여 알파 박멸 =====
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < ALPHA_FLOOR) data[i] = 0;
  }

  // ===== trim + 정사각 패딩 =====
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX || minY > maxY) {
    throw new Error('콘텐츠가 비어있음');
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch) + SQUARE_PAD * 2;
  console.log(`  콘텐츠 박스: ${cw} × ${ch} → 정사각 ${side} × ${side}`);

  const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .png()
    .toBuffer();

  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: trimmed, gravity: 'center' }])
    .png()
    .toFile(OUTPUT);

  console.log(`  저장: ${path.relative(path.join(__dirname, '..'), OUTPUT)}`);
  console.log(`✅ 완료`);
}

run().catch(err => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
