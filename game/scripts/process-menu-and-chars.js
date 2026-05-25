/**
 * 메인 메뉴 24장 + 캐릭터 얼굴샷 7장 통합 누끼 처리
 *
 * 알고리즘: 검정 배경 V<30 flood fill + 콘텐츠 가장자리 페더링
 *   - 메뉴 PNG: public/main_menu/{lang}/{type}.png  (24장)
 *   - 캐릭터:   public/characters_dex/{name}.png   (7장)
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', '..', 'assets');
const PUBLIC = path.join(__dirname, '..', 'public');

const V_BG = 30;
const V_FEATHER = 70;
const TRIM_PAD = 12;

// === 메뉴 매핑 (시각 식별 결과) ===
const MENU_FILES = [
  // 한국어
  { lang: 'ko', type: 'story',  in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_43_39 (2).png' },
  { lang: 'ko', type: 'dex',    in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_46_29 (4).png' },
  { lang: 'ko', type: 'sketch', in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_52_17 (1).png' },
  { lang: 'ko', type: 'catch',  in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_52_17 (2).png' },
  { lang: 'ko', type: 'memory', in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_52_17 (3).png' },
  { lang: 'ko', type: 'rps',    in: 'ko/ChatGPT Image 2026년 5월 16일 오전 12_52_18 (4).png' },
  // 일본어 (폴더는 'jo'지만 출력은 'ja')
  { lang: 'ja', type: 'story',  in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_43_40 (4).png' },
  { lang: 'ja', type: 'dex',    in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_46_29 (2).png' },
  { lang: 'ja', type: 'memory', in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_54_55 (1).png' },
  { lang: 'ja', type: 'rps',    in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_54_55 (2).png' },
  { lang: 'ja', type: 'sketch', in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_54_55 (3).png' },
  { lang: 'ja', type: 'catch',  in: 'jo/ChatGPT Image 2026년 5월 16일 오전 12_54_55 (4).png' },
  // 영어
  { lang: 'en', type: 'story',  in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_43_39 (3).png' },
  { lang: 'en', type: 'dex',    in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_46_29 (1).png' },
  { lang: 'en', type: 'memory', in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_57_06 (1).png' },
  { lang: 'en', type: 'rps',    in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_57_06 (2).png' },
  { lang: 'en', type: 'sketch', in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_57_07 (3).png' },
  { lang: 'en', type: 'catch',  in: 'en/ChatGPT Image 2026년 5월 16일 오전 12_57_07 (4).png' },
  // 대만 (zh-TW)
  { lang: 'tw', type: 'story',  in: 'tw/ChatGPT Image 2026년 5월 16일 오전 12_43_39 (1).png' },
  { lang: 'tw', type: 'dex',    in: 'tw/ChatGPT Image 2026년 5월 16일 오전 12_46_29 (3).png' },
  { lang: 'tw', type: 'memory', in: 'tw/ChatGPT Image 2026년 5월 16일 오전 01_00_00 (1).png' },
  { lang: 'tw', type: 'rps',    in: 'tw/ChatGPT Image 2026년 5월 16일 오전 01_00_01 (2).png' },
  { lang: 'tw', type: 'sketch', in: 'tw/ChatGPT Image 2026년 5월 16일 오전 01_00_01 (3).png' },
  { lang: 'tw', type: 'catch',  in: 'tw/ChatGPT Image 2026년 5월 16일 오전 01_00_01 (4).png' },
];

// === 캐릭터 매핑 ===
const CHAR_FILES = [
  { name: 'raccoon',  in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_44 (1).png' },
  { name: 'toseumi',  in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_44 (2).png' },
  { name: 'bat',      in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_44 (3).png' },
  { name: 'alien',    in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_44 (4).png' },
  { name: 'skunk',    in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_44 (5).png' },
  { name: 'fox',      in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_45 (6).png' },
  { name: 'blackchi', in: 'ChatGPT Image 2026년 5월 16일 오전 12_24_46 (7).png' },
];

async function fillProcess(inputPath, outputPath, downscale = 1.0) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

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
    if (Math.max(data[i], data[i + 1], data[i + 2]) > V_BG) continue;
    externalBg[p] = 1;
    stack.push(xs + 1, ys); stack.push(xs - 1, ys);
    stack.push(xs, ys + 1); stack.push(xs, ys - 1);
  }

  // 알파 + 페더링
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (externalBg[p]) { data[i + 3] = 0; continue; }
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    if (max < V_FEATHER) {
      const x = p % w;
      const y = (p - x) / w;
      let nExt = false;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (externalBg[ny * w + nx]) { nExt = true; break; }
      }
      if (nExt) {
        data[i + 3] = Math.round(255 * (max - V_BG) / (V_FEATHER - V_BG));
        continue;
      }
    }
    data[i + 3] = 255;
  }

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
  if (minX > maxX) throw new Error('비어있음: ' + inputPath);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const fw = Math.max(1, Math.round(cw * downscale));
  const fh = Math.max(1, Math.round(ch * downscale));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .resize(fw, fh, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: TRIM_PAD, bottom: TRIM_PAD, left: TRIM_PAD, right: TRIM_PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const m = await sharp(outputPath).metadata();
  return { w: m.width, h: m.height, cw, ch };
}

async function run() {
  console.log('=== 메뉴 24장 처리 ===');
  for (const file of MENU_FILES) {
    const inputPath = path.join(ASSETS, 'main_menu', '빌드반영', file.in);
    const outputPath = path.join(PUBLIC, 'main_menu', file.lang, `${file.type}.png`);
    try {
      const r = await fillProcess(inputPath, outputPath, 0.5);
      console.log(`  ✓ ${file.lang}/${file.type}.png (${r.w}×${r.h})`);
    } catch (e) {
      console.error(`  ✗ ${file.lang}/${file.type}:`, e.message);
    }
  }

  console.log('\n=== 캐릭터 7장 처리 ===');
  for (const file of CHAR_FILES) {
    const inputPath = path.join(ASSETS, '캐릭터_얼굴샷', file.in);
    const outputPath = path.join(PUBLIC, 'characters_dex', `${file.name}.png`);
    try {
      const r = await fillProcess(inputPath, outputPath, 0.5);
      console.log(`  ✓ ${file.name}.png (${r.w}×${r.h})`);
    } catch (e) {
      console.error(`  ✗ ${file.name}:`, e.message);
    }
  }

  console.log('\n✅ 31장 모두 완료');
}

run().catch(e => { console.error('❌', e); process.exit(1); });
