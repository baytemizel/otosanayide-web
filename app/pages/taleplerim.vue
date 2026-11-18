<script setup lang="ts">
import {computed, reactive} from 'vue';
import {ChevronRight, Inbox} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import OfferMessages from '~/components/v2/requests/OfferMessages.vue';
import OfferPickCard from '~/components/v2/requests/OfferPickCard.vue';
import OfferQuoteCard from '~/components/v2/requests/OfferQuoteCard.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {
  mockRequestById, mockRequests, offerTotal, requestBusiness, requestStatusLabel,
  type MockOffer, type OfferMessage, type OfferStatus, type RequestStatus,
} from '~/data/mock/requests';

// W15 · Taleplerim · Teklif ayrıntısı (Figma 126:734). The top part (header, Ön teklif, Mesajlar) is the
// Figma frame; below it the request's incoming offers and the member's other requests.
// ?talep=<id> selects a request, ?teklif=<id> one of its offers.
useMemberPage();

useSeoMeta({title: 'Taleplerim'});

const route = useRoute();
const router = useRouter();

// Mock state shared across client navigation (accept → /randevu → back keeps the decision).
const statuses = useState<Record<string, OfferStatus>>('v2-req-offer-status', () =>
  Object.fromEntries(mockRequests.flatMap((request) => request.offers.map((offer) => [offer.id, offer.status]))));
const threads = useState<Record<string, OfferMessage[]>>('v2-req-messages', () =>
  Object.fromEntries(mockRequests.flatMap((request) => request.offers.map((offer) => [offer.id, [...offer.messages]]))));
const chosen = reactive<Record<string, string>>({});

const request = computed(() => mockRequestById(String(route.query.talep ?? '')) ?? mockRequests[0]!);
const statusOf = (offer: MockOffer) => statuses.value[offer.id] ?? offer.status;

const offer = computed<MockOffer | undefined>(() => {
  const offers = request.value.offers;
  const pickedId = chosen[request.value.id] ?? String(route.query.teklif ?? '');
  return offers.find((item) => item.id === pickedId)
    ?? offers.find((item) => statusOf(item) === 'accepted')
    ?? offers[0];
});
const business = computed(() => (offer.value ? requestBusiness(offer.value.businessId) : undefined));
const cheapestId = computed(() => {
  const open = request.value.offers.filter((item) => statusOf(item) !== 'rejected');
  if (open.length < 2) return '';
  return open.reduce((best, item) => (offerTotal(item) < offerTotal(best) ? item : best)).id;
});

function requestState(id: string): RequestStatus {
  const item = mockRequestById(id)!;
  if (item.offers.some((entry) => statusOf(entry) === 'accepted')) return item.status === 'closed' ? 'closed' : 'scheduled';
  return item.status;
}

const headStatus = computed(() => {
  if (!offer.value) return {label: requestStatusLabel[requestState(request.value.id)], tone: 'cream'};
  const status = statusOf(offer.value);
  if (status === 'accepted') return {label: 'Kabul edildi', tone: 'lime'};
  if (status === 'rejected') return {label: 'Reddedildi', tone: 'cream'};
  return {label: 'Karar bekleniyor', tone: 'orange'};
});

function select(target: MockOffer) {
  chosen[request.value.id] = target.id;
}
function accept() {
  if (!offer.value) return;
  const current = offer.value;
  statuses.value = {...statuses.value, [current.id]: 'accepted'};
  void router.push(`/randevu?servis=${current.businessId}&teklif=${current.id}`);
}
function setStatus(status: OfferStatus) {
  if (offer.value) statuses.value = {...statuses.value, [offer.value.id]: status};
}
function sendMessage(text: string) {
  if (!offer.value) return;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
  const id = offer.value.id;
  threads.value = {...threads.value, [id]: [...(threads.value[id] ?? []), {from: 'member', text, time}]};
}
</script>

<template>
  <div class="account v2-wrap">
    <V2AccountMenu active="taleplerim"/>

    <div class="col">
      <header class="head">
        <div class="titles">
          <p class="t-mono-md t-eyebrow">{{ offer ? 'TALEPLERİM · TEKLİF' : 'TALEPLERİM · TALEP' }}</p>
          <h1 class="t-h2">{{ offer ? `Teklif #${offer.code}` : `Talep #${request.id}` }}</h1>
          <p class="t-body-md t-muted">
            <template v-if="business">{{ business.name }} · </template>{{ request.service }} · {{ request.vehicle }}
          </p>
        </div>
        <span class="tag status" :class="`tag-${headStatus.tone}`"><span class="dot" :class="headStatus.tone" aria-hidden="true"/>{{ headStatus.label }}</span>
      </header>

      <div v-if="offer" class="detail">
        <OfferQuoteCard
          :key="offer.id"
          :offer="offer"
          :status="statusOf(offer)"
          :highlighted="statusOf(offer) === 'accepted'"
          @accept="accept"
          @reject="setStatus('rejected')"
          @undo="setStatus('pending')"
        />
        <OfferMessages :key="`m-${offer.id}`" :messages="threads[offer.id] ?? []" @send="sendMessage"/>
      </div>
      <section v-else class="empty surface">
        <span class="empty-icon" aria-hidden="true"><Inbox :size="26"/></span>
        <h2 class="t-h4">Henüz teklif gelmedi</h2>
        <p class="t-body-md t-muted">İşletmeler ön tekliflerini gönderdiğinde burada görünür. Teklif gelince bildirim alırsın.</p>
        <V2Button to="/talep" variant="outline">Yeni talep oluştur</V2Button>
      </section>

      <section v-if="request.offers.length > 1" class="block" aria-labelledby="offers-title">
        <div class="block-head">
          <h2 id="offers-title" class="t-h4">Bu talebe gelen teklifler · {{ request.offers.length }}</h2>
          <p class="t-body-sm t-muted">Ayrıntısını görmek istediğin teklifi seç.</p>
        </div>
        <ul class="offers">
          <li v-for="item in request.offers" :key="item.id">
            <OfferPickCard :offer="item" :status="statusOf(item)" :selected="item.id === offer?.id" :cheapest="item.id === cheapestId" @select="select(item)"/>
          </li>
        </ul>
      </section>

      <section class="block" aria-labelledby="requests-title">
        <div class="block-head">
          <h2 id="requests-title" class="t-h4">Tüm taleplerim</h2>
          <V2Button to="/talep" variant="ghost" size="sm" arrow>Yeni talep</V2Button>
        </div>
        <ul class="requests surface">
          <li v-for="item in mockRequests" :key="item.id">
            <NuxtLink :to="{query: {talep: item.id}}" class="req" :class="{on: item.id === request.id}" :aria-current="item.id === request.id ? 'true' : undefined">
              <span class="req-copy">
                <span class="t-mono-sm t-muted">#{{ item.id }} · {{ item.createdText }}</span>
                <span class="t-label-md">{{ item.service }} · {{ item.vehicle }}</span>
              </span>
              <span class="t-body-sm t-muted req-count">{{ item.offers.length ? `${item.offers.length} teklif` : 'Teklif yok' }}</span>
              <span class="tag" :class="requestState(item.id) === 'offers' ? 'tag-orange' : requestState(item.id) === 'scheduled' ? 'tag-lime' : 'tag-cream'">{{ requestStatusLabel[requestState(item.id)] }}</span>
              <ChevronRight :size="18" class="chev" aria-hidden="true"/>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
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
