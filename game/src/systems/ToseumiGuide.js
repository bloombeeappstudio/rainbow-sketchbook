// 🐰 ToseumiGuide — 상황별 멘트 풀 + 표정 변화

// 토슴이는 어린이 친구 — 반말 + 따뜻한 톤 (~자, ~래?, ~봐, ~야)
const GREETINGS = {
  // 메인 화면
  main_first:    ['또 만났네! 🌈', '토슴이가 기다렸어!', '오늘도 반가워~ ✨'],
  main_returning:['오늘은 무지개 그릴까?', '어떤 색을 모을까?', '뭐 하고 놀까? 🐰'],
  main_longtime: ['오랜만이야! 보고 싶었어', '기다렸어 🥺', '돌아와줘서 고마워 💗'],

  // 게임 시작
  before_card:   ['카드 뒤집어볼까?', '같은 그림 찾기 시작!', '집중! 🃏'],
  before_rps:    ['이길 수 있을까?', '두근두근 한 판!', '이번엔 자신 있어!'],
  before_catch:  ['별빛이 떨어진다! ⭐', '바구니 준비됐어!', '다 받아볼까?'],

  // 게임 진행
  card_matched:  ['야호!', '찾았다!', '와! 같은 그림이야'],
  card_wrong:    ['다시 한번 더!', '다시 해볼까?', '천천히 찾아보자'],
  rps_thinking:  ['음...', '뭐 낼까?', '두근두근 🥁'],
  rps_three_win: ['3연승이야!! 🎉', '와아! 무지개가 펑!', '짱이야!'],
  catch_caught:  ['톡!', '받았다!', '잡았어 ⭐'],

  // 보상 등장
  reward_common:    ['와! 새 색이다!', '예쁜 색 찾았어!', '오늘의 첫 색깔!'],
  reward_uncommon:  ['우와! 스티커도!', '보너스 반짝!', '이거 마음에 들어'],
  reward_rare:      ['꺄! 보석이야! ✨', '정말 특별한 색!', '두근두근 보석!'],
  reward_legendary: ['최고! 럭키박스!', '오늘 운이 좋아 🎁', '와아아!! 럭키!'],

  // 그림판
  drawing_start:    ['그림 그리자 🎨', '오늘은 뭘 그릴까?', '어떤 색부터?'],
  drawing_done:     ['와! 우리 별이 또 예뻐졌어!', '정말 멋진 그림!', '최고야! 💗'],
  drawing_to_planet:['행성으로 가자~ ✨', '우리 별에 걸어볼까?'],

  // 격려 (실패 톤 X)
  encourage:    ['괜찮아, 다시 해볼래?', '천천히 해도 돼', '한 번 더 해볼까? 🐰'],
  cheer:        ['할 수 있어!', '화이팅! 💪', '응원할게! ✨'],

  // 컬렉션
  color_first:  ['첫 색깔이야! 🎉', '이제 시작이야!'],
  group_done:   ['이 색 그룹 다 모았어!', '무지개 한 줄 완성!'],
  dex_complete: ['64색 다 모았어!! 🌈🌈🌈', '진짜 진짜 대단해!'],
};

// 표정 매핑 (상황 → 토슴이 이미지 키)
// 신규 자산 우선 + 기존 자산 fallback
const EXPRESSIONS = {
  // ===== 사용자 신규 자산 (메인) =====
  happy:        'toseumi-happy',        // 기본/메인/그림 완성
  greet:        'toseumi-greet',        // 인사/반가움
  fun:          'toseumi-fun',          // 재밌는 (게임 진행)
  sad:          'toseumi-sad',          // 슬픔/격려 (toseumi-sad2 → 'toseumi-sad' 키로 로드됨)
  basket:       'toseumi-basket',       // 스타 캐치용
  magic:        'toseumi-magic2',       // 마법/3연승/보상

  // ===== 기존 자산 (fallback / 추가) =====
  wave:         'toseumi-wave',
  hero:         'toseumi-hero',
  cape:         'toseumi-cape',
  crayon:       'toseumi-crayon',
  brush:        'toseumi-brush',
  default:      'toseumi-default',

  // ===== 별칭 (이전 코드 호환) =====
  surprised:    'toseumi-fun',          // 신남
  celebrating:  'toseumi-happy',        // 축하
  cheer:        'toseumi-greet',        // 응원
};

class ToseumiGuideClass {
  /**
   * 상황별 멘트 1개 랜덤 반환
   */
  getMessage(situation) {
    const pool = GREETINGS[situation];
    if (!pool || pool.length === 0) return '토슴이가 응원해 🐰';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * 상황에 어울리는 표정/포즈 이미지 키 반환 (텍스처 존재 여부 체크)
   * @param {Phaser.Scene} scene
   * @param {string} expressionKey
   * @returns {string} 사용 가능한 텍스처 key (fallback: toseumi-default)
   */
  getExpression(scene, expressionKey) {
    const target = EXPRESSIONS[expressionKey];
    if (target && scene.textures.exists(target)) return target;
    return 'toseumi-default';
  }

  /**
   * 보상 등급별 멘트 자동 매핑
   */
  messageForReward(tier) {
    return this.getMessage(`reward_${tier}`);
  }
}

export const ToseumiGuide = new ToseumiGuideClass();
