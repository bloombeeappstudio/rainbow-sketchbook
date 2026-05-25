// 🎨 메인 카드 PNG 누끼 처리 (투명배경 버전 4장)
//   - 가장자리에서 시작하는 flood-fill로 외곽 흰 픽셀만 알파 0 처리
//   - 일러스트 내부 흰 영역은 보존 (도안 안쪽, 캔버스 흰 배경 등)
//   - 출력: public/main_menu/menu-card-*.png (기존 컬러배경 버전 덮어쓰기)
const sharp = require('sharp');
const path  = require('path');

const SRC_DIR = path.resolve(__dirname, '../../assets/main_menu/NEW/투명배경');
const DST_DIR = path.resolve(__dirname, '../public/main_menu');

const TARGETS = [
  ['색칠놀이_배경투명.png',   'menu-card-coloring.png'],
  ['그림그리기_배경투명.png', 'menu-card-drawing.png'],
  ['내 작품_배경투명.png',    'menu-card-gallery.png'],
  ['스토리_배경투명.png',     'menu-card-story.png'],
];

const WHITE_THRESHOLD = 235;   // R/G/B 모두 이 값 이상이면 "흰색"으로 판정

async function processOne(srcName, dstName) {
  const src = path.join(SRC_DIR, srcName);
  const dst = path.join(DST_DIR, dstName);

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const stack = [];

  // 4개 모서리에서 flood-fill 시작
  stack.push(0, 0);
  stack.push(width - 1, 0);
  stack.push(0, height - 1);
  stack.push(width - 1, height - 1);

  let cleared = 0;
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;

    const di = idx * channels;
    const r = data[di], g = data[di + 1], b = data[di + 2];
    if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) continue;

    visited[idx] = 1;
    data[di + 3] = 0;   // 알파 0 (투명)
    cleared++;

    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(dst);
  const pct = ((cleared / (width * height)) * 100).toFixed(1);
  console.log(`✓ ${srcName} → ${dstName}  (${pct}% 픽셀 투명화)`);
}

(async () => {
  for (const [s, d] of TARGETS) {
    await processOne(s, d);
  }
  console.log('\n전체 누끼 처리 완료');
})();
