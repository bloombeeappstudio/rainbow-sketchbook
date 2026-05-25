// 💎 IAPSystem — Google Play Billing 통합 (cordova-plugin-purchase v13)
//   상품: premium_templates (NON_CONSUMABLE, 1회 결제 모든 도안 영구 해금)
//   - 네이티브 환경(Android Capacitor): 실제 Google Play Billing API 호출
//   - 웹 dev 환경: mock 처리 (UI는 동작, 실제 결제 X)
//   - 영수증 검증: 클라이언트 측 (v13 자동 검증 사용)
//   - 복원: store.restorePurchases() — 재설치/새 기기 대응
import { SaveSystem } from './SaveSystem.js';
import { AnalyticsSystem } from './AnalyticsSystem.js';

const PRODUCT_ID = 'premium_templates';
const PLATFORM_GOOGLE = 'android-playstore';

class IAPSystemClass {
  constructor() {
    this.store = null;
    this.product = null;
    this.ready = false;
    this._readyCallbacks = [];
    this._purchaseCallbacks = [];
    this._errorCallbacks = [];
  }

  // 네이티브 환경 + 플러그인 존재 여부
  isAvailable() {
    return typeof window !== 'undefined' && window.CdvPurchase != null;
  }

  // 부팅 시 1회 호출 (main.js에서)
  init() {
    if (!this.isAvailable()) {
      console.log('[IAP] dev/web mode — 실제 결제 비활성. UI mock 동작');
      return;
    }
    const { store, ProductType, Platform } = window.CdvPurchase;
    this.store = store;

    // 상품 등록
    store.register([{
      id: PRODUCT_ID,
      type: ProductType.NON_CONSUMABLE,
      platform: Platform.GOOGLE_PLAY,
    }]);

    // 이벤트 핸들러
    store.when()
      .approved(transaction => transaction.verify())   // 클라 측 영수증 검증
      .verified(receipt => {
        this._onPurchaseSuccess(receipt);
        receipt.finish();
      })
      .unverified(receipt => {
        console.warn('[IAP] 영수증 검증 실패', receipt);
        this._fireError('영수증 검증에 실패했어요. 다시 시도해 주세요.');
      })
      .failed(error => {
        console.warn('[IAP] 결제 실패', error);
        // 사용자 취소는 무시
        if (error.code !== window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
          this._fireError('결제가 완료되지 않았어요. 잠시 후 다시 시도해 주세요.');
        }
      });

    // 스토어 초기화
    store.initialize([Platform.GOOGLE_PLAY]).then(() => {
      this.ready = true;
      this.product = store.get(PRODUCT_ID, Platform.GOOGLE_PLAY);
      console.log('[IAP] 스토어 초기화 완료', this.product?.pricing);
      this._readyCallbacks.forEach(cb => cb());
      this._readyCallbacks = [];
    }).catch(e => {
      console.warn('[IAP] 스토어 초기화 실패', e);
    });
  }

  // 결제 시작 — 잠금 해제 팝업의 "결제하기" 버튼이 호출
  //   반환: { success, error?, mock? }
  //   실제 결제 완료는 onPurchaseSuccess callback으로 전달
  async purchase() {
    if (!this.isAvailable()) {
      return { success: false, mock: true };
    }
    if (!this.ready || !this.product) {
      return { success: false, error: '스토어 준비 중이에요. 잠시 후 다시 시도해 주세요.' };
    }
    try {
      const offer = this.product.getOffer();
      if (!offer) return { success: false, error: '상품 정보를 불러올 수 없어요.' };
      const result = await this.store.order(offer);
      if (result && result.isError) {
        return { success: false, error: result.message || '결제를 시작할 수 없어요.' };
      }
      return { success: true };
    } catch (e) {
      console.warn('[IAP] purchase 예외', e);
      return { success: false, error: e?.message || '결제 중 오류가 발생했어요.' };
    }
  }

  // 복원 — "이전에 결제하셨나요? 복원하기" 텍스트 링크가 호출
  async restore() {
    if (!this.isAvailable()) {
      return { success: false, mock: true };
    }
    if (!this.ready) {
      return { success: false, error: '스토어 준비 중이에요.' };
    }
    try {
      await this.store.restorePurchases();
      // restored 영수증은 store.when().verified() 콜백으로 처리됨
      return { success: true };
    } catch (e) {
      console.warn('[IAP] restore 예외', e);
      return { success: false, error: e?.message || '복원 중 오류가 발생했어요.' };
    }
  }

  // 해금 상태 — SaveSystem의 영구 저장값 기반
  //   ⚠️ 임시: 대표님 도안 라인 검증용 전체 잠금 해제 (Task #65)
  //   배포 전 반드시 이 한 줄 제거할 것! (return 아래 SaveSystem 로직 복원)
  isPremiumUnlocked() {
    return true;     // 🔓 TEMP: 도안 검증 후 제거
    // eslint-disable-next-line no-unreachable
    const save = SaveSystem.load();
    // 신구 필드 양쪽 호환 (starlightArtistPack은 v0.3 이전 호환용)
    return !!(save.iap?.premiumTemplates || save.iap?.starlightArtistPack);
  }

  // 가격 표시 (locale 자동)
  getPriceText() {
    if (this.isAvailable() && this.product?.pricing?.price) {
      return this.product.pricing.price;
    }
    return '₩2,500';   // dev/fallback
  }

  // 콜백 등록
  onReady(cb)     { this.ready ? cb() : this._readyCallbacks.push(cb); }
  onPurchase(cb)  { this._purchaseCallbacks.push(cb); }
  onError(cb)     { this._errorCallbacks.push(cb); }

  // 내부: 결제/복원 성공 시 SaveSystem 저장 + 콜백 호출
  _onPurchaseSuccess(receipt) {
    const data = SaveSystem.load();
    if (!data.iap) data.iap = {};
    data.iap.premiumTemplates = true;
    SaveSystem.save(data);
    console.log('[IAP] 해금 완료 — premiumTemplates = true');

    // Firebase Analytics — purchase 이벤트 (Firebase 표준 사양)
    //   금액은 영수증/상품에서 추출, 실패 시 fallback ₩2,500
    const price = receipt?.transactions?.[0]?.products?.[0]?.priceMicros
      ? receipt.transactions[0].products[0].priceMicros / 1_000_000
      : 2500;
    const currency = receipt?.transactions?.[0]?.products?.[0]?.currency || 'KRW';
    AnalyticsSystem.trackPurchase({ value: price, currency, productId: PRODUCT_ID });

    this._purchaseCallbacks.forEach(cb => cb(receipt));
  }

  _fireError(msg) {
    this._errorCallbacks.forEach(cb => cb(msg));
  }
}

export const IAPSystem = new IAPSystemClass();
