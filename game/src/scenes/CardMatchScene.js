// 🃏 CardMatchScene — 카드 맞추기 미니게임 (5~8세 어린이 친화)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { ToseumiGuide } from '../systems/ToseumiGuide.js';
import { showRewardPopup } from '../ui/RewardPopup.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { makeSpeechBubble } from '../ui/SpeechBubble.js';
import { soundManager } from '../systems/SoundManager.js';
import { CARD_FRONTS } from './BootScene.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

// 카드 풀 (CARD_FRONTS 파일명 = 키, public/cards/{name}.png)
// 매 게임 6쌍 랜덤 픽업 — 40장 풀에서 다양성 확보
const CARD_KEYS = [...CARD_FRONTS];

const DIFFICULTY = {
  pairs: 6,
  timeLimit: 90,
};

export default class CardMatchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CardMatchScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-memory-1')) this.load.audio('bgm-memory-1', 'sounds/bgm/memory-1.mp3');
    if (!this.cache.audio.has('bgm-memory-2')) this.load.audio('bgm-memory-2', 'sounds/bgm/memory-2.mp3');
  }

  create() {
    this.cameras.main.fadeIn(600, 15, 8, 32);
    soundManager.attachScene(this);
    // 메모리 BGM 롤링 — 볼륨 살짝 높임 (사용자 피드백: 다른 BGM보다 작음)
    soundManager.playBGM(['bgm-memory-1', 'bgm-memory-2'], { volume: 0.30 });

    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = DIFFICULTY.pairs;
    this.timeLeft = DIFFICULTY.timeLimit;
    this.isInteractable = false;
    this.gameStartTime = 0;

    this.createBackground();
    this.createUI();
    this.layoutCards();
    // 인트로 모달 → 시작 버튼 클릭 시 카운트다운 + 게임 시작
    this.showIntro(() => this.startGame());
  }

  // ===== 인트로 모달 — 룰 안내 + 시작 버튼 (어린이 페이스 조절) =====
  showIntro(onDone) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 어두운 오버레이
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);
    overlay.setDepth(1000);
    overlay.setInteractive();

    // 큰 안내 (한 줄, 흰색)
    const text = this.add.text(cx, cy - 80, '잘 기억하고 같은 그림을 맞춰보자!', {
      fontFamily: FONTS.bold,
      fontSize: '76px',
      color: '#FFFFFF',
      align: 'center',
    }).setOrigin(0.5);
    text.setDepth(1001);

    // 시작 버튼 — 깔끔한 ellipse 광택
    const btnContainer = this._makeStartButton(cx, cy + 100, () => {
      soundManager.play('pop');
      this.tweens.add({
        targets: [overlay, text, btnContainer], alpha: 0,
        duration: 350, ease: 'Cubic.easeIn',
        onComplete: () => {
          overlay.destroy(); text.destroy(); btnContainer.destroy();
          if (onDone) onDone();
        },
      });
    });
    btnContainer.setDepth(1001);

    // 페이드 인
    overlay.setAlpha(0);
    text.setAlpha(0);
    btnContainer.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: [text, btnContainer], alpha: 1,
      duration: 500, delay: 150, ease: 'Cubic.easeOut',
    });
  }

  // ===== 시작 버튼 (깔끔한 그라디언트 — 광택 도형 X, 위→아래 톤 변화) =====
  _makeStartButton(x, y, onClick) {
    const w = 360, h = 130;
    const container = this.add.container(x, y);

    const g = this.add.graphics();
    // 그림자
    g.fillStyle(0x3D8870, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, h / 2);
    // 본체 (수직 그라디언트 — 위 밝은 민트 → 아래 진한 민트)
    g.fillGradientStyle(0xA0E5D0, 0xA0E5D0, 0x6FCAB2, 0x6FCAB2, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    // 외곽선 (살짝)
    g.lineStyle(3, 0x4FA088, 0.6);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(g);

    const text = this.add.text(0, 0, '시작', {
      fontFamily: FONTS.bold,
      fontSize: '64px',
      color: '#FFFFFF',
      stroke: '#3D8870',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(text);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    container._defaultY = y;
    hit.on('pointerdown', () => { container.y = y + 6; });
    hit.on('pointerout', () => { container.y = y; });
    hit.on('pointerup', () => {
      container.y = y;
      if (onClick) onClick();
    });
    return container;
  }

  createBackground() {
    // ===== 배경 이미지 (사용자 자산) + 어두운 썬팅 =====
    if (this.textures.exists('bg-memory')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-memory');
      // 화면 가득 채우기 (cover)
      const bgScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(bgScale);

      // 어두운 썬팅 (게임 요소 가독성 ↑)
      const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.42);
      dim.setDepth(0);
    } else {
      // fallback: 기존 그라데이션
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x4A2D6E, 0x4A2D6E, 0x2C1B47, 0x2C1B47, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // 부드러운 별빛
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(1, 2.5);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.7));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.7 },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createUI() {
    // ===== 타이머 (좌상단, 표준 사이즈 220×100 — 나가기 버튼과 동일) =====
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
    makeFancyTitle(this, GAME_WIDTH / 2, 90, '메모리 게임');

    // 우상단 표준 나가기 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToMain());

    // ===== 진행도 (좌하단, 박스 X — 텍스트만 흰색 + 그림자, 사용자 피드백) =====
    const progX = 200;
    const progY = GAME_HEIGHT - 70;   // 1010

    this.progressText = this.add.text(progX, progY, `0 / ${this.totalPairs} 짝`, {
      fontFamily: FONTS.bold,
      fontSize: '64px',               // 박스가 빠진 만큼 살짝 ↑
      color: '#FFFFFF',               // 흰색 (배경 위에 또렷)
    }).setOrigin(0.5);

    // 토슴이 (좌측 영역 가운데 + 메모리 게임 전용 PNG)
    const toseumiKey = this.textures.exists('toseumi-memory') ? 'toseumi-memory'
                     : this.textures.exists('toseumi-fun')    ? 'toseumi-fun'
                     : 'toseumi-default';
    this.toseumi = this.add.image(440, 640, toseumiKey);
    this.toseumi.setScale(0.6);   // 0.7 → 0.6 (사용자 피드백: 살짝 줄임)
  }

  layoutCards() {
    // ✅ CARD_KEYS(17종) 중 totalPairs(6)종 랜덤 선택, 각 2장씩 → 12장 deck → 셔플
    const pickedKeys = Phaser.Utils.Array.Shuffle([...CARD_KEYS]).slice(0, this.totalPairs);
    const deck = [];
    pickedKeys.forEach(key => {
      deck.push({ key, id: key });
      deck.push({ key, id: key });
    });
    Phaser.Utils.Array.Shuffle(deck);

    // ✅ 카드 사이즈 키움 + 왼쪽/아래로 확장 (안쪽 그림은 고정 — _makeStartButton 참고)
    const cols = 4;
    const rows = 3;
    const cardW = 200;       // 183 → 200 (가로 확장)
    const cardH = 252;       // 244 → 252 (세로 확장)
    const gapX = 28;
    const gapY = 18;
    // 그리드를 왼쪽으로 시프트 (startX 명시 지정, 토슴이와 90px 여유)
    const startX = 850;
    // 카드 top — 위치 유지 (타이머와 35px 여백)
    const startY = 180 + cardH / 2;

    deck.forEach((cardData, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const card = this.createCard(x, y, cardData, cardW, cardH);
      this.cards.push(card);
    });
  }

  createCard(x, y, data, w, h) {
    const container = this.add.container(x, y);

    // ===== 라운드 프레임 사양 — 카드 풀 사이즈 + 얇은 흰 라인 =====
    // PNG에 SVG 마스크로 라운드 코너 베이크 완료 → 검정 잔여물 0
    // FRAME_RADIUS 20px는 PNG 베이크된 라운드(110/1122 ≈ 19.6) 매칭
    const FRAME_RADIUS = 20;
    const FRAME_STROKE = 4;          // 7 → 4 (얇게)

    // ===== 뒷면 — PNG 풀 사이즈 + 얇은 흰 라인 =====
    const back = this.add.image(0, 0, 'card-back');
    back.setDisplaySize(w, h);                                              // 셀 가득 — 검정 코너 없음
    container.add(back);

    const backOutline = this.add.graphics();
    backOutline.lineStyle(FRAME_STROKE, 0xFFFFFF, 1);                       // 얇은 흰 라인
    backOutline.strokeRoundedRect(-w / 2, -h / 2, w, h, FRAME_RADIUS);
    container.add(backOutline);

    // ===== 앞면 — 흰 본체 + 얇은 핑크 라인 =====
    const front = this.add.graphics();
    front.fillStyle(0xFFFAF5, 1);
    front.fillRoundedRect(-w / 2, -h / 2, w, h, FRAME_RADIUS);
    front.lineStyle(FRAME_STROKE, 0xFFB6C8, 1);                             // 얇은 핑크 라인
    front.strokeRoundedRect(-w / 2, -h / 2, w, h, FRAME_RADIUS);
    front.setVisible(false);
    container.add(front);

    // 카드 안 그림
    // 카드 안 그림 — 고정 사이즈 (카드 외형이 커져도 그림은 여전히 적당한 크기)
    const frontIcon = this.add.image(0, 0, data.key);
    const ICON_TARGET = 165;          // 카드 내부 그림 고정 디스플레이 크기 (px)
    const iconScale = Math.min(ICON_TARGET / frontIcon.width, ICON_TARGET / frontIcon.height);
    frontIcon.setScale(iconScale);
    frontIcon.setVisible(false);
    container.add(frontIcon);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);

    const card = {
      container, hit,
      back,
      front, frontIcon,
      // 호환성 위해 빈 객체 (코드의 다른 곳에서 참조 시 안전)
      backIcon: null,
      frontLabel: null,
      id: data.id,
      data,
      isFlipped: false,
      isMatched: false,
    };

    hit.on('pointerup', () => this.onCardClick(card));
    return card;
  }

  startGame() {
    this.showToseumiSpeech('카드를 잘 봐~ 👀');

    this.time.delayedCall(1800, () => {
      this.cards.forEach(card => this.flipCardVisual(card, true));

      this.time.delayedCall(700, () => {
        this.showToseumiSpeech('잘 외웠어? 🤔');
      });

      // 사용자 피드백: 카드는 카운트다운(3,2,1,시작!) 동안 계속 보여줘야 함
      // → 어린이가 외울 시간 충분히 (메모리 + 카운트다운 = 7초+)
      this.time.delayedCall(3000, () => {
        // 카드 face-up 상태로 카운트다운 시작
        this.showCountdown(() => {
          // "시작!" 끝나면 카드 뒤집기 (500ms 애니)
          this.cards.forEach(card => this.flipCardVisual(card, false));

          // 뒤집기 애니 끝난 후 게임 시작
          this.time.delayedCall(600, () => {
            this.isInteractable = true;
            this.gameStartTime = this.time.now;
            this.startTimer();
            this.showToseumiSpeech('같은 그림이 어디 있을까?');
          });
        });
      });
    });
  }

  // ✅ 카운트다운 — Star Catch와 100% 동일 (효과 X, 폰트/사이즈 그대로)
  showCountdown(onDone) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const numbers = ['3', '2', '1', '시작!'];
    let idx = 0;

    const showNext = () => {
      if (idx >= numbers.length) {
        if (onDone) onDone();
        return;
      }
      const num = this.add.text(cx, cy, numbers[idx], {
        fontFamily: FONTS.bold,
        fontSize: '240px',
        color: '#FFD93D',
      }).setOrigin(0.5);
      num.setScale(0);
      // 카운트다운 사운드 — 마지막 "시작!"은 강한 톤
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

  startTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 10) this.timerText.setColor('#FF6B9D');
        if (this.timeLeft <= 0) this.onTimeUp();
      },
      loop: true,
    });
  }

  onCardClick(card) {
    if (!this.isInteractable) return;
    if (card.isFlipped || card.isMatched) return;
    if (this.flippedCards.length >= 2) return;

    soundManager.play('click');               // 카드 뒤집는 소리
    this.flipCardVisual(card, true);
    this.flippedCards.push(card);

    if (this.flippedCards.length === 2) {
      this.isInteractable = false;
      // 일치 시 빠르게 감지 (다음 카드 빨리 누를 수 있게), 불일치 시 어린이 비교 시간 충분히
      const isMatch = this.flippedCards[0].id === this.flippedCards[1].id;
      const wait = isMatch ? 400 : 1200;
      this.time.delayedCall(wait, () => this.checkMatch());
    }
  }

  flipCardVisual(card, showFront) {
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 250,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        card.isFlipped = showFront;
        card.back.setVisible(!showFront);
        if (card.backIcon)    card.backIcon.setVisible(!showFront);
        card.front.setVisible(showFront);
        card.frontIcon.setVisible(showFront);
        if (card.frontLabel)  card.frontLabel.setVisible(showFront);
        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          duration: 250,
          ease: 'Cubic.easeOut',
        });
      },
    });
  }

  checkMatch() {
    const [c1, c2] = this.flippedCards;
    if (c1.id === c2.id) {
      c1.isMatched = true;
      c2.isMatched = true;
      this.matchedPairs++;
      this.progressText.setText(`${this.matchedPairs} / ${this.totalPairs} 쌍`);
      soundManager.play('match');             // 매칭 성공 — 도-미 톤

      [c1, c2].forEach(card => {
        const cx0 = card.container.x;
        const cy0 = card.container.y;

        // 배경 글로우 (옅은 골드 원)
        const burst = this.add.circle(cx0, cy0, 100, 0xFFD93D, 0.5);
        this.tweens.add({
          targets: burst,
          scale: { from: 0.3, to: 2 },
          alpha: 0,
          duration: 600,
          onComplete: () => burst.destroy(),
        });

        // ✨ 별가루 12방향 (디테일 ↑)
        const colors = ['#FFD93D', '#FFE066', '#FF6B9D', '#7FD8C0'];
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const distance = Phaser.Math.Between(80, 140);
          const sparkle = this.add.text(cx0, cy0, '✦', {
            fontFamily: FONTS.bold,
            fontSize: `${Phaser.Math.Between(20, 36)}px`,
            color: colors[i % colors.length],
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: sparkle,
            x: cx0 + Math.cos(angle) * distance,
            y: cy0 + Math.sin(angle) * distance,
            alpha: 0,
            scale: 0.3,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => sparkle.destroy(),
          });
        }

        card.hit.disableInteractive();
        this.tweens.add({
          targets: card.container,
          y: cy0 - 30,
          alpha: 0,
          scale: 1.2,
          duration: 400,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            card.container.setVisible(false);
            card.container.destroy();
          },
        });
      });

      this.showToseumiSpeech(ToseumiGuide.getMessage('card_matched'));

      this.flippedCards = [];
      this.isInteractable = true;

      if (this.matchedPairs >= this.totalPairs) {
        this.onWin();
      }
    } else {
      // 매칭 실패 — 격려 멘트 (부정 X, 다시 해봐요 톤)
      this.showToseumiSpeech(ToseumiGuide.getMessage('card_wrong'));
      this.time.delayedCall(500, () => {
        this.flipCardVisual(c1, false);
        this.flipCardVisual(c2, false);
        this.flippedCards = [];
        this.isInteractable = true;
      });
    }
  }

  // ===== 토슴이 말풍선 (튕김 X, 부드러운 페이드, 큰 텍스트) =====
  showToseumiSpeech(message) {
    if (!this.toseumi) return;

    if (this.activeBubble) {
      this.activeBubble.bg.destroy();
      this.activeBubble.text.destroy();
    }

    // 말풍선 — 좌우 살짝 줄임 (사용자 피드백)
    const x = this.toseumi.x;
    const y = this.toseumi.y - 380;
    const w = 540;                    // 600 → 540
    const h = 140;

    const bg = makeSpeechBubble(this, x, y, w, h, {
      tailDirection: 'down',
    });

    // 한 줄 강제 + 폭 초과 시 폰트 자동 축소 (사용자 피드백: 2줄 X)
    const TARGET_FONT = 48;
    const MIN_FONT = 32;
    const MAX_TEXT_W = w - 40;
    const text = this.add.text(x, y, message, {
      fontFamily: FONTS.game,
      fontSize: `${TARGET_FONT}px`,
      color: '#5A2A40',
      align: 'center',
    }).setOrigin(0.5);
    if (text.width > MAX_TEXT_W) {
      const scale = MAX_TEXT_W / text.width;
      text.setFontSize(Math.max(MIN_FONT, Math.floor(TARGET_FONT * scale)));
    }

    // 부드러운 페이드 인
    bg.setAlpha(0);
    text.setAlpha(0);
    this.tweens.add({
      targets: [bg, text],
      alpha: 1,
      duration: 280,
      ease: 'Cubic.easeOut',
    });

    this.activeBubble = { bg, text };

    this.time.delayedCall(2500, () => {
      if (this.activeBubble && this.activeBubble.bg === bg) {
        this.tweens.add({
          targets: [bg, text],
          alpha: 0,
          duration: 280,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            bg.destroy();
            text.destroy();
            if (this.activeBubble && this.activeBubble.bg === bg) {
              this.activeBubble = null;
            }
          },
        });
      }
    });
  }

  onWin() {
    this.isInteractable = false;
    this.timerEvent?.remove();
    soundManager.play('fanfare');             // 게임 완료 — 도-미-솔-도

    const timeUsed = (this.time.now - this.gameStartTime) / 1000;
    SaveSystem.incStat('cardMatchPlays');

    const tier = RewardSystem.decideCardMatchReward(timeUsed, DIFFICULTY.timeLimit);
    const reward = RewardSystem.grant(tier);

    this.time.delayedCall(1000, () => {
      showRewardPopup(this, reward, () => this.exitToMain());
    });
  }

  // ===== 시간 종료: 바로 "아쉬워요" 다이얼로그 (참가 보상 안에 작게) =====
  onTimeUp() {
    this.isInteractable = false;
    this.timerEvent?.remove();
    SaveSystem.incStat('cardMatchPlays');

    // ✅ showRewardPopup 호출 X — 바로 다이얼로그
    // 참가 보상은 다이얼로그 안에 작게 표시
    const reward = RewardSystem.grant('common');
    this.time.delayedCall(500, () => {
      this.showRetryDialog(reward);
    });
  }

  // ===== 다시 도전 다이얼로그 (참가 보상 작게 + 큰 버튼 2개) =====
  showRetryDialog(participationReward) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const root = this.add.container(0, 0);
    root.setDepth(1000);

    // 어두운 배경
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65);
    root.add(overlay);

    // 패널 (큰 사이즈)
    const panelW = 1100;
    const panelH = 700;
    const panel = this.add.graphics();
    panel.fillStyle(0xFFF4F7, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    panel.lineStyle(8, 0xFFB6C8, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    root.add(panel);

    // 토슴이 우는 표정 (왼쪽) — 실패 팝업 공통 (미니게임 전체 통일)
    const failKey = this.textures.exists('toseumi-sad') ? 'toseumi-sad' : 'toseumi-default';
    if (this.textures.exists(failKey)) {
      const toseumi = this.add.image(cx - 350, cy - 80, failKey);
      toseumi.setScale(0.45);
      root.add(toseumi);
    }

    // 큰 메시지
    const title = this.add.text(cx + 80, cy - 220, '아쉬워!', {
      fontFamily: FONTS.bold,
      fontSize: '88px',
      color: '#FF6B9D',
      stroke: '#FFFFFF',
      strokeThickness: 8,
    }).setOrigin(0.5);
    root.add(title);

    const subtitle = this.add.text(cx + 80, cy - 110, '다시 해볼래?', {
      fontFamily: FONTS.game,
      fontSize: '68px',                 // 52 → 68 (사용자 피드백: 더 크게)
      color: '#5A2A40',
    }).setOrigin(0.5);
    root.add(subtitle);

    // 참가 보상 (작게, 다이얼로그 안에)
    if (participationReward && participationReward.items.length > 0) {
      const item = participationReward.items[0];
      const rewardLabel = this.add.text(cx + 80, cy - 30, '참가 보상 ✨', {
        fontFamily: FONTS.bold,
        fontSize: '32px',
        color: '#7FD8C0',
      }).setOrigin(0.5);
      root.add(rewardLabel);

      if (item.type === 'color') {
        // 작은 크레파스 + 색이름
        const rewardX = cx + 80;
        const rewardY = cy + 30;

        const c = Phaser.Display.Color.HexStringToColor(item.hex).color;
        const dark = Phaser.Display.Color.IntegerToColor(c).darken(25).color;

        // 작은 크레파스
        const crayonBg = this.add.graphics();
        crayonBg.fillStyle(c, 1);
        crayonBg.fillRoundedRect(rewardX - 22, rewardY - 32, 44, 64, 8);
        crayonBg.lineStyle(2, dark, 1);
        crayonBg.strokeRoundedRect(rewardX - 22, rewardY - 32, 44, 64, 8);
        root.add(crayonBg);

        const tip = this.add.graphics();
        tip.fillStyle(dark, 1);
        tip.fillTriangle(rewardX - 18, rewardY - 32, rewardX + 18, rewardY - 32, rewardX, rewardY - 50);
        root.add(tip);

        // 이름
        const nameText = this.add.text(rewardX, rewardY + 70, item.name, {
          fontFamily: FONTS.bold,
          fontSize: '36px',
          color: '#5A2A40',
        }).setOrigin(0.5);
        root.add(nameText);
      }
    }

    // ===== 다시 도전 / 메인으로 (큰 버튼) =====
    const btnY = cy + 190;
    const retryBtn = this.makeBigButton(cx - 220, btnY, 380, 130, 0x7FD8C0, 0x4FA088, '🔄 다시 도전', '#ffffff', () => {
      root.destroy();
      this.scene.restart();
    });
    root.add(retryBtn);

    const homeBtn = this.makeBigButton(cx + 220, btnY, 380, 130, 0xFFB6C8, 0xC66888, '🏠 홈으로', '#ffffff', () => {
      root.destroy();
      this.exitToMain();
    });
    root.add(homeBtn);

    // 부드러운 등장 (튕김 X)
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 400, ease: 'Cubic.easeOut' });
  }

  // ===== 상단 바 버튼 (이모지 + 라벨, 게임 버튼 스타일) =====
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

    // 이모지 + 라벨 (가로 배치, 큰 사이즈)
    const eText = this.add.text(-w / 2 + 48, 0, emoji, {
      fontFamily: FONTS.game, fontSize: '54px',
    }).setOrigin(0.5);
    container.add(eText);

    const lText = this.add.text(20, 0, label, {
      fontFamily: FONTS.bold, fontSize: '54px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(lText);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 4; });
    hit.on('pointerup', () => { container.y = y; if (onClick) onClick(); });
    hit.on('pointerout', () => { container.y = y; });
    return container;
  }

  // ===== 큰 버튼 (Container로 묶어서 어긋남 방지) =====
  makeBigButton(x, y, w, h, color, shadow, label, textColor, onClick) {
    const container = this.add.container(x, y);

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(shadow, 1);
    sh.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, h / 2);
    container.add(sh);

    // 버튼 본체
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(btn);

    // 텍스트 (큰 사이즈 + 그림자 — 흰 텍스트 가독성)
    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.bold,
      fontSize: '56px',
      color: textColor,
    }).setOrigin(0.5);
    container.add(text);

    // 인터랙션 (Container 단위로 누름 효과 — 어긋남 X)
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 6; });
    hit.on('pointerup', () => {
      container.y = y;
      if (onClick) onClick();
    });
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
