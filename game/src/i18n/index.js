// 🌐 다국어 (i18n) — 한/일/영/번체중문
// 메모리 파일 project_rainbow_localization.md 참조
//
// 사용법:
//   import { t, setLocale, getLocale } from './i18n/index.js';
//   t('menu.memory')  → '메모리 게임' (현재 locale에 따라)
//   setLocale('ja')    → 일본어로 전환
//
// 초기 locale: 디바이스 언어 자동 감지 (수동 override 가능)

const SUPPORTED = ['ko', 'ja', 'en', 'zh-TW'];

function detectDeviceLocale() {
  try {
    // 1) 명시적 override (URL ?locale=ja, localStorage 등 — 추후 확장)
    const urlLocale = new URLSearchParams(window.location.search).get('locale');
    if (urlLocale && SUPPORTED.includes(urlLocale)) return urlLocale;

    const stored = localStorage.getItem('locale');
    if (stored && SUPPORTED.includes(stored)) return stored;

    // 2) navigator.language → 'ko-KR' / 'ja-JP' / 'en-US' / 'zh-TW' / 'zh-Hant-TW' 등
    const langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || 'ko'];

    for (const raw of langs) {
      const lang = raw.toLowerCase();
      if (lang.startsWith('ja')) return 'ja';
      if (lang.startsWith('en')) return 'en';
      if (lang.startsWith('zh-tw') || lang.startsWith('zh-hant')) return 'zh-TW';
      if (lang.startsWith('ko')) return 'ko';
    }
  } catch (e) { /* SSR / 비정상 환경 */ }
  return 'ko';     // 디폴트: 한국 (primary 시장)
}

// 현재 locale — 디바이스 언어로 자동 감지
let currentLocale = detectDeviceLocale();
console.log(`[i18n] Detected locale: ${currentLocale}`);

const STRINGS = {
  ko: {
    menu: {
      memory:  '메모리 게임',
      rps:     '가위바위보',
      catch:   '스타 캐치',
      dex:     '캐릭터 도감',
      story:   '스토리',
      sketch:  '스케치북',
    },
    quest: {
      title:        '오늘의 미션',
      done:         '완료!',
      'play-memory': '메모리 게임 한 판 해 보기',
      'play-rps':    '가위바위보 한 판 해 보기',
      'play-catch':  '스타 캐치 한 판 해 보기',
      'do-coloring': '도안 하나 색칠해 보기',
      'do-sketch':   '그림 한 장 그려 보기',
    },
  },
  ja: {
    menu: {
      memory:  'メモリーゲーム',
      rps:     'じゃんけん',
      catch:   'スターキャッチ',
      dex:     'キャラクター図鑑',
      story:   'ストーリー',
      sketch:  'スケッチブック',
    },
    quest: {
      title:        '今日のミッション',
      done:         'ミッション完了！',
      'play-memory': 'メモリーゲームを1回',
      'play-rps':    'じゃんけんを1回',
      'play-catch':  'スターキャッチを1回',
      'do-coloring': '塗り絵を1つ',
      'do-sketch':   'お絵かきを1枚',
    },
  },
  en: {
    menu: {
      memory:  'Memory Game',
      rps:     'Rock Paper Scissors',
      catch:   'Star Catch',
      dex:     'Character Dex',
      story:   'Story',
      sketch:  'Sketchbook',
    },
    quest: {
      title:        "Today's Mission",
      done:         'Mission Done!',
      'play-memory': 'Play Memory Game',
      'play-rps':    'Play Rock Paper Scissors',
      'play-catch':  'Play Star Catch',
      'do-coloring': 'Color one picture',
      'do-sketch':   'Draw one picture',
    },
  },
  'zh-TW': {
    menu: {
      memory:  '記憶遊戲',
      rps:     '剪刀石頭布',
      catch:   '抓星星',
      dex:     '角色圖鑑',
      story:   '故事',
      sketch:  '畫畫本',
    },
    quest: {
      title:        '今日任務',
      done:         '任務完成！',
      'play-memory': '玩一次記憶遊戲',
      'play-rps':    '玩一次剪刀石頭布',
      'play-catch':  '玩一次抓星星',
      'do-coloring': '塗一張畫',
      'do-sketch':   '畫一張畫',
    },
  },
};

export function setLocale(locale) {
  if (!STRINGS[locale]) {
    console.warn(`[i18n] Unknown locale: ${locale}, falling back to ko`);
    currentLocale = 'ko';
    return;
  }
  currentLocale = locale;
}

export function getLocale() {
  return currentLocale;
}

// ===== 로비 토슴이 대사 — 4언어 번역 (34개) =====
//   카테고리: 인사(7) + 게임 제안(11) + 감정·공감(4) + 격려(3) + 귀여움·일상(9)
//   ⚠ 카피 톤: 어린이 친화, 따뜻한 친구 톤, 어미 다양화, 네거티브 워딩 X
//   디바이스 언어 감지 → 해당 locale 대사 자동 사용
//   MD 메모리: project_rainbow_lobby_lines_i18n.md
const LOBBY_LINES_BY_LOCALE = {
  ko: [
    // 인사 (7)
    '또 만났네! 🌈',
    '오늘도 반가워~ ✨',
    '기다리고 있었어 🐰',
    '보고 싶었어~ 토슴',
    '안녕~ 잘 지냈어?',
    '왔구나! 💗',
    '당근은 눈에 좋대~',
    // 게임 제안 (7) — 미니게임 대사 4개 삭제 (분리 원칙)
    '오늘은 뭘 그릴까?',
    '같이 그림 그릴까?',
    '어떤 색이 좋아?',
    '무지개 만들러 갈까?',
    '스케치북 펴볼까~',
    '크레파스는 어딨을까?',
    '레인보우 스케치북!',
    // 감정/공감 (4)
    '사랑해~ 💗',
    '만나서 반가워!',
    '좋아하는 색 있어?',
    '어디부터 시작해 볼까?',
    // 격려 (3)
    '천천히 해도 괜찮아 🌟',
    '너는 정말 멋져!',
    '예쁜 그림 기대 중~',
    // 귀여움/감탄/일상 (9)
    '토슴~ 토슴~ 🎶',
    '깡총깡총~ 🐰',
    '별이 반짝거려 ✨',
    '하트 가득~ 💗',
    '꿈에서도 만났는데!',
    '오늘도 반짝반짝~',
    '냠냠! 꼭꼭!',
    '반짝거리는 하루야',
    '뾰로롱~',
  ],
  ja: [
    // 인사
    'また会えたね！ 🌈',
    '今日もよろしく〜 ✨',
    '待ってたよ 🐰',
    '会いたかったよ〜',
    'こんにちは〜元気だった？',
    '来てくれたんだ！ 💗',
    '人参は目にいいんだって〜',
    // 게임 제안 (7) — 미니게임 대사 4개 삭제 (분리 원칙)
    '今日は何を描こうかな？',
    '一緒に絵を描く？',
    '何色が好き？',
    '虹を作りに行こう？',
    'スケッチブック開こう〜',
    'クレヨンはどこかな？',
    'レインボースケッチブック！',
    // 감정/공감
    'だいすき〜 💗',
    '会えてうれしい！',
    '好きな色ある？',
    'どこから始めようか？',
    // 격려
    'ゆっくりでいいよ 🌟',
    'きみって本当にすごい！',
    '素敵な絵、楽しみ〜',
    // 귀여움/감탄/일상
    'トスム〜トスム〜 🎶',
    'ぴょんぴょん〜 🐰',
    '星がきらきら ✨',
    'ハートいっぱい〜 💗',
    '夢でも会ったよ！',
    '今日もきらきら〜',
    'むしゃむしゃ！',
    'きらめく一日だね',
    'ぴゅるるん〜',
  ],
  en: [
    // Greetings
    'We meet again! 🌈',
    'Nice to see you! ✨',
    'I was waiting for you! 🐰',
    'I missed you~',
    'Hi! How are you?',
    "You're here! 💗",
    'Carrots are good for your eyes~',
    // Game suggestions (7) — 미니게임 대사 4개 삭제 (분리 원칙)
    'What shall we draw today?',
    "Let's draw together!",
    "What's your favorite color?",
    "Let's make a rainbow!",
    "Let's open the sketchbook~",
    'Where are the crayons?',
    'Rainbow Sketchbook!',
    // Feelings
    'I love you~ 💗',
    'Nice to meet you!',
    'Got a favorite color?',
    'Where shall we start?',
    // Encouragement
    'Take your time 🌟',
    "You're amazing!",
    "Can't wait to see your art~",
    // Cute/everyday
    'Tosmie~ Tosmie~ 🎶',
    'Hop hop~ 🐰',
    'The stars are sparkling ✨',
    'Full of hearts~ 💗',
    'I saw you in my dream!',
    'Sparkle sparkle today~',
    'Nom nom!',
    'What a sparkly day!',
    'Twinkle~',
  ],
  'zh-TW': [
    // 인사
    '又見面啦！ 🌈',
    '今天也很開心~ ✨',
    '我在等你呢 🐰',
    '好想你喔~',
    '你好~過得好嗎？',
    '你來啦！ 💗',
    '紅蘿蔔對眼睛很好喔~',
    // 게임 제안 (7) — 미니게임 대사 4개 삭제 (분리 원칙)
    '今天要畫什麼呢？',
    '一起畫畫吧？',
    '你喜歡什麼顏色？',
    '一起去畫彩虹？',
    '翻開塗鴉本吧~',
    '蠟筆在哪呢？',
    '彩虹畫畫本！',
    // 감정/공감
    '我愛你~ 💗',
    '很高興見到你！',
    '你有喜歡的顏色嗎？',
    '從哪裡開始呢？',
    // 격려
    '慢慢來沒關係 🌟',
    '你超棒的！',
    '期待你的畫畫~',
    // 귀여움/일상
    '兔兔~兔兔~ 🎶',
    '蹦蹦跳跳~ 🐰',
    '星星閃閃發亮 ✨',
    '滿滿的愛心~ 💗',
    '在夢裡也見過你呢！',
    '今天也閃閃發亮~',
    '嘎嗞嘎嗞！',
    '閃亮亮的一天',
    '嗶嚕嚕~',
  ],
};

/**
 * 현재 디바이스 언어의 로비 대사 배열 반환
 * 사용: import { getLobbyLines } from '../i18n/index.js';
 *      this.lobbyLines = getLobbyLines();
 */
export function getLobbyLines() {
  return LOBBY_LINES_BY_LOCALE[currentLocale] || LOBBY_LINES_BY_LOCALE.ko;
}

/**
 * 키로 텍스트 조회. dot-notation 지원: 'menu.memory'
 * locale에 없으면 ko로 폴백, 그래도 없으면 key 자체 반환
 */
export function t(key) {
  const path = key.split('.');
  // 현재 locale에서 찾기
  let val = STRINGS[currentLocale];
  for (const p of path) {
    if (!val || typeof val !== 'object') break;
    val = val[p];
  }
  if (typeof val === 'string') return val;

  // ko 폴백
  let fallback = STRINGS.ko;
  for (const p of path) {
    if (!fallback || typeof fallback !== 'object') break;
    fallback = fallback[p];
  }
  if (typeof fallback === 'string') return fallback;

  return key;     // 못 찾으면 key 그대로
}
