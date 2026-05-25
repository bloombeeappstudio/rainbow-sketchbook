// 🎮 레인보우 스케치북 — 게임 진입점
import Phaser from 'phaser';
import { gameConfig } from './config.js';
import BootScene from './scenes/BootScene.js';
import StoryScene from './scenes/StoryScene.js';
import MainScene from './scenes/MainScene.js';
import MyRoomScene from './scenes/MyRoomScene.js';
import CharacterDexScene from './scenes/CharacterDexScene.js';
import CardMatchScene from './scenes/CardMatchScene.js';
import RPSScene from './scenes/RPSScene.js';
import CatchScene from './scenes/CatchScene.js';
import SketchHubScene from './scenes/SketchHubScene.js';
import SketchScene from './scenes/SketchScene.js';
import ColoringScene from './scenes/ColoringScene.js';
import TemplateSelectScene from './scenes/TemplateSelectScene.js';
import GalleryScene from './scenes/GalleryScene.js';
import { IAPSystem } from './systems/IAPSystem.js';
import { AnalyticsSystem } from './systems/AnalyticsSystem.js';

// Capacitor 환경에서 cordova-plugin-purchase 글로벌이 준비되면 IAP 초기화
//   네이티브 deviceready 이벤트가 가장 안전한 시점
document.addEventListener('deviceready', () => {
  IAPSystem.init();
  AnalyticsSystem.init();
}, false);
// 웹 dev 환경 — deviceready 안 와도 init만 호출(자동으로 mock 분기)
if (typeof window !== 'undefined' && !window.cordova) {
  setTimeout(() => {
    IAPSystem.init();
    AnalyticsSystem.init();
  }, 0);
}

const config = {
  ...gameConfig,
  scene: [
    BootScene, StoryScene, MainScene, MyRoomScene, CharacterDexScene,
    CardMatchScene, RPSScene, CatchScene,
    SketchHubScene, SketchScene, ColoringScene, TemplateSelectScene, GalleryScene,
  ],
};

// ⭐ 폰트 로드 완료 후 게임 시작 (한글 폰트가 안 적용되는 문제 방지)
function startGame() {
  const game = new Phaser.Game(config);
  if (import.meta.env?.DEV) window.__game = game;     // dev only — preview/디버그용
}

if (document.fonts && document.fonts.ready) {
  // 핵심 폰트 — 실제 사용 사이즈 + 게임 내 모든 한글 문자 포함해서 미리 로드
  // 안 그러면 Phaser canvas 렌더링 시 특정 글자(춰, 됐, 뿡 등)가 깨질 수 있음
  //
  // ⚠️ 자동 생성: scripts/find_missing_glyphs.js 실행 → 전체 사용 한글 추출
  //    새 텍스트 추가 시 반드시 위 스크립트 다시 돌려서 갱신할 것
  //    (사용자 피드백: "가위바위보 텍스트 깨짐" — KOREAN_GLYPHS 누락 429자 발견 후 교체)
  const KOREAN_GLYPHS =
    // ㄱ
    '가각간갈감갑값갔강갖같개객갤거건걸검게겨격결겹겼경계고곡곧골곱곳공과곽관광괜교구국굴굵귀규균귤그극근글금급긋기긴길김깊까깔깜깝깡깥깨꺄꺼껍께꼬꼭꼴꽃꾸꿀꿈꿔뀜끊끔끗끝끼' +
    // ㄴ ㄷ ㄸ
    '낌나난날남났내낼냅냈냠너넌널넓넘넛네녕노녹놀높누눈뉴느는늘능늬니닉닐님닝' +
    '다단닫달닷당대더던덤덩덮데덱도독돌동돼됐되된됨두둘둠둡둥뒤뒷드득든들듬등디딘딧딨딩따딸' +
    '때떠떤떨떼또똥뛰뜨뜰뜻띠' +
    // ㄹ ㅁ
    '라락란랄람랏랐랑래랙랜략량러럭런럴럼럽레렉렌려력렬렷렸례로록론롤롭롯롱료루룰룸룹률륨르른를름리릭린릴림립릿링' +
    '마막만많말맑맛망맞매맨머먼멀멈멋메멘멜며면명모목몬몸못몽무묶문물뭐뭘므미민밀밌밍' +
    // ㅂ
    '바박반받발밝밤방배백버번벌범법벚베벤벨벼변별병보복본볼봄봐봤부북분불붉붓붙뷰브블비빈빌빛빠빡빨빽뻐뽀뽐뽑뾰뿌뿔뿜뿡쁘쁜삐' +
    // ㅅ
    '사산살상새색생샘샴샵샷서석선설섹성세셀셈셋셔션소속손솔솜솟송쇠수순술숨숭숲쉬스슬슴습슷승시식신실심싱싶싹쌍썬썸씨씩씬' +
    // ㅇ
    '아악안앉않알았앙앞애액앱야약얇양어억언얼업없엇었엉에엔엣여역연열엽영옅옆예옐옛오온올옴옵와완왔외왼요용우운울움웃워원웠위윈유윤율으은을음응의이인일읽임입있잉잎' +
    // ㅈ ㅉ
    '자작잔잘잠잡장재저적전절점접정제져졌조존좀좁종좋좌주죽준줄줌중줘쥐즈즉즐즙증지직진질짐집징' +
    '짜짝짤짧짱째쨍쪽찌' +
    // ㅊ
    '차찬찮참창찾채책챈챔챕처척천첫청체쳐초촉총최추축출춤충춰취츠측치칙친칠침칭' +
    // ㅋ ㅌ
    '카칸캐캔캡커컨컬컴컵컷컹케켓코콕콘콜콤쾅쿠쿨큐크큰클큼키킵킷킹' +
    '타탄탕태택탭터턴테텍텐텔템토톡톤톱통퇴투툴튀튕튜튤트특튼틀티틱팅' +
    // ㅍ ㅎ
    '파판팔팝팡패팩퍼펄펑페펙펫펴편평폐포폭폰폴폼표푸풀품풍프플픔피픽필팁핑' +
    '하한할함합항해핵핸햇했행향허험헤헬현형호혼홀홈홍화확환활황회획효후훔훗훨흐흔흡흩희흰히힌' +
    // 갤러리/색칠/스케치/퀘스트 신규 (대부분 코멘트 — 안전상 추가)
    //   + 카테고리 8개 확장 ('가족', '탈 것' 등 신규 한글)
    '갭갱것겠견괄꽉넣닥담듦띄류멍삭쌓싸엄옮젠족탬탈퀘폿핫휴흑힘' +
    // 사파리 도안명(낙타/앵무새/페넥여우/얼룩말) + IAP 팝업 + 기타 신규
    '낙낮넥답덧룩밑밴뺏숫쓰앵였즘짙학혜' +
    // IAP 법적 고지 (미성년자/년, Google청구됩니다/됩) + 버튼 주석 (아닌/닌, 플랫/랫)
    '년닌랫됩앤' +
    // 메인 카드 일러스트 주석 (창문십자/몰딩벽/스포트라이트/책등뼈/크레파스펜/펼쳐진 등)
    '땅뚝몰벽붕뼈삼십염펜펼' +
    // 로비 우주선 + 외계인 (UFO 돔/빛 빔/사다리꼴 알파/방향 flip/링크 끌어다 등)
    '끌돔령빔' +
    // UFO 강하 시퀀스 (시퀀스/슈우우웅/막 나오는 듯)
    '듯슈웅퀀' +
    // IAP 결제 (다이얼로그/하셨나요/웹 dev)
    '딜셨웹' +
    // Firebase Analytics 어린이 모드 주석 (익명/앨범/타겟팅 제외 가이드)
    '겟앨익' +
    // 갤러리 공유 모듈 주석 (공용 모듈/부모 게이트)
    '듈' +
    // 팔레트 그리드 주석 (딥 톤 + 액센트)
    '딥센' +
    // 색칠 도구 텍스쳐 주석 (왁스/점찍/밖/묻 등 도구 동작 설명)
    '될묻밖왁찍' +
    // 크레파스 그래뉼라 텍스쳐 주석 (그래뉼/빈틈)
    '뉼틈' +
    // 팝업 가드 주석 (클릭이 캔버스까지 흘러감)
    '흘' +
    // 사이드바 좌우 분리 주석 (바뀌고)
    '뀌' +
    // UFO 드랍 + 슝 회수 + 회오리 사탕 주석
    '랍쇄슝' +
    // 별똥별/삐리삐리뽀 효과 주석 (반짝이 점멸 등)
    '멸' +
    // 사이드바 도구/컬러 동적 반영 주석 (끼워/삽입)
    '껴삽' +
    // 도안 한글 이름 (냥/봉 — 다람쥐/봉제인형 등)
    '냥봉' +
    // 디저트/숲속 카테고리 신규 한글 (햄버거/밀크쉐이크/찻주전자/츄러스/캠프/볏공룡 등)
    '곰돈룡볏섯쉐찻츄캠햄' +
    // 다시하기/크레파스 끊김 회귀 봉합 주석 (눌렀을때/닿아도/클램프/쭉 누르면/프레임)
    '눌닿램렀쭉' +
    // 도안 라인 dilation 자동 마감 주석 (라인이 뚫려있는)
    '뚫' +
    // 숲속 v2 신규 도안 한글 (달팽이)
    '팽';
  const SIZES = [24, 32, 48, 56, 64, 76, 88, 120, 200];
  const FAMILIES = ['Jua', 'Do Hyeon', 'Gaegu'];

  const promises = [];
  FAMILIES.forEach(family => {
    SIZES.forEach(size => {
      promises.push(document.fonts.load(`${size}px "${family}"`, KOREAN_GLYPHS));
    });
  });

  Promise.all(promises)
    .then(() => document.fonts.ready)
    .then(startGame)
    .catch(() => startGame());     // 실패해도 게임은 시작
} else {
  startGame();
}
