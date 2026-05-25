// card-back.png의 외곽 halo 패딩을 트림 → 실제 카드 프레임이 PNG 가득 차도록
import { PNG } from 'pngjs';
import fs from 'node:fs';

const file = 'C:/Users/sinae/rainbow-sketchbook/game/public/cards/card-back.png';
const backup = 'C:/Users/sinae/rainbow-sketchbook/game/public/cards/card-back.png.untrimmed';

// 백업 (한 번만)
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

const data = fs.readFileSync(backup);
const png = PNG.sync.read(data);
const W = png.width, H = png.height;

// 1단계: 컨텐츠 bbox (alpha > 10)
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4;
    if (png.data[idx + 3] > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

// 2단계: 살짝 여유 8px (sparkle 살리기)
const pad = 8;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(W - 1, maxX + pad);
maxY = Math.min(H - 1, maxY + pad);

const cw = maxX - minX + 1;
const ch = maxY - minY + 1;
console.log('원본:', W+'x'+H, '→ 트림:', cw+'x'+ch, '(aspect ' + (cw/ch).toFixed(3) + ')');

// 3단계: 새 PNG 생성
const out = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const srcIdx = ((minY + y) * W + (minX + x)) * 4;
    const dstIdx = (y * cw + x) * 4;
    out.data[dstIdx + 0] = png.data[srcIdx + 0];
    out.data[dstIdx + 1] = png.data[srcIdx + 1];
    out.data[dstIdx + 2] = png.data[srcIdx + 2];
    out.data[dstIdx + 3] = png.data[srcIdx + 3];
  }
}

fs.writeFileSync(file, PNG.sync.write(out));
console.log('✅ 트림 완료:', file);
