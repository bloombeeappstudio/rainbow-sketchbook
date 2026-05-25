// 한글 글리프 누락 검사
// 모든 .js 파일에서 한글 문자열 추출 → main.js의 KOREAN_GLYPHS와 비교 → 누락 글자 출력

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC_DIR = new URL('../src', import.meta.url).pathname.replace(/^\//, '');

// 모든 .js 파일 재귀 수집
function collectJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// main.js의 KOREAN_GLYPHS 추출
const mainJs = readFileSync(join(SRC_DIR, 'main.js'), 'utf-8');
const glyphMatch = mainJs.match(/const KOREAN_GLYPHS\s*=\s*([\s\S]*?);/);
if (!glyphMatch) {
  console.error('KOREAN_GLYPHS not found in main.js');
  process.exit(1);
}
// 문자열 리터럴(작은따옴표)에서 한글만 추출
const glyphsRaw = glyphMatch[1];
const currentGlyphs = new Set();
for (const ch of glyphsRaw) {
  if (/[가-힣]/.test(ch)) currentGlyphs.add(ch);
}
console.log(`현재 KOREAN_GLYPHS: ${currentGlyphs.size}자`);

// 모든 .js에서 한글 추출 (main.js는 KOREAN_GLYPHS 정의 + 주석만 있으므로 제외)
const allFiles = collectJsFiles(SRC_DIR).filter(f => !f.endsWith('main.js'));
const usedGlyphs = new Set();
const charToFiles = new Map();

for (const file of allFiles) {
  const content = readFileSync(file, 'utf-8');
  for (const ch of content) {
    if (/[가-힣]/.test(ch)) {
      usedGlyphs.add(ch);
      if (!charToFiles.has(ch)) charToFiles.set(ch, new Set());
      charToFiles.get(ch).add(file.replace(SRC_DIR, '').replace(/\\/g, '/'));
    }
  }
}
console.log(`전체 .js 파일에서 사용 한글: ${usedGlyphs.size}자`);

// 누락 글자
const missing = [...usedGlyphs].filter(ch => !currentGlyphs.has(ch)).sort();
console.log(`\n=== 누락 글자 (${missing.length}자) ===`);
if (missing.length === 0) {
  console.log('(없음)');
} else {
  console.log(missing.join(''));
  console.log('\n--- 각 누락 글자가 등장하는 파일 ---');
  for (const ch of missing) {
    const files = [...charToFiles.get(ch)].sort();
    console.log(`  ${ch}: ${files.join(', ')}`);
  }
}

// 사용 안 되는 글자 (현재 KOREAN_GLYPHS엔 있지만 어떤 파일에서도 안 씀)
const unused = [...currentGlyphs].filter(ch => !usedGlyphs.has(ch)).sort();
console.log(`\n=== 미사용 글자 (${unused.length}자, 참고용) ===`);
if (unused.length > 0) {
  console.log(unused.join(''));
}

// 전체 사용 한글 (정렬, 중복 X) — main.js KOREAN_GLYPHS 갱신용
console.log(`\n=== 전체 사용 한글 (${usedGlyphs.size}자, KOREAN_GLYPHS 갱신용) ===`);
const allSorted = [...usedGlyphs].sort().join('');
console.log(allSorted);
