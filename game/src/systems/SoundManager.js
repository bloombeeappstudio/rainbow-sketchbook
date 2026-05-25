// 🔊 SoundManager — 사운드 시스템 (mp3 자산 우선 + 합성 fallback)
//
// SFX: 단발성 (클릭/매치/팝/별가루 등)
//   - mp3 자산이 있으면 우선 재생, 없으면 Web Audio 합성
// BGM: 트랙 배열 받아서 순차 재생 (롤링)
//   - 트랙 끝나면 다음 트랙으로 자동 전환
//   - 잔잔하게 (volume 0.18~0.22)

const VOLUME       = 0.5;          // SFX 기본 볼륨 (mp3)
const SYNTH_VOLUME = 0.22;         // 합성 SFX 볼륨
const BGM_VOLUME   = 0.18;         // BGM 잔잔하게 (사용자 피드백)

// SFX 키 → mp3 자산 매핑 (있으면 우선 사용)
const SFX_MP3_MAP = {
  click:    'sfx-button',
  pop:      'sfx-button',          // 같은 클릭음 재사용
  select:   'sfx-button',          // 컬러/스티커 선택도 클릭음
  reward:   'sfx-reward',          // 보상 사운드 (level complete)
  // match/star/catch/countdown/start/fanfare/sparkle은 합성 유지 (다양성)
};

class SoundManager {
  constructor() {
    this.ctx           = null;
    this.muted         = false;
    this.bgmMuted      = false;
    this.scene         = null;

    // BGM 상태
    this.bgmPlaylist   = [];        // ['bgm-lobby-1', 'bgm-lobby-2']
    this.bgmCurrentIdx = 0;
    this.bgmCurrent    = null;      // 현재 재생 중인 Phaser sound 객체
  }

  attachScene(scene) {
    this.scene = scene;
    // 글로벌 사운드 매니저 — 씬 전환에도 BGM 연속 재생
    this.gameSound = scene.sys.game.sound;
  }

  // ====================================================================
  // SFX
  // ====================================================================

  play(name) {
    if (this.muted) return;

    // mp3 자산 우선
    const mp3Key = SFX_MP3_MAP[name];
    if (mp3Key && this._tryPlayMp3(mp3Key, VOLUME)) return;

    // 직접 매칭 (key가 mp3 자산명일 때)
    if (this._tryPlayMp3(name, VOLUME)) return;

    // 합성 fallback
    if (!this._ensureCtx()) return;
    switch (name) {
      case 'click':       this._click(); break;
      case 'pop':         this._pop(); break;
      case 'match':       this._match(); break;
      case 'star':        this._star(); break;
      case 'catch':       this._catch(); break;
      case 'countdown':   this._countdown(); break;
      case 'start':       this._start(); break;
      case 'fanfare':     this._fanfare(); break;
      case 'sparkle':     this._sparkle(); break;
      case 'select':      this._select(); break;
      case 'reward':      this._reward(); break;
      case 'rps':         this._rps(); break;
      case 'crackle':     this._crackle(); break;
      default: this._click();
    }
  }

  _tryPlayMp3(key, volume = VOLUME) {
    if (!this.scene || !this.scene.cache || !this.scene.cache.audio) return false;
    if (!this.scene.cache.audio.has(key)) return false;
    try {
      this.scene.sound.play(key, { volume });
      return true;
    } catch (_) {
      return false;
    }
  }

  setMuted(m) { this.muted = m; }
  toggleMute() { this.muted = !this.muted; return this.muted; }

  // ====================================================================
  // BGM — 트랙 배열 롤링 재생
  // ====================================================================

  /**
   * BGM 시작
   * @param {string[]|string} tracks - mp3 키 배열 (롤링) 또는 단일 키
   *   예: ['bgm-lobby-1', 'bgm-lobby-2']  → 1번 끝나면 2번, 2번 끝나면 1번 반복
   *       'bgm-rps'                       → 단일 트랙 무한 루프
   * @param {object} opts
   * @param {number} opts.volume - 볼륨 (기본 0.18)
   * @param {boolean} opts.shuffle - 시작 시 랜덤 트랙부터 (기본 true)
   */
  playBGM(tracks, opts = {}) {
    if (this.bgmMuted) return;
    if (!this.scene || !this.scene.cache || !this.scene.cache.audio) return;

    const list = Array.isArray(tracks) ? tracks : [tracks];
    // 자산 있는 트랙만 필터
    const valid = list.filter(k => this.scene.cache.audio.has(k));
    if (valid.length === 0) return;

    // 같은 플레이리스트면 그대로 (중복 호출 방어)
    if (this._sameList(valid, this.bgmPlaylist) && this.bgmCurrent && this.bgmCurrent.isPlaying) return;

    this.stopBGM();

    this.bgmPlaylist  = valid;
    this.bgmCurrentIdx = (opts.shuffle === false ? 0 : Math.floor(Math.random() * valid.length));
    this.bgmVolume    = opts.volume ?? BGM_VOLUME;

    this._playCurrentTrack();
  }

  _sameList(a, b) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  _playCurrentTrack() {
    if (this.bgmMuted || this.bgmPlaylist.length === 0) return;
    const key = this.bgmPlaylist[this.bgmCurrentIdx];
    if (!key || !this.gameSound) return;

    try {
      // ⭐ 글로벌 사운드 매니저 사용 — 씬 전환에도 BGM 끊기지 않음
      const isSingle = this.bgmPlaylist.length === 1;
      this.bgmCurrent = this.gameSound.add(key, {
        volume: this.bgmVolume,
        loop: isSingle,
      });
      if (!isSingle) {
        this.bgmCurrent.once('complete', () => this._advanceTrack());
      }
      this.bgmCurrent.play();
    } catch (e) {
      this._advanceTrack();
    }
  }

  _advanceTrack() {
    this.bgmCurrentIdx = (this.bgmCurrentIdx + 1) % this.bgmPlaylist.length;
    this._playCurrentTrack();
  }

  /** BGM 정지 — 씬 전환 시 호출 */
  stopBGM() {
    if (this.bgmCurrent) {
      try {
        this.bgmCurrent.stop();
        this.bgmCurrent.destroy();
      } catch (_) {}
      this.bgmCurrent = null;
    }
    this.bgmPlaylist = [];
  }

  setBgmMuted(m) {
    this.bgmMuted = m;
    if (m) this.stopBGM();
  }
  toggleBgmMuted() {
    this.bgmMuted = !this.bgmMuted;
    if (this.bgmMuted) this.stopBGM();
    return this.bgmMuted;
  }

  // ====================================================================
  // Web Audio 합성 SFX (mp3 fallback용)
  // ====================================================================

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  _note({
    freq, freqEnd = freq, duration = 0.12, delay = 0,
    type = 'sine', volume = SYNTH_VOLUME, attack = 0.005, detune = 0,
  }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== freq) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration * 0.6);
    }
    osc.detune.value = detune;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  _click() {
    this._note({ freq: 600, freqEnd: 1000, duration: 0.05, type: 'square', volume: SYNTH_VOLUME * 0.6 });
    this._note({ freq: 1200, freqEnd: 1800, duration: 0.04, type: 'sine', volume: SYNTH_VOLUME * 0.4 });
  }

  _pop() {
    this._note({ freq: 900, freqEnd: 500, duration: 0.15, type: 'sine', volume: SYNTH_VOLUME });
    this._note({ freq: 1800, freqEnd: 1000, duration: 0.12, type: 'triangle', volume: SYNTH_VOLUME * 0.5 });
  }

  _match() {
    this._note({ freq: 523.25, duration: 0.12, delay: 0,    type: 'triangle', volume: SYNTH_VOLUME });
    this._note({ freq: 659.25, duration: 0.12, delay: 0.06, type: 'triangle', volume: SYNTH_VOLUME });
    this._note({ freq: 783.99, duration: 0.18, delay: 0.12, type: 'triangle', volume: SYNTH_VOLUME });
    this._note({ freq: 1568,   duration: 0.20, delay: 0.18, type: 'sine',     volume: SYNTH_VOLUME * 0.6 });
  }

  _star() {
    const notes = [659.25, 783.99, 987.77, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      this._note({ freq, duration: 0.10, delay: i * 0.05, type: 'triangle', volume: SYNTH_VOLUME });
      this._note({ freq: freq * 2, duration: 0.08, delay: i * 0.05, type: 'sine', volume: SYNTH_VOLUME * 0.4 });
    });
  }

  _catch() {
    this._note({ freq: 880, freqEnd: 1100, duration: 0.06, delay: 0,    type: 'square',   volume: SYNTH_VOLUME * 0.7 });
    this._note({ freq: 1320, duration: 0.12, delay: 0.07, type: 'triangle', volume: SYNTH_VOLUME * 0.7 });
  }

  _countdown() {
    this._note({ freq: 880, duration: 0.10, type: 'square',   volume: SYNTH_VOLUME * 0.5 });
    this._note({ freq: 880, duration: 0.12, type: 'triangle', volume: SYNTH_VOLUME * 0.4 });
  }

  _start() {
    this._note({ freq: 523, freqEnd: 783,  duration: 0.12, delay: 0,    type: 'square',   volume: SYNTH_VOLUME * 0.7 });
    this._note({ freq: 783, freqEnd: 1046, duration: 0.20, delay: 0.10, type: 'square',   volume: SYNTH_VOLUME * 0.7 });
    this._note({ freq: 1046, duration: 0.30, delay: 0.20, type: 'sine',     volume: SYNTH_VOLUME * 0.6 });
  }

  _fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this._note({ freq, duration: 0.18, delay: i * 0.08, type: 'triangle', volume: SYNTH_VOLUME });
    });
    this._note({ freq: 1046.5, duration: 0.40, delay: 0.32, type: 'triangle', volume: SYNTH_VOLUME * 1.1 });
  }

  _sparkle() {
    [1760, 2349, 2637, 3136].forEach((freq, i) => {
      this._note({ freq, duration: 0.04, delay: i * 0.03, type: 'sine', volume: SYNTH_VOLUME * 0.4 });
    });
  }

  _select() {
    this._note({ freq: 659, freqEnd: 880, duration: 0.08, type: 'triangle', volume: SYNTH_VOLUME * 0.7 });
    this._note({ freq: 1320, duration: 0.06, delay: 0.04, type: 'sine', volume: SYNTH_VOLUME * 0.4 });
  }

  /** 가위바위보! — 5음절 한국어 챈트 리듬 (가-위-바-위-보!) — 어린이 눈높이로 느리게 */
  _rps() {
    // 가, 위, 바, 위 = 짧고 가벼운 톤 / 보! = 길고 높게
    const step = 0.130;     // 0.085 → 0.130 (어린이 눈높이, 53% 느리게)
    this._note({ freq: 580,  duration: 0.10, delay: 0,                  type: 'triangle', volume: SYNTH_VOLUME * 0.75 });
    this._note({ freq: 620,  duration: 0.10, delay: step,               type: 'triangle', volume: SYNTH_VOLUME * 0.75 });
    this._note({ freq: 680,  duration: 0.10, delay: step * 2,           type: 'triangle', volume: SYNTH_VOLUME * 0.75 });
    this._note({ freq: 720,  duration: 0.10, delay: step * 3,           type: 'triangle', volume: SYNTH_VOLUME * 0.75 });
    // 보! — 길고 통통 튀는 마무리
    this._note({ freq: 880,  freqEnd: 1320, duration: 0.42, delay: step * 4 + 0.06, type: 'triangle', volume: SYNTH_VOLUME * 1.0 });
    this._note({ freq: 1760, duration: 0.22, delay: step * 4 + 0.07, type: 'sine', volume: SYNTH_VOLUME * 0.45 });
  }

  /** 지지직 — 봄버맨 캐릭터 사라질 때 같은 노이즈 크래클 (스컹크 패배 효과음) */
  _crackle() {
    if (!this._ensureCtx()) return;
    const ctx = this.ctx;
    const duration = 0.55;
    const sampleRate = ctx.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = ctx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    // 노이즈 + 빠른 진동 + 페이드 아웃 = 봄버맨 스타일 지지직
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const envelope = Math.pow(Math.max(0, 1 - t / duration), 1.2);
      // 600Hz + 1200Hz 진동 (지직거림 핵심 주파수)
      const burst1 = Math.sin(t * 600 * Math.PI * 2);
      const burst2 = Math.sin(t * 1200 * Math.PI * 2) * 0.5;
      // 노이즈 (흰소음)
      const noise = (Math.random() * 2 - 1);
      // 진폭 변조 (찌릿찌릿 단속 효과)
      const am = Math.sin(t * 25 * Math.PI * 2) > 0 ? 1 : 0.35;
      const sample = (noise * 0.55 + burst1 * 0.25 + burst2 * 0.2) * envelope * am;
      data[i] = sample * 0.4;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = SYNTH_VOLUME * 1.6;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  /** 보상 fallback — mp3 없을 때 합성 fanfare + sparkle */
  _reward() {
    // 도-미-솔-도 라이징
    this._note({ freq: 523, duration: 0.15, delay: 0,    type: 'square', volume: SYNTH_VOLUME * 0.8 });
    this._note({ freq: 783, duration: 0.15, delay: 0.10, type: 'square', volume: SYNTH_VOLUME * 0.8 });
    this._note({ freq: 1046, duration: 0.45, delay: 0.22, type: 'triangle', volume: SYNTH_VOLUME });
    this._note({ freq: 2093, duration: 0.40, delay: 0.24, type: 'sine', volume: SYNTH_VOLUME * 0.5 });
  }
}

export const soundManager = new SoundManager();
