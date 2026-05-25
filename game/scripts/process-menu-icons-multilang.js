/**
 * 메인 메뉴 PNG 다국어 처리 — ko/ja/en/tw 각 6장씩 총 24장
 *
 * 입력 : ../../assets/main_menu/가용리소스/{lang}/menu_*_{lang}.png
 * 출력 : ../public/main_menu/{lang}/menu_*.png  (locale 폴더, 파일명에서 _lang 접미사 제거)
 *
 * 처리: HSV 기반 흰배경 누끼 + 정사각형 패딩 (process-menu-icons.js와 동일 알고리즘)
 *
 * 사용: node scripts/process-menu-icons-multilang.js  (game/ 디렉토리에서)
 */
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_BASE = path.join(__dirname, '..', '..', 'assets', 'main_menu', '가용리소스');
const DST_BASE = path.join(__dirname, '..', 'public', 'main_menu');

const LOCALES = ['ko', 'ja', 'en', 'tw'];

// 파일명 매핑: source → destination (locale 접미사 제거 + 'rps' 더블닷 정리)
const FILE_MAP = [
  { src: 'menu_memory_game', dst: 'menu_memory_game' },
  { src: 'menu_rps.',         dst: 'menu_rps' },           // 원본은 .._XX (extra dot)
  { src: 'menu_star_catch',   dst: 'menu_star_catch' },
  { src: 'menu_my_room',      dst: 'menu_my_room' },
  { src: 'menu_crayon',       dst: 'menu_crayon' },
  { src: 'menu_sketchbook',   dst: 'menu_sketchbook' },
];

// HSV 기반 누끼 임계값 (얇은 핑크 귀끝, 크림 종이 다 보존)
const BG_SATURATION_MAX = 0.05;
const BG_VALUE_MIN      = 0.82;
// 페더링 살짝 더 넓게 — anti-alias 픽셀 부드럽게
const FEATHER_S_RANGE = 0.08;     // 0.025 → 0.08
const FEATHER_V_RANGE = 0.10;     // 0.06 → 0.10
const ALPHA_FLOOR = 60;           // 50 → 60 (소프트 잔여물 더 박멸)
const SQUARE_PAD  = 30;

// 가장자리 침식 (erosion) — 콘텐츠 마스크 축소 = 흰 후광/halo 제거
// 2번 반복 = 2px 침식 (1200px PNG에서 0.17% — 시각상 영향 없음)
const EROSION_ITERATIONS = 2;

function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v };
}

async function processFile(srcPath, dstPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // 1단계: 가장자리 flood fill
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
    const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
    if (s >= BG_SATURATION_MAX || v <= BG_VALUE_MIN) continue;
    isBackground[vi] = 1;
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }

  // 1.5단계: Erosion — 콘텐츠 가장자리 N픽셀 침식 (anti-alias 후광 제거)
  // BG 마스크를 콘텐츠 방향으로 N픽셀 확장 → 가장자리 흰 잔여물 박멸
  for (let it = 0; it < EROSION_ITERATIONS; it++) {
    const next = new Uint8Array(isBackground);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const vi = y * w + x;
        if (isBackground[vi]) continue;
        // 4-방향 인접 픽셀 중 하나라도 BG면 이 픽셀도 BG로 (1px 확장)
        if (isBackground[(y - 1) * w + x] ||
            isBackground[(y + 1) * w + x] ||
            isBackground[y * w + (x - 1)] ||
            isBackground[y * w + (x + 1)]) {
          next[vi] = 1;
        }
      }
    }
    for (let i = 0; i < isBackground.length; i++) isBackground[i] = next[i];
  }

  // 2단계: 알파 적용 + 페더링
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const vi = y * w + x;
      const idx = vi * 4;
      if (isBackground[vi]) { data[idx + 3] = 0; continue; }
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
      if (bgNeighborCount === 0) { data[idx + 3] = 255; continue; }
      const { s, v } = rgbToHsv(data[idx], data[idx + 1], data[idx + 2]);
      const sDist = Math.max(0, Math.min(1, (BG_SATURATION_MAX + FEATHER_S_RANGE - s) / FEATHER_S_RANGE));
      const vDist = Math.max(0, Math.min(1, (v - (BG_VALUE_MIN - FEATHER_V_RANGE)) / FEATHER_V_RANGE));
      const fadeAmount = sDist * vDist;
      const alpha = Math.round(255 * (1 - fadeAmount));
      data[idx + 3] = alpha < ALPHA_FLOOR ? 0 : alpha;
    }
  }

  // 3단계: 트림
  const trimmedBuffer = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .toBuffer();

  // 4단계: 정사각형 패딩
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

  await fs.writeFile(dstPath, squaredBuffer);
  return { src: `${w}x${h}`, dst: `${maxSide}x${maxSide}` };
}

(async () => {
  console.log('=== 다국어 메뉴 PNG 처리 (4 locale × 6 = 24장) ===\n');
  for (const locale of LOCALES) {
    const srcDir = path.join(SRC_BASE, locale);
    const dstDir = path.join(DST_BASE, locale);
    await fs.mkdir(dstDir, { recursive: true });
    console.log(`[${locale}] ${srcDir} → ${dstDir}`);
    for (const { src, dst } of FILE_MAP) {
      const srcPath = path.join(srcDir, `${src}_${locale}.png`);
      const dstPath = path.join(dstDir, `${dst}.png`);
      try {
        const r = await processFile(srcPath, dstPath);
        console.log(`  ✓ ${dst}.png  (${r.src} → ${r.dst})`);
      } catch (e) {
        console.error(`  ✗ ${src}_${locale}.png 실패:`, e.message);
      }
    }
    console.log();
  }
  console.log('=== 완료 ===');
})();
