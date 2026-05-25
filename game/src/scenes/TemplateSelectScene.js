// 🎨 TemplateSelectScene — 색칠놀이 카테고리 선택 (4종)
//   1단계: 4 카테고리 카드 (캐릭터/우주/음식/바닷속)
//   2단계: 선택한 카테고리의 도안 목록 (또는 "곧 만나요!" 안내)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { soundManager } from '../systems/SoundManager.js';
import { CATEGORIES, getCategoryById, isTemplateFree } from '../data/coloringTemplates.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';
import { IAPSystem } from '../systems/IAPSystem.js';
import { AnalyticsSystem } from '../systems/AnalyticsSystem.js';

export default class TemplateSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TemplateSelectScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-sketch-1')) this.load.audio('bgm-sketch-1', 'sounds/bgm/sketch-1.mp3');
    if (!this.cache.audio.has('bgm-sketch-2')) this.load.audio('bgm-sketch-2', 'sounds/bgm/sketch-2.mp3');
    if (!this.cache.audio.has('bgm-sketch-3')) this.load.audio('bgm-sketch-3', 'sounds/bgm/sketch-3.mp3');
  }

  create(data = {}) {
    this.cameras.main.fadeIn(500, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM(['bgm-sketch-1', 'bgm-sketch-2', 'bgm-sketch-3']);

    // 배경 (별빛 우주)
    this.createBackground();

    // 상단 바
    this.createTopBar();

    // 초기 뷰 — 진입 시 categoryId 받으면 해당 카테고리 도안 목록으로 바로
    //   (대표님 영구 박제 Task #66: 색칠놀이 나가기 → 도안 선택 화면으로 복귀, 같은 카테고리 유지)
    this.viewMode = 'category';         // 'category' | 'templates'
    this.selectedCategoryId = null;
    this.contentLayer = this.add.layer();
    if (data && data.categoryId) {
      this.showCategoryDetail(data.categoryId);
    } else {
      this.showCategoryView();
    }
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x4A2D6E, 0x4A2D6E, 0x2C1B47, 0x2C1B47, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // 별빛
    for (let i = 0; i < 50; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        Phaser.Math.FloatBetween(1, 2.5),
        0xFFFFFF,
        Phaser.Math.FloatBetween(0.3, 0.7)
      );
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.7 },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  createTopBar() {
    // 좌상단 나가기 (카테고리 화면이면 허브로, 도안 화면이면 카테고리로)
    this.backButton = createStandardBackButton(this, () => this.onBackPressed(), { x: 140 });
  }

  onBackPressed() {
    if (this.viewMode === 'templates') {
      this.showCategoryView();
    } else {
      this.exitToHub();
    }
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

  // ===== 콘텐츠 레이어 비우기 (뷰 전환 시) =====
  clearContent() {
    this.contentLayer.getAll().forEach(obj => obj.destroy());
    // 페이지 스와이프 핸들러 정리 (이전 화면의 listener가 다음 화면에 남지 않게)
    if (this._swipeDown) this.input.off('pointerdown', this._swipeDown, this);
    if (this._swipeUp)   this.input.off('pointerup',   this._swipeUp,   this);
    this._swipeDown = null;
    this._swipeUp = null;
    this.pageWrapper = null;
    this.dots = null;
    this.leftArrow = null;
    this.rightArrow = null;
  }

  // ===== 1단계 — 카테고리 카드 4개 =====
  showCategoryView() {
    this.viewMode = 'category';
    this.selectedCategoryId = null;
    this.clearContent();

    // 큰 한 줄 안내 텍스트 (사용자 피드백: '도안 선택' + '무엇을 색칠할까?' 합치고 크게)
    const hint = this.add.text(GAME_WIDTH / 2, 170, '어떤 그림을 색칠할까?', {
      fontFamily: FONTS.bold,
      fontSize: '92px',          // 52 → 92 (대폭 키움)
      color: '#FFD8E2',
    }).setOrigin(0.5);
    hint.setShadow(0, 5, 'rgba(58,31,61,0.7)', 12, false, true);
    this.contentLayer.add(hint);

    // 4x2 그리드 (8 카테고리) — 사용자 피드백: 카테고리 4 → 8 증대
    //   가로 4 컬럼이라 카드 컴팩트화 + 내부 레이아웃 단순화
    const cols = 4;
    const rows = 2;
    const cardW = 420;
    const cardH = 280;
    const gapX = 28;
    const gapY = 32;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = GAME_WIDTH / 2 - totalW / 2 + cardW / 2;

    // 세로 균등 정렬 — 큰 타이틀(y=170) 아래부터 하단까지에서 위/아래 여백 균등
    const headerBottom = 240;
    const gridH = rows * cardH + (rows - 1) * gapY;
    const slack = GAME_HEIGHT - headerBottom - gridH;
    const topMargin = Math.max(40, slack / 2);
    const startY = headerBottom + topMargin + cardH / 2;

    CATEGORIES.forEach((cat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.makeCategoryCard(x, y, cardW, cardH, cat);
    });
  }

  // 카테고리 카드 — 디자이너 재정비
  //   원칙:
  //     1) 상단 띠 제거 → 단순함 (이모지가 카드의 주인공)
  //     2) 이모지 카드 가운데 위쪽 (큰 사이즈, 시각적 무게중심)
  //     3) 이름 카드 하단 (가벼운 stroke — 흰색 위 살짝 짙은 라인만)
  //     4) 잠금 카드: 어두운 오버레이 + 가운데 큰 🔒 + "곧 만나요" (어린이가 즉시 인지)
  //     5) 둥근 모서리 상단 안쪽에 미세 광택 (입체감)
  makeCategoryCard(x, y, w, h, category) {
    const container = this.add.container(x, y);
    const cornerR = 36;     // 32 → 36 (좀 더 부드러운 모서리)
    const isLocked = !category.templates || category.templates.length === 0;

    // 1. 그림자 — 카테고리 자체 어두운 색 (검은색 X, 색감 충돌 없음)
    const sh = this.add.graphics();
    sh.fillStyle(category.shadow, 1);
    sh.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, cornerR);
    container.add(sh);

    // 2. 본체
    const bg = this.add.graphics();
    bg.fillStyle(category.bg, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, cornerR);
    container.add(bg);

    // 3. 둥근 모서리 안쪽 미세 광택 (입체감) — 띠 X, 카드 상단 둥글게 따라가는 highlight
    const glow = this.add.graphics();
    glow.fillStyle(0xFFFFFF, 0.18);
    glow.fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, 28, cornerR - 14);
    container.add(glow);

    // 4. 이모지 — 카드 가운데 위쪽 (시각 무게중심)
    const emoji = this.add.text(0, -32, category.emoji, {
      fontFamily: FONTS.game,
      fontSize: '120px',
    }).setOrigin(0.5);
    container.add(emoji);

    // 5. 이름 — 카드 하단 (가벼운 톤, 흰색 + 얇은 stroke)
    const nameTxt = this.add.text(0, 80, category.name, {
      fontFamily: FONTS.bold,
      fontSize: '52px',
      color: '#FFFFFF',
      stroke: '#3A1F3D',
      strokeThickness: 3,     // 5 → 3 (가벼움)
    }).setOrigin(0.5);
    nameTxt.setShadow(0, 3, 'rgba(58,31,61,0.4)', 6, false, true);
    container.add(nameTxt);

    // 6. 잠금 카드 — 가운데 큰 자물쇠 + "곧 만나요" (배지 X)
    if (isLocked) {
      // 어두운 반투명 오버레이 (이모지/이름 흐리게 보임)
      const lockOverlay = this.add.graphics();
      lockOverlay.fillStyle(0x2C1B47, 0.55);
      lockOverlay.fillRoundedRect(-w / 2, -h / 2, w, h, cornerR);
      container.add(lockOverlay);

      // 큰 자물쇠 (오버레이 위, 카드 가운데 약간 위 — 이모지 자리)
      const lock = this.add.text(0, -28, '🔒', {
        fontFamily: FONTS.bold,
        fontSize: '88px',
      }).setOrigin(0.5);
      container.add(lock);

      // "곧 만나요" 텍스트 (자물쇠 아래, 카드 하단)
      const comingTxt = this.add.text(0, 78, '곧 만나요', {
        fontFamily: FONTS.bold,
        fontSize: '36px',
        color: '#FFE5EC',
      }).setOrigin(0.5);
      comingTxt.setShadow(0, 3, 'rgba(0,0,0,0.5)', 6, false, true);
      container.add(comingTxt);
    }

    // 인터랙션
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 5; });
    hit.on('pointerup', () => {
      container.y = y;
      soundManager.play('pop');
      this.showCategoryDetail(category.id);
    });
    hit.on('pointerout', () => { container.y = y; });

    this.contentLayer.add(container);
  }

  // ===== 2단계 — 카테고리 내부 (도안 목록 또는 "곧 만나요!" 안내) =====
  showCategoryDetail(categoryId) {
    const category = getCategoryById(categoryId);
    if (!category) return;

    this.viewMode = 'templates';
    this.selectedCategoryId = categoryId;
    this.clearContent();

    // 카테고리 헤더 (이모지 + 이름) — 위로 살짝 올림 (그리드 공간 확보)
    const headerY = 170;
    const headerEmoji = this.add.text(GAME_WIDTH / 2 - 200, headerY, category.emoji, {
      fontFamily: FONTS.game,
      fontSize: '86px',
    }).setOrigin(0.5);
    this.contentLayer.add(headerEmoji);

    const headerName = this.add.text(GAME_WIDTH / 2 - 80, headerY, category.name, {
      fontFamily: FONTS.bold,
      fontSize: '76px',
      color: '#FFD8E2',
    }).setOrigin(0, 0.5);
    this.contentLayer.add(headerName);

    // "모두 잠금 해제" 버튼 — 잠긴 도안이 있는 카테고리에서만 표시
    // 잠긴 도안 + 아직 해금 안 됐을 때만 "전체 잠금 해제" 버튼 노출
    const hasLocked = category.templates && category.templates.some(t => t.free === false);
    if (hasLocked && !IAPSystem.isPremiumUnlocked()) {
      const unlockBtn = this._makeUnlockAllButton(category);
      this.contentLayer.add(unlockBtn);
    }

    if (!category.templates || category.templates.length === 0) {
      this.showEmptyCategoryMessage(category);
    } else {
      this.showTemplateGrid(category);
    }
  }

  // ===== "모두 잠금 해제" 버튼 (우상단 — 나가기 원래 자리) =====
  _makeUnlockAllButton(category) {
    const bw = 400, bh = 96;
    const bx = GAME_WIDTH - bw / 2 - 48;
    const by = 80;
    const container = this.add.container(bx, by);
    container.setDepth(100);

    // 외곽 글로우 (핑크 후광)
    const glow = this.add.graphics();
    glow.fillStyle(0xFF4D88, 0.25);
    glow.fillRoundedRect(-bw / 2 - 6, -bh / 2 - 4, bw + 12, bh + 8, bh / 2 + 4);
    container.add(glow);

    // 그림자 (깊은 오프셋)
    const sh = this.add.graphics();
    sh.fillStyle(0x9A1848, 1);
    sh.fillRoundedRect(-bw / 2, -bh / 2 + 9, bw, bh, bh / 2);
    container.add(sh);

    // 버튼 본체 (핑크)
    const btn = this.add.graphics();
    btn.fillStyle(0xFF2D72, 1);
    btn.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    container.add(btn);

    // 상단 밝은 하이라이트 띠
    const hl = this.add.graphics();
    hl.fillStyle(0xFFFFFF, 0.28);
    hl.fillRoundedRect(-bw / 2 + 12, -bh / 2 + 8, bw - 24, 30, bh / 2 - 4);
    container.add(hl);

    // 라벨
    const lbl = this.add.text(0, -1, '🔓  모두 잠금 해제', {
      fontFamily: FONTS.bold,
      fontSize: '42px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    lbl.setShadow(0, 3, 'rgba(100,0,40,0.55)', 5, false, true);
    container.add(lbl);

    // 인터랙션
    const hit = this.add.zone(0, 0, bw, bh).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = by + 5; });
    hit.on('pointerup', () => {
      container.y = by;
      soundManager.play('pop');
      this.showUnlockDialog(category);
    });
    hit.on('pointerout', () => { container.y = by; });
    return container;
  }

  // 비어있는 카테고리 — "곧 만나요!" 안내
  showEmptyCategoryMessage(category) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 30;

    // 큰 카드
    const cardW = 900;
    const cardH = 450;
    const sh = this.add.graphics();
    sh.fillStyle(category.shadow, 1);
    sh.fillRoundedRect(cx - cardW / 2, cy - cardH / 2 + 10, cardW, cardH, 36);
    this.contentLayer.add(sh);
    const bg = this.add.graphics();
    bg.fillStyle(category.bg, 1);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 36);
    this.contentLayer.add(bg);

    // 큰 이모지
    const bigEmoji = this.add.text(cx, cy - 110, category.emoji, {
      fontFamily: FONTS.game,
      fontSize: '180px',
    }).setOrigin(0.5);
    this.contentLayer.add(bigEmoji);

    // 메시지 1
    const msg1 = this.add.text(cx, cy + 50, '곧 만나요!', {
      fontFamily: FONTS.bold,
      fontSize: '76px',
      color: '#FFFFFF',
      stroke: '#3A1F3D',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.contentLayer.add(msg1);

    // 메시지 2
    const msg2 = this.add.text(cx, cy + 140, '예쁜 도안을 만들고 있어~', {
      fontFamily: FONTS.bold,
      fontSize: '40px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    this.contentLayer.add(msg2);

    // 살짝 뽐뿜 애니
    this.tweens.add({
      targets: bigEmoji,
      scale: { from: 1, to: 1.08 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  // 도안 그리드 — 페이지당 8개 (4×2) + 가로 스와이프/화살표로 페이지 전환
  //   사용자 결정: 카테고리당 최대 20개, 앞 3개 무료 / 나머지 잠금 (IAP 일괄 해금)
  showTemplateGrid(category) {
    this._currentCategory = category;   // 결제 성공 후 다시 그리기용
    const tpls = category.templates;
    const PER_PAGE = 8;
    const totalPages = Math.max(1, Math.ceil(tpls.length / PER_PAGE));
    this.currentPage = 0;
    this.totalPages = totalPages;

    // 페이지 wrapper container — 가로로 페이지들 배치 → x tween으로 전환
    const pageWrapper = this.add.container(0, 0);
    this.pageWrapper = pageWrapper;

    // 카드 레이아웃 (4×2 페이지)
    const cols = 4;
    const cardW = 380;
    const cardH = 280;
    const gapX = 30;
    const gapY = 32;
    const totalW = cols * cardW + (cols - 1) * gapX;
    const startX = GAME_WIDTH / 2 - totalW / 2 + cardW / 2;
    const startY = 460;            // 헤더(170) 아래 + 페이지 indicator(하단) 공간 확보

    for (let p = 0; p < totalPages; p++) {
      const pageContainer = this.add.container(p * GAME_WIDTH, 0);
      const startIdx = p * PER_PAGE;
      const pageTpls = tpls.slice(startIdx, startIdx + PER_PAGE);

      pageTpls.forEach((tpl, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        const globalIdx = startIdx + i;
        // 무료 도안 OR 결제 해금 상태면 자유 접근
        const isFree = isTemplateFree(tpl, globalIdx) || IAPSystem.isPremiumUnlocked();
        this.makeTemplateCard(x, y, cardW, cardH, tpl, isFree, pageContainer);
      });

      pageWrapper.add(pageContainer);
    }

    this.contentLayer.add(pageWrapper);

    // 페이지가 2개 이상이면 화살표 + 도트 indicator
    if (totalPages > 1) {
      this.makePageControls(totalPages);
      this.setupSwipe();
    }
  }

  // 좌/우 화살표 + 도트 indicator
  makePageControls(totalPages) {
    const arrowY = GAME_HEIGHT / 2 + 40;     // 그리드 가운데 높이

    // 좌 화살표
    this.leftArrow = this.makeArrow(60, arrowY, '‹', () => this.changePage(-1));
    this.contentLayer.add(this.leftArrow);

    // 우 화살표
    this.rightArrow = this.makeArrow(GAME_WIDTH - 60, arrowY, '›', () => this.changePage(1));
    this.contentLayer.add(this.rightArrow);

    // 하단 도트 indicator
    const dotY = GAME_HEIGHT - 70;
    const dotGap = 32;
    const totalDotW = (totalPages - 1) * dotGap;
    const dotStartX = GAME_WIDTH / 2 - totalDotW / 2;
    this.dots = [];
    for (let p = 0; p < totalPages; p++) {
      const dot = this.add.graphics();
      dot.x = dotStartX + p * dotGap;
      dot.y = dotY;
      this.dots.push(dot);
      this.contentLayer.add(dot);
    }
    this.updatePageControls();
  }

  // 라운드 화살표 버튼 (페이지 전환용)
  makeArrow(cx, cy, glyph, onClick) {
    const container = this.add.container(cx, cy);
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.45);
    sh.fillCircle(0, 6, 38);
    container.add(sh);
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.92);
    bg.fillCircle(0, 0, 38);
    bg.lineStyle(3, 0xFFD8E2, 1);
    bg.strokeCircle(0, 0, 38);
    container.add(bg);
    const txt = this.add.text(0, -4, glyph, {
      fontFamily: FONTS.bold, fontSize: '64px', color: '#7A2A4A',
    }).setOrigin(0.5);
    container.add(txt);
    const hit = this.add.zone(0, 0, 90, 90).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = cy + 3; });
    hit.on('pointerup',   () => { container.y = cy; soundManager.play('click'); if (onClick) onClick(); });
    hit.on('pointerout',  () => { container.y = cy; });
    return container;
  }

  changePage(delta) {
    const newPage = Math.max(0, Math.min(this.totalPages - 1, this.currentPage + delta));
    if (newPage === this.currentPage) return;
    this.currentPage = newPage;
    this.tweens.add({
      targets: this.pageWrapper,
      x: -newPage * GAME_WIDTH,
      duration: 380,
      ease: 'Cubic.easeOut',
    });
    this.updatePageControls();
  }

  updatePageControls() {
    // 도트 색상 갱신
    if (this.dots) {
      this.dots.forEach((dot, i) => {
        dot.clear();
        const isActive = i === this.currentPage;
        dot.fillStyle(isActive ? 0xFFD8E2 : 0xFFFFFF, isActive ? 1 : 0.4);
        dot.fillCircle(0, 0, isActive ? 10 : 7);
      });
    }
    // 화살표 알파 (첫 페이지면 좌 dim, 마지막이면 우 dim)
    if (this.leftArrow) this.leftArrow.setAlpha(this.currentPage <= 0 ? 0.35 : 1);
    if (this.rightArrow) this.rightArrow.setAlpha(this.currentPage >= this.totalPages - 1 ? 0.35 : 1);
  }

  // 가로 스와이프 (손가락/마우스 드래그)
  setupSwipe() {
    // 기존 리스너 정리
    this.input.off('pointerdown', this._swipeDown, this);
    this.input.off('pointerup',   this._swipeUp,   this);

    this._swipeStartX = null;
    this._swipeDown = (pointer) => { this._swipeStartX = pointer.x; };
    this._swipeUp = (pointer) => {
      if (this._swipeStartX == null) return;
      const dx = pointer.x - this._swipeStartX;
      this._swipeStartX = null;
      if (Math.abs(dx) < 80) return;     // 사소한 클릭 무시
      if (dx < 0) this.changePage(1);   // 왼쪽으로 스와이프 → 다음 페이지
      else        this.changePage(-1);  // 오른쪽으로 스와이프 → 이전 페이지
    };
    this.input.on('pointerdown', this._swipeDown, this);
    this.input.on('pointerup',   this._swipeUp,   this);
  }

  // 도안 카드 (라벨 없음 — 도안 자체가 크게) + 라운드 정사각형 3D
  //   isFree: false면 자물쇠 + dim + 클릭 시 결제 안내
  //   parentContainer: 페이지 컨테이너 (없으면 contentLayer 직접 추가)
  makeTemplateCard(x, y, w, h, template, isFree = true, parentContainer = null) {
    const container = this.add.container(x, y);
    const cornerR = 28;

    // 깊은 그림자 (3D)
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.45);
    sh.fillRoundedRect(-w / 2 + 4, -h / 2 + 12, w, h, cornerR);
    container.add(sh);

    // 본체 베이스 (어두운 톤 — 3D 측면)
    const baseColor = Phaser.Display.Color.IntegerToColor(template.bg || 0xFFB6C8).darken(15).color;
    const baseBg = this.add.graphics();
    baseBg.fillStyle(baseColor, 1);
    baseBg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, cornerR);
    container.add(baseBg);

    // 본체 메인 (살짝 위로)
    const bg = this.add.graphics();
    bg.fillStyle(template.bg || 0xFFB6C8, 1);
    bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 8, cornerR - 2);
    container.add(bg);

    // 상단 하이라이트 (3D 광택)
    const glow = this.add.graphics();
    glow.fillStyle(0xFFFFFF, 0.28);
    glow.fillRoundedRect(-w / 2 + 14, -h / 2 + 12, w - 28, 58, cornerR - 8);
    container.add(glow);

    // 흰 종이 영역 — 라벨 제거되어 도안을 풀로 키움
    const paperPad = 28;
    const paperW = w - paperPad * 2;
    const paperH = h - paperPad * 2 - 8;
    const paperY = 0;
    const paper = this.add.graphics();
    paper.fillStyle(0xFFFAF5, 1);
    paper.fillRoundedRect(-paperW / 2, paperY - paperH / 2, paperW, paperH, 20);
    paper.lineStyle(3, 0xE0CFC0, 1);
    paper.strokeRoundedRect(-paperW / 2, paperY - paperH / 2, paperW, paperH, 20);
    container.add(paper);

    // 도안 썸네일 (라벨 없으니 더 크게: 0.8 → 0.92)
    if (template.textureKey && this.textures.exists(template.textureKey)) {
      const img = this.add.image(0, paperY, template.textureKey).setOrigin(0.5);
      const tex = this.textures.get(template.textureKey).getSourceImage();
      const scale = Math.min(paperW / tex.width, paperH / tex.height) * 0.92;
      img.setScale(scale);
      container.add(img);
    } else if (template.draw) {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = paperW;
      thumbCanvas.height = paperH;
      const thumbCtx = thumbCanvas.getContext('2d');
      const thumbScale = (paperH * 0.82) / 600;
      template.draw(thumbCtx, paperW / 2, paperH / 2, thumbScale, true);
      const thumbKey = `tpl-thumb-${template.id}`;
      if (this.textures.exists(thumbKey)) this.textures.remove(thumbKey);
      this.textures.addCanvas(thumbKey, thumbCanvas);
      const thumb = this.add.image(0, paperY, thumbKey).setOrigin(0.5);
      container.add(thumb);
    }

    // 잠금 표시 — 우하단 배지 (dim 없음 → 도안 그대로 보임)
    if (!isFree) {
      const bx = w / 2 - 28;     // 카드 우측에서 안쪽
      const by = h / 2 - 28;     // 카드 하단에서 안쪽
      const br = 30;              // 배지 반지름

      // 배지 그림자
      const badgeSh = this.add.graphics();
      badgeSh.fillStyle(0x7A4A00, 0.5);
      badgeSh.fillCircle(bx + 3, by + 4, br);
      container.add(badgeSh);

      // 배지 테두리 (짙은 금)
      const badgeRim = this.add.graphics();
      badgeRim.fillStyle(0xD48000, 1);
      badgeRim.fillCircle(bx, by, br);
      container.add(badgeRim);

      // 배지 본체 (밝은 금)
      const badgeFill = this.add.graphics();
      badgeFill.fillStyle(0xFFB300, 1);
      badgeFill.fillCircle(bx, by - 2, br - 4);
      container.add(badgeFill);

      // 자물쇠 아이콘 (작게)
      const lockTxt = this.add.text(bx, by - 1, '🔒', {
        fontFamily: FONTS.bold, fontSize: '32px',
      }).setOrigin(0.5);
      container.add(lockTxt);
    }

    // 인터랙션
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 5; });
    hit.on('pointerup', () => {
      container.y = y;
      if (isFree) {
        soundManager.play('pop');
        AnalyticsSystem.trackTemplateOpen({
          templateId: template.id,
          categoryId: this.selectedCategoryId,
          isFree: true,
        });
        this.startColoring(template.id);
      } else {
        soundManager.play('click');
        AnalyticsSystem.trackTemplateOpen({
          templateId: template.id,
          categoryId: this.selectedCategoryId,
          isFree: false,
        });
        AnalyticsSystem.trackIapDialogView(this.selectedCategoryId);
        this.showUnlockDialog(getCategoryById(this.selectedCategoryId));
      }
    });
    hit.on('pointerout', () => { container.y = y; });

    // 페이지 컨테이너가 있으면 그쪽에 추가, 아니면 contentLayer
    if (parentContainer) parentContainer.add(container);
    else this.contentLayer.add(container);
  }

  // ===== IAP — 가로형 잠금 해제 팝업 (₩2,500 일회 결제) =====
  showUnlockDialog(category) {
    if (!category) return;
    const cx = GAME_WIDTH / 2;   // 960
    const cy = GAME_HEIGHT / 2;  // 540
    const root = this.add.container(0, 0).setDepth(4000);

    // 어두운 배경
    root.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72).setInteractive());

    // ── 패널 (pw=1380, ph=580) ──
    const pw = 1380, ph = 580;
    const px = cx - pw / 2;   // 270
    const py = cy - ph / 2;   // 250   (bottom: 830)

    const psh = this.add.graphics();
    psh.fillStyle(0x000000, 0.45);
    psh.fillRoundedRect(px + 8, py + 14, pw, ph, 44);
    root.add(psh);

    const pbg = this.add.graphics();
    pbg.fillStyle(0xFFF4F7, 1);
    pbg.fillRoundedRect(px, py, pw, ph, 44);
    root.add(pbg);

    // ── 좌측 핑크 패널 (460px) ──
    const lw = 460;
    const lcx = px + lw / 2;   // 500
    const lpg = this.add.graphics();
    lpg.fillStyle(0xFF2D72, 1);
    lpg.fillRoundedRect(px, py, lw, ph, 44);
    lpg.fillRect(px + lw - 44, py, 44, ph);
    root.add(lpg);

    const lgl = this.add.graphics();
    lgl.fillStyle(0xFFFFFF, 0.20);
    lgl.fillRoundedRect(px + 14, py + 12, lw - 90, 28, 16);
    root.add(lgl);

    // 이모지 (bobbing) — 상단 절반
    const emojiTxt = this.add.text(lcx, cy - 52, category.emoji, {
      fontFamily: FONTS.game, fontSize: '148px',
    }).setOrigin(0.5);
    root.add(emojiTxt);
    this.tweens.add({ targets: emojiTxt, y: cy - 68, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 구분선
    const divLine = this.add.graphics();
    divLine.lineStyle(1, 0xFFFFFF, 0.28);
    divLine.lineBetween(px + 32, py + 330, px + lw - 32, py + 330);
    root.add(divLine);

    // 가격 — 배경 없이 좌측 패널에 직접 표기 (대형)
    root.add(this.add.text(lcx, cy + 118, '₩2,500', {
      fontFamily: FONTS.bold, fontSize: '68px', color: '#FFFFFF',
    }).setOrigin(0.5).setShadow(0, 4, 'rgba(100,0,40,0.55)', 7, false, true));

    root.add(this.add.text(lcx, cy + 178, '일회 결제', {
      fontFamily: FONTS.bold, fontSize: '28px', color: 'rgba(255,255,255,0.78)',
    }).setOrigin(0.5));

    // ── 우측 콘텐츠 ──
    // rx=782, 우측끝=1610, 중심rCx=1196
    const rx = px + lw + 52;
    const rCx = Math.round((rx + px + pw - 48) / 2);   // 1196

    // 제목
    root.add(this.add.text(rx, py + 64, '모두 잠금 해제', {
      fontFamily: FONTS.bold, fontSize: '62px', color: '#5A2A40',
    }).setOrigin(0, 0.5));

    // 부제 (전체 해금 명시)
    root.add(this.add.text(rx, py + 126, '스케치북의 모든 도안을 전부 즐길 수 있어요!', {
      fontFamily: FONTS.bold, fontSize: '30px', color: '#AA7080',
    }).setOrigin(0, 0.5));

    // 혜택 3줄 — gap 58px
    ['🎨  잠긴 도안 전체 이용 가능', '🆕  새 도안 추가 시 자동 해제', '💛  한 번만 결제하면 끝!'].forEach((b, i) => {
      root.add(this.add.text(rx, py + 196 + i * 58, b, {
        fontFamily: FONTS.bold, fontSize: '31px', color: '#5A2A40',
      }).setOrigin(0, 0.5));
    });

    // ── CTA 단일 버튼 (퍼플 — 핑크와 대비) ──
    const buyW = 560, buyH = 90;
    const buyY = py + 406;   // 656
    const buySh = this.add.graphics();
    buySh.fillStyle(0x4A1AB0, 1);
    buySh.fillRoundedRect(rCx - buyW / 2, buyY - buyH / 2 + 9, buyW, buyH, buyH / 2);
    root.add(buySh);
    const buyBg = this.add.graphics();
    buyBg.fillStyle(0x8844EE, 1);
    buyBg.fillRoundedRect(rCx - buyW / 2, buyY - buyH / 2, buyW, buyH, buyH / 2);
    root.add(buyBg);
    const buyHL = this.add.graphics();
    buyHL.fillStyle(0xC090FF, 0.45);
    buyHL.fillRoundedRect(rCx - buyW / 2 + 14, buyY - buyH / 2 + 9, buyW - 28, 28, buyH / 2 - 4);
    root.add(buyHL);
    const buyTxt = this.add.text(rCx, buyY, '잠금 해제하기', {
      fontFamily: FONTS.bold, fontSize: '42px', color: '#FFFFFF',
    }).setOrigin(0.5);
    buyTxt.setShadow(0, 3, 'rgba(30,0,80,0.5)', 5, false, true);
    root.add(buyTxt);
    const buyHit = this.add.zone(rCx, buyY, buyW, buyH + 20).setInteractive({ useHandCursor: true });
    root.add(buyHit);
    buyHit.on('pointerdown', () => { buyBg.y = 5; buyHL.y = 5; buyTxt.y = buyY + 4; });
    buyHit.on('pointerout',  () => { buyBg.y = 0; buyHL.y = 0; buyTxt.y = buyY; });
    buyHit.on('pointerup', () => {
      buyBg.y = 0; buyHL.y = 0; buyTxt.y = buyY;
      soundManager.play('pop');
      this.tweens.add({ targets: root, alpha: 0, duration: 200, onComplete: () => {
        root.destroy();
        this.showParentGate(() => this.proceedToBilling(category));
      }});
    });

    // ── 법적 고지 3줄 (구글 의무 + 전자상거래법 + 약관 링크) ──
    // Google 결제 고지 (일회결제용 — Google Play IAP 의무 표기)
    root.add(this.add.text(rCx, py + 476,
      '구매 확인 시 Google 계정에 요금이 청구됩니다.',
      { fontFamily: FONTS.bold, fontSize: '17px', color: '#AAAAAA', align: 'center' }
    ).setOrigin(0.5));

    // 전자상거래법 — 미성년자 거래 취소 고지
    root.add(this.add.text(rCx, py + 503,
      '법정대리인의 동의 없이 체결된 미성년자의 거래는 취소할 수 있습니다.',
      { fontFamily: FONTS.bold, fontSize: '17px', color: '#AAAAAA', align: 'center', wordWrap: { width: 620 } }
    ).setOrigin(0.5));

    // 약관 링크
    root.add(this.add.text(rCx, py + 545,
      '개인정보처리방침  |  이용약관',
      { fontFamily: FONTS.bold, fontSize: '18px', color: '#FF6EA0' }
    ).setOrigin(0.5));

    // 복원 링크 (재설치/새 기기 대응 — Google Play 정책 의무)
    const restoreY = py + 568;
    const restoreLink = this.add.text(rCx, restoreY,
      '이전에 결제하셨나요? 복원하기',
      { fontFamily: FONTS.bold, fontSize: '17px', color: '#8844EE' }
    ).setOrigin(0.5);
    restoreLink.setShadow(0, 1, 'rgba(0,0,0,0.10)', 1, false, true);
    root.add(restoreLink);
    const restoreZone = this.add.zone(rCx, restoreY, 320, 40).setInteractive({ useHandCursor: true });
    root.add(restoreZone);
    restoreZone.on('pointerup', () => {
      soundManager.play('click');
      this._handleRestore(root);
    });

    // ── 닫기 버튼 (우상단) ──
    const closeX = px + pw - 42;
    const closeY = py + 42;
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0xFFCCDD, 1);
    closeBg.fillCircle(closeX, closeY, 28);
    root.add(closeBg);
    root.add(this.add.text(closeX, closeY - 2, '✕', {
      fontFamily: FONTS.bold, fontSize: '34px', color: '#C84070',
    }).setOrigin(0.5));
    const closeZone = this.add.zone(closeX, closeY, 80, 80).setInteractive({ useHandCursor: true });
    root.add(closeZone);
    closeZone.on('pointerup', () => {
      soundManager.play('click');
      this.tweens.add({ targets: root, alpha: 0, duration: 200, onComplete: () => root.destroy() });
    });

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 250, ease: 'Cubic.easeOut' });
  }

  // ===== 부모 인증 게이트 — 수학 문제 풀기 =====
  showParentGate(onSuccess) {
    const cx = GAME_WIDTH / 2;   // 960
    const cy = GAME_HEIGHT / 2;  // 540
    const root = this.add.container(0, 0).setDepth(4100);

    // 어두운 배경
    root.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78).setInteractive());

    // 패널
    const pw = 840, ph = 640;
    const px = cx - pw / 2;   // 540
    const py = cy - ph / 2;   // 220

    const psh = this.add.graphics();
    psh.fillStyle(0x000000, 0.4);
    psh.fillRoundedRect(px + 8, py + 12, pw, ph, 44);
    root.add(psh);

    const pbg = this.add.graphics();
    pbg.fillStyle(0xFFF4F7, 1);
    pbg.fillRoundedRect(px, py, pw, ph, 44);
    root.add(pbg);

    // 상단 핑크 헤더
    const hdr = this.add.graphics();
    hdr.fillStyle(0xFF4D88, 1);
    hdr.fillRoundedRect(px, py, pw, 96, 44);
    hdr.fillRect(px, py + 52, pw, 44);
    root.add(hdr);

    root.add(this.add.text(cx, py + 48, '🛡 부모님 확인', {
      fontFamily: FONTS.bold, fontSize: '52px', color: '#FFFFFF',
    }).setOrigin(0.5));

    // 수학 문제 생성
    const problem = this._generateMathProblem();

    // 문제 텍스트
    root.add(this.add.text(cx, py + 180, problem.question, {
      fontFamily: FONTS.bold, fontSize: '72px', color: '#5A2A40',
    }).setOrigin(0.5));

    // 답 입력 디스플레이
    let answerDigits = [];
    const answerTxt = this.add.text(cx, py + 272, '', {
      fontFamily: FONTS.bold, fontSize: '64px', color: '#5A2A40',
    }).setOrigin(0.5);
    root.add(answerTxt);

    // 밑줄
    const ul = this.add.graphics();
    ul.lineStyle(4, 0xFFB0C8, 1);
    ul.lineBetween(cx - 160, py + 308, cx + 160, py + 308);
    root.add(ul);

    const updateDisplay = () => {
      answerTxt.setText(answerDigits.join('') || '');
    };

    // 숫자 패드 (4행×3열)  7 8 9 / 4 5 6 / 1 2 3 / ⌫ 0 ✓
    const padKeys = [['7','8','9'], ['4','5','6'], ['1','2','3'], ['⌫','0','✓']];
    const btnW = 136, btnH = 64, gapX = 18, gapY = 12;
    const padTotalW = 3 * btnW + 2 * gapX;
    const padSX = cx - padTotalW / 2 + btnW / 2;   // 806
    const padSY = py + 362;                          // 582

    padKeys.forEach((row, ri) => {
      row.forEach((key, ci) => {
        const bx = padSX + ci * (btnW + gapX);
        const by = padSY + ri * (btnH + gapY);
        const isOK  = key === '✓';
        const isDel = key === '⌫';
        const fill  = isOK ? 0x3DC8A8 : (isDel ? 0xFF8FAB : 0xFFFFFF);
        const shad  = isOK ? 0x2A8A78 : (isDel ? 0xC84070 : 0xDDCCCC);
        const tClr  = (isOK || isDel) ? '#FFFFFF' : '#5A2A40';

        const bsh = this.add.graphics();
        bsh.fillStyle(shad, 1);
        bsh.fillRoundedRect(bx - btnW / 2, by - btnH / 2 + 5, btnW, btnH, 16);
        root.add(bsh);

        const bbg = this.add.graphics();
        bbg.fillStyle(fill, 1);
        bbg.fillRoundedRect(bx - btnW / 2, by - btnH / 2, btnW, btnH, 16);
        root.add(bbg);

        const btxt = this.add.text(bx, by, key, {
          fontFamily: FONTS.bold, fontSize: '42px', color: tClr,
        }).setOrigin(0.5);
        root.add(btxt);

        const zone = this.add.zone(bx, by, btnW + 8, btnH + 8).setInteractive({ useHandCursor: true });
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
              // 정답!
              answerTxt.setColor('#3DC8A8');
              answerTxt.setText('정답!');
              this.tweens.add({ targets: root, alpha: 0, duration: 500, delay: 700,
                onComplete: () => { root.destroy(); onSuccess(); },
              });
            } else {
              // 오답 — 빨간 표시 후 초기화
              answerTxt.setColor('#FF4D88');
              this.time.delayedCall(500, () => {
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
    this.tweens.add({ targets: root, alpha: 1, duration: 250, ease: 'Cubic.easeOut' });
  }

  // ===== 수학 문제 생성 (덧셈 / 곱셈 랜덤) =====
  _generateMathProblem() {
    if (Phaser.Math.Between(0, 1) === 0) {
      // 두 자리 + 두 자리 덧셈
      const a = Phaser.Math.Between(12, 79);
      const b = Phaser.Math.Between(11, 99 - a);
      return { question: `${a} + ${b} = ?`, answer: a + b };
    } else {
      // 한 자리 × 한 자리 곱셈 (3~9)
      const a = Phaser.Math.Between(3, 9);
      const b = Phaser.Math.Between(3, 9);
      return { question: `${a} × ${b} = ?`, answer: a * b };
    }
  }

  // ===== 구글 결제 진행 — IAPSystem.purchase() 호출 =====
  //   네이티브: 실제 Google Play Billing 결제 시작
  //   웹 dev: mock 안내 다이얼로그 (결제 준비 중 메시지)
  async proceedToBilling(category) {
    if (!IAPSystem.isAvailable()) {
      // 웹 dev 환경 — mock 안내
      return this._showInfoDialog('🚀', '결제 준비 중이에요!', '앱 출시 후 이용 가능해요 🎉');
    }
    // 결제 시작 (실제 Google Play Billing UI 호출)
    const result = await IAPSystem.purchase();
    if (result.success) {
      // 영수증 검증 콜백(IAPSystem._onPurchaseSuccess)에서 SaveSystem 저장
      // 약간의 딜레이 후 성공 다이얼로그
      this.time.delayedCall(400, () => {
        if (IAPSystem.isPremiumUnlocked()) {
          this._showSuccessDialog();
        }
      });
    } else if (result.error) {
      this._showInfoDialog('😢', '결제를 완료하지 못했어요', result.error);
    }
  }

  // ===== 복원 처리 — 재설치/새 기기 대응 =====
  async _handleRestore(parentRoot) {
    if (!IAPSystem.isAvailable()) {
      return this._showInfoDialog('🔄', '복원 준비 중이에요', '앱 출시 후 이용 가능해요 🎉');
    }
    const result = await IAPSystem.restore();
    if (result.success) {
      // 잠시 후 해금 확인
      this.time.delayedCall(800, () => {
        if (IAPSystem.isPremiumUnlocked()) {
          if (parentRoot && parentRoot.active) parentRoot.destroy();
          this._showSuccessDialog('복원 완료!', '도안이 다시 잠금 해제되었어요 🎉');
        } else {
          this._showInfoDialog('🔍', '복원할 결제가 없어요', '이전에 결제하신 적이 없거나 다른 계정일 수 있어요.');
        }
      });
    } else if (result.error) {
      this._showInfoDialog('😢', '복원에 실패했어요', result.error);
    }
  }

  // ===== 결제 성공 다이얼로그 =====
  _showSuccessDialog(title = '해금 완료!', subtitle = '모든 도안이 잠금 해제됐어요 🎉') {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = this.add.container(0, 0).setDepth(4300);

    root.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setInteractive());

    const pw = 760, ph = 420;
    const pbg = this.add.graphics();
    pbg.fillStyle(0xFFF4F7, 1);
    pbg.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 44);
    pbg.lineStyle(8, 0xFFD8E2, 1);
    pbg.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 44);
    root.add(pbg);

    root.add(this.add.text(cx, cy - 120, '🎨', { fontFamily: FONTS.game, fontSize: '88px' }).setOrigin(0.5));
    root.add(this.add.text(cx, cy - 20, title, {
      fontFamily: FONTS.bold, fontSize: '56px', color: '#5A2A40',
    }).setOrigin(0.5));
    root.add(this.add.text(cx, cy + 60, subtitle, {
      fontFamily: FONTS.bold, fontSize: '32px', color: '#AA7080', align: 'center', wordWrap: { width: pw - 80 },
    }).setOrigin(0.5));

    this._addOkButton(root, cx, cy + 155, () => {
      this.tweens.add({ targets: root, alpha: 0, duration: 200, onComplete: () => {
        root.destroy();
        // 해금 반영 — 도안 그리드 다시 그림
        if (this._currentCategory) this.showTemplateGrid(this._currentCategory);
      }});
    });

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 250 });
  }

  // ===== 일반 안내 다이얼로그 (정보/에러 공용) =====
  _showInfoDialog(emoji, title, subtitle) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = this.add.container(0, 0).setDepth(4200);

    root.add(this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setInteractive());

    const pw = 760, ph = 420;
    const pbg = this.add.graphics();
    pbg.fillStyle(0xFFF4F7, 1);
    pbg.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 44);
    pbg.lineStyle(8, 0xFFD8E2, 1);
    pbg.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 44);
    root.add(pbg);

    root.add(this.add.text(cx, cy - 120, emoji, { fontFamily: FONTS.game, fontSize: '88px' }).setOrigin(0.5));
    root.add(this.add.text(cx, cy - 20, title, {
      fontFamily: FONTS.bold, fontSize: '52px', color: '#5A2A40', align: 'center', wordWrap: { width: pw - 80 },
    }).setOrigin(0.5));
    root.add(this.add.text(cx, cy + 50, subtitle, {
      fontFamily: FONTS.bold, fontSize: '28px', color: '#AA7080', align: 'center', wordWrap: { width: pw - 80 },
    }).setOrigin(0.5));

    this._addOkButton(root, cx, cy + 155, () => {
      this.tweens.add({ targets: root, alpha: 0, duration: 200, onComplete: () => root.destroy() });
    });

    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 250 });
  }

  // ===== 다이얼로그 공용 OK 버튼 =====
  _addOkButton(root, cx, by, onClick) {
    const bw = 280, bh = 84;
    const bsh = this.add.graphics();
    bsh.fillStyle(0xC84070, 1);
    bsh.fillRoundedRect(cx - bw / 2, by - bh / 2 + 7, bw, bh, bh / 2);
    root.add(bsh);
    const bbg = this.add.graphics();
    bbg.fillStyle(0xFF4D88, 1);
    bbg.fillRoundedRect(cx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    root.add(bbg);
    root.add(this.add.text(cx, by, '확인', {
      fontFamily: FONTS.bold, fontSize: '42px', color: '#FFFFFF',
    }).setOrigin(0.5));
    const zone = this.add.zone(cx, by, bw, bh + 20).setInteractive({ useHandCursor: true });
    root.add(zone);
    zone.on('pointerup', () => {
      soundManager.play('click');
      onClick();
    });
  }

  startColoring(templateId) {
    this.cameras.main.fadeOut(400, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('ColoringScene', { templateId });
    });
  }

  exitToHub() {
    // 대표님 영구 박제: 도안 선택 나가기 = 로비(MainScene) 직행 (SketchHub 스킵)
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
