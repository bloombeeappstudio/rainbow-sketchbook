// 💾 SaveSystem — localStorage 자동 저장/로드 시스템

const STORAGE_KEY = 'rainbow-sketchbook-save';
const VERSION = '1.0';

// 기본 저장 데이터 구조
function getDefaultSave() {
  return {
    version: VERSION,
    firstPlay: true,            // 첫 진입 (그림책 보여줄지 여부)
    seenStory: false,           // 그림책 봤는지
    totalPlayTime: 0,
    lastPlayDate: null,

    collection: {
      colors: [],               // 획득한 색 ID 배열
      stickers: [],             // 스티커 ID 배열
      gems: [],                 // 보석 (모양/색 객체)
      luckyBoxes: 0,
    },

    drawings: [],               // 그린 작품 (Base64 PNG, 최대 50개)

    planet: {
      theme: 'default',
      arrangement: [],
    },

    stats: {
      cardMatchPlays: 0,
      rpsPlays: 0,
      rps3WinStreaks: 0,
      catchPlays: 0,
      catchHighScore: 0,
      drawingsCompleted: 0,
      coloringsCompleted: 0,
    },

    daily: {
      lastBonusDate: null,
      streak: 0,
      // 일일 퀘스트 (자동 발행/완료) — 어린이가 앱 들어왔을 때 뭐 할지 가이드
      questDate: null,       // 'YYYY-MM-DD' — 발행일
      questId: null,         // 'play-memory' | 'play-rps' | 'play-catch' | 'do-coloring' | 'do-sketch'
      questScene: null,      // Phaser scene key (클릭 시 이동)
      questDone: false,      // 완료 여부
    },

    settings: {
      bgmVolume: 0.5,
      sfxVolume: 0.7,
      parentPin: null,
    },

    iap: {
      premiumTemplates: false,        // 신: Google Play 상품 ID (premium_templates) 매핑
      starlightArtistPack: false,     // 구 호환 (v0.3 이전 저장 데이터)
    },
  };
}

class SaveSystemClass {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultSave();
      const data = JSON.parse(raw);
      // 버전 체크 (마이그레이션 필요 시 처리)
      if (data.version !== VERSION) {
        console.warn('[SaveSystem] 버전 불일치, 기본값으로 초기화');
        return getDefaultSave();
      }
      return data;
    } catch (e) {
      console.error('[SaveSystem] 로드 실패, 기본값 사용', e);
      return getDefaultSave();
    }
  }

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[SaveSystem] 저장 실패', e);
    }
  }

  // 헬퍼 메서드들 (자동 저장)

  isFirstPlay() {
    return this.load().firstPlay;
  }

  hasSeenStory() {
    return this.load().seenStory;
  }

  markStorySeen() {
    const data = this.load();
    data.seenStory = true;
    data.firstPlay = false;
    data.lastPlayDate = new Date().toISOString().split('T')[0];
    this.save(data);
  }

  addColor(colorId) {
    const data = this.load();
    if (!data.collection.colors.includes(colorId)) {
      data.collection.colors.push(colorId);
      this.save(data);
      return true; // 새로 획득
    }
    return false; // 이미 있음
  }

  addSticker(stickerId) {
    const data = this.load();
    if (!data.collection.stickers.includes(stickerId)) {
      data.collection.stickers.push(stickerId);
      this.save(data);
      return true;
    }
    return false;
  }

  addGem(gem) {
    const data = this.load();
    data.collection.gems.push(gem);
    this.save(data);
  }

  addLuckyBox() {
    const data = this.load();
    data.collection.luckyBoxes += 1;
    this.save(data);
  }

  // 작품 저장 — type: 'sketch' (그림그리기) | 'coloring' (색칠놀이)
  addArtwork(type, dataUrl, meta = {}) {
    const data = this.load();
    data.drawings.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      date: new Date().toISOString(),
      type,
      dataUrl,
      frame: 'classic',
      ...meta,         // templateId 등 부가 정보
    });
    if (data.drawings.length > 50) data.drawings.shift();
    if (type === 'sketch')   data.stats.drawingsCompleted   = (data.stats.drawingsCompleted   || 0) + 1;
    if (type === 'coloring') data.stats.coloringsCompleted = (data.stats.coloringsCompleted || 0) + 1;
    this.save(data);

    // 일일 퀘스트 자동 완료 매핑 — 작품 저장 = 그림/색칠 완료
    if (type === 'sketch')   this.completeDailyQuestIfMatch('do-sketch');
    if (type === 'coloring') this.completeDailyQuestIfMatch('do-coloring');
  }

  // 호환용 — 기존 호출부 보호 (그림그리기만 저장)
  addDrawing(dataUrl) {
    this.addArtwork('sketch', dataUrl);
  }

  // 갤러리 — 최신 순으로 반환
  getArtworks() {
    const list = this.load().drawings || [];
    return [...list].reverse();
  }

  // 작품 삭제 — id로 매칭
  removeArtwork(id) {
    const data = this.load();
    const before = data.drawings.length;
    data.drawings = data.drawings.filter(d => d.id !== id);
    const removed = before - data.drawings.length;
    if (removed > 0) this.save(data);
    return removed > 0;
  }

  // 작품 업데이트 — 갤러리에서 "이어 그리기/색칠하기" 후 동일 id 작품 dataUrl 갱신
  //   id 일치 작품 없으면 false 반환
  updateArtwork(id, newDataUrl, meta = {}) {
    const data = this.load();
    const idx = data.drawings.findIndex(d => d.id === id);
    if (idx < 0) return false;
    data.drawings[idx] = {
      ...data.drawings[idx],
      ...meta,
      dataUrl: newDataUrl,
      date: new Date().toISOString(),    // 최근 수정 시간 갱신
    };
    this.save(data);
    return true;
  }

  // 일일 보너스 체크
  canClaimDailyBonus() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    return data.daily.lastBonusDate !== today;
  }

  claimDailyBonus() {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (data.daily.lastBonusDate === yesterday) {
      data.daily.streak += 1;
    } else if (data.daily.lastBonusDate !== today) {
      data.daily.streak = 1;
    }
    data.daily.lastBonusDate = today;
    this.save(data);
    return data.daily.streak;
  }

  // ===== 일일 퀘스트 =====
  //   사용자 피드백: 어린이가 앱 들어왔을 때 뭐 할지 모르겠다는 부모 의견
  //   → 매일 1개 미션 자동 발행, 우상단 바에 표시, 완료 시 체크
  //
  //   미션 5종 중 랜덤:
  //   - play-memory  : 메모리 게임 한 판
  //   - play-rps     : 가위바위보 한 판
  //   - play-catch   : 스타 캐치 한 판
  //   - do-coloring  : 도안 하나 색칠
  //   - do-sketch    : 그림 한 장 그리기
  getDailyQuest() {
    const QUESTS = [
      { id: 'play-memory', sceneKey: 'CardMatchScene' },
      { id: 'play-rps',    sceneKey: 'RPSScene' },
      { id: 'play-catch',  sceneKey: 'CatchScene' },
      { id: 'do-coloring', sceneKey: 'TemplateSelectScene' },
      { id: 'do-sketch',   sceneKey: 'SketchScene' },
    ];
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    // 오늘 퀘스트 없거나 어제(이전) 퀘스트면 새로 발행
    if (!data.daily.questDate || data.daily.questDate !== today) {
      const picked = QUESTS[Math.floor(Math.random() * QUESTS.length)];
      data.daily.questDate = today;
      data.daily.questId = picked.id;
      data.daily.questScene = picked.sceneKey;
      data.daily.questDone = false;
      this.save(data);
    }
    return {
      id: data.daily.questId,
      sceneKey: data.daily.questScene,
      done: !!data.daily.questDone,
    };
  }

  // 미니게임/색칠/그리기 완료 시 호출 — 오늘 퀘스트 id와 일치하면 done 처리
  //   반환: 새로 완료된 경우 true (셀러브레이션 트리거용)
  completeDailyQuestIfMatch(questId) {
    const data = this.load();
    const today = new Date().toISOString().split('T')[0];
    if (data.daily.questDate === today
        && data.daily.questId === questId
        && !data.daily.questDone) {
      data.daily.questDone = true;
      this.save(data);
      return true;
    }
    return false;
  }

  // 통계 업데이트
  //   미니게임 플레이 카운트 증가 시 일일 퀘스트도 자동 매핑
  incStat(key, amount = 1) {
    const data = this.load();
    if (data.stats[key] !== undefined) {
      data.stats[key] += amount;
      this.save(data);
    }
    // 일일 퀘스트 자동 완료 매핑 — 게임 종료 시 incStat 호출 = 미션 완료 신호
    const QUEST_MAP = {
      cardMatchPlays: 'play-memory',
      rpsPlays:       'play-rps',
      catchPlays:     'play-catch',
    };
    if (QUEST_MAP[key]) this.completeDailyQuestIfMatch(QUEST_MAP[key]);
  }

  // 디버그용 — 모든 데이터 초기화
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[SaveSystem] 데이터 초기화 완료');
  }
}

export const SaveSystem = new SaveSystemClass();
