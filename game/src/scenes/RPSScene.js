// ✊ RPSScene — 우주 악당과 가위바위보 (3판, 3연승 시 무지개 폭발)
// 한 게임당 한 명의 악당과 3판 대결 (랜덤은 게임 시작 시 한 번만)
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { RewardSystem } from '../systems/RewardSystem.js';
import { showRewardPopup } from '../ui/RewardPopup.js';
import { makeFancyTitle } from '../ui/FancyTitle.js';
import { soundManager } from '../systems/SoundManager.js';
import { createStandardBackButton } from '../ui/StandardBackButton.js';

// 가위 → 바위 → 보 순서 (사용자 요청)
const HANDS = [
  { id: 'scissors', emoji: '✌️', name: '가위' },
  { id: 'rock',     emoji: '✊', name: '바위' },
  { id: 'paper',    emoji: '✋', name: '보' },
];

// ===== 우주 악당 (게임 시작 시 1명 랜덤 선정 → 3판 동안 고정) =====
// effect: fart(스컹크 방귀폭탄) / bat(보라박쥐 트랜지션) / alien(외계인 BGM)
const VILLAINS = [
  {
    id: 'skunk',
    name: '스컹크',
    normalKey: 'villain-skunk-normal',
    loseKey:   'villain-skunk-lose',
    profileKey: 'char-skunk',   // 프로필 — 캐릭터 도감 얼굴샷
    introLines: ['스컹크 등장!'],
    winLines:   ['뿡뿡, 방귀폭탄을 받아랏!'],
    loseLines:  ['컹스... 내가 졌다니!'],
    drawLines:  ['크크... 한 판 더!'],
    idleLines:  ['뿡뿡 준비!', '내 방귀 무서운가?', '얼른 시작 하자!', '뿡! 시작해!', '아직 안 골랐어?'],
    effect: 'fart',
  },
  {
    id: 'bat',
    name: '보라박쥐',
    normalKey: 'villain-bat-normal',
    loseKey:   'villain-bat-lose',
    profileKey: 'char-bat',
    introLines: ['보라박쥐 등장!'],
    winLines:   ['박쥐의 명예를 위하여~'],
    loseLines:  ['잘 하는데? 두고보자...'],
    drawLines:  ['훗.. 운이 좋네.'],
    idleLines:  ['훗.. 망설이는 거야?', '슬슬 시작해볼까~', '날개 펴고 기다린다구', '어둠속에서 기다려~', '아직이야?'],
    effect: 'bat',
  },
  {
    id: 'alien',
    name: '초록외계인',
    normalKey: 'villain-alien-normal',
    loseKey:   'villain-alien-lose',
    profileKey: 'char-alien',
    introLines: ['초록외계인 등장!'],
    winLines:   ['삐리삐리뽀뽀~~!!!'],
    loseLines:  ['뿌뿌..... #@%@#$%'],
    drawLines:  ['삐리... 한 번 더!'],
    idleLines:  ['삐리삐리.. 어디 갔어?', '지구인은 느려..', '뽀뽀로롱~ 같이 놀자!', '빨리 빨리 삐리뽀!', '어서 한 판 가자삐!'],
    effect: 'alien',
  },
];

// 가위바위보 결과
function judge(player, computer) {
  if (player === computer) return 'draw';
  if (
    (player === 'rock'     && computer === 'scissors') ||
    (player === 'scissors' && computer === 'paper') ||
    (player === 'paper'    && computer === 'rock')
  ) return 'win';
  return 'lose';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const VILLAIN_TARGET_H = 540;       // 악당 표시 높이 (메인 비주얼 — 크게)
const VILLAIN_CENTER_X = GAME_WIDTH / 2;
const VILLAIN_CENTER_Y = 510;

// 플레이어 프로필 아이콘 — 토슴이 도감 얼굴샷
const PLAYER_PROFILE_KEY = 'char-toseumi';
const PLAYER_NAME = '나';

export default class RPSScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RPSScene' });
  }

  preload() {
    if (!this.cache.audio.has('bgm-rps'))      this.load.audio('bgm-rps',      'sounds/bgm/rps.mp3');
    if (!this.cache.audio.has('bgm-alien-win')) this.load.audio('bgm-alien-win', 'sounds/bgm/alien-win.mp3');
  }

  create() {
    this.cameras.main.fadeIn(500, 15, 8, 32);
    soundManager.attachScene(this);
    soundManager.playBGM('bgm-rps');

    this.round = 0;
    this.maxRounds = 3;
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
    this.timeLeft = 60;
    this.isInteractable = false;
    this.isPlaying = false;

    // ⭐ 한 게임 = 한 악당. create()에서 한 번만 랜덤 선정 → 3판 동안 동일
    this.currentVillain = pickRandom(VILLAINS);

    this.speechContainer = null;
    this.speechHideTimer = null;
    this.alienSfx = null;

    this.createBackground();
    this.createUI();
    this.createHands();

    // 인트로 → 카운트다운 → 게임 시작
    this.showIntro(() => {
      this.startCountdown(() => {
        this.startTimer();
        this.startRound(true);     // 첫 라운드만 인트로 대사
      });
    });

    // 씬 종료 시 정리
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy',  () => this.cleanup());
  }

  cleanup() {
    if (this.alienSfx) {
      try { this.alienSfx.stop(); this.alienSfx.destroy(); } catch (e) {}
      this.alienSfx = null;
    }
    if (this.speechHideTimer) {
      this.speechHideTimer.remove();
      this.speechHideTimer = null;
    }
    if (this.retryDialogTimer) {           // race fix — pending retry 다이얼로그 취소
      this.retryDialogTimer.remove();
      this.retryDialogTimer = null;
    }
    this.cancelIdleTimer();
    this.cancelVillainIdleMotion();        // 박쥐 bob, 심볼/방귀 spawn 타이머 정리
    this.timerEvent?.remove();
  }

  createBackground() {
    if (this.textures.exists('bg-rps')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg-rps');
      const s = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(s);
      const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.42);
      dim.setDepth(0);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x4A2D6E, 0x4A2D6E, 0x2C1B47, 0x2C1B47, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
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

    // 타이틀 (가운데)
    makeFancyTitle(this, GAME_WIDTH / 2, 90, '가위바위보');

    // 우상단 표준 나가기 — 모든 씬 일관
    createStandardBackButton(this, () => this.exitToMain());

    // ===== 라운드 카운터 — 상단 가운데 (X판째 카운트업, 사용자 피드백) =====
    this.roundCounterText = this.add.text(GAME_WIDTH / 2, 175, '1판째', {
      fontFamily: FONTS.bold,
      fontSize: '56px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    this.roundCounterText.setShadow(0, 4, 'rgba(58,31,61,0.85)', 12, false, true);

    // ===== 프로필 + 이름 + 점수 — 좌(악당) / 우(나) 분리, 말풍선 아래 =====
    // 큰 프로필 (radius 70 — 사용자 피드백: 키움) + 옆에 이름/점수
    const PROFILE_Y = 640;
    const NAME_OFFSET_Y  = -28;       // 프로필 옆 위쪽 (이름)
    const SCORE_OFFSET_Y =  38;       // 프로필 옆 아래쪽 (점수)

    // ── 왼쪽 (나) — 사용자 피드백: 내가 왼쪽, 악당이 오른쪽 ──
    this.playerProfile = this.makeProfileBadge(
      180, PROFILE_Y, PLAYER_PROFILE_KEY, 0xFFFFFF
    );
    this.playerNameTag = this.add.text(270, PROFILE_Y + NAME_OFFSET_Y, PLAYER_NAME, {
      fontFamily: FONTS.bold,
      fontSize: '40px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.playerNameTag.setShadow(0, 3, 'rgba(58,31,61,0.85)', 10, false, true);
    this.playerScoreText = this.add.text(270, PROFILE_Y + SCORE_OFFSET_Y, '0', {
      fontFamily: FONTS.bold,
      fontSize: '72px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.playerScoreText.setShadow(0, 5, 'rgba(58,31,61,0.85)', 14, false, true);

    // ── 오른쪽 (악당) — 등장 전엔 "?" placeholder, "우주 악당 ???" 닉네임 ──
    this.villainProfile = this.makeProfileBadge(
      GAME_WIDTH - 360, PROFILE_Y, this.currentVillain.profileKey, 0xFFFFFF
    );
    this.setProfilePlaceholder(this.villainProfile, true);
    this.villainNameTag = this.add.text(GAME_WIDTH - 270, PROFILE_Y + NAME_OFFSET_Y, '우주 악당 ???', {
      fontFamily: FONTS.bold,
      fontSize: '40px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.villainNameTag.setShadow(0, 3, 'rgba(58,31,61,0.85)', 10, false, true);
    this.villainScoreText = this.add.text(GAME_WIDTH - 270, PROFILE_Y + SCORE_OFFSET_Y, '0', {
      fontFamily: FONTS.bold,
      fontSize: '72px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.villainScoreText.setShadow(0, 5, 'rgba(58,31,61,0.85)', 14, false, true);

    // ===== 악당 (메인 비주얼 — 화면 가운데, 크게) =====
    const initialKey = this.currentVillain.normalKey;
    if (this.textures.exists(initialKey)) {
      this.villainImage = this.add.image(VILLAIN_CENTER_X, VILLAIN_CENTER_Y, initialKey);
      this.villainImage.setScale(VILLAIN_TARGET_H / this.villainImage.height);
    } else {
      // 폴백 (이미지 없을 경우 큰 이모지)
      this.villainImage = this.add.text(VILLAIN_CENTER_X, VILLAIN_CENTER_Y, '👾', {
        fontFamily: FONTS.game, fontSize: '480px',
      }).setOrigin(0.5);
    }
    this.villainImage.setDepth(5);
    this.villainImage.setAlpha(0);

    // 결과 텍스트 — 스타캐치 "시작!" 폰트와 동일 (FONTS.bold, 240px, 윤곽 X)
    this.resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: FONTS.bold,
      fontSize: '240px',
      color: '#FFD93D',
    }).setOrigin(0.5);
    this.resultText.setDepth(80);
    this.resultText.setAlpha(0);

    // ===== 손 배지 (플레이어 ↔ 악당 face-off) =====
    // 사용자 피드백: 나 왼쪽 / 악당 오른쪽
    this.playerBadge  = this.makeHandBadge(560,  660, 0xFFB6C8, 0xC66888);
    this.villainBadge = this.makeHandBadge(1360, 660, 0xB19CFF, 0x7B68B8);

    // 초기 숨김 (컨테이너 통째로)
    this.handBadgeTargets = [
      this.playerBadge.container,
      this.villainBadge.container,
    ];
    this.handBadgeTargets.forEach(t => t.setAlpha(0));
  }

  // ===== 손 배지 컨테이너 생성 (크게 — 메인 비주얼) =====
  // 라벨은 배지 안쪽 하단에 흰 pill로 표시
  makeHandBadge(x, y, color, shadowColor, label) {
    const container = this.add.container(x, y);
    container.setDepth(10);

    const RADIUS = 130;     // 72 → 130 (1.8x)
    const EMOJI_FONT = 170; // 92 → 170 (1.85x)

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(shadowColor, 1);
    sh.fillCircle(0, 10, RADIUS + 4);
    container.add(sh);

    // 본체
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillCircle(0, 0, RADIUS);
    bg.lineStyle(7, 0xFFFFFF, 0.9);
    bg.strokeCircle(0, 0, RADIUS);
    container.add(bg);

    // 손 이모지 (배지 위쪽)
    const emojiText = this.add.text(0, -40, '', {
      fontFamily: FONTS.game,
      fontSize: '150px',         // 170 → 150 (손이름 자리 확보)
    }).setOrigin(0.5);
    container.add(emojiText);

    // 손이름 텍스트 — 가위/바위/보 (이미지 위 흰 볼드 + 음영, 사용자 피드백)
    const handNameText = this.add.text(0, 80, '', {
      fontFamily: FONTS.bold,
      fontSize: '60px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    handNameText.setShadow(0, 4, 'rgba(58,31,61,0.9)', 12, false, true);
    container.add(handNameText);

    return { container, emojiText, handNameText };
  }

  // hand 객체 또는 emoji만 받음 — 셔플 중엔 emoji만, 결정되면 hand 객체로
  setPlayerHand(hand) {
    if (!this.playerBadge) return;
    this.playerBadge.emojiText.setText(hand.emoji);
    this.playerBadge.handNameText.setText(hand.name);
  }
  setVillainHandEmoji(emoji) {
    if (this.villainBadge?.emojiText) this.villainBadge.emojiText.setText(emoji);
  }
  setVillainHand(hand) {
    if (!this.villainBadge) return;
    this.villainBadge.emojiText.setText(hand.emoji);
    this.villainBadge.handNameText.setText(hand.name);
  }
  clearHandNames() {
    if (this.playerBadge) this.playerBadge.handNameText.setText('');
    if (this.villainBadge) this.villainBadge.handNameText.setText('');
  }

  showHandBadges() {
    if (!this.handBadgeTargets) return;
    // 컨테이너 통째로 scale + alpha 트윈 (라벨은 컨테이너 안에 포함)
    this.handBadgeTargets.forEach(c => {
      c.setScale(0.5);
      c.setAlpha(0);
    });
    this.tweens.add({
      targets: this.handBadgeTargets,
      alpha: 1, scale: 1,
      duration: 380, ease: 'Back.out',
    });
  }

  hideHandBadges() {
    if (!this.handBadgeTargets) return;
    this.tweens.add({
      targets: this.handBadgeTargets,
      alpha: 0,
      duration: 200,
    });
  }

  // ===== 10초 idle 격려/재촉 멘트 (사용자 피드백) =====
  // 패를 안 내고 10초 이상 있으면 악당이 말풍선으로 재촉
  startIdleTimer() {
    this.cancelIdleTimer();
    this.idleTimer = this.time.delayedCall(10000, () => {
      this.idleTimer = null;
      if (!this.isInteractable || !this.isPlaying) return;
      const v = this.currentVillain;
      if (!v?.idleLines?.length) return;
      this.showVillainSpeech(pickRandom(v.idleLines), '#5A2A40', 2400);
      // 또 10초 idle하면 다시 재촉
      this.startIdleTimer();
    });
  }
  cancelIdleTimer() {
    if (this.idleTimer) {
      this.idleTimer.remove();
      this.idleTimer = null;
    }
  }

  // ===== 점수 + 라운드 카운터 표시 =====
  updateScoreDisplay() {
    if (this.villainScoreText) this.villainScoreText.setText(`${this.losses}`);
    if (this.playerScoreText)  this.playerScoreText.setText(`${this.wins}`);
    if (this.roundCounterText) {
      const r = Math.max(1, Math.min(this.round, this.maxRounds));
      this.roundCounterText.setText(`${r}판째`);     // X / 3 판 → X판째 (사용자 피드백)
    }
  }

  // ===== 프로필 배지 (캐릭터 얼굴 + ? placeholder) =====
  // 캐릭터 등장 전엔 "?" 표시 → revealVillainProfile()로 실제 캐릭터 등장
  makeProfileBadge(x, y, profileKey, bgColor) {
    const RADIUS = 70;
    const container = this.add.container(x, y);
    container.setDepth(9);

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.28);
    sh.fillCircle(2, 5, RADIUS + 3);
    container.add(sh);

    // 원형 본체 (배경 컬러)
    const bg = this.add.graphics();
    bg.fillStyle(bgColor, 1);
    bg.fillCircle(0, 0, RADIUS);
    container.add(bg);

    // 캐릭터 이미지 — 원형 mask로 클립
    let charImg = null;
    if (profileKey && this.textures.exists(profileKey)) {
      charImg = this.add.image(0, 0, profileKey);
      const tex = this.textures.get(profileKey).getSourceImage();
      const targetSize = RADIUS * 2.0;
      const scale = targetSize / Math.max(tex.width, tex.height);
      charImg.setScale(scale);
      container.add(charImg);

      const maskGfx = this.make.graphics({ x: 0, y: 0, add: false });
      maskGfx.fillStyle(0xFFFFFF);
      maskGfx.fillCircle(x, y, RADIUS - 2);
      charImg.setMask(maskGfx.createGeometryMask());
    }

    // "?" placeholder (악당 등장 전 표시용 — 기본 hidden)
    const questionMark = this.add.text(0, 0, '?', {
      fontFamily: FONTS.bold,
      fontSize: '88px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    questionMark.setShadow(0, 3, 'rgba(58,31,61,0.7)', 8, false, true);
    questionMark.setVisible(false);
    container.add(questionMark);

    // 흰 테두리 (맨 위)
    const border = this.add.graphics();
    border.lineStyle(4, 0xFFFFFF, 0.95);
    border.strokeCircle(0, 0, RADIUS);
    container.add(border);

    return { container, charImg, questionMark };
  }

  // placeholder 토글 — true: "?" 보이고 캐릭터 숨김 / false: 캐릭터 보이고 "?" 숨김
  setProfilePlaceholder(badge, isPlaceholder) {
    if (!badge) return;
    if (isPlaceholder) {
      if (badge.charImg) badge.charImg.setVisible(false);
      badge.questionMark.setVisible(true);
      badge.questionMark.setAlpha(1);
    } else {
      if (badge.charImg) badge.charImg.setVisible(true);
      badge.questionMark.setVisible(false);
    }
  }

  // ===== 악당별 미세 idle 모션 =====
  // 박쥐: 둥둥 떠다님 (Y-axis 사인) / 외계인: 외계 심볼 / 스컹크: 방귀 💨
  applyVillainIdleMotion() {
    this.cancelVillainIdleMotion();
    const v = this.currentVillain;
    if (!v || !this.villainImage) return;

    switch (v.effect) {
      case 'bat':
        // 둥둥 뜨기 (Y-axis sine)
        this.idleBobTween = this.tweens.add({
          targets: this.villainImage,
          y: VILLAIN_CENTER_Y - 12,
          duration: 1700, ease: 'Sine.inOut',
          yoyo: true, repeat: -1,
        });
        break;
      case 'alien':
        // 외계 효과 — 펄스 링 + 큰 심볼 orbit (1.5초마다 랜덤 효과)
        this.idleSpawnTimer = this.time.addEvent({
          delay: 1500, loop: true,
          callback: () => {
            const r = Math.random();
            if (r < 0.5) this.spawnAlienPulseRing();
            else        this.spawnAlienOrbitSymbol();
          },
        });
        break;
      case 'fart':     // 스컹크
        // 방귀 (6초마다 — 사용자 피드백: 천천히)
        this.idleSpawnTimer = this.time.addEvent({
          delay: 6000, loop: true,
          callback: () => this.spawnSkunkFart(),
        });
        break;
    }
  }

  cancelVillainIdleMotion() {
    if (this.idleBobTween) {
      this.idleBobTween.stop();
      this.idleBobTween = null;
    }
    if (this.idleSpawnTimer) {
      this.idleSpawnTimer.remove();
      this.idleSpawnTimer = null;
    }
    if (this.villainImage) this.villainImage.y = VILLAIN_CENTER_Y;
  }

  // 외계인 주위 — 펄스 링 (몸 주변을 둥글게 퍼져나가는 에너지파)
  spawnAlienPulseRing() {
    if (!this.villainImage || !this.villainImage.visible) return;
    const colors = [0x7FFFD4, 0xB19CFF, 0xFFE066, 0x95E1D3];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startRadius = 100;     // 외계인 몸 바로 바깥에서 시작

    const ring = this.add.graphics();
    ring.lineStyle(8, color, 1);
    ring.strokeCircle(0, 0, startRadius);
    ring.x = this.villainImage.x;
    ring.y = this.villainImage.y;
    ring.setDepth(4);            // 외계인 뒤에 (villainImage depth 5)
    ring.setAlpha(0.9);

    this.tweens.add({
      targets: ring,
      scale: 3.0,                // 100 → 300px 반경으로 확장
      alpha: 0,
      duration: 1400, ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }

  // 외계인 주위 — 큰 심볼이 몸 가까이에 orbit (이모지 갖다붙이는 느낌 X)
  spawnAlienOrbitSymbol() {
    if (!this.villainImage || !this.villainImage.visible) return;
    const symbols = ['✦', '⚡', '✨', '☄', '🛸', '🌠', '⟁', '∞'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const colors = ['#7FFFD4', '#B19CFF', '#FFE066', '#FF6B9D'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // 몸 주변 가까이 (radius 110~170)
    const startAngle = Math.random() * Math.PI * 2;
    const radius = Phaser.Math.Between(110, 170);
    const px = this.villainImage.x + Math.cos(startAngle) * radius;
    const py = this.villainImage.y + Math.sin(startAngle) * radius;

    const text = this.add.text(px, py, sym, {
      fontFamily: FONTS.bold,
      fontSize: '68px',          // 36 → 68 (대폭 키움)
      color,
    }).setOrigin(0.5);
    text.setDepth(6);
    text.setAlpha(0);
    text.setScale(0.3);

    // 강한 글로우 effect
    text.setShadow(0, 0, color, 16, true, true);

    // 등장 (몸 가까이서 톡 튀어나옴)
    this.tweens.add({
      targets: text,
      alpha: 1, scale: 1.2,
      duration: 350, ease: 'Back.out',
    });

    // 몸 주변 살짝 orbit (각도 0.5라디안 ~ 28도 정도)
    const endAngle = startAngle + (Math.random() < 0.5 ? -0.5 : 0.5);
    const endX = this.villainImage.x + Math.cos(endAngle) * (radius + 20);
    const endY = this.villainImage.y + Math.sin(endAngle) * (radius + 20);

    this.tweens.add({
      targets: text,
      x: endX, y: endY,
      duration: 900, delay: 250, ease: 'Sine.inOut',
    });

    // 페이드아웃 + 살짝 부풀며 사라짐
    this.tweens.add({
      targets: text,
      alpha: 0, scale: 1.6,
      duration: 500, delay: 900, ease: 'Cubic.in',
      onComplete: () => text.destroy(),
    });
  }

  // 스컹크 — 방귀 💨 (꼬리 base 엉덩이 → 오른쪽 분출)
  // 30% 확률로 큰 방귀 (사용자 피드백: 소심 X)
  spawnSkunkFart() {
    if (!this.villainImage || !this.villainImage.visible) return;

    const isBigFart = Math.random() < 0.3;

    // spawn 위치 — 사용자 캡처: 오른쪽 꼬리 base 엉덩이
    const px = this.villainImage.x + 60;
    const py = this.villainImage.y + Phaser.Math.Between(160, 210);

    if (isBigFart) {
      // 큰 방귀: 살짝 더 오른쪽 + 누리끼리 톤 (사용자 피드백)
      const bigPx = this.villainImage.x + 110;   // 60 → 110 (조금 더 오른쪽)
      const PURPLE_TINT = 0xCFC0FF;              // 연한 보라 (사용자 피드백)

      // 스컹크 살짝 squash (몸이 흔들림)
      const baseScale = this.villainImage.scale;
      this.tweens.add({
        targets: this.villainImage,
        scaleX: baseScale * 1.06, scaleY: baseScale * 0.94,
        duration: 110, yoyo: true,
        onComplete: () => this.villainImage.setScale(baseScale),
      });

      // 메인 큰 방귀
      const big = this.add.text(bigPx, py, '💨', {
        fontFamily: FONTS.game,
        fontSize: '120px',
      }).setOrigin(0.5);
      big.setDepth(6);
      big.setAlpha(0);
      big.setScale(0.3);
      big.setTint(PURPLE_TINT);                  // 누리끼리 컬러
      this.tweens.add({
        targets: big, alpha: 0.95, scale: 1.4,
        duration: 280, ease: 'Back.out',
      });
      this.tweens.add({
        targets: big,
        x: bigPx + 220, y: py - 40,
        alpha: 0, scale: 2.4,
        duration: 1100, delay: 400, ease: 'Cubic.out',
        onComplete: () => big.destroy(),
      });

      // 부속 trail 2개 (작은 추가 방귀들, 같은 누리끼리 톤)
      for (let i = 0; i < 2; i++) {
        const trail = this.add.text(bigPx - i * 18, py + Phaser.Math.Between(-15, 15), '💨', {
          fontFamily: FONTS.game,
          fontSize: `${70 - i * 12}px`,
        }).setOrigin(0.5);
        trail.setDepth(6);
        trail.setAlpha(0);
        trail.setScale(0.4);
        trail.setTint(PURPLE_TINT);              // 누리끼리 컬러

        this.tweens.add({
          targets: trail, alpha: 0.8, scale: 1,
          duration: 220, delay: 120 + i * 90,
        });
        this.tweens.add({
          targets: trail,
          x: bigPx + 160 + i * 30, y: py - 20,
          alpha: 0, scale: 1.7,
          duration: 1000, delay: 450 + i * 90, ease: 'Cubic.out',
          onComplete: () => trail.destroy(),
        });
      }
    } else {
      // 일반 방귀 (작은 거)
      const fart = this.add.text(px, py, '💨', {
        fontFamily: FONTS.game,
        fontSize: '58px',
      }).setOrigin(0.5);
      fart.setDepth(6);
      fart.setAlpha(0);
      fart.setScale(0.5);

      this.tweens.add({
        targets: fart, alpha: 0.85, scale: 1.1,
        duration: 320, ease: 'Back.out',
      });
      this.tweens.add({
        targets: fart,
        x: px + 140, y: py - 30,
        alpha: 0, scale: 1.5,
        duration: 800, delay: 500, ease: 'Cubic.out',
        onComplete: () => fart.destroy(),
      });
    }
  }

  // 악당 프로필 + 이름 reveal — startRound(true) 첫 라운드에 호출
  revealVillainProfile() {
    if (!this.villainProfile) return;

    // ? 페이드아웃 + 캐릭터 페이드인 (crossfade)
    if (this.villainProfile.charImg) {
      this.villainProfile.charImg.setAlpha(0).setVisible(true);
      this.tweens.add({
        targets: this.villainProfile.charImg,
        alpha: 1,
        duration: 380, ease: 'Cubic.out',
      });
    }
    if (this.villainProfile.questionMark) {
      this.tweens.add({
        targets: this.villainProfile.questionMark,
        alpha: 0,
        duration: 200,
        onComplete: () => this.villainProfile.questionMark.setVisible(false),
      });
    }

    // 이름 텍스트 페이드 교체 (우주악당 ??? → 실제 이름)
    if (this.villainNameTag && this.currentVillain) {
      const finalName = this.currentVillain.name;
      this.tweens.add({
        targets: this.villainNameTag,
        alpha: 0,
        duration: 180,
        onComplete: () => {
          this.villainNameTag.setText(finalName);
          this.tweens.add({
            targets: this.villainNameTag,
            alpha: 1,
            duration: 260, ease: 'Cubic.out',
          });
        },
      });
    }
  }

  createHands() {
    // 플레이어 가위/바위/보 (하단 가로)
    const startX = GAME_WIDTH / 2 - 280;
    const y = GAME_HEIGHT - 160;
    const gap = 280;

    HANDS.forEach((hand, i) => {
      const x = startX + i * gap;
      this.makeHandButton(x, y, hand);
    });
  }

  makeHandButton(x, y, hand) {
    const w = 220, h = 220;
    const container = this.add.container(x, y);

    const sh = this.add.graphics();
    sh.fillStyle(0xC66888, 1);
    sh.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 30);
    container.add(sh);

    const bg = this.add.graphics();
    bg.fillStyle(0xFFB6C8, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
    container.add(bg);

    const emojiText = this.add.text(0, -16, hand.emoji, {
      fontFamily: FONTS.game,
      fontSize: '108px',
    }).setOrigin(0.5);
    container.add(emojiText);

    const labelText = this.add.text(0, 70, hand.name, {
      fontFamily: FONTS.bold,
      fontSize: '36px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(labelText);

    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 5; });
    hit.on('pointerup', () => {
      container.y = y;
      if (this.isInteractable) this.playHand(hand);
    });
    hit.on('pointerout', () => { container.y = y; });
  }

  // ===== 악당 텍스처 교체 (height 기준 균일 스케일) =====
  setVillainTexture(key) {
    if (!key || !this.villainImage || !this.villainImage.setTexture) return;
    if (!this.textures.exists(key)) return;
    this.villainImage.setTexture(key);
    this.villainImage.setScale(VILLAIN_TARGET_H / this.villainImage.height);
  }

  // ===== 악당 말풍선 (악당 오른쪽 옆 — 직사각형 + 좌측 꼬리) =====
  showVillainSpeech(message, color = '#5A2A40', autoHideMs = 0) {
    if (this.speechHideTimer) {
      this.speechHideTimer.remove();
      this.speechHideTimer = null;
    }
    if (this.speechContainer) {
      this.speechContainer.destroy();
      this.speechContainer = null;
    }
    if (!message) return;

    // 악당이 오른쪽으로 이동 → 말풍선도 오른쪽 (사용자 피드백)
    const cx = GAME_WIDTH - 420;     // 1500
    const cy = 410;
    const w = 480;
    const h = 200;
    const radius = 26;

    const container = this.add.container(cx, cy);
    container.setDepth(60);

    // 그림자
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.3);
    sh.fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, radius);
    container.add(sh);

    // 본체 (반투명 흰색)
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    container.add(bg);

    // 꼬리 (왼쪽 — 악당 이미지 방향, 악당 이미지는 화면 중앙)
    const tail = this.add.graphics();
    tail.fillStyle(0xFFFFFF, 0.96);
    tail.beginPath();
    tail.moveTo(-w / 2 - 36, 22);     // tip (왼쪽 + 살짝 아래 — 악당 이미지쪽)
    tail.lineTo(-w / 2 + 6, -4);
    tail.lineTo(-w / 2 + 6, 48);
    tail.closePath();
    tail.fillPath();
    container.add(tail);

    // 텍스트 — 단일 라인 강제, 폰트 큼, 길면 자동 축소 (사용자 피드백)
    const TARGET_FONT  = 64;        // 48 → 64 (대폭 키움)
    const MIN_FONT     = 42;        // 너무 줄어들지 않게 최소값
    const MAX_TEXT_W   = w - 60;    // 말풍선 패딩 양옆 30px씩

    const text = this.add.text(0, 0, message, {
      fontFamily: FONTS.bold,
      fontSize: `${TARGET_FONT}px`,
      color,
      align: 'center',
    }).setOrigin(0.5);

    // 텍스트가 말풍선 폭 초과하면 자동 축소 (줄바꿈 X)
    if (text.width > MAX_TEXT_W) {
      const factor = MAX_TEXT_W / text.width;
      const shrunk = Math.max(MIN_FONT, Math.floor(TARGET_FONT * factor));
      text.setFontSize(shrunk);
    }
    container.add(text);

    // 페이드인 + 살짝 통통 (어린이가 인지할 시간)
    container.setAlpha(0);
    container.setScale(0.7);
    this.tweens.add({
      targets: container,
      alpha: 1, scale: 1,
      duration: 380, ease: 'Back.out',
    });

    this.speechContainer = container;

    if (autoHideMs > 0) {
      this.speechHideTimer = this.time.delayedCall(autoHideMs, () => {
        this.speechHideTimer = null;
        this.hideVillainSpeech();
      });
    }
  }

  hideVillainSpeech() {
    if (!this.speechContainer) return;
    const c = this.speechContainer;
    this.speechContainer = null;
    this.tweens.add({
      targets: c,
      alpha: 0,
      duration: 200,
      onComplete: () => c.destroy(),
    });
  }

  // ===== 라운드 시작 — 악당 텍스처 normal로 복귀 (3판 동안 동일 악당) =====
  startRound(isFirst = false) {
    this.round++;
    this.updateScoreDisplay();

    // 이전 라운드 손 배지 숨김 + 손이름 초기화
    this.hideHandBadges();
    this.clearHandNames();

    // 악당 표정 normal 복귀 (이전 라운드에서 패배 표정이었을 수 있음)
    this.setVillainTexture(this.currentVillain.normalKey);
    this.villainImage.setAngle(0);

    // 페이드인 + 통통 (첫 라운드는 더 임팩트 있게)
    const baseScale = this.villainImage.scale;
    this.villainImage.setAlpha(0);
    this.villainImage.setScale(baseScale * (isFirst ? 0.5 : 0.85));
    this.tweens.add({
      targets: this.villainImage,
      alpha: 1,
      scaleX: baseScale, scaleY: baseScale,
      duration: isFirst ? 480 : 280, ease: 'Back.out',
    });

    // 결과 텍스트 초기화
    this.resultText.setText('').setAlpha(0);

    // 인트로 라인은 첫 라운드만 + 캐릭터 reveal (? → 실제 프로필/이름) + idle 모션
    if (isFirst) {
      this.revealVillainProfile();
      this.applyVillainIdleMotion();    // 박쥐 둥둥 / 외계인 심볼 / 스컹크 방귀
      this.showVillainSpeech(pickRandom(this.currentVillain.introLines), '#5A2A40', 1400);
    }

    this.isInteractable = true;
    this.startIdleTimer();   // 10초 idle → 격려/재촉 멘트
  }

  playHand(playerHand) {
    this.isInteractable = false;
    this.cancelIdleTimer();           // 행동 시작 → idle 타이머 취소
    soundManager.play('rps');         // 가위바위보! 챈트
    this.hideVillainSpeech();

    // 플레이어 손 + 손이름 즉시 표시 (이미 결정됨)
    this.setPlayerHand(playerHand);
    this.setVillainHandEmoji('🤔');   // 악당은 셔플 시작 — 이모지만, 이름은 settle 때
    this.showHandBadges();

    // 두구두구 호흡 (사용자 피드백: 어린이가 인지하기 좋게 느리게)
    const baseScale = this.villainImage.scale;
    this.tweens.add({
      targets: this.villainImage,
      scaleX: baseScale * 1.04,
      scaleY: baseScale * 1.04,
      duration: 820, yoyo: true,                    // 520 → 820
      onComplete: () => { this.villainImage.setScale(baseScale); },
    });

    // 가-위-바-위 4박 셔플 (간격 130→210ms — 어린이가 따라가기 좋게)
    const SHAKE_TIMES = [0, 210, 420, 630];
    SHAKE_TIMES.forEach(t => {
      this.time.delayedCall(t, () => {
        const random = HANDS[Math.floor(Math.random() * HANDS.length)];
        this.setVillainHandEmoji(random.emoji);
      });
    });

    // "보!" 시점에 최종 손 + 이름 결정 (520 → 840ms — 셔플 끝나고 음미 시간)
    this.time.delayedCall(840, () => {
      const computerHand = HANDS[Math.floor(Math.random() * HANDS.length)];
      this.setVillainHand(computerHand);
      // 결정된 손 강조 pop (살짝 크게 + 길게)
      this.tweens.add({
        targets: this.villainBadge.container,
        scaleX: 1.18, scaleY: 1.18,
        duration: 280, yoyo: true, ease: 'Back.out',  // 200 → 280
      });
      // 결과 표시까지 더 천천히 (600 → 900ms — 어린이가 결정을 보고 음미)
      this.time.delayedCall(900, () => this.showResult(playerHand, computerHand));
    });
  }

  showResult(playerHand, computerHand) {
    const result = judge(playerHand.id, computerHand.id);
    let text = '', color = '#FFD93D';
    if (result === 'win') {
      this.wins++;
      text = '이겼다!';
      color = '#7FD8C0';
      soundManager.play('match');
    } else if (result === 'lose') {
      this.losses++;
      text = '졌어...';
      color = '#FF6B9D';
      soundManager.play('select');     // 부드러운 톤 (네거티브 X)
    } else {
      this.draws++;
      text = '비겼어!';
      color = '#FFD93D';
      soundManager.play('pop');
    }

    this.updateScoreDisplay();

    // 결과 배너 — 스타캐치 카운트다운 모션 (어린이가 음미할 시간 — 느리게)
    this.resultText.setText(text).setColor(color);
    this.resultText.setAlpha(1).setScale(0);
    this.tweens.add({
      targets: this.resultText,
      scale: 1.3, duration: 520, ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: this.resultText,
      alpha: 0, scale: 1.8, duration: 500, delay: 1300,
    });

    // 결과 배너가 보인 뒤 → 악당 반응 (천천히)
    this.time.delayedCall(620, () => this.applyVillainReaction(result));

    // 다음 라운드 또는 종료 — 결과/반응/대사를 충분히 보고 (어린이가 따라올 시간)
    this.time.delayedCall(2900, () => {
      if (!this.isPlaying) return;
      if (this.round >= this.maxRounds) {
        this.endGame();
      } else {
        this.startRound(false);     // 2-3 라운드는 인트로 대사 생략
      }
    });
  }

  // ===== 악당 반응 =====
  applyVillainReaction(result) {
    const v = this.currentVillain;
    if (!v) return;

    if (result === 'win') {
      // 플레이어 승 → 악당 패배 표정 + 패배 대사 (느리게)
      this.setVillainTexture(v.loseKey);
      const baseScale = this.villainImage.scale;
      this.tweens.add({
        targets: this.villainImage,
        scaleX: baseScale * 0.93,
        scaleY: baseScale * 0.93,
        duration: 420, yoyo: true,
      });
      this.showVillainSpeech(pickRandom(v.loseLines), '#5A2A40');

    } else if (result === 'lose') {
      // 플레이어 패 → 악당 승리 대사 + 효과 (느리게)
      this.showVillainSpeech(pickRandom(v.winLines), '#5A2A40');
      const baseScale = this.villainImage.scale;
      this.tweens.add({
        targets: this.villainImage,
        scaleX: baseScale * 1.10,
        scaleY: baseScale * 1.10,
        duration: 320, yoyo: true,
      });
      this.triggerVillainEffect(v.effect);

    } else {
      this.showVillainSpeech(pickRandom(v.drawLines), '#5A2A40');
    }
  }

  // ===== 악당별 특수 효과 =====
  triggerVillainEffect(effect) {
    switch (effect) {
      case 'fart':  return this.fxFartBomb();
      case 'bat':   return this.fxBatTransition();
      case 'alien': return this.fxAlienBgm();
      default:      return;
    }
  }

  fxFartBomb() {
    // 봄버맨 캐릭터 사라질 때 같은 지지직 사운드 (사용자 피드백)
    soundManager.play('crackle');

    const cx = this.villainImage.x;
    const cy = this.villainImage.y;

    // ===== 옆으로 퍼지는 연막탄 — 좌/우 양쪽으로 가스 구름 spread =====
    // 연한 보라톤 (캐릭터 톤과 매칭)
    const cloudColors = [0xCFC0FF, 0xE0D5FF, 0xC9B6FF, 0xD8C8FF];
    const PAIRS = 8;                      // 좌/우 한 쌍씩 8쌍 = 16개

    for (let i = 0; i < PAIRS * 2; i++) {
      const dir = (i % 2 === 0) ? -1 : 1; // 짝수 왼쪽, 홀수 오른쪽
      const layer = Math.floor(i / 2);    // 0~7 (멀어질수록 layer↑)

      // spawn: villain 근처 (양옆 살짝 시작)
      const ox = dir * (40 + Math.random() * 30);
      const oy = Phaser.Math.Between(-40, 60);
      const r = Phaser.Math.Between(45, 80) - layer * 2;

      const g = this.add.graphics();
      g.fillStyle(cloudColors[i % cloudColors.length], 0.7);
      g.fillCircle(0, 0, r);
      g.x = cx + ox;
      g.y = cy + oy;
      g.setDepth(35);
      g.setAlpha(0);

      // 페이드 인
      this.tweens.add({
        targets: g,
        alpha: 0.85,
        duration: 220,
        delay: layer * 40,
      });

      // 옆으로 퍼지면서 (좌/우 외부로) + 살짝 위 + 페이드아웃 + 부풀음
      this.tweens.add({
        targets: g,
        x: g.x + dir * (180 + Math.random() * 80),     // 옆으로 멀리
        y: g.y + Phaser.Math.Between(-50, 40),         // 약간 흩어짐 (위 X 아래 X 혼합)
        alpha: 0,
        scale: 2.0,
        duration: 1800,
        delay: 280 + layer * 50,
        ease: 'Cubic.out',
        onComplete: () => g.destroy(),
      });
    }

    // ===== "뿡!" 글자 — 흰색 + 위쪽 위치 (레이아웃 정리, 겹침 X) =====
    const fartText = this.add.text(cx, cy - 240, '뿡!', {
      fontFamily: FONTS.bold,
      fontSize: '220px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    fartText.setDepth(46);
    fartText.setScale(0);
    fartText.setShadow(0, 6, 'rgba(58,31,61,0.85)', 16, false, true);

    this.tweens.add({
      targets: fartText, scale: 1.3, duration: 280, ease: 'Back.out',
    });
    this.tweens.add({
      targets: fartText, alpha: 0, scale: 1.9, duration: 700, delay: 900,
      onComplete: () => fartText.destroy(),
    });
  }

  fxBatTransition() {
    soundManager.play('pop');
    const batCount = 16;
    for (let i = 0; i < batCount; i++) {
      const startY = Phaser.Math.Between(180, GAME_HEIGHT - 280);
      const bat = this.add.text(-100, startY, '🦇', {
        fontFamily: FONTS.game,
        fontSize: `${Phaser.Math.Between(90, 130)}px`,
      }).setOrigin(0.5);
      bat.setDepth(45);
      this.tweens.add({
        targets: bat,
        x: GAME_WIDTH + 120,
        y: startY + Math.sin(i * 1.3) * 130,
        angle: Phaser.Math.Between(-15, 15),
        duration: 1400 + i * 45,
        delay: i * 55,
        ease: 'Sine.inOut',
        onComplete: () => bat.destroy(),
      });
    }
    const veil = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x6B3FA0, 0);
    veil.setDepth(44);
    this.tweens.add({
      targets: veil, fillAlpha: 0.28, duration: 220, yoyo: true,
      onComplete: () => veil.destroy(),
    });
  }

  fxAlienBgm() {
    if (this.cache.audio.exists('bgm-alien-win')) {
      try {
        if (this.alienSfx) { this.alienSfx.stop(); this.alienSfx.destroy(); }
        this.alienSfx = this.sound.add('bgm-alien-win', { volume: 0.55, loop: false });
        this.alienSfx.play();
        this.time.delayedCall(3500, () => {
          if (this.alienSfx) {
            try { this.alienSfx.stop(); this.alienSfx.destroy(); } catch (e) {}
            this.alienSfx = null;
          }
        });
      } catch (e) {
        soundManager.play('pop');
      }
    } else {
      soundManager.play('pop');
    }
    const cx = this.villainImage.x;
    const cy = this.villainImage.y;
    for (let i = 0; i < 12; i++) {
      const ufo = this.add.text(
        cx + (Math.random() - 0.5) * 800,
        cy + (Math.random() - 0.5) * 300,
        '🛸',
        { fontFamily: FONTS.game, fontSize: `${Phaser.Math.Between(80, 120)}px` },
      ).setOrigin(0.5);
      ufo.setDepth(45);
      ufo.setScale(0);
      this.tweens.add({
        targets: ufo, scale: 1, duration: 300, delay: i * 80, ease: 'Back.out',
      });
      this.tweens.add({
        targets: ufo, alpha: 0, y: ufo.y - 240,
        duration: 1500, delay: 600 + i * 80,
        onComplete: () => ufo.destroy(),
      });
    }
  }

  // ===== 인트로 모달 — 게임 룰 안내 + 시작 버튼 =====
  showIntro(onDone) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 인트로 동안 악당 + 결과배너 + 손배지 가리기 (사용자 피드백: 준비팝업뜰때는 캐릭터 안 나오게)
    this.villainImage.setVisible(false);
    this.resultText.setVisible(false);
    if (this.handBadgeTargets) this.handBadgeTargets.forEach(t => t.setVisible(false));

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);
    overlay.setDepth(1000);
    overlay.setInteractive();

    const title = this.add.text(cx, cy - 140, '우주 악당과 가위바위보!', {
      fontFamily: FONTS.bold,
      fontSize: '88px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    title.setDepth(1001);

    const subtitle = this.add.text(cx, cy - 30, '3판 모두 이기고 선물을 받자!', {
      fontFamily: FONTS.bold,
      fontSize: '52px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    subtitle.setDepth(1001);

    // [시작] 버튼
    const btnW = 360;
    const btnH = 130;
    const btnY = cy + 100;
    const btnContainer = this.add.container(cx, btnY);
    btnContainer.setDepth(1001);

    const btnG = this.add.graphics();
    btnG.fillStyle(0x3D8870, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2 + 8, btnW, btnH, btnH / 2);
    btnG.fillGradientStyle(0xA0E5D0, 0xA0E5D0, 0x6FCAB2, 0x6FCAB2, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btnG.lineStyle(3, 0x4FA088, 0.6);
    btnG.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btnContainer.add(btnG);

    const btnText = this.add.text(0, 0, '시작', {
      fontFamily: FONTS.bold,
      fontSize: '64px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    const hit = this.add.zone(0, 0, btnW, btnH).setInteractive({ useHandCursor: true });
    btnContainer.add(hit);

    const fadeTargets = [overlay, title, subtitle, btnContainer];
    fadeTargets.forEach(t => t.setAlpha(0));
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: [title, subtitle, btnContainer], alpha: 1,
      duration: 500, delay: 150, ease: 'Cubic.easeOut',
    });

    hit.on('pointerdown', () => { btnContainer.y = btnY + 6; });
    hit.on('pointerout',  () => { btnContainer.y = btnY; });
    hit.on('pointerup', () => {
      btnContainer.y = btnY;
      soundManager.play('pop');
      this.tweens.add({
        targets: fadeTargets, alpha: 0,
        duration: 350, ease: 'Cubic.easeIn',
        onComplete: () => {
          fadeTargets.forEach(t => t.destroy());
          // 인트로 끝 → 악당 + 결과텍스트 + 손배지 다시 보이게 (배지는 알파 0이라 숨겨져있음)
          this.villainImage.setVisible(true);
          this.resultText.setVisible(true);
          if (this.handBadgeTargets) this.handBadgeTargets.forEach(t => t.setVisible(true));
          if (onDone) onDone();
        },
      });
    });
  }

  // ===== 카운트다운 (3, 2, 1, 시작!) =====
  startCountdown(onDone) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const numbers = ['3', '2', '1', '시작!'];
    let idx = 0;

    const showNext = () => {
      if (idx >= numbers.length) { if (onDone) onDone(); return; }
      const num = this.add.text(cx, cy, numbers[idx], {
        fontFamily: FONTS.bold, fontSize: '240px', color: '#FFD93D',
      }).setOrigin(0.5);
      num.setDepth(90);
      num.setScale(0);
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

  // ===== 타이머 =====
  startTimer() {
    this.isPlaying = true;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isPlaying) return;
        this.timeLeft--;
        this.timerText.setText(`⏱ ${this.timeLeft}`);
        if (this.timeLeft <= 10) this.timerText.setColor('#FF6B9D');
        if (this.timeLeft <= 0) this.onTimeUp();
      },
      loop: true,
    });
  }

  // ===== 시간 종료 — 다른 미니게임처럼 실패 팝업 (사용자 피드백) =====
  onTimeUp() {
    this.isPlaying = false;
    this.isInteractable = false;
    this.timerEvent?.remove();
    this.cancelIdleTimer();
    this.cancelVillainIdleMotion();    // 박쥐 부유 / 외계 심볼 / 방귀 spawn 중단 (버그 fix)
    this.hideVillainSpeech();
    this.hideHandBadges();

    SaveSystem.incStat('rpsPlays');
    // 참가 보상 (small — 다이얼로그 안에 표시)
    const reward = RewardSystem.grant('common');

    // delayedCall 핸들 저장 — 사용자 빠른 뒤로가기 race 방지
    this.retryDialogTimer = this.time.delayedCall(500, () => {
      this.retryDialogTimer = null;
      this.showRetryDialog(reward);
    });
  }

  // ===== 다시 도전 다이얼로그 (CardMatchScene과 동일 패턴) =====
  showRetryDialog(participationReward) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const root = this.add.container(0, 0);
    root.setDepth(2000);

    // 어두운 배경
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65);
    overlay.setInteractive();        // 뒤 클릭 차단
    root.add(overlay);

    // 패널
    const panelW = 1100;
    const panelH = 700;
    const panel = this.add.graphics();
    panel.fillStyle(0xFFF4F7, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    panel.lineStyle(8, 0xFFB6C8, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 50);
    root.add(panel);

    // 토슴이 우는 표정 (좌측) — 실패 팝업 공통 (미니게임 전체 통일)
    const sadKey = this.textures.exists('toseumi-sad') ? 'toseumi-sad'
                  : 'toseumi-default';
    if (this.textures.exists(sadKey)) {
      const toseumi = this.add.image(cx - 400, cy - 30, sadKey);
      toseumi.setScale(0.35);                                   // 0.45→0.35 (살짝 작게)
      root.add(toseumi);
    }

    // 메시지 — 가운데 정렬 (사용자 피드백: 참가 보상 제거 + 텍스트 중앙)
    const title = this.add.text(cx + 90, cy - 100, '아쉬워!', {
      fontFamily: FONTS.bold,
      fontSize: '96px',
      color: '#FF6B9D',
    }).setOrigin(0.5);
    root.add(title);

    const subtitle = this.add.text(cx + 90, cy + 30, '다시 도전해 볼래?', {
      fontFamily: FONTS.game,
      fontSize: '60px',
      color: '#5A2A40',
    }).setOrigin(0.5);
    root.add(subtitle);

    // (참가 보상 표시 제거 — 사용자 피드백)

    // 버튼 — 다시 도전 / 홈으로 (간격 살짝 줄여 토슴이와 겹침 방지)
    const btnY = cy + 200;
    const retryBtn = this.makeRetryButton(cx + 90 - 200, btnY, 360, 120, 0x7FD8C0, 0x4FA088, '🔄 다시 도전', () => {
      root.destroy();
      this.scene.restart();
    });
    root.add(retryBtn);

    const homeBtn = this.makeRetryButton(cx + 90 + 200, btnY, 360, 120, 0xFFB6C8, 0xC66888, '🏠 홈으로', () => {
      root.destroy();
      this.exitToMain();
    });
    root.add(homeBtn);

    // 부드러운 페이드 인
    root.setAlpha(0);
    this.tweens.add({ targets: root, alpha: 1, duration: 400, ease: 'Cubic.easeOut' });
  }

  makeRetryButton(x, y, w, h, color, shadow, label, onClick) {
    const container = this.add.container(x, y);
    const sh = this.add.graphics();
    sh.fillStyle(shadow, 1);
    sh.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, h / 2);
    container.add(sh);
    const btn = this.add.graphics();
    btn.fillStyle(color, 1);
    btn.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    container.add(btn);
    const text = this.add.text(0, 0, label, {
      fontFamily: FONTS.bold,
      fontSize: '56px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(text);
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 6; });
    hit.on('pointerup', () => { container.y = y; if (onClick) onClick(); });
    hit.on('pointerout', () => { container.y = y; });
    return container;
  }

  endGame() {
    SaveSystem.incStat('rpsPlays');
    this.isInteractable = false;
    this.isPlaying = false;
    this.timerEvent?.remove();
    this.cancelIdleTimer();
    this.cancelVillainIdleMotion();    // 부유/심볼/방귀 spawn 중단 — 보상 팝업 위로 새지 않게
    this.hideVillainSpeech();

    // 3연승 체크
    if (this.wins === 3) {
      SaveSystem.incStat('rps3WinStreaks');
      this.show3WinBurst(() => {
        const reward = RewardSystem.grant('rare');
        showRewardPopup(this, reward, () => this.exitToMain());
      });
    } else {
      const tier = RewardSystem.decideRPSReward(this.wins, this.draws, this.losses);
      const reward = RewardSystem.grant(tier);
      this.time.delayedCall(800, () => {
        showRewardPopup(this, reward, () => this.exitToMain());
      });
    }
  }

  show3WinBurst(onDone) {
    soundManager.play('fanfare');

    // 악당 패배 표정 (이미 변경됐을 가능성 큼)
    this.setVillainTexture(this.currentVillain.loseKey);

    // 악당 축소 + 페이드 (퇴장하는 느낌)
    this.tweens.add({
      targets: this.villainImage,
      scale: this.villainImage.scale * 0.4,
      alpha: 0.5,
      duration: 1000, ease: 'Cubic.easeIn',
    });

    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '3연승!!', {
      fontFamily: FONTS.bold,
      fontSize: '260px',
      color: '#FFD93D',
    }).setOrigin(0.5);
    banner.setScale(0);
    banner.setDepth(85);

    this.tweens.add({
      targets: banner, scale: 1.3, duration: 600, ease: 'Back.out',
    });

    // 무지개 별가루
    const colors = ['#FF6B9D', '#FFB347', '#FFE066', '#95E1D3', '#B19CFF'];
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const distance = Phaser.Math.Between(300, 700);
      const ex = GAME_WIDTH / 2 + Math.cos(angle) * distance;
      const ey = GAME_HEIGHT / 2 + Math.sin(angle) * distance;
      const star = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '✦', {
        fontFamily: FONTS.bold,
        fontSize: `${Phaser.Math.Between(32, 56)}px`,
        color: colors[i % colors.length],
      }).setOrigin(0.5);
      star.setDepth(82);
      this.tweens.add({
        targets: star, x: ex, y: ey, alpha: 0, scale: 0.3,
        duration: 2000, delay: i * 25, ease: 'Cubic.out',
      });
    }

    this.time.delayedCall(2200, () => {
      this.tweens.add({
        targets: banner, alpha: 0, duration: 400,
        onComplete: () => { banner.destroy(); if (onDone) onDone(); },
      });
    });
  }

  // 상단 바 버튼
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
      fontFamily: FONTS.bold, fontSize: '54px', color: '#FFFFFF',
    }).setOrigin(0.5);
    container.add(lText);
    const hit = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    container.add(hit);
    hit.on('pointerdown', () => { container.y = y + 4; });
    hit.on('pointerup', () => { container.y = y; if (onClick) onClick(); });
    hit.on('pointerout', () => { container.y = y; });
    return container;
  }

  exitToMain() {
    this.cleanup();
    this.cameras.main.fadeOut(500, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MainScene');
    });
  }
}
