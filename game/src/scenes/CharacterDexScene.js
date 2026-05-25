// 📔 CharacterDexScene — 캐릭터 도감
//   7 캐릭터 도감 카드 그리드 + 잠금/활성 + 팝업 (이름·성격·스토리)
//   SaveSystem.collection.charactersMet 로 만난 캐릭터 추적
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { soundManager } from '../systems/SoundManager.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

// ===== 캐릭터 데이터 =====
const CHARACTERS = [
  {
    key: 'toseumi', texture: 'char-toseumi',
    name: '토슴이', nameJp: 'トスミー', nameEn: 'Tosmie', nameTw: '兔絲米',
    personality: '솜사탕처럼 폭신폭신, 호기심 많은 분홍 토끼',
    story: '레인보우 별나라에 살던 토슴이. 어느 날 별나라의 색이 모두 사라지자, 친구들과 함께 색을 되찾는 모험을 시작해요.',
    metByDefault: true,    // 게임 시작부터 만남
  },
  {
    key: 'skunk', texture: 'char-skunk',
    name: '스컹크', nameJp: 'スカンク', nameEn: 'Skunk', nameTw: '臭鼬',
    personality: '장난꾸러기지만 사실은 외로움을 타는 친구',
    story: '우주 어딘가에서 색을 훔쳐간 우주 악당 중 하나. 가위바위보로 친해질 수 있어요.',
    metHint: 'unlock_villain_skunk',
  },
  {
    key: 'bat', texture: 'char-bat',
    name: '보라박쥐', nameJp: 'パープルこうもり', nameEn: 'Purple Bat', nameTw: '紫蝙蝠',
    personality: '밤하늘을 좋아하는 신비로운 박쥐',
    story: '달빛 아래에서 색을 모으는 작은 박쥐. 가위바위보 챔피언이 꿈.',
    metHint: 'unlock_villain_bat',
  },
  {
    key: 'alien', texture: 'char-alien',
    name: '초록 외계인', nameJp: '緑のエイリアン', nameEn: 'Green Alien', nameTw: '綠色外星人',
    personality: '쿨한 척하지만 마음은 따뜻한 외계 친구',
    story: '먼 별에서 온 외계인. 선글라스 안 진짜 눈은 매우 반짝반짝해요.',
    metHint: 'unlock_villain_alien',
  },
  {
    key: 'raccoon', texture: 'char-raccoon',
    name: '너구리', nameJp: 'たぬき', nameEn: 'Raccoon', nameTw: '浣熊',
    personality: '?',
    story: '아직 만나지 못한 친구. 곧 등장할 거예요!',
    metHint: 'coming_soon',
  },
  {
    key: 'fox', texture: 'char-fox',
    name: '여우', nameJp: 'きつね', nameEn: 'Fox', nameTw: '狐狸',
    personality: '?',
    story: '아직 만나지 못한 친구. 곧 등장할 거예요!',
    metHint: 'coming_soon',
  },
  {
    key: 'blackchi', texture: 'char-blackchi',
    name: '블랙치', nameJp: 'ブラックチ', nameEn: 'Blackchi', nameTw: '黑奇',
    personality: '?',
    story: '아직 만나지 못한 친구. 곧 등장할 거예요!',
    metHint: 'coming_soon',
  },
  {
    // 8번째 슬롯 — 리소스 추후 업데이트 (사용자 피드백)
    key: 'placeholder', texture: null,
    name: '???',
    personality: '?',
    story: '아직 만나지 못한 친구. 곧 등장할 거예요!',
    metHint: 'coming_soon',
  },
];

export default class CharacterDexScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterDexScene' });
  }

  create() {
    this.cameras.main.fadeIn(600, 15, 8, 32);
    soundManager.attachScene(this);
    try { soundManager.playBGM(['bgm-lobby-1', 'bgm-lobby-2']); } catch (e) {}

    this.createBackground();
    this.createStars(80);
    this.createTopBar();
    this.createDexGrid();
  }

  createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3B2470, 0x3B2470, 0x0F0820, 0x0F0820, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const g1 = this.add.graphics();
    g1.fillStyle(0xFFB6C8, 0.15);
    g1.fillCircle(GAME_WIDTH * 0.15, GAME_HEIGHT * 0.3, 420);

    const g2 = this.add.graphics();
    g2.fillStyle(0x7A4FA0, 0.22);
    g2.fillCircle(GAME_WIDTH * 0.85, GAME_HEIGHT * 0.75, 380);
  }

  createStars(count) {
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const sz = Phaser.Math.FloatBetween(1, 3);
      const star = this.add.circle(x, y, sz, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
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
    // 타이틀
    this.add.text(50, 80, '📔 캐릭터 도감', {
      fontFamily: FONTS.bold, fontSize: '72px', color: '#FFD8E2',
    }).setOrigin(0, 0.5);

    // 부제 (사용자 피드백 — 카피 변경)
    this.add.text(50, 160, '레인보우 별나라에는 어떤 친구들이 있을까?', {
      fontFamily: FONTS.game, fontSize: '42px', color: '#FFFFFF',
    }).setOrigin(0, 0.5).setAlpha(0.9);

    // 우상단 나가기
    this.makeBackButton();
  }

  makeBackButton() {
    // 표준 우상단 나가기 버튼 (ui/StandardBackButton.js) 사용 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToMain());
  }

  // 7 캐릭터 도감 카드 — 4×2 그리드
  createDexGrid() {
    const save = SaveSystem.load();
    const charsMet = save.collection.charactersMet || [];

    // 디폴트 만남 (토슴이) + RPS 진행 시 만난 우주악당 자동 표시
    const isMet = (c) => {
      if (c.metByDefault) return true;
      if (charsMet.includes(c.key)) return true;
      // RPS 게임 한 번이라도 했으면 우주악당 만남
      if (c.key === 'skunk' || c.key === 'bat' || c.key === 'alien') {
        return (save.stats.rpsPlays || 0) > 0;
      }
      return false;
    };

    const cardW = 280;
    const cardH = 340;
    const gapX = 30;
    const gapY = 30;
    const cols = 4;
    const rows = Math.ceil(CHARACTERS.length / cols);

    const gridW = cols * cardW + (cols - 1) * gapX;
    const gridH = rows * cardH + (rows - 1) * gapY;
    const startX = (GAME_WIDTH - gridW) / 2 + cardW / 2;
    const startY = 280 + cardH / 2;

    CHARACTERS.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      this.makeDexCard(x, y, cardW, cardH, c, isMet(c), i);
    });
  }

  makeDexCard(cx, cy, w, h, char, met, index) {
    const container = this.add.container(cx, cy);
    container.setAlpha(0);

    // 등장 페이드 인
    this.tweens.add({
      targets: container, alpha: 1,
      duration: 500, delay: 200 + index * 80,
      ease: 'Cubic.easeOut',
    });

    // 그림자
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-w/2 + 6, -h/2 + 10, w, h, 24);
    container.add(shadow);

    // 카드 본체
    const cardBg = this.add.graphics();
    cardBg.fillStyle(met ? 0xFFFAF5 : 0x3A2D5A, 1);
    cardBg.fillRoundedRect(-w/2, -h/2, w, h, 24);
    cardBg.lineStyle(5, met ? 0xFFB6C8 : 0x666666, 1);
    cardBg.strokeRoundedRect(-w/2, -h/2, w, h, 24);
    container.add(cardBg);

    // 캐릭터 얼굴 영역
    const imgY = -h/2 + 120;
    if (met && this.textures.exists(char.texture)) {
      const img = this.add.image(0, imgY, char.texture);
      const tex = this.textures.get(char.texture).getSourceImage();
      const targetSize = 200;
      img.setScale(targetSize / Math.max(tex.width, tex.height));
      container.add(img);
    } else {
      // 잠금 — 자물쇠 + 실루엣
      const lockBg = this.add.circle(0, imgY, 80, 0x222033, 0.9);
      lockBg.setStrokeStyle(4, 0x888888);
      container.add(lockBg);
      const lock = this.add.text(0, imgY, '?', {
        fontFamily: FONTS.bold, fontSize: '110px', color: '#666666',
      }).setOrigin(0.5);
      container.add(lock);
    }

    // 이름
    const nameColor = met ? '#5A2A40' : '#888888';
    const nameText = met ? char.name : '???';
    const name = this.add.text(0, h/2 - 80, nameText, {
      fontFamily: FONTS.bold, fontSize: '38px', color: nameColor,
    }).setOrigin(0.5);
    container.add(name);

    // 하단 상태 표시
    if (met) {
      // "자세히 보기" 버튼처럼
      const btnY = h/2 - 30;
      const btnW = w - 40;
      const btnH = 44;
      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xB19CFF, 1);
      btnBg.fillRoundedRect(-btnW/2, btnY - btnH/2, btnW, btnH, btnH/2);
      container.add(btnBg);
      const btnText = this.add.text(0, btnY, '자세히 보기  ›', {
        fontFamily: FONTS.bold, fontSize: '24px', color: '#FFFFFF',
      }).setOrigin(0.5);
      container.add(btnText);
    } else {
      // 자물쇠 배지
      const lockY = h/2 - 30;
      const lockText = this.add.text(0, lockY, '🔒 만나면 열려요', {
        fontFamily: FONTS.bold, fontSize: '24px', color: '#AAAAAA',
      }).setOrigin(0.5);
      container.add(lockText);
    }

    // 인터랙션
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: met });
    container.add(hit);

    hit.on('pointerdown', () => {
      if (met) {
        this.tweens.add({ targets: container, scale: 0.96, duration: 80 });
      }
    });
    hit.on('pointerup', () => {
      if (met) {
        this.tweens.add({ targets: container, scale: 1, duration: 140, ease: 'Back.easeOut' });
        this.openCharPopup(char);
      } else {
        this.showLockedToast();
      }
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 140 });
    });

    // 활성 카드 가벼운 호흡
    if (met) {
      this.tweens.add({
        targets: container,
        y: cy - 5,
        duration: 2400 + index * 100, ease: 'Sine.easeInOut',
        yoyo: true, repeat: -1, delay: 500 + index * 100,
      });
    }
  }

  // 캐릭터 상세 팝업
  openCharPopup(char) {
    soundManager.play('pop');

    const root = this.add.container(0, 0);
    root.setDepth(1000);

    // 어두운 오버레이
    const overlay = this.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    overlay.setInteractive();
    root.add(overlay);

    // 팝업 프레임 — 사용자 피드백: 위아래 더 줄임 (780 → 680)
    const frameW = 1500, frameH = 680;
    const fx = GAME_WIDTH / 2, fy = GAME_HEIGHT / 2;

    const frameShadow = this.add.graphics();
    frameShadow.fillStyle(0x000000, 0.5);
    frameShadow.fillRoundedRect(fx - frameW/2 + 8, fy - frameH/2 + 14, frameW, frameH, 50);
    root.add(frameShadow);

    const frame = this.add.graphics();
    frame.fillStyle(0xFFFAF5, 1);
    frame.fillRoundedRect(fx - frameW/2, fy - frameH/2, frameW, frameH, 50);
    frame.lineStyle(8, 0xFFB6C8, 1);
    frame.strokeRoundedRect(fx - frameW/2, fy - frameH/2, frameW, frameH, 50);
    root.add(frame);

    // ===== 우상단 X 닫기 버튼 (모서리에서 여백 확보) =====
    const closeBtn = this.makeCloseButton(fx + frameW/2 - 80, fy - frameH/2 + 80, root);
    root.add(closeBtn);

    // 좌측 — 캐릭터 얼굴 (frame 줄인 비례)
    if (char.texture && this.textures.exists(char.texture)) {
      const img = this.add.image(fx - 460, fy, char.texture);
      const tex = this.textures.get(char.texture).getSourceImage();
      img.setScale(380 / Math.max(tex.width, tex.height));   // 420→380
      root.add(img);

      this.tweens.add({
        targets: img,
        y: img.y - 10, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    // 우측 — 텍스트 영역 (frame 670 기준 위치 재계산)
    const tx = fx - 180;
    const textW = 860;

    // 이름
    const name = this.add.text(tx, fy - 280, char.name, {
      fontFamily: FONTS.bold, fontSize: '72px', color: '#5A2A40',
    }).setOrigin(0, 0);
    root.add(name);

    // 구분선
    const line = this.add.graphics();
    line.lineStyle(4, 0xFFB6C8, 0.8);
    line.lineBetween(tx, fy - 185, tx + textW, fy - 185);
    root.add(line);

    // 성격 라벨
    const persLbl = this.add.text(tx, fy - 160, '성격', {
      fontFamily: FONTS.bold, fontSize: '34px', color: '#B19CFF',
    }).setOrigin(0, 0);
    root.add(persLbl);
    // 성격 본문
    const pers = this.add.text(tx, fy - 110, char.personality, {
      fontFamily: FONTS.bold, fontSize: '44px', color: '#5A2A40',
      wordWrap: { width: textW },
      lineSpacing: 8,
    }).setOrigin(0, 0);
    root.add(pers);

    // 이야기 라벨
    const storyLbl = this.add.text(tx, fy + 10, '이야기', {
      fontFamily: FONTS.bold, fontSize: '34px', color: '#B19CFF',
    }).setOrigin(0, 0);
    root.add(storyLbl);
    // 이야기 본문 — . + , 자동 줄바꿈
    const storyFormatted = char.story
      .replace(/\.\s+/g, '.\n')
      .replace(/,\s+/g, ',\n');
    const story = this.add.text(tx, fy + 60, storyFormatted, {
      fontFamily: FONTS.game, fontSize: '38px', color: '#5A2A40',
      wordWrap: { width: textW },
      lineSpacing: 10,
    }).setOrigin(0, 0);
    root.add(story);

    // 페이드 인
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 350 });
  }

  // 우상단 X 닫기 버튼 (재사용 가능 컴포넌트)
  makeCloseButton(cx, cy, root) {
    const container = this.add.container(cx, cy);
    const r = 42;

    // 그림자
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillCircle(2, 5, r);
    container.add(shadow);

    // 본체 (분홍 원)
    const bg = this.add.graphics();
    bg.fillStyle(0xFFB6C8, 1);
    bg.fillCircle(0, 0, r);
    bg.lineStyle(4, 0xFFFFFF, 1);
    bg.strokeCircle(0, 0, r);
    container.add(bg);

    // X 텍스트
    const x = this.add.text(0, 0, '✕', {
      fontFamily: 'sans-serif', fontSize: '46px', fontStyle: 'bold', color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(x);

    // 인터랙션
    const hit = this.add.zone(0, 0, r * 2 + 16, r * 2 + 16).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.setScale(0.9); });
    hit.on('pointerup', () => {
      container.setScale(1);
      this.tweens.add({
        targets: root, alpha: 0, duration: 300,
        onComplete: () => root.destroy(),
      });
    });
    hit.on('pointerout', () => { container.setScale(1); });

    return container;
  }

  showLockedToast() {
    if (this.toast) this.toast.destroy();
    const tx = GAME_WIDTH / 2;
    const ty = GAME_HEIGHT - 100;
    const container = this.add.container(tx, ty);
    container.setDepth(200);

    const w = 600, h = 90;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-w/2 + 4, -h/2 + 6, w, h, h/2);
    container.add(shadow);

    const bg = this.add.graphics();
    bg.fillStyle(0x4A2D6E, 0.95);
    bg.fillRoundedRect(-w/2, -h/2, w, h, h/2);
    bg.lineStyle(3, 0xFFD93D, 0.9);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, h/2);
    container.add(bg);

    const text = this.add.text(0, 0, '🔒 미니게임에서 만나면 열려요!', {
      fontFamily: FONTS.bold, fontSize: '32px', color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(text);

    container.setAlpha(0);
    this.tweens.add({
      targets: container, alpha: 1, y: ty - 20,
      duration: 300, ease: 'Cubic.easeOut',
    });
    this.time.delayedCall(1800, () => {
      this.tweens.add({
        targets: container, alpha: 0, y: ty - 40,
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
