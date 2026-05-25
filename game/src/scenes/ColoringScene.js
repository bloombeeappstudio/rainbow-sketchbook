// 🎨 ColoringScene — 색칠놀이 (단순 도안 + 크레파스/물감 + 하단 크레파스 스트립)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { COLORS as CRAYON_COLORS, MAIN_PALETTE } from '../data/colors.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { fireConfetti, starBurst } from '../ui/Effects.js';
import { soundManager } from '../systems/SoundManager.js';
import { AnalyticsSystem } from '../systems/AnalyticsSystem.js';
import { getTemplateById } from '../data/coloringTemplates.js';
import { makeColorButton, makeSquareColorButton } from '../ui/ColorButton.js';
import { showPaletteGrid } from '../ui/PaletteGrid.js';
import { showToolPopup, TOOLS } from '../ui/ToolPopup.js';
import { addStarField } from '../ui/StarField.js';

export default class ColoringScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ColoringScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-sketch-1')) this.load.audio('bgm-sketch-1', 'sounds/bgm/sketch-1.mp3');
    if (!this.cache.audio.has('bgm-sketch-2')) this.load.audio('bgm-sketch-2', 'sounds/bgm/sketch-2.mp3');
    if (!this.cache.audio.has('bgm-sketch-3')) this.load.audio('bgm-sketch-3', 'sounds/bgm/sketch-3.mp3');
  }

  create(data = {}) {
    this._startTime = Date.now();   // 색칠 소요 시간 측정 (Analytics)
    this.cameras.main.fadeIn(600, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-sketch-1', 'bgm-sketch-2', 'bgm-sketch-3']);

    // 도안 선택 (TemplateSelectScene에서 전달)
    this.template = data.templateId ? getTemplateById(data.templateId) : null;
    // 갤러리에서 "이어 색칠하기"로 진입했으면 기존 작품 dataUrl을 paintCanvas에 미리 그림
    this.existingArtwork = data.existingArtwork || null;
    this.returnTo = data.returnTo || null;     // 'GalleryScene' 진입 시 나가기/완성 → 갤러리로 복귀
    // 도안이 없으면 — 도안 선택 화면으로 복귀 (방어 처리)
    if (!this.template) {
      this.cameras.main.fadeOut(300, 15, 8, 32);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('TemplateSelectScene');
      });
      return;
    }

    // 이전 인스턴스 텍스처 정리 (재진입 충돌 방지)
    if (this.textures.exists('paintTex')) this.textures.remove('paintTex');
    if (this.textures.exists('outlineTex')) this.textures.remove('outlineTex');

    // ===== 레이아웃 — 좌우 사이드바 균형 (사용자 요청: 좌측 ✕+액션3 / 우측 도구3) =====
    //   GAME_WIDTH 1920 / GAME_HEIGHT 1080
    //   좌 사이드바: x 0~190 (✕ 위 + 되돌리기/휴지통/완성 아래)
    //   캔버스    : x 190~1760 (1570 폭)
    //   우 사이드바: x 1760~1920 (폭 160) — 도구통합/무지개/지우개 3개
    this.LEFT_SB_W   = 190;
    this.RIGHT_SB_W  = 160;
    this.canvasX = this.LEFT_SB_W;
    this.canvasY = 60;
    this.canvasW = GAME_WIDTH - this.LEFT_SB_W - this.RIGHT_SB_W;
    this.canvasH = 960;       // 844 → 960 (하단 여백 제거)
    // 종이/도안/색칠 영역 4 모서리 라운드 (mask + paper 그리기 공통)
    this.PAPER_CORNER_R = 28;

    // ===== 상태 =====
    //   디폴트 'crayon' (라인) — 처음 진입 시 도구 선택 전 캔버스 클릭으로 의도치 않게
    //   flood fill 되지 않도록 안전한 기본 (paint는 도구팝업에서 선택 시만)
    this.toolMode    = 'crayon';     // 'pencil' | 'brush' | 'crayon' | 'paint' | 'eraser'
    this.brushColor  = 0xFF8FB1;     // 핑크 기본
    this.brushSize   = 28;
    this.lastX = 0;
    this.lastY = 0;
    this.isDrawing = false;
    this.selectedColorBtn = null;
    this.selectedSizeBtn = null;
    this.selectedToolBtn = null;
    // 팝업 활성 카운터 — 팝업이 캔버스 위에 떠있는 동안 캔버스 입력 차단
    //   사용자 피드백: "페인트통 누르고 색깔 고르면 또 뒤에 바로 색칠되어버림"
    //   원인: Phaser scene input은 zone 이벤트와 별개로 발화 → 색셀 클릭이 캔버스 pointerdown까지 흘러감
    //   해결: 팝업 열림/닫힘마다 ±1, onPointerDown에서 > 0이면 early return
    this._popupCount = 0;

    // 페이지 + Undo + 무지개
    this.currentPage = 0;
    this.history = [];               // canvas 스냅샷 (DataURL)
    this.MAX_HISTORY = 10;
    this.isRainbowMode = false;      // 레인보우 크레파스 활성 여부
    this.rainbowStops = null;        // 매 stroke 시작 시 셔플된 무지개 색 배열
    this.rainbowPhase = 0;           // 레인보우 그릴 때 색 진행도

    // ===== 두 캔버스 레이어 (사용자 피드백: 도안 라인이 이상해져) =====
    // 1) paintCanvas: 사용자 색칠 (플러드필 + 라인 그리기) — 흰 배경 + 도안 라인 (boundary 용)
    // 2) outlineCanvas: 도안 라인만 — 항상 위에 깨끗한 outline 표시 (수정 X)
    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = this.canvasW;
    this.paintCanvas.height = this.canvasH;
    this.paintCtx = this.paintCanvas.getContext('2d', { willReadFrequently: true });

    this.outlineCanvas = document.createElement('canvas');
    this.outlineCanvas.width = this.canvasW;
    this.outlineCanvas.height = this.canvasH;
    this.outlineCtx = this.outlineCanvas.getContext('2d');

    this.createBackground();
    this.createPaper();
    this.initPaintCanvas();          // paint: 흰 배경 + 도안 라인 (플러드필 boundary)
    this.initOutlineCanvas();        // outline: 투명 배경 + 도안 라인만 (오버레이 용)

    // 갤러리 "이어 색칠하기" — 기존 작품 dataUrl을 paintCanvas에 덮어 그림
    if (this.existingArtwork && this.existingArtwork.dataUrl) {
      const img = new Image();
      img.onload = () => {
        if (!this.paintCtx) return;
        this.paintCtx.drawImage(img, 0, 0, this.canvasW, this.canvasH);
        if (this.textures.exists('paintTex')) this.textures.get('paintTex').refresh();
      };
      img.src = this.existingArtwork.dataUrl;
    }

    // Phaser 텍스처
    this.textures.addCanvas('paintTex', this.paintCanvas);
    this.paintImage = this.add.image(this.canvasX, this.canvasY, 'paintTex').setOrigin(0);
    this.paintImage.setDepth(5);

    // Outline 오버레이 — 사용자 색칠 위에 항상 깨끗한 라인 표시
    this.textures.addCanvas('outlineTex', this.outlineCanvas);
    this.outlineImage = this.add.image(this.canvasX, this.canvasY, 'outlineTex').setOrigin(0);
    this.outlineImage.setDepth(15);
    // 명시적 refresh — Phaser 캔버스 텍스처 GPU 동기화
    this.textures.get('outlineTex').refresh();
    this.textures.get('paintTex').refresh();

    // 종이 둥근 모서리 마스크 적용 (도안/페인트가 종이 라운드 밖으로 안 튀어나오게)
    this._applyPaperMask();

    // 입력
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup',   this.onPointerUp,   this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    // UI — 상(도구+이름) / 하(컬러 일렬) / 우(액션)
    this.createTopBar();
    // 하단 팔레트 제거 — 색 선택은 paint/line 버튼 안 그리드 팝업으로
    // (기본 색 설정만 적용)
    this._initDefaultColor();
    this.createRightActions();
  }

  createBackground() {
    // 사이드바와 동일 단색 — 종이 라운드 주변 색 끊김 방지 (사용자 피드백)
    const bg = this.add.graphics();
    bg.fillStyle(0x3D2961, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 밤하늘 반짝이는 별 효과 (로딩화면과 동일) — 종이/사이드바보다 아래
    addStarField(this, { count: 80, depth: 1 });
  }

  createPaper() {
    // 종이/도안/색칠 영역의 4 모서리 라운드 (paint/outline mask와 동일 값 — 모서리 정확히 매칭)
    const r = this.PAPER_CORNER_R;

    // 종이 그림자
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(this.canvasX + 6, this.canvasY + 10, this.canvasW, this.canvasH, r);

    // 흰 종이 배경
    const paper = this.add.graphics();
    paper.fillStyle(0xFFFFFF, 1);
    paper.fillRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
    paper.lineStyle(4, 0xFFE4EC, 0.8);
    paper.strokeRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
  }

  // 도안 / paint 이미지에 둥근 사각형 마스크 적용
  //   사용자 피드백: "도안이랑 뒤에 스케치북이랑 잘 안맞는거 같아"
  //   → paint canvas / outline canvas는 사각이라 종이 둥근 모서리 밖으로 튀어나옴
  //   → GeometryMask로 종이와 동일한 cornerR로 클리핑 → 네 모서리 모두 종이와 정확히 매칭
  _applyPaperMask() {
    const r = this.PAPER_CORNER_R;
    const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
    maskGfx.fillStyle(0xFFFFFF, 1);
    maskGfx.fillRoundedRect(this.canvasX, this.canvasY, this.canvasW, this.canvasH, r);
    const geoMask = maskGfx.createGeometryMask();
    if (this.paintImage)   this.paintImage.setMask(geoMask);
    if (this.outlineImage) this.outlineImage.setMask(geoMask);
    this._paperMask = geoMask;     // 추가 레이어 (existing artwork 등) 재사용 가능
    this._paperMaskGfx = maskGfx;
  }

  // ===== 색칠 캔버스 초기화 — 흰 배경 + 도안 (플러드필 boundary 용) =====
  initPaintCanvas() {
    const ctx = this.paintCtx;
    const W = this.canvasW;
    const H = this.canvasH;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    this._drawTemplate(ctx, W / 2, H / 2, 1.0, true);
    // 흑백 binarize — anti-aliased 라인을 완전 검정으로, 나머지를 완전 흰색으로
    //   → flood fill 시 라인 boundary 확실히 차단, 열린 라인 픽셀 사이 새지 않음
    this._binarizePaint();
    // stroke buffer (lazy) — region mask 합성용
    if (!this._strokeBuffer) {
      this._strokeBuffer = document.createElement('canvas');
      this._strokeBuffer.width = W;
      this._strokeBuffer.height = H;
    }
  }

  // ===== 외곽선 전용 캔버스 (수정 X) =====
  initOutlineCanvas() {
    const ctx = this.outlineCtx;
    const W = this.canvasW;
    const H = this.canvasH;
    ctx.clearRect(0, 0, W, H);
    this._drawTemplate(ctx, W / 2, H / 2, 1.0, false);
    // 라인만 검정 + 나머지 투명 (오버레이 라인 깨끗하게)
    this._binarizeOutline();
  }

  // 도안 그리기 — PNG 텍스처 우선, 없으면 코드 함수
  //   사용자 피드백: 도안이 너무 작아 클릭 어려움 → 캔버스 영역 거의 채우게 키움
  _drawTemplate(ctx, cx, cy, scale, fillRegions) {
    const tpl = this.template;
    if (tpl.textureKey && this.textures.exists(tpl.textureKey)) {
      const tex = this.textures.get(tpl.textureKey).getSourceImage();
      // 캔버스 안에 fit (90% 사용 → 가장자리 작은 여백)
      const maxW = this.canvasW * 0.92;
      const maxH = this.canvasH * 0.92;
      const fit = Math.min(maxW / tex.width, maxH / tex.height);
      const dw = tex.width * fit;
      const dh = tex.height * fit;
      ctx.drawImage(tex, cx - dw / 2, cy - dh / 2, dw, dh);
    } else if (tpl.draw) {
      tpl.draw(ctx, cx, cy, scale, fillRegions);
    }
  }

  // ===== paintCanvas binarize — 흰 배경 + 완전 검정 라인 =====
  //   anti-aliased 회색 픽셀을 라인(검정) or 배경(흰)으로 강제 분리
  //   → flood fill boundary가 명확해져 도안 안쪽이 새지 않고 정확히 채워짐
  //
  //   ⚠️ 대표님 영구 원칙 (memory/feedback_coloring_region_mask.md):
  //     임계값 380→500 (평균 167)으로 보수적 → anti-alias 회색까지 검정
  //   ❌ dilation은 시각적으로 라인을 두껍게 만들어서 롤백 (Task #64)
  //      라인 끊김은 도안 PNG 단계에서 깔끔하게 만드는 게 정답
  _binarizePaint() {
    const ctx = this.paintCtx;
    const W = this.canvasW;
    const H = this.canvasH;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      const sum = data[i] + data[i + 1] + data[i + 2];
      if (a < 128) {
        // 투명 → 흰색
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      } else if (sum < 500) {
        // 어두운 + anti-alias 가장자리 → 완전 검정 (라인 두께 안전 마진)
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      } else {
        // 밝은 → 완전 흰색
        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ===== outlineCanvas binarize — 검정 라인 + 컬러 샘플 보존 + 흰 배경 투명 =====
  //   채도(saturation) 있는 픽셀은 원본 컬러 유지 (왼쪽 상단 컬러 샘플)
  //   채도 없는 회색계열만 binarize: 어두우면 검정 라인, 밝으면 투명
  _binarizeOutline() {
    const ctx = this.outlineCtx;
    const W = this.canvasW;
    const H = this.canvasH;
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) {
        // 투명 → 투명 유지
        data[i + 3] = 0;
        continue;
      }
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;  // 채도 근사 (0=완전 회색, 높을수록 컬러)
      if (sat > 30) {
        // 채도 있는 컬러 픽셀 → 원본 그대로 보존 (컬러 샘플 살리기)
        continue;
      }
      // 회색계열: 밝으면 투명, 어두우면 완전 검정 라인
      const sum = r + g + b;
      if (sum > 380) {
        data[i + 3] = 0;
      } else {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // (도안 drawing은 data/coloringTemplates.js로 분리됨 — this.template.draw 사용)

  // ===== 상단 바 — 스케치북 스프링 디자인 (텍스트/도구 토글 모두 제거) =====
  //   사용자 요청: 상단 "색칠놀이/도안 이름" 텍스트 삭제, 좌측 X(지우개) 삭제
  //                대신 스케치북 코일 모양 (가로 일렬 둥근 사각형)
  createTopBar() {
    this.drawSketchbookSpring(this.canvasX, this.canvasY, this.canvasW);
  }

  // ===== 스케치북 스프링/코일 디자인 — 캔버스 위쪽 가장자리 =====
  //   회색 둥근 사각형 코일들이 가로 일렬, 각 코일 안에 작은 검은 구멍
  drawSketchbookSpring(canvasX, canvasY, canvasW) {
    const coilW = 50;
    const coilH = 56;
    const coilGap = 24;
    const unit = coilW + coilGap;
    const usableW = canvasW - 20;
    const coilCount = Math.max(8, Math.floor(usableW / unit));
    const stripW = coilCount * coilW + (coilCount - 1) * coilGap;
    const startX = canvasX + (canvasW - stripW) / 2 + coilW / 2;
    const coilY = canvasY - coilH / 2 + 18;       // 캔버스 상단과 살짝 겹쳐서 박힌 느낌

    for (let i = 0; i < coilCount; i++) {
      const cx = startX + i * unit;
      // 그림자
      const sh = this.add.graphics();
      sh.fillStyle(0x000000, 0.4);
      sh.fillRoundedRect(cx - coilW / 2 + 2, coilY - coilH / 2 + 6, coilW, coilH, 14);
      // 메탈릭 베이스 (어두운 회색)
      const base = this.add.graphics();
      base.fillStyle(0x8A92A6, 1);
      base.fillRoundedRect(cx - coilW / 2, coilY - coilH / 2, coilW, coilH, 14);
      // 메탈릭 본체 (밝은 회색)
      const body = this.add.graphics();
      body.fillStyle(0xBCC4D4, 1);
      body.fillRoundedRect(cx - coilW / 2 + 2, coilY - coilH / 2 + 2, coilW - 4, coilH - 8, 12);
      // 상단 광택
      const glow = this.add.graphics();
      glow.fillStyle(0xFFFFFF, 0.55);
      glow.fillRoundedRect(cx - coilW / 2 + 6, coilY - coilH / 2 + 5, coilW - 12, 12, 6);
      // 가운데 구멍 (스프링 통과 부분)
      const hole = this.add.graphics();
      hole.fillStyle(0x2C1B47, 1);
      hole.fillCircle(cx, coilY + 4, 7);
      // 구멍 내부 깊이감
      const holeInner = this.add.graphics();
      holeInner.fillStyle(0x000000, 0.5);
      holeInner.fillCircle(cx, coilY + 5, 4);
    }
  }

  // ===== 스냅샷 / 되돌리기 =====
  saveSnapshot() {
    if (this.history.length >= this.MAX_HISTORY) this.history.shift();
    this.history.push(this.paintCanvas.toDataURL());
  }

  undo() {
    if (!this.history || this.history.length === 0) {
      soundManager.play('click');
      return;
    }
    // 그리기 중이면 즉시 멈춤 — drag 도중 undo 시 정확한 복원
    this.isDrawing = false;

    const dataUrl = this.history.pop();
    const img = new Image();
    img.onload = () => {
      if (!this.paintCtx || !this.paintCanvas) return;     // scene 종료된 경우 가드
      this.paintCtx.clearRect(0, 0, this.paintCanvas.width, this.paintCanvas.height);
      this.paintCtx.drawImage(img, 0, 0);
      if (this.textures.exists('paintTex')) {
        this.textures.get('paintTex').refresh();
      }
      soundManager.play('pop');
    };
    img.onerror = () => {
      console.warn('[ColoringScene.undo] snapshot image load failed');
      soundManager.play('click');
    };
    img.src = dataUrl;
  }

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

  // ===== 하단 컬러 팔레트 — 16색 가로 일렬 (캔버스 폭 안에 정렬) =====
  //   사용자 요청: 사이드바에 가려지지 않게 → 컬러 줄을 캔버스 폭(1500) 안에 정렬
  //   사이즈 80, gap 8 → 16*80 + 15*8 = 1400, 캔버스 정중앙 정렬
  createBottomPalette() {
    this.colorButtons = [];
    this.selectedColorBtn = null;
    const colors = MAIN_PALETTE;

    const btnSize = 80;
    const gap = 8;
    const totalW = colors.length * btnSize + (colors.length - 1) * gap;
    // 캔버스 정중앙 기준 정렬 (사이드바 영역 침범 X)
    const canvasCenterX = this.canvasX + this.canvasW / 2;
    const startX = canvasCenterX - totalW / 2 + btnSize / 2;
    const cy = 1000;     // 캔버스 끝(924) 아래 충분한 갭

    colors.forEach((c, i) => {
      const cx = startX + i * (btnSize + gap);
      const btn = makeSquareColorButton(this, cx, cy, btnSize, c, (color) => this.selectColor(btn, color));
      this.colorButtons.push(btn);
    });

    // 기본 선택 — 솜사탕 핑크 (토슴이 메인톤)
    const defaultIdx = colors.findIndex(c => c.id === 12);
    if (defaultIdx >= 0) this.selectColor(this.colorButtons[defaultIdx], colors[defaultIdx]);
    else if (this.colorButtons.length > 0) this.selectColor(this.colorButtons[0], colors[0]);

    // "더보기" 토글 버튼 — 우측 끝에 추가 (8×8 그리드 팝업)
    this._makePaletteMoreButton(startX + totalW + 8, cy, btnSize);
  }

  // 8×8 그리드 팔레트 토글 버튼 (하단 팔레트 우측 끝)
  _makePaletteMoreButton(cx, cy, size) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.20);
    sh.fillRoundedRect(-half, -half + 5, size, size, cornerR);
    container.add(sh);

    // 무지개 그라데이션 본체 (세로 줄무늬)
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

    // 광택
    const gloss = this.add.graphics();
    gloss.fillStyle(0xFFFFFF, 0.35);
    gloss.fillRoundedRect(-half + 6, -half + 5, size - 12, 18, 10);
    container.add(gloss);

    // 외곽선
    const border = this.add.graphics();
    border.lineStyle(3, 0xFFFFFF, 0.85);
    border.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(border);

    // "+" 표시 (가운데 흰 원 + 검은 +)
    const plusBg = this.add.graphics();
    plusBg.fillStyle(0xFFFFFF, 0.92);
    plusBg.fillCircle(0, 0, size * 0.22);
    container.add(plusBg);
    container.add(this.add.text(0, 0, '+', {
      fontFamily: FONTS.bold, fontSize: `${Math.round(size * 0.42)}px`, color: '#5A2A40',
    }).setOrigin(0.5));

    // 클릭
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

  // 팔레트 그리드 팝업 열기 (사이드바 무지개컬러 버튼 라인 기준 왼쪽 펼침)
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

  // 그리드에서 선택한 색을 적용 (하단 팔레트 없음)
  //   + 컬러 버튼에도 선택한 색 반영 (사용자 피드백: "어떤 색 쓰는지 버튼에 반영")
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
    // 지우개/도구 미선택 상태에서 색 선택 시 → crayon 도구로 자동 전환
    const drawTools = ['pencil', 'brush', 'crayon', 'paint'];
    if (!drawTools.includes(this.toolMode)) this.setToolMode('crayon');
  }

  // 잠금 색 클릭 시 안내 토스트
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

  // ===== 사이드바 — 좌우 분리 (사용자 요청: 좌측 ✕+액션3 / 우측 도구3) =====
  //   좌측: ✕(상단) + 되돌리기/휴지통/완성(하단)
  //   우측: 도구통합 + 무지개컬러 + 지우개 (3개 균등)
  createRightActions() {
    this.toolBtns = this.toolBtns || {};
    this._createRightToolbar();
    this._createLeftToolbar();
    // 디폴트 도구 활성화 표시
    this.updateToolButtons();
  }

  // 우측 사이드바 — 도구 3개 (위 정렬, 붙어서) + 우하단 ✓ (완성)
  _createRightToolbar() {
    const sbX = GAME_WIDTH - this.RIGHT_SB_W;
    const sbW = this.RIGHT_SB_W;
    const cx = sbX + sbW / 2;

    // 사이드바 배경 — 캔버스 배경과 동일 색 (라운드 주변 색 끊김 방지)
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
      { icon: 'tool-eraser', color: 0xB8F0DD, tool: 'eraser', onClick: () => this.setToolMode('eraser'), iconScale: 0.55 },
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

    // 우하단 ✓ — 완성 (사용자 피드백: 좌측에서 우측 하단으로 이동)
    const completeCY = GAME_HEIGHT - bottomMargin - btnSize / 2;
    this.makeSquareIconBtn(cx, completeCY, btnSize, 0x7FD8C0, '✓', () => this.complete());
  }

  // 좌측 사이드바 — ✕(상단) + 되돌리기/휴지통(하단 2개)
  _createLeftToolbar() {
    const sbW = this.LEFT_SB_W;
    const cx = sbW / 2;

    // 사이드바 배경 — 캔버스 배경과 동일 색
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

  // ===== 라운드 정사각형 3D 아이콘 버튼 (도구 토글 + 우측 액션 공통) =====
  //   size: 한 변 길이, color: 본체 색, icon: 텍스트/이모지
  //   iconScale: 아이콘 크기 비율 (기본 0.5, 컴팩트한 이모지는 0.6~0.7로)
  makeSquareIconBtn(cx, cy, size, color, icon, onClick, iconScale = 0.5) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    // 깊은 그림자 (3D)
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.4);
    sh.fillRoundedRect(-half + 2, -half + 9, size, size, cornerR);
    container.add(sh);

    // 베이스 (살짝 진한 톤 — 측면 입체감)
    const darker = Phaser.Display.Color.IntegerToColor(color).darken(20).color;
    const lighter = Phaser.Display.Color.IntegerToColor(color).lighten(25).color;
    const base = this.add.graphics();
    base.fillStyle(darker, 1);
    base.fillRoundedRect(-half, -half + 3, size, size, cornerR);
    container.add(base);

    // 본체 (메인 색)
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-half + 2, -half + 2, size - 4, size - 4, cornerR - 2);
    container.add(bg);

    // 상단 하이라이트 (3D 광택)
    const glow = this.add.graphics();
    glow.fillStyle(lighter, 0.55);
    glow.fillRoundedRect(-half + 6, -half + 6, size - 12, (size - 12) * 0.42, cornerR - 4);
    container.add(glow);

    // 흰 외곽선
    const stroke = this.add.graphics();
    stroke.lineStyle(4, 0xFFFFFF, 0.9);
    stroke.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(stroke);

    // 아이콘 — PNG 텍스처가 있으면 이미지, 'tool-eraser'는 직접 그리기, 나머지는 이모지
    //   사용자 피드백:
    //     - 붓 → 🖍 (크레용, 색칠 도구에 더 어울림)
    //     - 지우개 → 네모 지우개 (반창고처럼 보이는 🩹 X) → Phaser graphics로 직접
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

    // 선택 ring (도구 토글용 — 초기 숨김)
    const ring = this.add.graphics();
    ring.setVisible(false);
    container.add(ring);
    container._ring = ring;
    container._size = size;
    container._cornerR = cornerR;
    container._iconObj = iconObj;

    // 동적 아이콘 변경 (도구 선택 시 호출) — 새 아이콘으로 교체, z-order는 ring 직전
    //   ⚠️ 회귀 봉합 (대표님 피드백: "색이 아예 안칠해지는데?")
    //   기존: remove(_, true) 먼저 → destroy 부작용이 painting flow 깨뜨릴 가능성
    //   수정: 새 icon 먼저 추가 → 그 다음에 old를 제거 (destroy 실패해도 새 icon 유지)
    //   + 전체 try-catch (예외가 후속 painting을 깨지 못하게)
    container.setIcon = (newIcon, newScale = iconScale) => {
      try {
        let newObj;
        try { newObj = buildIconObj(newIcon, newScale); }
        catch (e) { console.warn('[setIcon] buildIconObj failed', e); return; }
        if (!newObj) return;
        // ring 직전에 삽입 (없으면 그냥 add — addAt(-1) 무시되는 회귀 방지)
        const ringIdx = container.getIndex(container._ring);
        if (ringIdx >= 0) container.addAt(newObj, ringIdx);
        else container.add(newObj);
        // old 정리 (실패해도 새 icon은 이미 살아있음)
        const oldObj = container._iconObj;
        container._iconObj = newObj;
        if (oldObj && oldObj !== newObj) {
          try { container.remove(oldObj, true); } catch (e) { /* ignore */ }
        }
      } catch (e) { console.warn('[setIcon] outer error', e); }
    };

    // 인터랙션
    const hit = this.add.zone(0, 0, size + 8, size + 8).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = cy + 4; });
    hit.on('pointerup',   () => {
      container.y = container._isActive ? cy - 6 : cy;
      soundManager.play('click');
      if (onClick) onClick();
    });
    hit.on('pointerout',  () => { container.y = container._isActive ? cy - 6 : cy; });

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
        container.setScale(1.08);
      } else {
        ring.setVisible(false);
        container.y = cy;
        container.setScale(1);
      }
    };
    return container;
  }

  // 네모 지우개 직접 그리기 — 분홍 본체 + 흰 stripe (위 절반) + 짙은 테두리
  //   사용자 피드백: 🩹는 대일밴드처럼 보임 → 진짜 지우개 모양으로
  _drawEraserIcon(size) {
    const c = this.add.container(0, 0);
    const w = size * 0.62;
    const h = size * 0.38;
    const r = 6;

    // 그림자 (살짝 입체감)
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.25);
    sh.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, r);
    c.add(sh);

    // 분홍 본체 (지우개 전체)
    const body = this.add.graphics();
    body.fillStyle(0xFF8FB1, 1);
    body.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    c.add(body);

    // 흰 stripe (위 절반 — 종이/박스 라벨 느낌)
    const stripe = this.add.graphics();
    stripe.fillStyle(0xFFFAF5, 1);
    stripe.fillRoundedRect(-w / 2, -h / 2, w, h * 0.45, r);
    // stripe 하단 직사각 잘림 처리
    stripe.fillRect(-w / 2, -h / 2 + h * 0.4, w, h * 0.05);
    c.add(stripe);

    // 외곽선
    const outline = this.add.graphics();
    outline.lineStyle(2.5, 0x5A2A40, 0.9);
    outline.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    c.add(outline);

    // 가운데 구분선 (흰/분홍 경계)
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x5A2A40, 0.8);
    divider.lineBetween(-w / 2, -h / 2 + h * 0.45, w / 2, -h / 2 + h * 0.45);
    c.add(divider);

    return c;
  }

  setToolMode(mode) {
    this.toolMode = mode;
    // 도구 통합 버튼 아이콘 — 선택된 도구로 변경 (사용자 피드백: "내가 선택한 도구로 바껴야 함")
    const cfg = TOOLS.find(t => t.id === mode);
    if (cfg && this.toolBtns?.tools?.setIcon) {
      this.toolBtns.tools.setIcon(cfg.icon, 0.7);
    }
    this.updateToolButtons();
  }

  // 무지개 컬러 버튼 — 사이드바 두 번째 위치 (팔레트 그리드 진입)
  _makeRainbowBtn(cx, cy, size, onClick) {
    const container = this.add.container(cx, cy);
    const half = size / 2;
    const cornerR = Math.round(size * 0.24);

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.22);
    sh.fillRoundedRect(-half, -half + 5, size, size, cornerR);
    container.add(sh);

    // 무지개 가로 줄무늬 (6색) — 초기 상태
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

    // 광택
    const gloss = this.add.graphics();
    gloss.fillStyle(0xFFFFFF, 0.32);
    gloss.fillRoundedRect(-half + 8, -half + 6, size - 16, 22, 12);
    container.add(gloss);

    // 외곽선
    const border = this.add.graphics();
    border.lineStyle(3, 0xFFFFFF, 0.85);
    border.strokeRoundedRect(-half, -half, size, size, cornerR);
    container.add(border);

    // 클릭
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
      bg.fillRect(-half, -half, size, size);     // mask가 라운드 모서리 자동 클리핑
    };

    return container;
  }

  // 기본 색 초기화 (하단 팔레트 없이 — 솜사탕 핑크)
  _initDefaultColor() {
    const defaultColor = MAIN_PALETTE.find(c => c.id === 12) || MAIN_PALETTE[0];
    if (defaultColor) {
      this.brushColor = parseInt(defaultColor.hex.replace('#', ''), 16);
      this.isRainbowMode = !!defaultColor.rainbowGradient;
    }
  }

  // paint 버튼 클릭 — paint 모드 + 팔레트 그리드 자동 등장
  _onPaintBtnClick() {
    this.setToolMode('paint');
    this._openPaletteGrid();
  }

  // 선 그리기 도구 팝업 — tools 버튼 라인부터 아래로 펼침
  //   4종: 펜 / 붓 / 크레파스 / 물감(flood fill)
  //   사용자 피드백: 도구 선택 후 자동 팔레트 X — 컬러는 어린이가 따로 탭하도록
  _openToolPopup() {
    const cur = ['pencil', 'brush', 'crayon', 'paint'].includes(this.toolMode)
      ? this.toolMode : 'crayon';
    const toolsBtn = this.toolBtns?.tools;
    const anchorX = toolsBtn ? toolsBtn.x : (GAME_WIDTH - 80);
    const topY = toolsBtn ? toolsBtn.y : 135;
    this._popupCount++;
    showToolPopup(this, anchorX, topY, cur, (toolId) => {
      this.setToolMode(toolId);
      // (자동 팔레트 호출 제거) — 도구만 바뀌고 끝
    }, () => { this._popupCount = Math.max(0, this._popupCount - 1); });
  }

  updateToolButtons() {
    if (!this.toolBtns) return;
    // 'tools' 버튼: 펜/붓/크레파스/물감 중 하나일 때 활성
    // 'eraser' 버튼: eraser 모드일 때 활성
    // 'colors' 버튼: 활성 표시 없음 (팔레트 opener)
    const drawTools = ['pencil', 'brush', 'crayon', 'paint'];
    Object.entries(this.toolBtns).forEach(([key, btn]) => {
      if (!btn || typeof btn.setActive2 !== 'function') return;
      if (key === 'tools') {
        btn.setActive2(drawTools.includes(this.toolMode));
      } else if (key === 'eraser') {
        btn.setActive2(this.toolMode === 'eraser');
      } else {
        btn.setActive2(false);
      }
    });
  }

  // 굵기 토글 — 14 / 28 / 50 순환
  cycleBrushSize() {
    const sizes = [14, 28, 50];
    const i = sizes.indexOf(this.brushSize);
    this.brushSize = sizes[(i + 1) % sizes.length];
    this.updateSizeIndicator();
  }

  // 굵기 표시 — 우 사이드바의 ⬤ 버튼 안쪽 점 사이즈로
  updateSizeIndicator() {
    if (!this.sizeIndicator) return;
    // 기존 dot 제거 후 새로
    if (this._sizeDot) this._sizeDot.destroy();
    const dotR = Math.min(this.brushSize / 2, 18);
    this._sizeDot = this.add.circle(this.sizeIndicator.x, this.sizeIndicator.y, dotR, 0x5A2A40);
    this._sizeDot.setDepth(50);
  }

  selectColor(btn, color) {
    if (this.selectedColorBtn && this.selectedColorBtn !== btn) {
      this.selectedColorBtn.setSelected(false);
    }
    btn.setSelected(true);
    this.selectedColorBtn = btn;

    this.brushColor = Phaser.Display.Color.HexStringToColor(color.hex).color;
    this.isRainbowMode = !!color.rainbowGradient;
    if (this.toolMode === 'eraser') this.setToolMode('crayon');
    soundManager.play('select');
  }

  // ===== 입력 — 크레파스(라인) / 물감(플러드필) =====
  isInCanvas(x, y) {
    return x >= this.canvasX && x <= this.canvasX + this.canvasW &&
           y >= this.canvasY && y <= this.canvasY + this.canvasH;
  }

  onPointerDown(pointer) {
    // 팝업(도구/팔레트) 활성 중에는 캔버스 입력 차단
    //   사용자 피드백: "페인트통 누르고 색깔 고르면 또 뒤에 바로 색칠되어버림" 해결
    //   ⚠️ 안전망 (대표님 피드백: "색이 아예 안칠해지는데?"):
    //     popup container는 depth 4500 — 실제로 떠있지 않으면 카운터 강제 reset
    if (this._popupCount > 0) {
      const hasOpenPopup = this.children.list.some(o => o && o.depth >= 4500 && o.active);
      if (!hasOpenPopup) this._popupCount = 0;
      else return;
    }
    if (!this.isInCanvas(pointer.x, pointer.y)) return;

    // 모든 동작 시작 전 스냅샷 저장 → 되돌리기 가능
    this.saveSnapshot();

    // 선 그리기 도구 — pencil/brush/crayon + eraser
    //   paint(물감)은 영역 채우기로 별도 처리 (아래 else if 분기)
    const LINE_TOOLS = ['pencil', 'brush', 'crayon', 'eraser'];
    if (LINE_TOOLS.includes(this.toolMode)) {
      this.isDrawing = true;
      this.rainbowPhase = Math.random();
      this.rainbowStops = this._makeRandomRainbowStops();
      this.lastX = pointer.x - this.canvasX;
      this.lastY = pointer.y - this.canvasY;
      // ★ region mask 생성 — 시작 영역만 색칠 (대표님 영구 원칙: 라인 밖 절대 금지)
      //   memory/feedback_coloring_region_mask.md
      this._buildRegionMask(Math.floor(this.lastX), Math.floor(this.lastY));
      // 첫 점 그리지 않음 — 사용자가 드래그(move)해야 그림 시작
      //   → 도구/색 선택 후 의도치 않은 점 찍힘 버그 방지
    } else if (this.toolMode === 'paint') {
      const cx = Math.floor(pointer.x - this.canvasX);
      const cy = Math.floor(pointer.y - this.canvasY);
      // 무지개 컬러 선택 시 → 영역 안을 알록달록 그라데이션으로 채움
      if (this.isRainbowMode) {
        this._floodFillRainbow(cx, cy);
      } else {
        this._floodFill(cx, cy, this.brushColor);
      }
      soundManager.play('pop');
    }
  }

  onPointerMove(pointer) {
    if (this.toolMode === 'paint') return;
    if (!this.isDrawing || !pointer.isDown) return;
    // ⚠️ 회귀 봉합 (대표님 피드백: "중간에 멈추거나 끊김"):
    //   기존: isInCanvas false → 전체 무시 (가장자리에서 끊김)
    //   수정: 좌표 클램프 → 가장자리 닿아도 연속 stroke (outsideMask가 시각 차단해줌)
    const px = Phaser.Math.Clamp(pointer.x, this.canvasX, this.canvasX + this.canvasW);
    const py = Phaser.Math.Clamp(pointer.y, this.canvasY, this.canvasY + this.canvasH);
    const x = px - this.canvasX;
    const y = py - this.canvasY;
    this._drawLineCanvas(this.lastX, this.lastY, x, y);
    this.lastX = x;
    this.lastY = y;
  }

  onPointerUp() {
    // 지우개 후 outline 재그리기 X — outlineCanvas가 별도 레이어로 항상 깨끗함
    this.isDrawing = false;
    // ★ region mask 해제 — 다음 stroke에서 새 시작점 영역으로 재생성 (대표님 영구 원칙)
    this._regionMask = null;
    this._regionIsOutside = false;
  }

  // 라인 그리기 — Canvas API
  //   도구별 텍스쳐 (대표님 요구: 4종 확실하게 차이)
  //     pencil  : 가늘고 단단한 선 (~10px)
  //     brush   : 매우 두껍고 부드러운 겹침 (~brushSize*2, alpha 0.55)
  //     crayon  : 중간 굵기 + 거친 점/노이즈 텍스쳐 (왁스 질감)
  //     eraser  : 흰색 두꺼운 선
  _drawLineCanvas(x1, y1, x2, y2) {
    const ctx = this.paintCtx;

    // 색 결정 — 지우개는 흰색, 레인보우는 phase에 따라 색 변환
    let color;
    if (this.toolMode === 'eraser') {
      color = '#FFFFFF';
    } else if (this.isRainbowMode) {
      color = this._rainbowColorAt(this.rainbowPhase);
      this.rainbowPhase += 0.04;
    } else {
      color = this._intToHex(this.brushColor);
    }

    // 도구별 stroke 특성 (lineWidth, alpha, cap, 텍스쳐 여부)
    //   crayonOnly=true면 solid stroke 그리지 않고 그래뉼라 노이즈만 그림 (진짜 크레파스 질감)
    let lineWidth = this.brushSize;
    let alpha = 1.0;
    let cap = 'round';
    let drawCrayonTexture = false;
    let crayonOnly = false;
    switch (this.toolMode) {
      case 'pencil':
        // 가는 펜 — 또렷한 선
        lineWidth = 10;
        alpha = 1.0;
        cap = 'round';
        break;
      case 'brush':
        // 두꺼운 붓 — 부드러운 겹침
        lineWidth = Math.max(40, this.brushSize * 2.0);
        alpha = 0.55;
        cap = 'round';
        break;
      case 'crayon':
        // 크레파스 — solid 라인 없이 점들로만 (왁스가 종이결에 묻은 그래뉼라 질감)
        lineWidth = Math.max(36, this.brushSize * 1.5);
        alpha = 0;          // solid stroke 안 그림
        cap = 'round';
        drawCrayonTexture = true;
        crayonOnly = true;
        break;
      case 'eraser':
        lineWidth = this.brushSize * 1.4;
        alpha = 1.0;
        cap = 'round';
        break;
      default:
        lineWidth = this.brushSize;
        alpha = 0.92;
        cap = 'round';
        break;
    }

    // ★ 도안 외부 / 라인 위 시작 시 stroke 차단 (대표님 영구 원칙: 라인 밖 절대 금지)
    if (this._regionIsOutside) {
      return;
    }

    // ★ region mask 적용: 시작 영역 안에서만 그려짐 (대표님 영구 원칙)
    //   memory/feedback_coloring_region_mask.md — 라인 밖 절대 금지
    if (this._regionMask && this._strokeBuffer) {
      const bctx = this._strokeBuffer.getContext('2d');
      // 1. buffer clear + stroke 한 점 그리기 (이전 점 잔존 X)
      bctx.clearRect(0, 0, this.canvasW, this.canvasH);
      bctx.save();
      // crayonOnly가 아니면 solid stroke + 캡 fill (펜/붓/지우개)
      if (!crayonOnly) {
        bctx.globalAlpha = alpha;
        bctx.strokeStyle = color;
        bctx.fillStyle = color;
        bctx.lineWidth = lineWidth;
        bctx.lineCap = cap;
        bctx.lineJoin = 'round';
        bctx.beginPath();
        bctx.moveTo(x1, y1);
        bctx.lineTo(x2, y2);
        bctx.stroke();
        bctx.beginPath();
        bctx.arc(x2, y2, lineWidth / 2, 0, Math.PI * 2);
        bctx.fill();
      }
      // 크레파스 텍스쳐 — 그래뉼라 점 산포 (왁스가 종이결에 묻은 질감)
      if (drawCrayonTexture) {
        this._drawCrayonNoise(bctx, x1, y1, x2, y2, lineWidth, color);
      }
      bctx.restore();
      // 2. mask 적용 (destination-in) — 시작 영역 밖 stroke 픽셀 제거
      bctx.globalCompositeOperation = 'destination-in';
      bctx.drawImage(this._regionMask, 0, 0);
      bctx.globalCompositeOperation = 'source-over';
      // 3. paintCanvas에 합성 (누적)
      ctx.drawImage(this._strokeBuffer, 0, 0);
    } else {
      // mask 없음 — 자유 그리기 (기존 동작)
      ctx.save();
      if (!crayonOnly) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = cap;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x2, y2, lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (drawCrayonTexture) {
        this._drawCrayonNoise(ctx, x1, y1, x2, y2, lineWidth, color);
      }
      ctx.restore();
    }

    this.textures.get('paintTex').refresh();
  }

  // 크레파스 그래뉼라 텍스쳐 — solid 라인 없이 빽빽한 점들로 표현
  //   - 가우시안 분포 (중앙 빽빽, 가장자리 듬성)
  //   - 점 크기 0.4~1.8px 다양
  //   - 알파 0.25~0.85 다양 (왁스 두께 차이)
  //   - density 12 × 1px step → 빈틈 없는 밀도
  _drawCrayonNoise(ctx, x1, y1, x2, y2, lineWidth, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // 단일 점도 그릴 수 있게 dist≈0 케이스 처리 (정지 점)
    const segDist = Math.max(dist, 0.1);
    const ux = dist > 0 ? dx / dist : 1;
    const uy = dist > 0 ? dy / dist : 0;
    const nx = -uy;
    const ny = ux;

    const halfW = lineWidth / 2;
    const stepLen = 1;                                         // 1px 간격 (빽빽)
    const steps = Math.max(1, Math.ceil(segDist / stepLen));
    const density = 12;                                        // step당 점 개수

    ctx.save();
    ctx.fillStyle = color;
    for (let s = 0; s < steps; s++) {
      const t = steps === 1 ? 0 : s / (steps - 1);
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      for (let d = 0; d < density; d++) {
        // 가우시안 분포 (Box-Muller) — 중앙 밀집, 가장자리로 갈수록 듬성
        const u1 = Math.random() || 1e-9;
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        // 표준편차 = halfW * 0.45 → 95%가 ±halfW 안
        const off = Math.max(-halfW, Math.min(halfW, z * halfW * 0.45));
        const along = (Math.random() - 0.5) * 1.5;             // 라인 방향 ±0.75px 흔들림
        const jx = px + nx * off + ux * along;
        const jy = py + ny * off + uy * along;
        const r = 0.4 + Math.random() * 1.4;                   // 0.4~1.8px 점
        const a = 0.25 + Math.random() * 0.60;                 // 0.25~0.85 알파
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(jx, jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 레인보우 그라디언트 색 보간 (id=100 의 5색을 phase에 따라 부드럽게)
  // 매 stroke 시작 시 — 무지개 색 배열을 랜덤 셔플 (시작점 + 방향)
  //   사용자 피드백: 매번 같은 무지개가 나오면 안 됨, 한 번 칠할 때마다 매번 다르게
  _makeRandomRainbowStops() {
    // 진한 무지개 7색 + 마젠타 (cycle 자연스럽게 닫힘)
    const VIVID = [
      [255,  85, 119],   // 핫 핑크
      [255, 145,  60],   // 오렌지
      [255, 215,  65],   // 노랑
      [120, 210, 130],   // 민트 그린
      [ 95, 175, 255],   // 스카이 블루
      [165, 110, 255],   // 라벤더
      [255, 110, 200],   // 마젠타
    ];
    // 랜덤 시작점 → cycle rotation
    const startIdx = Math.floor(Math.random() * VIVID.length);
    const rotated = [];
    for (let i = 0; i < VIVID.length; i++) {
      rotated.push(VIVID[(startIdx + i) % VIVID.length]);
    }
    // 50% 확률로 역방향 (빨→보 / 보→빨)
    if (Math.random() < 0.5) rotated.reverse();
    return rotated;
  }

  // 무지개 색 보간 — this.rainbowStops (stroke마다 셔플된 배열) 기반
  _rainbowColorAt(phase) {
    // fallback: stops 아직 안 만들어졌으면 즉시 생성
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
    return `rgb(${r}, ${g}, ${b})`;
  }

  _intToHex(intColor) {
    return '#' + intColor.toString(16).padStart(6, '0');
  }

  // ===== ★ Region Mask (boundary 안에서만 색칠) =====
  //   사용 흐름 (대표님 영구 원칙 — memory/feedback_coloring_region_mask.md):
  //     1. onPointerDown 시점에 시작점에서 flood-fill로 region mask 생성
  //     2. _drawLineCanvas에서 stroke buffer + destination-in으로 mask 안만 그려짐
  //     3. 시작점이 라인 위(검정)면 → stroke 전체 무시 (자유 그리기 fallback 금지)
  //     4. 시작점이 도안 외부(가장자리 흰 영역)면 → _regionIsOutside=true → 전체 차단
  //     5. 다음 pointerdown에서 mask 재생성 (사용자가 다른 영역 클릭 시 자동 갱신)
  _buildRegionMask(startX, startY) {
    this._regionIsOutside = false;
    this._regionMask = null;
    const W = this.canvasW;
    const H = this.canvasH;
    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

    const srcData = this.paintCtx.getImageData(0, 0, W, H);
    const data = srcData.data;
    const startIdx = (startY * W + startX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];

    // ★ 시작점이 검정 라인 위면 stroke 무시 (자유 그리기 fallback 금지)
    //   대표님 영구 원칙: 라인 밖 절대 금지
    if (sr + sg + sb < 80) {
      this._regionIsOutside = true;     // 차단 플래그 재사용
      return;
    }

    // 적응적 tolerance (흰 영역 6 / 색 영역 35)
    //   ⚠️ 흰 영역 tolerance 12 → 6 강화 (대표님 피드백: 옆 영역으로 새는 문제)
    const isWhiteStart = sr > 240 && sg > 240 && sb > 240;
    const tolerance = isWhiteStart ? 6 : 35;
    const tolSq = tolerance * tolerance;

    // flood-fill로 visited 배열 생성 + 가장자리 접촉 감지
    //   ⚠️ 라인 명시적 차단: 시작이 흰색이면 visit 픽셀도 흰색만 (R/G/B 각각 235 이상)
    //   binarize로 라인은 0, 배경은 255 → 사이 회색은 차단
    let touchedEdge = false;
    const visited = new Uint8Array(W * H);
    const stack = [startX, startY];
    while (stack.length > 0) {
      const cy = stack.pop();
      const cx = stack.pop();
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;
      // 캔버스 가장자리 접근 = 도안 외부 영역
      if (cx === 0 || cy === 0 || cx === W - 1 || cy === H - 1) touchedEdge = true;
      const vIdx = cy * W + cx;
      if (visited[vIdx]) continue;
      const idx = vIdx * 4;
      // 시작이 흰 영역이면 — 흰 픽셀만 통과 (라인 명시적 차단)
      if (isWhiteStart) {
        if (data[idx] < 235 || data[idx + 1] < 235 || data[idx + 2] < 235) continue;
      } else {
        // 색 영역 시작 — 기존 tolerance 비교
        const dr = data[idx] - sr;
        const dg = data[idx + 1] - sg;
        const db = data[idx + 2] - sb;
        if (dr * dr + dg * dg + db * db > tolSq) continue;
      }
      visited[vIdx] = 1;
      stack.push(cx + 1, cy);
      stack.push(cx - 1, cy);
      stack.push(cx, cy + 1);
      stack.push(cx, cy - 1);
    }

    // ★ 외부 영역(캔버스 가장자리 접한 흰 영역) 차단 — 도안 옆 배경에 색칠 X
    if (touchedEdge && isWhiteStart) {
      this._regionIsOutside = true;
      return;
    }

    // ★ mask 1픽셀 erosion — 라인 가장자리 안전 마진
    //   visited 픽셀의 4 이웃이 모두 visited인 픽셀만 유지 → 라인 침범 1픽셀 더 안쪽
    //   (작은 영역이 너무 좁아져서 사라지면 erosion skip — 최소 mask 크기 보장)
    let visitedCount = 0;
    for (let i = 0; i < W * H; i++) if (visited[i]) visitedCount++;
    let finalMask = visited;
    if (visitedCount > 100) {     // 너무 좁으면 erosion skip (안 그러면 mask 통째로 사라짐)
      const eroded = new Uint8Array(W * H);
      let erodedCount = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = y * W + x;
          if (visited[i]
              && visited[i - 1] && visited[i + 1]
              && visited[i - W] && visited[i + W]) {
            eroded[i] = 1;
            erodedCount++;
          }
        }
      }
      if (erodedCount > visitedCount * 0.3) finalMask = eroded;     // 70% 이상 사라지면 skip
    }

    // mask canvas 생성: finalMask=1 영역만 흰색(불투명), 나머지는 투명
    //   destination-in 합성에서 흰 영역만 통과
    if (!this._regionMaskCanvas) {
      this._regionMaskCanvas = document.createElement('canvas');
      this._regionMaskCanvas.width = W;
      this._regionMaskCanvas.height = H;
    }
    const maskCtx = this._regionMaskCanvas.getContext('2d');
    const maskImg = maskCtx.createImageData(W, H);
    const md = maskImg.data;
    for (let i = 0; i < W * H; i++) {
      if (finalMask[i]) {
        const j = i * 4;
        md[j] = 255; md[j + 1] = 255; md[j + 2] = 255; md[j + 3] = 255;
      }
    }
    maskCtx.putImageData(maskImg, 0, 0);
    this._regionMask = this._regionMaskCanvas;

    // stroke buffer 생성 (lazy)
    if (!this._strokeBuffer) {
      this._strokeBuffer = document.createElement('canvas');
      this._strokeBuffer.width = W;
      this._strokeBuffer.height = H;
    }
  }

  // ===== 플러드필 (물감 모드) — Canvas ImageData 직접 조작 + outline 재그리기 =====
  _floodFill(startX, startY, fillColor) {
    const ctx = this.paintCtx;
    const W = this.canvasW;
    const H = this.canvasH;

    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    const startIdx = (startY * W + startX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];

    // 도안 라인(검정 외곽선) 위 클릭이면 skip
    if (sr + sg + sb < 80) return;

    const fr = (fillColor >> 16) & 0xff;
    const fg = (fillColor >> 8) & 0xff;
    const fb = fillColor & 0xff;

    // 같은 색으로 채우려는 경우 skip
    if (Math.abs(sr - fr) < 5 && Math.abs(sg - fg) < 5 && Math.abs(sb - fb) < 5) return;

    // 사용자 피드백: 사용자가 크레파스로 그린 stroke를 boundary로 인식해야 함
    //   → tolerance를 SketchScene과 동일하게 적응적으로 (흰 영역 12 / 색 영역 35)
    //   → 흰 시작 시 stroke anti-alias 픽셀이 즉시 boundary로 작동
    //   → SketchScene과 100% 동일 알고리즘 (UI/기능 parity 원칙)
    const isWhiteStart = sr > 240 && sg > 240 && sb > 240;
    const tolerance = isWhiteStart ? 12 : 35;
    const tolSq = tolerance * tolerance;
    const stack = [[startX, startY]];
    const visited = new Uint8Array(W * H);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;

      const vIdx = cy * W + cx;
      if (visited[vIdx]) continue;
      visited[vIdx] = 1;

      const idx = vIdx * 4;
      const dr = data[idx] - sr;
      const dg = data[idx + 1] - sg;
      const db = data[idx + 2] - sb;
      if (dr * dr + dg * dg + db * db > tolSq) continue;

      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = 255;

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    // outline 재그리기 X — 별도 outlineCanvas가 항상 위에 깨끗하게 표시됨
    this.textures.get('paintTex').refresh();
  }

  // ===== 무지개 플러드필 — 영역 안을 6색 그라데이션으로 알록달록 채움 =====
  //   1단계: 일반 flood fill로 visited 영역 모음 + bbox 추적
  //   2단계: 각 픽셀의 (x+y) 대각 비율로 6색 stops 사이 보간 채우기
  _floodFillRainbow(startX, startY) {
    const ctx = this.paintCtx;
    const W = this.canvasW;
    const H = this.canvasH;

    if (startX < 0 || startX >= W || startY < 0 || startY >= H) return;

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    const startIdx = (startY * W + startX) * 4;
    const sr = data[startIdx], sg = data[startIdx + 1], sb = data[startIdx + 2];
    const startSum = sr + sg + sb;

    // 도안 라인 위면 무시
    if (startSum < 250) return;

    // 무지개 색 — 매번 랜덤 셔플 (사용자 피드백: 한 번 칠할 때마다 매번 다르게)
    const stops = this._makeRandomRainbowStops();

    const tolerance = 220;
    const tolSq = tolerance * tolerance;
    const outlineThreshold = 250;
    const stack = [[startX, startY]];
    const visited = new Uint8Array(W * H);

    // 1단계: visited 영역 모음 + bbox 추적
    const region = [];   // [x, y, idx]
    let minX = startX, maxX = startX, minY = startY, maxY = startY;

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= W || cy < 0 || cy >= H) continue;

      const vIdx = cy * W + cx;
      if (visited[vIdx]) continue;
      visited[vIdx] = 1;

      const idx = vIdx * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];

      if (r + g + b < outlineThreshold) continue;

      const dr = r - sr, dg = g - sg, db = b - sb;
      if (dr * dr + dg * dg + db * db > tolSq) continue;

      region.push(cx, cy, idx);
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    // 2단계: 그라데이션 방향 랜덤 (4가지 중 픽) → 매번 다른 패턴
    //   x: 좌→우 / y: 상→하 / diag: 좌상→우하 / antiDiag: 좌하→우상
    const dirs = ['x', 'y', 'diag', 'antiDiag'];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    let rangeMin, rangeMax;
    if (dir === 'x')         { rangeMin = minX;          rangeMax = maxX; }
    else if (dir === 'y')    { rangeMin = minY;          rangeMax = maxY; }
    else if (dir === 'diag') { rangeMin = minX + minY;   rangeMax = maxX + maxY; }
    else                     { rangeMin = minX - maxY;   rangeMax = maxX - minY; }
    const range = Math.max(1, rangeMax - rangeMin);
    const nStops = stops.length;

    for (let k = 0; k < region.length; k += 3) {
      const x = region[k], y = region[k + 1], idx = region[k + 2];
      let v;
      if (dir === 'x')         v = x;
      else if (dir === 'y')    v = y;
      else if (dir === 'diag') v = x + y;
      else                     v = x - y;
      const t = (v - rangeMin) / range;      // 0~1
      const stopF = t * (nStops - 1);
      const i0 = Math.floor(stopF);
      const i1 = Math.min(i0 + 1, nStops - 1);
      const f = stopF - i0;
      const c0 = stops[i0];
      const c1 = stops[i1];
      data[idx]     = Math.round(c0[0] * (1 - f) + c1[0] * f);
      data[idx + 1] = Math.round(c0[1] * (1 - f) + c1[1] * f);
      data[idx + 2] = Math.round(c0[2] * (1 - f) + c1[2] * f);
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    this.textures.get('paintTex').refresh();
  }

  // ===== 다시하기 (대표님 피드백: 카피/액션 수정) =====
  confirmClearCanvas() {
    this.showConfirmDialog(
      '다시 처음부터?',
      '새로운 도화지로 시작',
      '다시하기',
      '취소',
      () => {
        // 다시하기 전 상태도 undo로 복원 가능
        this.saveSnapshot();
        // paintCanvas 초기화 (흰 배경 + 도안 라인 재그리기 + outsideMask 재생성)
        this.initPaintCanvas();
        this.textures.get('paintTex').refresh();
      },
    );
  }

  // ===== 완성 → 작품 저장 + 컨페티 + "완성!" 큰 텍스트 → 내 작품(갤러리) =====
  complete() {
    soundManager.play('reward');

    // Firebase Analytics — 색칠 완성 이벤트
    const durationSec = this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0;
    AnalyticsSystem.trackColoringComplete({
      templateId: this.template?.id,
      categoryId: this.template?.categoryId,
      durationSec,
    });

    // 1. 작품 저장 (paintCanvas + outlineCanvas 합쳐서 PNG dataURL)
    try {
      const merged = document.createElement('canvas');
      merged.width = this.canvasW;
      merged.height = this.canvasH;
      const ctx = merged.getContext('2d');
      ctx.drawImage(this.paintCanvas, 0, 0);
      ctx.drawImage(this.outlineCanvas, 0, 0);
      const dataUrl = merged.toDataURL('image/png');
      // 갤러리 "이어 색칠하기"로 진입했으면 기존 작품 업데이트, 아니면 신규 추가
      if (this.existingArtwork && this.existingArtwork.id) {
        const ok = SaveSystem.updateArtwork(this.existingArtwork.id, dataUrl, { templateId: this.template?.id });
        if (!ok) SaveSystem.addArtwork('coloring', dataUrl, { templateId: this.template?.id });
      } else {
        SaveSystem.addArtwork('coloring', dataUrl, { templateId: this.template?.id });
      }
    } catch (e) {
      console.error('[ColoringScene] 작품 저장 실패', e);
    }

    // 2. 효과 + "완성!" 큰 배너
    fireConfetti(this, { count: 100, duration: 2800 });
    starBurst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, { count: 24, distance: 280 });

    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '완성!', {
      fontFamily: FONTS.bold, fontSize: '280px', color: '#FFD93D',
      stroke: '#5A2A40', strokeThickness: 12,
    }).setOrigin(0.5).setDepth(2200);
    banner.setScale(0);
    this.tweens.add({ targets: banner, scale: 1.2, duration: 500, ease: 'Back.out' });
    this.tweens.add({
      targets: banner, alpha: 0, duration: 600, delay: 1800,
      onComplete: () => banner.destroy(),
    });

    // 3. 2.8초 후 갤러리(내 작품)로 이동
    this.time.delayedCall(2800, () => this.exitToGallery());
  }

  exitToGallery() {
    this.isDrawing = false;
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GalleryScene');
    });
  }

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

  exitToHub() {
    // 그리는 중이면 멈추기 (안전)
    this.isDrawing = false;

    // returnTo 있으면 (예: 갤러리에서 진입) 그쪽으로 복귀, 없으면 도안 선택 화면으로
    //   - 대표님 영구 박제 변경 (Task #66): 색칠놀이 나가기 = TemplateSelectScene 직행
    //     도안을 다시 고를 수 있게 → 로비까지 갈 필요 X
    //   - 카테고리 정보가 있으면 같이 전달해서 해당 카테고리 펼친 상태로
    const target = this.returnTo || 'TemplateSelectScene';
    const startData = (!this.returnTo && this.template?.categoryId)
      ? { categoryId: this.template.categoryId }
      : undefined;
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(target, startData);
    });
  }
}
