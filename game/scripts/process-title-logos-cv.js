/**
 * 타이틀 로고 누끼 — 사용자 Python(OpenCV) 코드 JS 포팅
 *
 * 알고리즘:
 *   1. HSV 변환 → 배경 후보 마스크 = (S < 35/255 AND V > 210/255)
 *   2. 가장자리 8 seed에서 flood fill — 가장자리와 연결된 배경만 마킹
 *      (콘텐츠 내부 흰 영역은 도달 안 됨 → 보존)
 *   3. remove_mask에 Gaussian blur (3x3, sigma~0.85) — 가장자리 부드럽게
 *   4. 알파 적용:
 *      - removeVal > 180 → alpha 0 (확실 배경)
 *      - 20 < removeVal ≤ 180 → 반투명 (alpha = min(255 - removeVal, alpha))
 *      - removeVal ≤ 20 → 알파 유지 (콘텐츠)
 *
 * 매핑 (사용자 피드백):
 *   full = no_fulltitle_3x (인트로용)  — ko는 새 PNG 사용 (raw/title_ko_full_new.png)
 *   sub  = no_subtitle_3x  (로비용)
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
  { lang: 'ko', type: 'full', in: NEW_KO_FULL, fromRaw: true },     // 사용자 새 디자인
  { lang: 'ja', type: 'full', in: 'rainbow_logo_ja_no_shadow_no_fulltitle_3x.png' },
  { lang: 'en', type: 'full', in: 'rainbow_logo_en_no_shadow_no_fulltitle_3x.png' },
  { lang: 'tw', type: 'full', in: 'rainbow_logo_tw_no_shadow_no_fulltitle_3x.png' },
  { lang: 'ko', type: 'sub',  in: 'rainbow_logo_ko_no_shadow_no_subtitle_3x.png' },
  { lang: 'ja', type: 'sub',  in: 'rainbow_logo_ja_no_shadow_no_subtitle_3x.png' },
  { lang: 'en', type: 'sub',  in: 'rainbow_logo_en_no_shadow_no_subtitle_3x.png' },
  { lang: 'tw', type: 'sub',  in: 'rainbow_logo_tw_no_shadow_no_subtitle_3x.png' },
];

// ── 사용자 Python 임계값 그대로 ──
const S_MAX = 35 / 255;     // 0.137 — 무채색 (회색 모자이크)
const V_MIN = 210 / 255;    // 0.82  — 밝은 영역
const BLUR_SIGMA = 0.85;    // Gaussian 3x3 시그마
const TRIM_PAD = 12;
const DOWNSCALE = { full: 1.0, sub: 0.5 };

function rgbToSV(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v: max / 255 };
}

async function processFile({ lang, type, in: input, fromRaw }) {
  const inputPath = fromRaw ? input : path.join(INPUT_DIR, input);
  const inputName = path.basename(inputPath);
  console.log(`\n처리: ${inputName} → ${lang}_${type}.png`);

  // 1. 원본 그대로 로드 (RGB 변형 X)
  const { data: raw, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const data = Buffer.from(raw);
  console.log(`  입력: ${w}×${h}`);

  // 2. 배경 후보 마스크 (S < 0.137, V > 0.82)
  const bgCandidate = new Uint8Array(w * h);
  let candidateCount = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const { s, v } = rgbToSV(data[i], data[i + 1], data[i + 2]);
    if (s < S_MAX && v > V_MIN) {
      bgCandidate[p] = 255;
      candidateCount++;
    }
  }
  console.log(`  배경 후보: ${candidateCount} (${(candidateCount * 100 / (w*h)).toFixed(1)}%)`);

  // 3. 가장자리 모든 픽셀에서 flood fill (8 seed보다 안전)
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
  let removeCount = 0;
  for (const v of removeMask) if (v) removeCount++;
  console.log(`  flood fill 마킹: ${removeCount} (${(removeCount * 100 / (w*h)).toFixed(1)}%)`);

  // 4. Gaussian blur on removeMask (가장자리 부드럽게)
  const maskBuf = Buffer.from(removeMask);
  const blurredBuf = await sharp(maskBuf, { raw: { width: w, height: h, channels: 1 } })
    .blur(BLUR_SIGMA)
    .raw()
    .toBuffer();

  // 5. 알파 적용 (Python: alpha = where(remove>180, 0, alpha); soft_edge: alpha = min(255-remove, alpha))
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
  console.log(`  α=0 제거: ${countAlpha0} (${(countAlpha0*100/(w*h)).toFixed(1)}%), 반투명: ${countSoft} (${(countSoft*100/(w*h)).toFixed(1)}%)`);

  // 6. trim
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
  if (minX > maxX) throw new Error('콘텐츠 비어있음');
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`  trim: ${cw}×${ch}`);

  // 7. 다운스케일 + 패딩 + 저장
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
  console.log(`알고리즘: 사용자 Python 포팅 — S<${S_MAX.toFixed(3)}, V>${V_MIN.toFixed(3)} + Gaussian blur(σ=${BLUR_SIGMA})`);
  const start = Date.now();
  for (const file of FILES) await processFile(file);
  console.log(`\n✅ 8개 완료 (${((Date.now() - start) / 1000).toFixed(1)}초)`);
}

run().catch(e => { console.error('❌', e); process.exit(1); });
