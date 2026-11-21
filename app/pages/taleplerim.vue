<script setup lang="ts">
import {computed, reactive, ref} from 'vue';
import {ChevronRight, Inbox, RefreshCw} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import OfferMessages from '~/components/v2/requests/OfferMessages.vue';
import OfferPickCard from '~/components/v2/requests/OfferPickCard.vue';
import OfferQuoteCard from '~/components/v2/requests/OfferQuoteCard.vue';
import {useLocale} from '~/composables/useLocale';
import {useMemberPage} from '~/composables/useMemberPage';
import {useMemberRequests, useRequestThread} from '~/composables/v2/useRequests';
import {
  mockRequestById, mockRequests, offerTotal, requestBusiness, requestStatusLabel,
  type MockOffer, type OfferMessage, type OfferStatus, type RequestStatus,
} from '~/data/mock/requests';
import {demoMode} from '~/lib/env';
import {cancelProblem, cancelReasons, slotLabel, threadMessage, type CancelReason, type OfferCardView, type RequestView} from '~/lib/v2/requests';

// W15 · Taleplerim · Teklif ayrıntısı (Figma 126:734). The top part (header, Ön teklif, Mesajlar) is the
// Figma frame; below it the request's incoming offers and the member's other requests.
// ?talep=<id> selects a request, ?teklif=<id> one of its offers.
// Demo: mock requests with several offers each. Live: GET /api/requests?v=2 — a request goes to one
// business and carries at most one offer; accept/cancel use PATCH /api/requests, the thread uses
// /api/requests/messages. The API has no "undo", so a declined offer stays declined. v2-01: the
// reference (R-YYYY-NNNNNN), created time, 48-hour answer deadline, "görüldü" state, contact
// preference/time window, the reason code of a closed request and the `expired`/`no_show` statuses
// are shown; cancel sends a reason code (found_other | price | timing | other; other needs a text).
useMemberPage();
const demo = demoMode();
const {t, localeTag} = useLocale();

useSeoMeta({title: () => t('Taleplerim'), robots: 'noindex, nofollow'});

const route = useRoute();
const router = useRouter();

/* ---------------------------------------------------------------- demo */
// Mock state shared across client navigation (accept → /randevu → back keeps the decision).
const statuses = useState<Record<string, OfferStatus>>('v2-req-offer-status', () =>
  Object.fromEntries(mockRequests.flatMap((request) => request.offers.map((offer) => [offer.id, offer.status]))));
const threads = useState<Record<string, OfferMessage[]>>('v2-req-messages', () =>
  Object.fromEntries(mockRequests.flatMap((request) => request.offers.map((offer) => [offer.id, [...offer.messages]]))));
const chosen = reactive<Record<string, string>>({});

const mockRequest = computed(() => mockRequestById(String(route.query.talep ?? '')) ?? mockRequests[0]!);
const statusOf = (offer: MockOffer) => statuses.value[offer.id] ?? offer.status;

const mockOffer = computed<MockOffer | undefined>(() => {
  const offers = mockRequest.value.offers;
  const pickedId = chosen[mockRequest.value.id] ?? String(route.query.teklif ?? '');
  return offers.find((item) => item.id === pickedId)
    ?? offers.find((item) => statusOf(item) === 'accepted')
    ?? offers[0];
});
const cheapestId = computed(() => {
  const open = mockRequest.value.offers.filter((item) => statusOf(item) !== 'rejected');
  if (open.length < 2) return '';
  return open.reduce((best, item) => (offerTotal(item) < offerTotal(best) ? item : best)).id;
});

function requestState(id: string): RequestStatus {
  const item = mockRequestById(id)!;
  if (item.offers.some((entry) => statusOf(entry) === 'accepted')) return item.status === 'closed' ? 'closed' : 'scheduled';
  return item.status;
}
const stateTone = (state: RequestStatus) => (state === 'offers' ? 'orange' : state === 'scheduled' ? 'lime' : 'cream');

function select(target: {id: string}) {
  chosen[mockRequest.value.id] = target.id;
}
function mockAccept() {
  if (!mockOffer.value) return;
  const current = mockOffer.value;
  statuses.value = {...statuses.value, [current.id]: 'accepted'};
  void router.push(`/randevu?servis=${current.businessId}&teklif=${current.id}`);
}
function setStatus(status: OfferStatus) {
  if (mockOffer.value) statuses.value = {...statuses.value, [mockOffer.value.id]: status};
}
function mockSend(text: string) {
  if (!mockOffer.value) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
  const id = mockOffer.value.id;
  threads.value = {...threads.value, [id]: [...(threads.value[id] ?? []), {from: 'member', text, time}]};
}

/* ---------------------------------------------------------------- live */
const live = useMemberRequests();
const liveRequest = computed<RequestView | undefined>(() => {
  const views = live.views.value;
  return views.find((item) => item.id === route.query.talep) ?? views[0];
});
const thread = useRequestThread(() => (demo ? '' : liveRequest.value?.id ?? ''));
const actionError = ref('');
const cancelOpen = ref(false);
const cancelCode = ref<CancelReason | ''>('');
const cancelText = ref('');
const cancelTried = ref(false);
const cancelError = computed(() => cancelProblem(cancelCode.value, cancelText.value, t));

async function liveAccept() {
  const current = liveRequest.value;
  if (!current) return;
  actionError.value = '';
  try {
    await live.accept(current);
    if (current.kind === 'quotes') void router.push(`/randevu?servis=${encodeURIComponent(current.businessId)}&talep=${encodeURIComponent(current.id)}`);
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('İşlem tamamlanamadı.');
  }
}
function openCancel() {
  cancelCode.value = '';
  cancelText.value = '';
  cancelTried.value = false;
  actionError.value = '';
  cancelOpen.value = true;
}
async function liveCancel() {
  const current = liveRequest.value;
  cancelTried.value = true;
  if (!current || !cancelCode.value || cancelError.value) return;
  try {
    await live.cancel(current, cancelCode.value, cancelText.value);
    cancelOpen.value = false;
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : t('İşlem tamamlanamadı.');
    cancelOpen.value = false;
  }
}

/* ---------------------------------------------------------------- one view for the template */
interface DetailOffer {offer: OfferCardView; status: OfferStatus; business?: {name: string}}
const ready = computed(() => demo || (live.loaded.value && !!liveRequest.value));
/** Demo offers as the cards draw them: the mock's Turkish line labels and dates go through `t`; notes stay as "written". */
const demoOffer = (item: MockOffer): OfferCardView => ({...item, validUntil: t(item.validUntil), lines: item.lines.map((line) => ({...line, item: t(line.item)}))});
const requestId = computed(() => (demo ? mockRequest.value.id : liveRequest.value?.id ?? ''));
const offer = computed<DetailOffer | undefined>(() => {
  if (demo) return mockOffer.value ? {offer: demoOffer(mockOffer.value), status: statusOf(mockOffer.value)} : undefined;
  const current = liveRequest.value;
  return current?.offer && current.offerStatus ? {offer: current.offer, status: current.offerStatus, business: {name: current.businessName}} : undefined;
});
const businessName = computed(() => (demo ? (mockOffer.value ? requestBusiness(mockOffer.value.businessId)?.name : undefined) : liveRequest.value?.businessName));
const subtitle = computed(() => {
  const r = demo ? mockRequest.value : liveRequest.value;
  // Demo service names are our labels; a live request's service is the member's own text.
  // Live services are the Turkish names the member picked (or the business's own); known ones translate.
  return r ? [businessName.value, t(r.service), r.vehicle].filter(Boolean).join(' · ') : '';
});
const headStatus = computed(() => {
  if (!demo) {
    const current = liveRequest.value;
    return current ? {label: current.statusLabel, tone: current.tone} : {label: '', tone: 'cream'};
  }
  if (!offer.value) return {label: t(requestStatusLabel[requestState(mockRequest.value.id)]), tone: 'cream'};
  const status = offer.value.status;
  if (status === 'accepted') return {label: t('Kabul edildi'), tone: 'lime'};
  if (status === 'rejected') return {label: t('Reddedildi'), tone: 'cream'};
  return {label: t('Karar bekleniyor'), tone: 'orange'};
});
const offers = computed<DetailOffer[]>(() => (demo
  ? mockRequest.value.offers.map((item) => ({offer: demoOffer(item), status: statusOf(item)}))
  : offer.value ? [offer.value] : []));
const messages = computed(() => (demo
  ? (mockOffer.value ? threads.value[mockOffer.value.id] ?? [] : []).map((message) => ({...message, time: slotLabel(message.time, localeTag.value)}))
  : thread.items.value.map((message) => threadMessage(message, localeTag.value))));
const rows = computed(() => (demo
  ? mockRequests.map((item) => {
    const state = requestState(item.id);
    return {
      id: item.id, meta: `#${item.id} · ${t(item.createdText)}`, title: `${t(item.service)} · ${item.vehicle}`,
      count: item.offers.length ? t('{count} teklif', {count: item.offers.length}) : t('Teklif yok'), label: t(requestStatusLabel[state]), tone: stateTone(state),
    };
  })
  : live.views.value.map((item) => ({
    id: item.id, meta: [item.code, item.businessName, item.createdShort].filter(Boolean).join(' · '), title: `${t(item.service)} · ${item.vehicle}`,
    count: item.offer ? t('1 yanıt') : item.status === 'requested' && item.seenText ? t('Görüldü') : t('Yanıt yok'), label: item.statusLabel, tone: item.tone,
  }))));
const headTitle = computed(() => {
  if (demo) return offer.value ? t('Teklif #{code}', {code: offer.value.offer.code}) : t('Talep #{code}', {code: requestId.value});
  const code = liveRequest.value?.code ?? '';
  return offer.value ? t('Teklif {code}', {code}) : t('Talep {code}', {code});
});
/** Live: the "görüldü" line while the business has not answered yet. */
const seenLine = computed(() => {
  const current = liveRequest.value;
  if (!current || current.status !== 'requested' || current.seenText === null) return '';
  return current.seenText ? t('İşletme talebini gördü · {time}', {time: current.seenText}) : t('İşletme talebini henüz görmedi.');
});
const respondLine = computed(() => {
  const current = liveRequest.value;
  if (!current?.respondByText) return '';
  return current.respondByPassed ? t('Yanıt süresi geçti. İşletme yine de yanıt verebilir ya da talep kapanır.') : t('İşletmenin yanıt süresi: {time}', {time: current.respondByText});
});
const bookingTo = computed(() => {
  const current = liveRequest.value;
  return demo || !current ? undefined : current.kind === 'quotes' ? `/randevu?servis=${encodeURIComponent(current.businessId)}&talep=${encodeURIComponent(current.id)}` : null;
});
</script>

<template>
  <div class="account v2-wrap">
    <V2AccountMenu active="taleplerim"/>

    <div class="col">
      <template v-if="!demo && !ready">
        <header class="head">
          <div class="titles">
            <p class="t-mono-md t-eyebrow">{{ t('TALEPLERİM') }}</p>
            <h1 class="t-h2">{{ t('Taleplerim') }}</h1>
          </div>
        </header>
        <p v-if="live.loading.value" class="t-body-md t-muted" role="status">{{ t('Talepler yükleniyor…') }}</p>
        <section v-else-if="live.error.value" class="empty surface" role="alert">
          <h2 class="t-h4">{{ t('Talepler yüklenemedi') }}</h2>
          <p class="t-body-md t-muted">{{ live.error.value }}</p>
          <V2Button variant="outline" @click="live.load()"><RefreshCw aria-hidden="true"/>{{ t('Tekrar dene') }}</V2Button>
        </section>
        <section v-else-if="live.loaded.value" class="empty surface">
          <span class="empty-icon" aria-hidden="true"><Inbox :size="26"/></span>
          <h2 class="t-h4">{{ t('Henüz talebin yok') }}</h2>
          <p class="t-body-md t-muted">{{ t('Bir işletmenin profilinden teklif ya da randevu iste; yanıtlar burada görünür.') }}</p>
          <V2Button to="/ara" variant="outline" arrow>{{ t('Servis bul') }}</V2Button>
        </section>
      </template>

      <template v-else>
        <header class="head">
          <div class="titles">
            <p class="t-mono-md t-eyebrow">{{ offer ? t('TALEPLERİM · TEKLİF') : t('TALEPLERİM · TALEP') }}</p>
            <h1 class="t-h2">{{ headTitle }}</h1>
            <p class="t-body-md t-muted">{{ subtitle }}</p>
          </div>
          <span class="tag status" :class="`tag-${headStatus.tone}`"><span class="dot" :class="headStatus.tone" aria-hidden="true"/>{{ headStatus.label }}</span>
        </header>

        <p v-if="actionError" class="action-error t-body-sm" role="alert">{{ actionError }}</p>

        <div v-if="offer" class="detail">
          <OfferQuoteCard
            v-if="demo"
            :key="offer.offer.id"
            :offer="offer.offer"
            :status="offer.status"
            :highlighted="offer.status === 'accepted'"
            @accept="mockAccept"
            @reject="setStatus('rejected')"
            @undo="setStatus('pending')"
          />
          <OfferQuoteCard
            v-else
            :key="`live-${offer.offer.id}`"
            :offer="offer.offer"
            :status="offer.status"
            :highlighted="offer.status === 'accepted'"
            :busy="live.acting.value"
            :undoable="false"
            :booking-to="bookingTo"
            :rejected-text="liveRequest?.resolution ? `${liveRequest.statusLabel}: ${liveRequest.resolution}` : t('Bu talep kapandı.')"
            @accept="liveAccept"
            @reject="openCancel"
          />
          <OfferMessages v-if="demo" :key="`m-${offer.offer.id}`" :messages="messages" @send="mockSend"/>
          <OfferMessages
            v-else
            :key="`lm-${requestId}`"
            :messages="messages"
            :send="thread.send"
            :loading="thread.loading.value"
            :error="thread.error.value"
            :has-more="!!thread.next.value"
            :closed="!liveRequest?.messagesOpen"
            :hint="t('İletişim bilgisi veya bağlantı paylaşma. Mesajlar bildirim olarak gönderilmez.')"
            @more="thread.load(thread.next.value ?? '')"
          />
        </div>
        <div v-else class="detail">
          <section class="empty surface grow">
            <span class="empty-icon" aria-hidden="true"><Inbox :size="26"/></span>
            <h2 class="t-h4">{{ demo || liveRequest?.status === 'requested' ? (demo || liveRequest?.kind === 'quotes' ? t('Henüz teklif gelmedi') : t('Henüz yanıt gelmedi')) : liveRequest?.status === 'expired' ? t('Yanıt süresi doldu') : t('Bu talep yanıtsız kapandı') }}</h2>
            <p class="t-body-md t-muted">{{ demo || liveRequest?.status === 'requested' ? (demo || liveRequest?.kind === 'quotes' ? t('İşletmeler ön tekliflerini gönderdiğinde burada görünür. Teklif gelince bildirim alırsın.') : t('İşletme saati onayladığında ya da yeni saat önerdiğinde burada görünür.')) : liveRequest?.status === 'expired' ? t('İşletme {count} saat içinde yanıt vermediği için talep kapandı. Aynı ya da başka bir işletmeden yeniden isteyebilirsin.', {count: 48}) : liveRequest?.resolution }}</p>
            <p v-if="respondLine" class="t-body-sm deadline" :class="{passed: liveRequest?.respondByPassed}">{{ respondLine }}</p>
            <p v-if="seenLine" class="t-body-sm t-muted">{{ seenLine }}</p>
            <V2Button :to="demo ? '/talep' : '/ara'" variant="outline">{{ t('Yeni talep oluştur') }}</V2Button>
          </section>
          <OfferMessages
            v-if="!demo && liveRequest"
            :key="`lm-${requestId}`"
            :messages="messages"
            :send="thread.send"
            :loading="thread.loading.value"
            :error="thread.error.value"
            :has-more="!!thread.next.value"
            :closed="!liveRequest.messagesOpen"
            :hint="t('İletişim bilgisi veya bağlantı paylaşma. Mesajlar bildirim olarak gönderilmez.')"
            @more="thread.load(thread.next.value ?? '')"
          />
        </div>

        <section v-if="!demo && liveRequest" class="facts surface" :aria-label="t('Talep ayrıntısı')">
          <p class="t-mono-sm t-muted">{{ [liveRequest.kindText.toLocaleUpperCase(localeTag), liveRequest.code, liveRequest.createdText].filter(Boolean).join(' · ') }}</p>
          <p class="t-body-md">{{ liveRequest.message }}</p>
          <p v-if="liveRequest.preferredText" class="t-body-sm t-muted">{{ t('İstenen zaman: {time}', {time: liveRequest.preferredText}) }}</p>
          <p v-else-if="liveRequest.windowText" class="t-body-sm t-muted">{{ t('Tercih edilen zaman: {time}', {time: liveRequest.windowText}) }}</p>
          <p v-if="liveRequest.contactText" class="t-body-sm t-muted">{{ t('İletişim tercihi: {contact}', {contact: liveRequest.contactText}) }}</p>
          <p v-if="offer && seenLine" class="t-body-sm t-muted">{{ seenLine }}</p>
          <p v-if="liveRequest.resolutionLabel && !liveRequest.canCancel" class="t-body-sm t-muted">{{ t('Kapanış nedeni: {reason}', {reason: liveRequest.resolutionLabel}) }}</p>
          <div v-if="liveRequest.canCancel && liveRequest.offerStatus !== 'pending'" class="facts-actions">
            <V2Button variant="ghost" size="sm" :disabled="live.acting.value" @click="openCancel">{{ t('Talebi iptal et') }}</V2Button>
          </div>
        </section>

        <section v-if="offers.length > 1" class="block" aria-labelledby="offers-title">
          <div class="block-head">
            <h2 id="offers-title" class="t-h4">{{ t('Bu talebe gelen teklifler · {count}', {count: offers.length}) }}</h2>
            <p class="t-body-sm t-muted">{{ t('Ayrıntısını görmek istediğin teklifi seç.') }}</p>
          </div>
          <ul class="offers">
            <li v-for="item in offers" :key="item.offer.id">
              <OfferPickCard :offer="item.offer" :status="item.status" :business="item.business" :selected="item.offer.id === offer?.offer.id" :cheapest="item.offer.id === cheapestId" @select="demo && select(item.offer)"/>
            </li>
          </ul>
        </section>

        <section class="block" aria-labelledby="requests-title">
          <div class="block-head">
            <h2 id="requests-title" class="t-h4">{{ t('Tüm taleplerim') }}</h2>
            <V2Button :to="demo ? '/talep' : '/ara'" variant="ghost" size="sm" arrow>{{ t('Yeni talep') }}</V2Button>
          </div>
          <ul class="requests surface">
            <li v-for="item in rows" :key="item.id">
              <NuxtLink :to="{query: {talep: item.id}}" class="req" :class="{on: item.id === requestId}" :aria-current="item.id === requestId ? 'true' : undefined">
                <span class="req-copy">
                  <span class="t-mono-sm t-muted">{{ item.meta }}</span>
                  <span class="t-label-md">{{ item.title }}</span>
                </span>
                <span class="t-body-sm t-muted req-count">{{ item.count }}</span>
                <span class="tag" :class="`tag-${item.tone}`">{{ item.label }}</span>
                <ChevronRight :size="18" class="chev" aria-hidden="true"/>
              </NuxtLink>
            </li>
          </ul>
          <V2Button v-if="!demo && live.next.value" variant="outline" size="sm" :disabled="live.loading.value" @click="live.load(live.next.value ?? '')">{{ t('Daha fazla talep') }}</V2Button>
        </section>
      </template>
    </div>

    <V2Modal :open="cancelOpen" :title="liveRequest?.offerStatus === 'pending' ? t('Teklifi reddet') : t('Talebi iptal et')" :subtitle="t('Talep kapanır ve işletme nedenini görür. Bu işlem geri alınamaz.')" :width="560" @close="cancelOpen = false">
      <fieldset class="reasons" :disabled="live.acting.value">
        <legend class="field-label">{{ t('Neden vazgeçiyorsun?') }}</legend>
        <label v-for="item in cancelReasons" :key="item.id" class="option">
          <input v-model="cancelCode" type="radio" name="iptal-nedeni" :value="item.id" class="radio">
          <span>{{ t(item.label) }}</span>
        </label>
      </fieldset>
      <label class="field">
        <span class="field-label">{{ cancelCode === 'other' ? t('Açıklama (en az 10 karakter)') : t('Açıklama (isteğe bağlı)') }}</span>
        <textarea v-model="cancelText" class="textarea" maxlength="1000" :disabled="live.acting.value" :placeholder="cancelCode === 'other' ? t('Nedenini kısaca yaz.') : t('Boş bırakırsan yalnız seçtiğin neden iletilir.')"/>
      </label>
      <p v-if="cancelTried && cancelError" class="action-error t-body-sm" role="alert">{{ cancelError }}</p>
      <template #footer>
        <V2Button variant="outline" :disabled="live.acting.value" @click="cancelOpen = false">{{ t('Vazgeç') }}</V2Button>
        <V2Button variant="dark" :disabled="live.acting.value" @click="liveCancel">{{ live.acting.value ? t('Gönderiliyor…') : t('Onayla') }}</V2Button>
      </template>
    </V2Modal>
  </div>
</template>

<style scoped>
.account{display:flex;align-items:flex-start;gap:32px;padding-top:40px;padding-bottom:104px}
.col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px}
.head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}
.titles{display:flex;flex-direction:column;gap:10px;min-width:0}
.status{padding:6px 12px 6px 9px;flex:none}
.dot{width:7px;height:7px;border-radius:999px;background:var(--ink-300)}
.dot.orange{background:var(--orange-500)}
.dot.lime{background:var(--green-500)}
.detail{display:flex;align-items:flex-start;gap:24px}
.empty{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:32px}
.empty-icon{width:56px;height:56px;border-radius:999px;background:var(--cream-100);display:grid;place-items:center;color:var(--ink-700);margin-bottom:6px}
.empty .btn{margin-top:8px}
.empty.grow{flex:1 1 0;min-width:0}
.action-error{color:var(--red-500);font-weight:600}
.facts{display:flex;flex-direction:column;gap:8px;padding:20px 24px}
.facts-actions{display:flex;justify-content:flex-end}
.deadline{color:var(--ink-700);font-weight:600}
.deadline.passed{color:var(--ink-500);font-weight:400}
.reasons{display:flex;flex-direction:column;gap:10px;border:0;margin:0 0 16px;padding:0;min-width:0}
.reasons legend{padding:0;margin-bottom:10px}
.block{display:flex;flex-direction:column;gap:14px;margin-top:16px}
.block-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.offers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.requests{display:flex;flex-direction:column;gap:2px;padding:8px}
.req{display:flex;align-items:center;gap:16px;padding:14px 16px;border-radius:20px}
.req:hover{background:var(--cream-50)}
.req.on{background:var(--cream-100)}
.req-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.req-count{flex:none}
.chev{flex:none;color:var(--ink-500)}
@media (max-width:1100px){
  .detail{flex-direction:column;align-items:stretch}
  .offers{grid-template-columns:1fr 1fr}
}
@media (max-width:1000px){
  .account{flex-direction:column;align-items:stretch;gap:24px;padding-top:24px}
}
@media (max-width:760px){
  .account{padding-bottom:64px}
  .head{flex-direction:column;align-items:flex-start}
  .head .t-h2{font-size:30px}
  .offers{grid-template-columns:1fr}
  .req{flex-wrap:wrap;gap:8px 12px}
  .req-copy{flex-basis:100%}
  .chev{display:none}
}
</style>
