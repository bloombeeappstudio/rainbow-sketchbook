/**
 * 스케치북 허브 메뉴 PNG 8장 누끼 처리 (검정 배경 V≤30 flood fill)
 *
 * 입력: assets/스케치북/*.png (8장 = 4언어 × 2메뉴)
 * 출력: game/public/main_menu/{ko|ja|en|tw}/{coloring|drawing}.png
 *
 * 토슴이 누끼 스크립트(process-toseumi.js)와 동일 알고리즘.
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.join(__dirname, '..', '..', 'assets', '스케치북');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'main_menu');

// 사용자가 받은 PNG 파일명 → 어떤 언어/메뉴인지 매핑
// (사용자 확인: 8개 이미지 직접 보고 분류)
const MAPPINGS = [
  // 색칠놀이 (팔레트 + 크레용)
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_10_56 (1).png', locale: 'ko', name: 'coloring', label: '색칠놀이' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (3).png', locale: 'ja', name: 'coloring', label: 'ぬりえ' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (4).png', locale: 'en', name: 'coloring', label: 'Coloring' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (5).png', locale: 'tw', name: 'coloring', label: '塗色' },
  // 그림그리기 (연필 + 노트)
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_10_56 (2).png', locale: 'ko', name: 'drawing',  label: '그림그리기' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (6).png', locale: 'ja', name: 'drawing',  label: 'おえかき' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (1).png', locale: 'en', name: 'drawing',  label: 'Drawing' },
  { src: 'ChatGPT Image 2026년 5월 16일 오후 11_21_23 (2).png', locale: 'tw', name: 'drawing',  label: '畫畫' },
  // 내 작품 (갤러리) — 4언어 (사용자 파일명 'jo' = ja 오타 → 그대로 매핑)
  { src: '내작품_ko.png', locale: 'ko', name: 'gallery', label: '내 작품' },
  { src: '내작품_jo.png', locale: 'ja', name: 'gallery', label: '私の作品' },
  { src: '내작품_en.png', locale: 'en', name: 'gallery', label: 'My Works' },
  { src: '내작품_tw.png', locale: 'tw', name: 'gallery', label: '我的作品' },
];

// 검은 배경 누끼 임계값 — V(value) 채널 기준
const V_BG = 30;           // V ≤ 30 인 픽셀은 배경 (검정)
const V_FEATHER = 70;      // V 30~70 구간은 알파 그라데이션 (안티앨리어스 부드럽게)
const TRIM_PAD = 16;       // 트림 후 사방 패딩 (px)

async function processPng(inputPath, outputPath, label) {
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // 1단계: 가장자리 flood fill — 외부 검은 배경만 알파 0
  //   (내부의 검은 영역(예: 윤곽선)은 보존)
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

  // 2단계: 알파 적용 + 페더링
  //   externalBg 픽셀 → 알파 0
  //   콘텐츠 픽셀 중 V가 V_BG~V_FEATHER 사이 = 가장자리 안티앨리어스 → 부드러운 알파
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      if (externalBg[p]) {
        data[i + 3] = 0;
        continue;
      }
      const maxV = Math.max(data[i], data[i + 1], data[i + 2]);
      if (maxV <= V_BG) {
        data[i + 3] = 255;     // 내부의 검은 영역 (콘텐츠 일부) → 불투명
        continue;
      }
      if (maxV < V_FEATHER) {
        // 가장자리 그라데이션
        const t = (maxV - V_BG) / (V_FEATHER - V_BG);
        data[i + 3] = Math.round(255 * t);
      } else {
        data[i + 3] = 255;
      }
    }
  }

  // 3단계: 트림 (외부 빈 공간 제거)
  const trimmedBuffer = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
    .toBuffer();

  // 4단계: 패딩 (사방 TRIM_PAD)
  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  const paddedBuffer = await sharp(trimmedBuffer)
    .extend({
      top: TRIM_PAD,
      bottom: TRIM_PAD,
      left: TRIM_PAD,
      right: TRIM_PAD,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await fs.writeFile(outputPath, paddedBuffer);

  return {
    src: `${w}x${h}`,
    trimmed: `${trimmedMeta.width}x${trimmedMeta.height}`,
    final: `${trimmedMeta.width + TRIM_PAD * 2}x${trimmedMeta.height + TRIM_PAD * 2}`,
    sizeKB: (paddedBuffer.length / 1024).toFixed(0),
    label,
  };
}

(async () => {
  console.log('=== 스케치북 허브 메뉴 PNG 처리 (4 locale × 2 메뉴 = 8장) ===\n');
  console.log(`입력: ${INPUT_DIR}`);
  console.log(`출력: ${OUTPUT_DIR}\n`);

  let done = 0, failed = 0;
  for (const m of MAPPINGS) {
    const srcPath = path.join(INPUT_DIR, m.src);
    const dstDir = path.join(OUTPUT_DIR, m.locale);
    const dstPath = path.join(dstDir, `${m.name}.png`);

    await fs.mkdir(dstDir, { recursive: true });

    try {
      const r = await processPng(srcPath, dstPath, m.label);
      console.log(`  ✓ [${m.locale}/${m.name}] "${r.label}"  ${r.src} → ${r.final} (${r.sizeKB}KB)`);
      done++;
    } catch (e) {
      console.error(`  ✗ [${m.locale}/${m.name}] ${m.src} 실패:`, e.message);
      failed++;
    }
  }
  console.log(`\n=== 완료: ${done}개 처리, ${failed}개 실패 ===`);
})();
