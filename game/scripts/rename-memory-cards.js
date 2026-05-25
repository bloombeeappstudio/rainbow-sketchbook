/**
 * 메모리 게임 카드 자산 리네임 + public/cards/로 복사
 *
 * 작업:
 *   1) assets/메모리 게임/ChatGPT*.png → memory_card_XX_name.png 로 리네임 (소스 폴더에서)
 *   2) 기존 memory_card_20_star_cookie.png → memory_card_18_star_cookie.png (순서 정리)
 *   3) 정리된 파일 전부 public/cards/ 로 복사 (게임 자산)
 *   4) card_back.png → public/cards/card-back.png 로 복사
 *
 * 사용: node scripts/rename-memory-cards.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', '..', 'assets', '메모리 게임');
const DST_DIR = path.join(__dirname, '..', 'public', 'cards');

// ChatGPT 파일 → 새 이름 매핑 (시각적으로 확인 후 작성)
const CHATGPT_MAP = {
  'ChatGPT Image 2026년 5월 12일 오후 07_00_08.png':       'memory_card_30_magic_wand.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_00_15.png':       'memory_card_20_ufo_pink.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_00_31.png':       'memory_card_19_rocket.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_52 (2).png':   'memory_card_13_rainbow_popsicle.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_55 (3).png':   'memory_card_14_strawberry_bingsu.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_55 (4).png':   'memory_card_10_pink_donut.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_55 (5).png':   'memory_card_03_cherry_cupcake.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_56 (9).png':   'memory_card_17_plain_waffle.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_05_56 (10).png':  'memory_card_15_fruit_parfait.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_08_12 (1).png':   'memory_card_37_crown.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_08_12 (2).png':   'memory_card_31_bunny_pink.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_08_12 (3).png':   'memory_card_38_music_note.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_12_04.png':       'memory_card_02_soft_ice_cream.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_16_25 (1).png':   'memory_card_35_bat_purple.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_16_25 (2).png':   'memory_card_36_alien_mint.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_16_25 (3).png':   'memory_card_34_skunk.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_16_25 (4).png':   'memory_card_32_fox.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_16_25 (5).png':   'memory_card_33_raccoon.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_19_25.png':       'memory_card_40_star_sketchpad.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_19_31.png':       'memory_card_39_paint_palette.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_38 (1).png':   'memory_card_28_meteor.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_38 (2).png':   'memory_card_25_saturn.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_38 (3).png':   'memory_card_27_moon_crescent.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_38 (4).png':   'memory_card_29_star_yellow.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_38 (5).png':   'memory_card_22_astronaut.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_39 (6).png':   'memory_card_24_telescope.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_39 (8).png':   'memory_card_23_satellite.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_39 (9).png':   'memory_card_21_ufo_purple.png',
  'ChatGPT Image 2026년 5월 12일 오후 07_25_39 (10).png':  'memory_card_26_earth.png',
};

// 기존 이름 정리 (있는 그대로 유지하되 star_cookie는 18로 이동)
const RENAME_EXISTING = {
  'memory_card_20_star_cookie.png': 'memory_card_18_star_cookie.png',
};

// 기존에 이미 잘 이름 붙은 파일들 (이름 그대로 유지)
const KEEP_AS_IS = [
  'memory_card_01_ice_cream_cone.png',
  'memory_card_04_star_cupcake.png',
  'memory_card_05_swirl_lollipop.png',
  'memory_card_06_cookie.png',
  'memory_card_07_strawberry_milk.png',
  'memory_card_08_candy_cluster.png',
  'memory_card_09_strawberry_shortcake.png',
  'memory_card_11_rainbow_macaron.png',
  'memory_card_12_watermelon_popsicle.png',
  'memory_card_16_berry_waffle.png',
];

(async () => {
  console.log('=== 메모리 카드 자산 리네임 + 복사 ===\n');
  await fs.mkdir(DST_DIR, { recursive: true });

  // 1) ChatGPT 파일 리네임 (assets 폴더 내) + public/cards/에 복사
  console.log('[1단계] ChatGPT 이미지 → 명시적 이름으로 변경');
  for (const [srcName, dstName] of Object.entries(CHATGPT_MAP)) {
    const srcPath = path.join(SRC_DIR, srcName);
    const renamedSrcPath = path.join(SRC_DIR, dstName);
    const publicDstPath = path.join(DST_DIR, dstName);

    try {
      // assets/메모리 게임/ 안에서 리네임
      await fs.rename(srcPath, renamedSrcPath);
      // public/cards/로 복사
      await fs.copyFile(renamedSrcPath, publicDstPath);
      console.log(`  ✓ ${dstName}`);
    } catch (e) {
      console.error(`  ✗ ${srcName}: ${e.message}`);
    }
  }

  // 2) 기존 star_cookie 번호 정리 (20 → 18)
  console.log('\n[2단계] 기존 파일 번호 정리');
  for (const [oldName, newName] of Object.entries(RENAME_EXISTING)) {
    const oldSrc = path.join(SRC_DIR, oldName);
    const newSrc = path.join(SRC_DIR, newName);
    const publicDst = path.join(DST_DIR, newName);
    try {
      await fs.rename(oldSrc, newSrc);
      await fs.copyFile(newSrc, publicDst);
      console.log(`  ✓ ${oldName} → ${newName}`);
    } catch (e) {
      console.error(`  ✗ ${oldName}: ${e.message}`);
    }
  }

  // 3) 기존 잘 이름 붙은 파일은 그대로 public에 복사
  console.log('\n[3단계] 기존 명시 파일 복사');
  for (const name of KEEP_AS_IS) {
    const srcPath = path.join(SRC_DIR, name);
    const dstPath = path.join(DST_DIR, name);
    try {
      await fs.copyFile(srcPath, dstPath);
      console.log(`  ✓ ${name}`);
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
    }
  }

  // 4) card_back.png 처리
  console.log('\n[4단계] 카드 뒷면');
  try {
    await fs.copyFile(
      path.join(SRC_DIR, 'card_back.png'),
      path.join(DST_DIR, 'card-back.png'),   // 기존 게임 코드와 호환되도록 'card-back.png' 이름 유지
    );
    console.log(`  ✓ card-back.png (고해상도 교체)`);
  } catch (e) {
    console.error(`  ✗ card_back.png: ${e.message}`);
  }

  console.log('\n=== 완료 ===');
})();
