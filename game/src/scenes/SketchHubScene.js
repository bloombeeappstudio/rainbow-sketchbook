// 🖍 SketchHubScene — 스케치북 메뉴 (색칠놀이 / 그림그리기 선택)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { soundManager } from '../systems/SoundManager.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

export default class SketchHubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SketchHubScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-sketch-1')) this.load.audio('bgm-sketch-1', 'sounds/bgm/sketch-1.mp3');
    if (!this.cache.audio.has('bgm-sketch-2')) this.load.audio('bgm-sketch-2', 'sounds/bgm/sketch-2.mp3');
    if (!this.cache.audio.has('bgm-sketch-3')) this.load.audio('bgm-sketch-3', 'sounds/bgm/sketch-3.mp3');
  }

  create() {
    this.cameras.main.fadeIn(500, 15, 8, 32);
    soundManager.attachScene(this);
    // 스케치북 허브도 같은 sketch BGM
    soundManager.playBGM(['bgm-sketch-1', 'bgm-sketch-2', 'bgm-sketch-3']);

    // 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x4A2D6E, 0x4A2D6E, 0x2C1B47, 0x2C1B47, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 별빛
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.FloatBetween(1, 2.5);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.8));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.8 },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
      });
    }

    // 상단 바 — 도감/스토리와 통일 (좌상단 메뉴명+부제 / 우상단 나가기)
    this.add.text(50, 80, '🖍 스케치북', {
      fontFamily: FONTS.bold,
      fontSize: '72px',
      color: '#FFD8E2',
    }).setOrigin(0, 0.5);

    this.add.text(50, 160, '오늘도 신나는 미술 시간!', {
      fontFamily: FONTS.game,
      fontSize: '42px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setAlpha(0.9);

    // 우상단 나가기 (도감/스토리 동일 디자인)
    this.makeBackButton();

    // ===== 세 개의 큰 카드 (색칠놀이 / 그림그리기 / 내 작품) =====
    //   submenu-coloring/drawing/gallery 텍스처는 BootScene이 디바이스 언어별 로드
    //   3 카드 균등 배치: cardW=440, gap=50, total=3*440+2*50=1420, 좌우 250씩
    //   사용자 피드백: 카드 높이 정사각형에 가깝게 줄여서 (620→480) PNG가 카드 거의 다 채움
    const cardW = 440;
    const cardH = 480;
    const gap = 50;
    const totalW = 3 * cardW + 2 * gap;
    const firstX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const cardY = GAME_HEIGHT / 2 + 100;

    // 1. 색칠놀이 → 도안 선택
    this.makeBigCard(
      firstX,
      cardY, cardW, cardH,
      'submenu-coloring',
      () => this.scene.start('TemplateSelectScene')
    );

    // 2. 그림그리기
    this.makeBigCard(
      firstX + cardW + gap,
      cardY, cardW, cardH,
      'submenu-drawing',
      () => this.scene.start('SketchScene')
    );

    // 3. 내 작품 (갤러리)
    //    submenu-gallery PNG 미전달 — 텍스처 없으면 fallback 단색 카드 + 텍스트
    this.makeBigCard(
      firstX + 2 * (cardW + gap),
      cardY, cardW, cardH,
      'submenu-gallery',
      () => this.scene.start('GalleryScene'),
      { fallbackLabel: '내 작품', fallbackEmoji: '🖼' }
    );
  }

  // PNG 자체가 카드(둥근 분홍/노란 사각형 + 일러스트 + 라벨)이므로
  //   별도의 카드 본체 그라데이션/이모지/텍스트 X — PNG 그대로 표시
  //   PNG 없을 때 fallback: 단색 라운드 카드 + 이모지 + 라벨 (내 작품 카드용)
  makeBigCard(x, y, w, h, textureKey, onClick, fallback = null) {
    const container = this.add.container(x, y);

    if (this.textures.exists(textureKey)) {
      const img = this.add.image(0, 0, textureKey);
      const tex = this.textures.get(textureKey).getSourceImage();
      // 사용자 피드백: 카드 사이즈 통일 — PNG 비율 차이로 세로가 짧아 보이는 문제 해결
      //   정사각형 inner box에 fit → 모든 PNG가 동일한 세로 높이로 표시됨
      //   (innerSize = min(카드 폭, 카드 높이) - padding)
      const padding = 20;
      const innerSize = Math.min(w - padding * 2, h - padding * 2);
      const scale = Math.min(innerSize / tex.width, innerSize / tex.height);
      img.setScale(scale);
      container.add(img);
    } else {
      // 폴백 — 3D 라운드 정사각형 (다른 카드와 톤 일관)
      const cornerR = 40;
      // 깊은 그림자
      const sh = this.add.graphics();
      sh.fillStyle(0x000000, 0.4);
      sh.fillRoundedRect(-w / 2 + 4, -h / 2 + 14, w, h, cornerR);
      container.add(sh);
      // 베이스 (어두운 톤)
      const baseG = this.add.graphics();
      baseG.fillStyle(0xC8A8DD, 1);
      baseG.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, cornerR);
      container.add(baseG);
      // 본체
      const bg = this.add.graphics();
      bg.fillStyle(0xFFD8E2, 1);
      bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 8, cornerR - 2);
      container.add(bg);
      // 상단 광택
      const glow = this.add.graphics();
      glow.fillStyle(0xFFFFFF, 0.28);
      glow.fillRoundedRect(-w / 2 + 16, -h / 2 + 14, w - 32, 70, cornerR - 12);
      container.add(glow);
      // 이모지 + 라벨
      if (fallback) {
        container.add(this.add.text(0, -60, fallback.fallbackEmoji || '🖼', {
          fontFamily: FONTS.game, fontSize: '220px',
        }).setOrigin(0.5));
        container.add(this.add.text(0, 130, fallback.fallbackLabel || '카드', {
          fontFamily: FONTS.bold, fontSize: '78px', color: '#5A2A40',
          stroke: '#FFFFFF', strokeThickness: 6,
        }).setOrigin(0.5));
      }
    }

    // 인터랙션 (카드 전체 클릭)
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 6; });
    hit.on('pointerup', () => {
      container.y = y;
      soundManager.play('pop');
      this.cameras.main.fadeOut(400, 15, 8, 32);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (onClick) onClick();
      });
    });
    hit.on('pointerout', () => { container.y = y; });
  }

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

  // 우상단 나가기 버튼 — 표준 (모든 씬 일관)
  makeBackButton() {
    createStandardBackButton(this, () => this.exitToMain());
  }

  exitToMain() {
    soundManager.play('pop');
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
