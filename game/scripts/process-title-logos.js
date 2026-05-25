/**
 * 타이틀 로고 누끼 처리 (4언어 × 2종류 = 8개 파일)
 *
 * 핵심: 흰 테두리는 보존하고 외부 흰/회색 배경만 제거
 *
 * 알고리즘:
 *   1) 색 콘텐츠 마스크 (S > 0.15) — 텍스트/그림의 채색 영역
 *   2) BFS dilation N=50px → "흰 테두리 보호 영역"
 *   3) 각 픽셀 판정:
 *        - 흰색 (V > 0.94, S < 0.05) AND 보호 영역 밖 → 알파 0
 *        - 그 외 → 알파 255
 *   4) trim + 1/2 다운스케일 + 약간 패딩
 *
 * 사용법: node scripts/process-title-logos.js
 *   input:  ../assets/타이틀_로고/*.png
 *   output: public/title_logos/{ko|ja|en|tw}_{full|sub}.png
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '타이틀_로고');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'title_logos');

// 파일명에서 _no_subtitle_3x = 부제 제외하지 않은 풀버전(메인+부제 다 포함)
// _no_fulltitle_3x = 풀타이틀 제외 = 메인 타이틀만 (작은 사이즈)
const FILES = [
  { lang: 'ko', type: 'full', in: 'rainbow_logo_ko_no_shadow_no_subtitle_3x.png' },
  { lang: 'ja', type: 'full', in: 'rainbow_logo_ja_no_shadow_no_subtitle_3x.png' },
  { lang: 'en', type: 'full', in: 'rainbow_logo_en_no_shadow_no_subtitle_3x.png' },
  { lang: 'tw', type: 'full', in: 'rainbow_logo_tw_no_shadow_no_subtitle_3x.png' },
  { lang: 'ko', type: 'sub',  in: 'rainbow_logo_ko_no_shadow_no_fulltitle_3x.png' },
  { lang: 'ja', type: 'sub',  in: 'rainbow_logo_ja_no_shadow_no_fulltitle_3x.png' },
  { lang: 'en', type: 'sub',  in: 'rainbow_logo_en_no_shadow_no_fulltitle_3x.png' },
  { lang: 'tw', type: 'sub',  in: 'rainbow_logo_tw_no_shadow_no_fulltitle_3x.png' },
];

// ── 임계값 ──
const WHITE_V_MIN     = 0.94;   // V >= 0.94 → 흰색
const WHITE_S_MAX     = 0.05;   // S <= 0.05 → 무채색
const CONTENT_S_MIN   = 0.15;   // S >= 0.15 → 색 콘텐츠
// 보호 영역은 이미지 사이즈 비례 (외곽선이 비례적으로 두꺼우니까)
//   sub(h=724):  724/30 ≈ 24px (외곽선 두께 추정)
//   full(h=2172): 2172/30 ≈ 72px
const PROTECT_RATIO   = 1 / 30; // 작게 — 외부 배경 확실 제거 우선
const PROTECT_MIN     = 15;
const FEATHER_PX      = 5;      // 외곽선 너머 부드러운 페더 (소실 위험 줄임)
const ALPHA_FLOOR     = 20;
const TRIM_PAD        = 12;
const DOWNSCALE       = 0.5;

function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v };
}

async function processFile({ lang, type, in: inputName }) {
  const inputPath = path.join(INPUT_DIR, inputName);
  console.log(`\n처리: ${inputName} → ${lang}_${type}.png`);

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  console.log(`  입력: ${w} × ${h}`);

  // === 1단계: 색 콘텐츠 마스크 (S > 0.15) ===
  const contentMask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const { s } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    if (s > CONTENT_S_MIN) contentMask[p] = 1;
  }
  let contentCount = 0;
  for (const v of contentMask) if (v) contentCount++;
  console.log(`  색 콘텐츠 픽셀: ${contentCount} (${(contentCount*100/(w*h)).toFixed(1)}%)`);

  // 이미지 사이즈에 비례한 보호 영역
  const PROTECT_PX = Math.max(PROTECT_MIN, Math.round(Math.min(w, h) * PROTECT_RATIO));
  const MAX_DIST   = PROTECT_PX + FEATHER_PX;
  console.log(`  PROTECT=${PROTECT_PX}px FEATHER=${FEATHER_PX}px (이미지 사이즈 비례)`);

  // === 2단계: distance map (색 콘텐츠 → 거리) ===
  const dist = new Int32Array(w * h).fill(-1);
  const queue = [];
  for (let p = 0; p < w * h; p++) {
    if (contentMask[p]) { dist[p] = 0; queue.push(p); }
  }
  let qhead = 0;
  while (qhead < queue.length) {
    const p = queue[qhead++];
    const d = dist[p];
    if (d >= MAX_DIST) continue;
    const x = p % w;
    const y = (p - x) / w;
    if (x + 1 < w)  { const np = p + 1; if (dist[np] === -1) { dist[np] = d + 1; queue.push(np); } }
    if (x - 1 >= 0) { const np = p - 1; if (dist[np] === -1) { dist[np] = d + 1; queue.push(np); } }
    if (y + 1 < h)  { const np = p + w; if (dist[np] === -1) { dist[np] = d + 1; queue.push(np); } }
    if (y - 1 >= 0) { const np = p - w; if (dist[np] === -1) { dist[np] = d + 1; queue.push(np); } }
  }

  // === 3단계: 외부 flood fill (가장자리에서 흰 픽셀 추적, 보호 영역 통과 못함) ===
  //   이게 핵심 — 보호 영역 안의 흰 외곽선은 살리고, 외부 흰 배경만 정확히 마킹
  const bgMask = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0); stack.push(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { stack.push(0, y); stack.push(w - 1, y); }
  while (stack.length) {
    const ys = stack.pop();
    const xs = stack.pop();
    if (xs < 0 || ys < 0 || xs >= w || ys >= h) continue;
    const p = ys * w + xs;
    if (visited[p]) continue;
    visited[p] = 1;

    const i = p * 4;
    const { s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const isWhite = (v >= WHITE_V_MIN && s <= WHITE_S_MAX);
    if (!isWhite) continue;                                  // 색 콘텐츠 — 멈춤
    if (dist[p] !== -1 && dist[p] <= PROTECT_PX) continue;   // 보호 영역(외곽선) — 통과 못함

    bgMask[p] = 1;
    stack.push(xs + 1, ys); stack.push(xs - 1, ys);
    stack.push(xs, ys + 1); stack.push(xs, ys - 1);
  }

  // === 4단계: 알파 결정 ===
  let countFull = 0, countFeather = 0, countDrop = 0, countIsland = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const { s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const isWhite = (v >= WHITE_V_MIN && s <= WHITE_S_MAX);
    const d = dist[p];

    if (bgMask[p]) {
      data[i + 3] = 0;       // 외부 흰 배경 (flood fill로 확실히 마킹)
      countDrop++;
    } else if (!isWhite) {
      data[i + 3] = 255;     // 색 콘텐츠
      countFull++;
    } else if (d !== -1 && d <= PROTECT_PX) {
      data[i + 3] = 255;     // 흰 외곽선 (보호 영역)
      countFull++;
    } else if (d !== -1 && d <= MAX_DIST) {
      // 페더링 — 외곽선 너머 부드러운 가장자리
      const t = (d - PROTECT_PX) / FEATHER_PX;
      data[i + 3] = Math.round(255 * (1 - t));
      countFeather++;
    } else {
      // 흰색 + flood fill 미도달 + 거리 너머 — 콘텐츠로 격리된 흰 영역 (안전 보존)
      data[i + 3] = 255;
      countIsland++;
    }
  }
  const total = w * h;
  console.log(`  alpha 255: ${(countFull*100/total).toFixed(1)}%, feather: ${(countFeather*100/total).toFixed(1)}%, island: ${(countIsland*100/total).toFixed(1)}%, dropped: ${(countDrop*100/total).toFixed(1)}%`);

  // === 5단계: 잔여 박멸 ===
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < ALPHA_FLOOR) data[i] = 0;
  }

  // === 6단계: trim ===
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
  if (minX > maxX || minY > maxY) throw new Error('콘텐츠 비어있음 — 임계값 너무 강함');
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`  trim: ${cw} × ${ch}`);

  // === 7단계: 다운스케일 + 패딩 ===
  const finalW = Math.round(cw * DOWNSCALE);
  const finalH = Math.round(ch * DOWNSCALE);
  const out = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(finalW, finalH, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: TRIM_PAD, bottom: TRIM_PAD, left: TRIM_PAD, right: TRIM_PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const outputPath = path.join(OUTPUT_DIR, `${lang}_${type}.png`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, out);

  const outMeta = await sharp(outputPath).metadata();
  console.log(`  저장: ${lang}_${type}.png (${outMeta.width} × ${outMeta.height})`);
}

async function run() {
  console.log(`입력 폴더: ${INPUT_DIR}`);
  console.log(`출력 폴더: ${OUTPUT_DIR}`);

  for (const file of FILES) {
    await processFile(file);
  }
  console.log(`\n✅ 8개 파일 모두 완료`);
}

run().catch(e => {
  console.error('❌ 실패:', e);
  process.exit(1);
});
