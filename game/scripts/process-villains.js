/**
 * 우주악당 누끼 처리 (검정 배경 V≤30 flood fill)
 *
 * 입력: ../assets/우주악당/빌드반영/{name}-src.png
 * 출력: public/villains/{name}.png
 *
 * 매핑:
 *   skunk-normal, skunk-lose, alien-normal, alien-lose, bat-lose (5장)
 *   bat-normal은 기존 PNG 유지 (사용자가 5장만 새로 보냄)
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '우주악당', '빌드반영');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'villains');

const FILES = [
  'skunk-normal',
  'skunk-lose',
  'alien-normal',
  'alien-lose',
  'bat-lose',
];

const V_BG_THRESHOLD = 30;
const V_FEATHER_END = 70;
const TRIM_PAD = 16;
// 캐릭터는 다운스케일 X (게임 내 표시 사이즈에 맞게 setDisplaySize)

async function processFile(name) {
  const inputPath = path.join(INPUT_DIR, `${name}-src.png`);
  const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
  console.log(`\n처리: ${name}-src.png → ${name}.png`);

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

  // 알파 + 페더링
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

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
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

  const start = Date.now();
  for (const name of FILES) {
    await processFile(name);
  }
  console.log(`\n✅ 5장 완료 (${((Date.now() - start) / 1000).toFixed(1)}초)`);
  console.log(`⚠️ bat-normal은 기존 PNG 유지 (검정 배경 PNG 1장 누락)`);
}

run().catch(e => {
  console.error('❌ 실패:', e);
  process.exit(1);
});
