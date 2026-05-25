import { PNG } from 'pngjs';
import fs from 'node:fs';

function bbox(file) {
  const data = fs.readFileSync(file);
  const png = PNG.sync.read(data);
  const W = png.width, H = png.height;
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const a = png.data[idx + 3];
      if (a > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  console.log(file.split(/[\/]/).pop(), 'canvas:', W+'x'+H, '| content:', cw+'x'+ch, '| ratio:', (cw/W*100).toFixed(1)+'%W', (ch/H*100).toFixed(1)+'%H');
}

const dir = 'C:/Users/sinae/rainbow-sketchbook/game/public/cards/';
for (const f of fs.readdirSync(dir)) bbox(dir + f);
