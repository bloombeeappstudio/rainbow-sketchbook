// 🎨 디저트 + 숲속 도안 일괄 처리 (대표님 요청)
//   1) 원본 한글 ChatGPT 파일명 → 영문명으로 rename (assets/스케치북/도안/)
//   2) 누끼 처리 (가장자리 흰 픽셀 알파 0)
//   3) game/public/templates/dessert/, /forest/로 복사
//
//   매핑: 이미지 내용 기반 영문명 결정
//   무료: dessert FREE1~3 + 숲속 bear/rabbit/trex (대표님 선택)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_BASE = path.resolve(__dirname, '../../assets/스케치북/도안');
const PUBLIC_BASE = path.resolve(__dirname, '../public/templates');

// ===== 디저트 매핑 (원본 한글 → 영문) =====
const DESSERT_MAP = [
  ['FREE1.png',                                       'dessert_macaron_free.png'],
  ['FREE2.png',                                       'dessert_donut_free.png'],
  ['FREE3.png',                                       'dessert_pudding_free.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_25_13 (3).png', 'dessert_ice_cream.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_25_14 (5).png', 'dessert_strawberry_cake.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_25_15 (7).png', 'dessert_waffle.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_25_15 (8).png', 'dessert_popsicle.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_25_15 (9).png', 'dessert_swiss_roll.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_30_32 (7).png', 'dessert_milkshake.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_30_32 (8).png', 'dessert_lollipop.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_34_42.png',     'dessert_birthday_cake.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_48_59.png',     'dessert_yule_log.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_25 (1).png', 'dessert_coffee.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_25 (2).png', 'dessert_chocolate_balls.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_26 (3).png', 'dessert_teapot.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_26 (5).png', 'dessert_hamburger.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_27 (7).png', 'dessert_cupcake.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_56_27 (9).png', 'dessert_juice.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_58_34.png',     'dessert_fruit_tart.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 01_58_38.png',     'dessert_churros.png'],
];

// ===== 숲속 매핑 (대표님 선택: bear/rabbit/trex 무료) =====
const FOREST_MAP = [
  ['ChatGPT Image 2026년 5월 23일 오후 11_21_55.png',    'forest_brontosaurus.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_21_59.png',    'forest_pteranodon.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_24_43.png',    'forest_parasaurolophus.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_24_53.png',    'forest_triceratops.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_24_57.png',    'forest_dilophosaurus.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_25_07.png',    'forest_trex_free.png'],          // ⭐ 무료
  ['ChatGPT Image 2026년 5월 23일 오후 11_25_14.png',    'forest_baby_trex.png'],
  ['ChatGPT Image 2026년 5월 23일 오후 11_31_04.png',    'forest_parasaurolophus2.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_08_37.png',    'forest_pteranodon2.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_14_20.png',    'forest_dino_footprint.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_18_33.png',    'forest_dino_egg.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_18_39.png',    'forest_campfire_tent.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_21_46.png',    'forest_mushroom.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_29_44.png',    'forest_frog_pond.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_41_17.png',    'forest_owl.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_41_23.png',    'forest_bear_free.png'],          // ⭐ 무료
  ['ChatGPT Image 2026년 5월 24일 오전 12_42_23.png',    'forest_rabbit_free.png'],        // ⭐ 무료
  ['ChatGPT Image 2026년 5월 24일 오전 12_46_39.png',    'forest_beaver.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_46_47.png',    'forest_mouse.png'],
  ['ChatGPT Image 2026년 5월 24일 오전 12_48_06.png',    'forest_hedgehog.png'],
];

const WHITE_THRESHOLD = 235;

// 가장자리 flood-fill로 외곽 흰 픽셀만 알파 0 (일러스트 내부 흰 영역 보존)
async function processOne(srcPath, dstPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const stack = [];

  // 4 모서리에서 시작
  stack.push(0, 0);
  stack.push(width - 1, 0);
  stack.push(0, height - 1);
  stack.push(width - 1, height - 1);

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
    data[di + 3] = 0;     // 알파 0
    stack.push(x + 1, y);
    stack.push(x - 1, y);
    stack.push(x, y + 1);
    stack.push(x, y - 1);
  }

  await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 9 })
    .toFile(dstPath);
}

async function processCategory(categoryKr, categoryEn, map) {
  const srcDir = path.join(ASSETS_BASE, categoryKr);
  const dstDir = path.join(PUBLIC_BASE, categoryEn);
  if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });

  console.log(`\n=== ${categoryKr} → ${categoryEn} (${map.length}장) ===`);
  let ok = 0;
  let fail = 0;
  for (const [srcName, dstName] of map) {
    const srcPath = path.join(srcDir, srcName);
    const dstPathPublic = path.join(dstDir, dstName);
    const dstPathAssets = path.join(srcDir, dstName);     // 원본 폴더 영문 사본

    if (!fs.existsSync(srcPath)) {
      console.warn(`  [SKIP] ${srcName} (없음)`);
      fail++;
      continue;
    }
    try {
      // 1) 누끼 처리 → game/public/templates에 저장
      await processOne(srcPath, dstPathPublic);
      // 2) 원본 영문화 — assets 폴더에 영문 사본 (한글 원본은 추후 일괄 삭제 가능)
      fs.copyFileSync(srcPath, dstPathAssets);
      console.log(`  [OK] ${srcName.substring(0, 40)}... → ${dstName}`);
      ok++;
    } catch (e) {
      console.error(`  [ERROR] ${srcName}: ${e.message}`);
      fail++;
    }
  }
  console.log(`총 ${ok}장 성공 / ${fail}장 실패`);
}

(async () => {
  await processCategory('디저트', 'dessert', DESSERT_MAP);
  await processCategory('숲속',   'forest',  FOREST_MAP);
  console.log('\n✓ 완료');
})();
