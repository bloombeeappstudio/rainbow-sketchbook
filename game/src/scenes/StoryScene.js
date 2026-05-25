// 📖 StoryScene — 시네마틱 동화책 (Ken Burns + 페이지 넘김 + 별가루)
// init({ mode }) — 'first-run' (첫 진입) | 'replay' (마이룸에서 다시보기)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { soundManager } from '../systems/SoundManager.js';

// ===== 챕터 1 — 사라진 색을 찾아서 =====
const CHAPTER_TITLE = '제 1장';
const CHAPTER_SUBTITLE = '사라진 색을 찾아서';

// 모든 대사는 2줄 고정 (말풍선 크기 일정)
const STORIES = [
  {
    image: 'story-01',
    text: '옛날 옛날 우주에는\n레인보우 별나라가 있었어요',
    type: 'narration',
    fallbackBg: { top: 0x4A2D8E, bottom: 0x2C1B47 },
    fallbackToseumi: null,
  },
  {
    image: 'story-02',
    text: '그 별나라엔 폭신폭신한\n토끼 토슴이가 살았어요',
    type: 'narration',
    fallbackBg: { top: 0x6B3F8F, bottom: 0x3C2161 },
    fallbackToseumi: 'toseumi-default',
  },
  {
    image: 'story-03',
    text: '어느 날 별나라의\n색이 모두 사라졌어요!',
    type: 'narration',
    fallbackBg: { top: 0x3A3540, bottom: 0x2A2530 },
    fallbackToseumi: 'toseumi-default',
    grayscale: true,
  },
  {
    image: 'story-04',
    text: '으앙!\n크레파스가 다 어디 갔지?',
    type: 'speech',
    speaker: '토슴이',
    fallbackBg: { top: 0x3A3540, bottom: 0x2A2530 },
    fallbackToseumi: 'toseumi-default',
  },
  {
    image: 'story-05',
    text: '나랑 같이 별나라\n색깔을 찾아 줄래?',
    type: 'speech',
    speaker: '토슴이',
    align: 'right',                  // 토슴이가 좌측에 있어서 텍스트는 우측 (사용자 피드백)
    fallbackBg: { top: 0x5B3A8C, bottom: 0x3A2161 },
    fallbackToseumi: 'toseumi-wave',
  },
];

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StoryScene' });
  }

  init(data) {
    // mode: 'first-run' (디폴트) | 'replay'
    this.mode = (data && data.mode) === 'replay' ? 'replay' : 'first-run';
  }

  create() {
    this.cameras.main.fadeIn(900, 15, 8, 32);

    this.currentIndex = -1;     // 챕터 인트로부터 시작
    this.layers = {};
    this.autoTimer = null;
    this.isTransitioning = false;

    soundManager.attachScene(this);
    // 부드러운 로비 BGM (이미 로딩되어 있으면 사용)
    try { soundManager.playBGM(['bgm-lobby-1', 'bgm-lobby-2']); } catch (e) { /* skip */ }

    // ===== 우주 배경 (전체 공통) =====
    this.createCosmicBackdrop();
    this.starsContainer = this.add.container(0, 0);
    this.createStars(140);
    this.createDriftingDust();

    // ===== 비네팅 (가장자리 어둡게 — 영화 느낌) =====
    this.createVignette();

    // ===== UI =====
    this.createSkipButton();
    this.createIndicator();

    // ===== 키보드 (데스크톱 테스트용) =====
    this.input.keyboard.on('keydown-RIGHT', () => this.nextSlide());
    this.input.keyboard.on('keydown-SPACE', () => this.nextSlide());
    this.input.keyboard.on('keydown-LEFT', () => this.prevSlide());
    this.input.keyboard.on('keydown-ESC', () => this.skipToEnd());

    // ===== 전체 클릭으로 진행 =====
    this.input.on('pointerdown', (pointer) => {
      // 상단/하단 UI 영역은 제외
      if (pointer.y < 140 || pointer.y > GAME_HEIGHT - 90) return;
      this.nextSlide();
    });

    // ===== 챕터 인트로 카드 (시네마틱 오프닝) =====
    this.showChapterIntro();
  }

  // ===== 배경 / 별 / 비네팅 =====

  createCosmicBackdrop() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1E1242, 0x1E1242, 0x0A0418, 0x0A0418, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(-100);

    // 보라 글로우 (가운데)
    const glow = this.add.graphics();
    glow.fillStyle(0x6B47A8, 0.25);
    glow.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 700);
    glow.setDepth(-99);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.35 },
      duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
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
      this.starsContainer.add(star);
    }
  }

  // 떠다니는 빛가루 (시네마틱 입자)
  createDriftingDust() {
    const dustContainer = this.add.container(0, 0);
    dustContainer.setDepth(50);
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const sz = Phaser.Math.FloatBetween(2, 4);
      const color = [0xFFD8E2, 0xFFFFFF, 0xFFE9B0][Math.floor(Math.random() * 3)];
      const dust = this.add.circle(x, y, sz, color, 0.7);
      dustContainer.add(dust);

      const dur = Phaser.Math.Between(8000, 14000);
      this.tweens.add({
        targets: dust,
        y: y - Phaser.Math.Between(80, 180),
        x: x + Phaser.Math.Between(-60, 60),
        alpha: { from: 0.7, to: 0 },
        duration: dur,
        repeat: -1,
        delay: Phaser.Math.Between(0, dur),
        ease: 'Sine.inOut',
      });
    }
  }

  createVignette() {
    const v = this.add.graphics();
    v.setDepth(80);
    // 모서리만 살짝 어둡게 (간단한 비네팅)
    v.fillStyle(0x000000, 0.5);
    const r = 200;
    // 네 모서리에 큰 그라데이션 원 대신 — 검정 테두리
    v.fillRect(0, 0, GAME_WIDTH, 90);                                      // top
    v.fillRect(0, GAME_HEIGHT - 90, GAME_WIDTH, 90);                       // bottom
    v.setAlpha(0.55);
  }

  // ===== 챕터 인트로 (시네마틱 오프닝 카드) =====

  showChapterIntro() {
    this.isTransitioning = true;
    const container = this.add.container(0, 0);
    container.setAlpha(0);
    container.setDepth(10);

    // 가운데 어둡게
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.45);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(dim);

    // 황금 라인 위/아래
    const lineTop = this.add.graphics();
    lineTop.lineStyle(3, 0xFFD8A0, 0.85);
    lineTop.lineBetween(GAME_WIDTH / 2 - 380, GAME_HEIGHT / 2 - 140, GAME_WIDTH / 2 + 380, GAME_HEIGHT / 2 - 140);
    container.add(lineTop);

    const lineBot = this.add.graphics();
    lineBot.lineStyle(3, 0xFFD8A0, 0.85);
    lineBot.lineBetween(GAME_WIDTH / 2 - 380, GAME_HEIGHT / 2 + 140, GAME_WIDTH / 2 + 380, GAME_HEIGHT / 2 + 140);
    container.add(lineBot);

    // 챕터 라벨
    const chapter = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, CHAPTER_TITLE, {
      fontFamily: FONTS.game,
      fontSize: '54px',
      color: '#FFD8A0',
      letterSpacing: 6,
    }).setOrigin(0.5);
    container.add(chapter);

    // 챕터 부제 (메인 타이틀)
    const sub = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, CHAPTER_SUBTITLE, {
      fontFamily: FONTS.bold,
      fontSize: '96px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(sub);

    // 별 장식
    [-440, 440].forEach(ox => {
      const star = this.add.text(GAME_WIDTH / 2 + ox, GAME_HEIGHT / 2, '✦', {
        fontFamily: FONTS.bold,
        fontSize: '64px',
        color: '#FFD8A0',
      }).setOrigin(0.5);
      container.add(star);
      this.tweens.add({
        targets: star,
        angle: { from: 0, to: 360 },
        duration: 18000, repeat: -1, ease: 'Linear',
      });
    });

    // 페이드 인 → 잠시 정지 → 페이드 아웃 → 첫 슬라이드
    this.tweens.add({
      targets: container, alpha: 1,
      duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.time.delayedCall(2400, () => {
          this.tweens.add({
            targets: container, alpha: 0,
            duration: 800, ease: 'Cubic.easeIn',
            onComplete: () => {
              container.destroy();
              this.showSlide(0);
            },
          });
        });
      },
    });

    this.chapterIntro = container;
  }

  // ===== 슬라이드 =====

  showSlide(index) {
    if (index < 0) return;
    this.isTransitioning = true;

    // 사용자 피드백: 위치 X 변화 없이 cross-fade로 자연스럽게
    const prev = this.layers.current;
    if (prev) {
      this.tweens.add({
        targets: prev,
        alpha: 0,
        duration: 400, ease: 'Cubic.easeIn',
        onComplete: () => prev.destroy(),
      });
    }

    this.currentIndex = index;
    this.updateIndicator();

    // 새 슬라이드는 prev 페이드아웃 거의 끝나갈 때 시작
    this.time.delayedCall(prev ? 200 : 0, () => this.renderSlide(index));
  }

  renderSlide(index) {
    // 마지막 인덱스(스토리 수와 같음) → 엔딩
    if (index === STORIES.length) {
      this.renderEnding();
      this.isTransitioning = false;
      return;
    }

    const story = STORIES[index];
    const container = this.add.container(0, 0);    // 위치 변화 X (cross-fade)
    container.setAlpha(0);

    // ===== 배경 이미지 (Ken Burns 효과) =====
    if (this.textures.exists(story.image)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, story.image);
      const scaleX = GAME_WIDTH / bg.width;
      const scaleY = GAME_HEIGHT / bg.height;
      const baseScale = Math.max(scaleX, scaleY);
      bg.setScale(baseScale * 1.06);                // 살짝 줌인 상태로 시작
      if (story.grayscale) bg.setTint(0x9090A0);
      container.add(bg);

      // Ken Burns — 천천히 줌 아웃 + 미세 패닝
      const panDir = index % 2 === 0 ? -30 : 30;
      this.tweens.add({
        targets: bg,
        scale: baseScale,
        x: GAME_WIDTH / 2 + panDir,
        duration: 7500, ease: 'Sine.inOut',
      });
    } else {
      // ===== Fallback: 그라데이션 배경 + 토슴이 PNG =====
      const bg = this.add.graphics();
      bg.fillGradientStyle(
        story.fallbackBg.top, story.fallbackBg.top,
        story.fallbackBg.bottom, story.fallbackBg.bottom, 1
      );
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      container.add(bg);

      if (story.fallbackToseumi && this.textures.exists(story.fallbackToseumi)) {
        const toseumi = this.add.image(GAME_WIDTH / 2 - 100, GAME_HEIGHT * 0.55, story.fallbackToseumi);
        toseumi.setScale(0.9);
        if (story.grayscale) toseumi.setTint(0x888888);
        // 둥둥 효과 제거 (사용자 피드백: 어지러움)
        container.add(toseumi);
      }
    }

    // ===== 텍스트 박스 — 사이즈 고정 (2줄 모두 동일 크기) =====
    //   위치 변화 X — container와 함께 cross-fade
    const textContainer = this.add.container(0, 0);

    this.buildBubble(textContainer, story);
    container.add(textContainer);

    // ===== Cross-fade in (위치 변화 X, alpha만) =====
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 500, delay: 100, ease: 'Cubic.easeOut',
      onComplete: () => { this.isTransitioning = false; },
    });

    this.layers.current = container;
    // 자동 진행 제거 (사용자 피드백) — 사용자가 직접 클릭해야 다음
    // this.scheduleAuto();
  }

  // 말풍선 빌더 — 동화책 톤 (한 줄씩 천천히 페이드 인, 좌/우 정렬)
  buildBubble(textContainer, story) {
    const fontSize = 80;                  // 72 → 80 (사용자 피드백: 더 키움)
    const lineH = 108;                    // 96 → 108
    const lines = story.text.split('\n');

    // 정렬 — story.align='right'면 화면 우측 영역에 좌측 정렬 (각 줄 첫 글자가 같은 x)
    //   사용자 피드백: 너무 우측으로 가지 않게 살짝 좌측으로
    const isRight = story.align === 'right';
    const textX = isRight ? 1080 : 160;
    const lineOriginX = 0;                // 항상 좌측 정렬 (첫 글자 기준)

    const totalH = (lines.length - 1) * lineH + fontSize;
    const textY = GAME_HEIGHT / 2 - totalH / 2 + 20;

    // (어두운 dim 배경 제거 — 텍스트 stroke + 그림자로 가독성 보장)
    // (닉네임/언더라인 제거 — 사용자 피드백: 이야기만)

    // ===== 본문 — 줄 단위 부드럽게 페이드 인 (사용자 피드백: 더 천천히) =====
    const LINE_DELAY = 1100;         // 700 → 1100 (한 줄 충분히 음미)
    const FADE_DUR  = 1300;          // 800 → 1300 (천천히 화이트 인)

    lines.forEach((line, i) => {
      const t = this.add.text(textX, textY + i * lineH, line, {
        fontFamily: FONTS.bold,
        fontSize: `${fontSize}px`,
        color: '#FFFFFF',
        stroke: '#2C1B47',
        strokeThickness: 10,
        align: 'left',                  // 항상 좌측 (첫 글자 기준)
      }).setOrigin(lineOriginX, 0);
      t.setShadow(0, 6, '#000000', 8, false, true);
      t.setAlpha(0);
      t.setY(t.y + 12);              // 아래에서 살짝 떠오르도록 시작
      textContainer.add(t);

      this.tweens.add({
        targets: t,
        alpha: 1,
        y: textY + i * lineH,
        duration: FADE_DUR,
        delay: 200 + i * LINE_DELAY,
        ease: 'Sine.easeOut',
      });
    });

    // ===== "다음 ▶" 버튼 — 우하단 안전 영역 =====
    const nextX = GAME_WIDTH - 100;
    const nextY = GAME_HEIGHT - 90;
    const next = this.add.text(nextX, nextY, '다음 ▶', {
      fontFamily: FONTS.bold,
      fontSize: '60px',
      color: '#FFFFFF',
      stroke: '#2C1B47',
      strokeThickness: 8,
    }).setOrigin(1, 0.5);
    next.setShadow(0, 4, '#000000', 6, false, true);
    next.setAlpha(0);
    textContainer.add(next);

    // 모든 줄 페이드 끝난 후 다음 버튼 등장 + 깜박이
    const totalDelay = 200 + (lines.length - 1) * LINE_DELAY + FADE_DUR + 150;
    this.tweens.add({
      targets: next, alpha: 1,
      duration: 400, delay: totalDelay, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: next,
          alpha: { from: 0.6, to: 1 },
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
        this.tweens.add({
          targets: next,
          x: nextX + 8,
          duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      },
    });
  }

  // ===== 엔딩 (모드별 분기) =====

  renderEnding() {
    if (this.mode === 'replay') {
      // 마이룸 다시보기 모드 — 짧은 "끝" 카드 후 복귀
      this.renderReplayClosing();
    } else {
      // 첫 진입 — 타이틀 스플래시
      this.renderSplash();
    }
  }

  renderReplayClosing() {
    const container = this.add.container(80, 0);
    container.setAlpha(0);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(dim);

    const fin = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '· 끝 ·', {
      fontFamily: FONTS.bold,
      fontSize: '120px',
      color: '#FFD8E2',
    }).setOrigin(0.5);
    container.add(fin);

    const sub = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, '제 1장 — 사라진 색을 찾아서', {
      fontFamily: FONTS.game,
      fontSize: '40px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0.85);
    container.add(sub);

    this.tweens.add({
      targets: container,
      x: 0, alpha: 1,
      duration: 800, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.time.delayedCall(2200, () => this.exitToReturn());
      },
    });

    this.layers.current = container;
    this.hideControls();
  }

  renderSplash() {
    const container = this.add.container(80, 0);
    container.setAlpha(0);

    // 배경 어둡게
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.55);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    container.add(dim);

    // 보라 글로우
    const glow = this.add.graphics();
    glow.fillStyle(0x6B47A8, 0.4);
    glow.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 500);
    container.add(glow);

    // 토슴이 hero 포즈
    if (this.textures.exists('toseumi-hero')) {
      const toseumi = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.42, 'toseumi-hero');
      toseumi.setScale(0.9);
      // 둥둥 효과 제거 (사용자 피드백: 어지러움)
      container.add(toseumi);
    }

    // 게임 타이틀 — fulltitle 로고 이미지 (디바이스 언어별 자동 로드)
    if (this.textures.exists('title-full')) {
      const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.73, 'title-full');
      const tex = this.textures.get('title-full').getSourceImage();
      // 가로 1500px 기준 비례 스케일 (세로는 비율 보존)
      const targetW = 1500;
      const scale = targetW / tex.width;
      logo.setScale(scale);
      container.add(logo);
    } else {
      // 폴백: 텍스트 (로고 로딩 실패 시)
      const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.68, '🌈 레인보우 스케치북', {
        fontFamily: FONTS.bold,
        fontSize: '100px',
        color: '#FFD8E2',
      }).setOrigin(0.5);
      container.add(title);

      const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, '토슴이와 함께하는 우주 그림 놀이', {
        fontFamily: FONTS.game,
        fontSize: '46px',
        color: '#FFD93D',
      }).setOrigin(0.5);
      container.add(subtitle);
    }

    // ===== 시작하기 버튼 =====
    const btnY = GAME_HEIGHT * 0.9;
    const btnW = 480;
    const btnH = 120;
    const btnContainer = this.add.container(GAME_WIDTH / 2, btnY);

    const btnShadow = this.add.graphics();
    btnShadow.fillStyle(0x6B47A8, 1);
    btnShadow.fillRoundedRect(-btnW / 2, -btnH / 2 + 10, btnW, btnH, btnH / 2);
    btnContainer.add(btnShadow);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xB19CFF, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btnContainer.add(btnBg);

    const btnText = this.add.text(0, 0, '시작하기', {
      fontFamily: FONTS.bold,
      fontSize: '60px',
      color: '#ffffff',
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    container.add(btnContainer);

    const hit = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    btnContainer.add(hit);
    hit.on('pointerdown', () => { btnContainer.y = btnY + 6; });
    hit.on('pointerup', () => {
      btnContainer.y = btnY;
      this.startGame();
    });
    hit.on('pointerout', () => { btnContainer.y = btnY; });

    // 페이드 인
    this.tweens.add({
      targets: container,
      x: 0, alpha: 1,
      duration: 1000,
    });

    this.layers.current = container;
    this.hideControls();
  }

  startGame() {
    SaveSystem.markStorySeen();
    this.cameras.main.fadeOut(800, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }

  // 마이룸으로 복귀
  exitToReturn() {
    this.cameras.main.fadeOut(700, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MyRoomScene');
    });
  }

  // ===== 컨트롤 =====

  createSkipButton() {
    // 우상단 — 어린이 UI 원칙 (충분히 큰 버튼)
    const x = GAME_WIDTH - 200;
    const y = 80;
    const w = 280;
    const h = 88;

    const container = this.add.container(x, y);
    container.setDepth(100);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.45);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
    container.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.18);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, 0xFFFFFF, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(bg);

    const text = this.add.text(0, 0, '건너뛰기  ›', {
      fontFamily: FONTS.bold,
      fontSize: '36px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(text);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);

    // 누름 효과 (어긋남 방지)
    hit.on('pointerdown', () => { container.y = y + 4; });
    hit.on('pointerup', () => {
      container.y = y;
      this.skipToEnd();
    });
    hit.on('pointerout', () => { container.y = y; });

    // 부드러운 페이드 인
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 700, delay: 400 });

    this.skipBtn = container;
  }

  createIndicator() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 50;

    this.dots = [];
    for (let i = 0; i < STORIES.length; i++) {
      const x = cx - (STORIES.length - 1) * 16 + i * 32;
      const dot = this.add.circle(x, cy, 7, 0xffffff, 0.3);
      dot.setDepth(100);
      this.dots.push(dot);
    }
    this.updateIndicator();
  }

  updateIndicator() {
    if (!this.dots) return;
    this.dots.forEach((dot, i) => {
      if (i === this.currentIndex) {
        dot.fillColor = 0xFFD93D;
        dot.setRadius(10);
      } else {
        dot.fillColor = 0xffffff;
        dot.alpha = 0.3;
        dot.setRadius(7);
      }
    });
  }

  hideControls() {
    if (this.skipBtn) this.skipBtn.setVisible(false);
    this.dots?.forEach(d => d.setVisible(false));
  }

  // ===== 자동 진행 =====

  scheduleAuto() {
    if (this.autoTimer) {
      this.autoTimer.remove();
      this.autoTimer = null;
    }
    if (this.currentIndex >= STORIES.length) return;
    const duration = STORIES[this.currentIndex].duration || 7000;
    this.autoTimer = this.time.delayedCall(duration, () => this.nextSlide());
  }

  nextSlide() {
    if (this.isTransitioning) return;
    if (this.currentIndex < STORIES.length) {
      this.showSlide(this.currentIndex + 1);
    }
  }

  prevSlide() {
    if (this.isTransitioning) return;
    if (this.currentIndex > 0) {
      this.showSlide(this.currentIndex - 1);
    }
  }

  skipToEnd() {
    if (this.isTransitioning && this.currentIndex < 0) {
      // 챕터 인트로 중에 스킵 — 인트로 즉시 제거
      if (this.chapterIntro) {
        this.tweens.killTweensOf(this.chapterIntro);
        this.chapterIntro.destroy();
        this.chapterIntro = null;
      }
      this.isTransitioning = false;
    }
    if (this.mode === 'replay') {
      this.exitToReturn();
    } else {
      this.showSlide(STORIES.length);   // 스플래시
    }
  }
}
