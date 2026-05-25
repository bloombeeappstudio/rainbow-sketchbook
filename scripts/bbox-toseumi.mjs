import { PNG } from 'pngjs';
import fs from 'node:fs';
function bbox(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const W=png.width, H=png.height;
  let minX=W,minY=H,maxX=-1,maxY=-1;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    if (png.data[(y*W+x)*4+3]>10) { if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  }
  const cw=maxX-minX+1, ch=maxY-minY+1;
  const cx=(minX+maxX)/2/W, cy=(minY+maxY)/2/H;
  console.log(file.split(/[\/]/).pop().padEnd(35), 'canvas:', W+'x'+H, '| content:', cw+'x'+ch, '| 중심:', (cx*100).toFixed(0)+'%,'+(cy*100).toFixed(0)+'%', '| ratio:', (cw/W*100).toFixed(0)+'%W');
}
const dir='C:/Users/sinae/rainbow-sketchbook/game/public/characters/';
for (const f of ['toseumi-fun.png','toseumi-greet.png','toseumi-default.png']) bbox(dir+f);
