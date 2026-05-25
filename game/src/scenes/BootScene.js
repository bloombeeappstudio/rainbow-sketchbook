// 🚀 BootScene — 자산 로딩 + 로딩 화면
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONTS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getLocale } from '../i18n/index.js';

// locale → 메뉴 폴더 매핑 (zh-TW만 'tw'로 단축 — 자산 폴더명 일관성)
function localeToMenuFolder(locale) {
  return locale === 'zh-TW' ? 'tw' : locale;
}

// 메모리 게임 카드 앞면 — 40종 풀 (한 게임당 랜덤 6쌍 픽업, 매번 다양성)
// 파일명 = 키 (예: 'memory_card_01_ice_cream_cone')
// public/cards/{name}.png 로 로드
export const CARD_FRONTS = [
  // 음식/디저트 (01~18)
  'memory_card_01_ice_cream_cone',
  'memory_card_02_soft_ice_cream',
  'memory_card_03_cherry_cupcake',
  'memory_card_04_star_cupcake',
  'memory_card_05_swirl_lollipop',
  'memory_card_06_cookie',
  'memory_card_07_strawberry_milk',
  'memory_card_08_candy_cluster',
  'memory_card_09_strawberry_shortcake',
  'memory_card_10_pink_donut',
  'memory_card_11_rainbow_macaron',
  'memory_card_12_watermelon_popsicle',
  'memory_card_13_rainbow_popsicle',
  'memory_card_14_strawberry_bingsu',
  'memory_card_15_fruit_parfait',
  'memory_card_16_berry_waffle',
  'memory_card_17_plain_waffle',
  'memory_card_18_star_cookie',
  // 우주 (19~30)
  'memory_card_19_rocket',
  'memory_card_20_ufo_pink',
  'memory_card_21_ufo_purple',
  'memory_card_22_astronaut',
  'memory_card_23_satellite',
  'memory_card_24_telescope',
  'memory_card_25_saturn',
  'memory_card_26_earth',
  'memory_card_27_moon_crescent',
  'memory_card_28_meteor',
  'memory_card_29_star_yellow',
  'memory_card_30_magic_wand',
  // 동물 얼굴 (31~36, 41)
  'memory_card_31_bunny_pink',
  'memory_card_32_fox',
  'memory_card_33_raccoon',
  'memory_card_34_skunk',
  'memory_card_35_bat_purple',
  'memory_card_36_alien_mint',
  // 기타 (37~40)
  'memory_card_37_crown',
  'memory_card_38_music_note',
  'memory_card_39_paint_palette',
  'memory_card_40_star_sketchpad',
  // 추가 동물 (별도 추가분)
  'memory_card_41_blackchi_cat',     // 블랙치 — 별/달이 박힌 검은 고양이
];

// 리워드 6종 (보상 일러스트)
export const REWARD_ITEMS = [
  'candy', 'carrot', 'gold-sparkle', 'heart', 'rainbow-fragment', 'star',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 🔤 폰트 워밍업
    this.warmUpFonts();

    // ⭐ 타이틀 로고 가장 먼저 로드 (로딩화면에서 빨리 표시되도록)
    const langCode = localeToMenuFolder(getLocale());     // 'ko' | 'ja' | 'en' | 'tw'
    this.load.image('title-full', `title_logos/${langCode}_full.png`);
    this.load.image('title-sub',  `title_logos/${langCode}_sub.png`);

    this.createLoadingUI();

    // ===== 토슴이 로고 (보상 팝업용) =====
    this.load.image('tosumi-logo-16', 'characters/tosumi-logo-16.png');
    this.load.image('tosumi-logo-good', 'characters/tosumi-logo-good.png');

    // ===== 토슴이 캐릭터 (22종, 사용자 수정본 — 이미 투명배경 처리됨) =====
    // 기본/감정 7종
    this.load.image('toseumi-default',   'characters/toseumi-default.png');   // 기본 서있는
    this.load.image('toseumi-memory',    'characters/toseumi-memory.png');    // 메모리 게임 전용 (활기찬 표정)
    this.load.image('toseumi-story',     'characters/toseumi-story.png');     // 책 읽는 (스토리)
    this.load.image('toseumi-carrot',    'characters/toseumi-carrot.png');    // 당근 든 (로비 랜덤)
    this.load.image('toseumi-jump',      'characters/toseumi-jump.png');      // 점프 만세 (로비 랜덤)
    this.load.image('toseumi-sleep',     'characters/toseumi-sleep.png');     // 잠자는 (로비 랜덤)
    this.load.image('toseumi-wave',      'characters/toseumi-wave.png');      // 손 흔들기
    this.load.image('toseumi-greet',     'characters/toseumi-greet.png');     // 활기찬 인사 (메인)
    this.load.image('toseumi-fun',       'characters/toseumi-fun.png');       // 점프 (재미)
    this.load.image('toseumi-happy',     'characters/toseumi-happy.png');     // 감격 축하
    this.load.image('toseumi-sad',       'characters/toseumi-sad2.png');      // 슬픔
    this.load.image('toseumi-surprised', 'characters/toseumi-surprised.png'); // 놀람
    // 마법/액션 5종
    this.load.image('toseumi-magic',     'characters/toseumi-magic.png');     // 마법 기본
    this.load.image('toseumi-magic2',    'characters/toseumi-magic2.png');    // 3연승 폭발
    this.load.image('toseumi-hero',      'characters/toseumi-hero.png');      // 지팡이 액션
    this.load.image('toseumi-cape',      'characters/toseumi-cape.png');      // 무지개 망토
    this.load.image('toseumi-brush',     'characters/toseumi-brush.png');     // 무지개 붓
    // 그림/도구 3종
    this.load.image('toseumi-crayon',    'characters/toseumi-crayon.png');    // 크레파스
    this.load.image('toseumi-rainbow-crayon', 'characters/toseumi-rainbow-crayon.png'); // 무지개 크레파스
    this.load.image('toseumi-sitting',   'characters/toseumi-sitting.png');   // 앉아 그리는 (스케치)
    // 가이드/UI 4종
    this.load.image('toseumi-guide',     'characters/toseumi-guide.png');     // 가리키며 안내
    this.load.image('toseumi-basket',    'characters/toseumi-basket2.png');   // 바구니 (스타캐치)
    this.load.image('toseumi-face',      'characters/toseumi-face.png');      // 얼굴만 (아이콘)
    this.load.image('toseumi-charactersheet', 'characters/toseumi-charactersheet.png');
    this.load.image('toseumi-outline',   'characters/toseumi-outline.png');   // 라인아트
    // alt 변형 2종
    this.load.image('toseumi-wave-alt',   'characters/toseumi-wave-alt.png');
    this.load.image('toseumi-crayon-alt', 'characters/toseumi-crayon-alt.png');

    // ===== 메모리 게임 카드 (뒷면 1장 + 앞면 40장, 파일명=키) =====
    this.load.image('card-back', 'cards/card-back.png');
    CARD_FRONTS.forEach(name => {
      this.load.image(name, `cards/${name}.png`);     // 파일명 그대로 키
    });

    // ===== 리워드 6종 (보상 팝업/뽑기용) =====
    REWARD_ITEMS.forEach(name => {
      this.load.image(`reward-${name}`, `rewards/reward-${name}.png`);
    });

    // ===== 크레파스 PNG 로딩 제거 =====
    // 100장 PNG 크레파스 이미지 의존 폐기 → Phaser Graphics로 직접 그림 (ColorButton.js)
    // 어린이 친화 메인 16색만 단순화 (MAIN_PALETTE in colors.js)

    // ===== 미니게임 배경 (bg-rps는 메인 로비에서도 재사용) =====
    this.load.image('bg-memory', 'backgrounds/bg-memory.png');
    this.load.image('bg-rps',    'backgrounds/bg-rps.png');
    this.load.image('bg-catch',  'backgrounds/bg-catch.png');

    // ===== 오프닝 스토리 (5컷) =====
    for (let i = 1; i <= 5; i++) {
      const num = String(i).padStart(2, '0');
      this.load.image(`story-${num}`, `story/story-${num}.png`);
    }

    // ===== 키아트 =====
    this.load.image('keyart', 'ui/keyart.png');

    // ===== 사운드 (BGM + SFX) =====
    // ⚡ 로딩 최적화: BGM은 씬별 지연 로딩 (각 씬의 preload에서 로드)
    // BootScene에는 lobby BGM(~7MB)과 SFX(~0.5MB)만 — 나머지 ~47MB는 씬 진입 시 로드
    this.load.audio('bgm-lobby-1',  'sounds/bgm/lobby-1.mp3');   // 메인/스토리/마이룸 공통
    this.load.audio('bgm-lobby-2',  'sounds/bgm/lobby-2.mp3');

    // SFX (용량 작아서 부팅 시 로드)
    this.load.audio('sfx-button',   'sounds/sfx/button.mp3');     // 버튼 클릭
    this.load.audio('sfx-reward',   'sounds/sfx/reward.mp3');     // 보상 (level complete)

    // ===== 메인 메뉴 6칸 PNG (locale별, 디바이스 언어에 맞춰 로드) =====
    //   크레파스/마이룸 → 캐릭터 도감/스토리로 변경
    //   파일명: memory/rps/catch/sketch/dex/story.png
    const menuFolder = localeToMenuFolder(getLocale());
    this.load.image('menu-memory', `main_menu/${menuFolder}/memory.png`);
    this.load.image('menu-rps',    `main_menu/${menuFolder}/rps.png`);
    this.load.image('menu-catch',  `main_menu/${menuFolder}/catch.png`);
    this.load.image('menu-dex',    `main_menu/${menuFolder}/dex.png`);
    this.load.image('menu-story',  `main_menu/${menuFolder}/story.png`);
    this.load.image('menu-sketch', `main_menu/${menuFolder}/sketch.png`);

    // ===== 스케치북 허브 안의 색칠놀이/그림그리기 PNG (locale별) =====
    //   파일명: coloring.png / drawing.png (4언어 자동 분기)
    this.load.image('submenu-coloring', `main_menu/${menuFolder}/coloring.png`);
    this.load.image('submenu-drawing',  `main_menu/${menuFolder}/drawing.png`);
    this.load.image('submenu-gallery',  `main_menu/${menuFolder}/gallery.png`);

    // ===== MainScene 4 카드 일러스트 (v1.3 신규 PNG) =====
    this.load.image('menu-card-coloring', 'main_menu/menu-card-coloring.png');
    this.load.image('menu-card-drawing',  'main_menu/menu-card-drawing.png');
    this.load.image('menu-card-gallery',  'main_menu/menu-card-gallery.png');
    this.load.image('menu-card-story',    'main_menu/menu-card-story.png');

    // ===== 색칠놀이/그림그리기 도구 아이콘 PNG =====
    //   사용자 자산 받는 대로 public/tools/ 폴더에 배치 → 자동 적용
    //   없으면 이모지/그래픽 fallback — ColoringScene/SketchScene makeSquareIconBtn 안에서 처리
    this.load.image('tool-paint',  'tools/paint.png');     // 페인트통 → fallback 🪣
    this.load.image('tool-crayon', 'tools/crayon.png');    // 크레파스 → fallback 🖍
    this.load.image('tool-eraser', 'tools/eraser.png');    // 지우개 → fallback 네모 graphics

    // ===== 색칠놀이 도안 — 바닷속 (19장: 무료3 + 유료16) =====
    // 무료
    this.load.image('tpl-ocean-whale-free',     'templates/ocean/ocean_whale_free.png');
    this.load.image('tpl-ocean-clownfish-free', 'templates/ocean/ocean_clownfish_free.png');
    this.load.image('tpl-ocean-turtle-free',    'templates/ocean/ocean_turtle_free.png');
    // 유료
    this.load.image('tpl-ocean-crab',          'templates/ocean/ocean_crab.png');
    this.load.image('tpl-ocean-shark',         'templates/ocean/ocean_shark.png');
    this.load.image('tpl-ocean-mermaid',       'templates/ocean/ocean_mermaid.png');
    this.load.image('tpl-ocean-seahorse',      'templates/ocean/ocean_seahorse.png');
    this.load.image('tpl-ocean-dolphin',       'templates/ocean/ocean_dolphin.png');
    this.load.image('tpl-ocean-octopus',       'templates/ocean/ocean_octopus.png');
    this.load.image('tpl-ocean-fish',          'templates/ocean/ocean_fish.png');
    this.load.image('tpl-ocean-treasure',      'templates/ocean/ocean_treasure.png');
    this.load.image('tpl-ocean-rainbow-fish',  'templates/ocean/ocean_rainbow_fish.png');
    this.load.image('tpl-ocean-clam',          'templates/ocean/ocean_clam.png');
    this.load.image('tpl-ocean-mermaid2',      'templates/ocean/ocean_mermaid2.png');
    this.load.image('tpl-ocean-seal',          'templates/ocean/ocean_seal.png');
    this.load.image('tpl-ocean-anglerfish',    'templates/ocean/ocean_anglerfish.png');
    this.load.image('tpl-ocean-starfish',      'templates/ocean/ocean_starfish.png');
    this.load.image('tpl-ocean-jellyfish',     'templates/ocean/ocean_jellyfish.png');
    this.load.image('tpl-ocean-otter',         'templates/ocean/ocean_otter.png');

    // ===== 색칠놀이 도안 — 사파리 (20장: 무료3 + 유료17) =====
    // 무료
    this.load.image('tpl-safari-crocodile-free', 'templates/safari/safari_crocodile_free.png');
    this.load.image('tpl-safari-lion-free',      'templates/safari/safari_lion_free.png');
    this.load.image('tpl-safari-pig-free',       'templates/safari/safari_pig_free.png');
    // 유료
    this.load.image('tpl-safari-tiger',    'templates/safari/safari_tiger.png');
    this.load.image('tpl-safari-elephant', 'templates/safari/safari_elephant.png');
    this.load.image('tpl-safari-monkey',   'templates/safari/safari_monkey.png');
    this.load.image('tpl-safari-giraffe',  'templates/safari/safari_giraffe.png');
    this.load.image('tpl-safari-peacock',  'templates/safari/safari_peacock.png');
    this.load.image('tpl-safari-panda',    'templates/safari/safari_panda.png');
    this.load.image('tpl-safari-parrot',   'templates/safari/safari_parrot.png');
    this.load.image('tpl-safari-fennec',   'templates/safari/safari_fennec.png');
    this.load.image('tpl-safari-rhino',    'templates/safari/safari_rhino.png');
    this.load.image('tpl-safari-deer',     'templates/safari/safari_deer.png');
    this.load.image('tpl-safari-camel',    'templates/safari/safari_camel.png');
    this.load.image('tpl-safari-hippo',    'templates/safari/safari_hippo.png');
    this.load.image('tpl-safari-sheep',    'templates/safari/safari_sheep.png');
    this.load.image('tpl-safari-horse',    'templates/safari/safari_horse.png');
    this.load.image('tpl-safari-eagle',    'templates/safari/safari_eagle.png');
    this.load.image('tpl-safari-sloth',    'templates/safari/safari_sloth.png');
    this.load.image('tpl-safari-zebra',    'templates/safari/safari_zebra.png');

    // ===== 색칠놀이 도안 — 우주 (3 무료 + 23 유료 = 26장) =====
    this.load.image('tpl-space-toseumi-painting-free', 'templates/space/space_toseumi_painting_free.png');
    this.load.image('tpl-space-ufo-free',              'templates/space/space_ufo_free.png');
    this.load.image('tpl-space-shooting-star-free',    'templates/space/space_shooting_star_free.png');
    this.load.image('tpl-space-toseumi-astronaut',     'templates/space/space_toseumi_astronaut.png');
    this.load.image('tpl-space-rocket',                'templates/space/space_rocket.png');
    this.load.image('tpl-space-star',                  'templates/space/space_star.png');
    this.load.image('tpl-space-ufo2',                  'templates/space/space_ufo2.png');
    this.load.image('tpl-space-satellite',             'templates/space/space_satellite.png');
    this.load.image('tpl-space-moon-rover',            'templates/space/space_moon_rover.png');
    this.load.image('tpl-space-toseumi-moon',          'templates/space/space_toseumi_moon.png');
    this.load.image('tpl-space-galaxy',                'templates/space/space_galaxy.png');
    this.load.image('tpl-space-alien',                 'templates/space/space_alien.png');
    this.load.image('tpl-space-toseumi-crescent',      'templates/space/space_toseumi_crescent.png');
    this.load.image('tpl-space-earth',                 'templates/space/space_earth.png');
    this.load.image('tpl-space-saturn',                'templates/space/space_saturn.png');
    this.load.image('tpl-space-telescope',             'templates/space/space_telescope.png');
    this.load.image('tpl-space-star-bottle',           'templates/space/space_star_bottle.png');
    this.load.image('tpl-space-ice-cream-cart',        'templates/space/space_ice_cream_cart.png');
    this.load.image('tpl-space-balloon',               'templates/space/space_balloon.png');
    this.load.image('tpl-space-moon-tent',             'templates/space/space_moon_tent.png');
    this.load.image('tpl-space-toy-box',               'templates/space/space_toy_box.png');
    this.load.image('tpl-space-train',                 'templates/space/space_train.png');
    this.load.image('tpl-space-moon-bicycle',          'templates/space/space_moon_bicycle.png');
    this.load.image('tpl-space-ferris-wheel',          'templates/space/space_ferris_wheel.png');
    this.load.image('tpl-space-toseumi-cart',          'templates/space/space_toseumi_cart.png');
    this.load.image('tpl-space-toseumi-sleeping',      'templates/space/space_toseumi_sleeping.png');

    // ===== 색칠놀이 도안 — 캐릭터 v2 (8장: 무료 3 + 유료 5) =====
    //   무료 3장: 토슴이 별빛/리본/풍선
    //   유료 5장: 토슴이 무지개 + 외계인/스컹크/박쥐/블랙치
    this.load.image('tpl-character-toseumi-star-free',    'templates/character/character_toseumi_star_free.png');
    this.load.image('tpl-character-toseumi-ribbon-free',  'templates/character/character_toseumi_ribbon_free.png');
    this.load.image('tpl-character-toseumi-balloon-free', 'templates/character/character_toseumi_balloon_free.png');
    this.load.image('tpl-character-toseumi-rainbow',      'templates/character/character_toseumi_rainbow.png');
    this.load.image('tpl-character-alien',                'templates/character/character_alien.png');
    this.load.image('tpl-character-skunk',                'templates/character/character_skunk.png');
    this.load.image('tpl-character-bat',                  'templates/character/character_bat.png');
    this.load.image('tpl-character-blackchi',             'templates/character/character_blackchi.png');

    // ===== 색칠놀이 도안 — 과일 (3 무료 + 17 유료 = 20장) =====
    this.load.image('tpl-fruit-01-free', 'templates/fruit/fruit_01_free.png');
    this.load.image('tpl-fruit-02-free', 'templates/fruit/fruit_02_free.png');
    this.load.image('tpl-fruit-03-free', 'templates/fruit/fruit_03_free.png');
    this.load.image('tpl-fruit-04',      'templates/fruit/fruit_04.png');
    this.load.image('tpl-fruit-05',      'templates/fruit/fruit_05.png');
    this.load.image('tpl-fruit-06',      'templates/fruit/fruit_06.png');
    this.load.image('tpl-fruit-07',      'templates/fruit/fruit_07.png');
    this.load.image('tpl-fruit-08',      'templates/fruit/fruit_08.png');
    this.load.image('tpl-fruit-09',      'templates/fruit/fruit_09.png');
    this.load.image('tpl-fruit-10',      'templates/fruit/fruit_10.png');
    this.load.image('tpl-fruit-11',      'templates/fruit/fruit_11.png');
    this.load.image('tpl-fruit-12',      'templates/fruit/fruit_12.png');
    this.load.image('tpl-fruit-13',      'templates/fruit/fruit_13.png');
    this.load.image('tpl-fruit-14',      'templates/fruit/fruit_14.png');
    this.load.image('tpl-fruit-15',      'templates/fruit/fruit_15.png');
    this.load.image('tpl-fruit-16',      'templates/fruit/fruit_16.png');
    this.load.image('tpl-fruit-17',      'templates/fruit/fruit_17.png');
    this.load.image('tpl-fruit-18',      'templates/fruit/fruit_18.png');
    this.load.image('tpl-fruit-19',      'templates/fruit/fruit_19.png');
    this.load.image('tpl-fruit-20',      'templates/fruit/fruit_20.png');

    // ===== 디저트 도안 20장 (대표님 요청: 음식 → 디저트 리네임 + 매칭) =====
    this.load.image('tpl-dessert-macaron-free',     'templates/dessert/dessert_macaron_free.png');
    this.load.image('tpl-dessert-donut-free',       'templates/dessert/dessert_donut_free.png');
    this.load.image('tpl-dessert-pudding-free',     'templates/dessert/dessert_pudding_free.png');
    this.load.image('tpl-dessert-ice-cream',        'templates/dessert/dessert_ice_cream.png');
    this.load.image('tpl-dessert-strawberry-cake',  'templates/dessert/dessert_strawberry_cake.png');
    this.load.image('tpl-dessert-waffle',           'templates/dessert/dessert_waffle.png');
    this.load.image('tpl-dessert-popsicle',         'templates/dessert/dessert_popsicle.png');
    this.load.image('tpl-dessert-swiss-roll',       'templates/dessert/dessert_swiss_roll.png');
    this.load.image('tpl-dessert-milkshake',        'templates/dessert/dessert_milkshake.png');
    this.load.image('tpl-dessert-lollipop',         'templates/dessert/dessert_lollipop.png');
    this.load.image('tpl-dessert-birthday-cake',    'templates/dessert/dessert_birthday_cake.png');
    this.load.image('tpl-dessert-yule-log',         'templates/dessert/dessert_yule_log.png');
    this.load.image('tpl-dessert-coffee',           'templates/dessert/dessert_coffee.png');
    this.load.image('tpl-dessert-chocolate-balls',  'templates/dessert/dessert_chocolate_balls.png');
    this.load.image('tpl-dessert-teapot',           'templates/dessert/dessert_teapot.png');
    this.load.image('tpl-dessert-hamburger',        'templates/dessert/dessert_hamburger.png');
    this.load.image('tpl-dessert-cupcake',          'templates/dessert/dessert_cupcake.png');
    this.load.image('tpl-dessert-juice',            'templates/dessert/dessert_juice.png');
    this.load.image('tpl-dessert-fruit-tart',       'templates/dessert/dessert_fruit_tart.png');
    this.load.image('tpl-dessert-churros',          'templates/dessert/dessert_churros.png');

    // ===== 숲속 도안 v3 19장 (대표님 재세팅 — 동물 + 판타지, 16:9 contain fit) =====
    //   무료 3장: 다람쥐/고슴도치/브론토
    //   유료 16장: 토끼/요정 보물/유니콘/공주님/작은 성/무지개 요정/오리/나비/부엉이/캠프 텐트/여우/양/사슴/곰/사탕 가게/고양이
    this.load.image('tpl-forest-squirrel-free',     'templates/forest/forest_squirrel_free.png');
    this.load.image('tpl-forest-hedgehog-free',     'templates/forest/forest_hedgehog_free.png');
    this.load.image('tpl-forest-brontosaurus-free', 'templates/forest/forest_brontosaurus_free.png');
    this.load.image('tpl-forest-rabbit',            'templates/forest/forest_rabbit.png');
    this.load.image('tpl-forest-fairy-treasure',    'templates/forest/forest_fairy_treasure.png');
    this.load.image('tpl-forest-unicorn',           'templates/forest/forest_unicorn.png');
    this.load.image('tpl-forest-princess',          'templates/forest/forest_princess.png');
    this.load.image('tpl-forest-tower',             'templates/forest/forest_tower.png');
    this.load.image('tpl-forest-fairy-rainbow',     'templates/forest/forest_fairy_rainbow.png');
    this.load.image('tpl-forest-duck',              'templates/forest/forest_duck.png');
    this.load.image('tpl-forest-butterfly',         'templates/forest/forest_butterfly.png');
    this.load.image('tpl-forest-owl',               'templates/forest/forest_owl.png');
    this.load.image('tpl-forest-campfire-tent',     'templates/forest/forest_campfire_tent.png');
    this.load.image('tpl-forest-fox',               'templates/forest/forest_fox.png');
    this.load.image('tpl-forest-sheep',             'templates/forest/forest_sheep.png');
    this.load.image('tpl-forest-deer',              'templates/forest/forest_deer.png');
    this.load.image('tpl-forest-bear',              'templates/forest/forest_bear.png');
    this.load.image('tpl-forest-candy-shop',        'templates/forest/forest_candy_shop.png');
    this.load.image('tpl-forest-cat',               'templates/forest/forest_cat.png');

    // ===== 캐릭터 도감 얼굴샷 (7종, 검정 배경 누끼 처리됨) =====
    this.load.image('char-toseumi',  'characters_dex/toseumi.png');
    this.load.image('char-skunk',    'characters_dex/skunk.png');
    this.load.image('char-bat',      'characters_dex/bat.png');
    this.load.image('char-alien',    'characters_dex/alien.png');
    this.load.image('char-raccoon',  'characters_dex/raccoon.png');
    this.load.image('char-fox',      'characters_dex/fox.png');
    this.load.image('char-blackchi', 'characters_dex/blackchi.png');

    // ===== 우주 악당 (가위바위보용) =====
    this.load.image('villain-skunk-normal', 'villains/skunk-normal.png');
    this.load.image('villain-skunk-lose',   'villains/skunk-lose.png');
    this.load.image('villain-bat-normal',   'villains/bat-normal.png');
    this.load.image('villain-bat-lose',     'villains/bat-lose.png');
    this.load.image('villain-alien-normal', 'villains/alien-normal.png');
    this.load.image('villain-alien-lose',   'villains/alien-lose.png');
    // 외계인 승리 BGM
    this.load.audio('bgm-alien-win', 'sounds/bgm/alien-win.mp3');

    // 로드 진행률 — 별똥별 이동 + 빛 트레일
    this.load.on('progress', (value) => {
      const trackX = this._trackX;
      const trackY = this._trackY;
      const trackW = this._trackW;
      const targetX = trackX + trackW * value;

      // 별 부드럽게 이동
      this.tweens.add({
        targets: this.shootingStar,
        x: targetX,
        duration: 200, ease: 'Sine.easeOut',
      });

      // 별 뒤쪽 빛나는 라인 (지난 영역 강조)
      this.progressBar.clear();
      this.progressBar.fillStyle(0xFFE066, 0.5);
      this.progressBar.fillRoundedRect(trackX, trackY - 1.5, trackW * value, 3, 1.5);
      this.progressBar.fillStyle(0xFFB6C8, 0.7);
      this.progressBar.fillCircle(targetX, trackY, 8);

      // 트레일 별가루 (작은 ✨ 별 뒤에서 페이드)
      if (Math.random() < 0.6) {
        const t = this.add.text(
          targetX - Phaser.Math.Between(15, 30),
          trackY + Phaser.Math.Between(-6, 6),
          ['✨', '✦', '·'][Math.floor(Math.random() * 3)],
          {
            fontSize: `${Phaser.Math.Between(14, 22)}px`,
            color: ['#FFE066', '#FFB6C8', '#FFFFFF'][Math.floor(Math.random() * 3)],
          }
        ).setOrigin(0.5);
        this.tweens.add({
          targets: t,
          x: t.x - Phaser.Math.Between(20, 40),
          y: t.y + Phaser.Math.Between(-4, 12),
          alpha: 0, scale: 0.3,
          duration: 700, ease: 'Cubic.easeOut',
          onComplete: () => t.destroy(),
        });
      }
    });

    // 누락 자산 경고만 (게임은 계속)
    this.load.on('loaderror', (file) => {
      console.warn(`[자산 누락] ${file.src} — 사용자가 아직 만들지 않은 자산일 수 있어요.`);
    });
  }

  create() {
    // ✅ 모든 PNG는 오프라인 sharp 스크립트로 사전 처리됨 (gentle 파이프라인)
    //   - 메뉴 아이콘: scripts/process-menu-icons-multilang.js
    //   - 메모리 카드: scripts/process-memory-cards.js
    //   - 우주악당: gentle 인라인 처리 (erosion 없음 — 내부 디테일 보존)
    //   런타임 cleanTransparency 호출 불필요

    // ===== 메인 메뉴 6장 PNG =====
    // ✅ scripts/process-menu-icons.js로 오프라인 처리됨 (sharp 라이브러리)
    //    흰 배경 → 투명, 가장자리 페더링, alpha binarize, 콘텐츠 박스 트림
    //    이미 깨끗한 RGBA PNG로 저장돼있어서 런타임 처리 불필요

    const nextScene = SaveSystem.hasSeenStory() ? 'MainScene' : 'StoryScene';
    this.cameras.main.fadeOut(800, 15, 8, 32);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(nextScene);
    });
  }

  // ===== 깨끗한 누끼 (gradient alpha + edge feathering) =====
  // 1단계: 가장자리부터 flood-fill로 확실히 흰 영역 → alpha 0
  // 2단계: 가장자리 인접 픽셀들의 alpha를 흰색 거리 기반으로 점진 처리 (anti-aliasing)
  // 3단계: 인접 투명 픽셀 비율로 추가 페더링 (가장자리 부드러움)
  cleanTransparency(key, opts = {}) {
    if (!this.textures.exists(key)) return;
    const {
      bgThreshold   = 235,  // R,G,B 모두 이상이면 확실한 흰 배경
      featherRange  = 30,   // 흰색 거리 페이드 범위 (205~235)
      protectInner  = true, // 가장자리부터 flood fill (안쪽 흰 부분 보호)
    } = opts;

    try {
      const source = this.textures.get(key).getSourceImage();
      if (!source) return;
      const w = source.width;
      const h = source.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const px = imageData.data;
      const transparent = new Uint8Array(w * h);

      // ===== 1단계: 가장자리부터 flood-fill (확실한 흰 배경 영역) =====
      const stack = [];
      if (protectInner) {
        for (let x = 0; x < w; x++) { stack.push([x, 0]); stack.push([x, h - 1]); }
        for (let y = 0; y < h; y++) { stack.push([0, y]); stack.push([w - 1, y]); }
      } else {
        // 모든 픽셀 검사 (안쪽 흰색 보호 X)
        for (let i = 0; i < px.length; i += 4) {
          const minColor = Math.min(px[i], px[i + 1], px[i + 2]);
          if (minColor >= bgThreshold) {
            const vi = i / 4;
            transparent[vi] = 1;
            px[i + 3] = 0;
          }
        }
      }

      if (protectInner) {
        while (stack.length) {
          const [x, y] = stack.pop();
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const vi = y * w + x;
          if (transparent[vi]) continue;
          const idx = vi * 4;
          const minColor = Math.min(px[idx], px[idx + 1], px[idx + 2]);
          if (minColor < bgThreshold) continue;

          transparent[vi] = 1;
          px[idx + 3] = 0;
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
      }

      // ===== 2단계: 가장자리 anti-aliasing (점진적 alpha) =====
      // 투명 영역 인접 + 흰색에 가까운 픽셀들 alpha 페이드
      const featherStart = bgThreshold - featherRange; // 205
      const newAlpha = new Float32Array(w * h);
      for (let i = 0; i < newAlpha.length; i++) {
        newAlpha[i] = px[i * 4 + 3];
      }

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const vi = y * w + x;
          if (transparent[vi]) continue;
          const idx = vi * 4;
          const minColor = Math.min(px[idx], px[idx + 1], px[idx + 2]);

          // 인접 8방향 중 투명한 픽셀 카운트
          let tCount = 0;
          const neighbors = [
            -w - 1, -w, -w + 1,
            -1,           1,
             w - 1,  w,  w + 1,
          ];
          for (const offset of neighbors) {
            if (transparent[vi + offset]) tCount++;
          }

          if (tCount > 0 && minColor >= featherStart) {
            // 흰색에 가깝고 가장자리 → 점진 alpha
            const colorRatio = Math.max(0, Math.min(1, (bgThreshold - minColor) / featherRange));
            const edgeRatio = tCount / 8;
            // 흰색이면서 가장자리에 가까울수록 더 투명하게
            const fadeAmount = colorRatio * 0.7 + edgeRatio * 0.3;
            newAlpha[vi] = Math.min(newAlpha[vi], 255 * (1 - fadeAmount));
          }
        }
      }

      // newAlpha 적용
      for (let i = 0; i < newAlpha.length; i++) {
        px[i * 4 + 3] = Math.floor(newAlpha[i]);
      }

      ctx.putImageData(imageData, 0, 0);
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
    } catch (e) {
      console.warn(`[cleanTransparency fail] ${key}`, e);
    }
  }

  // 호환성 wrapper
  makeTransparentBg(key, threshold = 245) {
    this.cleanTransparency(key, { bgThreshold: threshold, protectInner: false, featherRange: 25 });
  }
  floodFillTransparent(key, threshold = 248) {
    this.cleanTransparency(key, { bgThreshold: threshold, protectInner: true, featherRange: 30 });
  }

  // ===== 투명 픽셀 트림 (콘텐츠 박스로 크롭 + 정사각형 패딩) =====
  // cleanTransparency 이후 호출 — 투명 padding 제거하고 콘텐츠만 남김
  // 결과를 정사각형으로 만들어서 (max dimension 기준) 셀 배치 시 균일하게 보이도록
  trimTransparent(key, padding = 0, {
    makeSquare = true,
    alphaThreshold = 12,
    binarizeFloor = 0,        // alpha < 이 값이면 0으로 (hard edge — soft 잔여물 제거)
  } = {}) {
    if (!this.textures.exists(key)) return;
    try {
      const source = this.textures.get(key).getSourceImage();
      if (!source) return;
      const w = source.width;
      const h = source.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const px = imageData.data;

      // === Binarize alpha — soft 잔여물(반투명 픽셀) 강제 제거 ===
      if (binarizeFloor > 0) {
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < binarizeFloor) px[i + 3] = 0;
        }
        // 수정된 데이터를 캔버스에 다시 적용 (drawImage가 수정된 캔버스를 읽도록)
        ctx.putImageData(imageData, 0, 0);
      }

      // 비투명 픽셀의 bounding box 찾기 (alpha 임계값 — 잔여물 무시)
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const a = px[(y * w + x) * 4 + 3];
          if (a > alphaThreshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < 0) return;   // 전부 투명 → 스킵

      // padding 추가
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(w - 1, maxX + padding);
      maxY = Math.min(h - 1, maxY + padding);

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      // 정사각형으로 패딩 (콘텐츠 중앙 정렬) — 셀 배치 시 균일하게 보임
      const outSize = makeSquare ? Math.max(cropW, cropH) : null;
      const finalW = makeSquare ? outSize : cropW;
      const finalH = makeSquare ? outSize : cropH;
      const offsetX = makeSquare ? Math.floor((outSize - cropW) / 2) : 0;
      const offsetY = makeSquare ? Math.floor((outSize - cropH) / 2) : 0;

      const trimmed = document.createElement('canvas');
      trimmed.width = finalW;
      trimmed.height = finalH;
      const trimmedCtx = trimmed.getContext('2d');
      trimmedCtx.drawImage(canvas, minX, minY, cropW, cropH, offsetX, offsetY, cropW, cropH);

      // Phaser 텍스처 교체
      this.textures.remove(key);
      this.textures.addCanvas(key, trimmed);
    } catch (e) {
      console.warn(`[trimTransparent fail] ${key}`, e);
    }
  }

  // 폰트 워밍업 — Phaser canvas 렌더 캐시 강제 워밍업 (춰/됐/꺼 등 깨지는 글자 방지)
  warmUpFonts() {
    // 게임 내 사용되는 모든 한글 글자 + 자주 깨지는 복합자모 포함
    const sampleChars =
      // 컬러/팔레트
      '벚꽃솜사탕핑크파랑빨강노랑초록보라주황딸기레몬햇살민트인디고우주별나라토슴이그림자크레파스무지개' +
      // 인사/안내
      '잘기억하고같은그림을맞춰보자아쉬워다시한번더해봐천천히찾또만났네반가오늘은어떤색모을' +
      // 게임 진행
      '카드뒤집어볼까집중그림이야야호찾았다와새색이다예쁜오늘의첫색깔봐주세외웠시작' +
      // 가위바위보
      '우주악당과가위바위보판모두기고선물을받친구이겼졌비겼3연승무지개펑짱' +
      // 스타캐치
      '떨어지는아이템캐치별빛바구니준비됐다톡잡었' +
      // 보상
      '보너스반짝마음에들럭키박스선물보석두근아주특별' +
      // UI
      '뒤로새로하기완성되돌리기굵기얇중두꺼지우개크레파스물감컬러원색파스텔반짝이' +
      // 미니게임/탭
      '메모리스타스케치북색칠놀이그림그리기레인보우꽃하트사과나비토끼도안선택' +
      // 기타
      '괜찮응원할게화이팅있어진짜대단그릴자유롭게돌아와줘서고마기다렸오랜만보고싶었놀할' +
      // 로비 토슴이 대사 신규 문자
      '너정말멋져딨까냠꼭거리하루뾰로롱따뜻해져펴기대중꿈물치자스케북우';

    const styles = [FONTS.game, FONTS.bold, FONTS.hand];
    const sizes = ['24px', '32px', '46px', '52px', '56px', '60px', '64px', '76px', '88px', '120px', '200px'];

    styles.forEach(family => {
      sizes.forEach(size => {
        const t = this.add.text(-9999, -9999, sampleChars + '0123456789', {
          fontFamily: family,
          fontSize: size,
        });
        t.setVisible(false);
        this.time.delayedCall(100, () => t.destroy());
      });
    });
  }

  createLoadingUI() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 배경 그라데이션 효과 (단색으로 대체)
    this.cameras.main.setBackgroundColor('#1A0F3E');

    // 별빛 (작은 흰 점들)
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const size = Phaser.Math.Between(1, 3);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      this.tweens.add({
        targets: star,
        alpha: { from: 0.3, to: 1 },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
      });
    }

    // ===== 게임 타이틀 (fulltitle 로고 — 화면 가운데 위쪽) =====
    this.load.once('filecomplete-image-title-full', () => {
      const logo = this.add.image(cx, cy - 100, 'title-full');
      const tex = this.textures.get('title-full').getSourceImage();
      const targetW = 1300;
      logo.setScale(targetW / tex.width);
      logo.setAlpha(0);
      this.tweens.add({ targets: logo, alpha: 1, duration: 500 });
    });

    // ===== 별똥별 로딩 바 — 로고 아래, 정확히 화면 가운데 정렬 =====
    const trackY = cy + 140;             // 로고 아래
    const trackW = 800;                  // 600 → 800 (로고와 비슷한 영역감)
    const trackX = cx - trackW / 2;      // 좌측 시작점 (cx 기준 좌우 대칭)

    // 점선 트랙 배경 (희미한 별 가루)
    const track = this.add.graphics();
    track.fillStyle(0xFFFFFF, 0.15);
    for (let i = 0; i < 24; i++) {
      const dotX = trackX + (i / 23) * trackW;
      track.fillCircle(dotX, trackY, 2);
    }

    // 진행률에 따라 펄럭이는 트레일 (밝은 라인)
    this.progressBar = this.add.graphics();

    // 별똥별 ⭐ (이동)
    this.shootingStar = this.add.text(trackX, trackY, '⭐', {
      fontFamily: FONTS.game, fontSize: '44px',
    }).setOrigin(0.5);
    // 살짝 둥둥 + 회전
    this.tweens.add({
      targets: this.shootingStar,
      angle: { from: -10, to: 10 },
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    // 별 자체의 빛 (작은 글로우)
    this.starGlow = this.add.graphics();

    // 로딩 텍스트 — 정확히 가운데 정렬 (트랙과 같은 cx)
    this.add.text(cx, cy + 220, '준비 중...', {
      fontFamily: FONTS.game,
      fontSize: '28px',
      color: '#FFE4EC',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0.85);

    // 트레일 spawn 함수
    this._trackX = trackX;
    this._trackY = trackY;
    this._trackW = trackW;
  }
}
