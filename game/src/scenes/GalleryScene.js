// 🖼 GalleryScene — 내 작품 (전시회장 느낌)
//   색칠놀이 / 그림그리기 완성한 작품들을 액자에 담아 그리드로 표시
//   저장 위치: SaveSystem.drawings[] (Base64 PNG)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { AnalyticsSystem } from '../systems/AnalyticsSystem.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';
import { showParentGate } from '../ui/ParentGate.js';

export default class GalleryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GalleryScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-sketch-1')) this.load.audio('bgm-sketch-1', 'sounds/bgm/sketch-1.mp3');
    if (!this.cache.audio.has('bgm-sketch-2')) this.load.audio('bgm-sketch-2', 'sounds/bgm/sketch-2.mp3');
    if (!this.cache.audio.has('bgm-sketch-3')) this.load.audio('bgm-sketch-3', 'sounds/bgm/sketch-3.mp3');
  }

  create() {
    this.cameras.main.fadeIn(500, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-sketch-1', 'bgm-sketch-2', 'bgm-sketch-3']);

    this.createBackground();
    this.createTopBar();

    const artworks = SaveSystem.getArtworks();
    // Firebase Analytics — 갤러리 진입 이벤트
    AnalyticsSystem.trackGalleryView({ artworkCount: artworks.length });

    if (artworks.length === 0) {
      this.showEmpty();
    } else {
      this.showGallery(artworks);
    }
  }

  // ===== 전시회 배경 — 따뜻한 갤러리 톤 =====
  createBackground() {
    const bg = this.add.graphics();
    // 위쪽 어두운 보라, 아래쪽 따뜻한 핑크 — 전시회 조명 느낌
    bg.fillGradientStyle(0x3D2961, 0x3D2961, 0x5A3D7A, 0x5A3D7A, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 바닥 라인 (전시 바닥 느낌)
    const floor = this.add.graphics();
    floor.fillStyle(0x2C1B47, 0.6);
    floor.fillRect(0, GAME_HEIGHT - 80, GAME_WIDTH, 80);

    // 위쪽 빛 (스폿 라이트 느낌)
    for (let i = 0; i < 4; i++) {
      const x = (GAME_WIDTH / 5) * (i + 1);
      const light = this.add.graphics();
      light.fillStyle(0xFFE9B5, 0.06);
      light.fillTriangle(x - 60, 0, x + 60, 0, x, 200);
    }
  }

  // ===== 상단 바 — 타이틀 (좌상단) + 우상단 표준 나가기 =====
  createTopBar() {
    // 좌상단 타이틀 (도감/스토리/스케치북 스타일)
    this.add.text(50, 80, '🖼 내 작품', {
      fontFamily: FONTS.bold, fontSize: '72px', color: '#FFD8E2',
    }).setOrigin(0, 0.5);
    this.add.text(50, 160, '내가 만든 작품 모음', {
      fontFamily: FONTS.game, fontSize: '42px', color: '#FFFFFF',
    }).setOrigin(0, 0.5).setAlpha(0.9);

    // 우상단 표준 나가기 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToHub());
  }

  // ===== 비어 있을 때 안내 =====
  showEmpty() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 20;

    // 큰 액자 (빈 캔버스 느낌)
    const frameW = 700, frameH = 450;
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.4);
    sh.fillRoundedRect(cx - frameW / 2 + 6, cy - frameH / 2 + 14, frameW, frameH, 30);

    const wood = this.add.graphics();
    wood.fillStyle(0x8B6F47, 1);
    wood.fillRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 30);
    const wood2 = this.add.graphics();
    wood2.fillStyle(0xA67E5B, 1);
    wood2.fillRoundedRect(cx - frameW / 2 + 4, cy - frameH / 2 + 4, frameW - 8, frameH - 14, 26);

    const mat = this.add.graphics();
    mat.fillStyle(0xFFFAF5, 1);
    mat.fillRoundedRect(cx - frameW / 2 + 36, cy - frameH / 2 + 36, frameW - 72, frameH - 92, 14);

    // 일러스트 — 빈 캔버스 + 별
    this.add.text(cx, cy - 50, '🎨', {
      fontFamily: FONTS.bold, fontSize: '160px',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 80, '아직 작품이 없어요!', {
      fontFamily: FONTS.bold, fontSize: '42px', color: '#5A2A40',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 135, '색칠놀이 / 그림그리기로 첫 작품을 만들어봐 ✨', {
      fontFamily: FONTS.game, fontSize: '28px', color: '#8B5A6B',
    }).setOrigin(0.5);
  }

  // ===== 작품 그리드 — 액자에 담아 표시 =====
  showGallery(artworks) {
    // 4 columns 그리드, 한 페이지에 최대 12개 (4×3)
    // 사용자 피드백: 스케치북이 16:9 (1500×844)이므로 액자도 16:9 비율로 조정
    //   → 작품 PNG가 액자에 꽉 fit, 양옆/위아래 흰 여백 라인 사라짐
    const cols = 4;
    const rows = Math.ceil(artworks.length / cols);
    const frameW = 420;
    const frameH = 256;          // 420 × 9/16 ≈ 236 + 액자 두께 → 256 (16:9 비율 유지)
    const gapX = 28;
    const gapY = 32;
    const totalW = cols * frameW + (cols - 1) * gapX;
    const startX = GAME_WIDTH / 2 - totalW / 2 + frameW / 2;

    // 헤더 아래(y≈170)부터 시작, 그리드가 화면 안에 들어가게 배치
    const headerBottom = 200;
    const gridH = rows * frameH + (rows - 1) * gapY;
    const slack = GAME_HEIGHT - headerBottom - gridH - 40;
    const topMargin = Math.max(20, slack / 2);
    const startY = headerBottom + topMargin + frameH / 2;

    artworks.forEach((art, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (frameW + gapX);
      const y = startY + row * (frameH + gapY);
      this.makeFramedArtwork(x, y, frameW, frameH, art);
    });
  }

  // ===== 액자 (3D 라운드 정사각형 + 갈색 우드 프레임) =====
  makeFramedArtwork(x, y, w, h, artwork) {
    const container = this.add.container(x, y);

    // 깊은 그림자
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.5);
    sh.fillRoundedRect(-w / 2 + 4, -h / 2 + 14, w, h, 24);
    container.add(sh);

    // 우드 프레임 (외곽 어두운 갈색)
    const woodOuter = this.add.graphics();
    woodOuter.fillStyle(0x6B4F30, 1);
    woodOuter.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    container.add(woodOuter);

    // 우드 프레임 (밝은 갈색)
    const woodInner = this.add.graphics();
    woodInner.fillStyle(0xA67E5B, 1);
    woodInner.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 18, 20);
    container.add(woodInner);

    // 상단 광택 (3D)
    const glow = this.add.graphics();
    glow.fillStyle(0xFFFFFF, 0.22);
    glow.fillRoundedRect(-w / 2 + 14, -h / 2 + 12, w - 28, 40, 16);
    container.add(glow);

    // 흰 매트 (작품 둘러싸는 흰 종이) — 라벨 제거됨, mat이 카드 거의 다 차지
    const matPad = 22;
    const matW = w - matPad * 2;
    const matH = h - matPad * 2;
    const mat = this.add.graphics();
    mat.fillStyle(0xFFFAF5, 1);
    mat.fillRoundedRect(-matW / 2, -matH / 2, matW, matH, 8);
    container.add(mat);

    // 작품 PNG — 매트 안쪽에 fit (중앙)
    const texKey = `artwork-${artwork.id}`;
    if (this.textures.exists(texKey)) this.textures.remove(texKey);
    const img = new Image();
    img.onload = () => {
      if (!container.scene) return;
      if (this.textures.exists(texKey)) this.textures.remove(texKey);
      this.textures.addImage(texKey, img);
      const phaserImg = this.add.image(0, 0, texKey).setOrigin(0.5);
      const scale = Math.min((matW - 16) / img.width, (matH - 16) / img.height);
      phaserImg.setScale(scale);
      container.add(phaserImg);
      container.bringToTop(glow);
    };
    img.src = artwork.dataUrl;

    // 사용자 피드백: 어린이는 그림 보고 직관적으로 인지하므로 색칠/그림 라벨 불필요 → 제거

    // 인터랙션 — 탭 시 확대 보기
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 4; });
    hit.on('pointerup', () => {
      container.y = y;
      soundManager.play('pop');
      this.showArtworkLarge(artwork);
    });
    hit.on('pointerout', () => { container.y = y; });
  }

  // 작품 큰 화면으로 보기 — 상단 작품, 하단 4 액션 (그리기/색칠하기/삭제 + 닫기 우상단)
  showArtworkLarge(artwork) {
    const root = this.add.container(0, 0).setDepth(2000);

    // 배경 오버레이 (작품 외 영역 탭 시 닫기)
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82).setInteractive();
    root.add(overlay);

    // ===== 레이아웃 =====
    //   상단 여백 60, 작품 이미지 영역 (이미지 max H = GAME_HEIGHT - 280, 하단 버튼 200, 상단 80)
    //   하단 버튼: 그리기 / 색칠하기 / 삭제 (3개 가로) + 우상단 닫기 (X 1개)
    const bottomBtnY = GAME_HEIGHT - 110;
    const bottomBtnH = 130;
    const imageMaxH = GAME_HEIGHT - 280;     // 작품이 차지할 세로 영역
    const imageCenterY = (GAME_HEIGHT - bottomBtnH - 60) / 2 + 40;

    // 작품 이미지 (onload 비동기 → overlay 다음, 버튼들 앞에 z순서 보장)
    const texKey = `artwork-large-${artwork.id}`;
    if (this.textures.exists(texKey)) this.textures.remove(texKey);
    const img = new Image();
    img.onload = () => {
      if (!root.scene) return;
      if (this.textures.exists(texKey)) this.textures.remove(texKey);
      this.textures.addImage(texKey, img);
      const phaserImg = this.add.image(GAME_WIDTH / 2, imageCenterY, texKey).setOrigin(0.5);
      const scale = Math.min((GAME_WIDTH - 240) / img.width, imageMaxH / img.height);
      phaserImg.setScale(scale);
      // overlay(0) 위, 버튼 아래
      root.addAt(phaserImg, 1);
    };
    img.src = artwork.dataUrl;

    // ===== 우상단 액션 (📥 저장 + 📤 공유 + ✕ 닫기) =====
    const topBtnSize = 110;
    const topBtnY = 90;
    const topGap = 14;

    // 📥 디바이스 갤러리에 저장 (부모 게이트 X — 대표님 결정)
    const saveBtn = this.makeSquareIconBtn(
      GAME_WIDTH - 90 - (topBtnSize + topGap) * 2, topBtnY, topBtnSize, 0xB8F0DD, '📥',
      () => this.saveArtworkToDevice(artwork)
    );
    root.add(saveBtn);

    // 📤 공유 (부모 게이트 필수)
    const shareBtn = this.makeSquareIconBtn(
      GAME_WIDTH - 90 - (topBtnSize + topGap), topBtnY, topBtnSize, 0xFFD8E2, '📤',
      () => this.handleShareArtwork(artwork)
    );
    root.add(shareBtn);

    // ✕ 닫기
    const closeBtn = this.makeSquareIconBtn(GAME_WIDTH - 90, 90, 110, 0xFFB6C8, '✕', () => {
      soundManager.play('click');
      root.destroy();
    });
    root.add(closeBtn);

    // ===== 하단 3버튼 (그리기 / 색칠하기 / 삭제) — 가로 균등 =====
    const btnW = 380;
    const gap = 30;
    const totalBtnW = btnW * 3 + gap * 2;
    const startX = GAME_WIDTH / 2 - totalBtnW / 2 + btnW / 2;

    // 1. 그리기로 이어가기
    root.add(this.makeIconLabelButton(
      startX, bottomBtnY, btnW, bottomBtnH,
      '✏️', '그리기', 0xB8F0DD, 0x4FA088,
      () => {
        soundManager.play('pop');
        root.destroy();
        this.continueInSketch(artwork);
      },
    ));

    // 2. 색칠하기로 이어가기
    root.add(this.makeIconLabelButton(
      startX + btnW + gap, bottomBtnY, btnW, bottomBtnH,
      '🎨', '색칠하기', 0xFFD8E2, 0xC66888,
      () => {
        soundManager.play('pop');
        root.destroy();
        this.continueInColoring(artwork);
      },
    ));

    // 3. 삭제
    root.add(this.makeIconLabelButton(
      startX + 2 * (btnW + gap), bottomBtnY, btnW, bottomBtnH,
      '🗑', '삭제', 0xFFA876, 0xC8845A,
      () => {
        this.confirmDelete(artwork, () => {
          root.destroy();
          this.scene.restart();
        });
      },
    ));

    // overlay 클릭(작품 외 영역) → 닫기
    overlay.on('pointerup', () => {
      soundManager.play('click');
      root.destroy();
    });
  }

  // 그리기 씬으로 이동 — 작품 타입 무관 캔버스에 이전 작품 표시 (사용자 피드백 v2)
  //   그리기 작품: 이어 그리기 (자연스러운 흐름)
  //   색칠 작품: 도안 + 칠한 색 위에 자유 그리기 가능 (사용자가 "도안 위에 그리기" 원함)
  //   returnTo: 'GalleryScene' — 나가기 시 갤러리로 돌아감
  continueInSketch(artwork) {
    this.cameras.main.fadeOut(400, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('SketchScene', {
        existingArtwork: artwork,
        returnTo: 'GalleryScene',
      });
    });
  }

  // 색칠 씬으로 이동 — 작품 타입에 따라 분기
  //   색칠 작품: 이어 색칠 (templateId + existingArtwork)
  //   그리기 작품: 새 도안 선택 화면 (그리기 작품을 색칠로 보낼 컨텍스트 없음)
  continueInColoring(artwork) {
    this.cameras.main.fadeOut(400, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (artwork.type === 'coloring' && artwork.templateId) {
        this.scene.start('ColoringScene', {
          templateId: artwork.templateId,
          existingArtwork: artwork,
          returnTo: 'GalleryScene',
        });
      } else {
        // 그리기 작품 → 색칠로 가면 새 도안 선택
        this.scene.start('TemplateSelectScene');
      }
    });
  }

  // ===== 라운드 정사각형 3D 아이콘 버튼 (Coloring/Sketch와 동일 톤) =====
  makeSquareIconBtn(cx, cy, size, color, icon, onClick) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.4);
    sh.fillRoundedRect(-half + 2, -half + 9, size, size, cornerR);
    container.add(sh);

    const darker = Phaser.Display.Color.IntegerToColor(color).darken(20).color;
    const lighter = Phaser.Display.Color.IntegerToColor(color).lighten(25).color;
    const base = this.add.graphics();
    base.fillStyle(darker, 1);
    base.fillRoundedRect(-half, -half + 3, size, size, cornerR);
    container.add(base);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-half + 2, -half + 2, size - 4, size - 4, cornerR - 2);
    container.add(bg);

    const glow = this.add.graphics();
    glow.fillStyle(lighter, 0.55);
    glow.fillRoundedRect(-half + 6, -half + 6, size - 12, (size - 12) * 0.42, cornerR - 4);
    container.add(glow);

    const stroke = this.add.graphics();
    stroke.lineStyle(4, 0xFFFFFF, 0.9);
    stroke.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(stroke);

    const iconText = this.add.text(0, 0, icon, {
      fontFamily: FONTS.bold, fontSize: `${Math.floor(size * 0.5)}px`, color: '#5A2A40',
    }).setOrigin(0.5);
    container.add(iconText);

    const hit = this.add.zone(0, 0, size + 8, size + 8).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = cy + 4; });
    hit.on('pointerup',   () => {
      container.y = cy;
      if (onClick) onClick();
    });
    hit.on('pointerout',  () => { container.y = cy; });
    return container;
  }

  // ===== 작품 삭제 확인 다이얼로그 =====
  confirmDelete(artwork, onConfirm) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = this.add.container(0, 0).setDepth(3000);

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setInteractive();
    root.add(overlay);

    const panelW = 920, panelH = 460;
    const panel = this.add.graphics();
    panel.fillStyle(0xFFF4F7, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 44);
    panel.lineStyle(8, 0xFFB6C8, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 44);
    root.add(panel);

    root.add(this.add.text(cx, cy - 110, '이 작품을 지울까?', {
      fontFamily: FONTS.bold, fontSize: '64px', color: '#5A2A40',
    }).setOrigin(0.5));

    root.add(this.add.text(cx, cy - 30, '한 번 지우면 다시 못 봐요', {
      fontFamily: FONTS.game, fontSize: '34px', color: '#A0808A',
    }).setOrigin(0.5));

    // 유지 (왼쪽) / 지우기 (오른쪽)
    root.add(this.makeIconLabelButton(cx - 200, cy + 110, 320, 110, '✕', '유지', 0xFFB6C8, 0xC66888, () => {
      root.destroy();
    }));
    root.add(this.makeIconLabelButton(cx + 200, cy + 110, 320, 110, '🗑', '지우기', 0xFFA876, 0xC8845A, () => {
      SaveSystem.removeArtwork(artwork.id);
      soundManager.play('pop');
      root.destroy();
      if (onConfirm) onConfirm();
    }));

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 250, ease: 'Cubic.easeOut' });
  }

  // ===== 뒤로 버튼 (TemplateSelectScene과 동일 디자인) =====
  makeIconLabelButton(x, y, w, h, emoji, label, color, shadow, onClick) {
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
    hit.on('pointerup', () => {
      container.y = y;
      soundManager.play('click');
      if (onClick) onClick();
    });
    hit.on('pointerout', () => { container.y = y; });
    return container;
  }

  // ===== 디바이스 갤러리에 저장 (부모 게이트 X — 대표님 결정) =====
  async saveArtworkToDevice(artwork) {
    if (!window.Capacitor?.isNativePlatform?.()) {
      this.showInfoToast('🎨 핸드폰에 저장됐어요! (dev mock)');
      return;
    }
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Media } = await import('@capacitor-community/media');

      const base64 = artwork.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const filename = `rainbow-sketchbook-${Date.now()}.png`;

      const file = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Media.savePhoto({
        path: file.uri,
        albumIdentifier: '레인보우 스케치북',
      });

      AnalyticsSystem.trackGallerySaveToDevice({ artworkType: artwork.type });
      this.showInfoToast('🎨 핸드폰에 저장됐어요!');
    } catch (e) {
      console.warn('[Gallery] 저장 실패', e);
      this.showInfoToast('😢 저장에 실패했어요.');
    }
  }

  // ===== 공유 (부모 게이트 통과 후) =====
  handleShareArtwork(artwork) {
    showParentGate(this, () => this.shareArtwork(artwork));
  }

  async shareArtwork(artwork) {
    if (!window.Capacitor?.isNativePlatform?.()) {
      this.showInfoToast('📤 공유 준비 중이에요 (앱 출시 후 가능)');
      return;
    }
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64 = artwork.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const filename = `rainbow-sketchbook-${Date.now()}.png`;

      const file = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: '레인보우 스케치북 작품',
        text: '우리 아이가 그린 작품이에요! 🎨',
        url: file.uri,
        dialogTitle: '작품 공유하기',
      });

      AnalyticsSystem.trackGalleryShare({ artworkType: artwork.type });
    } catch (e) {
      console.warn('[Gallery] 공유 실패', e);
      // 사용자가 공유 취소한 경우는 에러로 보지 않음 (Share 플러그인 일반 동작)
    }
  }

  // ===== 간단한 토스트 메시지 =====
  showInfoToast(message) {
    const toast = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 180).setDepth(5500);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(-360, -40, 720, 80, 40);
    toast.add(bg);
    toast.add(this.add.text(0, 0, message, {
      fontFamily: FONTS.bold, fontSize: '32px', color: '#FFFFFF',
    }).setOrigin(0.5));
    toast.setAlpha(0);
    this.tweens.add({
      targets: toast, alpha: 1, duration: 200,
      onComplete: () => {
        this.time.delayedCall(1800, () => {
          this.tweens.add({ targets: toast, alpha: 0, duration: 300,
            onComplete: () => toast.destroy() });
        });
      },
    });
  }

  exitToHub() {
    // 대표님 영구 박제: 갤러리 나가기 = 로비(MainScene) 직행 (SketchHub 스킵)
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
