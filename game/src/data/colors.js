// 🌈 100가지 컬러 — 사용자 정의 팔레트 (영구 보관)
// type: 'normal' (1-69) | 'sparkle' (70-99, 펄/반짝이) | 'special' (100, 무지개 브러시)
// group: yellow | orange | pink | red | purple | blue | mint | green | brown | neutral | sparkle | special

export const COLOR_GROUPS = {
  yellow:  { name: '노랑',   emoji: '💛', total: 5 },
  orange:  { name: '주황',   emoji: '🧡', total: 4 },
  pink:    { name: '핑크',   emoji: '💗', total: 7 },
  red:     { name: '빨강',   emoji: '❤️', total: 4 },
  purple:  { name: '보라',   emoji: '💜', total: 5 },
  blue:    { name: '파랑',   emoji: '💙', total: 5 },
  mint:    { name: '민트',   emoji: '🌿', total: 2 },
  green:   { name: '초록',   emoji: '💚', total: 8 },
  brown:   { name: '갈색',   emoji: '🟫', total: 5 },
  neutral: { name: '뉴트럴', emoji: '🤍', total: 8 },
  bonus:   { name: '보너스', emoji: '✨', total: 16 },
  sparkle: { name: '반짝',   emoji: '🌟', total: 30 },
  special: { name: '특수',   emoji: '🌈', total: 1 },
};

export const COLORS = [
  // ===== 노랑 (5) =====
  { id: 1,  name: '레몬 노랑',     hex: '#FFF38A', group: 'yellow', type: 'normal', feel: '밝고 산뜻한 노랑' },
  { id: 2,  name: '바나나 크림',   hex: '#FFE6A7', group: 'yellow', type: 'normal', feel: '부드러운 노랑' },
  { id: 3,  name: '병아리 노랑',   hex: '#FFD86B', group: 'yellow', type: 'normal', feel: '귀여운 기본 노랑' },
  { id: 4,  name: '해님 노랑',     hex: '#FFC94A', group: 'yellow', type: 'normal', feel: '따뜻한 노랑' },
  { id: 5,  name: '꿀단지 노랑',   hex: '#F6B84A', group: 'yellow', type: 'normal', feel: '진한 꿀빛' },
  // ===== 주황 (4) =====
  { id: 6,  name: '살구 오렌지',   hex: '#FFB16D', group: 'orange', type: 'normal', feel: '부드러운 주황' },
  { id: 7,  name: '귤송이 주황',   hex: '#FF9A4D', group: 'orange', type: 'normal', feel: '상큼한 주황' },
  { id: 8,  name: '당근 주황',     hex: '#FF7A3D', group: 'orange', type: 'normal', feel: '또렷한 주황' },
  { id: 9,  name: '노을 주황',     hex: '#FF8B6B', group: 'orange', type: 'normal', feel: '따뜻한 노을빛' },
  // ===== 핑크 (7) =====
  { id: 10, name: '복숭아 핑크',   hex: '#FFC2B8', group: 'pink',   type: 'normal', feel: '살짝 붉은 핑크' },
  { id: 11, name: '딸기 우유',     hex: '#FFB6C9', group: 'pink',   type: 'normal', feel: '부드러운 핑크' },
  { id: 12, name: '솜사탕 핑크',   hex: '#FFD1DC', group: 'pink',   type: 'normal', feel: '토슴이 메인톤' },
  { id: 13, name: '벚꽃 핑크',     hex: '#FFC9E2', group: 'pink',   type: 'normal', feel: '여린 꽃잎 핑크' },
  { id: 14, name: '튤립 핑크',     hex: '#FF8FB8', group: 'pink',   type: 'normal', feel: '선명한 핑크' },
  { id: 15, name: '장미 핑크',     hex: '#F56B9A', group: 'pink',   type: 'normal', feel: '사랑스러운 핑크' },
  { id: 16, name: '라즈베리 핑크', hex: '#E75480', group: 'pink',   type: 'normal', feel: '진한 과일 핑크' },
  // ===== 빨강 (4) =====
  { id: 17, name: '체리 레드',     hex: '#E84A5F', group: 'red',    type: 'normal', feel: '선명한 빨강' },
  { id: 18, name: '사과 레드',     hex: '#FF5A5F', group: 'red',    type: 'normal', feel: '밝은 빨강' },
  { id: 19, name: '토마토 레드',   hex: '#F76C5E', group: 'red',    type: 'normal', feel: '따뜻한 빨강' },
  { id: 20, name: '수박 레드',     hex: '#FF6F7D', group: 'red',    type: 'normal', feel: '과즙 느낌 빨강' },
  // ===== 보라 (5) =====
  { id: 21, name: '라벤더 보라',   hex: '#C9B6FF', group: 'purple', type: 'normal', feel: '부드러운 보라' },
  { id: 22, name: '포도 보라',     hex: '#9B7CFF', group: 'purple', type: 'normal', feel: '달콤한 보라' },
  { id: 23, name: '블루베리 보라', hex: '#7F6AD8', group: 'purple', type: 'normal', feel: '차분한 보라' },
  { id: 24, name: '자수정 보라',   hex: '#8E63D9', group: 'purple', type: 'normal', feel: '보석 느낌 보라' },
  { id: 25, name: '밤하늘 보라',   hex: '#4B3B78', group: 'purple', type: 'normal', feel: '깊은 밤하늘' },
  // ===== 파랑 (5) =====
  { id: 26, name: '구름 하늘',     hex: '#AEE7FF', group: 'blue',   type: 'normal', feel: '맑은 하늘색' },
  { id: 27, name: '사이다 블루',   hex: '#82D8FF', group: 'blue',   type: 'normal', feel: '시원한 하늘색' },
  { id: 28, name: '바다 블루',     hex: '#4AAFE8', group: 'blue',   type: 'normal', feel: '선명한 파랑' },
  { id: 29, name: '파도 블루',     hex: '#2F86D9', group: 'blue',   type: 'normal', feel: '깊은 파랑' },
  { id: 30, name: '은하 네이비',   hex: '#2C3E73', group: 'blue',   type: 'normal', feel: '우주 배경용' },
  // ===== 민트 (2) =====
  { id: 31, name: '아침 민트',     hex: '#A8F0D0', group: 'mint',   type: 'normal', feel: '맑은 민트' },
  { id: 32, name: '멜론 민트',     hex: '#8BE6C7', group: 'mint',   type: 'normal', feel: '달콤한 민트' },
  // ===== 초록 (8) =====
  { id: 33, name: '새싹 연두',     hex: '#B8E986', group: 'green',  type: 'normal', feel: '어린 잎 색' },
  { id: 34, name: '잔디 초록',     hex: '#6FD36F', group: 'green',  type: 'normal', feel: '밝은 초록' },
  { id: 35, name: '숲속 초록',     hex: '#3FA66B', group: 'green',  type: 'normal', feel: '예쁜 숲 색' },
  { id: 36, name: '올리브 잎',     hex: '#8DAE5A', group: 'green',  type: 'normal', feel: '자연스러운 초록' },
  { id: 37, name: '피스타치오',    hex: '#C7E8A3', group: 'green',  type: 'normal', feel: '부드러운 연두' },
  { id: 38, name: '말차 그린',     hex: '#78B66B', group: 'green',  type: 'normal', feel: '차분한 초록' },
  { id: 39, name: '에메랄드 호수', hex: '#3CC6A4', group: 'green',  type: 'normal', feel: '청록빛 초록' },
  { id: 40, name: '청록 바람',     hex: '#4FC3C7', group: 'green',  type: 'normal', feel: '맑은 청록' },
  // ===== 갈색 (5) =====
  { id: 41, name: '코코아 브라운', hex: '#9B6A4A', group: 'brown',  type: 'normal', feel: '따뜻한 갈색' },
  { id: 42, name: '쿠키 브라운',   hex: '#C78B61', group: 'brown',  type: 'normal', feel: '과자 느낌 갈색' },
  { id: 43, name: '도토리 갈색',   hex: '#8B5E3C', group: 'brown',  type: 'normal', feel: '자연 갈색' },
  { id: 44, name: '밤송이 브라운', hex: '#6B442E', group: 'brown',  type: 'normal', feel: '진한 갈색' },
  { id: 45, name: '카라멜',        hex: '#D99A5B', group: 'brown',  type: 'normal', feel: '달콤한 브라운' },
  // ===== 뉴트럴 (8) =====
  { id: 46, name: '크림 베이지',   hex: '#F4DFC1', group: 'neutral', type: 'normal', feel: '배경·피부톤 보조' },
  { id: 47, name: '바닐라 크림',   hex: '#FFF1C7', group: 'neutral', type: 'normal', feel: '따뜻한 크림색' },
  { id: 48, name: '우유 화이트',   hex: '#FFF9F0', group: 'neutral', type: 'normal', feel: '따뜻한 흰색' },
  { id: 49, name: '마시멜로 화이트', hex: '#F8F6FF', group: 'neutral', type: 'normal', feel: '차가운 흰색' },
  { id: 50, name: '구름 회색',     hex: '#E2E5EC', group: 'neutral', type: 'normal', feel: '연한 회색' },
  { id: 51, name: '비둘기 그레이', hex: '#C9CDD6', group: 'neutral', type: 'normal', feel: '중간 회색' },
  { id: 52, name: '몽돌 그레이',   hex: '#9EA6B3', group: 'neutral', type: 'normal', feel: '차분한 회색' },
  { id: 53, name: '잉크 블랙',     hex: '#1F2430', group: 'neutral', type: 'normal', feel: '부드러운 검정' },
  // ===== 보너스 (16) — 추가 고급 톤 =====
  { id: 54, name: '코랄 핑크',     hex: '#FF9E9E', group: 'bonus',  type: 'normal', feel: '산뜻한 코랄' },
  { id: 55, name: '자몽 핑크',     hex: '#FFB0A6', group: 'bonus',  type: 'normal', feel: '과일빛 핑크' },
  { id: 56, name: '라일락 퍼플',   hex: '#D8B4FF', group: 'bonus',  type: 'normal', feel: '꽃잎 보라' },
  { id: 57, name: '라벤더 안개',   hex: '#E6D6FF', group: 'bonus',  type: 'normal', feel: '아주 연한 보라' },
  { id: 58, name: '아쿠아 물방울', hex: '#92F1E8', group: 'bonus',  type: 'normal', feel: '맑은 물빛' },
  { id: 59, name: '북극 하늘',     hex: '#C7F2FF', group: 'bonus',  type: 'normal', feel: '차가운 하늘색' },
  { id: 60, name: '달빛 옐로우',   hex: '#FFF0A6', group: 'bonus',  type: 'normal', feel: '은은한 노랑' },
  { id: 61, name: '크랜베리',      hex: '#B84868', group: 'bonus',  type: 'normal', feel: '깊은 핑크레드' },
  { id: 62, name: '플럼 와인',     hex: '#7B4B7A', group: 'bonus',  type: 'normal', feel: '차분한 자주' },
  { id: 63, name: '모카 우유',     hex: '#B98C72', group: 'bonus',  type: 'normal', feel: '부드러운 브라운' },
  { id: 64, name: '밀크티',        hex: '#D8B08C', group: 'bonus',  type: 'normal', feel: '따뜻한 베이지' },
  { id: 65, name: '민들레 노랑',   hex: '#FFE066', group: 'bonus',  type: 'normal', feel: '밝은 꽃 노랑' },
  { id: 66, name: '페어리 핑크',   hex: '#F7A8D8', group: 'bonus',  type: 'normal', feel: '요정 느낌 핑크' },
  { id: 67, name: '아이스 블루',   hex: '#D6F4FF', group: 'bonus',  type: 'normal', feel: '얼음빛 하늘' },
  { id: 68, name: '요정 민트',     hex: '#B5F2E3', group: 'bonus',  type: 'normal', feel: '마법 민트' },
  { id: 69, name: '별밤 인디고',   hex: '#3B4A8A', group: 'bonus',  type: 'normal', feel: '밤하늘 포인트' },

  // ===== 반짝 (30) — 펄/글리터 효과 =====
  { id: 70, name: '반짝 레모',     hex: '#FFF06A', group: 'sparkle', type: 'sparkle', feel: '노란 별가루' },
  { id: 71, name: '반짝 해님 골드', hex: '#FFD24D', group: 'sparkle', type: 'sparkle', feel: '금빛 펄' },
  { id: 72, name: '반짝 별빛 실버', hex: '#DDE3F0', group: 'sparkle', type: 'sparkle', feel: '은색 펄' },
  { id: 73, name: '반짝 로즈 핑크', hex: '#FF8FC6', group: 'sparkle', type: 'sparkle', feel: '핑크 펄' },
  { id: 74, name: '반짝 솜사탕',   hex: '#FFC8E8', group: 'sparkle', type: 'sparkle', feel: '여린 분홍 글리터' },
  { id: 75, name: '반짝 체리',     hex: '#E94D67', group: 'sparkle', type: 'sparkle', feel: '붉은 펄' },
  { id: 76, name: '반짝 코랄',     hex: '#FF9C8E', group: 'sparkle', type: 'sparkle', feel: '코랄빛 반짝임' },
  { id: 77, name: '반짝 오렌지',   hex: '#FF9B4A', group: 'sparkle', type: 'sparkle', feel: '주황 별가루' },
  { id: 78, name: '반짝 라벤더',   hex: '#C8A8FF', group: 'sparkle', type: 'sparkle', feel: '보라 펄' },
  { id: 79, name: '반짝 포도',     hex: '#8F6DFF', group: 'sparkle', type: 'sparkle', feel: '진보라 글리터' },
  { id: 80, name: '반짝 자수정',   hex: '#7D5BD6', group: 'sparkle', type: 'sparkle', feel: '보석 반짝임' },
  { id: 81, name: '반짝 하늘',     hex: '#8CDCFF', group: 'sparkle', type: 'sparkle', feel: '하늘빛 펄' },
  { id: 82, name: '반짝 바다',     hex: '#4DB8FF', group: 'sparkle', type: 'sparkle', feel: '푸른 반짝임' },
  { id: 83, name: '반짝 네이비',   hex: '#334A86', group: 'sparkle', type: 'sparkle', feel: '밤하늘 별가루' },
  { id: 84, name: '반짝 민트',     hex: '#8EF0D5', group: 'sparkle', type: 'sparkle', feel: '민트 펄' },
  { id: 85, name: '반짝 에메랄드', hex: '#38CFA5', group: 'sparkle', type: 'sparkle', feel: '보석 초록' },
  { id: 86, name: '반짝 숲속',     hex: '#48B478', group: 'sparkle', type: 'sparkle', feel: '숲의 반딧불 느낌' },
  { id: 87, name: '반짝 피스타치오', hex: '#C8E878', group: 'sparkle', type: 'sparkle', feel: '연두 펄' },
  { id: 88, name: '반짝 화이트 펄', hex: '#FFFDF7', group: 'sparkle', type: 'sparkle', feel: '진주빛' },
  { id: 89, name: '반짝 복숭아 펄', hex: '#FFC6B5', group: 'sparkle', type: 'sparkle', feel: '복숭아 펄' },
  { id: 90, name: '반짝 샴페인',   hex: '#F8DDA0', group: 'sparkle', type: 'sparkle', feel: '고급 금빛' },
  { id: 91, name: '반짝 쿠키 브라운', hex: '#C89268', group: 'sparkle', type: 'sparkle', feel: '따뜻한 브라운 펄' },
  { id: 92, name: '반짝 초코',     hex: '#7A4B3A', group: 'sparkle', type: 'sparkle', feel: '진한 초코 펄' },
  { id: 93, name: '오로라 핑크',   hex: '#FFB5E8', group: 'sparkle', type: 'sparkle', feel: '핑크+보라 펄' },
  { id: 94, name: '오로라 블루',   hex: '#A5D8FF', group: 'sparkle', type: 'sparkle', feel: '하늘+보라 펄' },
  { id: 95, name: '오로라 민트',   hex: '#B8FFE8', group: 'sparkle', type: 'sparkle', feel: '민트+하늘 펄' },
  { id: 96, name: '오로라 퍼플',   hex: '#C7B8FF', group: 'sparkle', type: 'sparkle', feel: '보라+핑크 펄' },
  { id: 97, name: '반짝 달빛',     hex: '#FFF4C2', group: 'sparkle', type: 'sparkle', feel: '은은한 달빛' },
  { id: 98, name: '반짝 별밤',     hex: '#3D3A78', group: 'sparkle', type: 'sparkle', feel: '어두운 밤하늘 펄' },
  { id: 99, name: '반짝 무지개가루', hex: '#E8D7FF', group: 'sparkle', type: 'sparkle', feel: '여러 색 펄 입자' },

  // ===== 특수 (1) — 무지개 브러시 (그릴 때 색이 부드럽게 변함) =====
  {
    id: 100, name: '레인보우 크레파스', hex: '#FFB6C8', group: 'special', type: 'special',
    feel: '핑크 → 노랑 → 민트 → 하늘 → 보라 부드럽게 변화',
    rainbowGradient: ['#FFB6C8', '#FFE066', '#7FD8C0', '#82D8FF', '#B19CFF'],
  },
];

// 헬퍼: ID로 색 정보 가져오기
export function getColorById(id) {
  return COLORS.find(c => c.id === id);
}

// 헬퍼: 그룹별 색 목록
export function getColorsByGroup(group) {
  return COLORS.filter(c => c.group === group);
}

// 헬퍼: 타입별 (normal | sparkle | special)
export function getColorsByType(type) {
  return COLORS.filter(c => c.type === type);
}

// 헬퍼: 랜덤 색 1개 (보상용, 특수 제외)
export function randomColor(excludeIds = [], opts = {}) {
  const { excludeSpecial = true, excludeSparkle = false } = opts;
  let pool = COLORS.filter(c => !excludeIds.includes(c.id));
  if (excludeSpecial) pool = pool.filter(c => c.type !== 'special');
  if (excludeSparkle) pool = pool.filter(c => c.type !== 'sparkle');
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 헬퍼: 무지개 그라디언트 색 (특수 색용 — 거리 기반 보간, t∈[0,1])
// HEX → RGB 직접 파싱 (Phaser import 불필요)
// ===== 메인 팔레트 16색 (스케치북 + 색칠놀이) =====
// 어린이 친화 큐레이션 — 무지개 12색 + 검정/흰색/갈색/회색/무지개
// 100컬러 시스템과 별개로, UI는 이 16개만 직관적으로 보여줌
// 100컬러 컬렉션은 보상/도감 시스템에서 사용
export const MAIN_PALETTE_IDS = [
  53,   // 잉크 블랙
  48,   // 우유 화이트
  18,   // 사과 레드
   7,   // 귤송이 주황
   4,   // 해님 노랑
  33,   // 새싹 연두
  35,   // 숲속 초록
  31,   // 아침 민트
  27,   // 사이다 블루
  28,   // 바다 블루
  22,   // 포도 보라
  12,   // 솜사탕 핑크 (토슴이 메인톤)
  15,   // 장미 핑크
  41,   // 코코아 브라운
  51,   // 비둘기 그레이
  100,  // 무지개 (특수, 그릴 때마다 색 변화)
];

export const MAIN_PALETTE = MAIN_PALETTE_IDS
  .map(id => COLORS.find(c => c.id === id))
  .filter(Boolean);

// ===== 8×8 그리드 팔레트 (대표님 결정 — Phase 1) =====
// Row 1 (free, 8개): 메인 비비드 — 검정/빨강/주황/노랑/녹색/파랑/핑크/무지개
// Row 2-8 (locked, 56개): 파스텔 + 다양한 톤 — IAP 결제 시 일괄 해금
// 한 행씩 톤 그룹화 (밝→진), 사용자 친화 큐레이션
export const GRID_PALETTE_IDS = [
  // Row 1 (FREE) — 메인 비비드 8색
  [53, 18,  7,  4, 35, 27, 15, 100],
  // Row 2 (LOCKED) — 매우 연한 파스텔 (밝은 톤)
  [48, 47, 49, 50, 67, 57, 60, 13],
  // Row 3 (LOCKED) — 라이트 톤
  [ 1,  2, 10, 11, 21, 26, 31, 33],
  // Row 4 (LOCKED) — 미드-라이트
  [ 3,  6,  9, 12, 14, 32, 37, 56],
  // Row 5 (LOCKED) — 미드
  [ 5,  8, 17, 19, 20, 22, 28, 34],
  // Row 6 (LOCKED) — 디퍼
  [16, 24, 25, 29, 36, 38, 39, 40],
  // Row 7 (LOCKED) — 브라운/베이지 라인
  [41, 42, 43, 44, 45, 46, 64, 63],
  // Row 8 (LOCKED) — 딥 + 액센트
  [23, 30, 51, 52, 54, 55, 58, 69],
];

// 1행 인덱스(=무료) — 잠금 판정용
export const GRID_FREE_ROW_INDEX = 0;

// 헬퍼: 그리드 좌표 (row, col)가 무료인지
export function isGridCellFree(row /* col is ignored */) {
  return row === GRID_FREE_ROW_INDEX;
}

// 헬퍼: 그리드 좌표로 색 정보
export function getGridColor(row, col) {
  const id = GRID_PALETTE_IDS[row]?.[col];
  return id != null ? COLORS.find(c => c.id === id) : null;
}

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
export function rainbowAt(t) {
  const stops = COLORS.find(c => c.id === 100).rainbowGradient;
  const n = stops.length;
  const tNorm = ((t % 1) + 1) % 1;       // [0,1] 순환
  const idx = tNorm * (n - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, n - 1);
  const f = idx - i0;
  const c0 = hexToRGB(stops[i0]);
  const c1 = hexToRGB(stops[i1]);
  const r = Math.round(c0.r * (1 - f) + c1.r * f);
  const g = Math.round(c0.g * (1 - f) + c1.g * f);
  const b = Math.round(c0.b * (1 - f) + c1.b * f);
  return (r << 16) | (g << 8) | b;
}
