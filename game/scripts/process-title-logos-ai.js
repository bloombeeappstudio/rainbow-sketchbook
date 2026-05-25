/**
 * 타이틀 로고 AI 누끼 + 구멍 메우기 (hole filling)
 *
 * 핵심 문제: AI 모델이 흰 토끼 얼굴/텍스트 내부 흰 영역을 "배경"으로 잘못 분류
 *           → 흰 영역만 사라지고 캐릭터가 훼손됨
 *
 * 해결책: AI 알파 마스크에 후처리
 *   1) AI 결과의 알파 마스크에서 가장자리부터 flood fill (alpha < 50)
 *   2) flood fill로 마킹된 영역 = 진짜 외부 배경
 *   3) flood fill에 안 잡힌 알파 0 영역 = "콘텐츠 안의 구멍" = 잘못 잡힌 흰 영역
 *   4) 그 구멍들을 알파 255로 채움 (원본 RGB 사용)
 *
 * 또 한 가지: 사용자 매핑
 *   - "fulltitle 로고" = 인트로용 = 부제 박스 포함된 풀 디자인 = no_fulltitle_3x.png
 *   - "subtitle 로고" = 로비용 = 텍스트 중심 단순 디자인 = no_subtitle_3x.png
 *
 * 사용법: node scripts/process-title-logos-ai.js
 */
import { removeBackground } from '@imgly/background-removal-node';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '타이틀_로고');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'title_logos');

// ⚠ 매핑 수정 (사용자 피드백):
//   full = no_fulltitle_3x = 부제 박스 포함 풀 디자인 (인트로용)
//   sub  = no_subtitle_3x  = 텍스트 중심 단순 (로비 좌상단)
const FILES = [
  { lang: 'ko', type: 'full', in: 'rainbow_logo_ko_no_shadow_no_fulltitle_3x.png' },
  { lang: 'ja', type: 'full', in: 'rainbow_logo_ja_no_shadow_no_fulltitle_3x.png' },
  { lang: 'en', type: 'full', in: 'rainbow_logo_en_no_shadow_no_fulltitle_3x.png' },
  { lang: 'tw', type: 'full', in: 'rainbow_logo_tw_no_shadow_no_fulltitle_3x.png' },
  { lang: 'ko', type: 'sub',  in: 'rainbow_logo_ko_no_shadow_no_subtitle_3x.png' },
  { lang: 'ja', type: 'sub',  in: 'rainbow_logo_ja_no_shadow_no_subtitle_3x.png' },
  { lang: 'en', type: 'sub',  in: 'rainbow_logo_en_no_shadow_no_subtitle_3x.png' },
  { lang: 'tw', type: 'sub',  in: 'rainbow_logo_tw_no_shadow_no_subtitle_3x.png' },
];

const AI_ALPHA_THRESHOLD = 50;    // 알파 < 50 = 외부 후보
const TRIM_PAD = 12;
// type별 다운스케일 (sub 원본이 크니까 더 줄임)
const DOWNSCALE = { full: 1.0, sub: 0.5 };

async function processFile({ lang, type, in: inputName }) {
  const inputPath = path.join(INPUT_DIR, inputName);
  console.log(`\n처리: ${inputName} → ${lang}_${type}.png`);

  // === 1. AI 누끼 ===
  const inputBuffer = await fs.readFile(inputPath);
  const inputBlob = new Blob([inputBuffer], { type: 'image/png' });
  console.log(`  AI 누끼 진행...`);
  const resultBlob = await removeBackground(inputBlob, {
    model: 'medium',
    output: { format: 'image/png', quality: 1.0 },
  });
  const aiBuffer = Buffer.from(await resultBlob.arrayBuffer());

  // === 2. AI 결과 + 원본 raw 데이터 로드 ===
  const { data: aiData, info: aiInfo } = await sharp(aiBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = aiInfo.width;
  const h = aiInfo.height;

  // 원본 이미지를 AI 결과와 같은 크기로 리사이즈 (AI가 사이즈 안 바꿔야 정상이지만 안전 차원)
  const { data: origData } = await sharp(inputBuffer)
    .resize(w, h, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // === 3. 외부 flood fill (가장자리에서 alpha < threshold 따라가기) ===
  //   콘텐츠로 둘러쌓인 흰 영역은 도달 안 됨 → 구멍으로 분류
  console.log(`  외부 flood fill + hole filling ...`);
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

    const alpha = aiData[p * 4 + 3];
    if (alpha >= AI_ALPHA_THRESHOLD) continue;     // 콘텐츠 만남 → 멈춤

    externalBg[p] = 1;
    stack.push(xs + 1, ys); stack.push(xs - 1, ys);
    stack.push(xs, ys + 1); stack.push(xs, ys - 1);
  }

  let externalCount = 0, holeCount = 0;
  for (let p = 0; p < w * h; p++) {
    if (externalBg[p]) externalCount++;
    else if (aiData[p * 4 + 3] < AI_ALPHA_THRESHOLD) holeCount++;
  }
  console.log(`  외부 배경: ${externalCount} (${(externalCount*100/(w*h)).toFixed(1)}%), 구멍(잘못 잡힘): ${holeCount} (${(holeCount*100/(w*h)).toFixed(1)}%)`);

  // === 4. 알파 결정 + 원본 RGB 합성 ===
  //   외부 배경 → alpha 0 + RGB 무시
  //   콘텐츠 (구멍 포함) → alpha 255 + 원본 RGB
  //   콘텐츠 가장자리 (외부와 인접한 콘텐츠 + alpha < 255) → AI 알파 + 원본 RGB (페더링)
  const finalData = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (externalBg[p]) {
      finalData[i] = 0;
      finalData[i + 1] = 0;
      finalData[i + 2] = 0;
      finalData[i + 3] = 0;
    } else {
      // 콘텐츠 (구멍 포함) — 원본 RGB
      finalData[i]     = origData[i];
      finalData[i + 1] = origData[i + 1];
      finalData[i + 2] = origData[i + 2];

      const aiAlpha = aiData[i + 3];
      if (aiAlpha < AI_ALPHA_THRESHOLD) {
        // 구멍 (AI가 잘못 잡은 흰 영역) → 강제 255
        finalData[i + 3] = 255;
      } else {
        // 콘텐츠 본체 + 가장자리 페더 (AI 알파 그대로)
        finalData[i + 3] = aiAlpha;
      }
    }
  }

  // === 5. trim ===
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = finalData[(y * w + x) * 4 + 3];
      if (a > 0) {
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
  console.log(`  trim: ${cw} × ${ch} (원본 ${w} × ${h})`);

  // === 6. 다운스케일 (type별) + 패딩 + 저장 ===
  const ds = DOWNSCALE[type];
  const finalW = Math.max(1, Math.round(cw * ds));
  const finalH = Math.max(1, Math.round(ch * ds));

  const out = await sharp(finalData, { raw: { width: w, height: h, channels: 4 } })
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
  console.log(`입력: ${INPUT_DIR}`);
  console.log(`출력: ${OUTPUT_DIR}`);
  console.log(`모델: @imgly/background-removal-node (medium) + hole filling`);

  const startTime = Date.now();
  for (const file of FILES) {
    await processFile(file);
  }
  console.log(`\n✅ 8개 파일 완료 (총 ${((Date.now() - startTime)/1000).toFixed(1)}초)`);
}

run().catch(e => {
  console.error('❌ 실패:', e);
  process.exit(1);
});
