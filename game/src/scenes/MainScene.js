// 🏠 MainScene — 메인 화면 (v1.2 리디자인)
// 변경: 토슴이 핑크 톤앤매너, 실제 에셋 카드 일러스트, 서브텍스트 제거, 말풍선 수정
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';
import { getLobbyLines } from '../i18n/index.js';

// ─── 카드 치수 ──────────────────────────────────────
const CW   = 340;   // 카드 너비 (360→340, 우측 여백 확보)
const CH   = 530;   // 카드 높이 (500→530, 토슴이 발 높이 정렬)
const BARH = 80;    // 하단 레이블 바
const ILLH = CH - BARH;   // 일러스트 영역 450px
const CR   = 24;    // 모서리 반경

// 레이아웃: 토슴이 영역 x=0~460 / 카드 영역 x=460~1920
// 4장 × 340 + 간격 3개 × 20 = 1420 / 좌우 40px 내부 여백 포함
const CARD_GAP   = 20;
const CARD_START = 460;   // 첫 카드 좌측 엣지 (40px 내부 여백)

// 비비드(쨍) 톤 + 파스텔 그라데이션 결합 (대표님 톤 강화 요청)
//   illBg / illBg2: 파스텔 살짝 채도 ↑
//   barLight / barBg / barSh: 비비드 채도 90%+ (어린이 시선 끌기)
const CARDS = [
  { label:'색칠놀이',  scene:'TemplateSelectScene', illBg:0xB5E5F8, illBg2:0x7FCEEC, barLight:0x33A8FF, barBg:0x0080FF, barSh:0x0050B8, ill:'coloring', tex:'menu-card-coloring' },
  { label:'그림그리기', scene:'SketchScene',         illBg:0xFFD0DC, illBg2:0xFCABC3, barLight:0xFF6FA8, barBg:0xFF1F8B, barSh:0xB0185C, ill:'drawing',  tex:'menu-card-drawing'  },
  { label:'내 작품',   scene:'GalleryScene',        illBg:0xFFEFA0, illBg2:0xFFE268, barLight:0xFFB138, barBg:0xFF8800, barSh:0xC45A00, ill:'gallery',  tex:'menu-card-gallery'  },
  { label:'스토리',    scene:'MyRoomScene',          illBg:0xDCC8F2, illBg2:0xB898E5, barLight:0xB870F8, barBg:0x8030EC, barSh:0x4D1A9C, ill:'story',    tex:'menu-card-story'    },
];

export default class MainScene extends Phaser.Scene {
  constructor() { super({ key: 'MainScene' }); }

  create() {
    this.cameras.main.fadeIn(650, 26, 15, 62);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-lobby-1', 'bgm-lobby-2']);

    this._bg();
    this._topBar();
    this._toseumi();
    this._cards();

    this.add.text(8, GAME_HEIGHT - 22, 'v1.0', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9A7AAA',
    }).setAlpha(0.32).setDepth(1);
  }

  // ══════════════════════════════════════════════════
  // 배경 — 파스텔 우주 일러스트(bg-rps 재사용) + 톤다운
  // 베이스(어두운 보라) → bg-rps(알파 0.62) → 다크 오버레이(0.22)
  // ══════════════════════════════════════════════════
  _bg() {
    // 어두운 베이스 (자산 없을 때 fallback + 톤다운 베이스 역할)
    const sky = this.add.graphics();
    sky.fillStyle(0x1A0F3E, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 메인 배경 이미지 (RPS 씬과 동일 자산 재사용)
    if (this.textures.exists('bg-rps')) {
      const bg  = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-rps');
      const src = this.textures.get('bg-rps').getSourceImage();
      if (src && src.width) {
        const s = Math.max(GAME_WIDTH / src.width, GAME_HEIGHT / src.height);
        bg.setScale(s);
      }
      bg.setAlpha(0.62);
    } else {
      this._bgFallback();   // 자산 누락 시 별빛 폴백
    }

    // 다크 오버레이 (전체 톤다운 — 카드/토슴이 가독성 확보)
    const ov = this.add.graphics();
    ov.fillStyle(0x1A0F3E, 0.22);
    ov.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 은은한 반짝 별 이펙트 (배경 PNG 위에 36개, 의사난수 고정)
    this._twinkleStars(36);

    // 가끔씩 우주선 + 외계인 등장 (어린이 발견 재미)
    this._flyingObjects();
  }

  // ══════════════════════════════════════════════════
  // 우주선 + 외계인 등장 시스템
  //   - UFO: 38초 주기, 좌↔우 가로지름 (Graphics 직접 그림)
  //   - 외계인: 72초 주기, 둥실 가로지름 (villain-alien-normal PNG)
  // ══════════════════════════════════════════════════
  _flyingObjects() {
    // 첫 등장: 새로고침 후 빠르게 확인
    this.time.delayedCall(7000,  () => this._spawnUFO());
    this.time.delayedCall(15000, () => this._spawnShootingStar());

    // UFO (32% 확률로 멈춤+외계인 강하 모드)
    this._ufoTimer = this.time.addEvent({
      delay: 36000, loop: true, callback: () => this._spawnUFO(),
    });
    // 별똥별 (UFO와 다른 주기 → 시간차 분리)
    this._starTimer = this.time.addEvent({
      delay: 22000, loop: true, callback: () => this._spawnShootingStar(),
    });

    // 씬 종료 시 타이머 정리 (메모리 누수 방지)
    const cleanup = () => {
      this._ufoTimer?.remove();
      this._starTimer?.remove();
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy',  cleanup);
  }

  // UFO Graphics 그리기 (원점 (0,0) 기준)
  _drawUFO(g) {
    // 본체 바닥 그림자 (살짝 짙은 회색)
    g.fillStyle(0x5E7290, 0.85);
    g.fillEllipse(0, 6, 122, 22);
    // 본체 (은색 메탈)
    g.fillStyle(0xC0CFE0, 1);
    g.fillEllipse(0, 0, 128, 38);
    // 본체 하이라이트
    g.fillStyle(0xFFFFFF, 0.45);
    g.fillEllipse(-20, -8, 40, 8);
    // 돔 (하늘 유리)
    g.fillStyle(0x80C8F0, 0.92);
    g.fillEllipse(0, -16, 62, 38);
    // 돔 하이라이트
    g.fillStyle(0xFFFFFF, 0.55);
    g.fillEllipse(-12, -22, 16, 10);
    // 창문 3개 (노란 빛)
    [-30, 0, 30].forEach(dx => {
      g.fillStyle(0xFFE066, 1);
      g.fillCircle(dx, 2, 5);
      g.fillStyle(0xFFFFFF, 0.6);
      g.fillCircle(dx - 1.5, 0.5, 1.6);
    });
    // 하단 빛 빔 (사다리꼴 알파)
    g.fillStyle(0xFFF0A0, 0.18);
    g.fillTriangle(-22, 18, 22, 18, 38, 90);
    g.fillTriangle(-22, 18, -38, 90, 38, 90);
  }

  // UFO 생성 헬퍼 (포즈/방향만 세팅, 트윈은 호출자가 결정)
  _makeUFO(x, y, dir) {
    const ufo = this.add.graphics().setDepth(2);
    this._drawUFO(ufo);
    ufo.x = x;
    ufo.y = y;
    ufo.scaleX = dir;
    ufo.setAlpha(0);
    return ufo;
  }

  _spawnUFO() {
    const dir = Phaser.Math.RND.pick([-1, 1]);
    const startX = dir > 0 ? -140 : GAME_WIDTH + 140;
    const endX   = dir > 0 ? GAME_WIDTH + 140 : -140;
    const dropMode = Math.random() < 0.32;   // 32% 확률로 드랍 모드

    if (dropMode) {
      // ── 멈춤 + 3개 아이템 드랍 모드 ──
      const stopX = Phaser.Math.Between(GAME_WIDTH * 0.34, GAME_WIDTH * 0.66);
      const stopY = Phaser.Math.Between(180, 230);
      const ufo = this._makeUFO(startX, stopY, dir);

      this.tweens.add({
        targets: ufo, alpha: 0.92, duration: 700, ease: 'Sine.easeOut',
      });
      const bobTween = this.tweens.add({
        targets: ufo, y: stopY + 8,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // 1) 멈춤 위치까지 진입 (5초)
      this.tweens.add({
        targets: ufo, x: stopX,
        duration: 5000, ease: 'Sine.easeOut',
        onComplete: () => {
          // 2) 0.9초 후 외계인 강하
          this.time.delayedCall(900, () => this._dropAlien(ufo));
          // 3) 외계인 시퀀스 + UFO 회수 끝나는 타이밍에 UFO 출발
          //    외계인 시퀀스: 2500(낙하) + 1400(삐리삐리뽀) + 2200(회수) = 6100ms
          this.time.delayedCall(7800, () => {
            bobTween.stop();
            this.tweens.add({
              targets: ufo, x: endX,
              duration: 3500, ease: 'Sine.easeIn',
              onComplete: () => ufo.destroy(),
            });
          });
        },
      });
    } else {
      // ── 일반 가로지름 모드 ──
      const y = Phaser.Math.Between(140, 360);
      const ufo = this._makeUFO(startX, y, dir);

      this.tweens.add({
        targets: ufo, alpha: 0.92, duration: 800, ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: ufo, x: endX,
        duration: 18000, ease: 'Sine.easeInOut',
        onComplete: () => ufo.destroy(),
      });
      this.tweens.add({
        targets: ufo, y: y + 16,
        duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // UFO 빛 빔 안에서 외계인이 천천히 강하 → 삐리삐리뽀 효과 → 천천히 회수
  //   사용자 피드백: 외계인 단독 + 기존 PNG 사용 + 작게 + 삐리삐리뽀 + 천천히
  _dropAlien(ufo) {
    const key = 'villain-alien-normal';
    if (!this.textures.exists(key) || !ufo || !ufo.active) return;

    const startX = ufo.x;
    const startY = ufo.y + 14;
    const alien = this.add.image(startX, startY, key).setDepth(2);
    alien.setScale(0.03);    // 매우 작게 시작 (UFO 안에서 막 나오는 듯)
    alien.setAlpha(0);

    const dropY = ufo.y + 220;
    const targetScale = 0.15;   // 사용자 피드백: "사이즈를 작게" (기존 0.22 → 0.15)

    // 1단계: 천천히 강하 (2.5초)
    this.tweens.add({
      targets: alien, alpha: 0.95, scale: targetScale, y: dropY,
      duration: 2500, ease: 'Sine.easeOut',
      onComplete: () => {
        // 2단계: 삐리삐리뽀 효과 (1.4초)
        //   - 외계인 주변 동심원 펄스 3개 (스캔/통신 효과)
        //   - 작은 노란 점 점멸 (반짝이)
        //   - 외계인 살짝 둥실
        this._emitBeepBeepEffect(alien.x, dropY);
        this.tweens.add({
          targets: alien, y: dropY - 8,
          duration: 350, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
        });
        // 3단계: 1.4초 후 천천히 회수 (UFO 위치 추적)
        this.time.delayedCall(1400, () => {
          if (!alien.active) return;
          const recallX = ufo.active ? ufo.x : startX;
          const recallY = ufo.active ? ufo.y + 14 : startY;
          this.tweens.add({
            targets: alien, alpha: 0, scale: 0.03, x: recallX, y: recallY,
            duration: 2200, ease: 'Sine.easeIn',     // 천천히 (이전 900 → 2200)
            onComplete: () => alien.destroy(),
          });
        });
      },
    });
  }

  // 삐리삐리뽀 효과 — 외계인 주변에 동심원 펄스 + 반짝이 점멸 (스캔/통신 느낌)
  _emitBeepBeepEffect(x, y) {
    // 동심원 펄스 3개 (시차 두고 확장)
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 280, () => {
        const ring = this.add.graphics().setDepth(3);
        ring.lineStyle(3, 0xFFE066, 0.75);
        ring.strokeCircle(0, 0, 12);
        ring.x = x;
        ring.y = y;
        this.tweens.add({
          targets: ring,
          scaleX: 4.5, scaleY: 4.5, alpha: 0,
          duration: 900, ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
      });
    }
    // 반짝이 점 8개 (외계인 주위 둥글게 배치, 시차 점멸)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = 50 + Math.random() * 25;
      const sx = x + Math.cos(angle) * r;
      const sy = y + Math.sin(angle) * r;
      const dot = this.add.circle(sx, sy, 3 + Math.random() * 2, 0xFFE066, 0).setDepth(3);
      this.tweens.add({
        targets: dot,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1.4 },
        duration: 280, yoyo: true, repeat: 1,
        delay: i * 70 + Math.random() * 150,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // 별똥별 — 좌상→우하 방향, 위치/길이/속도 다양화, 색은 옅게 (사용자 피드백)
  //   - 같은 자리에서 반복 → 시작 위치를 화면 상단 전체로 분산
  //   - 색이 너무 밝음 → 노란 톤 옅게 (알파 / 채도 ↓)
  //   - 길이 너무 길음 → 짧은 별똥별 / 긴 별똥별 랜덤
  _spawnShootingStar() {
    // 시작 위치 — 화면 상단 전체에서 다양하게 (좌측~중간, 위쪽 띠 안)
    const startX = Phaser.Math.Between(-100, GAME_WIDTH * 0.55);
    const startY = Phaser.Math.Between(-60, 240);

    // 길이/속도 — 50% 확률로 짧은 별똥별 / 긴 별똥별
    const isLong = Math.random() < 0.5;
    const distX = isLong
      ? Phaser.Math.Between(700, 1050)
      : Phaser.Math.Between(280, 480);
    const distY = isLong
      ? Phaser.Math.Between(380, 560)
      : Phaser.Math.Between(160, 300);
    const duration = isLong
      ? Phaser.Math.Between(3000, 3800)
      : Phaser.Math.Between(1600, 2200);
    const trail = isLong ? 120 : 70;       // 긴 별똥별은 꼬리도 길게
    const coreR = isLong ? 8 : 6;           // 별 본체 사이즈도 살짝 차이

    const endX = startX + distX;
    const endY = startY + distY;

    const g = this.add.graphics().setDepth(2);
    const state = { p: 0 };
    const dx = endX - startX, dy = endY - startY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;

    this.tweens.add({
      targets: state, p: 1,
      duration, ease: 'Sine.easeInOut',
      onUpdate: () => {
        if (!g.active) return;
        g.clear();
        const x = startX + dx * state.p;
        const y = startY + dy * state.p;
        // 외부 꼬리 — 옅은 크림색 글로우 (이전 0xFFE066/0.40 → 옅게)
        g.lineStyle(5, 0xFFEFC2, 0.22);
        g.lineBetween(x - ux * trail, y - uy * trail, x, y);
        // 내부 꼬리 — 흰 코어 (이전 알파 0.92 → 0.55)
        g.lineStyle(2, 0xFFFFFF, 0.55);
        g.lineBetween(x - ux * trail * 0.7, y - uy * trail * 0.7, x, y);
        // 별 본체 — 옅은 노란 글로우 + 작은 흰 코어
        g.fillStyle(0xFFEFC2, 0.45);
        g.fillCircle(x, y, coreR);
        g.fillStyle(0xFFFFFF, 0.85);
        g.fillCircle(x, y, coreR * 0.4);
      },
      onComplete: () => {
        this.tweens.add({
          targets: g, alpha: 0, duration: 400,
          onComplete: () => g.destroy(),
        });
      },
    });
  }

  // 배경 위에 살짝 떠 있는 별 트윈 (반짝거림 효과)
  _twinkleStars(count) {
    let seed = 1337;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < count; i++) {
      const sx = rnd() * GAME_WIDTH;
      const sy = rnd() * GAME_HEIGHT * 0.85;     // 하단 15%는 별 없음 (잔디/구름 영역)
      const r  = 1.2 + rnd() * 2.0;
      const sp = this.add.graphics().setDepth(1);
      sp.fillStyle(0xFFFFFF, 0.85);
      sp.fillCircle(sx, sy, r);
      // 살짝 큰 외광 (소프트 글로우)
      sp.fillStyle(0xFFF4D6, 0.20);
      sp.fillCircle(sx, sy, r * 2.4);
      this.tweens.add({
        targets: sp, alpha: { from: 0.18, to: 0.92 },
        duration: 1100 + Math.floor(rnd() * 1900),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: Math.floor(rnd() * 1200),
      });
    }
  }

  // 자산 누락 시 폴백 (별빛 80개)
  _bgFallback() {
    let seed = 42;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 80; i++) {
      const sx = rnd() * GAME_WIDTH;
      const sy = rnd() * GAME_HEIGHT;
      const r  = 0.8 + rnd() * 2.0;
      const sp = this.add.graphics();
      sp.fillStyle(0xFFFFFF, 0.55 + rnd() * 0.35);
      sp.fillCircle(sx, sy, r);
      this.tweens.add({
        targets: sp, alpha: { from: 0.12, to: 0.90 },
        duration: 900 + Math.floor(rnd() * 1800), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ══════════════════════════════════════════════════
  // 상단 타이틀 로고
  // ══════════════════════════════════════════════════
  _topBar() {
    if (this.textures.exists('title-sub')) {
      const logo = this.add.image(36, 18, 'title-sub').setOrigin(0, 0).setDepth(10);
      const src  = this.textures.get('title-sub').getSourceImage();
      if (src && src.width) logo.setScale(560 / src.width);   // 400 → 560 확대
    } else {
      this.add.text(44, 50, '🌈 레인보우 스케치북', {
        fontFamily: FONTS.game, fontSize: '52px', color: '#FF6EA0',
      }).setOrigin(0, 0.5).setDepth(10);
    }
  }

  // ══════════════════════════════════════════════════
  // 토슴이 마스코트 + 말풍선
  // 토슴이 영역: x=0~420 (중심 190)
  // 말풍선: bx=225, W=380 → 우측 끝 x=415 < CARD_START(460) ✓
  // ══════════════════════════════════════════════════
  _toseumi() {
    this._lobbyLines = getLobbyLines();
    this._lastLine   = null;
    this._bubble     = null;

    const tx = 190, ty = 650;

    const keys = ['toseumi-greet','toseumi-carrot','toseumi-jump','toseumi-wave']
      .filter(k => this.textures.exists(k));
    const key = keys.length ? Phaser.Math.RND.pick(keys) : null;
    if (!key) return;

    // 토슴이 본체 (글로우 효과 제거 — 유령처럼 보여서 취소)
    this.toseumi = this.add.image(tx, ty, key).setDepth(5);
    const src = this.textures.get(key).getSourceImage();
    if (src && src.width) {
      // 높이 390px, 좌측 영역(420px) 안에 너비도 맞게 (여백 30px 양쪽)
      const scale = Math.min(390 / src.height, 360 / src.width);
      this.toseumi.setScale(scale);
    }

    // 호흡 tween
    this.tweens.add({
      targets: this.toseumi, y: ty - 10,
      duration: 2600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });

    // 1.8초 후 말풍선 표시
    this.time.delayedCall(1800, () => this._showBubble());

    // 10초마다 자동 교체
    this._lineTimer = this.time.addEvent({
      delay: 10000, loop: true, callback: () => this._cycleBubble(),
    });

    this.toseumi.setInteractive({ useHandCursor: true });
    this.toseumi.on('pointerdown', () => {
      soundManager.play('pop');
      this._cycleBubble();
      this._lineTimer?.reset({ delay:10000, loop:true, callback: () => this._cycleBubble() });
    });

    this.events.once('shutdown', () => this._lineTimer?.remove());
    this.events.once('destroy',  () => this._lineTimer?.remove());
  }

  _showBubble() {
    if (this._bubble) { this._bubble.forEach(o => o?.destroy?.()); this._bubble = null; }

    const line    = this._pickLine();
    const bubbleW = 380, bubbleH = 130;
    // bx=225 → 우측 끝 225+190=415 < CARD_START(460) ✓
    const bx = 225, by = 360;

    const bg = this.add.graphics().setDepth(8);
    bg.fillStyle(0xFFFFFF, 0.86);   // 살짝 투명 (0.96 → 0.86)
    bg.fillRoundedRect(bx - bubbleW/2, by - bubbleH/2, bubbleW, bubbleH, 34);
    // 꼬리 (토슴이 머리 방향)
    bg.fillTriangle(190 - 14, by + bubbleH/2, 190 + 14, by + bubbleH/2, 190, by + bubbleH/2 + 24);

    const txt = this.add.text(bx, by, line, {
      fontFamily: FONTS.game, fontSize: '36px', color: '#5A2A40',
      wordWrap: { width: bubbleW - 60 }, align: 'center',
    }).setOrigin(0.5).setDepth(9);

    [bg, txt].forEach(o => {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 220, ease: 'Cubic.easeOut' });
    });
    this._bubble = [bg, txt];
  }

  _cycleBubble() {
    if (!this._bubble) { this._showBubble(); return; }
    const [bg, txt] = this._bubble;
    this.tweens.add({
      targets: [bg, txt], alpha: 0, duration: 160,
      onComplete: () => this._showBubble(),
    });
    this._bubble = null;
  }

  _pickLine() {
    let pool = this._lobbyLines ?? [];
    if (!pool.length) return '안녕! 🐰';
    if (this._lastLine && pool.length > 1) pool = pool.filter(l => l !== this._lastLine);
    const line = pool[Math.floor(Math.random() * pool.length)];
    this._lastLine = line;
    return line;
  }

  // ══════════════════════════════════════════════════
  // 카드 4장 배치
  // cx: 630 / 990 / 1350 / 1710  (우측 엣지 1880, 40px 여백)
  // cy: 580 / 하단 845 = 토슴이 발 y(≈845) 정렬
  // ══════════════════════════════════════════════════
  _cards() {
    const cy = 580;   // 토슴이 발 y(≈845)와 카드 하단(580+265=845) 정렬
    CARDS.forEach((card, i) => {
      const cx = CARD_START + i * (CW + CARD_GAP) + CW / 2;
      this._card(cx, cy, card);
    });
  }

  _card(cx, cy, { label, scene, illBg, illBg2, barLight, barBg, barSh, ill, tex }) {
    const con = this.add.container(cx, cy);

    // ▌카드 그림자 (살짝 풍성하게)
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.18);
    sh.fillRoundedRect(-CW/2 + 6, -CH/2 + 12, CW, CH, CR);
    con.add(sh);

    // ▌카드 배경 그라데이션 (상단 밝 → 하단 살짝 진)
    const bg = this.add.graphics();
    bg.fillGradientStyle(illBg, illBg, illBg2 ?? illBg, illBg2 ?? illBg, 1);
    bg.fillRoundedRect(-CW/2, -CH/2, CW, CH, CR);
    con.add(bg);

    // ▌카드 상단 부드러운 하이라이트 (꿈결 광택)
    const hl = this.add.graphics();
    hl.fillStyle(0xFFFFFF, 0.16);
    hl.fillRoundedRect(-CW/2 + 4, -CH/2 + 4, CW - 8, 60, {tl:CR-4, tr:CR-4, bl:0, br:0});
    con.add(hl);

    // ▌일러스트 PNG (누끼 처리됨) — 없으면 코드 그림 fallback
    if (tex && this.textures.exists(tex)) {
      const img = this.add.image(0, -BARH/2, tex);
      const src = this.textures.get(tex).getSourceImage();
      if (src && src.width) {
        const s = Math.min(CW / src.width, ILLH / src.height);
        img.setScale(s);
      }
      con.add(img);

      // 라운드 마스킹 — 카드 상단 모서리만 클립
      const mask = this.make.graphics({ x: cx, y: cy, add: false });
      mask.fillStyle(0xFFFFFF, 1);
      mask.fillRoundedRect(-CW/2, -CH/2, CW, CH - BARH, {tl:CR, tr:CR, bl:0, br:0});
      img.setMask(mask.createGeometryMask());
    } else {
      this[`_ill_${ill}`](con);
    }

    // ▌라벨바 바닥 그림자 (살짝 비치는 두께감)
    const bsh = this.add.graphics();
    bsh.fillStyle(barSh, 1);
    bsh.fillRoundedRect(-CW/2, CH/2 - BARH + 6, CW, BARH - 6, {tl:0,tr:0,bl:CR,br:CR});
    con.add(bsh);

    // ▌라벨바 본체 — 위(밝)→아래(진) 그라데이션
    const bar = this.add.graphics();
    const topC = barLight ?? barBg;
    bar.fillGradientStyle(topC, topC, barBg, barBg, 1);
    bar.fillRect(-CW/2, CH/2 - BARH, CW, BARH - CR);
    bar.fillRoundedRect(-CW/2, CH/2 - BARH, CW, BARH, {tl:0,tr:0,bl:CR,br:CR});
    con.add(bar);

    // ▌라벨바 상단 광택 (흰 가는 줄)
    const gloss = this.add.graphics();
    gloss.fillStyle(0xFFFFFF, 0.28);
    gloss.fillRect(-CW/2 + 6, CH/2 - BARH + 3, CW - 12, 6);
    con.add(gloss);

    // ▌카드 외곽선 — 흰 안쪽 라인 + 살짝 진한 바깥 라인 (2단)
    const bd1 = this.add.graphics();
    bd1.lineStyle(2, barSh, 0.35);
    bd1.strokeRoundedRect(-CW/2, -CH/2, CW, CH, CR);
    con.add(bd1);
    const bd2 = this.add.graphics();
    bd2.lineStyle(2, 0xFFFFFF, 0.62);
    bd2.strokeRoundedRect(-CW/2 + 2, -CH/2 + 2, CW - 4, CH - 4, CR - 2);
    con.add(bd2);

    // ▌라벨 텍스트 — 그림자 + stroke 강화
    const labelY = CH/2 - BARH/2;
    const labelText = this.add.text(0, labelY, label, {
      fontFamily: FONTS.game, fontSize: '46px', color: '#FFFFFF',
      stroke: 'rgba(0,0,0,0.28)', strokeThickness: 4,
      shadow: { offsetX: 0, offsetY: 2, color: 'rgba(0,0,0,0.32)', blur: 4, fill: true },
    }).setOrigin(0.5);
    con.add(labelText);

    // 인터랙션
    const hit = this.add.zone(0, 0, CW, CH).setInteractive({ useHandCursor: true });
    con.add(hit);
    hit.on('pointerdown',     () => { this.tweens.killTweensOf(con); this.tweens.add({ targets:con, scale:0.962, duration:68, ease:'Quad.easeOut' }); });
    hit.on('pointerup',       () => { this.tweens.killTweensOf(con); this.tweens.add({ targets:con, scale:1, duration:150, ease:'Back.easeOut' }); this._go(scene); });
    hit.on('pointerout',      () => { this.tweens.killTweensOf(con); this.tweens.add({ targets:con, scale:1, duration:100 }); });
    hit.on('pointerupoutside',() => { this.tweens.killTweensOf(con); this.tweens.add({ targets:con, scale:1, duration:100 }); });
  }

  // ══════════════════════════════════════════════════
  // 일러스트 1: 색칠놀이
  // 실제 도안 PNG(토슴이 캐릭터 컬러링 페이지) + 물감 방울
  // ══════════════════════════════════════════════════
  _ill_coloring(con) {
    const g = this.add.graphics(); con.add(g);
    const illTop = -CH/2;
    const illBot = -CH/2 + ILLH;   // +170
    const illCY  = -CH/2 + ILLH/2; // -40

    // 배경 (연한 라벤더핑크)
    g.fillStyle(0xFFF0FE, 1);
    g.fillRoundedRect(-CW/2, illTop, CW, ILLH, {tl:CR, tr:CR, bl:0, br:0});

    // 물감 방울 (고정 위치, 무지개 7색)
    const paints = [
      [0xFF6B6B, -108, illCY - 58, 27],
      [0xFFB347,  106, illCY - 38, 23],
      [0xFFE66D, -116, illCY + 52, 19],
      [0x74B9FF,  113, illCY + 68, 24],
      [0xA29BFE,  -56, illCY + 98, 20],
      [0xFD79A8,   70, illCY - 78, 17],
      [0xA8E063, -136, illCY + 18, 21],
    ];
    paints.forEach(([c, px, py, pr]) => {
      g.fillStyle(c, 0.52);
      g.fillCircle(px, py, pr);
      g.fillStyle(0xFFFFFF, 0.28);
      g.fillCircle(px - pr*0.28, py - pr*0.28, pr*0.36);
    });

    // 하단 팔레트 점 (7색)
    const palette = [0xFF6B6B,0xFFB347,0xFFE66D,0xA8E063,0x74B9FF,0xA29BFE,0xFD79A8];
    palette.forEach((c, i) => {
      const dx = -108 + i * 36;
      g.fillStyle(c, 1);     g.fillCircle(dx, illBot - 22, 12);
      g.fillStyle(0xFFFFFF, 0.36); g.fillCircle(dx - 3, illBot - 25, 4);
    });

    // 도안 이미지 (흑백 라인아트 — 위에서 렌더되어 방울 위에 올라감)
    const tplKey = 'tpl-character-toseumi';
    if (this.textures.exists(tplKey)) {
      const src = this.textures.get(tplKey).getSourceImage();
      if (src && src.width) {
        const img = this.add.image(0, illCY - 12, tplKey);
        const s   = Math.min((CW - 80) / src.width, (ILLH - 92) / src.height);
        img.setScale(s);
        // MULTIPLY 블렌드: 흰 배경 사라지고 검은 선만 남음
        img.setBlendMode(Phaser.BlendModes.MULTIPLY);
        con.add(img);
      }
    }
  }

  // ══════════════════════════════════════════════════
  // 일러스트 2: 그림그리기
  // 스케치북 + 앉아서 그리는 토슴이 PNG
  // ══════════════════════════════════════════════════
  _ill_drawing(con) {
    const g = this.add.graphics(); con.add(g);
    const illTop = -CH/2;
    const illBot = -CH/2 + ILLH;

    // 스케치북 흰 페이지
    g.fillStyle(0xFEFDFF, 1);
    g.fillRoundedRect(-CW/2, illTop, CW, ILLH, {tl:CR, tr:CR, bl:0, br:0});

    // 스프링 바인딩 (상단 가로줄)
    g.fillStyle(0xC0CED8, 0.65);
    g.fillRoundedRect(-CW/2+14, illTop+10, CW-28, 22, 8);
    for (let i = 0; i < 10; i++) {
      const rx = -CW/2 + 28 + i * ((CW - 44) / 9);
      g.fillStyle(0x8AA8C0, 1); g.fillCircle(rx, illTop+21, 9);
      g.fillStyle(0xEEF5FF, 1); g.fillCircle(rx, illTop+21, 5);
    }

    // 토슴이 (앉아서 그리는) 이미지
    const key = 'toseumi-sitting';
    if (this.textures.exists(key)) {
      const src = this.textures.get(key).getSourceImage();
      if (src && src.width) {
        const img = this.add.image(0, illTop + ILLH * 0.57, key);
        const s   = Math.min((CW - 50) / src.width, (ILLH - 60) / src.height);
        img.setScale(s);
        con.add(img);
      }
    }

    // 크레파스 5개 (하단 줄)
    const crayonColors = [0xFF6B6B,0xFFB347,0xFFE66D,0x74B9FF,0xA29BFE];
    crayonColors.forEach((c, i) => {
      const cx = -74 + i * 37, cy = illBot - 26;
      g.fillStyle(c, 0.78);
      g.fillRoundedRect(cx-5, cy-22, 10, 44, 3);
      g.fillStyle(0xCCC0B0, 0.75);
      g.fillTriangle(cx-5, cy+22, cx+5, cy+22, cx, cy+34);
      g.fillStyle(0xFFFFFF, 0.22);
      g.fillRoundedRect(cx-5, cy-22, 10, 8, {tl:3,tr:3,bl:0,br:0});
    });
  }

  // ══════════════════════════════════════════════════
  // 일러스트 3: 내 작품
  // 라벤더 갤러리 + 황금 액자 3개 + 별 반짝이
  // ══════════════════════════════════════════════════
  _ill_gallery(con) {
    const g = this.add.graphics(); con.add(g);
    const illTop = -CH/2;
    const illBot = -CH/2 + ILLH;

    // 라벤더 배경 (밝고 따뜻하게)
    g.fillStyle(0xF0E8FF, 1);
    g.fillRoundedRect(-CW/2, illTop, CW, ILLH, {tl:CR, tr:CR, bl:0, br:0});

    // 벽지 패턴 (작은 점)
    for (let wx = -CW/2+25; wx < CW/2; wx += 52) {
      for (let wy = illTop+30; wy < illBot-20; wy += 52) {
        g.fillStyle(0xDDD0F4, 0.48);
        g.fillCircle(wx, wy, 3);
      }
    }

    // 별 반짝이 (고정 위치)
    const sparks = [
      [-128, illTop+44, 6], [138, illTop+40, 5],
      [-54,  illTop+26, 4], [108, illTop+62, 6],
      [-98,  illBot-56, 4], [98,  illBot-60, 5],
    ];
    sparks.forEach(([sx, sy, sr]) => {
      g.fillStyle(0xFFCC44, 0.70); g.fillCircle(sx, sy, sr);
      g.fillStyle(0xFFEE88, 0.25); g.fillCircle(sx, sy, sr*2);
    });

    // 대형 액자 (중앙 상단)
    const bFW=156, bFH=152, bFX=0, bFY=illTop+ILLH*0.38;
    g.fillStyle(0xFFF0F8, 1);
    g.fillRoundedRect(bFX-bFW/2, bFY-bFH/2, bFW, bFH, 5);
    // 빈 캔버스 분위기 — 파스텔 원형 3개
    g.fillStyle(0xFFD1DC, 0.38); g.fillCircle(bFX,      bFY,     42);
    g.fillStyle(0xA29BFE, 0.22); g.fillCircle(bFX+22,   bFY+12,  27);
    g.fillStyle(0xFFB347, 0.26); g.fillCircle(bFX-20,   bFY-10,  20);
    // 황금 액자 테두리
    g.lineStyle(10, 0xD4A030, 1);
    g.strokeRoundedRect(bFX-bFW/2, bFY-bFH/2, bFW, bFH, 5);
    g.lineStyle(3, 0xFFD060, 0.72);
    g.strokeRoundedRect(bFX-bFW/2+5, bFY-bFH/2+5, bFW-10, bFH-10, 3);
    // 코너 보석
    [[bFX-bFW/2, bFY-bFH/2],[bFX+bFW/2, bFY-bFH/2],
     [bFX-bFW/2, bFY+bFH/2],[bFX+bFW/2, bFY+bFH/2]].forEach(([fx,fy]) => {
      g.fillStyle(0xFFCC44, 1); g.fillCircle(fx, fy, 5);
    });
    // 라벨
    g.fillStyle(0xFFFFFF, 0.82);
    g.fillRoundedRect(bFX-30, bFY+bFH/2+7, 60, 16, 4);

    // 소형 액자 2개 (하단 좌우)
    const sFW=106, sFH=88, sFY=illTop+ILLH*0.82;
    [[-73, 0xFFE4F0],[73, 0xE4F0FF]].forEach(([sFX, fillC]) => {
      g.fillStyle(fillC, 1);
      g.fillRoundedRect(sFX-sFW/2, sFY-sFH/2, sFW, sFH, 4);
      // 별 중앙 반짝
      g.fillStyle(0xFFE066, 0.58); g.fillCircle(sFX, sFY, 18);
      g.lineStyle(2, 0xFFEE88, 0.72);
      for (let a=0; a<6; a++) {
        const ang = a * Math.PI/3;
        g.beginPath();
        g.moveTo(sFX + Math.cos(ang)*20, sFY + Math.sin(ang)*20);
        g.lineTo(sFX + Math.cos(ang)*30, sFY + Math.sin(ang)*30);
        g.strokePath();
      }
      // 황금 액자 테두리
      g.lineStyle(9, 0xD4A030, 1);
      g.strokeRoundedRect(sFX-sFW/2, sFY-sFH/2, sFW, sFH, 4);
      g.lineStyle(2.5, 0xFFD060, 0.66);
      g.strokeRoundedRect(sFX-sFW/2+4, sFY-sFH/2+4, sFW-8, sFH-8, 2);
    });
  }

  // ══════════════════════════════════════════════════
  // 일러스트 4: 스토리
  // 크림 배경 + 책 읽는 토슴이 PNG + 별 장식
  // ══════════════════════════════════════════════════
  _ill_story(con) {
    const g = this.add.graphics(); con.add(g);
    const illTop = -CH/2;
    const illBot = -CH/2 + ILLH;

    // 크림 배경
    g.fillStyle(0xFFF4EE, 1);
    g.fillRoundedRect(-CW/2, illTop, CW, ILLH, {tl:CR, tr:CR, bl:0, br:0});

    // 별 장식 (고정 위치)
    const stars = [
      [-128, illTop+50, 7], [138, illTop+45, 6],
      [-54,  illTop+28, 5], [113, illTop+68, 7],
      [-98,  illBot-52, 5],
    ];
    stars.forEach(([sx, sy, sr]) => {
      g.fillStyle(0xFFCC44, 0.72); g.fillCircle(sx, sy, sr);
      g.fillStyle(0xFFEE88, 0.28); g.fillCircle(sx, sy, sr*1.8);
    });

    // 토슴이 (책 읽는) 이미지
    const key = 'toseumi-story';
    if (this.textures.exists(key)) {
      const src = this.textures.get(key).getSourceImage();
      if (src && src.width) {
        const img = this.add.image(0, illTop + ILLH * 0.52, key);
        const s   = Math.min((CW - 50) / src.width, (ILLH - 55) / src.height);
        img.setScale(s);
        con.add(img);
      }
    }

    // 하단 무지개 색 별들
    [0xFF6B6B,0xFFB347,0xFFE66D,0xA8E063,0x74B9FF].forEach((c, i) => {
      g.fillStyle(c, 0.72);
      g.fillCircle(-72 + i*36, illBot-20, 9);
    });
  }

  // ══════════════════════════════════════════════════
  // 씬 이동
  // ══════════════════════════════════════════════════
  _go(key) {
    soundManager.play('pop');
    if (!this.scene.manager.keys[key]) return;
    soundManager.stopBGM();
    this.cameras.main.fadeOut(420, 26, 15, 62);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }
}
