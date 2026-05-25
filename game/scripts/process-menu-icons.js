/**
 * 메인 메뉴 PNG 6장 — 흰 배경 + 드롭 섀도우 제거 + 정사각형 패딩
 *
 * 핵심 알고리즘: HSV 기반 배경/섀도우 검출
 *   - 흰 배경: saturation 낮음, value 높음
 *   - 드롭 섀도우: saturation 낮음 (회색), value 보통~높음
 *   - 카드 콘텐츠: saturation 높음 (색 진함)
 *   → saturation + value 두 축으로 정확히 분리
 *
 * 사용법: node scripts/process-menu-icons.js
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'public', 'main_menu');

const FILES = [
  'menu_memory_game.png',
  'menu_rps.png',
  'menu_star_catch.png',
  'menu_tosumi_room.png',
  'menu_crayon.png',
  'menu_sketchbook.png',
];

// === HSV 기반 배경 검출 임계값 ===
// 흰색 + 옅은 회색(드롭 섀도우)만 잡고, 크림색/연한 색 콘텐츠는 보존
//
// 색 분포 분석:
//   - 순수 흰색  : S=0,     V=1.0  → 배경
//   - 드롭 섀도우: S≈0.04,  V≈0.87 → 배경
//   - 크림 종이  : S≈0.13,  V≈0.99 → 콘텐츠 (보존!)
//   - 옅은 핑크  : S≈0.22,  V≈0.99 → 콘텐츠
//   - 진한 색    : S>0.3   → 콘텐츠
// GPT가 드롭 섀도우 없이 깨끗하게 뽑아줌 → 매우 보수적 임계값 사용
// (옅은 핑크 토끼 귀끝, 크림 종이 등 콘텐츠 다 보존)
const BG_SATURATION_MAX = 0.05;   // 0.08 → 0.05 (옅은 핑크/크림 다 보존)
const BG_VALUE_MIN      = 0.82;   // 0.78 → 0.82 (어두운 픽셀 제외)

// 페더링 — 매우 좁게
const FEATHER_S_RANGE = 0.025;    // 0.04 → 0.025
const FEATHER_V_RANGE = 0.06;     // 0.08 → 0.06

// alpha binarize — 잔여물 박멸
const ALPHA_FLOOR = 50;

// 정사각형 패딩 — 여유 있게 (귀끝 등이 잘리지 않도록)
const SQUARE_PAD = 30;            // 16 → 30

function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v };
}

async function processFile(filename) {
  const filePath = path.join(DIR, filename);
  console.log(`처리 중: ${filename}`);

  // 원본 로드 → RGBA raw 버퍼
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // === 1단계: 가장자리부터 flood fill (배경/섀도우만 잡고, 내부 디테일 보호) ===
  const visited = new Uint8Array(w * h);
  const isBackground = new Uint8Array(w * h);
  const stack = [];

  // 가장자리 픽셀 push
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
    const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);

    // 무채색(흰/회색) + 밝음 = 배경 or 드롭 섀도우
    if (s >= BG_SATURATION_MAX || v <= BG_VALUE_MIN) continue;   // 콘텐츠 만남 → 멈춤

    isBackground[vi] = 1;

    // 4방향 push
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }

  // === 2단계: 알파 적용 ===
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vi = y * w + x;
      const idx = vi * 4;

      if (isBackground[vi]) {
        data[idx + 3] = 0;
        continue;
      }

      // 가장자리(배경 인접) 픽셀 페더링
      let bgNeighborCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (isBackground[ny * w + nx]) bgNeighborCount++;
        }
      }

      if (bgNeighborCount === 0) {
        data[idx + 3] = 255;
        continue;
      }

      // 가장자리 픽셀 — 무채색에 가까울수록 더 투명
      const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
      const sDist = Math.max(0, Math.min(1, (BG_SATURATION_MAX + FEATHER_S_RANGE - s) / FEATHER_S_RANGE));
      const vDist = Math.max(0, Math.min(1, (v - (BG_VALUE_MIN - FEATHER_V_RANGE)) / FEATHER_V_RANGE));
      // 두 조건 모두 페더 범위 안일 때만 알파 감소
      const fadeAmount = sDist * vDist;
      const alpha = Math.round(255 * (1 - fadeAmount));
      data[idx + 3] = alpha < ALPHA_FLOOR ? 0 : alpha;
    }
  }

  // === 3단계: 콘텐츠 박스로 트림 ===
  const trimmedBuffer = await sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .toBuffer();

  // === 4단계: 정사각형 패딩 (모든 메뉴 셀이 시각적으로 균일하게 보이도록) ===
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  const maxSide = Math.max(trimmedMeta.width, trimmedMeta.height) + SQUARE_PAD * 2;
  const padX = Math.floor((maxSide - trimmedMeta.width) / 2);
  const padY = Math.floor((maxSide - trimmedMeta.height) / 2);

  const squaredBuffer = await sharp(trimmedBuffer)
    .extend({
      top: padY,
      bottom: maxSide - trimmedMeta.height - padY,
      left: padX,
      right: maxSide - trimmedMeta.width - padX,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  console.log(`  ✓ ${filename}: ${w}x${h} → ${trimmedMeta.width}x${trimmedMeta.height} → ${maxSide}x${maxSide} 정사각`);

  // 원본에 덮어쓰기 (sharp는 같은 파일 read/write 불가 → .tmp 거쳐서 rename)
  const tmpPath = filePath + '.tmp';
  await fs.writeFile(tmpPath, squaredBuffer);
  await fs.rename(tmpPath, filePath);
}

(async () => {
  console.log('=== 메뉴 PNG 누끼 처리 (HSV 기반 + 정사각 패딩) ===\n');
  for (const f of FILES) {
    try {
      await processFile(f);
    } catch (e) {
      console.error(`  ✗ ${f} 실패:`, e.message);
    }
  }
  console.log('\n=== 완료! ===');
})();
