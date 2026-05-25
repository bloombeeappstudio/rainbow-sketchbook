/**
 * 타이틀 로고 하이브리드 누끼 — 정밀 임계값 + Gaussian blur 페더링
 *
 * 사용자 Python 알고리즘 분석:
 *   - 임계값 V>0.82는 V=255 흰 영역까지 배경 후보로 분류 → 흰 영역 84% 손실
 *   - Gaussian blur + 반투명 알파는 가장자리 부드럽게 처리 ✅ (이 부분 채택)
 *
 * 결합:
 *   1. 정밀 임계값: V 240~254 AND S<0.05 (회색 모자이크만)
 *      → V=255 흰 외곽선/콘텐츠 완벽 보존
 *   2. 가장자리 flood fill
 *   3. 격리된 회색 영역 2차 제거
 *   4. Gaussian blur로 가장자리 페더링 (Python 코드 채택)
 *   5. 반투명 알파 처리
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '타이틀_로고');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'title_logos');
const NEW_KO_FULL = path.join(__dirname, '..', 'raw', 'title_ko_full_new.png');

const FILES = [
  { lang: 'ko', type: 'full', in: NEW_KO_FULL, fromRaw: true },
  { lang: 'ja', type: 'full', in: 'rainbow_logo_ja_no_shadow_no_fulltitle_3x.png' },
  { lang: 'en', type: 'full', in: 'rainbow_logo_en_no_shadow_no_fulltitle_3x.png' },
  { lang: 'tw', type: 'full', in: 'rainbow_logo_tw_no_shadow_no_fulltitle_3x.png' },
  { lang: 'ko', type: 'sub',  in: 'rainbow_logo_ko_no_shadow_no_subtitle_3x.png' },
  { lang: 'ja', type: 'sub',  in: 'rainbow_logo_ja_no_shadow_no_subtitle_3x.png' },
  { lang: 'en', type: 'sub',  in: 'rainbow_logo_en_no_shadow_no_subtitle_3x.png' },
  { lang: 'tw', type: 'sub',  in: 'rainbow_logo_tw_no_shadow_no_subtitle_3x.png' },
];

// ── 임계값 (정밀) ──
const S_MAX = 0.05;
const V_MIN = 240;        // V >= 240 (어두운 콘텐츠 제외)
const V_MAX = 254;        // V <= 254 (정확한 흰색 V=255 제외)
const BLUR_SIGMA = 0.85;  // Python 3x3 시그마 매칭
const TRIM_PAD = 12;
const DOWNSCALE = { full: 1.0, sub: 0.5 };

function rgbToSV(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { s: max === 0 ? 0 : (max - min) / max, v: max };
}

async function processFile({ lang, type, in: input, fromRaw }) {
  const inputPath = fromRaw ? input : path.join(INPUT_DIR, input);
  const inputName = path.basename(inputPath);
  console.log(`\n처리: ${inputName} → ${lang}_${type}.png`);

  // 1. 원본 그대로 로드
  const { data: raw, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const data = Buffer.from(raw);
  console.log(`  입력: ${w}×${h}`);

  // 2. 외부 후보 = 240 ≤ V ≤ 254 + S < 0.05 (정밀)
  const bgCandidate = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const { s, v } = rgbToSV(data[i], data[i + 1], data[i + 2]);
    if (v >= V_MIN && v <= V_MAX && s < S_MAX) bgCandidate[p] = 1;
  }

  // 3. 가장자리 flood fill
  const removeMask = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0); stack.push(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { stack.push(0, y); stack.push(w - 1, y); }
  while (stack.length) {
    const ys = stack.pop();
    const xs = stack.pop();
    if (xs < 0 || ys < 0 || xs >= w || ys >= h) continue;
    const p = ys * w + xs;
    if (removeMask[p]) continue;
    if (!bgCandidate[p]) continue;
    removeMask[p] = 255;
    stack.push(xs + 1, ys); stack.push(xs - 1, ys);
    stack.push(xs, ys + 1); stack.push(xs, ys - 1);
  }

  // 4. 2차 처리: 격리된 회색 영역도 마킹
  for (let p = 0; p < w * h; p++) {
    if (removeMask[p]) continue;
    if (bgCandidate[p]) removeMask[p] = 255;
  }

  // 5. Gaussian blur on removeMask (Python 채택)
  const blurredBuf = await sharp(Buffer.from(removeMask), {
    raw: { width: w, height: h, channels: 1 }
  }).blur(BLUR_SIGMA).raw().toBuffer();

  // 6. 알파 적용 (Python 채택 — 반투명 가장자리)
  let countAlpha0 = 0, countSoft = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const removeVal = blurredBuf[p];
    let alpha = data[i + 3];
    if (removeVal > 180) {
      alpha = 0;
      countAlpha0++;
    } else if (removeVal > 20) {
      alpha = Math.min(255 - removeVal, alpha);
      countSoft++;
    }
    data[i + 3] = alpha;
  }
  console.log(`  α=0: ${(countAlpha0*100/(w*h)).toFixed(1)}%, 반투명: ${(countSoft*100/(w*h)).toFixed(2)}%`);

  // 7. trim
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (minX > maxX) throw new Error('비어있음');
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  console.log(`  trim: ${cw}×${ch}`);

  // 8. 다운스케일 + 패딩 + 저장
  const ds = DOWNSCALE[type];
  const finalW = Math.max(1, Math.round(cw * ds));
  const finalH = Math.max(1, Math.round(ch * ds));

  const outputPath = path.join(OUTPUT_DIR, `${lang}_${type}.png`);
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

  const outMeta = await sharp(outputPath).metadata();
  console.log(`  저장: ${lang}_${type}.png (${outMeta.width}×${outMeta.height})`);
}

async function run() {
  console.log(`하이브리드: V 240~254 AND S<0.05 (정밀) + Gaussian blur σ=${BLUR_SIGMA} (페더링)`);
  const start = Date.now();
  for (const file of FILES) await processFile(file);
  console.log(`\n✅ 8개 완료 (${((Date.now() - start) / 1000).toFixed(1)}초)`);
}

run().catch(e => { console.error('❌', e); process.exit(1); });
