// 🖍 SketchScene — 스케치북 (그림판) — 게임의 핵심 콘텐츠
// 레이아웃: 좌측 캔버스 + 우측 툴 패널 (크레파스/스티커 탭)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { COLORS as CRAYON_COLORS, MAIN_PALETTE } from '../data/colors.js';
import { showPaletteGrid } from '../ui/PaletteGrid.js';
import { showToolPopup, TOOLS } from '../ui/ToolPopup.js';
import { addStarField } from '../ui/StarField.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { soundManager } from '../systems/SoundManager.js';
import { AnalyticsSystem } from '../systems/AnalyticsSystem.js';
import { makeColorButton, makeSquareColorButton } from '../ui/ColorButton.js';

// 더미 스티커 — 카드/리워드 자산 재활용
const DUMMY_STICKERS = [
  'card-rainbow', 'card-heart', 'card-star', 'card-butterfly',
  'card-flower', 'card-cupcake', 'card-gift', 'card-music-note',
  'card-cloud-lavender', 'card-blue-cloud', 'card-mint-candy', 'card-ribbon',
  'card-yellow-crown', 'card-moon', 'card-crystal', 'card-lollipop',
  'reward-candy', 'reward-carrot', 'reward-rainbow-fragment',
  'reward-gold-sparkle', 'reward-heart', 'reward-star',
];

export default class SketchScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SketchScene' });
  }

  preload() {
    // ⚡ 지연 로딩 — 처음 방문 시만 다운로드, 이후 캐시 재사용
    if (!this.cache.audio.has('bgm-sketch-1')) this.load.audio('bgm-sketch-1', 'sounds/bgm/sketch-1.mp3');
    if (!this.cache.audio.has('bgm-sketch-2')) this.load.audio('bgm-sketch-2', 'sounds/bgm/sketch-2.mp3');
    if (!this.cache.audio.has('bgm-sketch-3')) this.load.audio('bgm-sketch-3', 'sounds/bgm/sketch-3.mp3');
  }

  create(data = {}) {
    this._startTime = Date.now();   // 그림 소요 시간 측정 (Analytics)
    this.cameras.main.fadeIn(600, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-sketch-1', 'bgm-sketch-2', 'bgm-sketch-3']);  // 스케치 BGM 3개 롤링

    // 갤러리 "이어 그리기" 진입 시 기존 작품 데이터 + returnTo 경로
    this.existingArtwork = data.existingArtwork || null;
    this.returnTo = data.returnTo || null;     // 'GalleryScene' 진입 시 나가기 → 갤러리로 복귀

    // ===== 레이아웃 — 좌우 사이드바 균형 (ColoringScene과 동일) =====
    //   좌 사이드바: x 0~190 (✕ + 되돌리기/휴지통/완성)
    //   캔버스    : x 190~1760 (1570 폭)
    //   우 사이드바: x 1760~1920 (도구통합/무지개/지우개 3개)
    this.LEFT_SB_W   = 190;
    this.RIGHT_SB_W  = 160;
    this.canvasX = this.LEFT_SB_W;
    this.canvasY = 80;
    this.canvasW = GAME_WIDTH - this.LEFT_SB_W - this.RIGHT_SB_W;
    this.canvasH = 844;
    // 종이/그림 영역 4 모서리 라운드 (mask + paper 그리기 공통 — ColoringScene과 동일)
    this.PAPER_CORNER_R = 28;

    // ===== 상태 =====
    this.toolMode      = 'crayon';      // 'pencil' | 'brush' | 'crayon' | 'paint' | 'eraser'
    this.brushColor    = 0x5A2A40;
    this.brushSize     = 28;            // ColoringScene과 동일 디폴트
    this.lastX         = 0;
    this.lastY         = 0;
    this.isDrawing     = false;
    this.isRainbowMode = false;         // 무지개 컬러 선택 시 true — 그리는 동안 색 변화
    this.rainbowPhase  = 0;             // 무지개 색 진행도 (0~1 순환)
    this.rainbowStops  = null;          // 매 stroke 시작 시 셔플된 무지개 색 배열
    this.selectedColorBtn = null;
    this.selectedSizeBtn  = null;
    this.selectedStickerBtn = null;
    this.selectedSticker  = null;   // 스티커 키
    this.cursorSticker = null;      // 커서 따라다니는 미리보기
    // 팝업 활성 카운터 — 색셀 클릭이 캔버스까지 흘러 그려지는 버그 방지 (ColoringScene과 parity)
    this._popupCount = 0;

    // ===== 구성 =====
    this.createBackground();
    this.createPaper();

    // 그림 + 스티커 (도화지 위)
    //   drawGraphics: legacy 빈 그래픽 (호환용 유지)
    //   currentStroke: 현재 그리는 중인 stroke Graphics (매 pointerdown마다 새로)
    //   actionHistory: undo 용 시간순 액션 배열 ({type, obj})
    this.drawGraphics = this.add.graphics();
    this.placedStickers = this.add.group();
    this.currentStroke = null;
    this.actionHistory = [];

    // 종이 둥근 모서리 마스크 — drawGraphics + 이후 add되는 모든 그림 레이어에 적용
    //   (그림이 종이 라운드 밖으로 튀어나오지 않게)
    this._applyPaperMask();

    // 갤러리 "이어 그리기" — 기존 작품을 캔버스 영역에 미리 표시 (Phaser 게임 객체)
    //   snapshot 시 같이 캡처되어 자연스럽게 이어 그리기 가능
    if (this.existingArtwork && this.existingArtwork.dataUrl) {
      const img = new Image();
      img.onload = () => {
        if (!this.scene.isActive('SketchScene')) return;
        const texKey = `existing-${this.existingArtwork.id || Date.now()}`;
        if (this.textures.exists(texKey)) this.textures.remove(texKey);
        this.textures.addImage(texKey, img);
        const phaserImg = this.add.image(this.canvasX, this.canvasY, texKey).setOrigin(0);
        phaserImg.setDisplaySize(this.canvasW, this.canvasH);
        phaserImg.setDepth(5);     // 종이 위, stroke(20) 아래
        this._maskObj(phaserImg);
      };
      img.src = this.existingArtwork.dataUrl;
    }

    // 입력 핸들러
    this.input.on('pointerdown',     this.onPointerDown, this);
    this.input.on('pointermove',     this.onPointerMove, this);
    this.input.on('pointerup',       this.onPointerUp,   this);
    this.input.on('pointerupoutside', this.onPointerUp,  this);

    // UI — 상(스프링) / 하(컬러) / 우(액션 4개) — ColoringScene 일관
    this.createTopBar();
    // 하단 팔레트 제거 — 색 선택은 paint/line 버튼으로
    this._initDefaultColor();
    this.createRightActions();
  }

  // ===== 배경 — 사이드바와 동일 단색 + 밤하늘 별 (ColoringScene과 parity) =====
  createBackground() {
    const bg = this.add.graphics();
    bg.fillStyle(0x3D2961, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    addStarField(this, { count: 80, depth: 1 });
  }

  // ===== 도화지 =====
  createPaper() {
    const r = this.PAPER_CORNER_R;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(this.canvasX + 8, this.canvasY + 12, this.canvasW, this.canvasH, r);

    const paper = this.add.graphics();
    paper.fillStyle(0xFFFFFF, 1);
    paper.fillRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
    paper.lineStyle(4, 0xFFE4EC, 0.6);
    paper.strokeRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
  }

  // 그림(stroke/sticker/페인트)이 종이 둥근 모서리 밖으로 안 튀어나오게 마스크 적용
  //   ColoringScene과 parity — 종이와 동일한 cornerR로 클리핑
  _applyPaperMask() {
    const r = this.PAPER_CORNER_R;
    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    maskGfx.fillStyle(0xFFFFFF, 1);
    maskGfx.fillRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
    this._paperMaskGfx = maskGfx;
    this._paperMask = maskGfx.createGeometryMask();
    if (this.drawGraphics) this.drawGraphics.setMask(this._paperMask);
  }

  // 새 객체에 종이 마스크 부여 (stroke / sticker / 페인트 / existing artwork)
  //   _applyPaperMask 이후 add되는 모든 그림 레이어에 호출
  _maskObj(obj) {
    if (obj && this._paperMask) obj.setMask(this._paperMask);
    return obj;
  }

  // ===== 상단 바 — 스케치북 스프링 디자인 (텍스트/도구 토글 모두 제거) =====
  createTopBar() {
    this.drawSketchbookSpring(this.canvasX, this.canvasY, this.canvasW);
  }

  // ===== 스케치북 스프링/코일 디자인 — 캔버스 위쪽 가장자리 =====
  //   completion snapshot 시 hide할 수 있도록 모든 그래픽을 this.springLayer (container)에 묶음
  drawSketchbookSpring(canvasX, canvasY, canvasW) {
    this.springLayer = this.add.container(0, 0);     // 캡처 시 setVisible(false)용

    const coilW = 50;
    const coilH = 56;
    const coilGap = 24;
    const unit = coilW + coilGap;
    const usableW = canvasW - 20;
    const coilCount = Math.max(8, Math.floor(usableW / unit));
    const stripW = coilCount * coilW + (coilCount - 1) * coilGap;
    const startX = canvasX + (canvasW - stripW) / 2 + coilW / 2;
    const coilY = canvasY - coilH / 2 + 18;

    for (let i = 0; i < coilCount; i++) {
      const cx = startX + i * unit;
      const sh = this.add.graphics();
      sh.fillStyle(0x000000, 0.4);
      sh.fillRoundedRect(cx - coilW / 2 + 2, coilY - coilH / 2 + 6, coilW, coilH, 14);
      const base = this.add.graphics();
      base.fillStyle(0x8A92A6, 1);
      base.fillRoundedRect(cx - coilW / 2, coilY - coilH / 2, coilW, coilH, 14);
      const body = this.add.graphics();
      body.fillStyle(0xBCC4D4, 1);
      body.fillRoundedRect(cx - coilW / 2 + 2, coilY - coilH / 2 + 2, coilW - 4, coilH - 8, 12);
      const glow = this.add.graphics();
      glow.fillStyle(0xFFFFFF, 0.55);
      glow.fillRoundedRect(cx - coilW / 2 + 6, coilY - coilH / 2 + 5, coilW - 12, 12, 6);
      const hole = this.add.graphics();
      hole.fillStyle(0x2C1B47, 1);
      hole.fillCircle(cx, coilY + 4, 7);
      const holeInner = this.add.graphics();
      holeInner.fillStyle(0x000000, 0.5);
      holeInner.fillCircle(cx, coilY + 5, 4);
      // 모든 코일 그래픽을 springLayer container에 추가 (snapshot 시 hide용)
      this.springLayer.add([sh, base, body, glow, hole, holeInner]);
    }
  }

  // ===== 하단 컬러 팔레트 — 16색 가로 일렬 (캔버스 폭 안에 정렬) =====
  createBottomPalette() {
    this.colorButtons = [];
    this.selectedColorBtn = null;
    const colors = MAIN_PALETTE;

    const btnSize = 80;
    const gap = 8;
    const totalW = colors.length * btnSize + (colors.length - 1) * gap;
    const canvasCenterX = this.canvasX + this.canvasW / 2;
    const startX = canvasCenterX - totalW / 2 + btnSize / 2;
    const cy = 1000;

    colors.forEach((c, i) => {
      const cx = startX + i * (btnSize + gap);
      const btn = makeSquareColorButton(this, cx, cy, btnSize, c, (color) => this.selectColor(btn, color));
      this.colorButtons.push(btn);
    });

    const defaultIdx = colors.findIndex(c => c.id === 12);
    if (defaultIdx >= 0) this.selectColor(this.colorButtons[defaultIdx], colors[defaultIdx]);
    else if (this.colorButtons.length > 0) this.selectColor(this.colorButtons[0], colors[0]);

    // "더보기" 토글 버튼 — 8×8 그리드 팝업 (ColoringScene과 parity)
    this._makePaletteMoreButton(startX + totalW + 8, cy, btnSize);
  }

  // 8×8 그리드 팔레트 토글 버튼 (ColoringScene과 동일 구조)
  _makePaletteMoreButton(cx, cy, size) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.20);
    sh.fillRoundedRect(-half, -half + 5, size, size, cornerR);
    container.add(sh);

    const bg = this.add.graphics();
    const stops = [0xFF6B6B, 0xFFB347, 0xFFE066, 0x7FD8C0, 0x82D8FF, 0xB19CFF];
    const stripeH = size / stops.length;
    stops.forEach((c, i) => {
      bg.fillStyle(c, 1);
      bg.fillRect(-half, -half + i * stripeH, size, stripeH + 0.5);
    });
    const mask = this.make.graphics({ x: cx, y: cy, add: false });
    mask.fillStyle(0xFFFFFF, 1);
    mask.fillRoundedRect(-half, -half, size, size, cornerR);
    bg.setMask(mask.createGeometryMask());
    container.add(bg);

    const gloss = this.add.graphics();
    gloss.fillStyle(0xFFFFFF, 0.35);
    gloss.fillRoundedRect(-half + 6, -half + 5, size - 12, 18, 10);
    container.add(gloss);

    const border = this.add.graphics();
    border.lineStyle(3, 0xFFFFFF, 0.85);
    border.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(border);

    const plusBg = this.add.graphics();
    plusBg.fillStyle(0xFFFFFF, 0.92);
    plusBg.fillCircle(0, 0, size * 0.22);
    container.add(plusBg);
    container.add(this.add.text(0, 0, '+', {
      fontFamily: FONTS.bold, fontSize: `${Math.round(size * 0.42)}px`, color: '#5A2A40',
    }).setOrigin(0.5));

    const zone = this.add.zone(0, 0, size + 8, size + 8).setInteractive({ useHandCursor: true });
    container.add(zone);
    zone.on('pointerdown', () => { container.y = cy + 4; });
    zone.on('pointerout', () => { container.y = cy; });
    zone.on('pointerup', () => {
      container.y = cy;
      soundManager.play('click');
      this._openPaletteGrid();
    });
  }

  _openPaletteGrid() {
    const colorBtn = this.toolBtns?.colors || this.toolBtns?.tools;
    const anchorX = colorBtn ? colorBtn.x : (GAME_WIDTH - 80);
    const topY = colorBtn ? colorBtn.y : 135;
    this._popupCount++;
    showPaletteGrid(this, anchorX, topY, {
      onColorSelect: (color) => this._applyColorFromGrid(color),
      onLockedClick: () => this._showLockedColorToast(),
      onClose: () => { this._popupCount = Math.max(0, this._popupCount - 1); },
    });
  }

  // 도구 팝업 — tools 버튼 라인부터 아래로 펼침 (4종: 펜/붓/크레파스/물감)
  //   사용자 피드백: 도구 선택 후 자동 팔레트 X — 컬러는 어린이가 따로 탭
  _openToolPopup() {
    const cur = ['pencil', 'brush', 'crayon', 'paint'].includes(this.toolMode)
      ? this.toolMode : 'crayon';
    const toolsBtn = this.toolBtns?.tools;
    const anchorX = toolsBtn ? toolsBtn.x : (GAME_WIDTH - 80);
    const topY = toolsBtn ? toolsBtn.y : 135;
    this._popupCount++;
    showToolPopup(this, anchorX, topY, cur, (toolId) => {
      this.setSketchTool(toolId);
      // (자동 팔레트 호출 제거) — 도구만 바뀌고 끝
    }, () => { this._popupCount = Math.max(0, this._popupCount - 1); });
  }

  _initDefaultColor() {
    const defaultColor = MAIN_PALETTE.find(c => c.id === 12) || MAIN_PALETTE[0];
    if (defaultColor) {
      this.brushColor = parseInt(defaultColor.hex.replace('#', ''), 16);
      this.isRainbowMode = !!defaultColor.rainbowGradient;
    }
  }

  _applyColorFromGrid(color) {
    if (color.id === 100) {
      this.isRainbowMode = true;
      this.brushColor = 0xFFB6C8;
      this.toolBtns?.colors?.setRainbow?.();
    } else {
      this.isRainbowMode = false;
      this.brushColor = parseInt(color.hex.replace('#', ''), 16);
      this.toolBtns?.colors?.setSolidColor?.(this.brushColor);
    }
    // 지우개/도구 미선택 상태에서 색 선택 시 → crayon 으로 자동 전환
    const drawTools = ['pencil', 'brush', 'crayon', 'paint'];
    if (!drawTools.includes(this.toolMode)) this.setSketchTool('crayon');
  }

  _showLockedColorToast() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 220;
    const toast = this.add.container(cx, cy).setDepth(5500);
    const bg = this.add.graphics();
    bg.fillStyle(0x5A2A40, 0.92);
    bg.fillRoundedRect(-400, -45, 800, 90, 45);
    toast.add(bg);
    toast.add(this.add.text(0, -8, '🔒 잠긴 색이에요!', {
      fontFamily: FONTS.bold, fontSize: '32px', color: '#FFFFFF',
    }).setOrigin(0.5));
    toast.add(this.add.text(0, 22, '잠금 해제로 모든 색을 만나봐요', {
      fontFamily: FONTS.bold, fontSize: '22px', color: '#FFD8E2',
    }).setOrigin(0.5));
    toast.setAlpha(0);
    this.tweens.add({
      targets: toast, alpha: 1, duration: 200,
      onComplete: () => {
        this.time.delayedCall(1800, () => {
          this.tweens.add({ targets: toast, alpha: 0, duration: 300, onComplete: () => toast.destroy() });
        });
      },
    });
  }

  // ===== 사이드바 — 좌우 분리 (ColoringScene parity) =====
  createRightActions() {
    this.toolBtns = this.toolBtns || {};
    this._createRightToolbar();
    this._createLeftToolbar();
    // 디폴트 활성: 크레파스
    this._currentTool = 'crayon';
    this.updateToolButtons();
  }

  _createRightToolbar() {
    const sbX = GAME_WIDTH - this.RIGHT_SB_W;
    const sbW = this.RIGHT_SB_W;
    const cx = sbX + sbW / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x3D2961, 1);
    bg.fillRect(sbX, 0, sbW, GAME_HEIGHT);

    const btnSize = 110;
    const topMargin = 90;
    const bottomMargin = 60;
    const groupGap = 22;

    // 우상단 3개 (위에서 붙여서) — 도구통합 / 무지개컬러 / 지우개
    const items = [
      { icon: '✏️', color: 0xFFE066, tool: 'tools', onClick: () => this._openToolPopup(), iconScale: 0.7 },
      { icon: '', color: 0, tool: 'colors', onClick: () => this._openPaletteGrid(), special: 'rainbow' },
      { icon: 'tool-eraser', color: 0xB8F0DD, tool: 'eraser', onClick: () => this.setSketchTool('eraser'), iconScale: 0.55 },
    ];
    const startCY = topMargin + btnSize / 2;
    items.forEach((it, i) => {
      const cy = startCY + i * (btnSize + groupGap);
      let btn;
      if (it.special === 'rainbow') {
        btn = this._makeRainbowBtn(cx, cy, btnSize, it.onClick);
      } else {
        btn = this.makeSquareIconBtn(cx, cy, btnSize, it.color, it.icon, it.onClick, it.iconScale);
      }
      if (it.tool) this.toolBtns[it.tool] = btn;
    });

    // 우하단 ✓ — 완성
    const completeCY = GAME_HEIGHT - bottomMargin - btnSize / 2;
    this.makeSquareIconBtn(cx, completeCY, btnSize, 0x7FD8C0, '✓', () => this.complete());
  }

  _createLeftToolbar() {
    const sbW = this.LEFT_SB_W;
    const cx = sbW / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x3D2961, 1);
    bg.fillRect(0, 0, sbW, GAME_HEIGHT);

    const btnSize = 110;
    const topMargin = 90;
    const bottomMargin = 60;
    const groupGap = 22;

    // 좌상단 ✕ — 나가기
    this.makeSquareIconBtn(cx, topMargin + btnSize / 2, btnSize, 0xFFB6C8, '✕',
      () => this.exitToHub());

    // 좌하단 2개 — 되돌리기 / 휴지통 (✓는 우측 하단으로 이동됨)
    const groupH = btnSize * 2 + groupGap * 1;
    const groupStartCY = GAME_HEIGHT - bottomMargin - groupH + btnSize / 2;
    this.makeSquareIconBtn(cx, groupStartCY + 0 * (btnSize + groupGap), btnSize,
      0xFFC9DD, '↶', () => this.undo());
    this.makeSquareIconBtn(cx, groupStartCY + 1 * (btnSize + groupGap), btnSize,
      0xFFA876, '🗑', () => this.confirmClearCanvas(), 0.65);
  }

  // 무지개 컬러 버튼 — 사이드바 두 번째 위치 (ColoringScene과 동일)
  _makeRainbowBtn(cx, cy, size, onClick) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.22);
    sh.fillRoundedRect(-half, -half + 5, size, size, cornerR);
    container.add(sh);

    const bg = this.add.graphics();
    const stops = [0xFF6B6B, 0xFFB347, 0xFFE066, 0x7FD8C0, 0x82D8FF, 0xB19CFF];
    const stripeH = size / stops.length;
    const drawRainbow = () => {
      bg.clear();
      stops.forEach((c, i) => {
        bg.fillStyle(c, 1);
        bg.fillRect(-half, -half + i * stripeH, size, stripeH + 0.5);
      });
    };
    drawRainbow();
    const mask = this.make.graphics({ x: cx, y: cy, add: false });
    mask.fillStyle(0xFFFFFF, 1);
    mask.fillRoundedRect(-half, -half, size, size, cornerR);
    bg.setMask(mask.createGeometryMask());
    container.add(bg);

    const gloss = this.add.graphics();
    gloss.fillStyle(0xFFFFFF, 0.32);
    gloss.fillRoundedRect(-half + 8, -half + 6, size - 16, 22, 12);
    container.add(gloss);

    const border = this.add.graphics();
    border.lineStyle(3, 0xFFFFFF, 0.85);
    border.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(border);

    const zone = this.add.zone(0, 0, size + 6, size + 6).setInteractive({ useHandCursor: true });
    container.add(zone);
    zone.on('pointerdown', () => { container.y = cy + 4; });
    zone.on('pointerout', () => { container.y = cy; });
    zone.on('pointerup', () => {
      container.y = cy;
      soundManager.play('click');
      onClick();
    });

    // makeSquareIconBtn 호환 (setActive2 no-op)
    container.setActive2 = () => {};

    // 동적 색 변경 — 선택한 색이 버튼에 반영
    container.setRainbow    = () => drawRainbow();
    container.setSolidColor = (hex) => {
      bg.clear();
      bg.fillStyle(hex, 1);
      bg.fillRect(-half, -half, size, size);
    };

    return container;
  }

  // 도구 변경 — 4종(펜/붓/크레파스/물감) + 지우개
  //   eraser는 별도 mode (toolMode='eraser')로 합쳐서 처리
  setSketchTool(mode) {
    if (mode === 'paint') {
      if (this.brushColor === 0xFFFFFF && this._prevBrushColor != null) {
        this.brushColor = this._prevBrushColor;
      }
      this.toolMode = 'paint';
      this._currentTool = 'paint';
    } else if (mode === 'eraser') {
      this._prevBrushColor = (this.brushColor === 0xFFFFFF) ? this._prevBrushColor : this.brushColor;
      this.brushColor = 0xFFFFFF;
      this.isRainbowMode = false;
      this.toolMode = 'eraser';
      this._currentTool = 'eraser';
    } else if (mode === 'pencil' || mode === 'brush' || mode === 'crayon') {
      if (this._prevBrushColor != null && this.brushColor === 0xFFFFFF) {
        this.brushColor = this._prevBrushColor;
      }
      this.toolMode = mode;
      this._currentTool = mode;
    }
    // 도구 통합 버튼 아이콘 — 선택된 도구로 변경 (지우개는 별도 버튼이라 통합 버튼은 유지)
    if (['pencil', 'brush', 'crayon', 'paint'].includes(mode)) {
      const cfg = TOOLS.find(t => t.id === mode);
      if (cfg) this.toolBtns?.tools?.setIcon?.(cfg.icon, 0.7);
    }
    this.updateToolButtons();
  }

  // ===== 라운드 정사각형 3D 아이콘 버튼 — ColoringScene과 동일 =====
  makeSquareIconBtn(cx, cy, size, color, icon, onClick, iconScale = 0.5) {
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

    // 아이콘 — PNG 텍스처 있으면 이미지, 'tool-eraser'는 직접 그리기, 나머지는 이모지
    //   사용자 피드백: 붓 → 🖍 크레용, 지우개 → 네모 (반창고 X)
    const FALLBACK_EMOJI = { 'tool-paint': '🪣', 'tool-crayon': '🖍' };
    const buildIconObj = (iconKey, scale) => {
      if (typeof iconKey === 'string' && this.textures.exists(iconKey)) {
        const img = this.add.image(0, 0, iconKey);
        const tex = this.textures.get(iconKey).getSourceImage();
        const target = size * scale * 1.7;
        const s = Math.min(target / tex.width, target / tex.height);
        img.setScale(s);
        return img;
      } else if (iconKey === 'tool-eraser') {
        return this._drawEraserIcon(size);
      } else {
        const displayIcon = FALLBACK_EMOJI[iconKey] || iconKey;
        return this.add.text(0, 0, displayIcon, {
          fontFamily: FONTS.bold, fontSize: `${Math.floor(size * scale)}px`, color: '#5A2A40',
        }).setOrigin(0.5);
      }
    };
    let iconObj = buildIconObj(icon, iconScale);
    container.add(iconObj);

    // 도구 토글용 선택 ring (활성 표시)
    const ring = this.add.graphics();
    ring.setVisible(false);
    container.add(ring);
    container._ring = ring;
    container._iconObj = iconObj;

    // 동적 아이콘 변경 — ColoringScene과 parity
    //   ⚠️ 회귀 봉합 (대표님 피드백: "색이 아예 안칠해지는데?")
    //   순서 reverse + try-catch — destroy 부작용이 painting flow를 깨지 못하게
    container.setIcon = (newIcon, newScale = iconScale) => {
      try {
        let newObj;
        try { newObj = buildIconObj(newIcon, newScale); }
        catch (e) { console.warn('[setIcon] buildIconObj failed', e); return; }
        if (!newObj) return;
        const ringIdx = container.getIndex(container._ring);
        if (ringIdx >= 0) container.addAt(newObj, ringIdx);
        else container.add(newObj);
        const oldObj = container._iconObj;
        container._iconObj = newObj;
        if (oldObj && oldObj !== newObj) {
          try { container.remove(oldObj, true); } catch (e) { /* ignore */ }
        }
      } catch (e) { console.warn('[setIcon] outer error', e); }
    };

    const hit = this.add.zone(0, 0, size + 8, size + 8).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = cy + 4; });
    hit.on('pointerup',   () => {
      container.y = container._isActive ? cy - 6 : cy;
      soundManager.play('click');
      if (onClick) onClick();
    });
    hit.on('pointerout',  () => { container.y = container._isActive ? cy - 6 : cy; });

    // 도구 활성/비활성 토글 (updateToolButtons에서 호출) — ColoringScene과 동일
    container.setActive2 = (active) => {
      container._isActive = active;
      if (active) {
        ring.clear();
        ring.lineStyle(6, 0xFFE066, 1);
        ring.strokeRoundedRect(-half - 8, -half - 8, size + 16, size + 16, cornerR + 6);
        ring.lineStyle(3, 0xFFFFFF, 0.9);
        ring.strokeRoundedRect(-half - 8, -half - 8, size + 16, size + 16, cornerR + 6);
        ring.setVisible(true);
        container.y = cy - 6;
        container.setScale(1.06);
      } else {
        ring.setVisible(false);
        container.y = cy;
        container.setScale(1);
      }
    };
    return container;
  }

  // 네모 지우개 직접 그리기 — 분홍 본체 + 흰 stripe (ColoringScene과 동일)
  _drawEraserIcon(size) {
    const c = this.add.container(0, 0);
    const w = size * 0.62;
    const h = size * 0.38;
    const r = 6;

    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.25);
    sh.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, r);
    c.add(sh);

    const body = this.add.graphics();
    body.fillStyle(0xFF8FB1, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    c.add(body);

    const stripe = this.add.graphics();
    stripe.fillStyle(0xFFFAF5, 1);
    stripe.fillRoundedRect(-w / 2, -h / 2, w, h * 0.45, r);
    stripe.fillRect(-w / 2, -h / 2 + h * 0.4, w, h * 0.05);
    c.add(stripe);

    const outline = this.add.graphics();
    outline.lineStyle(2.5, 0x5A2A40, 0.9);
    outline.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    c.add(outline);

    const divider = this.add.graphics();
    divider.lineStyle(2, 0x5A2A40, 0.8);
    divider.lineBetween(-w / 2, -h / 2 + h * 0.45, w / 2, -h / 2 + h * 0.45);
    c.add(divider);

    return c;
  }

  setToolMode(mode) {
    this.toolMode = mode;
    this.updateToolButtons();
  }

  updateToolButtons() {
    if (!this.toolBtns) return;
    // 'tools': 펜/붓/크레파스/물감 중 하나일 때 활성
    // 'eraser': eraser일 때 활성
    // 'colors': 활성 표시 없음 (palette opener)
    const drawTools = ['pencil', 'brush', 'crayon', 'paint'];
    const current = this._currentTool || this.toolMode || 'crayon';
    Object.entries(this.toolBtns).forEach(([key, btn]) => {
      if (!btn || typeof btn.setActive2 !== 'function') return;
      if (key === 'tools') {
        btn.setActive2(drawTools.includes(current));
      } else if (key === 'eraser') {
        btn.setActive2(current === 'eraser');
      } else {
        btn.setActive2(false);
      }
    });
  }

  cycleBrushSize() {
    const sizes = [8, 16, 32];
    const i = sizes.indexOf(this.brushSize);
    this.brushSize = sizes[(i + 1) % sizes.length];
    this.updateSizeIndicator();
  }

  updateSizeIndicator() {
    if (!this.sizeIndicator) return;
    if (this._sizeDot) this._sizeDot.destroy();
    const dotR = Math.min(this.brushSize / 2, 18);
    this._sizeDot = this.add.circle(this.sizeIndicator.x, this.sizeIndicator.y, dotR, 0x5A2A40);
    this._sizeDot.setDepth(50);
  }

  // ===== 되돌리기 — actionHistory에서 마지막 액션 (stroke 또는 sticker) 제거 =====
  //   stroke = pointerdown ~ pointerup 한 번이 한 단위
  //   sticker = 한 번 스탬프 = 한 단위
  //   시간순으로 stack에 쌓이므로 pop().destroy()로 마지막 액션 취소
  undo() {
    if (!this.actionHistory || this.actionHistory.length === 0) {
      soundManager.play('click');
      return;
    }
    // 그리기 중이면 즉시 멈춤 (drag 도중 undo 누르면 그 stroke까지 통째 제거)
    this.isDrawing = false;
    this.currentStroke = null;

    const last = this.actionHistory.pop();
    if (last && last.obj && last.obj.destroy) {
      last.obj.destroy();
    }
    soundManager.play('pop');
  }

  // ===== 큰 아이콘+라벨 버튼 =====
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
    hit.on('pointerup',   () => { container.y = y; if (onClick) onClick(); });
    hit.on('pointerout',  () => { container.y = y; });
    return container;
  }

  // ===== 툴 패널 (우측) — 탭 + 컨텐츠 =====
  createToolPanel() {
    // 패널 배경
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.06);
    bg.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);
    bg.lineStyle(2, 0xFFFFFF, 0.15);
    bg.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 24);

    // ===== 탭 (상단) — 어린이 UI 원칙: 큰 폰트 =====
    const tabH = 110;
    const tabW = this.panelW / 2;
    this.crayonTab = this.makeToolTab(
      this.panelX, this.panelY, tabW, tabH, '🖍', '크레파스',
      () => this.switchTool('crayon'),
    );
    this.stickerTab = this.makeToolTab(
      this.panelX + tabW, this.panelY, tabW, tabH, '🌟', '스티커',
      () => this.switchTool('sticker'),
    );

    // 탭 아래 컨텐츠 영역
    this.contentY = this.panelY + tabH + 10;
    this.contentH = this.panelH - tabH - 20;

    this.contentObjects = [];
  }

  // 탭 버튼 — 활성/비활성 상태
  makeToolTab(x, y, w, h, emoji, label, onClick) {
    const container = this.add.container(x + w / 2, y + h / 2);

    const bg = this.add.graphics();
    container.add(bg);

    const eText = this.add.text(-w / 2 + 60, 0, emoji, {
      fontFamily: FONTS.game, fontSize: '60px',
    }).setOrigin(0.5);
    container.add(eText);

    const lText = this.add.text(20, 0, label, {
      fontFamily: FONTS.bold, fontSize: '46px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(lText);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerup', onClick);

    container.setActive = (active) => {
      bg.clear();
      bg.fillStyle(active ? 0xFFB6C8 : 0xFFFFFF, active ? 0.85 : 0.08);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      lText.setColor('#FFFFFF');
    };
    container.setActive(false);
    return container;
  }

  // 툴 모드 전환 (legacy — 옛 panel UI 기반, 일부만 사용)
  //   sticker 모드는 더 이상 활성 X (사용자 피드백으로 우 사이드바 도구 토글로 대체)
  switchTool(mode) {
    if (this.toolMode === mode) return;
    this.toolMode = mode;
    if (this.clearCursorSticker) this.clearCursorSticker();
    // 옛 panel UI 가드 — crayonTab/stickerTab 존재할 때만 호출
    if (mode === 'crayon' && this.crayonTab) this.showCrayonMode();
    else if (mode === 'sticker' && this.stickerTab) this.showStickerMode();
  }

  // 컨텐츠 영역 비우기
  clearContent() {
    if (this.contentObjects) {
      this.contentObjects.forEach(o => o.destroy());
    }
    this.contentObjects = [];
  }

  // ===== 크레파스 모드 =====
  showCrayonMode() {
    this.clearContent();
    this.crayonTab.setActive(true);
    this.stickerTab.setActive(false);
    this.createBrushSizes();
    this.createColorPalette();
  }

  // 굵기 — 크레파스 모드 컨텐츠 상단 (어린이 UI 원칙: 큰 사이즈)
  createBrushSizes() {
    const sizes = [
      { size: 8,  label: '얇게' },
      { size: 16, label: '중간' },
      { size: 32, label: '두껍게' },
    ];
    const cy = this.contentY + 70;

    // "굵기" 라벨 (좌측) — 사이즈 키움 28→44
    const lbl = this.add.text(this.panelX + 40, cy, '굵기', {
      fontFamily: FONTS.bold, fontSize: '44px', color: '#FFD8E2',
    }).setOrigin(0, 0.5);
    this.contentObjects.push(lbl);

    // 3개 굵기 버튼 (라벨 우측) — ring 크게 36→52
    const startX = this.panelX + 240;
    const gap = 170;
    sizes.forEach((s, i) => {
      const x = startX + i * gap;
      const ring = this.add.circle(x, cy, 52, 0xFFFFFF, 0.95);
      ring.setStrokeStyle(5, 0xFFB6C8);
      ring.setInteractive({ useHandCursor: true });
      this.contentObjects.push(ring);

      const dot = this.add.circle(x, cy, s.size / 2 + 3, 0x5A2A40);
      this.contentObjects.push(dot);

      // 얇게/중간/두껍게 — 사이즈 키움 20→34
      const labelText = this.add.text(x, cy + 75, s.label, {
        fontFamily: FONTS.bold, fontSize: '34px', color: '#FFFFFF',
      }).setOrigin(0.5);
      this.contentObjects.push(labelText);

      ring.on('pointerup', () => {
        this.brushSize = s.size;
        this.updateSelectedSize(ring);
      });

      if (i === 1) this.updateSelectedSize(ring);
    });
  }

  updateSelectedSize(btn) {
    if (this.selectedSizeBtn) {
      this.selectedSizeBtn.setStrokeStyle(4, 0xFFB6C8);
      this.selectedSizeBtn.setScale(1);
    }
    btn.setStrokeStyle(6, 0xFFD93D);
    btn.setScale(1.15);
    this.selectedSizeBtn = btn;
  }

  // ===== 컬러 팔레트 — 단순화된 17개 (지우개 + 메인 16색) =====
  //   PNG 의존 X — Phaser Graphics 동그라미 (ColorButton.js)
  //   4 cols × 5 rows 그리드, 큰 동그라미로 직관적
  //   panel 가로폭에 정확히 정렬 (사용자 피드백: 튀어나옴 X)
  createColorPalette() {
    const palette = [
      { id: -1, name: '지우개', isEraser: true, hex: '#FFFFFF' },
      ...MAIN_PALETTE,
    ];

    // "컬러" 라벨 — 사이즈 키움 28→44
    const lbl = this.add.text(this.panelX + 40, this.contentY + 175, '컬러', {
      fontFamily: FONTS.bold, fontSize: '44px', color: '#FFD8E2',
    }).setOrigin(0, 0.5);
    this.contentObjects.push(lbl);

    // 그리드 설정 — panel 안 정확 정렬 (panelW 720, panelH 830)
    //   가로: cellW 145, cols 4 → gridW 523, trayW 559, 좌우 마진 80
    //   세로: cellH 90, rows 5 → gridH 448, trayH 484, panel 끝 11px 여유
    const radius = 44;
    const cols = 4;
    const cellW = 145;       // 셀 중심 간 거리
    const cellH = 90;        // 셀 세로 간격 (동그라미 88 + 2px 여유)
    const rows = Math.ceil(palette.length / cols);
    const gridW = (cols - 1) * cellW + radius * 2;
    const gridH = (rows - 1) * cellH + radius * 2;

    const trayPad = 18;
    const trayW = gridW + trayPad * 2;
    const trayH = gridH + trayPad * 2;
    const trayX = this.panelX + (this.panelW - trayW) / 2;
    const trayY = this.contentY + 215;

    const gridStartX = trayX + trayPad + radius;
    const gridStartY = trayY + trayPad + radius;

    // 트레이 배경
    const trayBg = this.add.graphics();
    trayBg.fillStyle(0x4A2D6E, 0.5);
    trayBg.fillRoundedRect(trayX, trayY, trayW, trayH, 22);
    trayBg.lineStyle(3, 0xFFFFFF, 0.22);
    trayBg.strokeRoundedRect(trayX, trayY, trayW, trayH, 22);
    this.contentObjects.push(trayBg);

    this.colorButtons = [];
    this.selectedColorBtn = null;

    palette.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridStartX + col * cellW;
      const cy = gridStartY + row * cellH;
      const btn = makeColorButton(this, cx, cy, radius, c, (color) => this.selectColor(btn, color));
      this.colorButtons.push(btn);
      this.contentObjects.push(btn);
    });

    // 기본 선택 — 솜사탕 핑크 (id 12)
    const defaultIdx = palette.findIndex(c => c.id === 12);
    if (defaultIdx >= 0) {
      this.selectColor(this.colorButtons[defaultIdx], palette[defaultIdx]);
    } else if (this.colorButtons.length > 1) {
      this.selectColor(this.colorButtons[1], palette[1]);
    }
  }

  selectColor(btn, color) {
    if (this.selectedColorBtn && this.selectedColorBtn !== btn) {
      this.selectedColorBtn.setSelected(false);
    }
    btn.setSelected(true);
    this.selectedColorBtn = btn;

    this.brushColor = color.isEraser
      ? 0xFFFFFF
      : Phaser.Display.Color.HexStringToColor(color.hex).color;
    this.isRainbowMode = !!color.rainbowGradient;
    // 컬러 선택 후 도구 처리:
    //   - 지우개 모드였으면 → 자동 크레파스 (색 골라서 그릴 의도)
    //   - 페인트 모드면 → 페인트 유지 (다른 영역 채우기 의도)
    //   - 크레파스면 → 크레파스 유지
    if (this._currentTool === 'eraser') {
      this._currentTool = 'crayon';
      this.toolMode = 'crayon';
    }
    // paint 모드는 brushColor만 변경 (도구 유지)
    this._prevBrushColor = this.brushColor;
    this.updateToolButtons();
    soundManager.play('select');
  }

  // 매 stroke 시작 시 — 무지개 색 배열 랜덤 셔플 (시작점 + 방향)
  //   사용자 피드백: 매번 같은 무지개 X, 한 번 칠할 때마다 매번 다르게
  _makeRandomRainbowStops() {
    const VIVID = [
      [255,  85, 119],   // 핫 핑크
      [255, 145,  60],   // 오렌지
      [255, 215,  65],   // 노랑
      [120, 210, 130],   // 민트 그린
      [ 95, 175, 255],   // 스카이 블루
      [165, 110, 255],   // 라벤더
      [255, 110, 200],   // 마젠타
    ];
    const startIdx = Math.floor(Math.random() * VIVID.length);
    const rotated = [];
    for (let i = 0; i < VIVID.length; i++) {
      rotated.push(VIVID[(startIdx + i) % VIVID.length]);
    }
    if (Math.random() < 0.5) rotated.reverse();
    return rotated;
  }

  // 무지개 색 보간 — this.rainbowStops (stroke마다 셔플된 배열) 기반 → int 반환
  _rainbowColorAt(phase) {
    if (!this.rainbowStops) this.rainbowStops = this._makeRandomRainbowStops();
    const stops = this.rainbowStops;
    const t = ((phase % 1) + 1) % 1;
    const n = stops.length;
    const idx = t * n;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const f = idx - Math.floor(idx);
    const c0 = stops[i0];
    const c1 = stops[i1];
    const r = Math.round(c0[0] * (1 - f) + c1[0] * f);
    const g = Math.round(c0[1] * (1 - f) + c1[1] * f);
    const b = Math.round(c0[2] * (1 - f) + c1[2] * f);
    return Phaser.Display.Color.GetColor(r, g, b);
  }

  makeColorCell(cx, cy, cellW, cellH, color, isDefaultSelected) {
    const container = this.add.container(cx, cy);

    // 선택 표시 배경 (셀 안 살짝 골드)
    const bg = this.add.graphics();
    container.add(bg);

    let body;
    if (color.isEraser) {
      // 지우개 — 흰 둥근 사각형 + ✕
      body = this.add.graphics();
      body.fillStyle(0xFFFFFF, 1);
      body.fillRoundedRect(-44, -78, 88, 156, 44);
      body.lineStyle(3, 0xC66888, 1);
      body.strokeRoundedRect(-44, -78, 88, 156, 44);
      const x = this.add.text(0, 0, '✕', {
        fontFamily: FONTS.bold, fontSize: '46px', color: '#5A2A40',
      }).setOrigin(0.5);
      container.add(body);
      container.add(x);
    } else if (color.isBlack) {
      body = this.add.graphics();
      body.fillStyle(0x5A2A40, 1);
      body.fillRoundedRect(-36, -72, 72, 145, 14);
      body.fillStyle(0x3A1A28, 1);
      body.fillTriangle(-36, -72, 36, -72, 0, -100);
      container.add(body);
    } else if (color.id >= 1 && color.id <= 100 &&
               this.textures.exists(`crayon-${String(color.id).padStart(2, '0')}`)) {
      const key = `crayon-${String(color.id).padStart(2, '0')}`;
      body = this.add.image(0, 0, key);
      const tex = this.textures.get(key).getSourceImage();
      // 셀 안에 거의 가득 (편의점 매대 X — 빽빽하게)
      const scale = Math.min((cellW - 4) / tex.width, (cellH - 4) / tex.height);
      body.setScale(scale);
      container.add(body);
    } else {
      const colorInt = Phaser.Display.Color.HexStringToColor(color.hex).color;
      body = this.add.circle(0, 0, 44, colorInt);
      body.setStrokeStyle(3, 0xFFFFFF);
      container.add(body);
    }

    // 인터랙션
    const hit = this.add.zone(0, 0, cellW - 2, cellH - 2).setInteractive({ useHandCursor: true });
    container.add(hit);

    const colorInt = color.isEraser
      ? 0xFFFFFF
      : Phaser.Display.Color.HexStringToColor(color.hex).color;

    hit.on('pointerup', () => {
      this.brushColor = colorInt;
      if (this.toolMode !== 'crayon') this.switchTool('crayon');
      this.updateSelectedColor(container, bg, cellW, cellH);
      soundManager.play('select');
    });

    if (isDefaultSelected) {
      this.brushColor = colorInt;
      this.updateSelectedColor(container, bg, cellW, cellH);
    }

    this.contentObjects.push(container);
    return container;
  }

  updateSelectedColor(container, bg, cellW, cellH) {
    if (this.selectedColorBtn && this.selectedColorBtn !== container) {
      this.selectedColorBtn._bg.clear();
      this.selectedColorBtn.setScale(1);
      this.selectedColorBtn.setDepth(0);
    }
    bg.clear();
    bg.fillStyle(0xFFD93D, 0.4);
    const w = cellW || 122, h = cellH || 175;
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 10);
    container.setScale(1.06);
    container.setDepth(10);            // 선택된 크레파스가 위로 살짝 솟음
    container._bg = bg;
    this.selectedColorBtn = container;
  }

  // ===== 스티커 모드 =====
  showStickerMode() {
    this.clearContent();
    this.crayonTab.setActive(false);
    this.stickerTab.setActive(true);

    // 안내 라벨
    const lbl = this.add.text(this.panelX + this.panelW / 2, this.contentY + 30,
      '스티커 골라서 도화지를 콕!', {
        fontFamily: FONTS.bold, fontSize: '26px', color: '#FFD8E2',
    }).setOrigin(0.5);
    this.contentObjects.push(lbl);

    // 그리드 — 4열, 정사각 셀
    const cols = 4;
    const cellW = 158;
    const cellH = 158;
    const gridStartX = this.panelX + 60 + cellW / 2;
    const gridStartY = this.contentY + 90 + cellH / 2;

    DUMMY_STICKERS.slice(0, 16).forEach((key, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridStartX + col * cellW;
      const cy = gridStartY + row * cellH;
      this.makeStickerCell(cx, cy, key);
    });
  }

  makeStickerCell(cx, cy, stickerKey) {
    const cellW = 130, cellH = 130;
    const container = this.add.container(cx, cy);

    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.08);
    bg.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 16);
    container.add(bg);

    if (this.textures.exists(stickerKey)) {
      const img = this.add.image(0, 0, stickerKey);
      const tex = this.textures.get(stickerKey).getSourceImage();
      const scale = Math.min((cellW - 20) / tex.width, (cellH - 20) / tex.height);
      img.setScale(scale);
      container.add(img);
    }

    const hit = this.add.zone(0, 0, cellW, cellH).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerup', () => {
      this.selectSticker(stickerKey, container, bg);
    });

    this.contentObjects.push(container);
    return container;
  }

  selectSticker(stickerKey, container, bg) {
    if (this.selectedStickerBtn && this.selectedStickerBtn !== container) {
      this.selectedStickerBtn._bg.clear();
      this.selectedStickerBtn._bg.fillStyle(0xFFFFFF, 0.08);
      this.selectedStickerBtn._bg.fillRoundedRect(-65, -65, 130, 130, 16);
      this.selectedStickerBtn.setScale(1);
    }
    bg.clear();
    bg.fillStyle(0xFFD93D, 0.4);
    bg.fillRoundedRect(-65, -65, 130, 130, 16);
    container.setScale(1.08);
    container._bg = bg;
    this.selectedStickerBtn = container;
    this.selectedSticker = stickerKey;

    this.startCursorSticker(stickerKey);
  }

  // ===== 커서 따라다니는 스티커 미리보기 =====
  startCursorSticker(stickerKey) {
    this.clearCursorSticker();
    if (!this.textures.exists(stickerKey)) return;
    const tex = this.textures.get(stickerKey).getSourceImage();
    const targetSize = 100;
    const scale = Math.min(targetSize / tex.width, targetSize / tex.height);
    this.cursorSticker = this.add.image(this.input.activePointer.x, this.input.activePointer.y, stickerKey);
    this.cursorSticker.setScale(scale);
    this.cursorSticker.setAlpha(0.8);
    this.cursorSticker.setDepth(1000);
  }

  clearCursorSticker() {
    if (this.cursorSticker) {
      this.cursorSticker.destroy();
      this.cursorSticker = null;
    }
  }

  // ===== 입력 (그리기 + 스티커) =====
  isInCanvas(x, y) {
    return x >= this.canvasX && x <= this.canvasX + this.canvasW &&
           y >= this.canvasY && y <= this.canvasY + this.canvasH;
  }

  onPointerDown(pointer) {
    // 팝업(도구/팔레트) 활성 중에는 캔버스 입력 차단 — 색셀 클릭 누수 방지 (ColoringScene과 parity)
    //   ⚠️ 안전망 (대표님 피드백: "색이 아예 안칠해지는데?"):
    //     popup container는 depth 4500 — 실제로 떠있지 않으면 카운터 강제 reset
    if (this._popupCount > 0) {
      const hasOpenPopup = this.children.list.some(o => o && o.depth >= 4500 && o.active);
      if (!hasOpenPopup) this._popupCount = 0;
      else return;
    }

    // 페인트 도구 — 클릭한 위치의 닫힌 영역 flood fill
    if (this.toolMode === 'paint') {
      if (this.isInCanvas(pointer.x, pointer.y)) {
        this.performFloodFill(pointer.x, pointer.y);
      }
      return;
    }

    // 라인 도구 — pencil/brush/crayon + eraser
    const LINE_TOOLS = ['pencil', 'brush', 'crayon', 'eraser'];
    if (LINE_TOOLS.includes(this.toolMode)) {
      if (this.isInCanvas(pointer.x, pointer.y)) {
        this.isDrawing = true;
        this.lastX = pointer.x;
        this.lastY = pointer.y;
        this.rainbowPhase = Math.random();
        this.rainbowStops = this._makeRandomRainbowStops();
        // 새 stroke Graphics 생성 — undo 단위 (매 pointerdown ~ pointerup이 한 stroke)
        this.currentStroke = this.add.graphics();
        this.currentStroke.setDepth(20);
        this._maskObj(this.currentStroke);     // 종이 라운드 밖으로 새지 않게
        this.actionHistory.push({ type: 'stroke', obj: this.currentStroke });
        // ★ 첫 점 그리지 않음 — 도구/색 선택 직후 의도치 않은 점 찍힘 방지
        //   사용자 피드백: "도구 누르면 의도하지 않게 점이 찍히는 버그"
      }
    }
  }

  // ===== 페인트통 (flood fill) — 사용자 피드백 핵심 기능 =====
  //   1. 캔버스 영역 snapshot (현재 그림 + stroke 모두 캡처)
  //   2. HTML canvas로 옮겨 flood fill (클릭 위치부터 비슷한 색 인접 픽셀을 brushColor로 채움)
  //   3. 결과를 Phaser 이미지로 캔버스 영역에 표시 + actionHistory 등록 (undo 가능)
  performFloodFill(px, py) {
    soundManager.play('pop');
    this.game.renderer.snapshotArea(this.canvasX, this.canvasY, this.canvasW, this.canvasH, (image) => {
      if (!image || !image.src) return;
      if (!this.scene.isActive('SketchScene')) return;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvasW;
      tempCanvas.height = this.canvasH;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      const fillX = Math.floor(px - this.canvasX);
      const fillY = Math.floor(py - this.canvasY);
      const filled = this._floodFillCanvas(ctx, fillX, fillY, this.brushColor);
      if (!filled) return;

      // 결과 canvas를 텍스처로 만들어 게임 객체로 표시
      const texKey = `paint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (this.textures.exists(texKey)) this.textures.remove(texKey);
      this.textures.addCanvas(texKey, tempCanvas);
      const fillImg = this.add.image(this.canvasX, this.canvasY, texKey).setOrigin(0);
      fillImg.setDepth(15);     // stroke(20)보다 아래 — 새 stroke가 위에 그려짐
      this._maskObj(fillImg);   // 종이 라운드 밖으로 안 새게

      // undo 가능하게 history에 등록
      this.actionHistory.push({ type: 'paint', obj: fillImg });
    });
  }

  // HTML canvas flood fill — 클릭 픽셀 색 영역만 채우기
  //   문제: Phaser Graphics stroke는 anti-aliased → 가장자리 픽셀이 흰색에 가까움
  //         → tolerance 크면 boundary로 안 작동, 도화지 전체로 새어나감
  //   해결: tolerance를 stroke 가장자리 anti-alias 픽셀까지 boundary로 인식할 정도로 줄임
  //         흰 영역 클릭 시는 더 엄격 (anti-alias 살짝만 어두워도 멈춤)
  _floodFillCanvas(ctx, startX, startY, fillColor) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return false;

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const startIdx = (startY * w + startX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];

    // fillColor int → RGB
    const fr = (fillColor >> 16) & 0xFF;
    const fg = (fillColor >> 8) & 0xFF;
    const fb = fillColor & 0xFF;

    // 이미 같은 색이면 skip
    if (Math.abs(sr - fr) < 5 && Math.abs(sg - fg) < 5 && Math.abs(sb - fb) < 5) return false;

    // 시작 픽셀이 흰색 영역(도화지 빈 공간)인지 판정 — 흰색에 가까우면 (RGB 모두 240+)
    //   흰색 영역: tolerance 12 (anti-alias 가장자리에서 즉시 멈춤 → stroke가 boundary로 작동)
    //   다른 색 영역: tolerance 35 (paint 결과 영역 다시 채우기 등 — 약간 여유)
    const isWhiteStart = sr > 240 && sg > 240 && sb > 240;
    const tolerance = isWhiteStart ? 12 : 35;
    const tolSq = tolerance * tolerance;

    const stack = [startX, startY];
    const visited = new Uint8Array(w * h);

    while (stack.length > 0) {
      const cy = stack.pop();
      const cx = stack.pop();
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const vIdx = cy * w + cx;
      if (visited[vIdx]) continue;
      visited[vIdx] = 1;

      const idx = vIdx * 4;
      const dr = data[idx] - sr;
      const dg = data[idx + 1] - sg;
      const db = data[idx + 2] - sb;
      if (dr * dr + dg * dg + db * db > tolSq) continue;

      data[idx]     = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = 255;

      stack.push(cx + 1, cy);
      stack.push(cx - 1, cy);
      stack.push(cx, cy + 1);
      stack.push(cx, cy - 1);
    }

    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  onPointerMove(pointer) {
    // 라인 그리기 — pencil/brush/crayon/eraser 모두 처리 (도구별 텍스쳐는 _drawSketchSegment)
    //   ⚠️ 회귀 봉합 (대표님 피드백: "쭉 누르면서 쓰면 중간에 멈추거나 끊김"):
    //     기존: isInCanvas false → 전체 무시 (캔버스 가장자리 근처에서 lastX/Y 업데이트도 안 됨)
    //     수정: 좌표를 캔버스 안으로 클램프 → 가장자리 닿아도 연속 stroke 유지
    //           종이 둥근 마스크(_applyPaperMask)가 시각적으로 클립해주므로 안전
    const LINE_TOOLS = ['pencil', 'brush', 'crayon', 'eraser'];
    if (LINE_TOOLS.includes(this.toolMode) && this.isDrawing && pointer.isDown
        && this.currentStroke) {
      // pointer 좌표 클램프 (캔버스 영역 안)
      const px = Phaser.Math.Clamp(pointer.x, this.canvasX, this.canvasX + this.canvasW);
      const py = Phaser.Math.Clamp(pointer.y, this.canvasY, this.canvasY + this.canvasH);
      // 무지개 모드: segment마다 색 변화 / 단색: brushColor / 지우개: 흰색
      let segColor;
      if (this.toolMode === 'eraser') {
        segColor = 0xFFFFFF;
      } else if (this.isRainbowMode) {
        segColor = this._rainbowColorAt(this.rainbowPhase);
        this.rainbowPhase += 0.04;
      } else {
        segColor = this.brushColor;
      }
      this._drawSketchSegment(this.lastX, this.lastY, px, py, segColor);
      this.lastX = px;
      this.lastY = py;
    }
    // 스티커 미리보기 따라가기
    if (this.cursorSticker) {
      this.cursorSticker.x = pointer.x;
      this.cursorSticker.y = pointer.y;
    }
  }

  // 도구별 텍스쳐로 한 segment를 currentStroke에 그림
  //   pencil  : 가는 단선 (10px, alpha 1.0)
  //   brush   : 두꺼운 부드러운 선 (~brushSize*2, alpha 0.55)
  //   crayon  : solid 없이 빽빽한 점들 (그래뉼라 왁스 질감)
  //   eraser  : 흰색 두꺼운 선 (brushSize*1.4)
  _drawSketchSegment(x1, y1, x2, y2, color) {
    if (!this.currentStroke) return;
    const g = this.currentStroke;
    let lineWidth, alpha = 1.0;
    let drawCrayonOnly = false;
    switch (this.toolMode) {
      case 'pencil':
        lineWidth = 10;
        alpha = 1.0;
        break;
      case 'brush':
        lineWidth = Math.max(40, this.brushSize * 2.0);
        alpha = 0.55;
        break;
      case 'crayon':
        lineWidth = Math.max(36, this.brushSize * 1.5);
        drawCrayonOnly = true;
        break;
      case 'eraser':
        lineWidth = this.brushSize * 1.4;
        alpha = 1.0;
        break;
      default:
        lineWidth = this.brushSize;
        alpha = 1.0;
        break;
    }

    if (drawCrayonOnly) {
      // 크레파스 — solid 라인 없이 그래뉼라 점만
      this._drawCrayonNoiseG(g, x1, y1, x2, y2, lineWidth, color);
    } else {
      g.lineStyle(lineWidth, color, alpha);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(color, alpha);
      g.fillCircle(x2, y2, lineWidth / 2);
    }
  }

  // 크레파스 그래뉼라 텍스쳐 (Phaser Graphics 버전 — ColoringScene과 parity)
  //   - 가우시안 분포 (중앙 빽빽, 가장자리 듬성)
  //   - 점 크기 0.4~1.8px / 알파 0.25~0.85 다양
  //   - density 12 × 1px step → 빈틈 없는 밀도
  _drawCrayonNoiseG(g, x1, y1, x2, y2, lineWidth, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segDist = Math.max(dist, 0.1);
    const ux = dist > 0 ? dx / dist : 1;
    const uy = dist > 0 ? dy / dist : 0;
    const nx = -uy;
    const ny = ux;

    const halfW = lineWidth / 2;
    const stepLen = 1;
    const steps = Math.max(1, Math.ceil(segDist / stepLen));
    const density = 12;

    for (let s = 0; s < steps; s++) {
      const t = steps === 1 ? 0 : s / (steps - 1);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      for (let d = 0; d < density; d++) {
        const u1 = Math.random() || 1e-9;
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const off = Math.max(-halfW, Math.min(halfW, z * halfW * 0.45));
        const along = (Math.random() - 0.5) * 1.5;
        const jx = px + nx * off + ux * along;
        const jy = py + ny * off + uy * along;
        const r = 0.4 + Math.random() * 1.4;
        const a = 0.25 + Math.random() * 0.60;
        g.fillStyle(color, a);
        g.fillCircle(jx, jy, r);
      }
    }
  }

  onPointerUp(pointer) {
    this.isDrawing = false;
    this.currentStroke = null;     // stroke 종료 — 다음 pointerdown에서 새 stroke 시작
    // 스티커 도장 — 한 번 붙이면 커서에서 떼기 (사용자 피드백: 포토샵 브러시 X)
    if (this.toolMode === 'sticker' && this.selectedSticker && this.cursorSticker
        && this.isInCanvas(pointer.x, pointer.y)) {
      this.stampSticker(pointer.x, pointer.y, this.selectedSticker);
      // 한 번 사용 → 커서/선택 해제 (다시 골라야 또 붙일 수 있음)
      this.clearCursorSticker();
      this.deselectSticker();
    }
  }

  // 스티커 선택 해제
  deselectSticker() {
    if (this.selectedStickerBtn) {
      this.selectedStickerBtn._bg.clear();
      this.selectedStickerBtn._bg.fillStyle(0xFFFFFF, 0.08);
      this.selectedStickerBtn._bg.fillRoundedRect(-65, -65, 130, 130, 16);
      this.selectedStickerBtn.setScale(1);
      this.selectedStickerBtn = null;
    }
    this.selectedSticker = null;
  }

  stampSticker(x, y, stickerKey) {
    const tex = this.textures.get(stickerKey).getSourceImage();
    const targetSize = 100;
    const scale = Math.min(targetSize / tex.width, targetSize / tex.height);
    const stamp = this.add.image(x, y, stickerKey);
    stamp.setScale(scale * 1.3);
    stamp.setDepth(50);
    this._maskObj(stamp);     // 종이 라운드 밖으로 안 튀어나오게
    this.placedStickers.add(stamp);
    this.actionHistory.push({ type: 'sticker', obj: stamp });    // undo 용 액션 기록

    soundManager.play('pop');         // 스티커 도장 사운드

    // 톡 떨어지는 애니
    this.tweens.add({
      targets: stamp,
      scale: scale,
      duration: 200,
      ease: 'Back.out',
    });
  }

  // ===== 다시하기 (대표님 피드백: 카피/액션 수정) =====
  confirmClearCanvas() {
    this.showConfirmDialog(
      '다시 처음부터?',
      '새로운 도화지로 시작',
      '다시하기',
      '취소',
      () => this.clearCanvas()
    );
  }

  // ⚠️ 회귀 봉합 (대표님 피드백: "다시하기 눌렀을때 아무 일도 일어나지 않음")
  //   각 destroy를 try-catch로 안전화 → 한 obj가 깨져도 다른 obj는 정리됨
  //   + paint 이미지의 텍스처도 명시적으로 제거 (메모리 누수 방지)
  clearCanvas() {
    try {
      if (this.drawGraphics && this.drawGraphics.clear) this.drawGraphics.clear();
    } catch (e) { /* ignore */ }
    // 모든 stroke + sticker + paint 액션 destroy
    if (Array.isArray(this.actionHistory)) {
      this.actionHistory.forEach(a => {
        try {
          if (a && a.obj && a.obj.destroy) a.obj.destroy();
        } catch (e) { /* ignore */ }
      });
      this.actionHistory = [];
    }
    try { this.placedStickers?.clear(true, true); } catch (e) { /* ignore */ }
    this.currentStroke = null;
    this.isDrawing = false;
    // _popupCount stuck 방지 (다이얼로그 닫힘 후 입력 가드 해제 보장)
    this._popupCount = 0;
  }

  // ===== 완성 → 작품 저장 + "완성!" 큰 텍스트 → 갤러리(내 작품) =====
  //   ⚠️ snapshot 캡처가 다음 프레임에 비동기로 일어남
  //   → showCompleteEffect의 검은 overlay가 캡처에 포함되지 않게 콜백 안에서 effect 시작
  //   → 스케치북 스프링도 캡처 영역에 포함되므로 hide → snapshot → show
  //   (사용자 피드백: 저장한 그림에 스프링 라인이 남음, 회색 반투명)
  complete() {
    soundManager.play('fanfare');

    // Firebase Analytics — 자유 그림 완성 이벤트
    const durationSec = this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0;
    AnalyticsSystem.trackDrawingComplete({ durationSec });

    // 스프링 hide — 캡처 영역 (canvasY ~ canvasY+canvasH)에 스프링이 들어가서 그림 위에 남음
    if (this.springLayer) this.springLayer.setVisible(false);

    // Phaser renderer snapshot — 캔버스 영역만 잘라서 PNG 저장
    this.game.renderer.snapshotArea(this.canvasX, this.canvasY, this.canvasW, this.canvasH, (image) => {
      // 스프링 다시 표시 (이미 완성 effect 진행 중이라 곧 씬 종료되지만 안전상)
      if (this.springLayer) this.springLayer.setVisible(true);

      try {
        if (image && image.src) {
          // 갤러리 "이어 그리기"로 진입했으면 기존 작품 업데이트, 아니면 신규 추가
          if (this.existingArtwork && this.existingArtwork.id) {
            const ok = SaveSystem.updateArtwork(this.existingArtwork.id, image.src);
            if (!ok) SaveSystem.addArtwork('sketch', image.src);
          } else {
            SaveSystem.addArtwork('sketch', image.src);
          }
        }
      } catch (e) {
        console.error('[SketchScene] 작품 저장 실패', e);
      }

      // snapshot 완료 후에 effect overlay 시작 — overlay가 작품에 합성되는 버그 방지
      this.showCompleteEffect(() => this.exitToGallery());
    });
  }

  showCompleteEffect(onDone) {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);
    overlay.setDepth(900);

    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '완성!', {
      fontFamily: FONTS.bold, fontSize: '280px', color: '#FFD93D',
      stroke: '#5A2A40', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(901);
    banner.setScale(0);

    this.tweens.add({
      targets: banner, scale: 1.2, duration: 500, ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: [banner, overlay], alpha: 0, duration: 600, delay: 1800,
      onComplete: () => {
        banner.destroy(); overlay.destroy();
        if (onDone) onDone();
      },
    });
  }

  exitToGallery() {
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GalleryScene');
    });
  }

  // 호환용 — 우측 X(나가기) 버튼이 호출
  //   returnTo 있으면 (예: 갤러리에서 진입) 그쪽으로, 없으면 로비(MainScene) 직행
  //   그림그리기는 도안이 없어 메인으로 바로 — Task #66은 ColoringScene만 적용
  exitToHub() {
    const target = this.returnTo || 'MainScene';
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(target);
    });
  }

  // ===== 확인 다이얼로그 =====
  showConfirmDialog(title, subtitle, yesLabel, noLabel, onYes) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = this.add.container(0, 0).setDepth(1000);

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setInteractive();
    root.add(overlay);

    const panelW = 1000, panelH = 480;
    const panel = this.add.graphics();
    panel.fillStyle(0xFFF4F7, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    panel.lineStyle(8, 0xFFB6C8, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    root.add(panel);

    root.add(this.add.text(cx, cy - 130, title, {
      fontFamily: FONTS.bold, fontSize: '64px', color: '#5A2A40',
    }).setOrigin(0.5));

    root.add(this.add.text(cx, cy - 50, subtitle, {
      fontFamily: FONTS.game, fontSize: '36px', color: '#888888',
    }).setOrigin(0.5));

    root.add(this.makeIconLabelButton(cx + 200, cy + 110, 320, 110, '✓', yesLabel, 0x7FD8C0, 0x4FA088, () => {
      root.destroy();
      if (onYes) onYes();
    }));
    root.add(this.makeIconLabelButton(cx - 200, cy + 110, 320, 110, '✕', noLabel, 0xFFB6C8, 0xC66888, () => {
      root.destroy();
    }));

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 300, ease: 'Cubic.easeOut' });
  }

  exitToMain() {
    // returnTo 있으면 (예: 갤러리에서 진입) 그쪽으로 복귀
    const target = this.returnTo || 'SketchHubScene';
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(target);
    });
  }
}
