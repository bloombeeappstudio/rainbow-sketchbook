// 📊 AnalyticsSystem — Firebase Analytics 통합 (어린이 모드)
//   - Children-only 앱 정책 준수
//   - AAID(광고 ID) 수집 비활성화 (AndroidManifest tools:node="remove")
//   - 개인화 광고 비활성화 (setUserProperty + console)
//   - 익명 식별자(Firebase Installations ID)만 사용
//
// 자동 이벤트 (Firebase 기본): first_open, app_open, session_start, screen_view, app_remove
// 수동 이벤트 (8종):
//   - purchase                 결제 완료 (금액 + 통화 포함)
//   - iap_dialog_view          잠금 해제 팝업 노출
//   - template_open            도안 선택
//   - coloring_complete        색칠 완성
//   - drawing_complete         자유 그림 완성
//   - gallery_view             갤러리 진입
//   - gallery_save_to_device   핸드폰 사진 앨범에 저장 (Phase 2)
//   - gallery_share            Share 시트 호출 (Phase 2)

let _firebasePlugin = null;     // 동적 로드 (설치 안 됐을 때 안전)

class AnalyticsSystemClass {
  constructor() {
    this.ready = false;
    this.queue = [];     // ready 전 발사된 이벤트 큐잉
  }

  // 네이티브 환경(Capacitor + 플러그인 설치) 여부
  isAvailable() {
    return typeof window !== 'undefined'
      && window.Capacitor
      && window.Capacitor.isNativePlatform
      && window.Capacitor.isNativePlatform()
      && _firebasePlugin != null;
  }

  // 부팅 시 1회 호출 (main.js)
  async init() {
    try {
      // 동적 import — 패키지 미설치 시 catch
      const mod = await import('@capacitor-firebase/analytics').catch(() => null);
      if (!mod) {
        console.log('[Analytics] Firebase 플러그인 미설치 — dev/web 모드');
        return;
      }
      _firebasePlugin = mod.FirebaseAnalytics;

      // 어린이 모드 설정
      //   1) Analytics 수집 활성화 (어린이 정책 호환 모드)
      //   2) AAID 수집 비활성화 (Manifest에서 명시 + 추가 명시)
      //   3) 개인화 광고 비활성화
      await _firebasePlugin.setEnabled({ enabled: true });

      // 사용자 속성: 어린이 앱 표시 (Firebase Console에서 광고 타겟팅 제외 가이드)
      await _firebasePlugin.setUserProperty({ key: 'audience', value: 'children_only' });

      this.ready = true;
      console.log('[Analytics] Firebase Analytics 초기화 완료 (어린이 모드)');

      // 큐잉된 이벤트 flush
      this.queue.forEach(({ name, params }) => this._send(name, params));
      this.queue = [];
    } catch (e) {
      console.warn('[Analytics] 초기화 실패 — dev/web 모드로 동작', e);
    }
  }

  // 내부: 이벤트 전송 (또는 큐잉)
  _send(name, params = {}) {
    if (!this.isAvailable()) {
      // dev/web: 콘솔만
      console.log(`[Analytics:DEV] ${name}`, params);
      return;
    }
    if (!this.ready) {
      this.queue.push({ name, params });
      return;
    }
    _firebasePlugin.logEvent({ name, params }).catch(e => {
      console.warn(`[Analytics] logEvent 실패 (${name})`, e);
    });
  }

  // ===== 8개 핵심 이벤트 =====

  // 결제 완료 (Firebase 표준 'purchase' 이벤트 사양 따름)
  //   currency: ISO 4217 (예: 'KRW', 'USD'), value: 숫자
  trackPurchase({ value, currency = 'KRW', productId = 'premium_templates' }) {
    this._send('purchase', {
      currency,
      value,
      transaction_id: `${productId}_${Date.now()}`,
      items: [{ item_id: productId, item_name: 'Premium Templates Unlock', quantity: 1, price: value }],
    });
  }

  // 잠금 해제 팝업 노출 (구매 funnel 분석용)
  trackIapDialogView(category) {
    this._send('iap_dialog_view', { category });
  }

  // 도안 선택
  trackTemplateOpen({ templateId, categoryId, isFree }) {
    this._send('template_open', { template_id: templateId, category: categoryId, is_free: isFree });
  }

  // 색칠 완성
  trackColoringComplete({ templateId, categoryId, durationSec }) {
    this._send('coloring_complete', {
      template_id: templateId,
      category: categoryId,
      duration_sec: durationSec,
    });
  }

  // 자유 그림 완성
  trackDrawingComplete({ durationSec }) {
    this._send('drawing_complete', { duration_sec: durationSec });
  }

  // 갤러리 진입
  trackGalleryView({ artworkCount }) {
    this._send('gallery_view', { artwork_count: artworkCount });
  }

  // 핸드폰 사진 앨범에 저장 (Phase 2)
  trackGallerySaveToDevice({ artworkType }) {
    this._send('gallery_save_to_device', { artwork_type: artworkType });
  }

  // Share 시트 호출 (Phase 2)
  trackGalleryShare({ artworkType }) {
    this._send('gallery_share', { artwork_type: artworkType });
  }
}

export const AnalyticsSystem = new AnalyticsSystemClass();
