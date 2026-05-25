/**
 * 토슴이 캐릭터 7장 누끼 처리 (검정 배경 V<30 flood fill)
 *
 * 매핑: 1 PNG → 여러 기존 키 (씬별 사용처)
 *   기존 file_path 유지 → 코드 수정 없이 자동 반영
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '토슴이', '빌드반영');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'characters');

// 새 PNG → 기존 텍스처 파일 매핑
const MAPPINGS = [
  {
    src: 'ChatGPT Image 2026년 5월 15일 오후 11_59_21 (1).png',
    dst: ['toseumi-sad.png', 'toseumi-sad2.png'],
    pose: '슬픔 (합장)',
  },
  {
    src: 'ChatGPT Image 2026년 5월 15일 오후 11_59_21 (2).png',
    dst: ['toseumi-fun.png', 'toseumi-happy.png'],
    pose: '기쁨 (별 펑펑)',
  },
  {
    src: 'ChatGPT Image 2026년 5월 15일 오후 11_59_21 (3).png',
    dst: ['toseumi-default.png'],
    pose: '기본 서있는',
  },
  {
    src: 'ChatGPT Image 2026년 5월 15일 오후 11_59_21 (4).png',
    dst: ['toseumi-face.png'],
    pose: '얼굴+무지개 망토',
  },
  {
    src: 'ChatGPT Image 2026년 5월 15일 오후 11_59_22 (6).png',
    dst: ['toseumi-basket.png', 'toseumi-basket2.png'],
    pose: '바구니 (스타캐치)',
  },
  {
    src: 'ChatGPT Image 2026년 5월 16일 오전 12_01_11 (1).png',
    dst: ['toseumi-greet.png', 'toseumi-wave.png', 'toseumi-wave-alt.png'],
    pose: '인사 (손 흔들기)',
  },
  {
    src: 'ChatGPT Image 2026년 5월 16일 오전 12_01_12 (2).png',
    dst: ['toseumi-hero.png', 'toseumi-cape.png'],
    pose: '전신 무지개 망토 (영웅)',
  },
];

const V_BG = 30;
const V_FEATHER = 70;
const TRIM_PAD = 16;

async function processPng(inputPath) {
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
  if (minX > maxX) throw new Error('비어있음');
  const cw = maxX - minX + 1, ch = maxY - minY + 1;

  return await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .extend({
      top: TRIM_PAD, bottom: TRIM_PAD, left: TRIM_PAD, right: TRIM_PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function run() {
  console.log('=== 토슴이 7장 처리 ===\n');
  const start = Date.now();

  for (const m of MAPPINGS) {
    const inputPath = path.join(INPUT_DIR, m.src);
    try {
      const buf = await processPng(inputPath);
      // 매핑된 모든 파일에 저장 (같은 PNG 여러 키에 복사)
      for (const dstName of m.dst) {
        const outputPath = path.join(OUTPUT_DIR, dstName);
        await fs.writeFile(outputPath, buf);
      }
      const meta = await sharp(path.join(OUTPUT_DIR, m.dst[0])).metadata();
      console.log(`✓ ${m.pose}`);
      console.log(`  → ${m.dst.join(', ')}  (${meta.width}×${meta.height})`);
    } catch (e) {
      console.error(`✗ ${m.pose}:`, e.message);
    }
  }

  console.log(`\n✅ 완료 (${((Date.now() - start) / 1000).toFixed(1)}초)`);
}

run().catch(e => { console.error('❌', e); process.exit(1); });
