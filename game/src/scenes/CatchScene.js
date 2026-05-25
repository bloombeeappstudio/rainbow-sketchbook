// ⭐ CatchScene — 스타 캐치 (떨어지는 별/하트/사탕을 바구니로 받기)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { showRewardPopup } from '../ui/RewardPopup.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { starBurst } from '../ui/Effects.js';
import { soundManager } from '../systems/SoundManager.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

// 점수 — 모두 +1 통일, 별(⭐ 게임 이름)만 +5로 차별화 (사용자 피드백)
const ITEMS = [
  { emoji: '⭐', score: 5, color: '#FFD93D' },                      // 별 — 메인 (5점)
  { emoji: '💗', score: 1, color: '#FF6B9D' },
  { emoji: '🍬', score: 1, color: '#FFB347' },
  { emoji: '🎈', score: 1, color: '#B19CFF' },
  { emoji: '🌈', score: 1, color: '#7FD8C0', rare: true },
  { emoji: '✨', score: 1, color: '#FFE066', superRare: true },
];

export default class CatchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CatchScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-catch-1')) this.load.audio('bgm-catch-1', 'sounds/bgm/catch-1.mp3');
    if (!this.cache.audio.has('bgm-catch-2')) this.load.audio('bgm-catch-2', 'sounds/bgm/catch-2.mp3');
  }

  create() {
    this.cameras.main.fadeIn(500, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-catch-1', 'bgm-catch-2']);     // 스타캐치 BGM 롤링

    this.score = 0;
    this.timeLeft = 30;
    this.fallingItems = [];
    this.isPlaying = false;

    this.createBackground();
    this.createUI();
    this.createToseumi();
    this.showMoveTutorial();     // 좌우 이동 안내 화살표 (인트로~카운트다운 동안 표시)
    // 인트로 → 카운트다운 → 게임
    this.showIntro(() => this.startCountdown());
  }

  // ===== 좌우 이동 화살표 안내 =====
  // 시작 전에 토슴이를 좌우로 움직일 수 있다는 걸 알려주는 튜토리얼
  showMoveTutorial() {
    if (!this.toseumi) return;

    const ty = this.toseumi.y - 20;          // 토슴이 머리 부근
    const tx = this.toseumi.x;
    const distNear = 230;                    // 토슴이 가까운 거리
    const distFar  = 290;                    // 토슴이 먼 거리 (oscillation)

    // 왼쪽 화살표 ⬅
    const arrowLeft = this.add.text(tx - distFar, ty, '⬅️', {
      fontFamily: FONTS.game, fontSize: '140px',
    }).setOrigin(0.5);
    arrowLeft.setDepth(50);
    arrowLeft.setAlpha(0.95);

    // 오른쪽 화살표 ➡
    const arrowRight = this.add.text(tx + distFar, ty, '➡️', {
      fontFamily: FONTS.game, fontSize: '140px',
    }).setOrigin(0.5);
    arrowRight.setDepth(50);
    arrowRight.setAlpha(0.95);

    // 안내 라벨 (화살표 아래)
    const hint = this.add.text(tx, this.toseumi.y + 130, '좌우로 움직여봐!', {
      fontFamily: FONTS.bold,
      fontSize: '44px',
      color: '#FFFFFF',
      stroke: '#5A2A40',
      strokeThickness: 6,
    }).setOrigin(0.5);
    hint.setDepth(50);

    // 좌우 흔들거림 — 토슴이 쪽으로 다가왔다 멀어졌다 반복
    this.tweens.add({
      targets: arrowLeft,
      x: tx - distNear,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: arrowRight,
      x: tx + distNear,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // 안내 라벨 살짝 통통
    this.tweens.add({
      targets: hint,
      scale: { from: 1, to: 1.06 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });

    this.moveTutorialItems = [arrowLeft, arrowRight, hint];
  }

  hideMoveTutorial() {
    if (!this.moveTutorialItems) return;
    const items = this.moveTutorialItems;
    this.moveTutorialItems = null;
    this.tweens.add({
      targets: items,
      alpha: 0,
      duration: 400, ease: 'Cubic.easeIn',
      onComplete: () => items.forEach(i => i.destroy()),
    });
  }

  // ===== 인트로 안내 — 모달 오버레이 (게임 화면 위에 어둡게 + 안내 + 시작 버튼)
  showIntro(onDone) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 어두운 오버레이 — 게임 화면 살짝 어둡게 (정지 느낌)
    // 클릭도 차단 (toseumi 이동 등 게임 화면 인터랙션 막음)
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);
    overlay.setDepth(1000);
    overlay.setInteractive();    // 게임 화면 입력 차단

    // 안내 문구 (한 줄, 흰색)
    const text = this.add.text(cx, cy - 80, '떨어지는 아이템을 캐치 해봐!', {
      fontFamily: FONTS.bold,
      fontSize: '76px',
      color: '#FFFFFF',
      align: 'center',
    }).setOrigin(0.5);
    text.setDepth(1001);

    // [시작] 버튼
    const btnW = 360;
    const btnH = 130;
    const btnY = cy + 80;
    const btnContainer = this.add.container(cx, btnY);
    btnContainer.setDepth(1001);

    // 시작 버튼 — 깔끔한 그라디언트 (광택 도형 X)
    const btnG = this.add.graphics();
    btnG.fillStyle(0x3D8870, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2 + 8, btnW, btnH, btnH / 2);
    btnG.fillGradientStyle(0xA0E5D0, 0xA0E5D0, 0x6FCAB2, 0x6FCAB2, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btnG.lineStyle(3, 0x4FA088, 0.6);
    btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btnContainer.add(btnG);

    const btnText = this.add.text(0, 0, '시작', {
      fontFamily: FONTS.bold,
      fontSize: '64px',
      color: '#FFFFFF',
      stroke: '#3D8870',
      strokeThickness: 4,
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const hit = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    btnContainer.add(hit);

    // 페이드 인 — 오버레이는 투명 → 0.5, 텍스트/버튼은 0 → 1
    overlay.setAlpha(0);
    text.setAlpha(0);
    btnContainer.setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,            // 곱셈 — fillAlpha 0.5 × alpha 1 = 실제 0.5
      duration: 400,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: [text, btnContainer],
      alpha: 1,
      duration: 500,
      delay: 150,
      ease: 'Cubic.easeOut',
    });

    // 누름 효과
    hit.on('pointerdown', () => { btnContainer.y = btnY + 6; });
    hit.on('pointerout', () => { btnContainer.y = btnY; });

    // 클릭 → 모두 페이드 아웃 → 콜백 (카운트다운)
    hit.on('pointerup', () => {
      btnContainer.y = btnY;
      soundManager.play('pop');
      this.tweens.add({
        targets: [overlay, text, btnContainer],
        alpha: 0,
        duration: 350,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          overlay.destroy();
          text.destroy();
          btnContainer.destroy();
          if (onDone) onDone();
        },
      });
    });
  }

  createBackground() {
    if (this.textures.exists('bg-catch')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-catch');
      const s = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(s);
      const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.42);
      dim.setDepth(0);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x4A2D6E, 0x4A2D6E, 0x2C1B47, 0x2C1B47, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  createUI() {
    // ===== 타이머 (좌상단, 표준 사이즈 220×100 — 나가기 버튼과 동일 사이즈) =====
    const timerX = 160;
    const timerY = 80;
    const timerW = 220;
    const timerH = 100;
    const tShadow = this.add.graphics();
    tShadow.fillStyle(0xCC9A56, 1);
    tShadow.fillRoundedRect(timerX - timerW / 2, timerY - timerH / 2 + 6, timerW, timerH, timerH / 2);
    const tBg = this.add.graphics();
    tBg.fillStyle(0xFFE08A, 1);
    tBg.fillRoundedRect(timerX - timerW / 2, timerY - timerH / 2, timerW, timerH, timerH / 2);
    this.timerText = this.add.text(timerX, timerY, `⏱ ${this.timeLeft}`, {
      fontFamily: FONTS.bold,
      fontSize: '56px',
      color: '#5A2A40',
    }).setOrigin(0.5);

    // 타이틀 (가운데, 데코 브래킷 강조)
    makeFancyTitle(this, GAME_WIDTH / 2, 90, '스타 캐치');

    // 우상단 표준 나가기 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToMain());

    // 점수 — 타이머 옆 (좌상단 영역, 같은 y) — 흰 톤 + 음영
    this.scoreText = this.add.text(300, 80, '0 점', {
      fontFamily: FONTS.bold,
      fontSize: '54px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.scoreText.setShadow(0, 3, '#000000', 8, false, true);
  }

  createToseumi() {
    // 바구니 토슴이 (하단, 좌우 이동)
    const toseumiKey = this.textures.exists('toseumi-basket') ? 'toseumi-basket' : 'toseumi-default';
    this.toseumi = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 200, toseumiKey);
    this.toseumi.setScale(0.6);
    this.toseumi.setDepth(10);

    // 바구니 영역 (충돌 판정용 — 토슴이 가운데)
    this.basketBounds = { offsetX: 0, offsetY: -20, w: 200, h: 120 };

    // 손가락/마우스 따라 이동
    this.input.on('pointermove', (pointer) => {
      if (!this.isPlaying) return;
      const targetX = Phaser.Math.Clamp(pointer.x, 100, GAME_WIDTH - 100);
      this.tweens.add({
        targets: this.toseumi,
        x: targetX,
        duration: 120,
        ease: 'Cubic.out',
      });
    });

    // 탭으로도 이동 (좌/우 절반)
    this.input.on('pointerdown', (pointer) => {
      if (!this.isPlaying) return;
      const targetX = Phaser.Math.Clamp(pointer.x, 100, GAME_WIDTH - 100);
      this.tweens.add({
        targets: this.toseumi,
        x: targetX,
        duration: 200,
      });
    });
  }

  startCountdown() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const numbers = ['3', '2', '1', '시작!'];
    let idx = 0;

    const showNext = () => {
      if (idx >= numbers.length) {
        this.startGame();
        return;
      }
      const num = this.add.text(cx, cy, numbers[idx], {
        fontFamily: FONTS.bold,
        fontSize: '240px',
        color: '#FFD93D',
      }).setOrigin(0.5);
      num.setScale(0);
      // 카운트다운 사운드 — "시작!"은 강조
      soundManager.play(numbers[idx] === '시작!' ? 'start' : 'countdown');
      this.tweens.add({
        targets: num, scale: 1.3, duration: 400, ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: num, alpha: 0, scale: 1.8, duration: 400, delay: 600,
        onComplete: () => num.destroy(),
      });
      idx++;
      this.time.delayedCall(1100, showNext);
    };
    showNext();
  }

  startGame() {
    this.isPlaying = true;
    this.hideMoveTutorial();       // 게임 시작하면 화살표 안내 숨김
    this.startTimer();
    this.startSpawning();
  }

  startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 5) this.timerText.setColor('#FF6B9D');
        if (this.timeLeft <= 0) this.endGame();
      },
      loop: true,
    });
  }

  startSpawning() {
    this.spawnEvent = this.time.addEvent({
      delay: 700,
      callback: () => this.spawnItem(),
      loop: true,
    });
  }

  spawnItem() {
    if (!this.isPlaying) return;

    // 희귀 확률
    const rand = Math.random();
    let item;
    if (rand < 0.04) {
      item = ITEMS.find(i => i.superRare);
    } else if (rand < 0.18) {
      item = ITEMS.find(i => i.rare);
    } else {
      const common = ITEMS.filter(i => !i.rare && !i.superRare);
      item = common[Math.floor(Math.random() * common.length)];
    }

    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const startY = -60;
    const itemText = this.add.text(x, startY, item.emoji, {
      fontFamily: FONTS.bold,
      // 사이즈 ↑ (사용자 피드백) — 88→120, 108→140, 120→160
      fontSize: item.superRare ? '160px' : (item.rare ? '140px' : '120px'),
      color: item.color,
    }).setOrigin(0.5);
    itemText.setData('score', item.score);
    itemText.setDepth(15);             // 토슴이(depth 10) 앞으로 — 바구니에 받는 느낌 (사용자 피드백)

    // 떨어지는 애니 (살짝 느리게 — 사용자 피드백)
    const duration = Phaser.Math.Between(2900, 3900);     // 2200~3200 → 2900~3900
    this.tweens.add({
      targets: itemText,
      y: GAME_HEIGHT + 60,
      angle: Phaser.Math.Between(-30, 30),
      duration,
      ease: 'Linear',
      onUpdate: () => {
        // 토슴이 바구니와 충돌 체크
        if (!this.isPlaying) return;
        const tx = this.toseumi.x;
        const ty = this.toseumi.y + this.basketBounds.offsetY;
        const dx = Math.abs(itemText.x - tx);
        const dy = Math.abs(itemText.y - ty);
        if (dx < this.basketBounds.w / 2 && dy < this.basketBounds.h / 2 && itemText.visible) {
          this.catchItem(itemText);
        }
      },
      onComplete: () => itemText.destroy(),
    });

    this.fallingItems.push(itemText);
  }

  catchItem(itemText) {
    if (!itemText.visible) return;
    itemText.setVisible(false);
    const score = itemText.getData('score') || 1;
    this.score += score;
    this.scoreText.setText(`${this.score} 점`);

    // 사운드
    soundManager.play(score >= 5 ? 'star' : 'catch');

    const isStar = score >= 5;
    const catchX = this.toseumi.x;
    const catchY = this.toseumi.y + this.basketBounds.offsetY;

    // ===== 1) 바구니 받는 피드백 — 토슴이 squash bounce =====
    const baseScale = this.toseumi.scale;
    this.tweens.add({
      targets: this.toseumi,
      scaleX: baseScale * 1.12, scaleY: baseScale * 0.92,
      duration: 130, yoyo: true,
      onComplete: () => this.toseumi.setScale(baseScale),
    });

    // ===== 2) 잡힌 위치에 반짝 ring (즉시 확장 페이드) =====
    const ringColor = isStar ? 0xFFE066 : 0xFFD93D;
    const ring = this.add.graphics();
    ring.lineStyle(7, ringColor, 1);
    ring.strokeCircle(0, 0, 45);
    ring.x = catchX;
    ring.y = catchY;
    ring.setDepth(28);
    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 550, ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });

    // ===== 3) 별가루 폭발 (기존) — 사이즈 ↑ =====
    starBurst(this, itemText.x, itemText.y, {
      count: isStar ? 20 : 12,
      distance: isStar ? 160 : 110,
      colors: isStar
        ? ['#FFD93D', '#FFE066', '#FFB347']
        : ['#FFD93D'],
    });

    // ===== 4) 별 (+5) 일 때 추가 ✨ 분수 =====
    if (isStar) {
      for (let i = 0; i < 12; i++) {
        // 위쪽으로 부채꼴 분수 (-π/2 기준 ±0.75 라디안)
        const angle = -Math.PI / 2 + (i / 12 - 0.5) * 1.5;
        const distance = Phaser.Math.Between(130, 230);
        const px = catchX + Math.cos(angle) * distance;
        const py = catchY + Math.sin(angle) * distance;

        const dot = this.add.text(catchX, catchY, '✨', {
          fontFamily: FONTS.bold,
          fontSize: `${Phaser.Math.Between(34, 50)}px`,
          color: '#FFE066',
        }).setOrigin(0.5);
        dot.setDepth(25);
        dot.setAlpha(0);

        this.tweens.add({
          targets: dot,
          alpha: 1,
          duration: 100, delay: i * 25,
        });
        this.tweens.add({
          targets: dot,
          x: px, y: py,
          alpha: 0, scale: 0.3,
          duration: 900, delay: 100 + i * 25,
          ease: 'Cubic.out',
          onComplete: () => dot.destroy(),
        });
      }
    }

    // ===== 5) +점수 폼업 — 흰색 + glow 음영 =====
    const baseSize = isStar ? 120 : 90;
    const popup = this.add.text(catchX, catchY - 50, `+${score}`, {
      fontFamily: FONTS.bold,
      fontSize: `${baseSize}px`,
      color: '#FFFFFF',
    }).setOrigin(0.5);
    popup.setDepth(30);
    popup.setScale(0);
    popup.setShadow(0, 5, isStar ? 'rgba(255,217,61,0.85)' : 'rgba(58,31,61,0.85)', 14, false, true);

    this.tweens.add({
      targets: popup,
      scale: 1.15,
      duration: 220, ease: 'Back.out',
    });
    this.tweens.add({
      targets: popup,
      y: popup.y - 140,
      alpha: 0,
      duration: 1100, delay: 220, ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  endGame() {
    this.isPlaying = false;
    this.timerEvent?.remove();
    this.spawnEvent?.remove();

    SaveSystem.incStat('catchPlays');
    const save = SaveSystem.load();
    if (this.score > save.stats.catchHighScore) {
      save.stats.catchHighScore = this.score;
      SaveSystem.save(save);
    }

    // "끝!" 배너
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '끝!', {
      fontFamily: FONTS.bold,
      fontSize: '200px',
      color: '#FFD93D',
    }).setOrigin(0.5);
    banner.setScale(0);
    this.tweens.add({
      targets: banner, scale: 1.3, duration: 400, ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: banner, alpha: 0, scale: 1.8, duration: 500, delay: 800,
      onComplete: () => {
        banner.destroy();
        const tier = RewardSystem.decideCatchReward(this.score);
        const reward = RewardSystem.grant(tier);
        showRewardPopup(this, reward, () => this.exitToMain());
      },
    });
  }

  // 상단 바 버튼
  makeTopBarButton(x, y, w, h, emoji, label, color, shadow, onClick) {
    const container = this.add.container(x, y);
    const sh = this.add.graphics();
    sh.fillStyle(shadow, 1);
    sh.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, h / 2);
    container.add(sh);
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(btn);
    const eText = this.add.text(-w / 2 + 48, 0, emoji, {
      fontFamily: FONTS.game, fontSize: '54px',
    }).setOrigin(0.5);
    container.add(eText);
    const lText = this.add.text(20, 0, label, {
      fontFamily: FONTS.bold, fontSize: '54px', color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(lText);
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 4; });
    hit.on('pointerup', () => { container.y = y; if (onClick) onClick(); });
    hit.on('pointerout', () => { container.y = y; });
    return container;
  }

  exitToMain() {
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
