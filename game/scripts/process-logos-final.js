/**
 * 타이틀 로고 최종 처리 (검정 배경 V<30 flood fill)
 *
 * 입력 폴더: ../assets/logo/
 * 입력 파일: logo_{lang}_{type}.png  (lang: ko|ja|en|tw, type: full|title)
 *           (char 타입은 보관 — 빌드 반영 안 함)
 *
 * 출력 폴더: public/title_logos/
 * 출력 파일:
 *   - {lang}_full.png  (인트로용, BootScene title-full 텍스처)
 *   - {lang}_sub.png   (로비 좌상단용, MainScene title-sub 텍스처)
 *
 * 알고리즘: 가장자리 flood fill (V <= 30 따라가며) + 가장자리 페더링
 *   검정 배경(V≤30)과 콘텐츠(V≥180)가 명확히 분리되어 단순/정확
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', 'logo');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'title_logos');

const LANGS = ['ko', 'ja', 'en', 'tw'];
// 빌드 반영: full + title (title은 출력 파일명 sub)
const BUILD_TYPES = [
  { srcType: 'full',  dstSuffix: 'full', downscale: 1.0 },
  { srcType: 'title', dstSuffix: 'sub',  downscale: 0.5 },
];

const V_BG_THRESHOLD = 30;
const V_FEATHER_END = 70;
const TRIM_PAD = 12;

async function processFile(lang, { srcType, dstSuffix, downscale }) {
  const inputPath = path.join(INPUT_DIR, `logo_${lang}_${srcType}.png`);
  const outputPath = path.join(OUTPUT_DIR, `${lang}_${dstSuffix}.png`);
  console.log(`\n처리: logo_${lang}_${srcType}.png → ${lang}_${dstSuffix}.png`);

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  console.log(`  입력: ${w}×${h}`);

  // 가장자리 flood fill (V <= 30)
  const externalBg = new Uint8Array(w * h);
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
    if (Math.max(data[i], data[i + 1], data[i + 2]) > V_BG_THRESHOLD) continue;
    externalBg[p] = 1;
    stack.push(xs + 1, ys); stack.push(xs - 1, ys);
    stack.push(xs, ys + 1); stack.push(xs, ys - 1);
  }

  // 알파 + 페더링 (콘텐츠 가장자리 anti-aliasing)
  let countAlpha0 = 0, countFeather = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (externalBg[p]) {
      data[i + 3] = 0;
      countAlpha0++;
      continue;
    }
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    if (max < V_FEATHER_END) {
      const x = p % w;
      const y = (p - x) / w;
      let neighborExt = false;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (externalBg[ny * w + nx]) { neighborExt = true; break; }
      }
      if (neighborExt) {
        data[i + 3] = Math.round(255 * (max - V_BG_THRESHOLD) / (V_FEATHER_END - V_BG_THRESHOLD));
        countFeather++;
        continue;
      }
    }
    data[i + 3] = 255;
  }
  console.log(`  α=0: ${(countAlpha0*100/(w*h)).toFixed(1)}%, 페더: ${(countFeather*100/(w*h)).toFixed(2)}%`);

  // trim
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) throw new Error('비어있음');
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`  trim: ${cw}×${ch}`);

  // 다운스케일 + 패딩 + 저장
  const finalW = Math.max(1, Math.round(cw * downscale));
  const finalH = Math.max(1, Math.round(ch * downscale));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(finalW, finalH, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: TRIM_PAD, bottom: TRIM_PAD, left: TRIM_PAD, right: TRIM_PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const m = await sharp(outputPath).metadata();
  console.log(`  저장: ${m.width}×${m.height}`);
}

async function run() {
  console.log(`입력: ${INPUT_DIR}`);
  console.log(`출력: ${OUTPUT_DIR}`);
  console.log(`매핑: logo_{lang}_full → {lang}_full, logo_{lang}_title → {lang}_sub`);

  const start = Date.now();
  for (const lang of LANGS) {
    for (const type of BUILD_TYPES) {
      await processFile(lang, type);
    }
  }
  console.log(`\n✅ 8개 (4언어 × 2타입) 완료 (${((Date.now() - start) / 1000).toFixed(1)}초)`);
}

run().catch(e => {
  console.error('❌ 실패:', e);
  process.exit(1);
});
