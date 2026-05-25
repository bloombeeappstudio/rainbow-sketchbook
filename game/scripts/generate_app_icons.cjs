// 📱 Android 앱 아이콘 생성 스크립트
//   - 1.png → 메인 launcher icon (com.rainbow.sketchbook.MainActivity)
//   - 2.png → alternative launcher (Activity Alias로 사용자 토글 가능)
//   - 5개 dpi(mdpi~xxxhdpi) + ic_launcher / ic_launcher_round / ic_launcher_foreground
//   - Play Store icon 512×512 (docs/store_icon.png)
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT  = path.resolve(__dirname, '../..');
const SRC1  = path.join(ROOT, 'assets/앱아이콘/1.png');   // 메인 (다크 우주 배경)
const SRC2  = path.join(ROOT, 'assets/앱아이콘/2.png');   // 보조 (핑크 배경)
const RES   = path.resolve(__dirname, '../android/app/src/main/res');
const DOCS  = path.resolve(__dirname, '../../docs');

// Android launcher icon 사이즈 (dpi별)
const DPI_SIZES = {
  'mdpi':    48,
  'hdpi':    72,
  'xhdpi':   96,
  'xxhdpi':  144,
  'xxxhdpi': 192,
};

// adaptive icon foreground 사이즈 (108dp 안전영역 = 72dp 중앙)
const FG_SIZES = {
  'mdpi':    108,
  'hdpi':    162,
  'xhdpi':   216,
  'xxhdpi':  324,
  'xxxhdpi': 432,
};

async function generateForSource(srcPath, baseName) {
  for (const [dpi, size] of Object.entries(DPI_SIZES)) {
    const dir = path.join(RES, `mipmap-${dpi}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 정사각 launcher
    await sharp(srcPath).resize(size, size).png().toFile(path.join(dir, `${baseName}.png`));
    // 원형 launcher (실제 사진은 정사각, 마스킹은 OS가 처리)
    await sharp(srcPath).resize(size, size).png().toFile(path.join(dir, `${baseName}_round.png`));
  }
  // adaptive foreground (Android 8+)
  for (const [dpi, size] of Object.entries(FG_SIZES)) {
    const dir = path.join(RES, `mipmap-${dpi}`);
    await sharp(srcPath).resize(size, size).png().toFile(path.join(dir, `${baseName}_foreground.png`));
  }
}

(async () => {
  // 1번 = 메인 launcher (ic_launcher)
  await generateForSource(SRC1, 'ic_launcher');
  console.log('✓ 1번 → ic_launcher (5 dpi + foreground 5 dpi)');

  // 2번 = alternative launcher (ic_launcher_alt)
  await generateForSource(SRC2, 'ic_launcher_alt');
  console.log('✓ 2번 → ic_launcher_alt (Activity Alias용)');

  // Play Store icon 512×512 (1번 사용)
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });
  await sharp(SRC1).resize(512, 512).png().toFile(path.join(DOCS, 'play_store_icon.png'));
  console.log('✓ Play Store icon 512×512 → docs/play_store_icon.png');

  console.log('\n전체 아이콘 생성 완료');
})();
