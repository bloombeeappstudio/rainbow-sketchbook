// 🎨 색칠놀이 도안 — 8 카테고리 구조
//   - 캐릭터 : 토슴이 등 미니게임 캐릭터
//   - 우주   : 행성/로켓/별자리
//   - 디저트 : 케이크/도넛/마카롱 (구 '음식' → 대표님 요청 리네임)
//   - 바닷속 : 물고기/문어/조개
//   - 사파리 : 사자/코끼리/기린
//   - 숲속   : 공룡/곰/토끼/부엉이 (구 '가족' → 대표님 요청 리네임)
//   - 탈 것  : 자동차/비행기/배 (신규)
//   - 과일   : 사과/딸기/포도
//
// 각 카테고리는 최대 20개 도안 (사용자 결정)
// 무료/유료: 카테고리별 앞 FREE_PER_CATEGORY 개만 무료, 나머지는 잠금 → 결제 시 일괄 해금
//
// 각 도안 객체 형태:
//   { id, name, textureKey?, draw?, bg, free?: boolean }
//   - textureKey : 미리 로드된 PNG 외곽선
//   - free       : 명시되지 않으면 카테고리 앞 FREE_PER_CATEGORY개 자동 무료
//                  나머지는 잠금 (결제 시 해금)

export const FREE_PER_CATEGORY = 3;     // 카테고리당 무료 도안 수 (사용자 결정)
export const MAX_PER_CATEGORY = 30;     // 카테고리당 최대 도안 수 (우주 26장으로 상향)

// ===== 카테고리 정의 =====
// 각 카테고리는 templates 배열을 가짐 (비어있으면 "곧 만나요!" 안내)
export const CATEGORIES = [
  {
    id: 'character',
    name: '캐릭터',
    emoji: '🐰',
    bg: 0xFFB6C8,         // 솜사탕 핑크 (토슴이 메인톤)
    shadow: 0xC66888,
    description: '토슴이와 친구들',
    templates: [
      // ── 무료 3장 (토슴이 3종) ──
      { id: 'character-toseumi-star',    name: '토슴이 별빛',  textureKey: 'tpl-character-toseumi-star-free',    bg: 0xFFB6C8, free: true  },
      { id: 'character-toseumi-ribbon',  name: '토슴이 리본',  textureKey: 'tpl-character-toseumi-ribbon-free',  bg: 0xFFB6C8, free: true  },
      { id: 'character-toseumi-balloon', name: '토슴이 풍선',  textureKey: 'tpl-character-toseumi-balloon-free', bg: 0xFFB6C8, free: true  },
      // ── 유료 5장 (토슴이 무지개 + 친구들 4종) ──
      { id: 'character-toseumi-rainbow', name: '토슴이 무지개', textureKey: 'tpl-character-toseumi-rainbow', bg: 0xFFB6C8, free: false },
      { id: 'character-alien',           name: '외계인 뽀삐',   textureKey: 'tpl-character-alien',           bg: 0xFFB6C8, free: false },
      { id: 'character-skunk',           name: '스컹크 코코',   textureKey: 'tpl-character-skunk',           bg: 0xFFB6C8, free: false },
      { id: 'character-bat',             name: '박쥐 루나',     textureKey: 'tpl-character-bat',             bg: 0xFFB6C8, free: false },
      { id: 'character-blackchi',        name: '블랙치 마법사', textureKey: 'tpl-character-blackchi',        bg: 0xFFB6C8, free: false },
    ],
  },
  {
    id: 'space',
    name: '우주',
    emoji: '🚀',
    bg: 0xB19CFF,         // 별빛 보라
    shadow: 0x7B68B8,
    description: '별과 행성',
    templates: [
      // ── 무료 3장 ──
      { id: 'space-toseumi-painting', name: '별 그림 그리기', textureKey: 'tpl-space-toseumi-painting-free', bg: 0xB19CFF, free: true  },
      { id: 'space-ufo',              name: 'UFO',            textureKey: 'tpl-space-ufo-free',              bg: 0xB19CFF, free: true  },
      { id: 'space-shooting-star',    name: '별똥별',          textureKey: 'tpl-space-shooting-star-free',    bg: 0xB19CFF, free: true  },
      // ── 유료 23장 (1페이지: 귀엽고 재미있는 도안 우선 배치) ──
      { id: 'space-earth',             name: '지구',             textureKey: 'tpl-space-earth',                bg: 0xB19CFF, free: false },
      { id: 'space-toseumi-cart',      name: '토슴이 카트',      textureKey: 'tpl-space-toseumi-cart',         bg: 0xB19CFF, free: false },
      { id: 'space-ice-cream-cart',    name: '우주 아이스크림',  textureKey: 'tpl-space-ice-cream-cart',       bg: 0xB19CFF, free: false },
      { id: 'space-train',             name: '우주 기차',        textureKey: 'tpl-space-train',                bg: 0xB19CFF, free: false },
      { id: 'space-rocket',            name: '로켓',             textureKey: 'tpl-space-rocket',               bg: 0xB19CFF, free: false },
      // ── 2페이지 ──
      { id: 'space-star',              name: '귀여운 별',        textureKey: 'tpl-space-star',                 bg: 0xB19CFF, free: false },
      { id: 'space-toseumi-astronaut', name: '토슴이 우주비행사', textureKey: 'tpl-space-toseumi-astronaut',  bg: 0xB19CFF, free: false },
      { id: 'space-ufo2',              name: '원반 UFO',         textureKey: 'tpl-space-ufo2',                 bg: 0xB19CFF, free: false },
      { id: 'space-satellite',         name: '우주정거장',       textureKey: 'tpl-space-satellite',            bg: 0xB19CFF, free: false },
      { id: 'space-moon-rover',        name: '달 로버',          textureKey: 'tpl-space-moon-rover',           bg: 0xB19CFF, free: false },
      { id: 'space-toseumi-moon',      name: '달 위 토슴이',     textureKey: 'tpl-space-toseumi-moon',         bg: 0xB19CFF, free: false },
      { id: 'space-balloon',           name: '우주 풍선',        textureKey: 'tpl-space-balloon',              bg: 0xB19CFF, free: false },
      { id: 'space-ferris-wheel',      name: '우주 관람차',      textureKey: 'tpl-space-ferris-wheel',         bg: 0xB19CFF, free: false },
      // ── 3페이지 ──
      { id: 'space-moon-bicycle',      name: '달 자전거',        textureKey: 'tpl-space-moon-bicycle',         bg: 0xB19CFF, free: false },
      { id: 'space-moon-tent',         name: '달 텐트',          textureKey: 'tpl-space-moon-tent',            bg: 0xB19CFF, free: false },
      { id: 'space-toy-box',           name: '우주 장난감 상자', textureKey: 'tpl-space-toy-box',              bg: 0xB19CFF, free: false },
      { id: 'space-toseumi-crescent',  name: '초승달 토슴이',    textureKey: 'tpl-space-toseumi-crescent',     bg: 0xB19CFF, free: false },
      { id: 'space-star-bottle',       name: '별 유리병',        textureKey: 'tpl-space-star-bottle',          bg: 0xB19CFF, free: false },
      { id: 'space-toseumi-sleeping',  name: '토슴이 자는 중',   textureKey: 'tpl-space-toseumi-sleeping',     bg: 0xB19CFF, free: false },
      { id: 'space-saturn',            name: '토성',             textureKey: 'tpl-space-saturn',               bg: 0xB19CFF, free: false },
      { id: 'space-telescope',         name: '망원경',           textureKey: 'tpl-space-telescope',            bg: 0xB19CFF, free: false },
      // ── 4페이지 ──
      { id: 'space-galaxy',            name: '은하',             textureKey: 'tpl-space-galaxy',               bg: 0xB19CFF, free: false },
      { id: 'space-alien',             name: '외계인',           textureKey: 'tpl-space-alien',                bg: 0xB19CFF, free: false },
    ],
  },
  {
    id: 'dessert',
    name: '디저트',
    emoji: '🍰',
    bg: 0xFFB347,         // 따뜻한 오렌지
    shadow: 0xC8842F,
    description: '달콤한 디저트',
    templates: [
      // ── 무료 3장 ──
      { id: 'dessert-macaron',         name: '마카롱',       textureKey: 'tpl-dessert-macaron-free',     bg: 0xFFB347, free: true  },
      { id: 'dessert-donut',           name: '도넛',         textureKey: 'tpl-dessert-donut-free',       bg: 0xFFB347, free: true  },
      { id: 'dessert-pudding',         name: '푸딩',         textureKey: 'tpl-dessert-pudding-free',     bg: 0xFFB347, free: true  },
      // ── 유료 17장 ──
      { id: 'dessert-ice-cream',       name: '아이스크림',   textureKey: 'tpl-dessert-ice-cream',         bg: 0xFFB347, free: false },
      { id: 'dessert-strawberry-cake', name: '딸기 케이크',  textureKey: 'tpl-dessert-strawberry-cake',   bg: 0xFFB347, free: false },
      { id: 'dessert-waffle',          name: '와플',         textureKey: 'tpl-dessert-waffle',            bg: 0xFFB347, free: false },
      { id: 'dessert-popsicle',        name: '아이스바',     textureKey: 'tpl-dessert-popsicle',          bg: 0xFFB347, free: false },
      { id: 'dessert-swiss-roll',      name: '롤케이크',     textureKey: 'tpl-dessert-swiss-roll',        bg: 0xFFB347, free: false },
      { id: 'dessert-milkshake',       name: '밀크쉐이크',   textureKey: 'tpl-dessert-milkshake',         bg: 0xFFB347, free: false },
      { id: 'dessert-lollipop',        name: '롤리팝',       textureKey: 'tpl-dessert-lollipop',          bg: 0xFFB347, free: false },
      { id: 'dessert-birthday-cake',   name: '생일 케이크',  textureKey: 'tpl-dessert-birthday-cake',     bg: 0xFFB347, free: false },
      { id: 'dessert-yule-log',        name: '통나무 케이크', textureKey: 'tpl-dessert-yule-log',         bg: 0xFFB347, free: false },
      { id: 'dessert-coffee',          name: '커피',         textureKey: 'tpl-dessert-coffee',            bg: 0xFFB347, free: false },
      { id: 'dessert-chocolate-balls', name: '초콜릿볼',     textureKey: 'tpl-dessert-chocolate-balls',   bg: 0xFFB347, free: false },
      { id: 'dessert-teapot',          name: '찻주전자',     textureKey: 'tpl-dessert-teapot',            bg: 0xFFB347, free: false },
      { id: 'dessert-hamburger',       name: '햄버거',       textureKey: 'tpl-dessert-hamburger',         bg: 0xFFB347, free: false },
      { id: 'dessert-cupcake',         name: '컵케이크',     textureKey: 'tpl-dessert-cupcake',           bg: 0xFFB347, free: false },
      { id: 'dessert-juice',           name: '과일주스',     textureKey: 'tpl-dessert-juice',             bg: 0xFFB347, free: false },
      { id: 'dessert-fruit-tart',      name: '과일 타르트',  textureKey: 'tpl-dessert-fruit-tart',        bg: 0xFFB347, free: false },
      { id: 'dessert-churros',         name: '츄러스',       textureKey: 'tpl-dessert-churros',           bg: 0xFFB347, free: false },
    ],
  },
  {
    id: 'ocean',
    name: '바닷속',
    emoji: '🐠',
    bg: 0x6FCAB2,
    shadow: 0x3D8870,
    description: '깊은 바닷속 친구들',
    templates: [
      // ── 무료 3장 ──
      { id: 'ocean-whale',        name: '고래',       textureKey: 'tpl-ocean-whale-free',        bg: 0x6FCAB2, free: true  },
      { id: 'ocean-clownfish',    name: '광대물고기', textureKey: 'tpl-ocean-clownfish-free',    bg: 0x6FCAB2, free: true  },
      { id: 'ocean-turtle',       name: '거북이',     textureKey: 'tpl-ocean-turtle-free',       bg: 0x6FCAB2, free: true  },
      // ── 유료 16장 ──
      { id: 'ocean-crab',         name: '게',         textureKey: 'tpl-ocean-crab',         bg: 0x6FCAB2, free: false },
      { id: 'ocean-shark',        name: '상어',       textureKey: 'tpl-ocean-shark',        bg: 0x6FCAB2, free: false },
      { id: 'ocean-mermaid',      name: '인어공주',   textureKey: 'tpl-ocean-mermaid',      bg: 0x6FCAB2, free: false },
      { id: 'ocean-seahorse',     name: '해마',       textureKey: 'tpl-ocean-seahorse',     bg: 0x6FCAB2, free: false },
      { id: 'ocean-dolphin',      name: '돌고래',     textureKey: 'tpl-ocean-dolphin',      bg: 0x6FCAB2, free: false },
      { id: 'ocean-octopus',      name: '문어',       textureKey: 'tpl-ocean-octopus',      bg: 0x6FCAB2, free: false },
      { id: 'ocean-fish',         name: '물고기',     textureKey: 'tpl-ocean-fish',         bg: 0x6FCAB2, free: false },
      { id: 'ocean-treasure',     name: '보물상자',   textureKey: 'tpl-ocean-treasure',     bg: 0x6FCAB2, free: false },
      { id: 'ocean-rainbow-fish', name: '무지개물고기', textureKey: 'tpl-ocean-rainbow-fish', bg: 0x6FCAB2, free: false },
      { id: 'ocean-clam',         name: '조개',       textureKey: 'tpl-ocean-clam',         bg: 0x6FCAB2, free: false },
      { id: 'ocean-mermaid2',     name: '인어공주2',  textureKey: 'tpl-ocean-mermaid2',     bg: 0x6FCAB2, free: false },
      { id: 'ocean-seal',         name: '물개',       textureKey: 'tpl-ocean-seal',         bg: 0x6FCAB2, free: false },
      { id: 'ocean-anglerfish',   name: '아귀',       textureKey: 'tpl-ocean-anglerfish',   bg: 0x6FCAB2, free: false },
      { id: 'ocean-starfish',     name: '불가사리',   textureKey: 'tpl-ocean-starfish',     bg: 0x6FCAB2, free: false },
      { id: 'ocean-jellyfish',    name: '해파리',     textureKey: 'tpl-ocean-jellyfish',    bg: 0x6FCAB2, free: false },
      { id: 'ocean-otter',        name: '수달',       textureKey: 'tpl-ocean-otter',        bg: 0x6FCAB2, free: false },
    ],
  },
  {
    id: 'safari',
    name: '사파리',
    emoji: '🦁',
    bg: 0xFFD24E,
    shadow: 0xC89B2C,
    description: '들판의 동물 친구들',
    templates: [
      // ── 무료 3장 ──
      { id: 'safari-crocodile', name: '악어',   textureKey: 'tpl-safari-crocodile-free', bg: 0xFFD24E, free: true  },
      { id: 'safari-lion',      name: '사자',   textureKey: 'tpl-safari-lion-free',      bg: 0xFFD24E, free: true  },
      { id: 'safari-pig',       name: '돼지',   textureKey: 'tpl-safari-pig-free',       bg: 0xFFD24E, free: true  },
      // ── 유료 17장 ──
      { id: 'safari-tiger',     name: '호랑이', textureKey: 'tpl-safari-tiger',    bg: 0xFFD24E, free: false },
      { id: 'safari-elephant',  name: '코끼리', textureKey: 'tpl-safari-elephant', bg: 0xFFD24E, free: false },
      { id: 'safari-monkey',    name: '원숭이', textureKey: 'tpl-safari-monkey',   bg: 0xFFD24E, free: false },
      { id: 'safari-giraffe',   name: '기린',   textureKey: 'tpl-safari-giraffe',  bg: 0xFFD24E, free: false },
      { id: 'safari-peacock',   name: '공작새', textureKey: 'tpl-safari-peacock',  bg: 0xFFD24E, free: false },
      { id: 'safari-panda',     name: '판다',   textureKey: 'tpl-safari-panda',    bg: 0xFFD24E, free: false },
      { id: 'safari-parrot',    name: '앵무새', textureKey: 'tpl-safari-parrot',   bg: 0xFFD24E, free: false },
      { id: 'safari-fennec',    name: '페넥여우', textureKey: 'tpl-safari-fennec',  bg: 0xFFD24E, free: false },
      { id: 'safari-rhino',     name: '코뿔소', textureKey: 'tpl-safari-rhino',    bg: 0xFFD24E, free: false },
      { id: 'safari-deer',      name: '사슴',   textureKey: 'tpl-safari-deer',     bg: 0xFFD24E, free: false },
      { id: 'safari-camel',     name: '낙타',   textureKey: 'tpl-safari-camel',    bg: 0xFFD24E, free: false },
      { id: 'safari-hippo',     name: '하마',   textureKey: 'tpl-safari-hippo',    bg: 0xFFD24E, free: false },
      { id: 'safari-sheep',     name: '양',     textureKey: 'tpl-safari-sheep',    bg: 0xFFD24E, free: false },
      { id: 'safari-horse',     name: '말',     textureKey: 'tpl-safari-horse',    bg: 0xFFD24E, free: false },
      { id: 'safari-eagle',     name: '독수리', textureKey: 'tpl-safari-eagle',    bg: 0xFFD24E, free: false },
      { id: 'safari-sloth',     name: '나무늘보', textureKey: 'tpl-safari-sloth',  bg: 0xFFD24E, free: false },
      { id: 'safari-zebra',     name: '얼룩말', textureKey: 'tpl-safari-zebra',    bg: 0xFFD24E, free: false },
    ],
  },
  {
    id: 'forest',
    name: '숲속',
    emoji: '🌳',
    bg: 0x8FD49A,         // 숲 연두
    shadow: 0x4F9E64,
    description: '숲속 친구들',
    templates: [
      // ── 무료 3장 (대표님 v3 라인업: 다람쥐/고슴도치/브론토 — 친근 동물 + 공룡) ──
      { id: 'forest-squirrel',         name: '다람쥐',       textureKey: 'tpl-forest-squirrel-free',     bg: 0x8FD49A, free: true  },
      { id: 'forest-hedgehog',         name: '고슴도치',     textureKey: 'tpl-forest-hedgehog-free',     bg: 0x8FD49A, free: true  },
      { id: 'forest-brontosaurus',     name: '브론토',       textureKey: 'tpl-forest-brontosaurus-free', bg: 0x8FD49A, free: true  },
      // ── 유료 16장 (동물 + 판타지: 요정/유니콘/공주/성/사탕 가게) ──
      { id: 'forest-rabbit',           name: '토끼',         textureKey: 'tpl-forest-rabbit',            bg: 0x8FD49A, free: false },
      { id: 'forest-fairy-treasure',   name: '요정 보물',    textureKey: 'tpl-forest-fairy-treasure',    bg: 0x8FD49A, free: false },
      { id: 'forest-unicorn',          name: '유니콘',       textureKey: 'tpl-forest-unicorn',           bg: 0x8FD49A, free: false },
      { id: 'forest-princess',         name: '공주님',       textureKey: 'tpl-forest-princess',          bg: 0x8FD49A, free: false },
      { id: 'forest-tower',            name: '작은 성',      textureKey: 'tpl-forest-tower',             bg: 0x8FD49A, free: false },
      { id: 'forest-fairy-rainbow',    name: '무지개 요정',  textureKey: 'tpl-forest-fairy-rainbow',     bg: 0x8FD49A, free: false },
      { id: 'forest-duck',             name: '오리',         textureKey: 'tpl-forest-duck',              bg: 0x8FD49A, free: false },
      { id: 'forest-butterfly',        name: '나비',         textureKey: 'tpl-forest-butterfly',         bg: 0x8FD49A, free: false },
      { id: 'forest-owl',              name: '부엉이',       textureKey: 'tpl-forest-owl',               bg: 0x8FD49A, free: false },
      { id: 'forest-campfire-tent',    name: '캠프 텐트',    textureKey: 'tpl-forest-campfire-tent',     bg: 0x8FD49A, free: false },
      { id: 'forest-fox',              name: '여우',         textureKey: 'tpl-forest-fox',               bg: 0x8FD49A, free: false },
      { id: 'forest-sheep',            name: '양',           textureKey: 'tpl-forest-sheep',             bg: 0x8FD49A, free: false },
      { id: 'forest-deer',             name: '사슴',         textureKey: 'tpl-forest-deer',              bg: 0x8FD49A, free: false },
      { id: 'forest-bear',             name: '곰',           textureKey: 'tpl-forest-bear',              bg: 0x8FD49A, free: false },
      { id: 'forest-candy-shop',       name: '사탕 가게',    textureKey: 'tpl-forest-candy-shop',        bg: 0x8FD49A, free: false },
      { id: 'forest-cat',              name: '고양이',       textureKey: 'tpl-forest-cat',               bg: 0x8FD49A, free: false },
    ],
  },
  {
    id: 'vehicle',
    name: '탈 것',
    emoji: '🚗',
    bg: 0x82C8FF,         // 시원한 하늘색
    shadow: 0x5090C8,
    description: '신나게 달리는 탈것',
    templates: [],
  },
  {
    id: 'fruit',
    name: '과일',
    emoji: '🍓',
    bg: 0xFF8FAB,         // 빨강 핑크 (딸기 톤)
    shadow: 0xC86888,
    description: '달콤한 과일들',
    templates: [
      // ── 무료 3장 ──
      // TODO: 한글 이름 매핑 대기 (대표님 확인 후 업데이트)
      { id: 'fruit-01', name: '과일 1', textureKey: 'tpl-fruit-01-free', bg: 0xFF8FAB, free: true  },
      { id: 'fruit-02', name: '과일 2', textureKey: 'tpl-fruit-02-free', bg: 0xFF8FAB, free: true  },
      { id: 'fruit-03', name: '과일 3', textureKey: 'tpl-fruit-03-free', bg: 0xFF8FAB, free: true  },
      // ── 유료 17장 ──
      { id: 'fruit-04', name: '과일 4',  textureKey: 'tpl-fruit-04', bg: 0xFF8FAB, free: false },
      { id: 'fruit-05', name: '과일 5',  textureKey: 'tpl-fruit-05', bg: 0xFF8FAB, free: false },
      { id: 'fruit-06', name: '과일 6',  textureKey: 'tpl-fruit-06', bg: 0xFF8FAB, free: false },
      { id: 'fruit-07', name: '과일 7',  textureKey: 'tpl-fruit-07', bg: 0xFF8FAB, free: false },
      { id: 'fruit-08', name: '과일 8',  textureKey: 'tpl-fruit-08', bg: 0xFF8FAB, free: false },
      { id: 'fruit-09', name: '과일 9',  textureKey: 'tpl-fruit-09', bg: 0xFF8FAB, free: false },
      { id: 'fruit-10', name: '과일 10', textureKey: 'tpl-fruit-10', bg: 0xFF8FAB, free: false },
      { id: 'fruit-11', name: '과일 11', textureKey: 'tpl-fruit-11', bg: 0xFF8FAB, free: false },
      { id: 'fruit-12', name: '과일 12', textureKey: 'tpl-fruit-12', bg: 0xFF8FAB, free: false },
      { id: 'fruit-13', name: '과일 13', textureKey: 'tpl-fruit-13', bg: 0xFF8FAB, free: false },
      { id: 'fruit-14', name: '과일 14', textureKey: 'tpl-fruit-14', bg: 0xFF8FAB, free: false },
      { id: 'fruit-15', name: '과일 15', textureKey: 'tpl-fruit-15', bg: 0xFF8FAB, free: false },
      { id: 'fruit-16', name: '과일 16', textureKey: 'tpl-fruit-16', bg: 0xFF8FAB, free: false },
      { id: 'fruit-17', name: '과일 17', textureKey: 'tpl-fruit-17', bg: 0xFF8FAB, free: false },
      { id: 'fruit-18', name: '과일 18', textureKey: 'tpl-fruit-18', bg: 0xFF8FAB, free: false },
      { id: 'fruit-19', name: '과일 19', textureKey: 'tpl-fruit-19', bg: 0xFF8FAB, free: false },
      { id: 'fruit-20', name: '과일 20', textureKey: 'tpl-fruit-20', bg: 0xFF8FAB, free: false },
    ],
  },
];

// ===== 무료/잠금 헬퍼 =====
//   각 카테고리의 앞 FREE_PER_CATEGORY 개는 자동 무료
//   결제 후 일괄 해금 (추후 IAP 연동)
export function isTemplateFree(template, index) {
  if (template.free === true) return true;       // 명시 무료
  if (template.free === false) return false;     // 명시 잠금
  return index < FREE_PER_CATEGORY;              // 디폴트: 앞 3개 무료
}

// ===== 전체 도안 평탄화 (기존 코드 호환용) =====
// 카테고리별 templates를 한 줄로 합침
export const TEMPLATES = CATEGORIES.flatMap(c =>
  c.templates.map(t => ({ ...t, categoryId: c.id }))
);

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
}

export function getTemplateById(id) {
  return TEMPLATES.find(t => t.id === id) || null;
}

export function getTemplatesByCategory(categoryId) {
  const cat = getCategoryById(categoryId);
  return cat ? cat.templates : [];
}
