// 🪄 ML 기반 누끼 자동화 스크립트
// 사용: node remove-bg.mjs
// 게임 자산의 흰 배경을 머신러닝으로 깨끗하게 제거 + 같은 파일에 덮어쓰기

import { removeBackground } from '@imgly/background-removal-node';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'game', 'public');

// ⚠️ 토슴이는 절대 ML 처리하지 말 것!
// → ML이 캐릭터 일부를 배경으로 오인해서 몸통/얼굴까지 깎아냄 (투명인간 사태)
// → 토슴이는 BootScene의 floodFillTransparent로 외곽 흰색만 부드럽게 처리
// → 카드/배경/스토리 등 단순 배경 자산만 ML 사용

// 처리할 자산 목록 (토슴이 제외!)
const ASSETS = [
  // 카드 앞면 — 단순한 일러스트는 ML 안전
  // 'cards/card-01.png',  // 필요 시 활성화
];

async function processOne(relPath) {
  const fullPath = path.join(PUBLIC_DIR, relPath);
  try {
    await fs.access(fullPath);
  } catch {
    console.log(`  ⏭  스킵 (파일 없음): ${relPath}`);
    return false;
  }

  const t0 = Date.now();
  console.log(`🔄 처리 중: ${relPath} ...`);

  const buffer = await fs.readFile(fullPath);
  const blob = new Blob([buffer], { type: 'image/png' });

  const resultBlob = await removeBackground(blob);
  const resultArrayBuffer = await resultBlob.arrayBuffer();
  const resultBuffer = Buffer.from(resultArrayBuffer);

  await fs.writeFile(fullPath, resultBuffer);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✅ 완료 (${dt}s, ${(resultBuffer.length / 1024).toFixed(0)}KB): ${relPath}`);
  return true;
}

async function main() {
  console.log('🚀 ML 누끼 시작 — 첫 실행은 모델 다운로드(~50MB)로 1~2분 걸려요\n');
  const t0 = Date.now();
  let done = 0;
  let skipped = 0;

  for (const asset of ASSETS) {
    try {
      const ok = await processOne(asset);
      if (ok) done++;
      else skipped++;
    } catch (e) {
      console.error(`  ❌ 실패: ${asset}`, e.message);
      skipped++;
    }
  }

  const totalDt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n🎉 완료! ${done}개 처리, ${skipped}개 스킵 (총 ${totalDt}s)`);
}

main().catch(e => {
  console.error('💥 치명 오류:', e);
  process.exit(1);
});
