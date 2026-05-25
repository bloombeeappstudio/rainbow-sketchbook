// 🏡 MyRoomScene — 마이룸 (스토리북 다시보기 공간)
// 챕터별로 스토리를 다시 볼 수 있는 동화책 갤러리
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';
import { makeSpeechBubble } from '../ui/SpeechBubble.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

// 챕터 데이터
const CHAPTERS = [
  {
    id: 1,
    title: '제 1장',
    subtitle: '사라진 색을 찾아서',
    cover: 'story-01',
    coverFallback: { top: 0x6B3F8F, bottom: 0x3C2161 },
    locked: false,
  },
  {
    id: 2,
    title: '제 2장',
    subtitle: '추후 공개 예정',
    cover: null,
    coverFallback: { top: 0x3A3540, bottom: 0x2A2530 },
    locked: true,
  },
  {
    id: 3,
    title: '제 3장',
    subtitle: '추후 공개 예정',
    cover: null,
    coverFallback: { top: 0x3A3540, bottom: 0x2A2530 },
    locked: true,
  },
];

export default class MyRoomScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MyRoomScene' });
  }

  create() {
    this.cameras.main.fadeIn(700, 15, 8, 32);
    soundManager.attachScene(this);
    try { soundManager.playBGM(['bgm-lobby-1', 'bgm-lobby-2']); } catch (e) { /* skip */ }

    // ===== 배경 =====
    this.createCosmicBackground();
    this.createStars(120);

    // ===== 상단 타이틀 =====
    this.createTopBar();

    // ===== 뒤로가기 버튼 (우상단) =====
    this.createBackButton();

    // ===== 토슴이 (좌측, 환영) =====
    this.createToseumiGreeter();

    // ===== 챕터 카드 갤러리 =====
    this.createChapterGallery();
  }

  createCosmicBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3B2470, 0x3B2470, 0x0F0820, 0x0F0820, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 따뜻한 글로우 (왼쪽 위)
    const glow1 = this.add.graphics();
    glow1.fillStyle(0xFFB6C8, 0.18);
    glow1.fillCircle(GAME_WIDTH * 0.2, GAME_HEIGHT * 0.4, 480);

    // 보라 글로우 (오른쪽 아래)
    const glow2 = this.add.graphics();
    glow2.fillStyle(0x7A4FA0, 0.22);
    glow2.fillCircle(GAME_WIDTH * 0.8, GAME_HEIGHT * 0.7, 400);
  }

  createStars(count) {
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(1, 3);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 1 },
        duration: Phaser.Math.Between(1500, 4000),
        yoyo: true, repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  createTopBar() {
    // 타이틀 — 스토리 (마이룸/동화책 워딩 제거)
    this.add.text(50, 80, '📖 스토리', {
      fontFamily: FONTS.bold,
      fontSize: '72px',
      color: '#FFD8E2',
    }).setOrigin(0, 0.5);

    // 부제 — 사이즈 키움 (34 → 42)
    this.add.text(50, 160, '토슴이의 이야기를 다시 들어볼까?', {
      fontFamily: FONTS.game,
      fontSize: '42px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setAlpha(0.9);
  }

  createBackButton() {
    // 표준 우상단 나가기 버튼 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToMain());
  }

  createToseumiGreeter() {
    // 토슴이 + 말풍선 — 컨테이너로 묶어서 함께 둥둥
    //   (말풍선만 고정되어 있으면 토슴이와 따로 노는 느낌 → 한 덩어리로 움직임)
    //   카드 cardH=600, startY=GAME_HEIGHT/2+60=600 → 카드 아래 y=900
    //   토슴이 scale 0.5 PNG ~1140 → 표시 ~570, 중심 y=615면 아래 y=900
    const cx = GAME_WIDTH * 0.17;
    const cy = 615;

    const group = this.add.container(cx, cy);

    // 토슴이 (책 읽는 모습)
    const storyKey = this.textures.exists('toseumi-story') ? 'toseumi-story' : 'toseumi-greet';
    if (this.textures.exists(storyKey)) {
      const toseumi = this.add.image(0, 0, storyKey);
      toseumi.setScale(0.5);
      group.add(toseumi);
    }

    // 안내 말풍선 — 머리 가까이 (-360 → -280: 상단 여백 확보 + 자연스럽게)
    const bw = 440;                              // 480 → 440 (텍스트 비율 맞춤)
    const bh = 118;                              // 130 → 118 (위아래 슬림)
    const by = -280;                             // 토슴이 중심 위쪽 (가까이)

    const bubbleGfx = makeSpeechBubble(this, 0, by, bw, bh, {
      tailDirection: 'down',                     // 꼬리 아래 (토슴이 머리 향함)
    });
    group.add(bubbleGfx);

    const bubbleText = this.add.text(0, by, '읽고 싶은 장을 골라봐!', {
      fontFamily: FONTS.bold,
      fontSize: '44px',                          // 48 → 44 (말풍선 비율 맞춤)
      color: '#5A2A40',
      align: 'center',
    }).setOrigin(0.5);
    group.add(bubbleText);

    // 둥둥 효과 제거 (사용자 피드백: 어지러움)
  }

  // ===== 챕터 카드 갤러리 (3장) — 우측 영역, 카드 크게 (사용자 피드백) =====
  createChapterGallery() {
    const cardW = 400;       // 360 → 400
    const cardH = 600;       // 520 → 600 (텍스트/버튼 안 겹치게)
    const gap = 40;
    const total = CHAPTERS.length;
    const groupW = total * cardW + (total - 1) * gap;        // 400*3 + 40*2 = 1280

    // 우측 끝 정렬 (오른쪽 60px 마진)
    const rightEdge = GAME_WIDTH - 60;                       // 1860
    const firstCardCenterX = rightEdge - groupW + cardW / 2; // 1860-1280+200=780
    const startY = GAME_HEIGHT / 2 + 60;

    CHAPTERS.forEach((chapter, i) => {
      const x = firstCardCenterX + i * (cardW + gap);
      this.makeChapterCard(x, startY, cardW, cardH, chapter, i);
    });
  }

  makeChapterCard(x, y, w, h, chapter, index) {
    const container = this.add.container(x, y);
    container.setAlpha(0);

    // 등장 애니메이션
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 600,
      delay: 200 + index * 150,
      ease: 'Cubic.easeOut',
    });

    // ===== 그림자 =====
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(-w / 2 + 6, -h / 2 + 12, w, h, 32);
    container.add(shadow);

    // ===== 카드 본체 =====
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xFFFAF5, 1);
    cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 32);
    cardBg.lineStyle(6, chapter.locked ? 0x888888 : 0xFFB6C8, 0.95);
    cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 32);
    container.add(cardBg);

    // ===== 커버 이미지 영역 (상단 약 50%) — 텍스트/버튼 영역 확보 =====
    const coverW = w - 40;
    const coverH = h * 0.5;
    const coverY = -h / 2 + 30 + coverH / 2;

    // 커버 배경 (둥근 사각형)
    const coverFrame = this.add.graphics();
    coverFrame.fillStyle(chapter.coverFallback.top, 1);
    coverFrame.fillRoundedRect(-coverW / 2, coverY - coverH / 2, coverW, coverH, 24);
    container.add(coverFrame);

    if (chapter.cover && this.textures.exists(chapter.cover)) {
      // 실제 커버 이미지 (둥근 모서리로 크롭)
      const img = this.add.image(0, coverY, chapter.cover);
      const sx = coverW / img.width;
      const sy = coverH / img.height;
      const scale = Math.max(sx, sy);
      img.setScale(scale);

      // 둥근 마스크 (그래픽으로 만든 마스크)
      const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
      maskShape.fillStyle(0xFFFFFF);
      maskShape.fillRoundedRect(x - coverW / 2, y + coverY - coverH / 2, coverW, coverH, 24);
      const mask = maskShape.createGeometryMask();
      img.setMask(mask);

      if (chapter.locked) img.setTint(0x666666);
      container.add(img);
    } else {
      // 잠금 — 그라데이션 + 자물쇠 아이콘
      const grad = this.add.graphics();
      grad.fillGradientStyle(
        chapter.coverFallback.top, chapter.coverFallback.top,
        chapter.coverFallback.bottom, chapter.coverFallback.bottom, 1
      );
      // 그라데이션을 둥근 사각형으로 — Phaser는 fillGradientRoundedRect 없으니 일반 rect로 + mask
      grad.fillRoundedRect(-coverW / 2, coverY - coverH / 2, coverW, coverH, 24);
      container.add(grad);

      // 자물쇠
      const lock = this.add.text(0, coverY, '🔒', {
        fontFamily: FONTS.bold,
        fontSize: '120px',
        color: '#FFFFFF',
      }).setOrigin(0.5).setAlpha(0.7);
      container.add(lock);
    }

    // ===== 챕터 라벨 — 사이즈 업 (사용자 피드백) =====
    const titleY = coverY + coverH / 2 + 45;
    const chapterLabel = this.add.text(0, titleY, chapter.title, {
      fontFamily: FONTS.game,
      fontSize: '54px',                          // 46 → 54
      color: chapter.locked ? '#999999' : '#B19CFF',
      letterSpacing: 4,
    }).setOrigin(0.5);
    container.add(chapterLabel);

    // ===== 부제 — 사이즈 업 =====
    const subY = titleY + 70;
    const subColor = chapter.locked ? '#888888' : '#5A2A40';
    const sub = this.add.text(0, subY, chapter.subtitle, {
      fontFamily: FONTS.bold,
      fontSize: '42px',                          // 36 → 42
      color: subColor,
      align: 'center',
      wordWrap: { width: w - 60 },
    }).setOrigin(0.5);
    container.add(sub);

    // ===== "추후 공개" 배지 / "다시 보기" 버튼 — 위아래 줄임 (사용자 피드백) =====
    const badgeY = h / 2 - 80;                   // -60 → -80 (카드 하단 테두리 여백)
    if (chapter.locked) {
      const badgeW = 280;
      const badgeH = 68;                         // 80 → 68 (위아래 줄임)
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0xAAAAAA, 1);
      badgeBg.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, badgeH / 2);
      container.add(badgeBg);

      const badgeText = this.add.text(0, badgeY, 'COMING SOON', {
        fontFamily: FONTS.bold,
        fontSize: '34px',                        // 38 → 34
        color: '#FFFFFF',
        letterSpacing: 2,
      }).setOrigin(0.5);
      container.add(badgeText);
    } else {
      const btnW = 300;
      const btnH = 78;                           // 96 → 78 (위아래 줄임)
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xB19CFF, 1);
      btnBg.fillRoundedRect(-btnW / 2, badgeY - btnH / 2, btnW, btnH, btnH / 2);
      btnBg.lineStyle(3, 0xFFFFFF, 0.8);
      btnBg.strokeRoundedRect(-btnW / 2, badgeY - btnH / 2, btnW, btnH, btnH / 2);
      container.add(btnBg);

      const btnText = this.add.text(0, badgeY, '다시 보기  ›', {
        fontFamily: FONTS.bold,
        fontSize: '38px',                        // 44 → 38
        color: '#FFFFFF',
      }).setOrigin(0.5);
      container.add(btnText);
    }

    // ===== 인터랙션 (활성 카드만) =====
    if (!chapter.locked) {
      const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
      container.add(hit);

      // 누름 효과 (scale 0.96)
      hit.on('pointerdown', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scale: 0.96, duration: 80 });
      });
      hit.on('pointerup', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scale: 1, duration: 140, ease: 'Back.easeOut' });
        this.openChapter(chapter);
      });
      hit.on('pointerout', () => {
        this.tweens.killTweensOf(container);
        this.tweens.add({ targets: container, scale: 1, duration: 140 });
      });

      // 가벼운 호흡 (활성 표시)
      this.tweens.add({
        targets: container,
        y: y - 6,
        duration: 2400, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1, delay: 400 + index * 200,
      });
    } else {
      // 잠금 카드 — 클릭 시 안내
      const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
      container.add(hit);
      hit.on('pointerup', () => {
        this.showLockedToast();
      });
    }
  }

  openChapter(chapter) {
    soundManager.play('pop');
    this.cameras.main.fadeOut(600, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // chapter 1만 활성 — StoryScene을 replay 모드로 진입
      this.scene.start('StoryScene', { mode: 'replay' });
    });
  }

  showLockedToast() {
    if (this.toast) {
      this.toast.destroy();
    }
    const tx = GAME_WIDTH / 2;
    const ty = GAME_HEIGHT - 140;
    const container = this.add.container(tx, ty);
    container.setDepth(200);

    const w = 540;
    const h = 90;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, h / 2);
    container.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x4A2D6E, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, 0xFFD93D, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(bg);

    const text = this.add.text(0, 0, '🔒 다음 이야기는 곧 만나요!', {
      fontFamily: FONTS.bold,
      fontSize: '36px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(text);

    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1, y: ty - 20,
      duration: 300, ease: 'Cubic.easeOut',
    });
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: container,
        alpha: 0, y: ty - 40,
        duration: 400, ease: 'Cubic.easeIn',
        onComplete: () => container.destroy(),
      });
    });
    this.toast = container;
  }

  exitToMain() {
    soundManager.play('pop');
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
