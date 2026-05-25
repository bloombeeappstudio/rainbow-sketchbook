/**
 * 타이틀 로고 정밀 누끼 (사용자 피드백 반영)
 *
 * 핵심 가설 (픽셀 분석으로 검증):
 *   외부 회색 모자이크 = V ≤ 254 AND S < 0.05 (살짝 회색기 있는 흰색)
 *   콘텐츠 (외곽선 + 내부 흰색) = V = 255 OR S ≥ 0.05
 *
 * AI 모델은 흰 영역을 배경으로 잘못 분류하니 → 색 기반 정밀 알고리즘 복귀
 * 원본 RGB는 그대로, 알파 채널만 추가
 *
 * 알고리즘:
 *   1. 외부 후보 마스크 = (V ≤ 254 AND S < 0.05)
 *   2. 가장자리부터 flood fill (외부 후보만 따라가며)
 *   3. flood fill 마킹된 픽셀 → 알파 0
 *   4. 나머지 (콘텐츠 + 흰 외곽선 + 내부 흰 영역) → 알파 255
 *   5. 페더링: 외부와 콘텐츠 경계에서 1~2px 그라디언트 (anti-aliasing)
 *   6. trim + 다운스케일 (type별)
 *
 * 매핑 (사용자 피드백):
 *   full = no_fulltitle_3x (부제 박스 포함 풀 디자인, 인트로용)
 *   sub  = no_subtitle_3x  (텍스트 중심 단순, 로비용)
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '타이틀_로고');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'title_logos');

// 새 ko fulltitle 파일 (사용자가 별도로 다운로드한 깔끔한 디자인)
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

// ── 임계값 ──
const SAT_MAX_FOR_EXTERNAL = 0.05;   // S < 0.05 = 무채색
const V_MIN_FOR_EXTERNAL   = 240;    // V >= 240 = "밝은 회색" (어두운 콘텐츠 제외)
const V_MAX_FOR_EXTERNAL   = 254;    // V <= 254 = "정확히 255 흰색 아님"
                                     // 외곽선/콘텐츠 내부 흰색 = V = 255 (보존)
const TRIM_PAD = 12;
const DOWNSCALE = { full: 1.0, sub: 0.5 };

function rgbToSV(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v: max };
}

async function processFile({ lang, type, in: input, fromRaw }) {
  const inputPath = fromRaw ? input : path.join(INPUT_DIR, input);
  const inputName = path.basename(inputPath);
  console.log(`\n처리: ${inputName} → ${lang}_${type}.png`);

  // 1. 원본 그대로 로드 (RGB 변형 절대 X)
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  console.log(`  입력: ${w} × ${h}`);

  // 2. 외부 후보 마스크 = 240 ≤ V ≤ 254 AND S < 0.05 (회색 모자이크 V 범위)
  const externalCandidate = new Uint8Array(w * h);
  let candidateCount = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const { s, v } = rgbToSV(data[i], data[i + 1], data[i + 2]);
    if (v >= V_MIN_FOR_EXTERNAL && v <= V_MAX_FOR_EXTERNAL && s < SAT_MAX_FOR_EXTERNAL) {
      externalCandidate[p] = 1;
      candidateCount++;
    }
  }
  console.log(`  외부 후보 (V 240~254, S<0.05): ${candidateCount} (${(candidateCount*100/(w*h)).toFixed(1)}%)`);

  // 3. 가장자리부터 flood fill (외부 후보만 따라가며)
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
    if (!externalCandidate[p]) continue;     // 콘텐츠 만남 → 멈춤

    externalBg[p] = 1;
    stack.push(xs + 1, ys);
    stack.push(xs - 1, ys);
    stack.push(xs, ys + 1);
    stack.push(xs, ys - 1);
  }

  let externalCount = 0;
  for (const v of externalBg) if (v) externalCount++;
  console.log(`  외부 배경 마킹: ${externalCount} (${(externalCount*100/(w*h)).toFixed(1)}%)`);

  // 4. 페더링: 외부 가장자리 인접 콘텐츠 (V≤254 + 인접 외부) → 알파 점진 그라디언트
  //    이건 외곽선이 화면에서 부드럽게 보이게 함 (anti-aliasing)
  //    가장 단순: 외부 인접 콘텐츠 픽셀의 알파를 V 값에 따라 매핑
  //    V=255 → alpha=255, V=254 → alpha=210, V=250 → alpha=128, V<246 → alpha=0
  //
  //    여기선 단순화: 외부 = 0, 콘텐츠 = 255 (binary). 다운스케일이 자동 페더링 효과 제공
  for (let p = 0; p < w * h; p++) {
    data[p * 4 + 3] = externalBg[p] ? 0 : 255;
  }

  // 4-2. 2차 처리: 콘텐츠 안에 격리된 회색 모자이크도 제거
  //      (글자 'ㅇ' 안 빈 공간 같은 곳 — flood fill 안 닿음)
  //      위치 무관하게 V 240~254 + S<0.05 + 알파>0 → 알파 0
  let pass2Removed = 0;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (data[i + 3] === 0) continue;
    const { s, v } = rgbToSV(data[i], data[i + 1], data[i + 2]);
    if (v >= V_MIN_FOR_EXTERNAL && v <= V_MAX_FOR_EXTERNAL && s < SAT_MAX_FOR_EXTERNAL) {
      data[i + 3] = 0;
      pass2Removed++;
    }
  }
  console.log(`  2차 제거 (격리된 회색): ${pass2Removed} (${(pass2Removed*100/(w*h)).toFixed(2)}%)`);

  // 5. trim
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
  if (minX > maxX) throw new Error('콘텐츠 비어있음');
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(`  trim: ${cw} × ${ch}`);

  // 6. 다운스케일 + 패딩 + 저장
  const ds = DOWNSCALE[type];
  const finalW = Math.max(1, Math.round(cw * ds));
  const finalH = Math.max(1, Math.round(ch * ds));

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
  console.log(`입력: ${INPUT_DIR}`);
  console.log(`출력: ${OUTPUT_DIR}`);
  console.log(`알고리즘: V<=254 AND S<0.05 = 외부, flood fill, 콘텐츠 RGB 그대로`);

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
