// 🛡 ParentGate — 어린이의 잘못된 결제/공유 방지용 수학 게이트
//   사용: showParentGate(scene, onSuccess)
//   원본: TemplateSelectScene.showParentGate (2026-05-23 공용 모듈로 분리)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';

export function showParentGate(scene, onSuccess) {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const root = scene.add.container(0, 0).setDepth(5100);

  // 어두운 배경
  root.add(scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setInteractive());

  // 패널
  const pw = 840, ph = 640;
  const px = cx - pw / 2;
  const py = cy - ph / 2;

  const psh = scene.add.graphics();
  psh.fillStyle(0x000000, 0.4);
  psh.fillRoundedRect(px + 8, py + 12, pw, ph, 44);
  root.add(psh);

  const pbg = scene.add.graphics();
  pbg.fillStyle(0xFFF4F7, 1);
  pbg.fillRoundedRect(px, py, pw, ph, 44);
  root.add(pbg);

  // 상단 핑크 헤더
  const hdr = scene.add.graphics();
  hdr.fillStyle(0xFF4D88, 1);
  hdr.fillRoundedRect(px, py, pw, 96, 44);
  hdr.fillRect(px, py + 52, pw, 44);
  root.add(hdr);

  root.add(scene.add.text(cx, py + 48, '🛡 부모님 확인', {
    fontFamily: FONTS.bold, fontSize: '52px', color: '#FFFFFF',
  }).setOrigin(0.5));

  // 수학 문제 생성
  const problem = generateMathProblem();

  // 문제 텍스트
  root.add(scene.add.text(cx, py + 180, problem.question, {
    fontFamily: FONTS.bold, fontSize: '72px', color: '#5A2A40',
  }).setOrigin(0.5));

  // 답 입력 디스플레이
  let answerDigits = [];
  const answerTxt = scene.add.text(cx, py + 272, '', {
    fontFamily: FONTS.bold, fontSize: '64px', color: '#5A2A40',
  }).setOrigin(0.5);
  root.add(answerTxt);

  // 밑줄
  const ul = scene.add.graphics();
  ul.lineStyle(4, 0xFFB0C8, 1);
  ul.lineBetween(cx - 160, py + 308, cx + 160, py + 308);
  root.add(ul);

  const updateDisplay = () => {
    answerTxt.setText(answerDigits.join('') || '');
  };

  // 숫자 패드 (4행×3열) 7 8 9 / 4 5 6 / 1 2 3 / ⌫ 0 ✓
  const padKeys = [['7','8','9'], ['4','5','6'], ['1','2','3'], ['⌫','0','✓']];
  const btnW = 136, btnH = 64, gapX = 18, gapY = 12;
  const padTotalW = 3 * btnW + 2 * gapX;
  const padSX = cx - padTotalW / 2 + btnW / 2;
  const padSY = py + 362;

  padKeys.forEach((row, ri) => {
    row.forEach((key, ci) => {
      const bx = padSX + ci * (btnW + gapX);
      const by = padSY + ri * (btnH + gapY);
      const isOK  = key === '✓';
      const isDel = key === '⌫';
      const fill  = isOK ? 0x3DC8A8 : (isDel ? 0xFF8FAB : 0xFFFFFF);
      const shad  = isOK ? 0x2A8A78 : (isDel ? 0xC84070 : 0xDDCCCC);
      const tClr  = (isOK || isDel) ? '#FFFFFF' : '#5A2A40';

      const bsh = scene.add.graphics();
      bsh.fillStyle(shad, 1);
      bsh.fillRoundedRect(bx - btnW / 2, by - btnH / 2 + 5, btnW, btnH, 16);
      root.add(bsh);

      const bbg = scene.add.graphics();
      bbg.fillStyle(fill, 1);
      bbg.fillRoundedRect(bx - btnW / 2, by - btnH / 2, btnW, btnH, 16);
      root.add(bbg);

      const btxt = scene.add.text(bx, by, key, {
        fontFamily: FONTS.bold, fontSize: '42px', color: tClr,
      }).setOrigin(0.5);
      root.add(btxt);

      const zone = scene.add.zone(bx, by, btnW + 8, btnH + 8).setInteractive({ useHandCursor: true });
      root.add(zone);

      zone.on('pointerdown', () => { btxt.y = by + 4; });
      zone.on('pointerout',  () => { btxt.y = by; });
      zone.on('pointerup', () => {
        btxt.y = by;
        soundManager.play('click');
        if (isDel) {
          answerDigits.pop();
          updateDisplay();
        } else if (isOK) {
          const userAnswer = parseInt(answerDigits.join(''), 10);
          if (userAnswer === problem.answer) {
            answerTxt.setColor('#3DC8A8');
            answerTxt.setText('정답!');
            scene.tweens.add({ targets: root, alpha: 0, duration: 500, delay: 700,
              onComplete: () => { root.destroy(); onSuccess(); },
            });
          } else {
            answerTxt.setColor('#FF4D88');
            scene.time.delayedCall(500, () => {
              answerDigits = [];
              updateDisplay();
              answerTxt.setColor('#5A2A40');
            });
          }
        } else {
          if (answerDigits.length < 4) {
            answerDigits.push(key);
            updateDisplay();
          }
        }
      });
    });
  });

  root.setAlpha(0);
  scene.tweens.add({ targets: root, alpha: 1, duration: 250, ease: 'Cubic.easeOut' });
}

// 수학 문제 생성 (덧셈 / 곱셈 랜덤)
function generateMathProblem() {
  if (Phaser.Math.Between(0, 1) === 0) {
    const a = Phaser.Math.Between(12, 79);
    const b = Phaser.Math.Between(11, 99 - a);
    return { question: `${a} + ${b} = ?`, answer: a + b };
  } else {
    const a = Phaser.Math.Between(3, 9);
    const b = Phaser.Math.Between(3, 9);
    return { question: `${a} × ${b} = ?`, answer: a * b };
  }
}
