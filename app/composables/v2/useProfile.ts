import {computed, ref, watch} from 'vue';
import {z} from 'zod';
import {publicBusinessPhotos} from '@otosanayide/core/business-photos';
import {parsePublicReviews} from '@otosanayide/core/public-reviews-client';
import {ownReviewView, type OwnReviewView} from '@otosanayide/core/review-author-client';
import {useApp} from '~/composables/useApp';
import {apiUrl} from '~/lib/api';
import {callApi, errorStatus} from '~/lib/api-read';
import {ReportError, submitBusinessReport, type ReportReason} from '~/lib/business-report';
import {demoMode, publicEnv} from '~/lib/env';
import {
  reviewBody, reviewCreated, reviewEditBody, reviewReportBody, reviewView,
  type ProfilePhotoView, type ProfileReviewView, type ReviewAnswers, type ReviewReportReason, type ReviewSummaryView,
} from '~/lib/v2/profile';

/**
 * Browser-side data of a live profile (/servis/[id]): reviews (GET /api/reviews?v=2), the member's own
 * review (GET /api/reviews/mine?v=2), writing a review (POST /api/reviews), editing it (PATCH
 * /api/reviews/mine, action edit), reporting a review with a reason (POST /api/review-cases), reporting
 * wrong data (POST /api/businesses/{id}/reports) and public photos (GET /api/businesses/photos/public,
 * only with NUXT_PUBLIC_BUSINESS_PHOTOS_ENABLED). Nothing here runs in demo mode or during SSR.
 * An API without v2-03 answers `v=2` with 400; the reads then fall back to the v1 shape once.
 */
export function useProfileLive(businessId: string, initialSummary: ReviewSummaryView) {
  const app = useApp();
  const route = useRoute();
  const live = !demoMode();

  const reviews = ref<ProfileReviewView[]>([]);
  const summary = ref<ReviewSummaryView>(initialSummary);
  const state = ref<'loading' | 'ready' | 'error'>('loading');
  const error = ref('');
  const next = ref<string | null>(null);
  const loadingMore = ref(false);

  let v2 = true;
  async function readV2<T>(path: string, token: string | undefined, decode: (raw: unknown) => T): Promise<T> {
    const join = path.includes('?') ? '&' : '?';
    try {
      return await callApi(v2 ? `${path}${join}v=2` : path, token ? {token} : {}, decode);
    } catch (e) {
      if (!v2 || errorStatus(e) !== 400) throw e;
      v2 = false;
      return callApi(path, token ? {token} : {}, decode);
    }
  }

  const reviewMedia = (id: string, thumbnail: boolean) => apiUrl(`/api/review-photos/media?id=${encodeURIComponent(id)}${thumbnail ? '&size=thumbnail' : ''}`);

  async function loadReviews(after?: string) {
    if (!live) return;
    if (after) loadingMore.value = true;
    else state.value = 'loading';
    error.value = '';
    try {
      const query = new URLSearchParams({businessId});
      if (after) query.set('after', after);
      const page = await readV2(`/api/reviews?${query}`, undefined, parsePublicReviews);
      const items = page.reviews.map((item) => reviewView(item, reviewMedia));
      reviews.value = after ? [...reviews.value, ...items.filter((r) => !reviews.value.some((x) => x.id === r.id))] : items;
      next.value = page.nextCursor;
      summary.value = {count: page.count, average: page.average};
      state.value = 'ready';
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Yorumlar yüklenemedi.';
      if (after) app.notify(message);
      else {
        error.value = message;
        state.value = 'error';
      }
    } finally {
      loadingMore.value = false;
    }
  }

  // The member's own review decides whether "Deneyimini paylaş" opens the form or the existing review.
  const own = ref<OwnReviewView | null>(null);
  const ownState = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
  async function loadOwn() {
    own.value = null;
    const user = app.user;
    if (!live || !user) {
      ownState.value = 'idle';
      return;
    }
    ownState.value = 'loading';
    try {
      const result = await readV2(`/api/reviews/mine?businessId=${encodeURIComponent(businessId)}`, await user.getIdToken(), (raw) => z.object({review: ownReviewView.nullable()}).strict().parse(raw));
      if (app.user?.uid !== user.uid) return;
      own.value = result.review;
      ownState.value = 'ready';
    } catch {
      // Unknown: the form stays usable and a duplicate is reported by the API (409).
      ownState.value = 'error';
    }
  }

  async function token() {
    const user = app.user;
    if (!user) throw Error('Giriş yapman gerekli.');
    return user.getIdToken();
  }

  async function submitReview(answers: ReviewAnswers) {
    const body = reviewBody(businessId, answers);
    const created = await callApi('/api/reviews', {method: 'POST', body, token: await token()}, (raw) => reviewCreated.parse(raw));
    await loadOwn();
    return created;
  }

  /** Edit of the member's own review; the API puts it back into moderation. A stale version is a 409. */
  async function editReview(answers: ReviewAnswers) {
    const current = own.value;
    if (!current) throw Error('Yorumun bulunamadı. Sayfayı yenileyip tekrar dene.');
    const body = reviewEditBody(businessId, current.version, answers);
    try {
      await callApi('/api/reviews/mine', {method: 'PATCH', body, token: await token()}, (raw) => z.object({ok: z.literal(true), status: z.literal('pending')}).strict().parse(raw));
    } catch (e) {
      if (errorStatus(e) === 409) {
        await loadOwn();
        throw Error('Yorumun başka bir yerde değişti. Güncel hali yüklendi; tekrar dene.');
      }
      throw e;
    }
    await loadOwn();
    return {id: current.id, status: 'pending'};
  }

  async function reportReview(reviewId: string, reason: ReviewReportReason, text: string) {
    const body = reviewReportBody(reviewId, reason, text);
    await callApi('/api/review-cases', {method: 'POST', body, token: await token()}, (raw) => z.object({ok: z.literal(true)}).strict().parse(raw));
  }

  // One operation id per opened S08 dialog: a resend after a lost answer is the same report (web-04).
  let reportOperation = '';
  function newReportOperation() {
    reportOperation = crypto.randomUUID();
  }
  async function reportBusiness(reason: ReportReason, note: string) {
    if (!reportOperation) newReportOperation();
    try {
      await submitBusinessReport(businessId, {reason, note}, await token(), reportOperation);
    } catch (e) {
      if (e instanceof ReportError) throw e;
      if (e instanceof z.ZodError) throw Error('Bildirimi kontrol et. “Diğer” için en az 10 karakter açıklama yaz.');
      throw e instanceof Error ? e : Error('Bildirim gönderilemedi. Daha sonra tekrar dene.');
    }
  }

  const photos = ref<ProfilePhotoView[]>([]);
  async function loadPhotos(name: string) {
    if (!live || !publicEnv().businessPhotosEnabled) return;
    try {
      const list = await callApi(`/api/businesses/photos/public?businessId=${encodeURIComponent(businessId)}`, {}, (raw) => {
        const value = publicBusinessPhotos.parse(raw);
        if (value.businessId !== businessId) throw Error('photo_binding');
        return value;
      });
      const ids = list.coverId ? [list.coverId, ...list.ids.filter((id) => id !== list.coverId)] : list.ids;
      const media = (id: string, size = '') => apiUrl(`/api/businesses/photos/media?businessId=${encodeURIComponent(businessId)}&id=${encodeURIComponent(id)}${size}`);
      photos.value = ids.map((id, i) => ({src: media(id), thumb: media(id, '&size=thumbnail'), alt: i === 0 ? `${name} kapak fotoğrafı` : `${name} işletme fotoğrafı ${i + 1}`}));
    } catch {
      // Photos are optional: the no-photo cover stays.
      photos.value = [];
    }
  }

  const signInHref = computed(() => `/giris?donus=${encodeURIComponent(route.fullPath)}`);

  // Called by the page once the business is known (after mount, or after a successful retry).
  let started = false;
  function start(name: string) {
    if (!live || started || !import.meta.client) return;
    started = true;
    void loadReviews();
    void loadPhotos(name);
    void loadOwn();
  }
  // Signing in or out on the page re-reads the member's own review.
  watch(() => app.user?.uid ?? null, () => {
    if (started) void loadOwn();
  });

  return {
    live,
    reviews,
    summary,
    state,
    error,
    hasMore: computed(() => !!next.value),
    loadingMore,
    retry: () => loadReviews(),
    more: () => (next.value ? loadReviews(next.value) : Promise.resolve()),
    own,
    ownState,
    submitReview,
    editReview,
    reportReview,
    reportBusiness,
    newReportOperation,
    photos,
    start,
    signInHref,
  };
}
